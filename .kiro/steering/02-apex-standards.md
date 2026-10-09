---
inclusion: fileMatch
fileMatchPattern: ["**/*.cls", "**/*.trigger", "**/*.apex"]
---

# Apex Standards

Project conventions in `04-project-memory.md` override this file. Examples: an existing trigger framework, fflib, a domain layer, or a different test naming pattern. Never introduce a second framework.

## Layers (default when the project has no established pattern)

| Layer | Name | Rules |
|---|---|---|
| Trigger | `{Object}Trigger` | One per object. Zero logic. Delegates to the handler. |
| Handler | `{Object}TriggerHandler` | Routes by context only. No SOQL, no DML, no logic. Has a recursion guard. |
| Service | `{Domain}Service` | Business logic. Bulk signatures (`List`/`Set`/`Map`). Calls Selector and Repository only. |
| Selector | `{Object}Selector` | All SOQL. Read-only. Returns `List` or `Map<Id, SObject>`. |
| Repository | `{Object}Repository` | All DML and `Database.*` result handling. No logic. |
| Controller | `{Feature}Controller` | `@AuraEnabled` entry for LWC. Thin: validates input, calls the service, maps errors to `AuraHandledException`. |

## Governor limits — zero tolerance

- No SOQL or DML inside loops. Assume 200+ records. Use Maps for lookups, not nested loops.
- Large volumes go to Batch. Chained or async work goes to Queueable (prefer it over `@future`).
- `@AuraEnabled(cacheable=true)` only for pure reads.

## Security

- SOQL: `WITH USER_MODE` by default. Use `WITH SYSTEM_MODE` only with a documented reason.
- DML: `Database.insert(records, AccessLevel.USER_MODE)` or `insert as user`. Use `Security.stripInaccessible` when returning data to the UI.
- `with sharing` by default. `without sharing` or `inherited sharing` needs a comment explaining why.
- No dynamic SOQL built from user input without bind variables or `String.escapeSingleQuotes`.
- `@AuraEnabled` and `@RestResource` methods validate every input.

## Code quality

- PascalCase classes, camelCase verb-first methods, UPPER_SNAKE constants, descriptive variable names (`accountIdToContacts`).
- No magic numbers or strings. No hardcoded Ids or URLs. Use Custom Metadata, Custom Labels, and Named Credentials.
- Feature flags via Custom Metadata. Never write `if (isProd)` checks.
- Methods of about 20 logic lines or fewer, single responsibility. Consider splitting classes over 300 lines. No copy-paste code.
- No `System.debug` in production classes. No commented-out code. TODOs need a Jira key: `// TODO [PROJ-1]: why deferred`.
- Errors: never swallow them. Use domain exceptions (`AccountServiceException`). User-facing text comes from Custom Labels. Fail fast on null input.
- Batch classes that need error events implement `Database.RaisesPlatformEvents`. Other async code logs through the project logger if one exists (check memory).

## Comments

Every class gets this header. Every public or global method gets an ApexDoc comment.

```apex
/**
 * @description One-sentence purpose.
 * @author      <name>
 * @date        YYYY-MM-DD
 * @jira        PROJ-123
 * @layer       Service | Selector | Repository | TriggerHandler | Controller
 */
```

Methods use `@description`, `@param`, `@return`, and `@throws`. Inline comments explain why, not what.

## Tests

- `{ClassName}_Test` unless the project uses another pattern. `@IsTest`, never `SeeAllData=true`.
- All data comes from the project's TestDataFactory (find its name in memory). Add factory methods there; never create records inline.
- Use `@TestSetup` for shared data. Wrap the code under test in `Test.startTest()` / `Test.stopTest()`.
- Minimum scenarios per class: happy path, bulk (200), negative/exception, edge case, and permission (`System.runAs` a restricted user) where security applies.
- Use the `Assert` class (`Assert.areEqual(expected, actual, msg)`). Every test asserts behaviour, not just coverage.
- Callouts use `HttpCalloutMock`. Async code is asserted after `Test.stopTest()`.
- Coverage target: at least 85% per touched class (the org minimum is 75%). Coverage padding is forbidden.
