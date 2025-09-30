# Google Apps Script: Calendar Sync from CSVs

This script syncs all CSV files in `csv-files/` of this repo into your Google Calendar. It is designed to work with your FLL Explore hub and the embedded calendar.

## What it does
- Lists all CSVs under `csv-files/` via GitHub API
- Detects event-like CSVs (must have a Date-like column)
- Creates/updates calendar events idempotently
- Removes future events previously created by this script if they disappear from CSVs

## File
- `calendar_sync_all_csv.gs` — copy-paste this into a new Apps Script project.

## Setup
1. Create a new Apps Script project at https://script.google.com
2. Set Project Settings → Time zone to your local time (e.g., America/Los_Angeles)
3. Open `calendar_sync_all_csv.gs` and:
   - Set `CALENDAR_ID` to your team calendar, e.g. `fll2025.westvalley.cusdk8@gmail.com`
   - Ensure `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_PATH` match your repo
   - If the repo is private:
     - Set `USE_PRIVATE_REPO = true`
     - In Apps Script: Project Settings → Script Properties → add `GITHUB_TOKEN` with a GitHub Personal Access Token
4. Click `Run` → `syncAllCsvsToCalendar` → Authorize when prompted
5. Add a trigger: Triggers → Add Trigger → Function `syncAllCsvsToCalendar` → Time-driven → choose hourly/daily

## CSV expectations
- Must include a Date-like column. Recognized headers include:
  - `Date`, `Event Date`, `Day`, `Hosting Date`
- Title column is optional; the script can derive it from a Host column (e.g., `Host Kid/Parent`). Recognized headers include:
  - `Title`, `Event`, `Summary`, `Name`, `Topic`, `Session Title` and host synonyms for title derivation
- Optional columns: `Notes`/`Description`/`Details`/`Homework`, `Location`, `Start`, `End`
- Supported date formats: `YYYY-MM-DD`, `MM/DD`, `MM/DD/YY`, `MM/DD/YYYY`
  - Missing or malformed years fall back to `DEFAULT_SEASON_YEAR`
- Supported time format: `HH:mm` (24-hour)
  - If no times are present, the script creates an all-day event

## How it stays safe
- The script tags events it creates with a `Source:CSVRepoSync` marker and a stable key in the description. It only updates or removes those events.
- Cleanup only considers events within the next 12 months (configurable via `MONTHS_CLEANUP_AHEAD`).

## Troubleshooting
- If you see `Skipping <file> (no Date-like header detected)`, ensure the CSV has a recognized date header
- If the GitHub repo is private and you get 403/404 errors, set `USE_PRIVATE_REPO = true` and configure the `GITHUB_TOKEN` script property
- Check the Execution log in Apps Script for details (View → Executions)

## Customization
- To force a fixed school year, set `DEFAULT_SEASON_YEAR = 2025`
- To map specific files to different calendars, add a simple map in code and select the calendar by filename
