#!/usr/bin/env bash
set -Eeuo pipefail

readonly APP_REPO="/home/comviewers_www/user"
readonly APP_NAME="user"
readonly DEPLOY_ROOT="/var/lib/comviewers-deploy"
readonly LOCK_FILE="/run/lock/comviewers-deploy.lock"
readonly PUBLIC_URL="https://comviewers.codeidea.io/"

MODE="deploy"
RELEASE_DIR=""
if [[ $# -eq 2 && "$1" =~ ^--(prepare|activate|rollback)$ ]]; then
  MODE="${1#--}"
  RELEASE_DIR="$2"
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--prepare|--activate|--rollback RELEASE_DIR]" >&2
  exit 2
fi

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  log "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

acquire_deploy_lock() {
  if [[ "${COMVIEWERS_DEPLOY_LOCK_HELD:-}" == "1" ]]; then
    local expected_lock
    local inherited_lock
    expected_lock="$(readlink -f "$LOCK_FILE" 2>/dev/null || true)"
    inherited_lock="$(readlink -f "/proc/$$/fd/9" 2>/dev/null || true)"
    [[ -n "$expected_lock" && "$inherited_lock" == "$expected_lock" ]] \
      || fail "Inherited file descriptor 9 does not reference $LOCK_FILE."
    flock -n 9 || fail "Inherited ComViewers deployment lock is not available."
    return
  fi

  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "Another ComViewers deployment is already running."
}

validate_release_dir() {
  local release_dir="$1"
  local expected_root
  local relative_path
  local release_id
  local resolved_dir

  expected_root="$(realpath -m -- "$DEPLOY_ROOT")"
  resolved_dir="$(realpath -m -- "$release_dir")"
  [[ "$release_dir" == "$resolved_dir" ]] \
    || fail "Release directory must be canonical: $release_dir"
  [[ "$resolved_dir" == "$expected_root/"* ]] \
    || fail "Release directory is outside $DEPLOY_ROOT: $release_dir"

  relative_path="${resolved_dir#"$expected_root"/}"
  release_id="${relative_path%/"$APP_NAME"}"
  [[ "$relative_path" == "$release_id/$APP_NAME" \
    && "$release_id" != */* \
    && "$release_id" =~ ^[0-9]{8}-[0-9]{6}-[0-9]+$ ]] \
    || fail "Invalid release directory: $release_dir"
}

require_repo() {
  [[ -d "$APP_REPO/.git" ]] || fail "Git repository not found: $APP_REPO"
  [[ -z "$(git -C "$APP_REPO" status --porcelain)" ]] \
    || fail "Working tree is not clean: $APP_REPO"
  git -C "$APP_REPO" symbolic-ref --quiet --short HEAD >/dev/null \
    || fail "Detached HEAD is not supported: $APP_REPO"
}

update_repo() {
  local branch
  branch="$(git -C "$APP_REPO" symbolic-ref --quiet --short HEAD)"
  log "Fetching $APP_REPO"
  git -C "$APP_REPO" fetch --prune origin
  git -C "$APP_REPO" show-ref --verify --quiet "refs/remotes/origin/$branch" \
    || fail "Remote branch origin/$branch not found: $APP_REPO"
  log "Pulling $APP_REPO ($branch)"
  git -C "$APP_REPO" pull --ff-only origin "$branch"
}

http_code() {
  curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$1"
}

prepare_release() {
  local release_dir="$1"
  local candidate_dir="$release_dir/dist.candidate"

  validate_release_dir "$release_dir"
  require_repo
  update_repo
  install -d -o root -g root -m 750 "$release_dir"

  [[ ! -e "$candidate_dir" ]] || fail "Candidate already exists: $candidate_dir"
  [[ ! -e "$release_dir/dist.previous" ]] || fail "Backup already exists: $release_dir/dist.previous"
  [[ ! -e "$release_dir/activated" ]] || fail "Release is already active: $release_dir"

  log "Selected user frontend commit"
  git -C "$APP_REPO" rev-parse HEAD | tee "$release_dir/commit.txt"

  log "Installing dependencies: $APP_REPO"
  npm --prefix "$APP_REPO" ci

  log "Building user frontend candidate"
  VITE_API_BASE_URL=/ \
  VITE_ENABLE_PUBLISHING_PREVIEWS=false \
    npm --prefix "$APP_REPO" run build -- --outDir "$candidate_dir" --emptyOutDir
  [[ -f "$candidate_dir/index.html" ]] \
    || fail "Frontend build did not create index.html: $candidate_dir"
}

rollback_release() {
  local release_dir="$1"
  local live_dir="$APP_REPO/dist"
  local backup_dir="$release_dir/dist.previous"
  local failed_dir="$release_dir/dist.failed"

  validate_release_dir "$release_dir"
  [[ -f "$release_dir/activated" ]] || return 0
  [[ ! -e "$failed_dir" ]] || fail "Failed deployment evidence already exists: $failed_dir"

  log "Rolling back user frontend"
  if [[ -d "$live_dir" ]]; then
    mv "$live_dir" "$failed_dir"
  fi
  if [[ -d "$backup_dir" ]]; then
    mv "$backup_dir" "$live_dir"
  fi
  rm -f "$release_dir/activated"
}

ROLLBACK_ON_ERR=false
rollback_on_error() {
  local exit_code=$?
  trap - ERR
  if $ROLLBACK_ON_ERR && [[ -n "$RELEASE_DIR" ]]; then
    rollback_release "$RELEASE_DIR" || true
  fi
  exit "$exit_code"
}

activate_release() {
  local release_dir="$1"
  local candidate_dir="$release_dir/dist.candidate"
  local live_dir="$APP_REPO/dist"
  local backup_dir="$release_dir/dist.previous"
  local user_code

  validate_release_dir "$release_dir"
  [[ -f "$candidate_dir/index.html" ]] || fail "Prepared user candidate not found: $candidate_dir"
  [[ ! -e "$backup_dir" ]] || fail "Backup already exists: $backup_dir"
  [[ ! -e "$release_dir/activated" ]] || fail "Release is already active: $release_dir"

  if [[ -d "$live_dir" ]]; then
    mv "$live_dir" "$backup_dir"
  else
    touch "$release_dir/no-previous-dist"
  fi

  if ! mv "$candidate_dir" "$live_dir"; then
    if [[ -d "$backup_dir" ]]; then
      mv "$backup_dir" "$live_dir"
    fi
    fail "Could not activate user frontend candidate."
  fi

  touch "$release_dir/activated"
  chown -R root:www-data "$live_dir"
  find "$live_dir" -type d -exec chmod 750 {} +
  find "$live_dir" -type f -exec chmod 640 {} +

  user_code="$(http_code "$PUBLIC_URL" || true)"
  if [[ "$user_code" != "200" ]]; then
    rollback_release "$release_dir"
    fail "User frontend smoke check failed: HTTP ${user_code:-unreachable}"
  fi

  log "User frontend deployment completed: user=$user_code"
  log "Release evidence: $release_dir"
}

[[ $EUID -eq 0 ]] || fail "Run this script as root."
for command_name in git npm curl flock install mv chown find chmod rm touch tee readlink realpath; do
  require_command "$command_name"
done
acquire_deploy_lock
trap rollback_on_error ERR

if [[ "$MODE" == "deploy" ]]; then
  RELEASE_DIR="$DEPLOY_ROOT/$(date '+%Y%m%d-%H%M%S')-$$/$APP_NAME"
  prepare_release "$RELEASE_DIR"
  ROLLBACK_ON_ERR=true
  activate_release "$RELEASE_DIR"
elif [[ "$MODE" == "prepare" ]]; then
  prepare_release "$RELEASE_DIR"
elif [[ "$MODE" == "activate" ]]; then
  ROLLBACK_ON_ERR=true
  activate_release "$RELEASE_DIR"
else
  rollback_release "$RELEASE_DIR"
fi
