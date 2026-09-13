/* Centered context dialog enhancement — vanilla JavaScript only. */
(function () {
  'use strict';

  var panel;
  var closeButton;
  var lastFocused = null;
  var observer;
  var OPEN_CLASSES = ['open', 'active', 'is-open'];

  function parentSignalsOpen() {
    var body = document.body;
    var app = document.getElementById('app-wrapper');
    var main = document.getElementById('main-container');
    return !!(
      main && main.classList.contains('context-panel-open') ||
      body && (body.classList.contains('context-panel-open') || body.classList.contains('context-open')) ||
      app && app.classList.contains('context-panel-open')
    );
  }

  function classSignalsOpen() {
    return OPEN_CLASSES.some(function (name) { return panel.classList.contains(name); });
  }

  function isOpen() {
    return classSignalsOpen() || parentSignalsOpen();
  }

  function focusFirstControl() {
    var target = panel.querySelector(
      '.context-panel-close, button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    );
    if (target) target.focus({ preventScroll: true });
  }

  function syncAccessibility() {
    var open = isOpen();
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    document.body.classList.toggle('context-dialog-visible', open);

    if (open) {
      if (!panel.dataset.dialogWasOpen) {
        panel.dataset.dialogWasOpen = 'true';
        window.requestAnimationFrame(focusFirstControl);
      }
    } else {
      delete panel.dataset.dialogWasOpen;
    }
  }

  function requestClose() {
    if (closeButton) {
      closeButton.click();
    } else if (window.App && App.contextPanel && typeof App.contextPanel.close === 'function') {
      App.contextPanel.close();
    } else {
      OPEN_CLASSES.forEach(function (name) { panel.classList.remove(name); });
    }
    syncAccessibility();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function trapTab(event) {
    if (event.key !== 'Tab' || !isOpen()) return;
    var controls = Array.prototype.slice.call(panel.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return el.offsetParent !== null; });
    if (!controls.length) return;
    var first = controls[0];
    var last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  function init() {
    panel = document.getElementById('context-panel');
    if (!panel) return;
    closeButton = document.getElementById('context-panel-close-btn') || panel.querySelector('.context-panel-close');

    panel.addEventListener('click', function (event) {
      if (event.target && event.target.hasAttribute('data-context-dialog-close')) requestClose();
    });
    panel.addEventListener('keydown', trapTab);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) requestClose();
    });
    document.addEventListener('pointerdown', function (event) {
      if (!isOpen() && event.target.closest('[data-action], .artifact-card, .card')) {
        lastFocused = event.target.closest('button, a, [tabindex], .artifact-card, .card') || document.activeElement;
      }
    }, true);

    observer = new MutationObserver(syncAccessibility);
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    var app = document.getElementById('app-wrapper');
    if (app) observer.observe(app, { attributes: true, attributeFilter: ['class'] });
    var main = document.getElementById('main-container');
    if (main) observer.observe(main, { attributes: true, attributeFilter: ['class'] });

    /* A restored "open" state must not create a footer on initial load. */
    if (!classSignalsOpen() && !parentSignalsOpen()) panel.setAttribute('aria-hidden', 'true');
    syncAccessibility();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());
