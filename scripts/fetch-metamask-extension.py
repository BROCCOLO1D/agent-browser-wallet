#!/usr/bin/env python3
"""Download and unpack the pinned MetaMask Chrome extension artifact.

This helper intentionally writes under .wallet-extensions/, which is ignored by git.
It does not read wallet secrets, profiles, or .env files.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

PINNED_METAMASK_VERSION = "13.29.0"
DEFAULT_RELEASE_BASE_URL = "https://github.com/MetaMask/metamask-extension/releases/download"


def default_artifact_dir(version: str) -> Path:
    return Path(".wallet-extensions") / "metamask" / version


def default_extension_dir(version: str) -> Path:
    return default_artifact_dir(version) / "chrome"


def default_zip_path(version: str) -> Path:
    return default_artifact_dir(version) / f"metamask-chrome-{version}.zip"


def default_download_url(version: str) -> str:
    return f"{DEFAULT_RELEASE_BASE_URL}/v{version}/metamask-chrome-{version}.zip"


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download and unpack the pinned MetaMask Chrome extension artifact into .wallet-extensions/."
    )
    parser.add_argument("--version", default=PINNED_METAMASK_VERSION, help="MetaMask release version to fetch.")
    parser.add_argument("--url", help="Override the release zip URL. Defaults to the official MetaMask GitHub release asset.")
    parser.add_argument("--output-dir", help="Unpacked extension output directory. Defaults to .wallet-extensions/metamask/<version>/chrome.")
    parser.add_argument("--zip-path", help="Downloaded zip path. Defaults to .wallet-extensions/metamask/<version>/metamask-chrome-<version>.zip.")
    parser.add_argument("--force", action="store_true", help="Replace an existing unpacked extension directory.")
    parser.add_argument("--dry-run", action="store_true", help="Print the planned safe local paths and URL without downloading anything.")
    return parser.parse_args(argv)


def read_manifest(extension_dir: Path) -> dict[str, Any]:
    manifest_path = extension_dir / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Extracted MetaMask manifest is missing: {manifest_path}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Extracted MetaMask manifest is not valid JSON: {manifest_path}") from exc
    if not isinstance(manifest, dict):
        raise RuntimeError(f"Extracted MetaMask manifest root is not an object: {manifest_path}")
    return manifest


def resolve_manifest_text(extension_dir: Path, manifest: dict[str, Any], value: str) -> str:
    if not (value.startswith("__MSG_") and value.endswith("__")):
        return value
    key = value[len("__MSG_") : -len("__")]
    default_locale = manifest.get("default_locale")
    if not isinstance(default_locale, str) or default_locale.strip() == "":
        return value
    messages_path = extension_dir / "_locales" / default_locale / "messages.json"
    try:
        messages = json.loads(messages_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return value
    if not isinstance(messages, dict):
        return value
    entry = messages.get(key)
    if isinstance(entry, dict) and isinstance(entry.get("message"), str):
        return entry["message"]
    return value


def validate_manifest(extension_dir: Path, expected_version: str) -> dict[str, str]:
    manifest = read_manifest(extension_dir)
    manifest_version = manifest.get("manifest_version")
    if manifest_version != 3:
        raise RuntimeError(f"Extracted MetaMask manifest_version must be 3: found {manifest_version!r}")
    name = resolve_manifest_text(extension_dir, manifest, manifest.get("name") if isinstance(manifest.get("name"), str) else "")
    short_name = resolve_manifest_text(
        extension_dir, manifest, manifest.get("short_name") if isinstance(manifest.get("short_name"), str) else ""
    )
    if name.strip().lower() != "metamask" and short_name.strip().lower() != "metamask":
        raise RuntimeError("Extracted extension manifest does not identify MetaMask exactly.")
    found_version = manifest.get("version")
    if found_version != expected_version:
        raise RuntimeError(f"Extracted MetaMask version mismatch: expected {expected_version}, found {found_version!r}.")
    return {"name": name, "shortName": short_name, "version": found_version}


def download(url: str, zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = zip_path.with_suffix(zip_path.suffix + ".tmp")
    try:
        with urllib.request.urlopen(url, timeout=120) as response, tmp_path.open("wb") as output:
            shutil.copyfileobj(response, output)
        tmp_path.replace(zip_path)
    finally:
        tmp_path.unlink(missing_ok=True)


def extract(zip_path: Path, output_dir: Path, *, force: bool) -> None:
    if output_dir.exists():
        if not force:
            raise RuntimeError(f"Output directory already exists: {output_dir}. Pass --force to replace it.")
        shutil.rmtree(output_dir)

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="metamask-extension-") as temp_dir:
        temp_path = Path(temp_dir) / "chrome"
        with zipfile.ZipFile(zip_path) as archive:
            archive.extractall(temp_path)
        temp_path.replace(output_dir)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    version = args.version.strip()
    if version == "":
        raise RuntimeError("--version must not be empty.")

    output_dir = Path(args.output_dir) if args.output_dir else default_extension_dir(version)
    zip_path = Path(args.zip_path) if args.zip_path else default_zip_path(version)
    url = args.url or default_download_url(version)

    result: dict[str, Any] = {
        "status": "planned" if args.dry_run else "fetched",
        "version": version,
        "url": url,
        "zipPath": str(zip_path),
        "extensionPath": str(output_dir),
        "notes": [
            "Downloaded extension bundles are local-only artifacts and must remain ignored by git.",
            "Use METAMASK_EXTENSION_PATH or the default artifact path with pnpm wallet:smoke:metamask after visual inspection."
        ],
    }

    if not args.dry_run:
        download(url, zip_path)
        extract(zip_path, output_dir, force=args.force)
        result["manifest"] = validate_manifest(output_dir, version)

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as exc:  # noqa: BLE001 - CLI boundary should report concise failures.
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
