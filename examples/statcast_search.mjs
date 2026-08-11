// Statcast Search - batter wOBA/xwOBA CSV download (Node.js)
// Usage: node statcast_search.mjs [year] [end_date]
// Requires: csv-parse (npm install csv-parse) - in package.json
import { parse } from "csv-parse/sync";

const YEAR = process.argv[2] || "2025";
const END_DATE = process.argv[3] || "2025-09-28";

const end = new Date(`${END_DATE}T00:00:00Z`);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 6);
const startDate = start.toISOString().slice(0, 10);

const url = new URL("https://baseballsavant.mlb.com/statcast_search/csv");
const params = {
  hfSea: `${YEAR}|`,
  hfGT: "R|",
  player_type: "batter",
  game_date_gt: startDate,
  game_date_lt: END_DATE,
  group_by: "name",
  sort_col: "xwoba",
  sort_order: "desc",
  min_pas: "0",
  chk_stats_pa: "on",
  chk_stats_woba: "on",
  chk_stats_xwoba: "on",
};
Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

console.log(`Downloading ${YEAR} batter stats (${startDate} to ${END_DATE})...`);
const res = await fetch(url);
if (!res.ok) throw new Error(`Request failed: HTTP ${res.status}`);
const csv = await res.text();

const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true });
console.log(`Rows: ${rows.length}`);
for (const row of rows.slice(0, 5)) {
  console.log(
    row.player_name,
    `PA=${row.pa}`,
    `wOBA=${row.woba}`,
    `xwOBA=${row.xwoba}`
  );
}