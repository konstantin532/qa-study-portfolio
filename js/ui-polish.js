/** Progressive, dependency-free interface enhancements. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const progress = document.createElement('div');
  progress.className = 'ui-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  let frame = 0;
  const updateProgress = () => {
    frame = 0;
    const scrollable = Math.max(document.documentElement.scrollHeight - innerHeight, 0);
    const value = scrollable ? Math.min(Math.max(scrollY / scrollable, 0), 1) : 0;
    progress.style.transform = `scaleX(${value})`;
  };
  const requestProgressUpdate = () => {
    if (!frame) frame = requestAnimationFrame(updateProgress);
  };
  addEventListener('scroll', requestProgressUpdate, { passive: true });
  addEventListener('resize', requestProgressUpdate, { passive: true });
  updateProgress();

  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const candidates = document.querySelectorAll(
      '.content-section, .dashboard-card, .stat-card, .module-card, .lesson-card, .task-card, .chart-card'
    );
    if (candidates.length) {
      root.classList.add('ui-enhanced');
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('ui-visible');
          observer.unobserve(entry.target);
        }
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
      candidates.forEach((element) => {
        element.classList.add('ui-reveal');
        observer.observe(element);
      });
    }
  }

  // Add a safe title to icon-only controls that already expose an accessible name.
  document.querySelectorAll('button[aria-label]:not([title])').forEach((button) => {
    button.title = button.getAttribute('aria-label');
  });
})();
