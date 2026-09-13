/**
 * js/debug.js - Lightweight debugging toolkit for QA Study Portfolio
 * Vanilla ES6+ only. No frameworks, no bundlers.
 * Must be loaded AFTER utils.js, BEFORE main.js.
 */

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // CONFIGURATION & STATE
  // ------------------------------------------------------------------------

  const LIMIT = Utils.constants.LIMITS.MAX_TOASTS * 100; // Max logs in memory
  const LEVELS = ['verbose', 'debug', 'info', 'warn', 'error'];
  const LEVEL_INDEX =
  Object.create(null);

LEVELS.forEach((level, index) => {
  LEVEL_INDEX[level] = index;
});

  window.Debug = {
    enabled: false,
    level: 'error',

    _logs: [],
    _perfResults: Object.create(null),

    _panel: null,
    _logContainer: null,
    
    _isAtBottom: true, // Track scroll position for auto-scroll
    _bootstrapped: false,
    _handlingGlobalError: false,

    _filterState: {
      verbose: false,
      debug: false,
      info: true,
      warn: true,
      error: true
    }
  };

  // Initialize levels index for quick comparison
  function isLevelAllowed(
  currentLevel,
  logLevel
) {
  if (
    !Object.prototype.hasOwnProperty.call(
      LEVEL_INDEX,
      currentLevel
    ) ||
    !Object.prototype.hasOwnProperty.call(
      LEVEL_INDEX,
      logLevel
    )
  ) {
    return false;
  }

  return (
    LEVEL_INDEX[logLevel] >=
    LEVEL_INDEX[currentLevel]
  );
}

  // ------------------------------------------------------------------------
  // INITIALIZATION
  // ------------------------------------------------------------------------



  /**
   * Creates the floating debug panel using Utils.dom
   */
  function createDebugPanel() {
  if (
    window.Debug._panel &&
    document.body.contains(window.Debug._panel)
  ) {
    return window.Debug._panel;
  }

  if (!document.body) {
    return null;
  }

  window.Debug._panel = null;
  window.Debug._logContainer = null;

  const zIndex =
    Utils.constants.Z_INDEX.MAX;

  const panel = Utils.dom.create('div', {
    class: 'debug-panel',
    style: {
      zIndex: String(zIndex),
      display: 'flex'
    },
    role: 'region',
    aria: {
      label: 'QA Debug Console'
    }
  });

  const header = Utils.dom.create('div', {
    class: 'debug-header'
  });

  const title = Utils.dom.create('h3', {
    text: 'QA Debug Console',
    class: 'debug-title'
  });

  const levelBadge = Utils.dom.create('span', {
    text: window.Debug.level.toUpperCase(),
    class: `badge badge-${window.Debug.level}`
  });

  const clearButton = Utils.dom.create('button', {
    text: 'Clear',
    class: 'btn btn-sm btn-danger',
    attrs: {
      type: 'button'
    },
    aria: {
      label: 'Clear logs'
    }
  });

  const exportButton = Utils.dom.create('button', {
    text: 'Export',
    class: 'btn btn-sm btn-primary',
    attrs: {
      type: 'button'
    },
    aria: {
      label: 'Export logs'
    }
  });

  header.appendChild(title);
  header.appendChild(levelBadge);
  header.appendChild(clearButton);
  header.appendChild(exportButton);

  const filters = Utils.dom.create('div', {
    class: 'debug-filters',
    role: 'group',
    aria: {
      label: 'Log level filters'
    }
  });

  LEVELS.forEach(level => {
    const label = Utils.dom.create('label', {
      class: 'debug-filter-label'
    });

    const checkbox = Utils.dom.create('input', {
      attrs: {
        type: 'checkbox',
        value: level
      },
      aria: {
        label: `Show ${level} messages`
      }
    });

    checkbox.checked = Boolean(
      window.Debug._filterState[level]
    );

    const text = Utils.dom.create('span', {
      text: level.toUpperCase(),
      class: 'debug-filter-text'
    });

    checkbox.addEventListener('change', event => {
      const selectedLevel =
        event.currentTarget.value;

      if (
        Object.prototype.hasOwnProperty.call(
          window.Debug._filterState,
          selectedLevel
        )
      ) {
        window.Debug._filterState[selectedLevel] =
          event.currentTarget.checked;

        Utils.storage.set(
          'qa_portfolio_debug_filters',
          { ...window.Debug._filterState }
        );

        renderLogs();
      }
    });

    label.appendChild(checkbox);
    label.appendChild(text);
    filters.appendChild(label);
  });

  const container = Utils.dom.create('div', {
    class: 'debug-log-container',
    role: 'log',
    aria: {
      live: 'polite',
      relevant: 'additions'
    },
    tabindex: 0
  });

  container.addEventListener('scroll', () => {
    window.Debug._isAtBottom =
      container.scrollHeight -
      container.scrollTop <=
      container.clientHeight + 5;
  });

  const footer = Utils.dom.create('div', {
    class: 'debug-footer'
  });

  const toggleButton = Utils.dom.create('button', {
    text: 'Hide Panel',
    class: 'btn btn-sm btn-secondary',
    attrs: {
      type: 'button'
    },
    aria: {
      expanded: 'true',
      label: 'Hide debug console'
    }
  });

  toggleButton.addEventListener('click', () => {
    window.Debug.toggle();
  });

  footer.appendChild(toggleButton);

  panel.appendChild(header);
  panel.appendChild(filters);
  panel.appendChild(container);
  panel.appendChild(footer);

  document.body.appendChild(panel);

  window.Debug._panel = panel;
  window.Debug._logContainer = container;

  clearButton.addEventListener('click', () => {
    window.Debug.clear();
  });

  exportButton.addEventListener('click', () => {
    window.Debug.export();
  });

  renderLogs();

  return panel;
}

  // ------------------------------------------------------------------------
  // LOGGING CORE
  // ------------------------------------------------------------------------

  function getFormattedTime(date = new Date()) {
  const d = date instanceof Date
    ? date
    : new Date(date);

  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const milliseconds = String(
    d.getMilliseconds()
  ).padStart(3, '0');

  return (
    Utils.format.formatDate(d, 'HH:mm:ss') +
    '.' +
    milliseconds
  );
}

  function sanitizeContext(value) {
  const seen = new WeakSet();

  function sanitize(item, depth = 0) {
    if (item === null || item === undefined) {
      return item;
    }

    const type = typeof item;

    if (type === 'string') {
      const maxLength = 2000;

      return item.length > maxLength
        ? item.slice(0, maxLength) + '… [truncated]'
        : item;
    }

    if (type === 'number') {
      return Number.isFinite(item)
        ? item
        : String(item);
    }

    if (type === 'boolean') {
      return item;
    }

    if (type === 'bigint') {
      return item.toString() + 'n';
    }

    if (type === 'symbol') {
      return String(item);
    }

    if (type === 'function') {
      return `[Function: ${item.name || 'anonymous'}]`;
    }

    if (item instanceof Error) {
      return {
        name: item.name,
        message: item.message,
        stack: item.stack || null
      };
    }

    if (item instanceof Date) {
      return Number.isNaN(item.getTime())
        ? 'Invalid Date'
        : item.toISOString();
    }

    if (item instanceof RegExp) {
      return String(item);
    }

    if (
      typeof Node !== 'undefined' &&
      item instanceof Node
    ) {
      if (item.nodeType === Node.ELEMENT_NODE) {
        const tag = item.tagName
          ? item.tagName.toLowerCase()
          : 'element';

        const id = item.id
          ? '#' + item.id
          : '';

        const className =
          typeof item.className === 'string' &&
          item.className.trim()
            ? '.' + item.className.trim()
              .split(/\s+/)
              .join('.')
            : '';

        return `[DOM: ${tag}${id}${className}]`;
      }

      return `[DOM Node: ${item.nodeName}]`;
    }

    if (type !== 'object') {
      return String(item);
    }

    if (seen.has(item)) {
      return '[Circular]';
    }

    if (depth >= 6) {
      return '[Max depth reached]';
    }

    seen.add(item);

    if (Array.isArray(item)) {
      const maxItems = 20;

      const result = item
        .slice(0, maxItems)
        .map(value => sanitize(value, depth + 1));

      if (item.length > maxItems) {
        result.push(
          `... [${item.length - maxItems} more items]`
        );
      }

      return result;
    }

    const result = {};
    const keys = Object.keys(item);
    const maxProperties = 15;

    keys.slice(0, maxProperties).forEach(key => {
      try {
        result[key] = sanitize(
          item[key],
          depth + 1
        );
      } catch (error) {
        result[key] =
          `[Unreadable property: ${error.message}]`;
      }
    });

    if (keys.length > maxProperties) {
      result['...'] =
        `[${keys.length - maxProperties} more properties]`;
    }

    return result;
  }

  return sanitize(value);
}

