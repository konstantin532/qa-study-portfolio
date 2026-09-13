/* utils.js — утилиты, хелперы, DOM, storage, форматирование, валидация */

/* ============ РАЗДЕЛ 1: КОНСТАНТЫ ПРОЕКТА ============ */

var Utils = window.Utils = window.Utils || {};

Utils.constants = {
  STORAGE_KEYS: {
    STATE: 'qa_portfolio_state',
    SETTINGS: 'qa_portfolio_settings',
    THEME: 'qa_portfolio_theme',
    PROGRESS: 'qa_portfolio_progress',
    NOTES: 'qa_portfolio_notes',
    TAGS: 'qa_portfolio_tags',
    BOOKMARKS: 'qa_portfolio_bookmarks',
    POMODORO: 'qa_portfolio_pomodoro',
    ONBOARDED: 'qa_portfolio_onboarded',
    SIDEBAR_COLLAPSED: 'qa_portfolio_sidebar_collapsed',
    COMPACT_VIEW: 'qa_portfolio_compact_view',
    LAST_ROUTE: 'qa_portfolio_last_route',
    ARTIFACTS: 'qa_portfolio_artifacts',
    PORTFOLIO_ITEMS: 'qa_portfolio_portfolio_items',
    SEARCH_HISTORY: 'qa_portfolio_search_history',
    EXPORT_HISTORY: 'qa_portfolio_export_history',
    PRESENTATION_INDEX: 'qa_portfolio_presentation_index'
  },

  BREAKPOINTS: {
    XS: 320,
    SM: 480,
    MD: 768,
    LG: 1024,
    XL: 1280,
    XXL: 1600,
    XXXL: 1920,
    QHD: 2560,
    UHD: 3840
  },

  Z_INDEX: {
    BASE: 0,
    DROPDOWN: 100,
    STICKY: 200,
    SIDEBAR: 300,
    HEADER: 400,
    MODAL: 1000,
    TOAST: 1100,
    TOOLTIP: 1200,
    MAX: 9999
  },

  TIMING: {
    FAST: 150,
    BASE: 200,
    SLOW: 250,
    TOAST_DURATION: 3000,
    TOAST_DURATION_LONG: 5000,
    TOAST_DURATION_ERROR: 6000,
    SAVE_INDICATOR: 1500,
    DEBOUNCE_SEARCH: 300,
    DEBOUNCE_SAVE: 500,
    THROTTLE_SCROLL: 100,
    THROTTLE_RESIZE: 150
  },

  LIMITS: {
    MAX_NOTE_LENGTH: 10000,
    MAX_ARTIFACT_LENGTH: 50000,
    MAX_TITLE_LENGTH: 200,
    MAX_DESC_LENGTH: 2000,
    MAX_TAGS_PER_ITEM: 10,
    MAX_TAG_LENGTH: 30,
    MAX_SEARCH_RESULTS: 50,
    MAX_SEARCH_HISTORY: 20,
    MAX_EXPORT_ITEMS: 500,
    MAX_POMODORO_MINUTES: 120,
    MIN_POMODORO_MINUTES: 1,
    MAX_BREADCRUMBS: 5,
    MAX_TOASTS: 3,
    MAX_RECENT_ACTIVITY: 50,
    STORAGE_WARNING_MB: 4,
    STORAGE_CRITICAL_MB: 4.5,
    STORAGE_QUOTA_BYTES: 5 * 1024 * 1024
  },

  TAG_COLORS: 10,

  ROUTES: [
    'dashboard', 'roadmap', 'portfolio', 'artifacts', 'resources',
    'glossary', 'pomodoro', 'knowledge-map', 'templates',
    'sharing', 'settings', 'about', 'help'
  ],

  POMODORO: {
    WORK_MINUTES: 25,
    SHORT_BREAK_MINUTES: 5,
    LONG_BREAK_MINUTES: 15,
    SESSIONS_BEFORE_LONG_BREAK: 4,
    MODES: { WORK: 'work', SHORT_BREAK: 'short_break', LONG_BREAK: 'long_break' }
  },

  APP_VERSION: '1.0.0',
  APP_NAME: 'QA Study Portfolio'
};

/* ============ РАЗДЕЛ 2: DOM-ХЕЛПЕРЫ (Utils.dom) ============ */

Utils.dom = {
  // Создание элемента с props и children
  create(tag, props = {}, children = null) {
    const element = document.createElement(tag);
    if (props.class) element.className = props.class;
    if (props.id) element.id = props.id;
    if (props.dataset) {
      for (const [key, val] of Object.entries(props.dataset)) {
        element.dataset[key] = val;
      }
    }
    if (props.style) {
      for (const [key, val] of Object.entries(props.style)) {
        element.style[key] = val;
      }
    }
    if (props.attrs) {
      for (const [key, val] of Object.entries(props.attrs)) {
        element.setAttribute(key, val);
      }
    }
    if (props.html) element.innerHTML = props.html;
    if (props.text) element.textContent = props.text;
    if (props.on) {
      for (const [evt, handler] of Object.entries(props.on)) {
        element.addEventListener(evt, handler);
      }
    }
    if (props.role) element.setAttribute('role', props.role);
    if (props.aria) {
      for (const [key, val] of Object.entries(props.aria)) {
        element.setAttribute('aria-' + key, val);
      }
    }
    if (props.hidden) element.setAttribute('hidden', '');
    if (props.tabindex !== undefined) element.setAttribute('tabindex', props.tabindex);
    if (props.title) element.setAttribute('title', props.title);
    if (children !== null && children !== undefined) {
      if (typeof children === 'string') {
        element.textContent = children;
      } else if (children instanceof Node) {
        element.appendChild(children);
      } else if (Array.isArray(children)) {
        children.forEach(c => {
          if (c === null || c === undefined) return;
          if (typeof c === 'string') {
            element.appendChild(document.createTextNode(c));
          } else if (c instanceof Node) {
            element.appendChild(c);
          }
        });
      }
    }
    return element;
  },

  // Быстрое создание элемента из селектор-подобной строки: div.card#my-id
  el(selector, children = null) {
    let tag = 'div';
    const classes = [];
    let id = null;
    const tagMatch = selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    if (tagMatch) tag = tagMatch[1];
    const idMatches = selector.match(/#([a-zA-Z0-9_-]+)/g);
    if (idMatches) id = idMatches[0].slice(1);
    const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classMatches) classMatches.forEach(m => classes.push(m.slice(1)));
    const props = {};
    if (classes.length) props.class = classes.join(' ');
    if (id) props.id = id;
    return Utils.dom.create(tag, props, children);
  },

  // Поиск одного элемента
  $(selector, context = document) {
    return context.querySelector(selector) || null;
  },

  // Поиск всех элементов → массив
  $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  },

  // Добавление классов
  addClass(element, ...classes) {
    if (!element) return;
    classes.forEach(c => element.classList.add(c));
  },

  // Удаление классов
  removeClass(element, ...classes) {
    if (!element) return;
    classes.forEach(c => element.classList.remove(c));
  },

  // Переключение класса
  toggleClass(element, className, force) {
  if (!element) return false;

  if (force === undefined) {
    return element.classList.toggle(className);
  }

  return element.classList.toggle(className, Boolean(force));
},

  // Проверка класса
  hasClass(element, className) {
    if (!element) return false;
    return element.classList.contains(className);
  },

  // Добавление потомка
  append(parent, child) {
    if (parent && child) parent.appendChild(child);
    return parent;
  },

  // Вставка в начало
  prepend(parent, child) {
    if (parent && child) parent.insertBefore(child, parent.firstChild);
    return parent;
  },

  // Вставка после элемента
  after(element, newElement) {
    if (element && newElement && element.parentNode) {
      element.parentNode.insertBefore(newElement, element.nextSibling);
    }
  },

  // Вставка перед элементом
  before(element, newElement) {
    if (element && newElement && element.parentNode) {
      element.parentNode.insertBefore(newElement, element);
    }
  },

  // Удаление элемента
  remove(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },

  // Очистка содержимого
  empty(element) {
    if (!element) return element;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    return element;
  },

  // Замена элемента
  replace(oldElement, newElement) {
    if (oldElement && oldElement.parentNode && newElement) {
      oldElement.parentNode.replaceChild(newElement, oldElement);
    }
  },

  // Установка атрибутов
  setAttr(element, attrs) {
    if (!element || !attrs) return;
    for (const [key, val] of Object.entries(attrs)) {
      element.setAttribute(key, val);
    }
  },

  // Получение атрибута
  getAttr(element, name) {
    if (!element) return null;
    return element.getAttribute(name);
  },

  // Удаление атрибута
  removeAttr(element, name) {
    if (element) element.removeAttribute(name);
  },

  // Проверка атрибута
  hasAttr(element, name) {
    if (!element) return false;
    return element.hasAttribute(name);
  },

  // Установка data-атрибута
  setData(element, key, value) {
    if (element) element.dataset[key] = value;
  },

  // Получение data-атрибута
  getData(element, key) {
    if (!element) return undefined;
    return element.dataset[key];
  },

  // Удаление data-атрибута
  removeData(element, key) {
    if (element) delete element.dataset[key];
  },

  // Установка текста
  setText(element, text) {
    if (element) element.textContent = text;
  },

  // Получение текста
  getText(element) {
    if (!element) return '';
    return element.textContent;
  },

  // Установка HTML
  setHTML(element, html) {
    if (element) element.innerHTML = html;
  },

  // Получение HTML
  getHTML(element) {
    if (!element) return '';
    return element.innerHTML;
  },

  // Установка стилей через CSS-свойства
  setStyle(element, styles) {
    if (!element || !styles) return;
    for (const [key, val] of Object.entries(styles)) {
      element.style.setProperty(key, val);
    }
  },

  // Получение вычисленного стиля
  getStyle(element, prop) {
    if (!element) return '';
    return getComputedStyle(element).getPropertyValue(prop);
  },

  // Удаление inline-стиля
  removeStyle(element, prop) {
    if (element) element.style.removeProperty(prop);
  },

  // Показать элемент
  show(element) {
    if (element) element.style.display = '';
  },

  // Скрыть элемент
  hide(element) {
    if (element) element.style.display = 'none';
  },

  // Переключить видимость
  toggle(element) {
    if (!element) return;
    const display = Utils.dom.getStyle(element, 'display');
    element.style.display = display === 'none' ? '' : 'none';
  },

  // Проверка: скрыт ли элемент
  isHidden(element) {
    if (!element) return true;
    return element.hidden || Utils.dom.getStyle(element, 'display') === 'none';
  },

  // Проверка: виден ли элемент
  isVisible(element) {
    if (!element) return false;
    return element.offsetParent !== null || element.getClientRects().length > 0;
  },

  // Позиция элемента на странице
  offset(element) {
    if (!element) return { top: 0, left: 0, width: 0, height: 0 };
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  },

  // Позиция относительно offset-родителя
  position(element) {
    if (!element) return { top: 0, left: 0 };
    return { top: element.offsetTop, left: element.offsetLeft };
  },

  // Ширина элемента
  width(element) {
    if (!element) return 0;
    return element.getBoundingClientRect().width;
  },

  // Высота элемента
  height(element) {
    if (!element) return 0;
    return element.getBoundingClientRect().height;
  },

  // Полная ширина с border
  outerWidth(element) {
    if (!element) return 0;
    return element.offsetWidth;
  },

  // Полная высота с border
  outerHeight(element) {
    if (!element) return 0;
    return element.offsetHeight;
  },

  // getBoundingClientRect обёрнутый
  rect(element) {
    if (!element) return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
    const r = element.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, x: r.x, y: r.y };
  },

  // Скролл сверху
  scrollTop(element = window) {
    if (element === window) return window.scrollY;
    return element.scrollTop;
  },

  // Скролл слева
  scrollLeft(element = window) {
    if (element === window) return window.scrollX;
    return element.scrollLeft;
  },

  // Скролл к координатам
  scrollTo(element, x, y) {
    if (element) element.scrollTo(x, y);
  },

  // Скролл к элементу
  scrollIntoView(element, options = { behavior: 'smooth', block: 'start' }) {
    if (element) element.scrollIntoView(options);
  },

  // Полностью виден в viewport
  isScrolledIntoView(element) {
    if (!element) return false;
    const r = element.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  },

  // Частично виден в viewport
  isPartiallyVisible(element) {
    if (!element) return false;
    const r = element.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  },

  // Ближайший родитель по селектору
  parent(element, selector) {
    if (!element) return null;
    return element.closest(selector);
  },

  // Все предки по селектору
  parents(element, selector) {
    if (!element) return [];
    const result = [];
    let node = element.parentNode;
    while (node) {
      if (node.matches && node.matches(selector)) result.push(node);
      node = node.parentNode;
    }
    return result;
  },

  // Проверка: содержит ли parent элемент child
  contains(parent, child) {
    if (!parent || !child) return false;
    return parent !== child && parent.contains(child);
  },

  // Проверка: является ли child потомком parent
  isChildOf(child, parent) {
    if (!child || !parent) return false;
    return parent.contains(child);
  },

  // Поиск по data-атрибуту
  findByData(key, value, context = document) {
    return context.querySelector(`[data-${key}="${value}"]`) || null;
  },

  // Поиск всех по data-атрибуту
  findAllByData(key, value, context = document) {
    return Array.from(context.querySelectorAll(`[data-${key}="${value}"]`));
  },

  // Создание текстового узла
  textNode(text) {
    return document.createTextNode(text);
  },

  // Создание DocumentFragment
  fragment() {
    return document.createDocumentFragment();
  },

  // Создание из HTML-строки
  fromHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.cloneNode(true);
  },

  // Ближайший scrollable-родитель
  getScrollParent(element) {
    if (!element) return document.scrollingElement || document.body;
    let node = element.parentNode;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/auto|scroll/.test(style.overflowY) || /auto|scroll/.test(style.overflowX)) {
        return node;
      }
      node = node.parentNode;
    }
    return document.scrollingElement || document.body;
  },

  // Делегирование событий
  delegate(context, eventType, selector, handler) {
  if (!context || typeof handler !== 'function') {
    return function() {};
  }

  const listener = function(event) {
    const source =
      event.target instanceof Element
        ? event.target
        : event.target?.parentElement;

    if (!source) return;

    const target = source.closest(selector);

    if (
      target &&
      (
        context === document ||
        context === target ||
        context.contains(target)
      )
    ) {
      handler.call(target, event);
    }
  };

  context.addEventListener(eventType, listener);

  return function() {
    context.removeEventListener(eventType, listener);
  };
},

  // Плавное появление
  fadeIn(element, duration = 200) {
    if (!element) return;
    element.style.opacity = '0';
    element.style.display = '';
    requestAnimationFrame(() => {
      element.style.transition = `opacity ${duration}ms`;
      requestAnimationFrame(() => {
        element.style.opacity = '1';
        setTimeout(() => {
          element.style.transition = '';
        }, duration);
      });
    });
  },

  // Плавное исчезновение
  fadeOut(element, duration = 200, callback) {
    if (!element) return;
    element.style.transition = `opacity ${duration}ms`;
    element.style.opacity = '0';
    setTimeout(() => {
      element.style.display = 'none';
      element.style.transition = '';
      if (typeof callback === 'function') callback();
    }, duration);
  },

  // Установка атрибута hidden
  setHidden(element, hidden = true) {
    if (!element) return;
    if (hidden) {
      element.setAttribute('hidden', '');
    } else {
      element.removeAttribute('hidden');
    }
  },

  // Переключение атрибута hidden
  toggleHidden(element) {
    if (!element) return;
    if (element.hasAttribute('hidden')) {
      element.removeAttribute('hidden');
    } else {
      element.setAttribute('hidden', '');
    }
  },

  // Установка data-state
  setState(element, state) {
    if (element) element.setAttribute('data-state', state);
  },

  // Получение data-state
  getState(element) {
    if (!element) return null;
    return element.getAttribute('data-state');
  },

  // Загрузка изображения через Promise
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load image: ' + src));
      img.src = src;
    });
  }
};

