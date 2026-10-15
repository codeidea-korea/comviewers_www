#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_NAME="user"
readonly APP_REPO="/home/comviewers_www/$APP_NAME"
readonly DEPLOY_ROOT="/var/lib/comviewers-deploy"
readonly WORK_ROOT="/home/comviewers-deploy-work"
readonly LOCK_FILE="/run/lock/comviewers-deploy.lock"
readonly BASE_PATH="/"
MODE=deploy RELEASE_DIR="" WORK_DIR="" OWNED=false ACTIVATION_STARTED=false
fail() { echo "ERROR: $*" >&2; exit 1; }
if [[ "${1:-}" == --rollback ]]; then fail "Backups and rollback are disabled."; fi
if [[ $# -eq 2 && "$1" =~ ^--(prepare|activate|discard)$ ]]; then
  MODE="${1#--}" RELEASE_DIR="$2"
elif [[ $# -ne 0 ]]; then
  fail "Usage: $0 [--prepare|--activate|--discard RELEASE_DIR]"
fi
[[ $EUID -eq 0 ]] || fail "Run as root."
for command in git npm curl flock timeout tar python3 realpath readlink install mkdir touch date df awk find chown chmod rm rmdir; do
  command -v "$command" >/dev/null || fail "Missing command: $command"
done
if [[ "${COMVIEWERS_DEPLOY_LOCK_HELD:-}" == 1 ]]; then
  [[ "$(readlink -f /proc/$$/fd/9)" == "$LOCK_FILE" ]] || fail "Invalid inherited deployment lock."
  flock -n 9 || fail "Deployment lock unavailable."
else
  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "Another deployment is running."
fi
export COMVIEWERS_DEPLOY_LOCK_HELD=1
[[ -n "$RELEASE_DIR" ]] || RELEASE_DIR="$DEPLOY_ROOT/$(date '+%Y%m%d-%H%M%S')-$$/$APP_NAME"
release_id="${RELEASE_DIR#"$DEPLOY_ROOT"/}"
release_id="${release_id%/"$APP_NAME"}"
[[ "$release_id" =~ ^[0-9]{8}-[0-9]{6}-[0-9]+$ && "$RELEASE_DIR" == "$DEPLOY_ROOT/$release_id/$APP_NAME" ]] || fail "Invalid release directory."
[[ "$(realpath -m "$RELEASE_DIR")" == "$RELEASE_DIR" ]] || fail "Release path is not canonical."
WORK_DIR="$WORK_ROOT/$release_id/$APP_NAME"
[[ "$(realpath -m "$WORK_DIR")" == "$WORK_DIR" ]] || fail "Work path is not canonical."
cleanup() {
  local code=$?
  trap - EXIT
  if $OWNED && ! $ACTIVATION_STARTED && [[ $code -ne 0 ]]; then
    rm -rf -- "$WORK_DIR" "$RELEASE_DIR" || echo "ERROR: Temporary preparation cleanup failed." >&2
  fi
  rmdir -- "${WORK_DIR%/*}" "$WORK_ROOT" 2>/dev/null || true
  exit "$code"
}
trap cleanup EXIT

artifact_check() {
  timeout --kill-after=5 120 python3 - "$1" "$2" "$RELEASE_DIR/hashes.json" "$BASE_PATH" <<'PY'
import hashlib, json, subprocess, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
mode, directory, metadata, base = sys.argv[1:]
root = Path(directory)
class Assets(HTMLParser):
    refs = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'base': raise RuntimeError('HTML base is unsupported')
        if tag == 'script' and a.get('src'): self.refs.append(a['src'])
        if tag == 'link' and set(a.get('rel', '').split()) & {'stylesheet', 'modulepreload'} and a.get('href'): self.refs.append(a['href'])
if mode == 'record':
    parser = Assets(); parser.feed((root / 'index.html').read_text())
    if not parser.refs: raise RuntimeError('Built HTML has no primary assets')
    records = [{'file': 'index.html', 'url': base}]
    for ref in parser.refs:
        u = urlsplit(urljoin('https://comviewers.codeidea.io' + base, ref))
        if u.scheme != 'https' or u.netloc != 'comviewers.codeidea.io' or not u.path.startswith(base): raise RuntimeError('Unexpected asset origin')
        records.append({'file': unquote(u.path[len(base):]), 'url': u.path + ('?' + u.query if u.query else '')})
    for row in records:
        p = root / row['file']
        if not p.is_file() or p.resolve() != p or root not in p.parents: raise RuntimeError('Invalid primary asset')
        row['sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
    Path(metadata).write_text(json.dumps(records))
else:
    for row in json.loads(Path(metadata).read_text()):
        p = root / row['file']
        if not p.is_file() or p.resolve() != p or root not in p.parents or hashlib.sha256(p.read_bytes()).hexdigest() != row['sha256']: raise RuntimeError('Prepared asset changed')
        if mode != 'verify': continue
        for local in [True, False]:
            args = ['curl', '--silent', '--show-error', '--noproxy', '*', '--connect-timeout', '5', '--max-time', '15']
            if local: args += ['--resolve', 'comviewers.codeidea.io:443:127.0.0.1']
            data = subprocess.check_output(args + ['--write-out', '\n%{http_code}', 'https://comviewers.codeidea.io' + row['url']], timeout=20)
            body, _, code = data.rpartition(b'\n')
            if code != b'200' or hashlib.sha256(body).hexdigest() != row['sha256']: raise RuntimeError('Served primary asset differs from this release')
PY
}

exchange_candidate() {
  timeout --kill-after=5 120 python3 - "$WORK_DIR/dist" "$APP_REPO/dist" "$1" <<'PY'
import ctypes, os, shutil, sys
from pathlib import Path
candidate, live = map(Path, sys.argv[1:3])
for p in [candidate, live.parent] + ([live] if live.exists() else []):
    if p.is_symlink() or not p.is_dir() or p.resolve() != p: raise RuntimeError('Noncanonical deployment directory')
if live.is_symlink(): raise RuntimeError('Live directory is a symlink')
if candidate.stat().st_dev != live.parent.stat().st_dev or (live.exists() and live.stat().st_dev != candidate.stat().st_dev): raise RuntimeError('Atomic replacement requires the same filesystem')
for p in [candidate, live] + list(candidate.rglob('*')) + (list(live.rglob('*')) if live.exists() else []):
    if os.path.ismount(p): raise RuntimeError('Mounted deployment paths are unsupported')
if any(p.is_symlink() for p in candidate.rglob('*')): raise RuntimeError('Candidate must not contain symlinks')
lib = ctypes.CDLL(None, use_errno=True)
exchange = getattr(lib, 'renameat2', None)
if exchange is None: raise RuntimeError('libc renameat2 is required')
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
  [[ ! -e "$RELEASE_DIR" && ! -L "$RELEASE_DIR" && ! -e "$WORK_DIR" && ! -L "$WORK_DIR" ]] || fail "Release already exists; its candidate was preserved."
  [[ -d "$APP_REPO/.git" ]] || fail "Repository is missing."
  local status branch commit free
  status="$(timeout --kill-after=5 120 git -C "$APP_REPO" status --porcelain -- . ":(exclude)deploy/deploy-www.sh")"
  [[ -z "$status" ]] || fail "Application worktree is not clean."
  branch="$(timeout --kill-after=5 120 git -C "$APP_REPO" symbolic-ref --quiet --short HEAD)"
  [[ -n "$branch" && "$branch" != -* ]] || fail "Attached branch required."
  timeout --kill-after=5 120 git -C "$APP_REPO" fetch --no-tags origin "+refs/heads/$branch:refs/remotes/origin/$branch"
  commit="$(timeout --kill-after=5 120 git -C "$APP_REPO" rev-parse --verify "refs/remotes/origin/$branch^{commit}")"
  timeout --kill-after=5 120 git -C "$APP_REPO" merge-base --is-ancestor HEAD "$commit" || fail "Local HEAD is ahead of or diverges from the remote."
  for directory in /home /var/lib; do
    free="$(df -PB1 "$directory" | awk 'NR==2 {print $4}')"
    [[ "$free" =~ ^[0-9]+$ && "$free" -ge 2147483648 ]] || fail "At least 2 GiB free space is required."
  done
  install -d -o root -g root -m 750 "$DEPLOY_ROOT/$release_id" "$WORK_ROOT/$release_id"
  mkdir "$RELEASE_DIR"
  OWNED=true
  mkdir "$WORK_DIR" "$WORK_DIR/source"
  printf '%s\n' "$commit" > "$RELEASE_DIR/commit.txt"
  timeout --kill-after=5 120 git -C "$APP_REPO" archive --format=tar "$commit" | timeout --kill-after=5 120 tar -xf - -C "$WORK_DIR/source"
  (cd "$WORK_DIR/source"
   timeout --kill-after=10 600 npm ci
   VITE_API_BASE_URL=/ VITE_ENABLE_PUBLISHING_PREVIEWS=false timeout --kill-after=10 600 npm run build -- --outDir "$WORK_DIR/dist" --emptyOutDir)
  artifact_check record "$WORK_DIR/dist"
  exchange_candidate check
  echo "Prepared $APP_NAME: $commit"
}

activate_release() {
  ACTIVATION_STARTED=true
  [[ -f "$RELEASE_DIR/commit.txt" && -f "$RELEASE_DIR/hashes.json" && ! -e "$RELEASE_DIR/activated" ]] || fail "Prepared release is missing or already activated."
  artifact_check check "$WORK_DIR/dist"
  exchange_candidate check
  chown -R root:www-data "$WORK_DIR/dist"
  find "$WORK_DIR/dist" -type d -exec chmod 750 {} +
  find "$WORK_DIR/dist" -type f -exec chmod 640 {} +
  exchange_candidate activate
  touch "$RELEASE_DIR/activated"
  artifact_check verify "$APP_REPO/dist"
  rm -rf -- "$WORK_DIR"
  echo "Deployed $APP_NAME without backups. Metadata: $RELEASE_DIR"
}

case "$MODE" in
  deploy) prepare_release; activate_release ;;
  prepare) prepare_release ;;
  activate) activate_release ;;
  discard) rm -rf -- "$WORK_DIR" ;;
esac
