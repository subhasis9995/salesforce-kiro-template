---
inclusion: manual
---

# Project Initialization (run once; re-run with `#07-project-init` after major changes)

Goal: learn the real project so its conventions drive all future work. Be economical: list directories and read samples, never read every file.

1. Read `sfdx-project.json`, `package.json`, `.forceignore`, `jest.config.js`, `.eslintrc*`/`eslint.config.*`, `.prettierrc*`, and any PMD ruleset. Note the package dirs, API version, and scripts.
2. Inventory by counts and names: classes, triggers, LWC, Aura, flows, objects, permission sets, labels, custom metadata, Named Credentials. Write `.kiro/memory/inventory.md`, grouped by domain.
3. Detect conventions by reading 2–3 representative samples of each:
   - Trigger framework (handler base class, recursion guard), and whether fflib or a domain/service/selector layout is used.
   - TestDataFactory name and API, test class naming, use of `Assert` vs `System.assert`.
   - Logger and error helper. Security style (USER_MODE, `stripInaccessible`, `WITH SECURITY_ENFORCED`).
   - LWC: shared util modules, toast/error helper, LMS channels, Jest mocks location.
4. Orgs: `sf org list --json`. For each alias the user names, run the `IsSandbox` query (01-analysis-protocol.md 1B). Record the results. Show the user the JSON for `.kiro/guard-config.json`: verified sandboxes go in `allowedOrgs`, and production aliases and usernames go in `productionOrgs`. The user edits that file, because Kiro is blocked from editing it.
5. Atlassian: ask for the Jira project key and Confluence space key. Run one test search to confirm the MCP works.
6. Write `04-project-memory.md` (Overview, Orgs, Project Conventions, under 120 lines). Put anything detailed in `.kiro/memory/`.
7. Report in 10 lines or fewer: conventions detected, where they differ from template defaults, gaps (no Jest, no factory, low coverage), and questions.

Where the project differs from template defaults, record the project's way under Project Conventions. Do not refactor existing code toward the template unless a Jira ticket asks for it.
