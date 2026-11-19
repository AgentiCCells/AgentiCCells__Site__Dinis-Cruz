// Build: copy src/ to _site/, stamp the version, write version.json.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
//
// developer.dinis-cruz@AgentiCCells.dinis, 2026-11-19, added:
// - shared fragments: <!--HEADER--> and <!--FOOTER--> are replaced with src/_partials/*.html
//   (src/_partials/ is not copied to _site/);
// - link previews: <!--META--> is replaced with a canonical link, Open Graph and Twitter
//   card tags; a page picks its card with <meta name="share-card" content="<id>">;
// - /behind-the-scenes/: <!--TEAM--> <!--POLICIES--> <!--FLOW--> <!--KEYS--> <!--TIMELINE-->
//   <!--ROUNDS--> are generated from team/ and git log.
// The build fails (exit 1) on any missing marker, missing or oversized card, or when git
// cannot give a full history. Node built-ins only.
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, posix } from 'node:path';
import { execFileSync } from 'node:child_process';

const SITE = 'https://dinis-cruz.agenticcells.site';
const REPO = 'https://github.com/AgentiCCells/AgentiCCells__Site__Dinis-Cruz';
const CARD_MAX = 300 * 1024;
const version = process.env.SITE_VERSION || 'dev';
const problems = [];
const fail = m => problems.push(m);

rmSync('_site', { recursive: true, force: true });
cpSync('src', '_site', { recursive: true, filter: s => !s.split(sep).includes('_partials') });
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

// ---------- helpers ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const unesc = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/gi, "'").replace(/&amp;/g, '&');
const read = p => readFileSync(p, 'utf8');
const partial = n => { const p = join('src', '_partials', n); if (!existsSync(p)) { fail(`missing ${p}`); return ''; } return read(p).trim(); };
const pagePath = f => {
  const rel = relative('_site', f).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
};

// ---------- a small Markdown to HTML converter ----------
// Headings, paragraphs, lists, links, inline code, bold, fenced code, quotes, rules and
// simple tables. Everything is HTML-escaped. `file` is the repository path of the source:
// relative links resolve against it and point at the file on GitHub.
function safeHref(u, file) {
  if (/^(https?:|mailto:)/i.test(u) || u.startsWith('#')) return u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('//')) return null; // other schemes are dropped
  if (u.startsWith('/')) return u; // a path on this site
  const p = posix.normalize(posix.join(posix.dirname(file || '.'), u));
  if (p.startsWith('..')) return null;
  return `${REPO}/blob/dev/${p}`;
}
function inline(text, file) {
  const held = [];
  const hold = h => `\u0000${held.push(h) - 1}\u0000`;
  let s = text.replace(/`([^`]+)`/g, (_, c) => hold(`<code>${esc(c)}</code>`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    const h = safeHref(u, file);
    const label = esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return hold(h ? `<a href="${esc(h)}">${label}</a>` : label);
  });
  s = s.replace(/https?:\/\/[^\s<>()"'`\u0000]+[^\s<>()"'`.,;:!?\u0000]/g, u => hold(`<a href="${esc(u)}">${esc(u)}</a>`));
  s = esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  while (/\u0000\d+\u0000/.test(s)) s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => held[i]);
  return s;
}
// base: the HTML level for a "#" heading (so "## x" becomes base + 1), capped at h6.
function markdown(src, { file = '', base = 1 } = {}) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let para = [], list = null;
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(' '), file)}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i.join(' '), file)}</li>`).join('')}</${list.tag}>`); list = null; };
  const flush = () => { flushPara(); flushList(); };
  const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if (/^\s*```/.test(line)) {
      flush();
      const code = [];
      while (++i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    } else if (!line.trim()) {
      flush();
    } else if ((m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/))) {
      flush();
      const n = Math.min(6, m[1].length + base - 1);
      out.push(`<h${n}>${inline(m[2], file)}</h${n}>`);
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush(); out.push('<hr>');
    } else if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      flush();
      const head = cells(line); i++;
      const rows = [];
      while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])) rows.push(cells(lines[++i]));
      out.push(`<table><thead><tr>${head.map(c => `<th>${inline(c, file)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inline(c, file)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else if ((m = line.match(/^\s*>\s?(.*)$/))) {
      flush();
      const q = [m[1]];
      while (i + 1 < lines.length && /^\s*>/.test(lines[i + 1])) q.push(lines[++i].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${markdown(q.join('\n'), { file, base })}</blockquote>`);
    } else if ((m = line.match(/^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/))) {
      flushPara();
      const tag = m[1] ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push([m[3]]);
    } else if (list && /^\s+\S/.test(line)) {
      list.items[list.items.length - 1].push(line.trim());
    } else {
      flushList(); para.push(line.trim());
    }
  }
  flush();
  return out.join('\n');
}

