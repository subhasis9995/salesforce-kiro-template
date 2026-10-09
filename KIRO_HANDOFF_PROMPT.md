# Handoff prompt for Kiro

Copy everything below the line into Kiro chat.

---

You are working in a Salesforce (Apex + LWC) project whose `.kiro/` workspace config was just reviewed and rewritten. Read this context, then do the PENDING tasks in order. Be concise. Report in a short checklist.

## Context: what changed and why

1. **Steering restructured to save tokens.** Before, all 7 steering files had `inclusion: always`, about 42KB (roughly 10.5k tokens) on every request. Now:
   - `00-core-rules.md` (always): guardrails, lifecycle gates, git/data/org/deploy rules, token budget rules.
   - `04-project-memory.md` (always): compact index capped at 120 lines. Detail logs moved to `.kiro/memory/*.md` (inventory, decisions, failures, business-rules, tech-debt, integrations), opened only when relevant.
   - `02-apex-standards.md` (fileMatch `*.cls`, `*.trigger`, `*.apex`) and `03-lwc-standards.md` (fileMatch `lwc/**`, `aura/**`). These replace the old `02-architecture.md` and `03-code-standards.md`.
   - `01-analysis-protocol.md`, `05-spec-and-tdd.md`, `06-atlassian-context.md`, `07-project-init.md` (manual). `00-core-rules.md` tells you when to read each one. `05-spec-and-tdd.md` replaces the old `05-tdd-and-spec.md`.
   - Why: always-on content was re-sent on every request, and the memory file was append-only, so it grew forever.
2. **Lifecycle now has a manager gate and recorded approvals.** Analysis is written to `.kiro/specs/<feature>/analysis.md` so the user can share it with their manager. Approvals are recorded in `.kiro/specs/<feature>/approvals.md`, using the keys `ANALYSIS_APPROVED_BY_USER`, `ANALYSIS_APPROVED_BY_MANAGER`, `SPEC_APPROVED_BY_USER`, `TDD_VALIDATE_ORG_APPROVED`, and `STATUS`. Fill a key only when the user types that approval in chat. Why: the user wants a user + manager review before the spec.
3. **Real enforcement added.** Steering alone is soft. New hooks run `node .kiro/hooks/scripts/guard.js <mode>`, and exit code 2 blocks the action:
   - `guard-shell.json` (PreToolUse) blocks:
     - git write commands and branch checkout/switch
     - destructive metadata operations and `sf data delete`
     - deploys, data writes, or anonymous Apex against orgs not in `.kiro/guard-config.json` `allowedOrgs`, or run without `--target-org`
     - anonymous Apex containing delete
     - shell file deletion (except `.kiro/sandbox-snapshot`)
     - shell commands that modify guard files
   - `guard-write.json` (PreToolUse) blocks edits under package dirs until approvals.md is complete with `STATUS: IN_PROGRESS`. It also blocks `destructiveChanges*.xml` and edits to `.kiro/hooks/`, `.kiro/settings/`, `.kiro/guard-config.json`, and `00-core-rules.md`. It warns on DML delete.
   - `guard-task.json` (PreTaskExec) blocks spec task execution unless that spec is approved.
4. **Hooks fixed.** The old `Stop` hook fired after every agent turn and rewrote memory each time, which wasted tokens. `session-reflection.json` is now a `Manual` wrap-up. `session-init.json` and `post-task-memory.json` were made short and conditional: no output when there is nothing new. All hook JSON was rewritten without the UTF-8 BOM, which breaks JSON parsing.
5. **MCP fixed.** The old env var names (`ATLASSIAN_EMAIL`/`ATLASSIAN_API_TOKEN` passed directly to the server) are not read by mcp-atlassian, so authentication would fail. The config now uses `JIRA_USERNAME`, `JIRA_API_TOKEN`, `CONFLUENCE_USERNAME`, `CONFLUENCE_API_TOKEN` via `${ENV}` substitution. The version is pinned to `0.23.1` (it was `@latest`). `READ_ONLY_MODE=true` is set, and `ENABLED_TOOLS` is limited to `jira_get_issue,jira_search,confluence_search,confluence_get_page` to save tokens.
6. **TDD covers Apex and LWC.**
   - Apex: RED, GREEN, REFACTOR via validate-only `sf project deploy start --dry-run --test-level RunSpecifiedTests` against the approved sandbox. Use a compiling stub first so RED is an assertion failure, not a compile error.
   - LWC: Jest (`npx sfdx-lwc-jest`) plus eslint.
   - Real deploys need explicit approval every time. Production is never a target.
