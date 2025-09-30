/**
 * FLL Explore: Sync ALL CSV files in csv-files/ to Google Calendar
 *
 * What it does
 * - Lists all CSVs under the GitHub repo path csv-files/
 * - Detects event-like CSVs (must have a Date-like column)
 * - Creates/updates calendar events idempotently
 * - Removes future events previously created by this script if they disappear from CSVs
 *
 * How to use
 * 1) Set CALENDAR_ID to the team calendar you embed on the website
 * 2) If the repo is private: set USE_PRIVATE_REPO = true and add Script Property GITHUB_TOKEN
 * 3) Run syncAllCsvsToCalendar() once to authorize; then add a time-driven trigger (hourly/daily)
 */

const CALENDAR_ID = 'fll2025.westvalley.cusdk8@gmail.com';
const GITHUB_OWNER = 'vikasy';
const GITHUB_REPO = 'fll-explore-team-hub';
const GITHUB_PATH = 'csv-files';

// If the repo is private, set to true and add a Script Property named GITHUB_TOKEN with a GitHub PAT.
const USE_PRIVATE_REPO = false;

// If your season spans a specific school year, you can hardcode it, e.g., 2025.
// Otherwise this will use the current year at runtime.
const DEFAULT_SEASON_YEAR = new Date().getFullYear();

// Marker added to event descriptions so we can identify/update/delete only what we created
const SOURCE_MARKER = 'Source:CSVRepoSync';
// Cleanup horizon for removing stale future events (in months)
const MONTHS_CLEANUP_AHEAD = 12;

// Flexible header detection
const HEADER_SYNONYMS = {
  date: ['date', 'event date', 'day', 'hosting date'],
  title: ['title', 'event', 'summary', 'name', 'topic', 'session title'],
  notes: ['notes', 'description', 'details', 'homework'],
  location: ['location', 'place', 'where'],
  start: ['start', 'start time'],
  end: ['end', 'end time'],
  host: ['host', 'host kid/parent', 'hosting family', 'host kid', 'host parent'],
};

function syncAllCsvsToCalendar() {
  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error('Calendar not found: ' + CALENDAR_ID);

  // 1) Discover CSV files in the folder
  const items = fetchGithubDir(GITHUB_OWNER, GITHUB_REPO, GITHUB_PATH);
  const csvFiles = items.filter(it => it.type === 'file' && /\.csv$/i.test(it.name));
  if (!csvFiles.length) {
    Logger.log('No CSV files found at %s/%s/%s', GITHUB_OWNER, GITHUB_REPO, GITHUB_PATH);
    return;
  }

  const keysFromAllCsvs = new Set();

  // 2) Process each CSV
  csvFiles.forEach(file => {
    try {
      const csv = fetchText(file.download_url);
      const rows = Utilities.parseCsv(csv).filter(r => r.join('').trim().length);
      if (rows.length < 2) return; // header + at least one row

      const map = buildHeaderMap(rows[0]);
      // At minimum, must have a date column
      if (map.date < 0) { 
        Logger.log('Skipping %s (no Date-like header detected)', file.name);
        return;
      }

      const keysFromThisCsv = processCsvRowsToCalendar(cal, rows, map, file.name);
      keysFromThisCsv.forEach(k => keysFromAllCsvs.add(k));
      Logger.log('Processed %s events from %s', keysFromThisCsv.size, file.name);
    } catch (e) {
      Logger.log('Error processing %s: %s', file.name, e && e.message ? e.message : e);
    }
  });

  // 3) Cleanup future events that no longer exist in CSVs
  cleanupRemovedEvents(cal, keysFromAllCsvs);
  Logger.log('Sync complete. Retained keys: %d', keysFromAllCsvs.size);
}

function processCsvRowsToCalendar(cal, rows, map, sourceName) {
  const keysFromCsv = new Set();

  for (let i = 1; i < rows.length; i++) {
    // Copy row and trim cells
    const r = rows[i].map(c => (c || '').trim());
    const dateStr = safeGet(r, map.date);
    if (!dateStr) continue;

    const title = deriveTitle(r, map, sourceName);
    if (!title) continue;

    const notes = safeGet(r, map.notes);
    const location = safeGet(r, map.location);
    const startStr = safeGet(r, map.start);
    const endStr = safeGet(r, map.end);

    // Create a stable key per event (source file + date + title)
    const key = `CSV:${sourceName}|${dateStr}|${title}`;
    keysFromCsv.add(key);

    // Parse dates; default to all-day if no time columns are provided
    const startDate = parseDateTime(dateStr, startStr, DEFAULT_SEASON_YEAR);
    const endDate = endStr ? parseDateTime(dateStr, endStr, DEFAULT_SEASON_YEAR) : null;

    const dayStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    // Find matching events created by this script for that date
    const matches = cal.getEvents(dayStart, dayEnd).filter(ev => {
      const desc = (ev.getDescription() || '');
      return desc.includes(SOURCE_MARKER) && desc.includes(key);
    });

    const description = buildDescription(key, notes, sourceName);

    if (startStr && endStr && endDate) {
      // Timed event
      if (matches.length) {
        const ev = matches[0];
        if (ev.getTitle() !== title) ev.setTitle(title);
        if (ev.getLocation() !== location) ev.setLocation(location);
        ev.setDescription(description);
        if (ev.getStartTime().getTime() !== startDate.getTime() || ev.getEndTime().getTime() !== endDate.getTime()) {
          ev.setTime(startDate, endDate);
        }
      } else {
        cal.createEvent(title, startDate, endDate, { location, description });
      }
    } else {
      // All-day event
      if (matches.length) {
        const ev = matches[0];
        if (ev.getTitle() !== title) ev.setTitle(title);
        if (ev.getLocation() !== location) ev.setLocation(location);
        ev.setDescription(description);
        if (!ev.isAllDayEvent()) {
          ev.deleteEvent();
          cal.createAllDayEvent(title, dayStart, { location, description });
        }
      } else {
        cal.createAllDayEvent(title, dayStart, { location, description });
      }
    }
  }

  return keysFromCsv;
}

