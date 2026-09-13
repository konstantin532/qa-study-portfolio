/* keyboard.js — модуль горячих клавиш для QA Study Portfolio */

/* ЧАСТЬ 1 из 5: Константы, парсинг, сравнение, init, destroy, enable/disable */
(function () {
  'use strict';

  // Не прерываем создание Keyboard, даже если Utils пока не загружен.
  // Наличие Utils проверяется непосредственно перед инициализацией.

  var STORAGE_KEY = 'qa_portfolio_keyboard_shortcuts';

  var MODIFIER_KEYS = {
    ctrl: ['ctrl', 'control'],
    shift: ['shift'],
    alt: ['alt', 'option', 'opt'],
    meta: ['meta', 'cmd', 'command', 'win']
  };

  var SPECIAL_KEYS = {
    'enter': 'Enter',
    'escape': 'Escape',
    'esc': 'Escape',
    'tab': 'Tab',
    ' ': 'Space',
    'space': 'Space',
    'spacebar': 'Space',
    'arrowup': 'ArrowUp',
    'arrowdown': 'ArrowDown',
    'arrowleft': 'ArrowLeft',
    'arrowright': 'ArrowRight',
    'up': 'ArrowUp',
    'down': 'ArrowDown',
    'left': 'ArrowLeft',
    'right': 'ArrowRight',
    'backspace': 'Backspace',
    'delete': 'Delete',
    'del': 'Delete',
    'home': 'Home',
    'end': 'End',
    'pageup': 'PageUp',
    'pagedown': 'PageDown',
    'ins': 'Insert',
    'insert': 'Insert'
  };

  // Шорткаты, для которых всегда preventDefault при совпадении (бразуерные дефолты)
  var PREVENT_DEFAULT = [
    'Ctrl+S', 'Ctrl+D', 'Ctrl+Shift+T', 'F1', 'Meta+S', 'Ctrl+P',
    'Ctrl+F', 'Ctrl+G', 'Ctrl+O', 'Ctrl+W', 'Ctrl+Shift+S'
  ];

  // Категории для справки
  var CATEGORIES = {
    navigation: 'Навигация',
    actions: 'Действия',
    appearance: 'Внешний вид',
    settings: 'Настройки',
    other: 'Прочее'
  };

  var SHORTCUT_CATEGORIES = {
    'Ctrl+D': 'navigation',
    'Ctrl+1': 'navigation',
    'Ctrl+2': 'navigation',
    'Ctrl+3': 'navigation',
    'Ctrl+4': 'navigation',
    'Ctrl+5': 'navigation',
    'Ctrl+6': 'navigation',
    'Ctrl+7': 'navigation',
    'Ctrl+8': 'navigation',
    'Ctrl+9': 'navigation',
    'Ctrl+B': 'navigation',
    'Ctrl+S': 'actions',
    'Ctrl+N': 'actions',
    'Ctrl+K': 'actions',
    'Ctrl+E': 'actions',
    'Ctrl+Shift+T': 'appearance',
    'Ctrl+,': 'settings',
    'Ctrl+Shift+D': 'settings',
    'Shift+?': 'other',
    'Escape': 'other',
    'F1': 'other',
    'Ctrl+/': 'other'
  };

  // ========================================================================
  // СОСТОЯНИЕ
  // ========================================================================

  var _shortcuts = new Map();
  var _enabled = true;
  var _listener = null;
  var _initialized = false;

  // ========================================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ========================================================================

  function _isModifier(part) {
    var lower = part.toLowerCase();
    return lower === 'ctrl' || lower === 'control' ||
           lower === 'shift' ||
           lower === 'alt' || lower === 'option' || lower === 'opt' ||
           lower === 'meta' || lower === 'cmd' || lower === 'command' || lower === 'win';
  }

  function _normalizeKey(key) {
  // Если клавиша не передана
  if (key === undefined || key === null) {
    return null;
  }

  // Гарантированно преобразуем значение в строку
  var originalKey = String(key).trim();

  if (!originalKey) {
    return null;
  }

  var lower = originalKey.toLowerCase();

  // Проверяем специальные клавиши:
  // Enter, Escape, Space, ArrowUp и другие
  if (SPECIAL_KEYS[lower]) {
    return SPECIAL_KEYS[lower];
  }

  // Проверяем функциональные клавиши F1–F12
  var fMatch = lower.match(/^f(\d{1,2})$/);

  if (fMatch) {
    var fNumber = parseInt(fMatch[1], 10);

    if (fNumber >= 1 && fNumber <= 12) {
      return 'F' + fNumber;
    }

    return null;
  }

  // Одиночную латинскую букву переводим
  // в верхний регистр: a -> A
  if (
    originalKey.length === 1 &&
    /[a-z]/i.test(originalKey)
  ) {
    return originalKey.toUpperCase();
  }

  // Цифры и одиночные символы возвращаем как есть
  if (originalKey.length === 1) {
    return originalKey;
  }

  // Для остальных клавиш делаем первую букву заглавной
  return (
    originalKey.charAt(0).toUpperCase() +
    originalKey.slice(1)
  );
}

  function _normalizeEventKey(event) {
    var key = event.key;

    if (!key) return null;

    // Пробел
    if (key === ' ') return 'Space';

    // Буква — в верхний регистр
    if (key.length === 1 && /[a-z]/i.test(key)) {
      return key.toUpperCase();
    }

    // Цифры и спецсимволы — как есть
    if (key.length === 1) {
      return key;
    }

    // Спецклавиши (Enter, Escape, ArrowUp и т.д.) — как есть
    return key;
  }

  function _isInputFocused() {
    var active = document.activeElement;
    if (!active) return false;

    var tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }

    if (active.isContentEditable) {
      return true;
    }

    // Проверка role
    if (active.getAttribute && active.getAttribute('role') === 'textbox') {
      return true;
    }

    return false;
  }

  function _shortcutHasModifier(parsed) {
    return parsed.ctrl || parsed.shift || parsed.alt || parsed.meta;
  }

  function _showToast(message, type) {
  if (window.QAApp && typeof QAApp.emit === 'function') {
    QAApp.emit('toast', {
      message: message,
      type: type || 'info'
    });
  } else if (
    window.App &&
    App.ui &&
    typeof App.ui.showToast === 'function'
  ) {
    App.ui.showToast(message, type || 'info');
  }
}

  function _debug(msg) {
    if (window.Debug && typeof Debug.debug === 'function') {
      Debug.debug('[Keyboard] ' + msg);
    }
  }

  function _warn(msg) {
    if (window.Debug && typeof Debug.warn === 'function') {
      Debug.warn('[Keyboard] ' + msg);
    }
  }

  function _info(msg) {
    if (window.Debug && typeof Debug.info === 'function') {
      Debug.info('[Keyboard] ' + msg);
    }
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
  // ГЛОБАЛЬНЫЙ ОБЪЕКТ KEYBOARD
  // ========================================================================

  var Keyboard = window.Keyboard = {

    // ----------------------------------------------------------------
    // ПАРСИНГ ШОРТКАТА
    // ----------------------------------------------------------------

    parseShortcut: function (shortcut) {
      if (!shortcut || typeof shortcut !== 'string') {
        _warn('parseShortcut: пустой или не строка: ' + shortcut);
        return null;
      }

      var parts = shortcut.trim().split('+');
      var result = {
        ctrl: false,
        shift: false,
        alt: false,
        meta: false,
        key: null
      };

      var keyFound = false;

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        if (!part) continue;

        var lower = part.toLowerCase();

        if (lower === 'ctrl' || lower === 'control') {
          result.ctrl = true;
        } else if (lower === 'shift') {
          result.shift = true;
        } else if (lower === 'alt' || lower === 'option' || lower === 'opt') {
          result.alt = true;
        } else if (lower === 'meta' || lower === 'cmd' || lower === 'command' || lower === 'win') {
          result.meta = true;
        } else {
          // Это клавиша
          if (keyFound) {
            _warn('parseShortcut: несколько клавиш в шорткате: ' + shortcut);
            return null;
          }
          result.key = _normalizeKey(part);
          if (!result.key) {
            _warn('parseShortcut: нераспознанная клавиша: ' + part + ' в ' + shortcut);
            return null;
          }
          keyFound = true;
        }
      }

      if (!keyFound) {
        _warn('parseShortcut: клавиша не указана: ' + shortcut);
        return null;
      }

      return result;
    },

    // ----------------------------------------------------------------
    // СРАВНЕНИЕ СОБЫТИЯ СО ШОРТКАТОМ
    // ----------------------------------------------------------------

    matchShortcut: function (event, parsed) {
      if (!event || !parsed || !parsed.key) return false;

      // Проверка модификаторов
      if (event.ctrlKey !== parsed.ctrl) return false;
      if (event.shiftKey !== parsed.shift) return false;
      if (event.altKey !== parsed.alt) return false;
      if (event.metaKey !== parsed.meta) return false;

      // Нормализация клавиши события
      var eventKey = _normalizeEventKey(event);
      if (!eventKey) return false;

      // Сравнение
      return eventKey === parsed.key;
    },

    // ----------------------------------------------------------------
    // ВКЛЮЧЕНИЕ / ВЫКЛЮЧЕНИЕ
    // ----------------------------------------------------------------

    enable: function () {
      _enabled = true;
      _debug('Keyboard enabled');
    },

    disable: function () {
      _enabled = false;
      _debug('Keyboard disabled');
    },

    isEnabled: function () {
      return _enabled;
    },

    // ----------------------------------------------------------------
    // ИНИЦИАЛИЗАЦИЯ
    // ----------------------------------------------------------------

    init: function () {
      if (!window.Utils) {
        if (window.Debug) Debug.error('Utils not available — Keyboard cannot init');
        return;
      }

      if (_initialized) {
        _debug('Keyboard already initialized');
        return;
      }

      // Установка слушателя
      _listener = Keyboard._handleKeyDown.bind(Keyboard);
      document.addEventListener('keydown', _listener, true);

      // Загрузка настроек
      Keyboard._loadSettings();

      // Регистрация в QAApp
      if (window.QAApp && typeof QAApp.registerModule === 'function') {
        QAApp.registerModule('Keyboard', Keyboard);

        if (typeof QAApp.on === 'function') {
          QAApp.on('keyboard:toggle', function () {
            if (_enabled) {
              Keyboard.disable();
            } else {
              Keyboard.enable();
            }
          });
          QAApp.on('keyboard:help', function () {
            Keyboard.showHelp();
          });
        }
      }

      _initialized = true;
      _info('Keyboard module initialized');
    },

    // ----------------------------------------------------------------
    // УНИЧТОЖЕНИЕ
    // ----------------------------------------------------------------

    destroy: function () {
      if (_listener) {
        document.removeEventListener('keydown', _listener, true);
        _listener = null;
      }

      _shortcuts.clear();
      _enabled = false;
      _initialized = false;

      _info('Keyboard module destroyed');
    },

    // ----------------------------------------------------------------
    // ВНУТРЕННИЕ ПОЛЯ
    // ----------------------------------------------------------------

    _shortcuts: _shortcuts,
    _enabled: _enabled,
    _listener: _listener
  };

  // Синхронизация ссылок (Map и boolean — по значению, поэтому обновляем через геттеры)
  Object.defineProperty(Keyboard, '_shortcuts', {
    get: function () { return _shortcuts; },
    set: function (v) { /* read-only через замыкание */ },
    configurable: false
  });

  Object.defineProperty(Keyboard, '_enabled', {
    get: function () { return _enabled; },
    set: function (v) { _enabled = v; },
    configurable: false
  });

  Object.defineProperty(Keyboard, '_listener', {
    get: function () { return _listener; },
    set: function (v) { _listener = v; },
    configurable: false
  });

  // ========================================================================
  // ВНУТРЕННИЕ УТИЛИТЫ ДЛЯ ОБМЕНА МЕЖДУ ЧАСТЯМИ
  // ========================================================================

  Keyboard._internal = {
    normalizeKey: _normalizeKey,
    normalizeEventKey: _normalizeEventKey,
    isInputFocused: _isInputFocused,
    shortcutHasModifier: _shortcutHasModifier,
    isModifier: _isModifier,
    showToast: _showToast,
    debug: _debug,
    warn: _warn,
    info: _info,
    dom: _dom,
    storageKey: STORAGE_KEY,
    categories: CATEGORIES,
    shortcutCategories: SHORTCUT_CATEGORIES,
    preventDefaults: PREVENT_DEFAULT
  };

})();

