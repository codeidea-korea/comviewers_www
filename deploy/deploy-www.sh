#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_NAME="user"
readonly APP_LABEL="사용자 웹"
readonly APP_REPO="/home/comviewers_www/$APP_NAME"
readonly DEPLOY_ROOT="/var/lib/comviewers-deploy"
readonly WORK_ROOT="/home/comviewers-deploy-work"
readonly LOCK_FILE="/run/lock/comviewers-deploy.lock"
readonly PUBLIC_URL="${COMVIEWERS_DEPLOY_PUBLIC_URL:-https://comviewers.codeidea.io}"
readonly EXPECTED_COMMIT="${COMVIEWERS_USER_DEPLOY_COMMIT:-}"
readonly BASE_PATH="/"
MODE=deploy RELEASE_DIR="" WORK_DIR="" OWNED=false ACTIVATION_STARTED=false
log() {
  local level="$1" message color
  shift
  message="$*"
  case "$level" in
    info) color='36' ;;
    prepare) color='1;36' ;;
    build) color='1;33' ;;
    activate) color='1;35' ;;
    verify) color='1;94' ;;
    success) color='1;32' ;;
    warning) color='1;33' ;;
    error) color='1;31' ;;
    *) color='36' ;;
  esac
  if [[ -t 1 && "${TERM:-dumb}" != dumb && -z "${NO_COLOR+x}" ]]; then
    printf '\033[%sm[%s] %s\033[0m\n' "$color" "$APP_LABEL" "$message"
  else
    printf '[%s] %s\n' "$APP_LABEL" "$message"
  fi
}
fail() { log error "[오류] $*" >&2; exit 1; }
quiet_command() {
  local output status
  if output="$("$@" 2>&1)"; then
    return 0
  else
    status=$?
    printf '%s\n' "$output" >&2
    return "$status"
  fi
}
if [[ "${1:-}" == --rollback ]]; then fail "백업과 롤백은 비활성화되어 있습니다."; fi
if [[ $# -eq 2 && "$1" =~ ^--(prepare|activate|discard)$ ]]; then
  MODE="${1#--}" RELEASE_DIR="$2"
elif [[ $# -ne 0 ]]; then
  fail "사용법: $0 [--prepare|--activate|--discard RELEASE_DIR]"
fi
[[ $EUID -eq 0 ]] || fail "root 권한으로 실행하세요."
for command in git npm curl flock timeout tar python3 realpath readlink install mkdir touch date df awk find chown chmod rm rmdir; do
  command -v "$command" >/dev/null || fail "필수 명령을 찾을 수 없습니다: $command"
done
python3 - "$PUBLIC_URL" <<'PYURL'
import sys
from urllib.parse import urlsplit
u = urlsplit(sys.argv[1])
if (u.scheme != 'https' or not u.hostname or u.username or u.password
        or u.path or u.query or u.fragment or u.port is not None):
    raise SystemExit('배포 주소는 경로 없는 HTTPS origin이어야 합니다.')
PYURL
[[ -z "$EXPECTED_COMMIT" || "$EXPECTED_COMMIT" =~ ^[0-9a-f]{40}$ ]] || fail "승인 웹 commit은 40자리 소문자 SHA여야 합니다."
if [[ "${COMVIEWERS_DEPLOY_LOCK_HELD:-}" == 1 ]]; then
  [[ "$(readlink -f /proc/$$/fd/9)" == "$LOCK_FILE" ]] || fail "상속된 배포 잠금이 올바르지 않습니다."
  flock -n 9 || fail "배포 잠금을 사용할 수 없습니다."
else
  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "다른 배포가 진행 중입니다."
fi
export COMVIEWERS_DEPLOY_LOCK_HELD=1
[[ -n "$RELEASE_DIR" ]] || RELEASE_DIR="$DEPLOY_ROOT/$(date '+%Y%m%d-%H%M%S')-$$/$APP_NAME"
release_id="${RELEASE_DIR#"$DEPLOY_ROOT"/}"
release_id="${release_id%/"$APP_NAME"}"
[[ "$release_id" =~ ^[0-9]{8}-[0-9]{6}-[0-9]+$ && "$RELEASE_DIR" == "$DEPLOY_ROOT/$release_id/$APP_NAME" ]] || fail "배포 후보 디렉터리가 올바르지 않습니다."
[[ "$(realpath -m "$RELEASE_DIR")" == "$RELEASE_DIR" ]] || fail "배포 후보 경로가 정규 경로가 아닙니다."
WORK_DIR="$WORK_ROOT/$release_id/$APP_NAME"
[[ "$(realpath -m "$WORK_DIR")" == "$WORK_DIR" ]] || fail "작업 경로가 정규 경로가 아닙니다."
cleanup() {
  local code=$?
  trap - EXIT
  if $OWNED && ! $ACTIVATION_STARTED && [[ $code -ne 0 ]]; then
    rm -rf -- "$WORK_DIR" "$RELEASE_DIR" || log error "[오류] 임시 준비 파일 정리에 실패했습니다." >&2
  fi
  if [[ $code -ne 0 ]]; then
    log error "[오류] 배포 중단 (종료 코드: $code). 후보 작업 경로: $WORK_DIR, 배포 기록 경로: $RELEASE_DIR" >&2
    if $ACTIVATION_STARTED; then
      log warning "[오류] 백업과 롤백이 없으며 일부 반영되었을 수 있습니다." >&2
    else
      log warning "[오류] 백업과 롤백은 비활성화되어 있습니다." >&2
    fi
  fi
  rmdir -- "${WORK_DIR%/*}" "$WORK_ROOT" 2>/dev/null || true
  exit "$code"
}
trap cleanup EXIT

artifact_check() {
  timeout --kill-after=5 120 python3 - "$1" "$2" "$RELEASE_DIR/hashes.json" "$BASE_PATH" "$PUBLIC_URL" <<'PY'
import hashlib, json, subprocess, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
mode, directory, metadata, base, origin = sys.argv[1:]
host = urlsplit(origin).netloc
root = Path(directory)
class Assets(HTMLParser):
    refs = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'base': raise RuntimeError('HTML base 태그는 지원하지 않습니다')
        if tag == 'script' and a.get('src'): self.refs.append(a['src'])
        if tag == 'link' and set(a.get('rel', '').split()) & {'stylesheet', 'modulepreload'} and a.get('href'): self.refs.append(a['href'])
if mode == 'record':
    parser = Assets(); parser.feed((root / 'index.html').read_text())
    if not parser.refs: raise RuntimeError('빌드한 HTML에 주요 자산이 없습니다')
    records = [{'file': 'index.html', 'url': base}]
    for ref in parser.refs:
        u = urlsplit(urljoin(origin + base, ref))
        if u.scheme != 'https' or u.netloc != host or not u.path.startswith(base): raise RuntimeError('예상하지 않은 자산 출처입니다')
        records.append({'file': unquote(u.path[len(base):]), 'url': u.path + ('?' + u.query if u.query else '')})
    for row in records:
        p = root / row['file']
        if not p.is_file() or p.resolve() != p or root not in p.parents: raise RuntimeError('주요 자산 경로가 올바르지 않습니다')
        row['sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
    Path(metadata).write_text(json.dumps(records))
else:
    for row in json.loads(Path(metadata).read_text()):
        p = root / row['file']
        if not p.is_file() or p.resolve() != p or root not in p.parents or hashlib.sha256(p.read_bytes()).hexdigest() != row['sha256']: raise RuntimeError('준비한 자산이 변경되었습니다')
        if mode != 'verify': continue
        for local in [True, False]:
            args = ['curl', '--silent', '--show-error', '--noproxy', '*', '--connect-timeout', '5', '--max-time', '15']
            if local: args += ['--resolve', host + ':443:127.0.0.1']
            data = subprocess.check_output(args + ['--write-out', '\n%{http_code}', origin + row['url']], timeout=20)
            body, _, code = data.rpartition(b'\n')
            if code != b'200' or hashlib.sha256(body).hexdigest() != row['sha256']: raise RuntimeError('서비스 중인 주요 자산이 이번 배포와 다릅니다')
PY
}

exchange_candidate() {
  timeout --kill-after=5 120 python3 - "$WORK_DIR/dist" "$APP_REPO/dist" "$1" <<'PY'
import ctypes, os, shutil, sys
from pathlib import Path
candidate, live = map(Path, sys.argv[1:3])
for p in [candidate, live.parent] + ([live] if live.exists() else []):
    if p.is_symlink() or not p.is_dir() or p.resolve() != p: raise RuntimeError('배포 디렉터리가 정규 경로가 아닙니다')
if live.is_symlink(): raise RuntimeError('서비스 디렉터리가 심볼릭 링크입니다')
if candidate.stat().st_dev != live.parent.stat().st_dev or (live.exists() and live.stat().st_dev != candidate.stat().st_dev): raise RuntimeError('원자적 교체에는 동일한 파일시스템이 필요합니다')
for p in [candidate, live] + list(candidate.rglob('*')) + (list(live.rglob('*')) if live.exists() else []):
    if os.path.ismount(p): raise RuntimeError('마운트된 배포 경로는 지원하지 않습니다')
if any(p.is_symlink() for p in candidate.rglob('*')): raise RuntimeError('배포 후보에 심볼릭 링크가 포함되어 있습니다')
lib = ctypes.CDLL(None, use_errno=True)
exchange = getattr(lib, 'renameat2', None)
if exchange is None: raise RuntimeError('libc renameat2가 필요합니다')
exchange.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
exchange.restype = ctypes.c_int
if sys.argv[3] == 'activate':
    if live.exists():
        if exchange(-100, os.fsencode(candidate), -100, os.fsencode(live), 2) != 0:
            number = ctypes.get_errno(); raise OSError(number, os.strerror(number))
        shutil.rmtree(candidate)  # Immediately remove the obsolete live tree; retain no backup.
    else: os.rename(candidate, live)
PY
}

prepare_release() {
  log prepare "소스 확인"
  [[ ! -e "$RELEASE_DIR" && ! -L "$RELEASE_DIR" && ! -e "$WORK_DIR" && ! -L "$WORK_DIR" ]] || fail "배포 후보가 이미 존재하여 기존 후보를 보존했습니다."
  [[ -d "$APP_REPO/.git" ]] || fail "저장소를 찾을 수 없습니다."
  local status branch commit free
  status="$(timeout --kill-after=5 120 git -C "$APP_REPO" status --porcelain -- . ":(exclude)deploy/deploy-www.sh")"
  [[ -z "$status" ]] || fail "애플리케이션 작업 트리에 미반영 변경이 있습니다."
  branch="$(timeout --kill-after=5 120 git -C "$APP_REPO" symbolic-ref --quiet --short HEAD)"
  [[ -n "$branch" && "$branch" != -* ]] || fail "브랜치가 선택된 상태여야 합니다."
  quiet_command timeout --kill-after=5 120 git -C "$APP_REPO" fetch --no-tags origin "+refs/heads/$branch:refs/remotes/origin/$branch"
  commit="$(timeout --kill-after=5 120 git -C "$APP_REPO" rev-parse --verify "refs/remotes/origin/$branch^{commit}")"
  [[ -z "$EXPECTED_COMMIT" || "$commit" == "$EXPECTED_COMMIT" ]] || fail "원격 웹 commit이 승인한 commit과 다릅니다."
  timeout --kill-after=5 120 git -C "$APP_REPO" merge-base --is-ancestor HEAD "$commit" || fail "로컬 HEAD가 원격보다 앞서 있거나 이력이 갈라져 있습니다."
  for directory in /home /var/lib; do
    free="$(df -PB1 "$directory" | awk 'NR==2 {print $4}')"
    [[ "$free" =~ ^[0-9]+$ && "$free" -ge 2147483648 ]] || fail "최소 2 GiB의 여유 공간이 필요합니다."
  done
  install -d -o root -g root -m 750 "$DEPLOY_ROOT/$release_id" "$WORK_ROOT/$release_id"
  mkdir "$RELEASE_DIR"
  OWNED=true
  mkdir "$WORK_DIR" "$WORK_DIR/source"
  printf '%s\n' "$commit" > "$RELEASE_DIR/commit.txt"
  printf '%s\n' "$PUBLIC_URL" > "$RELEASE_DIR/public-url.txt"
  timeout --kill-after=5 120 git -C "$APP_REPO" archive --format=tar "$commit" | timeout --kill-after=5 120 tar -xf - -C "$WORK_DIR/source"
  log build "설치/빌드"
  (cd "$WORK_DIR/source"
   quiet_command timeout --kill-after=10 600 npm ci
   VITE_API_BASE_URL=/ VITE_ENABLE_PUBLISHING_PREVIEWS=false VITE_NAME_TRANSLATION_FRAME_URL="${COMVIEWERS_NAME_TRANSLATION_FRAME_URL:-}" quiet_command timeout --kill-after=10 600 npm run build -- --outDir "$WORK_DIR/dist" --emptyOutDir)
  artifact_check record "$WORK_DIR/dist"
  exchange_candidate check
  log success "준비 완료: $commit (후보: $WORK_DIR/dist, 기록: $RELEASE_DIR)"
}

activate_release() {
  log activate "반영"
  ACTIVATION_STARTED=true
  [[ -f "$RELEASE_DIR/commit.txt" && -f "$RELEASE_DIR/hashes.json" && ! -e "$RELEASE_DIR/activated" ]] || fail "준비한 배포 후보가 없거나 이미 반영되었습니다."
  [[ -f "$RELEASE_DIR/public-url.txt" && "$(cat "$RELEASE_DIR/public-url.txt")" == "$PUBLIC_URL" ]] || fail "준비 때의 배포 origin과 다릅니다."
  [[ -z "$EXPECTED_COMMIT" || "$(cat "$RELEASE_DIR/commit.txt")" == "$EXPECTED_COMMIT" ]] || fail "준비한 웹이 승인 commit과 다릅니다."
  artifact_check check "$WORK_DIR/dist"
  exchange_candidate check
  chown -R root:www-data "$WORK_DIR/dist"
  find "$WORK_DIR/dist" -type d -exec chmod 750 {} +
  find "$WORK_DIR/dist" -type f -exec chmod 640 {} +
  exchange_candidate activate
  touch "$RELEASE_DIR/activated"
  log verify "검증"
  artifact_check verify "$APP_REPO/dist"
  rm -rf -- "$WORK_DIR"
  log success "배포 완료 (백업 없음). 배포 기록: $RELEASE_DIR"
}

case "$MODE" in
  deploy) prepare_release; activate_release ;;
  prepare) prepare_release ;;
  activate) activate_release ;;
  discard) rm -rf -- "$WORK_DIR"; log success "후보 작업 파일 정리 완료: $WORK_DIR" ;;
esac
