// Leaderboard CSV download (Node.js)
// Usage: node leaderboard.mjs [type] [year] [player_type]
const TYPE = process.argv[2] || "expected_statistics";
const YEAR = process.argv[3] || "2025";
const PLAYER_TYPE = process.argv[4] || "batter";

const url = `https://baseballsavant.mlb.com/leaderboard/${TYPE}?year=${YEAR}&type=${PLAYER_TYPE}&min=q&csv=true`;

console.log(`Downloading ${TYPE} leaderboard (${YEAR}, ${PLAYER_TYPE})...`);
const res = await fetch(url);
if (!res.ok) throw new Error(`Request failed: HTTP ${res.status}`);
const csv = await res.text();

const header = csv.split("\n")[0].split(",");
console.log(`Columns (${header.length}):`);
console.log(header.join(", "));
console.log(`Rows: ${csv.split("\n").filter(Boolean).length - 1}`);