/* ============ РАЗДЕЛ 3: РАБОТА С ХРАНИЛИЩЕМ (Utils.storage) ============ */

Utils.storage = {
  _memory: {},
  _available: null,
  _listeners: {},
  _lastError: null,

  // Проверка доступности localStorage
  isAvailable() {
    if (this._available !== null) return this._available;
    try {
      const k = '__qa_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      this._available = true;
    } catch (e) {
      this._available = false;
    }
    return this._available;
  },

  // Получение значения
  get(key, defaultValue = null) {
    if (!this.isAvailable()) {
      return key in this._memory ? this._memory[key] : defaultValue;
    }
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? defaultValue : JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  },

  // Установка значения
  set(key, value) {
  this._lastError = null;

  if (!this.isAvailable()) {
    this._memory[key] = value;
    return true;
  }

  try {
    const serialized = JSON.stringify(value);

    if (serialized === undefined) {
      throw new TypeError(
        'Значение невозможно преобразовать в JSON'
      );
    }

    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    this._lastError = error;
    console.warn(
      'Не удалось записать данные в localStorage',
      error
    );
    return false;
  }
},

  // Удаление значения
  remove(key) {
    if (!this.isAvailable()) {
      delete this._memory[key];
      return;
    }
    localStorage.removeItem(key);
  },

  // Проверка существования
  exists(key) {
    if (!this.isAvailable()) {
      return key in this._memory;
    }
    return localStorage.getItem(key) !== null;
  },

  // Очистка по префиксу
  clear(prefix = 'qa_portfolio_') {
    if (!this.isAvailable()) {
      Object.keys(this._memory).filter(k => k.startsWith(prefix)).forEach(k => delete this._memory[k]);
      return;
    }
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
  },

  // Список ключей по префиксу
  keys(prefix = 'qa_portfolio_') {
    if (!this.isAvailable()) {
      return Object.keys(this._memory).filter(k => k.startsWith(prefix));
    }
    return Object.keys(localStorage).filter(k => k.startsWith(prefix));
  },

  // Размер хранилища в байтах
  size() {
    if (!this.isAvailable()) {
      return JSON.stringify(this._memory).length;
    }
    return Object.keys(localStorage).reduce((sum, k) => {
      return sum + (localStorage.getItem(k) || '').length + k.length;
    }, 0);
  },

  // Размер в КБ
  sizeKB() {
    return this.size() / 1024;
  },

  // Размер в МБ
  sizeMB() {
    return this.size() / (1024 * 1024);
  },

  // Проверка превышения квоты
  isQuotaExceeded() {
    return this.sizeMB() >= Utils.constants.LIMITS.STORAGE_CRITICAL_MB;
  },

  // Безопасная запись с проверкой квоты
  safeSet(key, value) {
  const success = this.set(key, value);

  if (success) {
    return { success: true };
  }

  const error = this._lastError;

  const isQuotaError =
    error &&
    (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014
    );

  return {
    success: false,
    error: isQuotaError ? 'quota' : 'write',
    message: isQuotaError
      ? 'Хранилище переполнено'
      : error?.message || 'Не удалось сохранить данные'
  };
},

  // Экспорт всех данных приложения
  exportAll() {
    const result = {};
    const keys = this.keys();
    keys.forEach(k => {
      result[k] = this.get(k);
    });
    result.meta = {
      version: Utils.constants.APP_VERSION,
      exportedAt: new Date().toISOString()
    };
    return result;
  },

  // Импорт данных
  importAll(data, options = { merge: false }) {
    if (!data) return { success: false, error: 'no data' };
    if (!options.merge) {
      this.clear();
    }
    let count = 0;
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'meta') {
        this.set(k, v);
        count++;
      }
    }
    return { success: true, imported: count };
  },

  // Оценка размера значения в символах
  estimateSize(value) {
    return JSON.stringify(value).length;
  },

 // Преобразование короткого имени в ключ localStorage.
// Например: progress -> qa_portfolio_progress
_resolveKey(key) {
  if (!key) return key;

  const storageKeys =
    Utils.constants &&
    Utils.constants.STORAGE_KEYS
      ? Utils.constants.STORAGE_KEYS
      : {};

  // Если уже передан полный ключ localStorage,
  // оставляем его без изменений.
  const values = Object.values(storageKeys);

  if (values.includes(key)) {
    return key;
  }

  // progress -> PROGRESS
  // portfolioItems -> PORTFOLIO_ITEMS
  // sidebar-collapsed -> SIDEBAR_COLLAPSED
  const constantName = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toUpperCase();

  return storageKeys[constantName] || key;
},

// Получение всего объекта или вложенного значения
getSub(key, path, defaultValue = null) {
  const storageKey = this._resolveKey(key);

  const hasPath =
    path !== undefined &&
    path !== null &&
    path !== '';

  // Если путь не передан, возвращаем всё сохранённое значение.
  // Пример: getSub('progress')
  if (!hasPath) {
    return this.get(storageKey, defaultValue);
  }

  const data = this.get(storageKey, {});

  const parts = Array.isArray(path)
    ? path
    : String(path).split('.').filter(Boolean);

  if (parts.length === 0) {
    return data;
  }

  let current = data;

  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      return defaultValue;
    }

    current = current[part];
  }

  return current === undefined
    ? defaultValue
    : current;
},

// Сохранение всего объекта или вложенного значения
setSub(key, path, value) {
  const storageKey = this._resolveKey(key);
  

  // Если переданы только два аргумента,
  // второй аргумент является всем сохраняемым значением.
  //
  // Пример:
  // setSub('pomodoro', stored)
  if (arguments.length === 2) {
    return this.set(storageKey, path);
  }

  // Если путь пустой, сохраняем значение целиком.
  if (
    path === undefined ||
    path === null ||
    path === ''
  ) {
    return this.set(storageKey, value);
  }

  let data = this.get(storageKey, {});

  if (
    data === null ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    data = {};
  }

  const parts = Array.isArray(path)
    ? path
    : String(path).split('.').filter(Boolean);

  if (parts.length === 0) {
    return this.set(storageKey, value);
  }

  let current = data;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (
      current[part] === undefined ||
      current[part] === null ||
      typeof current[part] !== 'object' ||
      Array.isArray(current[part])
    ) {
      current[part] = {};
    }

    current = current[part];
  }

  current[parts[parts.length - 1]] = value;

  return this.set(storageKey, data);
},

  // Подписка на изменения ключа
  subscribe(key, callback) {
  if (typeof callback !== 'function') {
    return function() {};
  }

  const storageKey = this._resolveKey(key);

  this._listeners[storageKey] =
    this._listeners[storageKey] || [];

  this._listeners[storageKey].push(callback);

  return () => {
    this._listeners[storageKey] =
      (this._listeners[storageKey] || [])
        .filter(item => item !== callback);
  };
},

notify(key, value) {
  const storageKey = this._resolveKey(key);

  (this._listeners[storageKey] || []).forEach(callback => {
    try {
      callback(value);
    } catch (error) {
      console.error(
        'Ошибка обработчика изменения хранилища',
        error
      );
    }
  });
},

  // Запись с уведомлением подписчиков
  setNotify(key, value) {
    const storageKey = this._resolveKey(key);
    const success = this.set(storageKey, value);

  if (success) {
    this.notify(storageKey, value);
    }


    return success;
  }
};

/* ============ РАЗДЕЛ 4: ФОРМАТИРОВАНИЕ (Utils.format) ============ */

// Месяцы на русском
const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const RU_DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

