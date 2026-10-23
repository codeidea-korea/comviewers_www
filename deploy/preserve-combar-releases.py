#!/usr/bin/env python3
"""Preserve live-only ComBar releases while holding the shared deployment lock."""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from urllib.parse import quote, urlsplit


SCOPE = Path("combar/releases")


def parse_mountinfo(text):
    points = set()
    for line in text.splitlines():
        fields = line.split()
        if len(fields) < 10 or "-" not in fields[6:]:
            raise RuntimeError("Linux mountinfo 형식이 올바르지 않습니다")
        point = re.sub(r"\\([0-7]{3})", lambda match: chr(int(match.group(1), 8)), fields[4])
        if not point.startswith("/"):
            raise RuntimeError("Linux mountinfo 경로가 올바르지 않습니다")
        points.add(Path(point))
    return points


def mount_points():
    # ismount() cannot identify same-device bind mounts; mountinfo can.
    if not sys.platform.startswith("linux"):
        return set()
    return parse_mountinfo(Path("/proc/self/mountinfo").read_text(encoding="utf-8"))


def is_mount_point(path, points):
    return path in points or os.path.ismount(path)


def guard_tree_mounts(root):
    """Check before descending, including the obsolete tree before its removal."""
    points = mount_points()
    pending = [root]
    while pending:
        path = pending.pop()
        if is_mount_point(path, points):
            raise RuntimeError("마운트된 배포 경로는 지원하지 않습니다")
        if os.path.lexists(path) and stat.S_ISDIR(path.lstat().st_mode):
            pending.extend(path.iterdir())


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def checked_directory(path, missing=False, points=None):
    """Reject symlinks, mount points, and noncanonical ancestors before traversal."""
    if path != Path(os.path.abspath(path)) or path.resolve() != path:
        raise RuntimeError("ComBar 경로가 정규 경로가 아닙니다")
    if not os.path.lexists(path):
        if missing:
            return False
        raise RuntimeError("ComBar 배포 디렉터리가 없습니다")
    if not stat.S_ISDIR(path.lstat().st_mode) or is_mount_point(path, mount_points() if points is None else points):
        raise RuntimeError("ComBar 경로는 마운트되지 않은 일반 디렉터리여야 합니다")
    return True


def safe_relative(value):
    if (not isinstance(value, str) or not value or "\\" in value or ":" in value
            or any(ord(char) < 32 or ord(char) == 127 for char in value)):
        raise RuntimeError("ComBar 상대 경로가 올바르지 않습니다")
    path = PurePosixPath(value)
    if (not path.parts or path.is_absolute() or path.as_posix() != value
            or any(part in (".", "..") for part in path.parts)):
        raise RuntimeError("ComBar 상대 경로가 범위를 벗어납니다")
    return value


def inventory(dist):
    points = mount_points()
    checked_directory(dist, missing=True, points=points)
    checked_directory(dist / "combar", missing=True, points=points)
    root = dist / SCOPE
    if not checked_directory(root, missing=True, points=points):
        return {}
    records = {"": {"kind": "directory"}}
    stack = [root]
    while stack:
        parent = stack.pop()
        for path in sorted(parent.iterdir()):
            relative = safe_relative(path.relative_to(root).as_posix())
            info = path.lstat()
            if path.resolve() != path or is_mount_point(path, points):
                raise RuntimeError("ComBar 릴리스에 링크 또는 마운트가 포함되어 있습니다")
            if stat.S_ISDIR(info.st_mode):
                records[relative] = {"kind": "directory"}
                stack.append(path)
            elif stat.S_ISREG(info.st_mode) and info.st_nlink == 1:
                records[relative] = {"kind": "file", "size": info.st_size, "sha256": digest(path)}
            else:
                raise RuntimeError("ComBar 릴리스에 일반 파일 이외의 항목이 있습니다")
    return dict(sorted(records.items()))


def read_manifest(path):
    if path.is_symlink() or not path.is_file() or path.resolve() != path:
        raise RuntimeError("ComBar 보존 기록이 없습니다")
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != 1 or data.get("scope") != SCOPE.as_posix():
        raise RuntimeError("지원하지 않는 ComBar 보존 기록입니다")
    records = data.get("entries")
    if not isinstance(records, dict):
        raise RuntimeError("ComBar 보존 기록이 올바르지 않습니다")
    for relative, row in records.items():
        if relative:
            safe_relative(relative)
        if not isinstance(row, dict):
            raise RuntimeError("ComBar 항목 보존 기록이 올바르지 않습니다")
        if row.get("kind") == "directory" and row == {"kind": "directory"}:
            continue
        if (row.get("kind") != "file" or not relative
                or set(row) != {"kind", "size", "sha256"}
                or not isinstance(row["size"], int) or row["size"] < 0
                or not isinstance(row["sha256"], str)
                or len(row["sha256"]) != 64
                or any(char not in "0123456789abcdef" for char in row["sha256"])):
            raise RuntimeError("ComBar 파일 보존 기록이 올바르지 않습니다")
    return records


