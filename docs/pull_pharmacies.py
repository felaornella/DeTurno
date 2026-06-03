#!/usr/bin/env python3
"""Fetch on-duty pharmacies and publish docs/pharmacies.json in the DeTurno repo."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

DOCS_DIR = Path(__file__).resolve().parent
REPO_DIR = DOCS_DIR.parent
OUTPUT_FILE = DOCS_DIR / "pharmacies.json"
SOURCE_URL = "https://www.colfarmalp.org.ar/turnos-la-plata/"
DEFAULT_GEO = {"lat": "-34.920494", "long": "-57.953568"}
COMMIT_MESSAGE = "[AUTO] update pharmacies"


def clean_cell_text(text: str, label: str) -> str:
    return text.replace("\n", "").replace("\t", "").replace(label, "").strip()


def fetch_pharmacies() -> list[dict]:
    response = requests.get(SOURCE_URL, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    turnos = soup.select_one(".turnos")
    if not turnos:
        raise RuntimeError("No pharmacy list found in the response.")

    pharmacies = []
    for row in turnos.find_all("div", class_="tr", recursive=False):
        cells = row.select(".td")
        if len(cells) < 5:
            continue

        pharmacy = {
            "nombre": clean_cell_text(cells[0].get_text(), "Farmacia").title(),
            "direccion": clean_cell_text(cells[1].get_text(), "Dirección"),
            "zona": clean_cell_text(cells[2].get_text(), "Zona"),
            "telefono": clean_cell_text(cells[3].get_text(), "Teléfono"),
            "geo": {"lat": "", "long": ""},
            "osde": {},
        }

        geo_link = cells[4].find("a")
        if geo_link and geo_link.get("href"):
            href = geo_link["href"]
            if "destination=" in href:
                coords = href.split("destination=")[1].split(",")
                lat = coords[0].split("&")[0]
                long = coords[1].split("&")[0]
                if lat == "0" and long == "0":
                    pharmacy["geo"] = DEFAULT_GEO.copy()
                else:
                    pharmacy["geo"]["lat"] = lat
                    pharmacy["geo"]["long"] = long

        pharmacies.append(pharmacy)

    if not pharmacies:
        raise RuntimeError("Pharmacy list parsed but no rows found.")

    return pharmacies


def pharmacies_digest(pharmacies: list[dict]) -> str:
    canonical = json.dumps(pharmacies, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def read_existing_pharmacies() -> list[dict] | None:
    if not OUTPUT_FILE.is_file():
        return None

    try:
        data = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
        pharmacies = data.get("pharmacies")
        if isinstance(pharmacies, list) and pharmacies:
            return pharmacies
    except (OSError, json.JSONDecodeError, TypeError):
        pass

    return None


def write_pharmacies_json(pharmacies: list[dict]) -> bool:
    """Write pharmacies.json only when the pharmacy list changed."""
    new_digest = pharmacies_digest(pharmacies)
    existing = read_existing_pharmacies()

    if existing is not None and pharmacies_digest(existing) == new_digest:
        print("Pharmacy data unchanged; skipping file write and git publish.")
        return False

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "pharmacies": pharmacies,
    }
    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(pharmacies)} pharmacies to {OUTPUT_FILE}")
    return True


def run_git_publish() -> None:
    subprocess.run(["git", "add", "."], cwd=REPO_DIR, check=True)

    unchanged = subprocess.run(
        ["git", "diff", "--cached", "--quiet"],
        cwd=REPO_DIR,
    )
    if unchanged.returncode == 0:
        print("No changes to commit.")
        return

    for command in (
        ["git", "commit", "-m", COMMIT_MESSAGE],
        ["git", "push", "origin", "master"],
    ):
        print(f"$ {' '.join(command)}")
        subprocess.run(command, cwd=REPO_DIR, check=True)


def main() -> int:
    if not REPO_DIR.is_dir():
        print(f"DeTurno repo not found at {REPO_DIR}", file=sys.stderr)
        return 1

    try:
        pharmacies = fetch_pharmacies()
        if write_pharmacies_json(pharmacies):
            run_git_publish()
    except subprocess.CalledProcessError as error:
        print(f"Git command failed: {error}", file=sys.stderr)
        return 1
    except Exception as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
