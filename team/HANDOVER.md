# Hand-over: dinis-cruz.agenticcells.site

From conductor.dinis-cruz@AgentiCCells.dinis (session https://claude.ai/code/session_01Kw9UwFJqMBfzfCwEFV1Nnp), 2026-11-19.

## Dinis's words
- 2026-11-19 ~14:30 UTC, to cells.b@AgentiCCells.dinis: "follow up this exchange and what you can see on diniscruz.ai and my last CV as presentation, can you create the dinis-cruz.agenticcell.site?" (the zone is agenticcells.site)
- ~14:32 UTC: "where one of the examples I want to show there is the power of the LinkedIn recommendations"
- 2026-11-18 ~22:48 UTC, on keys: "when we onboard a new session here, that session should create the public key and overwrite the public key. So it should take ownership... we can only have one official that I need to authorize every time we do the shift"

## State
- Live: https://dinis-cruz.agenticcells.site, from dev. Two rounds of five; the reviewer passed round 2 (team/rounds/2.md).
- Pages: home, /cv/ (his 2019 SlideShare CV deck v1.2 linked, his 2025 essay on presentations instead of CVs, a 10-slide outline illustrated from his public record), /recommendations/ (guide, labelled examples, worked example waiting for Dinis), /sources/, /agents/ (llms.txt, index.md), /behind-the-scenes/ (generated from team/ and git log), 404, share cards on every page.
- Signed commits on: scripts/check-signatures.mjs, run from the base copy by scripts/run-check-signatures.sh in release.sh and CI. One key, the conductor's, in team/keys.json.

## Waiting on Dinis (sent to cells.b@ after round 1)
1. Is the 2019 v1.2 deck still the one to feature, and can he share a readable copy (PDF) so /cv/ can describe it slide by slide? SlideShare blocks automated reads.
2. An anonymised summary of his LinkedIn recommendations (count, relationship types, themes) for the worked example, and which recommenders, if any, agree to be quoted or named. LinkedIn blocks automated reads. Nothing is quoted or named until then.
3. Glasswall bio line: "Chief Scientist" (riskmandate.ai) or "CTO and CISO" (his essay).
4. Is there a CV or presentations repository on github.com/DinisCruz to look at? This session could not read GitHub outside its own repository.
The full list is team/drafts/questions-for-dinis.md.

## For the next session
- Make your own key (sgit pki keygen), mark the conductor entry in team/keys.json "superseded", add yours as "active", and have Dinis authorise the shift. The first commit that adds your key must be signed by a key already listed, or reviewed by Dinis.
- Page text lives in src/*/index.html, with drafts in team/drafts/. src/index.md and src/llms.txt are kept by hand: update them with any page change.
- Share cards: edit scripts/share-cards.json, run node scripts/make-share-cards.mjs (local, needs Playwright), commit the JPEGs.
- Release: scripts/release.sh only. Never weaken a gate.
- This session was refused add_repo for the Factory and Marc-Noah repositories; it read their public copies over HTTPS instead.
