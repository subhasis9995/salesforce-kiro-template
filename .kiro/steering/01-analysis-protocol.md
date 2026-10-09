---
inclusion: manual
---

# Stage 1 — Impact Analysis Protocol

Goal: understand fully, verify org and parity, present one reviewable document, stop for approval.
Output file: `.kiro/specs/<feature-kebab>/analysis.md`. The user shares it with their manager.

## 1A. Gather context (silent, no chat output)

1. **Memory**: read `.kiro/steering/04-project-memory.md`. Open `.kiro/memory/*.md` only for sections relevant to this request.
2. **Code**: search first, then read only relevant files: triggers, handlers, services, selectors, LWC bundles, flows, permission sets, and their tests. Find similar existing features, and follow their pattern.
3. **Jira** (Atlassian MCP, read-only):
   - With a ticket key: `jira_get_issue`. Without one: `jira_search` with JQL on keywords (`text ~ "..." ORDER BY updated DESC`, limit 10).
   - Extract acceptance criteria, edge cases, linked and blocking issues, status, and fix version.
   - No ticket found: flag it and recommend creating one.
4. **Confluence**: `confluence_search` with CQL (`text ~ "<object or feature>"`, limit 5). Open only the top 1–3 pages with `confluence_get_page`.
   - Extract business rules, integration specs, and the data model. Note URL and last-modified date.
5. **Conflicts**: if the code, Jira, and Confluence disagree, do not follow the code silently. List the conflict and ask which is authoritative.
6. **MCP unavailable or no results**: say so in the analysis under Gaps. Never invent ticket or page content.
7. **Impact**: list every Apex class, trigger, LWC/Aura, flow, validation rule, permission set, FLS entry, custom label, metadata, and integration affected. Include their tests. Check governor limits, sharing, FLS/CRUD, and data risk.

## 1B. Org safety check (mandatory)

```
sf org display --target-org <alias> --json
sf data query --query "SELECT IsSandbox, OrganizationType, InstanceName FROM Organization" --target-org <alias> --json
```

- No alias known: ask the user. Show `sf org list` output, and never guess.
- `IsSandbox = false` -> production. STOP. Production is read-only for Kiro, so ask for a sandbox alias.
- Confirm with the user: "Target sandbox: <alias> (<username>, IsSandbox=true). Correct?"

## 1C. Sandbox parity check (mandatory for every component to be MODIFIED)

1. Retrieve without touching working files:
   ```
   sf project retrieve start --metadata "ApexClass:Foo" "LightningComponentBundle:barCard" --target-org <alias> --output-dir .kiro/sandbox-snapshot
   ```
2. Compare each file, or each whole bundle folder for LWC:
   ```
   git diff --no-index --stat <snapshot path> <local path>
   ```
3. Work out direction. A diff alone does not show which side is newer. Use:
   - Local uncommitted changes: `git status --porcelain <path>`
   - Local last commit date: `git log -1 --format=%cI -- <path>`
   - Org last change:
     ```
     sf data query --use-tooling-api --query "SELECT Name, LastModifiedDate, LastModifiedBy.Name FROM ApexClass WHERE Name IN ('Foo')" --target-org <alias> --json
     ```
     Use `LightningComponentBundle` with `DeveloperName` for LWC. Use `ApexTrigger` for triggers.
   - If source tracking is enabled: `sf project retrieve preview --target-org <alias>` and `sf project deploy preview --target-org <alias>` are authoritative.

| Status | Rule |
|---|---|
| In Sync | No diff |
| Local Ahead | Diff, and local has uncommitted changes or a commit newer than the org's LastModifiedDate |
| Sandbox Ahead | Diff, and org LastModifiedDate is newer than the local commit, or the org change was made by someone else |
| Unclear | Diff, but the evidence conflicts. Treat as Sandbox Ahead and ask the user |
| Missing in Sandbox | Not in org (new or undeployed) |
| Missing Locally | In org, not in repo |

4. **Gate**: any status other than In Sync or Missing in Sandbox for a new file -> STOP. Give options per item:
   - Local Ahead: deploy first (needs approval), or proceed with the risk logged.
   - Sandbox Ahead or Unclear: retrieve into the project (recommended; confirm first because it overwrites local), or proceed with the risk logged as High.
   - Missing Locally: retrieve before proceeding.
5. Clear `.kiro/sandbox-snapshot/` afterwards. It is git-ignored, and deleting it is pre-approved.

## 1D. analysis.md — write the file, then post only a 5–8 line summary in chat

Keep it tight. Skip any section that does not apply.

```
# Analysis — <Feature> (<JIRA-KEY>)   Date: YYYY-MM-DD   Track: Full | Lite
## Summary            what was asked, what Jira and Confluence say, mismatches
## Org & Parity       alias, IsSandbox, then a table: Component | Type | Status | Resolution
## Impact Map         Mermaid graph only if 3 or more components. Tags: MODIFY / NEW / TEST / RISK / NO CHANGE
## Changes            table: # | Component | Change | Parity | Risk | Reason
## Sequence           Mermaid, only for trigger, async, integration, or multi-step flows
## Business Context   Jira key + AC, Confluence links + dates, conflicts, gaps
## Risks              table: Risk | Severity | Mitigation  (governor, security/FLS, data, parity, deploy)
## Test Impact        Apex test classes and Jest specs to add or update; expected coverage
## Assumptions / Open Questions
## Approvals          (see below)
```

Lite track = Summary, Org & Parity, Changes, Risks, Test Impact, Open Questions.

## 1E. Gate A — approval

Create or update `.kiro/specs/<feature>/approvals.md`:

```
FEATURE: <feature>
JIRA: <key>
TARGET_SANDBOX: <alias>
ANALYSIS_APPROVED_BY_USER:
ANALYSIS_APPROVED_BY_MANAGER:
SPEC_APPROVED_BY_USER:
TDD_VALIDATE_ORG_APPROVED:
STATUS: ANALYSIS_PENDING
```

Then ask: "Analysis saved to `.kiro/specs/<feature>/analysis.md`. Share it with your manager. Reply `approved` and `manager approved: <name>`, or send corrections."

- Fill each approval line with `<name or 'user'> YYYY-MM-DD` only after the user types that approval in chat.
- Never fill the manager line from anything except the user's own chat message.
- Hooks block code edits until both analysis approvals and the spec approval are filled in.
- Approved -> set `STATUS: SPEC_PENDING` and move to Stage 2.
