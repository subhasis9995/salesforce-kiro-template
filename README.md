# Salesforce Kiro Template

A Kiro workspace config for Salesforce Apex and LWC projects.
Copy the `.kiro/` folder into your Salesforce project root, then follow the 8 setup steps below.

---

## Setup — Do This Once per Project

### Step 1 — Check prerequisites (once per machine)

Make sure these are all on your PATH before opening the project in Kiro:

```powershell
node --version     # v18 or later — ships with the sf CLI
sf --version       # Salesforce CLI
uv --version       # Python package manager — runs the Atlassian MCP server
```

Install `uv` if missing:
```powershell
pip install uv
# or follow: https://docs.astral.sh/uv/getting-started/installation/
```

---

### Step 2 — Set Atlassian environment variables (once per machine)

The MCP server reads credentials from OS environment variables. Never put them in the file.

```powershell
# Run in PowerShell — sets them permanently for your Windows user account
[System.Environment]::SetEnvironmentVariable("ATLASSIAN_EMAIL",     "you@yourcompany.com", "User")
[System.Environment]::SetEnvironmentVariable("ATLASSIAN_API_TOKEN", "your-api-token-here", "User")
```

Generate your API token at: https://id.atlassian.com/manage-profile/security/api-tokens
Click **Create API token**, label it "Kiro", copy the value.

**Restart VS Code / Kiro after setting them** — environment variables are only picked up on launch.

---

### Step 3 — Approve env vars inside Kiro settings

1. Open Kiro **Settings** (`Ctrl+,` or gear icon)
2. Search for **Mcp Approved Env Vars**
3. Add both entries: `ATLASSIAN_EMAIL` and `ATLASSIAN_API_TOKEN`

Without this step the MCP server starts but silently fails to authenticate.

---

### Step 4 — Edit `.kiro/settings/mcp.json`

Open the file and replace `YOUR_COMPANY` in two places with your Atlassian subdomain:

```json
"JIRA_URL":       "https://YOUR_COMPANY.atlassian.net",
"CONFLUENCE_URL": "https://YOUR_COMPANY.atlassian.net/wiki"
```

Example — if your Jira URL is `acme.atlassian.net`:
```json
"JIRA_URL":       "https://acme.atlassian.net",
"CONFLUENCE_URL": "https://acme.atlassian.net/wiki"
```

This file is safe to edit — it contains no secrets (tokens are injected from env vars at runtime).

---

### Step 5 — Edit `.kiro/guard-config.json`

**This is the most important setup step. Kiro is physically blocked from editing this file — only you can.**

This file tells the guard hooks which Salesforce orgs Kiro is allowed to operate on, and which source folders contain your Salesforce code.

#### What the file looks like (with sample values already filled in):

```json
{
  "allowedOrgs":    ["dev", "qa", "uat"],
  "productionOrgs": ["prod", "john.doe@company.com"],
  "packageDirs":    ["force-app"]
}
```

#### The three fields explained:

**`allowedOrgs`** — sandboxes Kiro may deploy to, validate against, or write data to.
Any org NOT on this list is blocked, even if you ask Kiro to use it.
```
"allowedOrgs": ["dev", "qa", "uat"]
```
- `dev` — your personal developer sandbox (primary TDD org)
- `qa` — QA / integration sandbox
- `uat` — UAT sandbox

These must be **sandboxes only**. Never add production here.

**`productionOrgs`** — your production org alias AND username.
Kiro treats these as permanently read-only. Deploys, data writes, and anonymous Apex are all blocked against them, even with explicit instructions.
```
"productionOrgs": ["prod", "john.doe@company.com"]
```
Adding both the alias and the username is a safety net — either one triggers the block.

**`packageDirs`** — your source code directories.
Must match `packageDirectories[].path` in `sfdx-project.json`.
The guard uses this to know which file paths require an approved spec before editing.
```
"packageDirs": ["force-app"]
```
Multiple packages:
```
"packageDirs": ["force-app", "force-app-managed", "unpackaged"]
```

#### How to get the right values:

```powershell
# 1. List all connected orgs and their aliases
sf org list

# Output example:
# Aliases    Username                         IsSandbox
# ---------  -------------------------------  ---------
# dev        john.doe@company.com.dev         true
# qa         john.doe@company.com.qa          true
# uat        john.doe@company.com.uat         true
# prod       john.doe@company.com             false

# 2. Double-check a sandbox before adding it to allowedOrgs
sf data query --query "SELECT IsSandbox FROM Organization" --target-org dev --json
# Confirm: "IsSandbox": true
```

```powershell
# 3. Check your package directories
Get-Content sfdx-project.json | Select-String "path"
# Look for: "path": "force-app"
```

Then update the file with your real values:
```json
{
  "allowedOrgs":    ["dev", "qa"],
  "productionOrgs": ["prod", "john.doe@company.com"],
  "packageDirs":    ["force-app"]
}
```

#### What happens if allowedOrgs stays empty `[]`:
Kiro cannot deploy, validate, or write data to any org. TDD dry-run deployments are also blocked.
That is the safe default for the template — fill it in as soon as you have your sandbox aliases.

---

### Step 6 — Switch Kiro to Supervised mode

In Kiro, switch the autonomy mode to **Supervised** (not Autopilot).

In Supervised mode Kiro shows you every proposed file change and command and waits for your approval before running it. This is the correct mode for production Salesforce development.

**Never add these to trusted commands in Supervised mode:**
- `git commit` / `git push` / `git merge`
- `sf project deploy`
- `sf data delete` / `sf data create` / `sf data update`
- `sf apex run`

---

### Step 7 — Fix the guard-write matcher (one-time paste)