Utils.format = {
  // Форматирование даты по токенам
  formatDate(date, format = 'DD.MM.YYYY') {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const tokens = {
      'YYYY': d.getFullYear(),
      'YY': String(d.getFullYear()).slice(-2),
      'MM': pad(d.getMonth() + 1),
      'DD': pad(d.getDate()),
      'HH': pad(d.getHours()),
      'mm': pad(d.getMinutes()),
      'ss': pad(d.getSeconds())
    };
    let result = format;
    for (const [token, val] of Object.entries(tokens)) {
      result = result.replace(token, val);
    }
    return result;
  },

  // Дата на русском: «10 сентября 2026»
  formatDateRu(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  },

  // Дата и время: «10.09.2026, 16:05»
  formatDateTime(date, withSeconds = false) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const base = Utils.format.formatDate(d, 'DD.MM.YYYY');
    const time = withSeconds
      ? Utils.format.formatDate(d, 'HH:mm:ss')
      : Utils.format.formatDate(d, 'HH:mm');
    return `${base}, ${time}`;
  },

  // Только время: «16:05»
  formatTime(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return Utils.format.formatDate(d, 'HH:mm');
  },

  // Время (алиас)
  formatTimeRu(date) {
    return Utils.format.formatTime(date);
  },

  // Относительная дата: «только что», «5 минут назад»
  formatRelative(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      return `${mins} ${Utils.format.pluralize(mins, ['минуту', 'минуты', 'минут'])} назад`;
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours} ${Utils.format.pluralize(hours, ['час', 'часа', 'часов'])} назад`;
    }
    if (diff < 172800) return 'вчера';
    if (diff < 604800) {
      const days = Math.floor(diff / 86400);
      return `${days} ${Utils.format.pluralize(days, ['день', 'дня', 'дней'])} назад`;
    }
    return Utils.format.formatDateRu(d);
  },

  // Длительность: «25:00» или «1:25:00»
  formatDuration(seconds) {
    seconds = Math.floor(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  },

  // Длительность на русском: «1 ч 25 мин»
  formatDurationRu(seconds) {
    seconds = Math.floor(seconds);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h} ч`);
    if (m > 0) parts.push(`${m} мин`);
    if (s > 0 && h === 0) parts.push(`${s} сек`);
    return parts.length ? parts.join(' ') : '0 сек';
  },

  // Короткая дата: «10 сен»
  formatShortDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear() === new Date().getFullYear() ? '' : ' ' + d.getFullYear();
    return `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()]}${year}`;
  },

  // Месяц и год: «сентябрь 2026»
  formatMonthYear(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return `${RU_MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`;
  },

  // День недели: «четверг»
  formatDayName(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return RU_DAYS[d.getDay()];
  },

  // Диапазон недели: «7 – 13 сентября 2026»
  formatWeekRange(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sameMonth = monday.getMonth() === sunday.getMonth();
    const sameYear = monday.getFullYear() === sunday.getFullYear();
    if (sameMonth) {
      return `${monday.getDate()} \u2013 ${sunday.getDate()} ${RU_MONTHS[monday.getMonth()]} ${monday.getFullYear()}`;
    }
    if (sameYear) {
      return `${monday.getDate()} ${RU_MONTHS_SHORT[monday.getMonth()]} \u2013 ${sunday.getDate()} ${RU_MONTHS_SHORT[sunday.getMonth()]} ${monday.getFullYear()}`;
    }
    return `${Utils.format.formatShortDate(monday)} \u2013 ${Utils.format.formatShortDate(sunday)}`;
  },

  // Число с разделителями: 1 234 567
  formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  },

  // Процент: «87.5%»
  formatPercent(n, decimals = 0) {
    if (isNaN(n)) return '0%';
    const factor = Math.pow(10, decimals);
    const val = Math.round(n * factor * 100) / (factor * 100);
    return (decimals > 0 ? val.toFixed(decimals) : Math.round(val)) + '%';
  },

  // Размер файла: «1.5 МБ»
  formatFileSize(bytes) {
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 Б';
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' ГБ';
  },

  // Компактное число: «1.2K»
  formatCompact(n) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    if (n < 1000) return String(n);
    if (n < 1000000) return (n / 1000).toFixed(1) + 'K';
    if (n < 1000000000) return (n / 1000000).toFixed(1) + 'M';
    return (n / 1000000000).toFixed(1) + 'B';
  },

  // Порядковое число: «1-й»
  formatOrdinal(n) {
    return n + '-й';
  },

  // Обрезка строки с учётом границ слов
  truncate(str, length, suffix = '\u2026') {
    if (!str || str.length <= length) return str;
    let cut = str.slice(0, length);
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > length * 0.7) cut = cut.slice(0, lastSpace);
    return cut + suffix;
  },

  // Обрезка по количеству слов
  truncateWords(str, wordCount) {
    if (!str) return str;
    const words = str.split(/\s+/);
    if (words.length <= wordCount) return str;
    return words.slice(0, wordCount).join(' ') + '\u2026';
  },

  // Первая буква заглавная
  capitalize(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Каждое слово с большой буквы
  capitalizeWords(str) {
    if (!str) return str;
    return str.split(/\s+/).map(w => Utils.format.capitalize(w)).join(' ');
  },

  // Первая буква строчная
  lowerFirst(str) {
    if (!str) return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  },

  // kebab-case → camelCase
  camelCase(str) {
    if (!str) return str;
    return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
  },

  // camelCase → kebab-case
  kebabCase(str) {
    if (!str) return str;
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase();
  },

  // → snake_case
  snakeCase(str) {
    if (!str) return str;
    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase();
  },

  // → PascalCase
  pascalCase(str) {
    if (!str) return str;
    const camel = Utils.format.camelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  },

  // Title Case
  titleCase(str) {
    if (!str) return str;
    return str.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  },

  // Транслитерация и slugify
  slugify(str) {
    if (!str) return '';
    const map = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    let result = str.toLowerCase();
    for (const [ru, en] of Object.entries(map)) {
      result = result.replace(new RegExp(ru, 'g'), en);
    }
    result = result.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return result;
  },

  // Удаление всех HTML-тегов
  stripHtml(str) {
    if (!str) return str;
    return str.replace(/<[^>]*>/g, '');
  },

  // Удаление тегов кроме разрешённых
  stripTags(str, allowed = '') {
    if (!str) return str;
    const allowedTags = allowed.split(',').map(t => t.trim().toLowerCase());
    return str.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
      if (allowedTags.includes(tag.toLowerCase())) return match;
      return '';
    });
  },

  // Экранирование HTML
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Разэкранирование HTML
  unescapeHtml(str) {
    if (!str) return str;
    return String(str)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  },

  // Экранирование для атрибутов
  escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  // Экранирование регулярных выражений
  escapeRegex(str) {
    if (!str) return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  // Дополнение слева
  pad(str, length, char = '0') {
    str = String(str);
    if (str.length >= length) return str;
    return char.repeat(length - str.length) + str;
  },

  // Дополнение справа
  padEnd(str, length, char = ' ') {
    str = String(str);
    if (str.length >= length) return str;
    return str + char.repeat(length - str.length);
  },

  // Повторение строки
  repeat(str, n) {
    return String(str).repeat(n);
  },

  // Разворот строки
  reverse(str) {
    if (!str) return str;
    return str.split('').reverse().join('');
  },

  // Количество вхождений подстроки
  count(str, substring) {
    if (!str || !substring) return 0;
    return str.split(substring).length - 1;
  },

  // Количество слов
  countWords(str) {
  if (str === null || str === undefined) {
    return 0;
  }

  const normalized = String(str).trim();

  return normalized ? normalized.split(/\s+/).length : 0;
},

  // Количество строк
  countLines(str) {
    if (!str) return 0;
    return str.split('\n').length;
  },

  // Количество символов
  countChars(str, includeSpaces = true) {
    if (!str) return 0;
    return includeSpaces ? str.length : str.replace(/\s/g, '').length;
  },

  // Подсветка вхождений query в <mark>
  highlight(str, query, tag = 'mark') {
    if (!str || !query) return Utils.format.escapeHtml(str);
    const escaped = Utils.format.escapeHtml(str);
    const escapedQuery = Utils.format.escapeRegex(Utils.format.escapeHtml(query));
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escaped.replace(regex, `<${tag}>$1</${tag}>`);
  },

  // Инициалы: «Иван Иванов» → «ИИ»
  initials(str) {
    if (!str) return '';
    const words = str.trim().split(/\s+/);
    return words.map(w => w.charAt(0).toUpperCase()).join('').slice(0, 3);
  },

  // Русская плюрализация
  pluralize(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
  },

  // «5 модулей»
  formatPlural(n, forms) {
    return n + ' ' + Utils.format.pluralize(n, forms);
  },

  // Форматирование JSON
  formatJSON(obj, indent = 2) {
    return JSON.stringify(obj, null, indent);
  },

  // Минификация JSON
  minifyJSON(obj) {
    return JSON.stringify(obj);
  },

  // Преобразование JSON-строки в форматированную
  prettifyJSON(str) {
    return JSON.stringify(JSON.parse(str), null, 2);
  },

  // Безопасный парсинг JSON
  parseJSON(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return defaultValue;
    }
  },

  // Base64 кодирование
  encodeBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  },

  // Base64 декодирование
  decodeBase64(str) {
    return decodeURIComponent(escape(atob(str)));
  },

  // Base64 для JSON-объекта
  encodeBase64JSON(obj) {
    return Utils.format.encodeBase64(JSON.stringify(obj));
  },

  // Декодирование Base64 в JSON
  decodeBase64JSON(str) {
    return JSON.parse(Utils.format.decodeBase64(str));
  },

  // Data URI
  toDataURI(content, mimeType = 'application/json') {
    return `data:${mimeType};charset=utf-8,` + encodeURIComponent(content);
  },

  // Blob URI
  toBlobURI(content, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    return URL.createObjectURL(blob);
  },

  // Удаление markdown-разметки
  toPlainText(str) {
    if (!str) return str;
    return str
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/$$(.+?)$$$.+?$/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '');
  }
};

/* ============ РАЗДЕЛ 5: ВАЛИДАЦИЯ (Utils.validate) ============ */

