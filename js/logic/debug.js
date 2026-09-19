/*
 * QA Study Portfolio — журналирование и диагностика
 * Зависимости: window.Utils (необязательно), window.App (необязательно).
 * Публичный интерфейс: window.Debug
 *
 * Решение по буферу: записи всегда попадают в Queue, а в консоль выводятся
 * только при включенном режиме отладки. Иначе Debug.export отдавал бы пустой
 * файл ровно в том режиме, в котором журнал и нужен.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'qa-debug';
  var QUEUE_LIMIT = 100;

  var STYLES = {
    debug: 'color:#6B7A8F',
    info: 'color:#D4AF37;font-weight:600',
    warn: 'color:#B8860B;font-weight:600',
    error: 'color:#8C5A3C;font-weight:700'
  };

  var entries = [];

  function pad2(n) {
    var s = String(n);
    return s.length === 1 ? '0' + s : s;
  }

  function stamp(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function storage() {
    if (typeof global.Utils !== 'undefined' && global.Utils && global.Utils.Storage) {
      return global.Utils.Storage;
    }
    return null;
  }

  function appState() {
    if (global.App && global.App.state && global.App.state.ui && typeof global.App.state.ui === 'object') {
      return global.App.state.ui;
    }
    return null;
  }

  function toText(message) {
    if (typeof message === 'string') {
      return message;
    }
    if (message === null || typeof message === 'undefined') {
      return '';
    }
    try {
      return JSON.stringify(message);
    } catch (err) {
      return String(message);
    }
  }

  /* ======================================================================
   * Queue — кольцевой буфер на 100 записей
   * ====================================================================== */

  var Queue = {
    push: function (level, msg) {
      entries.push({ time: stamp(), level: String(level || 'info'), message: toText(msg) });
      while (entries.length > QUEUE_LIMIT) {
        entries.shift();
      }
      return entries.length;
    },

    getAll: function () {
      return entries.slice();
    },

    clear: function () {
      entries = [];
      return true;
    }
  };

  /* ======================================================================
   * Состояние режима отладки
   * ====================================================================== */

  function isEnabled() {
    var ui = appState();
    if (ui && typeof ui.debugEnabled === 'boolean') {
      return ui.debugEnabled;
    }
    var store = storage();
    return store ? store.get(STORAGE_KEY, false) === true : false;
  }

  function setEnabled(value) {
    var flag = value === true;
    var ui = appState();
    if (ui) {
      ui.debugEnabled = flag;
    }
    var store = storage();
    if (store) {
      store.set(STORAGE_KEY, flag);
    }
    return flag;
  }

  /* ======================================================================
   * Logger
   * ====================================================================== */

  function write(level, message) {
    var line = '[' + stamp() + '] [' + String(level).toUpperCase() + '] ' + toText(message);
    Queue.push(level, message);
    if (!isEnabled() || typeof global.console === 'undefined') {
      return line;
    }
    var method = level === 'error' ? 'error' : (level === 'warn' ? 'warn' : 'log');
    var fn = typeof global.console[method] === 'function' ? global.console[method] : global.console.log;
    if (typeof fn === 'function') {
      fn.call(global.console, '%c' + line, STYLES[level] || STYLES.info);
    }
    return line;
  }

  var Logger = {
    debug: function (message) { return write('debug', message); },
    info: function (message) { return write('info', message); },
    warn: function (message) { return write('warn', message); },
    error: function (message) { return write('error', message); }
  };

  /* ======================================================================
   * Выгрузка журнала в файл
   * ====================================================================== */

  function exportLog() {
    if (typeof global.Blob !== 'function' || !global.URL || typeof global.URL.createObjectURL !== 'function' || !global.document) {
      return false;
    }
    var payload = {
      exportedAt: stamp(),
      debugEnabled: isEnabled(),
      count: entries.length,
      entries: Queue.getAll()
    };
    var url;
    try {
      var blob = new global.Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      url = global.URL.createObjectURL(blob);
      var link = global.document.createElement('a');
      link.href = url;
      link.download = 'debug-' + today() + '.json';
      link.style.display = 'none';
      global.document.body.appendChild(link);
      link.click();
      global.document.body.removeChild(link);
    } catch (err) {
      if (url) {
        global.URL.revokeObjectURL(url);
      }
      return false;
    }
    global.setTimeout(function () {
      global.URL.revokeObjectURL(url);
    }, 1000);
    return true;
  }

  global.Debug = {
    Logger: Logger,
    Queue: Queue,
    isEnabled: isEnabled,
    enable: function () { return setEnabled(true); },
    disable: function () { return setEnabled(false); },
    'export': exportLog
  };
}(typeof window !== 'undefined' ? window : this));
