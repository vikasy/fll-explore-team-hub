# FLL Explore Team Hub

A lightweight Firebase-backed web portal for a FIRST LEGO League Explore team ("Lego Diamonds"). It provides a centralized place for schedule progress tracking, timeline, roster, resources, media link, and administrative guest access.

## Features
- Google Auth allowlist (Firestore `allowedUsers` collection)
- Role flags: parent, student, admin, guest (rules-enforced)
- Team session progress checklist with real-time Firestore sync + local offline cache
- Season timeline & roster loaded from CSV files
- Financials table and resource document links (PDFs)
- Team media page (links to private Drive folder)
- Access request + minimal admin helper (`atithi_anumati.html`) with shared-secret gate & throttle
- Guest-only provisioning (simplified UI) via helper page

## Tech Stack
- Static HTML/JS (no build step)
- Firebase (Auth, Firestore, optional Analytics)
- Firestore Security Rules (role-based, allowlist-driven)

## Repository Layout (key files)
- `index.html` – Main portal UI & logic
- `team_media.html` – Media gallery entry page
- `parent_conversation.html` / `student_conversation.html` – Conversation pages gated by roles
- `atithi_anumati.html` – Admin/guest helper (secret-gated)
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

## License
Internal / team use. 