Utils.validate = {
  // Проверки типов
  isString(v) { return typeof v === 'string'; },
  isNumber(v) {return typeof v === 'number' && Number.isFinite(v);},
  isBoolean(v) { return typeof v === 'boolean'; },
  isFunction(v) { return typeof v === 'function'; },
  isObject(v) { return typeof v === 'object' && v !== null && !Array.isArray(v); },
  isArray(v) { return Array.isArray(v); },
  isNull(v) { return v === null; },
  isUndefined(v) { return typeof v === 'undefined'; },
  isNil(v) { return v == null; },
  isDate(v) { return v instanceof Date && !isNaN(v.getTime()); },
  isRegExp(v) { return v instanceof RegExp; },
  isPromise(v) { return v !== null && v !== undefined && typeof v.then === 'function'; },

  // Проверка на пустоту
  isEmpty(v) {
    if (v === null || v === undefined) return true;
    if (v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    if (typeof v === 'object' && Object.keys(v).length === 0) return true;
    return false;
  },

  isNotEmpty(v) { return !Utils.validate.isEmpty(v); },

  // Проверки чисел
  isInt(v) {return Number.isInteger(v);},
  isFloat(v) {return Number.isFinite(v) && !Number.isInteger(v);},
  isPositive(v) { return Utils.validate.isNumber(v) && v > 0; },
  isNegative(v) { return Utils.validate.isNumber(v) && v < 0; },
  isZero(v) { return v === 0; },
  isInRange(v, min, max) { return Utils.validate.isNumber(v) && v >= min && v <= max; },
  isBetween(v, min, max, inclusive = true) {
  if (
    !Number.isFinite(v) ||
    !Number.isFinite(min) ||
    !Number.isFinite(max)
  ) {
    return false;
  }

  return inclusive
    ? v >= min && v <= max
    : v > min && v < max;
},
  isEven(v) {return Number.isInteger(v) && v % 2 === 0;},
  isOdd(v) {return Number.isInteger(v) && Math.abs(v % 2) === 1;},

  // Проверки строк
  isEmail(str) {
    if (!str) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  },

  isUrl(str) {
    if (!str) return false;
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(str);
  },

  isHttpsUrl(str) {
    return Utils.validate.isUrl(str) && str.startsWith('https://');
  },

  isIPv4(str) {
    if (!str) return false;
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(str) && str.split('.').every(n => n >= 0 && n <= 255);
  },

  isAlpha(str) {
    if (!str) return false;
    return /^[a-zA-Z]+$/.test(str);
  },

  isAlphaRu(str) {
    if (!str) return false;
    return /^[a-zA-Zа-яА-ЯёЁ]+$/.test(str);
  },

  isAlphaNumeric(str) {
    if (str === null || str === undefined) return false;
    return /^[a-zA-Z0-9]+$/.test(str);
  },

  isAlphaNumericRu(str) {
    if (str === null || str === undefined) return false;
    return /^[a-zA-Z0-9а-яА-ЯёЁ]+$/.test(str);
  },

  isNumeric(str) {
    if (str === null || str === undefined) return false;
    return /^[0-9]+$/.test(str);
  },

  isHexColor(str) {
    if (!str) return false;
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(str);
  },

  isUUID(str) {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  },

  isBase64(str) {
    if (!str) return false;
    try { atob(str); return true; } catch (e) { return false; }
  },

  isJSON(str) {
    if (!str) return false;
    try { JSON.parse(str); return true; } catch (e) { return false; }
  },

  isDateString(str) {
    if (!str) return false;
    return !isNaN(Date.parse(str));
  },

  // Проверки длин
  minLength(str, n) { return str !== null && str !== undefined && str.length >= n; },
  maxLength(str, n) { return str !== null && str !== undefined && str.length <= n; },
  exactLength(str, n) { return str !== null && str !== undefined && str.length === n; },
  inRange(str, min, max) { return str !== null && str !== undefined && str.length >= min && str.length <= max; },

  // Проверки содержимого
  contains(str, substring) { return str ? str.includes(substring) : false; },
  containsAny(str, substrings) { return str ? substrings.some(s => str.includes(s)) : false; },
  containsAll(str, substrings) { return str ? substrings.every(s => str.includes(s)) : false; },
  startsWith(str, prefix) { return str ? str.startsWith(prefix) : false; },
  endsWith(str, suffix) { return str ? str.endsWith(suffix) : false; },
  matches(str, regex) { return str ? regex.test(str) : false; },
  hasUpperCase(str) { return str ? /[A-ZА-ЯЁ]/.test(str) : false; },
  hasLowerCase(str) { return str ? /[a-zа-яё]/.test(str) : false; },
  hasNumber(str) { return str ? /[0-9]/.test(str) : false; },
  hasSpecialChar(str) { return str ? /[^a-zA-Z0-9а-яА-ЯёЁ]/.test(str) : false; },
  hasSpace(str) { return str ? /\s/.test(str) : false; },
  isWhitespace(str) { return str ? /^\s*$/.test(str) : false; },
  isPrintable(str) { return str ? /^[ -~]+$/.test(str) : false; },

  // Валидация одного поля по правилам
  validateField(value, rules) {
    const errors = [];
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    errors.push(rule.message || 'Поле обязательно');
  }
  break;
        case 'minLength':
          if (value && value.length < rule.value) errors.push(rule.message || `Минимум ${rule.value} символов`);
          break;
        case 'maxLength':
          if (value && value.length > rule.value) errors.push(rule.message || `Максимум ${rule.value} символов`);
          break;
        case 'range':
          if (value && (value.length < rule.min || value.length > rule.max))
            errors.push(rule.message || `От ${rule.min} до ${rule.max} символов`);
          break;
        case 'email':
          if (value && !Utils.validate.isEmail(value)) errors.push(rule.message || 'Некорректный email');
          break;
        case 'url':
          if (value && !Utils.validate.isUrl(value)) errors.push(rule.message || 'Некорректный URL');
          break;
        case 'number':
          if (value !== '' && value !== null && !Utils.validate.isNumber(Number(value)))
            errors.push(rule.message || 'Должно быть числом');
          break;
        case 'integer':
          if (value !== '' && value !== null && !Utils.validate.isInt(Number(value)))
            errors.push(rule.message || 'Должно быть целым числом');
          break;
        case 'positive': {
  if (hasValue) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      errors.push(
        rule.message || 'Должно быть положительным числом'
      );
    }
  }
  break;
}
        case 'negative':
          if (value !== '' && value !== null && Number(value) >= 0)
            errors.push(rule.message || 'Должно быть отрицательным');
          break;
        case 'pattern':
          if (value && !new RegExp(rule.value).test(value))
            errors.push(rule.message || 'Некорректный формат');
          break;
        case 'custom':
          if (typeof rule.value === 'function' && !rule.value(value))
            errors.push(rule.message || 'Некорректное значение');
          break;
      }
    }
    return { valid: errors.length === 0, errors };
  },

  // Валидация формы по схеме
  validateForm(data, schema) {
    const errors = {};
    let valid = true;
    for (const [field, rules] of Object.entries(schema)) {
      const result = Utils.validate.validateField(data[field], rules);
      if (!result.valid) {
        errors[field] = result.errors;
        valid = false;
      }
    }
    return { valid, errors };
  }
};

/* ============ РАЗДЕЛ 6: СОБЫТИЯ (Utils.event) ============ */

Utils.event = {
  // Debounce — откладывает вызов
  debounce(fn, delay = 300) {
    let timer = null;
    const debounced = function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
    debounced.cancel = function() { clearTimeout(timer); };
    debounced.flush = function(...args) {
      clearTimeout(timer);
      fn.apply(this, args);
    };
    return debounced;
  },

  // Throttle — не чаще limit ms
  throttle(fn, limit = 100) {
    let inThrottle = false;
    let lastArgs = null;
    const throttled = function(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          if (lastArgs) {
            fn.apply(this, lastArgs);
            lastArgs = null;
          }
        }, limit);
      } else {
        lastArgs = args;
      }
    };
    throttled.cancel = function() { inThrottle = false; lastArgs = null; };
    return throttled;
  },

  // Once — вызывает fn один раз
  once(fn) {
    let called = false;
    let result = null;
    return function(...args) {
      if (!called) {
        called = true;
        result = fn.apply(this, args);
      }
      return result;
    };
  },

  // Делегирование событий
  delegate(context, eventType, selector, handler) {
    const listener = function(e) {
      const target = e.target.closest(selector);
      if (target && context.contains(target)) {
        handler.call(target, e);
      }
    };
    context.addEventListener(eventType, listener);
    return function() { context.removeEventListener(eventType, listener); };
  },

  // Делегирование на document
  on(eventType, selector, handler) {
    return Utils.event.delegate(document, eventType, selector, handler);
  },

  // addEventListener с возвратом функции отписки
  listen(element, eventType, handler, options) {
    if (!element) return function() {};
    element.addEventListener(eventType, handler, options);
    return function() { element.removeEventListener(eventType, handler, options); };
  },

  // Несколько событий на один элемент
  listenAll(element, eventTypes, handler) {
    if (!element) return function() {};
    eventTypes.forEach(type => element.addEventListener(type, handler));
    return function() { eventTypes.forEach(type => element.removeEventListener(type, handler)); };
  },

  // Кастомное событие
  emit(element, eventType, detail = {}) {
    if (!element) return;
    element.dispatchEvent(new CustomEvent(eventType, { detail, bubbles: true }));
  },

  // Прослушивание CustomEvent
  onCustom(element, eventType, handler) {
    if (!element) return function() {};
    element.addEventListener(eventType, handler);
    return function() { element.removeEventListener(eventType, handler); };
  },

  // Trigger native event
  trigger(element, eventType) {
    if (!element) return;
    element.dispatchEvent(new Event(eventType, { bubbles: true }));
  },

  // Защита от двойного сабмита
  guardAgainstDoubleSubmit(element, timeout = 1000) {
    if (!element) return;
    element.addEventListener('click', function() {
      element.disabled = true;
      setTimeout(() => { element.disabled = false; }, timeout);
    });
  },

  // Очередь событий (последовательное выполнение)
  queue() {
    const items = [];
    let running = false;
    async function run() {
      if (running) return;
      running = true;
      while (items.length > 0) {
        const { fn, resolve, reject } = items.shift();
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      }
      running = false;
    }
    return {
      add(fn) {
        return new Promise((resolve, reject) => {
          items.push({ fn, resolve, reject });
          run();
        });
      },
      size() { return items.length; },
      pending() { return running; },
      clear(reason = new Error('Очередь очищена')) {
  const removed = items.splice(0);

  removed.forEach(item => {
    item.reject(reason);
  });
}
    };
  },

  // Ожидание события
  waitFor(element, eventType, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (!element) { reject(new Error('No element')); return; }
      const timer = setTimeout(() => {
        element.removeEventListener(eventType, handler);
        reject(new Error('Timeout waiting for ' + eventType));
      }, timeout);
      function handler(e) {
        clearTimeout(timer);
        element.removeEventListener(eventType, handler);
        resolve(e);
      }
      element.addEventListener(eventType, handler);
    });
  }
};

/* ============ РАЗДЕЛ 7: ПРОЧИЕ УТИЛИТЫ (Utils.misc) ============ */

