# FLL Explore Team Hub

A lightweight Firebase-backed web portal for a FIRST LEGO League Explore team ("Lego Diamonds"). It provides a centralized place for schedule progress tracking, timeline, roster, resources, media link, and administrative guest access.

## Features
- Google Auth allowlist (Firestore `allowedUsers` collection)
- Role flags: parent, student, admin, guest (rules-enforced)
- Team session progress checklist with real-time Firestore sync + local offline cache
- Season timeline & roster loaded from CSV files
- Financials table and resource document links (PDFs)
- Team media page (links to private Drive folder)
- Guest-only provisioning (simplified UI) via helper page

## Tech Stack
- Static HTML/JS (no build step)
- Firebase (Auth, Firestore, optional Analytics)
- Firestore Security Rules (role-based, allowlist-driven)

## Repository Layout (key files)
- `index.html` – Main portal UI & logic
- `team_media.html` – Media gallery entry page
- `parent_conversation.html` / `student_conversation.html` – Conversation pages gated by roles
- `firestore.rules` – Active security rules (deploy separately)
- `csv-files/` – Timeline, roster, financials, session schedule CSVs
- `documents/` – Linked PDFs for resources
- `images/` – Branding / team images

## Firestore Collections (in use)
- `allowedUsers` – One doc per allowed email or UID with role flags
- `scheduleProgress` – Shared checklist state per session
- `parent_conversation`, `student_conversation` – Chat/message docs
- `parent_nightly_optin`, `student_nightly_optin` – Opt-in docs
- `media` – Media metadata (restricted)
- `accessLogs` – (Optional) access log entries (admin read)
- `accessRequests` – Users requesting allowlist access

## Security Model
Access controlled via Firestore rules:
- A user must have a doc in `allowedUsers` keyed by exact email (lowercase recommended) or UID.
- Role helpers (admin/parent/student/guest) drive granular read/write permissions.
- Admins can manage any `allowedUsers` doc; regular users only their own.
- Guest accounts are read-only (except limited collections) and created via helper page.

## Deploy (Firebase Hosting / Rules)
Deploy hosting (HTML/CSS/JS):
```bash
firebase deploy --only hosting
```
Deploy Firestore rules after rule edits:
```bash
firebase deploy --only firestore:rules
```

## CSV Conventions
- `team_session_schedule.csv` parsed with a robust quote-aware parser; Activity & Status columns support multi-line (newline separated inside quoted cells). Activity lines render as checkboxes; Status lines as bullet list.
- Other CSVs currently use simple line + comma splits (avoid embedded commas/newlines).

## Logs & Access Requests
- Non-allowlisted users can submit an access request (`accessRequests`).
- (Optional) Add client code to write `accessLogs` entries for audit.

## Note: `google-cloud-sdk` Is Not Checked In
The Google Cloud SDK (gcloud CLI) is intentionally NOT part of this repository because:
1. It is a large, platform-specific binary/toolchain (hundreds of MB) that would bloat the repo.
2. It updates frequently; vendoring would cause noisy diffs and potential security lag.
3. A local installation can contain credentials, cached tokens, and config that must never be committed.

### How to Get the Tools Locally
Most project operations only need the Firebase CLI (smaller + simpler):
```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

If you specifically want the full Google Cloud SDK (for broader GCP commands):
1. Follow the official install guide: https://cloud.google.com/sdk/docs/install
2. Initialize & auth:
	```bash
	gcloud init
	gcloud auth login
	gcloud components update
	```
3. (Optional) Install Firebase CLI via script if you prefer:
	```bash
	curl -sL https://firebase.tools | bash
	```

### Why Keep It Out of the Repo
- Keeps the repo lean and fast to clone.
- Prevents accidental exposure of credentials or tokens inside `.config/gcloud`.
- Ensures every contributor pulls the freshest, patched binaries direct from Google.

### Minimum Needed To Reuse This Project
- A Firebase project: replace the Firebase config object in `index.html` with your own.
- Deploy Firestore security rules (`firestore.rules`).
- Upload static files via Firebase Hosting (or any static host, if you adjust Auth origins).
- Create `allowedUsers` entries to grant access.

Everything else (UI logic, CSV-driven content, access logging) runs client-side—no server build, no bundled dependencies, and no need to vendor the SDK.

## License
Internal / team use. 