/* ЧАСТЬ 2 из 5: register, unregister, getShortcuts, _handleKeyDown */
(function () {
  'use strict';

  var Keyboard = window.Keyboard;
if (!Keyboard) return;

var _i = Keyboard._internal;
if (!_i) {
  console.warn('Keyboard._internal is not available in Part 2');
  return;
}

var _shortcuts = Keyboard._shortcuts;

  // ----------------------------------------------------------------
  // НОРМАЛИЗАЦИЯ СТРОКИ ШОРТКАТА (для ключа в Map)
  // ----------------------------------------------------------------

  function _normalizeShortcutString(shortcut) {
    var parsed = Keyboard.parseShortcut(shortcut);
    if (!parsed) return null;

    var parts = [];
    if (parsed.ctrl) parts.push('Ctrl');
    if (parsed.shift) parts.push('Shift');
    if (parsed.alt) parts.push('Alt');
    if (parsed.meta) parts.push('Meta');
    if (parsed.key) parts.push(parsed.key);

    return parts.join('+');
  }

  // ----------------------------------------------------------------
  // РЕГИСТРАЦИЯ ШОРТКАТА
  // ----------------------------------------------------------------

  Keyboard.register = function (shortcut, handler, description) {
    if (!shortcut || typeof shortcut !== 'string') {
      _i.warn('register: шорткат не указан');
      return false;
    }

    if (typeof handler !== 'function') {
      _i.warn('register: handler не функция для шортката ' + shortcut);
      return false;
    }

    var parsed = Keyboard.parseShortcut(shortcut);
    if (!parsed) {
      _i.warn('register: невалидный шорткат: ' + shortcut);
      return false;
    }

    var normalizedKey = _normalizeShortcutString(shortcut);
    if (!normalizedKey) {
      _i.warn('register: не удалось нормализовать шорткат: ' + shortcut);
      return false;
    }

    // Проверка существующего шортката
    var existing = _shortcuts.get(normalizedKey);
    var wasExisting = !!existing;

    // Сохранение / перезапись
    _shortcuts.set(normalizedKey, {
      shortcut: normalizedKey,
      originalShortcut: shortcut,
      parsed: parsed,
      handler: handler,
      description: description || '',
      enabled: wasExisting ? existing.enabled : true // сохраняем состояние enabled при перезаписи
    });

    _i.debug('Shortcut registered: ' + normalizedKey + ' → ' + (description || '(без описания)') + (wasExisting ? ' (перезаписан)' : ''));

    return true;
  };

  // ----------------------------------------------------------------
  // ОТМЕНА РЕГИСТРАЦИИ ШОРТКАТА
  // ----------------------------------------------------------------

  Keyboard.unregister = function (shortcut) {
    if (!shortcut || typeof shortcut !== 'string') {
      _i.warn('unregister: шорткат не указан');
      return false;
    }

    var normalizedKey = _normalizeShortcutString(shortcut);
    if (!normalizedKey) return false;

    if (_shortcuts.has(normalizedKey)) {
      _shortcuts.delete(normalizedKey);
      _i.debug('Shortcut unregistered: ' + normalizedKey);
      return true;
    }

    _i.debug('Shortcut not found for unregister: ' + normalizedKey);
    return false;
  };

  // ----------------------------------------------------------------
  // ПОЛУЧЕНИЕ СПИСКА ШОРТКАТОВ
  // ----------------------------------------------------------------

  Keyboard.getShortcuts = function () {
    var result = [];

    _shortcuts.forEach(function (entry) {
      result.push({
        shortcut: entry.shortcut,
        description: entry.description,
        enabled: entry.enabled
      });
    });

    // Сортировка: по категории, затем по шорткату
    var cats = _i.shortcutCategories;

    result.sort(function (a, b) {
      var catA = cats[a.shortcut] || 'other';
      var catB = cats[b.shortcut] || 'other';

      if (catA !== catB) {
        var order = ['navigation', 'actions', 'appearance', 'settings', 'other'];
        return order.indexOf(catA) - order.indexOf(catB);
      }

      return a.shortcut.localeCompare(b.shortcut);
    });

    return result;
  };

  // ----------------------------------------------------------------
  // ГЛОБАЛЬНЫЙ ОБРАБОТЧИК KEYDOWN
  // ----------------------------------------------------------------

  Keyboard._handleKeyDown = function (event) {
    // Проверка включённости
    if (!Keyboard.isEnabled()) return;

    // Проверка фокуса в поле ввода
    var inputFocused = _i.isInputFocused();

    // Проверка, есть ли зарегистрированные шорткаты
    if (_shortcuts.size === 0) return;

    var matched = false;
    var matchedEntry = null;

    // Итерация по всем зарегистрированным шорткатам
    _shortcuts.forEach(function (entry) {
      if (matched) return; // уже нашли совпадение

      // Пропуск выключенных
      if (!entry.enabled) return;

      // Проверка совпадения
      if (!Keyboard.matchShortcut(event, entry.parsed)) return;

      // Проверка фокуса в input
      if (inputFocused) {
        // В input/textarea обрабатываем только шорткаты с модификаторами
        var hasModifier = _i.shortcutHasModifier(entry.parsed);

        // Escape — всегда обрабатывается
        var isEscape = entry.parsed.key === 'Escape';

        if (!hasModifier && !isEscape) {
          return; // пропускаем шорткаты без модификаторов в поле ввода
        }
      }

      matched = true;
      matchedEntry = entry;
    });

    if (!matched || !matchedEntry) return;

    // Предотвращение дефолтного поведения
    event.preventDefault();
    event.stopPropagation();

    _i.debug('Shortcut triggered: ' + matchedEntry.shortcut);

    // Вызов обработчика
    try {
      matchedEntry.handler(event);
    } catch (err) {
      _i.warn('Ошибка в обработчике шортката ' + matchedEntry.shortcut + ': ' + (err.message || err));
      if (window.Debug && Debug.error) {
        Debug.error('[Keyboard] Handler error:', err);
      }
    }
  };

})();

