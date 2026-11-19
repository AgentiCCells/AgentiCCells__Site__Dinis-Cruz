# Design notes, round 1

Author: designer.dinis-cruz@AgentiCCells.dinis, 2026-11-19. For the developer and writer. Everything here is a **proposal** until built and reviewed. No third-party scripts, styles, fonts or iframes. One first-party script: `src/assets/deck.js`, loaded with `defer` on /cv/ only.

## 1. Palette and type (extends the tokens already in site.css)

Keep the current `--bg --surface --fg --muted --rule --accent --focus` values (warm paper, ink, deep teal; not LinkedIn blue, not any brand). Add:

```css
:root {
  --example-bg: #f6ecd6; --example-fg: #6b4a10; --example-rule: #c9a45c;
  --pending-bg: #eef0f2; --pending-fg: #3e4650;
  --step--1: .875rem; --step-0: 1.0625rem; --step-1: 1.25rem;
  --step-2: 1.5625rem; --step-3: 2rem; --step-4: 2.75rem;
  --lh-body: 1.6; --lh-head: 1.2; --radius: 6px; --space: 1.5rem;
}
/* dark: --example-bg #2a2416; --example-fg #e3c27a; --example-rule #7a6230;
   --pending-bg #1e2226; --pending-fg #b8c0c9 */
```

Body `--serif` at `--step-0`; headings `--sans`, weight 600; `h1` `--step-4` (`--step-3` under 30rem). Every text/background pair must reach 4.5:1 (labels and markers included); check both themes before release.

## 2. Labels and source markers

Labels: `<span class="label label--example">Example</span>`, also `label--proposal`, `label--illustration`, `label--pending`. Style: `--sans`, `--step--1`, uppercase, letter-spacing .06em, 1px border, `--radius`, padding .1em .5em. Example uses the `--example-*` tokens, Proposal and Illustration use `--accent` on `--accent-soft`, Pending uses `--pending-*`. The word is always printed; colour is never the only signal.

Source marker, after the claim it supports:

```html
<a class="src" href="https://diniscruz.ai/about/" title="Source: diniscruz.ai/about, read 2026-11-19">[source]</a>
```

`.src`: `--sans`, `--step--1`, `--muted`, no underline until hover/focus, `vertical-align: baseline` (not superscript, which is hard to tap). Minimum 24px tap height via padding. Several in a row: `[1] [2]` with each `title` naming its page. In print: `.src::after { content: " (" attr(href) ")"; }`.

## 3. Home page

First screen, centred column at `--measure`, generous top space (min 20vh), no image:

```html
<section class="hero">
  <h1>Dinis Cruz</h1>
  <p class="hero__line">[one line from diniscruz.ai/about] <a class="src" ...>[source]</a></p>
</section>
<nav class="lead-cards" aria-label="Start here">
  <a class="lead-card" href="/cv/"><h2>A CV told as a story</h2><p>...</p><span aria-hidden="true">→</span></a>
  <a class="lead-card" href="/recommendations/"><h2>The power of recommendations</h2><p>...</p><span aria-hidden="true">→</span></a>
</nav>
<section class="more"><h2>More on diniscruz.ai</h2><ul class="link-list">...</ul></section>
```

`.lead-cards`: grid, two columns above 40rem, one below, gap `--space`. `.lead-card`: whole card is the link, `--surface`, 1px `--rule`, `--radius`, padding 2rem, min-height 12rem; hover/focus moves the border to `--accent` (no shadow jumps). `.link-list`: 3 to 5 plain links, each with a one-line description in `--muted`.

## 4. Slide viewer on /cv/

The writer's `## Slide N: heading` sections become this markup (build script or by hand):

