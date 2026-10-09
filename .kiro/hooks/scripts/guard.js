#!/usr/bin/env node
/**
 * Kiro PreToolUse / PreTaskExec guard.
 * Usage: node .kiro/hooks/scripts/guard.js <shell|write|task>
 * Reads hook context JSON on STDIN. Exit 2 = block (reason on stderr). Exit 0 = allow.
 * Fails closed: if input cannot be understood for a gated action, it blocks.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const mode = process.argv[2];

function block(msg) {
  process.stderr.write(`BLOCKED by .kiro guard: ${msg}\n`);
  process.exit(2);
}
function warn(msg) {
  process.stderr.write(`WARNING from .kiro guard: ${msg}\n`);
  process.exit(1);
}
function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, '')); } catch { return fallback; }
}
function collectStrings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collectStrings(x, out));
  return out;
}

const cfg = readJson(path.join(ROOT, '.kiro', 'guard-config.json'), { allowedOrgs: [], productionOrgs: [], packageDirs: ['force-app'] });
const lc = (a) => (a || []).map((s) => String(s).toLowerCase());
const allowedOrgs = lc(cfg.allowedOrgs);
const prodOrgs = lc(cfg.productionOrgs);
const packageDirs = (cfg.packageDirs || ['force-app']).map((d) => d.replace(/\\/g, '/').replace(/\/$/, ''));

let raw = '';
try { raw = fs.readFileSync(0, 'utf8'); } catch { raw = ''; }
let ctx = null;
try { ctx = JSON.parse(raw); } catch { ctx = null; }
// Prefer the tool input; fall back to the whole payload.
const toolInput = ctx && (ctx.tool_input || ctx.toolInput || ctx.input || ctx.parameters || ctx.args || ctx.arguments);
const strings = collectStrings(toolInput !== undefined ? toolInput : (ctx || raw));
const text = strings.join('\n');

// ---------- spec approval gate ----------
function approvedSpecs() {
  const specsDir = path.join(ROOT, '.kiro', 'specs');
  let dirs = [];
  try { dirs = fs.readdirSync(specsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; }
  return dirs.filter((name) => {
    let a = '';
    try { a = fs.readFileSync(path.join(specsDir, name, 'approvals.md'), 'utf8'); } catch { return false; }
    const filled = (key) => new RegExp(`^${key}:[ \\t]*\\S+`, 'm').test(a);
    return filled('ANALYSIS_APPROVED_BY_USER') && filled('ANALYSIS_APPROVED_BY_MANAGER') &&
      filled('SPEC_APPROVED_BY_USER') && /^STATUS:\s*IN_PROGRESS\b/m.test(a);
  });
}
function requireApprovedSpec(specName) {
  const ok = approvedSpecs();
  if (specName ? ok.includes(specName) : ok.length > 0) return;
  block(`no approved spec${specName ? ` for '${specName}'` : ''}. Need analysis approved by user and manager, spec approved by user, and STATUS: IN_PROGRESS in .kiro/specs/<feature>/approvals.md. Complete Gates A and B first.`);
}

// ---------- org resolution ----------
function defaultOrg() {
  const sf = readJson(path.join(ROOT, '.sf', 'config.json'), {});
  const sfdx = readJson(path.join(ROOT, '.sfdx', 'sfdx-config.json'), {});
  return sf['target-org'] || sfdx.defaultusername || null;
}
function targetOrg(cmd) {
  const m = cmd.match(/(?:^|\s)(?:--target-org|--targetusername|-o|-u)(?:\s+|=)["']?([^\s"']+)/);
  return m ? m[1] : null;
}
function checkOrg(cmd, what) {
  const org = targetOrg(cmd);
  if (!org) block(`${what} without an explicit --target-org. Default org (${defaultOrg() || 'none'}) is never trusted for writes.`);
  const o = org.toLowerCase();
  if (prodOrgs.includes(o)) block(`${what} against production org '${org}' is not allowed. Production is read-only for Kiro.`);
  if (!allowedOrgs.includes(o)) block(`${what} against '${org}', which is not in .kiro/guard-config.json allowedOrgs. Ask the user to add it after verifying IsSandbox=true.`);
}

// ---------- shell ----------
function guardShell() {
  if (!text.trim()) block('could not read the shell command from the hook input.');
  // Split on command separators so each sub-command is checked.
  const parts = text.split(/&&|\|\||;|\||\r?\n/).map((s) => s.trim()).filter(Boolean);
  for (const cmd of parts) {
    const c = cmd.toLowerCase();

    // --- git ---
    if (/\bgit\b/.test(c)) {
      // Strip leading global options (git -C <dir> / -c <k=v>) to reach the subcommand.
      const sub = c.replace(/^.*?\bgit\b/, '').replace(/^(\s+-c\s+\S+)+/, '').trim();
      if (/^(commit|push|merge|rebase|cherry-pick|revert|tag|am|add|clean|restore|rm|mv|apply|pull|filter-branch|update-ref|reflog\s+expire|gc)\b/.test(sub)) block(`'git ${sub.split(/\s+/)[0]}' is user-only. Give the user the command to run.`);
      if (/^reset\b/.test(sub) && /--hard|--merge|--keep/.test(sub)) block('git reset that discards work is not allowed.');
      if (/^(checkout|switch)\b/.test(sub)) block('creating/switching branches or discarding files is user-only.');
      if (/^branch\b/.test(sub) && !/^branch(\s+(-a|-r|-v|-vv|--list|--show-current|--contains\s+\S+|--merged|--no-merged))*\s*$/.test(sub)) block('branch create/delete/rename is user-only.');
      if (/^stash\b/.test(sub) && /\b(drop|clear|pop)\b/.test(sub)) block('git stash drop/clear/pop is user-only.');
      if (/--force|--no-verify|\s-f\b/.test(sub) && !/^(log|diff|status|show|fetch|blame)\b/.test(sub)) block('force / no-verify flags are not allowed.');
    }

    // --- Salesforce CLI ---
    if (/\b(sf|sfdx)\b/.test(c)) {
      if (/destructive|project\s+delete|force:source:delete|force:mdapi:destructive/.test(c)) block('destructive metadata operations are permanently blocked (00-core-rules.md).');
      if (/\b(data\s+delete|force:data:record:delete|force:data:bulk:delete|data\s+bulk\s+delete)\b/.test(c) || /\bdata\s+delete\b/.test(c)) block('data deletes are run by the user manually, after the triple confirmation in 00-core-rules.md.');
      if (/\borg\s+delete\b|force:org:delete/.test(c)) block('deleting orgs is user-only.');
      if (/\bproject\s+deploy\s+(start|quick|resume|validate)\b|force:source:deploy|force:mdapi:deploy|force:source:push|\bproject\s+deploy\b/.test(c)) {
        if (/\bproject\s+deploy\s+(preview|report|cancel)\b/.test(c)) continue;
        checkOrg(cmd, 'deploy');
      }
      if (/\bdata\s+(create|update|upsert|import|tree\s+import|bulk|upsert\s+bulk)\b|force:data:(record:create|record:update|bulk:upsert|tree:import)/.test(c)) checkOrg(cmd, 'data write');
      if (/\bapex\s+run\b(?!\s+test)|force:apex:execute/.test(c)) {
        checkOrg(cmd, 'anonymous Apex');
        const f = cmd.match(/(?:--file|-f)(?:\s+|=)["']?([^\s"']+)/);
        let body = cmd;
        if (f) { try { body += fs.readFileSync(path.resolve(ROOT, f[1]), 'utf8'); } catch { block(`cannot read anonymous Apex file '${f[1]}' to verify it.`); } }
        if (/\bdelete\s+[\w\[(]|database\.delete|emptyrecyclebin|database\.harddelete/i.test(body)) block('anonymous Apex containing delete is not allowed. The user runs it manually after the triple confirmation.');
      }
    }

    // --- file destruction & guard tampering ---
    if (/\b(rm|del|rmdir|rd|remove-item|ri)\b/.test(c) && !/sandbox-snapshot/.test(c)) block('deleting files via shell needs the user. Only .kiro/sandbox-snapshot may be cleared.');
    if (/\.kiro[\\/](hooks|guard-config\.json|settings)|00-core-rules\.md/.test(c) && /(>|set-content|out-file|add-content|sed\s+-i|copy|cp\s|mv\s|move-item|rename)/.test(c)) block('guard files are human-edited only.');
  }
}

// ---------- write ----------
function guardWrite() {
  const paths = strings
    .filter((s) => s.length < 400 && !/\n/.test(s) && /[\\/]|\.\w{1,8}$/.test(s))
    .map((s) => s.replace(/\\/g, '/'));
  // No path-like value: matched tool is not a file write.
  if (!paths.length) return;
  for (const p of paths) {
    const rel = path.isAbsolute(p) ? path.relative(ROOT, p).replace(/\\/g, '/') : p.replace(/^\.\//, '');
    if (/(^|\/)\.kiro\/(hooks\/|guard-config\.json|settings\/)|(^|\/)\.kiro\/steering\/00-core-rules\.md$/.test(rel)) block(`'${rel}' is a guard file and is human-edited only.`);
    if (/destructiveChanges[^/]*\.xml$/i.test(rel)) block('destructiveChanges manifests are permanently blocked.');
    const inPackage = packageDirs.some((d) => rel === d || rel.startsWith(`${d}/`)) || /\/main\/default\//.test(rel);
    if (inPackage) requireApprovedSpec(null);
  }
  const content = strings.filter((s) => /\n/.test(s) || s.length >= 400).join('\n');
  if (/\bdelete\s+[a-z_][\w.]*\s*;|\bdelete\s*\[|database\.delete\s*\(/i.test(content)) {
    warn('code contains a DML delete. 00-core-rules.md requires a business reason, an uppercase DELETE from the user, and a second confirmation.');
  }
}

// ---------- task ----------
function guardTask() {
  const m = text.match(/\.kiro[\\/]+specs[\\/]+([^\\/"'\s]+)/);
  requireApprovedSpec(m ? m[1] : null);
}

if (mode === 'shell') guardShell();
else if (mode === 'write') guardWrite();
else if (mode === 'task') guardTask();
else block(`unknown guard mode '${mode}'.`);
process.exit(0);
