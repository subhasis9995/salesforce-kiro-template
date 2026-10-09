---
inclusion: always
---

# Project Memory — Index (keep this file under 120 lines)

Holds only stable, high-value facts. Detailed logs live in `.kiro/memory/`. Open those only when they are relevant to the task.
Update rules: edit facts in place when they change, remove wrong or stale lines, and never duplicate. Each line holds one fact.

## Overview
- Project:
- Org type / clouds:
- Business domain:
- Jira project key:
- Confluence space key:
- Package dirs (sfdx-project.json):
- Source API version:

## Orgs
| Alias | IsSandbox | Purpose | Kiro may deploy? |
|---|---|---|---|
| | | | |

## Project Conventions (override template defaults)
<!-- Detected during init. Examples: trigger framework, fflib or custom layers, TestDataFactory class name, logger class, error helper, LWC shared utils, test naming, eslint/prettier/PMD rules -->
- Trigger framework:
- Layering pattern:
- TestDataFactory:
- Logger / error handling:
- LWC shared modules:
- Jest setup: yes/no — command:
- Lint/format: eslint / prettier / PMD ruleset:

## Critical Business Rules (top 10; full list in .kiro/memory/business-rules.md)

## Do-Not-Repeat (top 10; full list in .kiro/memory/failures.md)

## Detail files
- `.kiro/memory/inventory.md` — components by domain
- `.kiro/memory/decisions.md` — architecture decisions (dated)
- `.kiro/memory/failures.md` — failure patterns and fixes
- `.kiro/memory/business-rules.md` — rules with Jira/Confluence source
- `.kiro/memory/tech-debt.md` — debt backlog
- `.kiro/memory/integrations.md` — external systems, Named Credentials, custom metadata

Last updated: YYYY-MM-DD
