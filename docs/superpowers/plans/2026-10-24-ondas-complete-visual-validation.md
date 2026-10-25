# Ondas — Complete Visual Validation Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for the independent route families and verification-before-completion before closing each batch.

**Goal:** Validate every existing route family and its finite, named visual states on desktop and mobile; correct every remaining platform surface that diverges from the approved Ondas material.

**Architecture:** Reuse the existing route matrix, shared LiquidLens, CSS Modules and Playwright fixtures. A single leased runner captures states; separate reviewers open the resulting images, compare the Ondas reference and record concrete fixes. No token inheritance, screenshot creation or old approval substitutes for current visual review.

**Tech Stack:** Next15/React19/TypeScript, existing CSS Modules/Base UI, Vitest, Playwright Test/MCP, Axe.

**Spec:** Existing approved `docs/superpowers/specs/2026-10-23-ondas-platform-design.md`, with the user's24/10 request to close all pending desktop/mobile visual states.

## Constraints and rulings

- Preserve the current dirty branch, tenant/security/payment/moderation/analytics contracts. No commit, branch, deploy, dependency or lockfile changes.
- Reuse the disposable review DB5446/Redis6393 and local stubs4112/4456. Do not run destructive global setup/teardown against the persistent demo.
- Main captures1440×900 and390×844; additional320/768/1280,200% text, keyboard/focus and reduced motion/transparency on shared patterns.
- Enumerate all semantic states implemented by each feature. Shared hover/focus/disabled primitives are reviewed once plus their actual route compositions; no claim of an unbounded Cartesian product.
- Live baseline and presentation fixtures are explicitly distinguished. Mocking a failure is visual evidence, not backend journey approval.
- Published owner palettes and32 experimental gallery directions retain their intended identities; their platform management controls use Ondas. This protects existing authored content rather than recoloring it silently.
- Current95-route matrix is reconciled against actual pages/catch-all sections, loading/error boundaries and stories. Redirect aliases retain their effective-route evidence.

## Batches

- [x] Restore isolated API/stubs and development demo; verify approved reference and current source.
- [x] Public/catalog/publications: enumerate, capture, inspect, fix and recheck all named states in both widths.
- [x] Profile/workspace/team/agency/personal resources: enumerate, capture, inspect, fix and recheck all named states in both widths.
- [x] Admin/auth/publishing/commercial: enumerate, capture, inspect, fix and recheck all named states in both widths.
- [x] Shared primitives/stories and global boundaries: inspect variants, focus/hover/disabled, popups/scroll, empty/loading/error and fallbacks.
- [x] Reconcile source hashes, route/state image hashes and human review, without inheriting stale approvals.
- [x] Run lint, app/E2E types, meaningful affected tests, production build and affected E2E; rerun failed/newly changed states.
- [x] Leave updated demo running; record checks, remaining physical-browser/provider limits and reversible file scope.

## Closure

Root reconciled95route families × desktop/mobile and540source files after the family reviewers opened the complete image crops.1,989finite named route/state/viewport combinations have current evidence or14explicit semantic dispositions; old failed/incomplete captures remain excluded.436unique browser cases have a passed latest run;200Vitest files/739tests,lint,app/E2E types and production build passed. Demo3013was restarted and its home/detail/suggestions rechecked with normal motion. See `docs/superpowers/2026-10-24-ondas-complete-visual-audit.md` and `output/ondas-v24/matrix-closure-summary.json` for exact scope and limits. Author themes and experimental directions remain intentional exceptions to platform recoloring; six unused source helpers do not invent new runtime UI. Chromium mobile emulation is not physical-device/Safari/Firefox or live-provider certification.
