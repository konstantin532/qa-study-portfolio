/* main.js — основная логика, роутинг, инициализация */
/* ЧАСТЬ 1 из 6: Ядро, инициализация, роутер */

/* Debug compatibility layer */
(function () {
  'use strict';

  var debug = window.Debug = window.Debug || {};
  var performanceTimers = {};

  if (typeof debug.debug !== 'function') {
    debug.debug = console.debug.bind(console);
  }

  if (typeof debug.info !== 'function') {
    debug.info = console.info.bind(console);
  }

  if (typeof debug.warn !== 'function') {
    debug.warn = console.warn.bind(console);
  }

  if (typeof debug.error !== 'function') {
    debug.error = console.error.bind(console);
  }

  if (typeof debug.perfStart !== 'function') {
    debug.perfStart = function (name) {
      performanceTimers[name] = performance.now();
    };
  }

  if (typeof debug.perfEnd !== 'function') {
    debug.perfEnd = function (name) {
      if (!Object.prototype.hasOwnProperty.call(performanceTimers, name)) {
        return 0;
      }

      var duration = performance.now() - performanceTimers[name];
      delete performanceTimers[name];

      debug.debug(
        '[Performance] ' + name + ': ' + duration.toFixed(2) + ' ms'
      );

      return duration;
    };
  }

  if (typeof debug.init !== 'function') {
    debug.init = function () {
      debug.enabled = true;
      debug.info('Debug initialized');
    };
  }

  if (typeof debug.enabled === 'undefined') {
    debug.enabled = true;
  }
})();

/* ЧАСТЬ 1 из 6: Ядро, инициализация, роутер */

(function () {
  'use strict';

var App = window.App = {};
var QAApp = window.QAApp = window.QAApp || {};

  // ========================================================================
  // CONFIG
  // ========================================================================

  App.config = {
    defaultRoute: 'dashboard',
    animationDuration: 200,
    scrollRestore: true,
    saveIndicatorDuration: 1500,
    toastDuration: 3000,
    onboardingRequired: true,
    breadcrumbMax: 5
  };

  // ========================================================================
  // STATE
  // ========================================================================

  App.state = {
    currentRoute: null,
    previousRoute: null,
    routeParams: {},
    sidebarCollapsed: false,
    sidebarMobileOpen: false,
    compactView: false,
    presentationMode: false,
    isEditing: false,
    hasUnsavedChanges: false,
    searchQuery: '',
    searchResults: [],
    breadcrumbs: [],
    contextPanelOpen: false,
    activeModal: null,
    pomodoroState: {
      mode: 'focus',
      running: false,
      remaining: 25 * 60,
      sessionsCompleted: 0
    },
    recentActivity: []
  };

  // ========================================================================
  // ROUTE METADATA (titles, breadcrumbs)
  // ========================================================================

  var ROUTE_META = {
    dashboard:      { title: 'Дашборд',         crumbs: ['Дашборд'] },
    roadmap:        { title: 'Дорожная карта',  crumbs: ['Дашборд', 'Дорожная карта'] },
    portfolio:     { title: 'Портфолио',       crumbs: ['Дашборд', 'Портфолио'] },
    artifacts:      { title: 'Артефакты',       crumbs: ['Дашборд', 'Артефакты'] },
    resources:      { title: 'Ресурсы',         crumbs: ['Дашборд', 'Ресурсы'] },
    glossary:       { title: 'Глоссарий',       crumbs: ['Дашборд', 'Глоссарий'] },
    pomodoro:       { title: 'Помодоро',        crumbs: ['Дашборд', 'Помодоро'] },
    'knowledge-map':{ title: 'Карта знаний',    crumbs: ['Дашборд', 'Карта знаний'] },
    templates:      { title: 'Шаблоны',         crumbs: ['Дашборд', 'Шаблоны'] },
    sharing:        { title: 'Экспорт',         crumbs: ['Дашборд', 'Экспорт'] },
    settings:       { title: 'Настройки',       crumbs: ['Дашборд', 'Настройки'] },
    about:          { title: 'О проекте',      crumbs: ['Дашборд', 'О проекте'] },
    help:           { title: 'Помощь',         crumbs: ['Дашборд', 'Помощь'] }
  };

  var ROUTE_TO_CRUMB_ROUTE = {
    'Дашборд': 'dashboard',
    'Дорожная карта': 'roadmap',
    'Портфолио': 'portfolio',
    'Артефакты': 'artifacts',
    'Ресурсы': 'resources',
    'Глоссарий': 'glossary',
    'Помодоро': 'pomodoro',
    'Карта знаний': 'knowledge-map',
    'Шаблоны': 'templates',
    'Экспорт': 'sharing',
    'Настройки': 'settings',
    'О проекте': 'about',
    'Помощь': 'help'
  };

  // ========================================================================
  // ROUTER
  // ========================================================================

  App.router = {

    routes: {},
    currentRoute: null,
    previousRoute: null,

    // ----------------------------------------------------------------
    // init — set up hashchange listener and nav-item click delegation
    // ----------------------------------------------------------------
    init: function () {
  var self = this;

  // Используем только один обработчик изменения hash
  window.addEventListener('hashchange', function () {
    self.handleRouteChange(Utils.url.getRoute());
  });

  // Делегирование кликов по навигации
  var navList = Utils.dom.$('.nav-list');

  if (navList) {
    Utils.event.delegate(navList, 'click', '.nav-item', function (e) {
      e.preventDefault();

      var route = Utils.dom.getData(this, 'route');

      if (route) {
        self.navigate(route);
      }
    });
  }

  Debug.info('Router initialized');
},

    // ----------------------------------------------------------------
    // register — map a route name to a handler function
    // ----------------------------------------------------------------
    register: function (route, handler) {
      this.routes[route] = handler;
    },

    // ----------------------------------------------------------------
    // navigate — change route, update hash, render
    // ----------------------------------------------------------------
    navigate: function (route, options) {
  options = options || {};

  route = String(route || App.config.defaultRoute)
    .replace(/^#/, '')
    .trim();

  if (!route) {
    route = App.config.defaultRoute;
  }

  var currentHash = window.location.hash.replace(/^#/, '');

  // Принудительный рендер без изменения URL
  if (options.force) {
    this.handleRouteChange(route);
    return;
  }

  // replaceState не создаёт hashchange, поэтому рендерим вручную
  if (options.replace) {
    history.replaceState(null, '', '#' + route);
    this.handleRouteChange(route);
    return;
  }

  // Если hash уже совпадает, события hashchange не будет
  if (currentHash === route) {
    if (this.currentRoute !== route) {
      this.handleRouteChange(route);
    }
    return;
  }

  // Обычный переход будет обработан единственным hashchange
  window.location.hash = route;
},
    // ----------------------------------------------------------------
    // handleRouteChange — triggered by hashchange or external listener
    // ----------------------------------------------------------------
    handleRouteChange: function (route) {
  route = route || Utils.url.getRoute() || App.config.defaultRoute;

  var parsed = Utils.url.parseRoute
    ? Utils.url.parseRoute(route)
    : {
        name: route,
        params: {},
        query: {}
      };

  var routeName = parsed.name || App.config.defaultRoute;

  this.previousRoute = this.currentRoute;
  this.currentRoute = routeName;

  App.state.previousRoute = this.previousRoute;
  App.state.currentRoute = routeName;
  App.state.routeParams = parsed.params || {};
  App.state.routeQuery = parsed.query || {};

  QAApp.currentRoute = routeName;

  Utils.storage.set(
    Utils.constants.STORAGE_KEYS.LAST_ROUTE,
    routeName
  );

  this.render(routeName);

  if (App.state.sidebarMobileOpen) {
    App.ui.closeMobileSidebar();
  }
},

    // ----------------------------------------------------------------
    // render — clear workspace, update nav, render page
    // ----------------------------------------------------------------
    render: function (route) {
      var self = this;
      var workspace = Utils.dom.$('#main-content');

      if (!workspace) {
        Debug.error('Router.render: workspace element not found');
        return;
      }

      // Start performance timer
      Debug.perfStart('router_render_' + route);
      // Clear workspace
      Utils.dom.empty(workspace);

      // Update active nav item
      self._updateActiveNav(route);

      // Update header title
      var meta = ROUTE_META[route];
      var title = meta ? meta.title : 'QA Study Portfolio';
      var headerTitle = Utils.dom.$('#page-header-title');
      if (headerTitle) {
        Utils.dom.setText(headerTitle, title);
      }
      document.title = title + ' — QA Study Portfolio';

      // Update breadcrumbs
      self._updateBreadcrumbs(route);

      // Scroll to top
      if (App.config.scrollRestore) {
        workspace.scrollTop = 0;
        if (App.state.mainContainer) {
          App.state.mainContainer.scrollTop = 0;
        }
      }

      // Find and call handler
      var handler = self.routes[route];
      if (handler) {
        try {
          handler();
        } catch (e) {
          Debug.error('Error rendering route "' + route + '"', e);
          self.renderError(workspace, e);
        }
      } else {
        self.renderNotFound();
      }

      // Update nav badges
      self._updateNavBadges();

      // End performance timer
      Debug.perfEnd('router_render_' + route);

      Debug.info('Route rendered: ' + route);
    },

    // ----------------------------------------------------------------
    // _updateActiveNav — highlight current nav item
    // ----------------------------------------------------------------
    _updateActiveNav: function (route) {
      var items = Utils.dom.$$('.nav-item');
      items.forEach(function (item) {
        var itemRoute = Utils.dom.getData(item, 'route');
        if (itemRoute === route) {
          Utils.dom.addClass(item, 'active');
          item.setAttribute('aria-current', 'page');
        } else {
          Utils.dom.removeClass(item, 'active');
          item.removeAttribute('aria-current');
        }
      });
    },

    // ----------------------------------------------------------------
    // _updateBreadcrumbs — render breadcrumb trail
    // ----------------------------------------------------------------
    _updateBreadcrumbs: function (route) {
      var bcEl = Utils.dom.$('#breadcrumbs .breadcrumb-list');
      if (!bcEl) return;

      Utils.dom.empty(bcEl);

      var meta = ROUTE_META[route];
      if (!meta || !meta.crumbs) return;

      App.state.breadcrumbs = [];

      meta.crumbs.forEach(function (crumbTitle, index) {
        var crumbRoute = ROUTE_TO_CRUMB_ROUTE[crumbTitle] || 'dashboard';
        var isLast = index === meta.crumbs.length - 1;

        App.state.breadcrumbs.push({ title: crumbTitle, route: crumbRoute });

        var li = Utils.dom.create('li', { class: 'breadcrumb-item' });

        if (isLast) {
          Utils.dom.setText(li, crumbTitle);
          Utils.dom.addClass(li, 'breadcrumb-current');
          li.setAttribute('aria-current', 'page');
        } else {
          var a = Utils.dom.create('a', {
            href: '#' + crumbRoute,
            text: crumbTitle
          });
          a.addEventListener('click', function (e) {
            e.preventDefault();
            App.router.navigate(crumbRoute);
          });
          li.appendChild(a);

          var sep = Utils.dom.create('span', {
            class: 'breadcrumb-sep',
            'aria-hidden': 'true',
            text: '/'
          });
          li.appendChild(sep);
        }

        bcEl.appendChild(li);
      });
    },

    // ----------------------------------------------------------------
    // _updateNavBadges — refresh progress badges in nav
    // ----------------------------------------------------------------
    _updateNavBadges: function () {
      try {
        var modules = CourseData.getModules();
        var navBadges = Utils.dom.$$('.nav-badge');
        navBadges.forEach(function (badge) {
          var navItem = badge.closest('.nav-item');
          if (!navItem) return;
          var route = Utils.dom.getData(navItem, 'route');

          if (route === 'artifacts') {
            var count = CourseData.getAllArtifacts ? CourseData.getAllArtifacts().length : 13;
            Utils.dom.setText(badge, String(count));
          } else if (route === 'glossary') {
            var glossaryCount = CourseData.getGlossaryCount ? CourseData.getGlossaryCount() : CourseData.getGlossary().length;
            Utils.dom.setText(badge, String(glossaryCount));
          } else if (route === 'templates') {
            var templates = CourseData.getTemplates();
            Utils.dom.setText(badge, String(templates.length));
          }
        });
      } catch (e) {
        Debug.warn('Failed to update nav badges: ' + e.message);
      }
    },

    // ----------------------------------------------------------------
    // getBreadcrumbs — return breadcrumb array for a route
    // ----------------------------------------------------------------
    getBreadcrumbs: function (route) {
      var meta = ROUTE_META[route];
      if (!meta || !meta.crumbs) {
        return [{ title: 'Дашборд', route: 'dashboard' }];
      }
      return meta.crumbs.map(function (title) {
        return {
          title: title,
          route: ROUTE_TO_CRUMB_ROUTE[title] || 'dashboard'
        };
      });
    },

    // ----------------------------------------------------------------
    // renderNotFound — 404 placeholder
    // ----------------------------------------------------------------
    renderNotFound: function () {
      var workspace = Utils.dom.$('#main-content');
      if (!workspace) return;

      var container = Utils.dom.create('div', { class: 'not-found' });
      var icon = Utils.dom.create('div', { class: 'not-found-icon', text: '404' });
      var title = Utils.dom.create('h2', { class: 'not-found-title', text: 'Страница не найдена' });
      var desc = Utils.dom.create('p', { class: 'not-found-desc', text: 'Запрошенная страница не существует или была перемещена.' });
      var btn = Utils.dom.create('button', {
        class: 'btn btn-primary',
        text: 'На главную'
      });
      btn.addEventListener('click', function () {
        App.router.navigate(App.config.defaultRoute);
      });

      container.appendChild(icon);
      container.appendChild(title);
      container.appendChild(desc);
      container.appendChild(btn);
      Utils.dom.empty(workspace);
      workspace.appendChild(container);
    },

    // ----------------------------------------------------------------
    // renderError — error placeholder during render
    // ----------------------------------------------------------------
    renderError: function (workspace, error) {
      if (!workspace) return;

      var container = Utils.dom.create('div', { class: 'render-error' });
      var title = Utils.dom.create('h2', { class: 'render-error-title', text: 'Ошибка рендеринга' });
      var desc = Utils.dom.create('p', { class: 'render-error-desc', text: error.message || String(error) });
      var btn = Utils.dom.create('button', {
        class: 'btn btn-outline',
        text: 'На главную'
      });
      btn.addEventListener('click', function () {
        App.router.navigate(App.config.defaultRoute);
      });

      container.appendChild(title);
      container.appendChild(desc);
      container.appendChild(btn);
      Utils.dom.empty(workspace);
      workspace.appendChild(container);
    }
  };

  // ========================================================================
  // PAGE RENDERERS (stubs — full implementation in Parts 2-4)
  // ========================================================================

  App.pages = {};

  App.pages.renderDashboard = function () { return null; };
  App.pages.renderRoadmap = function () { return null; };
  App.pages.renderPortfolio = function () { return null; };
  App.pages.renderArtifacts = function () { return null; };
  App.pages.renderResources = function () { return null; };
  App.pages.renderGlossary = function () { return null; };
  App.pages.renderPomodoro = function () { return null; };
  App.pages.renderKnowledgeMap = function () { return null; };
  App.pages.renderTemplates = function () { return null; };
  App.pages.renderSharing = function () { return null; };
  App.pages.renderSettings = function () { return null; };
  App.pages.renderAbout = function () { return null; };
  App.pages.renderHelp = function () { return null; };

  // ========================================================================
  // UI HELPERS (stubs — full implementation in Part 5)
  // ========================================================================

  App.ui = {
    showToast: function (message, type) {},
    showSaveIndicator: function () {},
    openModal: function (modalId) {},
    closeModal: function (modalId) {},
    openContextPanel: function (content) {},
    closeContextPanel: function () {},
    openMobileSidebar: function () {},
    closeMobileSidebar: function () {}
  };

  // ========================================================================
  // ROUTE REGISTRATION
  // ========================================================================

  App.registerRoutes = function () {
    App.router.register('dashboard', function () { App.pages.renderDashboard(); });
    App.router.register('roadmap', function () { App.pages.renderRoadmap(); });
    App.router.register('portfolio', function () { App.pages.renderPortfolio(); });
    App.router.register('artifacts', function () { App.pages.renderArtifacts(); });
    App.router.register('resources', function () { App.pages.renderResources(); });
    App.router.register('glossary', function () { App.pages.renderGlossary(); });
    App.router.register('pomodoro', function () { App.pages.renderPomodoro(); });
    App.router.register('knowledge-map', function () { App.pages.renderKnowledgeMap(); });
    App.router.register('templates', function () { App.pages.renderTemplates(); });
    App.router.register('sharing', function () { App.pages.renderSharing(); });
    App.router.register('settings', function () { App.pages.renderSettings(); });
    App.router.register('about', function () { App.pages.renderAbout(); });
    App.router.register('help', function () { App.pages.renderHelp(); });
    Debug.info('Routes registered: ' + Object.keys(App.router.routes).length);
  };

  // ========================================================================
  // DOM ELEMENTS COLLECTION
  // ========================================================================

  App._collectElements = function () {
    var els = {};
    var ids = [
      'app-wrapper', 'sidebar', 'main-container', 'header',
      'page-header-title', 'breadcrumbs', 'main-content',
      'context-panel', 'context-panel-content', 'modals',
      'toast-container', 'save-indicator', 'preloader',
      'search-input', 'theme-toggle', 'save-btn',
      'import-file-input', 'sidebar-overlay'
    ];

    ids.forEach(function (id) {
      els[id] = Utils.dom.$('#' + id);
      if (!els[id]) {
        Debug.warn('Element not found: #' + id);
      }
    });

    // Query by class
    els.searchClearBtn = Utils.dom.$('.search-clear-btn');
    els.sidebarToggle = Utils.dom.$('.sidebar-toggle');
    els.hamburgerBtn = Utils.dom.$('.hamburger-btn');
    els.quickNoteBtn = Utils.dom.$('#quick-note-btn');
    els.tagManagerBtn = Utils.dom.$('#tag-manager-btn');

    // Store on QAApp
    QAApp.elements = els;

    // Also store refs on App.state for convenience
    App.state.mainContainer = els['main-container'];

    return els;
  };

  // ========================================================================
  // STATE RESTORATION
  // ========================================================================

  App._restoreState = function () {
    // Sidebar collapsed
    var sidebarCollapsed = Utils.storage.get(Utils.constants.STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (sidebarCollapsed === true || sidebarCollapsed === 'true') {
      App.state.sidebarCollapsed = true;
      if (Utils.css.setSidebarCollapsed) {
        Utils.css.setSidebarCollapsed(true);
      }
    }

    // Compact view
    var compactView = Utils.storage.get(Utils.constants.STORAGE_KEYS.COMPACT_VIEW);
    if (compactView === true || compactView === 'true') {
      App.state.compactView = true;
      if (Utils.css.setCompactView) {
        Utils.css.setCompactView(true);
      }
    }

    // Theme button sync
    var currentTheme = Utils.css.getTheme
  ? Utils.css.getTheme()
  : 'light';

var themeToggleBtn =
  QAApp.elements &&
  QAApp.elements['theme-toggle'];

if (themeToggleBtn) {
  Utils.dom.setData(
    themeToggleBtn,
    'theme',
    currentTheme
  );
}
    // Last route
    var lastRoute = Utils.storage.get(Utils.constants.STORAGE_KEYS.LAST_ROUTE);
    if (lastRoute && ROUTE_META[lastRoute]) {
      App.state.currentRoute = lastRoute;
    } else {
      App.state.currentRoute = App.config.defaultRoute;
    }

    Debug.info('State restored: route=' + App.state.currentRoute +
      ', sidebar=' + (App.state.sidebarCollapsed ? 'collapsed' : 'expanded') +
      ', compact=' + (App.state.compactView ? 'on' : 'off'));
  };

  // ========================================================================
  // NAV SETUP
  // ========================================================================

  App._setupNavigation = function () {
    // Keyboard navigation: arrow keys on nav-list
    var navList = Utils.dom.$('.nav-list');
    if (navList) {
      navList.addEventListener('keydown', function (e) {
        var items = Utils.dom.$$('.nav-item', navList);
        var currentIndex = -1;
        items.forEach(function (item, i) {
          if (item === document.activeElement || item.contains(document.activeElement)) {
            currentIndex = i;
          }
        });

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          if (currentIndex >= 0 && currentIndex < items.length - 1) {
            items[currentIndex + 1].focus();
          }
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          if (currentIndex > 0) {
            items[currentIndex - 1].focus();
          }
        }
      });
    }

    Debug.info('Navigation setup complete');
  };

  // ========================================================================
  // HEADER BUTTONS SETUP
  // ========================================================================

  App._setupHeaderButtons = function () {
    var els = QAApp.elements;

    // Theme toggle
    if (els['theme-toggle']) {
      els['theme-toggle'].addEventListener('click', function () {
        if (Utils.css.toggleTheme) {
          Utils.css.toggleTheme();
          var newTheme = Utils.css.getTheme();
          Debug.info('Theme switched to: ' + newTheme);
          App.ui.showToast('Тема: ' + (newTheme === 'dark' ? 'тёмная' : 'светлая'), 'info');
        }
      });
    }

    // Save button
    if (els['save-btn']) {
      els['save-btn'].addEventListener('click', function () {
        App._saveState();
      });
    }

    // Quick note
    if (els.quickNoteBtn) {
      els.quickNoteBtn.addEventListener('click', function () {
        App.ui.openModal('quick-note-modal');
      });
    }

    // Tag manager
    if (els.tagManagerBtn) {
      els.tagManagerBtn.addEventListener('click', function () {
        App.ui.openModal('tag-manager-modal');
      });
    }

    // Search input — debounce
    if (els['search-input']) {
      var debouncedSearch = Utils.event.debounce(function (query) {
        App._handleSearch(query);
      }, Utils.constants.TIMING.DEBOUNCE_SEARCH || 300);

      els['search-input'].addEventListener('input', function (e) {
        var query = e.target.value.trim();
        App.state.searchQuery = query;

        // Show/hide clear button
        if (els.searchClearBtn) {
          if (query.length > 0) {
            Utils.dom.hide(els.searchClearBtn, false); // unhide
            els.searchClearBtn.hidden = false;
          } else {
            els.searchClearBtn.hidden = true;
          }
        }

        debouncedSearch(query);
      });

      // Enter key → open full search modal
      els['search-input'].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && App.state.searchQuery.length >= 2) {
          App.ui.openModal('search-modal');
          var modalInput = Utils.dom.$('#search-modal-input');
          if (modalInput) {
            modalInput.value = App.state.searchQuery;
            modalInput.dispatchEvent(new Event('input'));
          }
        }
      });
    }

    // Search clear button
    if (els.searchClearBtn) {
      els.searchClearBtn.addEventListener('click', function () {
        if (els['search-input']) {
          els['search-input'].value = '';
          App.state.searchQuery = '';
          App.state.searchResults = [];
          els.searchClearBtn.hidden = true;
          App._renderSearchResults([]);
        }
      });
    }

    Debug.info('Header buttons setup complete');
  };

  // ========================================================================
  // SEARCH HANDLER
  // ========================================================================

  App._handleSearch = function (query) {
    if (!query || query.length < 2) {
      App.state.searchResults = [];
      return;
    }

    if (CourseData.search) {
      App.state.searchResults = CourseData.search(query);
    } else {
      App.state.searchResults = [];
    }

    Debug.info('Search: "' + query + '" → ' + App.state.searchResults.length + ' results');
  };

  App._renderSearchResults = function (results) {
    // Stub — full implementation in Part 5
  };

  // ========================================================================
  // SIDEBAR TOGGLE SETUP
  // ========================================================================

  App._setupSidebarToggle = function () {
    var els = QAApp.elements;

    // Desktop collapse/expand
    if (els.sidebarToggle) {
      els.sidebarToggle.addEventListener('click', function () {
        App.state.sidebarCollapsed = !App.state.sidebarCollapsed;

        if (Utils.css.setSidebarCollapsed) {
          Utils.css.setSidebarCollapsed(App.state.sidebarCollapsed);
        }

        Utils.storage.set(Utils.constants.STORAGE_KEYS.SIDEBAR_COLLAPSED, App.state.sidebarCollapsed);

        // Update aria-expanded
        els.sidebarToggle.setAttribute('aria-expanded', !App.state.sidebarCollapsed);

        // Update icon direction
        var svg = els.sidebarToggle.querySelector('svg');
        if (svg) {
          svg.style.transform = App.state.sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0)';
        }

        // Trigger resize for charts after transition
        setTimeout(function () {
          if (window.Charts) {
            Charts.resize();
          }
        }, App.config.animationDuration + 50);

        Debug.info('Sidebar ' + (App.state.sidebarCollapsed ? 'collapsed' : 'expanded'));
      });
    }

    // Mobile hamburger
    if (els.hamburgerBtn) {
      els.hamburgerBtn.addEventListener('click', function () {
        if (App.state.sidebarMobileOpen) {
          App.ui.closeMobileSidebar();
        } else {
          App.ui.openMobileSidebar();
        }
      });
      els.hamburgerBtn.setAttribute('aria-expanded', 'false');
    }

    // Sidebar overlay (mobile)
    if (els['sidebar-overlay']) {
      els['sidebar-overlay'].addEventListener('click', function () {
        App.ui.closeMobileSidebar();
      });
    }

    Debug.info('Sidebar toggle setup complete');
  };

  // ========================================================================
  // CONTEXT PANEL SETUP
  // ========================================================================

  App._setupContextPanel = function () {
    var closeBtn = Utils.dom.$('#context-panel-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        App.ui.closeContextPanel();
      });
    }

    Debug.info('Context panel setup complete');
  };

  // ========================================================================
  // MODULE INITIALIZATION
  // ========================================================================

  App._initModules = function () {
    // Debug
    if (window.Debug && Debug.enabled) {
      try {
        Debug.init();
        Debug.info('Debug module initialized');
      } catch (e) {
        console.error('[App] Debug init failed:', e);
      }
    }

    // Charts
    if (window.Charts) {
      try {
        Charts.init();
        Debug.info('Charts module initialized');
      } catch (e) {
        Debug.error('Charts init failed', e);
      }
    }

    // Editor
    if (window.Editor && typeof Editor.init === 'function') {
      try {
        Editor.init();
        Debug.info('Editor module initialized');
      } catch (e) {
        Debug.error('Editor init failed', e);
      }
    }

    // Forms
    if (window.Forms && typeof Forms.init === 'function') {
      try {
        Forms.init();
        Debug.info('Forms module initialized');
      } catch (e) {
        Debug.error('Forms init failed', e);
      }
    }

    // Keyboard
    if (window.Keyboard && typeof Keyboard.init === 'function') {
      try {
        Keyboard.init();
        Debug.info('Keyboard module initialized');
      } catch (e) {
        Debug.error('Keyboard init failed', e);
      }
    }

    // ExportImport
    if (window.ExportImport && typeof ExportImport.init === 'function') {
      try {
        ExportImport.init();
        Debug.info('ExportImport module initialized');
      } catch (e) {
        Debug.error('ExportImport init failed', e);
      }
    }
  };

  // ========================================================================
  // ONBOARDING
  // ========================================================================

  App._checkOnboarding = function () {
    if (!App.config.onboardingRequired) return;

    var onboarded = Utils.storage.get(Utils.constants.STORAGE_KEYS.ONBOARDED);
    if (onboarded === true || onboarded === 'true') {
      return;
    }

    // Show onboarding modal
    var modal = Utils.dom.$('#onboarding-modal');
    if (!modal) return;

    modal.hidden = false;
    App.state.activeModal = 'onboarding-modal';

    // Wire up buttons
    var startBtn = Utils.dom.$('#onboarding-start-btn');
    var skipBtn = Utils.dom.$('#onboarding-skip-btn');
    var closeBtn = modal.querySelector('[data-modal-close]');

    var completeOnboarding = function () {
      Utils.storage.set(Utils.constants.STORAGE_KEYS.ONBOARDED, true);
      modal.hidden = true;
      App.state.activeModal = null;
      Debug.info('Onboarding completed');
    };

    if (startBtn) {
      startBtn.addEventListener('click', completeOnboarding);
    }
    if (skipBtn) {
      skipBtn.addEventListener('click', completeOnboarding);
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', completeOnboarding);
    }

    Debug.info('Onboarding modal shown');
  };

  // ========================================================================
  // SAVE STATE
  // ========================================================================

  App._saveState = function () {
    try {
      // Save current route
      if (App.state.currentRoute) {
        Utils.storage.set(Utils.constants.STORAGE_KEYS.LAST_ROUTE, App.state.currentRoute);
      }

      // Save UI state
      Utils.storage.set(Utils.constants.STORAGE_KEYS.SIDEBAR_COLLAPSED, App.state.sidebarCollapsed);
      Utils.storage.set(Utils.constants.STORAGE_KEYS.COMPACT_VIEW, App.state.compactView);

      // Save pomodoro state if active
      if (
  	App.state.pomodoroState.running ||
  	App.state.pomodoroState.sessionsCompleted > 0
	) {
  	var storedPomodoro = Utils.storage.getSub('pomodoro') || {};
  	var pomodoroState = App.state.pomodoroState;

  	storedPomodoro.mode = pomodoroState.mode;
  	storedPomodoro.running = pomodoroState.running;
  	storedPomodoro.remaining = pomodoroState.remaining;
  	storedPomodoro.sessionsCompleted = pomodoroState.sessionsCompleted;
  	storedPomodoro.savedAt = Date.now();

  	Utils.storage.setSub('pomodoro', storedPomodoro);
	}

      // Mark as saved
      App.state.hasUnsavedChanges = false;

      // Update save button
      var saveBtn = Utils.dom.$('#save-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
      }

      // Show save indicator
      App.ui.showSaveIndicator();

      Debug.info('State saved');
    } catch (e) {
      Debug.error('Save state failed', e);
      App.ui.showToast('Ошибка сохранения', 'error');
    }
  };

  // ========================================================================
  // RESIZE HANDLER
  // ========================================================================

  App._handleResize = function () {
    // Update compact view based on breakpoint
    var breakpoint = Utils.device.breakpoint();
    
    var isMobile = Utils.device.isMobile();

    // Auto-enable compact on mobile
    if (isMobile && !App.state.compactView) {
      App.state.compactView = true;
      if (Utils.css.setCompactView) {
        Utils.css.setCompactView(true);
      }
    }

    // Resize charts
    if (window.Charts) {
      Charts.resize();
    }

    // Close mobile sidebar on desktop
    if (!isMobile && App.state.sidebarMobileOpen) {
      App.ui.closeMobileSidebar();
    }

    Debug.debug('Resize handled: breakpoint=' + breakpoint + ', mobile=' + isMobile);
  };

  // ========================================================================
  // MAIN INITIALIZATION
  // ========================================================================

  App.init = function () {
    var startInit = function () {
      try {
        Debug.info('App initialization started');
        Debug.perfStart('app_init');

        // Step 2: Collect DOM elements
        App._collectElements();
        var els = QAApp.elements;

        // Validate critical elements
        var critical = ['app-wrapper', 'main-content', 'preloader'];
        var missing = critical.filter(function (id) { return !els[id]; });
        if (missing.length > 0) {
          Debug.error('Critical elements missing: ' + missing.join(', '));
        }

        // Step 3: Restore state
        App._restoreState();

        // Step 4: Initialize router
        App.router.init();

        // Step 5: Setup UI
        App._setupNavigation();
        App._setupHeaderButtons();
        App._setupSidebarToggle();
        App._setupContextPanel();

        // Skip link
        if (Utils.a11y.enableSkipLink) {
          Utils.a11y.enableSkipLink();
        }

        // Step 6: Сначала регистрируем основные маршруты.
// Они должны работать независимо от дополнительных модулей.
App.registerRoutes();

if (Object.keys(App.router.routes).length === 0) {
  console.error('[App] Маршруты не были зарегистрированы');
} else {
  console.log(
    '[App] Зарегистрировано маршрутов:',
    Object.keys(App.router.routes).length
  );
}

// Step 7: После этого инициализируем дополнительные модули
try {
  App._initModules();
} catch (moduleError) {
  console.error(
    '[App] Ошибка инициализации дополнительных модулей:',
    moduleError
  );
}

        // Step 8: Onboarding
        App._checkOnboarding();

        // Step 9: First render
        var initialRoute = App.state.currentRoute || App.config.defaultRoute;
        App.router.navigate(initialRoute, { replace: true });

        // Resize handler (throttled)
        var throttledResize = Utils.event.throttle(function () {
          App._handleResize();
        }, Utils.constants.TIMING.THROTTLE_RESIZE || 200);
        window.addEventListener('resize', throttledResize);

        // Theme change listener
        if (Utils.device.onThemeChange) {
          Utils.device.onThemeChange(function (theme) {
            Debug.info('System theme changed to: ' + theme);
            if (Utils.css.applySystemTheme) {
              Utils.css.applySystemTheme();
            }
          });
        }

        // Online/offline listeners
        window.addEventListener('online', function () {
          App.ui.showToast('Соединение восстановлено', 'success');
        });
        window.addEventListener('offline', function () {
          App.ui.showToast('Нет соединения с интернетом', 'warn');
        });

        // Beforeunload — warn about unsaved changes
        window.addEventListener('beforeunload', function (e) {
          if (App.state.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'Есть несохранённые изменения. Покинуть страницу?';
            return e.returnValue;
          }
        });

        // Step 10: Finalize — hide preloader
        if (els['app-wrapper']) {
          Utils.dom.addClass(els['app-wrapper'], 'loaded');
        }

        if (els.preloader) {
          Utils.dom.fadeOut(els.preloader, 300, function () {
            if (els.preloader && els.preloader.parentNode) {
              els.preloader.parentNode.removeChild(els.preloader);
            }
          });
        }

        QAApp.initialized = true;
        QAApp.currentRoute = App.state.currentRoute;

        Debug.perfEnd('app_init');
        Debug.info('Приложение инициализировано');
        Utils.a11y.announce('Приложение загружено');

      } catch (e) {
        Debug.error('Ошибка инициализации', e);

        // Show error toast if possible
        try {
          App.ui.showToast('Ошибка инициализации. Откройте консоль для деталей.', 'error');
        } catch (toastErr) {
          console.error('[App] Failed to show error toast:', toastErr);
        }

        // Hide preloader in any case
        var preloader = Utils.dom.$('#preloader');
        if (preloader) {
          Utils.dom.addClass(preloader, 'hidden');
          try {
            Utils.dom.fadeOut(preloader, 200, function () {
              if (preloader.parentNode) {
                preloader.parentNode.removeChild(preloader);
              }
            });
          } catch (fadeErr) {
            if (preloader.parentNode) {
              preloader.parentNode.removeChild(preloader);
            }
          }
        }

        // Make app visible even on error
        var wrapper = Utils.dom.$('#app-wrapper');
        if (wrapper) {
          Utils.dom.addClass(wrapper, 'loaded');
        }
      }
    };

    // Step 1: Check DOM readiness
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startInit);
    } else {
      startInit();
    }
  };

  // ========================================================================
  // DESTROY (optional cleanup)
  // ========================================================================

  App.destroy = function () {
    // Remove event listeners, clear intervals, etc.
    if (window.Charts) {
      Charts.destroy();
    }
    if (window.Debug) {
      // Don't destroy debug — it may be needed for logging
    }
    QAApp.initialized = false;
    Debug.info('App destroyed');
  };

  // ========================================================================
  // AUTO-START
  // ========================================================================

  // App.init() is called at the bottom of the full main.js file
  // (after all 6 parts are assembled)

})();
/* ЧАСТЬ 2 из 6: Рендереры страниц (Dashboard, Roadmap, Portfolio, Artifacts) */

(function () {
  'use strict';

  // ========================================================================
  // HELPER: Create page header
  // ========================================================================

  function pageHeader(title, subtitle) {
    var header = Utils.dom.create('div', { class: 'page-header' });
    Utils.dom.append(header, Utils.dom.create('h2', { class: 'page-title', text: title }));
    if (subtitle) {
      Utils.dom.append(header, Utils.dom.create('p', { class: 'page-subtitle', text: subtitle }));
    }
    return header;
  }

  // ========================================================================
  // HELPER: Create stat card
  // ========================================================================

  function statCard(icon, label, value, sub) {
    var card = Utils.dom.create('div', { class: 'stat-card' });
    var iconWrap = Utils.dom.create('div', { class: 'stat-card-icon', html: icon });
    var body = Utils.dom.create('div', { class: 'stat-card-body' });
    var valEl = Utils.dom.create('div', { class: 'stat-card-value', text: String(value) });
    var labelEl = Utils.dom.create('div', { class: 'stat-card-label', text: label });
    Utils.dom.append(body, valEl);
    Utils.dom.append(body, labelEl);
    if (sub) {
      Utils.dom.append(body, Utils.dom.create('div', { class: 'stat-card-sub', text: sub }));
    }
    Utils.dom.append(card, iconWrap);
    Utils.dom.append(card, body);
    return card;
  }

  // ========================================================================
  // HELPER: Create empty state
  // ========================================================================

  function emptyState(icon, title, desc, btnText, btnAction) {
    var container = Utils.dom.create('div', { class: 'empty-state' });
    Utils.dom.append(container, Utils.dom.create('div', { class: 'empty-state-icon', html: icon }));
    Utils.dom.append(container, Utils.dom.create('h3', { class: 'empty-state-title', text: title }));
    if (desc) {
      Utils.dom.append(container, Utils.dom.create('p', { class: 'empty-state-desc', text: desc }));
    }
    if (btnText && btnAction) {
      var btn = Utils.dom.create('button', { class: 'btn btn-primary', text: btnText });
      btn.addEventListener('click', btnAction);
      Utils.dom.append(container, btn);
    }
    return container;
  }

  // ========================================================================
  // HELPER: SVG icons for cards
  // ========================================================================

  var ICONS = {
    book: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    lesson: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    artifact: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    clock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    checkDone: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    checkTodo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>',
    roadmap: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 6h8M7 8l4 8M17 8l-4 8"/></svg>',
    plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    eye: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    bug: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 13h-3M5 13h3M19 19l-3-2M5 19l3-2M12 6V4"/></svg>',
    testCase: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    checklist: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    testPlan: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    arrowRight: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    folder: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    doc: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
  };

  // Artifact type icons
  var ARTIFACT_ICONS = {
    bug_report: ICONS.bug,
    test_case: ICONS.testCase,
    checklist: ICONS.checklist,
    test_plan: ICONS.testPlan
  };

  var ARTIFACT_LABELS = {
    bug_report: 'Баг-репорт',
    test_case: 'Тест-кейс',
    checklist: 'Чек-лист',
    test_plan: 'Тест-план'
  };

  // ========================================================================
  // DASHBOARD
  // ========================================================================

  App.pages.renderDashboard = function () {
    Debug.perfStart('render_dashboard');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var modules = CourseData.getModules();
      var progress = Utils.storage.getSub('progress') || {};

      // Calculate statistics
      var totalModules = modules.length;
      var completedModules = modules.filter(function (mod) {
  	var lessons = CourseData.getLessons(mod.id);
  	var moduleProgress = progress[mod.id] || {};

  	return lessons.length > 0 && lessons.every(function (lesson) {
    	  return moduleProgress[lesson.id] === true;
  	});
	  }).length;

      var totalLessons = 0;
      var completedLessons = 0;
      modules.forEach(function (mod) {
        var lessons = CourseData.getLessons(mod.id);
        totalLessons += lessons.length;
        var modProgress = progress[mod.id] || {};
        completedLessons += lessons.filter(function (l) {
          return modProgress[l.id];
        }).length;
      });

      // Artifacts count
      var totalArtifacts = 0;
      modules.forEach(function (mod) {
        var lessons = CourseData.getLessons(mod.id);
        lessons.forEach(function (lesson) {
          var artifacts = CourseData.getArtifacts(lesson.id);
          totalArtifacts += artifacts.length;
        });
      });

      // Study time from pomodoro
      var pomoData = Utils.storage.getSub('pomodoro') || {};
      var studyTime = pomoData.totalMinutes || 0;

      // Root container
      var root = Utils.dom.create('div', { class: 'page page-dashboard' });

      // Greeting
      var greeting = Utils.dom.create('div', { class: 'dashboard-greeting' });
      var today = Utils.format.formatDateRu(new Date());
      var greetingTitle = Utils.dom.create('h2', {
        class: 'greeting-title',
        text: 'Добро пожаловать!'
      });
      var greetingDate = Utils.dom.create('p', {
        class: 'greeting-date',
        text: 'Сегодня ' + today
      });
      Utils.dom.append(greeting, greetingTitle);
      Utils.dom.append(greeting, greetingDate);
      Utils.dom.append(root, greeting);

      // Stats grid
      var statsGrid = Utils.dom.create('div', { class: 'stats-grid' });
      Utils.dom.append(statsGrid, statCard(
        ICONS.book, 'Модули',
        completedModules + ' / ' + totalModules,
        completedModules === totalModules ? 'Все завершены' : null
      ));
      Utils.dom.append(statsGrid, statCard(
        ICONS.lesson, 'Уроки',
        completedLessons + ' / ' + totalLessons,
        totalLessons > 0 ? Utils.format.formatPercent(Math.round(completedLessons / totalLessons * 100)) : null
      ));
      Utils.dom.append(statsGrid, statCard(
        ICONS.artifact, 'Артефакты',
        totalArtifacts,
        'всего создано'
      ));
      Utils.dom.append(statsGrid, statCard(
        ICONS.clock, 'Время в учёбе',
        Utils.format.formatDurationRu(studyTime * 60),
        studyTime > 0 ? 'минут всего' : 'начните учиться'
      ));
      Utils.dom.append(root, statsGrid);

      // Progress chart section
      var chartSection = Utils.dom.create('section', { class: 'dashboard-section' });
      var chartHeader = Utils.dom.create('div', { class: 'section-header' });
      Utils.dom.append(chartHeader, Utils.dom.create('h3', { class: 'section-title', text: 'Прогресс по модулям' }));
      var chartContainer = Utils.dom.create('div', {
        id: 'dashboard-progress-chart',
        class: 'chart-container'
      });
      Utils.dom.append(chartSection, chartHeader);
      Utils.dom.append(chartSection, chartContainer);
      Utils.dom.append(root, chartSection);

      // Build chart data
      var chartData = modules.map(function (mod, i) {
        var modProgress = progress[mod.id] || {};
        var lessons = CourseData.getLessons(mod.id);
        var done = lessons.filter(function (l) { return modProgress[l.id]; }).length;
        var pct = lessons.length > 0 ? Math.round(done / lessons.length * 100) : 0;
        return {
          id: mod.id,
          title: mod.title,
          progress: pct,
          colorIndex: i
        };
      });

      // Quick actions
      var actionsSection = Utils.dom.create('section', { class: 'dashboard-section' });
      Utils.dom.append(actionsSection, Utils.dom.create('h3', { class: 'section-title', text: 'Быстрые действия' }));
      var actionGrid = Utils.dom.create('div', { class: 'action-grid' });

      var actions = [
        { label: 'Продолжить обучение', desc: 'Открыть дорожную карту', route: 'roadmap', icon: ICONS.roadmap },
        { label: 'Создать артефакт', desc: 'Новый тест-кейс или баг-репорт', route: 'artifacts', icon: ICONS.plus, action: 'create-artifact' },
        { label: 'Открыть Помодоро', desc: 'Таймер для учёбы', route: 'pomodoro', icon: ICONS.clock },
        { label: 'Глоссарий', desc: 'Термины QA', route: 'glossary', icon: ICONS.book }
      ];

      actions.forEach(function (act) {
        var card = Utils.dom.create('button', { class: 'action-card' });
        var iconEl = Utils.dom.create('div', { class: 'action-card-icon', html: act.icon });
        var labelEl = Utils.dom.create('div', { class: 'action-card-label', text: act.label });
        var descEl = Utils.dom.create('div', { class: 'action-card-desc', text: act.desc });
        Utils.dom.append(card, iconEl);
        Utils.dom.append(card, labelEl);
        Utils.dom.append(card, descEl);
        card.addEventListener('click', function () {
          if (act.action === 'create-artifact') {
            App.router.navigate('artifacts');
            setTimeout(function () {
              if (window.Forms && Forms.showArtifactCreator) {
                Forms.showArtifactCreator();
              }
            }, 300);
          } else {
            App.router.navigate(act.route);
          }
        });
        Utils.dom.append(actionGrid, card);
      });
      Utils.dom.append(actionsSection, actionGrid);
      Utils.dom.append(root, actionsSection);

      // Current module (in-progress)
      var inProgressModule = modules.find(function (m) {
        var modProgress = progress[m.id] || {};
        var lessons = CourseData.getLessons(m.id);
        var done = lessons.filter(function (l) { return modProgress[l.id]; }).length;
        return done > 0 && done < lessons.length;
      });

      if (inProgressModule) {
        var modProgress = progress[inProgressModule.id] || {};
        var lessons = CourseData.getLessons(inProgressModule.id);
        var done = lessons.filter(function (l) { return modProgress[l.id]; }).length;
        var pct = Math.round(done / lessons.length * 100);

        var modSection = Utils.dom.create('section', { class: 'dashboard-section' });
        Utils.dom.append(modSection, Utils.dom.create('h3', { class: 'section-title', text: 'Текущий модуль' }));

        var modCard = Utils.dom.create('div', { class: 'current-module-card' });
        var modInfo = Utils.dom.create('div', { class: 'module-info' });
        Utils.dom.append(modInfo, Utils.dom.create('h4', { class: 'module-card-title', text: inProgressModule.title }));
        Utils.dom.append(modInfo, Utils.dom.create('p', { class: 'module-card-desc', text: inProgressModule.description }));

        // Progress bar
        var progressWrap = Utils.dom.create('div', { class: 'progress-bar-wrap' });
        var progressBar = Utils.dom.create('div', { class: 'progress-bar' });
        var progressFill = Utils.dom.create('div', { class: 'progress-bar-fill' });
        progressFill.style.width = pct + '%';
        Utils.dom.append(progressBar, progressFill);
        Utils.dom.append(progressWrap, progressBar);
        Utils.dom.append(progressWrap, Utils.dom.create('span', {
          class: 'progress-bar-text',
          text: done + ' / ' + lessons.length + ' (' + pct + '%)'
        }));
        Utils.dom.append(modInfo, progressWrap);

        var continueBtn = Utils.dom.create('button', {
          class: 'btn btn-primary',
          text: 'Продолжить'
        });
        continueBtn.addEventListener('click', function () {
          App.router.navigate('roadmap');
        });

        Utils.dom.append(modCard, modInfo);
        Utils.dom.append(modCard, continueBtn);
        Utils.dom.append(modSection, modCard);
        Utils.dom.append(root, modSection);
      }

      // Recent activity
      var recentActivity = App.state.recentActivity || [];
      if (recentActivity.length === 0) {
        var stored = Utils.storage.get(Utils.constants.STORAGE_KEYS.RECENT_ACTIVITY);
        if (Array.isArray(stored)) {
          recentActivity = stored;
          App.state.recentActivity = stored;
        }
      }

      var activitySection = Utils.dom.create('section', { class: 'dashboard-section' });
      Utils.dom.append(activitySection, Utils.dom.create('h3', { class: 'section-title', text: 'Последняя активность' }));

      if (recentActivity.length > 0) {
        var activityList = Utils.dom.create('ul', { class: 'activity-list' });
        recentActivity.slice(0, 5).forEach(function (activity) {
          var item = Utils.dom.create('li', { class: 'activity-item' });
          var time = activity.timestamp ? Utils.format.formatRelative(new Date(activity.timestamp)) : '';
          Utils.dom.append(item, Utils.dom.create('span', {
            class: 'activity-type',
            text: activity.type || 'действие'
          }));
          Utils.dom.append(item, Utils.dom.create('span', {
            class: 'activity-title',
            text: activity.title || ''
          }));
          Utils.dom.append(item, Utils.dom.create('span', {
            class: 'activity-time',
            text: time
          }));
          Utils.dom.append(activityList, item);
        });
        Utils.dom.append(activitySection, activityList);
      } else {
        Utils.dom.append(activitySection, Utils.dom.create('p', {
          class: 'empty-text',
          text: 'Пока нет активности. Начните изучать модули!'
        }));
      }
      Utils.dom.append(root, activitySection);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      // Render chart after DOM insertion
      if (window.Charts) {
        setTimeout(function () {
          Charts.renderProgress('dashboard-progress-chart', chartData, {});
        }, 50);
      }

      Debug.perfEnd('render_dashboard');
      return root;

    } catch (e) {
      Debug.error('Dashboard render failed', e);
      Debug.perfEnd('render_dashboard');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ========================================================================
  // ROADMAP
  // ========================================================================

  // Track current roadmap view mode
  var _roadmapView = Utils.storage.get(Utils.constants.STORAGE_KEYS.ROADMAP_VIEW) || 'list';

  App.pages.renderRoadmap = function () {
    Debug.perfStart('render_roadmap');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var modules = CourseData.getModules();
      var roadmap = CourseData.getRoadmap();
      var progress = Utils.storage.getSub('progress') || {};

      var root = Utils.dom.create('div', { class: 'page page-roadmap' });

      // Page header
      Utils.dom.append(root, pageHeader('Дорожная карта обучения', 'План вашего обучения от основ до продвинутых тем'));

      // View toggle
      var toggleWrap = Utils.dom.create('div', { class: 'view-toggle-wrap' });
      var toggleLabel = Utils.dom.create('span', { class: 'view-toggle-label', text: 'Вид:' });

      var btnList = Utils.dom.create('button', {
        class: 'btn btn-sm view-toggle-btn' + (_roadmapView === 'list' ? ' active' : ''),
        text: 'Список',
        'data-view': 'list'
      });
      var btnGraph = Utils.dom.create('button', {
        class: 'btn btn-sm view-toggle-btn' + (_roadmapView === 'graph' ? ' active' : ''),
        text: 'Граф',
        'data-view': 'graph'
      });

      btnList.addEventListener('click', function () {
        if (_roadmapView !== 'list') {
          _roadmapView = 'list';
          Utils.storage.set(Utils.constants.STORAGE_KEYS.ROADMAP_VIEW, 'list');
          App.pages.renderRoadmap();
        }
      });
      btnGraph.addEventListener('click', function () {
        if (_roadmapView !== 'graph') {
          _roadmapView = 'graph';
          Utils.storage.set(Utils.constants.STORAGE_KEYS.ROADMAP_VIEW, 'graph');
          App.pages.renderRoadmap();
        }
      });

      Utils.dom.append(toggleWrap, toggleLabel);
      Utils.dom.append(toggleWrap, btnList);
      Utils.dom.append(toggleWrap, btnGraph);
      Utils.dom.append(root, toggleWrap);

      // Content area
      var contentArea = Utils.dom.create('div', { class: 'roadmap-content' });

      if (_roadmapView === 'list') {
        Utils.dom.append(contentArea, _renderRoadmapList(modules, progress));
      } else {
        var graphContainer = Utils.dom.create('div', {
          id: 'roadmap-graph-chart',
          class: 'chart-container chart-roadmap-container'
        });
        Utils.dom.append(contentArea, graphContainer);
        // Render graph after DOM insertion
        setTimeout(function () {
          if (window.Charts) {
            Charts.renderRoadmapGraph('roadmap-graph-chart', roadmap, {});
          }
        }, 50);
      }

      Utils.dom.append(root, contentArea);
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      Debug.perfEnd('render_roadmap');
      return root;

    } catch (e) {
      Debug.error('Roadmap render failed', e);
      Debug.perfEnd('render_roadmap');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Roadmap list view (timeline)
  // ----------------------------------------------------------------

  function _renderRoadmapList(modules, progress) {
    var timeline = Utils.dom.create('div', { class: 'roadmap-timeline' });

    modules.forEach(function (mod, index) {
      var modProgress = progress[mod.id] || {};
      var lessons = CourseData.getLessons(mod.id);
      var doneCount = lessons.filter(function (l) { return modProgress[l.id]; }).length;
      var pct = lessons.length > 0 ? Math.round(doneCount / lessons.length * 100) : 0;
      var isComplete = pct === 100;
      var isInProgress = doneCount > 0 && pct < 100;
      var isLocked = mod.prerequisites && mod.prerequisites.length > 0 &&
        mod.prerequisites.some(function (dep) {
          var depProgress = progress[dep] || {};
          var depLessons = CourseData.getLessons(dep);
          var depDone = depLessons.filter(function (l) { return depProgress[l.id]; }).length;
          return depDone < depLessons.length;
        });

      var stage = Utils.dom.create('div', {
        class: 'timeline-stage' + (isComplete ? ' completed' : '') + (isInProgress ? ' in-progress' : '') + (isLocked ? ' locked' : '')
      });

      // Stage marker (number/icon)
      var marker = Utils.dom.create('div', { class: 'timeline-marker' });
      if (isComplete) {
        marker.innerHTML = ICONS.checkDone;
      } else if (isLocked) {
        marker.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
      } else {
        Utils.dom.append(marker, Utils.dom.create('span', { class: 'timeline-number', text: String(index + 1) }));
      }

      // Stage content
      var stageContent = Utils.dom.create('div', { class: 'timeline-content' });

      var stageHeader = Utils.dom.create('div', { class: 'timeline-stage-header' });
      Utils.dom.append(stageHeader, Utils.dom.create('h3', { class: 'timeline-stage-title', text: mod.title }));

      var statusBadge = Utils.dom.create('span', { class: 'status-badge' });
      if (isComplete) {
        statusBadge.textContent = 'Завершено';
        Utils.dom.addClass(statusBadge, 'status-completed');
      } else if (isInProgress) {
        statusBadge.textContent = 'В процессе';
        Utils.dom.addClass(statusBadge, 'status-active');
      } else if (isLocked) {
        statusBadge.textContent = 'Заблокировано';
        Utils.dom.addClass(statusBadge, 'status-locked');
      } else {
        statusBadge.textContent = 'Доступно';
        Utils.dom.addClass(statusBadge, 'status-available');
      }
      Utils.dom.append(stageHeader, statusBadge);
      Utils.dom.append(stageContent, stageHeader);

      // Description
      Utils.dom.append(stageContent, Utils.dom.create('p', { class: 'timeline-stage-desc', text: mod.description }));

      // Prerequisites info
      if (mod.prerequisites && mod.prerequisites.length > 0) {
        var prereqText = mod.prerequisites.map(function (depId) {
          var depMod = modules.find(function (m) { return m.id === depId; });
          return depMod ? depMod.title : depId;
        }).join(', ');
        Utils.dom.append(stageContent, Utils.dom.create('p', {
          class: 'timeline-prereq',
          text: 'Зависит от: ' + prereqText
        }));
      }

      // Progress bar
      if (lessons.length > 0) {
        var pbWrap = Utils.dom.create('div', { class: 'progress-bar-wrap' });
        var pb = Utils.dom.create('div', { class: 'progress-bar' });
        var pbFill = Utils.dom.create('div', { class: 'progress-bar-fill' });
        pbFill.style.width = pct + '%';
        Utils.dom.append(pb, pbFill);
        Utils.dom.append(pbWrap, pb);
        Utils.dom.append(pbWrap, Utils.dom.create('span', {
          class: 'progress-bar-text',
          text: doneCount + ' / ' + lessons.length + ' (' + pct + '%)'
        }));
        Utils.dom.append(stageContent, pbWrap);
      }

      // Lessons list
      if (lessons.length > 0) {
        var lessonList = Utils.dom.create('ul', { class: 'timeline-lessons' });
        lessons.forEach(function (lesson) {
          var isDone = !!modProgress[lesson.id];
          var lessonItem = Utils.dom.create('li', {
            class: 'timeline-lesson' + (isDone ? ' completed' : '')
          });

          var checkbox = Utils.dom.create('label', { class: 'lesson-checkbox' });
          var cb = Utils.dom.create('input', { type: 'checkbox' });
          cb.checked = isDone;
          if (isLocked) cb.disabled = true;

          cb.addEventListener('change', function () {
            // Toggle lesson completion
            var p = Utils.storage.getSub('progress') || {};
            if (!p[mod.id]) p[mod.id] = {};
            if (cb.checked) {
              p[mod.id][lesson.id] = true;
            } else {
              delete p[mod.id][lesson.id];
            }
            Utils.storage.setSub('progress', p);
            App.state.hasUnsavedChanges = true;
            var saveBtn = Utils.dom.$('#save-btn');
            if (saveBtn) saveBtn.disabled = false;
            // Re-render to update progress
            App.pages.renderRoadmap();
          });

          Utils.dom.append(checkbox, cb);
          Utils.dom.append(lessonItem, checkbox);

          var lessonInfo = Utils.dom.create('div', { class: 'lesson-info' });
          Utils.dom.append(lessonInfo, Utils.dom.create('span', {
            class: 'lesson-title',
            text: lesson.title
          }));
          Utils.dom.append(lessonInfo, Utils.dom.create('span', {
            class: 'lesson-meta',
            text: Utils.format.formatDurationRu(lesson.durationMinutes * 60)
          }));

          Utils.dom.append(lessonItem, lessonInfo);
          Utils.dom.append(lessonList, lessonItem);
        });
        Utils.dom.append(stageContent, lessonList);
      }

      // Duration info
      if (mod.durationWeeks) {
        Utils.dom.append(stageContent, Utils.dom.create('p', {
          class: 'timeline-duration',
          text: 'Длительность: ' + mod.durationWeeks + ' ' + Utils.format.pluralize(mod.durationWeeks, 'неделя', 'недели', 'недель')
        }));
      }

      // Assemble stage
      Utils.dom.append(stage, marker);
      Utils.dom.append(stage, stageContent);
      Utils.dom.append(timeline, stage);
    });

    return timeline;
  }

  // ========================================================================
  // PORTFOLIO
  // ========================================================================

  App.pages.renderPortfolio = function () {
    Debug.perfStart('render_portfolio');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var root = Utils.dom.create('div', { class: 'page page-portfolio' });

      // Page header with action button
      var headerRow = Utils.dom.create('div', { class: 'page-header-row' });
      var headerLeft = Utils.dom.create('div', { class: 'page-header-left' });
      Utils.dom.append(headerLeft, Utils.dom.create('h2', { class: 'page-title', text: 'Моё портфолио' }));
      Utils.dom.append(headerLeft, Utils.dom.create('p', { class: 'page-subtitle', text: 'Учебные проекты и работы' }));

      var addBtn = Utils.dom.create('button', { class: 'btn btn-primary' });
      Utils.dom.append(addBtn, Utils.dom.fromHTML('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'));
      Utils.dom.append(addBtn, Utils.dom.fromHTML('<span>Добавить проект</span>'));

      addBtn.addEventListener('click', function () {
        if (window.Forms && Forms.showProjectEditor) {
          Forms.showProjectEditor();
        } else {
          App.ui.showToast('Форма редактора недоступна', 'warn');
        }
      });

      Utils.dom.append(headerRow, headerLeft);
      Utils.dom.append(headerRow, addBtn);
      Utils.dom.append(root, headerRow);

      // Get portfolio items from storage
      var items = Utils.storage.get(Utils.constants.STORAGE_KEYS.PORTFOLIO_ITEMS);
      if (!Array.isArray(items)) {
        // Demo data
        items = _getDemoPortfolio();
      }

      // Filters
      var filterWrap = Utils.dom.create('div', { class: 'portfolio-filters' });

      // Status filter
      var statusFilter = Utils.dom.create('select', { class: 'filter-select', 'aria-label': 'Фильтр по статусу' });
      var statusOptions = [
        { value: 'all', label: 'Все статусы' },
        { value: 'draft', label: 'Черновики' },
        { value: 'published', label: 'Опубликованные' },
        { value: 'archived', label: 'Архив' }
      ];
      statusOptions.forEach(function (opt) {
        var option = Utils.dom.create('option', { value: opt.value, text: opt.label });
        Utils.dom.append(statusFilter, option);
      });

      // Sort select
      var sortSelect = Utils.dom.create('select', { class: 'filter-select', 'aria-label': 'Сортировка' });
      var sortOptions = [
        { value: 'date-desc', label: 'Сначала новые' },
        { value: 'date-asc', label: 'Сначала старые' },
        { value: 'title-asc', label: 'По названию (А-Я)' },
        { value: 'title-desc', label: 'По названию (Я-А)' }
      ];
      sortOptions.forEach(function (opt) {
        var option = Utils.dom.create('option', { value: opt.value, text: opt.label });
        Utils.dom.append(sortSelect, option);
      });

      Utils.dom.append(filterWrap, statusFilter);
      Utils.dom.append(filterWrap, sortSelect);
      Utils.dom.append(root, filterWrap);

      // Portfolio grid
      var grid = Utils.dom.create('div', { class: 'portfolio-grid' });

      // Current filter state
      var currentFilter = 'all';
      var currentSort = 'date-desc';

      function applyFiltersAndRender() {
        var filtered = items.filter(function (item) {
          if (currentFilter === 'all') return true;
          return item.status === currentFilter;
        });

        // Sort
        if (currentSort === 'date-desc') {
          filtered.sort(function (a, b) {
            return new Date(b.date || 0) - new Date(a.date || 0);
          });
        } else if (currentSort === 'date-asc') {
          filtered.sort(function (a, b) {
            return new Date(a.date || 0) - new Date(b.date || 0);
          });
        } else if (currentSort === 'title-asc') {
          filtered.sort(function (a, b) {
            return (a.title || '').localeCompare(b.title || '');
          });
        } else if (currentSort === 'title-desc') {
          filtered.sort(function (a, b) {
            return (b.title || '').localeCompare(a.title || '');
          });
        }

        Utils.dom.empty(grid);

        if (filtered.length === 0) {
          var empty = emptyState(
            ICONS.folder,
            'Нет проектов',
            'У вас пока нет проектов. Создайте первый!',
            'Создать проект',
            function () {
              if (window.Forms && Forms.showProjectEditor) {
                Forms.showProjectEditor();
              }
            }
          );
          Utils.dom.append(grid, empty);
        } else {
          filtered.forEach(function (item) {
            Utils.dom.append(grid, _renderPortfolioCard(item, items));
          });
        }
      }

      statusFilter.addEventListener('change', function () {
        currentFilter = statusFilter.value;
        applyFiltersAndRender();
      });
      sortSelect.addEventListener('change', function () {
        currentSort = sortSelect.value;
        applyFiltersAndRender();
      });

      Utils.dom.append(root, grid);
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      // Initial render
      applyFiltersAndRender();

      Debug.perfEnd('render_portfolio');
      return root;

    } catch (e) {
      Debug.error('Portfolio render failed', e);
      Debug.perfEnd('render_portfolio');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Portfolio card renderer
  // ----------------------------------------------------------------

  function _renderPortfolioCard(item, allItems) {
    var card = Utils.dom.create('div', { class: 'portfolio-card' });
    card.setAttribute('data-id', item.id || '');

    // Thumbnail / icon
    var thumb = Utils.dom.create('div', { class: 'portfolio-card-thumb' });
    thumb.innerHTML = ICONS.folder;

    // Body
    var body = Utils.dom.create('div', { class: 'portfolio-card-body' });
    Utils.dom.append(body, Utils.dom.create('h3', {
      class: 'portfolio-card-title',
      text: Utils.format.escapeHtml(item.title || 'Без названия')
    }));

    if (item.description) {
      Utils.dom.append(body, Utils.dom.create('p', {
        class: 'portfolio-card-desc',
        text: Utils.format.truncate(Utils.format.escapeHtml(item.description), 120)
      }));
    }

    // Tags
    if (item.tags && item.tags.length > 0) {
      var tagsWrap = Utils.dom.create('div', { class: 'portfolio-card-tags' });
      item.tags.slice(0, 4).forEach(function (tag) {
        Utils.dom.append(tagsWrap, Utils.dom.create('span', {
          class: 'tag',
          text: Utils.format.escapeHtml(tag)
        }));
      });
      if (item.tags.length > 4) {
        Utils.dom.append(tagsWrap, Utils.dom.create('span', {
          class: 'tag tag-more',
          text: '+' + (item.tags.length - 4)
        }));
      }
      Utils.dom.append(body, tagsWrap);
    }

    // Meta row
    var meta = Utils.dom.create('div', { class: 'portfolio-card-meta' });

    var statusLabels = { draft: 'Черновик', published: 'Опубликовано', archived: 'Архив' };
    var statusEl = Utils.dom.create('span', {
      class: 'portfolio-status status-' + (item.status || 'draft'),
      text: statusLabels[item.status] || 'Черновик'
    });
    Utils.dom.append(meta, statusEl);

    if (item.date) {
      Utils.dom.append(meta, Utils.dom.create('span', {
        class: 'portfolio-date',
        text: Utils.format.formatDateRu(new Date(item.date))
      }));
    }
    Utils.dom.append(body, meta);

    // Actions
    var actions = Utils.dom.create('div', { class: 'portfolio-card-actions' });

    var openBtn = Utils.dom.create('button', {
      class: 'btn-icon-sm',
      title: 'Открыть',
      'aria-label': 'Открыть проект'
    });
    openBtn.innerHTML = ICONS.eye;
    openBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _openPortfolioItem(item);
    });

    var editBtn = Utils.dom.create('button', {
      class: 'btn-icon-sm',
      title: 'Редактировать',
      'aria-label': 'Редактировать'
    });
    editBtn.innerHTML = ICONS.edit;
    editBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.Forms && Forms.showProjectEditor) {
        Forms.showProjectEditor(item);
      }
    });

    var delBtn = Utils.dom.create('button', {
      class: 'btn-icon-sm btn-danger-sm',
      title: 'Удалить',
      'aria-label': 'Удалить проект'
    });
    delBtn.innerHTML = ICONS.trash;
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _deletePortfolioItem(item, allItems);
    });

    Utils.dom.append(actions, openBtn);
    Utils.dom.append(actions, editBtn);
    Utils.dom.append(actions, delBtn);
    Utils.dom.append(body, actions);

    // Card click → open
    card.addEventListener('click', function () {
      _openPortfolioItem(item);
    });

    Utils.dom.append(card, thumb);
    Utils.dom.append(card, body);
    return card;
  }

  // ----------------------------------------------------------------
  // Portfolio helpers
  // ----------------------------------------------------------------

  function _getDemoPortfolio() {
    return [
      {
        id: 'demo_1',
        title: 'Тестирование формы регистрации',
        description: 'Проект по тестированию формы регистрации на учебном стенде. Включает тест-кейсы, баг-репорты и чек-листы.',
        tags: ['UI', 'формы', 'регистрация'],
        status: 'published',
        date: new Date(Date.now() - 7 * 86400000).toISOString()
      },
      {
        id: 'demo_2',
        title: 'API-тестирование корзины',
        description: 'Тестирование REST API для работы с корзиной интернет-магазина. Проверка статусов, валидации и edge cases.',
        tags: ['API', 'REST', 'корзина'],
        status: 'draft',
        date: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: 'demo_3',
        title: 'Кроссбраузерное тестирование',
        description: 'Проверка совместимости лендинга в Chrome, Firefox, Safari и Edge. Сравнение скриншотов и анализ расхождений.',
        tags: ['кроссбраузерность', 'лендинг'],
        status: 'archived',
        date: new Date(Date.now() - 30 * 86400000).toISOString()
      }
    ];
  }

  function _openPortfolioItem(item) {
    if (window.Forms && Forms.showProjectViewer) {
      Forms.showProjectViewer(item);
    } else {
      App.ui.showToast('Просмотр проекта недоступен', 'warn');
    }
  }

  function _deletePortfolioItem(item, allItems) {
    var confirmFn = function () {
      var idx = allItems.findIndex(function (p) { return p.id === item.id; });
      if (idx >= 0) {
        allItems.splice(idx, 1);
        Utils.storage.set(Utils.constants.STORAGE_KEYS.PORTFOLIO_ITEMS, allItems);
        App.state.hasUnsavedChanges = true;
        App.ui.showToast('Проект удалён', 'info');
        App.pages.renderPortfolio();
      }
    };

    if (window.Forms && Forms.showConfirm) {
      Forms.showConfirm('Удалить проект?', 'Проект "' + item.title + '" будет удалён без возможности восстановления.', confirmFn);
    } else {
      if (confirm('Удалить проект "' + item.title + '"?')) {
        confirmFn();
      }
    }
  }

  // ========================================================================
  // ARTIFACTS
  // ========================================================================

  // Track current artifact filters
  var _artifactFilter = { type: 'all', tag: '', lesson: '' };

  App.pages.renderArtifacts = function () {
    Debug.perfStart('render_artifacts');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var root = Utils.dom.create('div', { class: 'page page-artifacts' });

      // Page header with create button
      var headerRow = Utils.dom.create('div', { class: 'page-header-row' });
      var headerLeft = Utils.dom.create('div', { class: 'page-header-left' });
      Utils.dom.append(headerLeft, Utils.dom.create('h2', { class: 'page-title', text: 'Артефакты тестирования' }));
      Utils.dom.append(headerLeft, Utils.dom.create('p', { class: 'page-subtitle', text: 'Тестовая документация: баг-репорты, тест-кейсы, чек-листы' }));

      var createBtn = Utils.dom.create('button', { class: 'btn btn-primary' });
      Utils.dom.append(createBtn, Utils.dom.fromHTML('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'));
      Utils.dom.append(createBtn, Utils.dom.fromHTML('<span>Создать артефакт</span>'));

      createBtn.addEventListener('click', function () {
        if (window.Forms && Forms.showArtifactCreator) {
          Forms.showArtifactCreator();
        } else {
          // Fallback: simple type selection
          App.ui.showToast('Выберите тип артефакта', 'info');
        }
      });

      Utils.dom.append(headerRow, headerLeft);
      Utils.dom.append(headerRow, createBtn);
      Utils.dom.append(root, headerRow);

      // Get artifacts from storage or demo data
      var artifacts = Utils.storage.get(Utils.constants.STORAGE_KEYS.ARTIFACTS);
      if (!Array.isArray(artifacts) || artifacts.length === 0) {
        artifacts = _getDemoArtifacts();
        Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, artifacts);
      }

      // Group by type for stats
      var typeCounts = {};
      artifacts.forEach(function (a) {
        var t = a.type || 'other';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });

      // Type stats row
      var statsRow = Utils.dom.create('div', { class: 'artifact-type-stats' });
      var allTypes = [
        { value: 'all', label: 'Все', icon: ICONS.doc },
        { value: 'bug_report', label: ARTIFACT_LABELS.bug_report, icon: ICONS.bug },
        { value: 'test_case', label: ARTIFACT_LABELS.test_case, icon: ICONS.testCase },
        { value: 'checklist', label: ARTIFACT_LABELS.checklist, icon: ICONS.checklist },
        { value: 'test_plan', label: ARTIFACT_LABELS.test_plan, icon: ICONS.testPlan }
      ];

      allTypes.forEach(function (type) {
        var count = type.value === 'all' ? artifacts.length : (typeCounts[type.value] || 0);
        var chip = Utils.dom.create('button', {
          class: 'type-chip' + (_artifactFilter.type === type.value ? ' active' : ''),
          'data-type': type.value
        });
        var iconSpan = Utils.dom.create('span', { class: 'type-chip-icon' });
        iconSpan.innerHTML = type.icon;
        Utils.dom.append(chip, iconSpan);
        Utils.dom.append(chip, Utils.dom.create('span', { class: 'type-chip-label', text: type.label }));
        Utils.dom.append(chip, Utils.dom.create('span', { class: 'type-chip-count', text: String(count) }));

        chip.addEventListener('click', function () {
          _artifactFilter.type = type.value;
          App.pages.renderArtifacts();
        });

        Utils.dom.append(statsRow, chip);
      });
      Utils.dom.append(root, statsRow);

      // Filter and render artifact list
      var filtered = artifacts.filter(function (a) {
        if (_artifactFilter.type !== 'all' && a.type !== _artifactFilter.type) return false;
        return true;
      });

      // Artifact list
      var listSection = Utils.dom.create('div', { class: 'artifact-list-section' });

      if (filtered.length === 0) {
        Utils.dom.append(listSection, emptyState(
          ICONS.doc,
          'Нет артефактов',
          'Создайте первый артефакт — баг-репорт, тест-кейс или чек-лист.',
          'Создать артефакт',
          function () {
            if (window.Forms && Forms.showArtifactCreator) {
              Forms.showArtifactCreator();
            }
          }
        ));
      } else {
        var list = Utils.dom.create('div', { class: 'artifact-list' });
        filtered.forEach(function (artifact) {
          Utils.dom.append(list, _renderArtifactCard(artifact, artifacts));
        });
        Utils.dom.append(listSection, list);
      }

      Utils.dom.append(root, listSection);
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      Debug.perfEnd('render_artifacts');
      return root;

    } catch (e) {
      Debug.error('Artifacts render failed', e);
      Debug.perfEnd('render_artifacts');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Artifact card renderer
  // ----------------------------------------------------------------

  function _renderArtifactCard(artifact, allArtifacts) {
    var card = Utils.dom.create('div', { class: 'artifact-card' });
    card.setAttribute('data-id', artifact.id || '');

    // Type icon
    var iconWrap = Utils.dom.create('div', { class: 'artifact-card-icon' });
    iconWrap.innerHTML = ARTIFACT_ICONS[artifact.type] || ICONS.doc;

    // Body
    var body = Utils.dom.create('div', { class: 'artifact-card-body' });

    var typeLabel = ARTIFACT_LABELS[artifact.type] || 'Артефакт';
    Utils.dom.append(body, Utils.dom.create('span', {
      class: 'artifact-type-label',
      text: typeLabel
    }));
    Utils.dom.append(body, Utils.dom.create('h3', {
      class: 'artifact-card-title',
      text: Utils.format.escapeHtml(artifact.title || 'Без названия')
    }));

    // Preview text
    var previewText = '';
    if (artifact.data) {
      if (typeof artifact.data === 'string') {
        previewText = artifact.data;
      } else if (artifact.data.summary) {
        previewText = artifact.data.summary;
      } else if (artifact.data.description) {
        previewText = artifact.data.description;
      } else if (artifact.data.steps) {
        previewText = Array.isArray(artifact.data.steps)
          ? artifact.data.steps.slice(0, 2).map(function (s, i) { return (i + 1) + '. ' + s; }).join(' ')
          : '';
      }
    }
    if (previewText) {
      Utils.dom.append(body, Utils.dom.create('p', {
        class: 'artifact-card-preview',
        text: Utils.format.truncate(Utils.format.escapeHtml(previewText), 150)
      }));
    }

    // Tags
    if (artifact.tags && artifact.tags.length > 0) {
      var tagsWrap = Utils.dom.create('div', { class: 'artifact-card-tags' });
      artifact.tags.slice(0, 5).forEach(function (tag) {
        Utils.dom.append(tagsWrap, Utils.dom.create('span', {
          class: 'tag',
          text: Utils.format.escapeHtml(tag)
        }));
      });
      Utils.dom.append(body, tagsWrap);
    }

    // Date
    if (artifact.createdAt) {
      Utils.dom.append(body, Utils.dom.create('span', {
        class: 'artifact-card-date',
        text: Utils.format.formatDateRu(new Date(artifact.createdAt))
      }));
    }

    // Actions
    var actions = Utils.dom.create('div', { class: 'artifact-card-actions' });

    var openBtn = Utils.dom.create('button', {
      class: 'btn-icon-sm',
      title: 'Открыть',
      'aria-label': 'Открыть артефакт'
    });
    openBtn.innerHTML = ICONS.eye;
    openBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _openArtifact(artifact);
    });

    var editBtn = Utils.dom.create('button', {
      class: 'btn-icon-sm',
      title: 'Редактировать',
      'aria-label': 'Редактировать'
    });
    editBtn.innerHTML = ICONS.edit;
    editBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _editArtifact(artifact);
    });

    var copyBtn = Utils.dom.create('button', {
      class: 'btn-icon-sm',
      title: 'Копировать',
      'aria-label': 'Копировать артефакт'
    });
    copyBtn.innerHTML = ICONS.copy;
    copyBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _copyArtifact(artifact, allArtifacts);
    });

    var delBtn = Utils.dom.create('button', {
      class: 'btn-icon-sm btn-danger-sm',
      title: 'Удалить',
      'aria-label': 'Удалить артефакт'
    });
    delBtn.innerHTML = ICONS.trash;
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _deleteArtifact(artifact, allArtifacts);
    });

    Utils.dom.append(actions, openBtn);
    Utils.dom.append(actions, editBtn);
    Utils.dom.append(actions, copyBtn);
    Utils.dom.append(actions, delBtn);
    Utils.dom.append(body, actions);

    // Card click → open
    card.addEventListener('click', function () {
      _openArtifact(artifact);
    });

    Utils.dom.append(card, iconWrap);
    Utils.dom.append(card, body);
    return card;
  }

  // ----------------------------------------------------------------
  // Artifact helpers
  // ----------------------------------------------------------------

  function _getDemoArtifacts() {
    var modules = CourseData.getModules();
    var artifacts = [];
    var now = Date.now();

    modules.forEach(function (mod) {
      var lessons = CourseData.getLessons(mod.id);
      lessons.forEach(function (lesson) {
        var lessonArts = CourseData.getArtifacts(lesson.id);
        lessonArts.forEach(function (art) {
          artifacts.push(Utils.misc.merge(Utils.misc.deepClone(art), {
            createdAt: new Date(now - Math.random() * 14 * 86400000).toISOString(),
            tags: (art.tags || []).concat(lesson.tags || []).filter(function (v, i, a) { return a.indexOf(v) === i; })
          }));
        });
      });
    });

    return artifacts;
  }

  function _openArtifact(artifact) {
    if (window.Editor && typeof Editor.open === 'function') {
      Editor.open(artifact);
    } else {
      // Fallback: show in context panel
      _showArtifactPreview(artifact);
    }
  }

  function _editArtifact(artifact) {
    if (window.Editor && typeof Editor.edit === 'function') {
      Editor.edit(artifact);
    } else if (window.Forms && Forms.showArtifactEditor) {
      Forms.showArtifactEditor(artifact);
    } else {
      App.ui.showToast('Редактор недоступен', 'warn');
    }
  }

  function _copyArtifact(artifact, allArtifacts) {
    var copy = Utils.misc.deepClone(artifact);
    copy.id = Utils.id.shortId();
    copy.title = (artifact.title || 'Копия') + ' (копия)';
    copy.createdAt = new Date().toISOString();
    allArtifacts.push(copy);
    Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, allArtifacts);
    App.state.hasUnsavedChanges = true;
    App.ui.showToast('Артефакт скопирован', 'success');
    App.pages.renderArtifacts();
  }

  function _deleteArtifact(artifact, allArtifacts) {
    var confirmFn = function () {
      var idx = allArtifacts.findIndex(function (a) { return a.id === artifact.id; });
      if (idx >= 0) {
        allArtifacts.splice(idx, 1);
        Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, allArtifacts);
        App.state.hasUnsavedChanges = true;
        App.ui.showToast('Артефакт удалён', 'info');
        App.pages.renderArtifacts();
      }
    };

    if (window.Forms && Forms.showConfirm) {
      Forms.showConfirm('Удалить артефакт?', 'Артефакт "' + (artifact.title || '') + '" будет удалён.', confirmFn);
    } else {
      if (confirm('Удалить артефакт "' + (artifact.title || '') + '"?')) {
        confirmFn();
      }
    }
  }

  function _showArtifactPreview(artifact) {
    var content = Utils.dom.create('div', { class: 'artifact-preview' });
    var typeLabel = ARTIFACT_LABELS[artifact.type] || 'Артефакт';

    Utils.dom.append(content, Utils.dom.create('h3', { class: 'preview-title', text: artifact.title || 'Без названия' }));
    Utils.dom.append(content, Utils.dom.create('span', { class: 'preview-type-badge', text: typeLabel }));

    if (artifact.data) {
      var pre = Utils.dom.create('pre', { class: 'preview-content' });
      pre.textContent = Utils.format.formatJSON(artifact.data, 2);
      Utils.dom.append(content, pre);
    }

    if (artifact.tags && artifact.tags.length > 0) {
      var tagsWrap = Utils.dom.create('div', { class: 'preview-tags' });
      artifact.tags.forEach(function (tag) {
        Utils.dom.append(tagsWrap, Utils.dom.create('span', { class: 'tag', text: tag }));
      });
      Utils.dom.append(content, tagsWrap);
    }

    App.ui.openContextPanel(content);
  }

})();
/* ЧАСТЬ 3 из 6: Рендереры страниц (Resources, Glossary, Pomodoro, Knowledge Map) */

(function () {
  'use strict';

  // ========================================================================
  // SHARED HELPERS (from Part 2, re-declared for this IIFE scope)
  // ========================================================================

  function pageHeader(title, subtitle) {
    var header = Utils.dom.create('div', { class: 'page-header' });
    Utils.dom.append(header, Utils.dom.create('h2', { class: 'page-title', text: title }));
    if (subtitle) {
      Utils.dom.append(header, Utils.dom.create('p', { class: 'page-subtitle', text: subtitle }));
    }
    return header;
  }

  function statCard(icon, label, value, sub) {
    var card = Utils.dom.create('div', { class: 'stat-card' });
    var iconWrap = Utils.dom.create('div', { class: 'stat-card-icon', html: icon });
    var body = Utils.dom.create('div', { class: 'stat-card-body' });
    Utils.dom.append(body, Utils.dom.create('div', { class: 'stat-card-value', text: String(value) }));
    Utils.dom.append(body, Utils.dom.create('div', { class: 'stat-card-label', text: label }));
    if (sub) {
      Utils.dom.append(body, Utils.dom.create('div', { class: 'stat-card-sub', text: sub }));
    }
    Utils.dom.append(card, iconWrap);
    Utils.dom.append(card, body);
    return card;
  }

  function emptyState(icon, title, desc, btnText, btnAction) {
    var container = Utils.dom.create('div', { class: 'empty-state' });
    Utils.dom.append(container, Utils.dom.create('div', { class: 'empty-state-icon', html: icon }));
    Utils.dom.append(container, Utils.dom.create('h3', { class: 'empty-state-title', text: title }));
    if (desc) {
      Utils.dom.append(container, Utils.dom.create('p', { class: 'empty-state-desc', text: desc }));
    }
    if (btnText && btnAction) {
      var btn = Utils.dom.create('button', { class: 'btn btn-primary', text: btnText });
      btn.addEventListener('click', btnAction);
      Utils.dom.append(container, btn);
    }
    return container;
  }

  var ICONS = {
    book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    article: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    tool: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    course: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/></svg>',
    bookmark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    bookmarkActive: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    external: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    play: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    pause: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    reset: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    skip: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    coffee: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>',
    folder: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    tree: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="10" cy="20" r="2"/><circle cx="18" cy="20" r="2"/><path d="M12 6v4M12 10H6v2M12 10h6v0M6 14v4M18 14v4M10 18v-4"/></svg>',
    grid: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    graph: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6.5 8L11 16M17.5 8L13 16"/></svg>',
    chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    doc: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'
  };

  var RESOURCE_ICONS = {
    books: ICONS.book,
    articles: ICONS.article,
    videos: ICONS.video,
    tools: ICONS.tool,
    courses: ICONS.course
  };

  var RESOURCE_LABELS = {
    books: 'Книги',
    articles: 'Статьи',
    videos: 'Видео',
    tools: 'Инструменты',
    courses: 'Курсы'
  };

  var DIFFICULTY_LABELS = {
    beginner: 'Начальный',
    intermediate: 'Средний',
    advanced: 'Продвинутый'
  };

  var DIFFICULTY_COLORS = {
    beginner: 'difficulty-beginner',
    intermediate: 'difficulty-intermediate',
    advanced: 'difficulty-advanced'
  };

  // ========================================================================
  // STATIC RESOURCES DATA
  // ========================================================================

  function _getStaticResources() {
    return [
      { id: 'r1', title: 'Тестирование-dot-ну: основы', description: 'Бесплатный курс по основам тестирования ПО на русском языке.', category: 'courses', difficulty: 'beginner', tags: ['основы', 'бесплатно'], link: '' },
      { id: 'r2', title: 'Тестирование программного обеспечения. Базовый курс', description: 'Книга Святослава Куликова — фундаментальный труд по теории и практике тестирования.', category: 'books', difficulty: 'beginner', tags: ['теория', 'практика'], link: '' },
      { id: 'r3', title: 'Lessons Learned in Software Testing', description: 'Классическая книга Канера, Баха и Петти о практическом опыте тестирования.', category: 'books', difficulty: 'advanced', tags: ['опыт', 'классика'], link: '' },
      { id: 'r4', title: 'Введение в тест-дизайн', description: 'Статья о техниках тест-дизайна: классы эквивалентности, граничные значения, таблицы решений.', category: 'articles', difficulty: 'intermediate', tags: ['тест-дизайн', 'техники'], link: '' },
      { id: 'r5', title: 'Что такое баг-репорт и как его писать', description: 'Подробное руководство по составлению качественных баг-репортов с примерами.', category: 'articles', difficulty: 'beginner', tags: ['баг-репорт', 'документация'], link: '' },
      { id: 'r6', title: 'API Testing for Beginners', description: 'Видеоурок по тестированию REST API: методы, статусы, инструменты.', category: 'videos', difficulty: 'beginner', tags: ['API', 'REST'], link: '' },
      { id: 'r7', title: 'Postman: полное руководство', description: 'Видеокурс по работе с Postman для тестировщиков API.', category: 'videos', difficulty: 'intermediate', tags: ['Postman', 'API'], link: '' },
      { id: 'r8', title: 'Postman', description: 'Мощный инструмент для тестирования API. Создание коллекций, environment-переменных, автотестов.', category: 'tools', difficulty: 'intermediate', tags: ['API', 'REST'], link: '' },
      { id: 'r9', title: 'DevTools браузера', description: 'Инструменты разработчика в Chrome: Network, Console, Elements — незаменимы для тестировщика.', category: 'tools', difficulty: 'beginner', tags: ['DevTools', 'браузер'], link: '' },
      { id: 'r10', title: 'Charles Proxy', description: 'Прокси для сниффинга и подмены HTTP-трафика. Полезен для мобильного тестирования.', category: 'tools', difficulty: 'advanced', tags: ['proxy', 'мобайл'], link: '' },
      { id: 'r11', title: 'Selenium WebDriver: старт', description: 'Видеоурок по автоматизации веб-тестирования с Selenium.', category: 'videos', difficulty: 'advanced', tags: ['автоматизация', 'Selenium'], link: '' },
      { id: 'r12', title: 'Тестирование мобильных приложений', description: 'Курс по тестированию iOS и Android приложений: эмуляторы, реальные устройства, инструменты.', category: 'courses', difficulty: 'intermediate', tags: ['мобайл', 'iOS', 'Android'], link: '' },
      { id: 'r13', title: 'ISTQB Foundation: подготовка', description: 'Курс подготовки к сертификации ISTQB Foundation Level.', category: 'courses', difficulty: 'intermediate', tags: ['ISTQB', 'сертификация'], link: '' },
      { id: 'r14', title: 'Тестирование безопасности: OWASP Top 10', description: 'Статья об основных уязвимостях веб-приложений и их тестировании.', category: 'articles', difficulty: 'advanced', tags: ['безопасность', 'OWASP'], link: '' },
      { id: 'r15', title: 'Jira для тестировщиков', description: 'Руководство по работе с Jira: баг-репорты, тест-кейсы, доски.', category: 'articles', difficulty: 'beginner', tags: ['Jira', 'инструменты'], link: '' }
    ];
  }

  // ========================================================================
  // RESOURCES
  // ========================================================================

  // Track current resource filters
  var _resourceFilter = { category: 'all', difficulty: 'all', query: '' };

  App.pages.renderResources = function () {
    Debug.perfStart('render_resources');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var root = Utils.dom.create('div', { class: 'page page-resources' });

      // Page header
      Utils.dom.append(root, pageHeader('Ресурсы для изучения', 'Книги, статьи, видео, инструменты и курсы по тестированию ПО'));

      // Get resources: static + user-added from localStorage
      var userResources = Utils.storage.get(Utils.constants.STORAGE_KEYS.USER_RESOURCES);
      if (!Array.isArray(userResources)) userResources = [];
      var allResources = _getStaticResources().concat(userResources);

      // Get bookmarks
      var bookmarks = Utils.storage.get(Utils.constants.STORAGE_KEYS.BOOKMARKS);
      if (!Array.isArray(bookmarks)) bookmarks = [];

      // Mark bookmarked
      allResources.forEach(function (r) {
        r.isBookmarked = bookmarks.indexOf(r.id) !== -1;
      });

      // Controls row
      var controlsRow = Utils.dom.create('div', { class: 'resources-controls' });

      // Search input
      var searchWrap = Utils.dom.create('div', { class: 'resources-search-wrap' });
      var searchIcon = Utils.dom.create('span', { class: 'resources-search-icon' });
      searchIcon.innerHTML = ICONS.search;
      var searchInput = Utils.dom.create('input', {
        type: 'search',
        class: 'search-bar resources-search',
        placeholder: 'Поиск по ресурсам…',
        'aria-label': 'Поиск по ресурсам',
        autocomplete: 'off',
        spellcheck: 'false'
      });
      Utils.dom.append(searchWrap, searchIcon);
      Utils.dom.append(searchWrap, searchInput);
      Utils.dom.append(controlsRow, searchWrap);

      // Category chips
      var categoryChips = Utils.dom.create('div', { class: 'filter-chips category-chips' });
      var categories = [
        { value: 'all', label: 'Все', icon: '' },
        { value: 'books', label: 'Книги', icon: ICONS.book },
        { value: 'articles', label: 'Статьи', icon: ICONS.article },
        { value: 'videos', label: 'Видео', icon: ICONS.video },
        { value: 'tools', label: 'Инструменты', icon: ICONS.tool },
        { value: 'courses', label: 'Курсы', icon: ICONS.course }
      ];

      categories.forEach(function (cat) {
        var chip = Utils.dom.create('button', {
          class: 'filter-chip' + (_resourceFilter.category === cat.value ? ' active' : ''),
          'data-category': cat.value
        });
        if (cat.icon) {
          var iconSpan = Utils.dom.create('span', { class: 'chip-icon' });
          iconSpan.innerHTML = cat.icon;
          Utils.dom.append(chip, iconSpan);
        }
        Utils.dom.append(chip, Utils.dom.create('span', { text: cat.label }));
        chip.addEventListener('click', function () {
          _resourceFilter.category = cat.value;
          _applyResourceFilters();
        });
        Utils.dom.append(categoryChips, chip);
      });
      Utils.dom.append(controlsRow, categoryChips);

      // Difficulty filter
      var difficultyWrap = Utils.dom.create('div', { class: 'difficulty-filter-wrap' });
      var difficultyLabel = Utils.dom.create('span', { class: 'filter-label', text: 'Уровень:' });
      Utils.dom.append(difficultyWrap, difficultyLabel);

      var difficulties = [
        { value: 'all', label: 'Все' },
        { value: 'beginner', label: 'Начальный' },
        { value: 'intermediate', label: 'Средний' },
        { value: 'advanced', label: 'Продвинутый' }
      ];

      difficulties.forEach(function (diff) {
        var chip = Utils.dom.create('button', {
          class: 'filter-chip filter-chip-sm' + (_resourceFilter.difficulty === diff.value ? ' active' : ''),
          'data-difficulty': diff.value,
          text: diff.label
        });
        chip.addEventListener('click', function () {
          _resourceFilter.difficulty = diff.value;
          _applyResourceFilters();
        });
        Utils.dom.append(difficultyWrap, chip);
      });
      Utils.dom.append(controlsRow, difficultyWrap);

      Utils.dom.append(root, controlsRow);

      // Bookmarks section
      var bookmarkedResources = allResources.filter(function (r) { return r.isBookmarked; });
      if (bookmarkedResources.length > 0) {
        var bmSection = Utils.dom.create('section', { class: 'resources-bookmarks-section' });
        var bmHeader = Utils.dom.create('div', { class: 'section-header' });
        Utils.dom.append(bmHeader, Utils.dom.create('h3', { class: 'section-title', text: 'Мои закладки' }));
        Utils.dom.append(bmHeader, Utils.dom.create('span', { class: 'section-count', text: String(bookmarkedResources.length) }));
        Utils.dom.append(bmSection, bmHeader);

        var bmGrid = Utils.dom.create('div', { class: 'resources-grid bookmarks-grid' });
        bookmarkedResources.forEach(function (r) {
          Utils.dom.append(bmGrid, _renderResourceCard(r, bookmarks, allResources));
        });
        Utils.dom.append(bmSection, bmGrid);
        Utils.dom.append(root, bmSection);
      }

      // Resources grid
      var gridSection = Utils.dom.create('section', { class: 'resources-grid-section' });
      var gridHeader = Utils.dom.create('div', { class: 'section-header' });
      Utils.dom.append(gridHeader, Utils.dom.create('h3', { class: 'section-title', text: 'Все ресурсы' }));
      Utils.dom.append(gridHeader, Utils.dom.create('span', { class: 'section-count', id: 'resources-count', text: String(allResources.length) }));
      Utils.dom.append(gridSection, gridHeader);

      var grid = Utils.dom.create('div', { class: 'resources-grid', id: 'resources-grid' });
      Utils.dom.append(gridSection, grid);
      Utils.dom.append(root, gridSection);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      // Search debounce
      var debouncedSearch = Utils.event.debounce(function (query) {
        _resourceFilter.query = query;
        _applyResourceFilters();
      }, 300);

      searchInput.addEventListener('input', function (e) {
        debouncedSearch(e.target.value.trim().toLowerCase());
      });

      // Apply filters function (scoped)
      function _applyResourceFilters() {
        // Update active chips
        Utils.dom.$$('.filter-chip[data-category]').forEach(function (chip) {
          Utils.dom.toggleClass(chip, 'active', Utils.dom.getData(chip, 'category') === _resourceFilter.category);
        });
        Utils.dom.$$('.filter-chip[data-difficulty]').forEach(function (chip) {
          Utils.dom.toggleClass(chip, 'active', Utils.dom.getData(chip, 'difficulty') === _resourceFilter.difficulty);
        });

        var filtered = allResources.filter(function (r) {
          // Category filter
          if (_resourceFilter.category !== 'all' && r.category !== _resourceFilter.category) return false;
          // Difficulty filter
          if (_resourceFilter.difficulty !== 'all' && r.difficulty !== _resourceFilter.difficulty) return false;
          // Search filter
          if (_resourceFilter.query) {
            var q = _resourceFilter.query;
            var haystack = ((r.title || '') + ' ' + (r.description || '') + ' ' + (r.tags || []).join(' ')).toLowerCase();
            if (haystack.indexOf(q) === -1) return false;
          }
          return true;
        });

        var gridEl = Utils.dom.$('#resources-grid');
        var countEl = Utils.dom.$('#resources-count');
        if (countEl) Utils.dom.setText(countEl, String(filtered.length));
        if (!gridEl) return;

        Utils.dom.empty(gridEl);

        if (filtered.length === 0) {
          Utils.dom.append(gridEl, emptyState(
            ICONS.doc,
            'Ресурсы не найдены',
            'Попробуйте изменить фильтры или поисковый запрос.',
            null, null
          ));
        } else {
          filtered.forEach(function (r) {
            Utils.dom.append(gridEl, _renderResourceCard(r, bookmarks, allResources));
          });
        }
      }

      // Initial render
      _applyResourceFilters();

      Debug.perfEnd('render_resources');
      return root;

    } catch (e) {
      Debug.error('Resources render failed', e);
      Debug.perfEnd('render_resources');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Resource card renderer
  // ----------------------------------------------------------------

  function _renderResourceCard(resource, bookmarks, allResources) {
    var card = Utils.dom.create('div', { class: 'resource-card' });
    card.setAttribute('data-id', resource.id || '');

    // Category icon
    var iconWrap = Utils.dom.create('div', { class: 'resource-card-icon' });
    iconWrap.innerHTML = RESOURCE_ICONS[resource.category] || ICONS.doc;

    // Body
    var body = Utils.dom.create('div', { class: 'resource-card-body' });

    // Header row: category label + difficulty badge
    var metaTop = Utils.dom.create('div', { class: 'resource-card-meta-top' });
    Utils.dom.append(metaTop, Utils.dom.create('span', {
      class: 'resource-category-label',
      text: RESOURCE_LABELS[resource.category] || resource.category
    }));
    Utils.dom.append(metaTop, Utils.dom.create('span', {
      class: 'difficulty-badge ' + (DIFFICULTY_COLORS[resource.difficulty] || ''),
      text: DIFFICULTY_LABELS[resource.difficulty] || resource.difficulty
    }));
    Utils.dom.append(body, metaTop);

    // Title
    Utils.dom.append(body, Utils.dom.create('h3', {
      class: 'resource-card-title',
      text: Utils.format.escapeHtml(resource.title || '')
    }));

    // Description
    if (resource.description) {
      Utils.dom.append(body, Utils.dom.create('p', {
        class: 'resource-card-desc',
        text: Utils.format.truncate(Utils.format.escapeHtml(resource.description), 140)
      }));
    }

    // Tags
    if (resource.tags && resource.tags.length > 0) {
      var tagsWrap = Utils.dom.create('div', { class: 'resource-card-tags' });
      resource.tags.slice(0, 4).forEach(function (tag) {
        Utils.dom.append(tagsWrap, Utils.dom.create('span', {
          class: 'tag',
          text: Utils.format.escapeHtml(tag)
        }));
      });
      Utils.dom.append(body, tagsWrap);
    }

    // Footer: actions
    var footer = Utils.dom.create('div', { class: 'resource-card-footer' });

    // Bookmark button
    var bmBtn = Utils.dom.create('button', {
      class: 'btn-icon-sm bookmark-btn' + (resource.isBookmarked ? ' bookmarked' : ''),
      title: resource.isBookmarked ? 'Убрать из закладок' : 'В закладки',
      'aria-label': resource.isBookmarked ? 'Убрать из закладок' : 'Добавить в закладки',
      'aria-pressed': resource.isBookmarked ? 'true' : 'false'
    });
    bmBtn.innerHTML = resource.isBookmarked ? ICONS.bookmarkActive : ICONS.bookmark;

    bmBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var idx = bookmarks.indexOf(resource.id);
      if (idx === -1) {
        bookmarks.push(resource.id);
        resource.isBookmarked = true;
        Utils.dom.addClass(bmBtn, 'bookmarked');
        bmBtn.innerHTML = ICONS.bookmarkActive;
        bmBtn.setAttribute('aria-pressed', 'true');
        bmBtn.title = 'Убрать из закладок';
        App.ui.showToast('Добавлено в закладки', 'success');
      } else {
        bookmarks.splice(idx, 1);
        resource.isBookmarked = false;
        Utils.dom.removeClass(bmBtn, 'bookmarked');
        bmBtn.innerHTML = ICONS.bookmark;
        bmBtn.setAttribute('aria-pressed', 'false');
        bmBtn.title = 'В закладки';
        App.ui.showToast('Убрано из закладок', 'info');
      }
      Utils.storage.set(Utils.constants.STORAGE_KEYS.BOOKMARKS, bookmarks);
    });
    Utils.dom.append(footer, bmBtn);

    // Open link button
    if (resource.link) {
      var openBtn = Utils.dom.create('button', {
        class: 'btn-icon-sm',
        title: 'Открыть ссылку',
        'aria-label': 'Открыть ссылку'
      });
      openBtn.innerHTML = ICONS.external;
      openBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        Utils.url.openURL(resource.link);
      });
      Utils.dom.append(footer, openBtn);
    }

    Utils.dom.append(body, footer);

    Utils.dom.append(card, iconWrap);
    Utils.dom.append(card, body);
    return card;
  }

  // ========================================================================
  // GLOSSARY
  // ========================================================================

  // Track current glossary state
  var _glossaryFilter = { query: '', tag: '' };

  App.pages.renderGlossary = function () {
    Debug.perfStart('render_glossary');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var root = Utils.dom.create('div', { class: 'page page-glossary' });

      // Page header
      Utils.dom.append(root, pageHeader('Глоссарий QA', 'Термины и определения из мира тестирования ПО'));

      // Get glossary data
      var staticTerms = CourseData.getGlossary();
      var userTerms = Utils.storage.get(Utils.constants.STORAGE_KEYS.USER_GLOSSARY);
      if (!Array.isArray(userTerms)) userTerms = [];

      // Reset filter on fresh render
      _glossaryFilter = { query: '', tag: '' };

      // Search bar
      var searchWrap = Utils.dom.create('div', { class: 'glossary-search-wrap' });
      var searchInput = Utils.dom.create('input', {
        type: 'search',
        class: 'search-bar glossary-search',
        placeholder: 'Поиск по терминам…',
        'aria-label': 'Поиск по терминам',
        autocomplete: 'off',
        spellcheck: 'false'
      });
      Utils.dom.append(searchWrap, searchInput);
      Utils.dom.append(root, searchWrap);

      // Collect all unique tags
      var allTags = [];
      var allTerms = staticTerms.concat(userTerms);
      allTerms.forEach(function (t) {
        if (t.tags) {
          t.tags.forEach(function (tag) {
            if (allTags.indexOf(tag) === -1) allTags.push(tag);
          });
        }
      });

      // Tag filter chips
      if (allTags.length > 0) {
        var tagChips = Utils.dom.create('div', { class: 'glossary-tag-chips filter-chips' });
        var allChip = Utils.dom.create('button', {
          class: 'filter-chip active',
          text: 'Все',
          'data-tag': ''
        });
        allChip.addEventListener('click', function () {
          _glossaryFilter.tag = '';
          _updateTagChips();
          _applyGlossaryFilters();
        });
        Utils.dom.append(tagChips, allChip);

        allTags.slice(0, 15).forEach(function (tag) {
          var chip = Utils.dom.create('button', {
            class: 'filter-chip filter-chip-sm',
            text: tag,
            'data-tag': tag
          });
          chip.addEventListener('click', function () {
            _glossaryFilter.tag = tag;
            _updateTagChips();
            _applyGlossaryFilters();
          });
          Utils.dom.append(tagChips, chip);
        });
        Utils.dom.append(root, tagChips);
      }

      // Alphabetical index
      var allTermsSorted = allTerms.slice().sort(function (a, b) {
        return (a.term || '').localeCompare(b.term || '', 'ru');
      });

      var letters = [];
      allTermsSorted.forEach(function (t) {
        var firstChar = (t.term || '').charAt(0).toUpperCase();
        if (firstChar && letters.indexOf(firstChar) === -1) {
          letters.push(firstChar);
        }
      });
      letters.sort();

      if (letters.length > 0) {
        var alphaIndex = Utils.dom.create('div', { class: 'glossary-alpha-index', 'aria-label': 'Алфавитный указатель' });
        letters.forEach(function (letter) {
          var btn = Utils.dom.create('button', {
            class: 'alpha-btn',
            text: letter,
            'data-letter': letter
          });
          btn.addEventListener('click', function () {
            var target = Utils.dom.$('#glossary-letter-' + letter);
            if (target) {
              Utils.dom.scrollIntoView(target, { behavior: 'smooth', block: 'start' });
            }
          });
          Utils.dom.append(alphaIndex, btn);
        });
        Utils.dom.append(root, alphaIndex);
      }

      // Add term button (if glossary is editable)
      var addTermBtn = Utils.dom.create('button', { class: 'btn btn-outline glossary-add-btn' });
      Utils.dom.append(addTermBtn, Utils.dom.fromHTML('<span>' + ICONS.plus + '</span>'));
      Utils.dom.append(addTermBtn, Utils.dom.fromHTML('<span>Добавить термин</span>'));
      addTermBtn.addEventListener('click', function () {
        if (window.Forms && Forms.showGlossaryEditor) {
          Forms.showGlossaryEditor();
        } else {
          App.ui.showToast('Редактор терминов недоступен', 'warn');
        }
      });
      Utils.dom.append(root, addTermBtn);

      // Terms container
      var termsContainer = Utils.dom.create('div', { class: 'glossary-terms', id: 'glossary-terms' });
      Utils.dom.append(root, termsContainer);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      // Search debounce
      var debouncedSearch = Utils.event.debounce(function (query) {
        _glossaryFilter.query = query;
        _applyGlossaryFilters();
      }, 300);

      searchInput.addEventListener('input', function (e) {
        debouncedSearch(e.target.value.trim().toLowerCase());
      });

      // Tag chip update
      function _updateTagChips() {
        Utils.dom.$$('.glossary-tag-chips .filter-chip').forEach(function (chip) {
          var tag = Utils.dom.getData(chip, 'tag') || '';
          Utils.dom.toggleClass(chip, 'active', tag === _glossaryFilter.tag);
        });
      }

      // Apply filters
      function _applyGlossaryFilters() {
        var filtered = allTerms.filter(function (t) {
          // Tag filter
          if (_glossaryFilter.tag) {
            if (!t.tags || t.tags.indexOf(_glossaryFilter.tag) === -1) return false;
          }
          // Search filter
          if (_glossaryFilter.query) {
            var q = _glossaryFilter.query;
            var term = (t.term || '').toLowerCase();
            var def = (t.definition || '').toLowerCase();
            var ex = (t.example || '').toLowerCase();
            if (term.indexOf(q) === -1 && def.indexOf(q) === -1 && ex.indexOf(q) === -1) {
              return false;
            }
          }
          return true;
        });

        // Group by first letter
        var grouped = {};
        filtered.forEach(function (t) {
          var letter = (t.term || '').charAt(0).toUpperCase();
          if (!grouped[letter]) grouped[letter] = [];
          grouped[letter].push(t);
        });

        // Sort letters
        var sortedLetters = Object.keys(grouped).sort();

        Utils.dom.empty(termsContainer);

        if (sortedLetters.length === 0) {
          Utils.dom.append(termsContainer, emptyState(
            ICONS.doc,
            'Термины не найдены',
            'Попробуйте изменить поисковый запрос или фильтр.',
            null, null
          ));
          return;
        }

        sortedLetters.forEach(function (letter) {
          // Letter header
          var letterHeader = Utils.dom.create('div', {
            class: 'glossary-letter-header',
            id: 'glossary-letter-' + letter
          });
          Utils.dom.append(letterHeader, Utils.dom.create('h3', {
            class: 'glossary-letter',
            text: letter
          }));
          Utils.dom.append(termsContainer, letterHeader);

          // Terms for this letter
          var letterTerms = grouped[letter].sort(function (a, b) {
            return (a.term || '').localeCompare(b.term || '', 'ru');
          });

          letterTerms.forEach(function (term) {
            Utils.dom.append(termsContainer, _renderGlossaryCard(term, allTerms));
          });
        });
      }

      // Initial render
      _applyGlossaryFilters();

      Debug.perfEnd('render_glossary');
      return root;

    } catch (e) {
      Debug.error('Glossary render failed', e);
      Debug.perfEnd('render_glossary');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Glossary card renderer
  // ----------------------------------------------------------------

  function _renderGlossaryCard(term, allTerms) {
    var card = Utils.dom.create('div', {
      class: 'glossary-card',
      id: 'glossary-term-' + Utils.format.slugify(term.term || '')
    });

    var body = Utils.dom.create('div', { class: 'glossary-card-body' });

    // Term title
    var highlightQuery = _glossaryFilter.query || '';
    var termHtml = Utils.format.escapeHtml(term.term || '');
    if (highlightQuery) {
      termHtml = Utils.format.highlight(termHtml, highlightQuery);
    }
    var titleEl = Utils.dom.create('h3', { class: 'glossary-term-name' });
    titleEl.innerHTML = termHtml;
    Utils.dom.append(body, titleEl);

    // Definition
    var defHtml = Utils.format.escapeHtml(term.definition || '');
    if (highlightQuery) {
      defHtml = Utils.format.highlight(defHtml, highlightQuery);
    }
    var defEl = Utils.dom.create('p', { class: 'glossary-term-def' });
    defEl.innerHTML = defHtml;
    Utils.dom.append(body, defEl);

    // Example
    if (term.example) {
      var exHtml = Utils.format.escapeHtml(term.example);
      if (highlightQuery) {
        exHtml = Utils.format.highlight(exHtml, highlightQuery);
      }
      var exampleEl = Utils.dom.create('div', { class: 'glossary-term-example' });
      exampleEl.innerHTML = '<span class="example-label">Пример:</span> ' + exHtml;
      Utils.dom.append(body, exampleEl);
    }

    // Related terms
    if (term.relatedTerms && term.relatedTerms.length > 0) {
      var relatedWrap = Utils.dom.create('div', { class: 'glossary-related' });
      Utils.dom.append(relatedWrap, Utils.dom.create('span', { class: 'related-label', text: 'Связанные:' }));

      term.relatedTerms.forEach(function (related, idx) {
        var relatedBtn = Utils.dom.create('button', {
          class: 'related-term-btn',
          text: related,
          'data-term': related
        });
        relatedBtn.addEventListener('click', function () {
          // Find the related term and scroll to it
          var targetId = 'glossary-term-' + Utils.format.slugify(related);
          var target = Utils.dom.$('#' + targetId);
          if (target) {
            Utils.dom.scrollIntoView(target, { behavior: 'smooth', block: 'center' });
            Utils.dom.addClass(target, 'highlight-flash');
            setTimeout(function () {
              Utils.dom.removeClass(target, 'highlight-flash');
            }, 1500);
          } else {
            // Term not on page — search for it
            var searchInput = Utils.dom.$('.glossary-search');
            if (searchInput) {
              searchInput.value = related;
              searchInput.dispatchEvent(new Event('input'));
              setTimeout(function () {
                var newTarget = Utils.dom.$('#' + targetId);
                if (newTarget) {
                  Utils.dom.scrollIntoView(newTarget, { behavior: 'smooth', block: 'center' });
                }
              }, 400);
            }
          }
        });
        Utils.dom.append(relatedWrap, relatedBtn);
        if (idx < term.relatedTerms.length - 1) {
          Utils.dom.append(relatedWrap, Utils.dom.create('span', { class: 'related-sep', text: ', ' }));
        }
      });
      Utils.dom.append(body, relatedWrap);
    }

    // Tags
    if (term.tags && term.tags.length > 0) {
      var tagsWrap = Utils.dom.create('div', { class: 'glossary-term-tags' });
      term.tags.forEach(function (tag) {
        Utils.dom.append(tagsWrap, Utils.dom.create('span', {
          class: 'tag',
          text: tag
        }));
      });
      Utils.dom.append(body, tagsWrap);
    }

    Utils.dom.append(card, body);
    return card;
  }

  // ========================================================================
  // POMODORO
  // ========================================================================

  // Pomodoro timer reference
  var _pomodoroTimer = null;
  var _pomodoroSettings = {
    focusDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsBeforeLongBreak: 4,
    autoTransition: true,
    soundEnabled: true
  };

  function _loadPomodoroSettings() {
    var stored = Utils.storage.getSub('pomodoro') || {};
    if (stored.settings) {
      _pomodoroSettings = Utils.misc.merge(_pomodoroSettings, stored.settings);
    }
    return _pomodoroSettings;
  }

  function _savePomodoroSettings() {
    var stored = Utils.storage.getSub('pomodoro') || {};
    stored.settings = _pomodoroSettings;
    Utils.storage.setSub('pomodoro', stored);
  }

  function _getPomodoroModeLabel(mode) {
    switch (mode) {
      case 'focus': return 'Работа';
      case 'short_break': return 'Короткий перерыв';
      case 'long_break': return 'Длинный перерыв';
      default: return 'Работа';
    }
  }

  function _getModeDuration(mode, settings) {
    switch (mode) {
      case 'focus': return settings.focusDuration * 60;
      case 'short_break': return settings.shortBreak * 60;
      case 'long_break': return settings.longBreak * 60;
      default: return settings.focusDuration * 60;
    }
  }

  function _beep() {
    if (!_pomodoroSettings.soundEnabled) return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var oscillator = ctx.createOscillator();
      var gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      Debug.warn('Audio beep failed: ' + e.message);
    }
  }

  function _recordPomodoroSession(mode, durationMinutes) {
    var stored = Utils.storage.getSub('pomodoro') || {};
    if (!stored.history) stored.history = [];
    stored.history.unshift({
      mode: mode,
      duration: durationMinutes,
      timestamp: new Date().toISOString()
    });
    if (stored.history.length > 50) stored.history = stored.history.slice(0, 50);
    stored.history = stored.history;

    // Update today's stats
    var today = Utils.format.formatDate(new Date(), 'YYYY-MM-DD');
    if (!stored.dailyStats) stored.dailyStats = [];
    var todayStat = stored.dailyStats.find(function (d) { return d.date === today; });
    if (todayStat) {
      todayStat.sessions++;
      todayStat.minutes += durationMinutes;
    } else {
      stored.dailyStats.push({ date: today, sessions: 1, minutes: durationMinutes });
    }
    // Keep only last 30 days
    if (stored.dailyStats.length > 30) {
      stored.dailyStats = stored.dailyStats.slice(-30);
    }

    stored.totalMinutes = (stored.totalMinutes || 0) + durationMinutes;
    Utils.storage.setSub('pomodoro', stored);
  }

  function _getPomodoroDailyStats() {
    var stored = Utils.storage.getSub('pomodoro') || {};
    var stats = stored.dailyStats || [];
    // Return last 7 days
    return stats.slice(-7);
  }

  function _getPomodoroHistory() {
    var stored = Utils.storage.getSub('pomodoro') || {};
    return stored.history || [];
  }

  App.pages.renderPomodoro = function () {
    Debug.perfStart('render_pomodoro');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      // Load settings
      _loadPomodoroSettings();

      // Restore state
      var stored = Utils.storage.getSub('pomodoro') || {};
      var pomoState = App.state.pomodoroState;

      // If no active state from App, try restore from storage
      if (
  	stored &&
  	typeof stored === 'object' &&
  	typeof stored.remaining === 'number' &&
  	stored.mode
	) {
  	pomoState.mode = stored.mode;
  	pomoState.remaining = Math.max(0, stored.remaining);
  	pomoState.sessionsCompleted = Number(stored.sessionsCompleted) || 0;
  	pomoState.running = stored.running === true;
	}

      var totalDuration = _getModeDuration(pomoState.mode, _pomodoroSettings);

      var root = Utils.dom.create('div', { class: 'page page-pomodoro' });

      // Page header
      Utils.dom.append(root, pageHeader('Таймер Помодоро', 'Техника управления временем для эффективной учёбы'));

      // Timer section
      var timerSection = Utils.dom.create('section', { class: 'pomodoro-timer-section' });

      // Circular timer
      var timerWrap = Utils.dom.create('div', { class: 'pomodoro-timer-wrap' });

      // SVG circle progress
      var svgSize = 200;
      var strokeWidth = 8;
      var radius = (svgSize - strokeWidth) / 2;
      var circumference = 2 * Math.PI * radius;
      var progress = totalDuration > 0 ? (totalDuration - pomoState.remaining) / totalDuration : 0;
      var dashOffset = circumference * (1 - progress);

      var svg = Utils.dom.create('svg', {
        class: 'pomodoro-timer-svg',
        width: String(svgSize),
        height: String(svgSize),
        viewBox: '0 0 ' + svgSize + ' ' + svgSize
      });
      svg.setAttribute('aria-hidden', 'true');

      // Background circle
      var bgCircle = Utils.dom.create('circle', {
        cx: String(svgSize / 2),
        cy: String(svgSize / 2),
        r: String(radius),
        fill: 'none',
        'stroke-width': String(strokeWidth),
        class: 'timer-circle-bg'
      });
      Utils.dom.append(svg, bgCircle);

      // Progress circle
      var progressCircle = Utils.dom.create('circle', {
        cx: String(svgSize / 2),
        cy: String(svgSize / 2),
        r: String(radius),
        fill: 'none',
        'stroke-width': String(strokeWidth),
        'stroke-linecap': 'round',
        class: 'timer-circle-progress',
        'stroke-dasharray': String(circumference),
        'stroke-dashoffset': String(dashOffset),
        transform: 'rotate(-90 ' + svgSize / 2 + ' ' + svgSize / 2 + ')'
      });
      progressCircle.setAttribute('id', 'pomodoro-progress-circle');
      Utils.dom.append(svg, progressCircle);

      // Time text overlay
      var timeDisplay = Utils.dom.create('div', { class: 'pomodoro-time-display' });
      var timeText = Utils.dom.create('span', {
        class: 'pomodoro-time-text',
        id: 'pomodoro-time-text',
        text: Utils.format.formatDuration(pomoState.remaining)
      });
      var modeLabel = Utils.dom.create('span', {
        class: 'pomodoro-mode-label',
        id: 'pomodoro-mode-label',
        text: _getPomodoroModeLabel(pomoState.mode)
      });
      Utils.dom.append(timeDisplay, modeLabel);
      Utils.dom.append(timeDisplay, timeText);
      Utils.dom.append(timerWrap, svg);
      Utils.dom.append(timerWrap, timeDisplay);

      // Session dots
      var dotsWrap = Utils.dom.create('div', { class: 'pomodoro-session-dots' });
      for (var i = 0; i < _pomodoroSettings.sessionsBeforeLongBreak; i++) {
        var dot = Utils.dom.create('span', {
          class: 'session-dot' + (i < pomoState.sessionsCompleted ? ' completed' : '')
        });
        Utils.dom.append(dotsWrap, dot);
      }
      Utils.dom.append(timerWrap, dotsWrap);

      Utils.dom.append(timerSection, timerWrap);

      // Control buttons
      var controls = Utils.dom.create('div', { class: 'pomodoro-controls' });

      var startPauseBtn = Utils.dom.create('button', {
        class: 'btn btn-primary pomodoro-btn-start',
        id: 'pomodoro-start-btn'
      });
      startPauseBtn.innerHTML = pomoState.running ? ICONS.pause : ICONS.play;
      Utils.dom.append(startPauseBtn, Utils.dom.create('span', {
        text: pomoState.running ? 'Пауза' : 'Старт',
        id: 'pomodoro-start-label'
      }));

      var resetBtn = Utils.dom.create('button', {
        class: 'btn btn-outline pomodoro-btn-reset',
        id: 'pomodoro-reset-btn'
      });
      resetBtn.innerHTML = ICONS.reset;
      Utils.dom.append(resetBtn, Utils.dom.fromHTML('<span>Сброс</span>'));

      var skipBtn = Utils.dom.create('button', {
        class: 'btn btn-outline pomodoro-btn-skip',
        id: 'pomodoro-skip-btn'
      });
      skipBtn.innerHTML = ICONS.skip;
      Utils.dom.append(skipBtn, Utils.dom.fromHTML('<span>Пропустить</span>'));

      var settingsBtn = Utils.dom.create('button', {
        class: 'btn btn-outline pomodoro-btn-settings',
        id: 'pomodoro-settings-btn'
      });
      settingsBtn.innerHTML = ICONS.settings;
      Utils.dom.append(settingsBtn, Utils.dom.fromHTML('<span>Настройки</span>'));

      Utils.dom.append(controls, startPauseBtn);
      Utils.dom.append(controls, resetBtn);
      Utils.dom.append(controls, skipBtn);
      Utils.dom.append(controls, settingsBtn);
      Utils.dom.append(timerSection, controls);
      Utils.dom.append(root, timerSection);

      // Settings panel (collapsible)
      var settingsPanel = Utils.dom.create('div', {
        class: 'pomodoro-settings-panel',
        id: 'pomodoro-settings-panel',
        hidden: 'hidden'
      });

      var settingsTitle = Utils.dom.create('h3', { class: 'settings-panel-title', text: 'Настройки таймера' });
      Utils.dom.append(settingsPanel, settingsTitle);

      // Focus duration
      var focusRow = Utils.dom.create('div', { class: 'setting-row' });
      Utils.dom.append(focusRow, Utils.dom.create('label', {
        class: 'setting-label',
        text: 'Работа (мин):',
        for: 'setting-focus'
      }));
      var focusInput = Utils.dom.create('input', {
        type: 'number',
        id: 'setting-focus',
        class: 'setting-input',
        value: String(_pomodoroSettings.focusDuration),
        min: '1',
        max: '90'
      });
      Utils.dom.append(focusRow, focusInput);
      Utils.dom.append(settingsPanel, focusRow);

      // Short break
      var shortBreakRow = Utils.dom.create('div', { class: 'setting-row' });
      Utils.dom.append(shortBreakRow, Utils.dom.create('label', {
        class: 'setting-label',
        text: 'Короткий перерыв (мин):',
        for: 'setting-short-break'
      }));
      var shortBreakInput = Utils.dom.create('input', {
        type: 'number',
        id: 'setting-short-break',
        class: 'setting-input',
        value: String(_pomodoroSettings.shortBreak),
        min: '1',
        max: '30'
      });
      Utils.dom.append(shortBreakRow, shortBreakInput);
      Utils.dom.append(settingsPanel, shortBreakRow);

      // Long break
      var longBreakRow = Utils.dom.create('div', { class: 'setting-row' });
      Utils.dom.append(longBreakRow, Utils.dom.create('label', {
        class: 'setting-label',
        text: 'Длинный перерыв (мин):',
        for: 'setting-long-break'
      }));
      var longBreakInput = Utils.dom.create('input', {
        type: 'number',
        id: 'setting-long-break',
        class: 'setting-input',
        value: String(_pomodoroSettings.longBreak),
        min: '1',
        max: '60'
      });
      Utils.dom.append(longBreakRow, longBreakInput);
      Utils.dom.append(settingsPanel, longBreakRow);

      // Sessions before long break
      var sessionsRow = Utils.dom.create('div', { class: 'setting-row' });
      Utils.dom.append(sessionsRow, Utils.dom.create('label', {
        class: 'setting-label',
        text: 'Сессий до длинного перерыва:',
        for: 'setting-sessions'
      }));
      var sessionsInput = Utils.dom.create('input', {
        type: 'number',
        id: 'setting-sessions',
        class: 'setting-input',
        value: String(_pomodoroSettings.sessionsBeforeLongBreak),
        min: '1',
        max: '10'
      });
      Utils.dom.append(sessionsRow, sessionsInput);
      Utils.dom.append(settingsPanel, sessionsRow);

      // Auto transition checkbox
      var autoRow = Utils.dom.create('div', { class: 'setting-row setting-row-check' });
      var autoCheck = Utils.dom.create('input', {
        type: 'checkbox',
        id: 'setting-auto',
        class: 'setting-checkbox'
      });
      autoCheck.checked = _pomodoroSettings.autoTransition;
      var autoLabel = Utils.dom.create('label', {
        class: 'setting-label-check',
        text: 'Автопереход между режимами',
        for: 'setting-auto'
      });
      Utils.dom.append(autoRow, autoCheck);
      Utils.dom.append(autoRow, autoLabel);
      Utils.dom.append(settingsPanel, autoRow);

      // Sound checkbox
      var soundRow = Utils.dom.create('div', { class: 'setting-row setting-row-check' });
      var soundCheck = Utils.dom.create('input', {
        type: 'checkbox',
        id: 'setting-sound',
        class: 'setting-checkbox'
      });
      soundCheck.checked = _pomodoroSettings.soundEnabled;
      var soundLabel = Utils.dom.create('label', {
        class: 'setting-label-check',
        text: 'Звуковые уведомления',
        for: 'setting-sound'
      });
      Utils.dom.append(soundRow, soundCheck);
      Utils.dom.append(soundRow, soundLabel);
      Utils.dom.append(settingsPanel, soundRow);

      // Save settings button
      var saveSettingsBtn = Utils.dom.create('button', {
        class: 'btn btn-primary',
        id: 'pomodoro-save-settings',
        text: 'Сохранить настройки'
      });
      Utils.dom.append(settingsPanel, saveSettingsBtn);

      Utils.dom.append(root, settingsPanel);

      // Today's stats section
      var today = Utils.format.formatDate(new Date(), 'YYYY-MM-DD');
      var dailyStats = _getPomodoroDailyStats();
      var todayStat = dailyStats.find(function (d) { return d.date === today; }) || { sessions: 0, minutes: 0 };

      var statsSection = Utils.dom.create('section', { class: 'pomodoro-stats-section' });
      var statsHeader = Utils.dom.create('div', { class: 'section-header' });
      Utils.dom.append(statsHeader, Utils.dom.create('h3', { class: 'section-title', text: 'Статистика за сегодня' }));
      Utils.dom.append(statsSection, statsHeader);

      var statsGrid = Utils.dom.create('div', { class: 'stats-grid stats-grid-sm' });
      Utils.dom.append(statsGrid, statCard(
        ICONS.clock, 'Сессий сегодня',
        todayStat.sessions || 0, null
      ));
      Utils.dom.append(statsGrid, statCard(
        ICONS.coffee, 'Время сегодня',
        Utils.format.formatDurationRu((todayStat.minutes || 0) * 60), null
      ));
      Utils.dom.append(statsSection, statsGrid);
      Utils.dom.append(root, statsSection);

      // 7-day chart
      var chartSection = Utils.dom.create('section', { class: 'pomodoro-chart-section' });
      var chartHeader = Utils.dom.create('div', { class: 'section-header' });
      Utils.dom.append(chartHeader, Utils.dom.create('h3', { class: 'section-title', text: 'Последние 7 дней' }));
      var chartContainer = Utils.dom.create('div', {
        id: 'pomodoro-stats-chart',
        class: 'chart-container'
      });
      Utils.dom.append(chartSection, chartHeader);
      Utils.dom.append(chartSection, chartContainer);
      Utils.dom.append(root, chartSection);

      // History section
      var history = _getPomodoroHistory();
      var historySection = Utils.dom.create('section', { class: 'pomodoro-history-section' });
      var historyHeader = Utils.dom.create('div', { class: 'section-header' });
      Utils.dom.append(historyHeader, Utils.dom.create('h3', { class: 'section-title', text: 'История сессий' }));
      Utils.dom.append(historySection, historyHeader);

      if (history.length > 0) {
        var historyList = Utils.dom.create('ul', { class: 'pomodoro-history-list' });
        history.slice(0, 10).forEach(function (h) {
          var item = Utils.dom.create('li', { class: 'history-item' });
          var modeIcon = h.mode === 'focus' ? ICONS.clock : ICONS.coffee;
          var iconEl = Utils.dom.create('span', { class: 'history-item-icon' });
          iconEl.innerHTML = modeIcon;
          var infoEl = Utils.dom.create('div', { class: 'history-item-info' });
          Utils.dom.append(infoEl, Utils.dom.create('span', {
            class: 'history-item-mode',
            text: _getPomodoroModeLabel(h.mode)
          }));
          Utils.dom.append(infoEl, Utils.dom.create('span', {
            class: 'history-item-time',
            text: Utils.format.formatDurationRu(h.duration * 60) + ' · ' + Utils.format.formatRelative(new Date(h.timestamp))
          }));
          Utils.dom.append(item, iconEl);
          Utils.dom.append(item, infoEl);
          Utils.dom.append(historyList, item);
        });
        Utils.dom.append(historySection, historyList);
      } else {
        Utils.dom.append(historySection, Utils.dom.create('p', {
          class: 'empty-text',
          text: 'Нет завершённых сессий. Запустите таймер!'
        }));
      }
      Utils.dom.append(root, historySection);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      // Render chart after DOM insertion
      if (window.Charts) {
        setTimeout(function () {
          Charts.renderPomodoroStats('pomodoro-stats-chart', dailyStats, {});
        }, 50);
      }

      // ---- Timer logic ----

      function _updateTimerDisplay() {
        var pomo = App.state.pomodoroState;
        var total = _getModeDuration(pomo.mode, _pomodoroSettings);
        var elapsed = total - pomo.remaining;
        var prog = total > 0 ? elapsed / total : 0;
        var offset = circumference * (1 - prog);

        var timeEl = Utils.dom.$('#pomodoro-time-text');
        if (timeEl) Utils.dom.setText(timeEl, Utils.format.formatDuration(pomo.remaining));

        var modeEl = Utils.dom.$('#pomodoro-mode-label');
        if (modeEl) Utils.dom.setText(modeEl, _getPomodoroModeLabel(pomo.mode));

        var circle = Utils.dom.$('#pomodoro-progress-circle');
        if (circle) {
          circle.setAttribute('stroke-dashoffset', String(offset));
        }

        // Update session dots
        var dots = Utils.dom.$$('.session-dot');
        dots.forEach(function (dot, i) {
          Utils.dom.toggleClass(dot, 'completed', i < pomo.sessionsCompleted);
        });
      }

      function _savePomodoroState() {
        var pomo = App.state.pomodoroState;
        var stored = Utils.storage.getSub('pomodoro') || {};
        stored.mode = pomo.mode;
        stored.remaining = pomo.remaining;
        stored.sessionsCompleted = pomo.sessionsCompleted;
        stored.running = pomo.running;
        Utils.storage.setSub('pomodoro', stored);
      }

                  function _switchMode(shouldRecord) {
        if (shouldRecord === undefined) {
          shouldRecord = true;
        }

        var pomo = App.state.pomodoroState;

        if (pomo.mode === 'focus') {
          if (shouldRecord) {
            _recordPomodoroSession(
              'focus',
              _pomodoroSettings.focusDuration
            );

            pomo.sessionsCompleted++;
          }

          if (
            shouldRecord &&
            pomo.sessionsCompleted >=
              _pomodoroSettings.sessionsBeforeLongBreak
          ) {
            pomo.mode = 'long_break';
            pomo.sessionsCompleted = 0;
          } else {
            pomo.mode = 'short_break';
          }
        } else {
          if (shouldRecord) {
            var breakMinutes =
              pomo.mode === 'long_break'
                ? _pomodoroSettings.longBreak
                : _pomodoroSettings.shortBreak;

            _recordPomodoroSession(
              pomo.mode,
              breakMinutes
            );
          }

          if (pomo.mode === 'long_break') {
            pomo.sessionsCompleted = 0;
          }

          pomo.mode = 'focus';
        }

        pomo.remaining = _getModeDuration(
          pomo.mode,
          _pomodoroSettings
        );

        pomo.running =
          shouldRecord &&
          _pomodoroSettings.autoTransition;

        if (shouldRecord) {
          _beep();
        }

        App.ui.showToast(
          'Режим: ' +
            _getPomodoroModeLabel(pomo.mode),
          'info'
        );

        _savePomodoroState();
        _updateTimerDisplay();

        App.pages.renderPomodoro();
      }

            function _tick() {
        var pomo = App.state.pomodoroState;

        // Если таймер остановлен или состояние отсутствует,
        // прекращаем работу интервала.
        if (!pomo || !pomo.running) {
          if (_pomodoroTimer) {
            clearInterval(_pomodoroTimer);
            _pomodoroTimer = null;
          }

          return;
        }

        // Защита от неправильного значения remaining.
        var remaining = Number(pomo.remaining);

        if (!Number.isFinite(remaining) || remaining < 0) {
          remaining = _getModeDuration(
            pomo.mode,
            _pomodoroSettings
          );
        }

        // Уменьшаем оставшееся время на одну секунду.
        pomo.remaining = Math.max(0, remaining - 1);

        // Обновляем интерфейс и сохраняем состояние.
        _updateTimerDisplay();
        _savePomodoroState();

        // Текущая сессия завершена.
        if (pomo.remaining <= 0) {
          if (_pomodoroTimer) {
            clearInterval(_pomodoroTimer);
            _pomodoroTimer = null;
          }

          _switchMode(true);
        }
      }

      function _startStopTimer() {
        var pomo = App.state.pomodoroState;

        if (!pomo) {
          Debug.error(
            'Не удалось запустить Помодоро: состояние таймера отсутствует'
          );

          return;
        }

        pomo.running = !pomo.running;

        if (_pomodoroTimer) {
          clearInterval(_pomodoroTimer);
          _pomodoroTimer = null;
        }

        _savePomodoroState();

        App.ui.showToast(
          pomo.running
            ? 'Таймер запущен'
            : 'Таймер поставлен на паузу',
          'info'
        );

        App.pages.renderPomodoro();
      }

      function _resetTimer() {
        var pomo = App.state.pomodoroState;

        if (!pomo) {
          Debug.error(
            'Не удалось сбросить Помодоро: состояние таймера отсутствует'
          );

          return;
        }

        if (_pomodoroTimer) {
          clearInterval(_pomodoroTimer);
          _pomodoroTimer = null;
        }

        pomo.running = false;

        pomo.remaining = _getModeDuration(
          pomo.mode,
          _pomodoroSettings
        );

        _savePomodoroState();
        _updateTimerDisplay();

        App.ui.showToast(
          'Таймер сброшен',
          'info'
        );

        App.pages.renderPomodoro();
      }

      function _skipMode() {
        var pomo = App.state.pomodoroState;

        if (!pomo) {
          Debug.error(
            'Не удалось переключить режим Помодоро: состояние таймера отсутствует'
          );

          return;
        }

        if (_pomodoroTimer) {
          clearInterval(_pomodoroTimer);
          _pomodoroTimer = null;
        }

        pomo.running = false;

        /*
         * false означает, что пропущенная сессия
         * не записывается как завершённая.
         */
        _switchMode(false);
      }

      // ---- Wire up buttons ----

      startPauseBtn.addEventListener(
        'click',
        _startStopTimer
      );

      resetBtn.addEventListener(
        'click',
        _resetTimer
      );

      skipBtn.addEventListener(
        'click',
        _skipMode
      );


      settingsBtn.addEventListener('click', function () {
        var panel = Utils.dom.$('#pomodoro-settings-panel');
        if (panel) {
          panel.hidden = !panel.hidden;
        }
      });

      saveSettingsBtn.addEventListener('click', function () {
        _pomodoroSettings.focusDuration = Math.max(1, Math.min(90, parseInt(focusInput.value, 10) || 25));
        _pomodoroSettings.shortBreak = Math.max(1, Math.min(30, parseInt(shortBreakInput.value, 10) || 5));
        _pomodoroSettings.longBreak = Math.max(1, Math.min(60, parseInt(longBreakInput.value, 10) || 15));
        _pomodoroSettings.sessionsBeforeLongBreak = Math.max(1, Math.min(10, parseInt(sessionsInput.value, 10) || 4));
        _pomodoroSettings.autoTransition = autoCheck.checked;
        _pomodoroSettings.soundEnabled = soundCheck.checked;

        _savePomodoroSettings();

        // Reset remaining if not running
        if (!App.state.pomodoroState.running) {
          App.state.pomodoroState.remaining = _getModeDuration(App.state.pomodoroState.mode, _pomodoroSettings);
        }

        App.ui.showToast('Настройки сохранены', 'success');

        // Hide panel
        var panel = Utils.dom.$('#pomodoro-settings-panel');
        if (panel) panel.hidden = true;

        // Re-render
        App.pages.renderPomodoro();
      });

      // Resume timer if was running
      if (pomoState.running) {
        if (_pomodoroTimer) clearInterval(_pomodoroTimer);
        _pomodoroTimer = setInterval(_tick, 1000);
      }

      // Clean up timer when leaving page
      // The timer is NOT cleared on navigation — state persists.
      // It's cleared only on page unload (beforeunload) or manual reset.
      // But we do clear the interval reference to avoid duplicates.
      var cleanupInterval = function () {
        if (_pomodoroTimer) {
          clearInterval(_pomodoroTimer);
          _pomodoroTimer = null;
        }
      };

      // Store cleanup for router
      App.state._pomodoroCleanup = cleanupInterval;

      // Initial display update
      _updateTimerDisplay();

      Debug.perfEnd('render_pomodoro');
      return root;

    } catch (e) {
      Debug.error('Pomodoro render failed', e);
      Debug.perfEnd('render_pomodoro');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ========================================================================
  // KNOWLEDGE MAP
  // ========================================================================

  // Track knowledge map view mode
  var _knowledgeMapView = Utils.storage.get(Utils.constants.STORAGE_KEYS.KNOWLEDGE_MAP_VIEW) || 'tree';
  var _knowledgeMapFilter = 'all'; // all, basics, advanced
  var _knowledgeMapExpanded = Utils.storage.get(Utils.constants.STORAGE_KEYS.KNOWLEDGE_MAP_EXPANDED) || {};

  // Knowledge map structure definition
  var KNOWLEDGE_BRANCHES = [
    { id: 'theory', title: 'Теория', colorIndex: 0, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
    { id: 'practice', title: 'Практика', colorIndex: 1, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
    { id: 'tools', title: 'Инструменты', colorIndex: 2, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' },
    { id: 'automation', title: 'Автоматизация', colorIndex: 3, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>' },
    { id: 'soft-skills', title: 'Soft Skills', colorIndex: 4, icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>' }
  ];

  // Map module tags to knowledge branches
  var TAG_TO_BRANCH = {
    'теория': 'theory',
    'основы': 'theory',
    'тест-дизайн': 'theory',
    'практика': 'practice',
    'bug-report': 'practice',
    'тест-кейсы': 'practice',
    'чек-листы': 'practice',
    'инструменты': 'tools',
    'postman': 'tools',
    'devtools': 'tools',
    'автоматизация': 'automation',
    'selenium': 'automation',
    'api': 'automation',
    'soft-skills': 'soft-skills',
    'коммуникация': 'soft-skills'
  };

  function _buildKnowledgeStructure() {
    var modules = CourseData.getModules();
    var progress = Utils.storage.getSub('progress') || {};
    var structure = {};

    KNOWLEDGE_BRANCHES.forEach(function (branch) {
      structure[branch.id] = {
        id: branch.id,
        title: branch.title,
        colorIndex: branch.colorIndex,
        icon: branch.icon,
        items: []
      };
    });

    // Map modules/lessons to branches
    modules.forEach(function (mod) {
      var branchId = 'theory'; // default
      // Try to find matching branch by tags
      if (mod.tags) {
        for (var i = 0; i < mod.tags.length; i++) {
          var normalized = mod.tags[i].toLowerCase();
          if (TAG_TO_BRANCH[normalized]) {
            branchId = TAG_TO_BRANCH[normalized];
            break;
          }
        }
      }

      // If no match, distribute by order
      if (branchId === 'theory' && mod.tags && mod.tags.indexOf('теория') === -1) {
        var branchIndex = (mod.order || 0) % KNOWLEDGE_BRANCHES.length;
        branchId = KNOWLEDGE_BRANCHES[branchIndex].id;
      }

      // Get lessons
      var lessons = CourseData.getLessons(mod.id);
      var modProgress = progress[mod.id] || {};
      var completedLessons = lessons.filter(function (l) { return modProgress[l.id]; }).length;

      structure[branchId].items.push({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        type: 'module',
        route: 'roadmap',
        lessons: lessons.map(function (l) {
          return {
            id: l.id,
            title: l.title,
            completed: !!modProgress[l.id]
          };
        }),
        completedLessons: completedLessons,
        totalLessons: lessons.length,
        progress: lessons.length > 0 ? Math.round(completedLessons / lessons.length * 100) : 0
      });
    });

    return structure;
  }

  App.pages.renderKnowledgeMap = function () {
    Debug.perfStart('render_knowledge_map');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var structure = _buildKnowledgeStructure();
      var root = Utils.dom.create('div', { class: 'page page-knowledge-map' });

      // Page header
      Utils.dom.append(root, pageHeader('Карта знаний', 'Структура знаний QA-инженера в виде интеллект-карты'));

      // View toggle
      var toggleWrap = Utils.dom.create('div', { class: 'view-toggle-wrap' });
      var toggleLabel = Utils.dom.create('span', { class: 'view-toggle-label', text: 'Вид:' });

      var views = [
        { value: 'tree', label: 'Дерево', icon: ICONS.tree },
        { value: 'grid', label: 'Сетка', icon: ICONS.grid },
        { value: 'graph', label: 'Граф', icon: ICONS.graph }
      ];

      views.forEach(function (view) {
        var btn = Utils.dom.create('button', {
          class: 'btn btn-sm view-toggle-btn' + (_knowledgeMapView === view.value ? ' active' : ''),
          'data-view': view.value
        });
        var iconSpan = Utils.dom.create('span', { class: 'btn-icon-sm' });
        iconSpan.innerHTML = view.icon;
        Utils.dom.append(btn, iconSpan);
        Utils.dom.append(btn, Utils.dom.create('span', { text: view.label }));

        btn.addEventListener('click', function () {
          if (_knowledgeMapView !== view.value) {
            _knowledgeMapView = view.value;
            Utils.storage.set(Utils.constants.STORAGE_KEYS.KNOWLEDGE_MAP_VIEW, view.value);
            App.pages.renderKnowledgeMap();
          }
        });
        Utils.dom.append(toggleWrap, btn);
      });

      Utils.dom.append(toggleWrap, toggleLabel.cloneNode(true));
      toggleWrap.insertBefore(toggleLabel, toggleWrap.firstChild);
      Utils.dom.append(root, toggleWrap);

      // Level filter
      var filterWrap = Utils.dom.create('div', { class: 'km-filter-wrap' });
      Utils.dom.append(filterWrap, Utils.dom.create('span', { class: 'filter-label', text: 'Уровень:' }));

      var levels = [
        { value: 'all', label: 'Все' },
        { value: 'basics', label: 'Основы' },
        { value: 'advanced', label: 'Продвинутые' }
      ];

      levels.forEach(function (lvl) {
        var chip = Utils.dom.create('button', {
          class: 'filter-chip filter-chip-sm' + (_knowledgeMapFilter === lvl.value ? ' active' : ''),
          'data-level': lvl.value,
          text: lvl.label
        });
        chip.addEventListener('click', function () {
          _knowledgeMapFilter = lvl.value;
          Utils.dom.$$('.km-filter-wrap .filter-chip').forEach(function (c) {
            Utils.dom.toggleClass(c, 'active', Utils.dom.getData(c, 'level') === lvl.value);
          });
          App.pages.renderKnowledgeMap();
        });
        Utils.dom.append(filterWrap, chip);
      });
      Utils.dom.append(root, filterWrap);

      // Content area
      var contentArea = Utils.dom.create('div', { class: 'km-content' });

      if (_knowledgeMapView === 'tree') {
        Utils.dom.append(contentArea, _renderKnowledgeTree(structure));
      } else if (_knowledgeMapView === 'grid') {
        Utils.dom.append(contentArea, _renderKnowledgeGrid(structure));
      } else if (_knowledgeMapView === 'graph') {
        var graphContainer = Utils.dom.create('div', {
          id: 'knowledge-map-graph',
          class: 'chart-container km-graph-container'
        });
        Utils.dom.append(contentArea, graphContainer);

        // Build graph data from structure
        var graphData = _buildKnowledgeGraphData(structure);
        setTimeout(function () {
          if (window.Charts) {
            Charts.renderRoadmapGraph('knowledge-map-graph', graphData, {});
          }
        }, 50);
      }

      Utils.dom.append(root, contentArea);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      Debug.perfEnd('render_knowledge_map');
      return root;

    } catch (e) {
      Debug.error('Knowledge Map render failed', e);
      Debug.perfEnd('render_knowledge_map');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Knowledge map: Tree view
  // ----------------------------------------------------------------

  function _renderKnowledgeTree(structure) {
    var tree = Utils.dom.create('div', { class: 'km-tree' });

    // Root node
    var rootNode = Utils.dom.create('div', { class: 'km-tree-root' });
    var rootHeader = Utils.dom.create('div', { class: 'km-node km-node-root expanded' });
    var rootIcon = Utils.dom.create('span', { class: 'km-node-icon' });
    rootIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';
    Utils.dom.append(rootHeader, rootIcon);
    Utils.dom.append(rootHeader, Utils.dom.create('span', { class: 'km-node-label', text: 'QA Engineer' }));
    Utils.dom.append(rootNode, rootHeader);

    // Branches
    var branchesContainer = Utils.dom.create('div', { class: 'km-branches' });

    Object.keys(structure).forEach(function (branchId) {
      var branch = structure[branchId];
      if (branch.items.length === 0) return;

      // Filter by level
      if (_knowledgeMapFilter !== 'all') {
        var isBasics = branch.items.every(function (item) {
          return item.progress > 0 || item.totalLessons <= 5;
        });
        if (_knowledgeMapFilter === 'basics' && !isBasics) return;
        if (_knowledgeMapFilter === 'advanced' && isBasics) return;
      }

      var isExpanded = _knowledgeMapExpanded[branchId] !== false; // default expanded

      var branchNode = Utils.dom.create('div', {
        class: 'km-branch' + (isExpanded ? ' expanded' : '')
      });

      var branchHeader = Utils.dom.create('div', {
        class: 'km-node km-node-branch',
        'data-branch': branchId
      });

      // Expand/collapse chevron
      var chevron = Utils.dom.create('span', { class: 'km-chevron' });
      chevron.innerHTML = isExpanded ? ICONS.chevronDown : ICONS.chevronRight;

      var branchIcon = Utils.dom.create('span', { class: 'km-node-icon km-branch-icon-' + branch.colorIndex });
      branchIcon.innerHTML = branch.icon;

      Utils.dom.append(branchHeader, chevron);
      Utils.dom.append(branchHeader, branchIcon);
      Utils.dom.append(branchHeader, Utils.dom.create('span', {
        class: 'km-node-label',
        text: branch.title + ' (' + branch.items.length + ')'
      }));

      // Toggle expand/collapse
      branchHeader.addEventListener('click', function () {
        var currentlyExpanded = Utils.dom.hasClass(branchNode, 'expanded');
        if (currentlyExpanded) {
          Utils.dom.removeClass(branchNode, 'expanded');
          chevron.innerHTML = ICONS.chevronRight;
          _knowledgeMapExpanded[branchId] = false;
        } else {
          Utils.dom.addClass(branchNode, 'expanded');
          chevron.innerHTML = ICONS.chevronDown;
          _knowledgeMapExpanded[branchId] = true;
        }
        Utils.storage.set(Utils.constants.STORAGE_KEYS.KNOWLEDGE_MAP_EXPANDED, _knowledgeMapExpanded);
      });

      Utils.dom.append(branchNode, branchHeader);

      // Items (modules) within branch
      var itemsContainer = Utils.dom.create('div', { class: 'km-branch-items' });

      branch.items.forEach(function (item) {
        var itemNode = Utils.dom.create('div', {
          class: 'km-node km-node-item',
          'data-module': item.id
        });

        var itemChevron = Utils.dom.create('span', { class: 'km-chevron km-chevron-sm' });
        var itemExpanded = _knowledgeMapExpanded[item.id] === true;
        itemChevron.innerHTML = itemExpanded ? ICONS.chevronDown : ICONS.chevronRight;

        var dot = Utils.dom.create('span', { class: 'km-node-dot' });
        if (item.progress === 100) {
          Utils.dom.addClass(dot, 'dot-completed');
        } else if (item.progress > 0) {
          Utils.dom.addClass(dot, 'dot-in-progress');
        }

        Utils.dom.append(itemNode, itemChevron);
        Utils.dom.append(itemNode, dot);
        Utils.dom.append(itemNode, Utils.dom.create('span', {
          class: 'km-node-label',
          text: item.title
        }));

        if (item.progress > 0) {
          Utils.dom.append(itemNode, Utils.dom.create('span', {
            class: 'km-node-progress',
            text: item.progress + '%'
          }));
        }

        // Click on item → navigate to roadmap
        itemNode.addEventListener('click', function (e) {
          // If clicking on chevron area, toggle expand instead
          if (e.target.closest('.km-chevron')) {
            var expanded = _knowledgeMapExpanded[item.id] === true;
            if (expanded) {
              _knowledgeMapExpanded[item.id] = false;
              itemChevron.innerHTML = ICONS.chevronRight;
              // Remove lessons sub-list if exists
              var subList = itemNode.querySelector('.km-lessons-list');
              if (subList) Utils.dom.remove(subList);
            } else {
              _knowledgeMapExpanded[item.id] = true;
              itemChevron.innerHTML = ICONS.chevronDown;
              // Add lessons sub-list
              _renderLessonsSubList(itemNode, item);
            }
            Utils.storage.set(Utils.constants.STORAGE_KEYS.KNOWLEDGE_MAP_EXPANDED, _knowledgeMapExpanded);
          } else {
            App.router.navigate('roadmap');
          }
        });

        Utils.dom.append(itemsContainer, itemNode);

        // If was expanded, render lessons
        if (itemExpanded) {
          _renderLessonsSubList(itemNode, item);
        }
      });

      Utils.dom.append(branchNode, itemsContainer);
      Utils.dom.append(branchesContainer, branchNode);
    });

    Utils.dom.append(rootNode, branchesContainer);
    Utils.dom.append(tree, rootNode);

    return tree;
  }

  function _renderLessonsSubList(itemNode, item) {
    if (item.lessons.length === 0) return;
    var subList = Utils.dom.create('ul', { class: 'km-lessons-list' });
    item.lessons.forEach(function (lesson) {
      var lessonItem = Utils.dom.create('li', {
        class: 'km-lesson' + (lesson.completed ? ' completed' : '')
      });
      var checkIcon = Utils.dom.create('span', { class: 'km-lesson-check' });
      checkIcon.innerHTML = lesson.completed
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';
      Utils.dom.append(lessonItem, checkIcon);
      Utils.dom.append(lessonItem, Utils.dom.create('span', {
        class: 'km-lesson-label',
        text: lesson.title
      }));
      Utils.dom.append(subList, lessonItem);
    });
    Utils.dom.append(itemNode, subList);
  }

  // ----------------------------------------------------------------
  // Knowledge map: Grid view
  // ----------------------------------------------------------------

  function _renderKnowledgeGrid(structure) {
    var grid = Utils.dom.create('div', { class: 'km-grid' });

    Object.keys(structure).forEach(function (branchId) {
      var branch = structure[branchId];
      if (branch.items.length === 0) return;

      // Filter
      if (_knowledgeMapFilter !== 'all') {
        var isBasics = branch.items.every(function (item) {
          return item.totalLessons <= 5;
        });
        if (_knowledgeMapFilter === 'basics' && !isBasics) return;
        if (_knowledgeMapFilter === 'advanced' && isBasics) return;
      }

      var card = Utils.dom.create('div', { class: 'km-grid-card' });

      // Card header
      var cardHeader = Utils.dom.create('div', { class: 'km-grid-card-header' });
      var cardIcon = Utils.dom.create('span', { class: 'km-grid-card-icon km-branch-icon-' + branch.colorIndex });
      cardIcon.innerHTML = branch.icon;
      Utils.dom.append(cardHeader, cardIcon);
      Utils.dom.append(cardHeader, Utils.dom.create('h3', {
        class: 'km-grid-card-title',
        text: branch.title
      }));

      // Progress for the branch
      var totalCompleted = 0;
      var totalLessons = 0;
      branch.items.forEach(function (item) {
        totalCompleted += item.completedLessons;
        totalLessons += item.totalLessons;
      });
      var branchPct = totalLessons > 0 ? Math.round(totalCompleted / totalLessons * 100) : 0;

      var pbWrap = Utils.dom.create('div', { class: 'progress-bar-wrap progress-bar-sm' });
      var pb = Utils.dom.create('div', { class: 'progress-bar' });
      var pbFill = Utils.dom.create('div', { class: 'progress-bar-fill' });
      pbFill.style.width = branchPct + '%';
      Utils.dom.append(pb, pbFill);
      Utils.dom.append(pbWrap, pb);
      Utils.dom.append(pbWrap, Utils.dom.create('span', {
        class: 'progress-bar-text',
        text: totalCompleted + ' / ' + totalLessons + ' (' + branchPct + '%)'
      }));
      Utils.dom.append(cardHeader, pbWrap);

      Utils.dom.append(card, cardHeader);

      // Items list
      var itemsList = Utils.dom.create('ul', { class: 'km-grid-items' });

      branch.items.forEach(function (item) {
        var itemRow = Utils.dom.create('li', { class: 'km-grid-item' });

        var checkbox = Utils.dom.create('label', { class: 'km-checkbox' });
        var cb = Utils.dom.create('input', { type: 'checkbox' });
        cb.checked = item.progress === 100;
        cb.addEventListener('change', function () {
          // Toggle all lessons for this module
          var p = Utils.storage.getSub('progress') || {};
          if (!p[item.id]) p[item.id] = {};
          var lessons = CourseData.getLessons(item.id);
          lessons.forEach(function (l) {
            if (cb.checked) {
              p[item.id][l.id] = true;
            } else {
              delete p[item.id][l.id];
            }
          });
          Utils.storage.setSub('progress', p);
          App.state.hasUnsavedChanges = true;
          App.pages.renderKnowledgeMap();
        });
        Utils.dom.append(checkbox, cb);
        Utils.dom.append(itemRow, checkbox);

        var itemInfo = Utils.dom.create('div', { class: 'km-grid-item-info' });
        Utils.dom.append(itemInfo, Utils.dom.create('span', {
          class: 'km-grid-item-title',
          text: item.title
        }));
        Utils.dom.append(itemInfo, Utils.dom.create('span', {
          class: 'km-grid-item-meta',
          text: item.completedLessons + ' / ' + item.totalLessons + ' уроков'
        }));
        Utils.dom.append(itemRow, itemInfo);

        // Navigate on click
        itemRow.addEventListener('click', function (e) {
          if (e.target !== cb) {
            App.router.navigate('roadmap');
          }
        });

        Utils.dom.append(itemsList, itemRow);
      });

      Utils.dom.append(card, itemsList);
      Utils.dom.append(grid, card);
    });

    if (Utils.dom.$$('.km-grid-card', grid).length === 0) {
      return emptyState(
        ICONS.doc,
        'Нет данных',
        'Нет элементов для выбранного уровня фильтрации.',
        null, null
      );
    }

    return grid;
  }

  // ----------------------------------------------------------------
  // Knowledge map: Graph data builder
  // ----------------------------------------------------------------

  function _buildKnowledgeGraphData(structure) {
    var nodes = [];
    var nodeId = 0;

    // Root node
    nodes.push({
      id: 'root',
      type: 'root',
      title: 'QA Engineer',
      status: 'active',
      dependencies: [],
      x: 0,
      y: 0,
      colorIndex: 0
    });

    // Branch nodes
    Object.keys(structure).forEach(function (branchId, branchIdx) {
      var branch = structure[branchId];
      nodes.push({
        id: branchId,
        type: 'branch',
        title: branch.title,
        status: 'active',
        dependencies: ['root'],
        x: (branchIdx - 2) * 180,
        y: 120,
        colorIndex: branch.colorIndex
      });

      // Module nodes within branch
      branch.items.forEach(function (item, itemIdx) {
        nodes.push({
          id: item.id,
          type: 'module',
          title: item.title,
          status: item.progress === 100 ? 'completed' : (item.progress > 0 ? 'active' : 'pending'),
          dependencies: [branchId],
          x: (branchIdx - 2) * 180 + (itemIdx % 2 === 0 ? -80 : 80),
          y: 240 + Math.floor(itemIdx / 2) * 60,
          colorIndex: branch.colorIndex
        });
      });
    });

    return nodes;
  }

})();
/* ЧАСТЬ 4 из 6: Рендереры страниц (Templates, Sharing, Settings, About, Help) */

(function () {
  'use strict';

  // ========================================================================
  // SHARED HELPERS
  // ========================================================================

  function pageHeader(title, subtitle) {
    var header = Utils.dom.create('div', { class: 'page-header' });
    Utils.dom.append(header, Utils.dom.create('h2', { class: 'page-title', text: title }));
    if (subtitle) {
      Utils.dom.append(header, Utils.dom.create('p', { class: 'page-subtitle', text: subtitle }));
    }
    return header;
  }

  function statCard(icon, label, value, sub) {
    var card = Utils.dom.create('div', { class: 'stat-card' });
    var iconWrap = Utils.dom.create('div', { class: 'stat-card-icon', html: icon });
    var body = Utils.dom.create('div', { class: 'stat-card-body' });
    Utils.dom.append(body, Utils.dom.create('div', { class: 'stat-card-value', text: String(value) }));
    Utils.dom.append(body, Utils.dom.create('div', { class: 'stat-card-label', text: label }));
    if (sub) {
      Utils.dom.append(body, Utils.dom.create('div', { class: 'stat-card-sub', text: sub }));
    }
    Utils.dom.append(card, iconWrap);
    Utils.dom.append(card, body);
    return card;
  }

  function emptyState(icon, title, desc, btnText, btnAction) {
    var container = Utils.dom.create('div', { class: 'empty-state' });
    Utils.dom.append(container, Utils.dom.create('div', { class: 'empty-state-icon', html: icon }));
    Utils.dom.append(container, Utils.dom.create('h3', { class: 'empty-state-title', text: title }));
    if (desc) {
      Utils.dom.append(container, Utils.dom.create('p', { class: 'empty-state-desc', text: desc }));
    }
    if (btnText && btnAction) {
      var btn = Utils.dom.create('button', { class: 'btn btn-primary', text: btnText });
      btn.addEventListener('click', btnAction);
      Utils.dom.append(container, btn);
    }
    return container;
  }

  function sectionWrap(title) {
    var section = Utils.dom.create('section', { class: 'settings-section' });
    Utils.dom.append(section, Utils.dom.create('h3', { class: 'section-title', text: title }));
    return section;
  }

  var ICONS = {
    bug: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 7l-3 2M5 7l3 2M19 13h-3M5 13h3M19 19l-3-2M5 19l3-2M12 6V4"/></svg>',
    testCase: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    checklist: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    testPlan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    apiTest: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    smoke: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a3 3 0 0 1 3-3c0-2 1-4 4-4s4 2 4 4c2 0 3 1 3 3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M7 18h10M9 22h6"/></svg>',
    download: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    copy: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    reset: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    help: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    chevronDown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    doc: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    palette: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5"/><circle cx="17.5" cy="10.5" r="0.5"/><circle cx="8.5" cy="7.5" r="0.5"/><circle cx="6.5" cy="12.5" r="0.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5-4.5-8-10-8z"/></svg>',
    monitor: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    sun: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',
    moon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    database: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 5v14c0 1.7-4 3-9 3s-9-1.3-9-3V5"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    arrowRight: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    logo: '<svg width="64" height="64" viewBox="0 0 64 64" fill="none"><rect x="8" y="8" width="48" height="48" rx="12" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32" r="12" stroke="currentColor" stroke-width="3"/><path d="M26 32l4 4 8-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    folder: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    keyboard: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/></svg>'
  };

  var TEMPLATE_ICONS = {
    bug_report: ICONS.bug,
    test_case: ICONS.testCase,
    checklist: ICONS.checklist,
    test_plan: ICONS.testPlan,
    api_test: ICONS.apiTest,
    smoke_suite: ICONS.smoke
  };

  var TEMPLATE_LABELS = {
    bug_report: 'Баг-репорт',
    test_case: 'Тест-кейс',
    checklist: 'Чек-лист',
    test_plan: 'Тест-план',
    api_test: 'API-тест',
    smoke_suite: 'Smoke-набор'
  };

  var TEMPLATE_WHEN = {
    bug_report: 'Используйте при обнаружении дефекта в приложении.',
    test_case: 'Используйте для описания пошаговой проверки функциональности.',
    checklist: 'Используйте для быстрой проверки по списку ключевых точек.',
    test_plan: 'Используйте для планирования тестирования фичи или релиза.',
    api_test: 'Используйте для тестирования REST API эндпоинтов.',
    smoke_suite: 'Используйте для быстрой проверки критических функций после сборки.'
  };

  var ACCENT_COLORS = [
    { name: 'Синий', value: '#3b82f6' },
    { name: 'Зелёный', value: '#22c55e' },
    { name: 'Фиолетовый', value: '#8b5cf6' },
    { name: 'Оранжевый', value: '#f97316' },
    { name: 'Розовый', value: '#ec4899' },
    { name: 'Бирюзовый', value: '#14b8a6' },
    { name: 'Красный', value: '#ef4444' },
    { name: 'Жёлтый', value: '#eab308' },
    { name: 'Индиго', value: '#6366f1' },
    { name: 'Графит', value: '#475569' }
  ];

  var DEFAULT_SETTINGS = {
    theme: 'system',
    accentColorIndex: 0,
    compactView: false,
    fontSize: 'M',
    autosave: true,
    confirmDelete: true,
    restoreLastPage: true,
    animations: true,
    pomodoro: {
      focusDuration: 25,
      shortBreak: 5,
      longBreak: 15,
      sessionsBeforeLongBreak: 4,
      autoTransition: true,
      soundEnabled: true
    }
  };

  // ========================================================================
  // TEMPLATES
  // ========================================================================

  App.pages.renderTemplates = function () {
    Debug.perfStart('render_templates');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var templates = CourseData.getTemplates();
      var root = Utils.dom.create('div', { class: 'page page-templates' });

      Utils.dom.append(root, pageHeader('Шаблоны документов', 'Заготовки для создания тест-кейсов, баг-репортов, чек-листов и тест-планов'));

      // Templates grid
      var grid = Utils.dom.create('div', { class: 'templates-grid' });

      templates.forEach(function (tpl) {
        var card = Utils.dom.create('div', { class: 'template-card' });
        card.setAttribute('data-type', tpl.type || '');

        // Icon
        var iconWrap = Utils.dom.create('div', { class: 'template-card-icon' });
        iconWrap.innerHTML = TEMPLATE_ICONS[tpl.type] || ICONS.doc;

        // Body
        var body = Utils.dom.create('div', { class: 'template-card-body' });

        Utils.dom.append(body, Utils.dom.create('span', {
          class: 'template-type-label',
          text: TEMPLATE_LABELS[tpl.type] || tpl.type || 'Шаблон'
        }));
        Utils.dom.append(body, Utils.dom.create('h3', {
          class: 'template-card-title',
          text: Utils.format.escapeHtml(tpl.title || tpl.name || '')
        }));

        if (tpl.description) {
          Utils.dom.append(body, Utils.dom.create('p', {
            class: 'template-card-desc',
            text: Utils.format.escapeHtml(tpl.description)
          }));
        }

        // When to use
        var whenText = TEMPLATE_WHEN[tpl.type] || '';
        if (whenText) {
          Utils.dom.append(body, Utils.dom.create('p', {
            class: 'template-card-when',
            text: whenText
          }));
        }

        // Buttons
        var btnRow = Utils.dom.create('div', { class: 'template-card-actions' });

        var useBtn = Utils.dom.create('button', {
          class: 'btn btn-primary btn-sm',
          text: 'Использовать'
        });
        useBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          _useTemplate(tpl);
        });

        var previewBtn = Utils.dom.create('button', {
          class: 'btn btn-outline btn-sm',
          text: 'Предпросмотр'
        });
        previewBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          _showTemplatePreview(tpl);
        });

        Utils.dom.append(btnRow, useBtn);
        Utils.dom.append(btnRow, previewBtn);
        Utils.dom.append(body, btnRow);

        Utils.dom.append(card, iconWrap);
        Utils.dom.append(card, body);
        Utils.dom.append(grid, card);
      });

      Utils.dom.append(root, grid);
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      Debug.perfEnd('render_templates');
      return root;

    } catch (e) {
      Debug.error('Templates render failed', e);
      Debug.perfEnd('render_templates');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Template helpers
  // ----------------------------------------------------------------

  function _useTemplate(tpl) {
    var newArtifact = {
      id: Utils.id.shortId(),
      type: tpl.type,
      title: 'Новый ' + (TEMPLATE_LABELS[tpl.type] || 'артефакт'),
      data: Utils.misc.deepClone(tpl.structure || tpl.data || {}),
      tags: (tpl.tags || []).slice(),
      createdAt: new Date().toISOString()
    };

    // Fill placeholders from template
    if (newArtifact.data) {
      _fillPlaceholders(newArtifact.data);
    }

    // Save to artifacts storage
    var artifacts = Utils.storage.get(Utils.constants.STORAGE_KEYS.ARTIFACTS);
    if (!Array.isArray(artifacts)) artifacts = [];
    artifacts.push(newArtifact);
    Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, artifacts);
    App.state.hasUnsavedChanges = true;

    App.ui.showToast('Артефакт создан из шаблона', 'success');

    // Navigate to artifacts
    App.router.navigate('artifacts');

    // Open editor if available
    setTimeout(function () {
      if (window.Editor && typeof Editor.open === 'function') {
        Editor.open(newArtifact);
      } else if (window.Forms && Forms.showArtifactEditor) {
        Forms.showArtifactEditor(newArtifact);
      }
    }, 300);
  }

  function _fillPlaceholders(obj) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function (key) {
      if (typeof obj[key] === 'string' && obj[key].indexOf('{{') !== -1) {
        // Leave placeholder text as-is — user will fill it
      } else if (typeof obj[key] === 'object') {
        _fillPlaceholders(obj[key]);
      }
    });
  }

  function _showTemplatePreview(tpl) {
    var previewData = tpl.structure || tpl.data || tpl;
    var jsonStr = Utils.format.formatJSON(previewData, 2);

    // Build modal content
    var content = Utils.dom.create('div', { class: 'template-preview' });

    Utils.dom.append(content, Utils.dom.create('h3', {
      class: 'preview-title',
      text: TEMPLATE_LABELS[tpl.type] || tpl.title || 'Шаблон'
    }));

    if (tpl.description) {
      Utils.dom.append(content, Utils.dom.create('p', {
        class: 'preview-desc',
        text: tpl.description
      }));
    }

    var pre = Utils.dom.create('pre', { class: 'preview-json' });
    pre.textContent = jsonStr;
    Utils.dom.append(content, pre);

    // Copy button
    var copyBtn = Utils.dom.create('button', {
      class: 'btn btn-outline btn-sm',
      text: 'Копировать JSON'
    });
    copyBtn.addEventListener('click', function () {
      Utils.url.copyToClipboard(jsonStr);
      App.ui.showToast('JSON скопирован в буфер обмена', 'success');
    });
    Utils.dom.append(content, copyBtn);

    // Use button
    var useBtn = Utils.dom.create('button', {
      class: 'btn btn-primary btn-sm',
      text: 'Использовать шаблон'
    });
    useBtn.addEventListener('click', function () {
      App.ui.closeModal('template-preview-modal');
      _useTemplate(tpl);
    });
    Utils.dom.append(content, useBtn);

    // Open in modal
    var modal = _createSimpleModal('template-preview-modal', 'Предпросмотр шаблона', content);
    App.ui.openModal('template-preview-modal');
  }

  function _createSimpleModal(modalId, title, content) {
    // Check if modal already exists
    var existing = Utils.dom.$('#' + modalId);
    if (existing) {
      Utils.dom.empty(existing);
      var existingBody = existing.querySelector('.modal-body');
      if (existingBody) {
        Utils.dom.empty(existingBody);
        Utils.dom.append(existingBody, content);
      }
      return existing;
    }

    // Create modal structure
    var modal = Utils.dom.create('div', {
      class: 'modal',
      id: modalId,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': modalId + '-title',
      hidden: 'hidden'
    });

    var modalDialog = Utils.dom.create('div', { class: 'modal-dialog' });
    var modalContent = Utils.dom.create('div', { class: 'modal-content' });

    var modalHeader = Utils.dom.create('div', { class: 'modal-header' });
    Utils.dom.append(modalHeader, Utils.dom.create('h3', {
      class: 'modal-title',
      id: modalId + '-title',
      text: title
    }));
    var closeBtn = Utils.dom.create('button', {
      class: 'modal-close-btn',
      'aria-label': 'Закрыть',
      'data-modal-close': ''
    });
    closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    closeBtn.addEventListener('click', function () {
      App.ui.closeModal(modalId);
    });
    Utils.dom.append(modalHeader, closeBtn);

    var modalBody = Utils.dom.create('div', { class: 'modal-body' });
    Utils.dom.append(modalBody, content);

    Utils.dom.append(modalContent, modalHeader);
    Utils.dom.append(modalContent, modalBody);
    Utils.dom.append(modalDialog, modalContent);
    Utils.dom.append(modal, modalDialog);

    // Click outside to close
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        App.ui.closeModal(modalId);
      }
    });

    // Append to modals container
    var modalsContainer = Utils.dom.$('#modals');
    if (modalsContainer) {
      Utils.dom.append(modalsContainer, modal);
    } else {
      Utils.dom.append(document.body, modal);
    }

    return modal;
  }

  // ========================================================================
  // SHARING (EXPORT / IMPORT)
  // ========================================================================

  App.pages.renderSharing = function () {
    Debug.perfStart('render_sharing');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var root = Utils.dom.create('div', { class: 'page page-sharing' });

      Utils.dom.append(root, pageHeader('Экспорт и шеринг', 'Сохранение и передача данных портфолио'));

      // Export section
      var exportSection = sectionWrap('Экспорт данных');

      // Export format buttons
      var formatRow = Utils.dom.create('div', { class: 'export-format-row' });
      var formats = [
        { value: 'json', label: 'JSON', desc: 'Структурированные данные' },
        { value: 'html', label: 'HTML', desc: 'Веб-страница с данными' },
        { value: 'markdown', label: 'Markdown', desc: 'Текстовое представление' }
      ];

      var selectedFormat = 'json';

      formats.forEach(function (fmt) {
        var btn = Utils.dom.create('button', {
          class: 'format-btn' + (selectedFormat === fmt.value ? ' active' : ''),
          'data-format': fmt.value
        });
        Utils.dom.append(btn, Utils.dom.create('span', { class: 'format-btn-label', text: fmt.label }));
        Utils.dom.append(btn, Utils.dom.create('span', { class: 'format-btn-desc', text: fmt.desc }));
        btn.addEventListener('click', function () {
          selectedFormat = fmt.value;
          Utils.dom.$$('.format-btn').forEach(function (b) {
            Utils.dom.toggleClass(b, 'active', Utils.dom.getData(b, 'format') === selectedFormat);
          });
          _updateExportPreview();
        });
        Utils.dom.append(formatRow, btn);
      });
      Utils.dom.append(exportSection, formatRow);

      // Export checkboxes
      var exportOptions = Utils.dom.create('div', { class: 'export-options' });
      var exportCheckboxes = [
        { id: 'exp-modules', label: 'Модули и прогресс', value: 'modules', checked: true },
        { id: 'exp-artifacts', label: 'Артефакты', value: 'artifacts', checked: true },
        { id: 'exp-notes', label: 'Заметки', value: 'notes', checked: true },
        { id: 'exp-tags', label: 'Теги', value: 'tags', checked: true },
        { id: 'exp-settings', label: 'Настройки', value: 'settings', checked: true },
        { id: 'exp-history', label: 'История (Помодоро)', value: 'history', checked: false }
      ];

      exportCheckboxes.forEach(function (opt) {
        var row = Utils.dom.create('div', { class: 'export-option-row' });
        var cb = Utils.dom.create('input', {
          type: 'checkbox',
          id: opt.id,
          class: 'export-checkbox',
          'data-export': opt.value
        });
        cb.checked = opt.checked;
        cb.addEventListener('change', _updateExportPreview);
        Utils.dom.append(row, cb);
        Utils.dom.append(row, Utils.dom.create('label', {
          class: 'export-option-label',
          text: opt.label,
          for: opt.id
        }));
        Utils.dom.append(exportOptions, row);
      });
      Utils.dom.append(exportSection, exportOptions);

      // Size preview
      var sizePreview = Utils.dom.create('div', { class: 'export-size-preview', id: 'export-size-preview' });
      Utils.dom.append(exportSection, sizePreview);

      // Download button
      var downloadBtn = Utils.dom.create('button', { class: 'btn btn-primary' });
      downloadBtn.innerHTML = ICONS.download;
      Utils.dom.append(downloadBtn, Utils.dom.fromHTML('<span>Скачать</span>'));
      downloadBtn.addEventListener('click', function () {
        _downloadExport(selectedFormat);
      });
      Utils.dom.append(exportSection, downloadBtn);

      Utils.dom.append(root, exportSection);

      // Import section
      var importSection = sectionWrap('Импорт данных');

      // Drop zone
      var dropZone = Utils.dom.create('div', { class: 'import-dropzone', id: 'import-dropzone' });
      dropZone.innerHTML = ICONS.upload;
      Utils.dom.append(dropZone, Utils.dom.create('p', {
        class: 'dropzone-text',
        text: 'Перетащите .json файл сюда или нажмите для выбора'
      }));

      var fileInput = Utils.dom.create('input', {
        type: 'file',
        id: 'import-file-input',
        accept: '.json',
        style: 'display:none'
      });

      // Click on dropzone → file input
      dropZone.addEventListener('click', function () {
        fileInput.click();
      });

      // Drag & drop
      dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        Utils.dom.addClass(dropZone, 'dragover');
      });
      dropZone.addEventListener('dragleave', function () {
        Utils.dom.removeClass(dropZone, 'dragover');
      });
      dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        Utils.dom.removeClass(dropZone, 'dragover');
        var files = e.dataTransfer.files;
        if (files.length > 0) {
          _handleImportFile(files[0]);
        }
      });

      // File input change
      fileInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
          _handleImportFile(e.target.files[0]);
        }
      });

      Utils.dom.append(importSection, dropZone);
      Utils.dom.append(importSection, fileInput);

      // Import preview area
      var importPreview = Utils.dom.create('div', {
        class: 'import-preview',
        id: 'import-preview',
        hidden: 'hidden'
      });
      Utils.dom.append(importSection, importPreview);

      // Import mode: merge or replace
      var importModeRow = Utils.dom.create('div', { class: 'import-mode-row', id: 'import-mode-row', hidden: 'hidden' });
      var mergeRadio = Utils.dom.create('input', {
        type: 'radio',
        id: 'import-merge',
        name: 'import-mode',
        value: 'merge',
        checked: 'checked'
      });
      var mergeLabel = Utils.dom.create('label', { class: 'import-mode-label', text: 'Объединить', for: 'import-merge' });
      var replaceRadio = Utils.dom.create('input', {
        type: 'radio',
        id: 'import-replace',
        name: 'import-mode',
        value: 'replace'
      });
      var replaceLabel = Utils.dom.create('label', { class: 'import-mode-label', text: 'Заменить все', for: 'import-replace' });

      Utils.dom.append(importModeRow, mergeRadio);
      Utils.dom.append(importModeRow, mergeLabel);
      Utils.dom.append(importModeRow, replaceRadio);
      Utils.dom.append(importModeRow, replaceLabel);
      Utils.dom.append(importSection, importModeRow);

      // Import button
      var importBtn = Utils.dom.create('button', {
        class: 'btn btn-primary',
        id: 'import-btn',
        text: 'Импортировать',
        hidden: 'hidden'
      });
      importBtn.addEventListener('click', function () {
        _executeImport();
      });
      Utils.dom.append(importSection, importBtn);

      Utils.dom.append(root, importSection);

      // Sharing section
      var shareSection = sectionWrap('Поделиться');

      var shareLinkWrap = Utils.dom.create('div', { class: 'share-link-wrap' });
      var shareLinkInput = Utils.dom.create('input', {
        type: 'text',
        class: 'share-link-input',
        id: 'share-link-input',
        readonly: 'readonly',
        placeholder: 'Ссылка будет сгенерирована здесь…'
      });
      Utils.dom.append(shareLinkWrap, shareLinkInput);

      var generateLinkBtn = Utils.dom.create('button', {
        class: 'btn btn-outline',
        text: 'Сгенерировать ссылку'
      });
      generateLinkBtn.addEventListener('click', function () {
        var link = _generateShareLink();
        shareLinkInput.value = link;
        App.ui.showToast('Ссылка сгенерирована', 'success');
      });
      Utils.dom.append(shareLinkWrap, generateLinkBtn);

      var copyLinkBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
      copyLinkBtn.innerHTML = ICONS.copy;
      Utils.dom.append(copyLinkBtn, Utils.dom.fromHTML('<span>Копировать</span>'));
      copyLinkBtn.addEventListener('click', function () {
        if (shareLinkInput.value) {
          Utils.url.copyToClipboard(shareLinkInput.value);
          App.ui.showToast('Ссылка скопирована', 'success');
        } else {
          App.ui.showToast('Сначала сгенерируйте ссылку', 'warn');
        }
      });
      Utils.dom.append(shareLinkWrap, copyLinkBtn);

      // Web Share API
      if (navigator.share) {
        var webShareBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
        webShareBtn.innerHTML = ICONS.share;
        Utils.dom.append(webShareBtn, Utils.dom.fromHTML('<span>Поделиться</span>'));
        webShareBtn.addEventListener('click', function () {
          if (!shareLinkInput.value) {
            shareLinkInput.value = _generateShareLink();
          }
          navigator.share({
            title: 'QA Study Portfolio',
            text: 'Моё учебное портфолио QA-инженера',
            url: shareLinkInput.value
          }).catch(function (err) {
            Debug.warn('Share failed: ' + err.message);
          });
        });
        Utils.dom.append(shareLinkWrap, webShareBtn);
      }

      Utils.dom.append(shareSection, shareLinkWrap);
      Utils.dom.append(root, shareSection);

      // Backup section
      var backupSection = sectionWrap('Резервная копия');

      var backupBtnRow = Utils.dom.create('div', { class: 'backup-btn-row' });

      var createBackupBtn = Utils.dom.create('button', { class: 'btn btn-primary' });
      createBackupBtn.innerHTML = ICONS.download;
      Utils.dom.append(createBackupBtn, Utils.dom.fromHTML('<span>Создать бэкап</span>'));
      createBackupBtn.addEventListener('click', function () {
        _createBackup();
      });
      Utils.dom.append(backupBtnRow, createBackupBtn);

      var restoreBackupBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
      restoreBackupBtn.innerHTML = ICONS.upload;
      Utils.dom.append(restoreBackupBtn, Utils.dom.fromHTML('<span>Восстановить из бэкапа</span>'));
      restoreBackupBtn.addEventListener('click', function () {
        var fi = Utils.dom.$('#import-file-input');
        if (fi) fi.click();
      });
      Utils.dom.append(backupBtnRow, restoreBackupBtn);

      Utils.dom.append(backupSection, backupBtnRow);

      // Backup history
      var backupHistory = Utils.storage.get(Utils.constants.STORAGE_KEYS.BACKUP_HISTORY);
      if (!Array.isArray(backupHistory)) backupHistory = [];

      if (backupHistory.length > 0) {
        var bhList = Utils.dom.create('ul', { class: 'backup-history-list' });
        backupHistory.slice(0, 10).forEach(function (b) {
          var item = Utils.dom.create('li', { class: 'backup-history-item' });
          Utils.dom.append(item, Utils.dom.create('span', {
            class: 'backup-date',
            text: Utils.format.formatDateRu(new Date(b.date))
          }));
          Utils.dom.append(item, Utils.dom.create('span', {
            class: 'backup-size',
            text: Utils.format.formatFileSize(b.size || 0)
          }));
          Utils.dom.append(bhList, item);
        });
        Utils.dom.append(backupSection, bhList);
      }

      Utils.dom.append(root, backupSection);

      // Data clearing section
      var clearSection = sectionWrap('Очистка данных');

      var clearDataBtn = Utils.dom.create('button', { class: 'btn btn-danger' });
      clearDataBtn.innerHTML = ICONS.trash;
      Utils.dom.append(clearDataBtn, Utils.dom.fromHTML('<span>Очистить все данные</span>'));
      clearDataBtn.addEventListener('click', function () {
        _clearAllData();
      });
      Utils.dom.append(clearSection, clearDataBtn);

      var resetDemoBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
      resetDemoBtn.innerHTML = ICONS.reset;
      Utils.dom.append(resetDemoBtn, Utils.dom.fromHTML('<span>Сбросить к демо-данным</span>'));
      resetDemoBtn.addEventListener('click', function () {
        _resetToDemo();
      });
      Utils.dom.append(clearSection, resetDemoBtn);

      Utils.dom.append(root, clearSection);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      // Initial preview update
      _updateExportPreview();

      Debug.perfEnd('render_sharing');
      return root;

    } catch (e) {
      Debug.error('Sharing render failed', e);
      Debug.perfEnd('render_sharing');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Export / Import helpers
  // ----------------------------------------------------------------

  function _getExportData() {
    var checkboxes = Utils.dom.$$('.export-checkbox');
    var include = {};
    checkboxes.forEach(function (cb) {
      include[Utils.dom.getData(cb, 'export')] = cb.checked;
    });

    var data = {};

    if (include.modules) {
      data.progress = Utils.storage.getSub('progress') || {};
    }
    if (include.artifacts) {
      data.artifacts = Utils.storage.get(Utils.constants.STORAGE_KEYS.ARTIFACTS) || [];
    }
    if (include.notes) {
      data.notes = Utils.storage.get(Utils.constants.STORAGE_KEYS.NOTES) || [];
    }
    if (include.tags) {
      data.tags = Utils.storage.get(Utils.constants.STORAGE_KEYS.TAGS) || [];
    }
    if (include.settings) {
      data.settings = Utils.storage.get(Utils.constants.STORAGE_KEYS.SETTINGS) || {};
    }
    if (include.history) {
      var pomo = Utils.storage.getSub('pomodoro') || {};
      data.pomodoro = {
        history: pomo.history || [],
        dailyStats: pomo.dailyStats || []
      };
    }

    data.meta = {
      appVersion: Utils.constants.APP_VERSION || '1.0.0',
      exportDate: new Date().toISOString()
    };

    return data;
  }

  function _updateExportPreview() {
    var data = _getExportData();
    var jsonStr = Utils.format.formatJSON(data, 0);
    var sizeBytes = new Blob([jsonStr]).size;

    var previewEl = Utils.dom.$('#export-size-preview');
    if (previewEl) {
      Utils.dom.empty(previewEl);
      Utils.dom.append(previewEl, Utils.dom.create('span', {
        class: 'size-label',
        text: 'Размер экспорта: '
      }));
      Utils.dom.append(previewEl, Utils.dom.create('span', {
        class: 'size-value',
        text: Utils.format.formatFileSize(sizeBytes)
      }));
    }
  }

  function _downloadExport(format) {
    var data = _getExportData();
    var content, mimeType, extension;

    if (format === 'json') {
      content = Utils.format.formatJSON(data, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else if (format === 'html') {
      content = _generateHTMLExport(data);
      mimeType = 'text/html';
      extension = 'html';
    } else if (format === 'markdown') {
      content = _generateMarkdownExport(data);
      mimeType = 'text/markdown';
      extension = 'md';
    }

    var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = Utils.dom.create('a', {
      href: url,
      download: 'qa-portfolio-' + Utils.format.formatDate(new Date(), 'YYYY-MM-DD') + '.' + extension
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    App.ui.showToast('Файл скачан (' + extension.toUpperCase() + ')', 'success');
  }

  function _generateHTMLExport(data) {
    var html = '<!DOCTYPE html>\n';
    html += '<html lang="ru">\n<head>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    html += '<title>QA Study Portfolio — Экспорт</title>\n';
    html += '<style>\n';
    html += 'body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333}\n';
    html += 'h1{color:#3b82f6}h2{border-bottom:2px solid #eee;padding-bottom:5px}\n';
    html += '.artifact{border:1px solid #ddd;border-radius:8px;padding:15px;margin:10px 0}\n';
    html += '.tag{display:inline-block;background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:12px;font-size:12px;margin:2px}\n';
    html += '.meta{color:#666;font-size:13px}\n';
    html += 'pre{background:#f8fafc;padding:10px;border-radius:4px;overflow-x:auto}\n';
    html += '</style>\n</head>\n<body>\n';

    html += '<h1>QA Study Portfolio</h1>\n';
    html += '<p class="meta">Экспортировано: ' + Utils.format.escapeHtml(Utils.format.formatDateRu(new Date())) + '</p>\n';

    if (data.progress) {
      html += '<h2>Прогресс обучения</h2>\n';
      var modules = CourseData.getModules();
      modules.forEach(function (mod) {
        var modProgress = data.progress[mod.id] || {};
        var lessons = CourseData.getLessons(mod.id);
        var done = lessons.filter(function (l) { return modProgress[l.id]; }).length;
        var pct = lessons.length > 0 ? Math.round(done / lessons.length * 100) : 0;
        html += '<div class="artifact">\n';
        html += '<h3>' + Utils.format.escapeHtml(mod.title) + ' (' + pct + '%)</h3>\n';
        html += '<p class="meta">' + done + ' / ' + lessons.length + ' уроков</p>\n';
        html += '</div>\n';
      });
    }

    if (data.artifacts && data.artifacts.length > 0) {
      html += '<h2>Артефакты (' + data.artifacts.length + ')</h2>\n';
      data.artifacts.forEach(function (art) {
        html += '<div class="artifact">\n';
        html += '<h3>' + Utils.format.escapeHtml(art.title || 'Без названия') + '</h3>\n';
        html += '<p class="meta">Тип: ' + Utils.format.escapeHtml(art.type || '') + '</p>\n';
        if (art.tags) {
          art.tags.forEach(function (tag) {
            html += '<span class="tag">' + Utils.format.escapeHtml(tag) + '</span>\n';
          });
        }
        if (art.data) {
          html += '<pre>' + Utils.format.escapeHtml(Utils.format.formatJSON(art.data, 2)) + '</pre>\n';
        }
        html += '</div>\n';
      });
    }

    if (data.notes && data.notes.length > 0) {
      html += '<h2>Заметки (' + data.notes.length + ')</h2>\n';
      data.notes.forEach(function (note) {
        html += '<div class="artifact">\n';
        html += '<h3>' + Utils.format.escapeHtml(note.title || 'Заметка') + '</h3>\n';
        html += '<p>' + Utils.format.escapeHtml(note.content || '') + '</p>\n';
        html += '</div>\n';
      });
    }

    html += '</body>\n</html>';
    return html;
  }

  function _generateMarkdownExport(data) {
    var md = '# QA Study Portfolio\n\n';
    md += '> Экспортировано: ' + Utils.format.formatDateRu(new Date()) + '\n\n';

    if (data.progress) {
      md += '## Прогресс обучения\n\n';
      var modules = CourseData.getModules();
      modules.forEach(function (mod) {
        var modProgress = data.progress[mod.id] || {};
        var lessons = CourseData.getLessons(mod.id);
        var done = lessons.filter(function (l) { return modProgress[l.id]; }).length;
        var pct = lessons.length > 0 ? Math.round(done / lessons.length * 100) : 0;
        md += '### ' + mod.title + ' (' + pct + '%)\n';
        md += '- Завершено: ' + done + ' / ' + lessons.length + ' уроков\n';
        lessons.forEach(function (l) {
          md += '  - [' + (modProgress[l.id] ? 'x' : ' ') + '] ' + l.title + '\n';
        });
        md += '\n';
      });
    }

    if (data.artifacts && data.artifacts.length > 0) {
      md += '## Артефакты (' + data.artifacts.length + ')\n\n';
      data.artifacts.forEach(function (art) {
        md += '### ' + (art.title || 'Без названия') + '\n';
        md += '- **Тип:** ' + (art.type || '') + '\n';
        if (art.tags && art.tags.length > 0) {
          md += '- **Теги:** ' + art.tags.join(', ') + '\n';
        }
        if (art.data) {
          md += '\n```json\n' + Utils.format.formatJSON(art.data, 2) + '\n```\n';
        }
        md += '\n';
      });
    }

    if (data.notes && data.notes.length > 0) {
      md += '## Заметки\n\n';
      data.notes.forEach(function (note) {
        md += '### ' + (note.title || 'Заметка') + '\n\n';
        md += (note.content || '') + '\n\n';
      });
    }

    return md;
  }

  function _handleImportFile(file) {
    if (!file || !file.name.endsWith('.json')) {
      App.ui.showToast('Пожалуйста, выберите .json файл', 'warn');
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);

        // Show preview
        var previewEl = Utils.dom.$('#import-preview');
        var modeRow = Utils.dom.$('#import-mode-row');
        var importBtnEl = Utils.dom.$('#import-btn');

        if (previewEl && modeRow && importBtnEl) {
          Utils.dom.empty(previewEl);
          previewEl.hidden = false;
          modeRow.hidden = false;
          importBtnEl.hidden = false;

          // Preview content
          var summary = Utils.dom.create('div', { class: 'import-summary' });
          Utils.dom.append(summary, Utils.dom.create('p', {
            class: 'import-file-name',
            text: 'Файл: ' + file.name + ' (' + Utils.format.formatFileSize(file.size) + ')'
          }));

          var dataKeys = Object.keys(data).filter(function (k) { return k !== 'meta'; });
          Utils.dom.append(summary, Utils.dom.create('p', {
            class: 'import-data-keys',
            text: 'Содержит: ' + dataKeys.join(', ')
          }));

          if (data.meta && data.meta.exportDate) {
            Utils.dom.append(summary, Utils.dom.create('p', {
              class: 'import-export-date',
              text: 'Дата экспорта: ' + Utils.format.formatDateRu(new Date(data.meta.exportDate))
            }));
          }

          if (data.artifacts) {
            Utils.dom.append(summary, Utils.dom.create('p', {
              text: 'Артефактов: ' + data.artifacts.length
            }));
          }
          if (data.progress) {
            var modCount = Object.keys(data.progress).length;
            Utils.dom.append(summary, Utils.dom.create('p', {
              text: 'Модулей с прогрессом: ' + modCount
            }));
          }

          Utils.dom.append(previewEl, summary);

          // Store import data
          App.state._pendingImport = data;
        }

        App.ui.showToast('Файл загружен для импорта', 'info');
      } catch (err) {
        App.ui.showToast('Ошибка чтения файла: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function _executeImport() {
    var data = App.state._pendingImport;
    if (!data) {
      App.ui.showToast('Нет данных для импорта', 'warn');
      return;
    }

    var mode = 'merge';
    var mergeRadio = Utils.dom.$('#import-merge');
    var replaceRadio = Utils.dom.$('#import-replace');
    if (replaceRadio && replaceRadio.checked) mode = 'replace';

    var confirmFn = function () {
      if (window.ExportImport && typeof ExportImport.importData === 'function') {
        ExportImport.importData(data, mode);
      } else {
        _importDataManual(data, mode);
      }

      App.state._pendingImport = null;
      App.state.hasUnsavedChanges = true;

      App.ui.showToast('Данные импортированы (' + (mode === 'merge' ? 'объединение' : 'замена') + ')', 'success');

      // Re-render current page
      App.pages.renderSharing();
    };

    if (window.Forms && Forms.showConfirm) {
      var modeText = mode === 'merge' ? 'Данные будут объединены с текущими.' : 'Текущие данные будут заменены!';
      Forms.showConfirm('Импортировать данные?', modeText, confirmFn);
    } else {
      if (confirm('Импортировать данные? ' + (mode === 'replace' ? 'Текущие данные будут заменены!' : ''))) {
        confirmFn();
      }
    }
  }

  function _importDataManual(data, mode) {
    if (mode === 'replace') {
      Utils.storage.clear();
    }

    if (data.progress) {
      var existingProgress = mode === 'merge' ? (Utils.storage.getSub('progress') || {}) : {};
      Utils.storage.setSub('progress', Utils.misc.merge(existingProgress, data.progress));
    }
    if (data.artifacts) {
      if (mode === 'merge') {
        var existing = Utils.storage.get(Utils.constants.STORAGE_KEYS.ARTIFACTS) || [];
        var existingIds = existing.map(function (a) { return a.id; });
        data.artifacts.forEach(function (a) {
          if (existingIds.indexOf(a.id) === -1) {
            existing.push(a);
          }
        });
        Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, existing);
      } else {
        Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, data.artifacts);
      }
    }
    if (data.notes) {
      Utils.storage.set(Utils.constants.STORAGE_KEYS.NOTES, data.notes);
    }
    if (data.tags) {
      Utils.storage.set(Utils.constants.STORAGE_KEYS.TAGS, data.tags);
    }
    if (data.settings) {
      Utils.storage.set(Utils.constants.STORAGE_KEYS.SETTINGS, data.settings);
    }
    if (data.pomodoro) {
      var existingPomo = mode === 'merge' ? (Utils.storage.getSub('pomodoro') || {}) : {};
      var mergedPomo = Utils.misc.merge(existingPomo, data.pomodoro);
      Utils.storage.setSub('pomodoro', mergedPomo);
    }
  }

  function _generateShareLink() {
    var data = _getExportData();
    var encoded = Utils.format.encodeBase64JSON(data);
    return 'data:text/json;base64,' + encoded;
  }

  function _createBackup() {
    var data = Utils.storage.exportAll();
    var jsonStr = Utils.format.formatJSON(data, 2);
    var sizeBytes = new Blob([jsonStr]).size;

    // Save to backup history
    var history = Utils.storage.get(Utils.constants.STORAGE_KEYS.BACKUP_HISTORY);
    if (!Array.isArray(history)) history = [];
    history.unshift({
      date: new Date().toISOString(),
      size: sizeBytes
    });
    if (history.length > 20) history = history.slice(0, 20);
    Utils.storage.set(Utils.constants.STORAGE_KEYS.BACKUP_HISTORY, history);

    // Download
    var blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = Utils.dom.create('a', {
      href: url,
      download: 'qa-backup-' + Utils.format.formatDate(new Date(), 'YYYY-MM-DD-HHmm') + '.json'
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    App.ui.showToast('Бэкап создан и скачан', 'success');
    App.pages.renderSharing();
  }

  function _clearAllData() {
    var confirmFn = function () {
      Utils.storage.clear();
      App.state.hasUnsavedChanges = false;
      App.ui.showToast('Все данные очищены', 'info');
      App.router.navigate(App.config.defaultRoute, { force: true });
    };

    if (window.Forms && Forms.showConfirm) {
      Forms.showConfirm(
        'Очистить все данные?',
        'Будут удалены все артефакты, заметки, прогресс, настройки и история. Это действие необратимо!',
        confirmFn
      );
    } else {
      if (confirm('Очистить все данные? Это действие необратимо!')) {
        confirmFn();
      }
    }
  }

  function _resetToDemo() {
    var confirmFn = function () {
      Utils.storage.clear();

      // Set default settings
      Utils.storage.set(Utils.constants.STORAGE_KEYS.SETTINGS, Utils.misc.deepClone(DEFAULT_SETTINGS));

      // Generate demo artifacts
      var modules = CourseData.getModules();
      var artifacts = [];
      modules.forEach(function (mod) {
        var lessons = CourseData.getLessons(mod.id);
        lessons.forEach(function (lesson) {
          var arts = CourseData.getArtifacts(lesson.id);
          arts.forEach(function (art) {
            var clone = Utils.misc.deepClone(art);
            clone.createdAt = new Date().toISOString();
            artifacts.push(clone);
          });
        });
      });
      Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, artifacts);

      App.ui.showToast('Данные сброшены к демо', 'success');
      App.router.navigate(App.config.defaultRoute, { force: true });
    };

    if (window.Forms && Forms.showConfirm) {
      Forms.showConfirm('Сбросить к демо-данным?', 'Текущие данные будут заменены демо-данными.', confirmFn);
    } else {
      if (confirm('Сбросить к демо-данным?')) {
        confirmFn();
      }
    }
  }

  // ========================================================================
  // SETTINGS
  // ========================================================================

  var _settingsUnsaved = false;
  var _settingsState = Utils.misc.deepClone(DEFAULT_SETTINGS);

  App.pages.renderSettings = function () {
    Debug.perfStart('render_settings');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      // Load current settings
      var stored = Utils.storage.get(Utils.constants.STORAGE_KEYS.SETTINGS);
      _settingsState = Utils.misc.merge(Utils.misc.deepClone(DEFAULT_SETTINGS), stored || {});
      _settingsUnsaved = false;

      var root = Utils.dom.create('div', { class: 'page page-settings' });

      Utils.dom.append(root, pageHeader('Настройки', 'Управление внешним видом и поведением приложения'));

      // --- Section: Appearance ---
      var appearanceSection = sectionWrap('Внешний вид');

      // Theme radio
      var themeRow = Utils.dom.create('div', { class: 'setting-row' });
      Utils.dom.append(themeRow, Utils.dom.create('label', { class: 'setting-label', text: 'Тема:' }));

      var themeGroup = Utils.dom.create('div', { class: 'setting-radio-group' });
      var themes = [
        { value: 'light', label: 'Светлая', icon: ICONS.sun },
        { value: 'dark', label: 'Тёмная', icon: ICONS.moon },
        { value: 'system', label: 'Системная', icon: ICONS.monitor }
      ];

      themes.forEach(function (t) {
        var radioId = 'theme-' + t.value;
        var radio = Utils.dom.create('input', {
          type: 'radio',
          id: radioId,
          name: 'theme',
          value: t.value
        });
        radio.checked = _settingsState.theme === t.value;

        var label = Utils.dom.create('label', {
          class: 'radio-label theme-radio-label' + (_settingsState.theme === t.value ? ' active' : ''),
          for: radioId
        });
        var iconSpan = Utils.dom.create('span', { class: 'radio-label-icon' });
        iconSpan.innerHTML = t.icon;
        Utils.dom.append(label, iconSpan);
        Utils.dom.append(label, Utils.dom.create('span', { text: t.label }));

        radio.addEventListener('change', function () {
          _settingsState.theme = t.value;
          _markSettingsUnsaved();
          // Apply immediately
          if (t.value === 'system') {
            if (Utils.css.applySystemTheme) Utils.css.applySystemTheme();
          } else if (Utils.css.setTheme) {
            Utils.css.setTheme(t.value);
          }
          Utils.dom.$$('.theme-radio-label').forEach(function (l) {
            Utils.dom.removeClass(l, 'active');
          });
          Utils.dom.addClass(label, 'active');
        });

        Utils.dom.append(themeGroup, radio);
        Utils.dom.append(themeGroup, label);
      });
      Utils.dom.append(themeRow, themeGroup);
      Utils.dom.append(appearanceSection, themeRow);

      // Accent color palette
      var accentRow = Utils.dom.create('div', { class: 'setting-row' });
      Utils.dom.append(accentRow, Utils.dom.create('label', { class: 'setting-label', text: 'Акцентный цвет:' }));

      var palette = Utils.dom.create('div', { class: 'accent-palette' });
      ACCENT_COLORS.forEach(function (color, idx) {
        var swatch = Utils.dom.create('button', {
          class: 'accent-swatch' + (_settingsState.accentColorIndex === idx ? ' active' : ''),
          style: 'background:' + color.value,
          title: color.name,
          'aria-label': color.name,
          'data-index': String(idx)
        });
        swatch.addEventListener('click', function () {
          _settingsState.accentColorIndex = idx;
          _markSettingsUnsaved();
          if (Utils.css.setVar) {
            Utils.css.setVar('--accent', color.value);
          } else {
            document.documentElement.style.setProperty('--accent', color.value);
          }
          Utils.dom.$$('.accent-swatch').forEach(function (s) {
            Utils.dom.removeClass(s, 'active');
          });
          Utils.dom.addClass(swatch, 'active');
        });
        Utils.dom.append(palette, swatch);
      });
      Utils.dom.append(accentRow, palette);
      Utils.dom.append(appearanceSection, accentRow);

      // Compact view checkbox
      var compactRow = Utils.dom.create('div', { class: 'setting-row setting-row-check' });
      var compactCb = Utils.dom.create('input', {
        type: 'checkbox',
        id: 'setting-compact',
        class: 'setting-checkbox'
      });
      compactCb.checked = _settingsState.compactView;
      compactCb.addEventListener('change', function () {
        _settingsState.compactView = compactCb.checked;
        _markSettingsUnsaved();
        if (Utils.css.setCompactView) {
          Utils.css.setCompactView(compactCb.checked);
        }
      });
      Utils.dom.append(compactRow, compactCb);
      Utils.dom.append(compactRow, Utils.dom.create('label', {
        class: 'setting-label-check',
        text: 'Компактный режим (уменьшенные отступы и шрифты)',
        for: 'setting-compact'
      }));
      Utils.dom.append(appearanceSection, compactRow);

      // Font size radio
      var fontRow = Utils.dom.create('div', { class: 'setting-row' });
      Utils.dom.append(fontRow, Utils.dom.create('label', { class: 'setting-label', text: 'Размер шрифта:' }));

      var fontGroup = Utils.dom.create('div', { class: 'setting-radio-group' });
      var fontSizes = [
        { value: 'S', label: 'Малый' },
        { value: 'M', label: 'Средний' },
        { value: 'L', label: 'Крупный' }
      ];

      fontSizes.forEach(function (fs) {
        var radioId = 'fontsize-' + fs.value;
        var radio = Utils.dom.create('input', {
          type: 'radio',
          id: radioId,
          name: 'fontsize',
          value: fs.value
        });
        radio.checked = _settingsState.fontSize === fs.value;

        var label = Utils.dom.create('label', {
          class: 'radio-label' + (_settingsState.fontSize === fs.value ? ' active' : ''),
          for: radioId,
          text: fs.label
        });

        radio.addEventListener('change', function () {
          _settingsState.fontSize = fs.value;
          _markSettingsUnsaved();
          _applyFontSize(fs.value);
          Utils.dom.$$('.radio-label[name]'.replace('name', '')).forEach(function () {});
          Utils.dom.$$('input[name="fontsize"]').forEach(function (r) {
            var lbl = r.nextElementSibling;
            if (lbl) Utils.dom.removeClass(lbl, 'active');
          });
          Utils.dom.addClass(label, 'active');
        });

        Utils.dom.append(fontGroup, radio);
        Utils.dom.append(fontGroup, label);
      });
      Utils.dom.append(fontRow, fontGroup);
      Utils.dom.append(appearanceSection, fontRow);

      Utils.dom.append(root, appearanceSection);

      // --- Section: Behavior ---
      var behaviorSection = sectionWrap('Поведение');

      var behaviorOptions = [
        { id: 'setting-autosave', label: 'Автосохранение изменений', key: 'autosave' },
        { id: 'setting-confirm-del', label: 'Подтверждение перед удалением', key: 'confirmDelete' },
        { id: 'setting-restore-page', label: 'Восстановление последней страницы', key: 'restoreLastPage' },
        { id: 'setting-animations', label: 'Анимации интерфейса', key: 'animations' }
      ];

      behaviorOptions.forEach(function (opt) {
        var row = Utils.dom.create('div', { class: 'setting-row setting-row-check' });
        var cb = Utils.dom.create('input', {
          type: 'checkbox',
          id: opt.id,
          class: 'setting-checkbox'
        });
        cb.checked = !!_settingsState[opt.key];
        cb.addEventListener('change', function () {
          _settingsState[opt.key] = cb.checked;
          _markSettingsUnsaved();
        });
        Utils.dom.append(row, cb);
        Utils.dom.append(row, Utils.dom.create('label', {
          class: 'setting-label-check',
          text: opt.label,
          for: opt.id
        }));
        Utils.dom.append(behaviorSection, row);
      });

      Utils.dom.append(root, behaviorSection);

      // --- Section: Pomodoro ---
      var pomoSection = sectionWrap('Помодоро');

      var pomoOptions = [
        { id: 'pomo-focus', label: 'Длительность работы (мин):', key: 'focusDuration', min: 1, max: 120 },
        { id: 'pomo-short', label: 'Короткий перерыв (мин):', key: 'shortBreak', min: 1, max: 60 },
        { id: 'pomo-long', label: 'Длинный перерыв (мин):', key: 'longBreak', min: 5, max: 120 },
        { id: 'pomo-sessions', label: 'Сессий до длинного перерыва:', key: 'sessionsBeforeLongBreak', min: 1, max: 10 }
      ];

      pomoOptions.forEach(function (opt) {
        var row = Utils.dom.create('div', { class: 'setting-row' });
        Utils.dom.append(row, Utils.dom.create('label', {
          class: 'setting-label',
          text: opt.label,
          for: opt.id
        }));
        var input = Utils.dom.create('input', {
          type: 'number',
          id: opt.id,
          class: 'setting-input',
          value: String(_settingsState.pomodoro[opt.key] || DEFAULT_SETTINGS.pomodoro[opt.key]),
          min: String(opt.min),
          max: String(opt.max)
        });
        input.addEventListener('change', function () {
          var val = Math.max(opt.min, Math.min(opt.max, parseInt(input.value, 10) || opt.min));
          input.value = String(val);
          _settingsState.pomodoro[opt.key] = val;
          _markSettingsUnsaved();
        });
        Utils.dom.append(row, input);
        Utils.dom.append(pomoSection, row);
      });

      // Pomodoro checkboxes
      var pomoChecks = [
        { id: 'pomo-auto', label: 'Автопереход между режимами', key: 'autoTransition' },
        { id: 'pomo-sound', label: 'Звуковые уведомления', key: 'soundEnabled' }
      ];

      pomoChecks.forEach(function (opt) {
        var row = Utils.dom.create('div', { class: 'setting-row setting-row-check' });
        var cb = Utils.dom.create('input', {
          type: 'checkbox',
          id: opt.id,
          class: 'setting-checkbox'
        });
        cb.checked = !!_settingsState.pomodoro[opt.key];
        cb.addEventListener('change', function () {
          _settingsState.pomodoro[opt.key] = cb.checked;
          _markSettingsUnsaved();
        });
        Utils.dom.append(row, cb);
        Utils.dom.append(row, Utils.dom.create('label', {
          class: 'setting-label-check',
          text: opt.label,
          for: opt.id
        }));
        Utils.dom.append(pomoSection, row);
      });

      Utils.dom.append(root, pomoSection);

      // --- Section: Data ---
      var dataSection = sectionWrap('Данные');

      var storageSize = Utils.storage.size ? Utils.storage.size() : 0;
      var storageKeys = Utils.storage.keys ? Utils.storage.keys().length : 0;

      var dataInfo = Utils.dom.create('div', { class: 'data-info' });
      Utils.dom.append(dataInfo, Utils.dom.create('div', {
        class: 'data-info-row',
        text: 'Размер хранилища: ' + Utils.format.formatFileSize(storageSize)
      }));
      Utils.dom.append(dataInfo, Utils.dom.create('div', {
        class: 'data-info-row',
        text: 'Ключей в localStorage: ' + storageKeys
      }));
      Utils.dom.append(dataSection, dataInfo);

      var exportDataBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
      exportDataBtn.innerHTML = ICONS.download;
      Utils.dom.append(exportDataBtn, Utils.dom.fromHTML('<span>Экспорт данных</span>'));
      exportDataBtn.addEventListener('click', function () {
        App.router.navigate('sharing');
      });
      Utils.dom.append(dataSection, exportDataBtn);

      var clearDataBtn2 = Utils.dom.create('button', { class: 'btn btn-danger' });
      clearDataBtn2.innerHTML = ICONS.trash;
      Utils.dom.append(clearDataBtn2, Utils.dom.fromHTML('<span>Очистить данные</span>'));
      clearDataBtn2.addEventListener('click', function () {
        _clearAllData();
      });
      Utils.dom.append(dataSection, clearDataBtn2);

      Utils.dom.append(root, dataSection);

      // --- Section: About ---
      var aboutSection = sectionWrap('О приложении');

      var version = (Utils.constants.APP_VERSION || '1.0.0');
      Utils.dom.append(aboutSection, Utils.dom.create('p', {
        class: 'about-version',
        text: 'Версия: ' + version
      }));

      var aboutLinkBtn = Utils.dom.create('button', { class: 'btn btn-outline', text: 'О проекте' });
      aboutLinkBtn.addEventListener('click', function () {
        App.router.navigate('about');
      });
      Utils.dom.append(aboutSection, aboutLinkBtn);

      Utils.dom.append(root, aboutSection);

      // --- Save / Reset buttons ---
      var actionsRow = Utils.dom.create('div', { class: 'settings-actions' });

      var saveSettingsBtn = Utils.dom.create('button', {
        class: 'btn btn-primary',
        id: 'settings-save-btn',
        text: 'Сохранить настройки',
        disabled: 'disabled'
      });
      saveSettingsBtn.addEventListener('click', function () {
        Utils.storage.set(Utils.constants.STORAGE_KEYS.SETTINGS, _settingsState);
        _settingsUnsaved = false;
        saveSettingsBtn.disabled = true;
        App.state.hasUnsavedChanges = false;
        App.ui.showToast('Настройки сохранены', 'success');
      });

      var resetSettingsBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
      resetSettingsBtn.innerHTML = ICONS.reset;
      Utils.dom.append(resetSettingsBtn, Utils.dom.fromHTML('<span>Сбросить к по умолчанию</span>'));
      resetSettingsBtn.addEventListener('click', function () {
        var confirmFn = function () {
          _settingsState = Utils.misc.deepClone(DEFAULT_SETTINGS);
          Utils.storage.set(Utils.constants.STORAGE_KEYS.SETTINGS, _settingsState);

          // Apply defaults
          if (_settingsState.theme === 'system') {
            if (Utils.css.applySystemTheme) Utils.css.applySystemTheme();
          } else if (Utils.css.setTheme) {
            Utils.css.setTheme(_settingsState.theme);
          }
          if (Utils.css.setCompactView) Utils.css.setCompactView(_settingsState.compactView);
          _applyFontSize(_settingsState.fontSize);
          var accent = ACCENT_COLORS[_settingsState.accentColorIndex];
          if (accent && Utils.css.setVar) {
            Utils.css.setVar('--accent', accent.value);
          }

          App.ui.showToast('Настройки сброшены к умолчанию', 'info');
          App.pages.renderSettings();
        };

        if (window.Forms && Forms.showConfirm) {
          Forms.showConfirm('Сбросить настройки?', 'Все настройки вернутся к значениям по умолчанию.', confirmFn);
        } else {
          if (confirm('Сбросить настройки к умолчанию?')) {
            confirmFn();
          }
        }
      });

      Utils.dom.append(actionsRow, saveSettingsBtn);
      Utils.dom.append(actionsRow, resetSettingsBtn);
      Utils.dom.append(root, actionsRow);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      Debug.perfEnd('render_settings');
      return root;

    } catch (e) {
      Debug.error('Settings render failed', e);
      Debug.perfEnd('render_settings');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  function _markSettingsUnsaved() {
    _settingsUnsaved = true;
    var saveBtn = Utils.dom.$('#settings-save-btn');
    if (saveBtn) saveBtn.disabled = false;
  }

  function _applyFontSize(size) {
    var sizeMap = { S: '14px', M: '16px', L: '18px' };
    document.documentElement.style.fontSize = sizeMap[size] || '16px';
  }

  // ========================================================================
  // ABOUT
  // ========================================================================

  App.pages.renderAbout = function () {
    Debug.perfStart('render_about');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var root = Utils.dom.create('div', { class: 'page page-about' });

      // Logo
      var logoWrap = Utils.dom.create('div', { class: 'about-logo' });
      logoWrap.innerHTML = ICONS.logo;
      Utils.dom.append(root, logoWrap);

      // Title
      Utils.dom.append(root, Utils.dom.create('h2', { class: 'about-title', text: 'QA Study Portfolio' }));

      // Version
      var version = Utils.constants.APP_VERSION || '1.0.0';
      Utils.dom.append(root, Utils.dom.create('p', {
        class: 'about-version',
        text: 'Версия ' + version
      }));

      // Description
      Utils.dom.append(root, Utils.dom.create('p', {
        class: 'about-desc',
        text: 'Учебный кабинет QA-инженера. Приложение для отслеживания прогресса обучения, создания тестовой документации и управления знаниями в области тестирования ПО.'
      }));

      // Features
      var featuresSection = sectionWrap('Возможности');

      var features = [
        { icon: ICONS.book, text: 'Дорожная карта обучения' },
        { icon: ICONS.bug, text: 'Создание артефактов (баг-репорты, тест-кейсы, чек-листы)' },
        { icon: ICONS.doc, text: 'Глоссарий QA-терминов' },
        { icon: ICONS.clock, text: 'Таймер Помодоро' },
        { icon: ICONS.folder, text: 'Карта знаний' },
        { icon: ICONS.testPlan, text: 'Шаблоны документов' },
        { icon: ICONS.share, text: 'Экспорт и шеринг данных' },
        { icon: ICONS.moon, text: 'Тёмная тема' },
        { icon: ICONS.monitor, text: 'Работа офлайн (file://)' }
      ];

      var featuresList = Utils.dom.create('ul', { class: 'about-features' });
      features.forEach(function (f) {
        var item = Utils.dom.create('li', { class: 'about-feature' });
        var iconSpan = Utils.dom.create('span', { class: 'about-feature-icon' });
        iconSpan.innerHTML = f.icon;
        Utils.dom.append(item, iconSpan);
        Utils.dom.append(item, Utils.dom.create('span', { class: 'about-feature-text', text: f.text }));
        Utils.dom.append(featuresList, item);
      });
      Utils.dom.append(featuresSection, featuresList);
      Utils.dom.append(root, featuresSection);

      // Technologies
      var techSection = sectionWrap('Технологии');
      Utils.dom.append(techSection, Utils.dom.create('p', {
        class: 'about-tech',
        text: 'HTML5, CSS3, Vanilla JS (ES6+), SVG, Canvas API, LocalStorage'
      }));
      Utils.dom.append(techSection, Utils.dom.create('p', {
        class: 'about-deps',
        text: 'Без фреймворков, без сборщиков, без внешних библиотек'
      }));
      Utils.dom.append(root, techSection);

      // License
      var licenseSection = sectionWrap('Лицензия');
      Utils.dom.append(licenseSection, Utils.dom.create('p', {
        class: 'about-license',
        text: 'MIT License — свободное использование, модификация и распространение.'
      }));
      Utils.dom.append(root, licenseSection);

      // Buttons
      var btnRow = Utils.dom.create('div', { class: 'about-btn-row' });

      var helpBtn = Utils.dom.create('button', { class: 'btn btn-primary' });
      helpBtn.innerHTML = ICONS.help;
      Utils.dom.append(helpBtn, Utils.dom.fromHTML('<span>Открыть помощь</span>'));
      helpBtn.addEventListener('click', function () {
        App.router.navigate('help');
      });

      var settingsBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
      settingsBtn.innerHTML = ICONS.settings;
      Utils.dom.append(settingsBtn, Utils.dom.fromHTML('<span>Открыть настройки</span>'));
      settingsBtn.addEventListener('click', function () {
        App.router.navigate('settings');
      });

      Utils.dom.append(btnRow, helpBtn);
      Utils.dom.append(btnRow, settingsBtn);
      Utils.dom.append(root, btnRow);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      Debug.perfEnd('render_about');
      return root;

    } catch (e) {
      Debug.error('About render failed', e);
      Debug.perfEnd('render_about');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ========================================================================
  // HELP
  // ========================================================================

  App.pages.renderHelp = function () {
    Debug.perfStart('render_help');
    var workspace = Utils.dom.$('#main-content');
    if (!workspace) return null;

    try {
      var root = Utils.dom.create('div', { class: 'page page-help' });

      Utils.dom.append(root, pageHeader('Помощь', 'Справка по использованию приложения'));

      // Search
      var searchWrap = Utils.dom.create('div', { class: 'help-search-wrap' });
      var searchIcon = Utils.dom.create('span', { class: 'help-search-icon' });
      searchIcon.innerHTML = ICONS.search;
      var searchInput = Utils.dom.create('input', {
        type: 'search',
        class: 'search-bar help-search',
        placeholder: 'Поиск по справке…',
        'aria-label': 'Поиск по справке',
        autocomplete: 'off',
        spellcheck: 'false'
      });
      Utils.dom.append(searchWrap, searchIcon);
      Utils.dom.append(searchWrap, searchInput);
      Utils.dom.append(root, searchWrap);

      // Accordion list
      var accordionList = Utils.dom.create('div', { class: 'help-accordion-list', id: 'help-accordion-list' });
      Utils.dom.append(root, accordionList);

      // Build accordion content
      var helpSections = _getHelpContent();

      function _renderAccordions(filter) {
        Utils.dom.empty(accordionList);
        var filterLower = (filter || '').toLowerCase();

        helpSections.forEach(function (section) {
          // Filter check
          if (filterLower) {
            var searchable = (section.title + ' ' + section.content.join(' ')).toLowerCase();
            if (searchable.indexOf(filterLower) === -1) return;
          }

          var accordion = Utils.dom.create('div', { class: 'help-accordion' });

          var header = Utils.dom.create('button', {
            class: 'accordion-header',
            'aria-expanded': 'false'
          });

          var headerIcon = Utils.dom.create('span', { class: 'accordion-icon' });
          headerIcon.innerHTML = ICONS.chevronRight;

          Utils.dom.append(header, headerIcon);
          Utils.dom.append(header, Utils.dom.create('span', {
            class: 'accordion-title',
            text: section.title
          }));

          var content = Utils.dom.create('div', { class: 'accordion-content', hidden: 'hidden' });

          section.content.forEach(function (line) {
            if (line.type === 'text') {
              Utils.dom.append(content, Utils.dom.create('p', { class: 'accordion-text', text: line.text }));
            } else if (line.type === 'heading') {
              Utils.dom.append(content, Utils.dom.create('h4', { class: 'accordion-heading', text: line.text }));
            } else if (line.type === 'list') {
              var ul = Utils.dom.create('ul', { class: 'accordion-list' });
              line.items.forEach(function (item) {
                Utils.dom.append(ul, Utils.dom.create('li', { class: 'accordion-list-item', text: item }));
              });
              Utils.dom.append(content, ul);
            } else if (line.type === 'table') {
              var table = Utils.dom.create('table', { class: 'accordion-table' });
              var thead = Utils.dom.create('thead');
              var tr = Utils.dom.create('tr');
              line.headers.forEach(function (h) {
                Utils.dom.append(tr, Utils.dom.create('th', { text: h }));
              });
              Utils.dom.append(thead, tr);
              Utils.dom.append(table, thead);
              var tbody = Utils.dom.create('tbody');
              line.rows.forEach(function (row) {
                var tr2 = Utils.dom.create('tr');
                row.forEach(function (cell) {
                  Utils.dom.append(tr2, Utils.dom.create('td', { text: cell }));
                });
                Utils.dom.append(tbody, tr2);
              });
              Utils.dom.append(table, tbody);
              Utils.dom.append(content, table);
            } else if (line.type === 'code') {
              var pre = Utils.dom.create('pre', { class: 'accordion-code' });
              pre.textContent = line.text;
              Utils.dom.append(content, pre);
            }
          });

          // Toggle
          header.addEventListener('click', function () {
            var expanded = header.getAttribute('aria-expanded') === 'true';
            if (expanded) {
              header.setAttribute('aria-expanded', 'false');
              content.hidden = true;
              headerIcon.innerHTML = ICONS.chevronRight;
              Utils.dom.removeClass(accordion, 'expanded');
            } else {
              header.setAttribute('aria-expanded', 'true');
              content.hidden = false;
              headerIcon.innerHTML = ICONS.chevronDown;
              Utils.dom.addClass(accordion, 'expanded');
            }
          });

          Utils.dom.append(accordion, header);
          Utils.dom.append(accordion, content);
          Utils.dom.append(accordionList, accordion);
        });
      }

      // Initial render
      _renderAccordions('');

      // Search debounce
      var debouncedSearch = Utils.event.debounce(function (query) {
        _renderAccordions(query);
      }, 300);

      searchInput.addEventListener('input', function (e) {
        debouncedSearch(e.target.value.trim());
      });

      // Action buttons
      var actionsRow = Utils.dom.create('div', { class: 'help-actions' });

      var resetOnboardingBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
      resetOnboardingBtn.innerHTML = ICONS.reset;
      Utils.dom.append(resetOnboardingBtn, Utils.dom.fromHTML('<span>Сбросить онбординг</span>'));
      resetOnboardingBtn.addEventListener('click', function () {
        Utils.storage.set(Utils.constants.STORAGE_KEYS.ONBOARDED, false);
        App.ui.showToast('Онбординг сброшен. Перезагрузите страницу.', 'info');
        App._checkOnboarding();
      });

      Utils.dom.append(actionsRow, resetOnboardingBtn);

      // Debug panel button
      if (window.Debug && Debug.enabled) {
        var debugBtn = Utils.dom.create('button', { class: 'btn btn-outline' });
        debugBtn.innerHTML = ICONS.info;
        Utils.dom.append(debugBtn, Utils.dom.fromHTML('<span>Панель отладки</span>'));
        debugBtn.addEventListener('click', function () {
          if (Debug.togglePanel) {
            Debug.togglePanel();
          } else if (Debug.showPanel) {
            Debug.showPanel();
          }
        });
        Utils.dom.append(actionsRow, debugBtn);
      }

      Utils.dom.append(root, actionsRow);

      // Render into workspace
      Utils.dom.empty(workspace);
      Utils.dom.append(workspace, root);

      Debug.perfEnd('render_help');
      return root;

    } catch (e) {
      Debug.error('Help render failed', e);
      Debug.perfEnd('render_help');
      App.router.renderError(workspace, e);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // Help content
  // ----------------------------------------------------------------

  function _getHelpContent() {
    var shortcuts = [];
    if (window.Keyboard && Keyboard.getShortcuts) {
      try {
        shortcuts = Keyboard.getShortcuts();
      } catch (e) {
        Debug.warn('Failed to get shortcuts: ' + e.message);
      }
    }
    // Fallback shortcuts
    if (!shortcuts || shortcuts.length === 0) {
      shortcuts = [
        { keys: 'Ctrl+/', desc: 'Открыть поиск' },
        { keys: 'Ctrl+B', desc: 'Свернуть/развернуть сайдбар' },
        { keys: 'Ctrl+D', desc: 'Перейти на дашборд' },
        { keys: 'Ctrl+S', desc: 'Сохранить' },
        { keys: 'Ctrl+E', desc: 'Перейти к артефактам' },
        { keys: 'Ctrl+G', desc: 'Перейти к глоссарию' },
        { keys: 'Ctrl+P', desc: 'Открыть Помодоро' },
        { keys: 'Esc', desc: 'Закрыть модалку/панель' },
        { keys: 'Tab', desc: 'Навигация по элементам' }
      ];
    }

    var shortcutRows = shortcuts.map(function (s) {
      return [s.keys, s.desc];
    });

    return [
      {
        title: 'Начало работы',
        content: [
          { type: 'text', text: 'QA Study Portfolio — это учебный кабинет QA-инженера. Здесь вы можете отслеживать прогресс обучения, создавать тестовую документацию и управлять своими знаниями.' },
          { type: 'heading', text: 'Первые шаги' },
          { type: 'list', items: [
            'Откройте раздел «Дорожная карта», чтобы увидеть план обучения.',
            'Отмечайте пройденные уроки чекбоксами — прогресс будет сохранён автоматически.',
            'Создайте первый артефакт в разделе «Артефакты» — например, баг-репорт.',
            'Настройте таймер Помодоро для эффективной учёбы.',
            'Изучите глоссарий QA-терминов в разделе «Глоссарий».'
          ]},
          { type: 'text', text: 'Приложение работает офлайн — все данные хранятся в браузере (localStorage). Для начала работы не нужен интернет.' }
        ]
      },
      {
        title: 'Дорожная карта',
        content: [
          { type: 'text', text: 'Дорожная карта показывает план обучения с модулями и уроками. Каждый модуль содержит набор уроков, которые можно отмечать как пройденные.' },
          { type: 'heading', text: 'Как использовать' },
          { type: 'list', items: [
            'Откройте раздел «Дорожная карта» в боковом меню.',
            'Переключайте между видами «Список» и «Граф» с помощью переключателя сверху.',
            'В виде «Список» отмечайте пройденные уроки чекбоксами.',
            'Прогресс по каждому модулю отображается в виде прогресс-бара.',
            'Некоторые модули заблокированы до завершения предыдущих — они отмечены значком замка.'
          ]},
          { type: 'text', text: 'Прогресс сохраняется автоматически в localStorage. При повторном открытии приложения вы продолжите с того же места.' }
        ]
      },
      {
        title: 'Артефакты',
        content: [
          { type: 'text', text: 'В разделе «Артефакты» вы можете создавать и хранить тестовую документацию: баг-репорты, тест-кейсы, чек-листы, тест-планы.' },
          { type: 'heading', text: 'Создание артефакта' },
          { type: 'list', items: [
            'Нажмите кнопку «Создать артефакт» в правом верхнем углу.',
            'Выберите тип артефакта: баг-репорт, тест-кейс, чек-лист и т.д.',
            'Заполните поля в редакторе. Шаблон подставит нужную структуру.',
            'Сохраните артефакт — он появится в общем списке.'
          ]},
          { type: 'heading', text: 'Действия с артефактами' },
          { type: 'list', items: [
            'Открыть — просмотр артефакта в редакторе.',
            'Редактировать — изменение содержимого.',
            'Копировать — создание дубликата с новым ID.',
            'Удалить — удаление артефакта (с подтверждением).'
          ]},
          { type: 'text', text: 'Фильтруйте артефакты по типу с помощью чипов в верхней части страницы.' }
        ]
      },
      {
        title: 'Глоссарий',
        content: [
          { type: 'text', text: 'Глоссарий содержит термины и определения из мира тестирования ПО.' },
          { type: 'heading', text: 'Поиск и навигация' },
          { type: 'list', items: [
            'Используйте поле поиска для фильтрации терминов.',
            'Алфавитный указатель (A-Z, А-Я) позволяет быстро перейти к нужной букве.',
            'Связанные термины кликабельны — клик приведёт к соответствующему термину.',
            'Фильтр по тегам показывает термины определённой категории.',
            'Кнопка «Добавить термин» позволяет создать собственный термин.'
          ]}
        ]
      },
      {
        title: 'Помодоро',
        content: [
          { type: 'text', text: 'Таймер Помодоро — это техника управления временем, которая помогает учиться эффективно, чередуя периоды работы и отдыха.' },
          { type: 'heading', text: 'Как использовать' },
          { type: 'list', items: [
            'Нажмите «Старт» для запуска таймера (по умолчанию 25 минут работы).',
            'После завершения сессии прозвучит сигнал и таймер переключится на перерыв.',
            'Короткий перерыв — 5 минут, длинный — 15 минут (после 4 сессий).',
            'Нажмите «Пауза» для приостановки, «Сброс» — для возврата к началу.',
            '«Пропустить» позволяет перейти к следующему режиму без ожидания.'
          ]},
          { type: 'heading', text: 'Настройки' },
          { type: 'list', items: [
            'Длительность работы: от 1 до 90 минут (по умолчанию 25).',
            'Длительность короткого перерыва: от 1 до 30 минут (по умолчанию 5).',
            'Длительность длинного перерыва: от 1 до 60 минут (по умолчанию 15).',
            'Количество сессий до длинного перерыва: от 1 до 10 (по умолчанию 4).',
            'Автопереход: автоматически переключать режимы.',
            'Звуковые уведомления: звуковой сигнал при завершении сессии.'
          ]},
          { type: 'text', text: 'Статистика за сегодня и история сессий доступны в нижней части страницы. График показывает данные за последние 7 дней.' }
        ]
      },
      {
        title: 'Экспорт и шеринг',
        content: [
          { type: 'text', text: 'В разделе «Экспорт и шеринг» вы можете сохранить данные портфолио или передать их.' },
          { type: 'heading', text: 'Экспорт' },
          { type: 'list', items: [
            'Выберите формат: JSON (структурированные данные), HTML (веб-страница) или Markdown (текст).',
            'Отметьте, что экспортировать: модули, артефакты, заметки, теги, настройки, историю.',
            'Нажмите «Скачать» — файл сохранится на устройство.'
          ]},
          { type: 'heading', text: 'Импорт' },
          { type: 'list', items: [
            'Перетащите .json файл в зону импорта или нажмите для выбора файла.',
            'Просмотрите содержимое перед импортом.',
            'Выберите режим: «Объединить» (добавить к текущим данным) или «Заменить» (полная замена).',
            'Нажмите «Импортировать» для подтверждения.'
          ]},
          { type: 'heading', text: 'Шеринг' },
          { type: 'list', items: [
            'Сгенерируйте shareable-ссылку (data URI с base64-кодированием).',
            'Скопируйте ссылку или поделитесь через Web Share API.',
            'Резервная копия — полный бэкап всех данных в JSON.'
          ]}
        ]
      },
      {
        title: 'Горячие клавиши',
        content: [
          { type: 'text', text: 'Используйте горячие клавиши для быстрой навигации:' },
          { type: 'table', headers: ['Комбинация', 'Действие'], rows: shortcutRows }
        ]
      },
      {
        title: 'Настройки',
        content: [
          { type: 'text', text: 'В разделе «Настройки» можно изменить внешний вид и поведение приложения.' },
          { type: 'heading', text: 'Внешний вид' },
          { type: 'list', items: [
            'Тема: светлая, тёмная или системная (по умолчанию).',
            'Акцентный цвет: выберите из 10 доступных цветов.',
            'Компактный режим: уменьшенные отступы и шрифты для экономии места.',
            'Размер шрифта: малый (14px), средний (16px) или крупный (18px).'
          ]},
          { type: 'heading', text: 'Поведение' },
          { type: 'list', items: [
            'Автосохранение: изменения сохраняются автоматически.',
            'Подтверждение перед удалением: диалог перед удалением элементов.',
            'Восстановление последней страницы: при запуске открывается последняя просмотренная страница.',
            'Анимации: включение/отключение анимаций интерфейса.'
          ]},
          { type: 'text', text: 'Не забудьте нажать «Сохранить настройки» после изменений.' }
        ]
      },
      {
        title: 'Устранение проблем',
        content: [
          { type: 'heading', text: 'Частые вопросы' },
          { type: 'heading', text: 'Данные не сохраняются' },
          { type: 'list', items: [
            'Убедитесь, что браузер не работает в режиме инкогнито.',
            'Проверьте, не отключено ли хранилище (localStorage) в настройках браузера.',
            'Очистите кэш браузера и перезагрузите страницу.'
          ]},
          { type: 'heading', text: 'Тёмная тема не применяется' },
          { type: 'list', items: [
            'Проверьте настройки темы в разделе «Настройки» → «Внешний вид».',
            'При выборе «Системная» тема зависит от настроек ОС.',
            'Попробуйте вручную выбрать «Светлая» или «Тёмная».'
          ]},
          { type: 'heading', text: 'Приложение работает медленно' },
          { type: 'list', items: [
            'Включите компактный режим в настройках.',
            'Отключите анимации в разделе «Настройки» → «Поведение».',
            'Очистите данные в разделе «Экспорт и шеринг» → «Очистка данных» (сначала сделайте бэкап!).'
          ]},
          { type: 'heading', text: 'Импорт не работает' },
          { type: 'list', items: [
            'Убедитесь, что файл имеет формат .json.',
            'Проверьте, что файл не повреждён — откройте его в текстовом редакторе.',
            'Файл должен содержать данные в формате, созданном этим приложением.'
          ]}
        ]
      }
    ];
  }

})();
/* ЧАСТЬ 5a из 6: UI-компоненты — Тосты, Модалки, Контекстная панель */

(function () {
  'use strict';

  // ========================================================================
  // КОНСТАНТЫ И ИКОНКИ ДЛЯ UI
  // ========================================================================

  var TOAST_ICONS = {
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
  };

  var SEARCH_ICONS = {
    module: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/></svg>',
    lesson: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    artifact: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    glossary: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    resource: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    portfolio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    template: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>'
  };

  var BREADCRUMB_SEPARATOR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

  // ========================================================================
  // ТОСТЫ
  // ========================================================================

  App.toastIcons = TOAST_ICONS;
  App._toastTimers = {};

  App.showToast = function (options) {
    if (typeof options === 'string') {
      options = { message: options };
    }

    var message = options.message || '';
    var type = options.type || 'info';
    var duration = options.duration || Utils.constants.TIMING.TOAST_DURATION || 3000;
    var actions = options.actions || null;

    // Error toasts last longer
    if (type === 'error' && !options.duration) {
      duration = 6000;
    }

    // Find container
    var container = Utils.dom.$('#toast-container');
    if (!container) {
      // Create container if missing
      container = Utils.dom.create('div', {
        id: 'toast-container',
        class: 'toast-container',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      });
      Utils.dom.append(document.body, container);
    }

    // Enforce max toasts
    var maxToasts = Utils.constants.LIMITS.MAX_TOASTS || 5;
    var existingToasts = Utils.dom.$$('.toast', container);
    while (existingToasts.length >= maxToasts) {
      var oldest = existingToasts[0];
      if (oldest) {
        var oldestId = oldest.getAttribute('data-toast-id');
        if (oldestId && App._toastTimers[oldestId]) {
          clearTimeout(App._toastTimers[oldestId]);
          delete App._toastTimers[oldestId];
        }
        Utils.dom.remove(oldest);
      }
      existingToasts = Utils.dom.$$('.toast', container);
    }

    // Create toast element
    var toastId = Utils.id.shortId();
    var toast = Utils.dom.create('div', {
      class: 'toast toast-' + type,
      'data-toast-id': toastId,
      role: 'alert'
    });

    // Icon
    var iconWrap = Utils.dom.create('div', { class: 'toast-icon' });
    iconWrap.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;
    Utils.dom.append(toast, iconWrap);

    // Message
    var msgWrap = Utils.dom.create('div', { class: 'toast-message' });
    Utils.dom.append(msgWrap, Utils.dom.create('span', { text: message }));
    Utils.dom.append(toast, msgWrap);

    // Action buttons
    if (actions && actions.length > 0) {
      var actionsWrap = Utils.dom.create('div', { class: 'toast-actions' });
      actions.forEach(function (action) {
        var btn = Utils.dom.create('button', {
          class: 'toast-action-btn',
          text: action.text
        });
        btn.addEventListener('click', function () {
          if (typeof action.handler === 'function') {
            action.handler();
          }
          App.hideToast(toastId);
        });
        Utils.dom.append(actionsWrap, btn);
      });
      Utils.dom.append(toast, actionsWrap);
    }

    // Close button
    var closeBtn = Utils.dom.create('button', {
      class: 'toast-close-btn',
      'aria-label': 'Закрыть уведомление',
      title: 'Закрыть'
    });
    closeBtn.innerHTML = TOAST_ICONS.close;
    closeBtn.addEventListener('click', function () {
      App.hideToast(toastId);
    });
    Utils.dom.append(toast, closeBtn);

    // Append
    Utils.dom.append(container, toast);

    // Fade in animation
    if (Utils.dom.fadeIn) {
      Utils.dom.fadeIn(toast, 200);
    } else {
      Utils.dom.addClass(toast, 'toast-visible');
    }

    // Auto-remove (only if no actions, or always with longer duration)
    if (!actions || duration > 0) {
      App._toastTimers[toastId] = setTimeout(function () {
        App.hideToast(toastId);
      }, duration);
    }

    return toastId;
  };

  App.hideToast = function (toastId) {
    if (!toastId) return;

    // Clear timer
    if (App._toastTimers[toastId]) {
      clearTimeout(App._toastTimers[toastId]);
      delete App._toastTimers[toastId];
    }

    // Find toast
    var toast = Utils.dom.$('.toast[data-toast-id="' + toastId + '"]');
    if (!toast) return;

    // Fade out then remove
    if (Utils.dom.fadeOut) {
      Utils.dom.fadeOut(toast, 200, function () {
        Utils.dom.remove(toast);
      });
    } else {
      Utils.dom.removeClass(toast, 'toast-visible');
      setTimeout(function () {
        Utils.dom.remove(toast);
      }, 200);
    }
  };

  App.hideAllToasts = function () {
    var container = Utils.dom.$('#toast-container');
    if (!container) return;
    var toasts = Utils.dom.$$('.toast', container);
    toasts.forEach(function (t) {
      var id = t.getAttribute('data-toast-id');
      if (id) App.hideToast(id);
    });
  };

  // ========================================================================
  // МОДАЛКИ
  // ========================================================================

  App.modals = {
    activeModal: null,
    previousFocus: null,
    _options: {},

    open: function (modalId, options) {
      options = options || {};
      App.modals._options[modalId] = options;

      var modal = Utils.dom.$('#' + modalId);

      // Try to find in #modals container
      if (!modal) {
        var modalsContainer = Utils.dom.$('#modals');
        if (modalsContainer) {
          modal = Utils.dom.$('#' + modalId, modalsContainer);
        }
      }

      if (!modal) {
        Debug.warn('Modal not found: ' + modalId);
        return false;
      }

      // Save current focus
      App.modals.previousFocus = document.activeElement;

      // Show modal
      modal.hidden = false;
      if (Utils.dom.fadeIn) {
        Utils.dom.fadeIn(modal, 200);
      } else {
        Utils.dom.addClass(modal, 'modal-visible');
      }

      // Prevent body scroll
      Utils.dom.addClass(document.body, 'modal-open');

      // Update #modals container aria
      var modalsWrap = Utils.dom.$('#modals');
      if (modalsWrap) {
        modalsWrap.setAttribute('aria-hidden', 'false');
      }

      // Set active modal
      App.modals.activeModal = modalId;
      App.state.activeModal = modalId;

      // Trap focus
      var modalContent = modal.querySelector('.modal-content') || modal.querySelector('.modal-dialog') || modal;
      if (Utils.a11y && Utils.a11y.trapFocus) {
        Utils.a11y.trapFocus(modalContent);
      }

      // Focus first focusable
      setTimeout(function () {
        if (Utils.a11y && Utils.a11y.focusFirst) {
          Utils.a11y.focusFirst(modalContent);
        } else {
          var firstFocusable = modalContent.querySelector('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
          if (firstFocusable) firstFocusable.focus();
        }
      }, 100);

      // Call onOpen callback
      if (typeof options.onOpen === 'function') {
        options.onOpen();
      }

      Debug.info('Modal opened: ' + modalId);
      return true;
    },

    close: function (modalId) {
      var modal = Utils.dom.$('#' + modalId);
      if (!modal) {
        var modalsContainer = Utils.dom.$('#modals');
        if (modalsContainer) {
          modal = Utils.dom.$('#' + modalId, modalsContainer);
        }
      }
      if (!modal) return false;

      // Hide modal
      if (Utils.dom.fadeOut) {
        Utils.dom.fadeOut(modal, 200, function () {
          modal.hidden = true;
        });
      } else {
        Utils.dom.removeClass(modal, 'modal-visible');
        setTimeout(function () {
          modal.hidden = true;
        }, 200);
      }

      // Check if any other modals are open
      var anyOpen = false;
      var allModals = Utils.dom.$$('.modal:not([hidden])');
      allModals.forEach(function (m) {
        if (m !== modal && !m.hidden) anyOpen = true;
      });

      // Restore body scroll if no modals open
      if (!anyOpen) {
        Utils.dom.removeClass(document.body, 'modal-open');
        var modalsWrap = Utils.dom.$('#modals');
        if (modalsWrap) {
          modalsWrap.setAttribute('aria-hidden', 'true');
        }
      }

      // Clear active modal
      if (App.modals.activeModal === modalId) {
        App.modals.activeModal = null;
        App.state.activeModal = null;
      }

      // Release focus trap
      if (Utils.a11y && Utils.a11y.releaseFocus) {
        Utils.a11y.releaseFocus();
      }

      // Restore previous focus
      if (App.modals.previousFocus) {
        try {
          App.modals.previousFocus.focus();
        } catch (e) {
          // Ignore
        }
        App.modals.previousFocus = null;
      }

      // Call onClose callback
      var options = App.modals._options[modalId] || {};
      if (typeof options.onClose === 'function') {
        options.onClose();
      }
      delete App.modals._options[modalId];

      Debug.info('Modal closed: ' + modalId);
      return true;
    },

    closeAll: function () {
      var modals = Utils.dom.$$('.modal:not([hidden])');
      modals.forEach(function (m) {
        if (m.id) {
          App.modals.close(m.id);
        }
      });
      Utils.dom.removeClass(document.body, 'modal-open');
      App.modals.activeModal = null;
      App.state.activeModal = null;
    },

    confirm: function (options) {
      options = options || {};
      var title = options.title || 'Подтверждение';
      var message = options.message || '';
      var confirmText = options.confirmText || 'Подтвердить';
      var cancelText = options.cancelText || 'Отмена';
      var onConfirm = options.onConfirm || function () {};
      var onCancel = options.onCancel || function () {};

      var modal = Utils.dom.$('#confirm-modal');
      if (!modal) {
        // Dynamically create confirm modal
        modal = _createConfirmModal();
      }

      // Set content
      var titleEl = modal.querySelector('#confirm-modal-title');
      var msgEl = modal.querySelector('#confirm-modal-message');
      var yesBtn = modal.querySelector('#confirm-yes-btn');
      var noBtn = modal.querySelector('#confirm-no-btn');

      if (titleEl) Utils.dom.setText(titleEl, title);
      if (msgEl) Utils.dom.setText(msgEl, message);
      if (yesBtn) Utils.dom.setText(yesBtn, confirmText);
      if (noBtn) Utils.dom.setText(noBtn, cancelText);

      // Clone buttons to remove old listeners
      if (yesBtn) {
        var newYesBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        newYesBtn.addEventListener('click', function () {
          App.modals.close('confirm-modal');
          onConfirm();
        });
      }
      if (noBtn) {
        var newNoBtn = noBtn.cloneNode(true);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);
        newNoBtn.addEventListener('click', function () {
          App.modals.close('confirm-modal');
          onCancel();
        });
      }

      App.modals.open('confirm-modal');
    },

    onboarding: function () {
      var modal = Utils.dom.$('#onboarding-modal');
      if (!modal) {
        Debug.warn('Onboarding modal not found');
        return;
      }

      var startBtn = modal.querySelector('#onboarding-start-btn');
      var skipBtn = modal.querySelector('#onboarding-skip-btn');

      if (startBtn) {
        var newStartBtn = startBtn.cloneNode(true);
        startBtn.parentNode.replaceChild(newStartBtn, startBtn);
        newStartBtn.addEventListener('click', function () {
          Utils.storage.set(Utils.constants.STORAGE_KEYS.ONBOARDED, true);
          App.modals.close('onboarding-modal');
          App.router.navigate('dashboard');
        });
      }

      if (skipBtn) {
        var newSkipBtn = skipBtn.cloneNode(true);
        skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn);
        newSkipBtn.addEventListener('click', function () {
          Utils.storage.set(Utils.constants.STORAGE_KEYS.ONBOARDED, true);
          App.modals.close('onboarding-modal');
        });
      }

      App.modals.open('onboarding-modal');
    },

    search: function () {
      var modal = Utils.dom.$('#search-modal');
      if (!modal) {
        Debug.warn('Search modal not found');
        return;
      }

      var input = modal.querySelector('#search-modal-input');
      var resultsContainer = modal.querySelector('#search-results');

      // Clear previous results
      if (resultsContainer) {
        Utils.dom.empty(resultsContainer);
        Utils.dom.append(resultsContainer, Utils.dom.create('p', {
          class: 'search-hint',
          text: 'Начните вводить запрос для поиска по всему приложению…'
        }));
      }

      // Clear input
      if (input) {
        input.value = '';
      }

      App.modals.open('search-modal', {
        onOpen: function () {
          // Focus input after animation
          setTimeout(function () {
            if (input) {
              input.focus();
            }
          }, 150);

          // Set up debounced search
          if (input) {
            var newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            input = newInput;

            var debounced = Utils.event.debounce(function (query) {
              _executeSearch(query, resultsContainer, modal);
            }, Utils.constants.TIMING.DEBOUNCE_SEARCH || 300);

            input.addEventListener('input', function (e) {
              var query = e.target.value.trim();
              if (query.length === 0) {
                if (resultsContainer) {
                  Utils.dom.empty(resultsContainer);
                  Utils.dom.append(resultsContainer, Utils.dom.create('p', {
                    class: 'search-hint',
                    text: 'Начните вводить запрос для поиска по всему приложению…'
                  }));
                }
                return;
              }
              debounced(query);
            });

            // Enter key → open first result
            input.addEventListener('keydown', function (e) {
              if (e.key === 'Enter') {
                e.preventDefault();
                var firstResult = resultsContainer && resultsContainer.querySelector('.search-result-item');
                if (firstResult) {
                  firstResult.click();
                }
              }
            });
          }
        }
      });
    }
  };

  // ----------------------------------------------------------------
  // Confirm modal dynamic creation
  // ----------------------------------------------------------------

  function _createConfirmModal() {
    var modal = Utils.dom.create('div', {
      class: 'modal modal-sm',
      id: 'confirm-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'confirm-modal-title',
      hidden: 'hidden'
    });

    var dialog = Utils.dom.create('div', { class: 'modal-dialog' });
    var content = Utils.dom.create('div', { class: 'modal-content' });

    var header = Utils.dom.create('div', { class: 'modal-header' });
    Utils.dom.append(header, Utils.dom.create('h3', {
      class: 'modal-title',
      id: 'confirm-modal-title',
      text: 'Подтверждение'
    }));
    var closeBtn = Utils.dom.create('button', {
      class: 'modal-close-btn',
      'aria-label': 'Закрыть',
      'data-modal-close': ''
    });
    closeBtn.innerHTML = TOAST_ICONS.close;
    Utils.dom.append(header, closeBtn);

    var body = Utils.dom.create('div', { class: 'modal-body' });
    Utils.dom.append(body, Utils.dom.create('p', {
      class: 'confirm-message',
      id: 'confirm-modal-message',
      text: ''
    }));

    var footer = Utils.dom.create('div', { class: 'modal-footer' });
    var yesBtn = Utils.dom.create('button', {
      class: 'btn btn-primary',
      id: 'confirm-yes-btn',
      text: 'Подтвердить'
    });
    var noBtn = Utils.dom.create('button', {
      class: 'btn btn-outline',
      id: 'confirm-no-btn',
      text: 'Отмена'
    });
    Utils.dom.append(footer, noBtn);
    Utils.dom.append(footer, yesBtn);

    Utils.dom.append(content, header);
    Utils.dom.append(content, body);
    Utils.dom.append(content, footer);
    Utils.dom.append(dialog, content);
    Utils.dom.append(modal, dialog);

    var modalsContainer = Utils.dom.$('#modals');
    if (modalsContainer) {
      Utils.dom.append(modalsContainer, modal);
    } else {
      Utils.dom.append(document.body, modal);
    }

    return modal;
  }

  // ----------------------------------------------------------------
  // Global modal event delegation
  // ----------------------------------------------------------------

  function _setupModalDelegation() {
    // Close button [data-modal-close]
    document.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('[data-modal-close]');
      if (closeBtn) {
        var modal = closeBtn.closest('.modal');
        if (modal && modal.id) {
          e.preventDefault();
          App.modals.close(modal.id);
        }
        return;
      }

      // Click outside modal content
      if (e.target.classList && e.target.classList.contains('modal')) {
        if (e.target.id) {
          e.preventDefault();
          App.modals.close(e.target.id);
        }
        return;
      }
    });

    // Escape to close active modal
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && App.modals.activeModal) {
        e.preventDefault();
        App.modals.close(App.modals.activeModal);
      }
    });
  }

  // Set up modal delegation after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _setupModalDelegation);
  } else {
    _setupModalDelegation();
  }

  // ========================================================================
  // КОНТЕКСТНАЯ ПАНЕЛЬ
  // ========================================================================

  App.contextPanel = {
    open: function (content, title) {
      var panel = Utils.dom.$('#context-panel');
      if (!panel) {
        Debug.warn('Context panel not found');
        return;
      }

      var titleEl = panel.querySelector('#context-panel-title');
      var contentEl = panel.querySelector('#context-panel-content');
      var closeBtn = panel.querySelector('#context-panel-close-btn');

      // Set title
      if (titleEl) {
        Utils.dom.setText(titleEl, title || 'Контекст');
      }

      // Set content
      if (contentEl) {
        Utils.dom.empty(contentEl);
        if (typeof content === 'string') {
          contentEl.innerHTML = content;
        } else if (content && content.nodeType) {
          Utils.dom.append(contentEl, content);
        }
      }

      // Set up close button
      if (closeBtn) {
        var newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', function () {
          App.contextPanel.close();
        });
      }

      // Show panel
      panel.hidden = false;
      var mainContainer = Utils.dom.$('#main-container');
      if (mainContainer) {
        Utils.dom.addClass(mainContainer, 'context-panel-open');
      }

      // Fade in
      if (Utils.dom.fadeIn) {
        Utils.dom.fadeIn(panel, 200);
      }

      App.state.contextPanelOpen = true;
      Debug.info('Context panel opened');
    },

    close: function () {
      var panel = Utils.dom.$('#context-panel');
      if (!panel) return;

      var finishClose = function () {
        panel.hidden = true;
        var contentEl = panel.querySelector('#context-panel-content');
        if (contentEl) {
          Utils.dom.empty(contentEl);
        }
      };

      if (Utils.dom.fadeOut) {
        Utils.dom.fadeOut(panel, 200, finishClose);
      } else {
        finishClose();
      }

      var mainContainer = Utils.dom.$('#main-container');
      if (mainContainer) {
        Utils.dom.removeClass(mainContainer, 'context-panel-open');
      }

      App.state.contextPanelOpen = false;
      Debug.info('Context panel closed');
    },

    toggle: function (content, title) {
      if (App.state.contextPanelOpen) {
        App.contextPanel.close();
      } else {
        App.contextPanel.open(content, title);
      }
    },

    setContent: function (content) {
      var contentEl = Utils.dom.$('#context-panel-content');
      if (!contentEl) return;
      Utils.dom.empty(contentEl);
      if (typeof content === 'string') {
        contentEl.innerHTML = content;
      } else if (content && content.nodeType) {
        Utils.dom.append(contentEl, content);
      }
    },

    isOpen: function () {
      return !!App.state.contextPanelOpen;
    }
  };

})();

(function () {
  'use strict';

  // ========================================================================
  // ИНДИКАТОР СОХРАНЕНИЯ
  // ========================================================================

  App.showSaveIndicator = function () {
    var indicator = Utils.dom.$('#save-indicator');
    if (!indicator) return;

    indicator.hidden = false;
    if (Utils.dom.fadeIn) {
      Utils.dom.fadeIn(indicator, 150);
    } else {
      Utils.dom.addClass(indicator, 'visible');
    }

    var duration = Utils.constants.TIMING.SAVE_INDICATOR || 1500;

    setTimeout(function () {
      if (Utils.dom.fadeOut) {
        Utils.dom.fadeOut(indicator, 200, function () {
          indicator.hidden = true;
        });
      } else {
        Utils.dom.removeClass(indicator, 'visible');
        setTimeout(function () {
          indicator.hidden = true;
        }, 200);
      }
    }, duration);

    if (Utils.a11y && Utils.a11y.announce) {
      Utils.a11y.announce('Сохранено');
    }
  };

  App.saveState = function () {
    try {
      // Collect current state
      Utils.storage.set(Utils.constants.STORAGE_KEYS.STATE, App.state);
      App.showSaveIndicator();
      App.state.hasUnsavedChanges = false;

      // Update save button
      var saveBtn = Utils.dom.$('#save-btn');
      if (saveBtn) {
        saveBtn.disabled = true;
      }

      Debug.info('State saved');
    } catch (e) {
      Debug.error('Failed to save state', e);
      App.showToast({
        message: 'Ошибка при сохранении данных',
        type: 'error'
      });
    }
  };

  App.markUnsaved = function () {
    App.state.hasUnsavedChanges = true;

    var saveBtn = Utils.dom.$('#save-btn');
    if (saveBtn) {
      saveBtn.disabled = false;
    }

    Debug.debug('Unsaved changes detected');
  };

  // ========================================================================
  // ХЛЕБНЫЕ КРОШКИ
  // ========================================================================

  App.renderBreadcrumbs = function (route) {
    var breadcrumbsContainer = Utils.dom.$('#breadcrumbs');
    if (!breadcrumbsContainer) return;

    var breadcrumbList = breadcrumbsContainer.querySelector('.breadcrumb-list');
    if (!breadcrumbList) {
      breadcrumbList = Utils.dom.create('ol', { class: 'breadcrumb-list' });
      Utils.dom.append(breadcrumbsContainer, breadcrumbList);
    }

    Utils.dom.empty(breadcrumbList);

    // Get breadcrumbs from router
    var crumbs = [];
    if (App.router && App.router.getBreadcrumbs) {
      crumbs = App.router.getBreadcrumbs(route) || [];
    }

    if (crumbs.length === 0) return;

    // Limit breadcrumbs
    var maxCrumbs = Utils.constants.LIMITS.MAX_BREADCRUMBS || 5;
    var displayCrumbs = crumbs;
    var hasEllipsis = false;

    if (crumbs.length > maxCrumbs) {
      var first = crumbs[0];
      var last3 = crumbs.slice(-3);
      displayCrumbs = [first].concat([{ ellipsis: true }]).concat(last3);
      hasEllipsis = true;
    }

    displayCrumbs.forEach(function (crumb, index) {
      var isLast = index === displayCrumbs.length - 1;
      var item = Utils.dom.create('li', { class: 'breadcrumb-item' });

      if (crumb.ellipsis) {
        Utils.dom.append(item, Utils.dom.create('span', {
          class: 'breadcrumb-ellipsis',
          text: '…',
          title: 'Промежуточные страницы скрыты'
        }));
      } else if (isLast) {
        // Current page — not a link
        Utils.dom.append(item, Utils.dom.create('span', {
          class: 'breadcrumb-current',
          'aria-current': 'page',
          text: crumb.title
        }));
      } else {
        // Link to page
        var link = Utils.dom.create('a', {
          class: 'breadcrumb-link',
          href: '#' + (crumb.route || ''),
          text: crumb.title
        });
        link.addEventListener('click', function (e) {
          e.preventDefault();
          if (crumb.route) {
            App.router.navigate(crumb.route);
          }
        });
        Utils.dom.append(item, link);
      }

      // Add separator if not last
      if (!isLast) {
        var sep = Utils.dom.create('span', {
          class: 'breadcrumb-separator',
          'aria-hidden': 'true'
        });
        sep.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
        Utils.dom.append(item, sep);
      }

      Utils.dom.append(breadcrumbList, item);
    });

    // Show/hide breadcrumbs container
    breadcrumbsContainer.hidden = crumbs.length <= 1;
  };

  // ========================================================================
  // ПОИСКОВАЯ СИСТЕМА
  // ========================================================================

  App._searchCache = null;
  App._searchCacheTime = 0;

  App.search = function (query) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    query = query.trim().toLowerCase();
    var results = [];
    var maxResults = Utils.constants.LIMITS.MAX_SEARCH_RESULTS || 50;

    // --- Source: Modules ---
    var modules = [];
    try {
      modules = CourseData.getModules() || [];
    } catch (e) {
      Debug.warn('Failed to get modules for search: ' + e.message);
    }

    modules.forEach(function (mod) {
      var score = _matchScore(query, [mod.title, mod.description, (mod.tags || []).join(' ')]);
      if (score > 0) {
        results.push({
          type: 'module',
          id: mod.id,
          title: mod.title,
          description: mod.description || '',
          route: 'roadmap',
          icon: 'module',
          score: score
        });
      }

      // --- Source: Lessons within module ---
      var lessons = [];
      try {
        lessons = CourseData.getLessons(mod.id) || [];
      } catch (e) {
        // Skip
      }

      lessons.forEach(function (lesson) {
        var lessonScore = _matchScore(query, [lesson.title, lesson.content, lesson.description]);
        if (lessonScore > 0) {
          results.push({
            type: 'lesson',
            id: lesson.id,
            title: lesson.title,
            description: lesson.content || lesson.description || '',
            route: 'roadmap',
            moduleId: mod.id,
            icon: 'lesson',
            score: lessonScore
          });
        }
      });
    });

    // --- Source: Artifacts ---
    var artifacts = Utils.storage.get(Utils.constants.STORAGE_KEYS.ARTIFACTS);
    if (Array.isArray(artifacts)) {
      artifacts.forEach(function (art) {
        var score = _matchScore(query, [art.title, art.type, (art.tags || []).join(' ')]);
        if (score > 0) {
          results.push({
            type: 'artifact',
            id: art.id,
            title: art.title,
            description: art.type || '',
            route: 'artifacts',
            icon: 'artifact',
            score: score
          });
        }
      });
    }

    // --- Source: Glossary ---
    var glossary = [];
    try {
      glossary = CourseData.getGlossary() || [];
    } catch (e) {
      // Skip
    }

    glossary.forEach(function (term) {
      var score = _matchScore(query, [term.term, term.definition, term.example, (term.tags || []).join(' ')]);
      if (score > 0) {
        results.push({
          type: 'glossary',
          id: term.term,
          title: term.term,
          description: term.definition || '',
          route: 'glossary',
          icon: 'glossary',
          score: score * 1.2 // Boost glossary matches slightly
        });
      }
    });

    // --- Source: Resources ---
    var userResources = Utils.storage.get(Utils.constants.STORAGE_KEYS.USER_RESOURCES);
    if (!Array.isArray(userResources)) userResources = [];

    var allResources = [];
    try {
      allResources = CourseData.getResources ? CourseData.getResources() : [];
    } catch (e) {
      // Skip
    }
    if (!Array.isArray(allResources)) allResources = [];
    allResources = allResources.concat(userResources);

    allResources.forEach(function (res) {
      var score = _matchScore(query, [res.title, res.description, (res.tags || []).join(' ')]);
      if (score > 0) {
        results.push({
          type: 'resource',
          id: res.id,
          title: res.title,
          description: res.description || '',
          route: 'resources',
          icon: 'resource',
          score: score
        });
      }
    });

    // --- Source: Portfolio items ---
    var portfolio = Utils.storage.get(Utils.constants.STORAGE_KEYS.PORTFOLIO);
    if (Array.isArray(portfolio)) {
      portfolio.forEach(function (item) {
        var score = _matchScore(query, [item.title, item.description, (item.tags || []).join(' ')]);
        if (score > 0) {
          results.push({
            type: 'portfolio',
            id: item.id,
            title: item.title,
            description: item.description || '',
            route: 'portfolio',
            icon: 'portfolio',
            score: score
          });
        }
      });
    }

    // --- Source: Templates ---
    var templates = [];
    try {
      templates = CourseData.getTemplates() || [];
    } catch (e) {
      // Skip
    }

    templates.forEach(function (tpl) {
      var score = _matchScore(query, [tpl.title, tpl.name, tpl.description, tpl.type]);
      if (score > 0) {
        results.push({
          type: 'template',
          id: tpl.id || tpl.type,
          title: tpl.title || tpl.name,
          description: tpl.description || '',
          route: 'templates',
          icon: 'template',
          score: score
        });
      }
    });

    // Sort by score (descending)
    results.sort(function (a, b) {
      return b.score - a.score;
    });

    // Limit results
    results = results.slice(0, maxResults);

    // Save to search history
    _saveSearchHistory(query);

    return results;
  };

  // ----------------------------------------------------------------
  // Search match scoring
  // ----------------------------------------------------------------

  function _matchScore(query, fields) {
    if (!query || !fields) return 0;
    var score = 0;
    var queryLower = query.toLowerCase();

    fields.forEach(function (field) {
      if (!field) return;
      var fieldLower = String(field).toLowerCase();

      // Exact match
      if (fieldLower === queryLower) {
        score += 100;
        return;
      }

      // Starts with
      if (fieldLower.indexOf(queryLower) === 0) {
        score += 50;
        return;
      }

      // Contains
      if (fieldLower.indexOf(queryLower) !== -1) {
        score += 25;
        return;
      }

      // Word match (individual words)
      var words = queryLower.split(/\s+/);
      var allWordsMatch = true;
      words.forEach(function (word) {
        if (word.length > 1 && fieldLower.indexOf(word) === -1) {
          allWordsMatch = false;
        }
      });
      if (allWordsMatch && words.length > 1) {
        score += 15;
      }
    });

    return score;
  }

  // ----------------------------------------------------------------
  // Search history
  // ----------------------------------------------------------------

  function _saveSearchHistory(query) {
    var history = Utils.storage.get(Utils.constants.STORAGE_KEYS.SEARCH_HISTORY);
    if (!Array.isArray(history)) history = [];

    // Remove duplicate
    var idx = history.indexOf(query);
    if (idx !== -1) {
      history.splice(idx, 1);
    }

    // Add to front
    history.unshift(query);

    // Keep last 20
    if (history.length > 20) {
      history = history.slice(0, 20);
    }

    Utils.storage.set(Utils.constants.STORAGE_KEYS.SEARCH_HISTORY, history);
  }

  function _getSearchHistory() {
    var history = Utils.storage.get(Utils.constants.STORAGE_KEYS.SEARCH_HISTORY);
    if (!Array.isArray(history)) history = [];
    return history;
  }

  // ----------------------------------------------------------------
  // Execute search in modal
  // ----------------------------------------------------------------

  function _executeSearch(query, resultsContainer, modal) {
    if (!resultsContainer) return;

    Utils.dom.empty(resultsContainer);

    if (!query || query.trim().length === 0) {
      Utils.dom.append(resultsContainer, Utils.dom.create('p', {
        class: 'search-hint',
        text: 'Начните вводить запрос для поиска по всему приложению…'
      }));
      return;
    }

    var results = App.search(query);

    if (results.length === 0) {
      Utils.dom.append(resultsContainer, Utils.dom.create('p', {
        class: 'search-empty',
        text: 'Ничего не найдено по запросу «' + query + '»'
      }));
      return;
    }

    // Results count
    var countEl = Utils.dom.create('div', { class: 'search-results-count' });
    Utils.dom.append(countEl, Utils.dom.create('span', {
      text: 'Найдено результатов: ' + results.length
    }));
    Utils.dom.append(resultsContainer, countEl);

    // Render each result
    results.forEach(function (result) {
      Utils.dom.append(resultsContainer, _renderSearchResultItem(result, query, modal));
    });
  }

  // ----------------------------------------------------------------
  // Render search result item
  // ----------------------------------------------------------------

  function _renderSearchResultItem(result, query, modal) {
    var item = Utils.dom.create('div', {
      class: 'search-result-item',
      role: 'option',
      'data-route': result.route || '',
      'data-type': result.type || '',
      tabindex: '0'
    });

    // Icon
    var iconWrap = Utils.dom.create('div', { class: 'search-result-icon' });
    iconWrap.innerHTML = SEARCH_ICONS[result.icon] || SEARCH_ICONS.artifact;
    Utils.dom.append(item, iconWrap);

    // Body
    var body = Utils.dom.create('div', { class: 'search-result-body' });

    // Type label
    var typeLabels = {
      module: 'Модуль',
      lesson: 'Урок',
      artifact: 'Артефакт',
      glossary: 'Термин',
      resource: 'Ресурс',
      portfolio: 'Портфолио',
      template: 'Шаблон'
    };

    Utils.dom.append(body, Utils.dom.create('span', {
      class: 'search-result-type',
      text: typeLabels[result.type] || result.type
    }));

    // Title with highlight
    var titleHtml = Utils.format.escapeHtml(result.title || '');
    if (query) {
      titleHtml = Utils.format.highlight(titleHtml, query);
    }
    var titleEl = Utils.dom.create('h4', { class: 'search-result-title' });
    titleEl.innerHTML = titleHtml;
    Utils.dom.append(body, titleEl);

    // Description with highlight (truncated)
    if (result.description) {
      var descHtml = Utils.format.escapeHtml(Utils.format.truncate(result.description, 120));
      if (query) {
        descHtml = Utils.format.highlight(descHtml, query);
      }
      var descEl = Utils.dom.create('p', { class: 'search-result-desc' });
      descEl.innerHTML = descHtml;
      Utils.dom.append(body, descEl);
    }

    Utils.dom.append(item, body);

    // Click handler
    var handleSelect = function () {
      App.modals.close('search-modal');

      // Navigate to route
      if (result.route) {
        App.router.navigate(result.route);
      }

      // For glossary terms, try to scroll to the term
      if (result.type === 'glossary' && result.id) {
        setTimeout(function () {
          var targetId = 'glossary-term-' + Utils.format.slugify(result.id);
          var target = Utils.dom.$('#' + targetId);
          if (target) {
            Utils.dom.scrollIntoView(target, { behavior: 'smooth', block: 'center' });
            Utils.dom.addClass(target, 'highlight-flash');
            setTimeout(function () {
              Utils.dom.removeClass(target, 'highlight-flash');
            }, 1500);
          }
        }, 300);
      }

      // For lessons, try to expand the module
      if (result.type === 'lesson' && result.moduleId) {
        setTimeout(function () {
          var moduleEl = Utils.dom.$('[data-module="' + result.moduleId + '"]');
          if (moduleEl) {
            Utils.dom.scrollIntoView(moduleEl, { behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    };

    item.addEventListener('click', handleSelect);
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });

    return item;
  }

  // ----------------------------------------------------------------
  // Search bar in header
  // ----------------------------------------------------------------

  function _setupHeaderSearch() {
    var searchInput = Utils.dom.$('#search-input');
    var searchClearBtn = Utils.dom.$('.search-clear-btn');
    var searchResultsDropdown = Utils.dom.$('#search-dropdown');

    if (!searchInput) return;

    // Debounced search
    var debouncedSearch = Utils.event.debounce(function (query) {
      if (query.length < 2) {
        if (searchResultsDropdown) {
          Utils.dom.empty(searchResultsDropdown);
          searchResultsDropdown.hidden = true;
        }
        return;
      }

      var results = App.search(query).slice(0, 8); // Show top 8 in dropdown

      if (searchResultsDropdown) {
        Utils.dom.empty(searchResultsDropdown);

        if (results.length === 0) {
          Utils.dom.append(searchResultsDropdown, Utils.dom.create('p', {
            class: 'search-dropdown-empty',
            text: 'Ничего не найдено'
          }));
        } else {
          results.forEach(function (result) {
            var item = _renderSearchResultItem(result, query, null);
            Utils.dom.append(searchResultsDropdown, item);
          });

          // "Show all results" link
          var showAll = Utils.dom.create('button', {
            class: 'search-show-all',
            text: 'Показать все результаты…'
          });
          showAll.addEventListener('click', function () {
            App.modals.search();
            var modalInput = Utils.dom.$('#search-modal-input');
            if (modalInput) {
              modalInput.value = query;
              modalInput.dispatchEvent(new Event('input'));
            }
          });
          Utils.dom.append(searchResultsDropdown, showAll);
        }

        searchResultsDropdown.hidden = false;
      }
    }, Utils.constants.TIMING.DEBOUNCE_SEARCH || 300);

    searchInput.addEventListener('input', function (e) {
      var query = e.target.value.trim();

      // Show/hide clear button
      if (searchClearBtn) {
        searchClearBtn.hidden = query.length === 0;
      }

      debouncedSearch(query);
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var query = searchInput.value.trim();
        if (query.length >= 2) {
          App.modals.search();
          var modalInput = Utils.dom.$('#search-modal-input');
          if (modalInput) {
            modalInput.value = query;
            modalInput.dispatchEvent(new Event('input'));
          }
        }
      }
    });

    // Clear button
    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', function () {
        searchInput.value = '';
        searchClearBtn.hidden = true;
        if (searchResultsDropdown) {
          Utils.dom.empty(searchResultsDropdown);
          searchResultsDropdown.hidden = true;
        }
        searchInput.focus();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
      if (searchResultsDropdown && !searchResultsDropdown.hidden) {
        var searchWrap = Utils.dom.$('.search-wrap') || Utils.dom.$('.header-search');
        if (searchWrap && !searchWrap.contains(e.target)) {
          searchResultsDropdown.hidden = true;
        }
      }
    });
  }

  // Set up header search after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _setupHeaderSearch);
  } else {
    _setupHeaderSearch();
  }

})();

(function () {
  'use strict';

  // ========================================================================
  // НАВИГАЦИЯ — App.updateNav
  // ========================================================================

  App.updateNav = function (route) {
    // Remove active class from all nav items
    var allNavItems = Utils.dom.$$('.nav-item');
    allNavItems.forEach(function (item) {
      Utils.dom.removeClass(item, 'active');
    });

    // Find and activate the current nav item
    var activeItem = Utils.dom.$('.nav-item[data-route="' + route + '"]');
    if (activeItem) {
      Utils.dom.addClass(activeItem, 'active');

      // Scroll active item into view in sidebar
      if (Utils.device && Utils.device.isMobile && Utils.device.isMobile()) {
        // On mobile, don't auto-scroll sidebar
      } else {
        try {
          var sidebar = Utils.dom.$('#sidebar');
          if (sidebar && activeItem) {
            var itemTop = activeItem.offsetTop;
            var itemBottom = itemTop + activeItem.offsetHeight;
            var sidebarTop = sidebar.scrollTop;
            var sidebarBottom = sidebarTop + sidebar.clientHeight;

            if (itemTop < sidebarTop) {
              sidebar.scrollTop = itemTop - 10;
            } else if (itemBottom > sidebarBottom) {
              sidebar.scrollTop = itemBottom - sidebar.clientHeight + 10;
            }
          }
        } catch (e) {
          // Ignore scroll errors
        }
      }
    }

    // Update nav badges
    _updateNavBadges();
  };

  // ----------------------------------------------------------------
  // Nav badges update
  // ----------------------------------------------------------------

  function _updateNavBadges() {
    // Dashboard: overall progress %
    var dashboardBadge = Utils.dom.$('.nav-item[data-route="dashboard"] .nav-badge');
    if (dashboardBadge) {
      var progress = _calculateOverallProgress();
      Utils.dom.setText(dashboardBadge, progress + '%');
      dashboardBadge.hidden = progress === 0;
    }

    // Roadmap: completed modules / total
    var roadmapBadge = Utils.dom.$('.nav-item[data-route="roadmap"] .nav-badge');
    if (roadmapBadge) {
      var modules = [];
      try {
        modules = CourseData.getModules() || [];
      } catch (e) {
        // Skip
      }
      var progressData = Utils.storage.getSub('progress') || {};
      var completed = 0;
      modules.forEach(function (mod) {
        var lessons = [];
        try {
          lessons = CourseData.getLessons(mod.id) || [];
        } catch (e) {
          // Skip
        }
        if (lessons.length === 0) return;
        var modProgress = progressData[mod.id] || {};
        var allDone = lessons.every(function (l) { return modProgress[l.id]; });
        if (allDone) completed++;
      });
      Utils.dom.setText(roadmapBadge, completed + '/' + modules.length);
      roadmapBadge.hidden = completed === 0;
    }

    // Artifacts: count
    var artifactsBadge = Utils.dom.$('.nav-item[data-route="artifacts"] .nav-badge');
    if (artifactsBadge) {
      var artifacts = Utils.storage.get(Utils.constants.STORAGE_KEYS.ARTIFACTS);
      var count = Array.isArray(artifacts) ? artifacts.length : 0;
      Utils.dom.setText(artifactsBadge, String(count));
      artifactsBadge.hidden = count === 0;
    }

    // Pomodoro: sessions today
    var pomodoroBadge = Utils.dom.$('.nav-item[data-route="pomodoro"] .nav-badge');
    if (pomodoroBadge) {
      var pomoData = Utils.storage.getSub('pomodoro') || {};
      var today = Utils.format.formatDate(new Date(), 'YYYY-MM-DD');
      var todayStat = (pomoData.dailyStats || []).find(function (d) { return d.date === today; });
      var sessionCount = todayStat ? todayStat.sessions : 0;
      Utils.dom.setText(pomodoroBadge, String(sessionCount));
      pomodoroBadge.hidden = sessionCount === 0;
    }
  }

  function _calculateOverallProgress() {
    var modules = [];
    try {
      modules = CourseData.getModules() || [];
    } catch (e) {
      return 0;
    }
    if (modules.length === 0) return 0;

    var progressData = Utils.storage.getSub('progress') || {};
    var totalLessons = 0;
    var totalCompleted = 0;

    modules.forEach(function (mod) {
      var lessons = [];
      try {
        lessons = CourseData.getLessons(mod.id) || [];
      } catch (e) {
        // Skip
      }
      totalLessons += lessons.length;
      var modProgress = progressData[mod.id] || {};
      lessons.forEach(function (l) {
        if (modProgress[l.id]) totalCompleted++;
      });
    });

    if (totalLessons === 0) return 0;
    return Math.round(totalCompleted / totalLessons * 100);
  }

  // ========================================================================
  // ПЕРЕКЛЮЧЕНИЕ ТЕМЫ — App.toggleTheme
  // ========================================================================

  App.toggleTheme = function () {
    // Toggle theme through Utils.css
    if (Utils.css && Utils.css.toggleTheme) {
      Utils.css.toggleTheme();
    } else {
      // Manual toggle
      var currentTheme = Utils.storage.get(Utils.constants.STORAGE_KEYS.THEME) || 'system';
      var resolvedTheme = currentTheme;
      if (currentTheme === 'system') {
        resolvedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
      if (Utils.css && Utils.css.setTheme) {
        Utils.css.setTheme(newTheme);
      } else {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      Utils.storage.set(Utils.constants.STORAGE_KEYS.THEME, newTheme);
    }

    // Update toggle button icon
    _updateThemeToggleIcon();

    // Show toast
    App.showToast({
      message: 'Тема изменена',
      type: 'info',
      duration: 2000
    });

    // Resize charts if any
    if (window.Charts && Charts.resize) {
      setTimeout(function () {
        Charts.resize();
      }, 300);
    }
  };

  function _updateThemeToggleIcon() {
    var toggleBtn = Utils.dom.$('#theme-toggle-btn');
    if (!toggleBtn) return;

    var currentTheme = Utils.storage.get(Utils.constants.STORAGE_KEYS.THEME) || 'system';
    var resolvedTheme = currentTheme;
    if (currentTheme === 'system') {
      resolvedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    var sunIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>';
    var moonIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    toggleBtn.innerHTML = resolvedTheme === 'dark' ? sunIcon : moonIcon;
    toggleBtn.setAttribute('aria-label', resolvedTheme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
    toggleBtn.title = resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  }

  // ========================================================================
  // SIDEBAR — App.toggleSidebar, App.toggleMobileSidebar
  // ========================================================================

  App.toggleSidebar = function () {
    App.state.sidebarCollapsed = !App.state.sidebarCollapsed;

    // Apply via Utils.css
    if (Utils.css && Utils.css.setSidebarCollapsed) {
      Utils.css.setSidebarCollapsed(App.state.sidebarCollapsed);
    } else {
      // Manual toggle
      var sidebar = Utils.dom.$('#sidebar');
      var mainContainer = Utils.dom.$('#main-container');
      if (sidebar) {
        Utils.dom.toggleClass(sidebar, 'collapsed', App.state.sidebarCollapsed);
      }
      if (mainContainer) {
        Utils.dom.toggleClass(mainContainer, 'sidebar-collapsed', App.state.sidebarCollapsed);
      }
    }

    // Update toggle button
    var toggleBtn = Utils.dom.$('.sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', String(!App.state.sidebarCollapsed));

      // Update chevron icon
      var chevronIcon = toggleBtn.querySelector('.sidebar-toggle-icon');
      if (chevronIcon) {
        chevronIcon.innerHTML = App.state.sidebarCollapsed
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
      }
    }

    // Save state
    var stateSettings = Utils.storage.get(Utils.constants.STORAGE_KEYS.SETTINGS) || {};
    stateSettings.sidebarCollapsed = App.state.sidebarCollapsed;
    Utils.storage.set(Utils.constants.STORAGE_KEYS.SETTINGS, stateSettings);

    // Resize charts after transition
    if (window.Charts && Charts.resize) {
      setTimeout(function () {
        Charts.resize();
      }, 300);
    }

    Debug.info('Sidebar toggled: ' + (App.state.sidebarCollapsed ? 'collapsed' : 'expanded'));
  };

  App.toggleMobileSidebar = function () {
    App.state.sidebarMobileOpen = !App.state.sidebarMobileOpen;

    // Apply via Utils.css
    if (Utils.css && Utils.css.setSidebarMobileOpen) {
      Utils.css.setSidebarMobileOpen(App.state.sidebarMobileOpen);
    } else {
      // Manual toggle
      var sidebar = Utils.dom.$('#sidebar');
      if (sidebar) {
        Utils.dom.toggleClass(sidebar, 'mobile-open', App.state.sidebarMobileOpen);
      }
    }

    // Show/hide overlay
    var overlay = Utils.dom.$('#sidebar-overlay');
    if (overlay) {
      overlay.hidden = !App.state.sidebarMobileOpen;
      if (App.state.sidebarMobileOpen) {
        overlay.addEventListener('click', function () {
          App.toggleMobileSidebar();
        }, { once: true });
      }
    }

    // Update hamburger button
    var hamburgerBtn = Utils.dom.$('.hamburger-btn');
    if (hamburgerBtn) {
      hamburgerBtn.setAttribute('aria-expanded', String(App.state.sidebarMobileOpen));
      Utils.dom.toggleClass(hamburgerBtn, 'active', App.state.sidebarMobileOpen);
    }

    Debug.info('Mobile sidebar toggled: ' + (App.state.sidebarMobileOpen ? 'open' : 'closed'));
  };

  // ========================================================================
  // ИНИЦИАЛИЗАЦИЯ UI ЭЛЕМЕНТОВ
  // ========================================================================

  App.initUIElements = function () {
    // Theme toggle button
    var themeToggleBtn = Utils.dom.$('#theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', function () {
        App.toggleTheme();
      });
      _updateThemeToggleIcon();
    }

    // Sidebar toggle button
    var sidebarToggle = Utils.dom.$('.sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        App.toggleSidebar();
      });
    }

    // Hamburger button (mobile)
    var hamburgerBtn = Utils.dom.$('.hamburger-btn');
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', function () {
        App.toggleMobileSidebar();
      });
    }

    // Save button
    var saveBtn = Utils.dom.$('#save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        App.saveState();
      });
      saveBtn.disabled = true;
    }

    // Listen for system theme changes
    if (window.matchMedia) {
      var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', function () {
          var currentTheme = Utils.storage.get(Utils.constants.STORAGE_KEYS.THEME) || 'system';
          if (currentTheme === 'system' && Utils.css && Utils.css.applySystemTheme) {
            Utils.css.applySystemTheme();
          }
          _updateThemeToggleIcon();
        });
      } else if (mediaQuery.addListener) {
        // Older browsers
        mediaQuery.addListener(function () {
          var currentTheme = Utils.storage.get(Utils.constants.STORAGE_KEYS.THEME) || 'system';
          if (currentTheme === 'system' && Utils.css && Utils.css.applySystemTheme) {
            Utils.css.applySystemTheme();
          }
          _updateThemeToggleIcon();
        });
      }
    }

    // Keyboard shortcut for search (Ctrl+/)
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        App.modals.search();
      }
    });

    // Keyboard shortcut for sidebar toggle (Ctrl+B)
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 'b' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        App.toggleSidebar();
      }
    });

    // Initialize nav badges
    _updateNavBadges();

    // Restore sidebar state from settings
    var settings = Utils.storage.get(Utils.constants.STORAGE_KEYS.SETTINGS) || {};
    if (settings.sidebarCollapsed) {
      App.state.sidebarCollapsed = true;
      if (Utils.css && Utils.css.setSidebarCollapsed) {
        Utils.css.setSidebarCollapsed(true);
      }
      var sb = Utils.dom.$('#sidebar');
      var mc = Utils.dom.$('#main-container');
      if (sb) Utils.dom.addClass(sb, 'collapsed');
      if (mc) Utils.dom.addClass(mc, 'sidebar-collapsed');
      var st = Utils.dom.$('.sidebar-toggle');
      if (st) st.setAttribute('aria-expanded', 'false');
    }

    Debug.info('UI elements initialized');
  };

  // Call initUIElements when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      App.initUIElements();
    });
  } else {
    App.initUIElements();
  }

})();

/* ЧАСТЬ 6a из 6: Глобальные обработчики событий, Быстрая заметка, Ресайз */

(function () {
  'use strict';

  // ========================================================================
  // ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ СОБЫТИЙ
  // ========================================================================

  App._eventHandlersSetup = false;

  App.setupGlobalEvents = function () {
    if (App._eventHandlersSetup) return;
    App._eventHandlersSetup = true;

    Debug.info('Setting up global event handlers…');

    // --- 1a. Клик по навигации (делегирование) ---
    Utils.event.delegate(document, 'click', '.nav-item', function (e, target) {
      e.preventDefault();
      var route = Utils.dom.getData(target, 'route');
      if (route) {
        App.router.navigate(route);
        // Close mobile sidebar after navigation
        if (Utils.device.isMobile && Utils.device.isMobile()) {
          App.toggleMobileSidebar();
        }
      }
    });

    // --- 1b. Кнопки в шапке ---
    var themeToggle = Utils.dom.$('#theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function (e) {
        e.preventDefault();
        App.toggleTheme();
      });
    }

    var saveBtn = Utils.dom.$('#save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        App.saveState();
      });
    }

    var quickNoteBtn = Utils.dom.$('#quick-note-btn');
    if (quickNoteBtn) {
      quickNoteBtn.addEventListener('click', function (e) {
        e.preventDefault();
        App.openQuickNote();
      });
    }

    var tagManagerBtn = Utils.dom.$('#tag-manager-btn');
    if (tagManagerBtn) {
      tagManagerBtn.addEventListener('click', function (e) {
        e.preventDefault();
        App.modals.open('tag-manager-modal');
      });
    }

    var hamburgerBtn = Utils.dom.$('.hamburger-btn');
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', function (e) {
        e.preventDefault();
        App.toggleMobileSidebar();
      });
    }

    var sidebarToggle = Utils.dom.$('.sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function (e) {
        e.preventDefault();
        App.toggleSidebar();
      });
    }

    var contextPanelCloseBtn = Utils.dom.$('#context-panel-close-btn');
    if (contextPanelCloseBtn) {
      contextPanelCloseBtn.addEventListener('click', function (e) {
        e.preventDefault();
        App.contextPanel.close();
      });
    }

    // --- 1c. Поиск в шапке ---
    var searchInput = Utils.dom.$('#search-input');
    var searchClearBtn = Utils.dom.$('.search-clear-btn');
    var searchDropdown = Utils.dom.$('#search-dropdown');

    if (searchInput) {
      var debouncedHeaderSearch = Utils.event.debounce(function (query) {
        if (query.length < 2) {
          if (searchDropdown) {
            Utils.dom.empty(searchDropdown);
            searchDropdown.hidden = true;
          }
          return;
        }

        var results = App.search(query).slice(0, 8);

        if (searchDropdown) {
          Utils.dom.empty(searchDropdown);

          if (results.length === 0) {
            Utils.dom.append(searchDropdown, Utils.dom.create('p', {
              class: 'search-dropdown-empty',
              text: 'Ничего не найдено'
            }));
          } else {
            results.forEach(function (result) {
              var item = _renderDropdownSearchResult(result, query);
              Utils.dom.append(searchDropdown, item);
            });

            // Show all results link
            var showAll = Utils.dom.create('button', {
              class: 'search-show-all',
              text: 'Показать все результаты…'
            });
            showAll.addEventListener('click', function () {
              App.modals.search();
              var modalInput = Utils.dom.$('#search-modal-input');
              if (modalInput) {
                modalInput.value = query;
                modalInput.dispatchEvent(new Event('input'));
              }
            });
            Utils.dom.append(searchDropdown, showAll);
          }

          searchDropdown.hidden = false;
        }
      }, Utils.constants.TIMING.DEBOUNCE_SEARCH || 300);

      searchInput.addEventListener('input', function (e) {
        var query = e.target.value.trim();

        // Show/hide clear button
        if (searchClearBtn) {
          searchClearBtn.hidden = query.length === 0;
        }

        debouncedHeaderSearch(query);
      });

      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var query = searchInput.value.trim();
          if (query.length >= 2) {
            App.modals.search();
            var modalInput = Utils.dom.$('#search-modal-input');
            if (modalInput) {
              modalInput.value = query;
              modalInput.dispatchEvent(new Event('input'));
            }
          }
        }
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', function () {
        if (searchInput) searchInput.value = '';
        searchClearBtn.hidden = true;
        if (searchDropdown) {
          Utils.dom.empty(searchDropdown);
          searchDropdown.hidden = true;
        }
        if (searchInput) searchInput.focus();
      });
    }

    // Close search dropdown on outside click
    document.addEventListener('click', function (e) {
      if (searchDropdown && !searchDropdown.hidden) {
        var searchWrap = Utils.dom.$('.search-wrap') || Utils.dom.$('.header-search');
        if (searchWrap && !searchWrap.contains(e.target)) {
          searchDropdown.hidden = true;
        }
      }
    });

    // --- 1d. Модалки — делегирование ---
    document.addEventListener('click', function (e) {
      // [data-modal-close]
      var closeBtn = e.target.closest('[data-modal-close]');
      if (closeBtn) {
        var modal = closeBtn.closest('.modal');
        if (modal && modal.id) {
          e.preventDefault();
          App.modals.close(modal.id);
        }
        return;
      }

      // Click on overlay (outside modal content)
      if (e.target.classList && e.target.classList.contains('modal')) {
        if (e.target.id) {
          e.preventDefault();
          App.modals.close(e.target.id);
        }
        return;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (App.modals.activeModal) {
          e.preventDefault();
          App.modals.close(App.modals.activeModal);
        } else if (App.state.contextPanelOpen) {
          e.preventDefault();
          App.contextPanel.close();
        } else if (App.state.sidebarMobileOpen) {
          e.preventDefault();
          App.toggleMobileSidebar();
        }
      }
    });

    // --- 1e. Импорт файла ---
    var importFileInput = Utils.dom.$('#import-file-input');
    if (importFileInput) {
      importFileInput.addEventListener('change', function (e) {
        if (e.target.files && e.target.files.length > 0) {
          _handleFileImport(e.target.files[0]);
        }
      });
    }

    // Drag & drop on sharing page
    var dropZone = Utils.dom.$('#import-dropzone');
    if (dropZone) {
      dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        Utils.dom.addClass(dropZone, 'drag-over');
      });
      dropZone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        Utils.dom.removeClass(dropZone, 'drag-over');
      });
      dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        Utils.dom.removeClass(dropZone, 'drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          _handleFileImport(e.dataTransfer.files[0]);
        }
      });
    }

    // --- 1f. Клик вне элементов ---
    document.addEventListener('click', function (e) {
      // Close mobile sidebar when clicking outside
      if (App.state.sidebarMobileOpen) {
        var sidebar = Utils.dom.$('#sidebar');
        var hamburger = Utils.dom.$('.hamburger-btn');
        if (sidebar && !sidebar.contains(e.target) && hamburger && !hamburger.contains(e.target)) {
          var overlay = Utils.dom.$('#sidebar-overlay');
          if (overlay && overlay.contains(e.target)) {
            // Click on overlay — handle separately
          } else if (!overlay || !overlay.contains(e.target)) {
            App.toggleMobileSidebar();
          }
        }
      }
    });

    // --- 1g. Beforeunload ---
    window.addEventListener('beforeunload', function (e) {
      // Save current route
      if (App.state.currentRoute) {
        Utils.storage.set(Utils.constants.STORAGE_KEYS.LAST_ROUTE, App.state.currentRoute);
      }

      // Save state
      App.saveOnExit();

      // Warn about unsaved changes
      if (App.state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохранённые изменения. Вы уверены, что хотите покинуть страницу?';
        return e.returnValue;
      }
    });

    // --- Visibility change ---
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        App.saveOnExit();
      }
    });

    // --- Pagehide ---
    window.addEventListener('pagehide', function () {
      App.saveOnExit();
    });

    Debug.info('Global event handlers set up');
  };

  // ----------------------------------------------------------------
  // Dropdown search result renderer
  // ----------------------------------------------------------------

  var SEARCH_ICONS_DROPDOWN = {
    module: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1 2 3 6 3s6-2 6-3v-5"/></svg>',
    lesson: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    artifact: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    glossary: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    resource: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    portfolio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    template: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>'
  };

  var TYPE_LABELS = {
    module: 'Модуль',
    lesson: 'Урок',
    artifact: 'Артефакт',
    glossary: 'Термин',
    resource: 'Ресурс',
    portfolio: 'Портфолио',
    template: 'Шаблон'
  };

  function _renderDropdownSearchResult(result, query) {
    var item = Utils.dom.create('div', {
      class: 'search-result-item',
      role: 'option',
      tabindex: '0'
    });

    var iconWrap = Utils.dom.create('div', { class: 'search-result-icon' });
    iconWrap.innerHTML = SEARCH_ICONS_DROPDOWN[result.icon] || SEARCH_ICONS_DROPDOWN.artifact;
    Utils.dom.append(item, iconWrap);

    var body = Utils.dom.create('div', { class: 'search-result-body' });

    Utils.dom.append(body, Utils.dom.create('span', {
      class: 'search-result-type',
      text: TYPE_LABELS[result.type] || result.type
    }));

    var titleHtml = Utils.format.escapeHtml(result.title || '');
    if (query) {
      titleHtml = Utils.format.highlight(titleHtml, query);
    }
    var titleEl = Utils.dom.create('h4', { class: 'search-result-title' });
    titleEl.innerHTML = titleHtml;
    Utils.dom.append(body, titleEl);

    if (result.description) {
      var descHtml = Utils.format.escapeHtml(Utils.format.truncate(result.description, 100));
      if (query) {
        descHtml = Utils.format.highlight(descHtml, query);
      }
      var descEl = Utils.dom.create('p', { class: 'search-result-desc' });
      descEl.innerHTML = descHtml;
      Utils.dom.append(body, descEl);
    }

    Utils.dom.append(item, body);

    var handleSelect = function () {
      // Close dropdown
      var dd = Utils.dom.$('#search-dropdown');
      if (dd) dd.hidden = true;

      // Navigate
      if (result.route) {
        App.router.navigate(result.route);
      }

      // Scroll to glossary term
      if (result.type === 'glossary' && result.id) {
        setTimeout(function () {
          var target = Utils.dom.$('#glossary-term-' + Utils.format.slugify(result.id));
          if (target) {
            Utils.dom.scrollIntoView(target, { behavior: 'smooth', block: 'center' });
            Utils.dom.addClass(target, 'highlight-flash');
            setTimeout(function () {
              Utils.dom.removeClass(target, 'highlight-flash');
            }, 1500);
          }
        }, 300);
      }
    };

    item.addEventListener('click', handleSelect);
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });

    return item;
  }

  // ----------------------------------------------------------------
  // File import handler
  // ----------------------------------------------------------------

  function _handleFileImport(file) {
    if (!file) return;

    if (!file.name || !file.name.toLowerCase().endsWith('.json')) {
      App.showToast({
        message: 'Пожалуйста, выберите .json файл',
        type: 'warning'
      });
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        App.state._pendingImport = data;

        var summary = 'Файл: ' + file.name + ' (' + Utils.format.formatFileSize(file.size) + ')';
        var dataKeys = Object.keys(data).filter(function (k) { return k !== 'meta'; });
        summary += '\nСодержит: ' + dataKeys.join(', ');

        if (data.artifacts) {
          summary += '\nАртефактов: ' + data.artifacts.length;
        }
        if (data.progress) {
          summary += '\nМодулей с прогрессом: ' + Object.keys(data.progress).length;
        }

        App.modals.confirm({
          title: 'Импортировать данные?',
          message: summary + '\n\nДанные будут объединены с текущими. Продолжить?',
          confirmText: 'Импортировать',
          cancelText: 'Отмена',
          onConfirm: function () {
            if (window.ExportImport && ExportImport.importData) {
              ExportImport.importData(data, 'merge');
            } else {
              _importDataManual(data, 'merge');
            }
            App.state._pendingImport = null;
            App.state.hasUnsavedChanges = true;
            App.showToast({ message: 'Данные импортированы', type: 'success' });
            App.router.navigate(App.state.currentRoute, { force: true });
          }
        });
      } catch (err) {
        App.showToast({
          message: 'Ошибка чтения файла: ' + err.message,
          type: 'error',
          duration: 6000
        });
      }
    };
    reader.readAsText(file);
  }

  function _importDataManual(data, mode) {
    if (mode === 'replace') {
      Utils.storage.clear();
    }
    if (data.progress) {
      var existing = mode === 'merge' ? (Utils.storage.getSub('progress') || {}) : {};
      Utils.storage.setSub('progress', Utils.misc.merge(existing, data.progress));
    }
    if (data.artifacts) {
      if (mode === 'merge') {
        var existingArt = Utils.storage.get(Utils.constants.STORAGE_KEYS.ARTIFACTS) || [];
        var ids = existingArt.map(function (a) { return a.id; });
        data.artifacts.forEach(function (a) {
          if (ids.indexOf(a.id) === -1) existingArt.push(a);
        });
        Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, existingArt);
      } else {
        Utils.storage.set(Utils.constants.STORAGE_KEYS.ARTIFACTS, data.artifacts);
      }
    }
    if (data.notes) {
      Utils.storage.set(Utils.constants.STORAGE_KEYS.NOTES, data.notes);
    }
    if (data.settings) {
      Utils.storage.set(Utils.constants.STORAGE_KEYS.SETTINGS, data.settings);
    }
  }

  // ========================================================================
  // БЫСТРАЯ ЗАМЕТКА
  // ========================================================================

  App.openQuickNote = function () {
    var modal = Utils.dom.$('#quick-note-modal');

    if (!modal) {
      modal = _createQuickNoteModal();
    }

    // Clear fields
    var textArea = modal.querySelector('#quick-note-text');
    var tagsInput = modal.querySelector('#quick-note-tags');
    if (textArea) textArea.value = '';
    if (tagsInput) tagsInput.value = '';

    // Set up save button
    var saveBtnEl = modal.querySelector('#quick-note-save');
    var cancelBtnEl = modal.querySelector('#quick-note-cancel');
    if (saveBtnEl) {
      var newSaveBtn = saveBtnEl.cloneNode(true);
      saveBtnEl.parentNode.replaceChild(newSaveBtn, saveBtnEl);
      newSaveBtn.addEventListener('click', function () {
        _saveQuickNote(textArea, tagsInput);
      });
    }
    if (cancelBtnEl) {
      var newCancelBtn = cancelBtnEl.cloneNode(true);
      cancelBtnEl.parentNode.replaceChild(newCancelBtn, cancelBtnEl);
      newCancelBtn.addEventListener('click', function () {
        App.modals.close('quick-note-modal');
      });
    }

    // Setup tag autocomplete
    if (tagsInput) {
      _setupTagAutocomplete(tagsInput);
    }

    // Character counter
    var counter = modal.querySelector('#quick-note-counter');
    if (textArea && counter) {
      var maxLen = Utils.constants.LIMITS.MAX_NOTE_LENGTH || 5000;
      textArea.setAttribute('maxlength', String(maxLen));
      var updateCounter = function () {
        var remaining = maxLen - textArea.value.length;
        Utils.dom.setText(counter, remaining + ' символов осталось');
        Utils.dom.toggleClass(counter, 'limit-warn', remaining < 100);
      };
      var newTextArea = textArea.cloneNode(true);
      textArea.parentNode.replaceChild(newTextArea, textArea);
      textArea = newTextArea;
      textArea.addEventListener('input', updateCounter);
      updateCounter();

      // Re-attach save handler
      if (saveBtnEl) {
        newSaveBtn.addEventListener('click', function () {
          _saveQuickNote(textArea, tagsInput);
        });
      }
    }

    App.modals.open('quick-note-modal', {
      onOpen: function () {
        setTimeout(function () {
          if (textArea) textArea.focus();
        }, 150);
      }
    });
  };

  function _saveQuickNote(textArea, tagsInput) {
    var text = textArea ? textArea.value.trim() : '';
    var tagsStr = tagsInput ? tagsInput.value.trim() : '';

    if (!text) {
      App.showToast({ message: 'Заметка не может быть пустой', type: 'warning' });
      return;
    }

    var tags = [];
    if (tagsStr) {
      tags = tagsStr.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t.length > 0; });
    }

    var note = {
      id: Utils.id.uuid ? Utils.id.uuid() : 'note_' + Date.now(),
      text: text,
      tags: tags,
      createdAt: new Date().toISOString()
    };

    var notes = Utils.storage.get(Utils.constants.STORAGE_KEYS.NOTES);
    if (!Array.isArray(notes)) notes = [];
    notes.push(note);
    Utils.storage.set(Utils.constants.STORAGE_KEYS.NOTES, notes);

    App.modals.close('quick-note-modal');
    App.showToast({ message: 'Заметка сохранена', type: 'success' });
    App.markUnsaved();
  }

  function _createQuickNoteModal() {
    var modal = Utils.dom.create('div', {
      class: 'modal',
      id: 'quick-note-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'quick-note-title',
      hidden: 'hidden'
    });

    var dialog = Utils.dom.create('div', { class: 'modal-dialog' });
    var content = Utils.dom.create('div', { class: 'modal-content' });

    var header = Utils.dom.create('div', { class: 'modal-header' });
    Utils.dom.append(header, Utils.dom.create('h3', {
      class: 'modal-title',
      id: 'quick-note-title',
      text: 'Быстрая заметка'
    }));
    var closeBtn = Utils.dom.create('button', {
      class: 'modal-close-btn',
      'aria-label': 'Закрыть',
      'data-modal-close': ''
    });
    closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    Utils.dom.append(header, closeBtn);

    var body = Utils.dom.create('div', { class: 'modal-body' });

    var textarea = Utils.dom.create('textarea', {
      id: 'quick-note-text',
      class: 'quick-note-textarea',
      placeholder: 'Введите текст заметки…',
      rows: '8',
      'aria-label': 'Текст заметки'
    });
    Utils.dom.append(body, textarea);

    var counter = Utils.dom.create('div', {
      id: 'quick-note-counter',
      class: 'char-counter'
    });
    Utils.dom.append(body, counter);

    var tagsLabel = Utils.dom.create('label', {
      class: 'form-label',
      text: 'Теги (через запятую):',
      for: 'quick-note-tags'
    });
    Utils.dom.append(body, tagsLabel);

    var tagsInput = Utils.dom.create('input', {
      type: 'text',
      id: 'quick-note-tags',
      class: 'form-input',
      placeholder: 'тег1, тег2, тег3…',
      'aria-label': 'Теги заметки'
    });
    Utils.dom.append(body, tagsInput);

    // Tag suggestions
    var suggestionsWrap = Utils.dom.create('div', {
      id: 'quick-note-tag-suggestions',
      class: 'tag-suggestions'
    });
    Utils.dom.append(body, suggestionsWrap);

    var footer = Utils.dom.create('div', { class: 'modal-footer' });
    var cancelBtn = Utils.dom.create('button', {
      class: 'btn btn-outline',
      id: 'quick-note-cancel',
      text: 'Отмена'
    });
    var saveBtn = Utils.dom.create('button', {
      class: 'btn btn-primary',
      id: 'quick-note-save',
      text: 'Сохранить'
    });
    Utils.dom.append(footer, cancelBtn);
    Utils.dom.append(footer, saveBtn);

    Utils.dom.append(content, header);
    Utils.dom.append(content, body);
    Utils.dom.append(content, footer);
    Utils.dom.append(dialog, content);
    Utils.dom.append(modal, dialog);

    var modalsContainer = Utils.dom.$('#modals');
    if (modalsContainer) {
      Utils.dom.append(modalsContainer, modal);
    } else {
      Utils.dom.append(document.body, modal);
    }

    return modal;
  }

  function _setupTagAutocomplete(tagsInput) {
    var suggestionsWrap = Utils.dom.$('#quick-note-tag-suggestions');
    if (!suggestionsWrap) return;

    // Get existing tags
    var allTags = Utils.storage.get(Utils.constants.STORAGE_KEYS.TAGS) || [];
    var notes = Utils.storage.get(Utils.constants.STORAGE_KEYS.NOTES) || [];
    notes.forEach(function (n) {
      if (n.tags) {
        n.tags.forEach(function (t) {
          if (allTags.indexOf(t) === -1) allTags.push(t);
        });
      }
    });

    if (allTags.length === 0) return;

    tagsInput.addEventListener('input', function () {
      var currentTags = tagsInput.value.split(',').map(function (t) { return t.trim(); });
      var lastTag = currentTags[currentTags.length - 1].toLowerCase();

      Utils.dom.empty(suggestionsWrap);

      if (!lastTag) {
        suggestionsWrap.hidden = true;
        return;
      }

      var matches = allTags.filter(function (t) {
        return t.toLowerCase().indexOf(lastTag) !== -1 && t.toLowerCase() !== lastTag;
      }).slice(0, 5);

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
          currentTags[currentTags.length - 1] = match;
          tagsInput.value = currentTags.join(', ') + ', ';
          tagsInput.focus();
          suggestionsWrap.hidden = true;
        });
        Utils.dom.append(suggestionsWrap, chip);
      });

      suggestionsWrap.hidden = false;
    });
  }

  // ========================================================================
  // РЕСАЙЗ ОКНА
  // ========================================================================

  App._currentBreakpoint = null;
  App._resizeTimer = null;

  App.handleResize = function () {
    // Throttle
    if (App._resizeTimer) {
      clearTimeout(App._resizeTimer);
    }

    App._resizeTimer = setTimeout(function () {
      var newBreakpoint = Utils.device.breakpoint ? Utils.device.breakpoint() : 'desktop';

      // Check if breakpoint changed
      if (App._currentBreakpoint && App._currentBreakpoint !== newBreakpoint) {
        App.onBreakpointChange(App._currentBreakpoint, newBreakpoint);
      }

      App._currentBreakpoint = newBreakpoint;

      // Resize all charts
      if (window.Charts && Charts.resize) {
        Charts.resize();
      }

      // Update device state
      if (Utils.device && Utils.device.update) {
        Utils.device.update();
      }

      Debug.debug('Resize: ' + newBreakpoint);
    }, Utils.constants.TIMING.THROTTLE_RESIZE || 150);
  };

  App.onBreakpointChange = function (oldBreakpoint, newBreakpoint) {
    Debug.info('Breakpoint changed: ' + oldBreakpoint + ' → ' + newBreakpoint);

    if (newBreakpoint === 'mobile') {
      // Close context panel on mobile
      if (App.state.contextPanelOpen) {
        App.contextPanel.close();
      }
      // Reset sidebar collapsed state
      App.state.sidebarCollapsed = false;
      if (Utils.css && Utils.css.setSidebarCollapsed) {
        Utils.css.setSidebarCollapsed(false);
      }
    }

    if (newBreakpoint === 'desktop') {
      // Close mobile sidebar
      if (App.state.sidebarMobileOpen) {
        App.toggleMobileSidebar();
      }
    }

    // Re-render current page for adaptive layout
    if (App.state.currentRoute && App.pages && App.pages._currentPage) {
      var renderFn = App.pages[App.state.currentRoute] || App.pages['render' + App.state.currentRoute.charAt(0).toUpperCase() + App.state.currentRoute.slice(1)];
      if (renderFn) {
        Debug.debug('Re-rendering page after breakpoint change');
        renderFn();
      }
    }
  };

  // Register resize handler
  if (Utils.device && Utils.device.onResize) {
    Utils.device.onResize(App.handleResize);
  } else {
    window.addEventListener('resize', App.handleResize);
  }

  // Register breakpoint change callback
  if (Utils.css && Utils.css.onBreakpointChange) {
    Utils.css.onBreakpointChange(function (old, newBp) {
      App.onBreakpointChange(old, newBp);
    });
  }

})();

(function () {
  'use strict';

  // ========================================================================
  // ИНТЕГРАЦИЯ С keyboard.js
  // ========================================================================

  App._keyboardInitialized = false;

  App.initKeyboard = function () {
    if (App._keyboardInitialized) return;
    if (!window.Keyboard || typeof Keyboard.register !== 'function') {
      Debug.warn('Keyboard module not available, shortcuts disabled');
      return;
    }

    App._keyboardInitialized = true;

    // Route shortcuts (1-9)
    var routeOrder = [
      'dashboard', 'roadmap', 'artifacts', 'glossary',
      'resources', 'pomodoro', 'templates', 'sharing', 'knowledge-map'
    ];

    routeOrder.forEach(function (route, index) {
      var keyNum = index + 1;
      Keyboard.register(String(keyNum), function (e) {
        // Only when no input is focused
        var active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
          return;
        }
        e.preventDefault();
        App.router.navigate(route);
      }, 'Перейти на страницу: ' + route);
    });

    // Ctrl+S → Save state
    Keyboard.register('Ctrl+S', function (e) {
      e.preventDefault();
      App.saveState();
    }, 'Сохранить');

    // Ctrl+N → Quick note
    Keyboard.register('Ctrl+N', function (e) {
      e.preventDefault();
      App.openQuickNote();
    }, 'Новая заметка');

    // Ctrl+K or Ctrl+/ → Search
    Keyboard.register('Ctrl+K', function (e) {
      e.preventDefault();
      App.modals.search();
    }, 'Поиск');

    Keyboard.register('Ctrl+/', function (e) {
      e.preventDefault();
      App.modals.search();
    }, 'Поиск');

    // Ctrl+D → Dashboard
    Keyboard.register('Ctrl+D', function (e) {
      e.preventDefault();
      App.router.navigate('dashboard');
    }, 'На главную');

    // Ctrl+B → Toggle sidebar
    Keyboard.register('Ctrl+B', function (e) {
      e.preventDefault();
      App.toggleSidebar();
    }, 'Свернуть/развернуть сайдбар');

    // Ctrl+Shift+T → Toggle theme
    Keyboard.register('Ctrl+Shift+T', function (e) {
      e.preventDefault();
      App.toggleTheme();
    }, 'Переключить тему');

    // Ctrl+, → Settings
    Keyboard.register('Ctrl+,', function (e) {
      e.preventDefault();
      App.router.navigate('settings');
    }, 'Настройки');

    // Ctrl+Shift+D → Debug toggle
    Keyboard.register('Ctrl+Shift+D', function (e) {
      e.preventDefault();
      if (Debug.toggle) {
        Debug.toggle();
      } else if (Debug.togglePanel) {
        Debug.togglePanel();
      }
    }, 'Панель отладки');

    // Escape → Close modal/panel/sidebar
    Keyboard.register('Escape', function (e) {
      if (App.modals.activeModal) {
        e.preventDefault();
        App.modals.close(App.modals.activeModal);
      } else if (App.state.contextPanelOpen) {
        e.preventDefault();
        App.contextPanel.close();
      } else if (App.state.sidebarMobileOpen) {
        e.preventDefault();
        App.toggleMobileSidebar();
      }
    }, 'Закрыть модалку/панель');

    // ? → Help
    Keyboard.register('?', function (e) {
      var active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      e.preventDefault();
      App.router.navigate('help');
    }, 'Помощь');

    // Ctrl+E → Artifacts
    Keyboard.register('Ctrl+E', function (e) {
      e.preventDefault();
      App.router.navigate('artifacts');
    }, 'Артефакты');

    // Ctrl+G → Glossary
    Keyboard.register('Ctrl+G', function (e) {
      e.preventDefault();
      App.router.navigate('glossary');
    }, 'Глоссарий');

    // Ctrl+P → Pomodoro
    Keyboard.register('Ctrl+P', function (e) {
      e.preventDefault();
      App.router.navigate('pomodoro');
    }, 'Помодоро');

    Debug.info('Keyboard shortcuts registered (' + (Keyboard.getShortcuts ? Keyboard.getShortcuts().length : 0) + ' shortcuts)');
  };

  // ========================================================================
  // ОБРАБОТКА ОШИБОК
  // ========================================================================

  App.handleError = function (error, context) {
    var ctx = context || 'Unhandled error';

    // Log to debug
    Debug.error(ctx, error);

    // Show toast (non-blocking)
    try {
      App.showToast({
        message: 'Произошла ошибка. См. консоль для деталей.',
        type: 'error',
        duration: 6000
      });
    } catch (e) {
      // Toast system might be broken
      console.error('Failed to show error toast:', e);
    }

    // Check if critical
    var isCritical = error && (
      error.name === 'TypeError' ||
      error.name === 'ReferenceError' ||
      error.name === 'SyntaxError' ||
      (context && context.indexOf('Fatal') !== -1)
    );

    if (isCritical) {
      // Try to show error screen
      try {
        var workspace = Utils.dom.$('#main-content');
        if (workspace) {
          Utils.dom.empty(workspace);
          var errorScreen = Utils.dom.create('div', { class: 'error-screen' });
          Utils.dom.append(errorScreen, Utils.dom.create('h2', { text: 'Что-то пошло не так' }));
          Utils.dom.append(errorScreen, Utils.dom.create('p', {
            text: 'Произошла ошибка при работе приложения. Попробуйте перезагрузить страницу.'
          }));
          if (Debug.enabled) {
            Utils.dom.append(errorScreen, Utils.dom.create('pre', {
              class: 'error-details',
              text: ctx + ': ' + (error && error.message ? error.message : String(error))
            }));
          }
          var reloadBtn = Utils.dom.create('button', {
            class: 'btn btn-primary',
            text: 'Перезагрузить'
          });
          reloadBtn.addEventListener('click', function () {
            window.location.reload();
          });
          Utils.dom.append(errorScreen, reloadBtn);
          Utils.dom.append(workspace, errorScreen);
        }
      } catch (e) {
        // Last resort
        console.error('Failed to show error screen:', e);
      }
    }

    // Make sure preloader is hidden
    var preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hidden');
      preloader.style.display = 'none';
    }
    var wrapper = document.getElementById('app-wrapper');
    if (wrapper) {
      wrapper.classList.add('loaded');
    }
  };

  // Global error handlers
  App._setupErrorHandlers = function () {
    window.onerror = function (msg, url, line, col, err) {
      App.handleError(err || new Error(msg), msg + ' (' + url + ':' + line + ')');
      return false; // Don't suppress console output
    };

    window.onunhandledrejection = function (event) {
      var reason = event.reason;
      var context = 'Unhandled promise rejection';
      if (reason && reason.message) {
        context += ': ' + reason.message;
      }
      App.handleError(reason, context);
    };

    Debug.info('Global error handlers set up');
  };

  // ========================================================================
  // СОХРАНЕНИЕ СОСТОЯНИЯ ПРИ ВЫХОДЕ
  // ========================================================================

  App.saveOnExit = function () {
    try {
      // Save App.state
      Utils.storage.set(Utils.constants.STORAGE_KEYS.STATE, App.state);

      // Save current route
      if (App.state.currentRoute) {
        Utils.storage.set(Utils.constants.STORAGE_KEYS.LAST_ROUTE, App.state.currentRoute);
      }

      // Save search history is already saved by search function

      Debug.debug('State saved on exit');
    } catch (e) {
      Debug.warn('Failed to save on exit: ' + e.message);
    }
  };

  // ========================================================================
  // РЕГИСТРАЦИЯ В QAApp
  // ========================================================================

  App.registerInQAApp = function () {
    if (!window.QAApp || typeof QAApp.registerModule !== 'function') {
      Debug.warn('QAApp not available, running standalone');
      return;
    }

    try {
      QAApp.registerModule('App', App);
      QAApp.initialized = true;
      QAApp.currentRoute = App.state.currentRoute || 'dashboard';

      // Subscribe to route changes
      if (typeof QAApp.on === 'function') {
        QAApp.on('state:route', function (route) {
          App.updateNav(route);
        });
      }

      // Register other modules if they haven't registered themselves
      if (window.Debug && !QAApp.modules.Debug) {
        QAApp.registerModule('Debug', Debug);
      }
      if (window.Charts && !QAApp.modules.Charts) {
        QAApp.registerModule('Charts', Charts);
      }
      if (window.Editor && !QAApp.modules.Editor) {
        QAApp.registerModule('Editor', Editor);
      }
      if (window.Forms && !QAApp.modules.Forms) {
        QAApp.registerModule('Forms', Forms);
      }
      if (window.Keyboard && !QAApp.modules.Keyboard) {
        QAApp.registerModule('Keyboard', Keyboard);
      }
      if (window.ExportImport && !QAApp.modules.ExportImport) {
        QAApp.registerModule('ExportImport', ExportImport);
      }

      Debug.info('App registered in QAApp');
    } catch (e) {
      Debug.warn('Failed to register in QAApp: ' + e.message);
    }
  };

})();

(function () {
  'use strict';

  // ========================================================================
  // ФИНАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ
  // ========================================================================

  App.finalInit = function () {
    Debug.info('Final initialization…');

    // 1. Set up global events
    try {
      App.setupGlobalEvents();
    } catch (e) {
      Debug.error('Failed to setup global events', e);
    }

    // 2. Initialize keyboard
    try {
      App.initKeyboard();
    } catch (e) {
      Debug.error('Failed to initialize keyboard', e);
    }

    // 3. Set up error handlers
    try {
      App._setupErrorHandlers();
    } catch (e) {
      Debug.error('Failed to setup error handlers', e);
    }

    // 4. Register in QAApp
    try {
      App.registerInQAApp();
    } catch (e) {
      Debug.error('Failed to register in QAApp', e);
    }

    // 5. Update nav for current route
    try {
      if (App.state.currentRoute) {
        App.updateNav(App.state.currentRoute);
      }
    } catch (e) {
      Debug.error('Failed to update nav', e);
    }

    // 6. Update theme toggle icon
    try {
      var themeToggle = Utils.dom.$('#theme-toggle');
      if (themeToggle) {
        var currentTheme = Utils.storage.get(Utils.constants.STORAGE_KEYS.THEME) || 'system';
        var resolvedTheme = currentTheme;
        if (currentTheme === 'system' && window.matchMedia) {
          resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        themeToggle.innerHTML = resolvedTheme === 'dark'
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }
    } catch (e) {
      // Non-critical
    }

    // 7. Restore sidebar state
    try {
      var settings = Utils.storage.get(Utils.constants.STORAGE_KEYS.SETTINGS) || {};
      if (settings.sidebarCollapsed && !Utils.device.isMobile()) {
        App.state.sidebarCollapsed = true;
        var sb = Utils.dom.$('#sidebar');
        var mc = Utils.dom.$('#main-container');
        if (sb) Utils.dom.addClass(sb, 'collapsed');
        if (mc) Utils.dom.addClass(mc, 'sidebar-collapsed');
        var st = Utils.dom.$('.sidebar-toggle');
        if (st) st.setAttribute('aria-expanded', 'false');
      }
    } catch (e) {
      // Non-critical
    }

    // 8. Listen for system theme changes
    try {
      if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var handler = function () {
          var currentTheme = Utils.storage.get(Utils.constants.STORAGE_KEYS.THEME) || 'system';
          if (currentTheme === 'system' && Utils.css && Utils.css.applySystemTheme) {
            Utils.css.applySystemTheme();
          }
        };
        if (mq.addEventListener) {
          mq.addEventListener('change', handler);
        } else if (mq.addListener) {
          mq.addListener(handler);
        }
      }
    } catch (e) {
      // Non-critical
    }

    // 9. Announce readiness
    try {
      if (Utils.a11y && Utils.a11y.announce) {
        Utils.a11y.announce('Приложение готово');
      }
    } catch (e) {
      // Non-critical
    }

    // 10. Hide preloader
    var preloader = document.getElementById('preloader');
    if (preloader) {
      Utils.dom.addClass(preloader, 'fade-out');
      setTimeout(function () {
        preloader.classList.add('hidden');
        preloader.style.display = 'none';
      }, 300);
    }

    // 11. Show app wrapper
    var wrapper = document.getElementById('app-wrapper');
    if (wrapper) {
      Utils.dom.addClass(wrapper, 'loaded');
    }

    // 12. Mark as initialized
    App._initialized = true;
    App.state.initialized = true;

    Debug.info('App fully initialized');
    Debug.perfEnd('app_init_total');

    // Show performance summary if debug enabled
    if (Debug.enabled && Debug.perfMetrics) {
      var metrics = Debug.perfMetrics;
      var totalTime = metrics.app_init_total || 0;
      Debug.info('Performance: total init ' + totalTime.toFixed(2) + 'ms');
    }
  };

  // ========================================================================
  // ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ (App.init)
  // ========================================================================
	console.table({
  Utils: typeof window.Utils,
  QAApp: typeof window.QAApp,
  App: typeof window.App,
  CourseData: typeof window.CourseData,
  Charts: typeof window.Charts,
  Forms: typeof window.Forms,
  Editor: typeof window.Editor
});

console.assert(
  window.Utils &&
  window.Utils.storage &&
  window.Utils.dom &&
  window.Utils.url,
  'Utils загружен неправильно'
);

console.assert(
  window.QAApp &&
  typeof window.QAApp === 'object',
  'QAApp не создан'
);

console.assert(
  window.CourseData &&
  typeof window.CourseData.getModules === 'function',
  'CourseData не загружен'
);  


  App.init = function () {
    Debug.perfStart('app_init_total');
    Debug.info('App.init() started…');

    // 1. Check DOM ready
    if (document.readyState === 'loading') {
      Debug.info('DOM not ready, waiting for DOMContentLoaded…');
      document.addEventListener('DOMContentLoaded', function () {
        App.init();
      });
      return;
    }

    try {
      // 2. Collect DOM elements
      Debug.info('Collecting DOM elements…');
      App.elements = {
        workspace: Utils.dom.$('#main-content'),
        sidebar: Utils.dom.$('#sidebar'),
        breadcrumbs: Utils.dom.$('#breadcrumbs'),
        saveIndicator: Utils.dom.$('#save-indicator'),
        saveBtn: Utils.dom.$('#save-btn'),
        themeToggle: Utils.dom.$('#theme-toggle'),
        searchInput: Utils.dom.$('#search-input'),
        searchDropdown: Utils.dom.$('#search-dropdown'),
        searchClearBtn: Utils.dom.$('.search-clear-btn'),
        contextPanel: Utils.dom.$('#context-panel'),
        contextPanelContent: Utils.dom.$('#context-panel-content'),
        contextPanelTitle: Utils.dom.$('#context-panel-title'),
        modalsContainer: Utils.dom.$('#modals'),
        toastContainer: Utils.dom.$('#toast-container'),
        preloader: Utils.dom.$('#preloader'),
        appWrapper: Utils.dom.$('#app-wrapper'),
        sidebarToggle: Utils.dom.$('.sidebar-toggle'),
        hamburgerBtn: Utils.dom.$('.hamburger-btn'),
        sidebarOverlay: Utils.dom.$('#sidebar-overlay'),
        quickNoteBtn: Utils.dom.$('#quick-note-btn'),
        tagManagerBtn: Utils.dom.$('#tag-manager-btn'),
        contextPanelCloseBtn: Utils.dom.$('#context-panel-close-btn')
      };

      // 3. Restore state
      Debug.info('Restoring state…');
      var savedState = Utils.storage.get(Utils.constants.STORAGE_KEYS.STATE);
      if (savedState && typeof savedState === 'object') {
        App.state = Utils.misc.merge(App.state, savedState);
      }

      // Restore last route
      var lastRoute = Utils.storage.get(Utils.constants.STORAGE_KEYS.LAST_ROUTE);
      if (lastRoute && App.router && App.router.isRouteValid && App.router.isRouteValid(lastRoute)) {
        App.state.currentRoute = lastRoute;
      } else if (App.config && App.config.defaultRoute) {
        App.state.currentRoute = App.config.defaultRoute;
      } else {
        App.state.currentRoute = 'dashboard';
      }

      // 4. Initialize router
      Debug.info('Initializing router…');
      if (App.router && App.router.init) {
        App.router.init();
      }

      // 5. Initialize UI elements (buttons, toggles, search)
      Debug.info('Initializing UI elements…');
      if (App.initUIElements) {
        App.initUIElements();
      }

      // 6. Initialize modules
      Debug.info('Initializing modules…');

      // Debug module
      if (window.Debug && Debug.init) {
        Debug.init();
      }

      // Charts module
      if (window.Charts && Charts.init) {
        Charts.init();
      }

      // Editor module
      if (window.Editor && Editor.init) {
        Editor.init();
      }

      // Forms module
      if (window.Forms && Forms.init) {
        Forms.init();
      }

      // Keyboard module
      if (window.Keyboard && Keyboard.init) {
        Keyboard.init();
      }

      // ExportImport module
      if (window.ExportImport && ExportImport.init) {
        ExportImport.init();
      }

      // 7. Register routes
      Debug.info('Registering routes…');
      if (typeof App.registerRoutes === 'function') {
        App.registerRoutes();
      }

      // 8. Setup global events
      Debug.info('Setting up global events…');
      if (App.setupGlobalEvents) {
        App.setupGlobalEvents();
      }

      // 9. Check onboarding
      Debug.info('Checking onboarding…');
      var onboarded = Utils.storage.get(Utils.constants.STORAGE_KEYS.ONBOARDED);
      if (!onboarded && App._checkOnboarding) {
        App._checkOnboarding();
      }

      // 10. First render
      Debug.info('First render…');
      App.router.navigate(App.state.currentRoute, { force: true, silent: true });
      App.updateNav(App.state.currentRoute);
      App.renderBreadcrumbs(App.state.currentRoute);

      // 11. Final init
      App.finalInit();

    } catch (e) {
      App.handleError(e, 'Fatal init error');
    }
  };

  // ========================================================================
  // ONBOARDING CHECK
  // ========================================================================

  App._checkOnboarding = function () {
    var onboarded = Utils.storage.get(Utils.constants.STORAGE_KEYS.ONBOARDED);

    if (!onboarded) {
      Debug.info('Showing onboarding…');
      setTimeout(function () {
        App.modals.onboarding();
      }, 500);
    }
  };

  // ========================================================================
  // ЗАПУСК ПРИЛОЖЕНИЯ
  // ========================================================================

  try {
    App.init();
  } catch (e) {
    // Fatal error during init
    console.error('Fatal init error:', e);

    // Hide preloader in any case
    var preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hidden');
      preloader.style.display = 'none';
    }

    var wrapper = document.getElementById('app-wrapper');
    if (wrapper) {
      wrapper.classList.add('loaded');
    }

    // Show error message in workspace
    var ws = document.getElementById('main-content');
    if (ws) {
      ws.innerHTML =
        '<div class="error-screen">' +
        '<h2>Ошибка инициализации</h2>' +
        '<p>Приложение не смогло запуститься. Откройте консоль браузера для деталей.</p>' +
        '<button class="btn btn-primary" onclick="window.location.reload()">Перезагрузить</button>' +
        '</div>';
    }
  }

})();