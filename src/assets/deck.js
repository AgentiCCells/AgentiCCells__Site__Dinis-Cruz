// Slide viewer for /cv/. First-party, no dependencies. Without this script the slides
// are listed one after another and the page reads in full.
// Written by developer.dinis-cruz@AgentiCCells.dinis, 2026-11-19, from team/design/round-1.md. Code Apache-2.0.
(() => {
  const deck = document.querySelector('.deck');
  if (!deck) return;
  const slides = Array.from(deck.querySelectorAll('.slide'));
  const controls = deck.querySelector('.deck__controls');
  const prev = deck.querySelector('.deck__prev');
  const next = deck.querySelector('.deck__next');
  const count = deck.querySelector('.deck__count');
  const n = slides.length;
  if (!n || !controls || !prev || !next || !count) return;

  let current = 0;
  const fromHash = () => {
    const m = /^#slide-(\d+)$/.exec(location.hash);
    return m ? Math.min(n, Math.max(1, Number(m[1]))) - 1 : null;
  };

  function show(i, { focusHeading = false, setHash = true } = {}) {
    const focusWasInHidden = slides.some((s, j) => j !== i && s.contains(document.activeElement));
    current = Math.max(0, Math.min(n - 1, i));
    slides.forEach((s, j) => s.classList.toggle('is-current', j === current));
    count.textContent = `Slide ${current + 1} of ${n}`;
    prev.disabled = current === 0;
    next.disabled = current === n - 1;
    const hash = `#slide-${current + 1}`;
    if (setHash && location.hash !== hash) history.replaceState(null, '', hash);
    if (focusHeading || focusWasInHidden) {
      const h = slides[current].querySelector('.slide__heading');
      if (h) h.focus();
    } else if (document.activeElement === prev && prev.disabled) next.focus();
    else if (document.activeElement === next && next.disabled) prev.focus();
  }

  const step = d => show(current + d);
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  deck.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    const keys = { ArrowLeft: () => step(-1), ArrowRight: () => step(1), Home: () => show(0), End: () => show(n - 1) };
    if (!keys[e.key]) return;
    e.preventDefault();
    keys[e.key]();
  });

  window.addEventListener('hashchange', () => {
    const i = fromHash();
    if (i !== null) show(i, { focusHeading: i !== current });
  });

  deck.classList.add('deck--js');
  controls.hidden = false;
  const start = fromHash();
  show(start === null ? 0 : start, { setHash: start !== null });
})();