// A team document as an <article>: its leading "# " line becomes the heading (h3), the rest
// follows with "##" as h4, and a link to the file on GitHub closes it.
function doc(file, heading) {
  let text = read(file);
  let title = '';
  const m = text.match(/^\s*#\s+(.+)\n/);
  if (m) { title = m[1].trim(); text = text.slice(m[0].length); }
  const h = heading || title || file;
  const sub = heading && title ? `\n<p class="subtitle">${inline(title, file)}</p>` : '';
  return `<article class="doc">\n<h3>${inline(h, file)}</h3>${sub}\n${markdown(text, { file, base: 3 })}\n<p class="source">Source: <a href="${REPO}/blob/dev/${esc(file)}">${esc(file)}</a></p>\n</article>`;
}

// ---------- behind the scenes ----------
const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
function teamDirs(name) {
  if (!existsSync('team')) return [];
  return readdirSync('team').filter(d => statSync(join('team', d)).isDirectory() && existsSync(join('team', d, name))).sort();
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function timeline() {
  let shallow;
  try { shallow = git(['rev-parse', '--is-shallow-repository']).trim(); }
  catch (e) { fail(`behind-the-scenes: git is not available or this is not a git checkout (${e.message.split('\n')[0]})`); return ''; }
  if (shallow !== 'false') { fail('behind-the-scenes: the clone is shallow, so the timeline would be incomplete (fetch full history first)'); return ''; }
  const raw = git(['log', '--no-color', '--format=%H%x1f%ct%x1f%s%x1f%(trailers:key=Agent,valueonly,separator=%x2C )%x1e', 'HEAD']);
  const commits = raw.split('\x1e').map(r => r.trim()).filter(Boolean).map(r => { const [hash, ct, subject, agent] = r.split('\x1f'); return { hash, ct: +ct, subject, agent: (agent || '').trim() }; });
  if (!commits.length) { fail('behind-the-scenes: git log returned no commits'); return ''; }
  // Signed: the raw commit carries a gpgsig header. CI verifies it with scripts/check-signatures.mjs.
  const batch = execFileSync('git', ['cat-file', '--batch'], { input: commits.map(c => c.hash).join('\n') + '\n', maxBuffer: 1 << 28 });
  let pos = 0;
  const signed = new Map();
  while (pos < batch.length) {
    const nl = batch.indexOf(10, pos);
    const [hash, , size] = batch.subarray(pos, nl).toString().split(' ');
    const body = batch.subarray(nl + 1, nl + 1 + Number(size)).toString();
    signed.set(hash, /^gpgsig(?:-sha256)? /m.test(body.split('\n\n')[0]));
    pos = nl + 1 + Number(size) + 1;
  }
  const items = commits.map(c => {
    const when = new Date(c.ct * 1000).toISOString();
    const s = signed.get(c.hash);
    return `<li><time datetime="${when}">${when.slice(0, 10)} ${when.slice(11, 16)} UTC</time><span class="subject"><a href="${REPO}/commit/${c.hash}"><code>${c.hash.slice(0, 7)}</code></a> ${esc(c.subject)}</span><span class="meta">Agent: ${c.agent ? esc(c.agent) : 'none given'} · <span class="badge ${s ? 'signed' : 'unsigned'}">${s ? 'signed' : 'not signed'}</span></span></li>`;
  });
  return `<p class="source">${commits.length} commit${commits.length === 1 ? "" : "s"} on this branch, newest first, read from <code>git log</code> at build time.</p>\n<ol class="timeline" reversed>\n${items.join('\n')}\n</ol>`;
}
function keys() {
  const f = 'team/keys.json';
  if (!existsSync(f)) return '<p>No keys are recorded yet.</p>';
  let k;
  try { k = JSON.parse(read(f)); } catch (e) { fail(`${f} is not JSON (${e.message})`); return ''; }
  const rows = (k.keys || []).map(e => {
    const session = typeof e.session === 'string' && /^https:\/\//.test(e.session) ? `<a href="${esc(e.session)}">${esc(e.session)}</a>` : esc(e.session || 'not given');
    return `<li><dl><dt>Agent</dt><dd>${esc(e.agent || 'not given')}</dd><dt>Status</dt><dd>${esc(e.status || 'not given')}</dd><dt>Fingerprint</dt><dd><code>${esc(e.fingerprint || 'not given')}</code></dd><dt>Session</dt><dd>${session}</dd></dl></li>`;
  });
  return `${rows.length ? `<ul class="keys">\n${rows.join('\n')}\n</ul>` : '<p>No keys are recorded yet.</p>'}\n<p class="source">Source: <a href="${REPO}/blob/dev/team/keys.json">team/keys.json</a> (public parts only).</p>`;
}
const behind = {
  TEAM: () => teamDirs('ROLE.md').map(r => doc(`team/${r}/ROLE.md`, cap(r))).join('\n') || '<p>No roles are written yet.</p>',
  POLICIES: () => teamDirs('POLICY.md').map(r => doc(`team/${r}/POLICY.md`, cap(r))).join('\n') || '<p>No policies are written yet.</p>',
  FLOW: () => existsSync('team/WORKFLOW.md') ? doc('team/WORKFLOW.md') : '<p>The workflow is not written yet.</p>',
  KEYS: keys,
  TIMELINE: timeline,
  ROUNDS: () => {
    const dir = 'team/rounds';
    const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })) : [];
    return files.length ? files.map(f => doc(`${dir}/${f}`)).join('\n') : '<p>No round reports yet.</p>';
  },
};
const BEHIND_PAGE = '/behind-the-scenes/';

