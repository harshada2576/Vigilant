# Developer B Handoff

## Completed by Developer B

- Kept the published bridge dependency at `@seucra/matrix-sdk-bridge@0.1.5`.
- Hardened the single Matrix service boundary, authentication/session cleanup, room/history parsing, directory/presence response parsing, avatar/media URL handling and composer error behavior.
- Added a small Node built-in test suite for Matrix IDs, directory/presence normalization, history and room payload validation, stable message identity, message ordering/deduplication and media signatures.
- Added current integration, API contract, architecture, setup and verification documentation.
- Preserved existing worktree changes and left the separate Developer A generated package uninstalled.

## Exact Developer A dependencies

The installed declaration has no exports for:

1. Authenticated user profile lookup and profile-avatar media resolution for `mxc://` avatar URIs.
2. Room member enumeration with membership state.
3. Presence read/write (these currently remain direct HTTP exceptions).
4. User directory search (currently a direct HTTP exception).
5. Sync connected/disconnected/error lifecycle events, including initial-sync completion.
6. Typing event send/receive and read-receipt send/receive.
7. Upload progress callbacks.
8. Stable Matrix event IDs in real-time and history messages.
9. Typed callback parameter and payload declarations plus a callback unregister/dispose mechanism.

Developer A should provide a versioned package with generated `.d.ts`, JavaScript glue, WASM binary, and a manifest that identifies the Rust source revision and SDK version. Callback/error/session/history schemas must be documented and tested against that built artifact.

## Required artifact checks before integration

When the replacement package is delivered, Developer B should inspect its package manifest and actual installed declaration, enumerate exports, confirm browser ESM/WASM loading and Next.js client compatibility, compare the package WASM SHA-256 to the proposed public runtime file, and review breaking changes. Do not point the frontend to a workspace `pkg` directory solely because it has additional methods.

Current references:

- Published runtime package WASM: `18A23C3F80004DAAE5FA9EEB8C353A651ED1D4AC0B39F70B74DD539B3B58FF15`.
- Separate workspace `pkg` WASM: `74EC6FF9DE0C00508D9FDDF1B2D48D14E14C962C779DAA18BCFF510D2D86BA44`.
- Current dependency is `^0.1.5` in the frontend manifest/lockfile.

## Developer B next steps

1. Review the final test/type/lint/build report in `docs/testing/FRONTEND_VERIFICATION_REPORT.md`.
2. When Developer A's verified artifact is available, replace direct directory and presence HTTP paths only after checking equivalent behavior and errors.
3. Integrate profile/member/sync/typing/receipt/media-progress features only against methods that exist in the delivered declarations.
4. Run live tests against a real configured Synapse test account and record that evidence separately from local UI/unit checks.

## Risks and limits

- No live Synapse account was used for verification.
- Callback JSON structure is validated at runtime because the installed declaration leaves callback parameters untyped.
- No Matrix event IDs means exact duplicate events sharing a timestamp/content fingerprint cannot be identified perfectly.
- `sessionStorage` is JavaScript-readable and is subject to browser storage policy. It is used only because the bridge session must survive reload; no password is stored.
- This was a frontend reliability review, not a formal penetration test or certification.
