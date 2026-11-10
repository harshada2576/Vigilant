# Vigilant Browser Walkthrough

**Captured:** 2026-11-09  
**Frontend:** `http://localhost:3000`  
**Homeserver:** `http://localhost:8008`

Screenshots for the completed captures are attached to the chat session in this order:

1. Landing page: `/`
2. Login page: `/login`
3. Registration page: `/register`
4. Authenticated dashboard: `/dashboard`

## Verification stages

| Stage | Route | Result | Screenshot |
|---|---|---|---|
| Public landing | `/` | PASS — Vigilant branding, sign-in and registration actions visible | Captured |
| Login form | `/login` | PASS — username and password fields visible | Captured |
| Registration form | `/register` | PASS — username, password and confirmation fields visible | Captured |
| Registration flow | `/register` → `/dashboard` | PASS — `vigilantdemo` registered against local Synapse | Captured dashboard |
| Login flow | `/login` → `/dashboard` | PASS — session cleared, then credentials accepted | Captured dashboard |
| Dashboard overview | `/dashboard` | PASS — authenticated user, room counts and sync status visible | Captured |
| Channels landing | `/dashboard/c` | Route compiled successfully, but the development server recycled before a stable browser screenshot could be retained | Not retained |
| Direct messages landing | `/dashboard/dm` | Route was requested, but the development server was not stable enough for a reliable screenshot | Not retained |

## Test account used

- Username: `vigilantdemo`
- Password: redacted; the account was a disposable local verification account.

## Notes

- No screenshots contain access tokens.
- The dashboard correctly reports `SYNC UNKNOWN`; this reflects the bridge API and is not presented as a false connected state.
- The local Synapse and PostgreSQL services were running during the authentication captures.
- Dynamic route screenshots should be recaptured after running a stable production server with a clean port if visual evidence for those two empty states is required.