7. **Org safety and parity.** Analysis checks `SELECT IsSandbox FROM Organization` and stops on production. Parity uses retrieve to `.kiro/sandbox-snapshot/`, then diff, then direction (git status/log vs Tooling API `LastModifiedDate`/`LastModifiedBy`, or source-tracking preview). Statuses: In Sync / Local Ahead / Sandbox Ahead / Unclear / Missing.
8. **Standards updated.** `WITH USER_MODE` / `AccessLevel.USER_MODE` instead of `WITH SECURITY_ENFORCED`, the `Assert` class, and LWC Jest and accessibility rules. Project conventions found during init override template defaults (for example, an existing trigger framework or fflib).
9. **Spec tasks use Kiro's native checkbox format** in tasks.md (`- [ ] T-001 ...`), so the IDE can track, stop, and resume them.

## PENDING: do these now

1. **Remove deprecated steering files.** `.kiro/steering/02-architecture.md`, `.kiro/steering/03-code-standards.md`, `.kiro/steering/05-tdd-and-spec.md` are superseded and marked DEPRECATED. The user approves deleting these three files. Use your file-delete tool. Shell `rm` is blocked by design.
2. **Verify hook compatibility with this Kiro version** (read-only, report findings):
   - Are `.kiro/hooks/*.json` files in `"version": "v1"` format with `trigger` and `action` loaded? Do all 6 hooks show in the Hooks panel?
   - Are the triggers `SessionStart`, `PreToolUse`, `PreTaskExec`, `PostTaskExec`, `Manual` supported?
   - List your exact built-in tool names for running shell commands and for creating, editing, and deleting files. Compare them with the `matcher` regex in `guard-shell.json` and `guard-write.json`. If any are not matched (for example, a delete tool), propose corrected matcher strings. Do not edit the hook files: they are guard files. Give the user the exact JSON to paste.
   - State the JSON field names your PreToolUse STDIN payload uses for tool name and tool input. `guard.js` reads `tool_input | toolInput | input | parameters | args | arguments`. If yours differ, tell the user the one-line fix.
3. **Check consistency** across `00-core-rules.md`, `01-analysis-protocol.md`, `05-spec-and-tdd.md`, `02-apex-standards.md`, `03-lwc-standards.md`, `04-project-memory.md`, `06`, `07`, and `README.md`. Look for contradictions, wrong file references, or rules the guard does not match. Fix the issues in files you are allowed to edit, and list any fixes needed in guard files for the user.
4. **Confirm task status markers.** Does your native tasks.md support `- [-]` for in-progress? If not, update `05-spec-and-tdd.md` Stage 3 to the marker you support.
5. **User-only setup.** You cannot do these (they are guard or settings files). Remind the user in one short list:
   - Set the `ATLASSIAN_EMAIL` and `ATLASSIAN_API_TOKEN` environment variables, and approve them in Kiro settings under "Mcp Approved Env Vars".
   - Replace `YOUR_COMPANY` in `.kiro/settings/mcp.json`.
   - Fill `allowedOrgs`, `productionOrgs`, and `packageDirs` in `.kiro/guard-config.json`.
   - Use Supervised mode. Do not add `git`, `sf project deploy`, `sf data`, or `sf apex run` to trusted commands.
6. **Smoke test the guards.** Attempt each command below once and report blocked or allowed. Do not retry or work around a block.
   - `git status`: expect allowed
   - `git commit -m test`: expect BLOCKED
   - `git checkout -b test`: expect BLOCKED
   - `sf project deploy start --source-dir force-app`: expect BLOCKED (no `--target-org`)
   - Creating `force-app/main/default/classes/GuardTest.cls` with no approved spec: expect BLOCKED
   - `sf data delete record -s Account -i 001000000000000 --target-org x`: expect BLOCKED

   If any expected block was allowed, stop and report which one.
7. **Test the MCP.** Run one `jira_search` and one `confluence_search` (limit 1). Report whether they work. If they fail, show the first error line only.
8. **Offer project init.** Once steps 1–7 pass, offer to run `#07-project-init`.

Do not commit, push, deploy, or edit guard files. Final report: a checklist of items 1–8 with pass/fail and the actions the user needs to take.
