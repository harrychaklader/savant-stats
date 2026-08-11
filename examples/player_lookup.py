#!/usr/bin/env python3
"""Resolve a player name to MLBAM ID via statsapi, then fetch their Savant page.

Usage: python player_lookup.py "Aaron Judge"
Requires: requests, pandas
"""
import io
import sys

import pandas as pd
import requests

name = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Aaron Judge"

# 1. Resolve name -> MLBAM player ID via statsapi
search_url = "https://statsapi.mlb.com/api/v1/people/search"
r = requests.get(search_url, params={"names": name, "sportId": 1}, timeout=30)
r.raise_for_status()
people = r.json().get("people", [])
if not people:
    print(f"No player found for '{name}'")
    sys.exit(1)

person = people[0]
pid = person["id"]
full = person.get("fullName", name)
print(f"Resolved: {full} -> MLBAM ID {pid}")

# 2. Fetch Savant player page (HTML with embedded JSON)
savant_url = (
    f"https://baseballsavant.mlb.com/savant-player/"
    f"{full.lower().replace(' ', '-')}-{pid}?stats=statcast-r-hitting-mlb"
)
print(f"Fetching {savant_url}")
r2 = requests.get(savant_url, timeout=30)
r2.raise_for_status()
print(f"Player page HTTP {r2.status_code}, {len(r2.text):,} bytes")

# 3. Optional: leaderboard query by player_id works on statcast_search too
stats_params = {
    "hfSea": "2025|",
    "hfGT": "R|",
    "player_type": "batter",
    "batters_lookup[]": str(pid),
    "game_date_gt": "2025-09-01",
    "game_date_lt": "2025-09-28",
    "group_by": "name",
    "chk_stats_pa": "on",
    "chk_stats_woba": "on",
    "chk_stats_xwoba": "on",
}
r3 = requests.get(
    "https://baseballsavant.mlb.com/statcast_search/csv",
    params=stats_params,
    timeout=60,
)
r3.raise_for_status()
df = pd.read_csv(io.StringIO(r3.text))
if not df.empty:
    cols = [c for c in ("player_name", "pa", "woba", "xwoba") if c in df.columns]
    print(df[cols].to_string(index=False))
else:
    print("No Statcast rows for this player in the date range.")