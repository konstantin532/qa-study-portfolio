/* js/core/main.js — часть 1 из 4 — состояние, сохранение, роутер, крошки, сайдбар, шапка, контекст, пустые состояния, init */
(function (window) {
  'use strict';

  /* ---------- 4.5 debounce ---------- */
  function debounce(fn, ms) {
    var timer = null;
    var wrapped = function () {
      var args = arguments;
      var ctx = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; fn.apply(ctx, args); }, ms);
    };
    wrapped.cancel = function () { if (timer) clearTimeout(timer); timer = null; };
    return wrapped;
  }

  /* ---------- локальный escape (fallback для Utils.Escape.html) ---------- */
  function esc(s) {
    if (s === null || s === undefined) return '';
    var t = String(s);
    if (typeof Utils !== 'undefined' && Utils.Escape && typeof Utils.Escape.html === 'function') {
      return Utils.Escape.html(t);
    }
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- 3. глобальное состояние ---------- */
  var state = {
    user: {
      name: '',
      role: 'QA Trainee',
      weeklyGoal: 5,
      dailyLimit: 120,
      theme: 'system',
      onboarded: false
    },
    portfolio: [],
    lessons: {},
    currentRoute: '',
    tags: [],
    categories: [],
    studyGroups: [],
    currentLesson: null,
    sidebarCollapsed: false,
    searchQuery: '',
    searchFilters: {
      types: [], tags: [], category: null,
      date: null, status: null, sort: 'date-desc'
    },
    meta: { lastActiveDate: null, lastLessonId: null }
  };

  /* ---------- 4.3 отслеживание изменений ---------- */
  var dirtyIds = {};
  function markDirty(id) { dirtyIds[id] = true; }
  function dirtyLessons() {
    var out = [];
    Object.keys(dirtyIds).forEach(function (k) {
      if (state.lessons[k]) out.push(state.lessons[k]);
    });
    return out;
  }
  function clearDirty() { dirtyIds = {}; }

  /* ---------- 4.4 индикатор сохранения ---------- */
  function setSaveIndicator(s) {
    var el = document.getElementById('save-indicator');
    if (!el) return;
    el.setAttribute('data-state', s);
    var visual = el.querySelector('.save-indicator__text') || el;
    var sr = el.querySelector('.visually-hidden');
    if (s === 'saving') {
      visual.textContent = 'Сохранение…';
    } else if (s === 'saved') {
      visual.textContent = 'Сохранено';
      if (sr) sr.textContent = 'Сохранено';
    } else if (s === 'error') {
      visual.textContent = 'Ошибка сохранения';
      if (sr) sr.textContent = 'Ошибка сохранения';
    } else {
      visual.textContent = '';
      if (sr) sr.textContent = '';
    }
  }

  /* ---------- 4.6 прогресс ---------- */
  function setProgress(el, percent) {
    if (!el) return;
    var p = Math.max(0, Math.min(100, Number(percent) || 0));
    el.style.transform = 'scaleX(' + (p / 100) + ')';
    el.setAttribute('aria-valuenow', String(Math.round(p)));
  }

  /* ---------- 10.3 тосты ---------- */
  function createToastNode(msg, cls) {
    var c = document.getElementById('toast-container');
    if (!c) return null;
    var t = document.createElement('div');
    t.className = 'toast ' + (cls || 'toast--warning');
    t.setAttribute('role', 'status');
    t.textContent = String(msg);
    c.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 6000);
    return t;
  }
  function showWarningToast(msg) {
    if (typeof App.toast === 'function') { try { App.toast(msg, 'warning'); return; } catch (e) {} }
    createToastNode(msg, 'toast--warning');
  }
  function showQuotaToast(percent) {
    showWarningToast('Хранилище заполнено на ' + percent + '%. Сделайте резервную копию.');
  }
  function showTabConflictModal(info) {
    if (typeof App.openModal === 'function') { try { App.openModal('confirm', { title: 'Конфликт вкладок', text: 'Данные изменены в другой вкладке: ' + info.source + '. Обновите страницу.' }); return; } catch (e) {} }
    showWarningToast('Конфликт вкладок: ' + info.source);
  }

  /* ---------- 4.1 загрузка ---------- */
  function seedFromCourseData() {
    var records = [];
    var questions = [];
    if (window.CourseData && Array.isArray(window.CourseData.modules)) {
      window.CourseData.modules.forEach(function (m) {
        (m.topics || []).forEach(function (t) {
          records.push({
            id: t.id, moduleId: m.id, title: t.title || '', order: t.order || 0,
            summary: t.summary || '', terms: t.terms ? t.terms.slice() : [],
            status: 'new', notes: '', conclusion: '', answers: {}, practice: '',
            understanding: 0, studyDate: null, nextReview: null, timeSpent: 0,
            tags: [], category: null, orphan: false, updatedAt: new Date().toISOString()
          });
        });
      });
    }
    if (window.CourseData && Array.isArray(window.CourseData.questions)) {
      questions = window.CourseData.questions.slice();
    }
    return Promise.all([
      records.length ? window.IDB.bulkPut('lessons', records) : Promise.resolve(),
      questions.length ? window.IDB.bulkPut('questions', questions) : Promise.resolve()
    ]);
  }

  function loadState() {
    return window.IDB.get('settings', 'user').then(function (u) {
      if (u && u.value) state.user = Object.assign({}, state.user, u.value);
      return window.IDB.get('settings', 'ui');
    }).then(function (ui) {
      var v = ui && ui.value ? ui.value : null;
      if (v) {
        if (typeof v.sidebarCollapsed === 'boolean') state.sidebarCollapsed = v.sidebarCollapsed;
        if (v.searchFilters) state.searchFilters = Object.assign({}, state.searchFilters, v.searchFilters);
      }
      return window.IDB.getAll('lessons');
    }).then(function (lessons) {
      var list = Array.isArray(lessons) ? lessons : [];
      var byId = {};
      list.forEach(function (r) { if (r && r.id) byId[r.id] = r; });
      if (list.length === 0) {
        return seedFromCourseData().then(function () { return window.IDB.getAll('lessons'); });
      }
      return list;
    }).then(function (lessons) {
      var byId = {};
      (Array.isArray(lessons) ? lessons : []).forEach(function (r) { if (r && r.id) byId[r.id] = r; });
      if (window.CourseData && Array.isArray(window.CourseData.modules)) {
        window.CourseData.modules.forEach(function (m) {
          (m.topics || []).forEach(function (t) {
            var existing = byId[t.id];
            if (existing) {
              existing.moduleId = m.id;
              existing.title = t.title || existing.title;
              existing.order = t.order || existing.order;
              existing.summary = t.summary || existing.summary;
              existing.terms = t.terms ? t.terms.slice() : (existing.terms || []);
              state.lessons[t.id] = existing;
            } else {
              state.lessons[t.id] = {
                id: t.id, moduleId: m.id, title: t.title || '', order: t.order || 0,
                summary: t.summary || '', terms: t.terms ? t.terms.slice() : [],
                status: 'new', notes: '', conclusion: '', answers: {}, practice: '',
                understanding: 0, studyDate: null, nextReview: null, timeSpent: 0,
                tags: [], category: null, orphan: false, updatedAt: new Date().toISOString()
              };
            }
          });
        });
        for (var id in byId) {
          if (Object.prototype.hasOwnProperty.call(byId, id) && !state.lessons[id]) {
            var o = byId[id];
            o.orphan = true;
            state.lessons[id] = o;
          }
        }
      } else {
        for (var k in byId) if (Object.prototype.hasOwnProperty.call(byId, k)) state.lessons[k] = byId[k];
      }
      return window.IDB.getAll('portfolio');
    }).then(function (arr) { state.portfolio = Array.isArray(arr) ? arr.slice() : []; return window.IDB.getAll('tags'); })
      .then(function (arr) { state.tags = Array.isArray(arr) ? arr.slice() : []; return window.IDB.getAll('categories'); })
      .then(function (arr) { state.categories = Array.isArray(arr) ? arr.slice() : []; return state; })
      .catch(function (e) {
        showWarningToast('Ошибка загрузки: ' + (e && e.message ? e.message : e));
        setSaveIndicator('error');
        return state;
      });
  }

  /* ---------- 4.2 сохранение (таблица scope) ---------- */
  var SAVE_HANDLERS = {
    user: function () {
      return window.IDB.put('settings', { key: 'user', value: state.user });
    },
    ui: function () {
      return window.IDB.put('settings', { key: 'ui', value: { sidebarCollapsed: state.sidebarCollapsed, searchFilters: state.searchFilters } });
    },
    lessons: function () {
      var arr = dirtyLessons();
      if (arr.length === 0) return Promise.resolve();
      window.IDB.autoSave('lessons', arr, 300);
      return Promise.resolve();
    }
  };
  function saveState(scope) {
    setSaveIndicator('saving');
    var handler = SAVE_HANDLERS[scope];
    if (typeof handler !== 'function') {
      if (typeof Debug !== 'undefined' && Debug.Logger) { try { Debug.Logger.warn('saveState: unknown scope ' + scope); } catch (e) {} }
      setSaveIndicator('idle');
      return Promise.resolve();
    }
    return handler().then(function () {
      if (scope === 'lessons') clearDirty();
      setSaveIndicator('saved');
    }).catch(function (e) {
      if (e && e.name === 'QuotaExceededError') showQuotaToast(100);
      setSaveIndicator('error');
    });
  }

  /* ---------- 5. роутер ---------- */
  var ROUTES = {
    'dashboard': { title: 'Главная', render: null, breadcrumbs: [{ label: 'Главная', href: 'dashboard' }], context: 'dashboard' },
    'today': { title: 'Сегодня', render: null, breadcrumbs: [{ label: 'Сегодня', href: 'today' }], context: 'today' },
    'roadmap': { title: 'Учебный маршрут', render: null, breadcrumbs: [{ label: 'Учебный маршрут', href: 'roadmap' }], context: 'roadmap' },
    'mindmap': { title: 'Карта знаний', render: null, breadcrumbs: [{ label: 'Карта знаний', href: 'mindmap' }], context: 'mindmap' },
    'course': { title: 'Курс', render: null, breadcrumbs: [{ label: 'Курс', href: 'course' }], context: 'course' },
    'notes': { title: 'Заметки', render: null, breadcrumbs: [{ label: 'Заметки', href: 'notes' }], context: 'notes' },
    'questions': { title: 'Вопросы', render: null, breadcrumbs: [{ label: 'Вопросы', href: 'questions' }], context: 'questions' },
    'repetition': { title: 'Повторение', render: null, breadcrumbs: [{ label: 'Повторение', href: 'repetition' }], context: 'repetition' },
    'practice': { title: 'Практика', render: null, breadcrumbs: [{ label: 'Практика', href: 'practice' }], context: 'practice' },
    'portfolio': { title: 'Портфолио', render: null, breadcrumbs: [{ label: 'Портфолио', href: 'portfolio' }], context: 'portfolio' },
    'glossary': { title: 'Словарь', render: null, breadcrumbs: [{ label: 'Словарь', href: 'glossary' }], context: 'glossary' },
    'pomodoro': { title: 'Pomodoro', render: null, breadcrumbs: [{ label: 'Pomodoro', href: 'pomodoro' }], context: 'pomodoro' },
    'stats': { title: 'Статистика', render: null, breadcrumbs: [{ label: 'Статистика', href: 'stats' }], context: 'stats' },
    'resources': { title: 'Материалы', render: null, breadcrumbs: [{ label: 'Материалы', href: 'resources' }], context: 'resources' },
    'settings': { title: 'Настройки', render: null, breadcrumbs: [{ label: 'Настройки', href: 'settings' }], context: 'settings' },
    'course/lesson/:id': { title: 'Урок', render: null, breadcrumbs: [
      { label: 'Курс', href: 'course' }, { label: 'Модуль', href: 'course' }, { label: 'Урок', href: '' }
    ], context: 'course' },
    'portfolio/item/:id': { title: 'Элемент портфолио', render: null, breadcrumbs: [
      { label: 'Портфолио', href: 'portfolio' }, { label: 'Элемент', href: '' }
    ], context: 'portfolio' },
    'portfolio/presentation': { title: 'Презентация', render: null, breadcrumbs: [
      { label: 'Портфолио', href: 'portfolio' }, { label: 'Презентация', href: '' }
    ], context: 'portfolio' },
    'settings/tags': { title: 'Теги и категории', render: null, breadcrumbs: [
      { label: 'Настройки', href: 'settings' }, { label: 'Теги и категории', href: '' }
    ], context: 'settings' },
    'settings/sharing': { title: 'Обмен данными', render: null, breadcrumbs: [
      { label: 'Настройки', href: 'settings' }, { label: 'Обмен данными', href: '' }
    ], context: 'settings' }
  };

  function getRouteFromHash() {
    var h = window.location.hash || '';
    var name = h.charAt(0) === '#' ? h.slice(1) : h;
    if (!name || name === '/') return { name: 'dashboard', params: {} };
    if (ROUTES[name]) return { name: name, params: {} };
    var m;
    m = name.match(/^course\/lesson\/(m\d{2}-t\d+)$/);
    if (m) return { name: 'course/lesson/:id', params: { id: m[1] } };
    m = name.match(/^portfolio\/item\/([^/]+)$/);
    if (m) return { name: 'portfolio/item/:id', params: { id: m[1] } };
    if (name === 'portfolio/presentation') return { name: 'portfolio/presentation', params: {} };
    if (name === 'settings/tags') return { name: 'settings/tags', params: {} };
    if (name === 'settings/sharing') return { name: 'settings/sharing', params: {} };
    return { name: name, params: {}, notFound: true };
  }

  /* ---------- 10.1 + 10.2 пустые состояния ---------- */
  function renderEmptyState(title, text, buttonText, route) {
    return '<div class="empty-state" role="status">'
      + '<svg class="empty-state__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8M12 8v8"/></svg>'
      + '<h2 class="empty-state__title">' + esc(title) + '</h2>'
      + '<p class="empty-state__text">' + esc(text) + '</p>'
      + (route ? '<a class="empty-state__action" href="#' + esc(route) + '">' + esc(buttonText || 'Перейти') + '</a>' : '')
      + '</div>';
  }
  function renderNotFound(hash) {
    var main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = renderEmptyState(
      'Раздел не найден',
      'Маршрут «' + hash + '» не существует.',
      'На главную', 'dashboard'
    );
  }

  function router() {
    var r = getRouteFromHash();
    state.currentRoute = r.name;
    var main = document.getElementById('main-content');
    if (!main) return;
    if (r.notFound) {
      renderNotFound(window.location.hash);
      updateBreadcrumbs(r);
      setActiveMenuItem(r);
      renderContextPanel(r);
      focusMain();
      return;
    }
    var entry = ROUTES[r.name];
    if (typeof entry.render === 'function') {
      try { entry.render(r.params); } catch (e) {
        main.innerHTML = renderEmptyState('Ошибка раздела', e && e.message ? e.message : 'Произошла ошибка.', 'На главную', 'dashboard');
      }
    } else {
      main.innerHTML = renderEmptyState('Раздел загружается', 'Контент появится после подключения остальных частей.', null, null);
    }
    updateBreadcrumbs(r);
    setActiveMenuItem(r);
    renderContextPanel(r);
    focusMain();
  }
  function focusMain() {
    var main = document.getElementById('main-content');
    if (!main) return;
    try { main.focus({ preventScroll: true }); } catch (e) { try { main.focus(); } catch (e2) {} }
  }

  /* ---------- 6. хлебные крошки (рендер только <ol>) ---------- */
  function updateBreadcrumbs(route) {
    var bc = document.getElementById('breadcrumbs');
    if (!bc) return;
    var entry = ROUTES[route.name];
    var crumbs = entry && entry.breadcrumbs ? entry.breadcrumbs : [{ label: route.name, href: route.name }];
    var ol = document.createElement('ol');
    crumbs.forEach(function (crumb, idx) {
      var li = document.createElement('li');
      if (idx === crumbs.length - 1) {
        var span = document.createElement('span');
        span.setAttribute('aria-current', 'page');
        span.textContent = crumb.label;
        li.appendChild(span);
      } else {
        var a = document.createElement('a');
        a.href = '#' + crumb.href;
        a.textContent = crumb.label;
        li.appendChild(a);
        li.appendChild(document.createTextNode('›'));
      }
      ol.appendChild(li);
    });
    bc.innerHTML = '';
    bc.appendChild(ol);
  }

  /* ---------- 7. сайдбар ---------- */
  var NAV_ITEMS = [
    { route: 'dashboard', label: 'Главная', desc: 'обзор прогресса и план', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
    { route: 'today', label: 'Сегодня', desc: 'задачи и повторение на день', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
    { route: 'roadmap', label: 'Учебный маршрут', desc: 'этапы и прогресс курса', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19V5"/><path d="M4 5l6 4-6 4"/><path d="M10 9h10"/><circle cx="20" cy="9" r="2"/></svg>' },
    { route: 'mindmap', label: 'Карта знаний', desc: 'связи между темами', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M12 9V6M9 12H6M15 12h3M12 15v3"/></svg>' },
    { route: 'course', label: 'Курс', desc: 'модули, уроки, материалы', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19V5a2 2 0 0 1 2-2h9l3 3v13"/><path d="M16 3v5h5"/><path d="M8 13h8M8 17h6"/></svg>' },
    { route: 'notes', label: 'Заметки', desc: 'конспекты и идеи', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>' },
    { route: 'questions', label: 'Вопросы', desc: 'самопроверка по темам', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>' },
    { route: 'repetition', label: 'Повторение', desc: 'карточки с интервалами', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>' },
    { route: 'practice', label: 'Практика', desc: 'чек-листы, тест-кейсы, баг-репорты', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>' },
    { route: 'portfolio', label: 'Портфолио', desc: 'готовые работы для работодателя', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/><circle cx="12" cy="13" r="2"/></svg>' },
    { route: 'glossary', label: 'Словарь', desc: 'термины и определения', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16"/><path d="M4 10h16"/><path d="M4 14h10"/><circle cx="17" cy="16" r="3"/></svg>' },
    { route: 'pomodoro', label: 'Pomodoro', desc: 'таймер учебных сессий', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="13" r="8"/><path d="M12 13V9"/><path d="M9 2h6"/><path d="M12 17l-1 1"/></svg>' },
    { route: 'stats', label: 'Статистика', desc: 'данные и рекомендации', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18V10"/><path d="M12 18V6"/><path d="M18 18v-8"/></svg>' },
    { route: 'resources', label: 'Материалы', desc: 'справки и инструкции', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3l7 4v10l-7 4-7-4V7z"/><path d="M12 11l7-4"/><path d="M12 11v10"/></svg>' },
    { route: 'settings', label: 'Настройки', desc: 'конфигурация и данные', icon: '<svg class="nav-item__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/></svg>' }
  ];

  function renderSidebar() {
    var aside = document.getElementById('sidebar');
    if (!aside) return;
    var nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Основная навигация');
    var ul = document.createElement('ul');
    ul.className = 'nav-list';
    NAV_ITEMS.forEach(function (item) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'nav-item';
      a.href = '#' + item.route;
      a.innerHTML = item.icon
        + '<span class="nav-item__label">' + esc(item.label) + '</span>'
        + '<span class="nav-item__desc">' + esc(item.desc) + '</span>'
        + '<span class="nav-item__badge" hidden>0</span>';
      a.addEventListener('click', function () { closeMobileSidebar(); });
      li.appendChild(a);
      ul.appendChild(li);
    });
    var collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'sidebar__collapse';
    collapseBtn.setAttribute('aria-label', 'Свернуть панель');
    collapseBtn.addEventListener('click', toggleCollapsed);
    nav.appendChild(ul);
    nav.appendChild(collapseBtn);
    aside.innerHTML = '';
    aside.appendChild(nav);
    if (state.sidebarCollapsed) aside.classList.add('collapsed');
    else aside.classList.remove('collapsed');
  }

  function setActiveMenuItem(route) {
    var aside = document.getElementById('sidebar');
    if (!aside) return;
    var items = aside.querySelectorAll('a.nav-item');
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      var href = (a.getAttribute('href') || '').replace(/^#/, '');
      var active = href === route.name || (route.name.indexOf(href + '/') === 0);
      if (active) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
      else { a.classList.remove('active'); a.removeAttribute('aria-current'); }
    }
  }

  function updateBadges() {
    var aside = document.getElementById('sidebar');
    if (!aside) return;
    var counts = {
      notes: 0, questions: 0, flashcards: 0, practice: 0, portfolio: state.portfolio.length || 0
    };
    for (var id in state.lessons) if (Object.prototype.hasOwnProperty.call(state.lessons, id) && state.lessons[id].notes) counts.notes++;
    var badgeKeys = { notes: 'notes', questions: 'questions', repetition: 'flashcards', practice: 'practice', portfolio: 'portfolio' };
    Promise.all([
      window.IDB.getAll('questions').then(function (a) { counts.questions = a.length; }).catch(function () {}),
      window.IDB.getAll('flashcards').then(function (a) { counts.flashcards = a.length; }).catch(function () {}),
      window.IDB.getAll('practice').then(function (a) { counts.practice = a.length; }).catch(function () {})
    ]).then(function () {
      var items = aside.querySelectorAll('a.nav-item');
      for (var i = 0; i < items.length; i++) {
        var a = items[i];
        var href = (a.getAttribute('href') || '').replace(/^#/, '');
        var badge = a.querySelector('.nav-item__badge');
        if (!badge) continue;
        var n = counts[badgeKeys[href]] || 0;
        if (n > 0) { badge.textContent = String(n); badge.removeAttribute('hidden'); }
        else { badge.textContent = '0'; badge.setAttribute('hidden', 'hidden'); }
      }
    });
  }

  /* ---------- 7.1 два независимых состояния сайдбара ---------- */
  function setHamburgerExpanded() {
    var hamburger = document.querySelector('.hamburger');
    if (!hamburger) return;
    var aside = document.getElementById('sidebar');
    hamburger.setAttribute('aria-expanded', aside && aside.classList.contains('sidebar--open') ? 'true' : 'false');
  }
  function toggleMobileSidebar(open) {
    var aside = document.getElementById('sidebar');
    if (!aside) return;
    if (typeof open === 'boolean') aside.classList.toggle('sidebar--open', open);
    else aside.classList.toggle('sidebar--open');
    setHamburgerExpanded();
  }
  function closeMobileSidebar() {
    var aside = document.getElementById('sidebar');
    if (!aside) return;
    if (aside.classList.contains('sidebar--open')) aside.classList.remove('sidebar--open');
    setHamburgerExpanded();
  }
  function toggleCollapsed() {
    var aside = document.getElementById('sidebar');
    if (!aside) return;
    aside.classList.toggle('collapsed');
    state.sidebarCollapsed = aside.classList.contains('collapsed');
    saveState('ui');
  }

  /* ---------- 8. шапка ---------- */
  var mediaListener = null;
  function attachThemeMediaListener() {
    if (!window.matchMedia) return;
    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaListener) { try { mq.removeEventListener('change', mediaListener); } catch (e) {} mediaListener = null; }
      if (state.user.theme === 'system') {
        mediaListener = function () { applyTheme('system'); };
        mq.addEventListener('change', mediaListener);
      }
    } catch (e) {}
  }
  function applyTheme(t) {
    var theme = t || state.user.theme || 'system';
    var html = document.documentElement;
    if (theme === 'system') {
      var dark = false;
      try { dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) {}
      html.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }
    attachThemeMediaListener();
  }

  function renderHeader() {
    var header = document.getElementById('header');
    if (!header) return;
    var route = getRouteFromHash();
    var entry = ROUTES[route.name];
    var title = entry ? entry.title : 'QA Study Portfolio';
    var theme = state.user.theme || 'system';
    var expanded = document.getElementById('sidebar') && document.getElementById('sidebar').classList.contains('sidebar--open') ? 'true' : 'false';
    header.innerHTML =
      '<button type="button" class="hamburger" aria-expanded="' + expanded + '" aria-controls="sidebar" aria-label="Меню">'
      + '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>'
      + '<h1 class="header__title">' + esc(title) + '</h1>'
      + '<div class="header__search"><label class="visually-hidden" for="header-search">Поиск</label>'
      + '<input id="header-search" type="search" value="' + esc(state.searchQuery) + '" aria-label="Поиск">'
      + '<button type="button" class="header__clear" aria-label="Очистить поиск" hidden>×</button></div>'
      + '<button type="button" class="header__save" aria-label="Сохранить изменения">Сохранить</button>'
      + '<label class="theme-switch">Тема<select class="theme-switch__select" aria-label="Выбор темы">'
      + '<option value="light" ' + (theme === 'light' ? 'selected' : '') + '>Светлая</option>'
      + '<option value="dark" ' + (theme === 'dark' ? 'selected' : '') + '>Тёмная</option>'
      + '<option value="system" ' + (theme === 'system' ? 'selected' : '') + '>Системная</option>'
      + '</select></label>';
    var hamburger = header.querySelector('.hamburger');
    if (hamburger) hamburger.addEventListener('click', function () { toggleMobileSidebar(); });
    var search = header.querySelector('#header-search');
    if (search) {
      var onSearch = debounce(function () {
        state.searchQuery = search.value;
        header.querySelector('.header__clear').hidden = search.value === '';
        if (typeof App.onSearch === 'function') App.onSearch(state.searchQuery);
      }, 200);
      search.addEventListener('input', onSearch);
      header.querySelector('.header__clear').addEventListener('click', function () { search.value = ''; state.searchQuery = ''; this.hidden = true; onSearch(); search.focus(); });
    }
    header.querySelector('.header__save').addEventListener('click', function () {
      saveState('lessons'); saveState('user');
    });
    var sel = header.querySelector('.theme-switch__select');
    if (sel) sel.addEventListener('change', function () {
      state.user.theme = sel.value;
      applyTheme(sel.value);
      saveState('user');
    });
  }

  /* ---------- 9. контекстная панель ---------- */
  function renderContextPanel(route) {
    var panel = document.getElementById('context-panel');
    if (!panel) return;
    var name = route.name;
    var html = '';
    if (name === 'dashboard') {
      var total = 0, done = 0;
      for (var id in state.lessons) if (Object.prototype.hasOwnProperty.call(state.lessons, id)) { total++; if (state.lessons[id].status === 'done') done++; }
      var pct = total ? Math.round(done / total * 100) : 0;
      html = '<div class="context__block"><h3>Быстрые действия</h3><a href="#today">Задачи на сегодня</a><a href="#practice">Новая практика</a></div>'
        + '<div class="context__block"><h3>Прогресс курса</h3><div class="progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill"></div></div><span>' + done + ' / ' + total + '</span></div>';
    } else if (name === 'course') {
      var terms = [];
      for (var k in state.lessons) if (Object.prototype.hasOwnProperty.call(state.lessons, k) && state.lessons[k].terms) terms = terms.concat(state.lessons[k].terms);
      terms = terms.slice(0, 8);
      html = '<div class="context__block"><h3>Прогресс модуля</h3><span>Изучено тем: ' + Object.keys(state.lessons).length + '</span><a href="#roadmap">К маршруту</a></div><div class="context__block"><h3>Термины</h3><ul>' + terms.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    } else if (name === 'notes') {
      html = '<div class="context__block"><h3>Фильтры заметок</h3><span>Теги: ' + (state.tags.length ? esc(state.tags.map(function (t) { return t.name || t.id; }).join(', ')) : 'нет') + '</span><a href="#settings/tags">Управлять тегами</a></div>';
    } else if (name === 'practice') {
      html = '<div class="context__block"><h3>Практика</h3><span>Работ: ' + state.portfolio.length + '</span><a href="#portfolio">В портфолио</a></div>';
    } else if (name === 'portfolio') {
      html = '<div class="context__block"><h3>Портфолио</h3><span>Элементов: ' + state.portfolio.length + '</span><a href="#portfolio/presentation">Режим презентации</a></div>';
    } else {
      html = '<div class="context__block"><h3>Подсказка</h3><span>Данные хранятся только на этом компьютере.</span><a href="#stats">К статистике</a></div>';
    }
    panel.innerHTML = html;
    panel.querySelectorAll('.progress').forEach(function (pb) {
      var v = Number(pb.getAttribute('aria-valuenow')) || 0;
      setProgress(pb.querySelector('.progress-fill'), v);
    });
  }

  /* ---------- 10.4 баннер режима памяти ---------- */
  function showMemoryBanner() {
    var container = document.querySelector('.main-container');
    if (!container) return;
    if (container.querySelector('.memory-banner')) return;
    var banner = document.createElement('div');
    banner.className = 'memory-banner';
    banner.setAttribute('role', 'status');
    banner.textContent = 'Данные не сохраняются на диске. Экспортируйте их перед закрытием';
    var bc = document.getElementById('breadcrumbs');
    if (bc) container.insertBefore(banner, bc);
    else container.prepend(banner);
  }

  /* ---------- 11. инициализация ---------- */
  function openOnboarding() {
    if (typeof App.openModal === 'function') { try { App.openModal('onboarding'); return; } catch (e) {} }
    var modal = document.getElementById('onboarding-modal');
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      modal.style.display = 'block';
      var finish = function () {
        state.user.onboarded = true;
        saveState('user');
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';
        if (typeof App.hotkeys && App.hotkeys && typeof App.hotkeys.closeTopLayer === 'function') { try { App.hotkeys.closeTopLayer(); } catch (e) {} }
      };
      var doneBtn = modal.querySelector('[data-done-onboarding]');
      if (doneBtn) doneBtn.addEventListener('click', finish);
    }
  }

  window.App = window.App || {};
  App.state = state;
  App.debounce = debounce;
  App.setSaveIndicator = setSaveIndicator;
  App.setProgress = setProgress;
  App.markDirty = markDirty;
  App.dirtyLessons = dirtyLessons;
  App.saveState = saveState;
  App.loadState = loadState;
  App.router = router;
  App.getRouteFromHash = getRouteFromHash;
  App.renderSidebar = renderSidebar;
  App.renderHeader = renderHeader;
  App.updateBadges = updateBadges;
  App.renderContextPanel = renderContextPanel;
  App.renderEmptyState = renderEmptyState;
  App.registerRoute = function (name, render) {
    if (ROUTES[name] && typeof render === 'function') ROUTES[name].render = render;
  };
  App.toggleMobileSidebar = toggleMobileSidebar;
  App.closeMobileSidebar = closeMobileSidebar;
  App.toggleCollapsed = toggleCollapsed;
  App.applyTheme = applyTheme;

  App.init = function () {
    return window.IDB.init({
      onWarning: showWarningToast,
      onSaveState: setSaveIndicator,
      onQuotaWarning: showQuotaToast,
      onTabConflict: showTabConflictModal
    }).then(function () {
      if (window.IDB.getMode() === 'memory') showMemoryBanner();
      return App.loadState();
    }).then(function () {
      if (Object.keys(state.lessons).length === 0) {
        return window.IDB.loadDemoData().then(function () { return App.loadState(); });
      }
      return state;
    }).then(function () {
      window.IDB.estimate().then(function (r) {
        if (r && r.percent >= 80) showQuotaToast(r.percent);
      }).catch(function () {});
      return state;
    }).then(function () {
      applyTheme(state.user.theme);
      if (!window.location.hash || window.location.hash === '') window.location.hash = '#dashboard';
      App.renderSidebar();
      App.renderHeader();
      App.updateBadges();
      App.router();
      window.addEventListener('hashchange', App.router);
      if (typeof Keyboard !== 'undefined' && typeof Keyboard.init === 'function' && App.hotkeys) {
        try { Keyboard.init(App.hotkeys); } catch (e) {}
      }
      if (state.user.onboarded === false) openOnboarding();
      return state;
    }).catch(function (e) {
      showWarningToast('Ошибка инициализации: ' + (e && e.message ? e.message : e));
      setSaveIndicator('error');
      try { applyTheme(state.user.theme); } catch (e2) {}
      try { if (!window.location.hash) window.location.hash = '#dashboard'; App.renderSidebar(); App.renderHeader(); App.router(); } catch (e3) {}
    });
  };

  document.addEventListener('DOMContentLoaded', function () { App.init(); });

})(window);

/* js/core/main.js — часть 2 из 4 — менеджеры данных */
(function(window) {
  'use strict';

  var App = window.App;
  var state = App.state;

  /* ---------- 1. форма коллекций ---------- */
  ['notes', 'questions', 'flashcards', 'practice'].forEach(function(k) {
    var v = state[k];
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      state[k] = {};
    }
  });
  ['journal', 'sessions'].forEach(function(k) {
    if (!Array.isArray(state[k])) state[k] = [];
  });

  /* ---------- 1.1 toArray ---------- */
  function toArray(coll) {
    if (Array.isArray(coll)) return coll.slice();
    if (coll && typeof coll === 'object') return Object.keys(coll).map(function(k) { return coll[k]; });
    return [];
  }
  if (!App.toArray) App.toArray = toArray;

  /* ---------- 1.2 notify ---------- */
  function notify(message, type, action) {
    if (App && typeof App.toast === 'function') {
      try { return App.toast(message, type || 'info', action); } catch (e) {}
    }
    var c = document.getElementById('toast-container');
    if (!c) return null;
    var t = document.createElement('div');
    t.className = 'toast toast--' + (type || 'info');
    t.setAttribute('role', 'status');
    t.textContent = String(message);
    if (action && action.label && typeof action.onClick === 'function') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      btn.style.marginLeft = '8px';
      btn.addEventListener('click', action.onClick);
      t.appendChild(btn);
    }
    c.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 6000);
    return t;
  }
  if (!App.notify) App.notify = notify;

  function escapeHtml(s) {
    if (typeof Utils !== 'undefined' && Utils.Escape && typeof Utils.Escape.html === 'function') return Utils.Escape.html(String(s == null ? '' : s));
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function genId() {
    if (typeof Utils !== 'undefined' && Utils.Data && typeof Utils.Data.generateId === 'function') return Utils.Data.generateId();
    return 'id-' + Math.random().toString(36).slice(2, 10);
  }

  /* ---------- 2. загрузка данных менеджеров ---------- */
  App.loadManagerData = function() {
    var tasks = [];
    function loadDict(store) {
      return window.IDB.getAll(store).then(function(arr) {
        var dict = {};
        (arr || []).forEach(function(r) { if (r && r.id) dict[r.id] = r; });
        state[store] = dict;
      }).catch(function() {
        notify('Не удалось загрузить ' + store, 'warning');
        if (!state[store] || Array.isArray(state[store])) state[store] = {};
      });
    }
    function loadArray(store) {
      return window.IDB.getAll(store).then(function(arr) {
        state[store] = Array.isArray(arr) ? arr.slice() : [];
      }).catch(function() {
        notify('Не удалось загрузить ' + store, 'warning');
        if (!Array.isArray(state[store])) state[store] = [];
      });
    }
    tasks.push(loadDict('notes'));
    tasks.push(loadDict('questions'));
    tasks.push(loadDict('flashcards'));
    tasks.push(loadDict('practice'));
    tasks.push(loadArray('journal'));
    tasks.push(loadArray('sessions'));
    return Promise.all(tasks).then(function() { return state; });
  };

  /* ---------- 2.1 обёртка init ---------- */
  var prevInit = App.init;
  App.init = function() {
    return Promise.resolve(prevInit()).then(function() {
      return App.loadManagerData();
    }).then(function() {
      if (typeof App.updateBadges === 'function') try { App.updateBadges(); } catch (e) {}
      if (typeof App.router === 'function') try { App.router(); } catch (e) {}
      return state;
    }).catch(function() {
      notify('Не удалось загрузить данные разделов', 'warning');
      return state;
    });
  };

  /* ---------- 3. расширение saveState ---------- */
  var EXTRA_SCOPES = {
    tags: function() { return window.IDB.autoSave('tags', state.tags, 300); },
    categories: function() { return window.IDB.autoSave('categories', state.categories, 300); },
    journal: function() { return window.IDB.autoSave('journal', state.journal, 300); },
    sessions: function() { return window.IDB.autoSave('sessions', state.sessions, 300); },
    portfolio: function() { return window.IDB.autoSave('portfolio', state.portfolio, 300); },
    notes: function() { return window.IDB.autoSave('notes', toArray(state.notes), 300); },
    questions: function() { return window.IDB.autoSave('questions', toArray(state.questions), 300); },
    flashcards: function() { return window.IDB.autoSave('flashcards', toArray(state.flashcards), 300); },
    practice: function() { return window.IDB.autoSave('practice', toArray(state.practice), 300); }
  };
  if (App.saveScopes && typeof App.saveScopes === 'object') {
    Object.keys(EXTRA_SCOPES).forEach(function(k) { App.saveScopes[k] = EXTRA_SCOPES[k]; });
  } else {
    var prevSaveState = App.saveState;
    App.saveState = function(scope) {
      if (EXTRA_SCOPES[scope]) {
        try { EXTRA_SCOPES[scope](); } catch (e) {}
        if (typeof App.setSaveIndicator === 'function') try { App.setSaveIndicator('saved'); } catch (e2) {}
        return Promise.resolve();
      }
      if (typeof prevSaveState === 'function') return prevSaveState(scope);
      if (typeof Debug !== 'undefined' && Debug.Logger && typeof Debug.Logger.warn === 'function') try { Debug.Logger.warn('saveState: unknown scope ' + scope); } catch (e3) {}
      return Promise.resolve();
    };
  }

  /* ---------- 4. палитра тегов ---------- */
  var TAG_COLORS = ['#D4AF37','#C9A961','#B8945F','#A67C52','#8B6F47','#7A5C3A','#6B4E2E','#5A3D1F','#4A3018','#3A2410'];

  function getTextColor(hexColor) {
    try {
      var hex = String(hexColor).replace('#','');
      if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
      var r = parseInt(hex.slice(0,2),16)/255;
      var g = parseInt(hex.slice(2,4),16)/255;
      var b = parseInt(hex.slice(4,6),16)/255;
      function lin(c) { return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
      var rl = lin(r), gl = lin(g), bl = lin(b);
      var L = 0.2126*rl + 0.7152*gl + 0.0722*bl;
      function lum(hex2) {
        var h = hex2.replace('#','');
        var rr = parseInt(h.slice(0,2),16)/255, gg = parseInt(h.slice(2,4),16)/255, bb = parseInt(h.slice(4,6),16)/255;
        var rll = lin(rr), gll = lin(gg), bll = lin(bb);
        return 0.2126*rll + 0.7152*gll + 0.0722*bll;
      }
      var ln = lum('#0A1929'), lc = lum('#F5F0E8');
      var cn = (Math.max(L, ln) + 0.05) / (Math.min(L, ln) + 0.05);
      var cc = (Math.max(L, lc) + 0.05) / (Math.min(L, lc) + 0.05);
      var best = cn >= cc ? '#0A1929' : '#F5F0E8';
      var bestContrast = Math.max(cn, cc);
      return { color: best, contrast: bestContrast, sufficient: bestContrast >= 4.5 };
    } catch (e) { return { color: '#0A1929', contrast: 1, sufficient: false }; }
  }
  App.getTextColor = getTextColor;

  /* ---------- 5.2 таблица TAGGED ---------- */
  var TAGGED = [
    { store: 'lessons', scope: 'lessons', dict: true },
    { store: 'notes', scope: 'notes', dict: true },
    { store: 'questions', scope: 'questions', dict: true },
    { store: 'flashcards', scope: 'flashcards', dict: true },
    { store: 'practice', scope: 'practice', dict: true },
    { store: 'portfolio', scope: 'portfolio', dict: false }
  ];

  /* ---------- 5. TagsManager ---------- */
  function normalize(name) {
    var s = String(name).trim().toLowerCase();
    s = s.replace(/[^\u0400-\u04FFa-z0-9\-_ ]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    if (!s) return null;
    return s;
  }

  function removeRecord(id) {
    var idx = -1;
    for (var i = 0; i < state.tags.length; i++) if (state.tags[i].id === id) { idx = i; break; }
    if (idx !== -1) state.tags.splice(idx, 1);
  }

  App.TagsManager = {
    TAG_COLORS: TAG_COLORS,
    normalize: normalize,
    getTextColor: getTextColor,
    create: function(name) {
      var normalized = normalize(name);
      if (normalized === null) { notify('Недопустимое имя тега', 'warning'); return null; }
      if (String(name).trim() !== normalized) notify('Спецсимволы удалены из тега', 'info');
      if (normalized.length > 30) { notify('Максимум 30 символов', 'warning'); return null; }
      for (var i = 0; i < state.tags.length; i++) if (state.tags[i].name === normalized) { notify('Такой тег уже существует', 'info'); return state.tags[i].id; }
      var color = TAG_COLORS[state.tags.length % TAG_COLORS.length];
      var tag = { id: genId(), name: normalized, color: color, count: 0, createdAt: new Date().toISOString() };
      state.tags.push(tag);
      App.saveState('tags');
      return tag.id;
    },
    delete: function(id) {
      removeRecord(id);
      var affected = {};
      TAGGED.forEach(function(entry) {
        var coll = state[entry.store];
        var changed = [];
        if (entry.dict) {
          toArray(coll).forEach(function(el) {
            if (el.tags && el.tags.indexOf(id) !== -1) {
              el.tags = el.tags.filter(function(t) { return t !== id; });
              changed.push(el);
              if (entry.store === 'lessons' && typeof App.markDirty === 'function') App.markDirty(el.id);
            }
          });
        } else {
          (coll || []).forEach(function(el) {
            if (el.tags && el.tags.indexOf(id) !== -1) {
              el.tags = el.tags.filter(function(t) { return t !== id; });
              changed.push(el);
            }
          });
        }
        if (changed.length) affected[entry.store] = changed;
      });
      Object.keys(affected).forEach(function(store) {
        window.IDB.bulkPut(store, affected[store]).catch(function() {});
      });
      App.saveState('tags');
      this.getTagsWithCount();
    },
    rename: function(id, newName) {
      var normalized = normalize(newName);
      if (normalized === null) { notify('Недопустимое имя тега', 'warning'); return false; }
      if (normalized.length > 30) { notify('Максимум 30 символов', 'warning'); return false; }
      for (var i = 0; i < state.tags.length; i++) if (state.tags[i].id !== id && state.tags[i].name === normalized) { notify('Такой тег уже существует', 'warning'); return false; }
      for (var j = 0; j < state.tags.length; j++) if (state.tags[j].id === id) { state.tags[j].name = normalized; App.saveState('tags'); return true; }
      return false;
    },
    merge: function(sourceId, targetId) {
      if (sourceId === targetId) return false;
      var affected = {};
      TAGGED.forEach(function(entry) {
        var coll = state[entry.store];
        var changed = [];
        var list = entry.dict ? toArray(coll) : (coll || []);
        list.forEach(function(el) {
          if (el.tags && el.tags.indexOf(sourceId) !== -1) {
            var out = [];
            el.tags.forEach(function(t) {
              var rep = t === sourceId ? targetId : t;
              if (out.indexOf(rep) === -1) out.push(rep);
            });
            el.tags = out;
            changed.push(el);
            if (entry.store === 'lessons' && typeof App.markDirty === 'function') App.markDirty(el.id);
          }
        });
        if (changed.length) affected[entry.store] = changed;
      });
      Object.keys(affected).forEach(function(store) {
        window.IDB.bulkPut(store, affected[store]).catch(function() {});
      });
      removeRecord(sourceId);
      App.saveState('tags');
      this.getTagsWithCount();
      notify('Теги объединены', 'success');
      return true;
    },
    getTagsWithCount: function() {
      var counts = {};
      TAGGED.forEach(function(entry) {
        var list = entry.dict ? toArray(state[entry.store]) : (state[entry.store] || []);
        list.forEach(function(el) { (el.tags || []).forEach(function(tid) { counts[tid] = (counts[tid] || 0) + 1; }); });
      });
      state.tags.forEach(function(t) { t.count = counts[t.id] || 0; });
      var sorted = state.tags.slice().sort(function(a,b) {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, 'ru');
      });
      return sorted;
    },
    filter: function(elements, tagIds) {
      var arr = toArray(elements);
      if (!tagIds || !tagIds.length) return arr;
      return arr.filter(function(el) {
        if (!el.tags) return false;
        for (var i = 0; i < tagIds.length; i++) if (el.tags.indexOf(tagIds[i]) !== -1) return true;
        return false;
      });
    },
    addToElement: function(element, tagId) {
      if (!Array.isArray(element.tags)) element.tags = [];
      if (element.tags.length >= 10) { notify('Лимит 10 тегов на элемент', 'warning'); return false; }
      if (element.tags.indexOf(tagId) !== -1) return false;
      element.tags.push(tagId);
      return true;
    }
  };

  /* ---------- 6. CategoriesManager ---------- */
  App.CategoriesManager = {
    getDepth: function(categoryId) {
      if (categoryId === null || categoryId === undefined) return 0;
      var depth = 0;
      var cur = categoryId;
      var seen = {};
      for (var i = 0; i < 10; i++) {
        if (cur === null || cur === undefined) break;
        if (seen[cur]) {
          if (typeof Debug !== 'undefined' && Debug.Logger) try { Debug.Logger.warn('getDepth: cycle at ' + cur); } catch (e) {}
          return 99;
        }
        seen[cur] = true;
        var cat = null;
        for (var j = 0; j < state.categories.length; j++) if (state.categories[j].id === cur) { cat = state.categories[j]; break; }
        if (!cat) break;
        depth++;
        cur = cat.parent;
      }
      if (depth >= 10) {
        if (typeof Debug !== 'undefined' && Debug.Logger) try { Debug.Logger.warn('getDepth: max iterations'); } catch (e) {}
        return 99;
      }
      return depth;
    },
    create: function(name, parentId) {
      if (parentId === undefined) parentId = null;
      var trimmed = String(name).trim();
      if (!trimmed) { notify('Введите название категории', 'warning'); return null; }
      if (trimmed.length > 50) { notify('Максимум 50 символов', 'warning'); return null; }
      if (parentId !== null) {
        var found = false;
        for (var i = 0; i < state.categories.length; i++) if (state.categories[i].id === parentId) { found = true; break; }
        if (!found) { notify('Родительская категория не найдена', 'warning'); return null; }
        if (this.getDepth(parentId) >= 3) { notify('Максимум 3 уровня вложенности', 'warning'); return null; }
      }
      var cat = { id: genId(), name: trimmed, parent: parentId, children: [] };
      if (parentId !== null) {
        for (var k = 0; k < state.categories.length; k++) if (state.categories[k].id === parentId) { state.categories[k].children.push(cat.id); break; }
      }
      state.categories.push(cat);
      App.saveState('categories');
      return cat.id;
    },
    delete: function(id) {
      var toDelete = {};
      function collect(cid) {
        toDelete[cid] = true;
        for (var i = 0; i < state.categories.length; i++) if (state.categories[i].parent === cid) collect(state.categories[i].id);
      }
      collect(id);
      var target = null;
      for (var i = 0; i < state.categories.length; i++) if (state.categories[i].id === id) { target = state.categories[i]; break; }
      state.categories = state.categories.filter(function(c) { return !toDelete[c.id]; });
      if (target && target.parent !== null) {
        for (var j = 0; j < state.categories.length; j++) if (state.categories[j].id === target.parent) {
          state.categories[j].children = state.categories[j].children.filter(function(cid) { return !toDelete[cid]; });
          break;
        }
      }
      var affected = {};
      TAGGED.forEach(function(entry) {
        var list = entry.dict ? toArray(state[entry.store]) : (state[entry.store] || []);
        var changed = [];
        list.forEach(function(el) {
          if (el.category && toDelete[el.category]) { el.category = null; changed.push(el); if (entry.store === 'lessons' && typeof App.markDirty === 'function') App.markDirty(el.id); }
        });
        if (changed.length) affected[entry.store] = changed;
      });
      Object.keys(affected).forEach(function(store) { window.IDB.bulkPut(store, affected[store]).catch(function() {}); });
      App.saveState('categories');
    },
    rename: function(id, newName) {
      var trimmed = String(newName).trim();
      if (!trimmed) { notify('Введите название', 'warning'); return false; }
      if (trimmed.length > 50) { notify('Максимум 50 символов', 'warning'); return false; }
      for (var i = 0; i < state.categories.length; i++) if (state.categories[i].id === id) { state.categories[i].name = trimmed; App.saveState('categories'); return true; }
      return false;
    },
    getTree: function() {
      function build(parent) {
        var nodes = state.categories.filter(function(c) { return c.parent === parent; }).sort(function(a,b){ return a.name.localeCompare(b.name, 'ru'); });
        return nodes.map(function(n) {
          return { id: n.id, name: n.name, parent: n.parent, children: build(n.id) };
        });
      }
      return build(null);
    },
    getFlat: function() {
      var out = [];
      function walk(parent, depth, prefix) {
        var nodes = state.categories.filter(function(c){ return c.parent === parent; }).sort(function(a,b){ return a.name.localeCompare(b.name,'ru'); });
        nodes.forEach(function(n) {
          var path = prefix ? prefix + ' / ' + n.name : n.name;
          out.push({ id: n.id, name: n.name, depth: depth, path: path });
          walk(n.id, depth + 1, path);
        });
      }
      walk(null, 1, '');
      return out;
    },
    assign: function(elementType, elementId, categoryId) {
      var map = {
        lesson: { store: 'lessons', dict: true },
        note: { store: 'notes', dict: true },
        question: { store: 'questions', dict: true },
        flashcard: { store: 'flashcards', dict: true },
        practice: { store: 'practice', dict: true },
        portfolio: { store: 'portfolio', dict: false }
      };
      var entry = map[elementType];
      if (!entry) return false;
      var el = null;
      if (entry.dict) el = state[entry.store][elementId];
      else { for (var i = 0; i < state[entry.store].length; i++) if (state[entry.store][i].id === elementId) { el = state[entry.store][i]; break; } }
      if (!el) return false;
      el.category = categoryId;
      App.saveState(entry.store);
      if (entry.store === 'lessons' && typeof App.markDirty === 'function') App.markDirty(elementId);
      return true;
    },
    filter: function(elements, categoryIds) {
      var arr = toArray(elements);
      if (!categoryIds || !categoryIds.length) return arr;
      return arr.filter(function(el) { return categoryIds.indexOf(el.category) !== -1; });
    },
    getPath: function(id) {
      var path = [];
      var cur = id;
      var guard = 0;
      while (cur !== null && cur !== undefined && guard < 10) {
        var cat = null;
        for (var i = 0; i < state.categories.length; i++) if (state.categories[i].id === cur) { cat = state.categories[i]; break; }
        if (!cat) break;
        path.unshift(cat.name);
        cur = cat.parent;
        guard++;
      }
      return path;
    }
  };

  /* ---------- 7. SharingManager ---------- */
  function encodeMarker(str) { return window.btoa(window.unescape(window.encodeURIComponent(String(str)))); }
  function decodeMarker(str) { try { return window.decodeURIComponent(window.escape(window.atob(String(str)))); } catch (e) { return null; } }

  function getModalBody() {
    var m = document.getElementById('sharing-modal');
    if (!m) return null;
    var body = m.querySelector('.modal__body');
    return body || m;
  }
  function openSharingModal() {
    var m = document.getElementById('sharing-modal');
    if (!m) return;
    if (typeof App.openModal === 'function') try { App.openModal('sharing'); return; } catch (e) {}
    m.removeAttribute('hidden');
    m.setAttribute('aria-hidden', 'false');
  }
  function closeSharingModal() {
    var m = document.getElementById('sharing-modal');
    if (!m) return;
    if (typeof App.closeModal === 'function') try { App.closeModal('sharing'); return; } catch (e) {}
    m.setAttribute('hidden', 'hidden');
    m.setAttribute('aria-hidden', 'true');
  }

  App.SharingManager = {
    encodeMarker: encodeMarker,
    decodeMarker: decodeMarker,
    exportPackage: function(options) {
      var name = String(options.name || '').trim();
      var description = String(options.description || '').trim();
      var sender = String(options.sender || '').trim();
      var password = String(options.password || '');
      var items = options.items || [];
      if (!name) { notify('Введите название пакета', 'warning'); return; }
      if (name.length > 100) { notify('Название до 100 символов', 'warning'); return; }
      if (description.length > 500) { notify('Описание до 500 символов', 'warning'); return; }
      if (password.length > 32) { notify('Пароль до 32 символов', 'warning'); return; }
      var allowed = { notes:1, questions:1, flashcards:1, practice:1, portfolio:1, lessons:1, tags:1, categories:1 };
      var pkgItems = {};
      var total = 0;
      items.forEach(function(entry) {
        if (!allowed[entry.type]) return;
        var out = [];
        var store = entry.type;
        var dictStores = { notes:1, questions:1, flashcards:1, practice:1, lessons:1 };
        (entry.ids || []).forEach(function(id) {
          var rec = null;
          if (dictStores[store]) rec = state[store][id];
          else {
            var arr = state[store] || [];
            for (var i = 0; i < arr.length; i++) if (arr[i].id === id) { rec = arr[i]; break; }
            if (!rec && (store === 'tags' || store === 'categories')) {
              for (var j = 0; j < state[store].length; j++) if (state[store][j].id === id) rec = state[store][j];
            }
          }
          if (rec) out.push(rec);
        });
        pkgItems[store] = out;
        total += out.length;
      });
      var pkg = {
        packageName: name,
        description: description,
        sender: sender,
        password: password ? encodeMarker(password) : '',
        createdAt: new Date().toISOString(),
        schemaVersion: 1,
        appName: 'QA Study Portfolio',
        items: pkgItems
      };
      var json = JSON.stringify(pkg, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var d = new Date();
      var pad = function(n){ return n < 10 ? '0' + n : '' + n; };
      var fname = 'qa-package-' + d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
      var a = document.createElement('a');
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.parentNode.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
      var entry2 = { id: genId(), type: 'export', date: new Date().toISOString(), itemsCount: total, packageName: name };
      state.journal.push(entry2);
      App.saveState('journal');
      notify('Пакет экспортирован: ' + total + ' элементов', 'success');
    },
    importPackage: function(file) {
      if (!file || (!(file.name && file.name.slice(-5).toLowerCase() === '.json') && file.type !== 'application/json')) {
        notify('Ожидается JSON до 10 МБ', 'warning');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { notify('Ожидается JSON до 10 МБ', 'warning'); return; }
      var reader = new FileReader();
      reader.onerror = function() { notify('Не удалось прочитать файл', 'danger'); };
      reader.onload = function() {
        var data;
        try { data = JSON.parse(String(reader.result)); } catch (e) { notify('Файл повреждён', 'danger'); return; }
        if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.schemaVersion !== 'number' || !data.items || typeof data.items !== 'object' || Array.isArray(data.items)) {
          notify('Неверный формат', 'danger'); return;
        }
        if (data.schemaVersion > 1) { notify('Пакет создан более новой версией приложения', 'warning'); return; }
        function doImport() { runImport(data); }
        if (data.password) {
          var body = getModalBody();
          openSharingModal();
          if (body) {
            body.innerHTML = '<label for="sharing-password">Пароль пакета</label><input id="sharing-password" type="password" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:8px;">'
              + '<p style="font-size:12px;opacity:0.7;">Пароль — маркер совпадения при импорте, не шифрование. Содержимое пакета видно в текстовом редакторе.</p>'
              + '<div style="display:flex;gap:8px;margin-top:12px;"><button type="button" id="sharing-confirm" style="min-height:44px;padding:0 14px;background:#D4AF37;">Подтвердить</button><button type="button" id="sharing-cancel" style="min-height:44px;padding:0 14px;border:1px solid #D4AF37;">Отмена</button></div>';
            var conf = body.querySelector('#sharing-confirm');
            var canc = body.querySelector('#sharing-cancel');
            var inp = body.querySelector('#sharing-password');
            if (conf) conf.addEventListener('click', function() {
              var val = inp ? inp.value : '';
              if (decodeMarker(data.password) !== val) { notify('Пароль не совпадает', 'danger'); return; }
              closeSharingModal();
              doImport();
            });
            if (canc) canc.addEventListener('click', function() { closeSharingModal(); });
            if (inp) inp.focus();
          }
        } else {
          doImport();
        }
      };
      reader.readAsText(file, 'utf-8');
    },
    getJournal: function() {
      var sorted = state.journal.slice().sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
      return sorted.slice(0, 50);
    },
    clearJournal: function() {
      state.journal = [];
      window.IDB.clear('journal').catch(function(){});
      notify('Журнал обмена очищен', 'info');
    }
  };

  function runImport(data) {
    window.IDB.exportAll().then(function(all) {
      try { window.localStorage.setItem('qa-sp-backup-auto', JSON.stringify(all)); } catch (e) {
        var body = getModalBody();
        openSharingModal();
        if (body) {
          body.innerHTML = '<p>Резервная копия не создана. Продолжить импорт?</p><div style="display:flex;gap:8px;"><button type="button" id="sharing-continue" style="min-height:44px;padding:0 14px;background:#D4AF37;">Продолжить</button><button type="button" id="sharing-abort" style="min-height:44px;padding:0 14px;border:1px solid #D4AF37;">Отмена</button></div>';
          var cont = body.querySelector('#sharing-continue');
          var ab = body.querySelector('#sharing-abort');
          if (cont) cont.addEventListener('click', function(){ closeSharingModal(); doBulkImport(data); });
          if (ab) ab.addEventListener('click', function(){ closeSharingModal(); });
          return;
        }
      }
      doBulkImport(data);
    }).catch(function() { doBulkImport(data); });
  }

  function doBulkImport(data) {
    var allowed = { notes:1, questions:1, flashcards:1, practice:1, portfolio:1, lessons:1, tags:1, categories:1 };
    var errors = [];
    var validByStore = {};
    Object.keys(data.items || {}).forEach(function(store) {
      if (!allowed[store]) return;
      var arr = data.items[store];
      if (!Array.isArray(arr)) return;
      validByStore[store] = [];
      arr.forEach(function(rec, idx) {
        if (!rec || !rec.id) errors.push(store + ' #' + (idx+1) + ': отсутствует поле id');
        else validByStore[store].push(rec);
      });
    });
    if (errors.length) {
      var body = getModalBody();
      openSharingModal();
      if (body) {
        body.innerHTML = '<p>Найдены ошибки:</p><ul>' + errors.map(function(e){ return '<li>' + escapeHtml(e) + '</li>'; }).join('') + '</ul>'
          + '<div style="display:flex;gap:8px;margin-top:12px;"><button type="button" id="sharing-valid" style="min-height:44px;padding:0 14px;background:#D4AF37;">Импортировать только валидные</button><button type="button" id="sharing-cancel2" style="min-height:44px;padding:0 14px;border:1px solid #D4AF37;">Отмена</button></div>';
        var v = body.querySelector('#sharing-valid');
        var c2 = body.querySelector('#sharing-cancel2');
        if (v) v.addEventListener('click', function(){ closeSharingModal(); bulkPutValid(validByStore, errors.length); });
        if (c2) c2.addEventListener('click', function(){ closeSharingModal(); });
        return;
      }
    }
    bulkPutValid(validByStore, errors.length);
  }

  function bulkPutValid(validByStore, skipped) {
    var promises = [];
    Object.keys(validByStore).forEach(function(store) {
      var arr = validByStore[store];
      if (!arr.length) return;
      promises.push(window.IDB.bulkPut(store, arr).catch(function(e) {
        if (e && e.name === 'QuotaExceededError') {
          return window.IDB.clearOldSessions().then(function(){ return window.IDB.bulkPut(store, arr); }).catch(function() {
            notify('Недостаточно места. Очистите старые данные.', 'danger');
          });
        }
      }));
    });
    Promise.all(promises).then(function() {
      Object.keys(validByStore).forEach(function(store) {
        var arr = validByStore[store];
        if (store === 'tags' || store === 'categories' || store === 'portfolio' || store === 'journal' || store === 'sessions') {
          var existing = state[store] || [];
          var byId = {};
          existing.forEach(function(r){ byId[r.id]=true; });
          arr.forEach(function(r){ if (!byId[r.id]) existing.push(r); else { for (var i=0;i<existing.length;i++) if (existing[i].id===r.id) existing[i]=r; } });
          state[store]=existing;
        } else {
          arr.forEach(function(r){ state[store][r.id]=r; });
        }
      });
      var totalValid = 0;
      Object.keys(validByStore).forEach(function(k){ totalValid += validByStore[k].length; });
      var entry = { id: genId(), type: 'import', date: new Date().toISOString(), itemsCount: totalValid, sender: dataSender(), packageName: dataPackageName(), skipped: skipped };
      // sender/package from last import data - retrieve via closure? fallback
      state.journal.push(entry);
      App.saveState('journal');
      notify('Импорт завершён: ' + totalValid + ' элементов, пропущено ' + skipped, 'success');
      if (typeof App.updateBadges === 'function') try { App.updateBadges(); } catch (e2) {}
      if (typeof App.router === 'function') try { App.router(); } catch (e3) {}
    });
    function dataSender(){ try { return validByStore._sender || ''; } catch (e){ return ''; } }
    function dataPackageName(){ try { return validByStore._packageName || ''; } catch (e){ return ''; } }
  }

  /* ---------- 8. PresentationManager ---------- */
  App.PresentationManager = {
    previousState: null,
    getItems: function() {
      return (state.portfolio || []).filter(function(p) {
        return p.presentationReady === true && (p.status === 'ready' || p.status === 'published');
      });
    },
    start: function() {
      var items = this.getItems();
      if (!items.length) {
        var main = document.getElementById('main-content');
        if (main) main.innerHTML = App.renderEmptyState('Нет элементов для презентации', 'Отметьте элементы портфолио статусом ready или published и включите флаг для презентации.', 'Перейти к портфолио', 'portfolio');
        return;
      }
      this.previousState = { sidebarCollapsed: state.sidebarCollapsed, hash: '#portfolio', focused: document.activeElement };
      document.documentElement.classList.add('presentation-mode');
      this.render(items);
    },
    render: function(items) {
      var main = document.getElementById('main-content');
      if (!main) return;
      var self = this;
      var html = '<button type="button" id="presentation-exit" aria-label="Выйти из режима презентации" style="min-height:44px;padding:0 14px;border:1px solid #D4AF37;margin-bottom:16px;">Выйти из режима презентации</button>';
      html += '<div style="display:grid;gap:16px;">';
      items.forEach(function(p) {
        var tags = (p.tags || []).filter(function(tid){
          var tag = null;
          for (var i=0;i<state.tags.length;i++) if (state.tags[i].id===tid) tag=state.tags[i];
          return tag && tag.name.charAt(0) !== '_';
        }).map(function(tid){
          var tag = null;
          for (var i=0;i<state.tags.length;i++) if (state.tags[i].id===tid) tag=state.tags[i];
          return tag ? '<span style="display:inline-block;padding:4px 8px;background:#0A1929;color:#F5F0E8;font-size:12px;margin:2px;">' + escapeHtml(tag.name) + '</span>' : '';
        }).join('');
        html += '<article style="border:2px solid #D4AF37;padding:16px;background:#F5F0E8;">'
          + '<h2 style="margin:0 0 8px;color:#0A1929;">' + escapeHtml(p.title || '') + '</h2>'
          + '<div style="font-size:12px;opacity:0.7;margin-bottom:8px;">' + escapeHtml(p.type || '') + ' · ' + escapeHtml(p.date || '') + '</div>'
          + (p.description ? '<p style="margin:8px 0;">' + escapeHtml(p.description) + '</p>' : '')
          + (p.task ? '<p><strong>Задача:</strong> ' + escapeHtml(p.task) + '</p>' : '')
          + (p.solution ? '<p><strong>Решение:</strong> ' + escapeHtml(p.solution) + '</p>' : '')
          + (p.tools ? '<p><strong>Инструменты:</strong> ' + escapeHtml(Array.isArray(p.tools) ? p.tools.join(', ') : p.tools) + '</p>' : '')
          + (p.skills ? '<p><strong>Навыки:</strong> ' + escapeHtml(Array.isArray(p.skills) ? p.skills.join(', ') : p.skills) + '</p>' : '')
          + (tags ? '<div style="margin-top:8px;">' + tags + '</div>' : '')
          + '</article>';
      });
      html += '</div>';
      html += '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;"><button type="button" id="presentation-export-html" style="min-height:44px;padding:0 14px;background:#D4AF37;">Экспорт HTML</button><button type="button" id="presentation-export-md" style="min-height:44px;padding:0 14px;border:1px solid #D4AF37;">Экспорт Markdown</button></div>';
      main.innerHTML = html;
      var exitBtn = document.getElementById('presentation-exit');
      if (exitBtn) exitBtn.addEventListener('click', function(){ self.exit(); });
      var eh = document.getElementById('presentation-export-html');
      if (eh) eh.addEventListener('click', function(){ self.exportHTML(items); });
      var em = document.getElementById('presentation-export-md');
      if (em) em.addEventListener('click', function(){ self.exportMarkdown(items); });
    },
    exportHTML: function(items) {
      var list = items || this.getItems();
      var rows = list.map(function(p){
        return '<article style="border:2px solid #D4AF37;padding:16px;margin-bottom:16px;background:#fff;">'
          + '<h2 style="color:#0A1929;">' + escapeHtml(p.title||'') + '</h2>'
          + '<div style="font-size:12px;opacity:0.7;">' + escapeHtml(p.type||'') + ' · ' + escapeHtml(p.date||'') + '</div>'
          + (p.description ? '<p>' + escapeHtml(p.description) + '</p>' : '')
          + (p.task ? '<p><strong>Задача:</strong> ' + escapeHtml(p.task) + '</p>' : '')
          + (p.solution ? '<p><strong>Решение:</strong> ' + escapeHtml(p.solution) + '</p>' : '')
          + (p.tools ? '<p><strong>Инструменты:</strong> ' + escapeHtml(Array.isArray(p.tools)?p.tools.join(', '):p.tools) + '</p>' : '')
          + (p.skills ? '<p><strong>Навыки:</strong> ' + escapeHtml(Array.isArray(p.skills)?p.skills.join(', '):p.skills) + '</p>' : '')
          + '</article>';
      }).join('');
      var html = '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Портфолио</title><style>body{font-family:system-ui,Arial,sans-serif;background:#F5F0E8;color:#0A1929;max-width:800px;margin:0 auto;padding:24px;}h1{font-family:Georgia,serif;color:#0A1929;border-bottom:3px solid #D4AF37;padding-bottom:8px;}</style></head><body><h1>Портфолио QA-инженера</h1>' + rows + '</body></html>';
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var d = new Date(); var pad=function(n){return n<10?'0'+n:''+n;};
      var a = document.createElement('a'); a.href=url; a.download='qa-portfolio-' + d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + '.html';
      document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    },
    exportMarkdown: function(items) {
      var list = items || this.getItems();
      var d = new Date(); var pad=function(n){return n<10?'0'+n:''+n;};
      var md = '# Портфолио QA-инженера\nДата формирования: ' + pad(d.getDate()) + '.' + pad(d.getMonth()+1) + '.' + d.getFullYear() + '\n\n';
      function escMd(s){
        var t = String(s||'');
        return t.replace(/^#/gm, '\\#').replace(/^\*/gm, '\\*').replace(/^>/gm, '\\>');
      }
      list.forEach(function(p){
        md += '## ' + escMd(p.title||'') + '\n';
        md += '**Тип:** ' + escMd(p.type||'') + '\n';
        if (p.task) md += '**Задача:** ' + escMd(p.task) + '\n';
        if (p.solution) md += '**Решение:** ' + escMd(p.solution) + '\n';
        if (p.tools) md += '**Инструменты:** ' + escMd(Array.isArray(p.tools)?p.tools.join(', '):p.tools) + '\n';
        if (p.skills) md += '**Навыки:** ' + escMd(Array.isArray(p.skills)?p.skills.join(', '):p.skills) + '\n';
        if (p.date) md += '**Дата:** ' + escMd(p.date) + '\n';
        md += '\n---\n\n';
      });
      var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href=url; a.download='qa-portfolio-' + d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + '.md';
      document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    },
    exit: function() {
      if (!this.previousState) return;
      document.documentElement.classList.remove('presentation-mode');
      state.sidebarCollapsed = this.previousState.sidebarCollapsed;
      var target = this.previousState.hash;
      var focused = this.previousState.focused;
      this.previousState = null;
      if (window.location.hash === target) {
        if (typeof App.router === 'function') App.router();
      } else {
        window.location.hash = target;
      }
      setTimeout(function() {
        if (focused && document.contains(focused) && typeof focused.focus === 'function') try { focused.focus(); } catch (e2) {}
        else { var m = document.getElementById('main-content'); if (m) try { m.focus(); } catch (e3) {} }
      }, 0);
    }
  };

})(window);

/* js/core/main.js — часть 3 из 4 — render-функции: home, today, roadmap, mindmap, course, lesson */
(function(window) {
  'use strict';

  var App = window.App;
  var state = App.state;

  /* ---------- 1. дополнения к state ---------- */
  ['notes', 'questions', 'flashcards', 'practice'].forEach(function(k) {
    var v = state[k];
    if (!v || typeof v !== 'object' || Array.isArray(v)) state[k] = {};
  });
  ['sessions', 'journal'].forEach(function(k) {
    if (!Array.isArray(state[k])) state[k] = [];
  });
  if (!state.meta) state.meta = { lastActiveDate: null, lastLessonId: null };
  if (!state.lessons) state.lessons = {};
  if (!state.portfolio) state.portfolio = [];
  if (!state.tags) state.tags = [];
  if (!state.categories) state.categories = [];

  function toArray(coll) {
    if (App.toArray) return App.toArray(coll);
    if (Array.isArray(coll)) return coll.slice();
    if (coll && typeof coll === 'object') return Object.keys(coll).map(function(k) { return coll[k]; });
    return [];
  }
  if (!App.toArray) App.toArray = toArray;

  function findById(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) return arr[i];
    return null;
  }

  function esc(s) {
    if (typeof Utils !== 'undefined' && Utils.Escape && typeof Utils.Escape.html === 'function') return Utils.Escape.html(String(s == null ? '' : s));
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function genId() {
    if (typeof Utils !== 'undefined' && Utils.Data && typeof Utils.Data.generateId === 'function') return Utils.Data.generateId();
    return 'id-' + Math.random().toString(36).slice(2, 10);
  }
  function fmtDate(d) {
    if (typeof Utils !== 'undefined' && Utils.Format && typeof Utils.Format.formatDate === 'function') return Utils.Format.formatDate(d);
    if (!d) return '';
    try { var dt = new Date(d); return dt.toLocaleDateString('ru-RU'); } catch (e) { return String(d); }
  }

  /* ---------- 2. расширенная схема урока ---------- */
  var LESSON_DEFAULTS = {
    goal: '', expectedResult: '', keyPoint: '', ownWords: '', unclear: '', conclusion: '',
    answers: null, practice: '', practiceSkipped: false, foundBugs: null,
    understanding: 0, timeSpent: 0, studyDate: null, nextReview: null,
    inPortfolio: false, tags: null, category: null, orphan: false
  };
  function ensureLessonFields(rec) {
    if (!rec) return rec;
    if (rec.goal === undefined) rec.goal = '';
    if (rec.expectedResult === undefined) rec.expectedResult = '';
    if (rec.status === undefined) rec.status = 'new';
    if (rec.notes === undefined) rec.notes = '';
    if (rec.keyPoint === undefined) rec.keyPoint = '';
    if (rec.ownWords === undefined) rec.ownWords = '';
    if (rec.unclear === undefined) rec.unclear = '';
    if (rec.conclusion === undefined) rec.conclusion = '';
    if (!rec.answers || typeof rec.answers !== 'object' || Array.isArray(rec.answers)) rec.answers = {};
    if (rec.practice === undefined) rec.practice = '';
    if (typeof rec.practiceSkipped !== 'boolean') rec.practiceSkipped = false;
    if (!Array.isArray(rec.foundBugs)) rec.foundBugs = [];
    if (typeof rec.understanding !== 'number') rec.understanding = 0;
    if (typeof rec.timeSpent !== 'number') rec.timeSpent = 0;
    if (rec.studyDate === undefined) rec.studyDate = null;
    if (rec.nextReview === undefined) rec.nextReview = null;
    if (typeof rec.inPortfolio !== 'boolean') rec.inPortfolio = false;
    if (!Array.isArray(rec.tags)) rec.tags = [];
    if (rec.category === undefined) rec.category = null;
    if (typeof rec.orphan !== 'boolean') rec.orphan = false;
    if (!rec.moduleId) rec.moduleId = '';
    if (!rec.title) rec.title = '';
    if (rec.order === undefined) rec.order = 0;
    if (rec.summary === undefined) rec.summary = '';
    if (!Array.isArray(rec.terms)) rec.terms = [];
    return rec;
  }

  /* ---------- 3. статусы ---------- */
  var LESSON_STATUS_LABELS = {
    'new': 'Новый',
    'planned': 'Запланирован',
    'studying': 'Изучается',
    'material': 'Материал изучен',
    'practice-due': 'Ждёт практики',
    'review': 'На повторении',
    'done': 'Завершён'
  };
  var FILTER_MAP = {
    'not-started': ['new', 'planned'],
    'in-progress': ['studying', 'material', 'practice-due', 'review'],
    'completed': ['done'],
    'all': ['new', 'planned', 'studying', 'material', 'practice-due', 'review', 'done']
  };
  function computeLessonStatus(lesson) {
    if (!lesson) return 'new';
    if (lesson.status === 'new') return 'new';
    var hasConclusion = !!(lesson.conclusion && String(lesson.conclusion).trim());
    var hasAnswers = !!(lesson.answers && Object.keys(lesson.answers).length > 0);
    var hasPractice = !!(lesson.practice && String(lesson.practice).trim()) || !!lesson.practiceSkipped;
    var hasUnderstanding = typeof lesson.understanding === 'number' && lesson.understanding >= 1;
    if (hasConclusion && hasAnswers && hasPractice && hasUnderstanding) return 'done';
    return lesson.status;
  }
  App.LESSON_STATUS_LABELS = LESSON_STATUS_LABELS;
  App.computeLessonStatus = computeLessonStatus;

  /* ---------- 4. вспомогательные расчёты ---------- */
  function flatTopics() {
    var out = [];
    if (!window.CourseData || !Array.isArray(window.CourseData.modules)) return out;
    var mods = window.CourseData.modules.slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    mods.forEach(function(m) {
      var topics = (m.topics || []).slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
      topics.forEach(function(t) { out.push(t.id); });
    });
    return out;
  }
  function moduleProgress(moduleId) {
    var mod = null;
    if (window.CourseData && Array.isArray(window.CourseData.modules)) {
      for (var i = 0; i < window.CourseData.modules.length; i++) if (window.CourseData.modules[i].id === moduleId) { mod = window.CourseData.modules[i]; break; }
    }
    var topicIds = mod ? (mod.topics || []).map(function(t) { return t.id; }) : [];
    if (!topicIds.length) {
      var count = 0, done = 0;
      for (var k in state.lessons) if (Object.prototype.hasOwnProperty.call(state.lessons, k) && state.lessons[k].moduleId === moduleId) {
        count++;
        if (state.lessons[k].status === 'done' || computeLessonStatus(state.lessons[k]) === 'done') done++;
      }
      var pct = count ? Math.round(done / count * 100) : 0;
      var st = pct === 100 && count > 0 ? 'done' : pct > 0 ? 'in-progress' : 'new';
      return { total: count, done: done, percent: pct, status: st };
    }
    var total = topicIds.length;
    var done2 = 0;
    topicIds.forEach(function(id) {
      var rec = state.lessons[id];
      if (rec && (rec.status === 'done' || computeLessonStatus(rec) === 'done')) done2++;
    });
    var pct2 = total ? Math.round(done2 / total * 100) : 0;
    var status2 = pct2 === 100 ? 'done' : pct2 > 0 ? 'in-progress' : 'new';
    return { total: total, done: done2, percent: pct2, status: status2 };
  }
  function totalProgress() {
    var all = flatTopics();
    if (!all.length) {
      var keys = Object.keys(state.lessons);
      var d = keys.filter(function(id) { return state.lessons[id].status === 'done' || computeLessonStatus(state.lessons[id]) === 'done'; }).length;
      var p = keys.length ? Math.round(d / keys.length * 100) : 0;
      return { total: keys.length, done: d, percent: p };
    }
    var done = 0;
    all.forEach(function(id) {
      var rec = state.lessons[id];
      if (rec && (rec.status === 'done' || computeLessonStatus(rec) === 'done')) done++;
    });
    return { total: all.length, done: done, percent: all.length ? Math.round(done / all.length * 100) : 0 };
  }
  function studyStreak() {
    var sessions = state.sessions || [];
    if (!sessions.length) return 0;
    var dates = sessions.map(function(s) { return new Date(s.date || s.createdAt || Date.now()).toDateString(); });
    var uniq = {};
    dates.forEach(function(d) { uniq[d] = true; });
    var sorted = Object.keys(uniq).map(function(d) { return new Date(d).getTime(); }).sort(function(a, b) { return b - a; });
    var streak = 1;
    var oneDay = 86400000;
    for (var i = 1; i < sorted.length; i++) {
      if (Math.abs(sorted[i - 1] - sorted[i]) <= oneDay + 1000 && Math.abs(sorted[i - 1] - sorted[i]) >= oneDay - 1000) streak++;
      else if (Math.abs(sorted[i - 1] - sorted[i]) < oneDay) continue;
      else break;
    }
    return sorted.length ? streak : 0;
  }
  function totalStudyTime() {
    var sum = 0;
    for (var k in state.lessons) if (Object.prototype.hasOwnProperty.call(state.lessons, k)) sum += Number(state.lessons[k].timeSpent || 0);
    return sum;
  }
  function dueFlashcards() {
    var arr = toArray(state.flashcards);
    var now = Date.now();
    return arr.filter(function(c) {
      if (!c.nextReview) return true;
      try { return new Date(c.nextReview).getTime() <= now; } catch (e) { return true; }
    });
  }
  function duePractice() {
    var arr = toArray(state.practice);
    return arr.filter(function(p) { return !p.done && p.status !== 'done'; });
  }
  function portfolioCount() { return (state.portfolio || []).length; }
  function daysSinceLastActive() {
    var d = state.meta.lastActiveDate;
    if (!d) return 999;
    try { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); } catch (e) { return 999; }
  }

  /* ---------- общие рендер-утилиты ---------- */
  function getMain() { return document.getElementById('main-content'); }
  function setMain(htmlOrFragment) {
    var main = getMain();
    if (!main) return;
    if (typeof htmlOrFragment === 'string') {
      var div = document.createElement('div');
      div.innerHTML = htmlOrFragment;
      var frag = document.createDocumentFragment();
      while (div.firstChild) frag.appendChild(div.firstChild);
      main.replaceChildren(frag);
    } else if (htmlOrFragment && htmlOrFragment.nodeType) {
      main.replaceChildren(htmlOrFragment);
    }
  }
  function progressBar(percent, label) {
    var p = Math.max(0, Math.min(100, Number(percent) || 0));
    return '<div class="progress-gold" role="progressbar" aria-valuenow="' + Math.round(p) + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(label || 'Прогресс') + '"><div class="progress-fill" style="transform:scaleX(' + (p / 100) + ')"></div></div>';
  }
  function applyProgressBars(root) {
    var bars = (root || document).querySelectorAll('[role="progressbar"]');
    bars.forEach(function(bar) {
      var fill = bar.querySelector('.progress-fill');
      if (fill && typeof App.setProgress === 'function') {
        var v = Number(bar.getAttribute('aria-valuenow')) || 0;
        App.setProgress(fill, v);
      }
    });
  }

  /* ---------- 5. renderHome ---------- */
  function renderHome() {
    var tp = totalProgress();
    var streak = studyStreak();
    var totalTime = totalStudyTime();
    var dueF = dueFlashcards().length;
    var dueP = duePractice().length;
    var pCount = portfolioCount();
    var flat = flatTopics();
    var lastId = state.meta.lastLessonId;
    var lastRec = lastId ? state.lessons[lastId] : null;
    if (!lastRec && flat.length) {
      for (var i = 0; i < flat.length; i++) {
        var r = state.lessons[flat[i]];
        if (r && r.status !== 'done') { lastRec = r; break; }
      }
    }
    var continueId = null;
    var dueCards = dueFlashcards();
    if (dueCards.length) continueId = dueCards[0].id;
    else if (lastRec) continueId = lastRec.id;
    else {
      for (var j = 0; j < flat.length; j++) {
        var rr = state.lessons[flat[j]];
        if (!rr || rr.status !== 'done') { continueId = flat[j]; break; }
      }
      if (!continueId && flat.length) continueId = flat[flat.length - 1];
    }
    var continueHref = continueId ? '#course/lesson/' + continueId : '#course';
    var daysSince = daysSinceLastActive();
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    wrap.className = 'page-home';
    var courseTitle = (window.CourseData && window.CourseData.courseTitle) ? window.CourseData.courseTitle : 'QA Study Portfolio';
    var alertHtml = '';
    if (daysSince >= 3) {
      alertHtml = '<div class="alert-info" role="status">Давно не занимались — вернитесь к текущему шагу: <a href="' + esc(continueHref) + '">продолжить обучение</a></div>';
    }
    var topTags = [];
    if (App.TagsManager && typeof App.TagsManager.getTagsWithCount === 'function') topTags = App.TagsManager.getTagsWithCount().slice(0, 5);
    var cats = state.categories || [];
    wrap.innerHTML =
      '<section class="card bg-chevrons" style="padding:16px;">' +
      '<h2 style="margin:0 0 6px;">Привет, ' + esc(state.user.name || state.user.role) + '!</h2>' +
      '<p style="margin:0 0 12px;opacity:0.8;">' + esc(courseTitle) + '</p>' +
      progressBar(tp.percent, 'Общий прогресс') +
      '<div style="margin-top:6px;font-size:12px;opacity:0.7;">' + tp.done + ' / ' + tp.total + ' — ' + tp.percent + '%</div>' +
      '</section>' +
      alertHtml +
      '<div class="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:16px;">' +
      '<div class="stat-card card bg-chevrons" style="padding:12px;text-align:center;"><div style="font-size:22px;font-weight:700;">' + tp.percent + '%</div><div style="font-size:12px;opacity:0.7;">Прогресс</div></div>' +
      '<div class="stat-card card bg-chevrons" style="padding:12px;text-align:center;"><div style="font-size:22px;font-weight:700;">' + tp.done + '/' + tp.total + '</div><div style="font-size:12px;opacity:0.7;">Тем завершено</div></div>' +
      '<div class="stat-card card bg-chevrons" style="padding:12px;text-align:center;"><div style="font-size:22px;font-weight:700;">' + streak + '</div><div style="font-size:12px;opacity:0.7;">Дней подряд</div></div>' +
      '<div class="stat-card card bg-chevrons" style="padding:12px;text-align:center;"><div style="font-size:22px;font-weight:700;">' + totalTime + '</div><div style="font-size:12px;opacity:0.7;">Минут всего</div></div>' +
      '<div class="stat-card card bg-chevrons" style="padding:12px;text-align:center;"><div style="font-size:22px;font-weight:700;">' + dueF + '</div><div style="font-size:12px;opacity:0.7;">Карточек к повторению</div></div>' +
      '<div class="stat-card card bg-chevrons" style="padding:12px;text-align:center;"><div style="font-size:22px;font-weight:700;">' + dueP + '</div><div style="font-size:12px;opacity:0.7;">Практик к выполнению</div></div>' +
      '<div class="stat-card card bg-chevrons" style="padding:12px;text-align:center;"><div style="font-size:22px;font-weight:700;">' + pCount + '</div><div style="font-size:12px;opacity:0.7;">В портфолио</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px;padding:16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;">' +
      '<a href="' + esc(continueHref) + '" class="btn btn--primary" style="min-height:44px;display:inline-flex;align-items:center;padding:0 16px;background:#D4AF37;color:#0A1929;text-decoration:none;">Продолжить</a>' +
      '<span style="font-size:13px;opacity:0.7;">Минимум на сегодня: 5 мин теория · 10 мин практика · 5 мин повторение</span>' +
      '</div>' +
      (lastRec ? '<div class="card" style="margin-top:12px;padding:12px;"><strong>Последняя тема:</strong> <a href="#course/lesson/' + esc(lastRec.id) + '">' + esc(lastRec.title) + '</a> — ' + esc(LESSON_STATUS_LABELS[lastRec.status] || lastRec.status) + '</div>' : '') +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:16px;">' +
      '<div class="card" style="padding:12px;"><h3 style="margin:0 0 8px;">Топ тегов</h3>' + (topTags.length ? topTags.map(function(t) { return '<span style="display:inline-block;margin:2px;padding:4px 8px;background:#0A1929;color:#F5F0E8;font-size:12px;">' + esc(t.name) + ' (' + t.count + ')</span>'; }).join('') : '<span style="font-size:12px;opacity:0.6;">Пока нет тегов</span>') + '</div>' +
      '<div class="card" style="padding:12px;"><h3 style="margin:0 0 8px;">Категории</h3>' + (cats.length ? cats.slice(0, 5).map(function(c) { return '<div style="font-size:13px;padding:4px 0;">' + esc(c.name) + '</div>'; }).join('') : '<span style="font-size:12px;opacity:0.6;">Категорий пока нет</span>') + '</div>' +
      '</div>';
    frag.appendChild(wrap);
    setMain(frag);
    var header = document.getElementById('header');
    if (header) header.classList.add('bg-sunburst');
    applyProgressBars(wrap);
    var bc = document.getElementById('breadcrumbs');
    if (bc) { bc.innerHTML = '<ol><li><span aria-current="page">Главная</span></li></ol>'; }
  }

  /* ---------- 6. renderToday ---------- */
  function renderToday() {
    var flat = flatTopics();
    var dueF = dueFlashcards();
    var dueP = duePractice();
    var planned = flat.filter(function(id) {
      var r = state.lessons[id];
      return r && (r.status === 'planned' || r.status === 'studying');
    }).slice(0, 2);
    if (planned.length < 2) {
      var extra = flat.filter(function(id) {
        var r = state.lessons[id];
        return !r || r.status === 'new';
      }).slice(0, 2 - planned.length);
      planned = planned.concat(extra);
    }
    var totalToday = planned.length + dueF.length + dueP.length;
    var doneToday = 0;
    var pomodoroState = (App.pomodoroState && typeof App.pomodoroState === 'object') ? App.pomodoroState : null;
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Сегодня</h2>' +
      '<div class="progress-gold" role="progressbar" aria-valuenow="' + (totalToday ? Math.round(doneToday / totalToday * 100) : 0) + '" aria-valuemin="0" aria-valuemax="100" aria-label="Прогресс дня"><div class="progress-fill" style="transform:scaleX(' + (totalToday ? doneToday / totalToday : 0) + ')"></div></div>' +
      '<div style="font-size:12px;opacity:0.7;margin-top:6px;">Задач на сегодня: ' + totalToday + '</div>' +
      '<div style="display:grid;gap:12px;margin-top:16px;">' +
      '<div class="card" style="padding:12px;"><h3>План изучения — 2 топика</h3>' + (planned.length ? planned.map(function(id) {
        var r = state.lessons[id];
        var title = r ? r.title : id;
        return '<div style="padding:8px 0;border-bottom:1px solid #E8E0D0;display:flex;justify-content:space-between;align-items:center;"><a href="#course/lesson/' + esc(id) + '">' + esc(title) + '</a><span style="font-size:12px;opacity:0.6;">' + esc(r ? (LESSON_STATUS_LABELS[r.status] || r.status) : 'Новый') + '</span></div>';
      }).join('') : '<p style="font-size:13px;opacity:0.6;">Все темы изучены</p>') + '</div>' +
      '<div class="card" style="padding:12px;"><h3>Карточки к повторению (' + dueF.length + ')</h3>' + (dueF.length ? dueF.slice(0, 5).map(function(c) { return '<div style="padding:6px 0;font-size:13px;"><a href="#repetition">' + esc(c.front || c.question || c.id) + '</a></div>'; }).join('') : '<p style="font-size:13px;opacity:0.6;">Карточек нет</p>') + '</div>' +
      '<div class="card" style="padding:12px;"><h3>Практика к выполнению (' + dueP.length + ')</h3>' + (dueP.length ? dueP.slice(0, 5).map(function(p) { return '<div style="padding:6px 0;font-size:13px;"><a href="#practice">' + esc(p.title || p.id) + '</a></div>'; }).join('') : '<p style="font-size:13px;opacity:0.6;">Практик нет</p>') + '</div>' +
      (pomodoroState ? '<div class="card" style="padding:12px;"><h3>Pomodoro</h3><div style="font-size:13px;">Статус: ' + esc(pomodoroState.status || 'остановлен') + ' · ' + esc(String(pomodoroState.remaining || 0)) + ' сек</div></div>' : '<div class="card" style="padding:12px;opacity:0.6;font-size:13px;">Pomodoro остановлен</div>') +
      '</div>';
    frag.appendChild(wrap);
    setMain(frag);
    applyProgressBars(wrap);
  }

  /* ---------- 7. renderRoadmap ---------- */
  function renderRoadmap() {
    var mods = (window.CourseData && Array.isArray(window.CourseData.modules)) ? window.CourseData.modules.slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); }) : [];
    var flat = flatTopics();
    var firstUnfinished = null;
    for (var i = 0; i < flat.length; i++) {
      var rec = state.lessons[flat[i]];
      if (!rec || rec.status !== 'done') { firstUnfinished = flat[i]; break; }
    }
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    var olHtml = '<ol class="roadmap-timeline" style="list-style:none;padding:0;margin:0;position:relative;">';
    mods.forEach(function(m) {
      var mp = moduleProgress(m.id);
      var label = LESSON_STATUS_LABELS[mp.status] || mp.status;
      olHtml += '<li class="roadmap-item" style="position:relative;padding-left:40px;margin-bottom:20px;">' +
        '<div class="roadmap-dot" style="position:absolute;left:8px;top:6px;width:14px;height:14px;background:#D4AF37;transform:rotate(45deg);border:2px solid #0A1929;"></div>' +
        '<div style="position:absolute;left:14px;top:20px;bottom:-20px;width:2px;background:#D4AF37;opacity:0.4;"></div>' +
        '<div class="card" style="padding:12px;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><a href="#course" style="font-weight:700;color:#0A1929;">' + esc(m.title) + '</a><span style="font-size:12px;opacity:0.7;">' + esc(label) + ' · ' + mp.done + '/' + mp.total + '</span></div>' +
        progressBar(mp.percent, m.title) +
        '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">' + (m.topics || []).map(function(t) {
          var r = state.lessons[t.id];
          var st = r ? (LESSON_STATUS_LABELS[r.status] || r.status) : 'Новый';
          return '<a href="#course/lesson/' + esc(t.id) + '" style="font-size:12px;padding:4px 8px;border:1px solid #D4AF37;text-decoration:none;color:#0A1929;">' + esc(t.title) + ' — ' + esc(st) + '</a>';
        }).join('') + '</div>' +
        '</div></li>';
    });
    olHtml += '</ol>';
    var btnHtml = firstUnfinished ? '<a href="#course/lesson/' + esc(firstUnfinished) + '" class="btn" style="min-height:44px;display:inline-flex;align-items:center;padding:0 16px;background:#D4AF37;color:#0A1929;text-decoration:none;margin-top:12px;">К первому незавершённому</a>' : '';
    wrap.innerHTML = '<h2 style="margin:0 0 12px;">Учебный маршрут</h2>' + olHtml + btnHtml;
    frag.appendChild(wrap);
    setMain(frag);
    applyProgressBars(wrap);
  }

  /* ---------- 8. renderMindmap ---------- */
  var MINDMAP_NODES = [
    { moduleId: 'm01', x: 120, y: 80, group: 'База' },
    { moduleId: 'm02', x: 320, y: 80, group: 'База' },
    { moduleId: 'm03', x: 520, y: 80, group: 'База' },
    { moduleId: 'm04', x: 120, y: 200, group: 'Практика' },
    { moduleId: 'm05', x: 320, y: 200, group: 'Практика' },
    { moduleId: 'm06', x: 520, y: 200, group: 'Практика' },
    { moduleId: 'm07', x: 220, y: 320, group: 'Углубление' },
    { moduleId: 'm08', x: 420, y: 320, group: 'Углубление' }
  ];
  var mindmapCollapsed = new Set();
  function renderMindmap() {
    var modsById = {};
    if (window.CourseData && Array.isArray(window.CourseData.modules)) {
      window.CourseData.modules.forEach(function(m) { modsById[m.id] = m; });
    }
    var groups = {};
    MINDMAP_NODES.forEach(function(n) {
      if (!groups[n.group]) groups[n.group] = [];
      groups[n.group].push(n);
    });
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    var svgLines = '';
    for (var i = 0; i < MINDMAP_NODES.length - 1; i++) {
      var a = MINDMAP_NODES[i], b = MINDMAP_NODES[i + 1];
      if (a.group === b.group) svgLines += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#D4AF37" stroke-width="1.5" opacity="0.5"/>';
    }
    var html = '<h2 style="margin:0 0 12px;">Карта знаний</h2>';
    html += '<div style="position:relative;border:2px solid #D4AF37;background:#F5F0E8;min-height:420px;overflow:auto;">';
    html += '<svg width="700" height="420" style="position:absolute;inset:0;" aria-hidden="true">' + svgLines + '</svg>';
    Object.keys(groups).forEach(function(gName) {
      var collapsed = mindmapCollapsed.has(gName);
      html += '<div style="position:relative;margin:8px;">' +
        '<button type="button" class="mindmap-group" data-group="' + esc(gName) + '" aria-expanded="' + (collapsed ? 'false' : 'true') + '" style="min-height:44px;padding:6px 12px;background:#0A1929;color:#F5F0E8;border:1px solid #D4AF37;">' + esc(gName) + '</button>' +
        '<div class="mindmap-group-nodes" ' + (collapsed ? 'hidden' : '') + ' style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;">';
      groups[gName].forEach(function(node) {
        var mod = modsById[node.moduleId];
        if (!mod) {
          html += '<div class="mindmap-node mindmap-node--disabled" style="min-width:140px;min-height:44px;padding:10px;border:1px dashed #8B6F47;background:#fff;opacity:0.6;display:flex;align-items:center;justify-content:center;">Модуль недоступен</div>';
        } else {
          var mp = moduleProgress(node.moduleId);
          html += '<div class="mindmap-node" tabindex="0" role="button" data-module="' + esc(node.moduleId) + '" data-group="' + esc(gName) + '" style="min-width:140px;min-height:44px;padding:10px;background:#fff;border:2px solid #D4AF37;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">' +
            '<span style="font-weight:700;font-size:13px;">' + esc(mod.title) + '</span>' +
            '<span style="font-size:11px;opacity:0.7;">' + mp.percent + '% · ' + mp.done + '/' + mp.total + '</span>' +
            '</div>';
        }
      });
      html += '</div></div>';
    });
    html += '</div>';
    wrap.innerHTML = html;
    frag.appendChild(wrap);
    setMain(frag);
    wrap.querySelectorAll('.mindmap-group').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var g = btn.getAttribute('data-group');
        if (mindmapCollapsed.has(g)) mindmapCollapsed.delete(g); else mindmapCollapsed.add(g);
        renderMindmap();
      });
      btn.addEventListener('keydown', function(e) {
        if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); btn.click(); }
      });
    });
    wrap.querySelectorAll('.mindmap-node[role="button"]').forEach(function(node) {
      node.addEventListener('click', function() {
        var mid = node.getAttribute('data-module');
        window.location.hash = '#course';
      });
      node.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          var mid2 = node.getAttribute('data-module');
          window.location.hash = '#course';
        } else if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          var g2 = node.getAttribute('data-group');
          if (mindmapCollapsed.has(g2)) mindmapCollapsed.delete(g2); else mindmapCollapsed.add(g2);
          renderMindmap();
        }
      });
    });
  }

  /* ---------- 9. renderCourse ---------- */
  var courseExpandedModules = new Set();
  var courseFilter = 'all';
  var courseSearch = '';
  var courseSearchTimer = null;
  function renderCourse() {
    var mods = (window.CourseData && Array.isArray(window.CourseData.modules)) ? window.CourseData.modules.slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); }) : [];
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    var controls = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
      '<label>Фильтр <select id="course-filter" style="min-height:44px;border:1px solid #D4AF37;padding:0 8px;"><option value="all"' + (courseFilter === 'all' ? ' selected' : '') + '>Все</option><option value="not-started"' + (courseFilter === 'not-started' ? ' selected' : '') + '>Не начато</option><option value="in-progress"' + (courseFilter === 'in-progress' ? ' selected' : '') + '>В процессе</option><option value="completed"' + (courseFilter === 'completed' ? ' selected' : '') + '>Завершено</option></select></label>' +
      '<label style="flex:1;min-width:180px;">Поиск <input id="course-search" type="search" value="' + esc(courseSearch) + '" placeholder="Поиск по темам" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:0 8px;"></label>' +
      '</div>';
    var q = courseSearch.toLowerCase();
    var allowedStatuses = FILTER_MAP[courseFilter] || FILTER_MAP.all;
    var html = '<h2 style="margin:0 0 12px;">Курс — ' + mods.length + ' модулей</h2>' + controls;
    if (!mods.length) {
      html += App.renderEmptyState('Курс пуст', 'Добавьте модули в CourseData.', 'На главную', 'dashboard');
      wrap.innerHTML = html;
      frag.appendChild(wrap);
      setMain(frag);
      return;
    }
    mods.forEach(function(m) {
      var topics = (m.topics || []).slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
      var filtered = topics.filter(function(t) {
        var rec = state.lessons[t.id];
        var st = rec ? rec.status : 'new';
        if (allowedStatuses.indexOf(st) === -1) return false;
        if (q && t.title.toLowerCase().indexOf(q) === -1 && (t.summary || '').toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      if (courseFilter !== 'all' || q) {
        if (!filtered.length) return;
      }
      var mp = moduleProgress(m.id);
      var expanded = courseExpandedModules.has(m.id);
      var shortGoal = m.shortGoal || m.summary || '';
      html += '<div class="card" style="margin-bottom:12px;padding:0;overflow:hidden;">' +
        '<button type="button" data-expand="' + esc(m.id) + '" aria-expanded="' + (expanded ? 'true' : 'false') + '" style="width:100%;text-align:left;padding:12px;display:flex;justify-content:space-between;align-items:center;background:#fff;border:none;cursor:pointer;min-height:44px;">' +
        '<span><strong>' + esc(m.title) + '</strong> <span style="font-size:12px;opacity:0.6;">' + esc(shortGoal) + '</span></span>' +
        '<span style="font-size:12px;white-space:nowrap;">' + esc(LESSON_STATUS_LABELS[mp.status] || mp.status) + ' · ' + mp.done + '/' + mp.total + '</span>' +
        '</button>' +
        '<div style="padding:0 12px 12px;">' + progressBar(mp.percent, m.title) + '</div>';
      if (expanded) {
        html += '<div style="padding:0 12px 12px;">';
        var hasTest = false;
        if (window.CourseData && Array.isArray(window.CourseData.controlTests)) {
          for (var ci = 0; ci < window.CourseData.controlTests.length; ci++) if (window.CourseData.controlTests[ci].moduleId === m.id) { hasTest = true; break; }
        }
        if (hasTest) html += '<a href="#questions?module=' + esc(m.id) + '" class="btn" style="min-height:44px;display:inline-flex;align-items:center;padding:0 12px;background:#D4AF37;color:#0A1929;text-decoration:none;margin-bottom:8px;">Контрольный тест</a>';
        html += '<div style="display:grid;gap:6px;">' + filtered.map(function(t) {
          var rec = state.lessons[t.id];
          var st2 = rec ? (LESSON_STATUS_LABELS[rec.status] || rec.status) : 'Новый';
          return '<a href="#course/lesson/' + esc(t.id) + '" style="display:flex;justify-content:space-between;gap:8px;padding:8px;border:1px solid #E8E0D0;text-decoration:none;color:#0A1929;min-height:44px;align-items:center;">' + esc(t.title) + '<span style="font-size:11px;opacity:0.6;">' + esc(st2) + '</span></a>';
        }).join('') + '</div></div>';
      }
      html += '</div>';
    });
    wrap.innerHTML = html;
    frag.appendChild(wrap);
    setMain(frag);
    applyProgressBars(wrap);
    var sel = wrap.querySelector('#course-filter');
    if (sel) sel.addEventListener('change', function() { courseFilter = sel.value; renderCourse(); });
    var inp = wrap.querySelector('#course-search');
    if (inp) inp.addEventListener('input', function() {
      if (courseSearchTimer) clearTimeout(courseSearchTimer);
      courseSearchTimer = setTimeout(function() { courseSearch = inp.value; renderCourse(); }, 200);
    });
    wrap.querySelectorAll('[data-expand]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-expand');
        if (courseExpandedModules.has(id)) courseExpandedModules.delete(id); else courseExpandedModules.add(id);
        renderCourse();
      });
    });
  }

  /* ---------- 10. renderLesson ---------- */
  function findTopicInCourseData(id) {
    if (!window.CourseData || !Array.isArray(window.CourseData.modules)) return null;
    for (var i = 0; i < window.CourseData.modules.length; i++) {
      var m = window.CourseData.modules[i];
      var topics = m.topics || [];
      for (var j = 0; j < topics.length; j++) if (topics[j].id === id) return { topic: topics[j], module: m };
    }
    return null;
  }
  function renderLesson(params) {
    var raw = '';
    if (typeof params === 'string') raw = params;
    else if (params && typeof params.id === 'string') raw = params.id;
    else {
      var h = window.location.hash || '';
      var mm = h.match(/^#course\/lesson\/(.+)$/);
      if (mm) raw = mm[1];
    }
    var id = raw;
    var record = state.lessons[id];
    if (!record) {
      var found = findTopicInCourseData(id);
      if (!found) {
        setMain(App.renderEmptyState('Урок не найден', 'Урок с id ' + id + ' не найден.', 'К курсу', 'course'));
        return;
      }
      record = {
        id: found.topic.id, moduleId: found.module.id, title: found.topic.title || '', order: found.topic.order || 0,
        summary: found.topic.summary || '', terms: found.topic.terms ? found.topic.terms.slice() : [],
        goal: found.topic.goal || '', expectedResult: found.topic.expectedResult || '',
        status: 'new', notes: '', keyPoint: '', ownWords: '', unclear: '', conclusion: '',
        answers: {}, practice: '', practiceSkipped: false, foundBugs: [], understanding: 0, timeSpent: 0,
        studyDate: null, nextReview: null, inPortfolio: false, tags: [], category: null, orphan: false
      };
      state.lessons[id] = record;
      if (typeof App.markDirty === 'function') App.markDirty(id);
      if (typeof App.saveState === 'function') App.saveState('lessons');
    } else {
      ensureLessonFields(record);
    }
    var moduleTitle = '';
    if (window.CourseData && Array.isArray(window.CourseData.modules)) {
      for (var mi = 0; mi < window.CourseData.modules.length; mi++) if (window.CourseData.modules[mi].id === record.moduleId) { moduleTitle = window.CourseData.modules[mi].title; break; }
    }
    var questions = [];
    if (window.CourseData && Array.isArray(window.CourseData.questions)) {
      questions = window.CourseData.questions.filter(function(q) { return q.topicId === id; });
    }
    var flat = flatTopics();
    var idx = flat.indexOf(id);
    var prevId = idx > 0 ? flat[idx - 1] : null;
    var nextId = idx !== -1 && idx < flat.length - 1 ? flat[idx + 1] : null;
    App.lessonNav = { prev: prevId, next: nextId, currentId: id };

    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    var html = '<nav aria-label="Хлебные крошки" style="font-size:12px;margin-bottom:8px;"><ol style="display:flex;gap:6px;list-style:none;padding:0;margin:0;"><li><a href="#course">Курс</a></li><li>›</li><li><a href="#course">' + esc(moduleTitle || record.moduleId) + '</a></li><li>›</li><li><span aria-current="page">' + esc(record.title) + '</span></li></ol></nav>';
    html += '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;"><h2 style="margin:0;">' + esc(record.title) + '</h2><span style="padding:4px 8px;background:#D4AF37;font-size:12px;">' + esc(LESSON_STATUS_LABELS[record.status] || record.status) + '</span></div>';
    if (record.goal) html += '<p style="margin:8px 0;font-size:13px;"><strong>Цель:</strong> ' + esc(record.goal) + '</p>';
    if (record.expectedResult) html += '<p style="margin:4px 0;font-size:13px;"><strong>Ожидаемый результат:</strong> ' + esc(record.expectedResult) + '</p>';
    if (record.summary) html += '<div class="card" style="padding:12px;margin-top:8px;"><p style="margin:0;font-size:13px;">' + esc(record.summary) + '</p></div>';
    if (record.terms && record.terms.length) html += '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">' + record.terms.map(function(t) { return '<span style="padding:4px 8px;background:#0A1929;color:#F5F0E8;font-size:11px;">' + esc(t) + '</span>'; }).join('') + '</div>';

    html += '<div style="display:grid;gap:12px;margin-top:16px;">';
    html += '<label>Заметки<textarea id="lesson-notes" rows="4" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:8px;word-break:break-word;">' + '</textarea></label>';
    html += '<label>Ключевая мысль<textarea id="lesson-keyPoint" rows="3" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:8px;word-break:break-word;">' + '</textarea></label>';
    html += '<label>Своими словами<textarea id="lesson-ownWords" rows="3" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:8px;word-break:break-word;">' + '</textarea></label>';
    html += '<label>Неясно<textarea id="lesson-unclear" rows="3" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:8px;word-break:break-word;">' + '</textarea></label>';
    html += '<label>Вывод<textarea id="lesson-conclusion" rows="3" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:8px;word-break:break-word;">' + '</textarea></label>';
    html += '</div>';

    if (questions.length) {
      html += '<div style="margin-top:16px;"><h3>Вопросы (' + questions.length + ')</h3>';
      questions.forEach(function(q) {
        var ans = (record.answers && record.answers[q.id]) ? record.answers[q.id] : '';
        html += '<div class="card" style="padding:12px;margin-bottom:8px;">' +
          '<div style="font-weight:600;font-size:13px;">' + esc(q.text) + '</div>' +
          '<label style="display:block;margin-top:8px;">Ответ<textarea data-answer="' + esc(q.id) + '" rows="2" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:8px;word-break:break-word;">' + '</textarea></label>' +
          '<button type="button" data-show="' + esc(q.id) + '" aria-expanded="false" style="min-height:44px;margin-top:8px;padding:0 12px;border:1px solid #D4AF37;background:#fff;">Показать эталон</button>' +
          '<div data-ref="' + esc(q.id) + '" hidden style="margin-top:8px;padding:8px;background:#F5F0E8;font-size:13px;">' + esc(q.answerRef || '') + '</div>' +
          '</div>';
      });
      html += '</div>';
    }

    html += '<div class="card" style="padding:12px;margin-top:16px;">' +
      '<label>Практика<textarea id="lesson-practice" rows="3" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:8px;word-break:break-word;">' + '</textarea></label>' +
      '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;min-height:44px;"><input type="checkbox" id="lesson-skipped"' + (record.practiceSkipped ? ' checked' : '') + '> Пропустить практику</label>' +
      '<div style="margin-top:8px;"><label>Найденные баги (через запятую)<input id="lesson-bugs" type="text" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:0 8px;"></label></div>' +
      '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><label>Время (мин)<input id="lesson-time" type="number" min="0" style="min-height:44px;width:100px;border:1px solid #D4AF37;padding:0 8px;"></label>' +
      '<span>Понимание:</span><span role="radiogroup" aria-label="Оценка понимания" id="lesson-understanding" style="display:flex;gap:4px;">' +
      [0, 1, 2, 3, 4, 5].map(function(n) { return '<button type="button" role="radio" aria-checked="' + (record.understanding === n ? 'true' : 'false') + '" data-score="' + n + '" style="min-width:44px;min-height:44px;border:1px solid #D4AF37;background:' + (record.understanding === n ? '#D4AF37' : '#fff') + ';">' + n + '</button>'; }).join('') +
      '</span></div>' +
      '<div style="margin-top:8px;font-size:12px;opacity:0.7;">Изучено: ' + esc(fmtDate(record.studyDate)) + ' · Повтор: ' + esc(fmtDate(record.nextReview)) + '</div>' +
      '<button type="button" id="lesson-portfolio" ' + (record.inPortfolio ? 'disabled' : '') + ' style="min-height:44px;margin-top:12px;padding:0 16px;background:' + (record.inPortfolio ? '#E8E0D0' : '#D4AF37') + ';border:1px solid #D4AF37;">' + (record.inPortfolio ? 'В портфолио добавлено' : 'Добавить в портфолио') + '</button>' +
      '</div>';

    var tagOptions = state.tags.map(function(t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>'; }).join('');
    var flatCats = (App.CategoriesManager && typeof App.CategoriesManager.getFlat === 'function') ? App.CategoriesManager.getFlat() : [];
    var catOptions = '<option value="">— без категории —</option>' + flatCats.map(function(c) { return '<option value="' + esc(c.id) + '"' + (record.category === c.id ? ' selected' : '') + '>' + esc(c.path) + '</option>'; }).join('');
    html += '<div class="card" style="padding:12px;margin-top:12px;">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><select id="lesson-tag-select" style="min-height:44px;border:1px solid #D4AF37;padding:0 8px;"><option value="">— тег —</option>' + tagOptions + '</select><button type="button" id="lesson-tag-add" style="min-height:44px;padding:0 12px;border:1px solid #D4AF37;">Добавить тег</button><span style="font-size:12px;opacity:0.6;">Лимит 10</span></div>' +
      '<div id="lesson-tags" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">' + (record.tags || []).map(function(tid) {
        var tg = findById(state.tags, tid);
        return '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;background:#0A1929;color:#F5F0E8;font-size:12px;">' + esc(tg ? tg.name : tid) + '<button type="button" data-removetag="' + esc(tid) + '" aria-label="Удалить тег" style="background:none;border:none;color:inherit;cursor:pointer;">×</button></span>';
      }).join('') + '</div>' +
      '<label style="display:block;margin-top:12px;">Категория<select id="lesson-category" style="width:100%;min-height:44px;border:1px solid #D4AF37;padding:0 8px;margin-top:4px;">' + catOptions + '</select></label>' +
      '</div>';

    var showNav = true;
    html += '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:16px;">' +
      (prevId ? '<a href="#course/lesson/' + esc(prevId) + '" style="min-height:44px;display:inline-flex;align-items:center;padding:0 16px;border:1px solid #D4AF37;text-decoration:none;color:#0A1929;">← Назад</a>' : '<span aria-disabled="true" style="min-height:44px;display:inline-flex;align-items:center;padding:0 16px;border:1px solid #E8E0D0;opacity:0.4;">← Назад</span>') +
      (nextId ? '<a href="#course/lesson/' + esc(nextId) + '" style="min-height:44px;display:inline-flex;align-items:center;padding:0 16px;background:#D4AF37;color:#0A1929;text-decoration:none;">Далее →</a>' : '<span aria-disabled="true" style="min-height:44px;display:inline-flex;align-items:center;padding:0 16px;border:1px solid #E8E0D0;opacity:0.4;">Далее →</span>') +
      '</div>';

    var isFirstOpen = !record.notes && !record.keyPoint && !record.ownWords;
    if (isFirstOpen) {
      html += '<div class="lesson-hints" style="margin-top:12px;padding:12px;background:#FFFEFB;border:1px dashed #D4AF37;font-size:12px;">Подсказка: заполните заметки своими словами, затем сформулируйте ключевую мысль и вывод. Это поможет закрепить материал.</div>';
    }

    wrap.innerHTML = html;
    frag.appendChild(wrap);
    setMain(frag);

    function getEl(id) { return wrap.querySelector('#' + id); }
    var els = {
      notes: getEl('lesson-notes'),
      keyPoint: getEl('lesson-keyPoint'),
      ownWords: getEl('lesson-ownWords'),
      unclear: getEl('lesson-unclear'),
      conclusion: getEl('lesson-conclusion'),
      practice: getEl('lesson-practice'),
      skipped: getEl('lesson-skipped'),
      bugs: getEl('lesson-bugs'),
      time: getEl('lesson-time'),
      category: getEl('lesson-category')
    };
    if (els.notes) els.notes.value = record.notes || '';
    if (els.keyPoint) els.keyPoint.value = record.keyPoint || '';
    if (els.ownWords) els.ownWords.value = record.ownWords || '';
    if (els.unclear) els.unclear.value = record.unclear || '';
    if (els.conclusion) els.conclusion.value = record.conclusion || '';
    if (els.practice) els.practice.value = record.practice || '';
    if (els.bugs) els.bugs.value = (record.foundBugs || []).join(', ');
    if (els.time) els.time.value = String(record.timeSpent || 0);

    var debounceFn = (App.debounce || function(fn, ms) {
      var t = null;
      return function() { var a = arguments, c = this; if (t) clearTimeout(t); t = setTimeout(function() { fn.apply(c, a); }, ms); };
    });
    var save = debounceFn(function() {
      record.notes = els.notes ? els.notes.value : record.notes;
      record.keyPoint = els.keyPoint ? els.keyPoint.value : record.keyPoint;
      record.ownWords = els.ownWords ? els.ownWords.value : record.ownWords;
      record.unclear = els.unclear ? els.unclear.value : record.unclear;
      record.conclusion = els.conclusion ? els.conclusion.value : record.conclusion;
      record.practice = els.practice ? els.practice.value : record.practice;
      record.practiceSkipped = els.skipped ? !!els.skipped.checked : record.practiceSkipped;
      record.foundBugs = els.bugs ? els.bugs.value.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : record.foundBugs;
      record.timeSpent = els.time ? (parseInt(els.time.value, 10) || 0) : record.timeSpent;
      record.category = els.category ? (els.category.value || null) : record.category;
      record.status = computeLessonStatus(record);
      record.studyDate = new Date().toISOString().slice(0, 10);
      state.meta.lastLessonId = id;
      state.meta.lastActiveDate = new Date().toISOString();
      if (typeof App.markDirty === 'function') App.markDirty(id);
      if (typeof App.saveState === 'function') App.saveState('lessons');
    }, 300);

    ['notes', 'keyPoint', 'ownWords', 'unclear', 'conclusion', 'practice', 'bugs', 'time'].forEach(function(k) {
      if (els[k]) els[k].addEventListener('input', save);
    });
    if (els.skipped) els.skipped.addEventListener('change', save);
    if (els.category) els.category.addEventListener('change', save);

    wrap.querySelectorAll('[data-answer]').forEach(function(ta) {
      var qid = ta.getAttribute('data-answer');
      ta.value = (record.answers && record.answers[qid]) ? record.answers[qid] : '';
      ta.addEventListener('input', debounceFn(function() {
        if (!record.answers) record.answers = {};
        record.answers[qid] = ta.value;
        record.status = computeLessonStatus(record);
        if (typeof App.markDirty === 'function') App.markDirty(id);
        if (typeof App.saveState === 'function') App.saveState('lessons');
      }, 300));
    });
    wrap.querySelectorAll('[data-show]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var qid = btn.getAttribute('data-show');
        var ref = wrap.querySelector('[data-ref="' + qid + '"]');
        if (!ref) return;
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (expanded) ref.setAttribute('hidden', 'hidden'); else ref.removeAttribute('hidden');
      });
    });
    wrap.querySelectorAll('[data-score]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var n = parseInt(btn.getAttribute('data-score'), 10) || 0;
        record.understanding = n;
        record.status = computeLessonStatus(record);
        wrap.querySelectorAll('[data-score]').forEach(function(b) {
          var v = parseInt(b.getAttribute('data-score'), 10);
          b.setAttribute('aria-checked', v === n ? 'true' : 'false');
          b.style.background = v === n ? '#D4AF37' : '#fff';
        });
        if (typeof App.markDirty === 'function') App.markDirty(id);
        if (typeof App.saveState === 'function') App.saveState('lessons');
      });
    });
    var tagAdd = wrap.querySelector('#lesson-tag-add');
    if (tagAdd) tagAdd.addEventListener('click', function() {
      var sel2 = wrap.querySelector('#lesson-tag-select');
      var tid = sel2 ? sel2.value : '';
      if (!tid) return;
      if (!Array.isArray(record.tags)) record.tags = [];
      if (record.tags.length >= 10) { if (typeof App.notify === 'function') App.notify('Лимит 10 тегов', 'warning'); return; }
      if (record.tags.indexOf(tid) !== -1) return;
      record.tags.push(tid);
      save();
      renderLesson(id);
    });
    wrap.querySelectorAll('[data-removetag]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tid = btn.getAttribute('data-removetag');
        record.tags = (record.tags || []).filter(function(x) { return x !== tid; });
        save();
        renderLesson(id);
      });
    });
    var pfBtn = wrap.querySelector('#lesson-portfolio');
    if (pfBtn) pfBtn.addEventListener('click', function() {
      if (record.inPortfolio) return;
      var entry = {
        id: genId(), type: 'lesson', sourceId: id, title: record.title,
        description: record.keyPoint || record.summary, task: record.goal, solution: record.practice,
        tools: [], skills: record.terms ? record.terms.slice() : [], date: new Date().toISOString(),
        presentationReady: false, status: 'draft', tags: (record.tags || []).slice(), category: record.category
      };
      state.portfolio.push(entry);
      window.IDB.put('portfolio', entry).catch(function() {});
      record.inPortfolio = true;
      if (typeof App.markDirty === 'function') App.markDirty(id);
      if (typeof App.saveState === 'function') { App.saveState('lessons'); App.saveState('portfolio'); }
      if (typeof App.toast === 'function') try { App.toast('Добавлено в портфолио', 'success'); } catch (e) {}
      else if (typeof App.notify === 'function') App.notify('Добавлено в портфолио', 'success');
      renderLesson(id);
    });
  }

  /* ---------- экспорт ---------- */
  App.renderHome = renderHome;
  App.renderToday = renderToday;
  App.renderRoadmap = renderRoadmap;
  App.renderMindmap = renderMindmap;
  App.renderCourse = renderCourse;
  App.renderLesson = renderLesson;

  App.registerRoute('dashboard', renderHome);
  App.registerRoute('today', renderToday);
  App.registerRoute('roadmap', renderRoadmap);
  App.registerRoute('mindmap', renderMindmap);
  App.registerRoute('course', renderCourse);
  App.registerRoute('course/lesson/:id', renderLesson);

})(window);

/* js/core/main.js — часть 4.1 из 4 — notes, questions, repetition, practice, table editor, portfolio, glossary */
(function (window) {
  'use strict';

  var App = window.App;
  var state = App.state;

  /* ============================================================
     3. ДОПОЛНЕНИЯ К state
     ============================================================ */
  if (!state.questions || typeof state.questions !== 'object' || Array.isArray(state.questions)) state.questions = {};
  if (!state.notes || typeof state.notes !== 'object' || Array.isArray(state.notes)) state.notes = {};
  if (!state.flashcards || typeof state.flashcards !== 'object' || Array.isArray(state.flashcards)) state.flashcards = {};
  if (!state.practice || typeof state.practice !== 'object' || Array.isArray(state.practice)) state.practice = {};
  if (!Array.isArray(state.userGlossary)) state.userGlossary = [];
  if (!Array.isArray(state.portfolio)) state.portfolio = [];
  if (!Array.isArray(state.sessions)) state.sessions = [];
  if (!Array.isArray(state.journal)) state.journal = [];
  if (!Array.isArray(state.tags)) state.tags = [];
  if (!Array.isArray(state.categories)) state.categories = [];
  if (!state.ui) state.ui = {};
  if (state.ui.compactView === undefined) state.ui.compactView = false;
  if (state.ui.tableHintSeen === undefined) state.ui.tableHintSeen = false;
  if (state.ui.portfolioPreview === undefined) state.ui.portfolioPreview = false;
  if (state.ui.pomodoroSound === undefined) state.ui.pomodoroSound = true;
  if (state.ui.debugEnabled === undefined) state.ui.debugEnabled = false;
  if (!state.meta) state.meta = { lastActiveDate: null, lastLessonId: null };

  var DIRTY_SCOPES = ['lessons', 'notes', 'questions', 'flashcards', 'practice', 'portfolio', 'sessions', 'userGlossary'];
  if (!App.dirtyByScope) App.dirtyByScope = {};
  DIRTY_SCOPES.forEach(function (k) {
    if (!App.dirtyByScope[k]) App.dirtyByScope[k] = new Set();
  });

  /* миграция dailyLimit: часы -> минуты, затем clamp */
  (function migrateDailyLimit() {
    var u = state.user;
    var changed = false;
    if (typeof u.dailyLimit !== 'number' || isNaN(u.dailyLimit)) { u.dailyLimit = 120; changed = true; }
    if (u.dailyLimit > 0 && u.dailyLimit <= 4) { u.dailyLimit = u.dailyLimit * 60; changed = true; }
    if (u.dailyLimit < 15) { u.dailyLimit = 15; changed = true; }
    if (u.dailyLimit > 240) { u.dailyLimit = 240; changed = true; }
    if (typeof u.weeklyGoal !== 'number' || isNaN(u.weeklyGoal)) { u.weeklyGoal = 5; changed = true; }
    if (u.weeklyGoal < 1) { u.weeklyGoal = 1; changed = true; }
    if (u.weeklyGoal > 14) { u.weeklyGoal = 14; changed = true; }
    if (changed && typeof App.saveState === 'function') App.saveState('user');
  })();

  /* ============================================================
     ПОМОЩНИКИ
     ============================================================ */
  function esc(s) {
    if (typeof Utils !== 'undefined' && Utils.Escape && typeof Utils.Escape.html === 'function') {
      return Utils.Escape.html(String(s == null ? '' : s));
    }
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function genId() {
    if (typeof Utils !== 'undefined' && Utils.Data && typeof Utils.Data.generateId === 'function') {
      return Utils.Data.generateId();
    }
    return 'id-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }
  function fmtDate(d) {
    if (!d) return '—';
    if (typeof Utils !== 'undefined' && Utils.Format && typeof Utils.Format.formatDate === 'function') {
      return Utils.Format.formatDate(d);
    }
    try { return new Date(d).toLocaleDateString('ru-RU'); } catch (e) { return String(d); }
  }
  function toArray(coll) {
    if (typeof App.toArray === 'function') return App.toArray(coll);
    if (Array.isArray(coll)) return coll.slice();
    if (coll && typeof coll === 'object') return Object.keys(coll).map(function (k) { return coll[k]; });
    return [];
  }
  function findById(arr, id) {
    if (!Array.isArray(arr)) return null;
    for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) return arr[i];
    return null;
  }
  function nowIso() { return new Date().toISOString(); }
  function todayStart() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function addDaysIso(days) {
    var d = todayStart();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }
  function clamp(v, min, max) {
    var n = Number(v);
    if (isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
  function debounce(fn, ms) {
    if (typeof App.debounce === 'function') return App.debounce(fn, ms);
    var t = null;
    return function () {
      var a = arguments, c = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(c, a); }, ms);
    };
  }
  function getMain() { return document.getElementById('main-content'); }
  function setMain(node) {
    var main = getMain();
    if (!main) return;
    if (typeof node === 'string') {
      var div = document.createElement('div');
      div.innerHTML = node;
      var frag = document.createDocumentFragment();
      while (div.firstChild) frag.appendChild(div.firstChild);
      main.replaceChildren(frag);
    } else if (node && node.nodeType) {
      main.replaceChildren(node);
    }
  }
  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  /* markDirty(scope, id) с обратной совместимостью markDirty(id) */
  var prevMarkDirty = App.markDirty;
  App.markDirty = function (scopeOrId, maybeId) {
    if (maybeId === undefined) {
      App.dirtyByScope.lessons.add(scopeOrId);
      if (typeof prevMarkDirty === 'function') { try { prevMarkDirty(scopeOrId); } catch (e) {} }
      return;
    }
    var scope = scopeOrId;
    if (!App.dirtyByScope[scope]) App.dirtyByScope[scope] = new Set();
    App.dirtyByScope[scope].add(maybeId);
    if (scope === 'lessons' && typeof prevMarkDirty === 'function') { try { prevMarkDirty(maybeId); } catch (e) {} }
  };
  function markDirty(scope, id) { App.markDirty(scope, id); }

  function dirtyArray(scope) {
    var set = App.dirtyByScope[scope];
    if (!set || !set.size) return [];
    var coll = state[scope];
    var out = [];
    set.forEach(function (id) {
      var rec = null;
      if (Array.isArray(coll)) rec = findById(coll, id);
      else if (coll && typeof coll === 'object') rec = coll[id];
      if (rec) out.push(rec);
    });
    return out;
  }
  App.dirtyArray = dirtyArray;

  /* расширение saveState: словари через dirtyByScope, userGlossary в settings */
  var prevSaveState = App.saveState;
  var P4_SCOPES = {
    notes: function () {
      var arr = dirtyArray('notes');
      if (!arr.length) arr = toArray(state.notes);
      if (arr.length) window.IDB.autoSave('notes', arr, 300);
      App.dirtyByScope.notes.clear();
    },
    questions: function () {
      var arr = dirtyArray('questions');
      if (!arr.length) arr = toArray(state.questions);
      if (arr.length) window.IDB.autoSave('questions', arr, 300);
      App.dirtyByScope.questions.clear();
    },
    flashcards: function () {
      var arr = dirtyArray('flashcards');
      if (!arr.length) arr = toArray(state.flashcards);
      if (arr.length) window.IDB.autoSave('flashcards', arr, 300);
      App.dirtyByScope.flashcards.clear();
    },
    practice: function () {
      var arr = dirtyArray('practice');
      if (!arr.length) arr = toArray(state.practice);
      if (arr.length) window.IDB.autoSave('practice', arr, 300);
      App.dirtyByScope.practice.clear();
    },
    portfolio: function () {
      window.IDB.autoSave('portfolio', state.portfolio, 300);
      App.dirtyByScope.portfolio.clear();
    },
    sessions: function () {
      window.IDB.autoSave('sessions', state.sessions, 300);
      App.dirtyByScope.sessions.clear();
    },
    userGlossary: function () {
      window.IDB.put('settings', { key: 'userGlossary', value: state.userGlossary }).catch(function () {});
      App.dirtyByScope.userGlossary.clear();
    }
  };
  App.saveState = function (scope) {
    if (P4_SCOPES[scope]) {
      if (typeof App.setSaveIndicator === 'function') App.setSaveIndicator('saving');
      try { P4_SCOPES[scope](); } catch (e) {
        if (typeof App.setSaveIndicator === 'function') App.setSaveIndicator('error');
        return Promise.resolve();
      }
      if (typeof App.setSaveIndicator === 'function') App.setSaveIndicator('saved');
      return Promise.resolve();
    }
    if (typeof prevSaveState === 'function') return prevSaveState(scope);
    return Promise.resolve();
  };
  function saveState(scope) { return App.saveState(scope); }

  /* ============================================================
     4. СХЕМЫ И КОНСТАНТЫ
     ============================================================ */
  var NOTE_TYPES = ['plain', 'important', 'example', 'question', 'error', 'conclusion', 'code'];
  var NOTE_TYPE_LABELS = {
    plain: 'Обычная', important: 'Важное', example: 'Пример', question: 'Вопрос',
    error: 'Ошибка', conclusion: 'Вывод', code: 'Код'
  };
  var NOTE_LIMITS = { title: 200, content: 20000, source: 300, conclusion: 2000, tags: 10, tagLen: 30 };

  var QUESTION_TYPES = ['definition', 'explanation', 'situation', 'interview', 'bug', 'custom'];
  var QUESTION_TYPE_LABELS = {
    definition: 'Определение', explanation: 'Объяснение', situation: 'Ситуация',
    interview: 'Собеседование', bug: 'Баг', custom: 'Своё'
  };

  var GRADE_LABELS = { unknown: 'Не знаю', partial: 'Частично', known: 'Знаю', explain: 'Могу объяснить' };
  var GRADES = {
    unknown: function () { return { days: 0, streakDelta: 'reset' }; },
    partial: function () { return { days: 1, streakDelta: 'reset' }; },
    known: function (card) {
      var s = (card.streak || 0) + 1;
      return { days: s >= 4 ? 30 : s >= 3 ? 14 : 3, streakDelta: 'inc' };
    },
    explain: function (card) {
      var s = (card.streak || 0) + 1;
      return { days: s >= 4 ? 30 : s >= 3 ? 14 : 7, streakDelta: 'inc' };
    }
  };

  var TABLE_COLUMNS = {
    checklist: ['Проверка', 'Ожидаемый результат', 'Статус', 'Комментарий'],
    'test-case': ['Шаг', 'Действие', 'Ожидаемый результат', 'Статус'],
    'api-check': ['Метод', 'Эндпоинт', 'Тело', 'Ожидаемый код', 'Статус'],
    'mobile-list': ['Устройство', 'ОС', 'Проверка', 'Статус', 'Комментарий']
  };
  var ROW_STATUSES = ['not-run', 'pass', 'fail', 'blocked'];
  var ROW_STATUS_LABELS = { 'not-run': 'Не выполнен', pass: 'Успех', fail: 'Провал', blocked: 'Блок' };

  var PRACTICE_TEMPLATES = [
    { id: 'tpl-checklist', templateKind: 'checklist', title: 'Чек-лист проверок', type: 'table' },
    { id: 'tpl-test-case', templateKind: 'test-case', title: 'Тест-кейс', type: 'table' },
    { id: 'tpl-bug-report', templateKind: 'bug-report', title: 'Баг-репорт', type: 'text' },
    { id: 'tpl-req-analysis', templateKind: 'req-analysis', title: 'Анализ требований', type: 'text' },
    { id: 'tpl-test-plan', templateKind: 'test-plan', title: 'Тест-план', type: 'text' },
    { id: 'tpl-strategy', templateKind: 'strategy', title: 'Стратегия тестирования', type: 'text' },
    { id: 'tpl-report', templateKind: 'report', title: 'Отчёт о тестировании', type: 'text' },
    { id: 'tpl-sql', templateKind: 'sql', title: 'SQL-запросы', type: 'text' },
    { id: 'tpl-api-check', templateKind: 'api-check', title: 'Проверка API', type: 'table' },
    { id: 'tpl-mobile-list', templateKind: 'mobile-list', title: 'Мобильные проверки', type: 'table' }
  ];
  var TEXT_FIELD_SCHEMAS = {
    'bug-report': [
      { name: 'title', label: 'Заголовок', type: 'text', maxLength: 200 },
      { name: 'environment', label: 'Окружение', type: 'text', maxLength: 200 },
      { name: 'steps', label: 'Шаги воспроизведения', type: 'textarea', maxLength: 4000 },
      { name: 'expected', label: 'Ожидаемый результат', type: 'textarea', maxLength: 2000 },
      { name: 'actual', label: 'Фактический результат', type: 'textarea', maxLength: 2000 },
      { name: 'severity', label: 'Severity', type: 'select', options: ['blocker', 'critical', 'major', 'minor', 'trivial'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'] },
      { name: 'comment', label: 'Комментарий', type: 'textarea', maxLength: 2000 }
    ],
    'req-analysis': [
      { name: 'requirement', label: 'Требование', type: 'textarea', maxLength: 3000 },
      { name: 'questions', label: 'Вопросы к требованию', type: 'textarea', maxLength: 3000 },
      { name: 'risks', label: 'Риски', type: 'textarea', maxLength: 2000 }
    ],
    'test-plan': [
      { name: 'scope', label: 'Объём тестирования', type: 'textarea', maxLength: 3000 },
      { name: 'approach', label: 'Подход', type: 'textarea', maxLength: 3000 },
      { name: 'criteria', label: 'Критерии выхода', type: 'textarea', maxLength: 2000 }
    ],
    strategy: [
      { name: 'levels', label: 'Уровни тестирования', type: 'textarea', maxLength: 3000 },
      { name: 'types', label: 'Виды тестирования', type: 'textarea', maxLength: 3000 },
      { name: 'tools', label: 'Инструменты', type: 'text', maxLength: 300 }
    ],
    report: [
      { name: 'summary', label: 'Сводка', type: 'textarea', maxLength: 3000 },
      { name: 'defects', label: 'Найденные дефекты', type: 'textarea', maxLength: 3000 },
      { name: 'conclusion', label: 'Заключение', type: 'textarea', maxLength: 2000 }
    ],
    sql: [
      { name: 'task', label: 'Задача', type: 'textarea', maxLength: 2000 },
      { name: 'query', label: 'Запрос', type: 'textarea', maxLength: 4000 },
      { name: 'result', label: 'Результат', type: 'textarea', maxLength: 2000 }
    ]
  };

  var PORTFOLIO_STATUS = ['draft', 'needs-work', 'ready', 'published'];
  var PORTFOLIO_STATUS_LABELS = { draft: 'Черновик', 'needs-work': 'Требует доработки', ready: 'Готов', published: 'Опубликован' };

  var FIELD_HINTS_FALLBACK = {
    steps: 'Пиши шаги атомарно: 1 действие = 1 шаг. Лучше «ввести значение», «отправить форму».',
    expectedResult: 'Опиши, что должно произойти, а не чего не должно. «Форма отправляется» — правильно, «Ошибка не появляется» — неправильно.',
    bugTitle: 'Кратко: где + что не так. «Кнопка оплаты не реагирует» — хорошо, «Баг» — плохо.'
  };
  var HINT_BY_FIELD = { steps: 'steps', expected: 'expectedResult', title: 'bugTitle' };

  function getFieldHint(fieldName) {
    var key = HINT_BY_FIELD[fieldName];
    if (!key) return '';
    var fromData = '';
    if (window.CourseData && window.CourseData.fieldHints && window.CourseData.fieldHints[key]) {
      fromData = window.CourseData.fieldHints[key];
    }
    return fromData || FIELD_HINTS_FALLBACK[key] || '';
  }

  /* ============================================================
     ТОСТЫ, МОДАЛКИ, CONFIRM
     ============================================================ */
  var toastNodes = [];
  App.toast = function (message, type, action) {
    var c = document.getElementById('toast-container');
    if (!c) return null;
    var t = document.createElement('div');
    var kind = type || 'info';
    t.className = 'toast toast--' + kind;
    if (kind === 'danger') {
      t.setAttribute('role', 'alert');
      t.setAttribute('aria-live', 'assertive');
    } else {
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
    }
    var span = document.createElement('span');
    span.textContent = String(message);
    t.appendChild(span);
    if (action && action.label && typeof action.onClick === 'function') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast__action';
      btn.textContent = action.label;
      btn.style.minHeight = '44px';
      btn.addEventListener('click', function () {
        try { action.onClick(); } finally { removeToast(t); }
      });
      t.appendChild(btn);
    }
    c.appendChild(t);
    toastNodes.push(t);
    while (toastNodes.length > 3) removeToast(toastNodes[0]);
    var ttl = kind === 'danger' ? 6000 : 3500;
    setTimeout(function () { removeToast(t); }, ttl);
    return t;
  };
  function removeToast(node) {
    var i = toastNodes.indexOf(node);
    if (i !== -1) toastNodes.splice(i, 1);
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }
  function toast(message, type, action) { return App.toast(message, type, action); }

  var modalStack = [];
  function trapFocus(container, e) {
    var focusables = container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  App.openModal = function (type, data) {
    var host = document.getElementById('modals');
    if (!host) return null;
    var prevFocus = document.activeElement;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    var dialog = document.createElement('div');
    dialog.className = 'modal modal--' + type;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    var titleId = 'modal-title-' + genId();
    dialog.setAttribute('aria-labelledby', titleId);
    var head = document.createElement('div');
    head.className = 'modal__head';
    var h = document.createElement('h2');
    h.id = titleId;
    h.className = 'modal__title';
    h.textContent = (data && data.title) ? data.title : 'Диалог';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal__close';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.textContent = '×';
    closeBtn.style.minWidth = '44px';
    closeBtn.style.minHeight = '44px';
    head.appendChild(h);
    head.appendChild(closeBtn);
    var body = document.createElement('div');
    body.className = 'modal__body';
    dialog.appendChild(head);
    dialog.appendChild(body);
    overlay.appendChild(dialog);
    host.appendChild(overlay);

    var entry = { type: type, overlay: overlay, dialog: dialog, body: body, prevFocus: prevFocus, data: data || {} };
    modalStack.push(entry);

    closeBtn.addEventListener('click', function () { App.closeModal(); });
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) App.closeModal(); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') trapFocus(dialog, e);
      else if (e.key === 'Escape') { e.stopPropagation(); App.closeModal(); }
    });

    fillModalBody(type, body, entry);

    var firstFocusable = dialog.querySelector('input, textarea, select, button:not(.modal__close), a[href]');
    if (firstFocusable) { try { firstFocusable.focus(); } catch (e) {} }
    else { try { closeBtn.focus(); } catch (e) {} }
    return entry;
  };

  App.closeModal = function () {
    var entry = modalStack.pop();
    if (!entry) return;
    if (entry.overlay && entry.overlay.parentNode) entry.overlay.parentNode.removeChild(entry.overlay);
    if (entry.prevFocus && document.contains(entry.prevFocus) && typeof entry.prevFocus.focus === 'function') {
      try { entry.prevFocus.focus(); } catch (e) {}
    }
    if (typeof entry.onClose === 'function') { try { entry.onClose(); } catch (e) {} }
  };
  App.getTopModal = function () { return modalStack.length ? modalStack[modalStack.length - 1] : null; };

  function fillModalBody(type, body, entry) {
    if (type === 'confirm') {
      var p = document.createElement('p');
      p.textContent = entry.data.message || 'Подтвердите действие';
      var row = document.createElement('div');
      row.className = 'modal__actions';
      var ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'btn btn--primary';
      ok.textContent = entry.data.okLabel || 'Подтвердить';
      ok.style.minHeight = '44px';
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn';
      cancel.textContent = 'Отмена';
      cancel.style.minHeight = '44px';
      ok.addEventListener('click', function () {
        if (typeof entry.data.resolve === 'function') entry.data.resolve(true);
        entry.data.resolve = null;
        App.closeModal();
      });
      cancel.addEventListener('click', function () {
        if (typeof entry.data.resolve === 'function') entry.data.resolve(false);
        entry.data.resolve = null;
        App.closeModal();
      });
      entry.onClose = function () {
        if (typeof entry.data.resolve === 'function') entry.data.resolve(false);
      };
      row.appendChild(ok);
      row.appendChild(cancel);
      body.appendChild(p);
      body.appendChild(row);
      return;
    }
    if (type === 'table-hint') {
      body.innerHTML =
        '<p>Табличный редактор управляется с клавиатуры:</p>' +
        '<ul>' +
        '<li>Стрелки вверх и вниз — переход между строками</li>' +
        '<li>Tab и Shift+Tab — переход между ячейками</li>' +
        '<li>Enter — начать редактирование ячейки</li>' +
        '<li>Escape — отменить редактирование</li>' +
        '<li>Delete — удалить строку вне режима редактирования</li>' +
        '<li>Ctrl+D — дублировать строку</li>' +
        '<li>Ctrl+стрелка вверх или вниз — переместить строку</li>' +
        '</ul>';
      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'btn btn--primary';
      okBtn.textContent = 'Понятно';
      okBtn.style.minHeight = '44px';
      okBtn.addEventListener('click', function () {
        state.ui.tableHintSeen = true;
        saveState('ui');
        App.closeModal();
      });
      body.appendChild(okBtn);
      return;
    }
    if (type === 'import-errors') {
      var list = entry.data.errors || [];
      var ul = document.createElement('ul');
      list.forEach(function (msg) {
        var li = document.createElement('li');
        li.textContent = String(msg);
        ul.appendChild(li);
      });
      body.appendChild(ul);
      var actions = document.createElement('div');
      actions.className = 'modal__actions';
      var contBtn = document.createElement('button');
      contBtn.type = 'button';
      contBtn.className = 'btn btn--primary';
      contBtn.textContent = 'Импортировать только валидные';
      contBtn.style.minHeight = '44px';
      contBtn.addEventListener('click', function () {
        if (typeof entry.data.onContinue === 'function') entry.data.onContinue();
        App.closeModal();
      });
      var abortBtn = document.createElement('button');
      abortBtn.type = 'button';
      abortBtn.className = 'btn';
      abortBtn.textContent = 'Отмена';
      abortBtn.style.minHeight = '44px';
      abortBtn.addEventListener('click', function () { App.closeModal(); });
      actions.appendChild(contBtn);
      actions.appendChild(abortBtn);
      body.appendChild(actions);
      return;
    }
    if (entry.data.bodyHtml) body.innerHTML = entry.data.bodyHtml;
    if (typeof entry.data.build === 'function') entry.data.build(body, entry);
  }

  App.confirm = function (message, okLabel) {
    return new Promise(function (resolve) {
      var modalEl = document.getElementById('confirm-modal');
      if (!modalEl) {
        App.openModal('confirm', { title: 'Подтверждение', message: message, okLabel: okLabel, resolve: resolve });
        return;
      }
      var prevFocus = document.activeElement;
      modalEl.innerHTML = '';
      modalEl.removeAttribute('hidden');
      modalEl.setAttribute('aria-hidden', 'false');
      modalEl.setAttribute('role', 'dialog');
      modalEl.setAttribute('aria-modal', 'true');
      var tid = 'confirm-title-' + genId();
      modalEl.setAttribute('aria-labelledby', tid);
      var box = document.createElement('div');
      box.className = 'modal modal--confirm';
      var h = document.createElement('h2');
      h.id = tid;
      h.className = 'modal__title';
      h.textContent = 'Подтверждение';
      var p = document.createElement('p');
      p.className = 'modal__body';
      p.textContent = String(message);
      var actions = document.createElement('div');
      actions.className = 'modal__actions';
      var ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'btn btn--primary';
      ok.textContent = okLabel || 'Подтвердить';
      ok.style.minHeight = '44px';
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'btn';
      cancel.textContent = 'Отмена';
      cancel.style.minHeight = '44px';
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'modal__close';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.textContent = '×';
      closeBtn.style.minWidth = '44px';
      closeBtn.style.minHeight = '44px';
      actions.appendChild(ok);
      actions.appendChild(cancel);
      box.appendChild(closeBtn);
      box.appendChild(h);
      box.appendChild(p);
      box.appendChild(actions);
      modalEl.appendChild(box);

      var settled = false;
      function finish(val) {
        if (settled) return;
        settled = true;
        modalEl.setAttribute('hidden', 'hidden');
        modalEl.setAttribute('aria-hidden', 'true');
        modalEl.innerHTML = '';
        modalEl.removeEventListener('keydown', onKey);
        if (prevFocus && document.contains(prevFocus) && typeof prevFocus.focus === 'function') {
          try { prevFocus.focus(); } catch (e) {}
        }
        resolve(val);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); finish(false); }
        else if (e.key === 'Tab') trapFocus(box, e);
      }
      ok.addEventListener('click', function () { finish(true); });
      cancel.addEventListener('click', function () { finish(false); });
      closeBtn.addEventListener('click', function () { finish(false); });
      modalEl.addEventListener('keydown', onKey);
      try { ok.focus(); } catch (e) {}
    });
  };

  /* ============================================================
     UNDO
     ============================================================ */
  App.undoBuffer = null;
  function pushUndo(type, payload) {
    if (App.undoBuffer && App.undoBuffer.timerId) clearTimeout(App.undoBuffer.timerId);
    var buf = { type: type, payload: payload, timerId: null };
    buf.timerId = setTimeout(function () {
      if (App.undoBuffer === buf) App.undoBuffer = null;
    }, 6000);
    App.undoBuffer = buf;
  }
  App.undoLast = function () {
    var buf = App.undoBuffer;
    if (!buf) return false;
    clearTimeout(buf.timerId);
    App.undoBuffer = null;
    var p = buf.payload;
    if (buf.type === 'note') {
      state.notes[p.id] = p;
      window.IDB.put('notes', p).catch(function () {});
      markDirty('notes', p.id);
      saveState('notes');
      if (state.currentRoute === 'notes') renderNotes();
    } else if (buf.type === 'practice') {
      state.practice[p.id] = p;
      window.IDB.put('practice', p).catch(function () {});
      markDirty('practice', p.id);
      saveState('practice');
      if (state.currentRoute === 'practice') renderPractice();
    } else if (buf.type === 'question') {
      state.questions[p.id] = p;
      window.IDB.put('questions', p).catch(function () {});
      markDirty('questions', p.id);
      saveState('questions');
      if (state.currentRoute === 'questions') renderQuestions();
    } else if (buf.type === 'portfolio') {
      state.portfolio.push(p);
      window.IDB.put('portfolio', p).catch(function () {});
      saveState('portfolio');
      if (state.currentRoute === 'portfolio') renderPortfolio();
    } else if (buf.type === 'glossary') {
      state.userGlossary.push(p);
      markDirty('userGlossary', p.id);
      saveState('userGlossary');
      if (state.currentRoute === 'glossary') renderGlossary();
    }
    toast('Восстановлено', 'success');
    return true;
  };

  /* ============================================================
     КАРТОЧКИ: ensureFlashcards и оценка
     ============================================================ */
  function getQuestionsForTopic(topicId) {
    var out = toArray(state.questions).filter(function (q) { return q.topicId === topicId; });
    if (!out.length && window.CourseData && Array.isArray(window.CourseData.questions)) {
      out = window.CourseData.questions.filter(function (q) { return q.topicId === topicId; });
    }
    return out;
  }
  function ensureFlashcards(topicId) {
    var lesson = state.lessons[topicId];
    if (!lesson) return 0;
    var computed = (typeof App.computeLessonStatus === 'function') ? App.computeLessonStatus(lesson) : lesson.status;
    if (computed !== 'done') return 0;
    var questions = getQuestionsForTopic(topicId);
    var created = 0;
    var diff = 'normal';
    var u = Number(lesson.understanding || 0);
    if (u <= 2) diff = 'hard';
    else if (u >= 4) diff = 'easy';
    questions.forEach(function (q) {
      if (state.flashcards[q.id]) return;
      var card = {
        id: q.id, questionId: q.id, topicId: topicId, moduleId: lesson.moduleId || q.moduleId || null,
        question: q.text || '', answer: q.answerRef || '', difficulty: diff,
        createdAt: nowIso(), lastReview: null, nextReview: addDaysIso(1),
        attempts: 0, successes: 0, streak: 0, lastGrade: null, tags: []
      };
      state.flashcards[q.id] = card;
      markDirty('flashcards', q.id);
      created++;
    });
    if (created) saveState('flashcards');
    return created;
  }
  App.ensureFlashcards = ensureFlashcards;

  function applyGrade(card, grade) {
    var fn = GRADES[grade];
    if (!fn || !card) return;
    var res = fn(card);
    card.attempts = (card.attempts || 0) + 1;
    if (grade === 'known' || grade === 'explain') card.successes = (card.successes || 0) + 1;
    card.streak = res.streakDelta === 'inc' ? (card.streak || 0) + 1 : 0;
    card.lastGrade = grade;
    card.lastReview = nowIso();
    card.nextReview = addDaysIso(res.days);
    markDirty('flashcards', card.id);
    saveState('flashcards');
  }
  App.applyGrade = applyGrade;

  /* ============================================================
     5. renderNotes
     ============================================================ */
  var notesUi = { selectedId: null, search: '', type: 'all', importance: 'all', pinnedOnly: false, sort: 'updatedAt', tagFilter: [], categoryFilter: null };
  var notesEditorInstance = null;

  function createNote() {
    var note = {
      id: genId(), title: '', content: '', type: 'plain', moduleId: null, topicId: null,
      createdAt: nowIso(), updatedAt: nowIso(), tags: [], category: null,
      importance: 1, pinned: false, source: '', conclusion: ''
    };
    state.notes[note.id] = note;
    markDirty('notes', note.id);
    saveState('notes');
    notesUi.selectedId = note.id;
    return note;
  }

  function noteToMarkdown(note) {
    var lines = [];
    lines.push('# ' + (note.title || 'Без названия'));
    lines.push('');
    lines.push('**Тип:** ' + (NOTE_TYPE_LABELS[note.type] || note.type));
    lines.push('**Важность:** ' + (note.importance || 1));
    lines.push('**Обновлено:** ' + fmtDate(note.updatedAt));
    var modTopic = [];
    if (note.moduleId) modTopic.push(note.moduleId);
    if (note.topicId) modTopic.push(note.topicId);
    lines.push('**Модуль/тема:** ' + (modTopic.length ? modTopic.join(' / ') : '—'));
    var tagNames = (note.tags || []).map(function (tid) {
      var t = findById(state.tags, tid);
      return t ? t.name : tid;
    });
    lines.push('**Теги:** ' + (tagNames.length ? tagNames.join(', ') : '—'));
    lines.push('');
    lines.push(note.content || '');
    if (note.conclusion) { lines.push(''); lines.push('## Вывод'); lines.push(note.conclusion); }
    if (note.source) { lines.push(''); lines.push('## Источник'); lines.push(note.source); }
    return lines.join('\n');
  }

  function downloadFile(filename, mime, content) {
    if (typeof Export !== 'undefined' && typeof Export.download === 'function') {
      try { Export.download(filename, mime, content); return; } catch (e) {}
    }
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  App.downloadFile = downloadFile;

  function copyText(text) {
    if (typeof Export !== 'undefined' && typeof Export.copyToClipboard === 'function') {
      try {
        return Export.copyToClipboard(text).then(function (ok) {
          if (ok) toast('Скопировано', 'success');
          else showCopyFallback(text);
          return ok;
        }).catch(function () { showCopyFallback(text); return false; });
      } catch (e) {}
    }
    return new Promise(function (resolve) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (ta.parentNode) ta.parentNode.removeChild(ta);
      if (ok) toast('Скопировано', 'success');
      else showCopyFallback(text);
      resolve(ok);
    });
  }
  function showCopyFallback(text) {
    toast('Копирование недоступно, текст открыт в окне', 'warning');
    App.openModal('copy-fallback', {
      title: 'Скопируйте вручную',
      build: function (body) {
        var ta = document.createElement('textarea');
        ta.rows = 12;
        ta.style.width = '100%';
        ta.value = text;
        body.appendChild(ta);
        try { ta.select(); } catch (e) {}
      }
    });
  }
  App.copyText = copyText;

  function filteredNotes() {
    var arr = toArray(state.notes);
    var q = notesUi.search.toLowerCase();
    if (q) arr = arr.filter(function (n) {
      return (n.title || '').toLowerCase().indexOf(q) !== -1 ||
        (n.content || '').toLowerCase().indexOf(q) !== -1 ||
        (n.conclusion || '').toLowerCase().indexOf(q) !== -1;
    });
    if (notesUi.type !== 'all') arr = arr.filter(function (n) { return n.type === notesUi.type; });
    if (notesUi.importance !== 'all') arr = arr.filter(function (n) { return String(n.importance || 1) === notesUi.importance; });
    if (notesUi.pinnedOnly) arr = arr.filter(function (n) { return n.pinned === true; });
    if (notesUi.tagFilter.length && App.TagsManager) arr = App.TagsManager.filter(arr, notesUi.tagFilter);
    if (notesUi.categoryFilter) arr = arr.filter(function (n) { return n.category === notesUi.categoryFilter; });
    var key = notesUi.sort;
    arr.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (key === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
      if (key === 'importance') return (b.importance || 0) - (a.importance || 0);
      if (key === 'createdAt') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
    return arr;
  }

  function renderNotes() {
    var all = toArray(state.notes);
    var frag = document.createDocumentFragment();
    if (!all.length) {
      var emptyWrap = document.createElement('div');
      emptyWrap.innerHTML = App.renderEmptyState(
        'Заметок пока нет',
        'Ведите конспект своими словами: так материал закрепляется лучше, чем при чтении.',
        'Создать заметку', 'notes'
      );
      var createBtn = document.createElement('button');
      createBtn.type = 'button';
      createBtn.className = 'btn btn--primary';
      createBtn.textContent = 'Создать заметку';
      createBtn.style.minHeight = '44px';
      createBtn.style.marginTop = '12px';
      createBtn.addEventListener('click', function () { createNote(); renderNotes(); });
      emptyWrap.appendChild(createBtn);
      frag.appendChild(emptyWrap);
      setMain(frag);
      return;
    }

    var list = filteredNotes();
    if (!notesUi.selectedId || !state.notes[notesUi.selectedId]) {
      notesUi.selectedId = list.length ? list[0].id : all[0].id;
    }
    var current = state.notes[notesUi.selectedId];

    var wrap = document.createElement('div');
    wrap.className = 'notes-layout';
    wrap.style.display = 'grid';
    wrap.style.gridTemplateColumns = 'minmax(220px,320px) 1fr';
    wrap.style.gap = '16px';
    wrap.style.alignItems = 'start';

    /* --- левая колонка --- */
    var left = document.createElement('div');
    left.className = 'notes-list card';
    left.style.padding = '12px';
    var tagOpts = state.tags.map(function (t) {
      return '<option value="' + esc(t.id) + '"' + (notesUi.tagFilter.indexOf(t.id) !== -1 ? ' selected' : '') + '>' + esc(t.name) + '</option>';
    }).join('');
    var flatCats = (App.CategoriesManager && typeof App.CategoriesManager.getFlat === 'function') ? App.CategoriesManager.getFlat() : [];
    var catOpts = '<option value="">Все категории</option>' + flatCats.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (notesUi.categoryFilter === c.id ? ' selected' : '') + '>' + esc(c.path) + '</option>';
    }).join('');
    left.innerHTML =
      '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
      '<button type="button" data-act="create" class="btn btn--primary" style="min-height:44px;flex:1;">Новая заметка</button>' +
      '<button type="button" data-act="export-all" class="btn" style="min-height:44px;" aria-label="Экспорт всех заметок в Markdown">MD</button>' +
      '</div>' +
      '<label class="visually-hidden" for="notes-search">Поиск по заметкам</label>' +
      '<input id="notes-search" type="search" placeholder="Поиск" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;">' +
      '<div style="display:grid;gap:6px;margin-top:8px;">' +
      '<label>Тип<select data-filter="type" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="all">Все</option>' +
      NOTE_TYPES.map(function (t) { return '<option value="' + t + '"' + (notesUi.type === t ? ' selected' : '') + '>' + esc(NOTE_TYPE_LABELS[t]) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Важность<select data-filter="importance" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="all">Любая</option><option value="1"' + (notesUi.importance === '1' ? ' selected' : '') + '>1</option><option value="2"' + (notesUi.importance === '2' ? ' selected' : '') + '>2</option><option value="3"' + (notesUi.importance === '3' ? ' selected' : '') + '>3</option></select></label>' +
      '<label>Категория<select data-filter="category" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' + catOpts + '</select></label>' +
      (state.tags.length ? '<label>Теги<select data-filter="tags" multiple size="4" style="width:100%;border:1px solid #D4AF37;">' + tagOpts + '</select></label>' : '') +
      '<label>Сортировка<select data-filter="sort" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      '<option value="updatedAt"' + (notesUi.sort === 'updatedAt' ? ' selected' : '') + '>По изменению</option>' +
      '<option value="createdAt"' + (notesUi.sort === 'createdAt' ? ' selected' : '') + '>По созданию</option>' +
      '<option value="title"' + (notesUi.sort === 'title' ? ' selected' : '') + '>По названию</option>' +
      '<option value="importance"' + (notesUi.sort === 'importance' ? ' selected' : '') + '>По важности</option>' +
      '</select></label>' +
      '<label style="display:flex;align-items:center;gap:8px;min-height:44px;"><input type="checkbox" data-filter="pinned"' + (notesUi.pinnedOnly ? ' checked' : '') + '> Только закреплённые</label>' +
      '</div>' +
      '<ul data-role="note-items" style="list-style:none;padding:0;margin:12px 0 0;display:grid;gap:6px;max-height:520px;overflow:auto;"></ul>';

    var ul = left.querySelector('[data-role="note-items"]');
    if (!list.length) {
      var liEmpty = document.createElement('li');
      liEmpty.style.fontSize = '13px';
      liEmpty.style.opacity = '0.7';
      liEmpty.textContent = 'Ничего не найдено';
      ul.appendChild(liEmpty);
    }
    list.forEach(function (n) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-select', n.id);
      btn.setAttribute('aria-current', n.id === notesUi.selectedId ? 'true' : 'false');
      btn.style.cssText = 'width:100%;text-align:left;min-height:44px;padding:8px;border:1px solid ' + (n.id === notesUi.selectedId ? '#D4AF37' : '#E8E0D0') + ';background:' + (n.id === notesUi.selectedId ? 'rgba(212,175,55,.12)' : '#fff') + ';cursor:pointer;';
      var titleSpan = document.createElement('span');
      titleSpan.style.cssText = 'display:block;font-weight:600;font-size:13px;';
      titleSpan.textContent = (n.pinned ? '★ ' : '') + (n.title || 'Без названия');
      var metaSpan = document.createElement('span');
      metaSpan.style.cssText = 'display:block;font-size:11px;opacity:0.65;';
      metaSpan.textContent = (NOTE_TYPE_LABELS[n.type] || n.type) + ' · ' + fmtDate(n.updatedAt);
      btn.appendChild(titleSpan);
      btn.appendChild(metaSpan);
      li.appendChild(btn);
      ul.appendChild(li);
    });

    /* --- правая колонка: редактор --- */
    var right = document.createElement('div');
    right.className = 'notes-editor card';
    right.style.padding = '12px';
    var tagChips = (current.tags || []).map(function (tid) {
      var t = findById(state.tags, tid);
      var marker = t && t.color ? t.color : '#D4AF37';
      return '<span class="tag-chip" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;background:#0A1929;color:#D4AF37;font-size:12px;border-left:3px solid ' + esc(marker) + ';">' +
        esc(t ? t.name : tid) +
        '<button type="button" data-untag="' + esc(tid) + '" aria-label="Убрать тег" style="background:none;border:none;color:inherit;cursor:pointer;min-width:24px;">×</button></span>';
    }).join('');
    var tagSelectOpts = state.tags.filter(function (t) { return (current.tags || []).indexOf(t.id) === -1; })
      .map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>'; }).join('');
    var catSelectOpts = '<option value="">— без категории —</option>' + flatCats.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (current.category === c.id ? ' selected' : '') + '>' + esc(c.path) + '</option>';
    }).join('');

    right.innerHTML =
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center;">' +
      '<h2 style="margin:0;font-size:18px;">Редактор заметки</h2>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      '<button type="button" data-act="pin" class="btn" style="min-height:44px;" aria-pressed="' + (current.pinned ? 'true' : 'false') + '">' + (current.pinned ? 'Закреплена' : 'Закрепить') + '</button>' +
      '<button type="button" data-act="duplicate" class="btn" style="min-height:44px;">Дублировать</button>' +
      '<button type="button" data-act="export-one" class="btn" style="min-height:44px;">Markdown</button>' +
      '<button type="button" data-act="copy" class="btn" style="min-height:44px;">Копировать</button>' +
      '<button type="button" data-act="delete" class="btn btn--danger" style="min-height:44px;">Удалить</button>' +
      '</div></div>' +
      '<label style="display:block;margin-top:12px;">Название<input data-field="title" type="text" maxlength="' + NOTE_LIMITS.title + '" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:8px;">' +
      '<label>Тип<select data-field="type" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      NOTE_TYPES.map(function (t) { return '<option value="' + t + '"' + (current.type === t ? ' selected' : '') + '>' + esc(NOTE_TYPE_LABELS[t]) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Важность<select data-field="importance" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      [1, 2, 3].map(function (n) { return '<option value="' + n + '"' + (Number(current.importance) === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Категория<select data-field="category" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' + catSelectOpts + '</select></label>' +
      '</div>' +
      '<div style="margin-top:12px;"><span style="font-weight:600;font-size:13px;">Содержание</span>' +
      '<div data-role="editor-host" style="margin-top:4px;"></div>' +
      '<div data-role="counter" class="counter" aria-live="polite" style="font-size:12px;margin-top:4px;opacity:0.7;"></div></div>' +
      '<label style="display:block;margin-top:12px;">Вывод<textarea data-field="conclusion" rows="3" maxlength="' + NOTE_LIMITS.conclusion + '" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;word-break:break-word;"></textarea></label>' +
      '<label style="display:block;margin-top:8px;">Источник<input data-field="source" type="text" maxlength="' + NOTE_LIMITS.source + '" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<div style="margin-top:12px;"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
      '<select data-role="tag-select" style="min-height:44px;border:1px solid #D4AF37;"><option value="">— тег —</option>' + tagSelectOpts + '</select>' +
      '<button type="button" data-act="add-tag" class="btn" style="min-height:44px;">Добавить тег</button>' +
      '<span style="font-size:12px;opacity:0.65;">Лимит ' + NOTE_LIMITS.tags + '</span></div>' +
      '<div data-role="tag-chips" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">' + tagChips + '</div></div>' +
      '<p style="font-size:12px;opacity:0.7;margin-top:12px;">Создана ' + esc(fmtDate(current.createdAt)) + ' · изменена ' + esc(fmtDate(current.updatedAt)) + '</p>';

    wrap.appendChild(left);
    wrap.appendChild(right);
    frag.appendChild(wrap);
    setMain(frag);

    /* значения полей через .value */
    right.querySelector('[data-field="title"]').value = current.title || '';
    right.querySelector('[data-field="conclusion"]').value = current.conclusion || '';
    right.querySelector('[data-field="source"]').value = current.source || '';

    /* редактор содержания */
    var host = right.querySelector('[data-role="editor-host"]');
    var counter = right.querySelector('[data-role="counter"]');
    function updateCounter(len) {
      var max = NOTE_LIMITS.content;
      counter.textContent = len + ' / ' + max;
      counter.classList.remove('counter-warn', 'counter-danger');
      if (len >= max) counter.classList.add('counter-danger');
      else if (len >= max * 0.9) counter.classList.add('counter-warn');
    }
    var saveNote = debounce(function () {
      var note = state.notes[notesUi.selectedId];
      if (!note) return;
      note.title = right.querySelector('[data-field="title"]').value.slice(0, NOTE_LIMITS.title);
      note.type = right.querySelector('[data-field="type"]').value;
      note.importance = Number(right.querySelector('[data-field="importance"]').value) || 1;
      note.category = right.querySelector('[data-field="category"]').value || null;
      note.conclusion = right.querySelector('[data-field="conclusion"]').value.slice(0, NOTE_LIMITS.conclusion);
      note.source = right.querySelector('[data-field="source"]').value.slice(0, NOTE_LIMITS.source);
      note.content = notesEditorInstance ? String(notesEditorInstance.getValue() || '').slice(0, NOTE_LIMITS.content) : note.content;
      note.updatedAt = nowIso();
      markDirty('notes', note.id);
      saveState('notes');
    }, 300);

    if (notesEditorInstance && typeof notesEditorInstance.destroy === 'function') {
      try { notesEditorInstance.destroy(); } catch (e) {}
      notesEditorInstance = null;
    }
    if (typeof Editor !== 'undefined' && typeof Editor.create === 'function') {
      try {
        notesEditorInstance = Editor.create(host, {
          value: current.content || '',
          maxLength: NOTE_LIMITS.content,
          placeholder: 'Пишите своими словами',
          onChange: function (val) { updateCounter(String(val || '').length); saveNote(); }
        });
      } catch (e) { notesEditorInstance = null; }
    }
    if (!notesEditorInstance) {
      var ta = document.createElement('textarea');
      ta.rows = 12;
      ta.maxLength = NOTE_LIMITS.content;
      ta.placeholder = 'Пишите своими словами';
      ta.style.cssText = 'width:100%;min-height:200px;padding:8px;border:1px solid #D4AF37;word-break:break-word;';
      ta.value = current.content || '';
      host.appendChild(ta);
      notesEditorInstance = {
        getValue: function () { return ta.value; },
        setValue: function (v) { ta.value = v; },
        focus: function () { ta.focus(); },
        destroy: function () { if (ta.parentNode) ta.parentNode.removeChild(ta); }
      };
      ta.addEventListener('input', function () { updateCounter(ta.value.length); saveNote(); });
    }
    updateCounter((current.content || '').length);

    /* делегирование: левая колонка */
    left.addEventListener('click', function (e) {
      var selBtn = e.target.closest('[data-select]');
      if (selBtn) { notesUi.selectedId = selBtn.getAttribute('data-select'); renderNotes(); return; }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'create') { createNote(); renderNotes(); }
      else if (a === 'export-all') {
        var md = toArray(state.notes).map(noteToMarkdown).join('\n\n---\n\n');
        downloadFile('qa-notes.md', 'text/markdown;charset=utf-8', md);
        toast('Заметки экспортированы', 'success');
      }
    });
    var searchInput = left.querySelector('#notes-search');
    searchInput.value = notesUi.search;
    searchInput.addEventListener('input', debounce(function () {
      notesUi.search = searchInput.value;
      renderNotes();
    }, 200));
    left.addEventListener('change', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-filter');
      if (!f) return;
      if (f === 'type') notesUi.type = e.target.value;
      else if (f === 'importance') notesUi.importance = e.target.value;
      else if (f === 'category') notesUi.categoryFilter = e.target.value || null;
      else if (f === 'sort') notesUi.sort = e.target.value;
      else if (f === 'pinned') notesUi.pinnedOnly = e.target.checked;
      else if (f === 'tags') {
        notesUi.tagFilter = Array.prototype.slice.call(e.target.selectedOptions).map(function (o) { return o.value; });
      }
      renderNotes();
    });

    /* делегирование: редактор */
    right.addEventListener('input', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-field')) saveNote();
    });
    right.addEventListener('change', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-field')) saveNote();
    });
    right.addEventListener('click', function (e) {
      var untag = e.target.closest('[data-untag]');
      if (untag) {
        var tid = untag.getAttribute('data-untag');
        var n1 = state.notes[notesUi.selectedId];
        n1.tags = (n1.tags || []).filter(function (x) { return x !== tid; });
        n1.updatedAt = nowIso();
        markDirty('notes', n1.id);
        saveState('notes');
        renderNotes();
        return;
      }
      var act = e.target.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      var note = state.notes[notesUi.selectedId];
      if (!note) return;
      if (a === 'pin') {
        note.pinned = !note.pinned;
        note.updatedAt = nowIso();
        markDirty('notes', note.id);
        saveState('notes');
        renderNotes();
      } else if (a === 'duplicate') {
        var copy = JSON.parse(JSON.stringify(note));
        copy.id = genId();
        copy.title = (note.title || 'Без названия') + ' — копия';
        copy.createdAt = nowIso();
        copy.updatedAt = nowIso();
        state.notes[copy.id] = copy;
        markDirty('notes', copy.id);
        saveState('notes');
        notesUi.selectedId = copy.id;
        toast('Заметка дублирована', 'success');
        renderNotes();
      } else if (a === 'export-one') {
        downloadFile('note-' + note.id + '.md', 'text/markdown;charset=utf-8', noteToMarkdown(note));
      } else if (a === 'copy') {
        copyText(noteToMarkdown(note));
      } else if (a === 'add-tag') {
        var sel = right.querySelector('[data-role="tag-select"]');
        var newTag = sel ? sel.value : '';
        if (!newTag) return;
        if (App.TagsManager && typeof App.TagsManager.addToElement === 'function') {
          if (!App.TagsManager.addToElement(note, newTag)) return;
        } else {
          if (!Array.isArray(note.tags)) note.tags = [];
          if (note.tags.length >= NOTE_LIMITS.tags) { toast('Лимит ' + NOTE_LIMITS.tags + ' тегов', 'warning'); return; }
          if (note.tags.indexOf(newTag) !== -1) return;
          note.tags.push(newTag);
        }
        note.updatedAt = nowIso();
        markDirty('notes', note.id);
        saveState('notes');
        renderNotes();
      } else if (a === 'delete') {
        App.confirm('Удалить заметку «' + (note.title || 'Без названия') + '»?', 'Удалить').then(function (ok) {
          if (!ok) return;
          var snapshot = JSON.parse(JSON.stringify(note));
          delete state.notes[note.id];
          window.IDB.delete('notes', note.id).catch(function () {});
          App.dirtyByScope.notes.delete(note.id);
          saveState('notes');
          pushUndo('note', snapshot);
          notesUi.selectedId = null;
          toast('Заметка удалена', 'danger', { label: 'Отменить', onClick: function () { App.undoLast(); } });
          renderNotes();
        });
      }
    });
  }

  /* ============================================================
     6. renderQuestions
     ============================================================ */
  var questionsUi = { type: 'all', moduleId: 'all', topicId: 'all', tagFilter: [], revealed: {}, search: '' };

  function allQuestionsMerged() {
    var map = {};
    if (window.CourseData && Array.isArray(window.CourseData.questions)) {
      window.CourseData.questions.forEach(function (q) {
        map[q.id] = {
          id: q.id, moduleId: q.moduleId || null, topicId: q.topicId || null,
          type: q.type || 'definition', text: q.text || '', hint: q.hint || '',
          answerRef: q.answerRef || '', isUserCreated: false
        };
      });
    }
    toArray(state.questions).forEach(function (q) { map[q.id] = q; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function renderQuestions() {
    var all = allQuestionsMerged();
    var frag = document.createDocumentFragment();
    if (!all.length) {
      var w0 = document.createElement('div');
      w0.innerHTML = App.renderEmptyState(
        'Вопросов нет',
        'Завершите урок — вопросы появятся автоматически вместе с карточками для повторения.',
        'Открыть курс', 'course'
      );
      frag.appendChild(w0);
      setMain(frag);
      return;
    }

    var modules = (window.CourseData && Array.isArray(window.CourseData.modules)) ? window.CourseData.modules : [];
    var filtered = all.slice();
    if (questionsUi.type !== 'all') filtered = filtered.filter(function (q) { return q.type === questionsUi.type; });
    if (questionsUi.moduleId !== 'all') filtered = filtered.filter(function (q) { return q.moduleId === questionsUi.moduleId; });
    if (questionsUi.topicId !== 'all') filtered = filtered.filter(function (q) { return q.topicId === questionsUi.topicId; });
    if (questionsUi.tagFilter.length && App.TagsManager) filtered = App.TagsManager.filter(filtered, questionsUi.tagFilter);
    if (questionsUi.search) {
      var qs = questionsUi.search.toLowerCase();
      filtered = filtered.filter(function (q) { return (q.text || '').toLowerCase().indexOf(qs) !== -1; });
    }

    var topicsForModule = [];
    modules.forEach(function (m) {
      if (questionsUi.moduleId === 'all' || m.id === questionsUi.moduleId) {
        (m.topics || []).forEach(function (t) { topicsForModule.push(t); });
      }
    });

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Вопросы — самопроверка</h2>' +
      '<div class="card" style="padding:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;">' +
      '<label>Тип<select data-qf="type" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="all">Все</option>' +
      QUESTION_TYPES.map(function (t) { return '<option value="' + t + '"' + (questionsUi.type === t ? ' selected' : '') + '>' + esc(QUESTION_TYPE_LABELS[t]) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Модуль<select data-qf="module" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="all">Все</option>' +
      modules.map(function (m) { return '<option value="' + esc(m.id) + '"' + (questionsUi.moduleId === m.id ? ' selected' : '') + '>' + esc(m.title) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Тема<select data-qf="topic" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="all">Все</option>' +
      topicsForModule.map(function (t) { return '<option value="' + esc(t.id) + '"' + (questionsUi.topicId === t.id ? ' selected' : '') + '>' + esc(t.title) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Поиск<input data-qf="search" type="search" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<div style="display:flex;align-items:flex-end;"><button type="button" data-qact="create" class="btn btn--primary" style="min-height:44px;width:100%;">Свой вопрос</button></div>' +
      '</div>' +
      '<div data-role="q-list" style="display:grid;gap:10px;margin-top:12px;"></div>';

    var listHost = wrap.querySelector('[data-role="q-list"]');
    if (!filtered.length) {
      listHost.innerHTML = App.renderEmptyState('Под фильтр ничего не подошло', 'Смените тип, модуль или тему.', null, null);
    }
    filtered.forEach(function (q) {
      var lesson = q.topicId ? state.lessons[q.topicId] : null;
      var savedAnswer = '';
      if (lesson && lesson.answers && lesson.answers[q.id] !== undefined) savedAnswer = lesson.answers[q.id];
      else if (state.flashcards[q.id] && state.flashcards[q.id].userAnswer) savedAnswer = state.flashcards[q.id].userAnswer;
      var revealed = !!questionsUi.revealed[q.id];
      var card = document.createElement('div');
      card.className = 'card question-card';
      card.style.padding = '12px';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
        '<strong style="font-size:14px;">' + esc(q.text) + '</strong>' +
        '<span style="font-size:11px;padding:3px 6px;border:1px solid #D4AF37;white-space:nowrap;">' + esc(QUESTION_TYPE_LABELS[q.type] || q.type) + '</span>' +
        '</div>' +
        (q.hint ? '<p style="font-size:12px;opacity:0.7;margin:6px 0 0;">Подсказка: ' + esc(q.hint) + '</p>' : '') +
        '<label style="display:block;margin-top:8px;">Ваш ответ<textarea data-answer="' + esc(q.id) + '" rows="3" maxlength="5000" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;word-break:break-word;"></textarea></label>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">' +
        '<button type="button" data-reveal="' + esc(q.id) + '" aria-expanded="' + (revealed ? 'true' : 'false') + '" class="btn" style="min-height:44px;">' + (revealed ? 'Скрыть эталон' : 'Показать эталон') + '</button>' +
        (q.isUserCreated ? '<button type="button" data-qedit="' + esc(q.id) + '" class="btn" style="min-height:44px;">Изменить</button><button type="button" data-qdel="' + esc(q.id) + '" class="btn btn--danger" style="min-height:44px;">Удалить</button>' : '') +
        '</div>' +
        '<div data-ref="' + esc(q.id) + '"' + (revealed ? '' : ' hidden') + ' style="margin-top:8px;padding:8px;background:rgba(212,175,55,.08);border-left:3px solid #D4AF37;font-size:13px;">' +
        '<div><strong>Эталон:</strong> ' + esc(q.answerRef || 'Эталон не задан — сверьтесь с конспектом.') + '</div>' +
        '<div style="margin-top:6px;"><strong>Ваш ответ:</strong> ' + esc(savedAnswer || '—') + '</div>' +
        '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">' +
        Object.keys(GRADE_LABELS).map(function (g) {
          return '<button type="button" data-grade="' + g + '" data-qid="' + esc(q.id) + '" class="btn" style="min-height:44px;">' + esc(GRADE_LABELS[g]) + '</button>';
        }).join('') +
        '</div></div>';
      var ta = card.querySelector('[data-answer]');
      ta.value = savedAnswer;
      listHost.appendChild(card);
    });

    frag.appendChild(wrap);
    setMain(frag);

    wrap.querySelector('[data-qf="search"]').value = questionsUi.search;
    wrap.addEventListener('change', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-qf');
      if (!f) return;
      if (f === 'type') questionsUi.type = e.target.value;
      else if (f === 'module') { questionsUi.moduleId = e.target.value; questionsUi.topicId = 'all'; }
      else if (f === 'topic') questionsUi.topicId = e.target.value;
      renderQuestions();
    });
    var qsearch = wrap.querySelector('[data-qf="search"]');
    qsearch.addEventListener('input', debounce(function () { questionsUi.search = qsearch.value; renderQuestions(); }, 200));

    wrap.addEventListener('input', function (e) {
      var qid = e.target.getAttribute && e.target.getAttribute('data-answer');
      if (!qid) return;
      saveAnswerDebounced(qid, e.target.value);
    });
    var saveAnswerDebounced = debounce(function (qid, value) {
      var q = null;
      var merged = allQuestionsMerged();
      for (var i = 0; i < merged.length; i++) if (merged[i].id === qid) { q = merged[i]; break; }
      if (!q) return;
      if (q.topicId && state.lessons[q.topicId]) {
        var lesson = state.lessons[q.topicId];
        if (!lesson.answers || typeof lesson.answers !== 'object') lesson.answers = {};
        lesson.answers[qid] = String(value).slice(0, 5000);
        if (typeof App.computeLessonStatus === 'function') lesson.status = App.computeLessonStatus(lesson);
        markDirty('lessons', q.topicId);
        saveState('lessons');
        ensureFlashcards(q.topicId);
      } else {
        var card = state.flashcards[qid];
        if (!card) {
          card = {
            id: qid, questionId: qid, topicId: q.topicId || null, moduleId: q.moduleId || null,
            question: q.text || '', answer: q.answerRef || '', difficulty: 'normal',
            createdAt: nowIso(), lastReview: null, nextReview: addDaysIso(1),
            attempts: 0, successes: 0, streak: 0, lastGrade: null, tags: []
          };
          state.flashcards[qid] = card;
        }
        card.userAnswer = String(value).slice(0, 5000);
        markDirty('flashcards', qid);
        saveState('flashcards');
      }
    }, 300);

    wrap.addEventListener('click', function (e) {
      var rev = e.target.closest('[data-reveal]');
      if (rev) {
        var rid = rev.getAttribute('data-reveal');
        questionsUi.revealed[rid] = !questionsUi.revealed[rid];
        var refBox = wrap.querySelector('[data-ref="' + rid + '"]');
        rev.setAttribute('aria-expanded', questionsUi.revealed[rid] ? 'true' : 'false');
        rev.textContent = questionsUi.revealed[rid] ? 'Скрыть эталон' : 'Показать эталон';
        if (refBox) {
          if (questionsUi.revealed[rid]) refBox.removeAttribute('hidden');
          else refBox.setAttribute('hidden', 'hidden');
        }
        return;
      }
      var gradeBtn = e.target.closest('[data-grade]');
      if (gradeBtn) {
        var grade = gradeBtn.getAttribute('data-grade');
        var qid2 = gradeBtn.getAttribute('data-qid');
        var card = state.flashcards[qid2];
        if (!card) {
          var merged2 = allQuestionsMerged();
          var qq = null;
          for (var i = 0; i < merged2.length; i++) if (merged2[i].id === qid2) { qq = merged2[i]; break; }
          if (qq && qq.topicId) ensureFlashcards(qq.topicId);
          card = state.flashcards[qid2];
          if (!card && qq) {
            card = {
              id: qid2, questionId: qid2, topicId: qq.topicId || null, moduleId: qq.moduleId || null,
              question: qq.text || '', answer: qq.answerRef || '', difficulty: 'normal',
              createdAt: nowIso(), lastReview: null, nextReview: addDaysIso(1),
              attempts: 0, successes: 0, streak: 0, lastGrade: null, tags: []
            };
            state.flashcards[qid2] = card;
          }
        }
        if (!card) { toast('Карточка недоступна', 'warning'); return; }
        applyGrade(card, grade);
        toast('Оценка сохранена, повтор ' + fmtDate(card.nextReview), 'success');
        return;
      }
      var createBtn = e.target.closest('[data-qact="create"]');
      if (createBtn) { openQuestionEditor(null); return; }
      var editBtn = e.target.closest('[data-qedit]');
      if (editBtn) { openQuestionEditor(editBtn.getAttribute('data-qedit')); return; }
      var delBtn = e.target.closest('[data-qdel]');
      if (delBtn) {
        var did = delBtn.getAttribute('data-qdel');
        var target = state.questions[did];
        if (!target || !target.isUserCreated) { toast('Удалять можно только свои вопросы', 'warning'); return; }
        App.confirm('Удалить свой вопрос?', 'Удалить').then(function (ok) {
          if (!ok) return;
          var snap = JSON.parse(JSON.stringify(target));
          delete state.questions[did];
          window.IDB.delete('questions', did).catch(function () {});
          App.dirtyByScope.questions.delete(did);
          saveState('questions');
          pushUndo('question', snap);
          toast('Вопрос удалён', 'danger', { label: 'Отменить', onClick: function () { App.undoLast(); } });
          renderQuestions();
        });
      }
    });
  }

  function openQuestionEditor(questionId) {
    var existing = questionId ? state.questions[questionId] : null;
    App.openModal('question-editor', {
      title: existing ? 'Изменить вопрос' : 'Новый вопрос',
      build: function (body) {
        var modules = (window.CourseData && Array.isArray(window.CourseData.modules)) ? window.CourseData.modules : [];
        var topics = [];
        modules.forEach(function (m) { (m.topics || []).forEach(function (t) { topics.push({ id: t.id, title: m.title + ' / ' + t.title }); }); });
        body.innerHTML =
          '<label style="display:block;">Текст вопроса<textarea data-qfield="text" rows="3" maxlength="1000" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;"></textarea></label>' +
          '<label style="display:block;margin-top:8px;">Тип<select data-qfield="type" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
          QUESTION_TYPES.map(function (t) { return '<option value="' + t + '">' + esc(QUESTION_TYPE_LABELS[t]) + '</option>'; }).join('') +
          '</select></label>' +
          '<label style="display:block;margin-top:8px;">Тема<select data-qfield="topicId" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="">— без темы —</option>' +
          topics.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('') +
          '</select></label>' +
          '<label style="display:block;margin-top:8px;">Подсказка<input data-qfield="hint" type="text" maxlength="300" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
          '<label style="display:block;margin-top:8px;">Эталонный ответ<textarea data-qfield="answerRef" rows="3" maxlength="3000" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;"></textarea></label>' +
          '<div class="modal__actions" style="margin-top:12px;display:flex;gap:8px;"><button type="button" data-qsave class="btn btn--primary" style="min-height:44px;">Сохранить</button></div>';
        if (existing) {
          body.querySelector('[data-qfield="text"]').value = existing.text || '';
          body.querySelector('[data-qfield="type"]').value = existing.type || 'custom';
          body.querySelector('[data-qfield="topicId"]').value = existing.topicId || '';
          body.querySelector('[data-qfield="hint"]').value = existing.hint || '';
          body.querySelector('[data-qfield="answerRef"]').value = existing.answerRef || '';
        } else {
          body.querySelector('[data-qfield="type"]').value = 'custom';
        }
        body.querySelector('[data-qsave]').addEventListener('click', function () {
          var text = body.querySelector('[data-qfield="text"]').value.trim();
          if (!text) { toast('Введите текст вопроса', 'warning'); return; }
          var topicId = body.querySelector('[data-qfield="topicId"]').value || null;
          var moduleId = null;
          if (topicId) {
            modules.forEach(function (m) {
              (m.topics || []).forEach(function (t) { if (t.id === topicId) moduleId = m.id; });
            });
          }
          var rec = existing || { id: genId(), isUserCreated: true };
          rec.text = text;
          rec.type = body.querySelector('[data-qfield="type"]').value;
          rec.topicId = topicId;
          rec.moduleId = moduleId;
          rec.hint = body.querySelector('[data-qfield="hint"]').value.trim();
          rec.answerRef = body.querySelector('[data-qfield="answerRef"]').value.trim();
          rec.isUserCreated = true;
          state.questions[rec.id] = rec;
          markDirty('questions', rec.id);
          saveState('questions');
          App.closeModal();
          toast('Вопрос сохранён', 'success');
          renderQuestions();
        });
      }
    });
  }

  /* ============================================================
     7. renderRepetition
     ============================================================ */
  var repetitionUi = { tagFilter: [], revealed: {} };

  function groupFlashcards() {
    var cards = toArray(state.flashcards);
    if (repetitionUi.tagFilter.length && App.TagsManager) cards = App.TagsManager.filter(cards, repetitionUi.tagFilter);
    var start = todayStart().getTime();
    var endOfToday = start + 86400000 - 1;
    var groups = { overdue: [], today: [], hard: [], completed: [] };
    cards.forEach(function (c) {
      var nr = c.nextReview ? new Date(c.nextReview).getTime() : start;
      if ((c.streak || 0) >= 4) { groups.completed.push(c); return; }
      var isHard = c.difficulty === 'hard' ||
        ((c.attempts || 0) >= 2 && (c.successes || 0) / (c.attempts || 1) < 0.5);
      if (nr < start) groups.overdue.push(c);
      else if (nr <= endOfToday) groups.today.push(c);
      if (isHard) groups.hard.push(c);
    });
    return groups;
  }

  function renderRepetition() {
    var cards = toArray(state.flashcards);
    var frag = document.createDocumentFragment();
    if (!cards.length) {
      var w0 = document.createElement('div');
      w0.innerHTML = App.renderEmptyState(
        'Карточек нет',
        'Завершите урок: заполните вывод, ответьте на вопросы, отметьте практику и понимание — карточки создадутся автоматически.',
        'Открыть курс', 'course'
      );
      frag.appendChild(w0);
      setMain(frag);
      return;
    }
    var groups = groupFlashcards();
    var wrap = document.createElement('div');
    var tagOpts = state.tags.map(function (t) {
      return '<option value="' + esc(t.id) + '"' + (repetitionUi.tagFilter.indexOf(t.id) !== -1 ? ' selected' : '') + '>' + esc(t.name) + '</option>';
    }).join('');
    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Повторение</h2>' +
      '<div class="card" style="padding:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">' +
      (state.tags.length ? '<label>Теги<select data-rf="tags" multiple size="3" style="min-width:180px;border:1px solid #D4AF37;">' + tagOpts + '</select></label>' : '') +
      '<div data-role="rep-counts" style="font-size:13px;">' +
      'Просрочено: <strong data-count="overdue">' + groups.overdue.length + '</strong> · ' +
      'На сегодня: <strong data-count="today">' + groups.today.length + '</strong> · ' +
      'Сложные: <strong data-count="hard">' + groups.hard.length + '</strong> · ' +
      'Завершённые: <strong data-count="completed">' + groups.completed.length + '</strong>' +
      '</div></div>' +
      '<div data-role="rep-groups" style="display:grid;gap:16px;margin-top:12px;"></div>';

    var host = wrap.querySelector('[data-role="rep-groups"]');
    var titles = { overdue: 'Просроченные', today: 'На сегодня', hard: 'Сложные', completed: 'Завершённые' };
    ['overdue', 'today', 'hard', 'completed'].forEach(function (key) {
      var section = document.createElement('section');
      section.className = 'card';
      section.style.padding = '12px';
      var h3 = document.createElement('h3');
      h3.style.margin = '0 0 8px';
      h3.textContent = titles[key] + ' (' + groups[key].length + ')';
      section.appendChild(h3);
      if (!groups[key].length) {
        var p = document.createElement('p');
        p.style.cssText = 'font-size:13px;opacity:0.65;margin:0;';
        p.textContent = 'Пусто';
        section.appendChild(p);
      }
      groups[key].forEach(function (c) {
        var revealed = !!repetitionUi.revealed[c.id];
        var item = document.createElement('div');
        item.style.cssText = 'border:1px solid #E8E0D0;padding:10px;margin-top:8px;';
        var tagNames = (c.tags || []).map(function (tid) {
          var t = findById(state.tags, tid);
          return t ? t.name : tid;
        }).join(', ');
        item.innerHTML =
          '<div style="font-weight:600;font-size:13px;">' + esc(c.question || c.id) + '</div>' +
          '<div style="font-size:11px;opacity:0.65;margin-top:4px;">' +
          esc(c.moduleId || '—') + ' · сложность ' + esc(c.difficulty) + ' · попыток ' + (c.attempts || 0) + ' · успехов ' + (c.successes || 0) +
          ' · повтор ' + esc(fmtDate(c.nextReview)) + (tagNames ? ' · теги ' + esc(tagNames) : '') + '</div>' +
          '<button type="button" data-rep-reveal="' + esc(c.id) + '" aria-expanded="' + (revealed ? 'true' : 'false') + '" class="btn" style="min-height:44px;margin-top:8px;">' + (revealed ? 'Скрыть ответ' : 'Показать ответ') + '</button>' +
          '<div data-rep-answer="' + esc(c.id) + '"' + (revealed ? '' : ' hidden') + ' style="margin-top:8px;padding:8px;background:rgba(212,175,55,.08);border-left:3px solid #D4AF37;font-size:13px;">' +
          esc(c.answer || 'Ответ не задан — сверьтесь с конспектом урока.') +
          '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">' +
          Object.keys(GRADE_LABELS).map(function (g) {
            return '<button type="button" data-rep-grade="' + g + '" data-cid="' + esc(c.id) + '" class="btn" style="min-height:44px;">' + esc(GRADE_LABELS[g]) + '</button>';
          }).join('') +
          '</div></div>';
        section.appendChild(item);
      });
      host.appendChild(section);
    });

    frag.appendChild(wrap);
    setMain(frag);

    var tagSel = wrap.querySelector('[data-rf="tags"]');
    if (tagSel) tagSel.addEventListener('change', function () {
      repetitionUi.tagFilter = Array.prototype.slice.call(tagSel.selectedOptions).map(function (o) { return o.value; });
      renderRepetition();
    });

    wrap.addEventListener('click', function (e) {
      var rev = e.target.closest('[data-rep-reveal]');
      if (rev) {
        var id = rev.getAttribute('data-rep-reveal');
        repetitionUi.revealed[id] = !repetitionUi.revealed[id];
        var box = wrap.querySelector('[data-rep-answer="' + id + '"]');
        rev.setAttribute('aria-expanded', repetitionUi.revealed[id] ? 'true' : 'false');
        rev.textContent = repetitionUi.revealed[id] ? 'Скрыть ответ' : 'Показать ответ';
        if (box) {
          if (repetitionUi.revealed[id]) box.removeAttribute('hidden');
          else box.setAttribute('hidden', 'hidden');
        }
        return;
      }
      var g = e.target.closest('[data-rep-grade]');
      if (!g) return;
      var cid = g.getAttribute('data-cid');
      var card = state.flashcards[cid];
      if (!card) return;
      applyGrade(card, g.getAttribute('data-rep-grade'));
      var groupsNow = groupFlashcards();
      ['overdue', 'today', 'hard', 'completed'].forEach(function (k) {
        var node = wrap.querySelector('[data-count="' + k + '"]');
        if (node) node.textContent = String(groupsNow[k].length);
      });
      toast('Следующий повтор ' + fmtDate(card.nextReview), 'success');
    });
  }

  /* ============================================================
     10. ПОДСКАЗКИ У ПОЛЕЙ
     ============================================================ */
  function attachFieldHint(inputEl, fieldName) {
    var text = getFieldHint(fieldName);
    if (!text || !inputEl) return;
    var hintId = 'hint-' + fieldName;
    var existing = document.getElementById(hintId);
    if (!existing) {
      existing = document.createElement('div');
      existing.id = hintId;
      existing.className = 'field-hint';
      existing.style.cssText = 'font-style:italic;font-size:12px;color:var(--text-muted,#5A6673);display:flex;gap:6px;align-items:flex-start;margin-top:4px;';
      existing.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false" style="flex:0 0 16px;margin-top:2px;">' +
        '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a6 6 0 0 0-4 10.5V15h8v-2.5A6 6 0 0 0 12 2z"/></svg>' +
        '<span></span>';
      existing.querySelector('span').textContent = text;
      if (inputEl.parentNode) inputEl.parentNode.appendChild(existing);
    }
    inputEl.setAttribute('aria-describedby', hintId);
  }

  /* ============================================================
     11. ЧЕК-ЛИСТ КАЧЕСТВА
     ============================================================ */
  function checkQuality(practice) {
    var items = [];
    if (!practice) return { ok: false, items: items };
    var kind = practice.templateKind || '';
    if (kind !== 'bug-report' && kind !== 'test-case') return { ok: true, items: items };
    var f = practice.fields || {};
    function add(label, ok) { items.push({ label: label, ok: !!ok }); }
    if (kind === 'bug-report') {
      add('Шаги воспроизведения заполнены', f.steps && String(f.steps).trim());
      add('Ожидаемый результат заполнен', f.expected && String(f.expected).trim());
      add('Окружение указано', f.environment && String(f.environment).trim());
      add('Фактический результат заполнен', f.actual && String(f.actual).trim());
      add('Severity выбран', f.severity && String(f.severity).trim());
      add('Priority выбран', f.priority && String(f.priority).trim());
    } else {
      var rows = practice.rows || [];
      add('Есть хотя бы один шаг', rows.length > 0);
      add('Все шаги описаны', rows.length > 0 && rows.every(function (r) { return r[1] && String(r[1]).trim(); }));
      add('Ожидаемые результаты заполнены', rows.length > 0 && rows.every(function (r) { return r[2] && String(r[2]).trim(); }));
    }
    var ok = items.every(function (i) { return i.ok; });
    return { ok: ok, items: items };
  }
  App.checkQuality = checkQuality;

  function renderQualityBlock(practice) {
    var res = checkQuality(practice);
    if (!res.items.length) return document.createDocumentFragment();
    var box = document.createElement('div');
    box.className = res.ok ? 'quality-block' : 'quality-block warning-block';
    if (!res.ok) {
      box.style.cssText = 'border-left:3px solid #D4AF37;background:rgba(212,175,55,.08);padding:10px;margin-top:12px;';
    } else {
      box.style.cssText = 'border-left:3px solid #D4AF37;padding:10px;margin-top:12px;';
    }
    var ul = document.createElement('ul');
    ul.style.cssText = 'list-style:none;padding:0;margin:0;display:grid;gap:4px;';
    res.items.forEach(function (i) {
      var li = document.createElement('li');
      li.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:13px;';
      li.innerHTML = i.ok
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1929" stroke-width="2" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6F47" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>';
      var span = document.createElement('span');
      span.textContent = i.label;
      li.appendChild(span);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    if (!res.ok) {
      var p = document.createElement('p');
      p.style.cssText = 'margin:8px 0 0;font-size:13px;';
      p.textContent = 'Артефакт неполный. Заполните все поля перед портфолио.';
      box.appendChild(p);
    }
    return box;
  }

  /* ============================================================
     8 + 9. renderPractice и табличный редактор
     ============================================================ */
  var practiceUi = { selectedId: null, statusFilter: 'all', tagFilter: [], categoryFilter: null, rowSearch: '', rowStatusFilter: 'all' };
  var tableCursor = { row: 0, col: 0, editing: false };
  var MAX_ROWS = 200;

  function createPractice(templateId) {
    var tpl = null;
    for (var i = 0; i < PRACTICE_TEMPLATES.length; i++) if (PRACTICE_TEMPLATES[i].id === templateId) tpl = PRACTICE_TEMPLATES[i];
    if (!tpl) return null;
    var rec = {
      id: genId(), templateId: tpl.id, templateKind: tpl.templateKind, title: tpl.title,
      type: tpl.type, moduleId: null, topicId: null, fields: {}, rows: [],
      status: 'draft', createdAt: nowIso(), updatedAt: nowIso(),
      tags: [], category: null, inPortfolio: false
    };
    if (tpl.type === 'table') {
      var cols = TABLE_COLUMNS[tpl.templateKind] || ['Значение'];
      var row = cols.map(function (c) { return c === 'Статус' ? 'not-run' : ''; });
      rec.rows.push(row);
    }
    state.practice[rec.id] = rec;
    markDirty('practice', rec.id);
    saveState('practice');
    practiceUi.selectedId = rec.id;
    return rec;
  }

  function practiceToText(rec) {
    var lines = [];
    lines.push(rec.title || 'Артефакт');
    lines.push('Тип: ' + (rec.templateKind || rec.type));
    lines.push('Статус: ' + rec.status);
    lines.push('Модуль: ' + (rec.moduleId || '—') + ' / Тема: ' + (rec.topicId || '—'));
    lines.push('');
    if (rec.type === 'text') {
      var schema = TEXT_FIELD_SCHEMAS[rec.templateKind] || [];
      schema.forEach(function (f) {
        lines.push(f.label + ': ' + (rec.fields[f.name] || '—'));
      });
    } else {
      var cols = TABLE_COLUMNS[rec.templateKind] || [];
      lines.push(cols.join(' | '));
      (rec.rows || []).forEach(function (r) { lines.push(r.join(' | ')); });
    }
    return lines.join('\n');
  }
  function practiceToMarkdown(rec) {
    var lines = [];
    lines.push('# ' + (rec.title || 'Артефакт'));
    lines.push('');
    lines.push('**Тип:** ' + (rec.templateKind || rec.type));
    lines.push('**Статус:** ' + rec.status);
    lines.push('**Модуль/тема:** ' + (rec.moduleId || '—') + ' / ' + (rec.topicId || '—'));
    lines.push('');
    if (rec.type === 'text') {
      var schema = TEXT_FIELD_SCHEMAS[rec.templateKind] || [];
      schema.forEach(function (f) {
        lines.push('## ' + f.label);
        lines.push(rec.fields[f.name] || '—');
        lines.push('');
      });
    } else {
      var cols = TABLE_COLUMNS[rec.templateKind] || [];
      lines.push('| ' + cols.join(' | ') + ' |');
      lines.push('|' + cols.map(function () { return '---'; }).join('|') + '|');
      (rec.rows || []).forEach(function (r) { lines.push('| ' + r.join(' | ') + ' |'); });
    }
    return lines.join('\n');
  }

  function renderPractice() {
    var all = toArray(state.practice);
    var frag = document.createDocumentFragment();
    var modules = (window.CourseData && Array.isArray(window.CourseData.modules)) ? window.CourseData.modules : [];

    var wrap = document.createElement('div');
    var tplButtons = PRACTICE_TEMPLATES.map(function (t) {
      return '<button type="button" data-tpl="' + esc(t.id) + '" class="btn" style="min-height:44px;text-align:left;padding:8px 10px;">' + esc(t.title) + '</button>';
    }).join('');
    var head =
      '<h2 style="margin:0 0 12px;">Практика</h2>' +
      '<details class="card" style="padding:12px;margin-bottom:12px;"' + (all.length ? '' : ' open') + '>' +
      '<summary style="cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;">Создать артефакт из шаблона</summary>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:8px;">' + tplButtons + '</div>' +
      '</details>';

    if (!all.length) {
      wrap.innerHTML = head + App.renderEmptyState(
        'Баг-репортов нет',
        'Выберите модуль «Тестирование веб-форм» и создайте первый артефакт: чек-лист, тест-кейс или баг-репорт.',
        'Открыть курс', 'course'
      );
      frag.appendChild(wrap);
      setMain(frag);
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tpl]');
        if (!b) return;
        createPractice(b.getAttribute('data-tpl'));
        renderPractice();
      });
      return;
    }

    var list = all.slice();
    if (practiceUi.statusFilter !== 'all') list = list.filter(function (p) { return p.status === practiceUi.statusFilter; });
    if (practiceUi.tagFilter.length && App.TagsManager) list = App.TagsManager.filter(list, practiceUi.tagFilter);
    if (practiceUi.categoryFilter) list = list.filter(function (p) { return p.category === practiceUi.categoryFilter; });
    list.sort(function (a, b) { return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); });

    if (!practiceUi.selectedId || !state.practice[practiceUi.selectedId]) {
      practiceUi.selectedId = list.length ? list[0].id : all[0].id;
    }
    var current = state.practice[practiceUi.selectedId];

    var flatCats = (App.CategoriesManager && typeof App.CategoriesManager.getFlat === 'function') ? App.CategoriesManager.getFlat() : [];
    var layout = document.createElement('div');
    layout.style.cssText = 'display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:16px;align-items:start;';

    var left = document.createElement('div');
    left.className = 'card';
    left.style.padding = '12px';
    left.innerHTML =
      '<label>Статус<select data-pf="status" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      '<option value="all"' + (practiceUi.statusFilter === 'all' ? ' selected' : '') + '>Все</option>' +
      '<option value="draft"' + (practiceUi.statusFilter === 'draft' ? ' selected' : '') + '>Черновик</option>' +
      '<option value="ready"' + (practiceUi.statusFilter === 'ready' ? ' selected' : '') + '>Готов</option>' +
      '</select></label>' +
      '<label style="display:block;margin-top:8px;">Категория<select data-pf="category" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      '<option value="">Все</option>' + flatCats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (practiceUi.categoryFilter === c.id ? ' selected' : '') + '>' + esc(c.path) + '</option>'; }).join('') +
      '</select></label>' +
      '<ul data-role="practice-items" style="list-style:none;padding:0;margin:12px 0 0;display:grid;gap:6px;max-height:520px;overflow:auto;"></ul>';
    var pul = left.querySelector('[data-role="practice-items"]');
    list.forEach(function (p) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-psel', p.id);
      b.setAttribute('aria-current', p.id === practiceUi.selectedId ? 'true' : 'false');
      b.style.cssText = 'width:100%;text-align:left;min-height:44px;padding:8px;border:1px solid ' + (p.id === practiceUi.selectedId ? '#D4AF37' : '#E8E0D0') + ';background:' + (p.id === practiceUi.selectedId ? 'rgba(212,175,55,.12)' : '#fff') + ';cursor:pointer;';
      var t1 = document.createElement('span');
      t1.style.cssText = 'display:block;font-weight:600;font-size:13px;';
      t1.textContent = p.title || 'Без названия';
      var t2 = document.createElement('span');
      t2.style.cssText = 'display:block;font-size:11px;opacity:0.65;';
      t2.textContent = (p.templateKind || p.type) + ' · ' + (p.status === 'ready' ? 'Готов' : 'Черновик');
      b.appendChild(t1);
      b.appendChild(t2);
      li.appendChild(b);
      pul.appendChild(li);
    });

    var right = document.createElement('div');
    right.className = 'card';
    right.style.padding = '12px';
    var topicOptions = '<option value="">— тема —</option>';
    modules.forEach(function (m) {
      if (!current.moduleId || current.moduleId === m.id) {
        (m.topics || []).forEach(function (t) {
          topicOptions += '<option value="' + esc(t.id) + '"' + (current.topicId === t.id ? ' selected' : '') + '>' + esc(t.title) + '</option>';
        });
      }
    });
    right.innerHTML =
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center;">' +
      '<h3 style="margin:0;font-size:16px;">' + esc(current.title || 'Артефакт') + '</h3>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      '<button type="button" data-pact="duplicate" class="btn" style="min-height:44px;">Дублировать</button>' +
      '<button type="button" data-pact="txt" class="btn" style="min-height:44px;">TXT</button>' +
      '<button type="button" data-pact="md" class="btn" style="min-height:44px;">MD</button>' +
      '<button type="button" data-pact="copy" class="btn" style="min-height:44px;">Копировать</button>' +
      '<button type="button" data-pact="portfolio" class="btn btn--primary" style="min-height:44px;"' + (current.inPortfolio ? ' disabled' : '') + '>' + (current.inPortfolio ? 'В портфолио' : 'Добавить в портфолио') + '</button>' +
      '<button type="button" data-pact="delete" class="btn btn--danger" style="min-height:44px;">Удалить</button>' +
      '</div></div>' +
      '<label style="display:block;margin-top:12px;">Название<input data-pfield="title" type="text" maxlength="200" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-top:8px;">' +
      '<label>Модуль<select data-pfield="moduleId" required style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="">— модуль —</option>' +
      modules.map(function (m) { return '<option value="' + esc(m.id) + '"' + (current.moduleId === m.id ? ' selected' : '') + '>' + esc(m.title) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Тема<select data-pfield="topicId" required style="width:100%;min-height:44px;border:1px solid #D4AF37;">' + topicOptions + '</select></label>' +
      '<label>Статус<select data-pfield="status" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      '<option value="draft"' + (current.status === 'draft' ? ' selected' : '') + '>Черновик</option>' +
      '<option value="ready"' + (current.status === 'ready' ? ' selected' : '') + '>Готов</option>' +
      '</select></label>' +
      '<label>Категория<select data-pfield="category" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="">—</option>' +
      flatCats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (current.category === c.id ? ' selected' : '') + '>' + esc(c.path) + '</option>'; }).join('') +
      '</select></label>' +
      '</div>' +
      '<div data-role="practice-body" style="margin-top:12px;"></div>' +
      '<div data-role="quality-host"></div>';

    layout.appendChild(left);
    layout.appendChild(right);
    wrap.innerHTML = head;
    wrap.appendChild(layout);
    frag.appendChild(wrap);
    setMain(frag);

    right.querySelector('[data-pfield="title"]').value = current.title || '';

    var bodyHost = right.querySelector('[data-role="practice-body"]');
    var qualityHost = right.querySelector('[data-role="quality-host"]');

    var savePractice = debounce(function () {
      var rec = state.practice[practiceUi.selectedId];
      if (!rec) return;
      rec.title = right.querySelector('[data-pfield="title"]').value.slice(0, 200);
      rec.moduleId = right.querySelector('[data-pfield="moduleId"]').value || null;
      rec.topicId = right.querySelector('[data-pfield="topicId"]').value || null;
      rec.status = right.querySelector('[data-pfield="status"]').value;
      rec.category = right.querySelector('[data-pfield="category"]').value || null;
      rec.updatedAt = nowIso();
      markDirty('practice', rec.id);
      saveState('practice');
      qualityHost.replaceChildren(renderQualityBlock(rec));
    }, 300);

    if (current.type === 'text') {
      buildTextForm(bodyHost, current, savePractice);
    } else {
      buildTableEditor(bodyHost, current, savePractice);
    }
    qualityHost.replaceChildren(renderQualityBlock(current));

    wrap.addEventListener('click', function (e) {
      var tplBtn = e.target.closest('[data-tpl]');
      if (tplBtn) { createPractice(tplBtn.getAttribute('data-tpl')); renderPractice(); return; }
      var selBtn = e.target.closest('[data-psel]');
      if (selBtn) { practiceUi.selectedId = selBtn.getAttribute('data-psel'); tableCursor = { row: 0, col: 0, editing: false }; renderPractice(); return; }
    });
    left.addEventListener('change', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-pf');
      if (!f) return;
      if (f === 'status') practiceUi.statusFilter = e.target.value;
      else if (f === 'category') practiceUi.categoryFilter = e.target.value || null;
      renderPractice();
    });
    right.addEventListener('input', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-pfield')) savePractice();
    });
    right.addEventListener('change', function (e) {
      var pf = e.target.getAttribute && e.target.getAttribute('data-pfield');
      if (!pf) return;
      savePractice();
      if (pf === 'moduleId') renderPractice();
    });
    right.addEventListener('click', function (e) {
      var act = e.target.closest('[data-pact]');
      if (!act) return;
      var rec = state.practice[practiceUi.selectedId];
      if (!rec) return;
      var a = act.getAttribute('data-pact');
      if (a === 'duplicate') {
        var copy = JSON.parse(JSON.stringify(rec));
        copy.id = genId();
        copy.title = (rec.title || 'Артефакт') + ' — копия';
        copy.createdAt = nowIso();
        copy.updatedAt = nowIso();
        copy.inPortfolio = false;
        state.practice[copy.id] = copy;
        markDirty('practice', copy.id);
        saveState('practice');
        practiceUi.selectedId = copy.id;
        toast('Артефакт дублирован', 'success');
        renderPractice();
      } else if (a === 'txt') {
        downloadFile('practice-' + rec.id + '.txt', 'text/plain;charset=utf-8', practiceToText(rec));
      } else if (a === 'md') {
        downloadFile('practice-' + rec.id + '.md', 'text/markdown;charset=utf-8', practiceToMarkdown(rec));
      } else if (a === 'copy') {
        copyText(practiceToText(rec));
      } else if (a === 'portfolio') {
        addPracticeToPortfolio(rec);
      } else if (a === 'delete') {
        App.confirm('Удалить артефакт «' + (rec.title || 'Без названия') + '»?', 'Удалить').then(function (ok) {
          if (!ok) return;
          var snap = JSON.parse(JSON.stringify(rec));
          delete state.practice[rec.id];
          window.IDB.delete('practice', rec.id).catch(function () {});
          App.dirtyByScope.practice.delete(rec.id);
          saveState('practice');
          state.portfolio.forEach(function (p) {
            if (p.sourceId === rec.id) { p.sourceDeleted = true; }
          });
          saveState('portfolio');
          pushUndo('practice', snap);
          practiceUi.selectedId = null;
          toast('Артефакт удалён', 'danger', { label: 'Отменить', onClick: function () { App.undoLast(); } });
          renderPractice();
        });
      }
    });
  }

  function addPracticeToPortfolio(rec) {
    var quality = checkQuality(rec);
    function push() {
      var entry = {
        id: genId(), type: rec.templateKind || 'practice', sourceId: rec.id, sourceDeleted: false,
        title: rec.title || 'Артефакт', description: practiceToText(rec).slice(0, 1000),
        task: (rec.fields && rec.fields.title) ? rec.fields.title : (rec.title || ''),
        solution: (rec.fields && rec.fields.steps) ? rec.fields.steps : '',
        tools: [], skills: [], link: '', moduleId: rec.moduleId || null, topicId: rec.topicId || null,
        date: nowIso(), status: 'draft', visibility: 'private', presentationReady: false,
        tags: (rec.tags || []).slice(), category: rec.category || null
      };
      state.portfolio.push(entry);
      window.IDB.put('portfolio', entry).catch(function () {});
      saveState('portfolio');
      rec.inPortfolio = true;
      rec.updatedAt = nowIso();
      markDirty('practice', rec.id);
      saveState('practice');
      toast('Добавлено в портфолио', 'success');
      renderPractice();
    }
    if (!quality.ok && quality.items.length) {
      App.confirm('Артефакт неполный. Добавить?', 'Добавить').then(function (ok) { if (ok) push(); });
    } else {
      push();
    }
  }

  function buildTextForm(host, rec, onSave) {
    var schema = TEXT_FIELD_SCHEMAS[rec.templateKind] || [{ name: 'content', label: 'Содержание', type: 'textarea', maxLength: 5000 }];
    if (typeof Forms !== 'undefined' && typeof Forms.FormManager === 'function') {
      try {
        var fm = Forms.FormManager(host, schema, {
          onChange: function (values) {
            rec.fields = values;
            onSave();
          },
          onSubmit: function (values) {
            rec.fields = values;
            onSave();
          }
        });
        if (fm && typeof fm.setValues === 'function') fm.setValues(rec.fields || {});
        schema.forEach(function (f) {
          if (HINT_BY_FIELD[f.name]) {
            var inputEl = host.querySelector('[name="' + f.name + '"]');
            if (inputEl) attachFieldHint(inputEl, f.name);
          }
        });
        return fm;
      } catch (e) {}
    }
    var form = document.createElement('div');
    form.style.cssText = 'display:grid;gap:10px;';
    schema.forEach(function (f) {
      var label = document.createElement('label');
      label.style.display = 'block';
      label.textContent = f.label;
      var input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
        input.style.cssText = 'width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;word-break:break-word;';
      } else if (f.type === 'select') {
        input = document.createElement('select');
        input.style.cssText = 'width:100%;min-height:44px;border:1px solid #D4AF37;';
        (f.options || []).forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o;
          opt.textContent = o;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type === 'number' ? 'number' : 'text';
        input.style.cssText = 'width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;';
      }
      input.name = f.name;
      if (f.maxLength) input.maxLength = f.maxLength;
      input.value = (rec.fields && rec.fields[f.name] !== undefined) ? rec.fields[f.name] : '';
      input.addEventListener('input', function () {
        if (!rec.fields) rec.fields = {};
        rec.fields[f.name] = input.value;
        onSave();
      });
      input.addEventListener('change', function () {
        if (!rec.fields) rec.fields = {};
        rec.fields[f.name] = input.value;
        onSave();
      });
      label.appendChild(input);
      form.appendChild(label);
      if (HINT_BY_FIELD[f.name]) attachFieldHint(input, f.name);
    });
    host.replaceChildren(form);
    return null;
  }

  function buildTableEditor(host, rec, onSave) {
    var cols = TABLE_COLUMNS[rec.templateKind] || ['Значение'];
    var statusCol = cols.indexOf('Статус');
    var container = document.createElement('div');

    var toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;align-items:flex-end;';
    toolbar.innerHTML =
      '<button type="button" data-tact="add" class="btn btn--primary" style="min-height:44px;">Добавить строку</button>' +
      '<button type="button" data-tact="dup" class="btn" style="min-height:44px;">Дублировать</button>' +
      '<button type="button" data-tact="del" class="btn btn--danger" style="min-height:44px;">Удалить</button>' +
      '<button type="button" data-tact="up" class="btn" style="min-height:44px;" aria-label="Переместить строку вверх">↑</button>' +
      '<button type="button" data-tact="down" class="btn" style="min-height:44px;" aria-label="Переместить строку вниз">↓</button>' +
      '<label>Поиск<input data-tsearch type="search" style="min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      (statusCol !== -1 ? '<label>Статус<select data-tstatus style="min-height:44px;border:1px solid #D4AF37;"><option value="all">Все</option>' +
        ROW_STATUSES.map(function (s) { return '<option value="' + s + '">' + esc(ROW_STATUS_LABELS[s]) + '</option>'; }).join('') + '</select></label>' : '') +
      '<span data-trows style="font-size:12px;opacity:0.7;"></span>';
    container.appendChild(toolbar);

    var grid = document.createElement('div');
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Табличный редактор ' + (rec.title || ''));
    grid.tabIndex = 0;
    grid.style.cssText = 'border:1px solid #D4AF37;overflow:auto;max-height:480px;outline-offset:2px;';
    container.appendChild(grid);
    host.replaceChildren(container);

    var searchInput = toolbar.querySelector('[data-tsearch]');
    var statusSelect = toolbar.querySelector('[data-tstatus]');
    var rowsInfo = toolbar.querySelector('[data-trows]');
    searchInput.value = practiceUi.rowSearch;
    if (statusSelect) statusSelect.value = practiceUi.rowStatusFilter;

    function visibleIndexes() {
      var out = [];
      var q = practiceUi.rowSearch.toLowerCase();
      (rec.rows || []).forEach(function (r, i) {
        if (q && r.join(' ').toLowerCase().indexOf(q) === -1) return;
        if (statusCol !== -1 && practiceUi.rowStatusFilter !== 'all' && r[statusCol] !== practiceUi.rowStatusFilter) return;
        out.push(i);
      });
      return out;
    }

    function paint() {
      var vis = visibleIndexes();
      rowsInfo.textContent = 'Строк: ' + (rec.rows || []).length + ' из ' + MAX_ROWS + ', показано ' + vis.length;
      var table = document.createElement('div');
      table.style.cssText = 'display:table;width:100%;border-collapse:collapse;';
      var headRow = document.createElement('div');
      headRow.setAttribute('role', 'row');
      headRow.style.cssText = 'display:table-row;background:#0A1929;color:#F5F0E8;';
      cols.forEach(function (c) {
        var th = document.createElement('div');
        th.setAttribute('role', 'columnheader');
        th.style.cssText = 'display:table-cell;padding:8px;font-size:12px;font-weight:600;border:1px solid #D4AF37;';
        th.textContent = c;
        headRow.appendChild(th);
      });
      table.appendChild(headRow);

      if (!vis.length) {
        var emptyRow = document.createElement('div');
        emptyRow.setAttribute('role', 'row');
        emptyRow.style.cssText = 'display:table-row;';
        var td0 = document.createElement('div');
        td0.setAttribute('role', 'gridcell');
        td0.style.cssText = 'display:table-cell;padding:12px;font-size:13px;opacity:0.65;border:1px solid #E8E0D0;';
        td0.setAttribute('colspan', String(cols.length));
        td0.textContent = 'Строк по фильтру нет';
        emptyRow.appendChild(td0);
        table.appendChild(emptyRow);
      }

      vis.forEach(function (realIdx, visIdx) {
        var r = rec.rows[realIdx];
        var tr = document.createElement('div');
        tr.setAttribute('role', 'row');
        tr.setAttribute('data-row', String(realIdx));
        tr.style.cssText = 'display:table-row;background:' + (visIdx % 2 ? 'rgba(212,175,55,.04)' : '#fff') + ';';
        cols.forEach(function (colName, ci) {
          var td = document.createElement('div');
          td.setAttribute('role', 'gridcell');
          td.setAttribute('data-col', String(ci));
          td.setAttribute('data-rowindex', String(realIdx));
          td.tabIndex = -1;
          var isActive = tableCursor.row === realIdx && tableCursor.col === ci;
          td.setAttribute('aria-selected', isActive ? 'true' : 'false');
          td.style.cssText = 'display:table-cell;padding:6px;border:1px solid #E8E0D0;font-size:13px;vertical-align:top;' +
            (isActive ? 'outline:2px solid #D4AF37;outline-offset:-2px;' : '');
          if (isActive) td.classList.add('cell-active');
          if (colName === 'Статус') {
            var sel = document.createElement('select');
            sel.style.cssText = 'width:100%;min-height:36px;border:1px solid #D4AF37;';
            ROW_STATUSES.forEach(function (s) {
              var o = document.createElement('option');
              o.value = s;
              o.textContent = ROW_STATUS_LABELS[s];
              sel.appendChild(o);
            });
            sel.value = ROW_STATUSES.indexOf(r[ci]) !== -1 ? r[ci] : 'not-run';
            sel.addEventListener('change', function () {
              r[ci] = sel.value;
              rec.updatedAt = nowIso();
              onSave();
            });
            td.appendChild(sel);
          } else if (isActive && tableCursor.editing) {
            var inp = document.createElement('input');
            inp.type = 'text';
            inp.value = r[ci] || '';
            inp.style.cssText = 'width:100%;min-height:36px;padding:0 6px;border:1px solid #D4AF37;';
            inp.addEventListener('keydown', function (e) {
              if (e.key === 'Enter') { r[ci] = inp.value; tableCursor.editing = false; rec.updatedAt = nowIso(); onSave(); paint(); focusActive(); }
              else if (e.key === 'Escape') { e.stopPropagation(); tableCursor.editing = false; paint(); focusActive(); }
            });
            inp.addEventListener('blur', function () { r[ci] = inp.value; rec.updatedAt = nowIso(); onSave(); });
            td.appendChild(inp);
            setTimeout(function () { try { inp.focus(); inp.select(); } catch (e) {} }, 0);
          } else {
            td.textContent = r[ci] || '';
          }
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });
      grid.replaceChildren(table);
    }

    function focusActive() {
      var cell = grid.querySelector('[data-rowindex="' + tableCursor.row + '"][data-col="' + tableCursor.col + '"]');
      if (cell) {
        try { cell.focus(); } catch (e) {}
        if (typeof cell.scrollIntoView === 'function') cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } else {
        try { grid.focus(); } catch (e) {}
      }
    }

    function addRow(afterIdx) {
      if ((rec.rows || []).length >= MAX_ROWS) { toast('Лимит ' + MAX_ROWS + ' строк', 'warning'); return; }
      var row = cols.map(function (c) { return c === 'Статус' ? 'not-run' : ''; });
      var at = (afterIdx === undefined || afterIdx === null) ? rec.rows.length : afterIdx + 1;
      rec.rows.splice(at, 0, row);
      tableCursor.row = at;
      tableCursor.col = 0;
      tableCursor.editing = false;
      rec.updatedAt = nowIso();
      onSave();
      paint();
      focusActive();
    }
    function duplicateRow(idx) {
      if (!rec.rows[idx]) return;
      if (rec.rows.length >= MAX_ROWS) { toast('Лимит ' + MAX_ROWS + ' строк', 'warning'); return; }
      rec.rows.splice(idx + 1, 0, rec.rows[idx].slice());
      tableCursor.row = idx + 1;
      rec.updatedAt = nowIso();
      onSave();
      paint();
      focusActive();
    }
    function deleteRow(idx) {
      if (!rec.rows[idx]) return;
      rec.rows.splice(idx, 1);
      if (tableCursor.row >= rec.rows.length) tableCursor.row = Math.max(0, rec.rows.length - 1);
      rec.updatedAt = nowIso();
      onSave();
      paint();
      focusActive();
    }
    function moveRow(idx, delta) {
      var to = idx + delta;
      if (to < 0 || to >= rec.rows.length) return;
      var tmp = rec.rows[idx];
      rec.rows[idx] = rec.rows[to];
      rec.rows[to] = tmp;
      tableCursor.row = to;
      rec.updatedAt = nowIso();
      onSave();
      paint();
      focusActive();
    }

    toolbar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tact]');
      if (!b) return;
      var a = b.getAttribute('data-tact');
      if (a === 'add') addRow(tableCursor.row);
      else if (a === 'dup') duplicateRow(tableCursor.row);
      else if (a === 'del') deleteRow(tableCursor.row);
      else if (a === 'up') moveRow(tableCursor.row, -1);
      else if (a === 'down') moveRow(tableCursor.row, 1);
    });
    searchInput.addEventListener('input', debounce(function () {
      practiceUi.rowSearch = searchInput.value;
      paint();
    }, 200));
    if (statusSelect) statusSelect.addEventListener('change', function () {
      practiceUi.rowStatusFilter = statusSelect.value;
      paint();
    });

    grid.addEventListener('click', function (e) {
      var cell = e.target.closest('[data-rowindex]');
      if (!cell) return;
      tableCursor.row = Number(cell.getAttribute('data-rowindex'));
      tableCursor.col = Number(cell.getAttribute('data-col'));
      tableCursor.editing = false;
      paint();
      focusActive();
    });

    grid.addEventListener('keydown', function (e) {
      if (e.target && e.target.tagName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      if (e.key === 'Escape') {
        if (modalStack.length) return;
        if (tableCursor.editing) { e.preventDefault(); tableCursor.editing = false; paint(); focusActive(); return; }
        return;
      }
      if (tableCursor.editing) return;
      var maxRow = Math.max(0, (rec.rows || []).length - 1);
      if (e.key === 'ArrowDown') {
        if (e.ctrlKey) { e.preventDefault(); moveRow(tableCursor.row, 1); return; }
        e.preventDefault();
        tableCursor.row = Math.min(maxRow, tableCursor.row + 1);
        paint(); focusActive();
      } else if (e.key === 'ArrowUp') {
        if (e.ctrlKey) { e.preventDefault(); moveRow(tableCursor.row, -1); return; }
        e.preventDefault();
        tableCursor.row = Math.max(0, tableCursor.row - 1);
        paint(); focusActive();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (tableCursor.col > 0) tableCursor.col--;
          else if (tableCursor.row > 0) { tableCursor.row--; tableCursor.col = cols.length - 1; }
        } else {
          if (tableCursor.col < cols.length - 1) tableCursor.col++;
          else if (tableCursor.row < maxRow) { tableCursor.row++; tableCursor.col = 0; }
        }
        paint(); focusActive();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (cols[tableCursor.col] === 'Статус') return;
        tableCursor.editing = true;
        paint();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        deleteRow(tableCursor.row);
      } else if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateRow(tableCursor.row);
      }
    });

    paint();
    if (!state.ui.tableHintSeen) {
      App.openModal('table-hint', { title: 'Работа с таблицей' });
    }
  }

  /* ============================================================
     12. renderPortfolio и renderPresentation
     ============================================================ */
  var portfolioUi = { statusFilter: 'all', typeFilter: 'all', tagFilter: [], categoryFilter: null, visibilityFilter: 'all', readyOnly: false, selectedId: null };

  function portfolioToMarkdown(items) {
    var lines = ['# Портфолио QA-инженера', ''];
    items.forEach(function (p) {
      lines.push('## ' + (p.title || 'Без названия'));
      lines.push('**Тип:** ' + (p.type || '—'));
      lines.push('**Статус:** ' + (PORTFOLIO_STATUS_LABELS[p.status] || p.status));
      if (p.task) lines.push('**Задача:** ' + p.task);
      if (p.solution) lines.push('**Решение:** ' + p.solution);
      if (p.tools && p.tools.length) lines.push('**Инструменты:** ' + p.tools.join(', '));
      if (p.skills && p.skills.length) lines.push('**Навыки:** ' + p.skills.join(', '));
      if (p.link) lines.push('**Ссылка:** ' + p.link);
      lines.push('**Дата:** ' + fmtDate(p.date));
      lines.push('');
      lines.push('---');
      lines.push('');
    });
    return lines.join('\n');
  }

  function renderPortfolio() {
    var all = state.portfolio || [];
    var frag = document.createDocumentFragment();
    if (!all.length) {
      var w0 = document.createElement('div');
      w0.innerHTML = App.renderEmptyState(
        'Портфолио пусто',
        'Выполните чек-лист модуля 7 и добавьте готовый артефакт из раздела Практика.',
        'Открыть практику', 'practice'
      );
      frag.appendChild(w0);
      setMain(frag);
      return;
    }
    var list = all.slice();
    if (portfolioUi.statusFilter !== 'all') list = list.filter(function (p) { return p.status === portfolioUi.statusFilter; });
    if (portfolioUi.typeFilter !== 'all') list = list.filter(function (p) { return p.type === portfolioUi.typeFilter; });
    if (portfolioUi.visibilityFilter !== 'all') list = list.filter(function (p) { return (p.visibility || 'private') === portfolioUi.visibilityFilter; });
    if (portfolioUi.readyOnly) list = list.filter(function (p) { return p.presentationReady === true; });
    if (portfolioUi.tagFilter.length && App.TagsManager) list = App.TagsManager.filter(list, portfolioUi.tagFilter);
    if (portfolioUi.categoryFilter) list = list.filter(function (p) { return p.category === portfolioUi.categoryFilter; });

    var types = {};
    all.forEach(function (p) { if (p.type) types[p.type] = true; });
    var flatCats = (App.CategoriesManager && typeof App.CategoriesManager.getFlat === 'function') ? App.CategoriesManager.getFlat() : [];

    var wrap = document.createElement('div');
    if (state.ui.portfolioPreview) wrap.classList.add('portfolio-preview');
    wrap.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">' +
      '<h2 style="margin:0;">Портфолио (' + all.length + ')</h2>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      '<button type="button" data-fact="preview" class="btn" aria-pressed="' + (state.ui.portfolioPreview ? 'true' : 'false') + '" style="min-height:44px;">' + (state.ui.portfolioPreview ? 'Выйти из предпросмотра' : 'Предпросмотр') + '</button>' +
      '<button type="button" data-fact="md" class="btn" style="min-height:44px;">Экспорт Markdown</button>' +
      '<a href="#portfolio/presentation" class="btn btn--primary" style="min-height:44px;display:inline-flex;align-items:center;padding:0 14px;text-decoration:none;">Режим презентации</a>' +
      '</div></div>' +
      '<div class="card" style="padding:12px;margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;">' +
      '<label>Статус<select data-ff="status" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="all">Все</option>' +
      PORTFOLIO_STATUS.map(function (s) { return '<option value="' + s + '"' + (portfolioUi.statusFilter === s ? ' selected' : '') + '>' + esc(PORTFOLIO_STATUS_LABELS[s]) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Тип<select data-ff="type" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="all">Все</option>' +
      Object.keys(types).map(function (t) { return '<option value="' + esc(t) + '"' + (portfolioUi.typeFilter === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Видимость<select data-ff="visibility" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="all">Все</option>' +
      '<option value="private"' + (portfolioUi.visibilityFilter === 'private' ? ' selected' : '') + '>Приватно</option>' +
      '<option value="shareable"' + (portfolioUi.visibilityFilter === 'shareable' ? ' selected' : '') + '>Можно делиться</option></select></label>' +
      '<label>Категория<select data-ff="category" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="">Все</option>' +
      flatCats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (portfolioUi.categoryFilter === c.id ? ' selected' : '') + '>' + esc(c.path) + '</option>'; }).join('') +
      '</select></label>' +
      '<label style="display:flex;align-items:center;gap:8px;min-height:44px;"><input type="checkbox" data-ff="ready"' + (portfolioUi.readyOnly ? ' checked' : '') + '> Только для презентации</label>' +
      '</div>' +
      '<div data-role="pf-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:12px;"></div>';

    var host = wrap.querySelector('[data-role="pf-list"]');
    if (!list.length) host.innerHTML = App.renderEmptyState('Под фильтр ничего не подошло', 'Смените фильтры статуса или типа.', null, null);
    list.forEach(function (p) {
      var card = document.createElement('article');
      card.className = 'card' + (p.sourceDeleted ? ' source-deleted' : '');
      card.style.cssText = 'padding:12px;border:2px solid #D4AF37;' + (p.sourceDeleted ? 'opacity:0.75;' : '');
      var tagNames = (p.tags || []).map(function (tid) {
        var t = findById(state.tags, tid);
        return t ? t.name : tid;
      });
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
        '<h3 style="margin:0;font-size:15px;">' + esc(p.title || 'Без названия') + '</h3>' +
        '<span style="font-size:11px;padding:3px 6px;background:#0A1929;color:#D4AF37;white-space:nowrap;">' + esc(PORTFOLIO_STATUS_LABELS[p.status] || p.status) + '</span>' +
        '</div>' +
        '<div style="font-size:11px;opacity:0.65;margin-top:4px;">' + esc(p.type || '—') + ' · ' + esc(fmtDate(p.date)) + (p.sourceDeleted ? ' · источник удалён' : '') + '</div>' +
        (p.task ? '<p style="font-size:13px;margin:8px 0 0;"><strong>Задача:</strong> ' + esc(String(p.task).slice(0, 200)) + '</p>' : '') +
        (p.solution ? '<p style="font-size:13px;margin:4px 0 0;"><strong>Решение:</strong> ' + esc(String(p.solution).slice(0, 200)) + '</p>' : '') +
        (p.link ? '<p style="font-size:12px;margin:4px 0 0;word-break:break-all;">Ссылка: ' + esc(p.link) + '</p>' : '') +
        (tagNames.length ? '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">' + tagNames.map(function (n) { return '<span style="font-size:11px;padding:3px 6px;background:#0A1929;color:#D4AF37;">' + esc(n) + '</span>'; }).join('') + '</div>' : '') +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">' +
        '<button type="button" data-pfedit="' + esc(p.id) + '" class="btn" style="min-height:44px;">Изменить</button>' +
        '<button type="button" data-pfready="' + esc(p.id) + '" class="btn" aria-pressed="' + (p.presentationReady ? 'true' : 'false') + '" style="min-height:44px;">' + (p.presentationReady ? 'В презентации' : 'Для презентации') + '</button>' +
        '<button type="button" data-pfdel="' + esc(p.id) + '" class="btn btn--danger" style="min-height:44px;">Удалить</button>' +
        '</div>';
      host.appendChild(card);
    });

    frag.appendChild(wrap);
    setMain(frag);

    wrap.addEventListener('change', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-ff');
      if (!f) return;
      if (f === 'status') portfolioUi.statusFilter = e.target.value;
      else if (f === 'type') portfolioUi.typeFilter = e.target.value;
      else if (f === 'visibility') portfolioUi.visibilityFilter = e.target.value;
      else if (f === 'category') portfolioUi.categoryFilter = e.target.value || null;
      else if (f === 'ready') portfolioUi.readyOnly = e.target.checked;
      renderPortfolio();
    });
    wrap.addEventListener('click', function (e) {
      var act = e.target.closest('[data-fact]');
      if (act) {
        var a = act.getAttribute('data-fact');
        if (a === 'preview') {
          state.ui.portfolioPreview = !state.ui.portfolioPreview;
          saveState('ui');
          renderPortfolio();
        } else if (a === 'md') {
          downloadFile('qa-portfolio.md', 'text/markdown;charset=utf-8', portfolioToMarkdown(list));
          toast('Портфолио экспортировано', 'success');
        }
        return;
      }
      var editBtn = e.target.closest('[data-pfedit]');
      if (editBtn) { openPortfolioEditor(editBtn.getAttribute('data-pfedit')); return; }
      var readyBtn = e.target.closest('[data-pfready]');
      if (readyBtn) {
        var rid = readyBtn.getAttribute('data-pfready');
        var rec = findById(state.portfolio, rid);
        if (!rec) return;
        rec.presentationReady = !rec.presentationReady;
        saveState('portfolio');
        renderPortfolio();
        return;
      }
      var delBtn = e.target.closest('[data-pfdel]');
      if (delBtn) {
        var did = delBtn.getAttribute('data-pfdel');
        var target = findById(state.portfolio, did);
        if (!target) return;
        App.confirm('Удалить элемент портфолио «' + (target.title || 'Без названия') + '»?', 'Удалить').then(function (ok) {
          if (!ok) return;
          var snap = JSON.parse(JSON.stringify(target));
          state.portfolio = state.portfolio.filter(function (x) { return x.id !== did; });
          window.IDB.delete('portfolio', did).catch(function () {});
          saveState('portfolio');
          pushUndo('portfolio', snap);
          toast('Элемент удалён', 'danger', { label: 'Отменить', onClick: function () { App.undoLast(); } });
          renderPortfolio();
        });
      }
    });
  }

  function openPortfolioEditor(id) {
    var rec = findById(state.portfolio, id);
    if (!rec) return;
    App.openModal('portfolio-editor', {
      title: 'Элемент портфолио',
      build: function (body) {
        var flatCats = (App.CategoriesManager && typeof App.CategoriesManager.getFlat === 'function') ? App.CategoriesManager.getFlat() : [];
        body.innerHTML =
          '<label style="display:block;">Название<input data-pe="title" type="text" maxlength="200" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
          '<label style="display:block;margin-top:8px;">Описание<textarea data-pe="description" rows="3" maxlength="2000" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;"></textarea></label>' +
          '<label style="display:block;margin-top:8px;">Задача<textarea data-pe="task" rows="2" maxlength="1000" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;"></textarea></label>' +
          '<label style="display:block;margin-top:8px;">Решение<textarea data-pe="solution" rows="3" maxlength="2000" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;"></textarea></label>' +
          '<label style="display:block;margin-top:8px;">Инструменты, через запятую<input data-pe="tools" type="text" maxlength="300" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
          '<label style="display:block;margin-top:8px;">Навыки, через запятую<input data-pe="skills" type="text" maxlength="300" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
          '<label style="display:block;margin-top:8px;">Ссылка<input data-pe="link" type="url" maxlength="500" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px;">' +
          '<label>Статус<select data-pe="status" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
          PORTFOLIO_STATUS.map(function (s) { return '<option value="' + s + '">' + esc(PORTFOLIO_STATUS_LABELS[s]) + '</option>'; }).join('') + '</select></label>' +
          '<label>Видимость<select data-pe="visibility" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="private">Приватно</option><option value="shareable">Можно делиться</option></select></label>' +
          '<label>Категория<select data-pe="category" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="">—</option>' +
          flatCats.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.path) + '</option>'; }).join('') + '</select></label>' +
          '</div>' +
          '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;min-height:44px;"><input type="checkbox" data-pe="presentationReady"> Для презентации</label>' +
          '<div class="modal__actions" style="margin-top:12px;"><button type="button" data-pesave class="btn btn--primary" style="min-height:44px;">Сохранить</button></div>';
        body.querySelector('[data-pe="title"]').value = rec.title || '';
        body.querySelector('[data-pe="description"]').value = rec.description || '';
        body.querySelector('[data-pe="task"]').value = rec.task || '';
        body.querySelector('[data-pe="solution"]').value = rec.solution || '';
        body.querySelector('[data-pe="tools"]').value = (rec.tools || []).join(', ');
        body.querySelector('[data-pe="skills"]').value = (rec.skills || []).join(', ');
        body.querySelector('[data-pe="link"]').value = rec.link || '';
        body.querySelector('[data-pe="status"]').value = rec.status || 'draft';
        body.querySelector('[data-pe="visibility"]').value = rec.visibility || 'private';
        body.querySelector('[data-pe="category"]').value = rec.category || '';
        body.querySelector('[data-pe="presentationReady"]').checked = !!rec.presentationReady;
        body.querySelector('[data-pesave]').addEventListener('click', function () {
          rec.title = body.querySelector('[data-pe="title"]').value.slice(0, 200);
          rec.description = body.querySelector('[data-pe="description"]').value;
          rec.task = body.querySelector('[data-pe="task"]').value;
          rec.solution = body.querySelector('[data-pe="solution"]').value;
          rec.tools = body.querySelector('[data-pe="tools"]').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          rec.skills = body.querySelector('[data-pe="skills"]').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          rec.link = body.querySelector('[data-pe="link"]').value.trim();
          rec.status = body.querySelector('[data-pe="status"]').value;
          rec.visibility = body.querySelector('[data-pe="visibility"]').value;
          rec.category = body.querySelector('[data-pe="category"]').value || null;
          rec.presentationReady = body.querySelector('[data-pe="presentationReady"]').checked;
          saveState('portfolio');
          App.closeModal();
          toast('Сохранено', 'success');
          renderPortfolio();
        });
      }
    });
  }

  function renderPresentation() {
    var items = (state.portfolio || []).filter(function (p) {
      return p.presentationReady === true && p.status !== 'draft';
    });
    if (!items.length) {
      setMain(App.renderEmptyState(
        'Нет элементов для презентации',
        'Отметьте элементы флагом «для презентации» и переведите статус из черновика в «Готов» или «Опубликован».',
        'Открыть портфолио', 'portfolio'
      ));
      return;
    }
    if (App.PresentationManager && typeof App.PresentationManager.start === 'function') {
      App.PresentationManager.start();
      return;
    }
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    wrap.innerHTML = '<h2>Презентация портфолио</h2>' +
      '<div style="display:grid;gap:12px;">' + items.map(function (p) {
        return '<article class="card" style="padding:12px;border:2px solid #D4AF37;"><h3 style="margin:0 0 6px;">' + esc(p.title || '') + '</h3>' +
          '<div style="font-size:12px;opacity:0.7;">' + esc(p.type || '') + ' · ' + esc(fmtDate(p.date)) + '</div>' +
          (p.task ? '<p><strong>Задача:</strong> ' + esc(p.task) + '</p>' : '') +
          (p.solution ? '<p><strong>Решение:</strong> ' + esc(p.solution) + '</p>' : '') +
          '</article>';
      }).join('') + '</div>';
    frag.appendChild(wrap);
    setMain(frag);
  }

  /* ============================================================
     13. renderGlossary
     ============================================================ */
  var glossaryUi = { letter: 'all', search: '' };
  var RU_LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');
  var EN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  function allGlossary() {
    var base = [];
    if (window.CourseData && Array.isArray(window.CourseData.glossary)) {
      base = window.CourseData.glossary.map(function (g) {
        return { id: g.id, term: g.term || '', definition: g.definition || '', isUser: false };
      });
    }
    return base.concat((state.userGlossary || []).map(function (g) {
      return { id: g.id, term: g.term || '', definition: g.definition || '', isUser: true };
    }));
  }

  function renderGlossary() {
    var all = allGlossary();
    var frag = document.createDocumentFragment();
    var present = {};
    all.forEach(function (g) {
      var ch = String(g.term || '').trim().charAt(0).toUpperCase();
      if (ch) present[ch] = true;
    });
    var filtered = all.slice();
    if (glossaryUi.letter !== 'all') {
      filtered = filtered.filter(function (g) { return String(g.term || '').trim().charAt(0).toUpperCase() === glossaryUi.letter; });
    }
    if (glossaryUi.search) {
      var q = glossaryUi.search.toLowerCase();
      filtered = filtered.filter(function (g) {
        return (g.term || '').toLowerCase().indexOf(q) !== -1 || (g.definition || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    filtered.sort(function (a, b) { return String(a.term || '').localeCompare(String(b.term || ''), 'ru'); });

    var wrap = document.createElement('div');
    var lettersHtml = ['all'].concat(RU_LETTERS, EN_LETTERS).map(function (l) {
      var isAll = l === 'all';
      var disabled = !isAll && !present[l];
      var active = glossaryUi.letter === l;
      return '<button type="button" class="glossary-letter-btn" data-letter="' + esc(l) + '"' +
        (disabled ? ' disabled aria-disabled="true"' : '') +
        ' aria-pressed="' + (active ? 'true' : 'false') + '"' +
        ' style="min-width:44px;min-height:44px;border:1px solid ' + (active ? '#0A1929' : '#D4AF37') + ';background:' + (active ? '#D4AF37' : '#fff') + ';opacity:' + (disabled ? '0.4' : '1') + ';cursor:' + (disabled ? 'default' : 'pointer') + ';">' +
        (isAll ? 'Все' : esc(l)) + '</button>';
    }).join('');

    wrap.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">' +
      '<h2 style="margin:0;">Словарь (' + all.length + ')</h2>' +
      '<button type="button" data-gact="create" class="btn btn--primary" style="min-height:44px;">Добавить термин</button>' +
      '</div>' +
      '<label style="display:block;margin-top:12px;"><span class="visually-hidden">Поиск по словарю</span>' +
      '<input data-gsearch type="search" placeholder="Поиск термина" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:12px;">' + lettersHtml + '</div>' +
      '<div data-role="g-list" style="display:grid;gap:8px;margin-top:12px;"></div>';

    var host = wrap.querySelector('[data-role="g-list"]');
    if (!filtered.length) {
      host.innerHTML = App.renderEmptyState('Терминов не найдено', 'Смените букву или очистите поиск.', null, null);
    }
    filtered.forEach(function (g) {
      var card = document.createElement('div');
      card.className = 'card';
      card.style.padding = '12px';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
        '<strong style="font-size:14px;">' + esc(g.term) + '</strong>' +
        (g.isUser ? '<span style="font-size:11px;padding:3px 6px;background:#D4AF37;">свой</span>' : '') +
        '</div>' +
        '<p style="margin:6px 0 0;font-size:13px;">' + esc(g.definition) + '</p>' +
        (g.isUser ? '<div style="display:flex;gap:6px;margin-top:8px;">' +
          '<button type="button" data-gedit="' + esc(g.id) + '" class="btn" style="min-height:44px;">Изменить</button>' +
          '<button type="button" data-gdel="' + esc(g.id) + '" class="btn btn--danger" style="min-height:44px;">Удалить</button></div>' : '');
      host.appendChild(card);
    });

    frag.appendChild(wrap);
    setMain(frag);

    var gs = wrap.querySelector('[data-gsearch]');
    gs.value = glossaryUi.search;
    gs.addEventListener('input', debounce(function () { glossaryUi.search = gs.value; renderGlossary(); }, 200));

    wrap.addEventListener('click', function (e) {
      var lb = e.target.closest('[data-letter]');
      if (lb && !lb.disabled) { glossaryUi.letter = lb.getAttribute('data-letter'); renderGlossary(); return; }
      var cr = e.target.closest('[data-gact="create"]');
      if (cr) { openGlossaryEditor(null); return; }
      var ed = e.target.closest('[data-gedit]');
      if (ed) { openGlossaryEditor(ed.getAttribute('data-gedit')); return; }
      var dl = e.target.closest('[data-gdel]');
      if (dl) {
        var did = dl.getAttribute('data-gdel');
        var rec = findById(state.userGlossary, did);
        if (!rec) return;
        App.confirm('Удалить термин «' + rec.term + '»?', 'Удалить').then(function (ok) {
          if (!ok) return;
          var snap = JSON.parse(JSON.stringify(rec));
          state.userGlossary = state.userGlossary.filter(function (x) { return x.id !== did; });
          markDirty('userGlossary', did);
          saveState('userGlossary');
          pushUndo('glossary', snap);
          toast('Термин удалён', 'danger', { label: 'Отменить', onClick: function () { App.undoLast(); } });
          renderGlossary();
        });
      }
    });
  }

  function openGlossaryEditor(id) {
    var existing = id ? findById(state.userGlossary, id) : null;
    App.openModal('glossary-editor', {
      title: existing ? 'Изменить термин' : 'Новый термин',
      build: function (body) {
        body.innerHTML =
          '<label style="display:block;">Термин<input data-ge="term" type="text" maxlength="100" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
          '<label style="display:block;margin-top:8px;">Определение<textarea data-ge="definition" rows="4" maxlength="1000" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;"></textarea></label>' +
          '<div class="modal__actions" style="margin-top:12px;"><button type="button" data-gesave class="btn btn--primary" style="min-height:44px;">Сохранить</button></div>';
        if (existing) {
          body.querySelector('[data-ge="term"]').value = existing.term || '';
          body.querySelector('[data-ge="definition"]').value = existing.definition || '';
        }
        body.querySelector('[data-gesave]').addEventListener('click', function () {
          var term = body.querySelector('[data-ge="term"]').value.trim();
          var def = body.querySelector('[data-ge="definition"]').value.trim();
          if (!term) { toast('Введите термин', 'warning'); return; }
          if (term.length > 100) { toast('Термин до 100 символов', 'warning'); return; }
          if (!def) { toast('Введите определение', 'warning'); return; }
          if (def.length > 1000) { toast('Определение до 1000 символов', 'warning'); return; }
          if (existing) {
            existing.term = term;
            existing.definition = def;
            markDirty('userGlossary', existing.id);
          } else {
            var rec = { id: genId(), term: term, definition: def, isUser: true };
            state.userGlossary.push(rec);
            markDirty('userGlossary', rec.id);
          }
          saveState('userGlossary');
          App.closeModal();
          toast('Термин сохранён', 'success');
          renderGlossary();
        });
      }
    });
  }

  /* ============================================================
     ЭКСПОРТ И РЕГИСТРАЦИЯ МАРШРУТОВ
     ============================================================ */
  App.renderNotes = renderNotes;
  App.renderQuestions = renderQuestions;
  App.renderRepetition = renderRepetition;
  App.renderPractice = renderPractice;
  App.renderPortfolio = renderPortfolio;
  App.renderPresentation = renderPresentation;
  App.renderGlossary = renderGlossary;
  App.attachFieldHint = attachFieldHint;
  App.pushUndo = pushUndo;
  App.PRACTICE_TEMPLATES = PRACTICE_TEMPLATES;
  App.TABLE_COLUMNS = TABLE_COLUMNS;
  App.PORTFOLIO_STATUS = PORTFOLIO_STATUS;
  App.NOTE_TYPES = NOTE_TYPES;
  App.QUESTION_TYPES = QUESTION_TYPES;
  App.GRADES = GRADES;
  App.getFieldHint = getFieldHint;

  App.registerRoute('notes', renderNotes);
  App.registerRoute('questions', renderQuestions);
  App.registerRoute('repetition', renderRepetition);
  App.registerRoute('practice', renderPractice);
  App.registerRoute('portfolio', renderPortfolio);
  App.registerRoute('portfolio/presentation', renderPresentation);
  App.registerRoute('glossary', renderGlossary);

})(window);

/* js/core/main.js — часть 4.2 из 4 — pomodoro, stats, resources, settings, tags, sharing, онбординг, хоткеи */
(function (window) {
  'use strict';

  var App = window.App;
  var state = App.state;

  /* ---------- тонкие локальные алиасы к Utils ---------- */
  function esc(s) {
    if (typeof Utils !== 'undefined' && Utils.Escape && typeof Utils.Escape.html === 'function') {
      return Utils.Escape.html(String(s == null ? '' : s));
    }
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function genId() {
    if (typeof Utils !== 'undefined' && Utils.Data && typeof Utils.Data.generateId === 'function') {
      return Utils.Data.generateId();
    }
    return 'id-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }
  function fmtDate(d) {
    if (!d) return '—';
    if (typeof Utils !== 'undefined' && Utils.Format && typeof Utils.Format.formatDate === 'function') {
      return Utils.Format.formatDate(d);
    }
    try { return new Date(d).toLocaleDateString('ru-RU'); } catch (e) { return String(d); }
  }
  function toArr(coll) {
    if (typeof App.toArray === 'function') return App.toArray(coll);
    if (Array.isArray(coll)) return coll.slice();
    if (coll && typeof coll === 'object') return Object.keys(coll).map(function (k) { return coll[k]; });
    return [];
  }
  function byId(arr, id) {
    if (!Array.isArray(arr)) return null;
    for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) return arr[i];
    return null;
  }
  function dbc(fn, ms) {
    if (typeof App.debounce === 'function') return App.debounce(fn, ms);
    var t = null;
    return function () {
      var a = arguments, c = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(c, a); }, ms);
    };
  }
  function mainEl() { return document.getElementById('main-content'); }
  function putMain(node) {
    var m = mainEl();
    if (!m) return;
    if (typeof node === 'string') {
      var d = document.createElement('div');
      d.innerHTML = node;
      var f = document.createDocumentFragment();
      while (d.firstChild) f.appendChild(d.firstChild);
      m.replaceChildren(f);
    } else if (node && node.nodeType) {
      m.replaceChildren(node);
    }
  }
  function clampNum(v, min, max) {
    var n = Number(v);
    if (isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
  function nowIso() { return new Date().toISOString(); }
  function dayStart() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function toast(m, t, a) { return App.toast(m, t, a); }

  /* ---------- локальные расчёты ---------- */
  function flatTopicIds() {
    var out = [];
    if (!window.CourseData || !Array.isArray(window.CourseData.modules)) return out;
    window.CourseData.modules.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
      .forEach(function (m) {
        (m.topics || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); })
          .forEach(function (t) { out.push(t.id); });
      });
    return out;
  }
  function isLessonDone(rec) {
    if (!rec) return false;
    if (rec.status === 'done') return true;
    if (typeof App.computeLessonStatus === 'function') return App.computeLessonStatus(rec) === 'done';
    return false;
  }
  function calcTotalProgress() {
    var ids = flatTopicIds();
    var keys = ids.length ? ids : Object.keys(state.lessons);
    var done = 0;
    keys.forEach(function (id) { if (isLessonDone(state.lessons[id])) done++; });
    return { total: keys.length, done: done, percent: keys.length ? Math.round(done / keys.length * 100) : 0 };
  }
  function calcTotalTime() {
    var sum = 0;
    Object.keys(state.lessons).forEach(function (k) { sum += Number(state.lessons[k].timeSpent || 0); });
    return sum;
  }
  function calcTimeByModule() {
    var map = {};
    Object.keys(state.lessons).forEach(function (k) {
      var l = state.lessons[k];
      var mid = l.moduleId || 'unknown';
      map[mid] = (map[mid] || 0) + Number(l.timeSpent || 0);
    });
    return map;
  }
  function calcStreak() {
    var sessions = state.sessions || [];
    if (!sessions.length) return 0;
    var uniq = {};
    sessions.forEach(function (s) {
      var d = new Date(s.date || s.startedAt || Date.now());
      d.setHours(0, 0, 0, 0);
      uniq[d.getTime()] = true;
    });
    var days = Object.keys(uniq).map(Number).sort(function (a, b) { return b - a; });
    if (!days.length) return 0;
    var today = dayStart().getTime();
    var oneDay = 86400000;
    if (days[0] !== today && days[0] !== today - oneDay) return 0;
    var streak = 1;
    for (var i = 1; i < days.length; i++) {
      if (days[i - 1] - days[i] === oneDay) streak++;
      else break;
    }
    return streak;
  }
  function calcDueCards() {
    var start = dayStart().getTime();
    var end = start + 86400000 - 1;
    var overdue = [], today = [];
    toArr(state.flashcards).forEach(function (c) {
      var nr = c.nextReview ? new Date(c.nextReview).getTime() : start;
      if (nr < start) overdue.push(c);
      else if (nr <= end) today.push(c);
    });
    return { overdue: overdue, today: today, due: overdue.concat(today) };
  }
  function calcActivity7d() {
    var start = dayStart().getTime() - 6 * 86400000;
    return (state.sessions || []).filter(function (s) {
      var t = new Date(s.date || s.startedAt || 0).getTime();
      return t >= start;
    }).length;
  }
  function calcWeakLessons() {
    return Object.keys(state.lessons)
      .map(function (k) { return state.lessons[k]; })
      .filter(function (l) { return Number(l.understanding || 0) > 0 && Number(l.understanding) <= 2; });
  }
  function calcDoneWithoutArtifacts() {
    var practiceByTopic = {};
    toArr(state.practice).forEach(function (p) {
      if (p.topicId) practiceByTopic[p.topicId] = (practiceByTopic[p.topicId] || 0) + 1;
    });
    return Object.keys(state.lessons)
      .map(function (k) { return state.lessons[k]; })
      .filter(function (l) { return isLessonDone(l) && !practiceByTopic[l.id]; });
  }
  function calcAnsweredQuestions() {
    var totalQ = 0, answered = 0;
    var seen = {};
    if (window.CourseData && Array.isArray(window.CourseData.questions)) {
      window.CourseData.questions.forEach(function (q) { seen[q.id] = q; });
    }
    toArr(state.questions).forEach(function (q) { seen[q.id] = q; });
    Object.keys(seen).forEach(function (qid) {
      totalQ++;
      var q = seen[qid];
      var lesson = q.topicId ? state.lessons[q.topicId] : null;
      if (lesson && lesson.answers && lesson.answers[qid] && String(lesson.answers[qid]).trim()) answered++;
      else {
        var card = state.flashcards[qid];
        if (card && card.userAnswer && String(card.userAnswer).trim()) answered++;
      }
    });
    return { total: totalQ, answered: answered };
  }

  /* ============================================================
     15. renderPomodoro — единственный владелец таймера
     ============================================================ */
  var POMODORO_MODES = {
    classic: { workMinutes: 25, breakMinutes: 5, label: 'Классический 25/5' },
    long: { workMinutes: 50, breakMinutes: 10, label: 'Длинный 50/10' },
    short: { workMinutes: 15, breakMinutes: 5, label: 'Короткий 15/5' },
    custom: { workMinutes: 30, breakMinutes: 7, label: 'Свой' }
  };
  if (!App.pomodoroState) {
    App.pomodoroState = {
      mode: 'classic', workMinutes: 25, breakMinutes: 5,
      phase: 'idle', remainingSec: 0, cycles: 0,
      timerId: null, sessionId: null, soundEnabled: state.ui.pomodoroSound !== false
    };
  }
  var ps = App.pomodoroState;
  var audioCtx = null;
  var sessionStartedAt = null;

  function beep() {
    if (!ps.soundEnabled) return;
    try {
      if (!audioCtx) {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        audioCtx = new Ctor();
      }
      if (audioCtx.state === 'suspended') {
        try { audioCtx.resume(); } catch (e) { return; }
      }
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.12;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(function () {
        try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch (e) {}
      }, 200);
    } catch (e) { /* беззвучно */ }
  }

  function stopTimer() {
    if (ps.timerId) {
      clearInterval(ps.timerId);
      ps.timerId = null;
    }
  }
  App.stopPomodoro = stopTimer;

  function recordSession() {
    if (!sessionStartedAt) return;
    var rec = {
      id: ps.sessionId || genId(),
      date: nowIso(),
      startedAt: sessionStartedAt,
      endedAt: nowIso(),
      mode: ps.mode,
      workMinutes: ps.workMinutes,
      breakMinutes: ps.breakMinutes,
      completedCycles: ps.cycles,
      topicId: state.meta.lastLessonId || null
    };
    var existing = byId(state.sessions, rec.id);
    if (existing) {
      existing.endedAt = rec.endedAt;
      existing.completedCycles = rec.completedCycles;
    } else {
      state.sessions.push(rec);
    }
    App.markDirty('sessions', rec.id);
    App.saveState('sessions');
    ps.sessionId = rec.id;
  }

  function tick() {
    if (ps.remainingSec > 0) {
      ps.remainingSec--;
      paintClock();
      return;
    }
    beep();
    if (ps.phase === 'work') {
      ps.cycles++;
      recordSession();
      ps.phase = 'break';
      ps.remainingSec = ps.breakMinutes * 60;
      toast('Перерыв ' + ps.breakMinutes + ' мин', 'info');
    } else if (ps.phase === 'break') {
      ps.phase = 'work';
      ps.remainingSec = ps.workMinutes * 60;
      toast('Работа ' + ps.workMinutes + ' мин', 'info');
    }
    paintClock();
  }

  function startTimer() {
    if (ps.timerId) return;
    if (ps.phase === 'idle' || ps.phase === 'paused') {
      if (ps.phase === 'idle') {
        ps.phase = 'work';
        ps.remainingSec = ps.workMinutes * 60;
        sessionStartedAt = nowIso();
        ps.sessionId = genId();
        ps.cycles = 0;
      } else {
        ps.phase = ps.remainingSec > 0 && ps.pausedPhase ? ps.pausedPhase : 'work';
      }
    }
    beep();
    ps.timerId = setInterval(tick, 1000);
    paintClock();
  }
  function pauseTimer() {
    if (!ps.timerId) return;
    stopTimer();
    ps.pausedPhase = ps.phase;
    ps.phase = 'paused';
    paintClock();
  }
  function resetTimer() {
    stopTimer();
    if (sessionStartedAt) recordSession();
    ps.phase = 'idle';
    ps.remainingSec = 0;
    ps.cycles = 0;
    ps.sessionId = null;
    sessionStartedAt = null;
    paintClock();
  }
  function skipPhase() {
    if (ps.phase === 'idle') return;
    ps.remainingSec = 0;
    tick();
  }

  function fmtClock(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function paintClock() {
    var host = document.querySelector('[data-role="pomodoro-clock"]');
    if (!host) return;
    var totalSec = (ps.phase === 'break' ? ps.breakMinutes : ps.workMinutes) * 60;
    var left = ps.remainingSec;
    var frac = totalSec > 0 ? (totalSec - left) / totalSec : 0;
    var C = 2 * Math.PI * 90;
    var circle = host.querySelector('[data-role="clock-arc"]');
    if (circle) {
      circle.setAttribute('stroke-dasharray', String(C));
      circle.setAttribute('stroke-dashoffset', String(C * (1 - frac)));
    }
    var label = host.querySelector('[data-role="clock-label"]');
    if (label) label.textContent = fmtClock(left);
    var svg = host.querySelector('svg');
    var phaseText = ps.phase === 'work' ? 'работа' : ps.phase === 'break' ? 'перерыв' : ps.phase === 'paused' ? 'пауза' : 'остановлен';
    if (svg) svg.setAttribute('aria-label', 'Таймер: ' + phaseText + ', осталось ' + fmtClock(left));
    var phaseNode = document.querySelector('[data-role="pomodoro-phase"]');
    if (phaseNode) phaseNode.textContent = phaseText;
    var cyclesNode = document.querySelector('[data-role="pomodoro-cycles"]');
    if (cyclesNode) cyclesNode.textContent = String(ps.cycles);
    var startBtn = document.querySelector('[data-pom="start"]');
    if (startBtn) startBtn.textContent = ps.timerId ? 'Идёт' : (ps.phase === 'paused' ? 'Продолжить' : 'Старт');
    if (startBtn) startBtn.disabled = !!ps.timerId;
  }

  function renderPomodoro() {
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    var C = 2 * Math.PI * 90;
    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Pomodoro</h2>' +
      '<div class="card" style="padding:16px;display:grid;gap:16px;justify-items:center;">' +
      '<div data-role="pomodoro-clock" class="pomodoro-clock">' +
      '<svg width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="Таймер">' +
      '<circle cx="100" cy="100" r="90" fill="none" stroke="#E8E0D0" stroke-width="10"/>' +
      '<circle data-role="clock-arc" cx="100" cy="100" r="90" fill="none" stroke="#D4AF37" stroke-width="10" stroke-linecap="round" transform="rotate(-90 100 100)" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/>' +
      '<text data-role="clock-label" x="100" y="108" text-anchor="middle" font-size="32" fill="#0A1929" font-family="Georgia,serif">00:00</text>' +
      '</svg></div>' +
      '<div style="font-size:13px;">Фаза: <strong data-role="pomodoro-phase">остановлен</strong> · Циклов: <strong data-role="pomodoro-cycles">' + ps.cycles + '</strong></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">' +
      '<button type="button" data-pom="start" class="btn btn--primary" style="min-height:44px;padding:0 16px;">Старт</button>' +
      '<button type="button" data-pom="pause" class="btn" style="min-height:44px;padding:0 16px;">Пауза</button>' +
      '<button type="button" data-pom="reset" class="btn" style="min-height:44px;padding:0 16px;">Сброс</button>' +
      '<button type="button" data-pom="skip" class="btn" style="min-height:44px;padding:0 16px;">Пропустить фазу</button>' +
      '</div></div>' +
      '<div class="card" style="padding:12px;margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;align-items:end;">' +
      '<label>Режим<select data-pom="mode" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      Object.keys(POMODORO_MODES).map(function (k) {
        return '<option value="' + k + '"' + (ps.mode === k ? ' selected' : '') + '>' + esc(POMODORO_MODES[k].label) + '</option>';
      }).join('') +
      '</select></label>' +
      '<label>Работа, мин<input data-pom="work" type="number" min="5" max="120" value="' + ps.workMinutes + '"' + (ps.mode === 'custom' ? '' : ' disabled') + ' style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<label>Перерыв, мин<input data-pom="break" type="number" min="1" max="30" value="' + ps.breakMinutes + '"' + (ps.mode === 'custom' ? '' : ' disabled') + ' style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<label style="display:flex;align-items:center;gap:8px;min-height:44px;"><input type="checkbox" data-pom="sound"' + (ps.soundEnabled ? ' checked' : '') + '> Звук сигнала</label>' +
      '</div>' +
      '<p style="font-size:12px;opacity:0.7;margin-top:12px;">Сессии сохраняются автоматически и учитываются в статистике активности.</p>';
    frag.appendChild(wrap);
    putMain(frag);
    paintClock();

    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pom]');
      if (!b || b.tagName !== 'BUTTON') return;
      var a = b.getAttribute('data-pom');
      if (a === 'start') startTimer();
      else if (a === 'pause') pauseTimer();
      else if (a === 'reset') resetTimer();
      else if (a === 'skip') skipPhase();
    });
    wrap.addEventListener('change', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-pom');
      if (!f) return;
      if (f === 'mode') {
        ps.mode = e.target.value;
        var preset = POMODORO_MODES[ps.mode];
        if (ps.mode !== 'custom') {
          ps.workMinutes = preset.workMinutes;
          ps.breakMinutes = preset.breakMinutes;
        }
        stopTimer();
        ps.phase = 'idle';
        ps.remainingSec = 0;
        renderPomodoro();
      } else if (f === 'work') {
        var w = clampNum(e.target.value, 5, 120);
        if (Number(e.target.value) !== w) toast('Работа: допустимо 5–120 мин', 'warning');
        ps.workMinutes = w;
        e.target.value = w;
        if (ps.phase === 'idle') paintClock();
      } else if (f === 'break') {
        var br = clampNum(e.target.value, 1, 30);
        if (Number(e.target.value) !== br) toast('Перерыв: допустимо 1–30 мин', 'warning');
        ps.breakMinutes = br;
        e.target.value = br;
      } else if (f === 'sound') {
        ps.soundEnabled = e.target.checked;
        state.ui.pomodoroSound = ps.soundEnabled;
        App.saveState('ui');
      }
    });
  }

  /* ============================================================
     16. renderStats
     ============================================================ */
  function renderChartOrTable(host, kind, data, title) {
    var ok = false;
    if (typeof Charts !== 'undefined') {
      try {
        if (kind === 'pie' && typeof Charts.renderPie === 'function') {
          var canvas = document.createElement('canvas');
          canvas.width = 240;
          canvas.height = 240;
          canvas.setAttribute('role', 'img');
          canvas.setAttribute('aria-label', title);
          host.appendChild(canvas);
          if (canvas.getContext) ok = Charts.renderPie(canvas, data) === true;
          if (!ok && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        } else if (kind === 'bars' && typeof Charts.renderBars === 'function') {
          var box = document.createElement('div');
          box.setAttribute('role', 'img');
          box.setAttribute('aria-label', title);
          host.appendChild(box);
          ok = Charts.renderBars(box, data) === true;
          if (!ok && box.parentNode) box.parentNode.removeChild(box);
        }
      } catch (e) { ok = false; }
    }
    var desc = document.createElement('p');
    desc.className = 'chart-desc';
    desc.style.cssText = 'font-size:12px;opacity:0.75;margin:6px 0 0;';
    desc.textContent = title + ': ' + data.map(function (d) { return d.label + ' — ' + d.value; }).join(', ');
    host.appendChild(desc);
    if (!ok) {
      var table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;';
      table.innerHTML = '<caption class="visually-hidden">' + esc(title) + '</caption>' +
        '<thead><tr><th scope="col" style="text-align:left;border-bottom:1px solid #D4AF37;padding:4px;">Значение</th>' +
        '<th scope="col" style="text-align:right;border-bottom:1px solid #D4AF37;padding:4px;">Количество</th></tr></thead><tbody>' +
        data.map(function (d) {
          return '<tr><td style="padding:4px;border-bottom:1px solid #E8E0D0;">' + esc(d.label) + '</td>' +
            '<td style="padding:4px;text-align:right;border-bottom:1px solid #E8E0D0;">' + esc(String(d.value)) + '</td></tr>';
        }).join('') + '</tbody>';
      host.appendChild(table);
    }
  }

  function renderStats() {
    var lessons = Object.keys(state.lessons).map(function (k) { return state.lessons[k]; });
    var practiceArr = toArr(state.practice);
    var notesArr = toArr(state.notes);
    var cardsArr = toArr(state.flashcards);
    var sessions = state.sessions || [];

    if (!lessons.length && !practiceArr.length && !notesArr.length && !sessions.length) {
      putMain(App.renderEmptyState(
        'Статистика появится после первых сессий',
        'Откройте урок, заполните конспект и создайте артефакт — данные начнут накапливаться.',
        'Открыть курс', 'course'
      ));
      return;
    }

    var tp = calcTotalProgress();
    var totalTime = calcTotalTime();
    var timeByModule = calcTimeByModule();
    var readyPractice = practiceArr.filter(function (p) { return p.status === 'ready'; }).length;
    var qStats = calcAnsweredQuestions();
    var due = calcDueCards();
    var pfByStatus = {};
    (App.PORTFOLIO_STATUS || ['draft', 'needs-work', 'ready', 'published']).forEach(function (s) { pfByStatus[s] = 0; });
    (state.portfolio || []).forEach(function (p) { pfByStatus[p.status] = (pfByStatus[p.status] || 0) + 1; });
    var streak = calcStreak();
    var avgPerLesson = tp.done ? Math.round(totalTime / tp.done) : 0;
    var activity7 = calcActivity7d();
    var weak = calcWeakLessons();
    var doneNoArtifacts = calcDoneWithoutArtifacts();

    var modules = (window.CourseData && Array.isArray(window.CourseData.modules)) ? window.CourseData.modules : [];
    var moduleTitle = {};
    modules.forEach(function (m) { moduleTitle[m.id] = m.title; });

    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');

    /* 15 показателей */
    var metrics = [
      { label: 'Общее время', value: totalTime + ' мин' },
      { label: 'Модулей со временем', value: Object.keys(timeByModule).length },
      { label: 'Уроки завершены', value: tp.done + ' / ' + tp.total },
      { label: 'Практики готовы', value: readyPractice + ' / ' + practiceArr.length },
      { label: 'Заметок', value: notesArr.length },
      { label: 'Вопросы отвечены', value: qStats.answered + ' / ' + qStats.total },
      { label: 'Карточек / к повторению', value: cardsArr.length + ' / ' + due.due.length },
      { label: 'Портфолио готово', value: (pfByStatus.ready || 0) + (pfByStatus.published || 0) },
      { label: 'Дней подряд', value: streak },
      { label: 'Среднее на урок', value: avgPerLesson + ' мин' },
      { label: 'Прогресс курса', value: tp.percent + '%' },
      { label: 'Сессий за 7 дней', value: activity7 },
      { label: 'Слабые темы', value: weak.length },
      { label: 'Завершено без артефактов', value: doneNoArtifacts.length },
      { label: 'Просроченных карточек', value: due.overdue.length }
    ];

    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Статистика</h2>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">' +
      metrics.map(function (m) {
        return '<div class="stat-card card" style="padding:10px;text-align:center;">' +
          '<div style="font-size:18px;font-weight:700;">' + esc(String(m.value)) + '</div>' +
          '<div style="font-size:11px;opacity:0.7;">' + esc(m.label) + '</div></div>';
      }).join('') +
      '</div>' +
      '<div class="card" style="padding:12px;margin-top:16px;">' +
      '<h3 style="margin:0 0 8px;">Время по модулям</h3>' +
      (Object.keys(timeByModule).length
        ? '<ul style="list-style:none;padding:0;margin:0;display:grid;gap:4px;font-size:13px;">' +
          Object.keys(timeByModule).map(function (mid) {
            return '<li style="display:flex;justify-content:space-between;border-bottom:1px solid #E8E0D0;padding:4px 0;">' +
              '<span>' + esc(moduleTitle[mid] || mid) + '</span><span>' + timeByModule[mid] + ' мин</span></li>';
          }).join('') + '</ul>'
        : '<p style="font-size:13px;opacity:0.7;margin:0;">Время пока не отмечено</p>') +
      '</div>' +
      '<div class="card" style="padding:12px;margin-top:12px;">' +
      '<h3 style="margin:0 0 8px;">Артефакты по темам</h3>' +
      '<div data-role="stats-table"></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:12px;">' +
      '<div class="card" style="padding:12px;"><h3 style="margin:0 0 8px;">Портфолио по статусам</h3><div data-role="chart-pie"></div></div>' +
      '<div class="card" style="padding:12px;"><h3 style="margin:0 0 8px;">Топ-10 тегов</h3><div data-role="chart-bars"></div></div>' +
      '</div>' +
      '<div class="card" style="padding:12px;margin-top:12px;">' +
      '<h3 style="margin:0 0 8px;">По категориям</h3><div data-role="stats-cats"></div></div>' +
      '<div class="card" style="padding:12px;margin-top:12px;">' +
      '<h3 style="margin:0 0 8px;">Обмен данными</h3>' +
      '<p style="font-size:13px;margin:0;">Записей в журнале: ' +
      ((App.SharingManager && typeof App.SharingManager.getJournal === 'function') ? App.SharingManager.getJournal().length : (state.journal || []).length) +
      '</p></div>' +
      '<div class="card" style="padding:12px;margin-top:12px;">' +
      '<h3 style="margin:0 0 8px;">Рекомендации</h3><div data-role="stats-reco"></div></div>';

    /* таблица артефактов по topicId */
    var practiceByTopic = {};
    practiceArr.forEach(function (p) {
      if (!p.topicId) return;
      if (!practiceByTopic[p.topicId]) practiceByTopic[p.topicId] = { bug: 0, testcase: 0, checklist: 0, total: 0 };
      var g = practiceByTopic[p.topicId];
      var kind = p.templateKind || '';
      if (kind === 'bug-report') g.bug++;
      else if (kind === 'test-case') g.testcase++;
      else if (kind === 'checklist') g.checklist++;
      g.total++;
    });
    var tableHost = wrap.querySelector('[data-role="stats-table"]');
    var rowsData = lessons.filter(function (l) { return isLessonDone(l) || practiceByTopic[l.id]; });
    if (!rowsData.length) {
      tableHost.innerHTML = '<p style="font-size:13px;opacity:0.7;margin:0;">Нет завершённых тем и артефактов</p>';
    } else {
      var table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px;';
      table.innerHTML =
        '<thead><tr>' +
        ['Тема', 'Баги', 'Кейсы', 'Чек-листы', 'Всего'].map(function (h, i) {
          return '<th scope="col" style="text-align:' + (i ? 'right' : 'left') + ';border-bottom:1px solid #D4AF37;padding:6px;">' + h + '</th>';
        }).join('') + '</tr></thead><tbody>' +
        rowsData.map(function (l) {
          var g = practiceByTopic[l.id] || { bug: 0, testcase: 0, checklist: 0, total: 0 };
          var warn = isLessonDone(l) && g.total === 0;
          return '<tr class="' + (warn ? 'row-warn' : '') + '"' +
            (warn ? ' style="background:rgba(212,175,55,.15);" aria-label="Тема без артефактов"' : '') + '>' +
            '<td style="padding:6px;border-bottom:1px solid #E8E0D0;">' + esc(l.title || l.id) + '</td>' +
            '<td style="padding:6px;text-align:right;border-bottom:1px solid #E8E0D0;">' + g.bug + '</td>' +
            '<td style="padding:6px;text-align:right;border-bottom:1px solid #E8E0D0;">' + g.testcase + '</td>' +
            '<td style="padding:6px;text-align:right;border-bottom:1px solid #E8E0D0;">' + g.checklist + '</td>' +
            '<td style="padding:6px;text-align:right;border-bottom:1px solid #E8E0D0;">' + g.total + '</td></tr>';
        }).join('') + '</tbody>';
      tableHost.appendChild(table);
    }

    frag.appendChild(wrap);
    putMain(frag);

    /* диаграммы */
    var TAG_COLORS = (App.TagsManager && App.TagsManager.TAG_COLORS) ? App.TagsManager.TAG_COLORS :
      ['#D4AF37', '#C9A961', '#B8945F', '#A67C52', '#8B6F47', '#7A5C3A', '#6B4E2E', '#5A3D1F', '#4A3018', '#3A2410'];
    var pieData = Object.keys(pfByStatus).map(function (s, i) {
      return { label: s, value: pfByStatus[s], color: TAG_COLORS[i % TAG_COLORS.length] };
    }).filter(function (d) { return d.value > 0; });
    var pieHost = wrap.querySelector('[data-role="chart-pie"]');
    if (pieData.length) renderChartOrTable(pieHost, 'pie', pieData, 'Портфолио по статусам');
    else pieHost.innerHTML = '<p style="font-size:13px;opacity:0.7;margin:0;">Портфолио пусто</p>';

    var topTags = (App.TagsManager && typeof App.TagsManager.getTagsWithCount === 'function')
      ? App.TagsManager.getTagsWithCount().slice(0, 10) : [];
    var barsHost = wrap.querySelector('[data-role="chart-bars"]');
    if (topTags.length) {
      renderChartOrTable(barsHost, 'bars', topTags.map(function (t, i) {
        return { label: t.name, value: t.count, color: t.color || TAG_COLORS[i % TAG_COLORS.length] };
      }), 'Топ-10 тегов');
    } else {
      barsHost.innerHTML = '<p style="font-size:13px;opacity:0.7;margin:0;">Тегов пока нет</p>';
    }

    /* по категориям */
    var catsHost = wrap.querySelector('[data-role="stats-cats"]');
    var catCounts = {};
    [].concat(notesArr, practiceArr, state.portfolio || []).forEach(function (r) {
      if (r && r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    });
    var catKeys = Object.keys(catCounts);
    if (!catKeys.length) {
      catsHost.innerHTML = '<p style="font-size:13px;opacity:0.7;margin:0;">Категории не назначены</p>';
    } else {
      catsHost.innerHTML = '<ul style="list-style:none;padding:0;margin:0;display:grid;gap:4px;font-size:13px;">' +
        catKeys.map(function (cid) {
          var path = (App.CategoriesManager && typeof App.CategoriesManager.getPath === 'function')
            ? App.CategoriesManager.getPath(cid).join(' / ') : cid;
          return '<li style="display:flex;justify-content:space-between;border-bottom:1px solid #E8E0D0;padding:4px 0;">' +
            '<span>' + esc(path || cid) + '</span><span>' + catCounts[cid] + '</span></li>';
        }).join('') + '</ul>';
    }

    /* 9 рекомендаций */
    var recoHost = wrap.querySelector('[data-role="stats-reco"]');
    function buildReco(storagePercent) {
      var reco = [];
      var daysSince = 999;
      if (state.meta.lastActiveDate) {
        try { daysSince = Math.floor((Date.now() - new Date(state.meta.lastActiveDate).getTime()) / 86400000); } catch (e) {}
      }
      if (daysSince >= 3) reco.push({ text: 'Вернитесь к занятиям: перерыв ' + daysSince + ' дн.', href: '#today', label: 'К задачам дня' });
      if (tp.done >= 3 && practiceArr.length === 0) reco.push({ text: 'Создайте первый артефакт по изученным темам', href: '#practice', label: 'К практике' });
      if (due.due.length >= 10) reco.push({ text: 'Разберите накопившиеся карточки: ' + due.due.length + ' шт.', href: '#repetition', label: 'К повторению' });
      if (due.overdue.length > 0) reco.push({ text: 'Есть просроченные карточки: ' + due.overdue.length + ' шт.', href: '#repetition', label: 'Открыть' });
      if (weak.length >= 1) reco.push({ text: 'Повторите слабую тему: ' + (weak[0].title || weak[0].id), href: '#course/lesson/' + weak[0].id, label: 'К уроку' });
      if (doneNoArtifacts.length >= 1) reco.push({ text: 'Закрепите практикой ' + doneNoArtifacts.length + ' завершённых тем', href: '#practice', label: 'К практике' });
      if (readyPractice >= 1 && (state.portfolio || []).length === 0) reco.push({ text: 'Добавьте готовый артефакт в портфолио', href: '#portfolio', label: 'К портфолио' });
      if (tp.done >= 1 && notesArr.length === 0) reco.push({ text: 'Ведите конспект: так материал запоминается лучше', href: '#notes', label: 'К заметкам' });
      if (storagePercent >= 80) reco.push({ text: 'Хранилище заполнено на ' + storagePercent + '%. Сделайте копию', href: '#settings/sharing', label: 'К обмену' });
      return reco;
    }
    function paintReco(storagePercent) {
      var reco = buildReco(storagePercent);
      if (!reco.length) {
        recoHost.innerHTML = '<div class="empty-state" style="padding:12px;"><p class="empty-state__text" style="margin:0;">Рекомендаций нет — режим стабильный.</p></div>';
        return;
      }
      recoHost.innerHTML = '<ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px;">' +
        reco.map(function (r) {
          return '<li style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;border-left:3px solid #D4AF37;padding:8px;background:rgba(212,175,55,.08);">' +
            '<span style="font-size:13px;">' + esc(r.text) + '</span>' +
            '<a href="' + esc(r.href) + '" style="min-height:44px;display:inline-flex;align-items:center;padding:0 12px;border:1px solid #D4AF37;text-decoration:none;color:#0A1929;">' + esc(r.label) + '</a></li>';
        }).join('') + '</ul>';
    }
    paintReco(0);
    window.IDB.estimate().then(function (r) {
      if (r && r.percent >= 80) paintReco(r.percent);
    }).catch(function () {});
  }

  /* ============================================================
     17. renderResources
     ============================================================ */
  var RESOURCES_FALLBACK = [
    { id: 'res-1', title: 'Описание курса', body: 'Кабинет рассчитан на самостоятельное изучение ручного тестирования. Работает без сервера и интернета, все данные хранятся на этом компьютере.' },
    { id: 'res-2', title: 'Структура обучения', body: 'Материал разбит на модули, модули — на темы. Каждая тема закрывается конспектом, ответами на вопросы и практическим артефактом.' },
    { id: 'res-3', title: 'Как выполнять практику', body: 'Выберите шаблон в разделе Практика, привяжите его к модулю и теме, заполните поля. Табличные шаблоны поддерживают работу с клавиатуры.' },
    { id: 'res-4', title: 'Как вести конспект', body: 'Пишите своими словами: формулировка «как понял» закрепляет материал лучше, чем копирование. Поле «Неясно» помогает вернуться к пробелам.' },
    { id: 'res-5', title: 'Как собрать портфолио', body: 'Доведите артефакт до статуса «Готов», проверьте чек-лист качества и добавьте его в портфолио. Для показа работодателю включите флаг «для презентации».' },
    { id: 'res-6', title: 'Теги и категории', body: 'Теги — плоские метки, до 10 на элемент. Категории — дерево до трёх уровней. Настраиваются в разделе Настройки, подраздел «Теги и категории».' },
    { id: 'res-7', title: 'Обмен данными', body: 'Обмен идёт только через локальные файлы JSON. Пароль в пакете — маркер совпадения, а не шифрование: содержимое читается в любом редакторе.' },
    { id: 'res-8', title: 'Режим презентации', body: 'Скрывает служебные элементы и оставляет только отобранные работы. Из режима доступен экспорт в самодостаточный HTML и в Markdown.' },
    { id: 'res-9', title: 'Общедоступные материалы', body: 'Для расширения теории используйте открытые источники: документацию по стандартам тестирования, книги по тест-дизайну, публичные глоссарии терминов. Ссылки не встроены намеренно: приложение работает автономно.' }
  ];

    function mdToHtml(src) {
    var lines = esc(String(src || '')).split('\n');
    var out = [];
    var listOpen = false;

    function inline(s) {
      return s
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="res-code">$1</code>');
    }
    function closeList() {
      if (listOpen) { out.push('</ul>'); listOpen = false; }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { closeList(); continue; }
      if (line.indexOf('## ') === 0) {
        closeList();
        out.push('<h3 class="res-h">' + inline(line.slice(3)) + '</h3>');
      } else if (line.indexOf('- ') === 0) {
        if (!listOpen) { out.push('<ul class="res-ul">'); listOpen = true; }
        out.push('<li>' + inline(line.slice(2)) + '</li>');
      } else {
        closeList();
        out.push('<p class="res-p">' + inline(line) + '</p>');
      }
    }
    closeList();
    return out.join('');
  }

  function renderResources() {
    var items = (window.CourseData && Array.isArray(window.CourseData.resources) && window.CourseData.resources.length)
      ? window.CourseData.resources : RESOURCES_FALLBACK;
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Материалы</h2>' +
      '<div class="accordion" style="display:grid;gap:8px;">' +
      items.map(function (r, i) {
        var pid = 'res-panel-' + i;
        return '<div class="card" style="padding:0;overflow:hidden;">' +
          '<button type="button" data-acc="' + i + '" aria-expanded="false" aria-controls="' + pid + '" ' +
          'style="width:100%;text-align:left;min-height:44px;padding:12px;background:#fff;border:none;cursor:pointer;font-weight:600;display:flex;justify-content:space-between;gap:8px;align-items:center;">' +
          '<span>' + esc(r.title || '') + '</span><span data-acc-icon aria-hidden="true">+</span></button>' +
          '<div id="' + pid + '" hidden class="res-body">' + mdToHtml(r.content || r.body || r.text || '') + '</div>' +
          '</div>';
      }).join('') + '</div>';
    frag.appendChild(wrap);
    putMain(frag);

    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-acc]');
      if (!btn) return;
      var wasOpen = btn.getAttribute('aria-expanded') === 'true';
      wrap.querySelectorAll('[data-acc]').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        var icon = b.querySelector('[data-acc-icon]');
        if (icon) icon.textContent = '+';
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        if (panel) panel.setAttribute('hidden', 'hidden');
      });
      if (!wasOpen) {
        btn.setAttribute('aria-expanded', 'true');
        var ic = btn.querySelector('[data-acc-icon]');
        if (ic) ic.textContent = '−';
        var p = document.getElementById(btn.getAttribute('aria-controls'));
        if (p) p.removeAttribute('hidden');
      }
    });
  }

  /* ============================================================
     18. renderSettings
     ============================================================ */
  var ROLE_OPTIONS = ['QA Trainee', 'Junior QA', 'Middle QA', 'Тестировщик-стажёр', 'Другое'];

  function renderSettings() {
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    var u = state.user;
    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Настройки</h2>' +

      '<section class="card" style="padding:12px;"><h3 style="margin:0 0 8px;">Профиль</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">' +
      '<label>Имя<input data-sf="name" type="text" maxlength="60" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<label>Роль<select data-sf="role" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      ROLE_OPTIONS.map(function (r) { return '<option value="' + esc(r) + '"' + (u.role === r ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') +
      '</select></label>' +
      '<label>Недельная цель, часов<input data-sf="weeklyGoal" type="number" min="1" max="14" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<label>Дневной лимит, минут<input data-sf="dailyLimit" type="number" min="15" max="240" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<label>Тема<select data-sf="theme" style="width:100%;min-height:44px;border:1px solid #D4AF37;">' +
      '<option value="light"' + (u.theme === 'light' ? ' selected' : '') + '>Светлая</option>' +
      '<option value="dark"' + (u.theme === 'dark' ? ' selected' : '') + '>Тёмная</option>' +
      '<option value="system"' + (u.theme === 'system' ? ' selected' : '') + '>Системная</option></select></label>' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;min-height:44px;">' +
      '<input type="checkbox" data-sf="compactView"' + (state.ui.compactView ? ' checked' : '') + '> Компактный режим</label>' +
      '<label style="display:flex;align-items:center;gap:8px;min-height:44px;">' +
      '<input type="checkbox" data-sf="debug"' + (state.ui.debugEnabled ? ' checked' : '') + '> Режим отладки</label>' +
      '</section>' +

      '<section class="card" style="padding:12px;margin-top:12px;"><h3 style="margin:0 0 8px;">Организация данных</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<a href="#settings/tags" style="min-height:44px;display:inline-flex;align-items:center;padding:0 14px;border:1px solid #D4AF37;text-decoration:none;color:#0A1929;">Теги и категории</a>' +
      '<a href="#settings/sharing" style="min-height:44px;display:inline-flex;align-items:center;padding:0 14px;border:1px solid #D4AF37;text-decoration:none;color:#0A1929;">Обмен данными</a>' +
      '</div></section>' +

      '<section class="card" style="padding:12px;margin-top:12px;"><h3 style="margin:0 0 8px;">Резервная копия</h3>' +
      '<p style="font-size:13px;opacity:0.75;margin:0 0 8px;">Копия сохраняется файлом JSON на этот компьютер. Импорт заменяет текущие данные.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" data-sact="export" class="btn btn--primary" style="min-height:44px;">Экспорт копии</button>' +
      '<button type="button" data-sact="import" class="btn" style="min-height:44px;">Импорт копии</button>' +
      '<button type="button" data-sact="restore" class="btn" style="min-height:44px;">Откат автокопии</button>' +
      '</div></section>' +

      '<section class="card" style="padding:12px;margin-top:12px;"><h3 style="margin:0 0 8px;">Демонстрационные данные</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" data-sact="demo-load" class="btn" style="min-height:44px;">Загрузить демо</button>' +
      '<button type="button" data-sact="demo-clear" class="btn" style="min-height:44px;">Удалить демо</button>' +
      '</div></section>' +

      '<section class="card" style="padding:12px;margin-top:12px;"><h3 style="margin:0 0 8px;">Хранилище</h3>' +
      '<div class="progress-gold" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Заполнение хранилища" data-role="storage-bar">' +
      '<div class="progress-fill" style="transform:scaleX(0);"></div></div>' +
      '<p data-role="storage-text" style="font-size:13px;margin:6px 0 0;">Оценка выполняется…</p></section>' +

      '<section class="card" style="padding:12px;margin-top:12px;border:2px solid #8B6F47;"><h3 style="margin:0 0 8px;">Сброс</h3>' +
      '<p style="font-size:13px;opacity:0.75;margin:0 0 8px;">Сброс прогресса очищает статусы и оценки, конспекты и портфолио остаются. Полный сброс удаляет всё.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" data-sact="reset-progress" class="btn" style="min-height:44px;">Сбросить прогресс</button>' +
      '<button type="button" data-sact="reset-all" class="btn btn--danger" style="min-height:44px;">Полный сброс</button>' +
      '</div></section>';

    frag.appendChild(wrap);
    putMain(frag);

    wrap.querySelector('[data-sf="name"]').value = u.name || '';
    wrap.querySelector('[data-sf="weeklyGoal"]').value = String(u.weeklyGoal);
    wrap.querySelector('[data-sf="dailyLimit"]').value = String(u.dailyLimit);

    var saveProfile = dbc(function () {
      u.name = wrap.querySelector('[data-sf="name"]').value.slice(0, 60);
      u.role = wrap.querySelector('[data-sf="role"]').value;
      u.weeklyGoal = clampNum(wrap.querySelector('[data-sf="weeklyGoal"]').value, 1, 14);
      u.dailyLimit = clampNum(wrap.querySelector('[data-sf="dailyLimit"]').value, 15, 240);
      wrap.querySelector('[data-sf="weeklyGoal"]').value = String(u.weeklyGoal);
      wrap.querySelector('[data-sf="dailyLimit"]').value = String(u.dailyLimit);
      App.saveState('user');
      toast('Профиль сохранён', 'success');
    }, 300);

    wrap.addEventListener('input', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-sf');
      if (!f || f === 'compactView' || f === 'debug' || f === 'theme') return;
      saveProfile();
    });
    wrap.addEventListener('change', function (e) {
      var f = e.target.getAttribute && e.target.getAttribute('data-sf');
      if (!f) return;
      if (f === 'theme') {
        u.theme = e.target.value;
        if (typeof App.applyTheme === 'function') App.applyTheme(u.theme);
        App.saveState('user');
        toast('Тема применена', 'success');
      } else if (f === 'compactView') {
        App.toggleCompactView(e.target.checked);
      } else if (f === 'debug') {
        state.ui.debugEnabled = e.target.checked;
        App.saveState('ui');
        if (typeof Debug !== 'undefined') {
          try {
            if (e.target.checked && typeof Debug.enable === 'function') Debug.enable();
            else if (!e.target.checked && typeof Debug.disable === 'function') Debug.disable();
          } catch (err) {}
        }
        toast(e.target.checked ? 'Отладка включена' : 'Отладка выключена', 'info');
      } else {
        saveProfile();
      }
    });

    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sact]');
      if (!b) return;
      var a = b.getAttribute('data-sact');
      if (a === 'export') {
        window.IDB.exportAll().then(function (data) {
          var d = new Date();
          function pad(n) { return n < 10 ? '0' + n : '' + n; }
          var fname = 'qa-backup-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '.json';
          App.downloadFile(fname, 'application/json', JSON.stringify(data, null, 2));
          toast('Копия сохранена', 'success');
        }).catch(function () { toast('Не удалось создать копию', 'danger'); });
      } else if (a === 'import') {
        var input = document.getElementById('import-file-input');
        if (!input) { toast('Поле выбора файла недоступно', 'danger'); return; }
        input.value = '';
        input.onchange = function () {
          var file = input.files && input.files[0];
          if (!file) return;
          App.confirm('Импорт заменит текущие данные. Продолжить?', 'Импортировать').then(function (ok) {
            if (!ok) return;
            var reader = new FileReader();
            reader.onerror = function () { toast('Не удалось прочитать файл', 'danger'); };
            reader.onload = function () {
              var parsed;
              try { parsed = JSON.parse(String(reader.result)); }
              catch (err) { toast('Файл повреждён', 'danger'); return; }
              window.IDB.importAll(parsed).then(function () {
                toast('Импорт завершён, обновите страницу', 'success');
                if (typeof App.loadState === 'function') App.loadState().then(function () { App.router(); });
              }).catch(function (err2) {
                App.openModal('import-errors', {
                  title: 'Ошибка импорта',
                  errors: [String(err2 && err2.message ? err2.message : err2)],
                  onContinue: function () {}
                });
              });
            };
            reader.readAsText(file, 'utf-8');
          });
        };
        input.click();
      } else if (a === 'restore') {
        App.confirm('Откатить данные из автоматической копии?', 'Откатить').then(function (ok) {
          if (!ok) return;
          window.IDB.restoreAutoBackup().then(function () {
            toast('Данные восстановлены', 'success');
            if (typeof App.loadState === 'function') App.loadState().then(function () { App.router(); });
          }).catch(function () { toast('Автокопия недоступна', 'danger'); });
        });
      } else if (a === 'demo-load') {
        window.IDB.loadDemoData().then(function () {
          toast('Демо-данные загружены', 'success');
          if (typeof App.loadState === 'function') App.loadState().then(function () { App.router(); });
        }).catch(function () { toast('Не удалось загрузить демо', 'danger'); });
      } else if (a === 'demo-clear') {
        App.confirm('Удалить все демонстрационные записи?', 'Удалить').then(function (ok) {
          if (!ok) return;
          window.IDB.clearDemo().then(function () {
            toast('Демо-данные удалены', 'success');
            if (typeof App.loadState === 'function') App.loadState().then(function () { App.router(); });
          }).catch(function () { toast('Не удалось удалить демо', 'danger'); });
        });
      } else if (a === 'reset-progress') {
        App.confirm('Сбросить прогресс? Конспекты и портфолио сохранятся.', 'Сбросить').then(function (ok) {
          if (!ok) return;
          window.IDB.resetProgress().then(function () {
            toast('Прогресс сброшен', 'success');
            if (typeof App.loadState === 'function') App.loadState().then(function () { App.router(); });
          }).catch(function () { toast('Не удалось сбросить прогресс', 'danger'); });
        });
      } else if (a === 'reset-all') {
        openFullResetDialog();
      }
    });

    /* прогресс хранилища после вставки в DOM */
    window.IDB.estimate().then(function (r) {
      var bar = wrap.querySelector('[data-role="storage-bar"]');
      var text = wrap.querySelector('[data-role="storage-text"]');
      if (!bar || !text) return;
      if (!r || !r.quota) {
        text.textContent = 'Оценка недоступна';
        bar.setAttribute('aria-valuenow', '0');
        return;
      }
      var pct = r.percent || 0;
      bar.setAttribute('aria-valuenow', String(pct));
      var fill = bar.querySelector('.progress-fill');
      if (fill && typeof App.setProgress === 'function') App.setProgress(fill, pct);
      var mbUsed = Math.round((r.usage || 0) / 1048576 * 10) / 10;
      var mbQuota = Math.round((r.quota || 0) / 1048576);
      text.textContent = 'Занято ' + mbUsed + ' МБ из ' + mbQuota + ' МБ (' + pct + '%)';
      if (pct >= 80) toast('Хранилище заполнено на ' + pct + '%. Сделайте копию', 'warning');
    }).catch(function () {
      var text = wrap.querySelector('[data-role="storage-text"]');
      if (text) text.textContent = 'Оценка недоступна';
    });
  }

  function openFullResetDialog() {
    App.openModal('full-reset', {
      title: 'Полный сброс',
      build: function (body) {
        body.innerHTML =
          '<p style="font-size:13px;">Будут удалены все уроки, заметки, вопросы, карточки, практика и портфолио. Перед сбросом автоматически выгрузится копия.</p>' +
          '<label style="display:block;margin-top:8px;">Для подтверждения введите слово СБРОС' +
          '<input data-reset-word type="text" maxlength="20" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;margin-top:4px;"></label>' +
          '<div class="modal__actions" style="margin-top:12px;display:flex;gap:8px;">' +
          '<button type="button" data-reset-go class="btn btn--danger" style="min-height:44px;">Сбросить всё</button></div>';
        body.querySelector('[data-reset-go]').addEventListener('click', function () {
          var word = body.querySelector('[data-reset-word]').value;
          if (String(word).trim().toUpperCase() !== 'СБРОС') {
            toast('Введите слово СБРОС для подтверждения', 'warning');
            return;
          }
          window.IDB.exportAll().then(function (data) {
            var d = new Date();
            function pad(n) { return n < 10 ? '0' + n : '' + n; }
            App.downloadFile('qa-backup-before-reset-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '.json',
              'application/json', JSON.stringify(data, null, 2));
          }).catch(function () {}).then(function () {
            return window.IDB.resetAll();
          }).then(function () {
            App.closeModal();
            toast('Все данные удалены', 'danger');
            if (typeof App.loadState === 'function') App.loadState().then(function () { App.router(); });
          }).catch(function () {
            toast('Сброс не выполнен', 'danger');
          });
        });
      }
    });
  }

  /* ---------- renderSettingsTags ---------- */
  function renderSettingsTags() {
    var TM = App.TagsManager;
    var CM = App.CategoriesManager;
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    var tags = (TM && typeof TM.getTagsWithCount === 'function') ? TM.getTagsWithCount() : (state.tags || []);
    var flatCats = (CM && typeof CM.getFlat === 'function') ? CM.getFlat() : [];

    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Теги и категории</h2>' +
      '<section class="card" style="padding:12px;"><h3 style="margin:0 0 8px;">Теги (' + tags.length + ')</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">' +
      '<label style="flex:1;min-width:180px;">Новый тег<input data-tg="new" type="text" maxlength="30" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<button type="button" data-tgact="create" class="btn btn--primary" style="min-height:44px;">Создать</button>' +
      '<button type="button" data-tgact="manager" class="btn" style="min-height:44px;">Объединить теги</button>' +
      '</div>' +
      '<ul data-role="tag-list" style="list-style:none;padding:0;margin:12px 0 0;display:grid;gap:6px;"></ul></section>' +

      '<section class="card" style="padding:12px;margin-top:12px;"><h3 style="margin:0 0 8px;">Категории (' + flatCats.length + ')</h3>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;align-items:end;">' +
      '<label>Название<input data-ct="new" type="text" maxlength="50" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<label>Родитель<select data-ct="parent" style="width:100%;min-height:44px;border:1px solid #D4AF37;"><option value="">— корневая —</option>' +
      flatCats.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.path) + '</option>'; }).join('') +
      '</select></label>' +
      '<button type="button" data-ctact="create" class="btn btn--primary" style="min-height:44px;">Создать категорию</button>' +
      '</div>' +
      '<ul data-role="cat-list" style="list-style:none;padding:0;margin:12px 0 0;display:grid;gap:6px;"></ul></section>';

    var tagList = wrap.querySelector('[data-role="tag-list"]');
    if (!tags.length) {
      tagList.innerHTML = '<li style="font-size:13px;opacity:0.7;">Тегов пока нет</li>';
    } else {
      tags.forEach(function (t) {
        var li = document.createElement('li');
        li.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid #E8E0D0;padding:8px;';
        li.innerHTML =
          '<span style="display:inline-block;width:10px;height:10px;background:' + esc(t.color || '#D4AF37') + ';flex:0 0 10px;" aria-hidden="true"></span>' +
          '<span style="flex:1;font-size:13px;">' + esc(t.name) + ' <span style="opacity:0.6;">· ' + (t.count || 0) + '</span></span>' +
          '<button type="button" data-tgrename="' + esc(t.id) + '" class="btn" style="min-height:44px;">Переименовать</button>' +
          '<button type="button" data-tgdel="' + esc(t.id) + '" class="btn btn--danger" style="min-height:44px;">Удалить</button>';
        tagList.appendChild(li);
      });
    }

    var catList = wrap.querySelector('[data-role="cat-list"]');
    if (!flatCats.length) {
      catList.innerHTML = '<li style="font-size:13px;opacity:0.7;">Категорий пока нет</li>';
    } else {
      flatCats.forEach(function (c) {
        var li = document.createElement('li');
        li.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid #E8E0D0;padding:8px;';
        li.innerHTML =
          '<span style="flex:1;font-size:13px;padding-left:' + ((c.depth - 1) * 12) + 'px;">' + esc(c.name) +
          ' <span style="opacity:0.6;">· уровень ' + c.depth + '</span></span>' +
          '<button type="button" data-ctrename="' + esc(c.id) + '" class="btn" style="min-height:44px;">Переименовать</button>' +
          '<button type="button" data-ctdel="' + esc(c.id) + '" class="btn btn--danger" style="min-height:44px;">Удалить</button>';
        catList.appendChild(li);
      });
    }

    frag.appendChild(wrap);
    putMain(frag);

    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.getAttribute('data-tgact') === 'create') {
        var input = wrap.querySelector('[data-tg="new"]');
        if (!TM || typeof TM.create !== 'function') { toast('Менеджер тегов недоступен', 'danger'); return; }
        var id = TM.create(input.value);
        if (id) { input.value = ''; renderSettingsTags(); }
        return;
      }
      if (b.getAttribute('data-tgact') === 'manager') { App.openModal('tag-manager'); return; }
      var rn = b.getAttribute('data-tgrename');
      if (rn) { openRenameDialog('tag', rn); return; }
      var dl = b.getAttribute('data-tgdel');
      if (dl) {
        var tag = byId(state.tags, dl);
        App.confirm('Удалить тег «' + (tag ? tag.name : dl) + '» из всех записей?', 'Удалить').then(function (ok) {
          if (!ok || !TM) return;
          TM.delete(dl);
          toast('Тег удалён', 'success');
          renderSettingsTags();
        });
        return;
      }
      if (b.getAttribute('data-ctact') === 'create') {
        if (!CM || typeof CM.create !== 'function') { toast('Менеджер категорий недоступен', 'danger'); return; }
        var nameInput = wrap.querySelector('[data-ct="new"]');
        var parentSel = wrap.querySelector('[data-ct="parent"]');
        var cid = CM.create(nameInput.value, parentSel.value || null);
        if (cid) { nameInput.value = ''; renderSettingsTags(); }
        return;
      }
      var crn = b.getAttribute('data-ctrename');
      if (crn) { openRenameDialog('category', crn); return; }
      var cdl = b.getAttribute('data-ctdel');
      if (cdl) {
        App.confirm('Удалить категорию и все вложенные?', 'Удалить').then(function (ok) {
          if (!ok || !CM) return;
          CM.delete(cdl);
          toast('Категория удалена', 'success');
          renderSettingsTags();
        });
      }
    });
  }

  function openRenameDialog(kind, id) {
    var isTag = kind === 'tag';
    var rec = isTag ? byId(state.tags, id) : byId(state.categories, id);
    if (!rec) return;
    App.openModal('rename', {
      title: isTag ? 'Переименовать тег' : 'Переименовать категорию',
      build: function (body) {
        body.innerHTML =
          '<label style="display:block;">Новое название<input data-rn type="text" maxlength="' + (isTag ? 30 : 50) + '" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;margin-top:4px;"></label>' +
          '<div class="modal__actions" style="margin-top:12px;"><button type="button" data-rnsave class="btn btn--primary" style="min-height:44px;">Сохранить</button></div>';
        body.querySelector('[data-rn]').value = rec.name || '';
        body.querySelector('[data-rnsave]').addEventListener('click', function () {
          var val = body.querySelector('[data-rn]').value;
          var ok = isTag
            ? (App.TagsManager && App.TagsManager.rename(id, val))
            : (App.CategoriesManager && App.CategoriesManager.rename(id, val));
          if (ok) {
            App.closeModal();
            toast('Название обновлено', 'success');
            renderSettingsTags();
          }
        });
      }
    });
  }

  /* ---------- renderSettingsSharing ---------- */
  function renderSettingsSharing() {
    var SM = App.SharingManager;
    var frag = document.createDocumentFragment();
    var wrap = document.createElement('div');
    var journal = (SM && typeof SM.getJournal === 'function') ? SM.getJournal() : (state.journal || []);
    var shareTypes = [
      { key: 'notes', label: 'Заметки' }, { key: 'questions', label: 'Вопросы' },
      { key: 'flashcards', label: 'Карточки' }, { key: 'practice', label: 'Практика' },
      { key: 'portfolio', label: 'Портфолио' }, { key: 'lessons', label: 'Уроки' },
      { key: 'tags', label: 'Теги' }, { key: 'categories', label: 'Категории' }
    ];

    wrap.innerHTML =
      '<h2 style="margin:0 0 12px;">Обмен данными</h2>' +
      '<section class="card" style="padding:12px;"><h3 style="margin:0 0 8px;">Экспорт пакета</h3>' +
      '<label style="display:block;">Название пакета<input data-sh="name" type="text" maxlength="100" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<label style="display:block;margin-top:8px;">Описание<textarea data-sh="description" rows="2" maxlength="500" style="width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;"></textarea></label>' +
      '<label style="display:block;margin-top:8px;">Отправитель<input data-sh="sender" type="text" maxlength="60" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<label style="display:block;margin-top:8px;">Пароль-маркер<input data-sh="password" type="text" maxlength="32" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<p style="font-size:12px;opacity:0.75;margin:4px 0 0;">Пароль — маркер совпадения при импорте, не шифрование: содержимое пакета читается в любом текстовом редакторе.</p>' +
      '<fieldset style="margin-top:12px;border:1px solid #D4AF37;padding:8px;"><legend style="font-size:13px;">Что включить</legend>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px;">' +
      shareTypes.map(function (t) {
        return '<label style="display:flex;align-items:center;gap:6px;min-height:44px;">' +
          '<input type="checkbox" data-shtype="' + t.key + '"> ' + esc(t.label) + '</label>';
      }).join('') + '</div></fieldset>' +
      '<button type="button" data-shact="export" class="btn btn--primary" style="min-height:44px;margin-top:12px;">Собрать и скачать пакет</button>' +
      '</section>' +

      '<section class="card" style="padding:12px;margin-top:12px;"><h3 style="margin:0 0 8px;">Импорт пакета</h3>' +
      '<p style="font-size:13px;opacity:0.75;margin:0 0 8px;">Принимается файл JSON до 10 МБ. Перед записью создаётся автоматическая копия.</p>' +
      '<button type="button" data-shact="import" class="btn" style="min-height:44px;">Выбрать файл пакета</button></section>' +

      '<section class="card" style="padding:12px;margin-top:12px;"><h3 style="margin:0 0 8px;">Журнал обмена (' + journal.length + ')</h3>' +
      (journal.length
        ? '<ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px;font-size:13px;">' +
          journal.map(function (j) {
            return '<li style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;border-bottom:1px solid #E8E0D0;padding:6px 0;">' +
              '<span>' + esc(j.type === 'export' ? 'Экспорт' : 'Импорт') + ' · ' + esc(j.packageName || '—') + '</span>' +
              '<span style="opacity:0.7;">' + esc(fmtDate(j.date)) + ' · ' + (j.itemsCount || 0) + ' элем.' +
              (j.skipped ? ', пропущено ' + j.skipped : '') + '</span></li>';
          }).join('') + '</ul>' +
          '<button type="button" data-shact="clear-journal" class="btn btn--danger" style="min-height:44px;margin-top:12px;">Очистить журнал</button>'
        : '<p style="font-size:13px;opacity:0.7;margin:0;">Журнал пуст</p>') +
      '</section>';

    frag.appendChild(wrap);
    putMain(frag);

    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-shact]');
      if (!b) return;
      var a = b.getAttribute('data-shact');
      if (a === 'export') {
        if (!SM || typeof SM.exportPackage !== 'function') { toast('Менеджер обмена недоступен', 'danger'); return; }
        var items = [];
        wrap.querySelectorAll('[data-shtype]').forEach(function (cb) {
          if (!cb.checked) return;
          var key = cb.getAttribute('data-shtype');
          var coll = state[key];
          var ids = Array.isArray(coll) ? coll.map(function (r) { return r.id; }) : Object.keys(coll || {});
          items.push({ type: key, ids: ids });
        });
        if (!items.length) { toast('Отметьте, что включить в пакет', 'warning'); return; }
        SM.exportPackage({
          name: wrap.querySelector('[data-sh="name"]').value,
          description: wrap.querySelector('[data-sh="description"]').value,
          sender: wrap.querySelector('[data-sh="sender"]').value || state.user.name,
          password: wrap.querySelector('[data-sh="password"]').value,
          items: items
        });
        renderSettingsSharing();
      } else if (a === 'import') {
        var input = document.getElementById('import-file-input');
        if (!input) { toast('Поле выбора файла недоступно', 'danger'); return; }
        input.value = '';
        input.onchange = function () {
          var file = input.files && input.files[0];
          if (!file) return;
          if (SM && typeof SM.importPackage === 'function') SM.importPackage(file);
          else toast('Менеджер обмена недоступен', 'danger');
        };
        input.click();
      } else if (a === 'clear-journal') {
        App.confirm('Очистить журнал обмена?', 'Очистить').then(function (ok) {
          if (!ok || !SM) return;
          SM.clearJournal();
          renderSettingsSharing();
        });
      }
    });
  }

  /* ============================================================
     19. ОНБОРДИНГ
     ============================================================ */
  var NAME_RE = /^[А-Яа-яЁёA-Za-z0-9 \-]+$/;
  var onboardingDraft = null;

  function buildOnboarding(body, entry) {
    onboardingDraft = {
      step: 1,
      name: state.user.name || '',
      role: 'Junior QA',
      roleOther: '',
      weeklyGoal: state.user.weeklyGoal || 5,
      dailyLimit: state.user.dailyLimit || 120,
      theme: 'system'
    };

    function finish(skipped) {
      var d = onboardingDraft;
      var u = state.user;
      if (skipped) {
        u.name = 'Студент';
        u.role = 'Junior QA';
        u.weeklyGoal = 5;
        u.dailyLimit = 120;
        u.theme = 'system';
      } else {
        var nm = String(d.name || '').trim();
        if (!nm || !NAME_RE.test(nm)) nm = 'Студент';
        u.name = nm.slice(0, 60);
        u.role = d.role === 'Другое' ? (String(d.roleOther || '').trim().slice(0, 40) || 'Другое') : d.role;
        u.weeklyGoal = clampNum(d.weeklyGoal, 1, 14);
        u.dailyLimit = clampNum(d.dailyLimit, 15, 240);
        u.theme = d.theme || 'system';
      }
      u.onboarded = true;
      if (typeof App.applyTheme === 'function') App.applyTheme(u.theme);
      App.saveState('user');
      entry.onClose = null;
      App.closeModal();
      if (typeof App.renderHeader === 'function') App.renderHeader();
      App.router();
      var m = mainEl();
      if (m) { try { m.focus({ preventScroll: true }); } catch (e) { try { m.focus(); } catch (e2) {} } }
      toast('Настройка завершена. Удачного обучения', 'success');
    }

    function paint() {
      var d = onboardingDraft;
      var stepHtml = '';
      if (d.step === 1) {
        stepHtml =
          '<label style="display:block;">Как к вам обращаться' +
          '<input data-ob="name" type="text" maxlength="60" value="' + esc(d.name) + '" placeholder="Студент" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;margin-top:4px;"></label>' +
          '<p style="font-size:12px;opacity:0.75;">Допустимы буквы, цифры, пробел и дефис. Пустое поле — «Студент».</p>';
      } else if (d.step === 2) {
        stepHtml =
          '<label style="display:block;">Ваша роль<select data-ob="role" style="width:100%;min-height:44px;border:1px solid #D4AF37;margin-top:4px;">' +
          ['Junior QA', 'Middle QA', 'Тестировщик-стажёр', 'Другое'].map(function (r) {
            return '<option value="' + esc(r) + '"' + (d.role === r ? ' selected' : '') + '>' + esc(r) + '</option>';
          }).join('') + '</select></label>' +
          '<label style="display:block;margin-top:8px;"' + (d.role === 'Другое' ? '' : ' hidden') + ' data-ob-otherwrap>Уточните роль' +
          '<input data-ob="roleOther" type="text" maxlength="40" value="' + esc(d.roleOther) + '" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;margin-top:4px;"></label>';
      } else if (d.step === 3) {
        stepHtml =
          '<label style="display:block;">Недельная цель, часов<input data-ob="weeklyGoal" type="number" min="1" max="14" value="' + d.weeklyGoal + '" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;margin-top:4px;"></label>' +
          '<label style="display:block;margin-top:8px;">Дневной лимит, минут<input data-ob="dailyLimit" type="number" min="15" max="240" value="' + d.dailyLimit + '" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;margin-top:4px;"></label>' +
          '<p style="font-size:12px;opacity:0.75;">Цель от 1 до 14 часов в неделю, лимит от 15 до 240 минут в день.</p>';
      } else if (d.step === 4) {
        stepHtml =
          '<fieldset style="border:1px solid #D4AF37;padding:8px;"><legend style="font-size:13px;">Оформление</legend>' +
          ['system', 'light', 'dark'].map(function (t) {
            var label = t === 'system' ? 'Системная' : t === 'light' ? 'Светлая' : 'Тёмная';
            return '<label style="display:flex;align-items:center;gap:8px;min-height:44px;">' +
              '<input type="radio" name="ob-theme" data-ob="theme" value="' + t + '"' + (d.theme === t ? ' checked' : '') + '> ' + label + '</label>';
          }).join('') + '</fieldset>';
      } else {
        var roleFinal = d.role === 'Другое' ? (String(d.roleOther || '').trim() || 'Другое') : d.role;
        var nameFinal = String(d.name || '').trim();
        if (!nameFinal || !NAME_RE.test(nameFinal)) nameFinal = 'Студент';
        stepHtml =
          '<p style="font-size:14px;">' + esc(nameFinal) + ', роль «' + esc(roleFinal) + '». Цель — ' +
          clampNum(d.weeklyGoal, 1, 14) + ' ч в неделю при лимите ' + clampNum(d.dailyLimit, 15, 240) + ' мин в день.</p>' +
          '<p style="font-size:13px;opacity:0.8;">Все данные останутся на этом компьютере. Начните с раздела «Курс», ведите конспект и закрепляйте темы практикой — артефакты попадут в портфолио.</p>';
      }

      body.innerHTML =
        '<p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;margin:0 0 8px;">Шаг ' + d.step + ' из 5</p>' +
        stepHtml +
        '<div class="modal__actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;">' +
        (d.step > 1 ? '<button type="button" data-obnav="back" class="btn" style="min-height:44px;">Назад</button>' : '') +
        (d.step < 5
          ? '<button type="button" data-obnav="next" class="btn btn--primary" style="min-height:44px;">Далее</button>'
          : '<button type="button" data-obnav="finish" class="btn btn--primary" style="min-height:44px;">Начать обучение</button>') +
        '<button type="button" data-obnav="skip" class="btn" style="min-height:44px;margin-left:auto;">Пропустить</button>' +
        '</div>';

      var firstInput = body.querySelector('input, select');
      if (firstInput) { try { firstInput.focus(); } catch (e) {} }
    }

    function collect() {
      var d = onboardingDraft;
      var nameEl = body.querySelector('[data-ob="name"]');
      if (nameEl) d.name = nameEl.value;
      var roleEl = body.querySelector('[data-ob="role"]');
      if (roleEl) d.role = roleEl.value;
      var otherEl = body.querySelector('[data-ob="roleOther"]');
      if (otherEl) d.roleOther = otherEl.value;
      var wEl = body.querySelector('[data-ob="weeklyGoal"]');
      if (wEl) d.weeklyGoal = wEl.value;
      var lEl = body.querySelector('[data-ob="dailyLimit"]');
      if (lEl) d.dailyLimit = lEl.value;
      var themeEl = body.querySelector('[data-ob="theme"]:checked');
      if (themeEl) d.theme = themeEl.value;
    }

    body.addEventListener('change', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-ob') === 'role') {
        collect();
        paint();
      }
    });
    body.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-obnav]');
      if (!nav) return;
      var a = nav.getAttribute('data-obnav');
      collect();
      if (a === 'next') { onboardingDraft.step = Math.min(5, onboardingDraft.step + 1); paint(); }
      else if (a === 'back') { onboardingDraft.step = Math.max(1, onboardingDraft.step - 1); paint(); }
      else if (a === 'finish') finish(false);
      else if (a === 'skip') finish(true);
    });

    entry.onClose = function () {
      if (state.user.onboarded === false) finish(true);
    };
    paint();
  }

  /* ============================================================
     20. МОДАЛКИ-ДОПОЛНЕНИЯ И МЕТОДЫ App
     ============================================================ */
  var prevOpenModal = App.openModal;
  App.openModal = function (type, data) {
    data = data || {};
    if (typeof data.build !== 'function') {
      if (type === 'onboarding') {
        data.title = data.title || 'Настройка кабинета';
        data.build = buildOnboarding;
      } else if (type === 'search') {
        data.title = data.title || 'Поиск по кабинету';
        data.build = buildSearchModal;
      } else if (type === 'tag-manager') {
        data.title = data.title || 'Объединение тегов';
        data.build = buildTagManagerModal;
      } else if (type === 'sharing') {
        data.title = data.title || 'Обмен данными';
        data.build = buildSharingModal;
      } else if (type === 'presentation') {
        data.title = data.title || 'Режим презентации';
        data.build = buildPresentationModal;
      }
    }
    return prevOpenModal(type, data);
  };

  function buildSearchModal(body) {
    body.innerHTML =
      '<label style="display:block;"><span class="visually-hidden">Поисковый запрос</span>' +
      '<input data-sq type="search" placeholder="Заметки, вопросы, практика, портфолио" style="width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;"></label>' +
      '<div data-role="search-results" style="margin-top:12px;display:grid;gap:6px;max-height:320px;overflow:auto;"></div>';
    var input = body.querySelector('[data-sq]');
    var host = body.querySelector('[data-role="search-results"]');
    input.value = state.searchQuery || '';

    function paint() {
      var q = String(input.value || '').trim().toLowerCase();
      state.searchQuery = input.value;
      if (!q) { host.innerHTML = '<p style="font-size:13px;opacity:0.7;margin:0;">Введите запрос</p>'; return; }
      var results = [];
      toArr(state.notes).forEach(function (n) {
        if ((n.title + ' ' + n.content).toLowerCase().indexOf(q) !== -1) results.push({ label: n.title || 'Заметка', kind: 'Заметка', href: '#notes' });
      });
      Object.keys(state.lessons).forEach(function (k) {
        var l = state.lessons[k];
        if ((l.title + ' ' + (l.notes || '')).toLowerCase().indexOf(q) !== -1) results.push({ label: l.title, kind: 'Урок', href: '#course/lesson/' + l.id });
      });
      toArr(state.practice).forEach(function (p) {
        if (String(p.title || '').toLowerCase().indexOf(q) !== -1) results.push({ label: p.title || 'Артефакт', kind: 'Практика', href: '#practice' });
      });
      (state.portfolio || []).forEach(function (p) {
        if (String(p.title || '').toLowerCase().indexOf(q) !== -1) results.push({ label: p.title || 'Работа', kind: 'Портфолио', href: '#portfolio' });
      });
      results = results.slice(0, 30);
      if (!results.length) { host.innerHTML = '<p style="font-size:13px;opacity:0.7;margin:0;">Ничего не найдено</p>'; return; }
      host.innerHTML = results.map(function (r) {
        return '<a href="' + esc(r.href) + '" style="display:flex;justify-content:space-between;gap:8px;min-height:44px;align-items:center;padding:8px;border:1px solid #E8E0D0;text-decoration:none;color:#0A1929;">' +
          '<span style="font-size:13px;">' + esc(r.label) + '</span><span style="font-size:11px;opacity:0.65;">' + esc(r.kind) + '</span></a>';
      }).join('');
    }
    input.addEventListener('input', dbc(paint, 200));
    host.addEventListener('click', function (e) {
      if (e.target.closest('a')) App.closeModal();
    });
    paint();
  }

  function buildTagManagerModal(body) {
    var tags = (App.TagsManager && typeof App.TagsManager.getTagsWithCount === 'function')
      ? App.TagsManager.getTagsWithCount() : (state.tags || []);
    if (tags.length < 2) {
      body.innerHTML = '<p style="font-size:13px;">Для объединения нужно минимум два тега.</p>';
      return;
    }
    var opts = tags.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + ' · ' + (t.count || 0) + '</option>'; }).join('');
    body.innerHTML =
      '<label style="display:block;">Объединить тег<select data-mg="source" style="width:100%;min-height:44px;border:1px solid #D4AF37;margin-top:4px;">' + opts + '</select></label>' +
      '<label style="display:block;margin-top:8px;">В тег<select data-mg="target" style="width:100%;min-height:44px;border:1px solid #D4AF37;margin-top:4px;">' + opts + '</select></label>' +
      '<p style="font-size:12px;opacity:0.75;">Исходный тег будет удалён, все записи получат целевой тег.</p>' +
      '<div class="modal__actions" style="margin-top:12px;"><button type="button" data-mgsave class="btn btn--primary" style="min-height:44px;">Объединить</button></div>';
    body.querySelector('[data-mgsave]').addEventListener('click', function () {
      var src = body.querySelector('[data-mg="source"]').value;
      var dst = body.querySelector('[data-mg="target"]').value;
      if (src === dst) { toast('Выберите разные теги', 'warning'); return; }
      if (App.TagsManager && typeof App.TagsManager.merge === 'function') {
        App.TagsManager.merge(src, dst);
        App.closeModal();
        if (state.currentRoute === 'settings/tags') renderSettingsTags();
      }
    });
  }

  function buildSharingModal(body) {
    body.innerHTML =
      '<p style="font-size:13px;">Обмен идёт только локальными файлами. Полные настройки — в разделе «Обмен данными».</p>' +
      '<div class="modal__actions" style="display:flex;gap:8px;margin-top:12px;">' +
      '<a href="#settings/sharing" class="btn btn--primary" style="min-height:44px;display:inline-flex;align-items:center;padding:0 14px;text-decoration:none;">Открыть раздел</a></div>';
    body.querySelector('a').addEventListener('click', function () { App.closeModal(); });
  }

  function buildPresentationModal(body) {
    var items = (state.portfolio || []).filter(function (p) {
      return p.presentationReady === true && p.status !== 'draft';
    });
    body.innerHTML =
      '<p style="font-size:13px;">Отобрано работ: ' + items.length + '.</p>' +
      '<div class="modal__actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">' +
      '<button type="button" data-prs="start" class="btn btn--primary" style="min-height:44px;">Запустить</button>' +
      '<button type="button" data-prs="html" class="btn" style="min-height:44px;">Экспорт HTML</button>' +
      '<button type="button" data-prs="md" class="btn" style="min-height:44px;">Экспорт Markdown</button></div>';
    body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-prs]');
      if (!b) return;
      var PM = App.PresentationManager;
      if (!PM) { toast('Менеджер презентации недоступен', 'danger'); return; }
      var a = b.getAttribute('data-prs');
      App.closeModal();
      if (a === 'start') window.location.hash = '#portfolio/presentation';
      else if (a === 'html' && typeof PM.exportHTML === 'function') PM.exportHTML(items);
      else if (a === 'md' && typeof PM.exportMarkdown === 'function') PM.exportMarkdown(items);
    });
  }

  /* ---------- методы App ---------- */
  App.navigate = function (path) {
    var p = String(path || '');
    window.location.hash = p.charAt(0) === '#' ? p : '#' + p;
  };

  App.toggleLesson = function (id) {
    var rec = state.lessons[id];
    if (!rec) return false;
    if (typeof App.computeLessonStatus === 'function') rec.status = App.computeLessonStatus(rec);
    App.markDirty('lessons', id);
    App.saveState('lessons');
    if (rec.status === 'done' && typeof App.ensureFlashcards === 'function') {
      var created = App.ensureFlashcards(id);
      if (created) toast('Создано карточек: ' + created, 'success');
    }
    return rec.status === 'done';
  };

  App.toggleTest = function (runId, index, isPassed) {
    var rec = state.practice[runId];
    if (!rec || !Array.isArray(rec.rows) || !rec.rows[index]) return false;
    var cols = (App.TABLE_COLUMNS && App.TABLE_COLUMNS[rec.templateKind]) ? App.TABLE_COLUMNS[rec.templateKind] : [];
    var statusCol = cols.indexOf('Статус');
    if (statusCol === -1) return false;
    rec.rows[index][statusCol] = isPassed ? 'pass' : 'fail';
    rec.updatedAt = nowIso();
    App.markDirty('practice', runId);
    App.saveState('practice');
    return true;
  };

  App.quickNote = function () {
    var note = {
      id: genId(), title: 'Быстрая заметка', content: '', type: 'plain',
      moduleId: null, topicId: state.meta.lastLessonId || null,
      createdAt: nowIso(), updatedAt: nowIso(), tags: [], category: null,
      importance: 1, pinned: false, source: '', conclusion: ''
    };
    state.notes[note.id] = note;
    App.markDirty('notes', note.id);
    App.saveState('notes');
    toast('Заметка создана', 'success');
    App.navigate('#notes');
    return note.id;
  };

  App.applyTagFilter = function (tagIds) {
    state.searchFilters.tags = Array.isArray(tagIds) ? tagIds.slice() : [];
    App.saveState('ui');
    App.router();
  };
  App.applyCategoryFilter = function (categoryId) {
    state.searchFilters.category = categoryId || null;
    App.saveState('ui');
    App.router();
  };
  App.toggleCompactView = function (force) {
    state.ui.compactView = (typeof force === 'boolean') ? force : !state.ui.compactView;
    var wrapper = document.getElementById('app-wrapper');
    if (wrapper) wrapper.classList.toggle('compact-view', state.ui.compactView);
    App.saveState('ui');
    return state.ui.compactView;
  };

  App.showTabConflictModal = function (info) {
    App.openModal('tab-conflict', {
      title: 'Изменения в другой вкладке',
      build: function (body) {
        body.innerHTML =
          '<p style="font-size:13px;">Данные были изменены в другой вкладке (' + esc(info && info.source ? info.source : 'storage') + '). ' +
          'Выберите, какую версию оставить.</p>' +
          '<div class="modal__actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">' +
          '<button type="button" data-tc="keep" class="btn btn--primary" style="min-height:44px;">Сохранить текущие</button>' +
          '<button type="button" data-tc="reload" class="btn" style="min-height:44px;">Загрузить обновлённые</button></div>';
        body.addEventListener('click', function (e) {
          var b = e.target.closest('[data-tc]');
          if (!b) return;
          if (b.getAttribute('data-tc') === 'keep') {
            App.saveState('lessons');
            App.saveState('user');
            App.closeModal();
            toast('Оставлена текущая версия', 'info');
          } else {
            window.location.reload();
          }
        });
      }
    });
  };

  /* ---------- формы-инициализаторы ---------- */
  App.initProjectForm = function (container, record, onSave) {
    var schema = [
      { name: 'title', label: 'Название', type: 'text', maxLength: 200 },
      { name: 'goal', label: 'Цель', type: 'textarea', maxLength: 2000 },
      { name: 'scope', label: 'Объём работ', type: 'textarea', maxLength: 3000 },
      { name: 'result', label: 'Результат', type: 'textarea', maxLength: 3000 }
    ];
    return buildGenericForm(container, schema, record, onSave);
  };
  App.initBugForm = function (container, record, onSave) {
    var schema = [
      { name: 'title', label: 'Заголовок', type: 'text', maxLength: 200 },
      { name: 'environment', label: 'Окружение', type: 'text', maxLength: 200 },
      { name: 'steps', label: 'Шаги воспроизведения', type: 'textarea', maxLength: 4000 },
      { name: 'expected', label: 'Ожидаемый результат', type: 'textarea', maxLength: 2000 },
      { name: 'actual', label: 'Фактический результат', type: 'textarea', maxLength: 2000 },
      { name: 'severity', label: 'Severity', type: 'select', options: ['blocker', 'critical', 'major', 'minor', 'trivial'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'] }
    ];
    var api = buildGenericForm(container, schema, record, onSave);
    schema.forEach(function (f) {
      if (typeof App.attachFieldHint === 'function') {
        var input = container.querySelector('[name="' + f.name + '"]');
        if (input) App.attachFieldHint(input, f.name);
      }
    });
    return api;
  };
  App.initTestRunForm = function (container, record, onSave) {
    var schema = [
      { name: 'title', label: 'Название прогона', type: 'text', maxLength: 200 },
      { name: 'build', label: 'Сборка', type: 'text', maxLength: 100 },
      { name: 'notes', label: 'Примечания', type: 'textarea', maxLength: 3000 }
    ];
    return buildGenericForm(container, schema, record, onSave);
  };
  App.initNotesEditor = function (container, value, onChange) {
    if (typeof Editor !== 'undefined' && typeof Editor.create === 'function') {
      try {
        return Editor.create(container, { value: value || '', maxLength: 20000, placeholder: 'Пишите своими словами', onChange: onChange });
      } catch (e) {}
    }
    var ta = document.createElement('textarea');
    ta.rows = 10;
    ta.maxLength = 20000;
    ta.value = value || '';
    ta.style.cssText = 'width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;word-break:break-word;';
    container.replaceChildren(ta);
    ta.addEventListener('input', function () { if (typeof onChange === 'function') onChange(ta.value); });
    return {
      getValue: function () { return ta.value; },
      setValue: function (v) { ta.value = v; },
      focus: function () { ta.focus(); },
      destroy: function () { if (ta.parentNode) ta.parentNode.removeChild(ta); }
    };
  };
  App.initTagManager = function () { App.openModal('tag-manager'); };
  App.initSharing = function () { App.openModal('sharing'); };
  App.initPresentation = function () { App.openModal('presentation'); };

  function buildGenericForm(container, schema, record, onSave) {
    var values = record || {};
    if (typeof Forms !== 'undefined' && typeof Forms.FormManager === 'function') {
      try {
        var fm = Forms.FormManager(container, schema, {
          onChange: function (v) { if (typeof onSave === 'function') onSave(v); },
          onSubmit: function (v) { if (typeof onSave === 'function') onSave(v); }
        });
        if (fm && typeof fm.setValues === 'function') fm.setValues(values);
        return fm;
      } catch (e) {}
    }
    var form = document.createElement('div');
    form.style.cssText = 'display:grid;gap:10px;';
    var inputs = {};
    schema.forEach(function (f) {
      var label = document.createElement('label');
      label.style.display = 'block';
      label.textContent = f.label;
      var input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
        input.style.cssText = 'width:100%;min-height:44px;padding:8px;border:1px solid #D4AF37;word-break:break-word;';
      } else if (f.type === 'select') {
        input = document.createElement('select');
        input.style.cssText = 'width:100%;min-height:44px;border:1px solid #D4AF37;';
        (f.options || []).forEach(function (o) {
          var opt = document.createElement('option');
          opt.value = o;
          opt.textContent = o;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
        input.style.cssText = 'width:100%;min-height:44px;padding:0 8px;border:1px solid #D4AF37;';
      }
      input.name = f.name;
      if (f.maxLength) input.maxLength = f.maxLength;
      input.value = values[f.name] !== undefined ? values[f.name] : '';
      inputs[f.name] = input;
      input.addEventListener('input', collectAndSave);
      input.addEventListener('change', collectAndSave);
      label.appendChild(input);
      form.appendChild(label);
    });
    function collectAndSave() {
      var out = {};
      Object.keys(inputs).forEach(function (k) { out[k] = inputs[k].value; });
      if (typeof onSave === 'function') onSave(out);
    }
    container.replaceChildren(form);
    return {
      getValues: function () {
        var out = {};
        Object.keys(inputs).forEach(function (k) { out[k] = inputs[k].value; });
        return out;
      },
      setValues: function (v) {
        Object.keys(inputs).forEach(function (k) { if (v[k] !== undefined) inputs[k].value = v[k]; });
      },
      validate: function () {
        var ok = true;
        Object.keys(inputs).forEach(function (k) { if (!String(inputs[k].value || '').trim()) ok = false; });
        return ok;
      },
      destroy: function () { container.replaceChildren(); }
    };
  }

  /* ---------- хоткеи ---------- */
  App.hotkeys = {
    quickNote: function () { App.quickNote(); },
    lessonPrev: function () {
      var nav = App.lessonNav;
      if (nav && nav.prev) App.navigate('#course/lesson/' + nav.prev);
    },
    lessonNext: function () {
      var nav = App.lessonNav;
      if (nav && nav.next) App.navigate('#course/lesson/' + nav.next);
    },
    focusSearch: function () {
      var input = document.getElementById('header-search');
      if (input) { try { input.focus(); input.select(); } catch (e) {} }
      else App.openModal('search');
    },
    closeTopLayer: function () {
      if (typeof App.getTopModal === 'function' && App.getTopModal()) { App.closeModal(); return true; }
      if (document.documentElement.classList.contains('presentation-mode')) {
        if (App.PresentationManager && typeof App.PresentationManager.exit === 'function') {
          App.PresentationManager.exit();
          return true;
        }
      }
      var sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('sidebar--open')) {
        if (typeof App.closeMobileSidebar === 'function') App.closeMobileSidebar();
        return true;
      }
      return false;
    }
  };

  App.onSearch = function (query) {
    state.searchQuery = query;
    if (state.currentRoute === 'notes' && typeof App.renderNotes === 'function') App.renderNotes();
    else if (state.currentRoute === 'questions' && typeof App.renderQuestions === 'function') App.renderQuestions();
  };

  /* ---------- остановка таймера при уходе с раздела ---------- */
  var prevRouter = App.router;
  App.router = function () {
    var leaving = state.currentRoute;
    var result = prevRouter.apply(this, arguments);
    if (leaving === 'pomodoro' && state.currentRoute !== 'pomodoro') {
      if (ps.timerId) {
        stopTimer();
        if (sessionStartedAt) recordSession();
        ps.phase = 'paused';
        ps.pausedPhase = 'work';
      }
    }
    var wrapper = document.getElementById('app-wrapper');
    if (wrapper) wrapper.classList.toggle('compact-view', !!state.ui.compactView);
    return result;
  };

  /* ---------- регистрация маршрутов ---------- */
  App.renderPomodoro = renderPomodoro;
  App.renderStats = renderStats;
  App.renderResources = renderResources;
  App.renderSettings = renderSettings;
  App.renderSettingsTags = renderSettingsTags;
  App.renderSettingsSharing = renderSettingsSharing;

  App.registerRoute('pomodoro', renderPomodoro);
  App.registerRoute('stats', renderStats);
  App.registerRoute('resources', renderResources);
  App.registerRoute('settings', renderSettings);
  App.registerRoute('settings/tags', renderSettingsTags);
  App.registerRoute('settings/sharing', renderSettingsSharing);

})(window);