Utils.misc = {
  // Глубокое клонирование
  deepClone(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
    if (Array.isArray(obj)) return obj.map(item => Utils.misc.deepClone(item));
    const clone = {};
    for (const [key, val] of Object.entries(obj)) {
      clone[key] = Utils.misc.deepClone(val);
    }
    return clone;
  },

  // Поверхностное клонирование
  clone(obj) {
    if (Array.isArray(obj)) return [...obj];
    if (obj !== null && typeof obj === 'object') return { ...obj };
    return obj;
  },

  // Глубокое слияние объектов
  merge(target, ...sources) {
    if (!target || typeof target !== 'object') target = {};
    for (const source of sources) {
      if (!source || typeof source !== 'object') continue;
      for (const [key, val] of Object.entries(source)) {
        if (
        key === '__proto__' ||
        key === 'prototype' ||
        key === 'constructor'
        ) {
          continue;
        }
        if (val === null || val === undefined) continue;
        if (Array.isArray(val)) {
          target[key] = [...val];
        } else if (typeof val === 'object' && typeof target[key] === 'object') {
          target[key] = Utils.misc.merge(target[key] || {}, val);
        } else {
          target[key] = val;
        }
      }
    }
    return target;
  },

  // Поверхностное слияние
  mergeShallow(target, ...sources) {
    return Object.assign(target, ...sources);
  },

  // Выборка ключей
  pick(obj, keys) {
    const result = {};
    keys.forEach(k => { if (k in obj) result[k] = obj[k]; });
    return result;
  },

  // Исключение ключей
  omit(obj, keys) {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!keys.includes(k)) result[k] = v;
    }
    return result;
  },

  // Получение по пути
  getPath(obj, path, defaultValue = undefined) {
    if (obj === null || obj === undefined) return defaultValue;
    const parts = Array.isArray(path) ? path : path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return defaultValue;
      current = current[part];
    }
    return current === undefined ? defaultValue : current;
  },

  // Установка по пути
  setPath(obj, path, value) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const parts = Array.isArray(path)
    ? path.map(String)
    : String(path).split('.').filter(Boolean);

  if (
    parts.length === 0 ||
    parts.some(part => forbiddenPathKeys.has(part))
  ) {
    return false;
  }

  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    if (
      current[part] === null ||
      typeof current[part] !== 'object' ||
      Array.isArray(current[part])
    ) {
      current[part] = {};
    }

    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
  return true;
},

  // Уникальные элементы массива
  unique(arr) {
    return [...new Set(arr)];
  },

  // Уникальные по ключу
  uniqueBy(arr, key) {
    const seen = new Set();
    return arr.filter(item => {
      const val = Utils.misc.getPath(item, key);
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  },

  // Разбиение массива на части
  chunk(arr, size) {
  if (!Array.isArray(arr)) {
    throw new TypeError('arr должен быть массивом');
  }

  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(
      'size должен быть целым числом больше 0'
    );
  }

  const result = [];

  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }

  return result;
},

  // Flatten
  flatten(arr, depth = Infinity) {
    return arr.flat(depth);
  },

  // Диапазон чисел
  range(start, end, step = 1) {
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(step)
  ) {
    throw new TypeError(
      'start, end и step должны быть конечными числами'
    );
  }

  if (step === 0) {
    throw new RangeError('step не может быть равен 0');
  }

  const result = [];

  if (step > 0) {
    for (let i = start; i <= end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i >= end; i += step) {
      result.push(i);
    }
  }

  return result;
},

  // Сумма
  sum(arr) { return arr.reduce((a, b) => a + (Number(b) || 0), 0); },

  // Среднее
  avg(arr) { return arr.length ? Utils.misc.sum(arr) / arr.length : 0; },

  // Минимум
  min(arr) { return arr.length ? Math.min(...arr) : 0; },

  // Максимум
  max(arr) { return arr.length ? Math.max(...arr) : 0; },

  // Медиана
  median(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  },

  // Мода
  mode(arr) {
    if (!arr.length) return null;
    const counts = {};
    arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    let maxCount = 0;
    let result = null;
    for (const [val, count] of Object.entries(counts)) {
      if (count > maxCount) { maxCount = count; result = val; }
    }
    return result;
  },

  // Группировка по ключу
  groupBy(arr, key) {
    const result = {};
    arr.forEach(item => {
      const val = Utils.misc.getPath(item, key);
      const groupKey = String(val);
      if (!result[groupKey]) result[groupKey] = [];
      result[groupKey].push(item);
    });
    return result;
  },

  // Сортировка по ключу
  sortBy(arr, key, direction = 'asc') {
    return [...arr].sort((a, b) => {
      const aVal = Utils.misc.getPath(a, key);
      const bVal = Utils.misc.getPath(b, key);
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  // Разделение массива
  partition(arr, predicate) {
    return [arr.filter(predicate), arr.filter(x => !predicate(x))];
  },

  // Zip — объединение массивов
  zip(...arrays) {
  if (arrays.length === 0) {
    return [];
  }

  if (!arrays.every(Array.isArray)) {
    throw new TypeError(
      'Все аргументы zip должны быть массивами'
    );
  }

  const length = Math.min(
    ...arrays.map(array => array.length)
  );

  const result = [];

  for (let i = 0; i < length; i++) {
    result.push(arrays.map(array => array[i]));
  }

  return result;
},

  // Пересечение массивов
  intersect(arr1, arr2) {
    return arr1.filter(x => arr2.includes(x));
  },

  // Разность массивов
  difference(arr1, arr2) {
    return arr1.filter(x => !arr2.includes(x));
  },

  // Симметрическая разность
  symDifference(arr1, arr2) {
    return Utils.misc.difference(Utils.misc.union(arr1, arr2), Utils.misc.intersect(arr1, arr2));
  },

  // Объединение массивов
  union(arr1, arr2) {
    return Utils.misc.unique([...arr1, ...arr2]);
  },

  // Случайное число в диапазоне
  random(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
  },

  // Случайное целое
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Случайный элемент массива
  randomItem(arr) {
    return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  },

  // N случайных элементов
  randomItems(arr, n) {
    return Utils.misc.shuffle(arr).slice(0, n);
  },

  // Перемешивание (Fisher-Yates)
  shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  // Ограничение значения
  clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  },

  // Линейная интерполяция
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Маппинг значения в новый диапазон
  map(v, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMin;
    return (v - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
  },

  // Нормализация
  normalize(v, min, max) {
    if (max === min) return 0;
    return (v - min) / (max - min);
  },

  // Округление с десятичными
  round(v, decimals = 0) {
    const factor = Math.pow(10, decimals);
    return Math.round(v * factor) / factor;
  },

  // Повтор с задержкой
  async retry(fn, attempts = 3, delay = 1000) {
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        if (i < attempts - 1) await Utils.misc.sleep(delay);
      }
    }
    throw lastError;
  },

  // Задержка
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Polling до условия
  waitFor(predicate, timeout = 5000, interval = 100) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      function check() {
        if (predicate()) { resolve(); return; }
        if (Date.now() - start >= timeout) { reject(new Error('Timeout')); return; }
        setTimeout(check, interval);
      }
      check();
    });
  },

  // Мемоизация
  memoize(fn) {
    const cache = new Map();
    const memoized = function(...args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = fn.apply(this, args);
      cache.set(key, result);
      return result;
    };
    memoized.cache = cache;
    memoized.clear = function() { cache.clear(); };
    return memoized;
  },

  // Алиас к throttle
  throttle(fn, limit) { return Utils.event.throttle(fn, limit); },

  // Алиас к debounce
  debounce(fn, delay) { return Utils.event.debounce(fn, delay); },

  // Делегирование проверок типов
  isObject(v) { return Utils.validate.isObject(v); },
  isArray(v) { return Utils.validate.isArray(v); },
  isFunction(v) { return Utils.validate.isFunction(v); },

  // Безопасный JSON-парсинг
  safeJSON(str, defaultValue = null) {
    try { return JSON.parse(str); } catch (e) { return defaultValue; }
  },

  // Безопасный доступ по пути
  safeGet(obj, path, defaultValue = null) {
    return Utils.misc.getPath(obj, path, defaultValue);
  },

  // Очередь async-задач
  asyncQueue() {
    const items = [];
    let running = false;
    async function run() {
      if (running) return;
      running = true;
      while (items.length > 0) {
        const { fn, resolve, reject } = items.shift();
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      }
      running = false;
    }
    return {
      add(fn) {
        return new Promise((resolve, reject) => {
          items.push({ fn, resolve, reject });
          run();
        });
      },
      size() { return items.length; },
      pending() { return running; },
      clear(reason = new Error('Очередь очищена')) {
  const removed = items.splice(0);

  removed.forEach(item => {
    item.reject(reason);
  });
}
    };
  },

  // Сравнение семантических версий
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a < b) return -1;
      if (a > b) return 1;
    }
    return 0;
  },

  // Debounce для async-функций
  debouncePromise(fn, delay = 300) {
  if (typeof fn !== 'function') {
    throw new TypeError('fn должна быть функцией');
  }

  let timer = null;
  let lastArgs = [];
  let lastContext = null;
  let waiters = [];

  const debounced = function(...args) {
    lastArgs = args;
    lastContext = this;

    clearTimeout(timer);

    const promise = new Promise((resolve, reject) => {
      waiters.push({ resolve, reject });
    });

    timer = setTimeout(async () => {
      const currentWaiters = waiters;

      waiters = [];
      timer = null;

      try {
        const result = await fn.apply(
          lastContext,
          lastArgs
        );

        currentWaiters.forEach(item => {
          item.resolve(result);
        });
      } catch (error) {
        currentWaiters.forEach(item => {
          item.reject(error);
        });
      }
    }, delay);

    return promise;
  };

  debounced.cancel = function(
    reason = new Error('Отложенный вызов отменён')
  ) {
    clearTimeout(timer);
    timer = null;

    const currentWaiters = waiters;
    waiters = [];

    currentWaiters.forEach(item => {
      item.reject(reason);
    });
  };

  return debounced;
},

  // Клон с переопределениями
  templateClone(template, overrides) {
    return Utils.misc.merge(Utils.misc.deepClone(template), overrides);
  },

  // Безопасное деление
  safeDivide(a, b, defaultValue = 0) {
    return b === 0 ? defaultValue : a / b;
  },

  // Процент выполнения
  percent(current, total) {
    return total > 0 ? Math.round((current / total) * 100) : 0;
  },

  // Градусы в радианы
  deg2rad(deg) { return deg * Math.PI / 180; },

  // Радианы в градусы
  rad2deg(rad) { return rad * 180 / Math.PI; },

  // Простой хеш строки
  checksum(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  },

  // Хеш объекта
  hashObject(obj) {
    return Utils.misc.checksum(JSON.stringify(obj));
  }
};

/* ============ РАЗДЕЛ 8: ГЕНЕРАЦИЯ ИДЕНТИФИКАТОРОВ (Utils.id) ============ */

Utils.id = {
  _counter: 0,

  // UUID v4
  uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Короткий ID (8 символов)
  shortId() {
    return Math.random().toString(36).slice(2, 10);
  },

  // Последовательный числовой ID
  nextId() {
    return ++Utils.id._counter;
  },

  // Уникальный ID с префиксом
  uniqueId(prefix = 'id_') {
    return prefix + Utils.id.shortId();
  },

  // ID для DOM-элементов
  elementId(name = 'el') {
    return `qa-${name}-${Utils.id.shortId()}`;
  },

  // Timestamp-based ID
  timestampId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  // Slug из строки
  slug(str) {
    return Utils.format.slugify(str);
  },

  // Случайный цвет тега
  randomTagColor() {
  return Utils.misc.randomInt(
    1,
    Utils.constants.TAG_COLORS
  );
},

  // Случайная hex-строка
  randomHex(length) {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  },

  // Nonce (32 случайных символа)
  nonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
};

/* ============ РАЗДЕЛ 9: ОПРЕДЕЛЕНИЕ УСТРОЙСТВА (Utils.device) ============ */

Utils.device = {
  // Ширина viewport
  width() { return window.innerWidth; },

  // Высота viewport
  height() { return window.innerHeight; },

  // Текущий брейкпоинт
  breakpoint() {
    const w = window.innerWidth;
    if (w < 480) return 'xs';
    if (w < 768) return 'sm';
    if (w < 1024) return 'md';
    if (w < 1280) return 'lg';
    if (w < 1600) return 'xl';
    if (w < 1920) return '2xl';
    if (w < 2560) return '3xl';
    if (w < 3840) return '4xl';
    return '5xl';
  },

  // Проверки брейкпоинтов
  isXS() { return window.innerWidth < 480; },
  isSM() { return window.innerWidth >= 480 && window.innerWidth < 768; },
  isMD() { return window.innerWidth >= 768 && window.innerWidth < 1024; },
  isLG() { return window.innerWidth >= 1024 && window.innerWidth < 1280; },
  isXL() { return window.innerWidth >= 1280 && window.innerWidth < 1600; },
  isXXL() { return window.innerWidth >= 1600 && window.innerWidth < 1920; },
  isXXXL() { return window.innerWidth >= 1920 && window.innerWidth < 2560; },
  isQHD() { return window.innerWidth >= 2560 && window.innerWidth < 3840; },
  isUHD() { return window.innerWidth >= 3840; },

  // Категории устройств
  isMobile() { return window.innerWidth < 768; },
  isTablet() { return window.innerWidth >= 768 && window.innerWidth < 1024; },
  isDesktop() { return window.innerWidth >= 1024; },
  isLargeDesktop() { return window.innerWidth >= 1920; },

  // Ориентация
  orientation() { return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'; },
  isPortrait() { return window.innerHeight >= window.innerWidth; },
  isLandscape() { return window.innerWidth > window.innerHeight; },

  // Touch
  isTouch() {
    return 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
  },

  hasFinePointer() {
    return window.matchMedia('(pointer: fine)').matches;
  },

  hasCoarsePointer() {
    return window.matchMedia('(pointer: coarse)').matches;
  },

  // Retina/HiDPI
  isRetina() { return (window.devicePixelRatio || 1) >= 2; },
  pixelRatio() { return window.devicePixelRatio || 1; },

  // Определение ОС
  os() {
    const ua = navigator.userAgent;
    if (/Win/.test(ua)) return 'windows';
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Mac/.test(ua)) return 'macos';
    if (/Android/.test(ua)) return 'android';
    if (/Linux/.test(ua)) return 'linux';
    return 'unknown';
  },

  // Определение браузера
  browser() {
    const ua = navigator.userAgent;
    let m;
    if ((m = ua.match(/Edg\/(\d+)/))) return { name: 'edge', version: m[1] };
    if ((m = ua.match(/Chrome\/(\d+)/))) return { name: 'chrome', version: m[1] };
    if ((m = ua.match(/Firefox\/(\d+)/))) return { name: 'firefox', version: m[1] };
    if ((m = ua.match(/Safari\/(\d+)/))) {
      if (!/Chrome/.test(ua)) return { name: 'safari', version: m[1] };
    }
    return { name: 'unknown', version: '0' };
  },

  // Предпочтения темы
  prefersDark() { return window.matchMedia('(prefers-color-scheme: dark)').matches; },
  prefersLight() { return window.matchMedia('(prefers-color-scheme: light)').matches; },
  prefersReducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; },
  prefersHighContrast() { return window.matchMedia('(prefers-contrast: high)').matches; },

  // Поддержка технологий
  supportsLocalStorage() { return Utils.storage.isAvailable(); },
  supportsCanvas() { return !!document.createElement('canvas').getContext; },
  supportsWebGL() {
    try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; }
  },
  supportsResizeObserver() { return typeof ResizeObserver !== 'undefined'; },
  supportsIntersectionObserver() { return typeof IntersectionObserver !== 'undefined'; },
  supportsMatchMedia() { return typeof window.matchMedia !== 'undefined'; },
  supportsClipboard() {
    return navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
  },
  supportsShare() { return typeof navigator.share === 'function'; },
  supportsFullscreen() { return document.fullscreenEnabled || document.webkitFullscreenEnabled; },
  supportsNotification() { return typeof Notification !== 'undefined'; },
  supportsServiceWorker() { return 'serviceWorker' in navigator; },
  supportsIndexedDB() { return 'indexedDB' in window; },
  supportsFileReader() { return typeof FileReader !== 'undefined'; },
  supportsBlob() { return typeof Blob !== 'undefined'; },

  // Информация об экране
  screenWidth() { return screen.width; },
  screenHeight() { return screen.height; },
  availWidth() { return screen.availWidth; },
  availHeight() { return screen.availHeight; },
  colorDepth() { return screen.colorDepth; },
  pixelDepth() { return screen.pixelDepth; },

  // Сетевая информация
  connection() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return null;
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  },

  // Язык
  language() { return navigator.language; },
  languages() { return navigator.languages; },

  // Online/offline
  isOnline() { return navigator.onLine; },
  isOffline() { return !navigator.onLine; },

  // Подписка на resize
  onResize(callback) {
    const throttled = Utils.event.throttle(callback, Utils.constants.TIMING.THROTTLE_RESIZE);
    window.addEventListener('resize', throttled);
    return function() { window.removeEventListener('resize', throttled); };
  },

  // Подписка на изменение ориентации
  onOrientationChange(callback) {
    const handler = Utils.event.throttle(callback, Utils.constants.TIMING.THROTTLE_RESIZE);
    window.addEventListener('orientationchange', handler);
    window.addEventListener('resize', handler);
    return function() {
      window.removeEventListener('orientationchange', handler);
      window.removeEventListener('resize', handler);
    };
  },

  // Подписка на изменение темы системы
  onThemeChange(callback) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', callback);
    return function() { mq.removeEventListener('change', callback); };
  }
};

