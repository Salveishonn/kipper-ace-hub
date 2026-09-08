#!/usr/bin/env python3
"""Install Cursor skills from the VoltAgent/awesome-agent-skills catalog.

Clones each unique public GitHub source listed in the catalog and copies
discovered SKILL.md folders into .cursor/skills/ with owner-prefixed names
so skills from different vendors do not overwrite each other.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

CATALOG_URL = (
    "https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md"
)
WORKSPACE = Path(__file__).resolve().parents[1]
DEST_ROOT = WORKSPACE / ".cursor" / "skills"
MANIFEST_PATH = WORKSPACE / ".cursor" / "awesome-agent-skills-manifest.json"
MAX_WORKERS = 6
CLONE_TIMEOUT_SEC = 180
OFFENSIVE_RE = re.compile(
    r"pentest|red.?team|exploit|malware|payload|ransomware|weaponiz|"
    r"offensive.?security|hack.?the.?box|metasploit|c2.?framework|keylog",
    re.I,
)
SKIP_REPOS = {
    "mukul975/Anthropic-Cybersecurity-Skills",
}
# officialskills.sh/{owner}/skills is a catalog alias, not always github.com/{owner}/skills.
OFFICIAL_REPO_MAP = {
    "WordPress": "WordPress/agent-skills",
    "addyosmani": "addyosmani/web-quality-skills",
    "auth0": "auth0/agent-skills",
    "binance": "binance/binance-skills-hub",
    "brave": "brave/brave-search-skills",
    "callstackincubator": "callstackincubator/agent-skills",
    "clickhouse": "ClickHouse/agent-skills",
    "coinbase": "coinbase/agentic-wallet-skills",
    "datadog-labs": "datadog-labs/agent-skills",
    "duckdb": "duckdb/duckdb-skills",
    "figma": "figma/mcp-server-guide",
    "garrytan": "garrytan/gstack",
    "google-gemini": "google-gemini/gemini-skills",
    "googleworkspace": "googleworkspace/cli",
    "greensock": "greensock/gsap-skills",
    "hashicorp": "hashicorp/agent-skills",
    "mongodb": "mongodb/agent-skills",
    "neondatabase": "neondatabase/agent-skills",
    "netlify": "netlify/context-and-tools",
    "sanity-io": "sanity-io/agent-toolkit",
    "stripe": "stripe/ai",
    "supabase": "supabase/agent-skills",
    "tinybirdco": "tinybirdco/tinybird-agent-skills",
    "typefully": "typefully/agent-skills",
}
GOOGLE_LABS_REPOS = [
    "google-labs-code/stitch-skills",
    "google-labs-code/jules-skills",
]
IGNORE_DIR_NAMES = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "build",
    ".next",
    "coverage",
}


def fetch_catalog() -> str:
    with urllib.request.urlopen(CATALOG_URL, timeout=60) as response:
        return response.read().decode("utf-8")


def parse_catalog(text: str) -> tuple[dict[str, list[dict[str, str]]], list[dict[str, str]]]:
    entries = re.findall(
        r"^- \*\*\[([^\]]+)\]\((https?://[^)]+)\)\*\* - (.+)$",
        text,
        flags=re.M,
    )
    repos: dict[str, list[dict[str, str]]] = {}
    skipped: list[dict[str, str]] = []
    for name, link, desc in entries:
        record = {"name": name, "url": link, "description": desc}
        if (
            name in SKIP_REPOS
            or OFFENSIVE_RE.search(name)
            or OFFENSIVE_RE.search(desc)
            or OFFENSIVE_RE.search(link)
        ):
            skipped.append({**record, "reason": "skipped-offensive-or-blocked"})
            continue
        owner_repo = None
        if "officialskills.sh/" in link or "skills.sh/" in link:
            match = re.search(
                r"https?://(?:www\.)?(?:official)?skills\.sh/([^/]+)/([^/]+)",
                link,
            )
            if match:
                owner_repo = f"{match.group(1)}/{match.group(2)}"
        elif "github.com/" in link:
            match = re.search(r"github\.com/([^/]+)/([^/#?\s]+)", link)
            if match:
                owner_repo = f"{match.group(1)}/{match.group(2).removesuffix('.git')}"
        if not owner_repo:
            skipped.append({**record, "reason": "not-a-github-skill-repo"})
            continue
        owner = owner_repo.split("/", 1)[0]
        if owner_repo.endswith("/skills") and owner in OFFICIAL_REPO_MAP:
            owner_repo = OFFICIAL_REPO_MAP[owner]
        repos.setdefault(owner_repo, []).append(record)
    for extra in GOOGLE_LABS_REPOS:
        repos.setdefault(extra, [])
    return repos, skipped


def slug(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-._")
    return cleaned or "skill"


def clone_repo(owner_repo: str, dest: Path) -> tuple[str, bool, str]:
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)
    dest.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://github.com/{owner_repo}.git"
    env = os.environ.copy()
    env["GIT_LFS_SKIP_SMUDGE"] = "1"
    env["GIT_TERMINAL_PROMPT"] = "0"
    try:
        subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--single-branch",
                url,
                str(dest),
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=CLONE_TIMEOUT_SEC,
            env=env,
        )
        return owner_repo, True, "cloned"
    except subprocess.TimeoutExpired:
        return owner_repo, False, "clone-timeout"
    except subprocess.CalledProcessError as exc:
        err = (exc.stderr or exc.stdout or str(exc)).strip().splitlines()
        return owner_repo, False, err[-1] if err else "clone-failed"


def find_skill_dirs(repo_dir: Path) -> list[Path]:
    skill_dirs: list[Path] = []
    for skill_md in repo_dir.rglob("SKILL.md"):
        if any(part in IGNORE_DIR_NAMES for part in skill_md.parts):
            continue
        skill_dirs.append(skill_md.parent)
    # Prefer shallower skill roots when one skill is nested inside another.
    skill_dirs.sort(key=lambda path: len(path.parts))
    selected: list[Path] = []
    for candidate in skill_dirs:
        if any(candidate != kept and candidate.is_relative_to(kept) for kept in selected):
            continue
        selected.append(candidate)
    return selected


def copy_skill(src: Path, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(
        src,
        dest,
        ignore=shutil.ignore_patterns(
            ".git",
            "node_modules",
            "__pycache__",
            ".venv",
            "venv",
            ".DS_Store",
        ),
        dirs_exist_ok=False,
    )


def install_from_clone(owner_repo: str, repo_dir: Path) -> list[dict[str, str]]:
    owner, repo = owner_repo.split("/", 1)
    installed: list[dict[str, str]] = []
    skill_dirs = find_skill_dirs(repo_dir)
    if not skill_dirs:
        return [
            {
                "source": owner_repo,
                "status": "no-skill-md",
            }
        ]
    used_names: set[str] = set()
    for skill_dir in skill_dirs:
        skill_name = skill_dir.name if skill_dir != repo_dir else repo
        dest_name = slug(f"{owner}--{skill_name}")
        if dest_name in used_names:
            rel = slug(str(skill_dir.relative_to(repo_dir)).replace("/", "-"))
            dest_name = slug(f"{owner}--{rel}")
        used_names.add(dest_name)
        dest = DEST_ROOT / dest_name
        copy_skill(skill_dir, dest)
        installed.append(
            {
                "source": owner_repo,
                "skill": skill_name,
                "dest": str(dest.relative_to(WORKSPACE)),
                "status": "installed",
            }
        )
    return installed


def main() -> int:
    DEST_ROOT.mkdir(parents=True, exist_ok=True)
    print("Fetching catalog...")
    catalog = fetch_catalog()
    repos, skipped = parse_catalog(catalog)
    print(f"Unique GitHub sources: {len(repos)}")
    print(f"Skipped catalog entries: {len(skipped)}")

    with tempfile.TemporaryDirectory(prefix="awesome-skills-") as tmp:
        tmp_path = Path(tmp)
        clone_results: dict[str, tuple[bool, str, Path]] = {}
        print(f"Cloning {len(repos)} repositories...")
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {
                pool.submit(
                    clone_repo,
                    owner_repo,
                    tmp_path / owner_repo.replace("/", "__"),
                ): owner_repo
                for owner_repo in sorted(repos)
            }
            done = 0
            for future in as_completed(futures):
                owner_repo, ok, message = future.result()
                dest = tmp_path / owner_repo.replace("/", "__")
                clone_results[owner_repo] = (ok, message, dest)
                done += 1
                if done % 10 == 0 or not ok:
                    status = "ok" if ok else "FAIL"
                    print(f"[{done}/{len(repos)}] {status} {owner_repo}: {message}")

        installed: list[dict[str, str]] = []
        failed: list[dict[str, str]] = []
        for owner_repo in sorted(repos):
            ok, message, repo_dir = clone_results[owner_repo]
            if not ok:
                failed.append(
                    {"source": owner_repo, "status": "clone-failed", "error": message}
                )
                continue
            try:
                results = install_from_clone(owner_repo, repo_dir)
                for item in results:
                    if item.get("status") == "installed":
                        installed.append(item)
                    else:
                        failed.append(item)
            except Exception as exc:  # noqa: BLE001
                failed.append(
                    {
                        "source": owner_repo,
                        "status": "install-failed",
                        "error": str(exc),
                    }
                )

    manifest = {
        "catalog": CATALOG_URL,
        "installed_skill_count": len(installed),
        "failed_source_count": len(failed),
        "skipped_catalog_entries": skipped,
        "installed": installed,
        "failed": failed,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Installed skills: {len(installed)}")
    print(f"Failed sources: {len(failed)}")
    print(f"Wrote {MANIFEST_PATH.relative_to(WORKSPACE)}")
    if failed:
        print("Failures:")
        for item in failed[:40]:
            print(f"  - {item}")
        if len(failed) > 40:
            print(f"  ... {len(failed) - 40} more")
    return 0 if installed else 1


if __name__ == "__main__":
    sys.exit(main())
