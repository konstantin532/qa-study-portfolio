# QA Fieldwork redesign

The user wants a radically better-looking QA learning project. Their general instruction authorizes reversible work with reported assumptions; proceed in a topic branch and draft PR, never merge or deploy.

## Direction (implementer assumption)
An editorial engineering workshop: warm paper, graphite ink, vermilion accent, local Cyrillic display lettering, fine rules, ample space and a tangible interactive course index. Preserve the product name. The first screen should say what to do next and let the learner enter that lesson immediately. Visual drama comes from typographic composition and real course structure, not invented metrics.

## Scope
Replace the competing Theme Pro / Motion Pro runtime layers with a coherent theme. Rebuild runtime sidebar/header, dashboard and Today, and bring existing screens into the same system through shared styles. Group all 15 navigation items and retain every existing route. Desktop uses a compact sticky sidebar and a full-width work area; mobile uses an off-canvas sidebar removed from document flow, with a close control and scrim. Fix the confirmed blank mobile first viewport and split onboarding dialog.

Dashboard: expressive headline, prominent next lesson, interactive index for the actual 23 modules linking to each module's next unfinished topic, compact real progress and quick access to repetition/practice/portfolio. Today: two planned topics, due cards and practices; no fabricated daily completion percentage. Empty states explain the useful next action.

## Pattern checklist
- Runtime navigation/header are generated in js/core/main.js; index.html is fallback only.
- Preserve #sidebar, #header, #main-content, #header-search and current navigation/search/theme hooks.
- Keep main tabindex=-1 and route focus handling; all new actions are native links/buttons.
- Reuse App state and existing progress/due/lesson helpers; do not introduce another data store.
- CourseData comes from js/utils/course-data.js; root course-data.js is not active.
- Preserve native form and checkbox semantics, dialog roles, status announcements and export/import.
- Theme tokens apply to shell, shared components and inline colors in touched renderers.
- No external scripts/fonts, animations respect reduced motion, content visible by default.
- No locked levels or professional ranks based on quiz scores; no new curriculum or simulated sandbox.
- Actual evidence: baseline desktop 1440x1000, mobile 390x844, four concept previews; mobile container starts at y844 and overflows to 621px.

## Validation
Real Chromium: all 15 routes; dashboard index and next-lesson links; Today; onboarding; mobile menu/keyboard/first viewport; light/dark/system; note creation and persistence; practice; export/import using isolated fixture data; direct file:// load; no external network required. Static JavaScript syntax and unchanged course/storage files. Desktop/mobile screenshots and an independent source/visual review. Unavailable checks get BLOCKED, never a success claim.
