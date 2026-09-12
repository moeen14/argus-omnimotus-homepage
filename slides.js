'use strict';
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.slide-track');
  const slides = [...track.children];
  const labels = JSON.parse(carousel.dataset.labels);
  let index = 0, timer = null, visible = false, hovered = false, focused = false, touching = false;
  let contentAnimations = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // End clones let the last slide move forward naturally into the first.
  function clone(slide) {
    const copy = slide.cloneNode(true);
    copy.removeAttribute('id'); copy.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    copy.classList.add('slide-clone'); copy.setAttribute('aria-hidden', 'true'); copy.inert = true;
    copy.querySelectorAll('img').forEach(img => img.loading = 'eager');
    return copy;
  }
  track.prepend(clone(slides.at(-1))); track.append(clone(slides[0]));
  const controls = document.createElement('div'); controls.className = 'slide-controls';
  const topics = document.createElement('div'); topics.className = 'slide-topics'; topics.setAttribute('aria-label', 'Choose a slide');
  const buttons = labels.map((label, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => show(i, true)); topics.append(b); return b;
  });
  const status = document.createElement('span'); status.className = 'slide-count';
  const hint = document.createElement('p'); hint.className = 'slide-hint'; hint.textContent = 'Hover over the figure to pause. Move away to resume.';
  const announcement = document.createElement('span'); announcement.className = 'visually-hidden'; announcement.setAttribute('aria-live', 'polite');
  controls.append(topics, status, hint); carousel.append(controls, announcement);
  function arrow(direction, text) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'slide-arrow ' + direction; b.textContent = text;
    b.setAttribute('aria-label', direction === 'previous' ? 'Previous slide' : 'Next slide');
    b.addEventListener('click', () => show(index + (direction === 'previous' ? -1 : 1), true)); carousel.append(b);
  }
  arrow('previous', '‹'); arrow('next', '›');
  function schedule() {
    clearTimeout(timer);
    if (visible && !hovered && !focused && !touching && !document.hidden) timer = setTimeout(() => show(index + 1), 5000);
  }
  function snap() {
    track.style.transition = 'none'; track.style.transform = `translate3d(-${(index + 1) * 100}%,0,0)`;
    track.getBoundingClientRect(); track.style.transition = '';
  }
  function show(next, manual = false) {
    contentAnimations.forEach(animation => animation.cancel());
    contentAnimations = [];
    const previous = index;
    snap();
    const position = next < 0 ? 0 : next >= slides.length ? slides.length + 1 : next + 1;
    index = (next + slides.length) % slides.length;
    track.style.transform = `translate3d(-${position * 100}%,0,0)`;
    if (next !== previous && !reducedMotion.matches) {
      const incoming = track.children[position];
      const outgoing = slides[previous];
      const direction = next > previous ? 1 : -1;
      // Layer a gentle zoom and staggered text arrival over the horizontal slide.
      contentAnimations.push(outgoing.querySelector('.paper-figure').animate([
        {opacity:1,transform:'scale(1)'},
        {opacity:.3,transform:'scale(.96)'}
      ],{duration:600,easing:'ease-out',fill:'forwards'}));
      contentAnimations.push(incoming.querySelector('.paper-figure').animate([
        {opacity:.35,transform:`translateX(${direction * 24}px) scale(.96)`},
        {opacity:1,transform:'translateX(0) scale(1)'}
      ],{duration:780,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}));
      incoming.querySelectorAll('h3,.technique-description').forEach((element,i) => {
        contentAnimations.push(element.animate([
          {opacity:0,transform:'translateY(12px)'},
          {opacity:1,transform:'translateY(0)'}
        ],{duration:560,delay:80+i*70,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'}));
      });
    }
    slides.forEach((slide, i) => { slide.setAttribute('aria-hidden', String(i !== index)); slide.inert = i !== index; });
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    status.textContent = `${index + 1} / ${slides.length}`;
    if (manual) announcement.textContent = labels[index];
    schedule();
  }
  track.addEventListener('transitionend', e => { if (e.target === track && e.propertyName === 'transform') snap(); });
  carousel.querySelectorAll('.paper-figure').forEach(figure => {
    figure.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = true; schedule(); } });
    figure.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  });
  carousel.addEventListener('pointerdown', () => { focused = false; schedule(); });
  carousel.addEventListener('focusin', e => { focused = e.target.matches(':focus-visible'); schedule(); });
  carousel.addEventListener('focusout', () => setTimeout(() => { focused = carousel.contains(document.activeElement) && document.activeElement.matches(':focus-visible'); schedule(); }, 0));
  carousel.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); focused = true; show(index + (e.key === 'ArrowRight' ? 1 : -1), true); }
  });
  let touch = null;
  carousel.addEventListener('touchstart', e => { touching = true; touch = {x:e.touches[0].clientX,y:e.touches[0].clientY}; schedule(); }, {passive:true});
  carousel.addEventListener('touchend', e => {
    touching = false;
    if (touch) { const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y; if (Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)) show(index+(dx<0?1:-1),true); }
    touch=null; schedule();
  }, {passive:true});
  carousel.addEventListener('touchcancel', () => { touching=false;touch=null;schedule(); });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(entries => { visible=entries[0].isIntersecting && entries[0].intersectionRatio>=.15; schedule(); }, {threshold:.15}).observe(carousel);
  carousel.classList.add('is-enhanced'); carousel.setAttribute('aria-roledescription','carousel');
  slides.forEach((slide,i) => {slide.setAttribute('role','group');slide.setAttribute('aria-roledescription','slide');slide.setAttribute('aria-label',`${i+1} of ${slides.length}: ${labels[i]}`);});
  snap(); show(0);
});
