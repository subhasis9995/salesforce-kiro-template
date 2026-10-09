---
inclusion: manual
---

# Stage 2â€“4 â€” Spec, TDD Implementation, Deploy

Precondition: `approvals.md` has both analysis approvals filled in. If not, stop and go back to `01-analysis-protocol.md`.

## Stage 2 â€” Spec (Kiro native spec folder `.kiro/specs/<feature>/`)

- `requirements.md`: Jira key and Confluence links; user stories; numbered, testable acceptance criteria (EARS style: WHEN/IF ... THE SYSTEM SHALL ...); out of scope; business rules.
- `design.md`: components new and modified, with layer and key method signatures; LWC tree with `@api`, events, and wire vs imperative; data model changes; security (sharing, FLS, CRUD); governor analysis; test plan per class and component; deploy plan; rollback plan. Diagrams only where there are 3 or more components. Reuse the analysis diagrams and do not redraw them.
- `tasks.md`: Kiro checkbox format so the IDE can track and run each task:

```
- [ ] T-001 Add TestDataFactory.createAccounts(n) â€” Test
  - Files: force-app/main/default/classes/TestDataFactory.cls
  - Done when: method returns n inserted accounts; existing tests still pass
  - Depends: â€”
  - _Requirements: 1.1_
- [ ] T-002 Write AccountService_Test (RED) â€” Test
- [ ] T-003 Implement AccountService.validate (GREEN + refactor) â€” Create
```

Task order: factory methods, then tests (RED), then implementation from the bottom layer up (Selector, Repository, Service, Controller/Handler), then LWC Jest tests (RED), then LWC (GREEN), then refactor, then the final task (full test run, lint, Definition of Done).
Each implementation task names its paired test task. A pair can be one task: "test + implement X".

Gate B: post a summary of at most 15 lines (files, tasks, top risks, open questions). Ask: "Spec ready. Reply `spec approved` or send changes."
On approval: fill `SPEC_APPROVED_BY_USER`, then ask for the TDD validate org:
"May I run validate-only (`--dry-run`) test deployments to <TARGET_SANDBOX> for this spec?"
On yes: fill `TDD_VALIDATE_ORG_APPROVED: <alias> YYYY-MM-DD` and set `STATUS: IN_PROGRESS`.

## Stage 3 â€” Execution control

- One task at a time. Never use "run all tasks". Announce it: `Starting T-003: <title>`.
- Before a task, add `(IN PROGRESS)` to the task line (e.g. `- [ ] T-003 ... (IN PROGRESS)`). After it passes, mark it `- [x]`. Blocked: add `(BLOCKED: reason)`.
- After each task: 1â€“3 line summary, then wait for `continue`.
- User commands:
  - `continue` / `next`: start the next task.
  - `stop` / `pause`: save state in tasks.md, then wait.
  - `resume`: start the first unchecked task.
  - `restart T-00X`: redo that task.
  - `skip T-00X`: mark it `(SKIPPED by user)`.
  - `show status`: show the task table.
- If the session ends mid-task, the SessionStart hook offers a resume.

## TDD inside every task (Apex and LWC)

1. **RED**: write tests first. For Apex, also add a compiling stub (signature only, returns null or throws) so the failure is a real assertion and not a compile error. Show the test scenario names to the user, one line each.
2. Run the tests and confirm they FAIL for the expected reason. Paste only the failing test names and the first error line.
3. **GREEN**: write the minimum implementation. Run the tests and confirm they pass.
4. **REFACTOR**: apply the standards from 02/03, then run the tests again (still GREEN).

Commands, touched tests only:
```
# Apex â€” validate only, nothing is saved to the org (needs TDD_VALIDATE_ORG_APPROVED)
sf project deploy start --dry-run --source-dir <class + test paths> --test-level RunSpecifiedTests --tests <Foo_Test> --target-org <alias> --wait 30 --json
# LWC
npx sfdx-lwc-jest -- <component path>
npx eslint <component path>
```
If the dry-run fails on unrelated org issues, report it and stop. Do not "fix" unrelated code.

## Stage 4 â€” Deploy (explicit approval every time)

Before any non-dry-run deploy, show this and wait for `deploy approved`:
```
Target: <alias>  IsSandbox: true  (verified now)
Components: <list>
Test level: RunSpecifiedTests (<tests>) | RunLocalTests
Overwrites: <components that exist in the org>
Rollback: redeploy from git <commit or branch>
```
Production: never. Give the user the command to run themselves.

## Definition of Done (final task)

- [ ] Gates A and B were recorded before any code was written
- [ ] Every code task went RED, then GREEN, then REFACTOR
- [ ] All touched Apex tests and Jest tests pass. Apex coverage is at least 85% per touched class
- [ ] ESLint clean, no `System.debug`, no hardcoded Ids/strings/URLs, headers and ApexDoc/JSDoc present
- [ ] Security: USER_MODE, sharing, FLS checked
- [ ] Memory updated (only new facts)
- [ ] The user has the git commands to run. Kiro does not commit or push
- [ ] `approvals.md` set to `STATUS: DONE`

