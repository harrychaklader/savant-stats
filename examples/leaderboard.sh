#!/usr/bin/env bash
# Leaderboard CSV download (cURL)
# Usage: ./leaderboard.sh [type] [year] [player_type]
# Example: ./leaderboard.sh expected_statistics 2025 batter

set -euo pipefail

TYPE="${1:-expected_statistics}"
YEAR="${2:-2025}"
PLAYER_TYPE="${3:-batter}"

URL="https://baseballsavant.mlb.com/leaderboard/${TYPE}?year=${YEAR}&type=${PLAYER_TYPE}&min=q&csv=true"
OUTFILE="${TYPE}_${YEAR}_${PLAYER_TYPE}.csv"

echo "Downloading ${TYPE} leaderboard (${YEAR}, ${PLAYER_TYPE})..."
curl -s -L -o "$OUTFILE" -w "HTTP %{http_code}, %{size_download} bytes\n" "$URL"

echo "Saved to $OUTFILE"
echo "Columns:"
head -n 1 "$OUTFILE" | tr ',' '\n' | head -n 15