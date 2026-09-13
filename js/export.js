/* export.js — экспорт/импорт данных: JSON, HTML, Markdown, шаринг, бэкапы */

/* ЧАСТЬ 1 из 4: Константы, состояние, init, exportJSON, история экспортов, getExportSize */

(function () {
  'use strict';

  // ========================================================================
  // КОНСТАНТЫ
  // ========================================================================

  var APP_NAME = 'QA Study Portfolio';
  var EXPORT_HISTORY_LIMIT = 20;
  var BACKUP_HISTORY_LIMIT = 20;

  var STORAGE_KEYS = null;
  var APP_VERSION = '1.0.0';

  var DEFAULT_EXPORT_OPTIONS = {
    progress: true,
    notes: true,
    artifacts: true,
    tags: true,
    bookmarks: true,
    pomodoro: true,
    settings: true,
    searchHistory: true,
    glossary: true
  };

  // ========================================================================
  // СОСТОЯНИЕ
  // ========================================================================

  var _state = {
    initialized: false,
    lastExport: null,
    lastImport: null,
    pendingImport: null
  };

  // ========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================================================

  function _getKeys() {
    if (STORAGE_KEYS) return STORAGE_KEYS;
    if (window.Utils && Utils.constants && Utils.constants.STORAGE_KEYS) {
      STORAGE_KEYS = Utils.constants.STORAGE_KEYS;
      APP_VERSION = Utils.constants.APP_VERSION || APP_VERSION;
    } else {
      STORAGE_KEYS = {
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
        BACKUP_HISTORY: 'qa_portfolio_backup_history',
        ONBOARDED: 'qa_portfolio_onboarded'
      };
    }
    return STORAGE_KEYS;
  }

  function _showToast(message, type) {
    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('toast', { message: message, type: type || 'info' });
    } else if (window.App && typeof App.showToast === 'function') {
      App.showToast({ message: message, type: type || 'info' });
    }
  }

  function _formatDate(date) {
    if (!date) return '';
    try {
      var d = typeof date === 'string' ? new Date(date) : date;
      if (Utils.format && Utils.format.formatDateRu) {
        return Utils.format.formatDateRu(d);
      }
      return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return String(date);
    }
  }

  function _formatDateTime(date) {
    if (!date) return '';
    try {
      var d = typeof date === 'string' ? new Date(date) : date;
      if (Utils.format && Utils.format.formatDateRu) {
        return Utils.format.formatDateRu(d, { includeTime: true });
      }
      return d.toLocaleString('ru-RU');
    } catch (e) {
      return String(date);
    }
  }

  function _getDateStamp() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function _slugify(text) {
    if (Utils.format && Utils.format.slugify) {
      return Utils.format.slugify(text);
    }
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'export';
  }

  function _downloadFile(filename, content, mimeType) {
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

  function _generateId() {
    if (Utils.id && Utils.id.uuid) return Utils.id.uuid();
    if (Utils.id && Utils.id.shortId) return Utils.id.shortId();
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function _deepClone(obj) {
    if (Utils.misc && Utils.misc.deepClone) return Utils.misc.deepClone(obj);
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      return obj;
    }
  }

  function _formatFileSize(bytes) {
    if (Utils.format && Utils.format.formatFileSize) {
      return Utils.format.formatFileSize(bytes);
    }
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / 1048576).toFixed(2) + ' МБ';
  }

  // ========================================================================
  // ГЛОБАЛЬНЫЙ ОБЪЕКТ EXPORTIMPORT
  // ========================================================================

  window.ExportImport = {

    // ----------------------------------------------------------------
    // ИНИЦИАЛИЗАЦИЯ
    // ----------------------------------------------------------------

    init: function () {
      if (!window.Utils) {
        if (window.Debug) Debug.error('Utils not available — ExportImport cannot init');
        return;
      }

      _getKeys();

      // Регистрация в QAApp
      if (window.QAApp && typeof QAApp.registerModule === 'function') {
        QAApp.registerModule('ExportImport', ExportImport);
        if (typeof QAApp.on === 'function') {
          QAApp.on('export:request', function (options) {
            ExportImport.exportJSON(options);
          });
          QAApp.on('export:html', function (options) {
            ExportImport.exportHTML(options);
          });
          QAApp.on('export:markdown', function (options) {
            ExportImport.exportMarkdown(options);
          });
          QAApp.on('import:request', function (file) {
            ExportImport.importJSON(file);
          });
        }
      }

      _state.initialized = true;

      if (window.Debug) Debug.info('ExportImport module initialized');
    },

    // ----------------------------------------------------------------
    // ЭКСПОРТ В JSON
    // ----------------------------------------------------------------

    exportJSON: function (options) {
      var opts = _normalizeOptions(options);

      // Собираем данные
      var data = _collectExportData(opts);

      // Формируем итоговый объект
      var exportObj = {
        meta: {
          version: APP_VERSION,
          exportedAt: new Date().toISOString(),
          app: APP_NAME,
          format: 'json'
        },
        data: data
      };

      var content = JSON.stringify(exportObj, null, 2);
      var filename = 'qa-portfolio-export-' + _getDateStamp() + '.json';

      _downloadFile(filename, content, 'application/json');

      // Записываем в историю
      ExportImport.recordExport('json', content.length, filename);

      _state.lastExport = {
        type: 'json',
        date: new Date().toISOString(),
        size: content.length,
        filename: filename
      };

      if (window.Debug) Debug.info('Exported to JSON (' + _formatFileSize(content.length) + ')');

      return { success: true, size: content.length, filename: filename };
    },

    // ----------------------------------------------------------------
    // РАЗМЕР ЭКСПОРТА
    // ----------------------------------------------------------------

    getExportSize: function (options) {
      var opts = _normalizeOptions(options);
      var data = _collectExportData(opts);
      var content = JSON.stringify(data);

      var bytes = 0;
      if (Utils.storage && Utils.storage.estimateSize) {
        bytes = Utils.storage.estimateSize(data);
      } else {
        bytes = new Blob([content]).size;
      }

      return {
        bytes: bytes,
        formatted: _formatFileSize(bytes)
      };
    },

    // ----------------------------------------------------------------
    // ИСТОРИЯ ЭКСПОРТОВ
    // ----------------------------------------------------------------

    recordExport: function (type, size, filename) {
      var keys = _getKeys();
      var history = Utils.storage.get(keys.EXPORT_HISTORY);
      if (!Array.isArray(history)) history = [];

      var record = {
        id: _generateId(),
        date: new Date().toISOString(),
        type: type,
        size: size,
        filename: filename || ''
      };

      history.unshift(record);

      // Ограничиваем историю
      if (history.length > EXPORT_HISTORY_LIMIT) {
        history = history.slice(0, EXPORT_HISTORY_LIMIT);
      }

      Utils.storage.set(keys.EXPORT_HISTORY, history);

      return record;
    },

    getExportHistory: function () {
      var keys = _getKeys();
      var history = Utils.storage.get(keys.EXPORT_HISTORY);
      if (!Array.isArray(history)) history = [];

      // Сортировка по дате (новые первыми)
      history.sort(function (a, b) {
        var da = new Date(a.date || 0).getTime();
        var db = new Date(b.date || 0).getTime();
        return db - da;
      });

      // Ограничение
      return history.slice(0, EXPORT_HISTORY_LIMIT);
    },

    getBackupHistory: function () {
      var keys = _getKeys();
      var history = Utils.storage.get(keys.BACKUP_HISTORY);
      if (!Array.isArray(history)) history = [];

      history.sort(function (a, b) {
        var da = new Date(a.date || 0).getTime();
        var db = new Date(b.date || 0).getTime();
        return db - da;
      });

      return history.slice(0, BACKUP_HISTORY_LIMIT);
    }
  };

  // ========================================================================
  // ВНУТРЕННИЕ ФУНКЦИИ: СБОР ДАННЫХ
  // ========================================================================

  function _normalizeOptions(options) {
    var opts = {};
    var defaults = DEFAULT_EXPORT_OPTIONS;
    var keys = Object.keys(defaults);

    keys.forEach(function (key) {
      if (options && typeof options[key] === 'boolean') {
        opts[key] = options[key];
      } else {
        opts[key] = defaults[key];
      }
    });

    return opts;
  }

  function _collectExportData(opts) {
    var keys = _getKeys();
    var data = {};

    if (opts.progress) {
      data.progress = Utils.storage.get(keys.PROGRESS) || {};
    }
    if (opts.notes) {
      data.notes = Utils.storage.get(keys.NOTES) || [];
    }
    if (opts.artifacts) {
      data.artifacts = Utils.storage.get(keys.ARTIFACTS) || [];
    }
    if (opts.tags) {
      data.tags = Utils.storage.get(keys.TAGS) || [];
    }
    if (opts.bookmarks) {
      data.bookmarks = Utils.storage.get(keys.BOOKMARKS) || [];
    }
    if (opts.pomodoro) {
      data.pomodoro = Utils.storage.get(keys.POMODORO) || {};
    }
    if (opts.settings) {
      data.settings = Utils.storage.get(keys.SETTINGS) || {};
    }
    if (opts.searchHistory) {
      data.searchHistory = Utils.storage.get(keys.SEARCH_HISTORY) || [];
    }
    if (opts.glossary && window.CourseData && CourseData.getGlossary) {
      data.glossary = CourseData.getGlossary();
    }

    return data;
  }

})();
/* ЧАСТЬ 2 из 4: exportHTML, exportMarkdown */

