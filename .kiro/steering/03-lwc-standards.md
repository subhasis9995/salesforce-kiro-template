---
inclusion: fileMatch
fileMatchPattern: ["**/lwc/**", "**/aura/**"]
---

# LWC Standards

Project conventions in `04-project-memory.md` override this file. Examples: an existing shared utils component, a base component, or a toast/error helper. Reuse them.

## Architecture

- Container/presentational split: containers own data and Apex calls, presentational components only render and fire events.
- Parent to child via `@api` properties. Child to parent via `CustomEvent` (lowercase names, data in `detail`). Unrelated components use Lightning Message Service.
- Reads: prefer Lightning Data Service (`lightning/uiRecordApi`, `lightning-record-*-form`), then `@wire` to `cacheable=true` Apex. Writes: imperative Apex, followed by `refreshApex` or `notifyRecordUpdateAvailable`.
- Every data view handles 3 states: loading (`lightning-spinner`), empty, and error.
- No hardcoded Ids, record type names, URLs, or UI strings. Use `@salesforce/label`, `@salesforce/schema`, and Custom Metadata.
- Import fields with `@salesforce/schema`, so a field rename breaks the build and not runtime.
- New Aura components only if LWC cannot do the job. Document the reason.

## Code

- File header comment with purpose, author, date, and Jira key. JSDoc on public `@api` members and non-trivial handlers.
- `@api` only for genuine public inputs. Never mutate `@api` values; copy them first. Use `@track` only for deep mutation of plain objects or arrays.
- Handlers are named `handle<Event>`. No logic in getters that has side effects.
- Every wire and every imperative call has error handling that reduces errors to a user message (use the project helper if one exists) and shows a toast or inline error.
- SLDS classes and design tokens. No inline styles, no `!important`, no `innerHTML`/`lwc:dom="manual"` without sanitising.
- Accessibility: labels on inputs, `alternative-text` on icons, keyboard reachable, no meaning conveyed by colour alone.
- Bump the bundle `apiVersion` only via an approved analysis. Set `isExposed` and targets deliberately.

## Jest tests (TDD is mandatory for LWC)

- Location: `<component>/__tests__/<component>.test.js`. Run: `npx sfdx-lwc-jest -- <path>` (or the project's `npm run test:unit -- <path>`).
- If the project has no Jest setup, flag it in the analysis. Adding `@salesforce/sfdx-lwc-jest` is a dependency change and needs approval.
- Mock Apex (`jest.mock('@salesforce/apex/Ctrl.method', ..., { virtual: true })`), wires (`createApexTestWireAdapter` / `registerLdsTestWireAdapter`), labels, and navigation.
- Minimum scenarios: renders with data, empty state, error state, user interaction fires the right event or Apex call, and `@api` input changes.
- `afterEach`: remove DOM children and `jest.clearAllMocks()`. Await `Promise.resolve()` after state changes.
- Assert DOM output and events, not internal fields.
- Lint: `npx eslint <path>` must be clean.