function safeStringify(value, indent = 0) {
  try {
    const result = JSON.stringify(
      value,
      null,
      indent
    );

    return result === undefined
      ? String(value)
      : result;
  } catch (error) {
    try {
      return JSON.stringify(
        sanitizeContext(value),
        null,
        indent
      );
    } catch (fallbackError) {
      return '[Unable to serialize context]';
    }
  }
}

  function logToConsole(
  level,
  message,
  context,
  stack
) {
  const time = getFormattedTime();
  const prefix =
    `[QA-DEBUG] [${level.toUpperCase()}] [${time}]`;

  const hasContext =
    context !== null &&
    context !== undefined;

  const contextText = hasContext
    ? ' | Context: ' + safeStringify(context)
    : '';

  const fullMessage =
    `${prefix} ${message}${contextText}`;

  switch (level) {
    case 'error':
      console.error(fullMessage);

      if (stack) {
        console.error(stack);
      }
      break;

    case 'warn':
      console.warn(fullMessage);
      break;

    case 'info':
      console.info(fullMessage);
      break;

    case 'debug':
      console.debug(fullMessage);
      break;

    default:
      console.log(fullMessage);
  }
}

  window.Debug.log = function (
  level,
  message,
  context,
  stackOverride
) {
  if (!window.Debug.enabled) {
    return null;
  }

  const normalizedLevel =
    String(level || '').toLowerCase();

  if (
    !Object.prototype.hasOwnProperty.call(
      LEVEL_INDEX,
      normalizedLevel
    )
  ) {
    console.warn(
      '[QA-DEBUG] Invalid log level:',
      level
    );

    return null;
  }

  if (
    !isLevelAllowed(
      window.Debug.level,
      normalizedLevel
    )
  ) {
    return null;
  }

  let normalizedMessage;

  if (message instanceof Error) {
    normalizedMessage = message.message;
  } else if (
    message !== null &&
    typeof message === 'object'
  ) {
    normalizedMessage = safeStringify(message);
  } else {
    normalizedMessage = String(message ?? '');
  }

  const safeContext =
    context === undefined
      ? null
      : sanitizeContext(context);

  const entry = {
    id: Utils.id.uuid(),
    timestamp: new Date(),
    level: normalizedLevel,
    message: normalizedMessage,
    context: safeContext,
    stack:
      stackOverride ||
      new Error().stack ||
      null
  };

  window.Debug._logs.push(entry);

  if (window.Debug._logs.length > LIMIT) {
    window.Debug._logs.splice(
      0,
      window.Debug._logs.length - LIMIT
    );
  }

  logToConsole(
    entry.level,
    entry.message,
    entry.context,
    entry.level === 'error'
      ? entry.stack
      : null
  );

  if (
    window.Debug._panel &&
    window.Debug._panel.style.display !== 'none'
  ) {
    renderLogs();
  }

  return entry;
};

  window.Debug.error = function (
  message,
  errorObject,
  context
) {
  let finalMessage = String(message ?? '');
  let stack = null;
  let errorContext = context || {};

  if (errorObject instanceof Error) {
    stack = errorObject.stack || null;

    if (
      errorObject.message &&
      !finalMessage.includes(errorObject.message)
    ) {
      finalMessage += ` (${errorObject.message})`;
    }

    errorContext = {
      ...errorContext,
      error: {
        name: errorObject.name,
        message: errorObject.message,
        stack: errorObject.stack || null
      }
    };
  } else if (errorObject !== undefined) {
    errorContext = {
      ...errorContext,
      error: sanitizeContext(errorObject)
    };
  }

  return window.Debug.log(
    'error',
    finalMessage,
    errorContext,
    stack
  );
};

  window.Debug.warn = function (message, context) {
  return window.Debug.log(
    'warn',
    message,
    context
  );
};