function cleanupRemovedEvents(cal, keysFromAllCsvs) {
  const now = new Date();
  const horizon = new Date(now); horizon.setMonth(horizon.getMonth() + MONTHS_CLEANUP_AHEAD);
  const futureEvents = cal.getEvents(now, horizon);

  futureEvents.forEach(ev => {
    const desc = (ev.getDescription() || '');
    if (!desc.includes(SOURCE_MARKER)) return;
    const keyMatch = desc.match(/CSV:[^\n]+/);
    const key = keyMatch ? keyMatch[0] : null;
    if (key && !keysFromAllCsvs.has(key)) {
      ev.deleteEvent();
    }
  });
}

function buildHeaderMap(headerRow) {
  const lower = headerRow.map(h => (h || '').toString().trim().toLowerCase());
  const findIndex = (syns) => lower.findIndex(h => syns.includes(h));
  return {
    date: findIndex(HEADER_SYNONYMS.date),
    title: findIndex(HEADER_SYNONYMS.title),
    notes: findIndex(HEADER_SYNONYMS.notes),
    location: findIndex(HEADER_SYNONYMS.location),
    start: findIndex(HEADER_SYNONYMS.start),
    end: findIndex(HEADER_SYNONYMS.end),
    host: findIndex(HEADER_SYNONYMS.host),
  };
}

function deriveTitle(row, map, sourceName) {
  const explicit = safeGet(row, map.title);
  if (explicit) return explicit;
  const host = safeGet(row, map.host);
  if (host) return `Session@${host}`;
  return 'Event';
}

function safeGet(arr, idx) {
  return idx >= 0 ? (arr[idx] || '').trim() : '';
}

function buildDescription(key, notes, sourceName) {
  const lines = [
    SOURCE_MARKER,
    key,
    `File: ${sourceName}`,
  ];
  if (notes) lines.push('', notes);
  return lines.join('\n');
}

function parseDateTime(dateStr, timeStr, seasonYear = DEFAULT_SEASON_YEAR) {
  if (!dateStr) throw new Error('Missing date');

  // ISO-like YYYY-M-D
  const iso = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    const t = parseTime(timeStr);
    return new Date(y, m - 1, d, t.hh, t.mm, 0);
  }

  // MM/DD or MM/DD/YY or MM/DD/YYYY
  const md = dateStr.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (md) {
    const mm = Number(md[1]);
    const dd = Number(md[2]);
    let yyyy = md[3];
    if (!yyyy) {
      yyyy = seasonYear;
    } else if (yyyy.length === 2) {
      yyyy = 2000 + Number(yyyy);
    } else if (yyyy.length !== 4) {
      yyyy = seasonYear; // e.g., '202' -> fallback
    } else {
      yyyy = Number(yyyy);
    }
    const t = parseTime(timeStr);
    return new Date(yyyy, mm - 1, dd, t.hh, t.mm, 0);
  }

  // Last resort: native Date
  const d = new Date(dateStr);
  if (!isNaN(d)) {
    const t = parseTime(timeStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.hh, t.mm, 0);
  }
  throw new Error('Unrecognized date format: ' + dateStr);
}

function parseTime(timeStr) {
  const m = (timeStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { hh: 0, mm: 0 };
  return { hh: Math.min(23, Math.max(0, Number(m[1]) || 0)), mm: Math.min(59, Math.max(0, Number(m[2]) || 0)) };
}

function fetchGithubDir(owner, repo, path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  return fetchJson(url);
}

function fetchJson(url) {
  const params = { muteHttpExceptions: true, headers: {} };
  if (USE_PRIVATE_REPO) {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
    if (!token) throw new Error('Set GITHUB_TOKEN in Script Properties for private repos');
    params.headers.Authorization = 'token ' + token;
  }
  const res = UrlFetchApp.fetch(url, params);
  if (res.getResponseCode() !== 200) {
    throw new Error(`GitHub API error ${res.getResponseCode()} for ${url}`);
  }
  return JSON.parse(res.getContentText());
}

function fetchText(url) {
  const params = { muteHttpExceptions: true, headers: {} };
  if (USE_PRIVATE_REPO) {
    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
    if (!token) throw new Error('Set GITHUB_TOKEN in Script Properties for private repos');
    params.headers.Authorization = 'token ' + token;
  }
  const res = UrlFetchApp.fetch(url, params);
  if (res.getResponseCode() !== 200) {
    throw new Error(`Fetch error ${res.getResponseCode()} for ${url}`);
  }
  return res.getContentText();
}
