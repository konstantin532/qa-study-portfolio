/** QA Study Portfolio — lightweight progressive UI polish. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ready = () => {
    // A compositor-only reading-progress indicator.
    const progress = document.createElement('div');
    progress.className = 'ds-scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.append(progress);

    let scheduled = false;
    const syncScroll = () => {
      scheduled = false;
      const range = Math.max(1, root.scrollHeight - innerHeight);
      root.style.setProperty('--ds-scroll', Math.min(1, scrollY / range).toFixed(4));
      document.body.classList.toggle('is-scrolled', scrollY > 12);
    };
    const requestSync = () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(syncScroll);
      }
    };
    addEventListener('scroll', requestSync, { passive: true });
    addEventListener('resize', requestSync, { passive: true });
    syncScroll();

    // Reveal existing content progressively; no markup or business logic changes.
    const candidates = [...document.querySelectorAll(
      '.card, .stat-card, .progress-card, .chart-card, .lesson-card, .task-card, .workspace-card, main section'
    )].filter((item) => !item.closest('[hidden], .modal'));

    if (!reducedMotion && 'IntersectionObserver' in window) {
      root.classList.add('ds-motion-ready');
      candidates.forEach((item, index) => {
        item.dataset.dsReveal = '';
        item.style.setProperty('--ds-order', String(index % 7));
      });
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
      candidates.forEach((item) => observer.observe(item));
    }

    // Input modality allows precise focus styling without hiding keyboard focus.
    addEventListener('keydown', (event) => {
      if (event.key === 'Tab') root.dataset.input = 'keyboard';
    }, { passive: true });
    addEventListener('pointerdown', () => { root.dataset.input = 'pointer'; }, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
