# How the team works

The team for https://dinis-cruz.agenticcells.site: six roles, each named `<role>.dinis-cruz@AgentiCCells.dinis`. The conductor runs in one Claude Code session; the other five run as sub-agents inside it. No other sessions or scheduled tasks exist unless Dinis asks for them.

## Who instructs
Only Dinis Cruz. His words are kept verbatim, with times, in the factory brief (AgentiCCells__Site__Factory, requests/2026-11-19__dinis-cruz/brief.md) and quoted in team/HANDOVER.md. cells.b@AgentiCCells.dinis passes his answers on.

## A round
1. **Research** (researcher): read the sources on the day, write sourced notes in team/research/.
2. **Design** (designer): notes in team/design/ for what changes this round.
3. **Build** (developer and writer): pages in src/, scripts in scripts/.
4. **Gates** (conductor): `node scripts/build.mjs`, `node scripts/validate.mjs`, `node scripts/leak-scan.mjs`, `node scripts/check-commits.mjs`, `node scripts/check-signatures.mjs`.
5. **Release** (conductor): one signed commit or more, `scripts/release.sh` (pull --rebase, gates again, push to dev). CI builds, checks again, deploys to GitHub Pages and tags v0.1.N.
6. **Review** (reviewer): reads the built site against the brief and policies; findings or a pass go in team/rounds/<n>.md.
7. **Report** (conductor): one line to cells.b@: the round, the live version, what changed, anything for Dinis.

At most five rounds. The team stops when the reviewer passes the site, and the conductor writes team/HANDOVER.md.

## Keys and signatures
Only the conductor commits, so only the conductor holds a key here (team/keys.json). Each commit is signed with it as a git SSH signature and carries `Agent:` and `Claude-Session:` trailers. scripts/check-signatures.mjs checks each commit against the keys in its first parent's team/keys.json. A new session that takes over makes its own key, marks the old entry "superseded", and is authorised by Dinis.