window.Debug.info = function (message, context) {
  return window.Debug.log(
    'info',
    message,
    context
  );
};

window.Debug.debug = function (message, context) {
  return window.Debug.log(
    'debug',
    message,
    context
  );
};

window.Debug.verbose = function (
  message,
  context
) {
  return window.Debug.log(
    'verbose',
    message,
    context
  );
};

  // ------------------------------------------------------------------------
  // UI MANIPULATION
  // ------------------------------------------------------------------------

  function renderLogs() {
  const container =
    window.Debug._logContainer;

  if (!container) {
    return;
  }

  const shouldScroll =
    window.Debug._isAtBottom;

  container.replaceChildren();

  const fragment =
    document.createDocumentFragment();

  const filteredLogs =
    window.Debug._logs.filter(log => {
      return Boolean(
        window.Debug._filterState[log.level]
      );
    });

  filteredLogs.forEach(log => {
    const item = Utils.dom.create('div', {
      class:
        `debug-log-item log-level-${log.level}`
    });

    const timeElement = Utils.dom.create('span', {
      text: getFormattedTime(log.timestamp),
      class: 'debug-time'
    });

    const levelElement = Utils.dom.create('span', {
      text: log.level.toUpperCase(),
      class: `badge badge-${log.level}`
    });

    const messageElement = Utils.dom.create('span', {
      text: String(log.message ?? ''),
      class: 'debug-message'
    });

    item.appendChild(timeElement);
    item.appendChild(levelElement);
    item.appendChild(messageElement);

    if (
      log.context !== null &&
      log.context !== undefined
    ) {
      const details = Utils.dom.create('details', {
        class: 'debug-context-details'
      });

      const contextText =
        safeStringify(log.context);

      const shortContext =
        contextText.length > 100
          ? contextText.slice(0, 100) + '…'
          : contextText;

      const summary = Utils.dom.create('summary', {
        text: 'Context: ' + shortContext,
        class: 'debug-summary'
      });

      const pre = Utils.dom.create('pre', {
        text: safeStringify(log.context, 2),
        class: 'debug-json-view'
      });

      details.appendChild(summary);
      details.appendChild(pre);
      item.appendChild(details);
    }

    fragment.appendChild(item);
  });

  container.appendChild(fragment);

  if (shouldScroll) {
    container.scrollTop =
      container.scrollHeight;
  }
}

  window.Debug.clear = function () {
    window.Debug._logs = [];
    renderLogs();
  };

  // ------------------------------------------------------------------------
  // PERFORMANCE & STATE CAPTURE
  // ------------------------------------------------------------------------

  window.Debug.perfStart = function (id) {
  if (!window.Debug.enabled) {
    return null;
  }

  const key = String(id ?? '').trim();

  if (!key) {
    console.warn(
      '[QA-DEBUG] Performance measurement ID is required.'
    );

    return null;
  }

  const startTime = performance.now();

  window.Debug._perfResults[key] = startTime;

  return startTime;
};

