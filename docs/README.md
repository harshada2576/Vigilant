# Vigilant Documentation

This directory contains the technical documentation, architectural specifications, API contracts, verification reports, and handoff guides for Project Vigilant.

---

## Documentation Structure

```
docs/
├── README.md                                  # This documentation index
├── README_FRONTEND.md                         # Frontend developer guide & setup instructions
├── DEVELOPER_B_HANDOFF.md                     # Developer B completion summary & Developer A dependencies
├── architecture/
│   └── FRONTEND_ARCHITECTURE.md               # Frontend architecture, data flow & lifecycle specifications
├── integration/
│   ├── FRONTEND_INTEGRATION_STATUS.md         # Current Matrix backend integration status & boundary rules
│   └── MATRIX_BRIDGE_API_CONTRACT.md          # @seucra/matrix-sdk-bridge@0.1.4 API contract & method reference
└── testing/
    └── FRONTEND_VERIFICATION_REPORT.md        # Comprehensive verification report (tests, lint, build, hashes)
```

---

## Document Overview

### 1. [Architecture](architecture/FRONTEND_ARCHITECTURE.md)
Detailed specification of the frontend system design:
- Data flow between Next.js client components, `matrixService.ts`, `matrixStore.ts`, and `@seucra/matrix-sdk-bridge`.
- Strict authority model: Matrix Synapse is the single source of truth (no fake data or local mock fallbacks).
- Session lifecycle in tab-scoped `sessionStorage`.
- Message timeline rendering, scroll-up infinite pagination (20-message batches), and date dividers.
- Media handling (image & PDF attachments, magic byte signature validation, 25 MiB cap).
- Presence and directory exception boundaries.

### 2. [Integration Status](integration/FRONTEND_INTEGRATION_STATUS.md)
Current status of the Matrix homeserver integration:
- Verified package boundary with `@seucra/matrix-sdk-bridge@0.1.4`.
- Methods implemented via WebAssembly bridge.
- Temporary direct Matrix HTTP exceptions (directory search & presence GET/PUT) with replacement requirements.
- Missing bridge capabilities (member enumeration, typing, receipts, sync lifecycle).

### 3. [Matrix Bridge API Contract](integration/MATRIX_BRIDGE_API_CONTRACT.md)
Formal API contract of the installed WebAssembly bridge package:
- Verified method declarations from `matrix_sdk_bridge.d.ts`.
- Input parameters, return types, and asynchronous behavior.
- Session export/restore schemas and callback models.
- Verified vs. unverified payload structures.

### 4. [Testing & Verification Report](testing/FRONTEND_VERIFICATION_REPORT.md)
Evidence-based verification report:
- **TypeScript:** `tsc --noEmit` pass (0 errors).
- **ESLint:** Clean pass (0 errors, 0 warnings).
- **Node.js Unit Tests:** 15/15 tests passing across identifiers, payloads, presence, media signatures, and message deduplication.
- **Production Build:** Next.js Turbopack production build pass across all static and dynamic routes.
- **WASM Integrity:** SHA-256 hash match (`262E38F2C91159EBB358B0420F8B03B06FE21945F9764428926B1C4D9EDE8DF6`).

### 5. [Developer B Handoff](DEVELOPER_B_HANDOFF.md)
Handoff instructions and outstanding dependencies:
- Summary of completed workstream items.
- Itemized list of 9 bridge dependencies required from Developer A.
- Review checklist for incoming bridge packages.
- Security and persistence considerations.

### 6. [Frontend Developer Setup](README_FRONTEND.md)
Practical setup and local development instructions:
- Prerequisites (Node.js 22+, npm).
- Environment configuration (`NEXT_PUBLIC_HOMESERVER_URL`).
- Development commands, verification scripts, and common troubleshooting tips.

