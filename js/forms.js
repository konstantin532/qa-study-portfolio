/* forms.js — формы: создание артефактов, редактор портфолио, менеджер тегов, заметки, модалки */

/* ЧАСТЬ 1 из 4: Константы, иконки, init, confirm, showAlert */

(function () {
  'use strict';

  if (!window.Utils) {
    console.error('Forms: Utils not available');
    return;
  }

  // ========================================================================
  // КОНСТАНТЫ
  // ========================================================================

  var MAX_TITLE = 200;
  var MAX_DESCRIPTION = 2000;
  var MAX_NOTE_LENGTH = 5000;
  var MAX_TAG_LENGTH = 30;
  var AUTOCOMPLETE_DEBOUNCE = 200;

  var TAG_COLOR_PALETTE = [
    '#3b82f6', '#22c55e', '#f97316', '#dc2626', '#8b5cf6',
    '#eab308', '#06b6d4', '#ec4899', '#14b8a6', '#6b7280'
  ];

  var ICONS = {
    bug: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2"/><path d="M5 7l3 2"/><path d="M19 13h-3"/><path d="M5 13h3"/><path d="M19 19l-3-2"/><path d="M5 19l3-2"/><path d="M12 6V4"/><circle cx="12" cy="4" r="1"/></svg>',
    testCase: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    checklist: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    testPlan: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    api: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    alert: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    warning: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    success: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    tag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    palette: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="10" cy="19" r="2.5"/><path d="M12 2a10 10 0 1 0 0 20 1.5 1.5 0 0 0 1.06-2.56 1.5 1.5 0 0 1 1.06-2.56h1.88a4 4 0 0 0 4-4 10 10 0 0 0-8-10z"/></svg>',
    note: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  };

  var TYPE_META = {
    bug_report: { icon: 'bug', label: 'Баг-репорт', desc: 'Сообщение об ошибке с шагами воспроизведения' },
    test_case: { icon: 'testCase', label: 'Тест-кейс', desc: 'Пошаговая проверка с ожидаемым результатом' },
    checklist: { icon: 'checklist', label: 'Чек-лист', desc: 'Список проверок с отметками выполнения' },
    test_plan: { icon: 'testPlan', label: 'Тест-план', desc: 'План тестирования с расписанием и рисками' },
    api_test: { icon: 'api', label: 'API-тест', desc: 'Тестирование API-эндпоинта' }
  };

  var ALERT_ICONS = {
    info: 'alert',
    warning: 'warning',
    error: 'error',
    success: 'success'
  };

  var ALERT_COLORS = {
    info: '#3b82f6',
    warning: '#f97316',
    error: '#dc2626',
    success: '#22c55e'
  };

  // ========================================================================
  // СОСТОЯНИЕ
  // ========================================================================

  var _state = {
    initialized: false,
    activeModals: [],
    focusRestoreStack: []
  };

  // ========================================================================
  // ОБЩИЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================================================

  function _showToast(message, type) {
    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('toast', { message: message, type: type || 'info' });
    } else if (window.App && typeof App.showToast === 'function') {
      App.showToast({ message: message, type: type || 'info' });
    }
  }

  function _escapeHtml(text) {
    if (Utils.format && Utils.format.escapeHtml) return Utils.format.escapeHtml(text);
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function _getKeys() {
    if (Utils.constants && Utils.constants.STORAGE_KEYS) {
      return Utils.constants.STORAGE_KEYS;
    }
    return {
      STATE: 'qa_portfolio_state',
      SETTINGS: 'qa_portfolio_settings',
      PROGRESS: 'qa_portfolio_progress',
      NOTES: 'qa_portfolio_notes',
      ARTIFACTS: 'qa_portfolio_artifacts',
      TAGS: 'qa_portfolio_tags',
      BOOKMARKS: 'qa_portfolio_bookmarks',
      POMODORO: 'qa_portfolio_pomodoro',
      SEARCH_HISTORY: 'qa_portfolio_search_history',
      EXPORT_HISTORY: 'qa_portfolio_export_history',
      PORTFOLIO_ITEMS: 'qa_portfolio_portfolio_items',
      ONBOARDED: 'qa_portfolio_onboarded'
    };
  }

  function _generateId() {
    if (Utils.id && Utils.id.uuid) return Utils.id.uuid();
    if (Utils.id && Utils.id.shortId) return Utils.id.shortId();
    return 'form_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function _isMobile() {
    if (Utils.device && Utils.device.isMobile) return Utils.device.isMobile();
    return window.innerWidth < 768;
  }

  function _dom(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'class') {
          el.className = attrs[key];
        } else if (key === 'text') {
          el.textContent = attrs[key];
        } else if (key === 'html') {
          el.innerHTML = attrs[key];
        } else if (key === 'style' && typeof attrs[key] === 'object') {
          Object.assign(el.style, attrs[key]);
        } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
          el.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
        } else if (attrs[key] !== null && attrs[key] !== undefined) {
          el.setAttribute(key, attrs[key]);
        }
      });
    }
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(function (child) {
          if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
          } else if (child instanceof Node) {
            el.appendChild(child);
          }
        });
      } else if (typeof children === 'string') {
        el.textContent = children;
      } else if (children instanceof Node) {
        el.appendChild(children);
      }
    }
    return el;
  }

  // ========================================================================
  // СИСТЕМА ДИНАМИЧЕСКИХ МОДАЛОК
  // ========================================================================

  function _getModalsContainer() {
    var container = document.getElementById('modals');
    if (!container) {
      container = _dom('div', { id: 'modals' });
      document.body.appendChild(container);
    }
    return container;
  }

  function _createDynamicModal(modalId, contentNode, options) {
    var opts = options || {};
    var isMobile = _isMobile();
    var modalClass = isMobile ? 'modal modal-fullscreen forms-dynamic-modal' : 'modal modal-lg forms-dynamic-modal';

    if (opts.size === 'sm') modalClass = isMobile ? 'modal modal-fullscreen forms-dynamic-modal' : 'modal modal-sm forms-dynamic-modal';
    if (opts.size === 'md') modalClass = isMobile ? 'modal modal-fullscreen forms-dynamic-modal' : 'modal modal-md forms-dynamic-modal';

    var modal = _dom('div', {
      id: modalId,
      class: modalClass,
      role: 'dialog',
      'aria-modal': 'true',
      hidden: 'hidden'
    });

    var dialog = _dom('div', { class: 'modal-dialog' });
    var content = _dom('div', { class: 'modal-content' });

    if (contentNode instanceof Node) {
      content.appendChild(contentNode);
    }

    dialog.appendChild(content);
    modal.appendChild(dialog);

    // Click outside to close
    modal.addEventListener('click', function (e) {
      if (e.target === modal && opts.closeOnBackdrop !== false) {
        _closeDynamicModal(modal);
      }
    });

    // Escape to close
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && opts.closeOnEscape !== false) {
        e.preventDefault();
        _closeDynamicModal(modal);
      }
    });

    _getModalsContainer().appendChild(modal);

    return modal;
  }

  function _openDynamicModal(modal) {
    if (!modal) return;

    // Сохраняем текущий фокус для восстановления
    _state.focusRestoreStack.push(document.activeElement);

    modal.hidden = false;
    if (Utils.dom && Utils.dom.fadeIn) {
      Utils.dom.fadeIn(modal, 200);
    } else {
      modal.style.display = 'block';
    }

    document.body.classList.add('modal-open');
    _state.activeModals.push(modal);

    // Focus trap
    if (Utils.a11y && Utils.a11y.trapFocus) {
      Utils.a11y.trapFocus(modal.querySelector('.modal-content') || modal);
    }

    // Focus first focusable element
    setTimeout(function () {
      var firstFocusable = modal.querySelector('input:not([type="hidden"]), textarea, select, button:not([disabled])');
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        modal.focus();
      }
    }, 250);
  }

  function _closeDynamicModal(modal) {
    if (!modal) return;

    if (Utils.dom && Utils.dom.fadeOut) {
      Utils.dom.fadeOut(modal, 200, function () {
        _destroyDynamicModal(modal);
      });
    } else {
      _destroyDynamicModal(modal);
    }

    var idx = _state.activeModals.indexOf(modal);
    if (idx !== -1) _state.activeModals.splice(idx, 1);

    if (_state.activeModals.length === 0) {
      document.body.classList.remove('modal-open');
    }

    // Restore focus
    if (Utils.a11y && Utils.a11y.releaseFocus) {
      Utils.a11y.releaseFocus();
    }

    var restoreEl = _state.focusRestoreStack.pop();
    if (restoreEl && typeof restoreEl.focus === 'function') {
      setTimeout(function () {
        try { restoreEl.focus(); } catch (e) { /* ignore */ }
      }, 100);
    }
  }

  function _destroyDynamicModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  // ========================================================================
  // ГЛОБАЛЬНЫЙ ОБЪЕКТ FORMS
  // ========================================================================

  window.Forms = {

    // ----------------------------------------------------------------
    // ИНИЦИАЛИЗАЦИЯ
    // ----------------------------------------------------------------

    init: function () {
      if (!window.Utils) {
        if (window.Debug) Debug.error('Utils not available — Forms cannot init');
        return;
      }

      // Регистрация в QAApp
      if (window.QAApp && typeof QAApp.registerModule === 'function') {
        QAApp.registerModule('Forms', Forms);
        if (typeof QAApp.on === 'function') {
          QAApp.on('forms:confirm', function (options) { Forms.confirm(options); });
          QAApp.on('forms:prompt', function (options) { Forms.showPrompt(options); });
          QAApp.on('forms:alert', function (options) { Forms.showAlert(options); });
          QAApp.on('forms:artifactCreator', function (template) { Forms.showArtifactCreator(template); });
          QAApp.on('forms:quickNote', function () { Forms.showQuickNote(); });
          QAApp.on('forms:tagManager', function () { Forms.showTagManager(); });
          QAApp.on('forms:portfolioEditor', function (item) { Forms.showPortfolioEditor(item); });
        }
      }

      _state.initialized = true;

      if (window.Debug) Debug.info('Forms module initialized');
    },

    // ----------------------------------------------------------------
    // CONFIRM — УНИВЕРСАЛЬНАЯ МОДАЛКА ПОДТВЕРЖДЕНИЯ
    // ----------------------------------------------------------------

    confirm: function (options) {
      var opts = options || {};

      return new Promise(function (resolve, reject) {
        var title = opts.title || 'Подтверждение';
        var message = opts.message || 'Вы уверены?';
        var confirmText = opts.confirmText || 'ОК';
        var cancelText = opts.cancelText || 'Отмена';
        var confirmType = opts.confirmType || 'primary';

        // Попытка использовать существующую #confirm-modal
        var existingModal = document.getElementById('confirm-modal');

        if (existingModal && window.App && App.modals && typeof App.modals.open === 'function') {
          _useExistingConfirmModal(existingModal, {
            title: title, message: message, confirmText: confirmText,
            cancelText: cancelText, confirmType: confirmType,
            onConfirm: function () { if (opts.onConfirm) opts.onConfirm(); resolve(true); },
            onCancel: function () { if (opts.onCancel) opts.onCancel(); reject(new Error('cancelled')); }
          });
          return;
        }

        // Динамическая модалка
        var modalId = 'forms-confirm-' + _generateId();
        var content = _buildConfirmContent({
          title: title, message: message, confirmText: confirmText,
          cancelText: cancelText, confirmType: confirmType
        });

        var modal = _createDynamicModal(modalId, content, { size: 'sm' });

        // Обработчики кнопок
        var confirmBtn = content.querySelector('[data-action="confirm"]');
        var cancelBtn = content.querySelector('[data-action="cancel"]');

        var cleaned = false;
        function _cleanup() {
          if (cleaned) return;
          cleaned = true;
        }

        confirmBtn.addEventListener('click', function () {
          _closeDynamicModal(modal);
          _cleanup();
          if (opts.onConfirm) opts.onConfirm();
          resolve(true);
        });

        cancelBtn.addEventListener('click', function () {
          _closeDynamicModal(modal);
          _cleanup();
          if (opts.onCancel) opts.onCancel();
          reject(new Error('cancelled'));
        });

        _openDynamicModal(modal);
      });
    },

    // ----------------------------------------------------------------
    // SHOWALERT — МОДАЛКА С СООБЩЕНИЕМ
    // ----------------------------------------------------------------

    showAlert: function (options) {
      var opts = options || {};

      return new Promise(function (resolve) {
        var title = opts.title || 'Сообщение';
        var message = opts.message || '';
        var type = opts.type || 'info';
        var buttonText = opts.buttonText || 'ОК';

        var iconName = ALERT_ICONS[type] || 'alert';
        var iconColor = ALERT_COLORS[type] || ALERT_COLORS.info;
        var iconSvg = ICONS[iconName] || ICONS.alert;

        var modalId = 'forms-alert-' + _generateId();

        var content = _dom('div', { class: 'modal-alert-content' });

        // Icon
        var iconWrap = _dom('div', {
          class: 'modal-alert-icon',
          style: { color: iconColor, marginBottom: '16px', textAlign: 'center' }
        });
        iconWrap.innerHTML = iconSvg;
        content.appendChild(iconWrap);

        // Title
        content.appendChild(_dom('h3', {
          class: 'modal-title',
          style: { textAlign: 'center', marginBottom: '12px' },
          text: title
        }));

        // Message
        if (message) {
          content.appendChild(_dom('p', {
            class: 'modal-alert-message',
            style: { textAlign: 'center', color: '#64748b', lineHeight: '1.6', marginBottom: '24px', whiteSpace: 'pre-wrap' },
            text: message
          }));
        }

        // Button
        var btnRow = _dom('div', {
          class: 'modal-footer',
          style: { display: 'flex', justifyContent: 'center', gap: '12px' }
        });

        var okBtn = _dom('button', {
          class: 'btn btn-' + (type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'primary'),
          text: buttonText,
          style: { minWidth: '120px' }
        });

        btnRow.appendChild(okBtn);
        content.appendChild(btnRow);

        var modal = _createDynamicModal(modalId, content, { size: 'sm' });

        okBtn.addEventListener('click', function () {
          _closeDynamicModal(modal);
          resolve(true);
        });

        // Enter to close
        modal.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            _closeDynamicModal(modal);
            resolve(true);
          }
        });

        _openDynamicModal(modal);
      });
    }
  };

  // ========================================================================
  // ВНУТРЕННИЕ ФУНКЦИИ: CONFIRM
  // ========================================================================

  function _useExistingConfirmModal(modal, handlers) {
    var titleEl = modal.querySelector('.modal-title, [data-modal-title]');
    var messageEl = modal.querySelector('.modal-message, [data-modal-message]');
    var confirmBtn = modal.querySelector('[data-modal-confirm], .btn-confirm');
    var cancelBtn = modal.querySelector('[data-modal-cancel], .btn-cancel');

    if (titleEl) titleEl.textContent = handlers.title;
    if (messageEl) messageEl.textContent = handlers.message;
    if (confirmBtn) confirmBtn.textContent = handlers.confirmText;
    if (cancelBtn) cancelBtn.textContent = handlers.cancelText;

    // Цвет кнопки подтверждения
    if (confirmBtn) {
      confirmBtn.classList.remove('btn-primary', 'btn-danger', 'btn-warning');
      var btnClass = handlers.confirmType === 'danger' ? 'btn-danger' :
                     handlers.confirmType === 'warning' ? 'btn-warning' : 'btn-primary';
      confirmBtn.classList.add(btnClass);
    }

    // One-time handlers
    function onConfirmClick() {
      confirmBtn.removeEventListener('click', onConfirmClick);
      cancelBtn.removeEventListener('click', onCancelClick);
      if (window.App && App.modals && App.modals.close) App.modals.close('confirm-modal');
      handlers.onConfirm();
    }

    function onCancelClick() {
      confirmBtn.removeEventListener('click', onConfirmClick);
      cancelBtn.removeEventListener('click', onCancelClick);
      if (window.App && App.modals && App.modals.close) App.modals.close('confirm-modal');
      handlers.onCancel();
    }

    if (confirmBtn) confirmBtn.addEventListener('click', onConfirmClick);
    if (cancelBtn) cancelBtn.addEventListener('click', onCancelClick);

    // Focus trap
    if (Utils.a11y && Utils.a11y.trapFocus) {
      Utils.a11y.trapFocus(modal.querySelector('.modal-content') || modal);
    }

    if (window.App && App.modals && App.modals.open) {
      App.modals.open('confirm-modal');
    } else {
      modal.hidden = false;
      document.body.classList.add('modal-open');
    }
  }

  function _buildConfirmContent(opts) {
    var content = _dom('div', { class: 'modal-confirm-content' });

    // Header
    var header = _dom('div', { class: 'modal-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } });
    header.appendChild(_dom('h3', { class: 'modal-title', text: opts.title }));
    header.appendChild(_dom('button', {
      class: 'modal-close-btn',
      'aria-label': 'Закрыть',
      html: ICONS.close,
      'data-action': 'cancel'
    }));
    content.appendChild(header);

    // Message
    content.appendChild(_dom('p', {
      class: 'modal-confirm-message',
      style: { color: '#475569', lineHeight: '1.6', marginBottom: '24px', whiteSpace: 'pre-wrap' },
      text: opts.message
    }));

    // Buttons
    var btnRow = _dom('div', {
      class: 'modal-footer',
      style: { display: 'flex', justifyContent: 'flex-end', gap: '12px' }
    });

    var cancelBtn = _dom('button', {
      class: 'btn btn-outline',
      text: opts.cancelText,
      'data-action': 'cancel'
    });

    var btnClass = opts.confirmType === 'danger' ? 'btn-danger' :
                   opts.confirmType === 'warning' ? 'btn-warning' : 'btn-primary';
    var confirmBtn = _dom('button', {
      class: 'btn ' + btnClass,
      text: opts.confirmText,
      'data-action': 'confirm'
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    content.appendChild(btnRow);

    return content;
  }

  // ========================================================================
  // ВНУТРЕННИЕ ДАННЫЕ ДЛЯ ОБМЕНА МЕЖДУ ЧАСТЯМИ
  // ========================================================================

  Forms._internal = {
    showToast: _showToast,
    escapeHtml: _escapeHtml,
    getKeys: _getKeys,
    generateId: _generateId,
    isMobile: _isMobile,
    dom: _dom,
    createDynamicModal: _createDynamicModal,
    openDynamicModal: _openDynamicModal,
    closeDynamicModal: _closeDynamicModal,
    destroyDynamicModal: _destroyDynamicModal,
    icons: ICONS,
    typeMeta: TYPE_META,
    tagColors: TAG_COLOR_PALETTE,
    maxTitle: MAX_TITLE,
    maxDescription: MAX_DESCRIPTION,
    maxNoteLength: MAX_NOTE_LENGTH,
    maxTagLength: MAX_TAG_LENGTH,
    state: _state
  };

})();
/* ЧАСТЬ 2 из 4: showPrompt, showArtifactCreator, showPortfolioEditor */

(function () {
  'use strict';

  var Forms = window.Forms;
  if (!Forms) return;
  var _i = Forms._internal;
  var ICONS = _i.icons;
  var TYPE_META = _i.typeMeta;

  // ----------------------------------------------------------------
  // SHOWPROMPT — МОДАЛКА С ТЕКСТОВЫМ ВВОДОМ
  // ----------------------------------------------------------------

  Forms.showPrompt = function (options) {
    var opts = options || {};

    return new Promise(function (resolve, reject) {
      var title = opts.title || 'Введите значение';
      var message = opts.message || '';
      var defaultValue = opts.defaultValue || '';
      var placeholder = opts.placeholder || '';
      var multiline = opts.multiline === true;
      var validateFn = typeof opts.validate === 'function' ? opts.validate : null;

      var modalId = 'forms-prompt-' + _i.generateId();

      var content = _i.dom('div', { class: 'modal-prompt-content' });

      // Header
      var header = _i.dom('div', { class: 'modal-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } });
      header.appendChild(_i.dom('h3', { class: 'modal-title', text: title }));

      var closeBtn = _i.dom('button', {
        class: 'modal-close-btn',
        'aria-label': 'Закрыть',
        html: ICONS.close
      });
      header.appendChild(closeBtn);
      content.appendChild(header);

      // Message
      if (message) {
        content.appendChild(_i.dom('p', {
          style: { color: '#475569', marginBottom: '12px', lineHeight: '1.5' },
          text: message
        }));
      }

      // Input
      var inputEl;
      if (multiline) {
        inputEl = _i.dom('textarea', {
          class: 'form-textarea',
          placeholder: placeholder,
          rows: '4',
          style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }
        });
      } else {
        inputEl = _i.dom('input', {
          type: 'text',
          class: 'form-input',
          placeholder: placeholder,
          style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
        });
      }
      inputEl.value = defaultValue;
      content.appendChild(inputEl);

      // Error display
      var errorEl = _i.dom('div', {
        class: 'field-error-message',
        role: 'alert',
        style: { color: '#dc2626', fontSize: '13px', marginTop: '8px', minHeight: '18px', display: 'none' }
      });
      content.appendChild(errorEl);

      // Buttons
      var btnRow = _i.dom('div', {
        class: 'modal-footer',
        style: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }
      });

      var cancelBtn = _i.dom('button', { class: 'btn btn-outline', text: 'Отмена' });
      var okBtn = _i.dom('button', { class: 'btn btn-primary', text: 'ОК' });

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(okBtn);
      content.appendChild(btnRow);

      var modal = _i.createDynamicModal(modalId, content, { size: 'sm' });

      var cleaned = false;

      function _doSubmit() {
        var value = inputEl.value;

        if (validateFn) {
          var result = validateFn(value);
          if (result && !result.valid) {
            errorEl.textContent = result.message || 'Невалидное значение';
            errorEl.style.display = 'block';
            inputEl.setAttribute('aria-invalid', 'true');
            inputEl.classList.add('field-error');
            inputEl.focus();
            inputEl.select();
            return;
          }
        }

        errorEl.style.display = 'none';
        inputEl.removeAttribute('aria-invalid');
        inputEl.classList.remove('field-error');

        _i.closeDynamicModal(modal);
        cleaned = true;
        if (opts.onSubmit) opts.onSubmit(value);
        resolve(value);
      }

      function _doCancel() {
        if (cleaned) return;
        _i.closeDynamicModal(modal);
        cleaned = true;
        if (opts.onCancel) opts.onCancel();
        reject(new Error('cancelled'));
      }

      okBtn.addEventListener('click', _doSubmit);
      cancelBtn.addEventListener('click', _doCancel);
      closeBtn.addEventListener('click', _doCancel);

      // Enter to submit (single-line only)
      if (!multiline) {
        inputEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            _doSubmit();
          }
        });
      } else {
        // Ctrl+Enter for multiline
        inputEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            _doSubmit();
          }
        });
      }

      // Escape handled by modal, but also add explicit handler
      modal.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          _doCancel();
        }
      });

      _i.openDynamicModal(modal);

      // Select all text in input for quick editing
      setTimeout(function () {
        inputEl.focus();
        inputEl.select();
      }, 300);
    });
  };

  // ----------------------------------------------------------------
  // SHOWARTIFACTCREATOR — СОЗДАНИЕ НОВОГО АРТЕФАКТА
  // ----------------------------------------------------------------

  Forms.showArtifactCreator = function (template) {
    // Если template не задан — показать выбор типа
    if (!template || !template.type) {
      _showTypeSelector(function (selectedType) {
        // Получаем шаблон из CourseData
        var tpl = null;
        if (window.CourseData && CourseData.getTemplates) {
          var templates = CourseData.getTemplates();
          if (templates && templates[selectedType]) {
            tpl = templates[selectedType];
          } else if (Array.isArray(templates)) {
            templates.forEach(function (t) {
              if (t.type === selectedType) tpl = t;
            });
          }
        }

        if (!tpl) {
          tpl = { type: selectedType, structure: _getDefaultTemplateData(selectedType) };
        }

        Forms.showArtifactCreator(tpl);
      });
      return;
    }

    // Если template задан — использовать Editor если доступен
    if (window.Editor && typeof Editor.create === 'function') {
      Editor.create(template);
      return;
    }

    // Иначе — собственная форма
    _showArtifactForm(template);
  };

  function _showTypeSelector(callback) {
    var modalId = 'forms-type-selector-' + _i.generateId();

    var content = _i.dom('div', { class: 'modal-type-selector-content' });

    // Header
    var header = _i.dom('div', { class: 'modal-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } });
    header.appendChild(_i.dom('h3', { class: 'modal-title', text: 'Создание артефакта' }));

    var closeBtn = _i.dom('button', {
      class: 'modal-close-btn',
      'aria-label': 'Закрыть',
      html: ICONS.close
    });
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Subtitle
    content.appendChild(_i.dom('p', {
      style: { color: '#64748b', marginBottom: '20px', fontSize: '14px' },
      text: 'Выберите тип артефакта для создания:'
    }));

    // Type grid
    var grid = _i.dom('div', {
      class: 'type-selector-grid',
      style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }
    });

    Object.keys(TYPE_META).forEach(function (typeKey) {
      var meta = TYPE_META[typeKey];
      var iconSvg = ICONS[meta.icon] || ICONS.bug;

      var card = _i.dom('div', {
        class: 'type-selector-card',
        tabindex: '0',
        role: 'button',
        'aria-label': meta.label + ' — ' + meta.desc,
        style: {
          border: '2px solid #e2e8f0',
          borderRadius: '10px',
          padding: '20px',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }
      });

      var iconWrap = _i.dom('div', {
        style: { color: '#3b82f6', display: 'flex', justifyContent: 'center' }
      });
      iconWrap.innerHTML = iconSvg;
      card.appendChild(iconWrap);

      card.appendChild(_i.dom('div', {
        style: { fontWeight: '600', fontSize: '15px', color: '#1e293b' },
        text: meta.label
      }));

      card.appendChild(_i.dom('div', {
        style: { fontSize: '12px', color: '#64748b', lineHeight: '1.4' },
        text: meta.desc
      }));

      // Hover effect
      card.addEventListener('mouseenter', function () {
        card.style.borderColor = '#3b82f6';
        card.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.borderColor = '#e2e8f0';
        card.style.boxShadow = 'none';
      });

      // Click and keyboard
      function selectType() {
        _i.closeDynamicModal(modal);
        callback(typeKey);
      }

      card.addEventListener('click', selectType);
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectType();
        }
      });

      grid.appendChild(card);
    });

    content.appendChild(grid);

    var modal = _i.createDynamicModal(modalId, content, { size: 'md' });

    closeBtn.addEventListener('click', function () {
      _i.closeDynamicModal(modal);
    });

    _i.openDynamicModal(modal);
  }

  function _getDefaultTemplateData(type) {
    switch (type) {
      case 'bug_report':
        return {
          summary: '', description: '', steps: [''], expected: '', actual: '',
          severity: 'major', priority: 'medium', status: 'new', environment: ''
        };
      case 'test_case':
        return {
          id: 'TC-' + Date.now().toString(36), title: '', preconditions: '',
          steps: [{ action: '', expectedResult: '' }], postconditions: '',
          type: 'functional', priority: 'medium', status: 'not_executed'
        };
      case 'checklist':
        return { title: '', items: [{ text: '', isChecked: false, category: '' }] };
      case 'test_plan':
        return {
          title: '', scope: '', strategy: '',
          schedule: [{ phase: '', startDate: '', endDate: '', responsible: '' }],
          risks: [{ risk: '', impact: 'medium', mitigation: '' }],
          resources: [''], approvals: [{ role: '', name: '', date: '', approved: false }]
        };
      case 'api_test':
        return {
          title: '', method: 'GET', url: '',
          headers: [{ key: '', value: '' }], body: '', expectedStatus: 200, expectedResponse: ''
        };
      default:
        return {};
    }
  }

  function _showArtifactForm(template) {
    var type = template.type;
    var typeLabel = TYPE_META[type] ? TYPE_META[type].label : 'Артефакт';
    var structure = template.structure || template.data || _getDefaultTemplateData(type);

    var modalId = 'forms-artifact-form-' + _i.generateId();
    var keys = _i.getKeys();

    var content = _i.dom('div', { class: 'modal-artifact-form-content' });

    // Header
    var header = _i.dom('div', { class: 'modal-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } });
    header.appendChild(_i.dom('h3', { class: 'modal-title', text: 'Создание: ' + typeLabel }));
    var closeBtn = _i.dom('button', { class: 'modal-close-btn', 'aria-label': 'Закрыть', html: ICONS.close });
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Form
    var form = _i.dom('form', { class: 'artifact-form', novalidate: 'novalidate' });

    // Title field (common)
    var titleWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    titleWrap.appendChild(_i.dom('label', { class: 'form-label', for: 'art-title', text: 'Название *', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var titleInput = _i.dom('input', {
      type: 'text', id: 'art-title', class: 'form-input',
      placeholder: 'Введите название',
      maxlength: String(_i.maxTitle),
      'aria-required': 'true',
      style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
    });
    titleWrap.appendChild(titleInput);
    titleWrap.appendChild(_i.dom('div', { class: 'field-error-message', role: 'alert', id: 'art-title-error', style: { color: '#dc2626', fontSize: '13px', marginTop: '4px', display: 'none' } }));
    form.appendChild(titleWrap);

    // Description / content field (common, depends on type)
    var descLabel = type === 'bug_report' ? 'Описание' : type === 'checklist' ? 'Описание' : 'Описание';
    var descWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    descWrap.appendChild(_i.dom('label', { class: 'form-label', for: 'art-desc', text: descLabel, style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var descTextarea = _i.dom('textarea', {
      id: 'art-desc', class: 'form-textarea',
      placeholder: 'Детальное описание',
      maxlength: String(_i.maxDescription),
      rows: '5',
      style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }
    });
    descWrap.appendChild(descTextarea);
    form.appendChild(descWrap);

    // Type-specific fields
    if (type === 'bug_report') {
      // Steps
      var stepsWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
      stepsWrap.appendChild(_i.dom('label', { class: 'form-label', text: 'Шаги воспроизведения', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
      var stepsList = _i.dom('div', { class: 'steps-list', style: { display: 'flex', flexDirection: 'column', gap: '8px' } });

      function _renderPromptSteps() {
        stepsList.innerHTML = '';
        var steps = structure.steps || [''];
        steps.forEach(function (step, idx) {
          var row = _i.dom('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } });
          row.appendChild(_i.dom('span', { style: { fontWeight: '600', color: '#64748b', minWidth: '24px' }, text: (idx + 1) + '.' }));
          var stepInput = _i.dom('input', {
            type: 'text', class: 'form-input step-input',
            placeholder: 'Шаг ' + (idx + 1),
            value: _i.escapeHtml(step || ''),
            style: { flex: '1', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
          });
          stepInput.addEventListener('input', function (e) { structure.steps[idx] = e.target.value; });
          if (steps.length > 1) {
            var removeBtn = _i.dom('button', {
              type: 'button', class: 'btn-icon',
              'aria-label': 'Удалить шаг',
              html: ICONS.trash,
              style: { border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }
            });
            removeBtn.addEventListener('click', function () {
              structure.steps.splice(idx, 1);
              _renderPromptSteps();
            });
            row.appendChild(removeBtn);
          }
          stepsList.appendChild(row);
        });
      }
      _renderPromptSteps();

      var addStepBtn = _i.dom('button', {
        type: 'button', class: 'btn btn-outline btn-sm',
        style: { marginTop: '8px' },
        html: ICONS.add + ' <span>Добавить шаг</span>'
      });
      addStepBtn.addEventListener('click', function () {
        if (!structure.steps) structure.steps = [];
        structure.steps.push('');
        _renderPromptSteps();
      });

      stepsWrap.appendChild(stepsList);
      stepsWrap.appendChild(addStepBtn);
      form.appendChild(stepsWrap);

      // Severity & Priority
      var spRow = _i.dom('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px' } });

      var sevWrap = _i.dom('div', { style: { flex: '1' } });
      sevWrap.appendChild(_i.dom('label', { for: 'art-severity', text: 'Severity', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
      var sevSelect = _i.dom('select', { id: 'art-severity', class: 'form-select', style: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' } });
      [['blocker', 'Блокер'], ['critical', 'Критичный'], ['major', 'Значительный'], ['minor', 'Незначительный'], ['trivial', 'Тривиальный']].forEach(function (s) {
        var opt = _i.dom('option', { value: s[0], text: s[1] });
        if (structure.severity === s[0]) opt.selected = true;
        sevSelect.appendChild(opt);
      });
      sevWrap.appendChild(sevSelect);
      spRow.appendChild(sevWrap);

      var priWrap = _i.dom('div', { style: { flex: '1' } });
      priWrap.appendChild(_i.dom('label', { for: 'art-priority', text: 'Priority', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
      var priSelect = _i.dom('select', { id: 'art-priority', class: 'form-select', style: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' } });
      [['low', 'Низкий'], ['medium', 'Средний'], ['high', 'Высокий'], ['urgent', 'Срочный']].forEach(function (p) {
        var opt = _i.dom('option', { value: p[0], text: p[1] });
        if (structure.priority === p[0]) opt.selected = true;
        priSelect.appendChild(opt);
      });
      priWrap.appendChild(priSelect);
      spRow.appendChild(priWrap);

      form.appendChild(spRow);
    }

    // Buttons
    var btnRow = _i.dom('div', { class: 'modal-footer', style: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' } });
    var cancelBtn = _i.dom('button', { type: 'button', class: 'btn btn-outline', text: 'Отмена' });
    var saveBtn = _i.dom('button', { type: 'submit', class: 'btn btn-primary', text: 'Создать' });
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    form.appendChild(btnRow);

    content.appendChild(form);

    var modal = _i.createDynamicModal(modalId, content, { size: 'md' });

    // Form submit
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var titleVal = titleInput.value.trim();
      if (!titleVal) {
        var titleErr = document.getElementById('art-title-error');
        if (titleErr) {
          titleErr.textContent = 'Название обязательно';
          titleErr.style.display = 'block';
        }
        titleInput.setAttribute('aria-invalid', 'true');
        titleInput.classList.add('field-error');
        titleInput.focus();
        return;
      }

      // Update structure from form
      if (type === 'bug_report') {
        structure.summary = titleVal;
        structure.description = descTextarea.value;
        structure.severity = sevSelect.value;
        structure.priority = priSelect.value;
      } else if (type === 'test_case' || type === 'checklist' || type === 'test_plan' || type === 'api_test') {
        structure.title = titleVal;
        structure.description = descTextarea.value;
      }

      // Create artifact
      var now = new Date().toISOString();
      var artifact = {
        id: _i.generateId(),
        type: type,
        title: titleVal,
        data: structure,
        tags: [],
        createdAt: now,
        updatedAt: now,
        lessonId: null
      };

      // Save to storage
      var artifacts = Utils.storage.get(keys.ARTIFACTS) || [];
      artifacts.push(artifact);
      Utils.storage.set(keys.ARTIFACTS, artifacts);

      _i.showToast('Артефакт создан', 'success');

      _i.closeDynamicModal(modal);

      if (window.QAApp && typeof QAApp.emit === 'function') {
        QAApp.emit('artifact:created', artifact);
      }

      if (window.App && App.markUnsaved) App.markUnsaved();
    });

    cancelBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });
    closeBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });

    _i.openDynamicModal(modal);
  }

  // ----------------------------------------------------------------
  // SHOWPORTFOLIOEDITOR — РЕДАКТОР ЭЛЕМЕНТА ПОРТФОЛИО
  // ----------------------------------------------------------------

  Forms.showPortfolioEditor = function (item) {
    var isNew = !item || !item.id;
    var modalId = 'forms-portfolio-editor-' + _i.generateId();
    var keys = _i.getKeys();

    var content = _i.dom('div', { class: 'modal-portfolio-editor-content' });

    // Header
    var header = _i.dom('div', { class: 'modal-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } });
    header.appendChild(_i.dom('h3', { class: 'modal-title', text: isNew ? 'Новый проект' : 'Редактирование проекта' }));
    var closeBtn = _i.dom('button', { class: 'modal-close-btn', 'aria-label': 'Закрыть', html: ICONS.close });
    header.appendChild(closeBtn);
    content.appendChild(header);

    var form = _i.dom('form', { class: 'portfolio-form', novalidate: 'novalidate' });

    // Title
    var titleWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    titleWrap.appendChild(_i.dom('label', { for: 'pf-title', text: 'Название *', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var titleInput = _i.dom('input', {
      type: 'text', id: 'pf-title', class: 'form-input',
      placeholder: 'Название проекта',
      maxlength: String(_i.maxTitle),
      'aria-required': 'true',
      value: _i.escapeHtml(item && item.title || ''),
      style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
    });
    titleWrap.appendChild(titleInput);
    titleWrap.appendChild(_i.dom('div', { id: 'pf-title-error', role: 'alert', style: { color: '#dc2626', fontSize: '13px', marginTop: '4px', display: 'none' } }));
    form.appendChild(titleWrap);

    // Description
    var descWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    descWrap.appendChild(_i.dom('label', { for: 'pf-desc', text: 'Описание', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var descTextarea = _i.dom('textarea', {
      id: 'pf-desc', class: 'form-textarea',
      placeholder: 'Описание проекта',
      maxlength: String(_i.maxDescription),
      rows: '4',
      style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical' }
    });
    descTextarea.value = (item && item.description) || '';
    descWrap.appendChild(descTextarea);
    form.appendChild(descWrap);

    // Category & Status row
    var catStatusRow = _i.dom('div', { style: { display: 'flex', gap: '12px', marginBottom: '16px' } });

    var catWrap = _i.dom('div', { style: { flex: '1' } });
    catWrap.appendChild(_i.dom('label', { for: 'pf-category', text: 'Категория', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var catSelect = _i.dom('select', { id: 'pf-category', class: 'form-select', style: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' } });
    [['project', 'Проект'], ['assignment', 'Задание'], ['research', 'Исследование'], ['case_study', 'Кейс-стади'], ['other', 'Другое']].forEach(function (c) {
      var opt = _i.dom('option', { value: c[0], text: c[1] });
      if (item && item.category === c[0]) opt.selected = true;
      catSelect.appendChild(opt);
    });
    catWrap.appendChild(catSelect);
    catStatusRow.appendChild(catWrap);

    var statusWrap = _i.dom('div', { style: { flex: '1' } });
    statusWrap.appendChild(_i.dom('label', { for: 'pf-status', text: 'Статус', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var statusSelect = _i.dom('select', { id: 'pf-status', class: 'form-select', style: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' } });
    [['draft', 'Черновик'], ['published', 'Опубликован'], ['archived', 'Архив']].forEach(function (s) {
      var opt = _i.dom('option', { value: s[0], text: s[1] });
      if (item && item.status === s[0]) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusWrap.appendChild(statusSelect);
    catStatusRow.appendChild(statusWrap);

    form.appendChild(catStatusRow);

    // Link
    var linkWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    linkWrap.appendChild(_i.dom('label', { for: 'pf-link', text: 'Ссылка (опционально)', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var linkInput = _i.dom('input', {
      type: 'url', id: 'pf-link', class: 'form-input',
      placeholder: 'https://example.com',
      value: _i.escapeHtml(item && item.link || ''),
      style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
    });
    linkWrap.appendChild(linkInput);
    linkWrap.appendChild(_i.dom('div', { id: 'pf-link-error', role: 'alert', style: { color: '#dc2626', fontSize: '13px', marginTop: '4px', display: 'none' } }));
    form.appendChild(linkWrap);

    // Tags
    var tagsWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    tagsWrap.appendChild(_i.dom('label', { for: 'pf-tags', text: 'Теги', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var tagsInput = _i.dom('input', {
      type: 'text', id: 'pf-tags', class: 'form-input',
      placeholder: 'Введите теги через запятую',
      value: (item && item.tags && item.tags.join(', ')) || '',
      style: { width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
    });
    tagsWrap.appendChild(tagsInput);
    form.appendChild(tagsWrap);

    // Buttons
    var btnRow = _i.dom('div', { class: 'modal-footer', style: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' } });
    var cancelBtn = _i.dom('button', { type: 'button', class: 'btn btn-outline', text: 'Отмена' });
    var saveBtn = _i.dom('button', { type: 'submit', class: 'btn btn-primary', text: isNew ? 'Создать' : 'Сохранить' });
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    form.appendChild(btnRow);

    content.appendChild(form);

    var modal = _i.createDynamicModal(modalId, content, { size: 'md' });

    // Submit
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var hasErrors = false;

      // Validate title
      var titleVal = titleInput.value.trim();
      if (!titleVal) {
        var titleErr = document.getElementById('pf-title-error');
        titleErr.textContent = 'Название обязательно';
        titleErr.style.display = 'block';
        titleInput.setAttribute('aria-invalid', 'true');
        titleInput.style.borderColor = '#dc2626';
        hasErrors = true;
      } else {
        document.getElementById('pf-title-error').style.display = 'none';
        titleInput.removeAttribute('aria-invalid');
        titleInput.style.borderColor = '';
      }

      // Validate link if present
      var linkVal = linkInput.value.trim();
      if (linkVal) {
        var isUrl = Utils.validate && Utils.validate.isUrl ? Utils.validate.isUrl(linkVal) : /^https?:\/\/.+/.test(linkVal);
        if (!isUrl) {
          var linkErr = document.getElementById('pf-link-error');
          linkErr.textContent = 'Невалидный URL';
          linkErr.style.display = 'block';
          linkInput.setAttribute('aria-invalid', 'true');
          linkInput.style.borderColor = '#dc2626';
          hasErrors = true;
        } else {
          document.getElementById('pf-link-error').style.display = 'none';
          linkInput.removeAttribute('aria-invalid');
          linkInput.style.borderColor = '';
        }
      }

      if (hasErrors) {
        var firstError = form.querySelector('[aria-invalid="true"]');
        if (firstError) firstError.focus();
        return;
      }

      // Parse tags
      var tagsArr = tagsInput.value.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t.length > 0; });

      var now = new Date().toISOString();

      var portfolioItem = {
        id: isNew ? _i.generateId() : item.id,
        title: titleVal,
        description: descTextarea.value.trim(),
        category: catSelect.value,
        status: statusSelect.value,
        link: linkVal,
        tags: tagsArr,
        createdAt: isNew ? now : (item.createdAt || now),
        updatedAt: now
      };

      // Save to storage
      var portfolioItems = Utils.storage.get(keys.PORTFOLIO_ITEMS) || [];
      if (isNew) {
        portfolioItems.push(portfolioItem);
      } else {
        var found = false;
        for (var i = 0; i < portfolioItems.length; i++) {
          if (portfolioItems[i].id === portfolioItem.id) {
            portfolioItems[i] = portfolioItem;
            found = true;
            break;
          }
        }
        if (!found) portfolioItems.push(portfolioItem);
      }
      Utils.storage.set(keys.PORTFOLIO_ITEMS, portfolioItems);

      _i.showToast('Проект сохранён', 'success');
      _i.closeDynamicModal(modal);

      if (window.QAApp && typeof QAApp.emit === 'function') {
        QAApp.emit('portfolio:updated', portfolioItem);
      }

      if (window.App && App.markUnsaved) App.markUnsaved();

      // Перерендерить страницу portfolio
      if (window.App && App.router && App.state && App.state.currentRoute === 'portfolio') {
        App.router.navigate('portfolio', { force: true });
      } else if (window.QAApp && QAApp.pages && QAApp.pages.portfolio) {
        QAApp.pages.portfolio();
      }
    });

    cancelBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });
    closeBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });

    _i.openDynamicModal(modal);
  };

})();
/* ЧАСТЬ 3 из 4: showTagManager, showQuickNote, initTagAutocomplete */

(function () {
  'use strict';

  var Forms = window.Forms;
  if (!Forms) return;
  var _i = Forms._internal;
  var ICONS = _i.icons;
  var TAG_COLORS = _i.tagColors;

  // ----------------------------------------------------------------
  // SHOWTAGMANAGER — МЕНЕДЖЕР ТЕГОВ
  // ----------------------------------------------------------------

  Forms.showTagManager = function () {
    var modalId = 'forms-tag-manager-' + _i.generateId();
    var keys = _i.getKeys();

    var content = _i.dom('div', { class: 'modal-tag-manager-content' });

    // Header
    var header = _i.dom('div', { class: 'modal-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } });
    header.appendChild(_i.dom('h3', { class: 'modal-title', text: 'Менеджер тегов' }));
    var closeBtn = _i.dom('button', { class: 'modal-close-btn', 'aria-label': 'Закрыть', html: ICONS.close });
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Tags list
    var tagsListWrap = _i.dom('div', { class: 'tag-manager-list-wrap' });

    // Add form
    var addForm = _i.dom('div', { class: 'tag-manager-add-form', style: { marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' } });

    addForm.appendChild(_i.dom('label', { for: 'tm-new-tag', text: 'Новый тег', style: { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' } }));

    var inputRow = _i.dom('div', { style: { display: 'flex', gap: '8px', marginBottom: '12px' } });

    var newTagInput = _i.dom('input', {
      type: 'text', id: 'tm-new-tag', class: 'form-input',
      placeholder: 'Название тега (1-' + _i.maxTagLength + ' симв.)',
      maxlength: String(_i.maxTagLength),
      style: { flex: '1', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
    });
    inputRow.appendChild(newTagInput);

    var addBtn = _i.dom('button', {
      class: 'btn btn-primary',
      text: 'Добавить',
      style: { padding: '8px 16px', whiteSpace: 'nowrap' }
    });
    inputRow.appendChild(addBtn);

    addForm.appendChild(inputRow);

    // Color picker
    addForm.appendChild(_i.dom('div', { text: 'Цвет:', style: { fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#64748b' } }));

    var colorPicker = _i.dom('div', {
      class: 'tag-color-picker',
      style: { display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }
    });

    var selectedColor = 1;

    TAG_COLORS.forEach(function (color, idx) {
      var colorBtn = _i.dom('button', {
        type: 'button',
        class: 'tag-color-option',
        'aria-label': 'Цвет ' + (idx + 1),
        'data-color': String(idx + 1),
        style: {
          width: '28px', height: '28px', borderRadius: '50%',
          background: color, border: idx + 1 === selectedColor ? '3px solid #1e293b' : '2px solid transparent',
          cursor: 'pointer', padding: '0', transition: 'border 0.2s, transform 0.2s'
        }
      });
      colorBtn.addEventListener('click', function () {
        selectedColor = idx + 1;
        colorPicker.querySelectorAll('.tag-color-option').forEach(function (b) {
          b.style.border = '2px solid transparent';
        });
        colorBtn.style.border = '3px solid #1e293b';
        colorBtn.style.transform = 'scale(1.15)';
      });
      colorBtn.addEventListener('mouseenter', function () {
        if (idx + 1 !== selectedColor) colorBtn.style.transform = 'scale(1.1)';
      });
      colorBtn.addEventListener('mouseleave', function () {
        if (idx + 1 !== selectedColor) colorBtn.style.transform = '';
      });
      colorPicker.appendChild(colorBtn);
    });

    addForm.appendChild(colorPicker);

    var addError = _i.dom('div', { role: 'alert', style: { color: '#dc2626', fontSize: '13px', marginTop: '4px', display: 'none' } });
    addForm.appendChild(addError);

    content.appendChild(addForm);

    // Tags list
    content.appendChild(_i.dom('div', { text: 'Существующие теги', style: { fontWeight: '600', fontSize: '14px', marginBottom: '8px' } }));

    var tagsList = _i.dom('div', {
      role: 'list',
      class: 'tag-manager-list',
      style: { maxHeight: '400px', overflowY: 'auto' }
    });

    content.appendChild(tagsList);

    var modal = _i.createDynamicModal(modalId, content, { size: 'md' });

    // Render tags function
    function _renderTags() {
      var tags = Utils.storage.get(keys.TAGS) || [];
      if (!Array.isArray(tags)) tags = [];

      tagsList.innerHTML = '';

      if (tags.length === 0) {
        tagsList.appendChild(_i.dom('p', {
          style: { color: '#94a3b8', textAlign: 'center', padding: '20px', fontSize: '14px' },
          text: 'Тегов пока нет. Добавьте первый тег выше.'
        }));
        return;
      }

      // Get usage counts
      var artifacts = Utils.storage.get(keys.ARTIFACTS) || [];
      var notes = Utils.storage.get(keys.NOTES) || [];
      var portfolioItems = Utils.storage.get(keys.PORTFOLIO_ITEMS) || [];

      tags.forEach(function (tag) {
        var tagId = tag.id || tag.name;
        var tagName = tag.name || tag;
        var tagColor = tag.color || 1;
        var colorHex = TAG_COLORS[tagColor - 1] || TAG_COLORS[0];

        // Count usage
        var usageCount = 0;
        artifacts.forEach(function (a) {
          if (a.tags && a.tags.indexOf(tagName) !== -1) usageCount++;
        });
        if (Array.isArray(notes)) {
          notes.forEach(function (n) {
            if (n.tags && n.tags.indexOf(tagName) !== -1) usageCount++;
          });
        }
        if (Array.isArray(portfolioItems)) {
          portfolioItems.forEach(function (p) {
            if (p.tags && p.tags.indexOf(tagName) !== -1) usageCount++;
          });
        }

        var row = _i.dom('div', {
          role: 'listitem',
          class: 'tag-manager-row',
          style: {
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderBottom: '1px solid #e2e8f0',
            transition: 'background 0.15s'
          }
        });

        // Color indicator
        row.appendChild(_i.dom('div', {
          style: { width: '14px', height: '14px', borderRadius: '50%', background: colorHex, flexShrink: '0' }
        }));

        // Name
        row.appendChild(_i.dom('span', {
          style: { flex: '1', fontWeight: '500', fontSize: '14px' },
          text: tagName
        }));

        // Usage count
        row.appendChild(_i.dom('span', {
          style: { fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' },
          text: 'Исп.: ' + usageCount
        }));

        // Rename button
        var renameBtn = _i.dom('button', {
          class: 'btn-icon',
          'aria-label': 'Переименовать тег «' + tagName + '»',
          title: 'Переименовать',
          html: ICONS.edit,
          style: { border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }
        });
        renameBtn.addEventListener('click', function () {
          Forms.showPrompt({
            title: 'Переименование тега',
            message: 'Введите новое название для тега «' + tagName + '»:',
            defaultValue: tagName,
            validate: function (value) {
              var v = value.trim();
              if (!v) return { valid: false, message: 'Название не может быть пустым' };
              if (v.length > _i.maxTagLength) return { valid: false, message: 'Максимум ' + _i.maxTagLength + ' символов' };
              if (v !== tagName) {
                var existing = tags.filter(function (t) { return (t.name || t) === v; });
                if (existing.length > 0) return { valid: false, message: 'Тег с таким названием уже существует' };
              }
              return { valid: true };
            }
          }).then(function (newName) {
            newName = newName.trim();
            // Update tag in storage
            for (var i = 0; i < tags.length; i++) {
              if ((tags[i].name || tags[i]) === tagName) {
                tags[i].name = newName;
                break;
              }
            }
            Utils.storage.set(keys.TAGS, tags);

            // Update in all artifacts
            _updateTagNameInArtifacts(tagName, newName);

            // Update in notes
            _updateTagNameInNotes(tagName, newName);

            // Update in portfolio items
            _updateTagNameInPortfolio(tagName, newName);

            _i.showToast('Тег переименован', 'success');
            _renderTags();
          }).catch(function () { /* cancelled */ });
        });
        row.appendChild(renameBtn);

        // Color change button
        var colorBtn = _i.dom('button', {
          class: 'btn-icon',
          'aria-label': 'Изменить цвет тега «' + tagName + '»',
          title: 'Изменить цвет',
          html: ICONS.palette,
          style: { border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }
        });
        colorBtn.addEventListener('click', function () {
          _showColorPickerModal(tagName, tagColor, function (newColor) {
            // Update tag color
            for (var i = 0; i < tags.length; i++) {
              if ((tags[i].name || tags[i]) === tagName) {
                tags[i].color = newColor;
                break;
              }
            }
            Utils.storage.set(keys.TAGS, tags);
            _i.showToast('Цвет тега изменён', 'success');
            _renderTags();
          });
        });
        row.appendChild(colorBtn);

        // Delete button
        var deleteBtn = _i.dom('button', {
          class: 'btn-icon',
          'aria-label': 'Удалить тег «' + tagName + '»',
          title: 'Удалить',
          html: ICONS.trash,
          style: { border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', padding: '4px' }
        });
        deleteBtn.addEventListener('click', function () {
          Forms.confirm({
            title: 'Удалить тег?',
            message: 'Тег «' + tagName + '» будет удалён из всех артефактов, заметок и проектов. Действие необратимо.',
            confirmText: 'Удалить',
            cancelText: 'Отмена',
            confirmType: 'danger'
          }).then(function () {
            // Remove from tags
            tags = tags.filter(function (t) { return (t.name || t) !== tagName; });
            Utils.storage.set(keys.TAGS, tags);

            // Remove from all artifacts
            _removeTagFromArtifacts(tagName);

            // Remove from notes
            _removeTagFromNotes(tagName);

            // Remove from portfolio
            _removeTagFromPortfolio(tagName);

            _i.showToast('Тег удалён', 'info');
            _renderTags();
          }).catch(function () { /* cancelled */ });
        });
        row.appendChild(deleteBtn);

        tagsList.appendChild(row);
      });
    }

    // Tag management helper functions
    function _updateTagNameInArtifacts(oldName, newName) {
      var artifacts = Utils.storage.get(keys.ARTIFACTS) || [];
      var changed = false;
      artifacts.forEach(function (a) {
        if (a.tags) {
          var idx = a.tags.indexOf(oldName);
          if (idx !== -1) {
            a.tags[idx] = newName;
            changed = true;
          }
        }
      });
      if (changed) Utils.storage.set(keys.ARTIFACTS, artifacts);
    }

    function _updateTagNameInNotes(oldName, newName) {
      var notes = Utils.storage.get(keys.NOTES) || [];
      var changed = false;
      notes.forEach(function (n) {
        if (n.tags) {
          var idx = n.tags.indexOf(oldName);
          if (idx !== -1) {
            n.tags[idx] = newName;
            changed = true;
          }
        }
      });
      if (changed) Utils.storage.set(keys.NOTES, notes);
    }

    function _updateTagNameInPortfolio(oldName, newName) {
      var items = Utils.storage.get(keys.PORTFOLIO_ITEMS) || [];
      var changed = false;
      items.forEach(function (p) {
        if (p.tags) {
          var idx = p.tags.indexOf(oldName);
          if (idx !== -1) {
            p.tags[idx] = newName;
            changed = true;
          }
        }
      });
      if (changed) Utils.storage.set(keys.PORTFOLIO_ITEMS, items);
    }

    function _removeTagFromArtifacts(tagName) {
      var artifacts = Utils.storage.get(keys.ARTIFACTS) || [];
      var changed = false;
      artifacts.forEach(function (a) {
        if (a.tags) {
          var idx = a.tags.indexOf(tagName);
          if (idx !== -1) {
            a.tags.splice(idx, 1);
            changed = true;
          }
        }
      });
      if (changed) Utils.storage.set(keys.ARTIFACTS, artifacts);
    }

    function _removeTagFromNotes(tagName) {
      var notes = Utils.storage.get(keys.NOTES) || [];
      var changed = false;
      notes.forEach(function (n) {
        if (n.tags) {
          var idx = n.tags.indexOf(tagName);
          if (idx !== -1) {
            n.tags.splice(idx, 1);
            changed = true;
          }
        }
      });
      if (changed) Utils.storage.set(keys.NOTES, notes);
    }

    function _removeTagFromPortfolio(tagName) {
      var items = Utils.storage.get(keys.PORTFOLIO_ITEMS) || [];
      var changed = false;
      items.forEach(function (p) {
        if (p.tags) {
          var idx = p.tags.indexOf(tagName);
          if (idx !== -1) {
            p.tags.splice(idx, 1);
            changed = true;
          }
        }
      });
      if (changed) Utils.storage.set(keys.PORTFOLIO_ITEMS, items);
    }

    function _showColorPickerModal(tagName, currentColor, callback) {
      var pickerId = 'forms-color-picker-' + _i.generateId();
      var pickerContent = _i.dom('div', { style: { textAlign: 'center' } });

      pickerContent.appendChild(_i.dom('h3', { class: 'modal-title', text: 'Выбор цвета для «' + tagName + '»', style: { marginBottom: '20px' } }));

      var colorGrid = _i.dom('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '20px' } });

      var tempColor = currentColor;

      TAG_COLORS.forEach(function (color, idx) {
        var btn = _i.dom('button', {
          type: 'button',
          style: {
            width: '40px', height: '40px', borderRadius: '50%',
            background: color,
            border: idx + 1 === currentColor ? '4px solid #1e293b' : '2px solid transparent',
            cursor: 'pointer', padding: '0', transition: 'border 0.2s, transform 0.2s'
          },
          'aria-label': 'Цвет ' + (idx + 1)
        });
        btn.addEventListener('click', function () {
          tempColor = idx + 1;
          colorGrid.querySelectorAll('button').forEach(function (b) { b.style.border = '2px solid transparent'; });
          btn.style.border = '4px solid #1e293b';
          btn.style.transform = 'scale(1.15)';
        });
        colorGrid.appendChild(btn);
      });

      pickerContent.appendChild(colorGrid);

      var okBtn = _i.dom('button', { class: 'btn btn-primary', text: 'Выбрать', style: { minWidth: '120px' } });
      pickerContent.appendChild(okBtn);

      var pickerModal = _i.createDynamicModal(pickerId, pickerContent, { size: 'sm' });

      okBtn.addEventListener('click', function () {
        _i.closeDynamicModal(pickerModal);
        callback(tempColor);
      });

      _i.openDynamicModal(pickerModal);
    }

    // Add new tag
    function _addTag() {
      var name = newTagInput.value.trim();
      addError.style.display = 'none';

      if (!name) {
        addError.textContent = 'Введите название тега';
        addError.style.display = 'block';
        return;
      }
      if (name.length > _i.maxTagLength) {
        addError.textContent = 'Максимум ' + _i.maxTagLength + ' символов';
        addError.style.display = 'block';
        return;
      }

      var tags = Utils.storage.get(keys.TAGS) || [];
      if (!Array.isArray(tags)) tags = [];

      // Check uniqueness
      var exists = tags.some(function (t) {
        return (t.name || t) === name;
      });
      if (exists) {
        addError.textContent = 'Тег с таким названием уже существует';
        addError.style.display = 'block';
        return;
      }

      tags.push({
        id: _i.generateId(),
        name: name,
        color: selectedColor
      });

      Utils.storage.set(keys.TAGS, tags);

      newTagInput.value = '';
      selectedColor = 1;
      colorPicker.querySelectorAll('.tag-color-option').forEach(function (b, idx) {
        b.style.border = idx === 0 ? '3px solid #1e293b' : '2px solid transparent';
      });

      _i.showToast('Тег добавлен', 'success');
      _renderTags();
    }

    addBtn.addEventListener('click', _addTag);
    newTagInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        _addTag();
      }
    });

    closeBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });

    _renderTags();
    _i.openDynamicModal(modal);
  };

  // ----------------------------------------------------------------
  // SHOWQUICKNOTE — БЫСТРАЯ ЗАМЕТКА
  // ----------------------------------------------------------------

  Forms.showQuickNote = function () {
    var modalId = 'forms-quick-note-' + _i.generateId();
    var keys = _i.getKeys();

    var content = _i.dom('div', { class: 'modal-quick-note-content' });

    // Header
    var header = _i.dom('div', { class: 'modal-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } });
    header.appendChild(_i.dom('h3', { class: 'modal-title', text: 'Быстрая заметка' }));
    var closeBtn = _i.dom('button', { class: 'modal-close-btn', 'aria-label': 'Закрыть', html: ICONS.close });
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Textarea
    var textareaWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '12px' } });

    var textarea = _i.dom('textarea', {
      class: 'form-textarea',
      placeholder: 'Введите текст заметки...',
      maxlength: String(_i.maxNoteLength),
      rows: '8',
      'aria-label': 'Текст заметки',
      style: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', lineHeight: '1.6', resize: 'vertical' }
    });
    textareaWrap.appendChild(textarea);

    // Character counter
    var counter = _i.dom('div', {
      class: 'char-counter',
      style: { textAlign: 'right', fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
      text: _i.maxNoteLength + ' симв. осталось'
    });
    textarea.addEventListener('input', function (e) {
      var remaining = _i.maxNoteLength - e.target.value.length;
      counter.textContent = remaining + ' симв. осталось';
      if (remaining < 100) {
        counter.style.color = '#f97316';
      } else {
        counter.style.color = '#94a3b8';
      }
    });
    textareaWrap.appendChild(counter);

    content.appendChild(textareaWrap);

    // Tags field
    var tagsWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    tagsWrap.appendChild(_i.dom('label', { for: 'qn-tags', text: 'Теги', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));

    // Tags display + input
    var tagsDisplay = _i.dom('div', { class: 'tags-display', style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' } });
    tagsWrap.appendChild(tagsDisplay);

    var tagsInput = _i.dom('input', {
      type: 'text', id: 'qn-tags', class: 'form-input',
      placeholder: 'Введите тег и нажмите Enter',
      style: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
    });
    tagsWrap.appendChild(tagsInput);

    content.appendChild(tagsWrap);

    // Error
    var errorEl = _i.dom('div', { role: 'alert', style: { color: '#dc2626', fontSize: '13px', marginBottom: '8px', display: 'none' } });
    content.appendChild(errorEl);

    // Buttons
    var btnRow = _i.dom('div', { class: 'modal-footer', style: { display: 'flex', justifyContent: 'flex-end', gap: '12px' } });
    var cancelBtn = _i.dom('button', { class: 'btn btn-outline', text: 'Отмена' });
    var saveBtn = _i.dom('button', { class: 'btn btn-primary', text: 'Сохранить' });
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    content.appendChild(btnRow);

    // Hint
    content.appendChild(_i.dom('div', {
      style: { textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '12px' },
      text: 'Ctrl+Enter — сохранить, Esc — отмена'
    }));

    var modal = _i.createDynamicModal(modalId, content, { size: 'md' });

    // Tags management
    var selectedTags = [];

    function _renderNoteTags() {
      tagsDisplay.innerHTML = '';
      selectedTags.forEach(function (tag, idx) {
        var chip = _i.dom('span', {
          class: 'tag-chip',
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', background: '#3b82f6', color: '#fff', fontSize: '13px' }
        });
        chip.appendChild(_i.dom('span', { text: tag }));
        var removeBtn = _i.dom('button', {
          type: 'button',
          'aria-label': 'Удалить тег ' + tag,
          style: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0', fontSize: '14px', lineHeight: '1' },
          text: '×'
        });
        removeBtn.addEventListener('click', function () {
          selectedTags.splice(idx, 1);
          _renderNoteTags();
        });
        chip.appendChild(removeBtn);
        tagsDisplay.appendChild(chip);
      });
    }

    // Get existing tags for autocomplete
    var allTags = [];
    var storedTags = Utils.storage.get(keys.TAGS) || [];
    if (Array.isArray(storedTags)) {
      allTags = storedTags.map(function (t) { return t.name || t; });
    }

    // Tag input handlers
    tagsInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var val = tagsInput.value.trim().replace(/,/g, '');
        if (val && selectedTags.indexOf(val) === -1) {
          selectedTags.push(val);
          _renderNoteTags();
        }
        tagsInput.value = '';
      } else if (e.key === 'Backspace' && tagsInput.value === '' && selectedTags.length > 0) {
        selectedTags.pop();
        _renderNoteTags();
      }
    });

    // Save note
    function _saveNote() {
      var text = textarea.value.trim();

      if (!text) {
        errorEl.textContent = 'Заметка не может быть пустой';
        errorEl.style.display = 'block';
        textarea.focus();
        return;
      }

      errorEl.style.display = 'none';

      var note = {
        id: _i.generateId(),
        text: text,
        tags: selectedTags.slice(),
        createdAt: new Date().toISOString()
      };

      var notes = Utils.storage.get(keys.NOTES) || [];
      if (!Array.isArray(notes)) notes = [];
      notes.push(note);
      Utils.storage.set(keys.NOTES, notes);

      // Save new tags to global tags if they don't exist
      var globalTags = Utils.storage.get(keys.TAGS) || [];
      if (!Array.isArray(globalTags)) globalTags = [];
      selectedTags.forEach(function (tagName) {
        var exists = globalTags.some(function (t) { return (t.name || t) === tagName; });
        if (!exists) {
          globalTags.push({ id: _i.generateId(), name: tagName, color: 1 });
        }
      });
      Utils.storage.set(keys.TAGS, globalTags);

      _i.showToast('Заметка сохранена', 'success');
      _i.closeDynamicModal(modal);

      if (window.QAApp && typeof QAApp.emit === 'function') {
        QAApp.emit('note:created', note);
      }

      if (window.App && App.markUnsaved) App.markUnsaved();
    }

    saveBtn.addEventListener('click', _saveNote);
    cancelBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });
    closeBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });

    // Ctrl+Enter to save
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        _saveNote();
      }
    });

    _i.openDynamicModal(modal);

    // Focus textarea
    setTimeout(function () {
      textarea.focus();
    }, 300);
  };

  // ----------------------------------------------------------------
  // INITTAGAUTOCOMPLETE — АВТОДОПОЛНЕНИЕ ТЕГОВ
  // ----------------------------------------------------------------

  Forms.initTagAutocomplete = function (input, existingTags) {
    if (!input) return { getTags: function () { return []; }, destroy: function () {} };

    var tags = [];
    var allTags = Array.isArray(existingTags) ? existingTags.slice() : [];
    var debounceTimer = null;
    var dropdown = null;

    // Tags display (chips)
    var chipsContainer = null;

    // Find or create chips container
    var parent = input.parentNode;
    chipsContainer = parent.querySelector('.tags-chips-display');
    if (!chipsContainer) {
      chipsContainer = _i.dom('div', {
        class: 'tags-chips-display',
        style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px', minHeight: '0' }
      });
      parent.insertBefore(chipsContainer, input);
    }

    function _renderChips() {
      if (!chipsContainer) return;
      chipsContainer.innerHTML = '';
      tags.forEach(function (tag, idx) {
        var chip = _i.dom('span', {
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '12px', background: '#3b82f6', color: '#fff', fontSize: '13px' }
        });
        chip.appendChild(_i.dom('span', { text: tag }));
        var rmBtn = _i.dom('button', {
          type: 'button',
          'aria-label': 'Удалить тег ' + tag,
          style: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0', fontSize: '14px' },
          text: '×'
        });
        rmBtn.addEventListener('click', function () {
          tags.splice(idx, 1);
          _renderChips();
        });
        chip.appendChild(rmBtn);
        chipsContainer.appendChild(chip);
      });
    }

    function _createDropdown() {
      if (dropdown) return dropdown;

      dropdown = _i.dom('div', {
        class: 'tag-autocomplete-dropdown',
        role: 'listbox',
        style: {
          position: 'absolute',
          zIndex: '9999',
          background: '#fff',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: '200px',
          overflowY: 'auto',
          display: 'none',
          minWidth: '200px'
        }
      });

      document.body.appendChild(dropdown);

      // Click outside to close
      document.addEventListener('click', _onDocClick, true);

      return dropdown;
    }

    function _onDocClick(e) {
      if (dropdown && !dropdown.contains(e.target) && e.target !== input) {
        _hideDropdown();
      }
    }

    function _showDropdown(matches) {
      dropdown = _createDropdown();

      if (!matches || matches.length === 0) {
        _hideDropdown();
        return;
      }

      dropdown.innerHTML = '';

      matches.forEach(function (match) {
        var item = _i.dom('div', {
          role: 'option',
          tabindex: '0',
          style: { padding: '8px 12px', cursor: 'pointer', fontSize: '14px', transition: 'background 0.15s' },
          text: match
        });

        item.addEventListener('mouseenter', function () {
          item.style.background = '#eff6ff';
        });
        item.addEventListener('mouseleave', function () {
          item.style.background = '';
        });

        item.addEventListener('click', function () {
          _addTag(match);
          input.value = '';
          _hideDropdown();
          input.focus();
        });

        item.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            _addTag(match);
            input.value = '';
            _hideDropdown();
            input.focus();
          }
        });

        dropdown.appendChild(item);
      });

      // Position dropdown
      var rect = input.getBoundingClientRect();
      dropdown.style.left = rect.left + 'px';
      dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
      dropdown.style.minWidth = rect.width + 'px';
      dropdown.style.display = 'block';
    }

    function _hideDropdown() {
      if (dropdown) dropdown.style.display = 'none';
    }

    function _addTag(tagName) {
      tagName = tagName.trim();
      if (!tagName) return;
      if (tags.indexOf(tagName) === -1) {
        tags.push(tagName);
        _renderChips();
      }
    }

    // Input event with debounce
    input.addEventListener('input', function (e) {
      var val = e.target.value;

      // Check for comma or space separator
      var sepMatch = val.match(/[,\s]/);
      if (sepMatch) {
        var parts = val.split(/[,\s]+/);
        parts.forEach(function (part) {
          part = part.trim();
          if (part) _addTag(part);
        });
        input.value = '';
        _hideDropdown();
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(function () {
        var query = val.trim().toLowerCase();
        if (!query) {
          _hideDropdown();
          return;
        }

        var matches = allTags.filter(function (t) {
          var tagName = typeof t === 'string' ? t : (t.name || '');
          return tagName.toLowerCase().indexOf(query) !== -1 && tags.indexOf(tagName) === -1;
        }).slice(0, 6);

        // Map to string names
        matches = matches.map(function (t) {
          return typeof t === 'string' ? t : (t.name || '');
        }).filter(function (t) { return t; });

        _showDropdown(matches);
      }, 200);
    });

    // Enter to add tag
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var val = input.value.trim();
        if (val) {
          e.preventDefault();
          _addTag(val);
          input.value = '';
          _hideDropdown();
        }
      } else if (e.key === 'Escape') {
        _hideDropdown();
      } else if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
        tags.pop();
        _renderChips();
      }
    });

    // Initialize dropdown
    _createDropdown();

    // Return API
    return {
      getTags: function () { return tags.slice(); },
      setTags: function (newTags) {
        tags = Array.isArray(newTags) ? newTags.slice() : [];
        _renderChips();
      },
      addTag: _addTag,
      clear: function () {
        tags = [];
        _renderChips();
      },
      destroy: function () {
        if (debounceTimer) clearTimeout(debounceTimer);
        document.removeEventListener('click', _onDocClick, true);
        if (dropdown && dropdown.parentNode) {
          dropdown.parentNode.removeChild(dropdown);
        }
        if (chipsContainer && chipsContainer.parentNode) {
          chipsContainer.parentNode.removeChild(chipsContainer);
        }
      }
    };
  };

})();
/* ЧАСТЬ 4 из 4: Валидация, сериализация, populate, clear, getFieldValue, автоинициализация */

(function () {
  'use strict';

  var Forms = window.Forms;
  if (!Forms) return;
  var _i = Forms._internal;

  // ----------------------------------------------------------------
  // VALIDATEFIELD — ВАЛИДАЦИЯ ОДНОГО ПОЛЯ С UI
  // ----------------------------------------------------------------

  Forms.validateField = function (field, rules) {
    if (!field) return { valid: true, errors: [] };

    var value = Forms.getFieldValue(field);
    var errors = [];

    // Use Utils.validate if available
    if (Utils.validate && Utils.validate.validateField) {
      var result = Utils.validate.validateField(value, rules);
      if (result && !result.valid) {
        errors = result.errors || [result.message || 'Невалидное значение'];
      }
    } else {
      // Manual validation
      if (Array.isArray(rules)) {
        rules.forEach(function (rule) {
          if (rule.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
            errors.push(rule.message || 'Поле обязательно для заполнения');
            return;
          }
          if (value && rule.minLength && String(value).length < rule.minLength) {
            errors.push(rule.message || 'Минимум ' + rule.minLength + ' символов');
          }
          if (value && rule.maxLength && String(value).length > rule.maxLength) {
            errors.push(rule.message || 'Максимум ' + rule.maxLength + ' символов');
          }
          if (value && rule.pattern && !new RegExp(rule.pattern).test(value)) {
            errors.push(rule.message || 'Неверный формат');
          }
          if (value && rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(rule.message || 'Неверный email');
          }
          if (value && rule.url && !/^https?:\/\/.+/.test(value)) {
            errors.push(rule.message || 'Неверный URL');
          }
          if (value && rule.numeric && isNaN(Number(value))) {
            errors.push(rule.message || 'Должно быть числом');
          }
          if (value && rule.min && Number(value) < rule.min) {
            errors.push(rule.message || 'Минимум ' + rule.min);
          }
          if (value && rule.max && Number(value) > rule.max) {
            errors.push(rule.message || 'Максимум ' + rule.max);
          }
          if (rule.custom && typeof rule.custom === 'function') {
            var customResult = rule.custom(value);
            if (customResult && !customResult.valid) {
              errors.push(customResult.message || 'Невалидное значение');
            }
          }
        });
      }
    }

    var isValid = errors.length === 0;

    // Update UI
    if (isValid) {
      _clearFieldError(field);
    } else {
      _showFieldError(field, errors);
    }

    return { valid: isValid, errors: errors };
  };

  function _showFieldError(field, errors) {
    // Add error class
    field.classList.add('field-error');
    field.setAttribute('aria-invalid', 'true');

    // Find or create error message element
    var errorEl = field.parentNode.querySelector('.field-error-message');

    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-error-message';
      errorEl.setAttribute('role', 'alert');
      errorEl.style.color = '#dc2626';
      errorEl.style.fontSize = '13px';
      errorEl.style.marginTop = '4px';
      field.parentNode.appendChild(errorEl);
    }

    errorEl.textContent = errors.join(', ');
    errorEl.style.display = 'block';
  }

  function _clearFieldError(field) {
    field.classList.remove('field-error');
    field.setAttribute('aria-invalid', 'false');
    field.removeAttribute('aria-invalid');

    var errorEl = field.parentNode.querySelector('.field-error-message');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  // ----------------------------------------------------------------
  // VALIDATEFORM — ВАЛИДАЦИЯ ВСЕЙ ФОРМЫ
  // ----------------------------------------------------------------

  Forms.validateForm = function (formElement, schema) {
    if (!formElement || !schema) return { valid: true, errors: {} };

    var errors = {};
    var firstInvalidField = null;

    Object.keys(schema).forEach(function (fieldName) {
      var rules = schema[fieldName];
      var field = formElement.querySelector('[name="' + fieldName + '"]');

      if (!field) {
        // Try by id
        field = formElement.querySelector('#' + fieldName);
      }

      if (!field) return;

      var result = Forms.validateField(field, rules);
      if (!result.valid) {
        errors[fieldName] = result.errors;
        if (!firstInvalidField) firstInvalidField = field;
      }
    });

    var isValid = Object.keys(errors).length === 0;

    // Focus first invalid field
    if (!isValid && firstInvalidField) {
      setTimeout(function () {
        firstInvalidField.focus();
      }, 50);
    }

    // Optionally disable submit button
    var submitBtn = formElement.querySelector('[type="submit"]');
    if (submitBtn && submitBtn.getAttribute('data-disable-on-invalid') === 'true') {
      submitBtn.disabled = !isValid;
    }

    return { valid: isValid, errors: errors };
  };

  // ----------------------------------------------------------------
  // SERIALIZE — СБОР ДАННЫХ ФОРМЫ В ОБЪЕКТ
  // ----------------------------------------------------------------

  Forms.serialize = function (formElement) {
    if (!formElement) return {};

    var data = {};
    var elements = formElement.querySelectorAll('input, textarea, select');

    elements.forEach(function (field) {
      var name = field.name || field.id;
      if (!name) return;

      var type = field.type;
      var value;

      switch (type) {
        case 'checkbox':
          value = field.checked;
          break;

        case 'radio':
          if (field.checked) {
            data[name] = field.value;
          }
          break;

        case 'number':
        case 'range':
          value = field.value === '' ? '' : parseFloat(field.value);
          if (!isNaN(value)) {
            data[name] = value;
          }
          break;

        case 'select-multiple':
          value = [];
          if (field.options) {
            for (var i = 0; i < field.options.length; i++) {
              if (field.options[i].selected) {
                value.push(field.options[i].value);
              }
            }
          }
          data[name] = value;
          break;

        case 'file':
          // Don't serialize file inputs
          break;

        default:
          // text, textarea, password, email, url, date, hidden, etc.
          if (data[name] !== undefined) {
            // If already set (e.g., multiple inputs with same name), convert to array
            if (Array.isArray(data[name])) {
              data[name].push(field.value);
            } else {
              data[name] = [data[name], field.value];
            }
          } else {
            data[name] = field.value;
          }
      }

      // For checkbox that wasn't checked, set false
      if (type === 'checkbox' && !field.checked && data[name] === undefined) {
        data[name] = false;
      }
    });

    return data;
  };

  // ----------------------------------------------------------------
  // POPULATE — ЗАПОЛНЕНИЕ ФОРМЫ ДАННЫМИ
  // ----------------------------------------------------------------

  Forms.populate = function (formElement, data) {
    if (!formElement || !data || typeof data !== 'object') return;

    Object.keys(data).forEach(function (key) {
      var value = data[key];
      var fields = formElement.querySelectorAll('[name="' + key + '"]');

      if (fields.length === 0) {
        // Try by id
        var byId = formElement.querySelector('#' + key);
        if (byId) fields = [byId];
      }

      if (fields.length === 0) return;

      fields.forEach(function (field) {
        var type = field.type;

        switch (type) {
          case 'checkbox':
            field.checked = !!value;
            break;

          case 'radio':
            if (field.value === String(value)) {
              field.checked = true;
            }
            break;

          case 'select-one':
            field.value = String(value);
            // If value not in options, try to find a match
            var found = false;
            for (var i = 0; i < field.options.length; i++) {
              if (field.options[i].value === String(value)) {
                field.options[i].selected = true;
                found = true;
                break;
              }
            }
            if (!found && field.options.length > 0) {
              // Leave default
            }
            break;

          case 'select-multiple':
            if (Array.isArray(value)) {
              for (var j = 0; j < field.options.length; j++) {
                field.options[j].selected = value.indexOf(field.options[j].value) !== -1;
              }
            }
            break;

          default:
            // text, textarea, number, date, email, url, password, hidden
            if (value === null || value === undefined) {
              field.value = '';
            } else if (typeof value === 'boolean') {
              field.value = value ? 'true' : 'false';
            } else if (Array.isArray(value)) {
              field.value = value.join(', ');
            } else if (typeof value === 'object') {
              field.value = JSON.stringify(value);
            } else {
              field.value = String(value);
            }
        }
      });
    });
  };

  // ----------------------------------------------------------------
  // CLEAR — ОЧИСТКА ФОРМЫ
  // ----------------------------------------------------------------

  Forms.clear = function (formElement) {
    if (!formElement) return;

    // Native reset
    if (typeof formElement.reset === 'function') {
      formElement.reset();
    } else {
      // Manual reset
      var elements = formElement.querySelectorAll('input, textarea, select');
      elements.forEach(function (field) {
        var type = field.type;
        switch (type) {
          case 'checkbox':
          case 'radio':
            field.checked = false;
            break;
          case 'select-one':
            if (field.options.length > 0) field.options[0].selected = true;
            break;
          case 'select-multiple':
            for (var i = 0; i < field.options.length; i++) {
              field.options[i].selected = false;
            }
            break;
          default:
            field.value = '';
        }
      });
    }

    // Clear error states
    var errorFields = formElement.querySelectorAll('.field-error');
    errorFields.forEach(function (field) {
      field.classList.remove('field-error');
      field.removeAttribute('aria-invalid');
    });

    var errorMessages = formElement.querySelectorAll('.field-error-message');
    errorMessages.forEach(function (el) {
      el.textContent = '';
      el.style.display = 'none';
    });
  };

  // ----------------------------------------------------------------
  // GETFIELDVALUE — ПОЛУЧЕНИЕ ЗНАЧЕНИЯ ЛЮБОГО ПОЛЯ
  // ----------------------------------------------------------------

  Forms.getFieldValue = function (field) {
    if (!field) return null;

    var type = field.type;

    switch (type) {
      case 'checkbox':
        return field.checked;

      case 'radio':
        // If this is a radio group, find the checked one
        if (field.name) {
          var form = field.closest('form') || document;
          var checked = form.querySelector('input[name="' + field.name + '"]:checked');
          return checked ? checked.value : null;
        }
        return field.checked ? field.value : null;

      case 'number':
      case 'range':
        return field.value === '' ? '' : parseFloat(field.value);

      case 'select-multiple':
        var values = [];
        if (field.options) {
          for (var i = 0; i < field.options.length; i++) {
            if (field.options[i].selected) {
              values.push(field.options[i].value);
            }
          }
        }
        return values;

      case 'select-one':
        return field.value;

      case 'file':
        return field.files ? Array.from(field.files) : [];

      default:
        // text, textarea, password, email, url, date, hidden, etc.
        return field.value;
    }
  };

  // ----------------------------------------------------------------
  // SHOWSETTINGS — ФОРМА НАСТРОЕК
  // ----------------------------------------------------------------

  Forms.showSettings = function (settings) {
    var keys = _i.getKeys();
    var currentSettings = settings || Utils.storage.get(keys.SETTINGS) || {};

    var modalId = 'forms-settings-' + _i.generateId();

    var content = _i.dom('div', { class: 'modal-settings-content' });

    // Header
    var header = _i.dom('div', { class: 'modal-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } });
    header.appendChild(_i.dom('h3', { class: 'modal-title', text: 'Настройки' }));
    var closeBtn = _i.dom('button', { class: 'modal-close-btn', 'aria-label': 'Закрыть', html: _i.icons.close });
    header.appendChild(closeBtn);
    content.appendChild(header);

    var form = _i.dom('form', { class: 'settings-form', novalidate: 'novalidate' });

    // Theme
    var themeWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    themeWrap.appendChild(_i.dom('label', { for: 'set-theme', text: 'Тема оформления', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var themeSelect = _i.dom('select', { id: 'set-theme', class: 'form-select', style: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' } });
    [['light', 'Светлая'], ['dark', 'Тёмная'], ['auto', 'Авто']].forEach(function (t) {
      var opt = _i.dom('option', { value: t[0], text: t[1] });
      if (currentSettings.theme === t[0]) opt.selected = true;
      themeSelect.appendChild(opt);
    });
    themeWrap.appendChild(themeSelect);
    form.appendChild(themeWrap);

    // Auto-save
    var autoSaveWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' } });
    var autoSaveCb = _i.dom('input', { type: 'checkbox', id: 'set-autosave', style: { width: '18px', height: '18px' } });
    autoSaveCb.checked = currentSettings.autoSave !== false;
    autoSaveWrap.appendChild(autoSaveCb);
    autoSaveWrap.appendChild(_i.dom('label', { for: 'set-autosave', text: 'Автосохранение', style: { fontSize: '14px', cursor: 'pointer' } }));
    form.appendChild(autoSaveWrap);

    // Notifications
    var notifWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' } });
    var notifCb = _i.dom('input', { type: 'checkbox', id: 'set-notif', style: { width: '18px', height: '18px' } });
    notifCb.checked = currentSettings.notifications !== false;
    notifWrap.appendChild(notifCb);
    notifWrap.appendChild(_i.dom('label', { for: 'set-notif', text: 'Уведомления', style: { fontSize: '14px', cursor: 'pointer' } }));
    form.appendChild(notifWrap);

    // Pomodoro work duration
    var pomoWorkWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    pomoWorkWrap.appendChild(_i.dom('label', { for: 'set-pomo-work', text: 'Длительность работы (мин)', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var pomoWorkInput = _i.dom('input', {
      type: 'number', id: 'set-pomo-work', class: 'form-input',
      value: String(currentSettings.pomodoroWorkDuration || 25),
      min: '1', max: '60',
      style: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
    });
    pomoWorkWrap.appendChild(pomoWorkInput);
    form.appendChild(pomoWorkWrap);

    // Pomodoro break duration
    var pomoBreakWrap = _i.dom('div', { class: 'form-field', style: { marginBottom: '16px' } });
    pomoBreakWrap.appendChild(_i.dom('label', { for: 'set-pomo-break', text: 'Длительность перерыва (мин)', style: { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '14px' } }));
    var pomoBreakInput = _i.dom('input', {
      type: 'number', id: 'set-pomo-break', class: 'form-input',
      value: String(currentSettings.pomodoroBreakDuration || 5),
      min: '1', max: '30',
      style: { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }
    });
    pomoBreakWrap.appendChild(pomoBreakInput);
    form.appendChild(pomoBreakWrap);

    // Buttons
    var btnRow = _i.dom('div', { class: 'modal-footer', style: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' } });
    var cancelBtn = _i.dom('button', { type: 'button', class: 'btn btn-outline', text: 'Отмена' });
    var saveBtn = _i.dom('button', { type: 'submit', class: 'btn btn-primary', text: 'Сохранить' });
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    form.appendChild(btnRow);

    content.appendChild(form);

    var modal = _i.createDynamicModal(modalId, content, { size: 'md' });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var newSettings = {
        theme: themeSelect.value,
        autoSave: autoSaveCb.checked,
        notifications: notifCb.checked,
        pomodoroWorkDuration: parseInt(pomoWorkInput.value, 10) || 25,
        pomodoroBreakDuration: parseInt(pomoBreakInput.value, 10) || 5,
        sidebarCollapsed: currentSettings.sidebarCollapsed || false,
        pomodoroLongBreakDuration: currentSettings.pomodoroLongBreakDuration || 15,
        pomodoroSessionsUntilLongBreak: currentSettings.pomodoroSessionsUntilLongBreak || 4
      };

      // Валидация
      if (newSettings.pomodoroWorkDuration < 1 || newSettings.pomodoroWorkDuration > 60) {
        _i.showToast('Длительность работы: от 1 до 60 минут', 'warning');
        pomoWorkInput.focus();
        return;
      }
      if (newSettings.pomodoroBreakDuration < 1 || newSettings.pomodoroBreakDuration > 30) {
        _i.showToast('Длительность перерыва: от 1 до 30 минут', 'warning');
        pomoBreakInput.focus();
        return;
      }

      // Сохраняем в storage, сохраняя неизвестные поля
      var existingSettings = Utils.storage.get(keys.SETTINGS) || {};
      var mergedSettings = Object.assign({}, existingSettings, newSettings);
      Utils.storage.set(keys.SETTINGS, mergedSettings);

      _i.showToast('Настройки сохранены', 'success');
      _i.closeDynamicModal(modal);

      if (window.QAApp && typeof QAApp.emit === 'function') {
        QAApp.emit('settings:updated', mergedSettings);
      }

      // Применить тему если изменилась
      if (newSettings.theme !== (currentSettings.theme || 'light')) {
        if (Utils.css && Utils.css.setTheme) {
          Utils.css.setTheme(newSettings.theme);
        } else if (window.App && typeof App.applyTheme === 'function') {
          App.applyTheme(newSettings.theme);
        } else {
          document.documentElement.setAttribute('data-theme', newSettings.theme);
        }
      }

      if (window.App && App.markUnsaved) App.markUnsaved();
    });

    cancelBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });
    closeBtn.addEventListener('click', function () { _i.closeDynamicModal(modal); });

    // Ctrl+Enter для сохранения
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    _i.openDynamicModal(modal);
  };

  // ========================================================================
  // ФИНАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ
  // ========================================================================

  // Авто-инициализация если DOM готов
  if (document.readyState !== 'loading') {
    Forms.init();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      Forms.init();
    });
  }

  if (window.Debug) Debug.info('Forms module fully loaded (all 4 parts)');

})();