(function () {
  'use strict';

  // Доступ к объекту из части 1
  var EI = window.ExportImport;
  if (!EI) return;

  // ========================================================================
  // КОНСТАНТЫ ДЛЯ ЭКСПОРТА
  // ========================================================================

  var TYPE_LABELS_HTML = {
    bug_report: 'Баг-репорт',
    test_case: 'Тест-кейс',
    checklist: 'Чек-лист',
    test_plan: 'Тест-план',
    api_test: 'API-тест'
  };

  var SEVERITY_LABELS_HTML = {
    blocker: 'Блокер', critical: 'Критичный', major: 'Значительный',
    minor: 'Незначительный', trivial: 'Тривиальный'
  };

  var SEVERITY_COLORS_HTML = {
    blocker: '#dc2626', critical: '#ea580c', major: '#eab308',
    minor: '#3b82f6', trivial: '#6b7280'
  };

  var PRIORITY_LABELS_HTML = {
    low: 'Низкий', medium: 'Средний', high: 'Высокий', urgent: 'Срочный'
  };

  var PRIORITY_COLORS_HTML = {
    low: '#6b7280', medium: '#3b82f6', high: '#f97316', urgent: '#dc2626'
  };

  var STATUS_LABELS_HTML = {
    new: 'Новый', assigned: 'Назначен', in_progress: 'В работе',
    resolved: 'Решён', closed: 'Закрыт', reopened: 'Переоткрыт'
  };

  var TC_STATUS_LABELS_HTML = {
    not_executed: 'Не выполнен', passed: 'Пройден', failed: 'Не пройден',
    blocked: 'Заблокирован', skipped: 'Пропущен'
  };

  var TC_STATUS_COLORS_HTML = {
    not_executed: '#6b7280', passed: '#22c55e', failed: '#dc2626',
    blocked: '#f97316', skipped: '#8b5cf6'
  };

  var HTTP_METHOD_COLORS_HTML = {
    GET: '#3b82f6', POST: '#22c55e', PUT: '#f97316',
    PATCH: '#8b5cf6', DELETE: '#dc2626'
  };

  // ========================================================================
  // ЭКСПОРТ В HTML
  // ========================================================================

  EI.exportHTML = function (options) {
    var opts = _normalizeOptionsHTML(options);
    var data = _collectExportDataHTML(opts);

    var dateStr = _formatDate(new Date());
    var html = _buildHTMLDocument(data, dateStr, opts);

    var filename = 'qa-portfolio-' + _getDateStampHTML() + '.html';

    _downloadFileHTML(filename, html, 'text/html');

    EI.recordExport('html', html.length, filename);

    if (window.Debug) Debug.info('Exported to HTML (' + _formatFileSizeHTML(html.length) + ')');

    return { success: true, size: html.length, filename: filename };
  };

  // ----------------------------------------------------------------
  // СБОРКА HTML-ДОКУМЕНТА
  // ----------------------------------------------------------------

  function _buildHTMLDocument(data, dateStr, opts) {
    var parts = [];

    // Head
    parts.push('<!DOCTYPE html>');
    parts.push('<html lang="ru">');
    parts.push('<head>');
    parts.push('<meta charset="UTF-8">');
    parts.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    parts.push('<title>' + _escapeHtml('QA Study Portfolio — Экспорт') + '</title>');
    parts.push('<style>');
    parts.push(_getHTMLCSS());
    parts.push('</style>');
    parts.push('</head>');
    parts.push('<body>');
    parts.push('<div class="container">');

    // Header
    parts.push('<header>');
    parts.push('<h1>' + _escapeHtml('QA Study Portfolio') + '</h1>');
    parts.push('<p class="subtitle">' + _escapeHtml('Экспорт портфолио') + ' — ' + _escapeHtml(dateStr) + '</p>');
    parts.push('</header>');

    // Stats section
    parts.push(_renderHTMLStats(data, opts));

    // Modules section
    if (window.CourseData && CourseData.getModules) {
      var modules = CourseData.getModules();
      var progress = data.progress || {};
      parts.push(_renderHTMLModules(modules, progress));
    }

    // Artifacts section
    if (data.artifacts && data.artifacts.length > 0) {
      parts.push(_renderHTMLArtifacts(data.artifacts));
    }

    // Notes section
    if (data.notes && data.notes.length > 0) {
      parts.push(_renderHTMLNotes(data.notes));
    }

    // Glossary section
    if (window.CourseData && CourseData.getGlossary) {
      var glossary = CourseData.getGlossary();
      if (glossary && glossary.length > 0) {
        parts.push(_renderHTMLGlossary(glossary));
      }
    }

    // Tags section
    if (data.tags && data.tags.length > 0) {
      parts.push(_renderHTMLTags(data.tags));
    }

    // Inline data for potential import
    parts.push('<script type="application/json" id="export-data">');
    parts.push(JSON.stringify({
      meta: {
        version: _getAppVersion(),
        exportedAt: new Date().toISOString(),
        app: 'QA Study Portfolio',
        format: 'html-embedded'
      },
      data: data
    }));
    parts.push('<\/script>');

    parts.push('</div>');
    parts.push('</body>');
    parts.push('</html>');

    return parts.join('\n');
  }

  // ----------------------------------------------------------------
  // CSS ДЛЯ HTML-ЭКСПОРТА
  // ----------------------------------------------------------------

  function _getHTMLCSS() {
    var css = [
      '* { margin: 0; padding: 0; box-sizing: border-box; }',
      ':root { --bg: #ffffff; --text: #1a1a2e; --border: #e2e8f0; --accent: #3b82f6; --muted: #64748b; --card-bg: #f8fafc; --shadow: 0 1px 3px rgba(0,0,0,0.1); }',
      '@media (prefers-color-scheme: dark) {',
      '  :root { --bg: #0f172a; --text: #e2e8f0; --border: #334155; --card-bg: #1e293b; --shadow: 0 1px 3px rgba(0,0,0,0.4); }',
      '}',
      'body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 20px; }',
      '.container { max-width: 900px; margin: 0 auto; }',
      'header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid var(--border); }',
      'header h1 { color: var(--accent); font-size: 28px; }',
      '.subtitle { color: var(--muted); font-size: 14px; margin-top: 5px; }',
      'section { margin-bottom: 40px; }',
      'h2 { font-size: 20px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid var(--border); color: var(--accent); }',
      'table { width: 100%; border-collapse: collapse; margin: 10px 0; }',
      'th, td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }',
      'th { background: var(--card-bg); font-weight: 600; }',
      'tr:hover td { background: var(--card-bg); }',
      '.card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin: 10px 0; box-shadow: var(--shadow); }',
      '.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }',
      '.card-title { font-weight: 600; font-size: 16px; }',
      '.card-type { font-size: 12px; color: var(--muted); }',
      '.card-body { font-size: 14px; color: var(--text); }',
      '.card-body p { margin: 5px 0; }',
      '.badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; border: 1px solid; margin: 2px; }',
      '.badge-light { background: var(--card-bg); border-color: var(--border); color: var(--muted); }',
      '.tag-badge { background: var(--accent); color: #fff; padding: 2px 10px; border-radius: 12px; font-size: 12px; display: inline-block; margin: 2px; }',
      '.stats-grid { display: flex; flex-wrap: wrap; gap: 15px; }',
      '.stat-item { flex: 1; min-width: 140px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-align: center; }',
      '.stat-value { font-size: 28px; font-weight: 700; color: var(--accent); }',
      '.stat-label { font-size: 12px; color: var(--muted); margin-top: 5px; }',
      '.note-item { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin: 8px 0; }',
      '.note-date { font-size: 12px; color: var(--muted); margin-bottom: 5px; }',
      '.note-text { font-size: 14px; }',
      '.glossary-item { margin: 8px 0; padding: 8px 12px; background: var(--card-bg); border-radius: 6px; border-left: 3px solid var(--accent); }',
      '.glossary-term { font-weight: 600; }',
      '.glossary-def { font-size: 14px; color: var(--muted); }',
      '.progress-bar { width: 100%; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-top: 4px; }',
      '.progress-fill { height: 100%; background: var(--accent); border-radius: 3px; }',
      '.step-list { padding-left: 20px; margin: 5px 0; }',
      '.step-list li { margin: 3px 0; font-size: 14px; }',
      '.code-block { background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; padding: 12px; font-family: monospace; font-size: 13px; overflow-x: auto; margin: 8px 0; }',
      '.method-badge { font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 13px; }',
      '.two-col { display: flex; gap: 20px; flex-wrap: wrap; }',
      '.two-col > div { flex: 1; min-width: 200px; }',
      '@media (max-width: 600px) { .stats-grid { flex-direction: column; } .two-col { flex-direction: column; } }',
      'footer { text-align: center; padding: 20px 0; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); margin-top: 40px; }'
    ];
    return css.join('\n');
  }

  // ----------------------------------------------------------------
  // РЕНДЕР СЕКЦИЙ HTML
  // ----------------------------------------------------------------

  function _renderHTMLStats(data, opts) {
    var modules = (window.CourseData && CourseData.getModules) ? CourseData.getModules() : [];
    var progress = data.progress || {};
    var artifacts = data.artifacts || [];
    var notes = data.notes || [];
    var pomodoro = data.pomodoro || {};

    var completedModules = 0;
    var inProgressModules = 0;
    var totalLessons = 0;
    var completedLessons = 0;

    modules.forEach(function (m) {
      var mp = progress[m.id] || {};
      if (mp.status === 'completed') completedModules++;
      if (mp.status === 'in_progress') inProgressModules++;

      if (m.lessons) {
        totalLessons += m.lessons.length;
        m.lessons.forEach(function (l) {
          if (mp.lessons && mp.lessons[l.id] && mp.lessons[l.id].completed) {
            completedLessons++;
          }
        });
      }
    });

    var studyTime = 0;
    if (pomodoro.sessions) {
      pomodoro.sessions.forEach(function (s) {
        if (s.duration) studyTime += s.duration;
      });
    }
    studyTime = Math.round(studyTime / 60); // минуты

    var parts = [];
    parts.push('<section>');
    parts.push('<h2>Статистика</h2>');
    parts.push('<div class="stats-grid">');
    parts.push('<div class="stat-item"><div class="stat-value">' + completedModules + '/' + modules.length + '</div><div class="stat-label">Модулей завершено</div></div>');
    parts.push('<div class="stat-item"><div class="stat-value">' + completedLessons + '/' + totalLessons + '</div><div class="stat-label">Уроков пройдено</div></div>');
    parts.push('<div class="stat-item"><div class="stat-value">' + artifacts.length + '</div><div class="stat-label">Артефактов создано</div></div>');
    parts.push('<div class="stat-item"><div class="stat-value">' + notes.length + '</div><div class="stat-label">Заметок</div></div>');
    parts.push('<div class="stat-item"><div class="stat-value">' + studyTime + '</div><div class="stat-label">Минут в учёбе</div></div>');
    parts.push('</div>');
    parts.push('</section>');
    return parts.join('\n');
  }

  function _renderHTMLModules(modules, progress) {
    var parts = [];
    parts.push('<section>');
    parts.push('<h2>Модули</h2>');
    parts.push('<table>');
    parts.push('<thead><tr><th>#</th><th>Название</th><th>Прогресс</th><th>Статус</th></tr></thead>');
    parts.push('<tbody>');

    modules.forEach(function (m, idx) {
      var mp = progress[m.id] || {};
      var pct = mp.progress || 0;
      var status = mp.status || 'not_started';
      var statusLabel = {
        not_started: 'Не начат',
        in_progress: 'В работе',
        completed: 'Завершён'
      }[status] || status;

      parts.push('<tr>');
      parts.push('<td>' + (idx + 1) + '</td>');
      parts.push('<td>' + _escapeHtml(m.title || '') + '</td>');
      parts.push('<td>');
      parts.push(pct + '%');
      parts.push('<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div>');
      parts.push('</td>');
      parts.push('<td>' + _escapeHtml(statusLabel) + '</td>');
      parts.push('</tr>');
    });

    parts.push('</tbody></table>');
    parts.push('</section>');
    return parts.join('\n');
  }

  function _renderHTMLArtifacts(artifacts) {
    var parts = [];
    parts.push('<section>');
    parts.push('<h2>Артефакты (' + artifacts.length + ')</h2>');

    artifacts.forEach(function (artifact) {
      parts.push('<div class="card">');
      parts.push('<div class="card-header">');
      parts.push('<span class="card-title">' + _escapeHtml(artifact.title || '') + '</span>');
      parts.push('<span class="card-type">' + _escapeHtml(TYPE_LABELS_HTML[artifact.type] || artifact.type || '') + '</span>');
      parts.push('</div>');
      parts.push('<div class="card-body">');
      parts.push(_renderHTMLArtifactContent(artifact));
      parts.push('</div>');
      if (artifact.tags && artifact.tags.length > 0) {
        parts.push('<div style="margin-top:8px">');
        artifact.tags.forEach(function (t) {
          parts.push('<span class="tag-badge">' + _escapeHtml(t) + '</span>');
        });
        parts.push('</div>');
      }
      parts.push('</div>');
    });

    parts.push('</section>');
    return parts.join('\n');
  }

  function _renderHTMLArtifactContent(artifact) {
    var d = artifact.data || {};
    var parts = [];

    switch (artifact.type) {
      case 'bug_report':
        if (d.severity) parts.push('<p><span class="badge" style="color:' + (SEVERITY_COLORS_HTML[d.severity] || '#666') + ';border-color:' + (SEVERITY_COLORS_HTML[d.severity] || '#666') + '">' + _escapeHtml('Severity: ' + (SEVERITY_LABELS_HTML[d.severity] || d.severity)) + '</span></p>');
        if (d.priority) parts.push('<p><span class="badge" style="color:' + (PRIORITY_COLORS_HTML[d.priority] || '#666') + ';border-color:' + (PRIORITY_COLORS_HTML[d.priority] || '#666') + '">' + _escapeHtml('Priority: ' + (PRIORITY_LABELS_HTML[d.priority] || d.priority)) + '</span></p>');
        if (d.status) parts.push('<p><span class="badge badge-light">' + _escapeHtml(STATUS_LABELS_HTML[d.status] || d.status) + '</span></p>');
        if (d.description) parts.push('<p>' + _escapeHtml(d.description).replace(/\n/g, '<br>') + '</p>');
        if (d.steps && d.steps.length > 0) {
          parts.push('<p><strong>Шаги:</strong></p><ol class="step-list">');
          d.steps.forEach(function (s) { if (s) parts.push('<li>' + _escapeHtml(s) + '</li>'); });
          parts.push('</ol>');
        }
        if (d.expected) parts.push('<p><strong>Ожидаемый:</strong> ' + _escapeHtml(d.expected).replace(/\n/g, '<br>') + '</p>');
        if (d.actual) parts.push('<p><strong>Фактический:</strong> ' + _escapeHtml(d.actual).replace(/\n/g, '<br>') + '</p>');
        break;

      case 'test_case':
        if (d.id) parts.push('<p><strong>ID:</strong> ' + _escapeHtml(d.id) + '</p>');
        if (d.type) parts.push('<p><span class="badge badge-light">' + _escapeHtml(d.type) + '</span> <span class="badge badge-light">' + _escapeHtml(d.priority || '') + '</span> <span class="badge" style="color:' + (TC_STATUS_COLORS_HTML[d.status] || '#666') + ';border-color:' + (TC_STATUS_COLORS_HTML[d.status] || '#666') + '">' + _escapeHtml(TC_STATUS_LABELS_HTML[d.status] || d.status || '') + '</span></p>');
        if (d.preconditions) parts.push('<p><strong>Предусловия:</strong> ' + _escapeHtml(d.preconditions).replace(/\n/g, '<br>') + '</p>');
        if (d.steps && d.steps.length > 0) {
          parts.push('<table><thead><tr><th>#</th><th>Действие</th><th>Ожидаемый результат</th></tr></thead><tbody>');
          d.steps.forEach(function (s, i) {
            parts.push('<tr><td>' + (i + 1) + '</td><td>' + _escapeHtml(s.action || '') + '</td><td>' + _escapeHtml(s.expectedResult || '') + '</td></tr>');
          });
          parts.push('</tbody></table>');
        }
        break;

      case 'checklist':
        if (d.items && d.items.length > 0) {
          var checked = d.items.filter(function (i) { return i.isChecked; }).length;
          parts.push('<p>Выполнено: ' + checked + ' из ' + d.items.length + '</p>');
          parts.push('<div class="progress-bar"><div class="progress-fill" style="width:' + (d.items.length > 0 ? Math.round(checked / d.items.length * 100) : 0) + '%"></div></div>');
          parts.push('<ul class="step-list">');
          d.items.forEach(function (item) {
            parts.push('<li>' + (item.isChecked ? '✅' : '⬜') + ' ' + _escapeHtml(item.text || ''));
            if (item.category) parts.push(' <em>(' + _escapeHtml(item.category) + ')</em>');
            parts.push('</li>');
          });
          parts.push('</ul>');
        }
        break;

      case 'test_plan':
        if (d.scope) parts.push('<p><strong>Область:</strong> ' + _escapeHtml(d.scope).replace(/\n/g, '<br>') + '</p>');
        if (d.strategy) parts.push('<p><strong>Стратегия:</strong> ' + _escapeHtml(d.strategy).replace(/\n/g, '<br>') + '</p>');
        if (d.schedule && d.schedule.length > 0) {
          parts.push('<p><strong>Расписание:</strong></p><table><thead><tr><th>Фаза</th><th>Начало</th><th>Окончание</th><th>Ответственный</th></tr></thead><tbody>');
          d.schedule.forEach(function (s) {
            parts.push('<tr><td>' + _escapeHtml(s.phase || '') + '</td><td>' + _escapeHtml(s.startDate || '') + '</td><td>' + _escapeHtml(s.endDate || '') + '</td><td>' + _escapeHtml(s.responsible || '') + '</td></tr>');
          });
          parts.push('</tbody></table>');
        }
        if (d.risks && d.risks.length > 0) {
          parts.push('<p><strong>Риски:</strong></p><table><thead><tr><th>Риск</th><th>Влияние</th><th>Меры</th></tr></thead><tbody>');
          d.risks.forEach(function (r) {
            parts.push('<tr><td>' + _escapeHtml(r.risk || '') + '</td><td>' + _escapeHtml(r.impact || '') + '</td><td>' + _escapeHtml(r.mitigation || '') + '</td></tr>');
          });
          parts.push('</tbody></table>');
        }
        break;

      case 'api_test':
        if (d.method) parts.push('<p><span class="method-badge" style="background:' + (HTTP_METHOD_COLORS_HTML[d.method] || '#666') + ';color:#fff">' + _escapeHtml(d.method) + '</span> <code>' + _escapeHtml(d.url || '') + '</code></p>');
        if (d.headers && d.headers.length > 0) {
          var hasH = d.headers.some(function (h) { return h.key || h.value; });
          if (hasH) {
            parts.push('<p><strong>Заголовки:</strong></p><table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>');
            d.headers.forEach(function (h) {
              if (!h.key && !h.value) return;
              parts.push('<tr><td>' + _escapeHtml(h.key || '') + '</td><td>' + _escapeHtml(h.value || '') + '</td></tr>');
            });
            parts.push('</tbody></table>');
          }
        }
        if (d.body) parts.push('<p><strong>Тело:</strong></p><div class="code-block">' + _escapeHtml(d.body) + '</div>');
        parts.push('<p><strong>Ожидаемый статус:</strong> ' + _escapeHtml(String(d.expectedStatus || 200)) + '</p>');
        if (d.expectedResponse) parts.push('<div class="code-block">' + _escapeHtml(d.expectedResponse) + '</div>');
        break;

      default:
        parts.push('<pre>' + _escapeHtml(JSON.stringify(d, null, 2)) + '</pre>');
    }

    return parts.join('\n');
  }

  function _renderHTMLNotes(notes) {
    var parts = [];
    parts.push('<section>');
    parts.push('<h2>Заметки (' + notes.length + ')</h2>');

    notes.forEach(function (note) {
      parts.push('<div class="note-item">');
      parts.push('<div class="note-date">' + _escapeHtml(_formatDateTime(note.createdAt || note.date || '')) + '</div>');
      parts.push('<div class="note-text">' + _escapeHtml(note.text || '').replace(/\n/g, '<br>') + '</div>');
      if (note.tags && note.tags.length > 0) {
        parts.push('<div style="margin-top:5px">');
        note.tags.forEach(function (t) {
          parts.push('<span class="tag-badge">' + _escapeHtml(t) + '</span>');
        });
        parts.push('</div>');
      }
      parts.push('</div>');
    });

    parts.push('</section>');
    return parts.join('\n');
  }

  function _renderHTMLGlossary(glossary) {
    var parts = [];
    parts.push('<section>');
    parts.push('<h2>Глоссарий (' + glossary.length + ')</h2>');

    glossary.forEach(function (term) {
      parts.push('<div class="glossary-item">');
      parts.push('<span class="glossary-term">' + _escapeHtml(term.term || term.title || '') + '</span>');
      parts.push(' — <span class="glossary-def">' + _escapeHtml(term.definition || term.description || '') + '</span>');
      if (term.example) {
        parts.push('<br><span class="glossary-def"><em>Пример: ' + _escapeHtml(term.example) + '</em></span>');
      }
      parts.push('</div>');
    });

    parts.push('</section>');
    return parts.join('\n');
  }

  function _renderHTMLTags(tags) {
    var parts = [];
    parts.push('<section>');
    parts.push('<h2>Теги (' + tags.length + ')</h2>');
    parts.push('<div>');
    tags.forEach(function (t) {
      parts.push('<span class="tag-badge">' + _escapeHtml(typeof t === 'string' ? t : (t.name || t.label || '')) + '</span>');
    });
    parts.push('</div>');
    parts.push('</section>');
    return parts.join('\n');
  }

  // ----------------------------------------------------------------
  // ЭКСПОРТ В MARKDOWN
  // ----------------------------------------------------------------

  EI.exportMarkdown = function (options) {
    var opts = _normalizeOptionsHTML(options);
    var data = _collectExportDataHTML(opts);

    var dateStr = _formatDate(new Date());
    var md = _buildMarkdown(data, dateStr, opts);

    var filename = 'qa-portfolio-' + _getDateStampHTML() + '.md';

    _downloadFileHTML(filename, md, 'text/markdown');

    EI.recordExport('markdown', md.length, filename);

    if (window.Debug) Debug.info('Exported to Markdown (' + _formatFileSizeHTML(md.length) + ')');

    return { success: true, size: md.length, filename: filename };
  };

  function _buildMarkdown(data, dateStr, opts) {
    var parts = [];

    // Header
    parts.push('# QA Study Portfolio — Экспорт\n');
    parts.push('**Дата:** ' + dateStr + '  ');
    parts.push('**Версия:** ' + _getAppVersion() + '\n');
    parts.push('---\n');

    // Stats
    parts.push(_renderMarkdownStats(data));

    // Modules
    if (window.CourseData && CourseData.getModules) {
      var modules = CourseData.getModules();
      var progress = data.progress || {};
      parts.push(_renderMarkdownModules(modules, progress));
    }

    // Artifacts
    if (data.artifacts && data.artifacts.length > 0) {
      parts.push(_renderMarkdownArtifacts(data.artifacts));
    }

    // Notes
    if (data.notes && data.notes.length > 0) {
      parts.push(_renderMarkdownNotes(data.notes));
    }

    // Glossary
    if (window.CourseData && CourseData.getGlossary) {
      var glossary = CourseData.getGlossary();
      if (glossary && glossary.length > 0) {
        parts.push(_renderMarkdownGlossary(glossary));
      }
    }

    // Tags
    if (data.tags && data.tags.length > 0) {
      parts.push('## Теги\n\n');
      parts.push(data.tags.map(function (t) {
        return '`' + (typeof t === 'string' ? t : (t.name || '')) + '`';
      }).join(' '));
      parts.push('\n\n');
    }

    parts.push('---\n\n');
    parts.push('*Экспортировано из QA Study Portfolio*\n');

    return parts.join('\n');
  }

  function _renderMarkdownStats(data) {
    var modules = (window.CourseData && CourseData.getModules) ? CourseData.getModules() : [];
    var progress = data.progress || {};
    var artifacts = data.artifacts || [];
    var notes = data.notes || [];
    var pomodoro = data.pomodoro || {};

    var completedModules = 0;
    var totalLessons = 0;
    var completedLessons = 0;

    modules.forEach(function (m) {
      var mp = progress[m.id] || {};
      if (mp.status === 'completed') completedModules++;
      if (m.lessons) {
        totalLessons += m.lessons.length;
        m.lessons.forEach(function (l) {
          if (mp.lessons && mp.lessons[l.id] && mp.lessons[l.id].completed) completedLessons++;
        });
      }
    });

    var studyMinutes = 0;
    if (pomodoro.sessions) {
      pomodoro.sessions.forEach(function (s) { if (s.duration) studyMinutes += s.duration; });
    }
    studyMinutes = Math.round(studyMinutes / 60);
    var studyHours = (studyMinutes / 60).toFixed(1);

    var parts = [];
    parts.push('## Статистика\n\n');
    parts.push('| Показатель | Значение |\n');
    parts.push('|------------|----------|\n');
    parts.push('| Модулей завершено | ' + completedModules + ' из ' + modules.length + ' |\n');
    parts.push('| Уроков пройдено | ' + completedLessons + ' из ' + totalLessons + ' |\n');
    parts.push('| Артефактов создано | ' + artifacts.length + ' |\n');
    parts.push('| Заметок | ' + notes.length + ' |\n');
    parts.push('| Времени в учёбе | ' + studyHours + ' часов (' + studyMinutes + ' мин) |\n');
    parts.push('\n');
    return parts.join('');
  }

  function _renderMarkdownModules(modules, progress) {
    var parts = [];
    parts.push('## Модули\n\n');
    parts.push('| # | Название | Прогресс | Статус |\n');
    parts.push('|---|----------|----------|--------|\n');

    modules.forEach(function (m, idx) {
      var mp = progress[m.id] || {};
      var pct = mp.progress || 0;
      var status = mp.status || 'not_started';
      var statusLabel = { not_started: 'Не начат', in_progress: 'In Progress', completed: 'Завершён' }[status] || status;
      parts.push('| ' + (idx + 1) + ' | ' + (m.title || '') + ' | ' + pct + '% | ' + statusLabel + ' |\n');
    });

    parts.push('\n');
    return parts.join('');
  }

  function _renderMarkdownArtifacts(artifacts) {
    var parts = [];
    parts.push('## Артефакты\n\n');

    artifacts.forEach(function (artifact) {
      var d = artifact.data || {};
      var typeLabel = TYPE_LABELS_HTML[artifact.type] || artifact.type || 'Артефакт';

      parts.push('### ' + typeLabel + ': ' + (artifact.title || '') + '\n\n');

      switch (artifact.type) {
        case 'bug_report':
          if (d.severity) parts.push('**Severity:** ' + (SEVERITY_LABELS_HTML[d.severity] || d.severity) + '\n');
          if (d.priority) parts.push('**Priority:** ' + (PRIORITY_LABELS_HTML[d.priority] || d.priority) + '\n');
          if (d.status) parts.push('**Status:** ' + (STATUS_LABELS_HTML[d.status] || d.status) + '\n');
          if (d.environment) parts.push('**Environment:** ' + d.environment + '\n');
          if (d.description) parts.push('\n' + d.description + '\n');
          if (d.steps && d.steps.length > 0) {
            parts.push('\n**Steps:**\n\n');
            d.steps.forEach(function (s, i) { if (s) parts.push((i + 1) + '. ' + s + '\n'); });
          }
          if (d.expected) parts.push('\n**Expected:** ' + d.expected + '\n');
          if (d.actual) parts.push('\n**Actual:** ' + d.actual + '\n');
          break;

        case 'test_case':
          if (d.id) parts.push('**ID:** ' + d.id + '\n');
          if (d.type) parts.push('**Type:** ' + d.type + '\n');
          if (d.priority) parts.push('**Priority:** ' + d.priority + '\n');
          if (d.status) parts.push('**Status:** ' + (TC_STATUS_LABELS_HTML[d.status] || d.status) + '\n');
          if (d.preconditions) parts.push('\n**Preconditions:** ' + d.preconditions + '\n');
          if (d.steps && d.steps.length > 0) {
            parts.push('\n**Steps:**\n\n');
            parts.push('| # | Action | Expected |\n');
            parts.push('|---|--------|----------|\n');
            d.steps.forEach(function (s, i) {
              parts.push('| ' + (i + 1) + ' | ' + (s.action || '') + ' | ' + (s.expectedResult || '') + ' |\n');
            });
          }
          if (d.postconditions) parts.push('\n**Postconditions:** ' + d.postconditions + '\n');
          break;

        case 'checklist':
          if (d.items && d.items.length > 0) {
            var checked = d.items.filter(function (i) { return i.isChecked; }).length;
            parts.push('**Прогресс:** ' + checked + ' из ' + d.items.length + '\n\n');
            d.items.forEach(function (item) {
              parts.push('- [' + (item.isChecked ? 'x' : ' ') + '] ' + (item.text || ''));
              if (item.category) parts.push(' *(' + item.category + ')*');
              parts.push('\n');
            });
          }
          break;

        case 'test_plan':
          if (d.scope) parts.push('**Scope:** ' + d.scope + '\n\n');
          if (d.strategy) parts.push('**Strategy:** ' + d.strategy + '\n\n');
          if (d.schedule && d.schedule.length > 0) {
            parts.push('**Schedule:**\n\n');
            parts.push('| Фаза | Начало | Окончание | Ответственный |\n');
            parts.push('|------|--------|----------|---------------|\n');
            d.schedule.forEach(function (s) {
              parts.push('| ' + (s.phase || '') + ' | ' + (s.startDate || '') + ' | ' + (s.endDate || '') + ' | ' + (s.responsible || '') + ' |\n');
            });
            parts.push('\n');
          }
          if (d.risks && d.risks.length > 0) {
            parts.push('**Risks:**\n\n');
            parts.push('| Риск | Влияние | Меры |\n');
            parts.push('|------|---------|------|\n');
            d.risks.forEach(function (r) {
              parts.push('| ' + (r.risk || '') + ' | ' + (r.impact || '') + ' | ' + (r.mitigation || '') + ' |\n');
            });
            parts.push('\n');
          }
          if (d.resources && d.resources.length > 0) {
            parts.push('**Resources:**\n');
            d.resources.forEach(function (r) { if (r) parts.push('- ' + r + '\n'); });
            parts.push('\n');
          }
          break;

        case 'api_test':
          parts.push('**Method:** ' + (d.method || 'GET') + '\n');
          parts.push('**URL:** ' + (d.url || '') + '\n');
          parts.push('**Expected Status:** ' + (d.expectedStatus || 200) + '\n');
          if (d.headers && d.headers.length > 0) {
            var hasH = d.headers.some(function (h) { return h.key || h.value; });
            if (hasH) {
              parts.push('\n**Headers:**\n\n');
              parts.push('| Key | Value |\n');
              parts.push('|-----|-------|\n');
              d.headers.forEach(function (h) {
                if (!h.key && !h.value) return;
                parts.push('| ' + (h.key || '') + ' | ' + (h.value || '') + ' |\n');
              });
            }
          }
          if (d.body && d.body.trim()) parts.push('\n**Body:**\n\n```json\n' + d.body + '\n```\n');
          if (d.expectedResponse && d.expectedResponse.trim()) parts.push('\n**Expected Response:**\n\n```json\n' + d.expectedResponse + '\n```\n');
          break;

        default:
          parts.push('```json\n' + JSON.stringify(d, null, 2) + '\n```\n');
      }

      if (artifact.tags && artifact.tags.length > 0) {
        parts.push('\n**Теги:** ' + artifact.tags.map(function (t) { return '`' + t + '`'; }).join(' ') + '\n');
      }

      parts.push('\n---\n\n');
    });

    return parts.join('');
  }

  function _renderMarkdownNotes(notes) {
    var parts = [];
    parts.push('## Заметки\n\n');

    notes.forEach(function (note) {
      var date = _formatDate(note.createdAt || note.date || '');
      parts.push('### Заметка (' + date + ')\n\n');
      parts.push(note.text || '');
      if (note.tags && note.tags.length > 0) {
        parts.push('\n\n*Теги: ' + note.tags.map(function (t) { return '`' + t + '`'; }).join(' ') + '*');
      }
      parts.push('\n\n---\n\n');
    });

    return parts.join('');
  }

  function _renderMarkdownGlossary(glossary) {
    var parts = [];
    parts.push('## Глоссарий\n\n');

    glossary.forEach(function (term) {
      parts.push('**' + (term.term || term.title || '') + '** — ' + (term.definition || term.description || ''));
      if (term.example) parts.push('  \n*Пример: ' + term.example + '*');
      parts.push('\n\n');
    });

    return parts.join('');
  }

  // ========================================================================
  // ВНУТРЕННИЕ УТИЛИТЫ (продолжение)
  // ========================================================================

  function _normalizeOptionsHTML(options) {
    var opts = {};
    var defaults = {
      progress: true, notes: true, artifacts: true, tags: true,
      bookmarks: true, pomodoro: true, settings: false, searchHistory: false, glossary: true
    };
    var keys = Object.keys(defaults);
    keys.forEach(function (key) {
      if (options && typeof options[key] === 'boolean') {
        opts[key] = options[key];
      } else {
        opts[key] = defaults[key];
      }
    });
    return opts;
  }

  function _collectExportDataHTML(opts) {
    var keys = _getKeys();
    var data = {};
    if (opts.progress) data.progress = Utils.storage.get(keys.PROGRESS) || {};
    if (opts.notes) data.notes = Utils.storage.get(keys.NOTES) || [];
    if (opts.artifacts) data.artifacts = Utils.storage.get(keys.ARTIFACTS) || [];
    if (opts.tags) data.tags = Utils.storage.get(keys.TAGS) || [];
    if (opts.bookmarks) data.bookmarks = Utils.storage.get(keys.BOOKMARKS) || [];
    if (opts.pomodoro) data.pomodoro = Utils.storage.get(keys.POMODORO) || {};
    if (opts.settings) data.settings = Utils.storage.get(keys.SETTINGS) || {};
    if (opts.searchHistory) data.searchHistory = Utils.storage.get(keys.SEARCH_HISTORY) || [];
    if (opts.glossary && window.CourseData && CourseData.getGlossary) data.glossary = CourseData.getGlossary();
    return data;
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

  function _getDateStampHTML() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function _downloadFileHTML(filename, content, mimeType) {
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

  function _formatFileSizeHTML(bytes) {
    if (Utils.format && Utils.format.formatFileSize) return Utils.format.formatFileSize(bytes);
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / 1048576).toFixed(2) + ' МБ';
  }

  function _getAppVersion() {
    if (Utils.constants && Utils.constants.APP_VERSION) return Utils.constants.APP_VERSION;
    return APP_VERSION;
  }

  function _getKeys() {
    if (STORAGE_KEYS) return STORAGE_KEYS;
    if (window.Utils && Utils.constants && Utils.constants.STORAGE_KEYS) {
      STORAGE_KEYS = Utils.constants.STORAGE_KEYS;
      APP_VERSION = Utils.constants.APP_VERSION || APP_VERSION;
    } else {
      STORAGE_KEYS = {
        STATE: 'qa_portfolio_state', SETTINGS: 'qa_portfolio_settings',
        PROGRESS: 'qa_portfolio_progress', NOTES: 'qa_portfolio_notes',
        ARTIFACTS: 'qa_portfolio_artifacts', TAGS: 'qa_portfolio_tags',
        BOOKMARKS: 'qa_portfolio_bookmarks', POMODORO: 'qa_portfolio_pomodoro',
        SEARCH_HISTORY: 'qa_portfolio_search_history',
        EXPORT_HISTORY: 'qa_portfolio_export_history',
        BACKUP_HISTORY: 'qa_portfolio_backup_history',
        ONBOARDED: 'qa_portfolio_onboarded'
      };
    }
    return STORAGE_KEYS;
  }

  function _formatDate(date) {
    if (!date) return '';
    try {
      var d = typeof date === 'string' ? new Date(date) : date;
      if (Utils.format && Utils.format.formatDateRu) return Utils.format.formatDateRu(d);
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return String(date); }
  }

  function _formatDateTime(date) {
    if (!date) return '';
    try {
      var d = typeof date === 'string' ? new Date(date) : date;
      if (Utils.format && Utils.format.formatDateRu) return Utils.format.formatDateRu(d, { includeTime: true });
      return d.toLocaleString('ru-RU');
    } catch (e) { return String(date); }
  }

})();
/* ЧАСТЬ 3 из 4: Импорт, валидация, шеринг */

(function () {
  'use strict';

  var EI = window.ExportImport;
  if (!EI) return;

  // ========================================================================
  // ИМПОРТ ИЗ JSON-ФАЙЛА
  // ========================================================================

  EI.importJSON = function (file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject({ error: 'no_file', message: 'Файл не выбран' });
        return;
      }

      if (!file.name || !file.name.toLowerCase().endsWith('.json')) {
        reject({ error: 'invalid_format', message: 'Пожалуйста, выберите .json файл' });
        return;
      }

      var reader = new FileReader();

      reader.onload = function (e) {
        try {
          var content = e.target.result;
          var data;

          if (Utils.format && Utils.format.parseJSON) {
            data = Utils.format.parseJSON(content);
          } else {
            data = JSON.parse(content);
          }

          if (!data) {
            reject({ error: 'parse_error', message: 'Не удалось разобрать JSON' });
            return;
          }

          // Валидация
          var validation = EI.validateImport(data);
          if (!validation.valid) {
            reject({
              error: 'invalid',
              message: validation.errors.join('; '),
              validation: validation
            });
            return;
          }

          // Сохраняем для предпросмотра (не применяем сразу)
          _state.pendingImport = data;

          // Возвращаем данные для предпросмотра
          resolve({
            data: data,
            validation: validation,
            filename: file.name,
            fileSize: file.size,
            fileSizeFormatted: _formatFileSizeImp(file.size),
            needsConfirm: true
          });

        } catch (err) {
          reject({
            error: 'parse_error',
            message: 'Ошибка чтения файла: ' + (err.message || err)
          });
        }
      };

      reader.onerror = function () {
        reject({
          error: 'read_error',
          message: 'Не удалось прочитать файл'
        });
      };

      reader.readAsText(file);
    });
  };

  // ----------------------------------------------------------------
  // ИМПОРТ ИЗ ТЕКСТОВОЙ СТРОКИ
  // ----------------------------------------------------------------

  EI.importFromText = function (jsonString) {
    return new Promise(function (resolve, reject) {
      if (!jsonString || typeof jsonString !== 'string') {
        reject({ error: 'empty', message: 'Строка пустая' });
        return;
      }

      var data;

      try {
        if (Utils.format && Utils.format.parseJSON) {
          data = Utils.format.parseJSON(jsonString);
        } else {
          data = JSON.parse(jsonString);
        }
      } catch (err) {
        reject({
          error: 'parse_error',
          message: 'Невалидный JSON: ' + (err.message || err)
        });
        return;
      }

      if (!data) {
        reject({ error: 'parse_error', message: 'Не удалось разобрать JSON' });
        return;
      }

      var validation = EI.validateImport(data);
      if (!validation.valid) {
        reject({
          error: 'invalid',
          message: validation.errors.join('; '),
          validation: validation
        });
        return;
      }

      _state.pendingImport = data;

      resolve({
        data: data,
        validation: validation,
        needsConfirm: true
      });
    });
  };

  // ----------------------------------------------------------------
  // ВАЛИДАЦИЯ ИМПОРТИРУЕМЫХ ДАННЫХ
  // ----------------------------------------------------------------

  EI.validateImport = function (data) {
    var warnings = [];
    var errors = [];

    if (!data || typeof data !== 'object') {
      errors.push('Данные отсутствуют или не являются объектом');
      return { valid: false, warnings: warnings, errors: errors };
    }

    // Проверка структуры meta
    if (!data.meta) {
      warnings.push('Отсутствует блок meta — возможно импорт из старой версии');
    } else {
      if (typeof data.meta.version !== 'string' && typeof data.meta.version !== 'number') {
        warnings.push('Версия в meta не указана или имеет неверный формат');
      } else {
        // Сравнение версий
        var importVersion = String(data.meta.version);
        var currentVersion = _getAppVersionImp();

        if (Utils.misc && Utils.misc.compareVersions) {
          var cmp = Utils.misc.compareVersions(importVersion, currentVersion);
          if (cmp < 0) {
            warnings.push('Версия импорта (' + importVersion + ') старее текущей (' + currentVersion + ') — возможны несовместимости');
          } else if (cmp > 0) {
            warnings.push('Версия импорта (' + importVersion + ') новее текущей (' + currentVersion + ') — некоторые данные могут не поддерживаться');
          }
        } else {
          if (importVersion !== currentVersion) {
            warnings.push('Версия импорта (' + importVersion + ') отличается от текущей (' + currentVersion + ')');
          }
        }
      }

      if (data.meta.app && data.meta.app !== 'QA Study Portfolio') {
        warnings.push('Файл создан в другом приложении: ' + data.meta.app);
      }
    }

    // Проверка блока data
    if (!data.data) {
      errors.push('Отсутствует блок data — нет данных для импорта');
      return { valid: false, warnings: warnings, errors: errors };
    }

    if (typeof data.data !== 'object') {
      errors.push('Блок data должен быть объектом');
      return { valid: false, warnings: warnings, errors: errors };
    }

    // Проверка содержимого data (хотя бы одна секция)
    var dataKeys = Object.keys(data.data);
    if (dataKeys.length === 0) {
      errors.push('Блок data пуст — нет данных для импорта');
      return { valid: false, warnings: warnings, errors: errors };
    }

    // Проверка типов данных в известных секциях
    if (data.data.progress && typeof data.data.progress !== 'object') {
      warnings.push('Секция progress имеет неверный формат (ожидается объект)');
    }
    if (data.data.notes && !Array.isArray(data.data.notes)) {
      warnings.push('Секция notes имеет неверный формат (ожидается массив)');
    }
    if (data.data.artifacts && !Array.isArray(data.data.artifacts)) {
      warnings.push('Секция artifacts имеет неверный формат (ожидается массив)');
    }
    if (data.data.tags && !Array.isArray(data.data.tags)) {
      warnings.push('Секция tags имеет неверный формат (ожидается массив)');
    }
    if (data.data.bookmarks && !Array.isArray(data.data.bookmarks)) {
      warnings.push('Секция bookmarks имеет неверный формат (ожидается массив)');
    }
    if (data.data.settings && typeof data.data.settings !== 'object') {
      warnings.push('Секция settings имеет неверный формат (ожидается объект)');
    }

    var hasErrors = errors.length > 0;
    return { valid: !hasErrors, warnings: warnings, errors: errors };
  };

  // ----------------------------------------------------------------
  // ПРИМЕНЕНИЕ ИМПОРТА (после подтверждения пользователя)
  // ----------------------------------------------------------------

  EI.applyImport = function (data, options) {
    var opts = options || {};
    var merge = opts.merge !== false; // по умолчанию merge = true
    var keys = _getKeysImp();

    if (!data || !data.data) {
      _showToastImp('Нет данных для импорта', 'error');
      return { success: false, error: 'no_data' };
    }

    var importData = data.data;

    if (!merge) {
      // Полная замена — очищаем существующие данные
      if (Utils.storage && Utils.storage.clear) {
        Utils.storage.clear();
      }
    }

    // Запись данных по секциям
    if (importData.progress !== undefined) {
      if (merge) {
        var existingProgress = Utils.storage.get(keys.PROGRESS) || {};
        Utils.storage.set(keys.PROGRESS, _mergeDeep(existingProgress, importData.progress));
      } else {
        Utils.storage.set(keys.PROGRESS, importData.progress);
      }
    }

    if (importData.notes !== undefined) {
      if (merge) {
        var existingNotes = Utils.storage.get(keys.NOTES) || [];
        var noteIds = {};
        existingNotes.forEach(function (n) { if (n.id) noteIds[n.id] = true; });
        importData.notes.forEach(function (n) {
          if (!n.id || !noteIds[n.id]) existingNotes.push(n);
        });
        Utils.storage.set(keys.NOTES, existingNotes);
      } else {
        Utils.storage.set(keys.NOTES, importData.notes);
      }
    }

    if (importData.artifacts !== undefined) {
      if (merge) {
        var existingArt = Utils.storage.get(keys.ARTIFACTS) || [];
        var artIds = {};
        existingArt.forEach(function (a) { if (a.id) artIds[a.id] = true; });
        importData.artifacts.forEach(function (a) {
          if (!a.id || !artIds[a.id]) existingArt.push(a);
        });
        Utils.storage.set(keys.ARTIFACTS, existingArt);
      } else {
        Utils.storage.set(keys.ARTIFACTS, importData.artifacts);
      }
    }

    if (importData.tags !== undefined) {
      if (merge) {
        var existingTags = Utils.storage.get(keys.TAGS) || [];
        importData.tags.forEach(function (t) {
          if (existingTags.indexOf(t) === -1) existingTags.push(t);
        });
        Utils.storage.set(keys.TAGS, existingTags);
      } else {
        Utils.storage.set(keys.TAGS, importData.tags);
      }
    }

    if (importData.bookmarks !== undefined) {
      if (merge) {
        var existingBm = Utils.storage.get(keys.BOOKMARKS) || [];
        var bmIds = {};
        existingBm.forEach(function (b) { if (b.id) bmIds[b.id] = true; });
        importData.bookmarks.forEach(function (b) {
          if (!b.id || !bmIds[b.id]) existingBm.push(b);
        });
        Utils.storage.set(keys.BOOKMARKS, existingBm);
      } else {
        Utils.storage.set(keys.BOOKMARKS, importData.bookmarks);
      }
    }

    if (importData.pomodoro !== undefined) {
      if (merge) {
        var existingPom = Utils.storage.get(keys.POMODORO) || {};
        Utils.storage.set(keys.POMODORO, _mergeDeep(existingPom, importData.pomodoro));
      } else {
        Utils.storage.set(keys.POMODORO, importData.pomodoro);
      }
    }

    if (importData.settings !== undefined) {
      if (merge) {
        var existingSettings = Utils.storage.get(keys.SETTINGS) || {};
        Utils.storage.set(keys.SETTINGS, _mergeDeep(existingSettings, importData.settings));
      } else {
        Utils.storage.set(keys.SETTINGS, importData.settings);
      }
    }

    if (importData.searchHistory !== undefined) {
      Utils.storage.set(keys.SEARCH_HISTORY, importData.searchHistory);
    }

    // Записать в историю импорта
    EI.recordExport('import', 0, data.meta ? data.meta.exportedAt || '' : '');

    _state.pendingImport = null;
    _state.lastImport = {
      date: new Date().toISOString(),
      merge: merge
    };

    _showToastImp('Данные импортированы', 'success');

    // Предупреждение о версии
    if (data.meta && data.meta.version) {
      var currentVer = _getAppVersionImp();
      if (Utils.misc && Utils.misc.compareVersions) {
        if (Utils.misc.compareVersions(String(data.meta.version), currentVer) < 0) {
          _showToastImp('Импортирована старая версия данных — проверьте корректность', 'warning');
        }
      }
    }

    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('import:completed', { merge: merge, data: data });
    }

    if (window.App && App.markUnsaved) App.markUnsaved();

    return { success: true, merge: merge };
  };

  // ========================================================================
  // ШАРИНГ
  // ========================================================================

  EI.shareLink = function (options) {
    var opts = {};
    var defaults = {
      progress: true, notes: true, artifacts: true, tags: true,
      bookmarks: false, pomodoro: false, settings: false, searchHistory: false, glossary: false,
      format: 'json'
    };
    var keys = Object.keys(defaults);
    keys.forEach(function (key) {
      if (options && typeof options[key] === 'boolean') {
        opts[key] = options[key];
      } else {
        opts[key] = defaults[key];
      }
    });

    // Собираем данные
    var data = {
      meta: {
        version: _getAppVersionImp(),
        exportedAt: new Date().toISOString(),
        app: 'QA Study Portfolio',
        format: 'share-link'
      },
      data: _collectDataForShare(opts)
    };

    var jsonStr = JSON.stringify(data);
    var encoded;

    if (Utils.format && Utils.format.encodeBase64JSON) {
      encoded = Utils.format.encodeBase64JSON(data);
    } else {
      // Fallback — ручное base64-кодирование
      try {
        encoded = btoa(unescape(encodeURIComponent(jsonStr)));
      } catch (e) {
        encoded = btoa(jsonStr);
      }
    }

    var mimeType = opts.format === 'html' ? 'text/html' : 'application/json';
    var dataUri = 'data:' + mimeType + ';base64,' + encoded;

    return dataUri;
  };

  // ----------------------------------------------------------------
  // КОПИРОВАНИЕ В БУФЕР ОБМЕНА
  // ----------------------------------------------------------------

  EI.copyToClipboard = function (text) {
    return new Promise(function (resolve, reject) {
      if (!text) {
        reject(new Error('Текст пустой'));
        return;
      }

      if (Utils.url && Utils.url.copyToClipboard) {
        Utils.url.copyToClipboard(text).then(function () {
          _showToastImp('Скопировано в буфер обмена', 'success');
          resolve(true);
        }).catch(function (err) {
          _fallbackClipboard(text, resolve, reject);
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          _showToastImp('Скопировано в буфер обмена', 'success');
          resolve(true);
        }).catch(function () {
          _fallbackClipboard(text, resolve, reject);
        });
      } else {
        _fallbackClipboard(text, resolve, reject);
      }
    });
  };

  function _fallbackClipboard(text, resolve, reject) {
    try {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        _showToastImp('Скопировано в буфер обмена', 'success');
        resolve(true);
      } else {
        _showToastImp('Не удалось скопировать', 'error');
        reject(new Error('execCommand failed'));
      }
    } catch (e) {
      _showToastImp('Не удалось скопировать: ' + e.message, 'error');
      reject(e);
    }
  }

  // ----------------------------------------------------------------
  // ШЕРИНГ ЧЕРЕЗ NAVIGATOR.SHARE
  // ----------------------------------------------------------------

  EI.shareData = function (data) {
    return new Promise(function (resolve, reject) {
      if (!data || (!data.title && !data.text && !data.url)) {
        reject(new Error('Нет данных для шеринга'));
        return;
      }

      // Проверка поддержки navigator.share
      var supportsShare = false;
      if (Utils.device && Utils.device.supportsShare) {
        supportsShare = Utils.device.supportsShare();
      } else if (navigator.share) {
        supportsShare = true;
      }

      if (supportsShare && navigator.share) {
        var shareData = {};
        if (data.title) shareData.title = data.title;
        if (data.text) shareData.text = data.text;
        if (data.url) shareData.url = data.url;

        navigator.share(shareData).then(function () {
          if (window.Debug) Debug.info('Shared via navigator.share');
          resolve(true);
        }).catch(function (err) {
          // Пользователь отменил или ошибка
          if (err && err.name === 'AbortError') {
            resolve(false);
          } else {
            // Fallback на копирование
            EI.copyToClipboard(data.url || data.text || '').then(function () {
              resolve(true);
            }).catch(function () {
              reject(err);
            });
          }
        });
      } else {
        // Fallback — копирование в буфер
        var textToCopy = data.url || data.text || '';
        if (textToCopy) {
          EI.copyToClipboard(textToCopy).then(function () {
            resolve(true);
          }).catch(function () {
            reject(new Error('Шеринг недоступен и копирование не удалось'));
          });
        } else {
          reject(new Error('Шеринг недоступен на этом устройстве'));
        }
      }
    });
  };

  // ========================================================================
  // ВНУТРЕННИЕ УТИЛИТЫ
  // ========================================================================

  function _mergeDeep(target, source) {
    if (Utils.misc && Utils.misc.merge) return Utils.misc.merge(target, source);
    var result = _deepCloneImp(target);
    if (!source || typeof source !== 'object') return result;
    Object.keys(source).forEach(function (key) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = _mergeDeep(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    return result;
  }

  function _deepCloneImp(obj) {
    if (Utils.misc && Utils.misc.deepClone) return Utils.misc.deepClone(obj);
    try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; }
  }

  function _collectDataForShare(opts) {
    var keys = _getKeysImp();
    var data = {};
    if (opts.progress) data.progress = Utils.storage.get(keys.PROGRESS) || {};
    if (opts.notes) data.notes = Utils.storage.get(keys.NOTES) || [];
    if (opts.artifacts) data.artifacts = Utils.storage.get(keys.ARTIFACTS) || [];
    if (opts.tags) data.tags = Utils.storage.get(keys.TAGS) || [];
    if (opts.bookmarks) data.bookmarks = Utils.storage.get(keys.BOOKMARKS) || [];
    if (opts.pomodoro) data.pomodoro = Utils.storage.get(keys.POMODORO) || {};
    if (opts.settings) data.settings = Utils.storage.get(keys.SETTINGS) || {};
    if (opts.searchHistory) data.searchHistory = Utils.storage.get(keys.SEARCH_HISTORY) || [];
    if (opts.glossary && window.CourseData && CourseData.getGlossary) data.glossary = CourseData.getGlossary();
    return data;
  }

  function _showToastImp(message, type) {
    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('toast', { message: message, type: type || 'info' });
    } else if (window.App && typeof App.showToast === 'function') {
      App.showToast({ message: message, type: type || 'info' });
    }
  }

  function _formatFileSizeImp(bytes) {
    if (Utils.format && Utils.format.formatFileSize) return Utils.format.formatFileSize(bytes);
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / 1048576).toFixed(2) + ' МБ';
  }

  function _getAppVersionImp() {
    if (Utils.constants && Utils.constants.APP_VERSION) return Utils.constants.APP_VERSION;
    return '1.0.0';
  }

  function _getKeysImp() {
    if (STORAGE_KEYS) return STORAGE_KEYS;
    if (window.Utils && Utils.constants && Utils.constants.STORAGE_KEYS) {
      STORAGE_KEYS = Utils.constants.STORAGE_KEYS;
    } else {
      STORAGE_KEYS = {
        STATE: 'qa_portfolio_state', SETTINGS: 'qa_portfolio_settings',
        PROGRESS: 'qa_portfolio_progress', NOTES: 'qa_portfolio_notes',
        ARTIFACTS: 'qa_portfolio_artifacts', TAGS: 'qa_portfolio_tags',
        BOOKMARKS: 'qa_portfolio_bookmarks', POMODORO: 'qa_portfolio_pomodoro',
        SEARCH_HISTORY: 'qa_portfolio_search_history',
        EXPORT_HISTORY: 'qa_portfolio_export_history',
        BACKUP_HISTORY: 'qa_portfolio_backup_history',
        ONBOARDED: 'qa_portfolio_onboarded'
      };
    }
    return STORAGE_KEYS;
  }

  // Переменная STORAGE_KEYS объявлена в части 1, используем из замыкания части 1
  // Если недоступна — получаем заново
  var STORAGE_KEYS = _getKeysImp();

})();
/* ЧАСТЬ 4 из 4: Бэкап, восстановление, очистка, сброс к демо */