window.Debug.perfEnd = function (id) {
  if (!window.Debug.enabled) {
    return null;
  }

  const key = String(id ?? '').trim();

  if (
    !Object.prototype.hasOwnProperty.call(
      window.Debug._perfResults,
      key
    )
  ) {
    window.Debug.warn(
      `Performance measurement "${key}" was not started`
    );

    return null;
  }

  const startTime =
    window.Debug._perfResults[key];

  const duration =
    performance.now() - startTime;

  delete window.Debug._perfResults[key];

  window.Debug.info(
    `Performance: ${key} completed in ${duration.toFixed(2)}ms`,
    {
      id: key,
      durationMs: duration
    }
  );

  return duration;
};

  window.Debug.captureState = function () {
  if (!window.Debug.enabled) {
    console.warn(
      '[QA-DEBUG] State capture disabled.'
    );

    return null;
  }

  try {
    const app = window.QAApp || null;

    const moduleNames =
      app && app.modules
        ? Object.keys(app.modules)
        : [];

    const pageNames =
      app && app.pages
        ? Object.keys(app.pages)
        : [];

    const state = {
      appVersion:
        app && app.version
          ? app.version
          : 'unknown',

      timestamp: new Date().toISOString(),

      activeModules: moduleNames.length,

      moduleNames,

      registeredPages: pageNames,

      storageSizeMB:
        Utils.storage.sizeMB(),

      appStateSnapshot: app
        ? sanitizeContext({
            initialized: app.initialized,
            currentRoute: app.currentRoute,
            previousRoute: app.previousRoute,
            state: app.state,
            elements: app.elements
          })
        : null
    };

    window.Debug.info(
      'State snapshot captured',
      {
        version: state.appVersion,
        storageSizeMB: state.storageSizeMB,
        activeModules: state.activeModules
      }
    );

    return state;
  } catch (error) {
    window.Debug.error(
      'Failed to capture application state',
      error
    );

    return null;
  }
};

  // ------------------------------------------------------------------------
  // EXPORT
  // ------------------------------------------------------------------------

  window.Debug.export = function () {
    if (window.Debug._logs.length === 0) {
      console.warn('[QA-DEBUG] No logs to export.');
      return;
    }

    // Confirm if in production mode
    if (!window.Debug.enabled) {
      if (!confirm('Debug mode is disabled. Export logs anyway?')) return;
    }

    const dateStr = Utils.format.formatDate(new Date(), 'YYYY-MM-DD');
    const fileName = 'debug-log-' + dateStr + '.json';

    // Build export object
    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        appVersion: (typeof QAApp !== 'undefined' && QAApp.version) ? QAApp.version : 'unknown',
        logLevel: window.Debug.level,
        totalLogs: window.Debug._logs.length,
        storageSizeMB: Utils.storage.sizeMB()
      },
      logs: window.Debug._logs.map(function (log) {
        return {
          timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : String(log.timestamp),
          level: log.level,
          message: log.message,
          context: log.context || null,
          stack: log.stack || null
        };
      })
    };

    // Add performance results if any
    const perfEntries = {};
    for (var id in window.Debug._perfResults) {
      if (window.Debug._perfResults.hasOwnProperty(id)) {
        perfEntries[id] = {
          startTime: window.Debug._perfResults[id]
        };
      }
    }
    if (Object.keys(perfEntries).length > 0) {
      exportData.performance = perfEntries;
    }

    // Serialize
    const jsonString = safeStringify(
  exportData,
  2
);

