/*
 * QA Study Portfolio — глобальные горячие клавиши
 * Зависимости: window.App (необязательно — toast, closeModal, hotkeys).
 * Публичный интерфейс: window.Keyboard = { init, KEYMAP, destroy }
 *
 * Единственный владелец глобальных хоткеев. Инициализируется один раз
 * из main.js после готовности App. Все проверки зависимостей — через typeof.
 */
(function (global) {
  'use strict';

  var KEYMAP = {
    'Ctrl+K': 'Поиск',
    'Alt+1': 'Главная',
    'Alt+2': 'Сегодня',
    'Alt+3': 'Курс',
    'Alt+4': 'Заметки',
    'Alt+5': 'Практика',
    'Shift+B': 'Новый баг',
    'Ctrl+Q': 'Быстрая заметка',
    'Ctrl+Left': 'Урок',
    'Ctrl+Right': 'Урок',
    'Escape': 'Закрыть'
  };

  // Для справки в модалке помощи — объединенная запись про стрелки
  var KEYMAP_DISPLAY = {
    'Ctrl+K': 'Поиск',
    'Alt+1': 'Главная',
    'Alt+2': 'Сегодня',
    'Alt+3': 'Курс',
    'Alt+4': 'Заметки',
    'Alt+5': 'Практика',
    'Shift+B': 'Новый баг',
    'Ctrl+Q': 'Быстрая заметка',
    'Ctrl+Left/Right': 'Урок',
    'Escape': 'Закрыть'
  };

  var boundHandler = null;
  var hotkeysRef = null;
  var listening = false;

  function toast(message, type) {
    if (global.App && typeof global.App.toast === 'function') {
      global.App.toast(message, type);
      return true;
    }
    return false;
  }

  function isInputElement(el) {
    if (!el || !el.tagName) {
      return false;
    }
    var tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
    if (el.isContentEditable === true) {
      return true;
    }
    // Дополнительная проверка атрибута contenteditable
    if (typeof el.getAttribute === 'function' && el.getAttribute('contenteditable') === 'true') {
      return true;
    }
    return false;
  }

  function hasAnyModifier(e) {
    return e.ctrlKey || e.altKey || e.metaKey || e.shiftKey;
  }

  function buildCombo(e) {
    var parts = [];
    if (e.ctrlKey || e.metaKey) {
      parts.push('Ctrl');
    }
    if (e.altKey) {
      parts.push('Alt');
    }
    if (e.shiftKey) {
      // Shift учитываем только для сочетаний с буквой, иначе не добавляем
      // чтобы не ломать ввод заглавных букв вне хоткеев
      var key = e.key || '';
      if (key.length === 1 && key.toLowerCase() !== key.toUpperCase()) {
        parts.push('Shift');
      } else if (key === 'B' || key === 'b') {
        parts.push('Shift');
      }
    }
    var k = e.key || '';
    // Нормализация специальных клавиш
    if (k === 'ArrowLeft') { k = 'Left'; }
    if (k === 'ArrowRight') { k = 'Right'; }
    if (k === 'Esc') { k = 'Escape'; }
    // Для букв приводим к верхнему регистру в сочетании
    if (k.length === 1) {
      k = k.toUpperCase();
    }
    if (k === 'Control' || k === 'Alt' || k === 'Shift' || k === 'Meta') {
      return parts.join('+');
    }
    if (parts.length > 0) {
      return parts.join('+') + '+' + k;
    }
    return k;
  }

  function shouldPreventDefault(combo) {
    return combo === 'Ctrl+S' || combo === 'Ctrl+F' || combo === 'Ctrl+Q' || combo === 'Ctrl+K';
  }

  function handleEscape() {
    // Приоритет — App.closeModal, иначе hotkeys.closeTopLayer
    if (global.App && typeof global.App.closeModal === 'function') {
      try {
        var res = global.App.closeModal();
        if (res === true || typeof res !== 'undefined') {
          return true;
        }
      } catch (err) {
        /* пробуем следующий путь */
      }
    }
    if (hotkeysRef && typeof hotkeysRef.closeTopLayer === 'function') {
      try {
        hotkeysRef.closeTopLayer();
        return true;
      } catch (err) {
        return false;
      }
    }
    if (global.App && global.App.hotkeys && typeof global.App.hotkeys.closeTopLayer === 'function') {
      try {
        global.App.hotkeys.closeTopLayer();
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }

  function dispatch(combo, e) {
    // Escape обрабатывается отдельно
    if (combo === 'Escape' || combo === 'Esc') {
      handleEscape();
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      return true;
    }

    // Проверяем наличие в переданном наборе хоткеев
    var target = hotkeysRef;
    if (!target && global.App && global.App.hotkeys) {
      target = global.App.hotkeys;
    }

    // Пытаемся вызвать обработчик из hotkeys по ключу
    // hotkeys в части 4 — объект с методами, ключи совпадают с KEYMAP
    if (target && typeof target === 'object') {
      // Прямое совпадение
      if (typeof target[combo] === 'function') {
        target[combo](e);
        return true;
      }
      // Нормализованный поиск без учета регистра
      var lower = combo.toLowerCase();
      for (var k in target) {
        if (!Object.prototype.hasOwnProperty.call(target, k)) { continue; }
        if (k.toLowerCase() === lower && typeof target[k] === 'function') {
          target[k](e);
          return true;
        }
      }
      // Для стрелок — поддержка объединенного ключа
      if ((combo === 'Ctrl+Left' || combo === 'Ctrl+Right') && typeof target['Ctrl+Left/Right'] === 'function') {
        target['Ctrl+Left/Right'](e);
        return true;
      }
    }

    // Если точного обработчика нет, показываем подсказку через toast
    var label = KEYMAP[combo] || KEYMAP_DISPLAY[combo];
    if (label) {
      toast(label, 'info');
      return true;
    }
    return false;
  }

  function onKeyDown(e) {
    if (!e || typeof e.key === 'undefined') {
      return;
    }

    var combo = buildCombo(e);
    var active = global.document ? global.document.activeElement : null;
    var inInput = isInputElement(active);

    // В поле ввода разрешены только Escape и Ctrl+S / Ctrl+Q
    if (inInput) {
      if (combo === 'Escape' || combo === 'Esc') {
        dispatch('Escape', e);
        return;
      }
      if (combo === 'Ctrl+S' || combo === 'Ctrl+Q' || combo === 'Ctrl+K') {
        if (shouldPreventDefault(combo)) {
          e.preventDefault();
        }
        dispatch(combo, e);
        return;
      }
      // Все остальное в поле ввода игнорируем
      return;
    }

    // Вне полей ввода — одиночные клавиши без модификаторов не перехватываем,
    // кроме Escape (уже обработан выше) — чтобы не ломать набор текста
    // Но Shift+B — это сочетание с модификатором, оно разрешено
    var isSingleKey = !hasAnyModifier(e) && combo.length === 1 || (combo === 'Escape');
    if (isSingleKey && combo !== 'Escape') {
      return;
    }

    // PreventDefault для Ctrl+S/F/Q/K до диспетчеризации
    if (shouldPreventDefault(combo)) {
      e.preventDefault();
    }

    // Диспетчеризация
    var handled = dispatch(combo, e);
    if (handled && shouldPreventDefault(combo)) {
      // уже вызван preventDefault выше
    }
  }

  var Keyboard = {
    KEYMAP: KEYMAP_DISPLAY,

    /**
     * Подписывается на глобальные хоткеи.
     * @param {Object} [hotkeys] набор обработчиков из App.hotkeys части 4
     * @returns {boolean}
     */
    init: function (hotkeys) {
      if (listening) {
        return true;
      }
      if (hotkeys && typeof hotkeys === 'object') {
        hotkeysRef = hotkeys;
      } else if (global.App && global.App.hotkeys) {
        hotkeysRef = global.App.hotkeys;
      }
      if (!global.document || typeof global.document.addEventListener !== 'function') {
        return false;
      }
      boundHandler = onKeyDown;
      global.document.addEventListener('keydown', boundHandler, true);
      listening = true;
      return true;
    },

    /**
     * Снимает глобальный слушатель.
     * @returns {boolean}
     */
    destroy: function () {
      if (!listening || !boundHandler) {
        return false;
      }
      if (global.document && typeof global.document.removeEventListener === 'function') {
        global.document.removeEventListener('keydown', boundHandler, true);
      }
      boundHandler = null;
      hotkeysRef = null;
      listening = false;
      return true;
    }
  };

  global.Keyboard = Keyboard;
}(typeof window !== 'undefined' ? window : this));
