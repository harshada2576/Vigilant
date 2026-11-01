# Frontend Setup

## Prerequisites

- Windows, macOS or Linux with Node.js 22 or later and npm.
- Access to the repository's locked npm dependencies.
- A reachable Matrix homeserver for authenticated workflows.
- The installed `@seucra/matrix-sdk-bridge@0.1.4` package and the checked-in `frontend/public/matrix_sdk_bridge_bg.wasm` runtime.

## Install

From the repository root:

```powershell
Set-Location frontend
npm ci --ignore-scripts
```

`--ignore-scripts` avoids running dependency lifecycle scripts during installation. The public WASM file is already part of the frontend runtime; check it exists before launching the app. The normal package `postinstall` script copies the installed package WASM into `public`, so do not run that hook when you need to preserve a separately reviewed runtime artifact.

## Homeserver configuration

Set this one public URL in `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_HOMESERVER_URL=https://matrix.example.org
```

Replace the example with the intended homeserver's HTTP(S) base URL. The application does not default to localhost. This variable is public browser configuration, not a secret. Do not put access tokens or passwords in environment files.

Restart Next.js after changing the file. The bridge uses the configured homeserver at initialization.

## Development

```powershell
npm run dev
```

The development script starts Next.js with webpack. Open the local URL printed by Next.js. Login and registration use a Matrix username (the bridge accepts a local username); a full Matrix user ID or email-style input is reduced to its local part for the configured homeserver. Registration does not set an account email address or display name.

## Checks

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run build
```

`npm test` uses Node's built-in test runner; no test framework dependency is required. Production build may need network access if Next.js must fetch its configured Google font.

## Common issues

- **Missing homeserver URL:** Set `NEXT_PUBLIC_HOMESERVER_URL` to a valid HTTP(S) homeserver URL and restart Next.js.
- **WASM initialization fails:** Confirm `frontend/public/matrix_sdk_bridge_bg.wasm` exists and matches the installed package artifact approved for this checkout. The package postinstall may copy the package binary; verify the SHA-256 before allowing it to replace a reviewed file.
- **Bridge package cannot load:** Run `npm ls @seucra/matrix-sdk-bridge` from `frontend` and confirm version 0.1.4 is installed.
- **Login or registration fails:** The homeserver controls account availability and password/UIAA policy. The bridge login API accepts a local username; this frontend does not create a local fallback account.
- **Directory search or presence fails:** These are authenticated direct Matrix HTTP exceptions in this bridge version. Check the homeserver's response and browser network access. Rate limits are surfaced by the UI.
- **Profile avatar uses `mxc://`:** Initials are shown because the current bridge has no profile-avatar media resolver.
- **Sync is shown as unknown:** The installed bridge exposes `start_sync()` but no sync lifecycle callback. This is expected until the bridge adds that contract.
- **Members are unavailable:** Room-member enumeration is not exported by bridge 0.1.4. Inviting a user is supported.

Do not infer successful live Matrix integration from a successful page build or unit test. Use a real, authorized test account and reachable homeserver for that verification.
