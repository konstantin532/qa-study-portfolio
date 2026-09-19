/*
 * QA Study Portfolio — встроенный редактор
 * Зависимости: window.Utils (необязательно, используется для debounce и escape).
 * Публичный интерфейс: window.Editor = { create, getContent, setContent, destroy }
 */
(function (global) {
  'use strict';

  var ALLOWED_TAGS = {
    b: true, i: true, u: true,
    ul: true, ol: true, li: true,
    h3: true, h4: true,
    code: true, br: true, p: true
  };

  var TOOLBAR = [
    { label: 'B', title: 'Жирный', cmd: 'bold', tag: 'b' },
    { label: 'I', title: 'Курсив', cmd: 'italic', tag: 'i' },
    { label: 'U', title: 'Подчеркнутый', cmd: 'underline', tag: 'u' },
    { label: '•', title: 'Маркированный список', cmd: 'insertUnorderedList', tag: 'ul' },
    { label: '1.', title: 'Нумерованный список', cmd: 'insertOrderedList', tag: 'ol' },
    { label: 'H3', title: 'Заголовок 3', cmd: 'formatBlock', arg: '<h3>', tag: 'h3' },
    { label: 'H4', title: 'Заголовок 4', cmd: 'formatBlock', arg: '<h4>', tag: 'h4' },
    { label: '</>', title: 'Код', cmd: null, tag: 'code' }
  ];

  var instances = [];

  function utils() {
    if (typeof global.Utils !== 'undefined' && global.Utils) {
      return global.Utils;
    }
    return null;
  }

  function debounce(fn, ms) {
    var u = utils();
    if (u && u.Data && typeof u.Data.debounce === 'function') {
      return u.Data.debounce(fn, ms);
    }
    var timer = null;
    function debounced() {
      var ctx = this;
      var args = arguments;
      if (timer) {
        global.clearTimeout(timer);
      }
      timer = global.setTimeout(function () {
        timer = null;
        fn.apply(ctx, args);
      }, ms);
    }
    debounced.cancel = function () {
      if (timer) {
        global.clearTimeout(timer);
        timer = null;
      }
    };
    return debounced;
  }

  function findInstance(container) {
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].container === container) {
        return instances[i];
      }
    }
    return null;
  }

  function isEmptyHtml(value) {
    if (!value) {
      return true;
    }
    var text = String(value).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return text.length === 0;
  }

  function sanitize(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }
    if (!global.document) {
      return '';
    }
    var wrapper = global.document.createElement('div');
    wrapper.innerHTML = html;
    walk(wrapper);
    return wrapper.innerHTML;
  }

  function walk(node) {
    var child = node.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (child.nodeType === 3) {
        // текстовый узел без изменений
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS[tag]) {
          // Запрещенный тег разворачиваем в его содержимое
          while (child.firstChild) {
            node.insertBefore(child.firstChild, child);
          }
          node.removeChild(child);
        } else {
          // Разрешенный тег — снимаем все атрибуты
          while (child.attributes.length > 0) {
            child.removeAttribute(child.attributes[0].name);
          }
          walk(child);
        }
      } else {
        node.removeChild(child);
      }
      child = next;
    }
  }

  function execSupported(cmd) {
    try {
      if (typeof global.document.queryCommandSupported === 'function') {
        return global.document.queryCommandSupported(cmd);
      }
    } catch (err) {
      return false;
    }
    return true;
  }

  function fallbackSurround(tag) {
    var sel = global.getSelection ? global.getSelection() : null;
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      return false;
    }
    try {
      var range = sel.getRangeAt(0);
      var el = global.document.createElement(tag);
      range.surroundContents(el);
      sel.removeAllRanges();
      var after = global.document.createRange();
      after.selectNodeContents(el);
      after.collapse(false);
      sel.addRange(after);
      return true;
    } catch (err) {
      return false;
    }
  }

  function applyCommand(cmd, arg, fallbackTag) {
    if (cmd && execSupported(cmd)) {
      try {
        if (typeof arg !== 'undefined' && arg !== null) {
          global.document.execCommand(cmd, false, arg);
        } else {
          global.document.execCommand(cmd, false, null);
        }
        return true;
      } catch (err) {
        return fallbackTag ? fallbackSurround(fallbackTag) : false;
      }
    }
    return fallbackTag ? fallbackSurround(fallbackTag) : false;
  }

  function updatePlaceholder(inst) {
    if (!inst || !inst.editable) {
      return;
    }
    var empty = isEmptyHtml(inst.editable.innerHTML);
    if (empty) {
      inst.editable.classList.add('editor-empty');
    } else {
      inst.editable.classList.remove('editor-empty');
    }
  }

  function createToolbar(inst) {
    var bar = global.document.createElement('div');
    bar.className = 'editor-toolbar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Форматирование');

    for (var i = 0; i < TOOLBAR.length; i++) {
      (function (item) {
        var btn = global.document.createElement('button');
        btn.type = 'button';
        btn.className = 'editor-btn editor-btn-' + item.tag;
        btn.textContent = item.label;
        btn.title = item.title;
        btn.setAttribute('aria-label', item.title);
        btn.addEventListener('mousedown', function (e) {
          e.preventDefault();
        });
        btn.addEventListener('click', function () {
          inst.editable.focus();
          if (item.tag === 'code') {
            if (!applyCommand(null, null, 'code')) {
              // Нет выделения — вставляем пустой фрагмент кода
              try {
                global.document.execCommand('insertHTML', false, '<code>код</code>');
              } catch (err2) {}
            }
          } else if (item.cmd === 'formatBlock') {
            // formatBlock требует особого аргумента
            if (!applyCommand(item.cmd, item.arg, item.tag)) {
              fallbackSurround(item.tag);
            }
          } else {
            applyCommand(item.cmd, null, item.tag);
          }
          updatePlaceholder(inst);
          if (inst.debouncedChange) {
            inst.debouncedChange();
          }
        });
        bar.appendChild(btn);
      }(TOOLBAR[i]));
    }
    return bar;
  }

  /**
   * Создает редактор внутри контейнера.
   * @param {Element} container
   * @param {Object} [options] { value, maxLength, placeholder, onChange }
   * @returns {Object|null} дескриптор { container, editable, toolbar }
   */
  function create(container, options) {
    if (!container || !global.document || typeof container.appendChild !== 'function') {
      return null;
    }
    var opts = options && typeof options === 'object' ? options : {};
    var prev = findInstance(container);
    if (prev) {
      destroy(container);
    }

    var maxLen = typeof opts.maxLength === 'number' ? opts.maxLength : 20000;
    var placeholder = typeof opts.placeholder === 'string' ? opts.placeholder : '';
    var initial = typeof opts.value === 'string' ? opts.value : '';

    // Очищаем контейнер
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.classList.add('editor-host');

    var inst = {
      container: container,
      maxLength: maxLen,
      onChange: typeof opts.onChange === 'function' ? opts.onChange : null,
      debouncedChange: null,
      handleInput: null,
      handleKeydown: null,
      editable: null,
      toolbar: null
    };

    var debounced = null;
    if (inst.onChange) {
      debounced = debounce(function () {
        var html = getContent(container);
        inst.onChange(html);
      }, 300);
      inst.debouncedChange = debounced;
    }

    var toolbar = createToolbar(inst);
    inst.toolbar = toolbar;
    container.appendChild(toolbar);

    var editable = global.document.createElement('div');
    editable.className = 'editor-content';
    editable.contentEditable = 'true';
    editable.setAttribute('role', 'textbox');
    editable.setAttribute('aria-multiline', 'true');
    editable.setAttribute('aria-label', placeholder || 'Редактор');
    if (placeholder) {
      editable.setAttribute('data-placeholder', placeholder);
    }
    editable.innerHTML = sanitize(initial);
    container.appendChild(editable);
    inst.editable = editable;

    function handleInput() {
      // Ограничение длины по тексту
      if (maxLen > 0) {
        var textLen = (editable.textContent || '').length;
        if (textLen > maxLen) {
          // Обрезаем отображение до санитизированного содержимого
          var sanitized = sanitize(editable.innerHTML);
          // Грубая обрезка по тексту — сохраняем разметку через санитайзер
          var tmp = global.document.createElement('div');
          tmp.innerHTML = sanitized;
          var txt = tmp.textContent || '';
          if (txt.length > maxLen) {
            // Восстанавливаем предыдущее содержимое без последнего ввода
            editable.textContent = txt.slice(0, maxLen);
            // Курсор в конец
            try {
              var range = global.document.createRange();
              range.selectNodeContents(editable);
              range.collapse(false);
              var sel = global.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
              }
            } catch (err) {}
          }
        }
      }
      updatePlaceholder(inst);
      if (inst.debouncedChange) {
        inst.debouncedChange();
      }
    }

    function handleKeydown(e) {
      // Разрешаем стандартные сочетания, остальное пропускаем
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i' || e.key === 'u')) {
        // Позволяем браузеру обработать, затем синхронизируем
        global.setTimeout(function () {
          updatePlaceholder(inst);
          if (inst.debouncedChange) {
            inst.debouncedChange();
          }
        }, 0);
      }
    }

    inst.handleInput = handleInput;
    inst.handleKeydown = handleKeydown;

    editable.addEventListener('input', handleInput);
    editable.addEventListener('keydown', handleKeydown);
    editable.addEventListener('keyup', updatePlaceholder);
    editable.addEventListener('paste', function () {
      global.setTimeout(function () {
        editable.innerHTML = sanitize(editable.innerHTML);
        updatePlaceholder(inst);
        if (inst.debouncedChange) {
          inst.debouncedChange();
        }
      }, 0);
    });

    updatePlaceholder(inst);
    instances.push(inst);
    return { container: container, editable: editable, toolbar: toolbar };
  }

  /**
   * Возвращает санитизированное содержимое редактора.
   * @param {Element} container
   * @returns {string}
   */
  function getContent(container) {
    var inst = findInstance(container);
    var source = inst ? inst.editable : container;
    if (!source) {
      return '';
    }
    // Если передан сам редактируемый элемент
    var html = typeof source.innerHTML === 'string' ? source.innerHTML : '';
    return sanitize(html);
  }

  /**
   * Устанавливает содержимое с санитизацией.
   * @param {Element} container
   * @param {string} html
   * @returns {boolean}
   */
  function setContent(container, html) {
    var inst = findInstance(container);
    var target = inst ? inst.editable : null;
    if (!target) {
      return false;
    }
    target.innerHTML = sanitize(typeof html === 'string' ? html : '');
    updatePlaceholder(inst);
    return true;
  }

  /**
   * Снимает слушатели и разбирает редактор.
   * @param {Element} container
   * @returns {boolean}
   */
  function destroy(container) {
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].container === container) {
        var inst = instances[i];
        if (inst.debouncedChange && typeof inst.debouncedChange.cancel === 'function') {
          inst.debouncedChange.cancel();
        }
        if (inst.editable) {
          inst.editable.removeEventListener('input', inst.handleInput);
          inst.editable.removeEventListener('keydown', inst.handleKeydown);
          inst.editable.removeEventListener('keyup', updatePlaceholder);
        }
        instances.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  global.Editor = {
    create: create,
    getContent: getContent,
    setContent: setContent,
    destroy: destroy
  };
}(typeof window !== 'undefined' ? window : this));
