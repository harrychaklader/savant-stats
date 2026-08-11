#!/usr/bin/env bash
# Statcast Search - batter wOBA/xwOBA CSV download (cURL)
# Usage: ./statcast_search.sh [year] [end_date]

set -euo pipefail

YEAR="${1:-2025}"
END_DATE="${2:-2025-09-28}"
START_DATE=$(date -j -v-6d -f "%Y-%m-%d" "$END_DATE" "+%Y-%m-%d" 2>/dev/null || echo "${END_DATE%-*}-01")

OUTFILE="batters_${YEAR}_${START_DATE}_${END_DATE}.csv"

URL="https://baseballsavant.mlb.com/statcast_search/csv"

params=(
  "hfSea=${YEAR}|"
  "hfGT=R|"
  "player_type=batter"
  "game_date_gt=${START_DATE}"
  "game_date_lt=${END_DATE}"
  "group_by=name"
  "sort_col=xwoba"
  "sort_order=desc"
  "min_pas=0"
  "chk_stats_pa=on"
  "chk_stats_woba=on"
  "chk_stats_xwoba=on"
)

QUERY=$(printf '&%s' "${params[@]}")
QUERY="${QUERY:1}"

echo "Downloading ${YEAR} batter stats (${START_DATE} to ${END_DATE})..."
curl -s -o "$OUTFILE" -w "HTTP %{http_code}, %{size_download} bytes\n" \
  "$URL?$QUERY"

echo "Saved to $OUTFILE"
head -n 3 "$OUTFILE"