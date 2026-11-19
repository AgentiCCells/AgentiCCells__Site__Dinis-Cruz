// Every commit is signed by its agent's own published key and names its session.
// Adapted on 2026-11-19 by conductor.dinis-cruz@AgentiCCells.dinis from build/check-signatures.mjs in
// AgentiCCells/AgentiCCells__Site__Factory (Apache-2.0, same team), on Dinis's instruction of 19 Nov ~01:10 UTC.
// Changes from the factory copy: the path is scripts/; shallow clones are refused; and no commit in the range is
// exempt, not even the one that added this file: only commits that are ancestors of that commit (history from
// before the check existed) are out of scope. The commit that added this file is checked against its parent's
// team/keys.json like every other.
//
// Usage: node scripts/check-signatures.mjs <before> <after>   (scripts/run-check-signatures.sh runs the base copy)
// For each commit in before..after (merges and side branches included) that is not older than this check:
//   1. it carries a git SSH signature that verifies against a key in its (first) PARENT's team/keys.json (status not
//      "superseded"), never the keys in the commit itself;
//   2. the key's agent is the commit's one Agent: trailer;
//   3. its one Claude-Session: trailer is the session recorded with that key.
// One failure refuses the whole range (exit 1). Needs git 2.34+ and ssh-keygen. History is never rewritten.
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const SELF = 'scripts/check-signatures.mjs';
const AGENT = /^[a-z0-9]+(?:[.-][a-z0-9]+)*@[a-z0-9.-]+$/i;
const lines = (s) => (s ? s.split('\n').map((x) => x.trim()).filter(Boolean) : []);

export function checkSignatures({ cwd = process.cwd(), before, after = 'HEAD' } = {}) {
  const git = (...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
  const tryGit = (...a) => { try { return git(...a); } catch { return null; } };
  if (git('rev-parse', '--is-shallow-repository') !== 'false') return { errors: ['shallow clone: fetch the full history first (git fetch --unshallow)'], checked: 0, skipped: 0 };
  const first = lines(git('log', '--format=%H', '--diff-filter=A', '--reverse', after, '--', SELF))[0];
  if (!first) return { errors: [`cannot find the commit that added ${SELF}`], checked: 0, skipped: 0 };
  const from = before && !/^0+$/.test(before) && tryGit('rev-parse', '--verify', '--quiet', `${before}^{commit}`);
  const range = lines(git('rev-list', ...(from ? [`${from}..${after}`] : [after])));
  // Out of scope: only the ancestors of the commit that added this file. That commit itself is checked.
  const older = new Set(lines(git('rev-list', `${first}^@`)));
  const inScope = new Set(range.filter((c) => !older.has(c)));

  const dir = mkdtempSync(join(tmpdir(), 'sigcheck-'));
  const cache = new Map();
  // The allowed signers published in a commit's tree: { file, sessionOf }.
  const signersAt = (rev) => {
    const blob = tryGit('rev-parse', '--verify', '--quiet', `${rev}:team/keys.json`);
    if (!blob) return null;
    if (cache.has(blob)) return cache.get(blob);
    const doc = JSON.parse(git('cat-file', 'blob', blob));
    const keys = Array.isArray(doc) ? doc : doc.keys || [];
    const signers = [], sessionOf = new Map();
    for (const k of keys) {
      const agent = k.agent, pemText = k.bundle?.sign ?? k.public_key?.sign;
      if (!agent || !AGENT.test(agent) || !pemText || k.status === 'superseded') continue;
      const pem = join(dir, `${cache.size}-${signers.length}.pem`); writeFileSync(pem, pemText);
      const ssh = execFileSync('ssh-keygen', ['-i', '-m', 'PKCS8', '-f', pem], { encoding: 'utf8' }).trim().split(' ').slice(0, 2).join(' ');
      signers.push(`${agent} namespaces="git" ${ssh}`);
      if (!sessionOf.has(agent)) sessionOf.set(agent, new Set());
      if (k.session) sessionOf.get(agent).add(k.session);
    }
    const file = join(dir, `allowed_signers_${cache.size}`); writeFileSync(file, signers.join('\n') + '\n');
    const r = { file, sessionOf }; cache.set(blob, r); return r;
  };

  try {
    const errors = []; let checked = 0;
    for (const c of range) {
      if (!inScope.has(c)) continue;
      checked++;
      const subject = git('log', '-1', '--format=%s', c);
      const parent = signersAt(`${c}^1`);
      if (!parent) { errors.push(`${c.slice(0, 7)} ${subject}: its parent has no team/keys.json`); continue; }
      const agents = lines(git('log', '-1', '--format=%(trailers:key=Agent,valueonly)', c));
      const sessions = lines(git('log', '-1', '--format=%(trailers:key=Claude-Session,valueonly)', c));
      const v = spawnSync('git', ['-c', 'gpg.format=ssh', '-c', 'gpg.ssh.program=ssh-keygen', '-c', `gpg.ssh.allowedSignersFile=${parent.file}`, 'verify-commit', c], { cwd, encoding: 'utf8' });
      if (v.status !== 0) { errors.push(`${c.slice(0, 7)} ${subject}: no valid signature by a key in its parent's team/keys.json`); continue; }
      const principal = (`${v.stdout}\n${v.stderr}`.match(/Good "git" signature for (\S+)/) || [])[1];
      if (!principal || agents.length !== 1 || agents[0] !== principal) { errors.push(`${c.slice(0, 7)} ${subject}: signed by ${principal || 'unknown'}, Agent: ${agents.join(', ') || 'none'}`); continue; }
      if (sessions.length !== 1 || !(parent.sessionOf.get(principal) || new Set()).has(sessions[0])) errors.push(`${c.slice(0, 7)} ${subject}: Claude-Session: missing or not the session published with ${principal}'s key`);
    }
    return { errors, checked, skipped: range.length - checked };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [before, after] = process.argv.slice(2);
  const r = checkSignatures({ before, after: after || 'HEAD' });
  if (r.errors.length) { console.error(r.errors.join('\n')); console.error(`FAILED (${r.errors.length} of ${r.checked} commits checked)`); process.exit(1); }
  console.log(`OK (${r.checked} signed commits checked, ${r.skipped} not after the check skipped)`);
}