Utils.url.download(
  fileName,
  jsonString,
  'application/json'
);

for (const id in window.Debug._perfResults) {
  if (
    Object.prototype.hasOwnProperty.call(
      window.Debug._perfResults,
      id
    )
  ) {
    perfEntries[id] = {
      startTime: window.Debug._perfResults[id]
    };
  }
}

    Debug.info('Logs exported to ' + fileName);
  };

  // ------------------------------------------------------------------------
  // SETTERS (persist to storage)
  // ------------------------------------------------------------------------

  window.Debug.setEnabled = function (enabled) {
  const nextEnabled = Boolean(enabled);

  window.Debug.enabled = nextEnabled;

  const saved = Utils.storage.set(
    'qa_portfolio_debug_enabled',
    nextEnabled
  );

  if (!saved) {
    console.warn(
      '[QA-DEBUG] Failed to persist debug state.'
    );
  }

  if (nextEnabled) {
    if (!window.Debug._panel) {
      createDebugPanel();
    }

    if (window.Debug._panel) {
      window.Debug._panel.style.display = 'flex';
    }

    if (_floatingToggle) {
      _floatingToggle.style.display = 'none';
    }

    window.Debug.info('Debug mode enabled');
  } else {
    if (window.Debug._panel) {
      window.Debug._panel.style.display = 'none';
    }

    if (_floatingToggle) {
      _floatingToggle.style.display = 'flex';
    }

    console.info('[QA-DEBUG] Debug mode disabled');
  }

  return saved;
};

  window.Debug.setLevel = function (level) {
  const normalizedLevel =
    String(level || '').toLowerCase();

  if (
    !Object.prototype.hasOwnProperty.call(
      LEVEL_INDEX,
      normalizedLevel
    )
  ) {
    console.warn(
      '[QA-DEBUG] Invalid log level: ' +
      level
    );

    return false;
  }

  window.Debug.level = normalizedLevel;

  const saved = Utils.storage.set(
    'qa_portfolio_debug_level',
    normalizedLevel
  );

  const badge = window.Debug._panel
    ? window.Debug._panel.querySelector(
        '.debug-header .badge'
      )
    : null;

  if (badge) {
    badge.textContent =
      normalizedLevel.toUpperCase();

    badge.className =
      'badge badge-' + normalizedLevel;
  }

  renderLogs();

  window.Debug.info(
    'Log level set to ' + normalizedLevel
  );

  return saved;
};

  // ------------------------------------------------------------------------
  // CSS INJECTION (minimal panel styles)
  // ------------------------------------------------------------------------

  (function injectDebugStyles() {
    var styleId = 'debug-js-styles';
    if (document.getElementById(styleId)) return;

    var css = [
      '/* Debug Panel Styles */',
      '.debug-panel {',
      '  position: fixed;',
      '  bottom: 0;',
      '  right: 0;',
      '  width: 480px;',
      '  max-width: 100vw;',
      '  height: 400px;',
      '  max-height: 100vh;',
      '  background: var(--surface-primary, #1e293b);',
      '  color: var(--text-on-primary, #f8fafc);',
      '  border-radius: 8px 0 0 0;',
      '  box-shadow: -4px -4px 16px rgba(0,0,0,0.2);',
      '  display: flex;',
      '  flex-direction: column;',
      '  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
      '  font-size: 13px;',
      '  resize: both;',
      '  overflow: hidden;',
      '  border: 1px solid var(--border-color, #334155);',
      '}',
      '.debug-panel[style*="display: none"] { display: none !important; }',
      '.debug-header {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  padding: 10px 12px;',
      '  background: var(--surface-secondary, #0f172a);',
      '  border-bottom: 1px solid var(--border-color, #334155);',
      '  flex-shrink: 0;',
      '}',
      '.debug-title {',
      '  margin: 0;',
      '  font-size: 14px;',
      '  font-weight: 600;',
      '  color: var(--text-on-primary, #f8fafc);',
      '  white-space: nowrap;',
      '}',
      '.debug-header .badge {',
      '  font-size: 10px;',
      '  padding: 2px 6px;',
      '  border-radius: 4px;',
      '  font-weight: 700;',
      '  letter-spacing: 0.5px;',
      '}',
      '.badge-error { background: #ef4444; color: #fff; }',
      '.badge-warn { background: #f59e0b; color: #1e293b; }',
      '.badge-info { background: #3b82f6; color: #fff; }',
      '.badge-debug { background: #8b5cf6; color: #fff; }',
      '.badge-verbose { background: #64748b; color: #fff; }',
      '.debug-header .btn {',
      '  margin-left: auto;',
      '  cursor: pointer;',
      '  border: 1px solid var(--border-color, #334155);',
      '  background: var(--surface-tertiary, #334155);',
      '  color: var(--text-on-primary, #f8fafc);',
      '  border-radius: 4px;',
      '  padding: 4px 10px;',
      '  font-size: 12px;',
      '  transition: background 0.2s;',
      '}',
      '.debug-header .btn:hover {',
      '  background: var(--surface-hover, #475569);',
      '}',
      '.debug-header .btn-danger {',
      '  border-color: #ef4444;',
      '  background: rgba(239,68,68,0.2);',
      '  color: #fca5a5;',
      '}',
      '.debug-header .btn-danger:hover {',
      '  background: rgba(239,68,68,0.35);',
      '}',
      '.debug-filters {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 8px;',
      '  padding: 8px 12px;',
      '  background: var(--surface-secondary, #0f172a);',
      '  border-bottom: 1px solid var(--border-color, #334155);',
      '  flex-shrink: 0;',
      '}',
      '.debug-filter-label {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '  cursor: pointer;',
      '  font-size: 11px;',
      '}',
      '.debug-filter-label input {',
      '  margin: 0;',
      '  cursor: pointer;',
      '}',
      '.debug-filter-text {',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.3px;',
      '  color: var(--text-on-primary, #94a3b8);',
      '}',
      '.debug-log-container {',
      '  flex: 1;',
      '  overflow-y: auto;',
      '  padding: 4px 0;',
      '  scroll-behavior: smooth;',
      '}',
      '.debug-log-container::-webkit-scrollbar { width: 6px; }',
      '.debug-log-container::-webkit-scrollbar-track { background: transparent; }',
      '.debug-log-container::-webkit-scrollbar-thumb {',
      '  background: var(--border-color, #334155);',
      '  border-radius: 3px;',
      '}',
      '.debug-log-item {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  align-items: flex-start;',
      '  gap: 6px;',
      '  padding: 6px 12px;',
      '  border-bottom: 1px solid rgba(255,255,255,0.05);',
      '  font-size: 12px;',
      '  line-height: 1.4;',
      '}',
      '.debug-log-item:hover {',
      '  background: rgba(255,255,255,0.03);',
      '}',
      '.log-level-error { border-left: 3px solid #ef4444; }',
      '.log-level-warn { border-left: 3px solid #f59e0b; }',
      '.log-level-info { border-left: 3px solid #3b82f6; }',
      '.log-level-debug { border-left: 3px solid #8b5cf6; }',
      '.log-level-verbose { border-left: 3px solid #64748b; }',
      '.debug-time {',
      '  color: #64748b;',
      '  font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;',
      '  font-size: 11px;',
      '  white-space: nowrap;',
      '  flex-shrink: 0;',
      '}',
      '.debug-log-item .badge {',
      '  font-size: 9px;',
      '  padding: 1px 5px;',
      '  border-radius: 3px;',
      '  font-weight: 700;',
      '  flex-shrink: 0;',
      '  margin-top: 1px;',
      '}',
      '.debug-message {',
      '  flex: 1;',
      '  word-break: break-word;',
      '  color: var(--text-on-primary, #e2e8f0);',
      '}',
      '.log-level-error .debug-message { color: #fca5a5; }',
      '.log-level-warn .debug-message { color: #fcd34d; }',
      '.debug-context-details {',
      '  width: 100%;',
      '  margin-top: 4px;',
      '}',
      '.debug-summary {',
      '  cursor: pointer;',
      '  font-size: 11px;',
      '  color: #64748b;',
      '  user-select: none;',
      '}',
      '.debug-summary:hover { color: #94a3b8; }',
      '.debug-json-view {',
      '  margin: 4px 0 0 0;',
      '  padding: 8px;',
      '  background: rgba(0,0,0,0.3);',
      '  border-radius: 4px;',
      '  font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;',
      '  font-size: 11px;',
      '  color: #93c5fd;',
      '  overflow-x: auto;',
      '  max-height: 200px;',
      '  white-space: pre-wrap;',
      '  word-break: break-all;',
      '}',
      '.debug-footer {',
      '  padding: 8px 12px;',
      '  background: var(--surface-secondary, #0f172a);',
      '  border-top: 1px solid var(--border-color, #334155);',
      '  flex-shrink: 0;',
      '  display: flex;',
      '  justify-content: flex-end;',
      '}',
      '.debug-footer .btn {',
      '  cursor: pointer;',
      '  border: 1px solid var(--border-color, #334155);',
      '  background: var(--surface-tertiary, #334155);',
      '  color: var(--text-on-primary, #f8fafc);',
      '  border-radius: 4px;',
      '  padding: 4px 10px;',
      '  font-size: 12px;',
      '}',
      '.debug-footer .btn:hover {',
      '  background: var(--surface-hover, #475569);',
      '}',
      '/* Floating toggle button (when panel is hidden) */',
      '.debug-toggle-btn {',
      '  position: fixed;',
      '  bottom: 16px;',
      '  right: 16px;',
      '  width: 40px;',
      '  height: 40px;',
      '  border-radius: 50%;',
      '  background: #0ea5b8;',
      '  color: #fff;',
      '  border: none;',
      '  cursor: pointer;',
      '  font-size: 18px;',
      '  font-weight: 700;',
      '  box-shadow: 0 4px 12px rgba(14,165,184,0.4);',
      '  z-index: ' + Utils.constants.Z_INDEX.TOAST + ';',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  transition: transform 0.2s, box-shadow 0.2s;',
      '}',
      '.debug-toggle-btn:hover {',
      '  transform: scale(1.1);',
      '  box-shadow: 0 6px 16px rgba(14,165,184,0.5);',
      '}',
      '/* Mobile responsive */',
      '@media (max-width: ' + (Utils.constants.BREAKPOINTS.MD - 1) + 'px) {',
      '  .debug-panel {',
      '    width: 100vw !important;',
      '    height: 100vh !important;',
      '    max-height: 100vh;',
      '    border-radius: 0;',
      '    border: none;',
      '  }',
      '  .debug-title { font-size: 13px; }',
      '  .debug-filters { padding: 6px 8px; }',
      '  .debug-filter-text { font-size: 10px; }',
      '  .debug-log-item { padding: 4px 8px; font-size: 11px; }',
      '  .debug-time { font-size: 10px; }',
      '  .debug-json-view { font-size: 10px; }',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ------------------------------------------------------------------------
  // FLOATING TOGGLE BUTTON (visible when panel is hidden)
  // ------------------------------------------------------------------------

  let _floatingToggle = null;

function createFloatingToggle() {
  if (
    _floatingToggle &&
    document.body.contains(_floatingToggle)
  ) {
    return _floatingToggle;
  }

  if (!document.body) {
    return null;
  }

  _floatingToggle = Utils.dom.create('button', {
    class: 'debug-toggle-btn',
    text: '\u26A0',
    title: 'Open Debug Console',
    attrs: {
      type: 'button'
    },
    aria: {
      label: 'Open Debug Console'
    }
  });

  _floatingToggle.addEventListener(
    'click',
    function () {
      if (!window.Debug.enabled) {
        window.Debug.setEnabled(true);
      }

      if (!window.Debug._panel) {
        createDebugPanel();
      }

      if (window.Debug._panel) {
        window.Debug._panel.style.display = 'flex';
      }

      _floatingToggle.style.display = 'none';

      renderLogs();
    }
  );

  document.body.appendChild(_floatingToggle);

  const panelIsVisible =
    window.Debug._panel &&
    window.Debug._panel.style.display !== 'none';

  _floatingToggle.style.display =
    panelIsVisible ? 'none' : 'flex';

  return _floatingToggle;
}

  // Show floating toggle when panel is hidden
  window.Debug.toggle = function () {
  if (!window.Debug._panel) {
    const panel = createDebugPanel();

    if (!panel) {
      return false;
    }

    panel.style.display = 'flex';

    if (_floatingToggle) {
      _floatingToggle.style.display = 'none';
    }

    return true;
  }

  const panel = window.Debug._panel;

  const isHidden =
    panel.style.display === 'none' ||
    getComputedStyle(panel).display === 'none';

  panel.style.display =
    isHidden ? 'flex' : 'none';

  const button = panel.querySelector(
    '.debug-footer button'
  );

  if (button) {
    button.textContent =
      isHidden ? 'Hide Panel' : 'Show Panel';

    button.setAttribute(
      'aria-expanded',
      isHidden ? 'true' : 'false'
    );

    button.setAttribute(
      'aria-label',
      isHidden
        ? 'Hide debug console'
        : 'Show debug console'
    );
  }

  if (_floatingToggle) {
    _floatingToggle.style.display =
      isHidden ? 'none' : 'flex';
  }

  if (isHidden) {
    renderLogs();
  }

  return isHidden;
};

  // ------------------------------------------------------------------------
  // GLOBAL ERROR HANDLER (catches uncaught errors)
  // ------------------------------------------------------------------------

  window.addEventListener('error', function (event) {
  if (
    !window.Debug.enabled ||
    window.Debug._handlingGlobalError
  ) {
    return;
  }

  window.Debug._handlingGlobalError = true;

  try {
    window.Debug.error(
      'Uncaught error: ' +
        (event.message || 'Unknown error'),
      event.error || event,
      {
        filename: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null
      }
    );
  } catch (debugError) {
    console.error(
      '[QA-DEBUG] Error handler failed:',
      debugError
    );
  } finally {
    window.Debug._handlingGlobalError = false;
  }
});

window.addEventListener(
  'unhandledrejection',
  function (event) {
    if (
      !window.Debug.enabled ||
      window.Debug._handlingGlobalError
    ) {
      return;
    }

    window.Debug._handlingGlobalError = true;

    try {
      const reason = event.reason;

      const message =
        reason instanceof Error
          ? reason.message
          : safeStringify(reason);

      window.Debug.error(
        'Unhandled promise rejection: ' +
          message,
        reason
      );
    } catch (debugError) {
      console.error(
        '[QA-DEBUG] Rejection handler failed:',
        debugError
      );
    } finally {
      window.Debug._handlingGlobalError = false;
    }
  }
);

  // ------------------------------------------------------------------------
  // INITIALIZATION
  // ------------------------------------------------------------------------

  function bootstrap() {
  if (window.Debug._bootstrapped) {
    return;
  }

  if (!document.body) {
    document.addEventListener(
      'DOMContentLoaded',
      bootstrap,
      { once: true }
    );

    return;
  }

  window.Debug._bootstrapped = true;

  const storedEnabled = Utils.storage.get(
    'qa_portfolio_debug_enabled',
    false
  );

  window.Debug.enabled =
    storedEnabled === true ||
    storedEnabled === 'true';

  const storedLevel = Utils.storage.get(
    'qa_portfolio_debug_level',
    'error'
  );

  if (
    Object.prototype.hasOwnProperty.call(
      LEVEL_INDEX,
      storedLevel
    )
  ) {
    window.Debug.level = storedLevel;
  }

  const storedFilters = Utils.storage.get(
    'qa_portfolio_debug_filters',
    null
  );

  if (
    storedFilters &&
    typeof storedFilters === 'object'
  ) {
    LEVELS.forEach(level => {
      if (
        typeof storedFilters[level] ===
        'boolean'
      ) {
        window.Debug._filterState[level] =
          storedFilters[level];
      }
    });
  }

  window.$D = function (
    level,
    message,
    context
  ) {
    return window.Debug.log(
      level,
      message,
      context
    );
  };

  if (window.Debug.enabled) {
    createDebugPanel();
  }

  createFloatingToggle();

  if (_floatingToggle) {
    _floatingToggle.style.display =
      window.Debug.enabled &&
      window.Debug._panel
        ? 'none'
        : 'flex';
  }

  window.Debug.info(
    'Debug module initialized',
    {
      enabled: window.Debug.enabled,
      level: window.Debug.level
    }
  );
}

  // Defer initialization if DOM is not ready
  if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    bootstrap,
    { once: true }
  );
} else {
  bootstrap();
}

  // Expose init for manual call
  window.Debug.init = bootstrap;

  // ------------------------------------------------------------------------
  // CONSOLE LOG
  // ------------------------------------------------------------------------

  console.log('%c[Debug] Debugging toolkit loaded', 'color: #f59e0b;');

})();
