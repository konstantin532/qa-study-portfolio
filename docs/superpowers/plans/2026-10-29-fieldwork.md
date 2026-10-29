# QA Fieldwork Implementation Plan

> **For agentic workers:** Use executing-plans for the coordinated implementation and fresh independent review.

**Goal:** Replace the visual system and improve the first learning session without changing course data or stored progress.
**Architecture:** Keep the existing vanilla JS application and storage. Replace the last theme layer, remove the mutating motion layer, update runtime shell and first two views.
**Tech Stack:** Local HTML/CSS/JavaScript, self-hosted licensed fonts, Chromium validation.
**Spec:** ../specs/2026-10-29-fieldwork-design.md

## Global Constraints
No framework/build/network dependency, no data migration, no course edits, no merge/deployment. Retain all15 routes and IndexedDB schema/version.

## Review Focus
Mobile first viewport and menu focus; persisted legacy data; dark/light contrast; click handlers immediately following render; file:// and offline font load.

## Tasks
- [x] Add local fonts and a coherent fieldwork stylesheet; retain existing component semantics and print behavior.
- [x] Update runtime sidebar/header and mobile close/scrim/Escape behavior, preserving search and theme hooks.
- [x] Replace dashboard and Today with semantic, data-backed views and a working module index.
- [x] Run static syntax checks and focused browser checks, then one complete route/workflow pass.
- [x] Capture desktop/mobile, obtain independent review, fix material findings, update design record and HTML/CSV report.
- [x] Commit, push topic branch, create and attach draft PR with validation and limits: https://github.com/konstantin532/qa-study-portfolio/pull/3.

## Verification ledger
Final Chromium run: `node scripts/verify-ui.cjs` — 43 PASS, zero uncaught exceptions and zero external runtime requests. Includes real note body/title/conclusion persistence, rapid two-note switching, backup round trip, standalone export, search, themes, direct file launch and all 15 sections at 1440/390px.

`node scripts/verify-notes.cjs` reproduced the rapid-switch loss before the fix and passed afterward. Existing Editor descriptor/API mismatch was independently reproduced on the base commit; adapted only its Notes caller. Note state now snapshots at edit time and store-level autosave retains all pending notes. No database schema or course-data changes.

Independent source/visual review: SHIP after contrast, export palette, menu focus, save status and note-switch fixes. Optional touch labels on atlas cells deferred; full module titles remain in the course and route pages, and available on focus/hover.

BLOCKED: external Claude review is not available in this session; Safari/Firefox and physical phones were not available. Production was not deployed. No merge authorization requested or used.
