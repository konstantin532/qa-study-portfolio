/*
 * QA Study Portfolio — экспорт и импорт
 * Зависимости: window.Utils (необязательно), window.IDB (необязательно),
 *              window.SharingManager (необязательно, для упаковки курса).
 * Публичный интерфейс: window.Export
 *
 * Все низкоуровневые операции безопасны: FileReader оборачивается в Promise
 * и не бросает исключений, что важно для работы через file://.
 */
(function (global) {
  'use strict';

  var MIME_JSON = 'application/json';
  var MIME_MD = 'text/markdown;charset=utf-8';
  var MIME_HTML = 'text/html;charset=utf-8';
  var MAX_IMPORT_BYTES = 10 * 1024 * 1024; // 10 МБ

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length === 1) { m = '0' + m; }
    if (day.length === 1) { day = '0' + day; }
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function utils() {
    if (typeof global.Utils !== 'undefined' && global.Utils) {
      return global.Utils;
    }
    return null;
  }

  function appSharing() {
    if (global.App && global.App.SharingManager && typeof global.App.SharingManager === 'object') {
      return global.App.SharingManager;
    }
    return null;
  }

  function idb() {
    if (typeof global.IDB !== 'undefined' && global.IDB) {
      return global.IDB;
    }
    return null;
  }

  function storage() {
    var u = utils();
    return u && u.Storage ? u.Storage : null;
  }

  function toast(message, type) {
    if (global.App && typeof global.App.toast === 'function') {
      global.App.toast(message, type);
      return true;
    }
    return false;
  }

  function toBlob(content, mime) {
    if (typeof global.Blob !== 'function') {
      throw new Error('Blob недоступен');
    }
    return new global.Blob([content], { type: mime || MIME_JSON });
  }

  function revokeLater(url) {
    global.setTimeout(function () {
      if (typeof global.URL !== 'undefined' && global.URL && typeof global.URL.revokeObjectURL === 'function') {
        global.URL.revokeObjectURL(url);
      }
    }, 1000);
  }

  function readFile(file) {
    return new Promise(function (resolve) {
      if (!file || typeof file.size !== 'number') {
        resolve({ ok: false, error: 'Файл не передан' });
        return;
      }
      if (file.size > MAX_IMPORT_BYTES) {
        resolve({ ok: false, error: 'Файл больше 10 МБ' });
        return;
      }
      var reader = new global.FileReader();
      reader.onload = function () {
        resolve({ ok: true, text: String(reader.result || '') });
      };
      reader.onerror = function () {
        resolve({ ok: false, error: 'Не удалось прочитать файл' });
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  function downloadUrl(url, filename) {
    if (!global.document || !global.document.body) {
      return false;
    }
    var link = global.document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.style.display = 'none';
    global.document.body.appendChild(link);
    link.click();
    global.document.body.removeChild(link);
    return true;
  }

  /* ======================================================================
   * Базовые примитивы
   * ====================================================================== */

  var Export = {
    /**
     * Создает Blob из текста и скачивает его.
     * Адрес освобождается через 1000 мс.
     * @param {string} filename
     * @param {string} mime
     * @param {string|Blob} content
     * @returns {boolean}
     */
    download: function (filename, mime, content) {
      if (!global.document || typeof global.document.createElement !== 'function' || !global.URL || typeof global.URL.createObjectURL !== 'function') {
        return false;
      }
      var url;
      try {
        var blob = typeof content === 'object' && content && typeof content.size === 'number' ? content : toBlob(content, mime);
        url = global.URL.createObjectURL(blob);
        if (!downloadUrl(url, filename)) {
          global.URL.revokeObjectURL(url);
          return false;
        }
      } catch (err) {
        if (url) {
          global.URL.revokeObjectURL(url);
        }
        return false;
      }
      revokeLater(url);
      return true;
    },

    /**
     * Копирует текст в буфер обмена.
     * Сначала пробует navigator.clipboard, при недоступности —
     * скрытый textarea + execCommand. Возвращает Promise<boolean>.
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    copyToClipboard: function (text) {
      var value = typeof text === 'string' ? text : String(text == null ? '' : text);
      if (global.navigator && global.navigator.clipboard && typeof global.navigator.clipboard.writeText === 'function') {
        try {
          return global.navigator.clipboard.writeText(value).then(
            function () { return true; },
            function () {
              return fallbackCopy(value);
            }
          );
        } catch (err) {
          return Promise.resolve(fallbackCopy(value));
        }
      }
      return Promise.resolve(fallbackCopy(value));
    },

    /**
     * Скачивает объект как JSON.
     * @param {Object} data
     * @param {string} filename
     * @returns {boolean}
     */
    exportJSON: function (data, filename) {
      var json;
      try {
        json = JSON.stringify(data, null, 2);
      } catch (err) {
        toast('Не удалось сериализовать данные', 'error');
        return false;
      }
      var name = typeof filename === 'string' && filename ? filename : 'export-' + today() + '.json';
      return Export.download(name, MIME_JSON, json);
    },

    /**
     * Читает JSON-файл. Разрешает объект {ok, data?, error?}.
     * @param {File} file
     * @returns {Promise<Object>}
     */
    importJSON: function (file) {
      return readFile(file).then(function (res) {
        if (!res.ok) {
          return res;
        }
        try {
          var data = JSON.parse(res.text);
          return { ok: true, data: data };
        } catch (err) {
          return { ok: false, error: 'Файл не является корректным JSON' };
        }
      });
    },

    /**
     * Экспорт полного состояния через IDB.exportAll с JSON-резервом.
     * @param {Object} state
     * @returns {Promise<boolean>}
     */
    exportBackup: function (state) {
      var name = 'qa-backup-' + today() + '.json';
      var db = idb();
      if (db && typeof db.exportAll === 'function') {
        try {
          return Promise.resolve(db.exportAll()).then(function (payload) {
            if (payload && typeof payload === 'object') {
              return Export.download(name, MIME_JSON, JSON.stringify(payload, null, 2));
            }
            // резервный путь — по состоянию
            return Export.download(name, MIME_JSON, JSON.stringify(state, null, 2));
          }, function () {
            return Export.download(name, MIME_JSON, JSON.stringify(state, null, 2));
          });
        } catch (err) {
          return Promise.resolve(Export.download(name, MIME_JSON, JSON.stringify(state, null, 2)));
        }
      }
      try {
        return Promise.resolve(Export.download(name, MIME_JSON, JSON.stringify(state, null, 2)));
      } catch (err) {
        toast('Не удалось сформировать резервную копию', 'error');
        return Promise.resolve(false);
      }
    },

    /**
     * Импорт резервной копии: валидация версии и автобэкап перед импортом.
     * @param {File} file
     * @param {Object} [currentState]
     * @returns {Promise<Object>} {ok, data?, error?}
     */
    importBackup: function (file, currentState) {
      var store = storage();
      if (store) {
        try {
          store.set('qa-sp-backup-auto', { createdAt: new Date().toISOString(), state: currentState });
        } catch (err) {
          /* автобэкап не критичен */
        }
      }
      return Export.importJSON(file).then(function (res) {
        if (!res.ok) {
          return res;
        }
        var data = res.data;
        if (!data || typeof data !== 'object') {
          return { ok: false, error: 'Резервная копия повреждена' };
        }
        if (typeof data.version !== 'number' && typeof data.schemaVersion !== 'number') {
          return { ok: false, error: 'Не удается определить версию схемы' };
        }
        return { ok: true, data: data };
      });
    },

    /**
     * Экспорт заметок в Markdown.
     * @param {Array.<Object>} notes
     * @returns {string}
     */
    exportMarkdown: function (notes) {
      var u = utils();
      var fmt = u && u.Format ? u.Format : null;
      var lines = [];
      lines.push('# Мои заметки');
      lines.push('');
      lines.push('Сформировано: ' + (fmt ? fmt.formatDateTime(new Date().toISOString()) : new Date().toISOString()));
      lines.push('');
      lines.push('---');
      lines.push('');
      var list = Object.prototype.toString.call(notes) === '[object Array]' ? notes : [];
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        if (!n) {
          continue;
        }
        lines.push('## ' + plain(n.title || 'Без названия'));
        lines.push('');
        if (n.tags && Object.prototype.toString.call(n.tags) === '[object Array]' && n.tags.length) {
          lines.push('_Теги: ' + tagsToMd(n.tags) + '_');
          lines.push('');
        }
        lines.push(htmlToMarkdown(n.content || ''));
        lines.push('');
        lines.push('---');
        lines.push('');
      }
      return lines.join('\n');
    },

    /**
     * Экспорт одной заметки.
     * @param {Object} note
     * @returns {string}
     */
    exportNoteMarkdown: function (note) {
      if (!note) {
        return '';
      }
      var u = utils();
      var fmt = u && u.Format ? u.Format : null;
      var lines = [];
      lines.push('# ' + plain(note.title || 'Без названия'));
      lines.push('');
      if (note.tags && Object.prototype.toString.call(note.tags) === '[object Array]' && note.tags.length) {
        lines.push('_Теги: ' + tagsToMd(note.tags) + '_');
        lines.push('');
      }
      lines.push(htmlToMarkdown(note.content || ''));
      return lines.join('\n');
    },

    /**
     * Экспорт портфолио в Markdown.
     * @param {Object} portfolio
     * @returns {string}
     */
    exportPortfolioMarkdown: function (portfolio) {
      if (!portfolio || typeof portfolio !== 'object') {
        return '';
      }
      var lines = [];
      lines.push('# Портфолио тестировщика');
      lines.push('');
      lines.push('## ' + plain(portfolio.title || 'Без названия'));
      lines.push('');
      if (portfolio.summary) {
        lines.push(htmlToMarkdown(portfolio.summary));
        lines.push('');
      }
      if (portfolio.projects && Object.prototype.toString.call(portfolio.projects) === '[object Array]') {
        for (var i = 0; i < portfolio.projects.length; i++) {
          var p = portfolio.projects[i];
          if (!p) {
            continue;
          }
          lines.push('### ' + plain(p.title || 'Проект'));
          lines.push('');
          lines.push(htmlToMarkdown(p.description || ''));
          lines.push('');
        }
      }
      return lines.join('\n');
    },

    /**
     * Презентация портфолио как автономного HTML со встроенными стилями.
     * @param {Object} portfolio
     * @returns {string}
     */
    exportPresentationHTML: function (portfolio) {
      var u = utils();
      var esc = u && u.Escape && typeof u.Escape.html === 'function' ? u.Escape.html : fallbackEscape;
      var title = esc((portfolio && portfolio.title) || 'Портфолио');
      var summary = portfolio && portfolio.summary ? portfolio.summary : '';
      var projects = portfolio && portfolio.projects && Object.prototype.toString.call(portfolio.projects) === '[object Array]' ? portfolio.projects : [];

      var projectHtml = '';
      for (var i = 0; i < projects.length; i++) {
        var p = projects[i];
        if (!p) {
          continue;
        }
        projectHtml += '<section class="slide"><div class="card">';
        projectHtml += '<h2>' + esc(p.title || 'Проект') + '</h2>';
        if (p.description) {
          projectHtml += '<div class="body">' + p.description + '</div>';
        }
        if (p.tags && Object.prototype.toString.call(p.tags) === '[object Array]' && p.tags.length) {
          projectHtml += '<div class="tags">' + tagsPlain(p.tags, esc) + '</div>';
        }
        projectHtml += '</div></section>';
      }

      return '<!doctype html>\n<html lang="ru">\n<head>\n' +
        '<meta charset="utf-8">\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '<title>' + title + '</title>\n' +
        '<style>\n' +
        '* { box-sizing: border-box; margin: 0; padding: 0; }\n' +
        'body { font-family: Georgia, serif; background: #0A1929; color: #F5F0E8; }\n' +
        '.slide { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px; }\n' +
        '.card { background: #0A1929; border: 1px solid #D4AF37; border-radius: 8px; max-width: 860px; width: 100%; padding: 40px; }\n' +
        'h1, h2 { color: #D4AF37; margin-bottom: 16px; }\n' +
        '.body { line-height: 1.7; color: #F5F0E8; }\n' +
        '.body ul, .body ol { padding-left: 24px; }\n' +
        '.body code { background: rgba(212,175,55,0.12); padding: 2px 6px; border-radius: 4px; }\n' +
        '.tags { margin-top: 20px; color: #D4AF37; font-size: 14px; }\n' +
        '@media print { .slide { min-height: auto; page-break-after: always; } }\n' +
        '</style>\n</head>\n<body>\n' +
        '<section class="slide"><div class="card"><h1>' + title + '</h1>' +
        (summary ? '<div class="body">' + summary + '</div>' : '') +
        '</div></section>' +
        projectHtml +
        '\n</body>\n</html>';
    },

    /**
     * Экспорт учебного пакета — делегирует SharingManager.
     * @param {Object} items
     * @param {Object} [options]
     * @returns {boolean}
     */
    exportStudyPackage: function (items, options) {
      var sm = appSharing();
      if (sm && typeof sm.exportPackage === 'function') {
        return sm.exportPackage(items, options);
      }
      toast('Модуль обмена учебным материалом недоступен', 'error');
      return false;
    },

    /**
     * Импорт учебного пакета — делегирует SharingManager.
     * @param {File} file
     * @returns {Promise<Object>}
     */
    importStudyPackage: function (file) {
      var sm = appSharing();
      if (sm && typeof sm.importPackage === 'function') {
        return sm.importPackage(file);
      }
      return Promise.resolve({ ok: false, error: 'Модуль обмена учебным материалом недоступен' });
    }
  };

  /* ======================================================================
   * Вспомогательные функции (не экспортируются)
   * ====================================================================== */

  function fallbackCopy(text) {
    if (!global.document) {
      return false;
    }
    var ta = global.document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    global.document.body.appendChild(ta);
    var ok = false;
    try {
      ta.select();
      ta.setSelectionRange(0, text.length);
      var supported = global.document.execCommand ? global.document.queryCommandSupported('copy') : false;
      if (supported) {
        ok = global.document.execCommand('copy');
      }
    } catch (err) {
      ok = false;
    }
    global.document.body.removeChild(ta);
    // При неудаче на file:// вызывающий слой показывает подсказку
    if (!ok && typeof toast === 'function') {
      toast('Не удалось скопировать автоматически. Скопируйте текст вручную.', 'warn');
    }
    return ok;
  }

  function plain(html) {
    if (!html) {
      return '';
    }
    var u = utils();
    var esc = u && u.Escape && typeof u.Escape.html === 'function' ? u.Escape.html : fallbackEscape;
    var div = global.document.createElement('div');
    div.innerHTML = html;
    return esc(div.textContent || '');
  }

  function tagsToMd(tags) {
    var parts = [];
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i];
      var name = typeof t === 'string' ? t : (t && t.name) || '';
      parts.push('#' + String(name).trim().replace(/\s+/g, '_'));
    }
    return parts.join(' ');
  }

  function tagsPlain(tags, esc) {
    var parts = [];
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i];
      var name = typeof t === 'string' ? t : (t && t.name) || '';
      parts.push('<span>' + esc(name) + '</span>');
    }
    return parts.join(' ');
  }

  function htmlToMarkdown(html) {
    if (!html || !global.document) {
      return '';
    }
    if (typeof global.DOMParser !== 'undefined') {
      try {
        var doc = new global.DOMParser().parseFromString(html, 'text/html');
        return nodeToMarkdown(doc.body);
      } catch (err) {
        return stripTags(html);
      }
    }
    return stripTags(html);
  }

  function nodeToMarkdown(node) {
    if (!node) {
      return '';
    }
    var out = '';
    var child = node.firstChild;
    while (child) {
      if (child.nodeType === 3) {
        out += child.nodeValue || '';
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        var text = nodeToMarkdown(child);
        if (tag === 'h3') {
          out += '\n### ' + text + '\n';
        } else if (tag === 'h4') {
          out += '\n#### ' + text + '\n';
        } else if (tag === 'b' || tag === 'strong') {
          out += '**' + text + '**';
        } else if (tag === 'i' || tag === 'em') {
          out += '_' + text + '_';
        } else if (tag === 'code') {
          out += '`' + text + '`';
        } else if (tag === 'li') {
          out += '- ' + text + '\n';
        } else if (tag === 'p') {
          out += text + '\n\n';
        } else if (tag === 'br') {
          out += '\n';
        } else {
          out += text;
        }
      }
      child = child.nextSibling;
    }
    return out;
  }

  function stripTags(html) {
    if (!global.document) {
      return '';
    }
    var div = global.document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '') + '\n';
  }

  function fallbackEscape(value) {
    if (value === null || typeof value === 'undefined') {
      return '';
    }
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
}(typeof window !== 'undefined' ? window : this));
