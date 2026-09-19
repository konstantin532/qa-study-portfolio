/*
 * QA Study Portfolio — общие утилиты
 * Подключается классическим тегом script вторым, сразу после course-data.js.
 * Публичный интерфейс: window.Utils = { Storage, Validate, Format, Data, DOM, Escape, Tags, Categories }
 *
 * Зависимости: нет обязательных.
 * Необязательные (проверяются через typeof в момент вызова):
 *   window.App.TagsManager        — для Utils.Tags
 *   window.App.CategoriesManager  — для Utils.Categories
 *
 * Файл не обращается к сети и не использует eval / new Function.
 */
(function (global) {
  'use strict';

  /* ==========================================================================
   * Константы палитры Art Deco Luxury
   * ========================================================================== */

  var GOLD = '#D4AF37';
  var NAVY = '#0A1929';
  var CREAM = '#F5F0E8';

  /* Десять оттенков для тегов. Индекс берется по модулю 10. */
  var TAG_COLORS = [
    '#D4AF37', // золото
    '#B8860B', // темное золото
    '#8B7355', // бронза
    '#C9A961', // светлое золото
    '#7D6B4F', // оливковая бронза
    '#A67C52', // медь
    '#6B5B95', // сливовый акцент
    '#4A6741', // темная зелень
    '#8C5A3C', // терракота
    '#5D7B8A'  // приглушенный navy
  ];

  /* Границы валидации. Совпадают с порогами частей 3 и 4. */
  var LIMITS = {
    TAG_MAX_LENGTH: 30,
    TAG_MAX_COUNT: 10,
    NAME_MAX: 60,
    TITLE_MAX: 200,
    CONTENT_MAX: 20000,
    DATE_MIN: '2020-01-01'
  };

  /* Русские названия месяцев не требуются: формат везде числовой ДД.ММ.ГГГГ. */

  /* ==========================================================================
   * Utils.Escape — единственное место экранирования в приложении
   * ========================================================================== */

  var ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  var ESCAPE_RE = /[&<>"']/g;

  var Escape = {
    /**
     * Экранирует строку для безопасной вставки в разметку.
     * Любой не-строковый ввод приводится к строке, null и undefined дают ''.
     * @param {*} str
     * @returns {string}
     */
    html: function (str) {
      if (str === null || typeof str === 'undefined') {
        return '';
      }
      return String(str).replace(ESCAPE_RE, function (ch) {
        return ESCAPE_MAP[ch];
      });
    },

    /**
     * Алиас html для случаев, когда по смыслу экранируется текст.
     * @param {*} str
     * @returns {string}
     */
    text: function (str) {
      return Escape.html(str);
    }
  };

  /* ==========================================================================
   * Utils.Storage — тонкая обертка над localStorage ТОЛЬКО для fallback
   *
   * Правила использования:
   *   - данные приложения читаются и пишутся исключительно через window.IDB;
   *   - этот модуль допустим внутри idb.js как аварийный путь
   *     и для UI-флагов 'qa-debug', 'qa-table-hint-seen', черновиков форм;
   *   - ни один render и ни один менеджер не вызывает Storage для данных.
   *
   * Все операции безопасны: недоступность хранилища и битый JSON
   * не приводят к исключению, вызывающий код получает fallback.
   * ========================================================================== */

  var memoryStore = {};
  var storageAvailable = null;

  function detectStorage() {
    if (storageAvailable !== null) {
      return storageAvailable;
    }
    try {
      var probeKey = '__qa_probe__';
      global.localStorage.setItem(probeKey, '1');
      global.localStorage.removeItem(probeKey);
      storageAvailable = true;
    } catch (err) {
      storageAvailable = false;
    }
    return storageAvailable;
  }

  var Storage = {
    /**
     * Читает значение по ключу и разбирает JSON.
     * @param {string} key
     * @param {*} [fallback=null] возвращается при отсутствии ключа или битом JSON
     * @returns {*}
     */
    get: function (key, fallback) {
      var def = typeof fallback === 'undefined' ? null : fallback;
      if (typeof key !== 'string' || !key) {
        return def;
      }
      var raw;
      try {
        raw = detectStorage() ? global.localStorage.getItem(key) : memoryStore[key];
      } catch (err) {
        raw = memoryStore[key];
      }
      if (raw === null || typeof raw === 'undefined') {
        return def;
      }
      try {
        return JSON.parse(raw);
      } catch (err) {
        return def;
      }
    },

    /**
     * Сохраняет значение в виде JSON.
     * @param {string} key
     * @param {*} value
     * @returns {boolean} true при успешной записи
     */
    set: function (key, value) {
      if (typeof key !== 'string' || !key) {
        return false;
      }
      var raw;
      try {
        raw = JSON.stringify(value);
      } catch (err) {
        return false;
      }
      try {
        if (detectStorage()) {
          global.localStorage.setItem(key, raw);
        } else {
          memoryStore[key] = raw;
        }
        return true;
      } catch (err) {
        memoryStore[key] = raw;
        return false;
      }
    },

    /**
     * Удаляет ключ.
     * @param {string} key
     * @returns {boolean}
     */
    remove: function (key) {
      if (typeof key !== 'string' || !key) {
        return false;
      }
      try {
        if (detectStorage()) {
          global.localStorage.removeItem(key);
        }
      } catch (err) {
        /* хранилище недоступно, достаточно очистить память */
      }
      delete memoryStore[key];
      return true;
    },

    /**
     * Полностью очищает хранилище приложения.
     * @returns {boolean}
     */
    clear: function () {
      try {
        if (detectStorage()) {
          global.localStorage.clear();
        }
      } catch (err) {
        /* игнорируем, память очищаем ниже */
      }
      memoryStore = {};
      return true;
    }
  };

  /* ==========================================================================
   * Utils.Validate — пороги совпадают с частями 3 и 4
   * Каждый метод возвращает boolean и не бросает исключений.
   * ========================================================================== */

  var EMAIL_RE = /^\S+@\S+\.\S+$/;
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var RU_DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

  function asString(v) {
    if (v === null || typeof v === 'undefined') {
      return '';
    }
    return String(v);
  }

  function todayISO() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1);
    var d = String(now.getDate());
    if (m.length === 1) { m = '0' + m; }
    if (d.length === 1) { d = '0' + d; }
    return y + '-' + m + '-' + d;
  }

  var Validate = {
    /**
     * Значение заполнено: непустая строка после обрезки пробелов,
     * число, true или непустой массив.
     */
    required: function (v) {
      if (v === null || typeof v === 'undefined') {
        return false;
      }
      if (typeof v === 'string') {
        return v.trim().length > 0;
      }
      if (typeof v === 'number') {
        return !isNaN(v);
      }
      if (typeof v === 'boolean') {
        return v === true;
      }
      if (Object.prototype.toString.call(v) === '[object Array]') {
        return v.length > 0;
      }
      return true;
    },

    /** Длина не меньше n символов после обрезки пробелов. */
    minLength: function (v, n) {
      var limit = typeof n === 'number' ? n : 0;
      return asString(v).trim().length >= limit;
    },

    /** Длина не больше n символов после обрезки пробелов. */
    maxLength: function (v, n) {
      var limit = typeof n === 'number' ? n : Infinity;
      return asString(v).trim().length <= limit;
    },

    /** Базовая проверка адреса почты. */
    email: function (v) {
      return EMAIL_RE.test(asString(v).trim());
    },

    /**
     * Шаги тест-кейса заполнены: массив, есть хотя бы один шаг,
     * и каждый шаг содержит непустой текст.
     */
    stepsNotEmpty: function (steps) {
      if (Object.prototype.toString.call(steps) !== '[object Array]') {
        return false;
      }
      if (steps.length === 0) {
        return false;
      }
      for (var i = 0; i < steps.length; i++) {
        var step = steps[i];
        var textValue;
        if (typeof step === 'string') {
          textValue = step;
        } else if (step && typeof step === 'object') {
          textValue = step.text || step.action || step.value || '';
        } else {
          textValue = '';
        }
        if (asString(textValue).trim().length === 0) {
          return false;
        }
      }
      return true;
    },

    /**
     * Набор тегов корректен: массив не длиннее 10, каждый тег
     * непустая строка не длиннее 30 символов.
     */
    tagsValid: function (tags) {
      if (Object.prototype.toString.call(tags) !== '[object Array]') {
        return false;
      }
      if (tags.length > LIMITS.TAG_MAX_COUNT) {
        return false;
      }
      for (var i = 0; i < tags.length; i++) {
        var raw = tags[i];
        var name = typeof raw === 'string' ? raw : (raw && raw.name) || '';
        var trimmed = asString(name).trim();
        if (trimmed.length === 0 || trimmed.length > LIMITS.TAG_MAX_LENGTH) {
          return false;
        }
      }
      return true;
    },

    /**
     * Дата в формате ISO лежит в диапазоне от 2020-01-01 до сегодняшнего дня.
     */
    dateValid: function (iso) {
      var value = asString(iso).trim();
      if (!ISO_DATE_RE.test(value)) {
        return false;
      }
      var parts = value.split('-');
      var year = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10);
      var day = parseInt(parts[2], 10);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
      }
      var probe = new Date(year, month - 1, day);
      if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
        return false;
      }
      return value >= LIMITS.DATE_MIN && value <= todayISO();
    },

    /** Имя: заполнено и не длиннее max символов. */
    nameValid: function (v, max) {
      var limit = typeof max === 'number' ? max : LIMITS.NAME_MAX;
      return Validate.required(v) && Validate.maxLength(v, limit);
    },

    /** Заголовок: заполнен и не длиннее max символов. */
    titleValid: function (v, max) {
      var limit = typeof max === 'number' ? max : LIMITS.TITLE_MAX;
      return Validate.required(v) && Validate.maxLength(v, limit);
    },

    /** Содержимое: допускает пустое значение, ограничено сверху. */
    contentValid: function (v, max) {
      var limit = typeof max === 'number' ? max : LIMITS.CONTENT_MAX;
      return Validate.maxLength(v, limit);
    }
  };

  /* ==========================================================================
   * Utils.Format — вывод дат, длительностей и склонений
   * ========================================================================== */

  function pad2(n) {
    var s = String(n);
    return s.length === 1 ? '0' + s : s;
  }

  function parseDate(iso) {
    if (!iso) {
      return null;
    }
    if (Object.prototype.toString.call(iso) === '[object Date]') {
      return isNaN(iso.getTime()) ? null : iso;
    }
    var value = asString(iso).trim();
    if (!value) {
      return null;
    }
    var ruMatch = value.match(RU_DATE_RE);
    if (ruMatch) {
      var built = new Date(
        parseInt(ruMatch[3], 10),
        parseInt(ruMatch[2], 10) - 1,
        parseInt(ruMatch[1], 10)
      );
      return isNaN(built.getTime()) ? null : built;
    }
    var parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  var Format = {
    /**
     * ISO-дата в формат ДД.ММ.ГГГГ. При некорректном вводе возвращает ''.
     */
    formatDate: function (iso) {
      var d = parseDate(iso);
      if (!d) {
        return '';
      }
      return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear();
    },

    /**
     * ISO-дата со временем в формат ДД.ММ.ГГГГ ЧЧ:ММ.
     */
    formatDateTime: function (iso) {
      var d = parseDate(iso);
      if (!d) {
        return '';
      }
      return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear() +
        ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    },

    /**
     * Минуты в читаемую длительность.
     * 0 -> '0 минут', 45 -> '45 минут', 60 -> '1 час', 75 -> '1 час 15 минут'.
     */
    formatDuration: function (min) {
      var total = typeof min === 'number' && !isNaN(min) ? Math.floor(min) : 0;
      if (total < 0) {
        total = 0;
      }
      if (total === 0) {
        return '0 ' + Format.pluralize(0, ['минута', 'минуты', 'минут']);
      }
      var hours = Math.floor(total / 60);
      var minutes = total % 60;
      if (hours === 0) {
        return minutes + ' ' + Format.pluralize(minutes, ['минута', 'минуты', 'минут']);
      }
      var hoursPart = hours + ' ' + Format.pluralize(hours, ['час', 'часа', 'часов']);
      if (minutes === 0) {
        return hoursPart;
      }
      return hoursPart + ' ' + minutes + ' ' + Format.pluralize(minutes, ['минута', 'минуты', 'минут']);
    },

    /**
     * Относительная дата: сегодня, вчера, N дней назад,
     * начиная с семи дней — абсолютная дата ДД.ММ.ГГГГ.
     */
    formatRelative: function (iso) {
      var d = parseDate(iso);
      if (!d) {
        return '';
      }
      var target = startOfDay(d);
      var today = startOfDay(new Date());
      var diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
      if (diffDays < 0) {
        return Format.formatDate(d);
      }
      if (diffDays === 0) {
        return 'сегодня';
      }
      if (diffDays === 1) {
        return 'вчера';
      }
      if (diffDays < 7) {
        return diffDays + ' ' + Format.pluralize(diffDays, ['день', 'дня', 'дней']) + ' назад';
      }
      return Format.formatDate(d);
    },

    /**
     * Склонение существительного по числу.
     * @param {number} n
     * @param {Array.<string>} forms [одна, две, пять]
     * @returns {string}
     */
    pluralize: function (n, forms) {
      if (Object.prototype.toString.call(forms) !== '[object Array]' || forms.length < 3) {
        return '';
      }
      var num = typeof n === 'number' && !isNaN(n) ? Math.abs(Math.floor(n)) : 0;
      var mod100 = num % 100;
      var mod10 = num % 10;
      if (mod100 >= 11 && mod100 <= 14) {
        return forms[2];
      }
      if (mod10 === 1) {
        return forms[0];
      }
      if (mod10 >= 2 && mod10 <= 4) {
        return forms[1];
      }
      return forms[2];
    },

    /**
     * Приводит 'ДД.ММ.ГГГГ' к ISO 'ГГГГ-ММ-ДД'.
     * Уже корректная ISO-строка возвращается без изменений, мусор дает ''.
     */
    normalizeDate: function (value) {
      var raw = asString(value).trim();
      if (!raw) {
        return '';
      }
      if (ISO_DATE_RE.test(raw)) {
        return raw;
      }
      var m = raw.match(RU_DATE_RE);
      if (!m) {
        var fallback = parseDate(raw);
        if (!fallback) {
          return '';
        }
        return fallback.getFullYear() + '-' + pad2(fallback.getMonth() + 1) + '-' + pad2(fallback.getDate());
      }
      return m[3] + '-' + m[2] + '-' + m[1];
    }
  };

  /* ==========================================================================
   * Utils.Data — идентификаторы, отложенные вызовы, копирование
   * ========================================================================== */

  var Data = {
    /**
     * Генерирует идентификатор вида id-<база36 времени>-<5 случайных символов>.
     * @returns {string}
     */
    generateId: function () {
      return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    },

    /**
     * Откладывает вызов до паузы в ms миллисекунд.
     * У результата есть метод cancel для снятия ожидающего вызова.
     * @param {Function} fn
     * @param {number} ms
     * @returns {Function}
     */
    debounce: function (fn, ms) {
      var delay = typeof ms === 'number' ? ms : 300;
      var timer = null;
      function debounced() {
        var ctx = this;
        var args = arguments;
        if (timer) {
          global.clearTimeout(timer);
        }
        timer = global.setTimeout(function () {
          timer = null;
          if (typeof fn === 'function') {
            fn.apply(ctx, args);
          }
        }, delay);
      }
      debounced.cancel = function () {
        if (timer) {
          global.clearTimeout(timer);
          timer = null;
        }
      };
      return debounced;
    },

    /**
     * Ограничивает частоту вызовов до одного раза в ms миллисекунд.
     * @param {Function} fn
     * @param {number} ms
     * @returns {Function}
     */
    throttle: function (fn, ms) {
      var interval = typeof ms === 'number' ? ms : 300;
      var last = 0;
      var timer = null;
      var pendingArgs = null;
      var pendingCtx = null;
      function invoke(ctx, args) {
        last = Date.now();
        if (typeof fn === 'function') {
          fn.apply(ctx, args);
        }
      }
      function throttled() {
        var now = Date.now();
        var remaining = interval - (now - last);
        pendingCtx = this;
        pendingArgs = arguments;
        if (remaining <= 0) {
          if (timer) {
            global.clearTimeout(timer);
            timer = null;
          }
          invoke(pendingCtx, pendingArgs);
          pendingArgs = null;
          pendingCtx = null;
          return;
        }
        if (!timer) {
          timer = global.setTimeout(function () {
            timer = null;
            if (pendingArgs) {
              invoke(pendingCtx, pendingArgs);
              pendingArgs = null;
              pendingCtx = null;
            }
          }, remaining);
        }
      }
      throttled.cancel = function () {
        if (timer) {
          global.clearTimeout(timer);
          timer = null;
        }
        pendingArgs = null;
        pendingCtx = null;
      };
      return throttled;
    },

    /**
     * Глубокая копия через structuredClone, при недоступности — через JSON.
     * Непригодные к копированию значения возвращаются как есть.
     * @param {*} obj
     * @returns {*}
     */
    clone: function (obj) {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      if (typeof global.structuredClone === 'function') {
        try {
          return global.structuredClone(obj);
        } catch (err) {
          /* переходим к резервному пути */
        }
      }
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (err) {
        return obj;
      }
    },

    /**
     * Поверхностное слияние: свойства source перекрывают target.
     * Возвращает новый объект, исходные не изменяются.
     * @param {Object} target
     * @param {Object} source
     * @returns {Object}
     */
    merge: function (target, source) {
      var result = {};
      var key;
      if (target && typeof target === 'object') {
        for (key in target) {
          if (Object.prototype.hasOwnProperty.call(target, key)) {
            result[key] = target[key];
          }
        }
      }
      if (source && typeof source === 'object') {
        for (key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            result[key] = source[key];
          }
        }
      }
      return result;
    }
  };

  /* ==========================================================================
   * Utils.DOM — поиск, создание и привязка обработчиков
   * ========================================================================== */

  var DOM = {
    /**
     * Первый элемент по селектору.
     * @param {string} sel
     * @param {Element|Document} [parent=document]
     * @returns {Element|null}
     */
    $: function (sel, parent) {
      var root = parent || global.document;
      if (!root || typeof root.querySelector !== 'function' || typeof sel !== 'string') {
        return null;
      }
      try {
        return root.querySelector(sel);
      } catch (err) {
        return null;
      }
    },

    /**
     * Все элементы по селектору в виде массива.
     * @param {string} sel
     * @param {Element|Document} [parent=document]
     * @returns {Array.<Element>}
     */
    $$: function (sel, parent) {
      var root = parent || global.document;
      if (!root || typeof root.querySelectorAll !== 'function' || typeof sel !== 'string') {
        return [];
      }
      try {
        return Array.prototype.slice.call(root.querySelectorAll(sel));
      } catch (err) {
        return [];
      }
    },

    /**
     * Создает элемент.
     * props: { className, id, text, html, trustedHtml, attrs, dataset, on }
     *   text        — безопасная установка через textContent;
     *   html        — строка экранируется через Utils.Escape.html;
     *   trustedHtml — вставка без экранирования, допустима только для
     *                 разметки, уже прошедшей санитайзер Editor.getContent.
     * children: строка, узел или массив из них.
     * @param {string} tag
     * @param {Object} [props]
     * @param {*} [children]
     * @returns {Element|null}
     */
    create: function (tag, props, children) {
      if (typeof tag !== 'string' || !tag || !global.document) {
        return null;
      }
      var el;
      try {
        el = global.document.createElement(tag);
      } catch (err) {
        return null;
      }
      var p = props && typeof props === 'object' ? props : {};
      var key;

      if (typeof p.className === 'string' && p.className) {
        el.className = p.className;
      }
      if (typeof p.id === 'string' && p.id) {
        el.id = p.id;
      }
      if (typeof p.text !== 'undefined' && p.text !== null) {
        el.textContent = asString(p.text);
      }
      if (typeof p.html !== 'undefined' && p.html !== null) {
        el.innerHTML = Escape.html(p.html);
      }
      if (typeof p.trustedHtml === 'string') {
        el.innerHTML = p.trustedHtml;
      }
      if (p.attrs && typeof p.attrs === 'object') {
        for (key in p.attrs) {
          if (Object.prototype.hasOwnProperty.call(p.attrs, key)) {
            var attrValue = p.attrs[key];
            if (attrValue === false || attrValue === null || typeof attrValue === 'undefined') {
              continue;
            }
            try {
              el.setAttribute(key, attrValue === true ? '' : asString(attrValue));
            } catch (err) {
              /* некорректное имя атрибута пропускаем */
            }
          }
        }
      }
      if (p.dataset && typeof p.dataset === 'object' && el.dataset) {
        for (key in p.dataset) {
          if (Object.prototype.hasOwnProperty.call(p.dataset, key)) {
            el.dataset[key] = asString(p.dataset[key]);
          }
        }
      }
      if (p.on && typeof p.on === 'object') {
        for (key in p.on) {
          if (Object.prototype.hasOwnProperty.call(p.on, key) && typeof p.on[key] === 'function') {
            DOM.on(el, key, p.on[key]);
          }
        }
      }

      if (typeof children !== 'undefined' && children !== null) {
        var list = Object.prototype.toString.call(children) === '[object Array]' ? children : [children];
        for (var i = 0; i < list.length; i++) {
          var child = list[i];
          if (child === null || typeof child === 'undefined' || child === false) {
            continue;
          }
          if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(global.document.createTextNode(asString(child)));
          } else if (child.nodeType) {
            el.appendChild(child);
          }
        }
      }
      return el;
    },

    /**
     * Подписка на событие. Возвращает функцию снятия подписки.
     * @param {EventTarget} el
     * @param {string} event
     * @param {Function} handler
     * @param {Object|boolean} [opts]
     * @returns {Function}
     */
    on: function (el, event, handler, opts) {
      if (!el || typeof el.addEventListener !== 'function') {
        return function () {};
      }
      if (typeof event !== 'string' || typeof handler !== 'function') {
        return function () {};
      }
      el.addEventListener(event, handler, opts);
      return function () {
        DOM.off(el, event, handler, opts);
      };
    },

    /**
     * Снятие подписки на событие.
     */
    off: function (el, event, handler, opts) {
      if (!el || typeof el.removeEventListener !== 'function') {
        return false;
      }
      if (typeof event !== 'string' || typeof handler !== 'function') {
        return false;
      }
      el.removeEventListener(event, handler, opts);
      return true;
    },

    /**
     * Удаляет всех потомков элемента.
     * @param {Element} el
     * @returns {Element|null}
     */
    empty: function (el) {
      if (!el || typeof el.removeChild !== 'function') {
        return null;
      }
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
      return el;
    }
  };

  /* ==========================================================================
   * Utils.Tags — делегирует App.TagsManager, при его отсутствии работает локально
   * ========================================================================== */

  function tagsManager() {
    if (global.App && global.App.TagsManager && typeof global.App.TagsManager === 'object') {
      return global.App.TagsManager;
    }
    return null;
  }

  var Tags = {
    /**
     * Приводит имя тега к каноническому виду.
     * Делегирует App.TagsManager.normalize, иначе нормализует локально:
     * обрезка, сжатие пробелов, нижний регистр, удаление посторонних символов.
     * @param {string} name
     * @returns {string}
     */
    normalize: function (name) {
      var mgr = tagsManager();
      if (mgr && typeof mgr.normalize === 'function') {
        try {
          return asString(mgr.normalize(name));
        } catch (err) {
          /* переходим к локальной логике */
        }
      }
      return asString(name)
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/[^a-zа-яё0-9 _-]/g, '');
    },

    /**
     * Тег корректен: после нормализации длина от 1 до 30 символов.
     * @param {string} name
     * @returns {boolean}
     */
    isValid: function (name) {
      var mgr = tagsManager();
      if (mgr && typeof mgr.isValid === 'function') {
        try {
          return mgr.isValid(name) === true;
        } catch (err) {
          /* переходим к локальной логике */
        }
      }
      var normalized = Tags.normalize(name);
      return normalized.length >= 1 && normalized.length <= LIMITS.TAG_MAX_LENGTH;
    },

    /**
     * Цвет тега по его порядковому номеру.
     * @param {number} index
     * @returns {string} шестнадцатеричный цвет
     */
    assignColor: function (index) {
      var mgr = tagsManager();
      if (mgr && typeof mgr.assignColor === 'function') {
        try {
          var delegated = mgr.assignColor(index);
          if (typeof delegated === 'string' && delegated) {
            return delegated;
          }
        } catch (err) {
          /* переходим к локальной логике */
        }
      }
      if (typeof index !== 'number' || isNaN(index)) {
        return GOLD;
      }
      var i = Math.abs(Math.floor(index)) % TAG_COLORS.length;
      return TAG_COLORS[i] || GOLD;
    },

    /**
     * Убирает дубликаты и некорректные теги, сохраняя порядок первого вхождения.
     * @param {Array} list массив строк или объектов с полем name
     * @returns {Array.<string>} нормализованные уникальные имена
     */
    deduplicate: function (list) {
      var mgr = tagsManager();
      if (mgr && typeof mgr.deduplicate === 'function') {
        try {
          var delegated = mgr.deduplicate(list);
          if (Object.prototype.toString.call(delegated) === '[object Array]') {
            return delegated;
          }
        } catch (err) {
          /* переходим к локальной логике */
        }
      }
      if (Object.prototype.toString.call(list) !== '[object Array]') {
        return [];
      }
      var seen = {};
      var result = [];
      for (var i = 0; i < list.length; i++) {
        var raw = list[i];
        var name = typeof raw === 'string' ? raw : (raw && raw.name) || '';
        var normalized = Tags.normalize(name);
        if (!normalized || normalized.length > LIMITS.TAG_MAX_LENGTH) {
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(seen, normalized)) {
          continue;
        }
        seen[normalized] = true;
        result.push(normalized);
      }
      return result;
    },

    /** Доступная палитра цветов тегов. */
    COLORS: TAG_COLORS
  };

  /* ==========================================================================
   * Utils.Categories — делегирует App.CategoriesManager, иначе локальная логика
   * Плоская запись: { id, name, parentId }
   * Узел дерева: { id, name, parentId, children: [] }
   * ========================================================================== */

  function categoriesManager() {
    if (global.App && global.App.CategoriesManager && typeof global.App.CategoriesManager === 'object') {
      return global.App.CategoriesManager;
    }
    return null;
  }

  var Categories = {
    /**
     * Строит дерево из плоского списка по полю parentId.
     * Записи с неизвестным родителем поднимаются в корень,
     * циклические ссылки отбрасываются.
     * @param {Array.<Object>} flat
     * @returns {Array.<Object>}
     */
    buildTree: function (flat) {
      var mgr = categoriesManager();
      if (mgr && typeof mgr.buildTree === 'function') {
        try {
          var delegated = mgr.buildTree(flat);
          if (Object.prototype.toString.call(delegated) === '[object Array]') {
            return delegated;
          }
        } catch (err) {
          /* переходим к локальной логике */
        }
      }
      if (Object.prototype.toString.call(flat) !== '[object Array]') {
        return [];
      }
      var byId = {};
      var i;
      for (i = 0; i < flat.length; i++) {
        var item = flat[i];
        if (!item || typeof item !== 'object' || !item.id) {
          continue;
        }
        byId[item.id] = Data.merge(item, { children: [] });
      }
      var roots = [];
      for (i = 0; i < flat.length; i++) {
        var src = flat[i];
        if (!src || !src.id || !byId[src.id]) {
          continue;
        }
        var node = byId[src.id];
        var parentId = src.parentId || src.parent || null;
        if (parentId && byId[parentId] && parentId !== src.id) {
          byId[parentId].children.push(node);
        } else {
          roots.push(node);
        }
      }
      return roots;
    },

    /**
     * Разворачивает дерево в плоский список с полем depth.
     * @param {Array.<Object>} tree
     * @param {number} [depth=0]
     * @returns {Array.<Object>}
     */
    flatten: function (tree, depth) {
      var mgr = categoriesManager();
      if (mgr && typeof mgr.flatten === 'function' && typeof depth === 'undefined') {
        try {
          var delegated = mgr.flatten(tree);
          if (Object.prototype.toString.call(delegated) === '[object Array]') {
            return delegated;
          }
        } catch (err) {
          /* переходим к локальной логике */
        }
      }
      var level = typeof depth === 'number' ? depth : 0;
      var result = [];
      if (Object.prototype.toString.call(tree) !== '[object Array]') {
        return result;
      }
      for (var i = 0; i < tree.length; i++) {
        var node = tree[i];
        if (!node || typeof node !== 'object') {
          continue;
        }
        result.push(Data.merge(node, { depth: level }));
        if (Object.prototype.toString.call(node.children) === '[object Array]' && node.children.length) {
          result = result.concat(Categories.flatten(node.children, level + 1));
        }
      }
      return result;
    },

    /**
     * Ищет узел по идентификатору в дереве любой глубины.
     * @param {Array.<Object>} tree
     * @param {string} id
     * @returns {Object|null}
     */
    findInTree: function (tree, id) {
      var mgr = categoriesManager();
      if (mgr && typeof mgr.findInTree === 'function') {
        try {
          return mgr.findInTree(tree, id) || null;
        } catch (err) {
          /* переходим к локальной логике */
        }
      }
      if (Object.prototype.toString.call(tree) !== '[object Array]' || !id) {
        return null;
      }
      for (var i = 0; i < tree.length; i++) {
        var node = tree[i];
        if (!node || typeof node !== 'object') {
          continue;
        }
        if (node.id === id) {
          return node;
        }
        if (Object.prototype.toString.call(node.children) === '[object Array]' && node.children.length) {
          var found = Categories.findInTree(node.children, id);
          if (found) {
            return found;
          }
        }
      }
      return null;
    },

    /**
     * Путь от корня до узла в виде массива узлов.
     * @param {Array.<Object>} tree
     * @param {string} id
     * @returns {Array.<Object>}
     */
    getPath: function (tree, id) {
      var mgr = categoriesManager();
      if (mgr && typeof mgr.getPath === 'function') {
        try {
          var delegated = mgr.getPath(tree, id);
          if (Object.prototype.toString.call(delegated) === '[object Array]') {
            return delegated;
          }
        } catch (err) {
          /* переходим к локальной логике */
        }
      }
      if (Object.prototype.toString.call(tree) !== '[object Array]' || !id) {
        return [];
      }
      function walk(nodes, trail) {
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          if (!node || typeof node !== 'object') {
            continue;
          }
          var path = trail.concat([node]);
          if (node.id === id) {
            return path;
          }
          if (Object.prototype.toString.call(node.children) === '[object Array]' && node.children.length) {
            var deeper = walk(node.children, path);
            if (deeper) {
              return deeper;
            }
          }
        }
        return null;
      }
      return walk(tree, []) || [];
    }
  };

  /* ==========================================================================
   * Публичный интерфейс
   * ========================================================================== */

  global.Utils = {
    Storage: Storage,
    Validate: Validate,
    Format: Format,
    Data: Data,
    DOM: DOM,
    Escape: Escape,
    Tags: Tags,
    Categories: Categories,
    LIMITS: LIMITS,
    PALETTE: { gold: GOLD, navy: NAVY, cream: CREAM, tags: TAG_COLORS }
  };
}(typeof window !== 'undefined' ? window : this));
