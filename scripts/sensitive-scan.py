#!/usr/bin/env python3
from __future__ import annotations

import base64
import math
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_TEXT_BYTES = 2_000_000

SECRET_PATTERNS = [
    ("private_key_pem", re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----")),
    ("github_token", re.compile(rb"\bgh[pousr]_[A-Za-z0-9_]{36,}\b")),
    ("aws_access_key", re.compile(rb"\bAKIA[0-9A-Z]{16}\b")),
    ("slack_token", re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
    ("npm_token", re.compile(rb"\bnpm_[A-Za-z0-9]{36,}\b")),
    ("jwt", re.compile(rb"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
    ("env_secret_assignment", re.compile(rb"(?im)^\s*(?:[A-Z0-9_]*?(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|MNEMONIC|SEED|RPC_URL)[A-Z0-9_]*?)\s*=\s*(?!replace-|example|https://sepolia\.example\.invalid|0x0{40}\b|false\b|true\b|0\b|off\b|structured\b|\.wallet-audit/)[^\s#][^\n#]{7,}")),
]

ALLOWLIST_SNIPPETS = [
    b"0x1111111111111111111111111111111111111111",
    b"0x2222222222222222222222222222222222222222",
    b"0x0000000000000000000000000000000000000000",
    b"'aa'.repeat(65)",
    b"'bb'.repeat(32)",
    b"https://sepolia.example.invalid",
]

TEXT_SUFFIXES = {
    ".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yaml", ".yml", ".toml", ".txt", ".html", ".css", ".gitignore", ".nvmrc"
}


def run(args: list[str]) -> bytes:
    return subprocess.check_output(args, cwd=ROOT)


def shannon_entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = {b: data.count(b) for b in set(data)}
    return -sum((c / len(data)) * math.log2(c / len(data)) for c in counts.values())


def is_text_path(path: Path) -> bool:
    if path.name in {".gitignore", ".nvmrc"}:
        return True
    return path.suffix.lower() in TEXT_SUFFIXES


def scan_blob(label: str, data: bytes) -> list[str]:
    findings: list[str] = []
    for name, pattern in SECRET_PATTERNS:
        for match in pattern.finditer(data):
            snippet = match.group(0)[:180]
            if any(allowed in snippet for allowed in ALLOWLIST_SNIPPETS):
                continue
            findings.append(f"{label}: {name}: {snippet.decode('utf-8', 'replace')}")

    # High-entropy long string scan for common token shapes. Avoid image/binary blobs.
    for token in re.findall(rb"[A-Za-z0-9_+./=-]{40,}", data):
        if any(allowed in token for allowed in ALLOWLIST_SNIPPETS):
            continue
        if token.startswith((b"sha512-", b"integrity=", b"0x")):
            continue
        if re.fullmatch(rb"[A-Z0-9_]+(?:\.[A-Za-z0-9_]+)*", token):
            continue
        if shannon_entropy(token) >= 4.8 and not re.fullmatch(rb"[ab01]+", token):
            findings.append(f"{label}: high_entropy_token: {token[:120].decode('utf-8', 'replace')}")
    return findings


def main() -> int:
    tracked = run(["git", "ls-files"]).decode().splitlines()
    untracked = run(["git", "ls-files", "--others", "--exclude-standard"]).decode().splitlines()
    paths = [Path(p) for p in tracked + untracked]
    findings: list[str] = []

    for rel in paths:
        path = ROOT / rel
        if not path.is_file():
            continue
        data = path.read_bytes()
        if len(data) > MAX_TEXT_BYTES or not is_text_path(path):
            continue
        findings.extend(scan_blob(str(rel), data))

    history = run(["git", "log", "--all", "--format=commit:%H%n%B", "--", ":!pnpm-lock.yaml"])
    findings.extend(scan_blob("git-history-messages", history))

    # Keep patch history scan bounded to text files and exclude lockfile churn.
    patches = run(["git", "log", "--all", "-p", "--", ":!pnpm-lock.yaml", ":!*.png"])
    findings.extend(scan_blob("git-history-patches", patches))

    if findings:
        print("Potential sensitive content found:")
        for finding in findings[:80]:
            print(f"- {finding}")
        if len(findings) > 80:
            print(f"... {len(findings) - 80} more")
        return 1

    print(f"Sensitive-content scan passed: {len(tracked)} tracked and {len(untracked)} untracked paths checked; git history messages/patches checked.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