/* ============ РАЗДЕЛ 10: РАБОТА С CSS (Utils.css) ============ */

Utils.css = {
  // Получить CSS-переменную
  getVar(name, context = document.documentElement) {
    const prop = name.startsWith('--') ? name : '--' + name;
    return getComputedStyle(context).getPropertyValue(prop).trim();
  },

  // Установить CSS-переменную
  setVar(name, value, context = document.documentElement) {
    const prop = name.startsWith('--') ? name : '--' + name;
    context.style.setProperty(prop, value);
  },

  // Удалить CSS-переменную
  removeVar(name, context = document.documentElement) {
    const prop = name.startsWith('--') ? name : '--' + name;
    context.style.removeProperty(prop);
  },

  // Получить несколько переменных
  getVars(names) {
    const result = {};
    names.forEach(n => {
      const key = n.startsWith('--') ? n.slice(2) : n;
      result[key] = Utils.css.getVar(n);
    });
    return result;
  },

  // Получить текущую тему
  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  },

  // Установить тему
  setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') {
    return false;
  }

  const root = document.documentElement;

  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;

  // Оставьте это, если --color-scheme используется в вашем CSS.
  Utils.css.setVar('color-scheme', theme);

  Utils.storage.setNotify(
    Utils.constants.STORAGE_KEYS.THEME,
    theme
  );

  return true;
},

  // Переключить тему
  toggleTheme() {
    const current = Utils.css.getTheme();
    Utils.css.setTheme(current === 'dark' ? 'light' : 'dark');
    return Utils.css.getTheme();
  },

  // Системная тема
  systemTheme() {
    return Utils.device.prefersDark() ? 'dark' : 'light';
  },

  // Применить системную тему
  applySystemTheme() {
    Utils.css.setTheme(Utils.css.systemTheme());
  },

  // Сворачивание сайдбара
  setSidebarCollapsed(collapsed) {
    const wrapper = document.getElementById('app-wrapper');
    if (!wrapper) return;
    if (collapsed) {
      Utils.dom.addClass(wrapper, 'sidebar-collapsed');
    } else {
      Utils.dom.removeClass(wrapper, 'sidebar-collapsed');
    }
    Utils.storage.setNotify(Utils.constants.STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
  },

  // Компактный режим
  setCompactView(compact) {
    const ws = document.getElementById('main-content');
    if (!ws) return;
    if (compact) {
      Utils.dom.addClass(ws, 'compact-view');
    } else {
      Utils.dom.removeClass(ws, 'compact-view');
    }
    Utils.storage.setNotify(Utils.constants.STORAGE_KEYS.COMPACT_VIEW, compact);
  },

  // Режим презентации
  setPresentationMode(active) {
    const wrapper = document.getElementById('app-wrapper');
    if (!wrapper) return;
    if (active) {
      Utils.dom.addClass(wrapper, 'presentation-mode');
    } else {
      Utils.dom.removeClass(wrapper, 'presentation-mode');
    }
  },

  // Открытие сайдбара на мобильных
  setSidebarMobileOpen(open) {
    const wrapper = document.getElementById('app-wrapper');
    if (!wrapper) return;
    if (open) {
      Utils.dom.addClass(wrapper, 'sidebar-mobile-open');
    } else {
      Utils.dom.removeClass(wrapper, 'sidebar-mobile-open');
    }
  },

  // Активный брейкпоинт через matchMedia
  getActiveBreakpoint() {
    return Utils.device.breakpoint();
  },

  // Подписка на изменение брейкпоинта
  onBreakpointChange(callback) {
    let current = Utils.device.breakpoint();
    const handler = Utils.event.throttle(function() {
      const next = Utils.device.breakpoint();
      if (next !== current) {
        const old = current;
        current = next;
        callback(old, next);
      }
    }, Utils.constants.TIMING.THROTTLE_RESIZE);
    window.addEventListener('resize', handler);
    return function() { window.removeEventListener('resize', handler); };
  },

  // Проверка media query
  matches(query) {
    return window.matchMedia(query).matches;
  },

  // Парсинг px-значения
  parsePx(value) {
    if (typeof value !== 'string') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    if (value.includes('px')) return num;
    return null;
  },

  // Конвертация rem → px
  remToPx(rem) {
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return parseFloat(rem) * fontSize;
  },

  // Конвертация px → rem
  pxToRem(px) {
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return (px / fontSize) + 'rem';
  },

  // Конвертация em → px
  emToPx(em, context) {
    const el = context || document.documentElement;
    const fontSize = parseFloat(getComputedStyle(el).fontSize);
    return parseFloat(em) * fontSize;
  },

  // Анимация числового значения
  animate(from, to, duration, onUpdate, easing = 'linear') {
    return new Promise(resolve => {
      const easeFn = Utils.css.ease[easing] || Utils.css.ease.linear;
      const start = performance.now();
      function frame(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeFn(progress);
        const value = from + (to - from) * eased;
        onUpdate(progress, value);
        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  },

  // Easing-функции
  ease: {
    linear(t) { return t; },
    easeIn(t) { return t * t; },
    easeOut(t) { return t * (2 - t); },
    easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    easeInCubic(t) { return t * t * t; },
    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
    easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    easeInBack(t) { return 2.7 * t * t * t - 1.7 * t * t; },
    easeOutBack(t) { return 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2); },
    easeInOutBack(t) {
      const c1 = 1.70158;
      const c2 = c1 * 1.525;
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },
    bounce(t) {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
      if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
      t -= 2.625 / d1;
      return n1 * t * t + 0.984375;
    }
  }
};

/* ============ РАЗДЕЛ 11: ДОСТУПНОСТЬ (Utils.a11y) ============ */

Utils.a11y = {
  _liveRegion: null,
  _previousFocus: null,

  // Focus trap внутри контейнера
  trapFocus(container) {
    if (!container) return function() {};
    Utils.a11y._previousFocus = document.activeElement;
    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    function handleKey(e) {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(container.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    container.addEventListener('keydown', handleKey);
    setTimeout(() => {
      const first = Utils.a11y.firstFocusable(container);
      if (first) first.focus();
      else container.focus();
    }, 0);
    return function release() {
      container.removeEventListener('keydown', handleKey);
      if (Utils.a11y._previousFocus && Utils.a11y._previousFocus.focus) {
        Utils.a11y._previousFocus.focus();
      }
    };
  },

  // Освобождение фокуса
  releaseFocus() {
    if (Utils.a11y._previousFocus && Utils.a11y._previousFocus.focus) {
      Utils.a11y._previousFocus.focus();
      Utils.a11y._previousFocus = null;
    }
  },

  // Объявление через aria-live
  announce(message, polite = true) {
    const region = Utils.a11y.getLiveRegion();
    region.setAttribute('aria-live', polite ? 'polite' : 'assertive');
    region.textContent = message;
    setTimeout(() => { region.textContent = ''; }, 1000);
  },

  // Установка ARIA-атрибутов
  setAria(element, attrs) {
    if (!element || !attrs) return;
    for (const [key, val] of Object.entries(attrs)) {
      element.setAttribute('aria-' + key, val);
    }
  },

  // Удаление ARIA-атрибутов
  removeAria(element, attrs) {
    if (!element) return;
    attrs.forEach(a => element.removeAttribute('aria-' + a));
  },

  // Получение ARIA-атрибута
  getAria(element, name) {
    if (!element) return null;
    return element.getAttribute('aria-' + name);
  },

  // Установка aria-expanded
  setExpanded(element, expanded) {
    if (element) element.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  },

  // Установка hidden + aria-hidden
  setHidden(element, hidden) {
    if (!element) return;
    if (hidden) {
      element.setAttribute('hidden', '');
      element.setAttribute('aria-hidden', 'true');
    } else {
      element.removeAttribute('hidden');
      element.removeAttribute('aria-hidden');
    }
  },

  // Установка aria-selected
  setSelected(element, selected) {
    if (!element) return;
    element.setAttribute('aria-selected', selected ? 'true' : 'false');
    element.classList.toggle('selected', selected);
  },

  // Установка aria-checked
  setChecked(element, checked) {
    if (element) element.setAttribute('aria-checked', checked ? 'true' : 'false');
  },

  // Установка aria-describedby
  describe(element, id) {
    if (element) element.setAttribute('aria-describedby', id);
  },

  // Установка aria-labelledby
  labelBy(element, id) {
    if (element) element.setAttribute('aria-labelledby', id);
  },

  // Установка aria-controls
  controls(element, id) {
    if (element) element.setAttribute('aria-controls', id);
  },

  // Список focusable элементов в контейнере
  getFocusable(container) {
    if (!container) return [];
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    return Array.from(container.querySelectorAll(selector)).filter(el => {
      return !el.hidden && el.offsetParent !== null || el === document.activeElement;
    });
  },

  // Первый focusable
  firstFocusable(container) {
    return Utils.a11y.getFocusable(container)[0] || null;
  },

  // Последний focusable
  lastFocusable(container) {
    const items = Utils.a11y.getFocusable(container);
    return items.length ? items[items.length - 1] : null;
  },

  // Фокус на первый focusable
  focusFirst(container) {
    const el = Utils.a11y.firstFocusable(container);
    if (el) el.focus();
  },

  // Видимость для скринридера
  isVisibleToSR(element) {
    if (!element) return false;
    if (element.hidden) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.closest('[aria-hidden="true"]')) return false;
    return true;
  },

  // Управление skip-link
  enableSkipLink() {
    const link = document.querySelector('.skip-link');
    if (!link) return;
    link.addEventListener('focus', () => { link.style.top = '0'; });
    link.addEventListener('blur', () => { link.style.top = '-40px'; });
  },

  // Получение/создание live region
  getLiveRegion() {
    if (Utils.a11y._liveRegion && document.body.contains(Utils.a11y._liveRegion)) {
      return Utils.a11y._liveRegion;
    }
    const region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    region.style.clip = 'rect(0,0,0,0)';
    region.style.whiteSpace = 'nowrap';
    region.style.border = '0';
    document.body.appendChild(region);
    Utils.a11y._liveRegion = region;
    return region;
  }
};

/* ============ РАЗДЕЛ 12: АСИНХРОННЫЕ ХЕЛПЕРЫ (Utils.async) ============ */

Utils.async = {
  // Задержка
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Повтор с задержкой
  async retry(fn, options = { attempts: 3, delay: 1000, backoff: false }) {
    let lastError = null;
    let delay = options.delay || 1000;
    for (let i = 0; i < (options.attempts || 3); i++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
        if (i < (options.attempts || 3) - 1) {
          await Utils.async.sleep(delay);
          if (options.backoff) delay *= 2;
        }
      }
    }
    throw lastError;
  },

  // Повтор с экспоненциальным backoff
  retryWithBackoff(fn, attempts = 3, baseDelay = 1000) {
    return Utils.async.retry(fn, { attempts, delay: baseDelay, backoff: true });
  },

  // Polling до условия
  waitFor(predicate, options = { timeout: 5000, interval: 100 }) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const timeout = options.timeout || 5000;
      const interval = options.interval || 100;
      function check() {
        try {
          if (predicate()) { resolve(); return; }
        } catch (e) {
          reject(e); return;
        }
        if (Date.now() - start >= timeout) { reject(new Error('Timeout')); return; }
        setTimeout(check, interval);
      }
      check();
    });
  },

  // Ожидание появления элемента в DOM
  waitForElement(selector, options = { timeout: 5000, interval: 100 }) {
    return Utils.async.waitFor(() => document.querySelector(selector) !== null, options);
  },

  // Очередь последовательных async-задач
  queue() {
    const items = [];
    let running = false;
    async function run() {
      if (running) return;
      running = true;
      while (items.length > 0) {
        const { fn, resolve, reject } = items.shift();
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      }
      running = false;
    }
    return {
      add(fn) {
        return new Promise((resolve, reject) => {
          items.push({ fn, resolve, reject });
          run();
        });
      },
      size() { return items.length; },
      pending() { return running; },
      clear(reason = new Error('Очередь очищена')) {
  const removed = items.splice(0);

  removed.forEach(item => {
    item.reject(reason);
  });
}
    };
  },

  // Параллельное выполнение с лимитом
  async parallel(tasks, limit = 4) {
  if (!Array.isArray(tasks)) {
    throw new TypeError('tasks должен быть массивом');
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(
      'limit должен быть целым числом больше 0'
    );
  }

  if (tasks.length === 0) {
    return [];
  }

  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;

      if (index >= tasks.length) {
        return;
      }

      const task = tasks[index];

      if (typeof task !== 'function') {
        throw new TypeError(
          `Задача с индексом ${index} не является функцией`
        );
      }

      results[index] = await task();
    }
  }

  const workerCount = Math.min(limit, tasks.length);

  const workers = Array.from(
    { length: workerCount },
    () => worker()
  );

  await Promise.all(workers);

  return results;
},

  // Promise.allSettled с fallback
  allSettled(promises) {
    if (typeof Promise.allSettled === 'function') {
      return Promise.allSettled(promises);
    }
    return Promise.all(promises.map(p =>
      Promise.resolve(p).then(val => ({ status: 'fulfilled', value: val }))
        .catch(err => ({ status: 'rejected', reason: err }))
    ));
  },

  // Timeout race
  timeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  },

  // Defer в микротаски
  defer(fn) {
    return Promise.resolve().then(fn);
  },

  // Next tick
  nextTick(fn) {
    return setTimeout(fn, 0);
  },

  // requestAnimationFrame
  raf(fn) {
    return requestAnimationFrame(fn);
  },

  cancelRaf(id) {
    cancelAnimationFrame(id);
  },

  // Idle callback
  idle(fn) {
    if (typeof requestIdleCallback === 'function') {
      return requestIdleCallback(fn);
    }
    return setTimeout(fn, 1);
  },

  cancelIdle(id) {
    if (typeof cancelIdleCallback === 'function') {
      cancelIdleCallback(id);
    } else {
      clearTimeout(id);
    }
  },

  // Promise-обёртка для callback API
  promisify(fn, ...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
};