(function () {
  'use strict';

  var EI = window.ExportImport;
  if (!EI) return;

  // ========================================================================
  // БЭКАП
  // ========================================================================

  EI.backup = function (options) {
    var opts = options || {};
    var download = opts.download !== false; // по умолчанию true

    // Собираем все данные
    var keys = _getKeysBk();
    var allData = {};

    // Перебираем все ключи с префиксом qa_portfolio_
    if (Utils.storage && Utils.storage.exportAll) {
      allData = Utils.storage.exportAll();
    } else {
      // Ручной сбор
      Object.keys(keys).forEach(function (keyName) {
        var storageKey = keys[keyName];
        var val = Utils.storage.get(storageKey);
        if (val !== null && val !== undefined) {
          allData[storageKey] = val;
        }
      });
      // Также собираем любые другие ключи с префиксом
      if (Utils.storage && Utils.storage.getAllWithPrefix) {
        var extra = Utils.storage.getAllWithPrefix('qa_portfolio_');
        Object.keys(extra).forEach(function (k) {
          if (!(k in allData)) allData[k] = extra[k];
        });
      }
    }

    var backupObj = {
      meta: {
        version: _getAppVersionBk(),
        backupAt: new Date().toISOString(),
        app: 'QA Study Portfolio',
        format: 'backup',
        type: 'full'
      },
      data: allData
    };

    var content = JSON.stringify(backupObj, null, 2);
    var size = content.length;
    var backupId = _generateIdBk();
    var dateStr = _formatDateBk(new Date());

    // Записать в историю бэкапов
    var backupHistory = Utils.storage.get(keys.BACKUP_HISTORY);
    if (!Array.isArray(backupHistory)) backupHistory = [];

    var record = {
      id: backupId,
      date: new Date().toISOString(),
      size: size,
      type: 'full'
    };

    backupHistory.unshift(record);
    if (backupHistory.length > 20) {
      backupHistory = backupHistory.slice(0, 20);
    }

    Utils.storage.set(keys.BACKUP_HISTORY, backupHistory);

    // Скачать файл если нужно
    if (download) {
      var filename = 'qa-portfolio-backup-' + _getDateStampBk() + '.json';
      _downloadFileBk(filename, content, 'application/json');
      EI.recordExport('backup', size, filename);
    }

    if (window.Debug) Debug.info('Backup created (' + _formatFileSizeBk(size) + ')');

    return {
      success: true,
      data: backupObj,
      size: size,
      id: backupId,
      date: dateStr
    };
  };

  // ========================================================================
  // ВОССТАНОВЛЕНИЕ ИЗ БЭКАПА
  // ========================================================================

  EI.restore = function (backupData, options) {
    var opts = options || {};
    var merge = opts.merge === true; // по умолчанию false (полная замена)

    if (!backupData) {
      _showToastBk('Нет данных для восстановления', 'error');
      return { success: false, error: 'no_data' };
    }

    // Валидация
    var validation = EI.validateImport(backupData);
    if (!validation.valid) {
      _showToastBk('Данные бэкапа невалидны: ' + validation.errors.join('; '), 'error');
      return { success: false, error: 'invalid', validation: validation };
    }

    var keys = _getKeysBk();
    var data = backupData.data || backupData;

    if (!merge) {
      // Полная замена — очищаем
      if (Utils.storage && Utils.storage.clear) {
        Utils.storage.clear();
      }
    }

    // Восстанавливаем все ключи
    Object.keys(data).forEach(function (storageKey) {
      // Проверяем, что это наш ключ
      if (storageKey.indexOf('qa_portfolio_') === 0 || (keys && Object.values(keys).indexOf(storageKey) !== -1)) {
        if (merge && Utils.storage.get(storageKey) !== null) {
          // При merge — объединяем объекты, заменяем массивы
          var existing = Utils.storage.get(storageKey);
          var incoming = data[storageKey];

          if (existing && typeof existing === 'object' && !Array.isArray(existing) &&
              incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
            Utils.storage.set(storageKey, _mergeDeepBk(existing, incoming));
          } else {
            // Для массивов и примитивов — при merge не перезаписываем существующие
            if (existing === null || existing === undefined) {
              Utils.storage.set(storageKey, incoming);
            }
          }
        } else {
          Utils.storage.set(storageKey, data[storageKey]);
        }
      }
    });

    // Записать в историю
    EI.recordExport('restore', 0, backupData.meta ? backupData.meta.backupAt || '' : '');

    _showToastBk('Данные восстановлены', 'success');

    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('restore:completed', { merge: merge });
    }

    // Перезагрузка
    setTimeout(function () {
      if (window.App && typeof App.init === 'function') {
        App.init();
      } else {
        window.location.reload();
      }
    }, 1000);

    return { success: true, merge: merge };
  };

  // ========================================================================
  // ОЧИСТКА ВСЕХ ДАННЫХ
  // ========================================================================

  EI.clearAllData = function () {
    var keys = _getKeysBk();

    // Очищаем все ключи
    if (Utils.storage && Utils.storage.clear) {
      Utils.storage.clear();
    }

    // Дополнительно — поимённое удаление для надёжности
    Object.keys(keys).forEach(function (keyName) {
      try {
        Utils.storage.remove(keys[keyName]);
      } catch (e) { /* ignore */ }
    });

    // Очистка App.state если доступен
    if (window.QAApp && QAApp.state) {
      Object.keys(QAApp.state).forEach(function (key) {
        if (key !== 'initialized' && key !== 'version') {
          QAApp.state[key] = null;
        }
      });
    }

    if (window.App && App.state) {
      Object.keys(App.state).forEach(function (key) {
        if (key !== 'initialized') {
          App.state[key] = null;
        }
      });
    }

    if (window.Debug) Debug.info('All data cleared');

    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('data:cleared');
    }

    return { success: true };
  };

  // ========================================================================
  // СБРОС К ДЕМО-ДАННЫМ
  // ========================================================================

  EI.resetToDemo = function () {
    var keys = _getKeysBk();

    // Очищаем существующие данные
    if (Utils.storage && Utils.storage.clear) {
      Utils.storage.clear();
    }

    // Сбрасываем прогресс
    Utils.storage.set(keys.PROGRESS, {});

    // Сбрасываем заметки
    Utils.storage.set(keys.NOTES, []);

    // Сбрасываем теги
    Utils.storage.set(keys.TAGS, []);

    // Сбрасываем закладки
    Utils.storage.set(keys.BOOKMARKS, []);

    // Сбрасываем помодоро
    Utils.storage.set(keys.POMODORO, { sessions: [], totalMinutes: 0 });

    // Сбрасываем историю поиска
    Utils.storage.set(keys.SEARCH_HISTORY, []);

    // Создаём демо-артефакты если CourseData доступен
    if (window.CourseData && CourseData.getArtifacts) {
      var demoArtifacts = CourseData.getArtifacts();
      if (Array.isArray(demoArtifacts) && demoArtifacts.length > 0) {
        var artifactsWithMeta = demoArtifacts.map(function (artifact) {
          var now = new Date().toISOString();
          return {
            id: artifact.id || (Utils.id && Utils.id.uuid ? Utils.id.uuid() : 'demo_' + Math.random().toString(36).substr(2, 9)),
            type: artifact.type || 'bug_report',
            title: artifact.title || 'Демо-артефакт',
            data: artifact.data || artifact,
            tags: artifact.tags || [],
            createdAt: artifact.createdAt || now,
            updatedAt: now,
            lessonId: artifact.lessonId || null
          };
        });
        Utils.storage.set(keys.ARTIFACTS, artifactsWithMeta);
      }
    }

    // Демо-настройки
    var demoSettings = {
      theme: 'light',
      sidebarCollapsed: false,
      notifications: true,
      autoSave: true,
      pomodoroWorkDuration: 25,
      pomodoroBreakDuration: 5,
      pomodoroLongBreakDuration: 15,
      pomodoroSessionsUntilLongBreak: 4
    };
    Utils.storage.set(keys.SETTINGS, demoSettings);

    // Помечаем как обученный
    Utils.storage.set(keys.ONBOARDED, true);

    _showToastBk('Сброс к демо-данным', 'info');

    if (window.Debug) Debug.info('Reset to demo data');

    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('data:reset');
    }

    // Перерендерить текущую страницу
    setTimeout(function () {
      if (window.App && App.router && App.state && App.state.currentRoute) {
        App.router.navigate(App.state.currentRoute, { force: true });
      } else if (window.App && typeof App.init === 'function') {
        App.init();
      } else if (window.QAApp && QAApp.pages && QAApp.state && QAApp.state.currentRoute) {
        var renderFn = QAApp.pages[QAApp.state.currentRoute];
        if (typeof renderFn === 'function') renderFn();
      } else {
        window.location.reload();
      }
    }, 500);

    return { success: true };
  };

  // ========================================================================
  // ВНУТРЕННИЕ УТИЛИТЫ
  // ========================================================================

  function _getKeysBk() {
    if (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS) return STORAGE_KEYS;
    if (window.Utils && Utils.constants && Utils.constants.STORAGE_KEYS) {
      STORAGE_KEYS = Utils.constants.STORAGE_KEYS;
      return STORAGE_KEYS;
    }
    return {
      STATE: 'qa_portfolio_state', SETTINGS: 'qa_portfolio_settings',
      PROGRESS: 'qa_portfolio_progress', NOTES: 'qa_portfolio_notes',
      ARTIFACTS: 'qa_portfolio_artifacts', TAGS: 'qa_portfolio_tags',
      BOOKMARKS: 'qa_portfolio_bookmarks', POMODORO: 'qa_portfolio_pomodoro',
      SEARCH_HISTORY: 'qa_portfolio_search_history',
      EXPORT_HISTORY: 'qa_portfolio_export_history',
      BACKUP_HISTORY: 'qa_portfolio_backup_history',
      ONBOARDED: 'qa_portfolio_onboarded'
    };
  }

  var STORAGE_KEYS = _getKeysBk();

  function _generateIdBk() {
    if (Utils.id && Utils.id.uuid) return Utils.id.uuid();
    if (Utils.id && Utils.id.shortId) return Utils.id.shortId();
    return 'bk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function _formatDateBk(date) {
    if (!date) return '';
    try {
      var d = typeof date === 'string' ? new Date(date) : date;
      if (Utils.format && Utils.format.formatDateRu) return Utils.format.formatDateRu(d);
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return String(date); }
  }

  function _getDateStampBk() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function _formatFileSizeBk(bytes) {
    if (Utils.format && Utils.format.formatFileSize) return Utils.format.formatFileSize(bytes);
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / 1048576).toFixed(2) + ' МБ';
  }

  function _getAppVersionBk() {
    if (Utils.constants && Utils.constants.APP_VERSION) return Utils.constants.APP_VERSION;
    return '1.0.0';
  }

  function _downloadFileBk(filename, content, mimeType) {
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

  function _showToastBk(message, type) {
    if (window.QAApp && typeof QAApp.emit === 'function') {
      QAApp.emit('toast', { message: message, type: type || 'info' });
    } else if (window.App && typeof App.showToast === 'function') {
      App.showToast({ message: message, type: type || 'info' });
    }
  }

  function _mergeDeepBk(target, source) {
    if (Utils.misc && Utils.misc.merge) return Utils.misc.merge(target, source);
    var result = _deepCloneBk(target);
    if (!source || typeof source !== 'object') return result;
    Object.keys(source).forEach(function (key) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = _mergeDeepBk(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    return result;
  }

  function _deepCloneBk(obj) {
    if (Utils.misc && Utils.misc.deepClone) return Utils.misc.deepClone(obj);
    try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return obj; }
  }

  // ========================================================================
  // ФИНАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ (дорегистрация методов)
  // ========================================================================

  // Убеждаемся, что getBackupHistory доступен (объявлен в части 1, но проверяем)
  if (typeof EI.getBackupHistory !== 'function') {
    EI.getBackupHistory = function () {
      var keys = _getKeysBk();
      var history = Utils.storage.get(keys.BACKUP_HISTORY);
      if (!Array.isArray(history)) history = [];
      history.sort(function (a, b) {
        var da = new Date(a.date || 0).getTime();
        var db = new Date(b.date || 0).getTime();
        return db - da;
      });
      return history.slice(0, 20);
    };
  }

  // applyImport мог быть определён в части 3, но проверяем
  if (typeof EI.applyImport !== 'function') {
    // Заглушка не нужна — метод определён в части 3
    // Этот блок — страховка на случай порядка загрузки
  }

  // Авто-инициализация если DOM готов
  if (document.readyState !== 'loading') {
    EI.init();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      EI.init();
    });
  }

  if (window.Debug) Debug.info('ExportImport module fully loaded (all 4 parts)');

})();