/* ЧАСТЬ 3 из 5: Управление настройками шорткатов, localStorage */
(function () {
  'use strict';

  var Keyboard = window.Keyboard;
if (!Keyboard) return;

var _i = Keyboard._internal;
if (!_i) {
  console.warn('Keyboard._internal not available in Part 3');
  return;
}

var _shortcuts = Keyboard._shortcuts;
var STORAGE_KEY = _i.storageKey;

  // ----------------------------------------------------------------
  // СОХРАНЕНИЕ ВКЛЮЧЁННЫХ ШОРТКАТОВ
  // ----------------------------------------------------------------

  Keyboard.setEnabledShortcuts = function (shortcuts) {
    var data = {
      enabled: [],
      disabled: []
    };

    if (Array.isArray(shortcuts)) {
      // shortcuts — массив включённых шорткатов
      data.enabled = shortcuts.map(function (s) {
        return _normalizeShortcutForStorage(s);
      }).filter(function (s) { return s; });
    }

    // Определение выключенных (все зарегистрированные минус включённые)
    var allShortcuts = [];
    _shortcuts.forEach(function (entry) {
      allShortcuts.push(entry.shortcut);
    });

    data.disabled = allShortcuts.filter(function (s) {
      return data.enabled.indexOf(s) === -1;
    });

    // Сохранение
    try {
      var json = JSON.stringify(data);
      window.safeStorage.setRaw(STORAGE_KEY, json);
      _i.debug('Saved shortcuts settings: ' + data.enabled.length + ' enabled, ' + data.disabled.length + ' disabled');
    } catch (e) {
      _i.warn('Не удалось сохранить настройки шорткатов: ' + (e.message || e));
    }

    // Применение к зарегистрированным шорткатам
    _applySettings(data);
  };

  // ----------------------------------------------------------------
  // ПОЛУЧЕНИЕ ВКЛЮЧЁННЫХ ШОРТКАТОВ
  // ----------------------------------------------------------------

  Keyboard.getEnabledShortcuts = function () {
    var data = _loadFromStorage();

    if (!data) {
      // Если настроек нет — все шорткаты включены
      var allEnabled = [];
      _shortcuts.forEach(function (entry) {
        allEnabled.push(entry.shortcut);
      });
      return { enabled: allEnabled, disabled: [] };
    }

    return data;
  };

  // ----------------------------------------------------------------
  // ВНУТРЕННИЕ ФУНКЦИИ
  // ----------------------------------------------------------------

  function _normalizeShortcutForStorage(shortcut) {
    if (!shortcut || typeof shortcut !== 'string') return null;

    var parsed = Keyboard.parseShortcut(shortcut);
    if (!parsed) return null;

    var parts = [];
    if (parsed.ctrl) parts.push('Ctrl');
    if (parsed.shift) parts.push('Shift');
    if (parsed.alt) parts.push('Alt');
    if (parsed.meta) parts.push('Meta');
    if (parsed.key) parts.push(parsed.key);

    return parts.join('+');
  }

  function _loadFromStorage() {
    try {
      var json = window.safeStorage.getRaw(STORAGE_KEY);
      if (!json) return null;

      var data = JSON.parse(json);
      if (!data || typeof data !== 'object') return null;

      if (!Array.isArray(data.enabled)) data.enabled = [];
      if (!Array.isArray(data.disabled)) data.disabled = [];

      return data;
    } catch (e) {
      _i.warn('Не удалось загрузить настройки шорткатов: ' + (e.message || e));
      return null;
    }
  }

  function _applySettings(data) {
    if (!data) return;

    var enabledSet = {};
    var disabledSet = {};

    data.enabled.forEach(function (s) {
      enabledSet[s] = true;
    });

    data.disabled.forEach(function (s) {
      disabledSet[s] = true;
    });

    _shortcuts.forEach(function (entry, key) {
      if (disabledSet[key]) {
        entry.enabled = false;
      } else if (enabledSet[key]) {
        entry.enabled = true;
      }
      // Если шортката нет ни в одном списке — оставляем текущее состояние
    });
  }

  // ----------------------------------------------------------------
  // ЗАГРУЗКА НАСТРОЕК ПРИ ИНИЦИАЛИЗАЦИИ
  // ----------------------------------------------------------------

  Keyboard._loadSettings = function () {
    var data = _loadFromStorage();
    if (data) {
      _applySettings(data);
      _i.debug('Loaded keyboard settings: ' + data.enabled.length + ' enabled, ' + data.disabled.length + ' disabled');
    }
  };

  // ----------------------------------------------------------------
  // СОХРАНЕНИЕ НАСТРОЕК
  // ----------------------------------------------------------------

  Keyboard._saveSettings = function () {
    var enabled = [];
    var disabled = [];

    _shortcuts.forEach(function (entry) {
      if (entry.enabled) {
        enabled.push(entry.shortcut);
      } else {
        disabled.push(entry.shortcut);
      }
    });

    var data = { enabled: enabled, disabled: disabled };

    try {
      window.safeStorage.setRaw(STORAGE_KEY, JSON.stringify(data));
      _i.debug('Saved keyboard settings to localStorage');
    } catch (e) {
      _i.warn('Не удалось сохранить настройки: ' + (e.message || e));
    }
  };

  // ----------------------------------------------------------------
  // ПЕРЕКЛЮЧЕНИЕ ОТДЕЛЬНОГО ШОРТКАТА
  // ----------------------------------------------------------------

  Keyboard.toggleShortcut = function (shortcut, enabled) {
    var normalized = _normalizeShortcutForStorage(shortcut);
    if (!normalized) return false;

    var entry = _shortcuts.get(normalized);
    if (!entry) return false;

    entry.enabled = enabled !== false;
    Keyboard._saveSettings();

    _i.debug('Shortcut ' + normalized + ' ' + (entry.enabled ? 'enabled' : 'disabled'));
    return true;
  };

})();

