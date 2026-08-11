#!/usr/bin/env python3
"""Statcast Search - batter wOBA/xwOBA CSV download (Python).

Usage: python statcast_search.py [year] [end_date]
Requires: requests, pandas (pip install requests pandas)
"""
import io
import sys
from datetime import date, timedelta

import pandas as pd
import requests

YEAR = sys.argv[1] if len(sys.argv) > 1 else "2025"
END_DATE = sys.argv[2] if len(sys.argv) > 2 else "2025-09-28"

end = date.fromisoformat(END_DATE)
start = end - timedelta(days=6)

params = {
    "hfSea": f"{YEAR}|",
    "hfGT": "R|",
    "player_type": "batter",
    "game_date_gt": start.isoformat(),
    "game_date_lt": end.isoformat(),
    "group_by": "name",
    "sort_col": "xwoba",
    "sort_order": "desc",
    "min_pas": "0",
    "chk_stats_pa": "on",
    "chk_stats_woba": "on",
    "chk_stats_xwoba": "on",
}

print(f"Downloading {YEAR} batter stats ({start} to {end})...")
r = requests.get("https://baseballsavant.mlb.com/statcast_search/csv", params=params, timeout=60)
r.raise_for_status()

df = pd.read_csv(io.StringIO(r.text))
cols = [c for c in ("player_name", "player_id", "pa", "woba", "xwoba") if c in df.columns]
print(df[cols].head(10).to_string(index=False))