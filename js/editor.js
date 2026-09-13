/* editor.js — редакторы артефактов: баг-репорты, тест-кейсы, чек-листы, тест-планы, API-тесты */

(function () {
  'use strict';

  // ========================================================================
  // КОНСТАНТЫ И ИКОНКИ
  // ========================================================================

  var TYPE_LABELS = {
    bug_report: 'Баг-репорт',
    test_case: 'Тест-кейс',
    checklist: 'Чек-лист',
    test_plan: 'Тест-план',
    api_test: 'API-тест'
  };

  var SEVERITY_LABELS = {
    blocker: 'Блокер',
    critical: 'Критичный',
    major: 'Значительный',
    minor: 'Незначительный',
    trivial: 'Тривиальный'
  };

  var SEVERITY_COLORS = {
    blocker: '#dc2626',
    critical: '#ea580c',
    major: '#eab308',
    minor: '#3b82f6',
    trivial: '#6b7280'
  };

  var PRIORITY_LABELS = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    urgent: 'Срочный'
  };

  var PRIORITY_COLORS = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f97316',
    urgent: '#dc2626'
  };

  var STATUS_LABELS = {
    new: 'Новый',
    assigned: 'Назначен',
    in_progress: 'В работе',
    resolved: 'Решён',
    closed: 'Закрыт',
    reopened: 'Переоткрыт'
  };

  var STATUS_COLORS = {
    new: '#3b82f6',
    assigned: '#8b5cf6',
    in_progress: '#f97316',
    resolved: '#22c55e',
    closed: '#6b7280',
    reopened: '#dc2626'
  };

  var TC_TYPE_LABELS = {
    functional: 'Функциональный',
    smoke: 'Smoke',
    regression: 'Регрессионный',
    integration: 'Интеграционный',
    negative: 'Негативный'
  };

  var TC_STATUS_LABELS = {
    not_executed: 'Не выполнен',
    passed: 'Пройден',
    failed: 'Не пройден',
    blocked: 'Заблокирован',
    skipped: 'Пропущен'
  };

  var TC_STATUS_COLORS = {
    not_executed: '#6b7280',
    passed: '#22c55e',
    failed: '#dc2626',
    blocked: '#f97316',
    skipped: '#8b5cf6'
  };

  var TC_PRIORITY_LABELS = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий'
  };

  var HTTP_METHOD_COLORS = {
    GET: '#3b82f6',
    POST: '#22c55e',
    PUT: '#f97316',
    PATCH: '#8b5cf6',
    DELETE: '#dc2626'
  };

  var IMPACT_LABELS = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий'
  };

  var IMPACT_COLORS = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#dc2626'
  };

  var ICONS = {
    save: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
    cancel: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    export: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    preview: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    add: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    remove: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    validate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    drag: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>'
  };

  var MAX_TITLE = 200;
  var MAX_DESC = 5000;
  var MAX_TAGS = 20;
  var MAX_STEPS = 50;

  // ========================================================================
  // СОСТОЯНИЕ РЕДАКТОРА
  // ========================================================================

  var _editing = null;       // текущий редактируемый артефакт
  var _original = null;      // оригинал (для сравнения изменений)
  var _isDirty = false;      // есть несохранённые изменения
  var _previewMode = false;  // режим предпросмотра
  var _modalId = 'editor-modal';
  var _validationErrors = {};

  // ========================================================================
  // ГЛОБАЛЬНЫЙ ОБЪЕКТ EDITOR
  // ========================================================================

  window.Editor = {

    init: function () {
      if (!window.Utils) {
        if (window.Debug) Debug.error('Utils not available — Editor cannot init');
        return;
      }

      // Создать контейнер для редактора если нет
      var existing = Utils.dom.$('#' + _modalId);
      if (!existing) {
        _ensureModalContainer();
      }

      // Регистрация в QAApp
      if (window.QAApp && typeof QAApp.registerModule === 'function') {
        QAApp.registerModule('Editor', Editor);
        if (typeof QAApp.on === 'function') {
          QAApp.on('artifact:create', function (template) {
            Editor.create(template);
          });
        }
      }

      if (window.Debug) Debug.info('Editor module initialized');
    },

    // ----------------------------------------------------------------
    // ОТКРЫТИЕ
    // ----------------------------------------------------------------

    open: function (artifact) {
      if (!artifact) {
        if (window.Debug) Debug.warn('Editor.open: artifact is null');
        return;
      }

      _editing = Utils.misc.deepClone(artifact);
      _original = Utils.misc.deepClone(artifact);
      _isDirty = false;
      _previewMode = false;
      _validationErrors = {};

      _showEditor();
    },

    create: function (template) {
      var type = (template && template.type) || 'bug_report';
      var now = new Date().toISOString();

      var artifact = {
        id: Utils.id.uuid(),
        type: type,
        title: 'Новый ' + (TYPE_LABELS[type] || 'артефакт'),
        data: _getDefaultData(type),
        tags: [],
        createdAt: now,
        updatedAt: now,
        lessonId: null
      };

      // Применить структуру из шаблона если есть
      if (template && (template.structure || template.data)) {
        var tplData = template.structure || template.data;
        artifact.data = Utils.misc.deepClone(tplData);
      }

      _editing = artifact;
      _original = null;
      _isDirty = true;
      _previewMode = false;
      _validationErrors = {};

      _showEditor();
    },

    // ----------------------------------------------------------------
    // ЗАКРЫТИЕ
    // ----------------------------------------------------------------

    close: function () {
      if (_isDirty) {
        _confirmClose();
        return;
      }
      _doClose();
    },

    // ----------------------------------------------------------------
    // СОХРАНЕНИЕ
    // ----------------------------------------------------------------

    save: function () {
      if (!_editing) return;

      var validation = Editor.validate(_editing);
      if (!validation.valid) {
        _validationErrors = validation.errors;
        _renderValidationErrors();
        _showToast('Проверьте обязательные поля', 'warning');
        return;
      }

      _editing.updatedAt = new Date().toISOString();

      var artifacts = _getArtifactsFromStorage();
      var found = false;
      for (var i = 0; i < artifacts.length; i++) {
        if (artifacts[i].id === _editing.id) {
          artifacts[i] = Utils.misc.deepClone(_editing);
          found = true;
          break;
        }
      }
      if (!found) {
        artifacts.push(Utils.misc.deepClone(_editing));
      }

      Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, artifacts);

      _original = Utils.misc.deepClone(_editing);
      _isDirty = false;
      _updateToolbarState();

      _showToast('Артефакт сохранён', 'success');

      if (window.QAApp && typeof QAApp.emit === 'function') {
        QAApp.emit('artifact:saved', _editing);
      }

      if (window.App && App.markUnsaved) App.markUnsaved();
    },

    // ----------------------------------------------------------------
    // УДАЛЕНИЕ
    // ----------------------------------------------------------------

    delete: function (artifactId) {
      var artifact = Editor.getArtifact(artifactId);
      if (!artifact) {
        _showToast('Артефакт не найден', 'error');
        return;
      }

      _confirmDelete(artifact, function () {
        var artifacts = _getArtifactsFromStorage();
        var filtered = artifacts.filter(function (a) { return a.id !== artifactId; });
        Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, filtered);

        _showToast('Артефакт удалён', 'info');

        if (_editing && _editing.id === artifactId) {
          _doClose();
        }

        if (window.QAApp && typeof QAApp.emit === 'function') {
          QAApp.emit('artifact:deleted', artifactId);
        }

        if (window.App && App.markUnsaved) App.markUnsaved();
      });
    },

    // ----------------------------------------------------------------
    // ДУБЛИРОВАНИЕ
    // ----------------------------------------------------------------

    duplicate: function (artifactId) {
      var artifact = Editor.getArtifact(artifactId);
      if (!artifact) {
        _showToast('Артефакт не найден', 'error');
        return;
      }

      var now = new Date().toISOString();
      var clone = Utils.misc.deepClone(artifact);
      clone.id = Utils.id.uuid();
      clone.title = (artifact.title || 'Артефакт') + ' (копия)';
      clone.createdAt = now;
      clone.updatedAt = now;

      var artifacts = _getArtifactsFromStorage();
      artifacts.push(clone);
      Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, artifacts);

      _showToast('Артефакт скопирован', 'success');

      if (window.QAApp && typeof QAApp.emit === 'function') {
        QAApp.emit('artifact:created', clone);
      }

      return clone;
    },

    // ----------------------------------------------------------------
    // ЭКСПОРТ
    // ----------------------------------------------------------------

    export: function (artifactId, format) {
      var artifact = Editor.getArtifact(artifactId);
      if (!artifact) {
        _showToast('Артефакт не найден', 'error');
        return;
      }

      var content, mimeType, extension;

      if (format === 'json') {
        content = Utils.format.formatJSON(artifact, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else if (format === 'markdown') {
        content = _exportMarkdown(artifact);
        mimeType = 'text/markdown';
        extension = 'md';
      } else if (format === 'html') {
        content = _exportHTML(artifact);
        mimeType = 'text/html';
        extension = 'html';
      } else {
        _showToast('Неизвестный формат экспорта', 'warning');
        return;
      }

      var filename = _slugify(artifact.title || 'artifact') + '.' + extension;
      _downloadFile(content, mimeType, filename);
      _showToast('Файл скачан (' + extension.toUpperCase() + ')', 'success');
    },

    // ----------------------------------------------------------------
    // ПРЕДПРОСМОРТ (read-only)
    // ----------------------------------------------------------------

    preview: function (artifactId) {
      var artifact = Editor.getArtifact(artifactId);
      if (!artifact) {
        _showToast('Артефакт не найден', 'error');
        return;
      }

      _editing = Utils.misc.deepClone(artifact);
      _original = Utils.misc.deepClone(artifact);
      _isDirty = false;
      _previewMode = true;
      _validationErrors = {};

      _showEditor();
    },

    // ----------------------------------------------------------------
    // ВАЛИДАЦИЯ
    // ----------------------------------------------------------------

    validate: function (artifactData) {
      var errors = {};
      var data = artifactData.data || artifactData;
      var type = artifactData.type || data.type;

      if (type === 'bug_report') {
        if (!data.summary || !data.summary.trim()) {
          errors.summary = ['Краткое описание обязательно'];
        } else if (data.summary.length > MAX_TITLE) {
          errors.summary = ['Максимум ' + MAX_TITLE + ' символов'];
        }
        if (!data.description || !data.description.trim()) {
          errors.description = ['Подробное описание обязательно'];
        }
        if (!data.steps || data.steps.length < 1) {
          errors.steps = ['Добавьте минимум один шаг'];
        }
      } else if (type === 'test_case') {
        if (!data.title || !data.title.trim()) {
          errors.title = ['Название тест-кейса обязательно'];
        }
        if (!data.steps || data.steps.length < 1) {
          errors.steps = ['Добавьте минимум один шаг'];
        }
      } else if (type === 'checklist') {
        if (!data.title || !data.title.trim()) {
          errors.title = ['Название чек-листа обязательно'];
        }
        if (!data.items || data.items.length < 1) {
          errors.items = ['Добавьте минимум один пункт'];
        }
      } else if (type === 'test_plan') {
        if (!data.title || !data.title.trim()) {
          errors.title = ['Название тест-плана обязательно'];
        }
      } else if (type === 'api_test') {
        if (!data.title || !data.title.trim()) {
          errors.title = ['Название API-теста обязательно'];
        }
        if (!data.url || !data.url.trim()) {
          errors.url = ['URL обязателен'];
        }
        if (data.body && data.body.trim()) {
          if (!Utils.validate.isJSON(data.body)) {
            errors.body = ['Невалидный JSON в теле запроса'];
          }
        }
        if (data.expectedResponse && data.expectedResponse.trim()) {
          if (!Utils.validate.isJSON(data.expectedResponse)) {
            errors.expectedResponse = ['Невалидный JSON в ожидаемом ответе'];
          }
        }
      }

      // Проверка количества тегов
      var tags = artifactData.tags || data.tags || [];
      if (tags.length > MAX_TAGS) {
        errors.tags = ['Максимум ' + MAX_TAGS + ' тегов'];
      }

      var hasErrors = Object.keys(errors).length > 0;
      return { valid: !hasErrors, errors: errors };
    },

    // ----------------------------------------------------------------
    // ГЕТТЕРЫ
    // ----------------------------------------------------------------

    getEditing: function () {
      return _editing ? Utils.misc.deepClone(_editing) : null;
    },

    isEditing: function () {
      return _editing !== null;
    },

    getArtifacts: function () {
      return _getArtifactsFromStorage();
    },

    getArtifact: function (id) {
      var artifacts = _getArtifactsFromStorage();
      for (var i = 0; i < artifacts.length; i++) {
        if (artifacts[i].id === id) return artifacts[i];
      }
      return null;
    }
  };

  // ========================================================================
  // ВНУТРЕННИЕ УТИЛИТЫ
  // ========================================================================

  function _getArtifactsFromStorage() {
    var artifacts = Utils.storage.get(Utils.constants.STORAGE_KEYS.ARTIFACTS);
    if (!Array.isArray(artifacts)) artifacts = [];
    return artifacts;
  }

  function _getDefaultData(type) {
    switch (type) {
      case 'bug_report':
        return {
          summary: '',
          description: '',
          steps: [''],
          expected: '',
          actual: '',
          severity: 'major',
          priority: 'medium',
          status: 'new',
          environment: '',
          attachments: []
        };
      case 'test_case':
        return {
          id: 'TC-' + Utils.id.shortId(),
          title: '',
          preconditions: '',
          steps: [{ action: '', expectedResult: '' }],
          postconditions: '',
          type: 'functional',
          priority: 'medium',
          status: 'not_executed'
        };
      case 'checklist':
        return {
          title: '',
          items: [{ text: '', isChecked: false, category: '' }],
          categories: []
        };
      case 'test_plan':
        return {
          title: '',
          scope: '',
          strategy: '',
          schedule: [{ phase: '', startDate: '', endDate: '', responsible: '' }],
          risks: [{ risk: '', impact: 'medium', mitigation: '' }],
          resources: [''],
          approvals: [{ role: '', name: '', date: '', approved: false }]
        };
      case 'api_test':
        return {
          title: '',
          method: 'GET',
          url: '',
          headers: [{ key: '', value: '' }],
          body: '',
          expectedStatus: 200,
          expectedResponse: ''
        };
      default:
        return {};
    }
  }

  function _showToast(message, type) {
    if (window.App && typeof App.showToast === 'function') {
      App.showToast({ message: message, type: type || 'info' });
    } else if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('toast', { message: message, type: type || 'info' });
    }
  }

  function _slugify(text) {
    return String(text || 'artifact')
      .toLowerCase()
      .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'artifact';
  }

  function _downloadFile(content, mimeType, filename) {
    if (Utils.url && Utils.url.download) {
      Utils.url.download(content, mimeType, filename);
      return;
    }
    var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function _getAllTags() {
    var tags = Utils.storage.get(Utils.constants.STORAGE_KEYS.TAGS) || [];
    if (!Array.isArray(tags)) tags = [];
    var artifacts = _getArtifactsFromStorage();
    artifacts.forEach(function (a) {
      if (a.tags) {
        a.tags.forEach(function (t) {
          if (tags.indexOf(t) === -1) tags.push(t);
        });
      }
    });
    return tags;
  }

  // ========================================================================
  // СОЗДАНИЕ МОДАЛЬНОГО КОНТЕЙНЕРА
  // ========================================================================

  function _ensureModalContainer() {
    var existing = Utils.dom.$('#' + _modalId);
    if (existing) return existing;

    var isMobile = Utils.device && Utils.device.isMobile && Utils.device.isMobile();
    var modalClass = isMobile ? 'modal modal-fullscreen editor-modal' : 'modal modal-lg editor-modal';

    var modal = Utils.dom.create('div', {
      class: modalClass,
      id: _modalId,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': _modalId + '-title',
      hidden: 'hidden'
    });

    var dialog = Utils.dom.create('div', { class: 'modal-dialog' });
    var content = Utils.dom.create('div', { class: 'modal-content editor-content' });

    // Header
    var header = Utils.dom.create('div', { class: 'modal-header editor-header' });
    var titleWrap = Utils.dom.create('div', { class: 'editor-title-wrap' });
    var typeBadge = Utils.dom.create('span', { class: 'editor-type-badge', id: _modalId + '-type-badge' });
    var titleEl = Utils.dom.create('h3', { class: 'modal-title', id: _modalId + '-title' });
    Utils.dom.append(titleWrap, typeBadge);
    Utils.dom.append(titleWrap, titleEl);

    var closeBtn = Utils.dom.create('button', {
      class: 'modal-close-btn',
      'aria-label': 'Закрыть редактор',
      'data-modal-close': ''
    });
    closeBtn.innerHTML = ICONS.close;
    closeBtn.addEventListener('click', function () { Editor.close(); });

    Utils.dom.append(header, titleWrap);
    Utils.dom.append(header, closeBtn);

    // Toolbar
    var toolbar = Utils.dom.create('div', { class: 'editor-toolbar', id: _modalId + '-toolbar' });

    var saveBtn = Utils.dom.create('button', {
      class: 'btn btn-primary btn-sm',
      id: _modalId + '-save-btn',
      title: 'Сохранить (Ctrl+S)'
    });
    saveBtn.innerHTML = ICONS.save;
    Utils.dom.append(saveBtn, Utils.dom.fromHTML('<span>Сохранить</span>'));
    saveBtn.addEventListener('click', function () { Editor.save(); });

    var cancelBtn = Utils.dom.create('button', {
      class: 'btn btn-outline btn-sm',
      id: _modalId + '-cancel-btn'
    });
    cancelBtn.innerHTML = ICONS.cancel;
    Utils.dom.append(cancelBtn, Utils.dom.fromHTML('<span>Отмена</span>'));
    cancelBtn.addEventListener('click', function () { Editor.close(); });

    var deleteBtn = Utils.dom.create('button', {
      class: 'btn btn-danger btn-sm',
      id: _modalId + '-delete-btn',
      title: 'Удалить артефакт'
    });
    deleteBtn.innerHTML = ICONS.trash;
    Utils.dom.append(deleteBtn, Utils.dom.fromHTML('<span>Удалить</span>'));
    deleteBtn.addEventListener('click', function () {
      if (_editing) Editor.delete(_editing.id);
    });

    var dupBtn = Utils.dom.create('button', {
      class: 'btn btn-outline btn-sm',
      id: _modalId + '-dup-btn',
      title: 'Дублировать'
    });
    dupBtn.innerHTML = ICONS.copy;
    Utils.dom.append(dupBtn, Utils.dom.fromHTML('<span>Копия</span>'));
    dupBtn.addEventListener('click', function () {
      if (_editing) {
        var clone = Editor.duplicate(_editing.id);
        if (clone) Editor.open(clone);
      }
    });

    // Export dropdown
    var exportWrap = Utils.dom.create('div', { class: 'editor-export-wrap' });
    var exportBtn = Utils.dom.create('button', {
      class: 'btn btn-outline btn-sm',
      title: 'Экспорт'
    });
    exportBtn.innerHTML = ICONS.export;
    Utils.dom.append(exportBtn, Utils.dom.fromHTML('<span>Экспорт</span>'));
    exportBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var dd = Utils.dom.$('#' + _modalId + '-export-dd');
      if (dd) dd.hidden = !dd.hidden;
    });
    var exportDD = Utils.dom.create('div', {
      class: 'export-dropdown',
      id: _modalId + '-export-dd',
      hidden: 'hidden'
    });
    [
      { label: 'JSON', fmt: 'json' },
      { label: 'Markdown', fmt: 'markdown' },
      { label: 'HTML', fmt: 'html' }
    ].forEach(function (opt) {
      var item = Utils.dom.create('button', {
        class: 'export-dropdown-item',
        text: opt.label
      });
      item.addEventListener('click', function () {
        if (_editing) Editor.export(_editing.id, opt.fmt);
        exportDD.hidden = true;
      });
      Utils.dom.append(exportDD, item);
    });
    Utils.dom.append(exportWrap, exportBtn);
    Utils.dom.append(exportWrap, exportDD);

    // Close dropdown on outside click
    document.addEventListener('click', function (e) {
      if (!exportWrap.contains(e.target)) {
        exportDD.hidden = true;
      }
    });

    var previewBtn = Utils.dom.create('button', {
      class: 'btn btn-outline btn-sm',
      id: _modalId + '-preview-btn',
      title: 'Предпросмотр'
    });
    previewBtn.innerHTML = ICONS.preview;
    Utils.dom.append(previewBtn, Utils.dom.fromHTML('<span>Предпросмотр</span>'));
    previewBtn.addEventListener('click', function () {
      _previewMode = !_previewMode;
      _showEditor();
    });

    Utils.dom.append(toolbar, saveBtn);
    Utils.dom.append(toolbar, cancelBtn);
    Utils.dom.append(toolbar, deleteBtn);
    Utils.dom.append(toolbar, dupBtn);
    Utils.dom.append(toolbar, exportWrap);
    Utils.dom.append(toolbar, previewBtn);

    // Body
    var body = Utils.dom.create('div', { class: 'modal-body editor-body', id: _modalId + '-body' });

    // Footer
    var footer = Utils.dom.create('div', { class: 'modal-footer editor-footer' });
    var footerInfo = Utils.dom.create('div', { class: 'editor-footer-info', id: _modalId + '-footer-info' });
    Utils.dom.append(footer, footerInfo);

    // Assemble
    Utils.dom.append(content, header);
    Utils.dom.append(content, toolbar);
    Utils.dom.append(content, body);
    Utils.dom.append(content, footer);
    Utils.dom.append(dialog, content);
    Utils.dom.append(modal, dialog);

    // Click outside to close
    modal.addEventListener('click', function (e) {
      if (e.target === modal) Editor.close();
    });

    // Escape to close
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        Editor.close();
      }
    });

    // Append to modals container or body
    var modalsContainer = Utils.dom.$('#modals');
    if (modalsContainer) {
      Utils.dom.append(modalsContainer, modal);
    } else {
      Utils.dom.append(document.body, modal);
    }

    return modal;
  }

  // ========================================================================
  // ПОКАЗ РЕДАКТОРА
  // ========================================================================

  function _showEditor() {
    var modal = _ensureModalContainer();
    var titleEl = Utils.dom.$('#' + _modalId + '-title');
    var typeBadge = Utils.dom.$('#' + _modalId + '-type-badge');
    var body = Utils.dom.$('#' + _modalId + '-body');
    var footerInfo = Utils.dom.$('#' + _modalId + '-footer-info');
    var previewBtn = Utils.dom.$('#' + _modalId + '-preview-btn');
    var saveBtn = Utils.dom.$('#' + _modalId + '-save-btn');

    // Title
    if (titleEl) {
      var titleText = _editing.title || (_editing.data && _editing.data.title) || (_editing.data && _editing.data.summary) || '';
      Utils.dom.setText(titleEl, titleText);
    }

    // Type badge
    if (typeBadge) {
      var typeLabel = TYPE_LABELS[_editing.type] || _editing.type || 'Артефакт';
      Utils.dom.setText(typeBadge, typeLabel);
    }

    // Preview button icon
    if (previewBtn) {
      previewBtn.innerHTML = _previewMode ? ICONS.edit : ICONS.preview;
      var spanEl = previewBtn.querySelector('span');
      if (spanEl) Utils.dom.setText(spanEl, _previewMode ? 'Редактировать' : 'Предпросмотр');
    }

    // Body
    if (body) {
      Utils.dom.empty(body);
      if (_previewMode) {
        Utils.dom.append(body, _renderPreview(_editing));
      } else {
        Utils.dom.append(body, _renderForm(_editing));
      }
    }

    // Footer
    if (footerInfo) {
      Utils.dom.empty(footerInfo);
      var updatedText = '';
      if (_editing.updatedAt) {
        updatedText = 'Изменён: ' + _formatDate(_editing.updatedAt);
      } else if (_editing.createdAt) {
        updatedText = 'Создан: ' + _formatDate(_editing.createdAt);
      }
      if (_isDirty) {
        updatedText += ' • Не сохранено';
      }
      Utils.dom.append(footerInfo, Utils.dom.create('span', { text: updatedText }));
    }

    // Save button state
    if (saveBtn) {
      saveBtn.disabled = !_isDirty;
    }

    // Show modal
    modal.hidden = false;
    if (Utils.dom.fadeIn) {
      Utils.dom.fadeIn(modal, 200);
    }
    Utils.dom.addClass(document.body, 'modal-open');

    // Trap focus
    if (Utils.a11y && Utils.a11y.trapFocus) {
      Utils.a11y.trapFocus(modal.querySelector('.modal-content'));
    }

    // Focus first input
    setTimeout(function () {
      var firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
      if (firstInput && !_previewMode) {
        firstInput.focus();
      }
    }, 200);
  }

  function _doClose() {
    var modal = Utils.dom.$('#' + _modalId);
    if (!modal) return;

    if (Utils.dom.fadeOut) {
      Utils.dom.fadeOut(modal, 200, function () {
        modal.hidden = true;
      });
    } else {
      modal.hidden = true;
    }

    Utils.dom.removeClass(document.body, 'modal-open');

    if (Utils.a11y && Utils.a11y.releaseFocus) {
      Utils.a11y.releaseFocus();
    }

    _editing = null;
    _original = null;
    _isDirty = false;
    _previewMode = false;
    _validationErrors = {};

    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('editor:closed');
    }
  }

  function _confirmClose() {
    if (window.App && App.modals && typeof App.modals.confirm === 'function') {
      App.modals.confirm({
        title: 'Несохранённые изменения',
        message: 'У вас есть несохранённые изменения. Закрыть без сохранения?',
        confirmText: 'Закрыть без сохранения',
        cancelText: 'Отмена',
        onConfirm: function () { _doClose(); }
      });
    } else if (confirm('У вас есть несохранённые изменения. Закрыть без сохранения?')) {
      _doClose();
    }
  }

  function _confirmDelete(artifact, onConfirm) {
    if (window.App && App.modals && typeof App.modals.confirm === 'function') {
      App.modals.confirm({
        title: 'Удалить артефакт?',
        message: '«' + (artifact.title || 'Артефакт') + '» будет удалён безвозвратно.',
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        onConfirm: onConfirm
      });
    } else if (confirm('Удалить артефакт «' + (artifact.title || 'Артефакт') + '»?')) {
      onConfirm();
    }
  }

  function _formatDate(iso) {
    try {
      var d = new Date(iso);
      return Utils.format.formatDateRu ? Utils.format.formatDateRu(d) : d.toLocaleString('ru-RU');
    } catch (e) {
      return '';
    }
  }

  function _markDirty() {
    if (!_isDirty) {
      _isDirty = true;
      _updateToolbarState();
    }
    _updateFooterInfo();
  }

  function _updateToolbarState() {
    var saveBtn = Utils.dom.$('#' + _modalId + '-save-btn');
    if (saveBtn) saveBtn.disabled = !_isDirty;
  }

  function _updateFooterInfo() {
    var footerInfo = Utils.dom.$('#' + _modalId + '-footer-info');
    if (!footerInfo) return;
    Utils.dom.empty(footerInfo);
    var text = _isDirty ? 'Не сохранено' : 'Сохранено';
    if (_editing && _editing.updatedAt && !_isDirty) {
      text += ' • ' + _formatDate(_editing.updatedAt);
    }
    Utils.dom.append(footerInfo, Utils.dom.create('span', { text: text }));
  }

  // ========================================================================
  // РЕНДЕР ФОРМЫ
  // ========================================================================

  function _renderForm(artifact) {
    var form = Utils.dom.create('div', { class: 'editor-form' });

    // Common: Title field (for artifact-level title)
    var titleLabel = TYPE_LABELS[artifact.type] || 'Артефакт';
    var titleField = _createTextField(
      'editor-title',
      'Название',
      artifact.title || '',
      MAX_TITLE,
      'Введите название ' + titleLabel.toLowerCase(),
      true
    );
    titleField.input.addEventListener('input', function (e) {
      artifact.title = e.target.value;
      _markDirty();
      var titleEl = Utils.dom.$('#' + _modalId + '-title');
      if (titleEl) Utils.dom.setText(titleEl, e.target.value || '(без названия)');
    });
    Utils.dom.append(form, titleField.wrap);

    // Type-specific form
    switch (artifact.type) {
      case 'bug_report':
        Utils.dom.append(form, _renderBugReportForm(artifact.data));
        break;
      case 'test_case':
        Utils.dom.append(form, _renderTestCaseForm(artifact.data));
        break;
      case 'checklist':
        Utils.dom.append(form, _renderChecklistForm(artifact.data));
        break;
      case 'test_plan':
        Utils.dom.append(form, _renderTestPlanForm(artifact.data));
        break;
      case 'api_test':
        Utils.dom.append(form, _renderApiTestForm(artifact.data));
        break;
    }

    // Common: Tags
    var tagsField = _createTagsField(artifact.tags || [], function (newTags) {
      artifact.tags = newTags;
      _markDirty();
    });
    Utils.dom.append(form, tagsField);

    return form;
  }

  // ----------------------------------------------------------------
  // Общие поля
  // ----------------------------------------------------------------

  function _createTextField(id, label, value, maxLen, placeholder, required) {
    var wrap = Utils.dom.create('div', { class: 'form-field' });
    var labelEl = Utils.dom.create('label', {
      class: 'form-label',
      text: label + (required ? ' *' : ''),
      for: id
    });
    if (required) labelEl.setAttribute('aria-required', 'true');

    var input = Utils.dom.create('input', {
      type: 'text',
      id: id,
      class: 'form-input',
      value: Utils.format.escapeHtml(value || ''),
      placeholder: placeholder || '',
      maxlength: String(maxLen || 500)
    });

    var counter = null;
    if (maxLen) {
      counter = Utils.dom.create('div', { class: 'char-counter' });
      var remaining = maxLen - (value || '').length;
      Utils.dom.setText(counter, remaining + ' симв. осталось');
      input.addEventListener('input', function (e) {
        var rem = maxLen - e.target.value.length;
        Utils.dom.setText(counter, rem + ' симв. осталось');
        Utils.dom.toggleClass(counter, 'limit-warn', rem < 50);
        Utils.dom.toggleClass(counter, 'limit-danger', rem < 0);
      });
    }

    var errorEl = Utils.dom.create('div', {
      class: 'form-error',
      id: id + '-error',
      hidden: 'hidden'
    });

    Utils.dom.append(wrap, labelEl);
    Utils.dom.append(wrap, input);
    if (counter) Utils.dom.append(wrap, counter);
    Utils.dom.append(wrap, errorEl);

    return { wrap: wrap, input: input, error: errorEl };
  }

  function _createTextArea(id, label, value, maxLen, placeholder, required, rows) {
    var wrap = Utils.dom.create('div', { class: 'form-field' });
    var labelEl = Utils.dom.create('label', {
      class: 'form-label',
      text: label + (required ? ' *' : ''),
      for: id
    });
    if (required) labelEl.setAttribute('aria-required', 'true');

    var textarea = Utils.dom.create('textarea', {
      id: id,
      class: 'form-textarea',
      placeholder: placeholder || '',
      rows: String(rows || 4),
      maxlength: String(maxLen || 5000)
    });
    textarea.value = value || '';

    var counter = null;
    if (maxLen) {
      counter = Utils.dom.create('div', { class: 'char-counter' });
      var remaining = maxLen - (value || '').length;
      Utils.dom.setText(counter, remaining + ' симв. осталось');
      textarea.addEventListener('input', function (e) {
        var rem = maxLen - e.target.value.length;
        Utils.dom.setText(counter, rem + ' симв. осталось');
        Utils.dom.toggleClass(counter, 'limit-warn', rem < 100);
      });
    }

    var errorEl = Utils.dom.create('div', {
      class: 'form-error',
      id: id + '-error',
      hidden: 'hidden'
    });

    Utils.dom.append(wrap, labelEl);
    Utils.dom.append(wrap, textarea);
    if (counter) Utils.dom.append(wrap, counter);
    Utils.dom.append(wrap, errorEl);

    return { wrap: wrap, textarea: textarea, error: errorEl };
  }

  function _createSelectField(id, label, options, selectedValue, required) {
    var wrap = Utils.dom.create('div', { class: 'form-field' });
    var labelEl = Utils.dom.create('label', {
      class: 'form-label',
      text: label + (required ? ' *' : ''),
      for: id
    });
    if (required) labelEl.setAttribute('aria-required', 'true');

    var select = Utils.dom.create('select', { id: id, class: 'form-select' });
    options.forEach(function (opt) {
      var val = opt.value || opt;
      var lbl = opt.label || opt;
      var option = Utils.dom.create('option', { value: val, text: lbl });
      if (selectedValue === val) option.selected = true;
      Utils.dom.append(select, option);
    });

    Utils.dom.append(wrap, labelEl);
    Utils.dom.append(wrap, select);
    return { wrap: wrap, select: select };
  }

  function _createTagsField(currentTags, onChange) {
    var wrap = Utils.dom.create('div', { class: 'form-field' });
    var labelEl = Utils.dom.create('label', {
      class: 'form-label',
      text: 'Теги',
      for: 'editor-tags-input'
    });

    var tagsDisplay = Utils.dom.create('div', { class: 'tags-display', id: 'editor-tags-display' });
    var tagsInput = Utils.dom.create('input', {
      type: 'text',
      id: 'editor-tags-input',
      class: 'form-input',
      placeholder: 'Введите тег и нажмите Enter (макс. ' + MAX_TAGS + ')',
      autocomplete: 'off'
    });

    var suggestionsWrap = Utils.dom.create('div', {
      class: 'tag-suggestions',
      id: 'editor-tag-suggestions',
      hidden: 'hidden'
    });

    var tags = (currentTags || []).slice();

    function _renderTags() {
      Utils.dom.empty(tagsDisplay);
      tags.forEach(function (tag, idx) {
        var chip = Utils.dom.create('span', { class: 'tag-chip' });
        Utils.dom.append(chip, Utils.dom.create('span', { text: tag }));
        var removeBtn = Utils.dom.create('button', {
          class: 'tag-chip-remove',
          'aria-label': 'Удалить тег ' + tag,
          html: ICONS.close
        });
        removeBtn.addEventListener('click', function () {
          tags.splice(idx, 1);
          _renderTags();
          onChange(tags);
        });
        Utils.dom.append(chip, removeBtn);
        Utils.dom.append(tagsDisplay, chip);
      });
    }

    _renderTags();

    var allTags = _getAllTags();

    tagsInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var val = tagsInput.value.trim().replace(/,/g, '');
        if (val && tags.indexOf(val) === -1 && tags.length < MAX_TAGS) {
          tags.push(val);
          _renderTags();
          onChange(tags);
        }
        tagsInput.value = '';
        suggestionsWrap.hidden = true;
      } else if (e.key === 'Backspace' && tagsInput.value === '' && tags.length > 0) {
        tags.pop();
        _renderTags();
        onChange(tags);
      }
    });

    tagsInput.addEventListener('input', function (e) {
      var val = e.target.value.trim().toLowerCase();
      if (!val || val.length < 1) {
        suggestionsWrap.hidden = true;
        return;
      }
      var matches = allTags.filter(function (t) {
        return t.toLowerCase().indexOf(val) !== -1 && tags.indexOf(t) === -1;
      }).slice(0, 5);

      Utils.dom.empty(suggestionsWrap);
      if (matches.length === 0) {
        suggestionsWrap.hidden = true;
        return;
      }
      matches.forEach(function (match) {
        var chip = Utils.dom.create('button', {
          class: 'tag-suggestion-chip',
          text: match
        });
        chip.addEventListener('click', function () {
          if (tags.indexOf(match) === -1 && tags.length < MAX_TAGS) {
            tags.push(match);
            _renderTags();
            onChange(tags);
          }
          tagsInput.value = '';
          suggestionsWrap.hidden = true;
          tagsInput.focus();
        });
        Utils.dom.append(suggestionsWrap, chip);
      });
      suggestionsWrap.hidden = false;
    });

    tagsInput.addEventListener('blur', function () {
      setTimeout(function () { suggestionsWrap.hidden = true; }, 200);
    });

    Utils.dom.append(wrap, labelEl);
    Utils.dom.append(wrap, tagsDisplay);
    Utils.dom.append(wrap, tagsInput);
    Utils.dom.append(wrap, suggestionsWrap);

    return wrap;
  }

  function _renderValidationErrors() {
    // Clear all errors
    var allErrors = Utils.dom.$$('.form-error');
    allErrors.forEach(function (el) { el.hidden = true; });
    var allInputs = Utils.dom.$$('.form-input, .form-textarea');
    allInputs.forEach(function (el) {
      el.removeAttribute('aria-invalid');
      Utils.dom.removeClass(el, 'input-error');
    });

    // Show current errors
    Object.keys(_validationErrors).forEach(function (field) {
      var messages = _validationErrors[field];
      var errorEl = Utils.dom.$('#editor-' + field + '-error') || Utils.dom.$('#' + field + '-error');
      if (errorEl) {
        errorEl.hidden = false;
        Utils.dom.setText(errorEl, messages.join(', '));
      }
      var inputEl = Utils.dom.$('#editor-' + field) || Utils.dom.$('#' + field);
      if (inputEl) {
        inputEl.setAttribute('aria-invalid', 'true');
        Utils.dom.addClass(inputEl, 'input-error');
      }
    });
  }

  // ========================================================================
  // ФОРМА: BUG REPORT
  // ========================================================================

  function _renderBugReportForm(data) {
    var wrap = Utils.dom.create('div', { class: 'editor-type-form' });

    // Summary
    var summaryField = _createTextField('editor-summary', 'Краткое описание', data.summary, MAX_TITLE, 'Кратко опишите проблему', true);
    summaryField.input.addEventListener('input', function (e) {
      data.summary = e.target.value;
      _markDirty();
      _clearFieldError('summary');
    });
    Utils.dom.append(wrap, summaryField.wrap);

    // Description
    var descField = _createTextArea('editor-description', 'Подробное описание', data.description, MAX_DESC, 'Опишите проблему детально', true, 5);
    descField.textarea.addEventListener('input', function (e) {
      data.description = e.target.value;
      _markDirty();
      _clearFieldError('description');
    });
    Utils.dom.append(wrap, descField.wrap);

    // Steps
    var stepsWrap = Utils.dom.create('div', { class: 'form-field' });
    Utils.dom.append(stepsWrap, Utils.dom.create('label', { class: 'form-label', text: 'Шаги воспроизведения *' }));

    var stepsList = Utils.dom.create('div', { class: 'steps-list', id: 'editor-steps-list' });

    function _renderSteps() {
      Utils.dom.empty(stepsList);
      data.steps.forEach(function (step, idx) {
        var stepRow = Utils.dom.create('div', { class: 'step-row' });
        var stepNum = Utils.dom.create('span', { class: 'step-num', text: String(idx + 1) + '.' });
        var stepInput = Utils.dom.create('input', {
          type: 'text',
          class: 'form-input step-input',
          value: Utils.format.escapeHtml(step || ''),
          placeholder: 'Шаг ' + (idx + 1),
          'aria-label': 'Шаг ' + (idx + 1)
        });
        stepInput.addEventListener('input', function (e) {
          data.steps[idx] = e.target.value;
          _markDirty();
          _clearFieldError('steps');
        });
        var removeStepBtn = Utils.dom.create('button', {
          class: 'btn-icon step-remove-btn',
          'aria-label': 'Удалить шаг ' + (idx + 1),
          html: ICONS.remove,
          title: 'Удалить шаг'
        });
        removeStepBtn.addEventListener('click', function () {
          data.steps.splice(idx, 1);
          _renderSteps();
          _markDirty();
        });
        Utils.dom.append(stepRow, stepNum);
        Utils.dom.append(stepRow, stepInput);
        Utils.dom.append(stepRow, removeStepBtn);
        Utils.dom.append(stepsList, stepRow);
      });
    }

    _renderSteps();

    var addStepBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    addStepBtn.innerHTML = ICONS.add;
    Utils.dom.append(addStepBtn, Utils.dom.fromHTML('<span>Добавить шаг</span>'));
    addStepBtn.addEventListener('click', function () {
      if (data.steps.length >= MAX_STEPS) {
        _showToast('Максимум ' + MAX_STEPS + ' шагов', 'warning');
        return;
      }
      data.steps.push('');
      _renderSteps();
      _markDirty();
    });

    var stepsError = Utils.dom.create('div', { class: 'form-error', id: 'editor-steps-error', hidden: 'hidden' });

    Utils.dom.append(stepsWrap, stepsList);
    Utils.dom.append(stepsWrap, addStepBtn);
    Utils.dom.append(stepsWrap, stepsError);
    Utils.dom.append(wrap, stepsWrap);

    // Expected vs Actual
    var twoCol = Utils.dom.create('div', { class: 'form-row-two-col' });

    var expectedField = _createTextArea('editor-expected', 'Ожидаемый результат', data.expected, MAX_DESC, 'Что должно было произойти', false, 4);
    expectedField.textarea.addEventListener('input', function (e) { data.expected = e.target.value; _markDirty(); });
    Utils.dom.append(twoCol, expectedField.wrap);

    var actualField = _createTextArea('editor-actual', 'Фактический результат', data.actual, MAX_DESC, 'Что произошло на самом деле', false, 4);
    actualField.textarea.addEventListener('input', function (e) { data.actual = e.target.value; _markDirty(); });
    Utils.dom.append(twoCol, actualField.wrap);

    Utils.dom.append(wrap, twoCol);

    // Severity & Priority
    var severityPriorityRow = Utils.dom.create('div', { class: 'form-row-two-col' });

    var severityField = _createSelectField(
      'editor-severity',
      'Severity ( серьёзность )',
      Object.keys(SEVERITY_LABELS).map(function (k) { return { value: k, label: SEVERITY_LABELS[k] }; }),
      data.severity || 'major'
    );
    severityField.select.addEventListener('change', function (e) {
      data.severity = e.target.value;
      _markDirty();
      _updateSelectColor(e.target, SEVERITY_COLORS);
    });
    _updateSelectColor(severityField.select, SEVERITY_COLORS);
    Utils.dom.append(severityPriorityRow, severityField.wrap);

    var priorityField = _createSelectField(
      'editor-priority',
      'Priority ( приоритет )',
      Object.keys(PRIORITY_LABELS).map(function (k) { return { value: k, label: PRIORITY_LABELS[k] }; }),
      data.priority || 'medium'
    );
    priorityField.select.addEventListener('change', function (e) {
      data.priority = e.target.value;
      _markDirty();
      _updateSelectColor(e.target, PRIORITY_COLORS);
    });
    _updateSelectColor(priorityField.select, PRIORITY_COLORS);
    Utils.dom.append(severityPriorityRow, priorityField.wrap);

    Utils.dom.append(wrap, severityPriorityRow);

    // Status
    var statusField = _createSelectField(
      'editor-status',
      'Статус',
      Object.keys(STATUS_LABELS).map(function (k) { return { value: k, label: STATUS_LABELS[k] }; }),
      data.status || 'new'
    );
    statusField.select.addEventListener('change', function (e) {
      data.status = e.target.value;
      _markDirty();
      _updateSelectColor(e.target, STATUS_COLORS);
    });
    _updateSelectColor(statusField.select, STATUS_COLORS);
    Utils.dom.append(wrap, statusField.wrap);

    // Environment
    var envField = _createTextField('editor-environment', 'Окружение', data.environment, 500, 'Браузер, ОС, версия приложения', false);
    envField.input.addEventListener('input', function (e) { data.environment = e.target.value; _markDirty(); });
    Utils.dom.append(wrap, envField.wrap);

    return wrap;
  }

  // ========================================================================
  // ФОРМА: TEST CASE
  // ========================================================================

  function _renderTestCaseForm(data) {
    var wrap = Utils.dom.create('div', { class: 'editor-type-form' });

    // TC ID
    var idField = _createTextField('editor-tc-id', 'ID тест-кейса', data.id, 50, 'TC-001', false);
    idField.input.addEventListener('input', function (e) { data.id = e.target.value; _markDirty(); });
    Utils.dom.append(wrap, idField.wrap);

    // Title (inside data)
    var titleField = _createTextField('editor-tc-title', 'Название тест-кейса', data.title, MAX_TITLE, 'Что проверяем', true);
    titleField.input.addEventListener('input', function (e) {
      data.title = e.target.value;
      _markDirty();
      _clearFieldError('title');
    });
    Utils.dom.append(wrap, titleField.wrap);

    // Preconditions
    var precondField = _createTextArea('editor-preconditions', 'Предусловия', data.preconditions, MAX_DESC, 'Что должно быть настроено до теста', false, 3);
    precondField.textarea.addEventListener('input', function (e) { data.preconditions = e.target.value; _markDirty(); });
    Utils.dom.append(wrap, precondField.wrap);

    // Steps table
    var stepsWrap = Utils.dom.create('div', { class: 'form-field' });
    Utils.dom.append(stepsWrap, Utils.dom.create('label', { class: 'form-label', text: 'Шаги тест-кейса *' }));

    var stepsTableWrap = Utils.dom.create('div', { class: 'tc-steps-table-wrap', id: 'editor-tc-steps' });

    function _renderTcSteps() {
      Utils.dom.empty(stepsTableWrap);
      var table = Utils.dom.create('table', { class: 'tc-steps-table' });
      var thead = Utils.dom.create('thead');
      var headerRow = Utils.dom.create('tr');
      Utils.dom.append(headerRow, Utils.dom.create('th', { text: '№', class: 'tc-step-num-col' }));
      Utils.dom.append(headerRow, Utils.dom.create('th', { text: 'Действие' }));
      Utils.dom.append(headerRow, Utils.dom.create('th', { text: 'Ожидаемый результат' }));
      Utils.dom.append(headerRow, Utils.dom.create('th', { text: '', class: 'tc-step-action-col' }));
      Utils.dom.append(thead, headerRow);
      Utils.dom.append(table, thead);

      var tbody = Utils.dom.create('tbody');

      data.steps.forEach(function (step, idx) {
        var row = Utils.dom.create('tr');

        var numCell = Utils.dom.create('td', { class: 'tc-step-num-col' });
        Utils.dom.append(numCell, Utils.dom.create('span', { class: 'step-num', text: String(idx + 1) + '.' }));
        Utils.dom.append(row, numCell);

        var actionCell = Utils.dom.create('td');
        var actionInput = Utils.dom.create('textarea', {
          class: 'form-textarea tc-step-input',
          rows: '2',
          placeholder: 'Действие ' + (idx + 1),
          'aria-label': 'Действие шага ' + (idx + 1)
        });
        actionInput.value = step.action || '';
        actionInput.addEventListener('input', function (e) {
          data.steps[idx].action = e.target.value;
          _markDirty();
          _clearFieldError('steps');
        });
        Utils.dom.append(actionCell, actionInput);
        Utils.dom.append(row, actionCell);

        var expectedCell = Utils.dom.create('td');
        var expectedInput = Utils.dom.create('textarea', {
          class: 'form-textarea tc-step-input',
          rows: '2',
          placeholder: 'Ожидаемый результат',
          'aria-label': 'Ожидаемый результат шага ' + (idx + 1)
        });
        expectedInput.value = step.expectedResult || '';
        expectedInput.addEventListener('input', function (e) {
          data.steps[idx].expectedResult = e.target.value;
          _markDirty();
        });
        Utils.dom.append(expectedCell, expectedInput);
        Utils.dom.append(row, expectedCell);

        var actionBtnCell = Utils.dom.create('td', { class: 'tc-step-action-col' });
        var removeBtn = Utils.dom.create('button', {
          class: 'btn-icon step-remove-btn',
          'aria-label': 'Удалить шаг ' + (idx + 1),
          html: ICONS.remove,
          title: 'Удалить шаг'
        });
        removeBtn.addEventListener('click', function () {
          data.steps.splice(idx, 1);
          _renderTcSteps();
          _markDirty();
        });
        Utils.dom.append(actionBtnCell, removeBtn);
        Utils.dom.append(row, actionBtnCell);

        Utils.dom.append(tbody, row);
      });

      Utils.dom.append(table, tbody);
      Utils.dom.append(stepsTableWrap, table);
    }

    _renderTcSteps();

    var addStepBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    addStepBtn.innerHTML = ICONS.add;
    Utils.dom.append(addStepBtn, Utils.dom.fromHTML('<span>Добавить шаг</span>'));
    addStepBtn.addEventListener('click', function () {
      if (data.steps.length >= MAX_STEPS) {
        _showToast('Максимум ' + MAX_STEPS + ' шагов', 'warning');
        return;
      }
      data.steps.push({ action: '', expectedResult: '' });
      _renderTcSteps();
      _markDirty();
    });

    var stepsError = Utils.dom.create('div', { class: 'form-error', id: 'editor-steps-error', hidden: 'hidden' });

    Utils.dom.append(stepsWrap, stepsTableWrap);
    Utils.dom.append(stepsWrap, addStepBtn);
    Utils.dom.append(stepsWrap, stepsError);
    Utils.dom.append(wrap, stepsWrap);

    // Postconditions
    var postcondField = _createTextArea('editor-postconditions', 'Постусловия', data.postconditions, MAX_DESC, 'Что нужно сделать после теста', false, 3);
    postcondField.textarea.addEventListener('input', function (e) { data.postconditions = e.target.value; _markDirty(); });
    Utils.dom.append(wrap, postcondField.wrap);

    // Type, Priority, Status
    var threeCol = Utils.dom.create('div', { class: 'form-row-three-col' });

    var typeField = _createSelectField(
      'editor-tc-type',
      'Тип',
      Object.keys(TC_TYPE_LABELS).map(function (k) { return { value: k, label: TC_TYPE_LABELS[k] }; }),
      data.type || 'functional'
    );
    typeField.select.addEventListener('change', function (e) { data.type = e.target.value; _markDirty(); });
    Utils.dom.append(threeCol, typeField.wrap);

    var priorityField = _createSelectField(
      'editor-tc-priority',
      'Приоритет',
      Object.keys(TC_PRIORITY_LABELS).map(function (k) { return { value: k, label: TC_PRIORITY_LABELS[k] }; }),
      data.priority || 'medium'
    );
    priorityField.select.addEventListener('change', function (e) { data.priority = e.target.value; _markDirty(); });
    Utils.dom.append(threeCol, priorityField.wrap);

    var statusField = _createSelectField(
      'editor-tc-status',
      'Статус',
      Object.keys(TC_STATUS_LABELS).map(function (k) { return { value: k, label: TC_STATUS_LABELS[k] }; }),
      data.status || 'not_executed'
    );
    statusField.select.addEventListener('change', function (e) {
      data.status = e.target.value;
      _markDirty();
      _updateSelectColor(e.target, TC_STATUS_COLORS);
    });
    _updateSelectColor(statusField.select, TC_STATUS_COLORS);
    Utils.dom.append(threeCol, statusField.wrap);

    Utils.dom.append(wrap, threeCol);

    return wrap;
  }

  // ========================================================================
  // ФОРМА: CHECKLIST
  // ========================================================================

  function _renderChecklistForm(data) {
    var wrap = Utils.dom.create('div', { class: 'editor-type-form' });

    // Title (inside data)
    var titleField = _createTextField('editor-cl-title', 'Название чек-листа', data.title, MAX_TITLE, 'Что проверяем', true);
    titleField.input.addEventListener('input', function (e) {
      data.title = e.target.value;
      _markDirty();
      _clearFieldError('title');
    });
    Utils.dom.append(wrap, titleField.wrap);

    // Progress bar
    var progressWrap = Utils.dom.create('div', { class: 'form-field' });
    var progressLabel = Utils.dom.create('div', { class: 'cl-progress-label', id: 'editor-cl-progress-label' });
    var progressBar = Utils.dom.create('div', { class: 'progress-bar' });
    var progressFill = Utils.dom.create('div', { class: 'progress-bar-fill', id: 'editor-cl-progress-fill' });

    Utils.dom.append(progressBar, progressFill);
    Utils.dom.append(progressWrap, progressLabel);
    Utils.dom.append(progressWrap, progressBar);
    Utils.dom.append(wrap, progressWrap);

    function _updateProgress() {
      var total = data.items.length;
      var checked = data.items.filter(function (item) { return item.isChecked; }).length;
      var pct = total > 0 ? Math.round(checked / total * 100) : 0;
      Utils.dom.setText(progressLabel, checked + ' из ' + total + ' (' + pct + '%)');
      if (progressFill) progressFill.style.width = pct + '%';
    }

    // Items list
    var itemsWrap = Utils.dom.create('div', { class: 'form-field' });
    Utils.dom.append(itemsWrap, Utils.dom.create('label', { class: 'form-label', text: 'Пункты чек-листа *' }));

    var itemsList = Utils.dom.create('div', { class: 'cl-items-list', id: 'editor-cl-items' });

    function _renderItems() {
      Utils.dom.empty(itemsList);

      data.items.forEach(function (item, idx) {
        var row = Utils.dom.create('div', { class: 'cl-item-row' });

        var checkbox = Utils.dom.create('input', {
          type: 'checkbox',
          class: 'cl-item-checkbox',
          id: 'editor-cl-item-' + idx
        });
        checkbox.checked = !!item.isChecked;
        checkbox.addEventListener('change', function (e) {
          data.items[idx].isChecked = e.target.checked;
          _markDirty();
          _updateProgress();
        });

        var textInput = Utils.dom.create('input', {
          type: 'text',
          class: 'form-input cl-item-text',
          value: Utils.format.escapeHtml(item.text || ''),
          placeholder: 'Пункт ' + (idx + 1),
          'aria-label': 'Пункт ' + (idx + 1)
        });
        textInput.addEventListener('input', function (e) {
          data.items[idx].text = e.target.value;
          _markDirty();
        });

        var categoryInput = Utils.dom.create('input', {
          type: 'text',
          class: 'form-input cl-item-category',
          value: Utils.format.escapeHtml(item.category || ''),
          placeholder: 'Категория',
          'aria-label': 'Категория пункта ' + (idx + 1)
        });
        categoryInput.addEventListener('input', function (e) {
          data.items[idx].category = e.target.value;
          _markDirty();
        });

        var removeBtn = Utils.dom.create('button', {
          class: 'btn-icon cl-item-remove',
          'aria-label': 'Удалить пункт ' + (idx + 1),
          html: ICONS.remove,
          title: 'Удалить пункт'
        });
        removeBtn.addEventListener('click', function () {
          data.items.splice(idx, 1);
          _renderItems();
          _updateProgress();
          _markDirty();
        });

        Utils.dom.append(row, checkbox);
        Utils.dom.append(row, textInput);
        Utils.dom.append(row, categoryInput);
        Utils.dom.append(row, removeBtn);
        Utils.dom.append(itemsList, row);
      });
    }

    _renderItems();
    _updateProgress();

    var addItemBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    addItemBtn.innerHTML = ICONS.add;
    Utils.dom.append(addItemBtn, Utils.dom.fromHTML('<span>Добавить пункт</span>'));
    addItemBtn.addEventListener('click', function () {
      data.items.push({ text: '', isChecked: false, category: '' });
      _renderItems();
      _updateProgress();
      _markDirty();
    });

    var itemsError = Utils.dom.create('div', { class: 'form-error', id: 'editor-items-error', hidden: 'hidden' });

    Utils.dom.append(itemsWrap, itemsList);
    Utils.dom.append(itemsWrap, addItemBtn);
    Utils.dom.append(itemsWrap, itemsError);
    Utils.dom.append(wrap, itemsWrap);

    return wrap;
  }

  // ========================================================================
  // ФОРМА: TEST PLAN
  // ========================================================================

  function _renderTestPlanForm(data) {
    var wrap = Utils.dom.create('div', { class: 'editor-type-form' });

    // Title
    var titleField = _createTextField('editor-tp-title', 'Название тест-плана', data.title, MAX_TITLE, 'План тестирования', true);
    titleField.input.addEventListener('input', function (e) {
      data.title = e.target.value;
      _markDirty();
      _clearFieldError('title');
    });
    Utils.dom.append(wrap, titleField.wrap);

    // Scope
    var scopeField = _createTextArea('editor-scope', 'Область тестирования', data.scope, MAX_DESC, 'Что входит в тестирование', false, 4);
    scopeField.textarea.addEventListener('input', function (e) { data.scope = e.target.value; _markDirty(); });
    Utils.dom.append(wrap, scopeField.wrap);

    // Strategy
    var strategyField = _createTextArea('editor-strategy', 'Стратегия', data.strategy, MAX_DESC, 'Подход к тестированию', false, 4);
    strategyField.textarea.addEventListener('input', function (e) { data.strategy = e.target.value; _markDirty(); });
    Utils.dom.append(wrap, strategyField.wrap);

    // Schedule
    var scheduleWrap = Utils.dom.create('div', { class: 'form-field' });
    Utils.dom.append(scheduleWrap, Utils.dom.create('label', { class: 'form-label', text: 'Расписание' }));
    var scheduleList = Utils.dom.create('div', { class: 'tp-schedule-list', id: 'editor-tp-schedule' });

    function _renderSchedule() {
      Utils.dom.empty(scheduleList);
      data.schedule.forEach(function (item, idx) {
        var row = Utils.dom.create('div', { class: 'tp-schedule-row' });

        var phaseInput = Utils.dom.create('input', {
          type: 'text', class: 'form-input tp-phase',
          value: Utils.format.escapeHtml(item.phase || ''),
          placeholder: 'Фаза',
          'aria-label': 'Фаза ' + (idx + 1)
        });
        phaseInput.addEventListener('input', function (e) { data.schedule[idx].phase = e.target.value; _markDirty(); });

        var startDate = Utils.dom.create('input', {
          type: 'date', class: 'form-input tp-date',
          value: item.startDate || '',
          'aria-label': 'Дата начала фазы ' + (idx + 1)
        });
        startDate.addEventListener('change', function (e) { data.schedule[idx].startDate = e.target.value; _markDirty(); });

        var endDate = Utils.dom.create('input', {
          type: 'date', class: 'form-input tp-date',
          value: item.endDate || '',
          'aria-label': 'Дата окончания фазы ' + (idx + 1)
        });
        endDate.addEventListener('change', function (e) { data.schedule[idx].endDate = e.target.value; _markDirty(); });

        var responsibleInput = Utils.dom.create('input', {
          type: 'text', class: 'form-input tp-responsible',
          value: Utils.format.escapeHtml(item.responsible || ''),
          placeholder: 'Ответственный',
          'aria-label': 'Ответственный за фазу ' + (idx + 1)
        });
        responsibleInput.addEventListener('input', function (e) { data.schedule[idx].responsible = e.target.value; _markDirty(); });

        var removeBtn = Utils.dom.create('button', {
          class: 'btn-icon step-remove-btn',
          'aria-label': 'Удалить фазу ' + (idx + 1),
          html: ICONS.remove
        });
        removeBtn.addEventListener('click', function () {
          data.schedule.splice(idx, 1);
          _renderSchedule();
          _markDirty();
        });

        Utils.dom.append(row, phaseInput);
        Utils.dom.append(row, startDate);
        Utils.dom.append(row, endDate);
        Utils.dom.append(row, responsibleInput);
        Utils.dom.append(row, removeBtn);
        Utils.dom.append(scheduleList, row);
      });
    }

    _renderSchedule();

    var addScheduleBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    addScheduleBtn.innerHTML = ICONS.add;
    Utils.dom.append(addScheduleBtn, Utils.dom.fromHTML('<span>Добавить фазу</span>'));
    addScheduleBtn.addEventListener('click', function () {
      data.schedule.push({ phase: '', startDate: '', endDate: '', responsible: '' });
      _renderSchedule();
      _markDirty();
    });

    Utils.dom.append(scheduleWrap, scheduleList);
    Utils.dom.append(scheduleWrap, addScheduleBtn);
    Utils.dom.append(wrap, scheduleWrap);

    // Risks
    var risksWrap = Utils.dom.create('div', { class: 'form-field' });
    Utils.dom.append(risksWrap, Utils.dom.create('label', { class: 'form-label', text: 'Риски' }));
    var risksList = Utils.dom.create('div', { class: 'tp-risks-list', id: 'editor-tp-risks' });

    function _renderRisks() {
      Utils.dom.empty(risksList);
      data.risks.forEach(function (risk, idx) {
        var row = Utils.dom.create('div', { class: 'tp-risk-row' });

        var riskInput = Utils.dom.create('input', {
          type: 'text', class: 'form-input tp-risk-desc',
          value: Utils.format.escapeHtml(risk.risk || ''),
          placeholder: 'Описание риска',
          'aria-label': 'Риск ' + (idx + 1)
        });
        riskInput.addEventListener('input', function (e) { data.risks[idx].risk = e.target.value; _markDirty(); });

        var impactSelect = Utils.dom.create('select', { class: 'form-select tp-risk-impact', 'aria-label': 'Влияние риска ' + (idx + 1) });
        Object.keys(IMPACT_LABELS).forEach(function (k) {
          var opt = Utils.dom.create('option', { value: k, text: IMPACT_LABELS[k] });
          if (risk.impact === k) opt.selected = true;
          Utils.dom.append(impactSelect, opt);
        });
        impactSelect.addEventListener('change', function (e) { data.risks[idx].impact = e.target.value; _markDirty(); _updateSelectColor(e.target, IMPACT_COLORS); });
        _updateSelectColor(impactSelect, IMPACT_COLORS);

        var mitigationInput = Utils.dom.create('input', {
          type: 'text', class: 'form-input tp-risk-mitigation',
          value: Utils.format.escapeHtml(risk.mitigation || ''),
          placeholder: 'Меры по снижению',
          'aria-label': 'Меры по снижению риска ' + (idx + 1)
        });
        mitigationInput.addEventListener('input', function (e) { data.risks[idx].mitigation = e.target.value; _markDirty(); });

        var removeBtn = Utils.dom.create('button', {
          class: 'btn-icon step-remove-btn',
          'aria-label': 'Удалить риск ' + (idx + 1),
          html: ICONS.remove
        });
        removeBtn.addEventListener('click', function () {
          data.risks.splice(idx, 1);
          _renderRisks();
          _markDirty();
        });

        Utils.dom.append(row, riskInput);
        Utils.dom.append(row, impactSelect);
        Utils.dom.append(row, mitigationInput);
        Utils.dom.append(row, removeBtn);
        Utils.dom.append(risksList, row);
      });
    }

    _renderRisks();

    var addRiskBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    addRiskBtn.innerHTML = ICONS.add;
    Utils.dom.append(addRiskBtn, Utils.dom.fromHTML('<span>Добавить риск</span>'));
    addRiskBtn.addEventListener('click', function () {
      data.risks.push({ risk: '', impact: 'medium', mitigation: '' });
      _renderRisks();
      _markDirty();
    });

    Utils.dom.append(risksWrap, risksList);
    Utils.dom.append(risksWrap, addRiskBtn);
    Utils.dom.append(wrap, risksWrap);

    // Resources
    var resourcesWrap = Utils.dom.create('div', { class: 'form-field' });
    Utils.dom.append(resourcesWrap, Utils.dom.create('label', { class: 'form-label', text: 'Ресурсы' }));
    var resourcesList = Utils.dom.create('div', { class: 'tp-resources-list', id: 'editor-tp-resources' });

    function _renderResources() {
      Utils.dom.empty(resourcesList);
      data.resources.forEach(function (res, idx) {
        var row = Utils.dom.create('div', { class: 'tp-resource-row' });
        var input = Utils.dom.create('input', {
          type: 'text', class: 'form-input tp-resource-input',
          value: Utils.format.escapeHtml(res || ''),
          placeholder: 'Ресурс ' + (idx + 1),
          'aria-label': 'Ресурс ' + (idx + 1)
        });
        input.addEventListener('input', function (e) { data.resources[idx] = e.target.value; _markDirty(); });

        var removeBtn = Utils.dom.create('button', {
          class: 'btn-icon step-remove-btn',
          'aria-label': 'Удалить ресурс ' + (idx + 1),
          html: ICONS.remove
        });
        removeBtn.addEventListener('click', function () {
          data.resources.splice(idx, 1);
          _renderResources();
          _markDirty();
        });

        Utils.dom.append(row, input);
        Utils.dom.append(row, removeBtn);
        Utils.dom.append(resourcesList, row);
      });
    }

    _renderResources();

    var addResBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    addResBtn.innerHTML = ICONS.add;
    Utils.dom.append(addResBtn, Utils.dom.fromHTML('<span>Добавить ресурс</span>'));
    addResBtn.addEventListener('click', function () {
      data.resources.push('');
      _renderResources();
      _markDirty();
    });

    Utils.dom.append(resourcesWrap, resourcesList);
    Utils.dom.append(resourcesWrap, addResBtn);
    Utils.dom.append(wrap, resourcesWrap);

    // Approvals
    var approvalsWrap = Utils.dom.create('div', { class: 'form-field' });
    Utils.dom.append(approvalsWrap, Utils.dom.create('label', { class: 'form-label', text: 'Согласования' }));
    var approvalsList = Utils.dom.create('div', { class: 'tp-approvals-list', id: 'editor-tp-approvals' });

    function _renderApprovals() {
      Utils.dom.empty(approvalsList);
      data.approvals.forEach(function (ap, idx) {
        var row = Utils.dom.create('div', { class: 'tp-approval-row' });

        var roleInput = Utils.dom.create('input', {
          type: 'text', class: 'form-input tp-approval-role',
          value: Utils.format.escapeHtml(ap.role || ''),
          placeholder: 'Роль',
          'aria-label': 'Роль ' + (idx + 1)
        });
        roleInput.addEventListener('input', function (e) { data.approvals[idx].role = e.target.value; _markDirty(); });

        var nameInput = Utils.dom.create('input', {
          type: 'text', class: 'form-input tp-approval-name',
          value: Utils.format.escapeHtml(ap.name || ''),
          placeholder: 'Имя',
          'aria-label': 'Имя ' + (idx + 1)
        });
        nameInput.addEventListener('input', function (e) { data.approvals[idx].name = e.target.value; _markDirty(); });

        var dateInput = Utils.dom.create('input', {
          type: 'date', class: 'form-input tp-approval-date',
          value: ap.date || '',
          'aria-label': 'Дата согласования ' + (idx + 1)
        });
        dateInput.addEventListener('change', function (e) { data.approvals[idx].date = e.target.value; _markDirty(); });

        var approvedCb = Utils.dom.create('input', {
          type: 'checkbox', class: 'tp-approval-cb',
          'aria-label': 'Согласовано ' + (idx + 1)
        });
        approvedCb.checked = !!ap.approved;
        approvedCb.addEventListener('change', function (e) { data.approvals[idx].approved = e.target.checked; _markDirty(); });

        var removeBtn = Utils.dom.create('button', {
          class: 'btn-icon step-remove-btn',
          'aria-label': 'Удалить согласование ' + (idx + 1),
          html: ICONS.remove
        });
        removeBtn.addEventListener('click', function () {
          data.approvals.splice(idx, 1);
          _renderApprovals();
          _markDirty();
        });

        Utils.dom.append(row, roleInput);
        Utils.dom.append(row, nameInput);
        Utils.dom.append(row, dateInput);
        Utils.dom.append(row, approvedCb);
        Utils.dom.append(row, removeBtn);
        Utils.dom.append(approvalsList, row);
      });
    }

    _renderApprovals();

    var addApprovalBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    addApprovalBtn.innerHTML = ICONS.add;
    Utils.dom.append(addApprovalBtn, Utils.dom.fromHTML('<span>Добавить согласование</span>'));
    addApprovalBtn.addEventListener('click', function () {
      data.approvals.push({ role: '', name: '', date: '', approved: false });
      _renderApprovals();
      _markDirty();
    });

    Utils.dom.append(approvalsWrap, approvalsList);
    Utils.dom.append(approvalsWrap, addApprovalBtn);
    Utils.dom.append(wrap, approvalsWrap);

    return wrap;
  }

  // ========================================================================
  // ФОРМА: API TEST
  // ========================================================================

  function _renderApiTestForm(data) {
    var wrap = Utils.dom.create('div', { class: 'editor-type-form' });

    // Title
    var titleField = _createTextField('editor-api-title', 'Название API-теста', data.title, MAX_TITLE, 'GET /api/users — список пользователей', true);
    titleField.input.addEventListener('input', function (e) {
      data.title = e.target.value;
      _markDirty();
      _clearFieldError('title');
    });
    Utils.dom.append(wrap, titleField.wrap);

    // Method + URL
    var methodUrlRow = Utils.dom.create('div', { class: 'form-row-two-col' });

    var methodField = _createSelectField(
      'editor-api-method',
      'HTTP-метод',
      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(function (m) { return { value: m, label: m }; }),
      data.method || 'GET'
    );
    methodField.select.addEventListener('change', function (e) {
      data.method = e.target.value;
      _markDirty();
      _updateSelectColor(e.target, HTTP_METHOD_COLORS);
    });
    _updateSelectColor(methodField.select, HTTP_METHOD_COLORS);
    Utils.dom.append(methodUrlRow, methodField.wrap);

    var urlField = _createTextField('editor-api-url', 'URL', data.url, 2000, 'https://api.example.com/v1/users', true);
    urlField.input.addEventListener('input', function (e) {
      data.url = e.target.value;
      _markDirty();
      _clearFieldError('url');
    });
    Utils.dom.append(methodUrlRow, urlField.wrap);

    Utils.dom.append(wrap, methodUrlRow);

    // Headers
    var headersWrap = Utils.dom.create('div', { class: 'form-field' });
    Utils.dom.append(headersWrap, Utils.dom.create('label', { class: 'form-label', text: 'Заголовки' }));
    var headersList = Utils.dom.create('div', { class: 'api-headers-list', id: 'editor-api-headers' });

    function _renderHeaders() {
      Utils.dom.empty(headersList);
      data.headers.forEach(function (header, idx) {
        var row = Utils.dom.create('div', { class: 'api-header-row' });

        var keyInput = Utils.dom.create('input', {
          type: 'text', class: 'form-input api-header-key',
          value: Utils.format.escapeHtml(header.key || ''),
          placeholder: 'Content-Type',
          'aria-label': 'Имя заголовка ' + (idx + 1)
        });
        keyInput.addEventListener('input', function (e) { data.headers[idx].key = e.target.value; _markDirty(); });

        var valueInput = Utils.dom.create('input', {
          type: 'text', class: 'form-input api-header-value',
          value: Utils.format.escapeHtml(header.value || ''),
          placeholder: 'application/json',
          'aria-label': 'Значение заголовка ' + (idx + 1)
        });
        valueInput.addEventListener('input', function (e) { data.headers[idx].value = e.target.value; _markDirty(); });

        var removeBtn = Utils.dom.create('button', {
          class: 'btn-icon step-remove-btn',
          'aria-label': 'Удалить заголовок ' + (idx + 1),
          html: ICONS.remove
        });
        removeBtn.addEventListener('click', function () {
          data.headers.splice(idx, 1);
          _renderHeaders();
          _markDirty();
        });

        Utils.dom.append(row, keyInput);
        Utils.dom.append(row, valueInput);
        Utils.dom.append(row, removeBtn);
        Utils.dom.append(headersList, row);
      });
    }

    _renderHeaders();

    var addHeaderBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    addHeaderBtn.innerHTML = ICONS.add;
    Utils.dom.append(addHeaderBtn, Utils.dom.fromHTML('<span>Добавить заголовок</span>'));
    addHeaderBtn.addEventListener('click', function () {
      data.headers.push({ key: '', value: '' });
      _renderHeaders();
      _markDirty();
    });

    Utils.dom.append(headersWrap, headersList);
    Utils.dom.append(headersWrap, addHeaderBtn);
    Utils.dom.append(wrap, headersWrap);

    // Body
    var bodyField = _createTextArea('editor-api-body', 'Тело запроса (JSON)', data.body, MAX_DESC, '{\n  "key": "value"\n}', false, 8);
    bodyField.textarea.style.fontFamily = 'monospace';
    bodyField.textarea.addEventListener('input', function (e) {
      data.body = e.target.value;
      _markDirty();
      _clearFieldError('body');
    });

    var validateBodyBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    validateBodyBtn.innerHTML = ICONS.validate;
    Utils.dom.append(validateBodyBtn, Utils.dom.fromHTML('<span>Проверить JSON</span>'));
    validateBodyBtn.addEventListener('click', function () {
      var val = bodyField.textarea.value.trim();
      if (!val) {
        _showToast('Тело запроса пустое', 'info');
        return;
      }
      if (Utils.validate.isJSON(val)) {
        _showToast('JSON валиден', 'success');
        _clearFieldError('body');
      } else {
        _showToast('Невалидный JSON', 'error');
        if (bodyField.error) {
          bodyField.error.hidden = false;
          Utils.dom.setText(bodyField.error, 'Невалидный JSON');
        }
      }
    });

    Utils.dom.append(wrap, bodyField.wrap);
    Utils.dom.append(wrap, validateBodyBtn);

    // Expected status
    var statusRow = Utils.dom.create('div', { class: 'form-row-two-col' });
    var statusField = _createTextField('editor-api-expected-status', 'Ожидаемый HTTP-статус', String(data.expectedStatus || 200), 3, '200', false);
    statusField.input.setAttribute('type', 'number');
    statusField.input.addEventListener('input', function (e) {
      data.expectedStatus = parseInt(e.target.value, 10) || 200;
      _markDirty();
    });
    Utils.dom.append(statusRow, statusField.wrap);
    Utils.dom.append(wrap, statusRow);

    // Expected response
    var expectedField = _createTextArea('editor-api-expected-response', 'Ожидаемый ответ (JSON)', data.expectedResponse, MAX_DESC, '{\n  "success": true\n}', false, 8);
    expectedField.textarea.style.fontFamily = 'monospace';
    expectedField.textarea.addEventListener('input', function (e) {
      data.expectedResponse = e.target.value;
      _markDirty();
      _clearFieldError('expectedResponse');
    });

    var validateRespBtn = Utils.dom.create('button', { class: 'btn btn-outline btn-sm' });
    validateRespBtn.innerHTML = ICONS.validate;
    Utils.dom.append(validateRespBtn, Utils.dom.fromHTML('<span>Проверить JSON</span>'));
    validateRespBtn.addEventListener('click', function () {
      var val = expectedField.textarea.value.trim();
      if (!val) {
        _showToast('Ожидаемый ответ пустой', 'info');
        return;
      }
      if (Utils.validate.isJSON(val)) {
        _showToast('JSON валиден', 'success');
        _clearFieldError('expectedResponse');
      } else {
        _showToast('Невалидный JSON', 'error');
        if (expectedField.error) {
          expectedField.error.hidden = false;
          Utils.dom.setText(expectedField.error, 'Невалидный JSON');
        }
      }
    });

    Utils.dom.append(wrap, expectedField.wrap);
    Utils.dom.append(wrap, validateRespBtn);

    return wrap;
  }

  // ========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ФОРМ
  // ========================================================================

  function _clearFieldError(field) {
    if (_validationErrors[field]) {
      delete _validationErrors[field];
      var errorEl = Utils.dom.$('#editor-' + field + '-error') || Utils.dom.$('#' + field + '-error');
      if (errorEl) errorEl.hidden = true;
      var inputEl = Utils.dom.$('#editor-' + field) || Utils.dom.$('#' + field);
      if (inputEl) {
        inputEl.removeAttribute('aria-invalid');
        Utils.dom.removeClass(inputEl, 'input-error');
      }
    }
  }

  function _updateSelectColor(select, colorMap) {
    if (!select || !colorMap) return;
    var val = select.value;
    var color = colorMap[val] || '#6b7280';
    select.style.borderColor = color;
    select.style.color = color;
    select.style.fontWeight = '600';
  }

  // ========================================================================
  // РЕНДЕР ПРЕДПРОСМОТРА
  // ========================================================================

  function _renderPreview(artifact) {
    var wrap = Utils.dom.create('div', { class: 'editor-preview' });

    switch (artifact.type) {
      case 'bug_report':
        Utils.dom.append(wrap, _renderBugReportPreview(artifact));
        break;
      case 'test_case':
        Utils.dom.append(wrap, _renderTestCasePreview(artifact));
        break;
      case 'checklist':
        Utils.dom.append(wrap, _renderChecklistPreview(artifact));
        break;
      case 'test_plan':
        Utils.dom.append(wrap, _renderTestPlanPreview(artifact));
        break;
      case 'api_test':
        Utils.dom.append(wrap, _renderApiTestPreview(artifact));
        break;
      default:
        Utils.dom.append(wrap, Utils.dom.create('p', { text: 'Предпросмотр недоступен для этого типа' }));
    }

    // Tags
    if (artifact.tags && artifact.tags.length > 0) {
      var tagsWrap = Utils.dom.create('div', { class: 'preview-tags' });
      Utils.dom.append(tagsWrap, Utils.dom.create('span', { class: 'preview-section-label', text: 'Теги:' }));
      artifact.tags.forEach(function (tag) {
        Utils.dom.append(tagsWrap, Utils.dom.create('span', {
          class: 'tag-chip tag-chip-readonly',
          text: tag
        }));
      });
      Utils.dom.append(wrap, tagsWrap);
    }

    // Meta
    var metaWrap = Utils.dom.create('div', { class: 'preview-meta' });
    if (artifact.createdAt) {
      Utils.dom.append(metaWrap, Utils.dom.create('span', { text: 'Создан: ' + _formatDate(artifact.createdAt) }));
    }
    if (artifact.updatedAt) {
      Utils.dom.append(metaWrap, Utils.dom.create('span', { text: 'Обновлён: ' + _formatDate(artifact.updatedAt) }));
    }
    Utils.dom.append(wrap, metaWrap);

    return wrap;
  }

  function _renderBadge(text, color) {
    var badge = Utils.dom.create('span', {
      class: 'preview-badge',
      text: text
    });
    badge.style.backgroundColor = color + '20';
    badge.style.color = color;
    badge.style.borderColor = color;
    return badge;
  }

  function _renderSectionLabel(text) {
    return Utils.dom.create('h4', { class: 'preview-section-label', text: text });
  }

  function _renderBugReportPreview(artifact) {
    var wrap = Utils.dom.create('div', { class: 'preview-bug-report' });
    var d = artifact.data || {};

    // Summary
    Utils.dom.append(wrap, Utils.dom.create('h3', {
      class: 'preview-title',
      text: d.summary || artifact.title || 'Баг-репорт'
    }));

    // Badges
    var badgesRow = Utils.dom.create('div', { class: 'preview-badges' });
    if (d.severity) Utils.dom.append(badgesRow, _renderBadge('Severity: ' + (SEVERITY_LABELS[d.severity] || d.severity), SEVERITY_COLORS[d.severity] || '#6b7280'));
    if (d.priority) Utils.dom.append(badgesRow, _renderBadge('Priority: ' + (PRIORITY_LABELS[d.priority] || d.priority), PRIORITY_COLORS[d.priority] || '#6b7280'));
    if (d.status) Utils.dom.append(badgesRow, _renderBadge(STATUS_LABELS[d.status] || d.status, STATUS_COLORS[d.status] || '#6b7280'));
    Utils.dom.append(wrap, badgesRow);

    // Info table
    var infoTable = Utils.dom.create('table', { class: 'preview-info-table' });
    var infoRows = [];
    if (d.environment) infoRows.push(['Окружение', d.environment]);
    if (artifact.createdAt) infoRows.push(['Создан', _formatDate(artifact.createdAt)]);
    if (artifact.updatedAt) infoRows.push(['Обновлён', _formatDate(artifact.updatedAt)]);
    infoRows.forEach(function (row) {
      var tr = Utils.dom.create('tr');
      Utils.dom.append(tr, Utils.dom.create('th', { text: row[0] }));
      Utils.dom.append(tr, Utils.dom.create('td', { text: row[1] }));
      Utils.dom.append(infoTable, tr);
    });
    if (infoRows.length > 0) Utils.dom.append(wrap, infoTable);

    // Description
    if (d.description) {
      Utils.dom.append(wrap, _renderSectionLabel('Описание'));
      Utils.dom.append(wrap, Utils.dom.create('p', { class: 'preview-text', text: d.description }));
    }

    // Steps
    if (d.steps && d.steps.length > 0) {
      Utils.dom.append(wrap, _renderSectionLabel('Шаги воспроизведения'));
      var ol = Utils.dom.create('ol', { class: 'preview-steps' });
      d.steps.forEach(function (step) {
        if (step) Utils.dom.append(ol, Utils.dom.create('li', { text: step }));
      });
      Utils.dom.append(wrap, ol);
    }

    // Expected vs Actual
    var twoCol = Utils.dom.create('div', { class: 'preview-two-col' });
    if (d.expected) {
      var expWrap = Utils.dom.create('div');
      Utils.dom.append(expWrap, _renderSectionLabel('Ожидаемый результат'));
      Utils.dom.append(expWrap, Utils.dom.create('p', { class: 'preview-text', text: d.expected }));
      Utils.dom.append(twoCol, expWrap);
    }
    if (d.actual) {
      var actWrap = Utils.dom.create('div');
      Utils.dom.append(actWrap, _renderSectionLabel('Фактический результат'));
      Utils.dom.append(actWrap, Utils.dom.create('p', { class: 'preview-text', text: d.actual }));
      Utils.dom.append(twoCol, actWrap);
    }
    if (d.expected || d.actual) Utils.dom.append(wrap, twoCol);

    return wrap;
  }

  function _renderTestCasePreview(artifact) {
    var wrap = Utils.dom.create('div', { class: 'preview-test-case' });
    var d = artifact.data || {};

    // Title + ID
    var titleWrap = Utils.dom.create('div', { class: 'preview-title-wrap' });
    Utils.dom.append(titleWrap, Utils.dom.create('h3', { class: 'preview-title', text: d.title || artifact.title || 'Тест-кейс' }));
    if (d.id) Utils.dom.append(titleWrap, Utils.dom.create('span', { class: 'preview-id-badge', text: d.id }));
    Utils.dom.append(wrap, titleWrap);

    // Badges
    var badgesRow = Utils.dom.create('div', { class: 'preview-badges' });
    if (d.type) Utils.dom.append(badgesRow, _renderBadge(TC_TYPE_LABELS[d.type] || d.type, '#3b82f6'));
    if (d.priority) Utils.dom.append(badgesRow, _renderBadge(TC_PRIORITY_LABELS[d.priority] || d.priority, PRIORITY_COLORS[d.priority] || '#6b7280'));
    if (d.status) Utils.dom.append(badgesRow, _renderBadge(TC_STATUS_LABELS[d.status] || d.status, TC_STATUS_COLORS[d.status] || '#6b7280'));
    Utils.dom.append(wrap, badgesRow);

    // Preconditions
    if (d.preconditions) {
      Utils.dom.append(wrap, _renderSectionLabel('Предусловия'));
      Utils.dom.append(wrap, Utils.dom.create('p', { class: 'preview-text', text: d.preconditions }));
    }

    // Steps table
    if (d.steps && d.steps.length > 0) {
      Utils.dom.append(wrap, _renderSectionLabel('Шаги'));
      var table = Utils.dom.create('table', { class: 'preview-steps-table' });
      var thead = Utils.dom.create('thead');
      var headerRow = Utils.dom.create('tr');
      Utils.dom.append(headerRow, Utils.dom.create('th', { text: '№' }));
      Utils.dom.append(headerRow, Utils.dom.create('th', { text: 'Действие' }));
      Utils.dom.append(headerRow, Utils.dom.create('th', { text: 'Ожидаемый результат' }));
      Utils.dom.append(thead, headerRow);
      Utils.dom.append(table, thead);

      var tbody = Utils.dom.create('tbody');
      d.steps.forEach(function (step, idx) {
        var row = Utils.dom.create('tr');
        Utils.dom.append(row, Utils.dom.create('td', { text: String(idx + 1) }));
        Utils.dom.append(row, Utils.dom.create('td', { text: step.action || '' }));
        Utils.dom.append(row, Utils.dom.create('td', { text: step.expectedResult || '' }));
        Utils.dom.append(tbody, row);
      });
      Utils.dom.append(table, tbody);
      Utils.dom.append(wrap, table);
    }

    // Postconditions
    if (d.postconditions) {
      Utils.dom.append(wrap, _renderSectionLabel('Постусловия'));
      Utils.dom.append(wrap, Utils.dom.create('p', { class: 'preview-text', text: d.postconditions }));
    }

    return wrap;
  }

  function _renderChecklistPreview(artifact) {
    var wrap = Utils.dom.create('div', { class: 'preview-checklist' });
    var d = artifact.data || {};

    Utils.dom.append(wrap, Utils.dom.create('h3', { class: 'preview-title', text: d.title || artifact.title || 'Чек-лист' }));

    // Progress
    var total = (d.items || []).length;
    var checked = (d.items || []).filter(function (i) { return i.isChecked; }).length;
    var pct = total > 0 ? Math.round(checked / total * 100) : 0;

    var progressLabel = Utils.dom.create('div', { class: 'preview-progress-label', text: checked + ' из ' + total + ' (' + pct + '%)' });
    var progressBar = Utils.dom.create('div', { class: 'progress-bar' });
    var progressFill = Utils.dom.create('div', { class: 'progress-bar-fill' });
    progressFill.style.width = pct + '%';
    Utils.dom.append(progressBar, progressFill);
    Utils.dom.append(wrap, progressLabel);
    Utils.dom.append(wrap, progressBar);

    // Items
    if (d.items && d.items.length > 0) {
      var list = Utils.dom.create('ul', { class: 'preview-checklist-items' });
      d.items.forEach(function (item) {
        var li = Utils.dom.create('li', { class: 'preview-checklist-item' + (item.isChecked ? ' checked' : '') });
        var checkbox = Utils.dom.create('span', { class: 'preview-checkbox' + (item.isChecked ? ' checked' : '') });
        checkbox.innerHTML = item.isChecked ? ICONS.check : '';
        Utils.dom.append(li, checkbox);
        Utils.dom.append(li, Utils.dom.create('span', { class: 'preview-checklist-text', text: item.text || '' }));
        if (item.category) {
          Utils.dom.append(li, Utils.dom.create('span', { class: 'preview-checklist-category', text: item.category }));
        }
        Utils.dom.append(list, li);
      });
      Utils.dom.append(wrap, list);
    }

    return wrap;
  }

  function _renderTestPlanPreview(artifact) {
    var wrap = Utils.dom.create('div', { class: 'preview-test-plan' });
    var d = artifact.data || {};

    Utils.dom.append(wrap, Utils.dom.create('h3', { class: 'preview-title', text: d.title || artifact.title || 'Тест-план' }));

    if (d.scope) {
      Utils.dom.append(wrap, _renderSectionLabel('Область тестирования'));
      Utils.dom.append(wrap, Utils.dom.create('p', { class: 'preview-text', text: d.scope }));
    }

    if (d.strategy) {
      Utils.dom.append(wrap, _renderSectionLabel('Стратегия'));
      Utils.dom.append(wrap, Utils.dom.create('p', { class: 'preview-text', text: d.strategy }));
    }

    // Schedule
    if (d.schedule && d.schedule.length > 0) {
      Utils.dom.append(wrap, _renderSectionLabel('Расписание'));
      var schedTable = Utils.dom.create('table', { class: 'preview-info-table' });
      var sThead = Utils.dom.create('thead');
      var sHRow = Utils.dom.create('tr');
      ['Фаза', 'Начало', 'Окончание', 'Ответственный'].forEach(function (h) {
        Utils.dom.append(sHRow, Utils.dom.create('th', { text: h }));
      });
      Utils.dom.append(sThead, sHRow);
      Utils.dom.append(schedTable, sThead);
      var sTbody = Utils.dom.create('tbody');
      d.schedule.forEach(function (s) {
        var row = Utils.dom.create('tr');
        Utils.dom.append(row, Utils.dom.create('td', { text: s.phase || '' }));
        Utils.dom.append(row, Utils.dom.create('td', { text: s.startDate || '' }));
        Utils.dom.append(row, Utils.dom.create('td', { text: s.endDate || '' }));
        Utils.dom.append(row, Utils.dom.create('td', { text: s.responsible || '' }));
        Utils.dom.append(sTbody, row);
      });
      Utils.dom.append(schedTable, sTbody);
      Utils.dom.append(wrap, schedTable);
    }

    // Risks
    if (d.risks && d.risks.length > 0) {
      Utils.dom.append(wrap, _renderSectionLabel('Риски'));
      var rTable = Utils.dom.create('table', { class: 'preview-info-table' });
      var rThead = Utils.dom.create('thead');
      var rHRow = Utils.dom.create('tr');
      ['Риск', 'Влияние', 'Меры'].forEach(function (h) {
        Utils.dom.append(rHRow, Utils.dom.create('th', { text: h }));
      });
      Utils.dom.append(rThead, rHRow);
      Utils.dom.append(rTable, rThead);
      var rTbody = Utils.dom.create('tbody');
      d.risks.forEach(function (r) {
        var row = Utils.dom.create('tr');
        Utils.dom.append(row, Utils.dom.create('td', { text: r.risk || '' }));
        var impactCell = Utils.dom.create('td');
        Utils.dom.append(impactCell, _renderBadge(IMPACT_LABELS[r.impact] || r.impact || '', IMPACT_COLORS[r.impact] || '#6b7280'));
        Utils.dom.append(row, impactCell);
        Utils.dom.append(row, Utils.dom.create('td', { text: r.mitigation || '' }));
        Utils.dom.append(rTbody, row);
      });
      Utils.dom.append(rTable, rTbody);
      Utils.dom.append(wrap, rTable);
    }

    // Resources
    if (d.resources && d.resources.length > 0 && d.resources.some(function (r) { return r; })) {
      Utils.dom.append(wrap, _renderSectionLabel('Ресурсы'));
      var resList = Utils.dom.create('ul', { class: 'preview-simple-list' });
      d.resources.forEach(function (r) {
        if (r) Utils.dom.append(resList, Utils.dom.create('li', { text: r }));
      });
      Utils.dom.append(wrap, resList);
    }

    // Approvals
    if (d.approvals && d.approvals.length > 0) {
      Utils.dom.append(wrap, _renderSectionLabel('Согласования'));
      var aTable = Utils.dom.create('table', { class: 'preview-info-table' });
      var aThead = Utils.dom.create('thead');
      var aHRow = Utils.dom.create('tr');
      ['Роль', 'Имя', 'Дата', 'Статус'].forEach(function (h) {
        Utils.dom.append(aHRow, Utils.dom.create('th', { text: h }));
      });
      Utils.dom.append(aThead, aHRow);
      Utils.dom.append(aTable, aThead);
      var aTbody = Utils.dom.create('tbody');
      d.approvals.forEach(function (a) {
        var row = Utils.dom.create('tr');
        Utils.dom.append(row, Utils.dom.create('td', { text: a.role || '' }));
        Utils.dom.append(row, Utils.dom.create('td', { text: a.name || '' }));
        Utils.dom.append(row, Utils.dom.create('td', { text: a.date || '' }));
        Utils.dom.append(row, Utils.dom.create('td', { text: a.approved ? '✓ Согласовано' : 'Не согласовано' }));
        Utils.dom.append(aTbody, row);
      });
      Utils.dom.append(aTable, aTbody);
      Utils.dom.append(wrap, aTable);
    }

    return wrap;
  }

  function _renderApiTestPreview(artifact) {
    var wrap = Utils.dom.create('div', { class: 'preview-api-test' });
    var d = artifact.data || {};

    Utils.dom.append(wrap, Utils.dom.create('h3', { class: 'preview-title', text: d.title || artifact.title || 'API-тест' }));

    // Method + URL
    var methodUrlWrap = Utils.dom.create('div', { class: 'preview-api-method-url' });
    var methodColor = HTTP_METHOD_COLORS[d.method] || '#6b7280';
    Utils.dom.append(methodUrlWrap, _renderBadge(d.method || 'GET', methodColor));
    Utils.dom.append(methodUrlWrap, Utils.dom.create('span', { class: 'preview-api-url', text: d.url || '' }));
    Utils.dom.append(wrap, methodUrlWrap);

    // Headers
    if (d.headers && d.headers.length > 0) {
      var hasHeaders = d.headers.some(function (h) { return h.key || h.value; });
      if (hasHeaders) {
        Utils.dom.append(wrap, _renderSectionLabel('Заголовки'));
        var hTable = Utils.dom.create('table', { class: 'preview-info-table' });
        d.headers.forEach(function (h) {
          if (!h.key && !h.value) return;
          var row = Utils.dom.create('tr');
          Utils.dom.append(row, Utils.dom.create('th', { text: h.key || '' }));
          Utils.dom.append(row, Utils.dom.create('td', { text: h.value || '' }));
          Utils.dom.append(hTable, row);
        });
        Utils.dom.append(wrap, hTable);
      }
    }

    // Body
    if (d.body && d.body.trim()) {
      Utils.dom.append(wrap, _renderSectionLabel('Тело запроса'));
      var bodyPre = Utils.dom.create('pre', { class: 'preview-code' });
      bodyPre.textContent = d.body;
      Utils.dom.append(wrap, bodyPre);
    }

    // Expected
    Utils.dom.append(wrap, _renderSectionLabel('Ожидаемый ответ'));
    Utils.dom.append(wrap, _renderBadge('HTTP ' + (d.expectedStatus || 200), d.expectedStatus >= 400 ? '#dc2626' : '#22c55e'));

    if (d.expectedResponse && d.expectedResponse.trim()) {
      var respPre = Utils.dom.create('pre', { class: 'preview-code' });
      respPre.textContent = d.expectedResponse;
      Utils.dom.append(wrap, respPre);
    }

    return wrap;
  }

  // ========================================================================
  // ЭКСПОРТ: MARKDOWN
  // ========================================================================

  function _exportMarkdown(artifact) {
    var d = artifact.data || {};
    var md = '';

    switch (artifact.type) {
      case 'bug_report':
        md = '# ' + (d.summary || artifact.title || 'Баг-репорт') + '\n\n';
        md += '**Severity:** ' + (SEVERITY_LABELS[d.severity] || d.severity || '') + '\n';
        md += '**Priority:** ' + (PRIORITY_LABELS[d.priority] || d.priority || '') + '\n';
        md += '**Status:** ' + (STATUS_LABELS[d.status] || d.status || '') + '\n';
        if (d.environment) md += '**Environment:** ' + d.environment + '\n';
        md += '\n## Описание\n\n' + (d.description || '') + '\n';
        if (d.steps && d.steps.length > 0) {
          md += '\n## Шаги воспроизведения\n\n';
          d.steps.forEach(function (s, i) {
            if (s) md += (i + 1) + '. ' + s + '\n';
          });
        }
        if (d.expected) md += '\n## Ожидаемый результат\n\n' + d.expected + '\n';
        if (d.actual) md += '\n## Фактический результат\n\n' + d.actual + '\n';
        break;

      case 'test_case':
        md = '# ' + (d.title || artifact.title || 'Тест-кейс') + '\n\n';
        md += '**ID:** ' + (d.id || '') + '\n';
        md += '**Тип:** ' + (TC_TYPE_LABELS[d.type] || d.type || '') + '\n';
        md += '**Приоритет:** ' + (TC_PRIORITY_LABELS[d.priority] || d.priority || '') + '\n';
        md += '**Статус:** ' + (TC_STATUS_LABELS[d.status] || d.status || '') + '\n';
        if (d.preconditions) md += '\n## Предусловия\n\n' + d.preconditions + '\n';
        if (d.steps && d.steps.length > 0) {
          md += '\n## Шаги\n\n';
          md += '| № | Действие | Ожидаемый результат |\n';
          md += '|---|----------|---------------------|\n';
          d.steps.forEach(function (s, i) {
            md += '| ' + (i + 1) + ' | ' + (s.action || '') + ' | ' + (s.expectedResult || '') + ' |\n';
          });
        }
        if (d.postconditions) md += '\n## Постусловия\n\n' + d.postconditions + '\n';
        break;

      case 'checklist':
        md = '# ' + (d.title || artifact.title || 'Чек-лист') + '\n\n';
        if (d.items && d.items.length > 0) {
          d.items.forEach(function (item) {
            md += '- [' + (item.isChecked ? 'x' : ' ') + '] ' + (item.text || '');
            if (item.category) md += ' _(' + item.category + ')_';
            md += '\n';
          });
        }
        break;

      case 'test_plan':
        md = '# ' + (d.title || artifact.title || 'Тест-план') + '\n\n';
        if (d.scope) md += '## Область тестирования\n\n' + d.scope + '\n\n';
        if (d.strategy) md += '## Стратегия\n\n' + d.strategy + '\n\n';
        if (d.schedule && d.schedule.length > 0) {
          md += '## Расписание\n\n';
          md += '| Фаза | Начало | Окончание | Ответственный |\n';
          md += '|------|--------|----------|---------------|\n';
          d.schedule.forEach(function (s) {
            md += '| ' + (s.phase || '') + ' | ' + (s.startDate || '') + ' | ' + (s.endDate || '') + ' | ' + (s.responsible || '') + ' |\n';
          });
          md += '\n';
        }
        if (d.risks && d.risks.length > 0) {
          md += '## Риски\n\n';
          md += '| Риск | Влияние | Меры |\n';
          md += '|------|---------|------|\n';
          d.risks.forEach(function (r) {
            md += '| ' + (r.risk || '') + ' | ' + (IMPACT_LABELS[r.impact] || r.impact || '') + ' | ' + (r.mitigation || '') + ' |\n';
          });
          md += '\n';
        }
        if (d.resources && d.resources.length > 0) {
          md += '## Ресурсы\n\n';
          d.resources.forEach(function (r) { if (r) md += '- ' + r + '\n'; });
          md += '\n';
        }
        if (d.approvals && d.approvals.length > 0) {
          md += '## Согласования\n\n';
          md += '| Роль | Имя | Дата | Статус |\n';
          md += '|------|-----|------|--------|\n';
          d.approvals.forEach(function (a) {
            md += '| ' + (a.role || '') + ' | ' + (a.name || '') + ' | ' + (a.date || '') + ' | ' + (a.approved ? '✓' : '—') + ' |\n';
          });
        }
        break;

      case 'api_test':
        md = '# ' + (d.title || artifact.title || 'API-тест') + '\n\n';
        md += '**Method:** ' + (d.method || 'GET') + '\n';
        md += '**URL:** ' + (d.url || '') + '\n';
        md += '**Expected Status:** ' + (d.expectedStatus || 200) + '\n';
        if (d.headers && d.headers.length > 0) {
          var hasH = d.headers.some(function (h) { return h.key || h.value; });
          if (hasH) {
            md += '\n## Headers\n\n';
            md += '| Key | Value |\n';
            md += '|-----|-------|\n';
            d.headers.forEach(function (h) {
              if (!h.key && !h.value) return;
              md += '| ' + (h.key || '') + ' | ' + (h.value || '') + ' |\n';
            });
          }
        }
        if (d.body && d.body.trim()) {
          md += '\n## Body\n\n```json\n' + d.body + '\n```\n';
        }
        if (d.expectedResponse && d.expectedResponse.trim()) {
          md += '\n## Expected Response\n\n```json\n' + d.expectedResponse + '\n```\n';
        }
        break;

      default:
        md = Utils.format.formatJSON(artifact, 2);
    }

    // Tags
    if (artifact.tags && artifact.tags.length > 0) {
      md += '\n---\n\n**Теги:** ' + artifact.tags.join(', ') + '\n';
    }

    // Meta
    if (artifact.createdAt) md += '\n**Создан:** ' + _formatDate(artifact.createdAt) + '\n';
    if (artifact.updatedAt) md += '**Обновлён:** ' + _formatDate(artifact.updatedAt) + '\n';

    return md;
  }

  // ========================================================================
  // ЭКСПОРТ: HTML
  // ========================================================================

  function _exportHTML(artifact) {
    var d = artifact.data || {};
    var title = Utils.format.escapeHtml(artifact.title || d.title || d.summary || 'Артефакт');
    var typeLabel = TYPE_LABELS[artifact.type] || artifact.type || '';
    var body = '';

    // Build body content based on type
    switch (artifact.type) {
      case 'bug_report':
        body += '<h1>' + Utils.format.escapeHtml(d.summary || '') + '</h1>\n';
        body += '<div class="badges">\n';
        if (d.severity) body += '<span class="badge" style="color:' + (SEVERITY_COLORS[d.severity] || '#666') + '">' + (SEVERITY_LABELS[d.severity] || d.severity) + '</span>\n';
        if (d.priority) body += '<span class="badge" style="color:' + (PRIORITY_COLORS[d.priority] || '#666') + '">' + (PRIORITY_LABELS[d.priority] || d.priority) + '</span>\n';
        if (d.status) body += '<span class="badge" style="color:' + (STATUS_COLORS[d.status] || '#666') + '">' + (STATUS_LABELS[d.status] || d.status) + '</span>\n';
        body += '</div>\n';
        if (d.environment) body += '<p><strong>Окружение:</strong> ' + Utils.format.escapeHtml(d.environment) + '</p>\n';
        if (d.description) body += '<h2>Описание</h2>\n<p>' + Utils.format.escapeHtml(d.description).replace(/\n/g, '<br>') + '</p>\n';
        if (d.steps && d.steps.length > 0) {
          body += '<h2>Шаги воспроизведения</h2>\n<ol>\n';
          d.steps.forEach(function (s) { if (s) body += '<li>' + Utils.format.escapeHtml(s) + '</li>\n'; });
          body += '</ol>\n';
        }
        if (d.expected) body += '<h2>Ожидаемый результат</h2>\n<p>' + Utils.format.escapeHtml(d.expected).replace(/\n/g, '<br>') + '</p>\n';
        if (d.actual) body += '<h2>Фактический результат</h2>\n<p>' + Utils.format.escapeHtml(d.actual).replace(/\n/g, '<br>') + '</p>\n';
        break;

      case 'test_case':
        body += '<h1>' + Utils.format.escapeHtml(d.title || '') + '</h1>\n';
        if (d.id) body += '<p><strong>ID:</strong> ' + Utils.format.escapeHtml(d.id) + '</p>\n';
        body += '<div class="badges">\n';
        if (d.type) body += '<span class="badge">' + (TC_TYPE_LABELS[d.type] || d.type) + '</span>\n';
        if (d.status) body += '<span class="badge" style="color:' + (TC_STATUS_COLORS[d.status] || '#666') + '">' + (TC_STATUS_LABELS[d.status] || d.status) + '</span>\n';
        body += '</div>\n';
        if (d.preconditions) body += '<h2>Предусловия</h2>\n<p>' + Utils.format.escapeHtml(d.preconditions).replace(/\n/g, '<br>') + '</p>\n';
        if (d.steps && d.steps.length > 0) {
          body += '<h2>Шаги</h2>\n<table>\n<thead><tr><th>№</th><th>Действие</th><th>Ожидаемый результат</th></tr></thead>\n<tbody>\n';
          d.steps.forEach(function (s, i) {
            body += '<tr><td>' + (i + 1) + '</td><td>' + Utils.format.escapeHtml(s.action || '') + '</td><td>' + Utils.format.escapeHtml(s.expectedResult || '') + '</td></tr>\n';
          });
          body += '</tbody></table>\n';
        }
        if (d.postconditions) body += '<h2>Постусловия</h2>\n<p>' + Utils.format.escapeHtml(d.postconditions).replace(/\n/g, '<br>') + '</p>\n';
        break;

      case 'checklist':
        body += '<h1>' + Utils.format.escapeHtml(d.title || '') + '</h1>\n';
        if (d.items && d.items.length > 0) {
          body += '<ul class="checklist">\n';
          d.items.forEach(function (item) {
            body += '<li><input type="checkbox" disabled' + (item.isChecked ? ' checked' : '') + '> ' + Utils.format.escapeHtml(item.text || '');
            if (item.category) body += ' <em>(' + Utils.format.escapeHtml(item.category) + ')</em>';
            body += '</li>\n';
          });
          body += '</ul>\n';
        }
        break;

      case 'test_plan':
        body += '<h1>' + Utils.format.escapeHtml(d.title || '') + '</h1>\n';
        if (d.scope) body += '<h2>Область тестирования</h2>\n<p>' + Utils.format.escapeHtml(d.scope).replace(/\n/g, '<br>') + '</p>\n';
        if (d.strategy) body += '<h2>Стратегия</h2>\n<p>' + Utils.format.escapeHtml(d.strategy).replace(/\n/g, '<br>') + '</p>\n';
        if (d.schedule && d.schedule.length > 0) {
          body += '<h2>Расписание</h2>\n<table>\n<thead><tr><th>Фаза</th><th>Начало</th><th>Окончание</th><th>Ответственный</th></tr></thead>\n<tbody>\n';
          d.schedule.forEach(function (s) {
            body += '<tr><td>' + Utils.format.escapeHtml(s.phase || '') + '</td><td>' + Utils.format.escapeHtml(s.startDate || '') + '</td><td>' + Utils.format.escapeHtml(s.endDate || '') + '</td><td>' + Utils.format.escapeHtml(s.responsible || '') + '</td></tr>\n';
          });
          body += '</tbody></table>\n';
        }
        if (d.risks && d.risks.length > 0) {
          body += '<h2>Риски</h2>\n<table>\n<thead><tr><th>Риск</th><th>Влияние</th><th>Меры</th></tr></thead>\n<tbody>\n';
          d.risks.forEach(function (r) {
            body += '<tr><td>' + Utils.format.escapeHtml(r.risk || '') + '</td><td>' + (IMPACT_LABELS[r.impact] || r.impact || '') + '</td><td>' + Utils.format.escapeHtml(r.mitigation || '') + '</td></tr>\n';
          });
          body += '</tbody></table>\n';
        }
        if (d.resources && d.resources.length > 0) {
          body += '<h2>Ресурсы</h2>\n<ul>\n';
          d.resources.forEach(function (r) { if (r) body += '<li>' + Utils.format.escapeHtml(r) + '</li>\n'; });
          body += '</ul>\n';
        }
        break;

      case 'api_test':
        body += '<h1>' + Utils.format.escapeHtml(d.title || '') + '</h1>\n';
        body += '<p><span class="badge" style="color:' + (HTTP_METHOD_COLORS[d.method] || '#666') + '">' + (d.method || 'GET') + '</span> <code>' + Utils.format.escapeHtml(d.url || '') + '</code></p>\n';
        if (d.headers && d.headers.length > 0) {
          var hasH2 = d.headers.some(function (h) { return h.key || h.value; });
          if (hasH2) {
            body += '<h2>Заголовки</h2>\n<table>\n<thead><tr><th>Key</th><th>Value</th></tr></thead>\n<tbody>\n';
            d.headers.forEach(function (h) {
              if (!h.key && !h.value) return;
              body += '<tr><td>' + Utils.format.escapeHtml(h.key || '') + '</td><td>' + Utils.format.escapeHtml(h.value || '') + '</td></tr>\n';
            });
            body += '</tbody></table>\n';
          }
        }
        if (d.body && d.body.trim()) body += '<h2>Тело запроса</h2>\n<pre><code>' + Utils.format.escapeHtml(d.body) + '</code></pre>\n';
        body += '<h2>Ожидаемый ответ</h2>\n<p>HTTP ' + (d.expectedStatus || 200) + '</p>\n';
        if (d.expectedResponse && d.expectedResponse.trim()) body += '<pre><code>' + Utils.format.escapeHtml(d.expectedResponse) + '</code></pre>\n';
        break;

      default:
        body += '<pre>' + Utils.format.escapeHtml(Utils.format.formatJSON(artifact, 2)) + '</pre>\n';
    }

    // Tags
    if (artifact.tags && artifact.tags.length > 0) {
      body += '<h2>Теги</h2>\n<div class="badges">\n';
      artifact.tags.forEach(function (t) {
        body += '<span class="badge">' + Utils.format.escapeHtml(t) + '</span>\n';
      });
      body += '</div>\n';
    }

    // Meta
    body += '<hr>\n<p style="color:#666;font-size:13px">\n';
    if (artifact.createdAt) body += 'Создан: ' + _formatDate(artifact.createdAt) + '<br>\n';
    if (artifact.updatedAt) body += 'Обновлён: ' + _formatDate(artifact.updatedAt) + '\n';
    body += '</p>\n';

    var html = '<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="UTF-8">\n';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    html += '<title>' + title + ' — ' + typeLabel + '</title>\n';
    html += '<style>\n';
    html += 'body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}\n';
    html += 'h1{color:#3b82f6}h2{border-bottom:2px solid #eee;padding-bottom:5px;margin-top:30px}\n';
    html += 'table{border-collapse:collapse;width:100%;margin:10px 0}\n';
    html += 'th,td{border:1px solid #ddd;padding:8px;text-align:left}\n';
    html += 'th{background:#f8fafc;font-weight:600}\n';
    html += '.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:13px;border:1px solid #ccc;margin:2px}\n';
    html += '.badges{margin:10px 0}\n';
    html += 'pre{background:#f8fafc;padding:12px;border-radius:6px;overflow-x:auto;font-family:monospace}\n';
    html += 'code{font-family:monospace}\n';
    html += 'ul.checklist{list-style:none;padding-left:0}\n';
    html += 'hr{border:none;border-top:1px solid #eee;margin:30px 0}\n';
    html += '</style>\n</head>\n<body>\n';
    html += body;
    html += '\n</body>\n</html>';

    return html;
  }

})();