/* ЧАСТЬ 4 из 5: showHelp — модалка со списком горячих клавиш */
(function () {
  'use strict';

  var Keyboard = window.Keyboard;
  if (!Keyboard) return;
  var _i = Keyboard._internal;
  var _dom = _i.dom;

  // ----------------------------------------------------------------
  // SHOWHELP — МОДАЛКА СПРАВКИ
  // ----------------------------------------------------------------

  Keyboard.showHelp = function () {
    // Попытка использовать Forms для создания модалки
    if (window.Forms && typeof Forms._internal !== 'undefined') {
      _showHelpViaForms();
    } else {
      _showHelpStandalone();
    }
  };

  // ----------------------------------------------------------------
  // СПРАВКА ЧЕРЕЗ СИСТЕМУ МОДАЛОК FORMS
  // ----------------------------------------------------------------

  function _showHelpViaForms() {
    var F = window.Forms;
    var FI = F._internal;
    var modalId = 'keyboard-help-' + FI.generateId();

    var content = _dom('div', { class: 'modal-keyboard-help-content' });

    // Header
    var header = _dom('div', {
      class: 'modal-header',
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }
    });
    header.appendChild(_dom('h3', { class: 'modal-title', text: 'Горячие клавиши' }));

    var closeBtn = _dom('button', {
      class: 'modal-close-btn',
      'aria-label': 'Закрыть',
      html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
    });
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Содержимое справки
    var helpBody = _buildHelpBody();
    content.appendChild(helpBody);

    // Кнопка закрытия
    var footer = _dom('div', {
      class: 'modal-footer',
      style: { display: 'flex', justifyContent: 'center', marginTop: '20px' }
    });
    var okBtn = _dom('button', { class: 'btn btn-primary', text: 'Закрыть', style: { minWidth: '120px' } });
    footer.appendChild(okBtn);
    content.appendChild(footer);

    // Создание модалки
    var modal = FI.createDynamicModal(modalId, content, { size: 'md' });

    function _close() {
      FI.closeDynamicModal(modal);
    }

    okBtn.addEventListener('click', _close);
    closeBtn.addEventListener('click', _close);

    // Escape для закрытия
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        _close();
      }
    });

    FI.openDynamicModal(modal);
  }

  // ----------------------------------------------------------------
  // АВТОНОМНАЯ СПРАВКА (без Forms)
  // ----------------------------------------------------------------

  function _showHelpStandalone() {
    // Создание оверлея
    var overlay = _dom('div', {
      class: 'qa-modal-overlay',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Горячие клавиши',
      style: {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '9999',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        inset: '0'
      }
    });

    var modal = _dom('div', {
      class: 'qa-modal',
      style: {
        background: '#fff', borderRadius: '12px', padding: '24px',
        maxWidth: '600px', width: '90%', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }
    });

    // Header
    var header = _dom('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }
    });
    header.appendChild(_dom('h3', { style: { margin: '0', fontSize: '20px', color: '#1e293b' }, text: 'Горячие клавиши' }));

    var closeBtn = _dom('button', {
      'aria-label': 'Закрыть',
      html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      style: { border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }
    });
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Содержимое
    var helpBody = _buildHelpBody();
    modal.appendChild(helpBody);

    // Кнопка
    var okBtn = _dom('button', {
      class: 'btn btn-primary',
      text: 'Закрыть',
      style: { display: 'block', margin: '20px auto 0', padding: '10px 32px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '14px', cursor: 'pointer', minWidth: '120px' }
    });
    modal.appendChild(okBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    // Сохранение предыдущего фокуса
    var prevFocus = document.activeElement;

    function _close() {
      document.body.removeChild(overlay);
      document.body.classList.remove('modal-open');
      if (prevFocus && typeof prevFocus.focus === 'function') {
        try { prevFocus.focus(); } catch (e) { /* ignore */ }
      }
    }

    okBtn.addEventListener('click', _close);
    closeBtn.addEventListener('click', _close);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _close();
    });

    // Escape
    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        _close();
        document.removeEventListener('keydown', onKeydown, true);
      }
    }
    document.addEventListener('keydown', onKeydown, true);

    // Фокус
    setTimeout(function () { okBtn.focus(); }, 100);
  }

  // ----------------------------------------------------------------
  // ПОСТРОЕНИЕ ТЕЛА СПРАВКИ
  // ----------------------------------------------------------------

  function _buildHelpBody() {
    var allShortcuts = Keyboard.getShortcuts();

    if (allShortcuts.length === 0) {
      return _dom('p', {
        style: { color: '#94a3b8', textAlign: 'center', padding: '20px' },
        text: 'Шорткаты не зарегистрированы.'
      });
    }

    // Группировка по категориям
    var groups = {};
    var cats = _i.shortcutCategories;
    var catLabels = _i.categories;

    allShortcuts.forEach(function (sc) {
      var cat = cats[sc.shortcut] || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(sc);
    });

    // Порядок категорий
    var categoryOrder = ['navigation', 'actions', 'appearance', 'settings', 'other'];

    var container = _dom('div', { class: 'keyboard-help-body' });

    categoryOrder.forEach(function (catKey) {
      if (!groups[catKey] || groups[catKey].length === 0) return;

      var catLabel = catLabels[catKey] || 'Прочее';

      // Заголовок категории
      container.appendChild(_dom('div', {
        style: { fontWeight: '700', fontSize: '14px', color: '#3b82f6', marginTop: '16px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #e2e8f0' },
        text: catLabel
      }));

      // Таблица шорткатов
      var table = _dom('table', {
        style: { width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }
      });

      groups[catKey].forEach(function (sc) {
        var row = _dom('tr', {
          style: { borderBottom: '1px solid #f1f5f9' }
        });

        // Клавиша (kbd)
        var kbdCell = _dom('td', {
          style: { padding: '8px 12px', width: '40%', verticalAlign: 'middle' }
        });

        var kbd = _dom('kbd', {
          style: {
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '5px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderBottom: '2px solid #cbd5e1',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#1e293b',
            whiteSpace: 'nowrap'
          },
          text: sc.shortcut
        });

        kbdCell.appendChild(kbd);
        row.appendChild(kbdCell);

        // Описание
        var descCell = _dom('td', {
          style: { padding: '8px 12px', fontSize: '14px', color: '#475569', verticalAlign: 'middle' },
          text: sc.description || '(без описания)'
        });
        row.appendChild(descCell);

        // Индикатор выключенного шортката
        if (!sc.enabled) {
          descCell.style.opacity = '0.5';
          descCell.style.textDecoration = 'line-through';
        }

        table.appendChild(row);
      });

      container.appendChild(table);
    });

    return container;
  }

})();