/* ============ РАЗДЕЛ 13: РАБОТА С ЦВЕТОМ (Utils.color) ============ */

Utils.color = {
  // Парсинг hex в RGB-объект
  parseHex(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let h = hex.trim();
    if (h.length === 4) {
      h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    }
    const match = h.match(/^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/);
    if (!match) {
      const shortMatch = h.match(/^#?([0-9A-Fa-f]{3})$/);
      if (shortMatch) {
        const r = parseInt(shortMatch[1][0] + shortMatch[1][0], 16);
        const g = parseInt(shortMatch[1][1] + shortMatch[1][1], 16);
        const b = parseInt(shortMatch[1][2] + shortMatch[1][2], 16);
        return { r, g, b, a: 1 };
      }
      return null;
    }
    const r = parseInt(match[1].slice(0, 2), 16);
    const g = parseInt(match[1].slice(2, 4), 16);
    const b = parseInt(match[1].slice(4, 6), 16);
    const a = match[2] ? parseInt(match[2], 16) / 255 : 1;
    return { r, g, b, a };
  },

  // Парсинг rgb()/rgba() в объект
  parseRgb(rgb) {
  if (typeof rgb !== 'string') {
    return null;
  }

  const match = rgb.trim().match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+))?\s*\)$/i
  );

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] === undefined
    ? 1
    : Number(match[4]);

  if (
    !Number.isInteger(r) ||
    !Number.isInteger(g) ||
    !Number.isInteger(b) ||
    !Number.isFinite(a) ||
    r < 0 ||
    r > 255 ||
    g < 0 ||
    g > 255 ||
    b < 0 ||
    b > 255 ||
    a < 0 ||
    a > 1
  ) {
    return null;
  }

  return { r, g, b, a };
},

  // Универсальный парсинг цвета
  parseColor(str) {
    if (!str) return null;
    if (str.startsWith('#')) return Utils.color.parseHex(str);
    if (str.startsWith('rgb')) return Utils.color.parseRgb(str);
    return null;
  },

  // RGB → hex
  rgbToHex(r, g, b) {
    const toHex = (x) => Math.round(Utils.misc.clamp(x, 0, 255)).toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  },

  // RGBA → hex с alpha
  rgbaToHex(r, g, b, a) {
    const alpha = Math.round(Utils.misc.clamp(a, 0, 1) * 255).toString(16).padStart(2, '0');
    return Utils.color.rgbToHex(r, g, b) + alpha;
  },

  // Hex → { r, g, b, a: 1 }
  hexToRgb(hex) {
    const c = Utils.color.parseHex(hex);
    return c ? { r: c.r, g: c.g, b: c.b, a: 1 } : null;
  },

  // Hex с заданной alpha
  hexToRgba(hex, a) {
    const c = Utils.color.parseHex(hex);
    return c ? { r: c.r, g: c.g, b: c.b, a } : null;
  },

  // RGB → HSL
  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  },

  // HSL → RGB
  hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  },

  // RGB → HSV
  rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
  },

  // HSV → RGB
  hsvToRgb(h, s, v) {
    h /= 360; s /= 100; v /= 100;
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  },

  // Осветление
  lighten(color, amount) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    const hsl = Utils.color.rgbToHsl(c.r, c.g, c.b);
    hsl.l = Utils.misc.clamp(hsl.l + amount, 0, 100);
    const rgb = Utils.color.hslToRgb(hsl.h, hsl.s, hsl.l);
    return Utils.color.rgbToHex(rgb.r, rgb.g, rgb.b);
  },

  // Затемнение
  darken(color, amount) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    const hsl = Utils.color.rgbToHsl(c.r, c.g, c.b);
    hsl.l = Utils.misc.clamp(hsl.l - amount, 0, 100);
    const rgb = Utils.color.hslToRgb(hsl.h, hsl.s, hsl.l);
    return Utils.color.rgbToHex(rgb.r, rgb.g, rgb.b);
  },

  // Насыщение
  saturate(color, amount) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    const hsl = Utils.color.rgbToHsl(c.r, c.g, c.b);
    hsl.s = Utils.misc.clamp(hsl.s + amount, 0, 100);
    const rgb = Utils.color.hslToRgb(hsl.h, hsl.s, hsl.l);
    return Utils.color.rgbToHex(rgb.r, rgb.g, rgb.b);
  },

  // Обесцвечивание
  desaturate(color, amount) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    const hsl = Utils.color.rgbToHsl(c.r, c.g, c.b);
    hsl.s = Utils.misc.clamp(hsl.s - amount, 0, 100);
    const rgb = Utils.color.hslToRgb(hsl.h, hsl.s, hsl.l);
    return Utils.color.rgbToHex(rgb.r, rgb.g, rgb.b);
  },

  // Сдвиг оттенка
  adjustHue(color, degrees) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    const hsl = Utils.color.rgbToHsl(c.r, c.g, c.b);
    hsl.h = (hsl.h + degrees + 360) % 360;
    const rgb = Utils.color.hslToRgb(hsl.h, hsl.s, hsl.l);
    return Utils.color.rgbToHex(rgb.r, rgb.g, rgb.b);
  },

  // Комплементарный цвет
  complement(color) {
    return Utils.color.adjustHue(color, 180);
  },

  // Инверсия
  invert(color) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    return Utils.color.rgbToHex(255 - c.r, 255 - c.g, 255 - c.b);
  },

  // Смешивание двух цветов
  mix(color1, color2, weight = 0.5) {
    const c1 = Utils.color.parseColor(color1);
    const c2 = Utils.color.parseColor(color2);
    if (!c1 || !c2) return color1;
    const w = Utils.misc.clamp(weight, 0, 1);
    const r = Math.round(c1.r * w + c2.r * (1 - w));
    const g = Math.round(c1.g * w + c2.g * (1 - w));
    const b = Math.round(c1.b * w + c2.b * (1 - w));
    return Utils.color.rgbToHex(r, g, b);
  },

  // Установка прозрачности
  opacity(color, alpha) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${Utils.misc.clamp(alpha, 0, 1)})`;
  },

  // Относительная яркость (WCAG)
  luminance(color) {
    const c = Utils.color.parseColor(color);
    if (!c) return 0;
    const toLin = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLin(c.r) + 0.7152 * toLin(c.g) + 0.0722 * toLin(c.b);
  },

  // Коэффициент контраста
  contrastRatio(color1, color2) {
    const l1 = Utils.color.luminance(color1);
    const l2 = Utils.color.luminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  },

  // Проверка читаемости
  isReadable(foreground, background, level = 'AA') {
    const ratio = Utils.color.contrastRatio(foreground, background);
    if (level === 'AAA') return ratio >= 7.0;
    return ratio >= 4.5;
  },

  // Лучший цвет текста на фоне
  bestTextOn(color) {
    return Utils.color.luminance(color) > 0.5 ? '#000000' : '#ffffff';
  },

  // Цвет в hex-строку
  toHex(color) {
    const c = Utils.color.parseColor(color);
    return c ? Utils.color.rgbToHex(c.r, c.g, c.b) : color;
  },

  // Цвет в rgb()-строку
  toRgbString(color) {
    const c = Utils.color.parseColor(color);
    return c ? `rgb(${c.r}, ${c.g}, ${c.b})` : color;
  },

  // Цвет в rgba()-строку
  toRgbaString(color) {
    const c = Utils.color.parseColor(color);
    return c ? `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})` : color;
  },

  // Цвет в hsl()-строку
  toHslString(color) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    const hsl = Utils.color.rgbToHsl(c.r, c.g, c.b);
    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  },

  // Цвет в hsla()-строку
  toHslaString(color) {
    const c = Utils.color.parseColor(color);
    if (!c) return color;
    const hsl = Utils.color.rgbToHsl(c.r, c.g, c.b);
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${c.a})`;
  },

  // Цвет тега из CSS-переменных
  getTagColor(index) {
    return Utils.css.getVar(`--tag-color-${index}`);
  },

  getTagBg(index) {
    return Utils.css.getVar(`--tag-bg-${index}`);
  },

  getTagText(index) {
    return Utils.css.getVar(`--tag-text-${index}`);
  }
};