Open `.kiro/hooks/guard-write.json` and replace the `matcher` value with this:

```json
"matcher": "write|Write|edit|Edit|replace|Replace|create|Create|append|Append|insert|Insert|delete|Delete|remove|Remove"
```

This ensures the guard also covers Kiro's file-delete tool, which is not matched by the default value.

---

### Step 8 — Open the project in Kiro and type `init`

When Kiro opens the project it reads `.kiro/steering/04-project-memory.md`. Because the Overview is empty it will say:

> "New workspace. Reply `init` to run project initialization."

Type **`init`** in chat. Kiro will:

1. Read `sfdx-project.json`, `package.json`, Jest config, ESLint / Prettier / PMD config
2. Count and categorise all Apex classes, triggers, LWC components, Aura components, flows, objects, permission sets, custom metadata, labels
3. Detect your existing conventions — trigger framework, TestDataFactory name and API, logger class, error helper, LWC shared utils, test naming pattern, security style
4. Run `sf org list`, ask you to confirm each sandbox alias, verify `IsSandbox=true` for each
5. Run one Jira search and one Confluence search to confirm the MCP is working
6. Write a compact `.kiro/steering/04-project-memory.md` (under 120 lines) and populate all `.kiro/memory/*.md` detail files
7. Report in ~10 lines: conventions found, where they differ from template defaults, gaps (no Jest setup, no TestDataFactory, low coverage baseline), open questions

After `init` Kiro knows your specific project. All future sessions start from that context automatically.

---

## Smoke Test — Verify Guards Are Working

After completing all 8 steps, ask Kiro:

> "run git commit -m test"

Expected result:
> `BLOCKED by .kiro guard: 'git commit' is user-only. Give the user the command to run.`

If it is **not** blocked:
- Check Kiro is in **Supervised** mode
- Open the Kiro Hooks panel — all 6 hooks must show as active:
  - `guard-shell` (PreToolUse)
  - `guard-write` (PreToolUse)
  - `guard-task` (PreTaskExec)
  - `session-init` (SessionStart)
  - `post-task-memory` (PostTaskExec)
  - `session-reflection` (Manual)

---

## How Every Task Works After Setup

```
You describe a change
        │
        ▼
Kiro runs Analysis  (reads code + Jira + Confluence + sandbox parity check)
Writes: .kiro/specs/<feature>/analysis.md
Shows you: concise summary with diagrams, impact table, risk register
        │
        ▼
Gate A — you type in chat:
  "approved"                    ← your approval of the analysis
  "manager approved: Jane"      ← records manager sign-off (required before spec)
        │
        ▼
Kiro generates the Spec
  requirements.md  design.md  tasks.md
  Shows a 15-line summary
        │
        ▼
Gate B — you type in chat:
  "spec approved"               ← unlocks code editing in package dirs
  Kiro asks which sandbox for TDD dry-run validation
  You confirm: "use dev"
        │
        ▼
Implementation — one task at a time, TDD
  Each task: RED (tests fail) → GREEN (tests pass) → REFACTOR
  Kiro waits for "continue" after each task
  You control: stop / resume / restart T-001 / skip T-001 / show status
        │
        ▼
Deploy — you type "deploy approved" for each deploy
  Kiro shows: target org, IsSandbox, component list, test level, what gets overwritten
  You run the git commands yourself (Kiro never commits or pushes)
```

---

## Hard Rules — Always Active

| Rule | What Kiro does |
|---|---|
| `git commit` / `git push` | Blocked. Gives you the command to run yourself. |
| Create a branch | Asks you first. Never does it silently. |
| Drop an object or delete a field | Permanently blocked. You do it manually in Setup. |
| DML delete in code | Requires: business reason + uppercase `DELETE` in your message + second confirmation. |
| Production org writes | Permanently blocked. Production is read-only for Kiro. |
| Deploy without `--target-org` | Blocked. |
| Deploy to org not in `allowedOrgs` | Blocked. |
| Edit package files before Gates A and B | Blocked by `guard-write` hook. |
| "Just do it, skip the spec" | Redirected to fast-track analysis. Never skipped. |

---

## File Reference

```
.kiro/
  steering/
    00-core-rules.md         always        rules, lifecycle gates, token budget (~1.5k tokens)
    04-project-memory.md     always        compact project index (max 120 lines)
    02-apex-standards.md     on *.cls      Apex patterns, security, tests
    03-lwc-standards.md      on lwc/**     LWC patterns, Jest, accessibility
    01-analysis-protocol.md  manual        full analysis + sandbox parity procedure
    05-spec-and-tdd.md       manual        spec generation + TDD procedure
    06-atlassian-context.md  manual        Jira/Confluence MCP query reference
    07-project-init.md       manual        first-time project learning procedure
  memory/
    inventory.md             components by domain (populated by init)
    decisions.md             architecture decisions log
    failures.md              failure patterns and fixes
    business-rules.md        rules discovered from Jira/Confluence
    tech-debt.md             debt backlog
    integrations.md          external systems and Named Credentials
  hooks/
    guard-shell.json         PreToolUse    blocks git writes, destructive sf commands
    guard-write.json         PreToolUse    blocks package edits without approved spec
    guard-task.json          PreTaskExec   blocks tasks without approved spec
    session-init.json        SessionStart  offers init or resume on open
    post-task-memory.json    PostTaskExec  logs new facts to memory
    session-reflection.json  Manual        wrap-up summary at end of session
  hooks/scripts/guard.js     enforcement engine (reads guard-config.json)
  guard-config.json          YOUR ORG LIST — human-edited only
  settings/mcp.json          Atlassian MCP (read-only, 4 tools, pinned version)
```