/* ЧАСТЬ 5 из 5: Стандартные шорткаты, автоинициализация */
(function () {
  'use strict';

  var Keyboard = window.Keyboard;
  
  // 1. Если сам объект Keyboard еще не создан, вообще ничего не делаем.
  if (!Keyboard) {
    console.warn('Keyboard module not ready yet (Part 5 skipped).');
    return;
  }

  // 2. Функция регистрации стандартных шорткатов.
  // Она НЕ вызывается сразу! Только когда всё готово.
  Keyboard._registerDefaults = function () {
  if (Keyboard._defaultsRegistered) {
    return;
  }

  var _i = Keyboard._internal;

  if (!_i || !_i.dom) {
    console.error(
      'Keyboard._internal is missing required properties. ' +
      'Cannot register defaults.'
    );
    return;
  }

Keyboard._defaultsRegistered = true;

console.log(
  'Keyboard: Default shortcuts registered successfully.'
);

    // --- РЕГИСТРАЦИЯ ШОРТКАТОВ ---
    
    // Навигация
    Keyboard.register('Ctrl+D', function () {
  _navigateTo('dashboard');
}, 'Дашборд');
    

    Keyboard.register('Ctrl+1', function () {
      _navigateTo('dashboard');
    }, 'Дашборд (быстрая навигация)');

    Keyboard.register('Ctrl+2', function () {
      _navigateTo('modules');
    }, 'Модули (быстрая навигация)');

    Keyboard.register('Ctrl+3', function () {
      _navigateTo('reports');
    }, 'Отчеты (быстрая навигация)');

    Keyboard.register('Ctrl+B', function () {
      _toggleSidebar();
    }, 'Переключить боковую панель');

    // Действия
    Keyboard.register('Ctrl+S', function () {
      _saveCurrentPage();
    }, 'Сохранить текущую страницу');

    Keyboard.register('Ctrl+N', function () {
      _createNewItem();
    }, 'Создать новый элемент');

    Keyboard.register('Ctrl+K', function () {
      _focusSearch();
    }, 'Фокус на поиске');

    Keyboard.register('Ctrl+E', function () {
      _editCurrentItem();
    }, 'Редактировать текущий элемент');

    // Внешний вид
    Keyboard.register('Ctrl+Shift+T', function () {
      _toggleTheme();
    }, 'Переключить тему (светлая/темная)');

    // Настройки
    Keyboard.register('Ctrl+,', function () {
      _openSettings();
    }, 'Открыть настройки');

    Keyboard.register('Ctrl+Shift+D', function () {
      _debugModeToggle();
    }, 'Переключить режим отладки');

    // Прочее
    Keyboard.register('Shift+?', function () {
  Keyboard.showHelp();
}, 'Показать справку по горячим клавишам');

    Keyboard.register('Escape', function () {
      _closeModals();
    }, 'Закрыть модальные окна');

    Keyboard.register('Ctrl+/', function () {
      Keyboard.showHelp();
    }, 'Показать справку (альтернатива)');

    console.log('Keyboard: Default shortcuts registered successfully.');
  };

  // 3. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (заглушки, замените на реальные реализации из вашего проекта)
  function _navigateTo(page) {
  if (
    window.App &&
    App.router &&
    typeof App.router.navigate === 'function'
  ) {
    App.router.navigate(page);
    return;
  }

  window.location.hash = page;
}
  function _toggleSidebar() {
  if (
    window.App &&
    App.ui &&
    typeof App.ui.toggleSidebar === 'function'
  ) {
    App.ui.toggleSidebar();
    return;
  }

  var toggle = document.querySelector('.sidebar-toggle');

  if (toggle) {
    toggle.click();
  }
}
  function _saveCurrentPage() { console.log('Save page'); }
  function _createNewItem() { console.log('Create new'); }
  function _focusSearch() { console.log('Focus search'); }
  function _editCurrentItem() { console.log('Edit item'); }
  function _toggleTheme() { console.log('Toggle theme'); }
  function _openSettings() { console.log('Open settings'); }
  function _debugModeToggle() { console.log('Debug mode toggle'); }
  function _closeModals() { console.log('Close modals'); }

  // 4. ОТЛОЖЕННАЯ ИНИЦИАЛИЗАЦИЯ (Самое важное!)
  // Мы не вызываем init() и _registerDefaults() сразу.
  // Мы ждем, пока window.Utils и Keyboard._internal будут полностью готовы.
  
  function _tryInit() {
    // Проверяем наличие Utils
    if (!window.Utils) {
      console.debug('Keyboard: Utils not ready, retrying in 100ms...');
      setTimeout(_tryInit, 100);
      return;
    }

    // Проверяем наличие _internal и его методов (особенно dom, который ломался)
    var _i = Keyboard._internal;
    if (!_i || !_i.dom) {
      console.debug('Keyboard: _internal not ready (missing dom), retrying in 100ms...');
      setTimeout(_tryInit, 100);
      return;
    }

    // ВСЁ ГОТОВО: Запускаем инициализацию
    console.log('Keyboard: All dependencies ready. Initializing...');
    Keyboard._registerDefaults();
    Keyboard.init();
  }

  // Запускаем проверку готовности
  _tryInit();

})();