/* ============ РАЗДЕЛ 14: URL И РОУТИНГ (Utils.url) ============ */

Utils.url = {
  // Текущий hash без #
  getHash() {
    return window.location.hash.slice(1) || '';
  },

  // Установка hash
  setHash(route) {
    if (route !== Utils.url.getHash()) {
      window.location.hash = route;
    }
  },

  // Текущий маршрут (распарсенный)
  getRoute() {
  var route = window.location.hash
    .replace(/^#\/?/, '')
    .trim();

  return route || 'dashboard';
},

  // Навигация
  navigate(route) {
    Utils.url.setHash(route);
    window.scrollTo(0, 0);
  },

  // Редирект
  redirect(route) {
    window.location.replace('#' + route);
  },

  // Парсинг hash-маршрута
  parseRoute(hash) {
  const normalized = String(hash || '')
    .replace(/^#\/?/, '')
    .trim();

  if (!normalized) {
    return {
      name: 'dashboard',
      params: {},
      query: {}
    };
  }

  const questionIndex = normalized.indexOf('?');

  const pathPart =
    questionIndex === -1
      ? normalized
      : normalized.slice(0, questionIndex);

  const queryPart =
    questionIndex === -1
      ? ''
      : normalized.slice(questionIndex + 1);

  const segments = pathPart
    .split('/')
    .filter(Boolean)
    .map(segment => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });

  const name = segments[0] || 'dashboard';
  const params = {};

  if (
    name === 'portfolio' &&
    segments[1] === 'item' &&
    segments[2]
  ) {
    params.sub = 'item';
    params.id = segments[2];
  } else if (segments.length === 2) {
    params.id = segments[1];
    params.letter = segments[1];
  }

  return {
    name,
    params,
    query: Utils.url.parseQuery(queryPart)
  };
},

  // Построение маршрута
  buildRoute(name, params = {}) {
  const safeName = encodeURIComponent(name);

  if (name === 'portfolio' && params.id != null) {
    return `${safeName}/item/${encodeURIComponent(params.id)}`;
  }

  if (params.id != null) {
    return `${safeName}/${encodeURIComponent(params.id)}`;
  }

  if (params.letter != null) {
    return `${safeName}/${encodeURIComponent(params.letter)}`;
  }

  return safeName;
},

  // Парсинг query-строки
  parseQuery(query) {
    const result = {};
    const params = new URLSearchParams(query.replace(/^\?/, ''));
    for (const [k, v] of params.entries()) {
      result[k] = v;
    }
    return result;
  },

  // Построение query-строки
  buildQuery(params) {
    const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null);
    if (!entries.length) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  },

  // Подписка на изменение hash
  onRouteChange(callback) {
    const handler = () => callback(Utils.url.getRoute());
    window.addEventListener('hashchange', handler);
    return function() { window.removeEventListener('hashchange', handler); };
  },

  // Текущий URL без hash
  currentURL() {
    return window.location.href.split('#')[0];
  },

  // Проверка валидности URL
  isValidURL(str) {
    return Utils.validate.isUrl(str);
  },

  // Нормализация пути
  normalizePath(path) {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  },

  // Соединение путей
  joinPath(...parts) {
    return parts.join('/').replace(/\/+/g, '/').replace(/^\/+/, '/').replace(/\/$/, '') || '/';
  },

  // Resolve относительного пути
  resolve(base, relative) {
    try {
      return new URL(relative, base).href;
    } catch (e) {
      return relative;
    }
  },

  // Получение параметра маршрута
  getParam(name, hash) {
    const route = Utils.url.parseRoute(hash || Utils.url.getHash());
    return route.params?.[name] || route.query?.[name];
  },

  // Установка параметра маршрута
  setParam(name, value, hash) {
  const route = Utils.url.parseRoute(
    hash ?? Utils.url.getHash()
  );

  route.query[name] = String(value);

  return (
    Utils.url.buildRoute(route.name, route.params) +
    Utils.url.buildQuery(route.query)
  );
},

  // Удаление параметра
  removeParam(name, hash) {
  const route = Utils.url.parseRoute(
    hash ?? Utils.url.getHash()
  );

  delete route.query[name];

  return (
    Utils.url.buildRoute(route.name, route.params) +
    Utils.url.buildQuery(route.query)
  );
},

  // Cookie: получение
  getCookie(name) {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, val] = cookie.trim().split('=');
      if (key === name) return decodeURIComponent(val);
    }
    return null;
  },

  // Cookie: установка
  setCookie(name, value, days) {
    const expires = new Date();
    expires.setDate(expires.getDate() + (days || 365));
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
  },

  // Cookie: удаление
  removeCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  },

  // Проверка Data URI
  isDataURI(str) {
    return typeof str === 'string' && str.startsWith('data:');
  },

  // Парсинг Data URI
  parseDataURI(str) {
    if (!Utils.url.isDataURI(str)) return null;
    const match = str.match(/^data:([^;]+);(?:charset=([^;]+);)?(base64)?,(.*)$/);
    if (!match) return null;
    return {
      mimeType: match[1],
      charset: match[2] || 'utf-8',
      encoding: match[3] || 'plain',
      data: match[4]
    };
  },

  // Скачивание файла
  download(filename, content, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  },

  // Скачивание JSON
  downloadJSON(filename, obj) {
    Utils.url.download(filename, JSON.stringify(obj, null, 2), 'application/json');
  },

  // Скачивание текста
  downloadText(filename, text) {
    Utils.url.download(filename, text, 'text/plain');
  },

  // Скачивание HTML
  downloadHTML(filename, html) {
    Utils.url.download(filename, html, 'text/html');
  },

  // Чтение файла через FileReader
  readFile(file, as = 'text') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (as === 'json') {
          try { resolve(JSON.parse(reader.result)); }
          catch (e) { reject(e); }
        } else {
          resolve(reader.result);
        }
      };
      reader.onerror = () => reject(reader.error);
      if (as === 'dataurl') reader.readAsDataURL(file);
      else if (as === 'arraybuffer') reader.readAsArrayBuffer(file);
      else reader.readAsText(file);
    });
  },

  // Копирование в буфер обмена
  copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(textarea);
    });
  },

  // Share через navigator.share
  async share(data) {
    if (navigator.share) {
      try { await navigator.share(data); } catch (e) {
        if (e.name !== 'AbortError') throw e;
      }
    } else {
      await Utils.url.copyToClipboard(data.text || data.url || '');
    }
  },

  // Открыть в новой вкладке
  openURL(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/* ============ РАЗДЕЛ 15: ГЛОБАЛЬНЫЕ СОКРАЩЕНИЯ ============ */

// $ — document.querySelector
window.$ = function(selector, context = document) {
  return context.querySelector(selector);
};

// $$ — document.querySelectorAll → массив
window.$$ = function(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
};

// el — быстрое создание элемента
window.el = function(selector, children = null) {
  return Utils.dom.el(selector, children);
};

// ready — DOMContentLoaded обёртка
window.ready = function(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
};

/* ============ РАЗДЕЛ 16: ГЛОБАЛЬНЫЙ STATE-КОНТЕЙНЕР (QAApp) ============ */

window.QAApp = {
  version: Utils.constants.APP_VERSION,
  initialized: false,
  currentRoute: null,
  previousRoute: null,

  state: {
    sidebarCollapsed: false,
    compactView: false,
    presentationMode: false,
    sidebarMobileOpen: false,
    theme: 'light',
    route: 'dashboard',
    routeParams: {}
  },

  modules: {},
  registerModule(name, module) { this.modules[name] = module; },
  getModule(name) { return this.modules[name]; },

  pages: {},
  registerPage(route, handler) { this.pages[route] = handler; },
  getPage(route) { return this.pages[route]; },

  handlers: {},
  on(event, handler) {
    (this.handlers[event] = this.handlers[event] || []).push(handler);
  },
  off(event, handler) {
    this.handlers[event] = (this.handlers[event] || []).filter(h => h !== handler);
  },
  emit(event, data) {
    (this.handlers[event] || []).forEach(h => h(data));
  },

  elements: {
    appWrapper: null,
    sidebar: null,
    mainContainer: null,
    header: null,
    headerTitle: null,
    breadcrumbs: null,
    workspace: null,
    contextPanel: null,
    modals: null,
    toastContainer: null,
    saveIndicator: null,
    preloader: null,
    searchInput: null
  },

  subscribeToState(key, callback) {
  if (typeof callback !== 'function') {
    return function() {};
  }

  const eventName = 'state:' + key;

  this.on(eventName, callback);

  return () => {
    this.off(eventName, callback);
  };
},

  setState(key, value) {
  const previousValue = this.state[key];

  if (Object.is(previousValue, value)) {
    return false;
  }

  this.state[key] = value;
  this.emit('state:' + key, value);

  return true;
},

  getState(key) {
    return this.state[key];
  },

  log(...args) { console.log('[QAApp]', ...args); },
  warn(...args) { console.warn('[QAApp]', ...args); },
  error(...args) { console.error('[QAApp]', ...args); }
};

const unsubscribe = QAApp.subscribeToState(
  'theme',
  value => console.log(value)
);

QAApp.setState('theme', 'dark');
unsubscribe();

/* ============ РАЗДЕЛ 17: ИНИЦИАЛИЗАЦИЯ UTILS ============ */

Utils.ready = true;

Utils.storage._available =
  Utils.storage.isAvailable();

/*
 * Тема применяется сразу, чтобы уменьшить мигание
 * интерфейса при загрузке страницы.
 */
const savedTheme = Utils.storage.get(
  Utils.constants.STORAGE_KEYS.THEME
);

const initialTheme =
  savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : Utils.device.prefersDark()
      ? 'dark'
      : 'light';

document.documentElement.setAttribute(
  'data-theme',
  initialTheme
);

document.documentElement.style.colorScheme =
  initialTheme;

Utils.css.setVar(
  'color-scheme',
  initialTheme
);

/*
 * DOM-зависимые настройки применяются только после
 * создания элементов страницы.
 */
window.ready(function() {
  const collapsed = Boolean(
    Utils.storage.get(
      Utils.constants.STORAGE_KEYS.SIDEBAR_COLLAPSED,
      false
    )
  );

  const compact = Boolean(
    Utils.storage.get(
      Utils.constants.STORAGE_KEYS.COMPACT_VIEW,
      false
    )
  );

  const wrapper =
    document.getElementById('app-wrapper');

  const mainContent =
    document.getElementById('main-content');

  if (wrapper) {
    Utils.dom.toggleClass(
      wrapper,
      'sidebar-collapsed',
      collapsed
    );
  }

  if (mainContent) {
    Utils.dom.toggleClass(
      mainContent,
      'compact-view',
      compact
    );
  }

  if (window.QAApp) {
    QAApp.state.theme = initialTheme;
    QAApp.state.sidebarCollapsed = collapsed;
    QAApp.state.compactView = compact;
  }
});

console.log(
  '%c QA Study Portfolio v' +
    Utils.constants.APP_VERSION +
    ' ',
  'background: #0ea5b8; color: white;' +
    ' padding: 4px 8px; border-radius: 4px;'
);