def write_manifest(path, records):
    checked_directory(path.parent)
    if os.path.lexists(path) and (path.is_symlink() or not path.is_file()):
        raise RuntimeError("ComBar 보존 기록 경로가 올바르지 않습니다")
    fd, temporary = tempfile.mkstemp(prefix=".combar-preserved-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump({"version": 1, "scope": SCOPE.as_posix(), "entries": records}, stream,
                      ensure_ascii=False, sort_keys=True, indent=2)
            stream.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def require_subset(expected, actual, reason):
    if any(actual.get(relative) != record for relative, record in expected.items()):
        raise RuntimeError(reason)


def merge(live, candidate, manifest, refresh=False):
    checked_directory(candidate)
    live_records = inventory(live)
    candidate_records = inventory(candidate)
    if refresh:
        prepared = read_manifest(manifest)
        require_subset(prepared, live_records, "준비 이후 운영 ComBar 파일이 삭제되거나 변경되었습니다")
        if candidate_records != prepared:
            raise RuntimeError("준비한 후보의 ComBar 파일이 변경되었습니다")
    # Web source must never publish or overwrite a release independently.
    require_subset(candidate_records, live_records, "웹 후보와 운영 ComBar 파일이 충돌하거나 미게시 릴리스가 포함되어 있습니다")
    for relative, row in live_records.items():
        destination = candidate / SCOPE / relative
        if row["kind"] == "directory":
            destination.mkdir(parents=True, exist_ok=True)
        elif relative not in candidate_records:
            fd, temporary = tempfile.mkstemp(prefix=".combar-copy-", dir=destination.parent)
            os.close(fd)
            try:
                shutil.copy2(live / SCOPE / relative, temporary)
                os.replace(temporary, destination)
            finally:
                if os.path.exists(temporary):
                    os.unlink(temporary)
    if inventory(live) != live_records or inventory(candidate) != live_records:
        raise RuntimeError("ComBar 보존 중 파일 목록 또는 해시가 변경되었습니다")
    write_manifest(manifest, live_records)
    print(f"ComBar 릴리스 보존 완료: {sum(row['kind'] == 'file' for row in live_records.values())}파일", flush=True)


def check(dist, manifest):
    records = read_manifest(manifest)
    if inventory(dist) != records:
        raise RuntimeError("서비스할 ComBar 파일이 보존 기록과 다릅니다")
    return records


def verify_public(dist, manifest, origin):
    records = check(dist, manifest)
    parsed = urlsplit(origin)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.path or parsed.query or parsed.fragment or parsed.port is not None):
        raise RuntimeError("ComBar 검증 주소는 경로 없는 HTTPS origin이어야 합니다")
    for relative, row in records.items():
        if row["kind"] != "file":
            continue
        url = origin + "/combar/releases/" + quote(relative, safe="/")
        for local in (True, False):
            with tempfile.TemporaryDirectory(prefix="combar-verify-") as directory:
                download = Path(directory) / "download"
                args = ["curl", "--silent", "--show-error", "--noproxy", "*", "--proto", "=https",
                        "--connect-timeout", "5", "--max-time", "180", "--output", str(download),
                        "--write-out", "%{http_code}"]
                if local:
                    args += ["--resolve", parsed.netloc + ":443:127.0.0.1"]
                result = subprocess.run(args + [url], check=True, stdout=subprocess.PIPE, timeout=190)
                if (result.stdout != b"200" or not download.is_file()
                        or download.stat().st_size != row["size"] or digest(download) != row["sha256"]):
                    raise RuntimeError("ComBar 공개 다운로드가 보존한 파일과 다릅니다")
    check(dist, manifest)
    print("ComBar 릴리스 로컬/TLS/공개 다운로드 검증 완료", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("prepare", "refresh", "check", "verify"))
    parser.add_argument("--live", required=True, type=Path)
    parser.add_argument("--candidate", type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--origin")
    args = parser.parse_args()
    if args.phase in ("prepare", "refresh"):
        if args.candidate is None:
            parser.error("보존 후보 경로가 필요합니다")
        paths = (args.live, args.candidate, args.manifest)
        if any(left == right or left in right.parents or right in left.parents
               for index, left in enumerate(paths) for right in paths[index + 1:]):
            parser.error("운영·후보·기록 경로가 겹칩니다")
        if args.phase == "prepare" and os.path.lexists(args.manifest):
            parser.error("기존 ComBar 보존 기록을 덮어쓸 수 없습니다")
        merge(args.live, args.candidate, args.manifest, refresh=args.phase == "refresh")
    elif args.phase == "verify":
        if not args.origin:
            parser.error("검증 origin이 필요합니다")
        verify_public(args.live, args.manifest, args.origin)
    else:
        check(args.live, args.manifest)


if __name__ == "__main__":
    main()
