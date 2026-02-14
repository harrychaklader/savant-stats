# savant_stats

CLI tool that prints Baseball Savant batter leaderboards for the last 7 and 15 days.

Each row includes:

- Player name
- Player ID
- PA
- wOBA
- xwOBA

Data source: Baseball Savant `statcast_search/csv` endpoint.

Sorting: highest-to-lowest by `xwOBA` (with `wOBA` as a tiebreaker).

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

## Options

- `--year <year>`: season to query (default: `2025`)
- `--end-date <YYYY-MM-DD>`: end date anchor  
  - if omitted, the tool uses the latest regular-season date up to today for that year
- `--limit <n>`: optional number of rows per table

Validation:
- `--year` must be an integer (>= 1900)
- `--limit` must be a positive integer

## Examples

```bash
npm start -- --year 2025 --limit 25
npm start -- --year 2025 --end-date 2025-09-28
```

## Sample Output

```text
Year: 2025
Anchor end date: 2025-09-28

Last 7 days (2025-09-22 to 2025-09-28)
┌─────────┬──────┬────────────────────────┬──────────┬────┬─────────┬─────────┐
│ (index) │ Rank │ Player                 │ PlayerID │ PA │ wOBA    │ xwOBA   │
├─────────┼──────┼────────────────────────┼──────────┼────┼─────────┼─────────┤
│ 0       │ 1    │ 'White, Eli'           │ '642201' │ 4  │ '0.730' │ '0.695' │
│ 1       │ 2    │ 'Rodríguez, Johnathan' │ '671286' │ 7  │ '0.741' │ '0.684' │
│ ...     │ ...  │ ...                    │ ...      │ ...│ ...     │ ...     │
└─────────┴──────┴────────────────────────┴──────────┴────┴─────────┴─────────┘

Last 15 days (2025-09-14 to 2025-09-28)
┌─────────┬──────┬────────────────────────┬──────────┬────┬─────────┬─────────┐
│ (index) │ Rank │ Player                 │ PlayerID │ PA │ wOBA    │ xwOBA   │
├─────────┼──────┼────────────────────────┼──────────┼────┼─────────┼─────────┤
│ 0       │ 1    │ 'Rodríguez, Johnathan' │ '671286' │ 7  │ '0.741' │ '0.684' │
│ 1       │ 2    │ 'Alcántara, Kevin'     │ '682634' │ 5  │ '0.529' │ '0.585' │
│ ...     │ ...  │ ...                    │ ...      │ ...│ ...     │ ...     │
└─────────┴──────┴────────────────────────┴──────────┴────┴─────────┴─────────┘
```

## Metadata File

`baseballsavant_csv_fields.yaml` includes:
- discovered CSV output fields
- discovered query parameters
- example/sample parameter values
- a real request sample with concrete query values

`statsapi_game_status.yaml` includes:
- endpoint metadata for `https://statsapi.mlb.com/api/v1/gameStatus`
- response field definitions and optional fields
- representative status objects from the endpoint response
