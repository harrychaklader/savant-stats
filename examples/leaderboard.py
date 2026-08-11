#!/usr/bin/env python3
"""Leaderboard CSV download (Python).

Usage: python leaderboard.py [type] [year] [player_type]
Requires: requests
"""
import sys

import requests

TYPE = sys.argv[1] if len(sys.argv) > 1 else "expected_statistics"
YEAR = sys.argv[2] if len(sys.argv) > 2 else "2025"
PLAYER_TYPE = sys.argv[3] if len(sys.argv) > 3 else "batter"

url = (
    f"https://baseballsavant.mlb.com/leaderboard/{TYPE}"
    f"?year={YEAR}&type={PLAYER_TYPE}&min=q&csv=true"
)

print(f"Downloading {TYPE} leaderboard ({YEAR}, {PLAYER_TYPE})...")
r = requests.get(url, timeout=60)
r.raise_for_status()

lines = r.text.splitlines()
header = lines[0].split(",") if lines else []
print(f"Columns ({len(header)}): {', '.join(header)}")
print(f"Rows: {max(len(lines) - 1, 0)}")