// Gamefeed - real-time pitch JSON for a game (Node.js)
// Usage: node gamefeed.mjs [game_pk]
const GAME_PK = process.argv[2] || "745444";

const url = `https://baseballsavant.mlb.com/gf?game_pk=${GAME_PK}`;
console.log(`Fetching gamefeed for game_pk=${GAME_PK}...`);

const res = await fetch(url);
if (!res.ok) throw new Error(`Request failed: HTTP ${res.status}`);
const data = await res.json();

// Pitch events live in team_home / team_away arrays
const events = [...(data.team_home || []), ...(data.team_away || [])].sort(
  (a, b) => (a.rowId || "").localeCompare(b.rowId || "", undefined, { numeric: true })
);
console.log(`Events: ${events.length}`);
console.log(`Status: ${data.game_status}`);

for (const ev of events.slice(0, 5)) {
  const half = ev.half_inning === "top" ? "T" : "B";
  console.log(
    `Inn ${ev.inning}${half} | ${ev.pitcher_name} -> ${ev.batter_name} | ` +
      `${ev.pitch_name || "?"} ${ev.start_speed ? ev.start_speed + " mph" : ""} | ${ev.result}`
  );
}