```html
<section class="deck" aria-roledescription="slide deck" aria-label="Make your own CV deck: 10 slides">
  <div class="deck__controls" hidden>
    <button type="button" class="deck__prev" aria-label="Previous slide">←</button>
    <p class="deck__count" aria-live="polite" aria-atomic="true">Slide 1 of 10</p>
    <button type="button" class="deck__next" aria-label="Next slide">→</button>
  </div>
  <ol class="deck__slides">
    <li class="slide" id="slide-1" aria-roledescription="slide" aria-labelledby="slide-1-h">
      <div class="slide__frame">
        <h3 class="slide__heading" id="slide-1-h" tabindex="-1">1. Who you are, in one line</h3>
        <span class="label label--illustration">Illustration</span>
        <p class="slide__illus">[what the slide would show]</p>
      </div>
      <div class="slide__layers">
        <section class="slide__advice"><h4>What goes here</h4>...</section>
        <section class="slide__his"><h4>Dinis's version</h4>... <a class="src">[source]</a></section>
      </div>
    </li>
  </ol>
</section>
<p><a href="https://www.slideshare.net/DinisCruz/dinis-cruz-cv-ciso-and-transformation-agent-v12">His 2019 CV deck on SlideShare</a> (opens SlideShare; not embedded).</p>
```

**Without JS:** controls stay `hidden`; slides list one after another. `.slide__frame` is `aspect-ratio: 16 / 9`, `--surface`, 1px `--rule`, padding 6%, heading at `--step-3`, so each reads as a slide. Layers sit below the frame in two columns above 48rem, stacked below. `.slide__his` has a left rule in `--accent`.

**With JS** (`deck.js` adds `.deck--js` to `.deck`, removes `hidden` on the controls):
- Show one `.slide` at a time (`.slide:not(.is-current) { display: none }`); the rest are hidden from assistive tech too.
- Start slide from `location.hash` (`#slide-N`, clamp 1 to 10), else 1.
- Prev/next buttons, and Left/Right arrows when focus is inside `.deck` and not in a form field. Home/End go to first/last.
- On change: update `.is-current`, counter text "Slide N of 10", `history.replaceState(null, "", "#slide-N")`; set `disabled` on prev at 1 and next at 10.
- Focus: on button press, focus stays on the button (unless it became disabled, then move to the other button). On a hash change from a link, move focus to the slide heading (`tabindex="-1"`).
- Listen to `hashchange` so back/forward and shared links work.
- Transition: 150ms opacity fade only, and none under `prefers-reduced-motion: reduce`.

**Print** (any mode): `.deck__controls { display: none }`, every slide shown, `break-inside: avoid` per slide, frame keeps its border, links print their URLs.

## 5. Recommendations page

Order: intro, guide, example, worked example, checklist, sources.

- **Guide**, four parts (Why, What a good one says, How to ask, How to write one): `<section class="guide-part" id="why">`, each with a numbered sans kicker ("Part 1 of 4") above an `h2`. A short in-page nav at the top lists the four parts plus Example and Checklist.
- **Example**: a `<figure class="example">` with `--example-bg`, 2px dashed `--example-rule` border, `--radius`, padding 2rem. Top line: `label--example` plus the sentence "Example only: written by us to show the shape. Not a real recommendation." The text uses visible placeholders as `<mark class="ph">[Name]</mark>` (monospace, `--example-fg`, dotted underline). Optional margin notes as an `<ol class="example__notes">` naming what each paragraph does ("1. context", "2. evidence"). `figcaption` repeats "Illustrative example with placeholders". No quotation marks, no avatar, no star rating: nothing that looks like a platform card.
- **Worked example, waiting for Dinis**: `<aside class="pending" aria-labelledby="pending-h">`, `--pending-bg`, solid 1px `--rule`, `label--pending` reading "Waiting for Dinis", an `h2`, one paragraph saying it will show an anonymised summary of his own recommendations once he approves it, and what it will contain (count, relationship types, themes). No placeholder figures.
- **Checklist**: `<ol class="checklist">` of plain items, each with a printed empty box via `::before` (no form inputs, so nothing to save). A "Print this checklist" note, not a button. In `@media print` the whole page prints, with `.checklist-section { break-before: page }` so the checklist lands on its own sheet.

## 6. All pages

Phone width: 16px side gutter, no horizontal scroll, tap targets 44px. Focus ring: 3px `--focus` outline, 2px offset. Images need `alt`; the share card stays 1200x630 under 300 KB.
