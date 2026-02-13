const { chromium } = require("playwright");
const { parse } = require("csv-parse/sync");

const WINDOWS = [7, 15];
const CSV_ENDPOINT = "https://baseballsavant.mlb.com/statcast_search/csv";
const SCHEDULE_ENDPOINT = "https://statsapi.mlb.com/api/v1/schedule";
const MIN_YEAR = 1900;

const BASE_CSV_QUERY = {
  hfPT: "",
  hfAB: "",
  hfGT: "R|",
  hfPR: "",
  hfZ: "",
  stadium: "",
  hfBBT: "",
  hfBBL: "",
  hfNewZones: "",
  hfPull: "",
  hfC: "",
  hfSit: "",
  player_type: "batter",
  hfOuts: "",
  opponent: "",
  pitcher_throws: "",
  batter_stands: "",
  hfSA: "",
  team: "",
  position: "",
  hfRO: "",
  home_road: "",
  hfFlag: "",
  metric_1: "",
  hfInn: "",
  min_pitches: "0",
  min_results: "0",
  group_by: "name",
  sort_col: "xwoba",
  player_event_sort: "api_p_release_speed",
  sort_order: "desc",
  min_pas: "0",
  chk_stats_pa: "on",
  chk_stats_woba: "on",
  chk_stats_xwoba: "on",
};

function parseArgs(argv) {
  const args = {
    year: 2025,
    endDate: null,
    limit: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--year" && argv[i + 1]) {
      args.year = Number(argv[i + 1]);
      i += 1;
    } else if (token === "--end-date" && argv[i + 1]) {
      args.endDate = argv[i + 1];
      i += 1;
    } else if (token === "--limit" && argv[i + 1]) {
      args.limit = Number(argv[i + 1]);
      i += 1;
    }
  }

  return args;
}

function assertArgs(args) {
  if (!Number.isInteger(args.year) || args.year < MIN_YEAR) {
    throw new Error("Invalid --year value. Expected an integer like 2025.");
  }
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit <= 0)) {
    throw new Error("Invalid --limit value. Expected a positive integer.");
  }
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

async function getLatestRegularSeasonDate(year) {
  const url = `${SCHEDULE_ENDPOINT}?sportId=1&season=${year}&gameType=R`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch schedule (${response.status})`);
  }
  const payload = await response.json();
  const dates = (payload.dates || [])
    .map((entry) => entry.date)
    .filter(Boolean)
    .sort();

  if (!dates.length) {
    throw new Error(`No regular season dates found for year ${year}`);
  }

  const today = isoDate(new Date());
  const availableDates = dates.filter((date) => date <= today);
  if (!availableDates.length) {
    throw new Error(
      `No regular season dates up to today (${today}) for year ${year}. Pass --end-date explicitly.`,
    );
  }

  return availableDates[availableDates.length - 1];
}

function buildCsvUrl({ year, startDate, endDate }) {
  const query = new URLSearchParams({
    ...BASE_CSV_QUERY,
    hfSea: `${year}|`,
    game_date_gt: startDate,
    game_date_lt: endDate,
  });

  return `${CSV_ENDPOINT}?${query.toString()}`;
}

async function downloadCsvViaBrowser(page, csvUrl) {
  const [download, navigationResult] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page
      .goto(csvUrl, { waitUntil: "commit" })
      .catch((error) => error),
  ]);
  if (
    navigationResult instanceof Error &&
    !/download is starting/i.test(navigationResult.message)
  ) {
    throw navigationResult;
  }
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error("Unable to open CSV download stream");
  }

  let csv = "";
  for await (const chunk of stream) {
    csv += chunk.toString("utf8");
  }
  return csv;
}

function numeric(value) {
  if (value === null || value === undefined || value === "") {
    return Number.NaN;
  }
  const n = Number(value);
  return Number.isNaN(n) ? Number.NaN : n;
}

function buildWindowRows(csvText, limit) {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  const ranked = records
    .map((row) => {
      const woba = numeric(row.woba);
      const xwoba = numeric(row.xwoba);
      const pa = numeric(row.pa);
      return {
        player: row.player_name,
        playerId: row.player_id,
        pa,
        woba,
        xwoba,
      };
    })
    .filter((row) => row.player && row.playerId && !Number.isNaN(row.xwoba))
    .sort((a, b) => b.xwoba - a.xwoba || b.woba - a.woba)
    .map((row, idx) => ({
      Rank: idx + 1,
      Player: row.player,
      PlayerID: row.playerId,
      PA: Number.isNaN(row.pa) ? "" : row.pa,
      wOBA: Number.isNaN(row.woba) ? "" : row.woba.toFixed(3),
      xwOBA: row.xwoba.toFixed(3),
    }));

  return Number.isInteger(limit) && limit > 0 ? ranked.slice(0, limit) : ranked;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertArgs(args);

  const endDate = args.endDate || (await getLatestRegularSeasonDate(args.year));

  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) {
    throw new Error(`Invalid --end-date value: ${endDate}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    console.log(`Year: ${args.year}`);
    console.log(`Anchor end date: ${endDate}`);

    for (const days of WINDOWS) {
      const start = addDays(end, -(days - 1));
      const startDate = isoDate(start);
      const csvUrl = buildCsvUrl({
        year: args.year,
        startDate,
        endDate,
      });
      const csvText = await downloadCsvViaBrowser(page, csvUrl);
      const tableRows = buildWindowRows(csvText, args.limit);

      console.log("");
      console.log(`Last ${days} days (${startDate} to ${endDate})`);
      if (!tableRows.length) {
        console.log("No rows found.");
        continue;
      }
      console.table(tableRows);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
