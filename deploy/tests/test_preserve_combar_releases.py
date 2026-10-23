"""Isolated filesystem/HTTP-stub tests: no live hosts, DB, or release publishing."""

import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


HELPER = Path(__file__).resolve().parents[1] / "preserve-combar-releases.py"
SPEC = importlib.util.spec_from_file_location("preserve_combar", HELPER)
preserve = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(preserve)


class ReleasePreservationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.live = self.root / "live"
        self.candidate = self.root / "candidate"
        self.manifest = self.root / "records.json"
        self.live.mkdir()
        self.candidate.mkdir()
        (self.live / "index.html").write_text("previous frontend")
        (self.candidate / "index.html").write_text("new frontend")

    def release(self, directory, version="1.0.15", data=b"test executable"):
        root = directory / "combar/releases" / version
        root.mkdir(parents=True, exist_ok=True)
        (root / ("ComBarSetup-" + version + ".exe")).write_bytes(data)
        (root / "release-manifest.json").write_text('{"version":"' + version + '"}')
        return root

    def prepare(self):
        preserve.merge(self.live, self.candidate, self.manifest)

    def test_all_live_only_versions_preserved_without_overwriting_app(self):
        for version in ("1.0.4", "1.0.11", "1.0.14", "1.0.15"):
            self.release(self.live, version)
        before = preserve.inventory(self.live)
        self.prepare()
        self.assertEqual(before, preserve.inventory(self.candidate))
        self.assertEqual(before, preserve.inventory(self.live))
        self.assertEqual(8, sum(row["kind"] == "file" for row in before.values()))
        self.assertEqual("new frontend", (self.candidate / "index.html").read_text())
        self.assertEqual("previous frontend", (self.live / "index.html").read_text())
        self.assertEqual(before, preserve.read_manifest(self.manifest))

    def test_no_live_releases_is_supported(self):
        self.prepare()
        preserve.merge(self.live, self.candidate, self.manifest, refresh=True)
        self.assertEqual({}, preserve.check(self.candidate, self.manifest))

    def test_missing_initial_live_dist_is_supported(self):
        self.live.rename(self.root / "old")
        self.prepare()
        self.assertEqual({}, preserve.read_manifest(self.manifest))

    def test_identical_public_release_is_accepted(self):
        self.release(self.live)
        self.release(self.candidate)
        self.prepare()
        self.assertEqual(preserve.inventory(self.live), preserve.inventory(self.candidate))

    def test_different_same_name_public_release_is_rejected(self):
        self.release(self.live)
        self.release(self.candidate, data=b"stale public executable")
        with self.assertRaisesRegex(RuntimeError, "충돌"):
            self.prepare()
        self.assertFalse(self.manifest.exists())

    def test_source_cannot_publish_new_release(self):
        self.release(self.live)
        self.release(self.candidate, "1.0.16")
        with self.assertRaisesRegex(RuntimeError, "미게시"):
            self.prepare()

    def test_refresh_merges_new_live_release_before_activation(self):
        self.release(self.live)
        self.prepare()
        self.release(self.live, "1.0.16")
        preserve.merge(self.live, self.candidate, self.manifest, refresh=True)
        self.assertEqual(4, sum(row["kind"] == "file" for row in preserve.check(self.candidate, self.manifest).values()))

    def test_refresh_rejects_deleted_or_changed_prepared_live_file(self):
        for mode in ("delete", "change"):
            with self.subTest(mode=mode):
                release = self.release(self.live)
                self.prepare()
                file = release / "ComBarSetup-1.0.15.exe"
                if mode == "delete":
                    file.unlink()
                else:
                    file.write_bytes(b"changed")
                with self.assertRaisesRegex(RuntimeError, "삭제되거나 변경"):
                    preserve.merge(self.live, self.candidate, self.manifest, refresh=True)

    def test_refresh_rejects_candidate_modification_or_new_file(self):
        self.release(self.live)
        self.prepare()
        (self.candidate / "combar/releases/extra").write_bytes(b"not published")
        with self.assertRaisesRegex(RuntimeError, "후보"):
            preserve.merge(self.live, self.candidate, self.manifest, refresh=True)

    @unittest.skipUnless(os.name == "posix", "Real symlink fixtures require POSIX")
    def test_symlink_at_every_scope_level_and_file_is_rejected(self):
        for segment in ("combar", "combar/releases", "combar/releases/1.0.15", "combar/releases/1.0.15/link"):
            with self.subTest(segment=segment):
                fixture = self.root / ("scope" + str(len(segment)))
                fixture.mkdir()
                path = fixture / segment
                path.parent.mkdir(parents=True, exist_ok=True)
                path.symlink_to(self.live, target_is_directory=True)
                with self.assertRaises(RuntimeError):
                    preserve.inventory(fixture)

    @unittest.skipUnless(os.name == "posix", "Real FIFO fixtures require POSIX")
    def test_fifo_and_hardlink_are_rejected_without_reading(self):
        release = self.release(self.live)
        special = release / "special"
        os.mkfifo(special)
        with self.assertRaisesRegex(RuntimeError, "일반 파일"):
            preserve.inventory(self.live)
        special.unlink()
        os.link(release / "ComBarSetup-1.0.15.exe", special)
        with self.assertRaisesRegex(RuntimeError, "일반 파일"):
            preserve.inventory(self.live)

    def test_mount_point_is_rejected(self):
        release = self.release(self.live)
        with patch.object(preserve.os.path, "ismount", side_effect=lambda path: path == release):
            with self.assertRaisesRegex(RuntimeError, "마운트"):
                preserve.inventory(self.live)

    def test_manifest_relative_path_escape_is_rejected(self):
        for relative in ("../escape", "/escape", "a/../escape", "a//b", "a\\b", "C:/escape", ".", "a\nb"):
            with self.subTest(relative=relative):
                self.manifest.write_text(json.dumps({"version": 1, "scope": "combar/releases",
                                                     "entries": {relative: {"kind": "directory"}}}))
                with self.assertRaises(RuntimeError):
                    preserve.read_manifest(self.manifest)

    def test_after_exchange_check_requires_exact_inventory(self):
        self.release(self.live)
        self.prepare()
        preserve.check(self.candidate, self.manifest)
        (self.candidate / "combar/releases/1.0.15/release-manifest.json").unlink()
        with self.assertRaisesRegex(RuntimeError, "보존 기록"):
            preserve.check(self.candidate, self.manifest)

    def test_copy_time_live_change_is_rejected(self):
        self.release(self.live)
        original = preserve.shutil.copy2

        def mutate(source, destination):
            result = original(source, destination)
            Path(source).write_bytes(b"changed during copy")
            return result

        with patch.object(preserve.shutil, "copy2", side_effect=mutate):
            with self.assertRaisesRegex(RuntimeError, "보존 중"):
                self.prepare()

    def test_public_download_checks_local_tls_and_public_tls_without_buffering_file(self):
        release = self.release(self.live)
        self.prepare()

        def download(args, **kwargs):
            target = Path(args[args.index("--output") + 1])
            target.write_bytes((release / args[-1].rsplit("/", 1)[1]).read_bytes())
            return subprocess.CompletedProcess(args, 0, stdout=b"200")

        with patch.object(preserve.subprocess, "run", side_effect=download) as requests:
            preserve.verify_public(self.candidate, self.manifest, "https://example.com")
            self.assertEqual(4, requests.call_count)
            local = ["--resolve" in call.args[0] for call in requests.call_args_list]
            self.assertEqual([True, False, True, False], local)
            self.assertTrue(all(call.kwargs["check"] for call in requests.call_args_list))

    def test_wrong_public_hash_or_http_status_is_rejected(self):
        self.release(self.live)
        self.prepare()
        for status in (b"200", b"503"):
            with self.subTest(status=status):
                def download(args, **kwargs):
                    Path(args[args.index("--output") + 1]).write_bytes(b"incorrect response")
                    return subprocess.CompletedProcess(args, 0, stdout=status)

                with patch.object(preserve.subprocess, "run", side_effect=download):
                    with self.assertRaisesRegex(RuntimeError, "공개 다운로드"):
                        preserve.verify_public(self.candidate, self.manifest, "https://example.com")

    def test_non_https_or_credential_origins_rejected(self):
        self.prepare()
        for origin in ("http://example.com", "https://user:pass@example.com", "https://example.com/", "https://example.com:443"):
            with self.subTest(origin=origin):
                with self.assertRaisesRegex(RuntimeError, "HTTPS origin"):
                    preserve.verify_public(self.candidate, self.manifest, origin)

    def test_cli_rejects_overlap_and_existing_prepare_manifest(self):
        overlap = subprocess.run(["python3" if os.name == "posix" else "python", str(HELPER), "prepare",
                                  "--live", str(self.live), "--candidate", str(self.live),
                                  "--manifest", str(self.manifest)], capture_output=True)
        self.assertNotEqual(0, overlap.returncode)
        self.assertIn("겹칩니다", overlap.stderr.decode())
        self.prepare()
        exists = subprocess.run(["python3" if os.name == "posix" else "python", str(HELPER), "prepare",
                                 "--live", str(self.live), "--candidate", str(self.candidate),
                                 "--manifest", str(self.manifest)], capture_output=True)
        self.assertNotEqual(0, exists.returncode)
        self.assertIn("덮어쓸", exists.stderr.decode())

    @unittest.skipUnless(sys.platform.startswith("linux"), "Atomic renameat2 exchange requires Linux")
    def test_actual_deploy_exchange_preserves_new_release_and_removes_obsolete_tree(self):
        self.release(self.live)
        self.prepare()
        self.release(self.live, "1.0.16")
        preserve.merge(self.live, self.candidate, self.manifest, refresh=True)
        # Execute the deployment script's actual exchange implementation against fixtures.
        source = (HELPER.parent / "deploy-www.sh").read_text()
        exchange = source.split("exchange_candidate() {\n", 1)[1].split("\nPY\n}", 1)[0]
        python = exchange.split("<<'PY'\n", 1)[1]
        subprocess.run([sys.executable, "-", str(self.candidate), str(self.live), "check", str(HELPER)],
                       input=python, text=True, check=True, capture_output=True)
        subprocess.run([sys.executable, "-", str(self.candidate), str(self.live), "activate", str(HELPER)],
                       input=python, text=True, check=True, capture_output=True)
        self.assertFalse(self.candidate.exists())
        self.assertEqual("new frontend", (self.live / "index.html").read_text())
        self.assertEqual(4, sum(row["kind"] == "file" for row in preserve.check(self.live, self.manifest).values()))

    def test_cli_prepare_refresh_and_check_use_the_same_record(self):
        self.release(self.live)
        common = ["--live", str(self.live), "--candidate", str(self.candidate), "--manifest", str(self.manifest)]
        for phase in ("prepare", "refresh", "check"):
            command = [sys.executable, str(HELPER), phase] + common
            if phase == "check":
                command[command.index("--live") + 1] = str(self.candidate)
            subprocess.run(command, check=True, capture_output=True)

    def test_mountinfo_decodes_linux_escaped_mountpoint_fields(self):
        text = ("42 1 8:1 / / rw - ext4 /dev/x rw\n"
                r"43 42 8:1 /source /tmp/a\040b\011c\012d\134e rw shared:2 - ext4 /dev/x rw" + "\n")
        self.assertEqual({Path("/"), Path("/tmp/a b\tc\nd\\e")}, preserve.parse_mountinfo(text))
        with self.assertRaises(RuntimeError):
            preserve.parse_mountinfo("invalid mountinfo")

    def test_same_device_bind_mount_rejected_even_when_ismount_returns_false(self):
        release = self.release(self.live)
        with patch.object(preserve, "mount_points", return_value={Path("/"), release}), \
                patch.object(preserve.os.path, "ismount", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "마운트"):
                preserve.inventory(self.live)
            with self.assertRaisesRegex(RuntimeError, "마운트"):
                preserve.guard_tree_mounts(self.live)

    def test_ordinary_ancestor_mount_and_similar_prefix_are_allowed(self):
        self.release(self.live)
        points = {Path("/"), self.root, self.root / "live-similar", self.live / "combar/releases-extra"}
        with patch.object(preserve, "mount_points", return_value=points), \
                patch.object(preserve.os.path, "ismount", return_value=False):
            preserve.inventory(self.live)
            preserve.guard_tree_mounts(self.live)

    def test_full_tree_guard_rejects_mount_outside_combar_scope(self):
        assets = self.live / "assets"
        assets.mkdir()
        with patch.object(preserve, "mount_points", return_value={assets}), \
                patch.object(preserve.os.path, "ismount", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "마운트"):
                preserve.guard_tree_mounts(self.live)


if __name__ == "__main__":
    unittest.main()
