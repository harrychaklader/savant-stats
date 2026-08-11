# Baseball Savant API Reference

> Comprehensive developer reference for the Baseball Savant Statcast data platform and its complementary MLB Stats API (`statsapi.mlb.com`).
>
> Includes: endpoint catalog, rate limits, authentication, code examples in **cURL**, **Node.js**, and **Python**, and troubleshooting.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication & Terms of Use](#2-authentication--terms-of-use)
3. [Rate Limits & Best Practices](#3-rate-limits--best-practices)
4. [Statcast Search CSV](#4-statcast-search-csv)
5. [Leaderboards](#5-leaderboards)
6. [Player Pages](#6-player-pages)
7. [Gamefeed](#7-gamefeed)
8. [Complementary Stats API (`statsapi.mlb.com`)](#8-complementary-stats-api)
9. [Code Examples](#9-code-examples)
10. [Data Catalogs (YAML)](#10-data-catalogs-yaml)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

**Baseball Savant** (`baseballsavant.mlb.com`) is MLB's **official public Statcast platform**. It surfaces pitch-by-pitch and tracking-level data captured in every MLB ballpark and exposes it through search, leaderboards, player pages, game feeds, and visualizations.

| Aspect | Detail |
|--------|--------|
| **Owner** | Major League Baseball / MLB Advanced Media |
| **Status** | Official public API (no key required) |
| **Base URL** | `https://baseballsavant.mlb.com` |
| **Primary formats** | CSV (search + leaderboards), JSON (gamefeed), HTML (player pages/visuals) |
| **Data history** | 2008–present (Pitch F/X 2008–2016, Statcast 2017+) |
| **Cloud provider** | **Google Cloud** (since 2020) |

### Infrastructure (Google Cloud)

Since migrating in 2020, Statcast runs entirely on Google Cloud:

- **Hawk-Eye optical tracking** – 12 high-speed cameras at all 30 ballparks, 30 fps, 18 body points per player, capturing ~60 data points per pitch.
- **Google Distributed Cloud** – edge processing at stadiums; stats reach broadcast partners in under **250ms**.
- **GKE + Anthos** – containerized applications on Kubernetes.
- **BigQuery** – petabyte-scale data warehouse backing derived metrics and models.
- **Cloud Dataflow + Cloud Composer (Airflow)** – ingestion and daily orchestration.
- **Cloud Storage** – video clip storage powering video search.
- **PostgreSQL** – primary relational database for event data.

**Partnerships:** SportRadar and FanGraphs redistribute Statcast data; the 30 MLB clubs receive equal access for proprietary analysis.

---

## 2. Authentication & Terms of Use

- **No authentication** – all endpoints are public; no API keys, tokens, or OAuth.
- **Data ownership** – all data is property of **MLB Advanced Media**. Refer to the [terms of use](http://gdx.mlb.com/components/copyright.txt) before using data in any project.
- **Attribution** – credit MLB/Baseball Savant when publishing derived data.
- **Commercial use** – requires a license from MLB; the public endpoints are intended for personal/analytical use.
- **Rate limiting** – no official published limits, but aggressive scraping may lead to IP blocking (see [Rate Limits](#3-rate-limits--best-practices)).

---

## 3. Rate Limits & Best Practices

MLB publishes **no official rate-limit figures**. The values below are empirically observed by the community (`pybaseball`, `sabRmetrics`, `baseballr`, `abdwr3edata`). See [`savant_rate_limits.yaml`](savant_rate_limits.yaml) for sources.

### Statcast Search CSV

| Limit | Value | Source |
|-------|-------|--------|
| **Rows per query** | ~**25,000–30,000** (historically up to 40k) | sabRmetrics (25k), pybaseball (30k), Bill Petti (40k) |
| **Safe date range** | **≤ 5 days** for pitch-level queries | pybaseball splits >5d requests |
| **Full-season chunking** | Day-by-day loop (~4,500 pitches/day) | abdwr3edata |
| **Timeout** | ~30s+ for complex queries (HTTP 504) | Community reports |

**Truncation detection:** if a query returns **exactly** the row limit, the data is truncated — split into smaller date ranges.

### Leaderboards

- **No documented row limit.** Full-season leaderboards return ~200–600 qualified players.

### Request Throttling

- No official requests/sec limit.
- Add **1–2s delays** between bulk requests.
- **Cache results locally** to avoid re-downloading.
- Avoid polling the real-time gamefeed more than once every few minutes.

### Best Practices

1. Start with the **narrowest date range** that answers your question.
2. Use **player/team filters** to reduce result size.
3. For full seasons of pitch data, **loop day-by-day** and concatenate.
4. On HTTP 504, **retry with smaller chunks** or exponential backoff.
5. Resolve player names → IDs first via `statsapi.mlb.com/people/search`, then query Savant.

---

## 4. Statcast Search CSV

**Primary endpoint** for pitch-level data. Returns a CSV with 100+ columns covering pitched-ball, batted-ball, bat-tracking, and derived metrics.

```
GET https://baseballsavant.mlb.com/statcast_search/csv?{params}
```

### Quick Example

```
GET https://baseballsavant.mlb.com/statcast_search/csv?hfSea=2025|&player_type=batter&game_date_gt=2025-09-22&game_date_lt=2025-09-28&group_by=name&sort_col=xwoba&sort_order=desc&min_pas=0&chk_stats_pa=on&chk_stats_woba=on&chk_stats_xwoba=on
```

Full parameter reference: [`baseballsavant_csv_fields.yaml`](baseballsavant_csv_fields.yaml)

### Key Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `player_type` | `batter`, `pitcher`, `fielder_2–4` | Player role to search |
| `hfSea` | `2025\|` | Season (pipe-suffixed) |
| `hfGT` | `R\|`, `PO\|`, etc. | Game type (pipe-suffixed) |
| `game_date_gt` | `YYYY-MM-DD` | Start date (inclusive) |
| `game_date_lt` | `YYYY-MM-DD` | End date (inclusive) |
| `batters_lookup[]` | `430911` (MLBAM ID) | Filter specific batters |
| `pitchers_lookup[]` | `430911` (MLBAM ID) | Filter specific pitchers |
| `group_by` | `name`, `name-date`, `name-month`, `name-year` | Aggregation level |
| `sort_col` | `xwoba`, `woba`, `launch_speed`, … | Sort column |
| `sort_order` | `desc`, `asc` | Sort direction |
| `min_pas` | `0`, `5`, `10`, … | Minimum plate appearances |
| `min_pitches` | `0`, `2`, `3`, … | Minimum pitch count |
| `min_results` | `0`, `2`, `3`, … | Minimum results count |
| `chk_stats_*` | `on` | Include specific stat columns (86+ options) |

### Stat Checkboxes (`chk_stats_*`)

Prefix each desired output column with `chk_stats_` and set to `on`. Examples:

`chk_stats_pa`, `chk_stats_woba`, `chk_stats_xwoba`, `chk_stats_ba`, `chk_stats_slg`, `chk_stats_iso`, `chk_stats_babip`, `chk_stats_obp`, `chk_stats_hrs`, `chk_stats_bb`, `chk_stats_so`, `chk_stats_k_percent`, `chk_stats_bb_percent`, `chk_stats_barrels_per_bbe_percent`, `chk_stats_barrels_per_pa_percent`, `chk_stats_hardhit_percent`, `chk_stats_launch_speed`, `chk_stats_launch_angle`, `chk_stats_spin_rate`, `chk_stats_release_extension`, `chk_stats_effective_speed`, `chk_stats_swing_length`, `chk_stats_bat_speed`, `chk_stats_whiffs`, `chk_stats_swings`, `chk_stats_takes`, …

---

## 5. Leaderboards

~40 Statcast leaderboards, all supporting CSV download via `?csv=true`.

```
GET https://baseballsavant.mlb.com/leaderboard/{type}?year=2025&type=batter&team=&min=q&csv=true
```

### Common Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `year` | `2015`–`2026` | Season (leaderboard availability varies) |
| `type` | leaderboard-specific (`batter`/`pitcher`/`Fielder`) | Player type |
| `team` | `ATL`, `BOS`, `NYY`, … or empty | Team filter |
| `min` | `q` or number | Qualifier (qualified = `q`) |
| `csv` | `true` | Return CSV instead of HTML |

### Leaderboard Master Table

| Leaderboard | URL Path | Since | Type | Qualifier |
|------------|----------|-------|------|-----------|
| Expected Statistics | `expected_statistics` | 2015 | batter/pitcher(+team) | PA (q) |
| Exit Velocity & Barrels | `statcast` | 2015 | batter/pitcher | PA (q), BBE (abs) |
| Batted Ball Profile | `battled-ball` | 2015 | batter/pitcher | PA (q) |
| Home Runs | `home-runs` | 2015 | batter/pitcher | PA (q) |
| Percentile Rankings | `percentile-rankings` | 2015 | batter/pitcher | 2.1 / 1.25 PA per team game |
| Year-to-Year Changes | `statcast-year-to-year` | 2015 | batter/pitcher | — |
| Park Factors | `statcast-park-factors` | 2015 | league | — |
| Outs Above Average | `outs_above_average` | 2016 | Fielder | fielding opps (q) |
| Directional OAA | `directional_oaa` | 2016 | Fielder | — |
| Catch Probability | `catch_probability` | 2016 | Fielder | — |
| Outfielder Jump | `outfield_jump` | 2016 | Fielder | — |
| Pitch Arsenal Stats | `pitch-arsenal-stats` | 2017 | pitcher | pitches (q) |
| Pitch Arsenals | `pitch-arsenals` | 2017 | pitcher | 50–3000 pitches |
| Pitch Movement | `pitch-movement` | 2017 | pitcher | — |
| Spin Direction | `spin-direction-pitches` | 2017 | pitcher | — |
| Active Spin | `active-spin` | 2017 | pitcher | — |
| Arm Angle | `pitcher-arm-angles` | 2017 | pitcher | — |
| Pitch Tempo | `pitch-tempo` | 2017 | pitcher/bat | — |
| Rolling Windows | `rolling` | 2017 | batter/pitcher | PA (q) |
| Sprint Speed | `sprint_speed` | 2017 | runner | — |
| 90ft Running Splits | `running_splits` | 2017 | runner | run opps |
| Pop Time | `poptime` | 2017 | catcher | throws |
| Catcher Framing | `catcher-strike-zone` | 2017 | catcher | — |
| Catcher Blocking | `catcher-blocking` | 2017 | catcher | — |
| Catcher Throwing | `catcher-throwing` | 2017 | catcher | — |
| Catcher Stance | `catcher-stance` | 2017 | catcher | — |
| Pitcher Running Game | `pitcher-running-game` | 2017 | pitcher | — |
| Arm Strength | `arm_strength` | 2020 | Fielder | throws |
| Arm Value | `baserunning` | 2020 | Fielder | — |
| Fielding Run Value | `fielding-run-value` | 2020 | Fielder | — |
| Baserunning Run Value | `baserunning-run-value` | 2020 | runner | — |
| Basestealing Run Value | `basestealing-run-value` | 2020 | runner | — |
| Run Value (swing/take) | `swing-take` | 2020 | batter/pitcher | PA (q) |
| Pitch Timer Infractions | `pitch-timer-infractions` | 2023 | league | — |
| **Bat Tracking** | `bat-tracking` | 2023 | batter/pitcher(+team) | swings |
| Swing Path & Attack Angle | `bat-tracking/swing-path-attack-angle` | 2023 | batter/pitcher | — |
| Swing Timing & Miss Distance | `bat-tracking/swing-timing-miss-distance` | 2023 | batter/pitcher | — |
| ABS Challenges | `abs-challenges` | 2024 | league | — |
| Custom Leaderboard | `custom` | 2020 | batter/pitcher | q |
| Hot Stove | `hot-stove` | 2020 | league | — |
| Top Performers | `top-performers` | 2020 | league | — |
| Birthday Index | `birthday-index` | — | league | — |

> Note: several boards resolve to alternate paths (e.g. `poptime` vs `pop_time`, `running_splits` vs `running_splits_90_ft`). Confirm via the site or validate your request before automating.

---

## 6. Player Pages

```
GET https://baseballsavant.mlb.com/savant-player/{player-name}-{player_id}?stats={stat_type}
```

Returns an HTML page with **embedded JSON** data blobs carrying canonical Statcast snapshots for the player.

### Stat Types

| `stats` value | Description |
|---------------|-------------|
| `statcast-r-hitting-mlb` | Statcast batting percentiles + metrics |
| `statcast-r-pitching-mlb` | Statcast pitching percentiles + metrics |
| `gamelogs-r-hitting-mlb` | Per-game batting logs |
| `gamelogs-r-pitching-mlb` | Per-game pitching logs |
| `statcast-r-fielding-mlb` | Statcast fielding metrics |

**Example:** `https://baseballsavant.mlb.com/savant-player/aaron-judge-592450?stats=statcast-r-hitting-mlb`

---

## 7. Gamefeed

Real-time, per-pitch JSON for a game.

```
GET https://baseballsavant.mlb.com/gf?game_pk={game_pk}
```

- `game_pk` is the MLB game ID (from `statsapi.mlb.com/api/v1/schedule`).
- Returns a JSON array of pitch events with full Statcast fields (velocity, spin, break, location, bat speed, etc.) plus `source: "gamefeed"`.
- **Usage note:** avoid polling frequently; use the [Stats API v1.1 live feed](#8-complementary-stats-api) diff/patch for efficient real-time updates.

---

## 8. Complementary Stats API

`statsapi.mlb.com/api/v1/` complements Savant with player lookup, scheduling, game feeds, and traditional stats. Full catalog: [`statsapi_endpoints.yaml`](statsapi_endpoints.yaml).

| Endpoint | Purpose |
|----------|---------|
| `GET /people/search?names=Aaron Judge` | **Resolve player names → MLBAM IDs** for Savant queries |
| `GET /people/{personId}` | Player profile |
| `GET /people/{personId}/stats` | Season/career/split stats |
| `GET /people/{personId}/gameLog` | Per-game logs |
| `GET /schedule?sportId=1&startDate=&endDate=` | Get dates/gamePk for Savant queries |
| `GET /game/{gamePk}/feed/live` | Live feed (v1 full, v1.1 diff/patch) |
| `GET /game/{gamePk}/boxscore` | Box score |
| `GET /game/{gamePk}/linescore` | Linescore |
| `GET /game/{gamePk}/playByPlay` | Play-by-play |
| `GET /game/{gamePk}/winProbability` | Win probability |
| `GET /standings` | Division standings |
| `GET /teams`, `GET /teams/{id}/roster` | Team info and rosters |
| `GET /venues`, `GET /venues/{id}` | Ballpark info |
| `GET /gameStatus` | Catalog of game status codes |
| `GET /stats/leaders` | Traditional stat leaders |
| `GET /transactions` | Transactions |
| `GET /draft/{year}` | Draft results |
| `GET /awards`, `GET /jobs`, `GET /umpires` | Reference data |

**Key workflow:** `/people/search` → MLBAM ID → `baseballsavant.mlb.com` queries (search, leaderboards, player pages).

---

## 9. Code Examples

Ready-to-run scripts live in [`examples/`](examples/):

| File | Language | What it does |
|------|----------|--------------|
| `statcast_search.sh` | cURL | Download batter wOBA/xwOBA CSV for 7-day window |
| `statcast_search.mjs` | Node.js | Same, using native `fetch` + CSV parse |
| `statcast_search.py` | Python | Same, using `requests` + `pandas` |
| `leaderboard.sh` | cURL | Download a leaderboard's CSV (`expected_statistics`) |
| `leaderboard.mjs` | Node.js | Same |
| `leaderboard.py` | Python | Same |
| `player_lookup.py` | Python | Resolve name → MLBAM ID via statsapi + fetch player page |
| `gamefeed.mjs` | Node.js | Fetch live pitch feed for a game_pk |

### cURL

Statcast search:

```bash
curl -s "https://baseballsavant.mlb.com/statcast_search/csv" \
  --data-urlencode "hfSea=2025|" \
  --data-urlencode "hfGT=R|" \
  --data-urlencode "player_type=batter" \
  --data-urlencode "game_date_gt=2025-09-22" \
  --data-urlencode "game_date_lt=2025-09-28" \
  --data-urlencode "group_by=name" \
  --data-urlencode "sort_col=xwoba" \
  --data-urlencode "sort_order=desc" \
  --data-urlencode "min_pas=0" \
  --data-urlencode "chk_stats_pa=on" \
  --data-urlencode "chk_stats_woba=on" \
  --data-urlencode "chk_stats_xwoba=on" \
  -o batters.csv
```

Leaderboard:

```bash
curl -s "https://baseballsavant.mlb.com/leaderboard/expected_statistics?year=2025&type=batter&min=q&csv=true" -o expected_stats.csv
```

Player pages (HTML + embedded JSON):

```bash
curl -s "https://baseballsavant.mlb.com/savant-player/aaron-judge-592450?stats=statcast-r-hitting-mlb" -o judge.html
```

Gamefeed (JSON):

```bash
curl -s "https://baseballsavant.mlb.com/gf?game_pk=745444" -o gamefeed.json
```

### Node.js (native `fetch`)

```js
// Statcast search CSV
const url = new URL("https://baseballsavant.mlb.com/statcast_search/csv");
const params = {
  hfSea: "2025|", hfGT: "R|", player_type: "batter",
  game_date_gt: "2025-09-22", game_date_lt: "2025-09-28",
  group_by: "name", sort_col: "xwoba", sort_order: "desc", min_pas: "0",
  chk_stats_pa: "on", chk_stats_woba: "on", chk_stats_xwoba: "on",
};
Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

const res = await fetch(url);
const csv = await res.text();
console.log(csv.slice(0, 500));
```

### Python

```python
import requests

params = {
    "hfSea": "2025|", "hfGT": "R|", "player_type": "batter",
    "game_date_gt": "2025-09-22", "game_date_lt": "2025-09-28",
    "group_by": "name", "sort_col": "xwoba", "sort_order": "desc",
    "min_pas": "0", "chk_stats_pa": "on",
    "chk_stats_woba": "on", "chk_stats_xwoba": "on",
}
r = requests.get("https://baseballsavant.mlb.com/statcast_search/csv", params=params)
r.raise_for_status()

import pandas as pd
df = pd.read_csv(__import__("io").StringIO(r.text))
print(df[["player_name", "player_id", "pa", "woba", "xwoba"]].head())
```

---

## 10. Data Catalogs (YAML)

Machine-readable metadata for every documented endpoint and limit:

| File | Contents |
|------|----------|
| [`baseballsavant_csv_fields.yaml`](baseballsavant_csv_fields.yaml) | Statcast search CSV fields + query parameters + real request sample |
| [`savant_endpoints.yaml`](savant_endpoints.yaml) | Savant endpoint catalog (search, leaderboards, player pages, gamefeed, visuals) + infrastructure + terms |
| [`savant_leaderboards.yaml`](savant_leaderboards.yaml) | All ~40 leaderboards: path, availability, params, qualifiers, sample output columns |
| [`savant_rate_limits.yaml`](savant_rate_limits.yaml) | Row limits, date-chunking guidance, timeouts, error codes, sources |
| [`statsapi_endpoints.yaml`](statsapi_endpoints.yaml) | Complimentary `statsapi.mlb.com` endpoints (people search, schedule, game feeds, standings) |
| [`statsapi_game_status.yaml`](statsapi_game_status.yaml) | MLB game status code catalog |

---

## 11. Troubleshooting

### HTTP 504 Gateway Timeout
- **Cause:** query too complex or wide (too many rows / too much computation).
- **Fix:** split the date range into daily or 2–5-day chunks; add team/player filters.

### Query returns exactly the row limit (25k/30k/40k)
- **Cause:** data truncated at the limit.
- **Fix:** narrow the date range further and concatenate results.

### Empty or missing expected rows
- **Cause:** qualifier too strict (`min=q` excludes part-time players), wrong date format, or search-only columns not requested via `chk_stats_*`.
- **Fix:** drop `min=q` / lower `min`, verify `YYYY-MM-DD`, enable the needed `chk_stats_*` flags.

### HTTP 500
- **Cause:** malformed request, deprecated parameter, or invalid search syntax (e.g. `%` missing on the legacy lookup API).
- **Fix:** validate params against the YAML catalogs and retry.

### HTTP 403 / IP blocked
- **Cause:** aggressive scraping.
- **Fix:** slow down, add spacing between requests, use local caching.

### Leaderboard path not found
- **Cause:** several boards use alternate paths (`poptime` vs `pop_time`, `running_splits` vs `running_splits_90_ft`).
- **Fix:** confirm the path by loading the board in a browser and copying the URL/CSV link.