// ---------- pages ----------
const cards = JSON.parse(read('scripts/share-cards.json')).cards;
const header = partial('header.html');
const footer = partial('footer.html');
const cardChecked = new Map();
function checkCard(id, page) {
  if (cardChecked.has(id)) return cardChecked.get(id);
  let ok = true;
  const f = join('src', 'assets', 'share', `${id}.jpg`);
  if (!/^[a-z0-9-]+$/.test(id) || !cards[id]) { fail(`${page}: share card "${id}" is not defined in scripts/share-cards.json`); ok = false; }
  else if (!existsSync(f)) { fail(`${page}: share card ${f} is missing (run node scripts/make-share-cards.mjs)`); ok = false; }
  else if (statSync(f).size > CARD_MAX) { fail(`${page}: share card ${f} is ${Math.round(statSync(f).size / 1024)} KB, over 300 KB`); ok = false; }
  cardChecked.set(id, ok);
  return ok;
}
function meta(s, path, f) {
  const title = unesc((s.match(/<title>([^<]+)<\/title>/) || [])[1] || '').trim();
  const desc = unesc((s.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '').trim();
  if (!title) fail(`${f}: no <title> for og:title`);
  if (!desc) fail(`${f}: no meta description for og:description`);
  const id = (s.match(/<meta name="share-card" content="([^"]+)"/) || [])[1] || 'default';
  checkCard(id, f);
  const url = SITE + path, img = `${SITE}/assets/share/${id}.jpg`, alt = cards[id] ? cards[id].alt : title;
  const t = [
    ['link', 'canonical', url],
    ['og:type', 'website'], ['og:site_name', 'Dinis Cruz'], ['og:locale', 'en_GB'], ['og:url', url],
    ['og:title', title], ['og:description', desc],
    ['og:image', img], ['og:image:width', '1200'], ['og:image:height', '630'], ['og:image:type', 'image/jpeg'], ['og:image:alt', alt],
  ];
  const lines = t.map(([p, a, b]) => p === 'link' ? `<link rel="canonical" href="${esc(b)}">` : `<meta property="${p}" content="${esc(a)}">`);
  lines.push('<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`, `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`, `<meta name="twitter:image:alt" content="${esc(alt)}">`);
  return lines.join('\n');
}
function navFor(path) {
  return header.replace(/<nav[\s\S]*?<\/nav>/, nav => nav.replace(/<a href="([^"]+)"/g, (m, h) => (h === path || (h !== '/' && path.startsWith(h))) ? `${m} aria-current="page"` : m));
}

for (const f of walk('_site')) {
  if (!/\.(html|js|css|json|md|txt)$/.test(f)) continue;
  let s = read(f);
  const before = s;
  if (f.endsWith('.html')) {
    const path = pagePath(f);
    for (const mk of ['META', 'HEADER', 'FOOTER']) if (!s.includes(`<!--${mk}-->`)) fail(`${f}: no <!--${mk}--> marker`);
    s = s.replace('<!--META-->', () => meta(s, path, f)).replace('<!--HEADER-->', () => navFor(path)).replace('<!--FOOTER-->', () => footer);
    const wanted = Object.keys(behind);
    if (path === BEHIND_PAGE) for (const mk of wanted) if (!s.includes(`<!--${mk}-->`)) fail(`${f}: no <!--${mk}--> marker`);
    for (const mk of wanted) if (s.includes(`<!--${mk}-->`)) { const html = behind[mk](); s = s.replace(`<!--${mk}-->`, () => html); }
  }
  if (s.includes('__VERSION__')) s = s.replaceAll('__VERSION__', version);
  if (s !== before) writeFileSync(f, s);
}
if (problems.length) { console.error(problems.join('\n')); console.error(`BUILD FAILED: ${problems.length} problem(s)`); process.exit(1); }
writeFileSync('_site/version.json', JSON.stringify({ version, commit: process.env.GITHUB_SHA || 'local', built: new Date().toISOString() }, null, 2) + '\n');
writeFileSync('_site/.nojekyll', '');
console.log(`built _site/ (${version})`);
