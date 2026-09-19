/* js/logic/idb.js - Offline storage: IndexedDB -> localStorage -> Memory */
(function(window) {
  'use strict';

  var DB_NAME = 'qa-study-portfolio';
  var DB_VERSION = 1;
  var STORES = [
    { name: 'settings', keyPath: 'key' },
    { name: 'lessons', keyPath: 'id' },
    { name: 'notes', keyPath: 'id' },
    { name: 'questions', keyPath: 'id' },
    { name: 'flashcards', keyPath: 'id' },
    { name: 'practice', keyPath: 'id' },
    { name: 'portfolio', keyPath: 'id' },
    { name: 'tags', keyPath: 'id' },
    { name: 'categories', keyPath: 'id' },
    { name: 'sessions', keyPath: 'id' },
    { name: 'journal', keyPath: 'id' }
  ];
  var STORE_NAMES = STORES.map(function(s) { return s.name; });
  var LS_PREFIX = 'qa-sp-';
  var BACKUP_KEY = 'qa-sp-backup-auto';
  var BROADCAST_CHANNEL_NAME = 'qa-study-portfolio';

  var db = null;
  var mode = 'indexeddb';
  var opts = {};
  var memoryMap = new Map();
  var debounceTimers = {};
  var broadcastChannel = null;
  var isInitialized = false;

  function safeCallback(name, arg) {
    try { if (opts && typeof opts[name] === 'function') opts[name](arg); } catch (e) {}
  }
  function warn(msg) { safeCallback('onWarning', msg); }
  function saveState(state) { safeCallback('onSaveState', state); }
  function quotaWarn(p) { safeCallback('onQuotaWarning', p); }
  function tabConflict(info) { safeCallback('onTabConflict', info); }

  function hasIndexedDB() {
    try { return typeof window.indexedDB !== 'undefined' && window.indexedDB !== null; } catch (e) { return false; }
  }
  function hasLocalStorage() {
    try {
      var k = '__qa_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  function lsKey(storeName, key) { return LS_PREFIX + storeName + '-' + String(key); }
  function lsPrefix(storeName) { return LS_PREFIX + storeName + '-'; }
  function getStoreDef(name) {
    for (var i = 0; i < STORES.length; i++) if (STORES[i].name === name) return STORES[i];
    return null;
  }
  function isKnownStore(name) { return STORE_NAMES.indexOf(name) !== -1; }
  function ensureStoreArg(storeName) { return isKnownStore(storeName); }

  function setupBroadcast() {
    if (typeof window.BroadcastChannel === 'undefined') return;
    try {
      broadcastChannel = new window.BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = function(ev) {
        tabConflict({ source: 'broadcast', data: ev.data });
      };
    } catch (e) { broadcastChannel = null; }
  }
  function broadcast(type, storeName, key) {
    if (!broadcastChannel) return;
    try { broadcastChannel.postMessage({ type: type, storeName: storeName, key: key, ts: Date.now() }); } catch (e) {}
  }
  function setupStorageListener() {
    try {
      window.addEventListener('storage', function(e) {
        if (!e || !e.key) return;
        if (e.key.indexOf(LS_PREFIX) === 0 || e.key === BACKUP_KEY) {
          tabConflict({ source: 'storage', data: { key: e.key, newValue: e.newValue, oldValue: e.oldValue } });
        }
      });
    } catch (e) {}
  }

  function migrate(dbInstance, transaction, oldVersion, newVersion) {
    try {
      STORES.forEach(function(def) {
        var store = null;
        if (!dbInstance.objectStoreNames.contains(def.name)) {
          try { dbInstance.createObjectStore(def.name, { keyPath: def.keyPath }); } catch (e) {}
        }
        try { store = transaction.objectStore(def.name); } catch (e) { return; }
        try {
          if (def.name === 'lessons' && !store.indexNames.contains('byModule')) store.createIndex('byModule', 'moduleId', { unique: false });
          if (def.name === 'notes' && !store.indexNames.contains('byLesson')) store.createIndex('byLesson', 'lessonId', { unique: false });
          if (def.name === 'questions' && !store.indexNames.contains('byModule')) store.createIndex('byModule', 'moduleId', { unique: false });
          if (def.name === 'sessions' && !store.indexNames.contains('byDate')) store.createIndex('byDate', 'date', { unique: false });
          if (def.name === 'journal' && !store.indexNames.contains('byDate')) store.createIndex('byDate', 'date', { unique: false });
        } catch (e) {}
      });
      void oldVersion;
      void newVersion;
    } catch (e) { warn('migrate error: ' + (e.message || e)); }
  }

  function createStoresAndIndexes(dbInstance, transaction) {
    migrate(dbInstance, transaction, 0, DB_VERSION);
  }

  function openIndexedDB() {
    return new Promise(function(resolve, reject) {
      if (!hasIndexedDB()) { reject(new Error('IndexedDB unavailable')); return; }
      var req;
      try { req = window.indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function(ev) {
        var d = ev.target.result;
        var tx = ev.target.transaction;
        db = d;
        try { createStoresAndIndexes(d, tx); } catch (e) { warn('onupgradeneeded: ' + (e.message || e)); }
      };
      req.onsuccess = function(ev) {
        db = ev.target.result;
        try {
          db.onclose = function() { db = null; };
          db.onerror = function(e) { warn('IndexedDB error: ' + (e.target && e.target.error ? e.target.error.message : 'unknown')); };
          db.onversionchange = function() { try { db.close(); } catch (e2) {} db = null; };
        } catch (e) {}
        resolve(db);
      };
      req.onerror = function(ev) { reject(ev.target.error || new Error('open error')); };
      req.onblocked = function() { reject(new Error('blocked')); };
    });
  }

  function idbGet(storeName, key) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      var tx;
      try { tx = db.transaction(storeName, 'readonly'); } catch (e) { reject(e); return; }
      var store;
      try { store = tx.objectStore(storeName); } catch (e) { reject(e); return; }
      var req;
      try { req = store.get(key); } catch (e) { reject(e); return; }
      req.onsuccess = function() { resolve(req.result !== undefined ? req.result : undefined); };
      req.onerror = function() { reject(req.error); };
      tx.onerror = function() { reject(tx.error || req.error); };
      tx.onabort = function() { reject(tx.error || new Error('abort')); };
    });
  }

  function idbGetAll(storeName) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      var tx;
      try { tx = db.transaction(storeName, 'readonly'); } catch (e) { reject(e); return; }
      var store;
      try { store = tx.objectStore(storeName); } catch (e) { reject(e); return; }
      var req;
      try { req = store.getAll(); } catch (e) { reject(e); return; }
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function() { reject(req.error); };
    });
  }

  function handleQuota() { return clearOldSessions(50); }

  function idbPut(storeName, value) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      var tx;
      try { tx = db.transaction(storeName, 'readwrite'); } catch (e) { reject(e); return; }
      var store;
      try { store = tx.objectStore(storeName); } catch (e) { reject(e); return; }
      var req;
      try { req = store.put(value); } catch (e) { reject(e); return; }
      req.onsuccess = function() { broadcast('put', storeName, value && (value.id || value.key)); resolve(); };
      req.onerror = function() {
        var err = req.error;
        if (err && err.name === 'QuotaExceededError') {
          handleQuota().then(function() {
            try {
              var tx2 = db.transaction(storeName, 'readwrite');
              var st2 = tx2.objectStore(storeName);
              var r2 = st2.put(value);
              r2.onsuccess = function() { broadcast('put', storeName, value && (value.id || value.key)); resolve(); };
              r2.onerror = function() { quotaWarn(100); warn('QuotaExceededError: очисти старые сессии и экспортируй данные.'); reject(r2.error); };
              tx2.onabort = function() { reject(tx2.error || new Error('abort')); };
            } catch (e2) { reject(e2); }
          }).catch(function() { reject(err); });
        } else reject(err);
      };
      tx.onabort = function() { reject(tx.error || new Error('abort')); };
    });
  }

  function idbBulkPut(storeName, values) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      if (!Array.isArray(values)) { reject(new Error('values must be array')); return; }
      if (values.length === 0) { resolve(); return; }
      var tx;
      try { tx = db.transaction(storeName, 'readwrite'); } catch (e) { reject(e); return; }
      var store;
      try { store = tx.objectStore(storeName); } catch (e) { reject(e); return; }
      var hasError = false;
      var capturedError = null;
      tx.oncomplete = function() {
        if (!hasError) { broadcast('put', storeName, 'bulk:' + values.length); resolve(); }
        else reject(capturedError || new Error('bulk error'));
      };
      tx.onerror = function() {
        var e = tx.error || capturedError;
        if (e && e.name === 'QuotaExceededError') {
          handleQuota().then(function() {
            var tx2;
            try { tx2 = db.transaction(storeName, 'readwrite'); } catch (e2) { reject(e2); return; }
            var st2 = tx2.objectStore(storeName);
            tx2.oncomplete = function() { broadcast('put', storeName, 'bulk:' + values.length); resolve(); };
            tx2.onerror = function() { quotaWarn(100); warn('QuotaExceededError при bulkPut'); reject(tx2.error); };
            tx2.onabort = function() { reject(tx2.error || new Error('abort')); };
            values.forEach(function(v) { try { st2.put(v); } catch (e3) {} });
          }).catch(function() { quotaWarn(100); warn('QuotaExceededError: не удалось повторить bulkPut'); reject(e); });
        } else reject(e || new Error('tx error'));
      };
      tx.onabort = function() { reject(tx.error || capturedError || new Error('tx abort')); };
      try {
        values.forEach(function(v) {
          try {
            var r = store.put(v);
            r.onerror = function() { hasError = true; capturedError = r.error; };
          } catch (e) { hasError = true; capturedError = e; }
        });
      } catch (e) { hasError = true; capturedError = e; }
    });
  }

  function idbDelete(storeName, key) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      var tx;
      try { tx = db.transaction(storeName, 'readwrite'); } catch (e) { reject(e); return; }
      var store;
      try { store = tx.objectStore(storeName); } catch (e) { reject(e); return; }
      var req;
      try { req = store.delete(key); } catch (e) { reject(e); return; }
      req.onsuccess = function() { broadcast('delete', storeName, key); resolve(); };
      req.onerror = function() { reject(req.error); };
      tx.onabort = function() { reject(tx.error || new Error('abort')); };
    });
  }

  function idbClear(storeName) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      var tx;
      try { tx = db.transaction(storeName, 'readwrite'); } catch (e) { reject(e); return; }
      var store;
      try { store = tx.objectStore(storeName); } catch (e) { reject(e); return; }
      var req;
      try { req = store.clear(); } catch (e) { reject(e); return; }
      req.onsuccess = function() { broadcast('clear', storeName, null); resolve(); };
      req.onerror = function() { reject(req.error); };
      tx.onabort = function() { reject(tx.error || new Error('abort')); };
    });
  }

  function idbGetByIndex(storeName, indexName, value) {
    return new Promise(function(resolve, reject) {
      if (!db) { reject(new Error('DB not open')); return; }
      var tx;
      try { tx = db.transaction(storeName, 'readonly'); } catch (e) { reject(e); return; }
      var store;
      try { store = tx.objectStore(storeName); } catch (e) { reject(e); return; }
      var idx;
      try { idx = store.index(indexName); } catch (e) { reject(e); return; }
      var req;
      try { req = idx.getAll(value); } catch (e) { reject(e); return; }
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function() { reject(req.error); };
    });
  }

  function lsGet(storeName, key) {
    return new Promise(function(resolve) {
      try {
        var raw = window.localStorage.getItem(lsKey(storeName, key));
        if (raw === null) { resolve(undefined); return; }
        try { resolve(JSON.parse(raw)); } catch (e) { warn('Битый JSON в ' + storeName + '/' + key + ' пропущен'); resolve(undefined); }
      } catch (e) { resolve(undefined); }
    });
  }
  function lsGetAll(storeName) {
    return new Promise(function(resolve) {
      var out = [];
      try {
        var prefix = lsPrefix(storeName);
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(prefix) === 0) {
            var raw = window.localStorage.getItem(k);
            if (raw === null) continue;
            try { out.push(JSON.parse(raw)); } catch (e) { warn('Битый JSON в ' + k + ' пропущен'); }
          }
        }
      } catch (e) {}
      resolve(out);
    });
  }
  function lsPut(storeName, value) {
    return new Promise(function(resolve, reject) {
      try {
        var def = getStoreDef(storeName);
        var key = value[def.keyPath];
        if (key === undefined || key === null) { reject(new Error('Missing keyPath ' + def.keyPath)); return; }
        var s = JSON.stringify(value);
        try { window.localStorage.setItem(lsKey(storeName, key), s); } catch (e) {
          if (e && e.name === 'QuotaExceededError') {
            handleQuota().then(function() {
              try { window.localStorage.setItem(lsKey(storeName, key), s); broadcast('put', storeName, key); resolve(); } catch (e2) { quotaWarn(100); warn('QuotaExceededError в localStorage'); reject(e2); }
            }).catch(function() { reject(e); });
            return;
          } else { reject(e); return; }
        }
        broadcast('put', storeName, key);
        resolve();
      } catch (e) { reject(e); }
    });
  }
  function lsBulkPut(storeName, values) {
    return new Promise(function(resolve, reject) {
      try {
        if (!Array.isArray(values)) { reject(new Error('values must be array')); return; }
        for (var i = 0; i < values.length; i++) {
          var v = values[i];
          var def = getStoreDef(storeName);
          var key = v[def.keyPath];
          if (key === undefined) { reject(new Error('Missing keyPath')); return; }
          var s = JSON.stringify(v);
          try { window.localStorage.setItem(lsKey(storeName, key), s); } catch (e) {
            if (e && e.name === 'QuotaExceededError') {
              (function(idx) {
                handleQuota().then(function() {
                  try { window.localStorage.setItem(lsKey(storeName, values[idx][getStoreDef(storeName).keyPath]), JSON.stringify(values[idx])); } catch (e2) { quotaWarn(100); warn('QuotaExceededError bulkPut'); reject(e2); return; }
                  for (var j = idx + 1; j < values.length; j++) {
                    var v2 = values[j];
                    var k2 = v2[getStoreDef(storeName).keyPath];
                    try { window.localStorage.setItem(lsKey(storeName, k2), JSON.stringify(v2)); } catch (e3) { quotaWarn(100); reject(e3); return; }
                  }
                  broadcast('put', storeName, 'bulk:' + values.length);
                  resolve();
                }).catch(function() { reject(e); });
              })(i);
              return;
            } else { reject(e); return; }
          }
        }
        broadcast('put', storeName, 'bulk:' + values.length);
        resolve();
      } catch (e) { reject(e); }
    });
  }
  function lsDelete(storeName, key) {
    return new Promise(function(resolve) {
      try { window.localStorage.removeItem(lsKey(storeName, key)); } catch (e) {}
      broadcast('delete', storeName, key);
      resolve();
    });
  }
  function lsClear(storeName) {
    return new Promise(function(resolve) {
      try {
        var prefix = lsPrefix(storeName);
        var toRemove = [];
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(prefix) === 0) toRemove.push(k);
        }
        toRemove.forEach(function(k) { try { window.localStorage.removeItem(k); } catch (e) {} });
      } catch (e) {}
      broadcast('clear', storeName, null);
      resolve();
    });
  }
  function lsGetByIndex(storeName, indexName, value) {
    return lsGetAll(storeName).then(function(arr) {
      return arr.filter(function(item) { try { return item && item[indexName] === value; } catch (e) { return false; } });
    });
  }

  function memKey(storeName, key) { return storeName + '::' + String(key); }
  function memGet(storeName, key) {
    return Promise.resolve(memoryMap.has(memKey(storeName, key)) ? memoryMap.get(memKey(storeName, key)) : undefined);
  }
  function memGetAll(storeName) {
    return new Promise(function(resolve) {
      var out = [];
      var pref = storeName + '::';
      memoryMap.forEach(function(v, k) { if (k.indexOf(pref) === 0) out.push(v); });
      resolve(out);
    });
  }
  function memPut(storeName, value) {
    return new Promise(function(resolve, reject) {
      try {
        var def = getStoreDef(storeName);
        var key = value[def.keyPath];
        if (key === undefined) { reject(new Error('Missing keyPath')); return; }
        memoryMap.set(memKey(storeName, key), value);
        broadcast('put', storeName, key);
        resolve();
      } catch (e) { reject(e); }
    });
  }
  function memBulkPut(storeName, values) {
    return new Promise(function(resolve, reject) {
      try {
        if (!Array.isArray(values)) { reject(new Error('values must be array')); return; }
        values.forEach(function(v) {
          var def = getStoreDef(storeName);
          var key = v[def.keyPath];
          if (key === undefined) throw new Error('Missing keyPath');
          memoryMap.set(memKey(storeName, key), v);
        });
        broadcast('put', storeName, 'bulk:' + values.length);
        resolve();
      } catch (e) { reject(e); }
    });
  }
  function memDelete(storeName, key) {
    return new Promise(function(resolve) {
      memoryMap.delete(memKey(storeName, key));
      broadcast('delete', storeName, key);
      resolve();
    });
  }
  function memClear(storeName) {
    return new Promise(function(resolve) {
      var pref = storeName + '::';
      var todel = [];
      memoryMap.forEach(function(v, k) { if (k.indexOf(pref) === 0) todel.push(k); });
      todel.forEach(function(k) { memoryMap.delete(k); });
      broadcast('clear', storeName, null);
      resolve();
    });
  }
  function memGetByIndex(storeName, indexName, value) {
    return memGetAll(storeName).then(function(arr) {
      return arr.filter(function(item) { return item && item[indexName] === value; });
    });
  }

  function dispatchGet(storeName, key) {
    if (!ensureStoreArg(storeName)) return Promise.reject(new Error('Unknown store ' + storeName));
    if (mode === 'indexeddb') return idbGet(storeName, key);
    if (mode === 'localstorage') return lsGet(storeName, key);
    return memGet(storeName, key);
  }
  function dispatchGetAll(storeName) {
    if (!ensureStoreArg(storeName)) return Promise.reject(new Error('Unknown store ' + storeName));
    if (mode === 'indexeddb') return idbGetAll(storeName);
    if (mode === 'localstorage') return lsGetAll(storeName);
    return memGetAll(storeName);
  }
  function dispatchPut(storeName, value) {
    if (!ensureStoreArg(storeName)) return Promise.reject(new Error('Unknown store ' + storeName));
    if (mode === 'indexeddb') return idbPut(storeName, value);
    if (mode === 'localstorage') return lsPut(storeName, value);
    return memPut(storeName, value);
  }
  function dispatchBulkPut(storeName, values) {
    if (!ensureStoreArg(storeName)) return Promise.reject(new Error('Unknown store ' + storeName));
    if (mode === 'indexeddb') return idbBulkPut(storeName, values);
    if (mode === 'localstorage') return lsBulkPut(storeName, values);
    return memBulkPut(storeName, values);
  }
  function dispatchDelete(storeName, key) {
    if (!ensureStoreArg(storeName)) return Promise.reject(new Error('Unknown store ' + storeName));
    if (mode === 'indexeddb') return idbDelete(storeName, key);
    if (mode === 'localstorage') return lsDelete(storeName, key);
    return memDelete(storeName, key);
  }
  function dispatchClear(storeName) {
    if (!ensureStoreArg(storeName)) return Promise.reject(new Error('Unknown store ' + storeName));
    if (mode === 'indexeddb') return idbClear(storeName);
    if (mode === 'localstorage') return lsClear(storeName);
    return memClear(storeName);
  }
  function dispatchGetByIndex(storeName, indexName, value) {
    if (!ensureStoreArg(storeName)) return Promise.reject(new Error('Unknown store ' + storeName));
    if (mode === 'indexeddb') return idbGetByIndex(storeName, indexName, value);
    if (mode === 'localstorage') return lsGetByIndex(storeName, indexName, value);
    return memGetByIndex(storeName, indexName, value);
  }

  function estimate() {
    return new Promise(function(resolve) {
      try {
        if (navigator.storage && typeof navigator.storage.estimate === 'function') {
          navigator.storage.estimate().then(function(r) {
            var usage = r.usage || 0;
            var quota = r.quota || 0;
            var percent = quota ? Math.round((usage / quota) * 100) : 0;
            if (percent >= 80) quotaWarn(percent);
            resolve({ usage: usage, quota: quota, percent: percent });
          }).catch(function() { resolve({ usage: 0, quota: 0, percent: 0 }); });
        } else resolve({ usage: 0, quota: 0, percent: 0 });
      } catch (e) { resolve({ usage: 0, quota: 0, percent: 0 }); }
    });
  }

  function clearOldSessions(keepCount) {
    if (keepCount === undefined) keepCount = 50;
    return new Promise(function(resolve) {
      var p;
      if (mode === 'indexeddb' && db) {
        p = new Promise(function(res) {
          var tx;
          try { tx = db.transaction('sessions', 'readonly'); } catch (e) { res([]); return; }
          var store;
          try { store = tx.objectStore('sessions'); } catch (e) { res([]); return; }
          var idx;
          try { idx = store.index('byDate'); } catch (e) {
            var reqAll;
            try { reqAll = store.getAll(); } catch (e2) { res([]); return; }
            reqAll.onsuccess = function() { res(reqAll.result || []); };
            reqAll.onerror = function() { res([]); };
            return;
          }
          var req;
          try { req = idx.getAll(); } catch (e) { res([]); return; }
          req.onsuccess = function() { res(req.result || []); };
          req.onerror = function() { res([]); };
        });
      } else if (mode === 'localstorage') {
        p = lsGetAll('sessions');
      } else if (mode === 'memory') {
        p = memGetAll('sessions');
      } else {
        p = Promise.resolve([]);
        if (hasLocalStorage()) p = lsGetAll('sessions');
        else p = memGetAll('sessions');
      }
      p.then(function(all) {
        var arr = all.slice();
        arr.sort(function(a, b) {
          var da = a && a.date ? new Date(a.date).getTime() : 0;
          var dbv = b && b.date ? new Date(b.date).getTime() : 0;
          return da - dbv;
        });
        if (arr.length <= keepCount) { resolve(); return; }
        var toDelete = arr.slice(0, arr.length - keepCount);
        var promises = toDelete.map(function(item) {
          var id = item && item.id;
          if (id === undefined) return Promise.resolve();
          if (mode === 'indexeddb' && db) return idbDelete('sessions', id).catch(function() {});
          if (mode === 'localstorage') return lsDelete('sessions', id).catch(function() {});
          return memDelete('sessions', id).catch(function() {});
        });
        Promise.all(promises).then(function() { resolve(); }).catch(function() { resolve(); });
      }).catch(function() { resolve(); });
    });
  }

  function autoSave(storeName, data, debounceMs) {
    if (debounceMs === undefined) debounceMs = 300;
    if (!ensureStoreArg(storeName)) return;
    if (debounceTimers[storeName]) clearTimeout(debounceTimers[storeName]);
    saveState('saving');
    debounceTimers[storeName] = setTimeout(function() {
      debounceTimers[storeName] = null;
      var p;
      try {
        if (Array.isArray(data)) p = dispatchBulkPut(storeName, data);
        else p = dispatchPut(storeName, data);
      } catch (e) { saveState('error'); warn('autoSave error: ' + e.message); return; }
      p.then(function() { saveState('saved'); }).catch(function(e) {
        saveState('error');
        if (e && e.name === 'QuotaExceededError') {
          handleQuota().then(function() {
            var p2 = Array.isArray(data) ? dispatchBulkPut(storeName, data) : dispatchPut(storeName, data);
            p2.then(function() { saveState('saved'); }).catch(function() { quotaWarn(100); warn('QuotaExceededError autoSave'); saveState('error'); });
          });
        } else warn('autoSave failed: ' + (e && e.message ? e.message : e));
      });
    }, debounceMs);
  }

  function saveAutoBackup(dataObj) {
    try {
      var s = JSON.stringify(dataObj);
      if (hasLocalStorage()) {
        try { window.localStorage.setItem(BACKUP_KEY, s); } catch (e) { memoryMap.set(BACKUP_KEY, s); }
      } else { memoryMap.set(BACKUP_KEY, s); }
    } catch (e) {}
  }
  function doBackup() {
    return exportAllInternal().then(function(data) { saveAutoBackup(data); }).catch(function() {});
  }

  function exportAllInternal() {
    var result = {};
    var promises = STORE_NAMES.map(function(sn) {
      return dispatchGetAll(sn).then(function(arr) { result[sn] = arr.slice(); }).catch(function() { result[sn] = []; });
    });
    return Promise.all(promises).then(function() {
      result.schemaVersion = DB_VERSION;
      result.exportedAt = new Date().toISOString();
      return result;
    });
  }
  function exportAll() { return exportAllInternal(); }
  function exportStore(storeName) {
    if (!ensureStoreArg(storeName)) return Promise.reject(new Error('Unknown store'));
    return dispatchGetAll(storeName);
  }

  function importAll(data) {
    return new Promise(function(resolve, reject) {
      try {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          warn('importAll: битый JSON - ожидается объект');
          reject(new Error('importAll: data must be object'));
          return;
        }
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (k === 'schemaVersion' || k === 'exportedAt') continue;
          if (!isKnownStore(k)) { warn('importAll: неизвестный store ' + k + ' пропущен'); continue; }
          if (!Array.isArray(data[k])) {
            warn('importAll: значение store ' + k + ' должно быть массивом');
            reject(new Error('Store ' + k + ' must be array'));
            return;
          }
        }
      } catch (e) { warn('importAll validation error: ' + e.message); reject(e); return; }
      doBackup().then(function() {
        var chains = [];
        STORE_NAMES.forEach(function(sn) {
          if (Array.isArray(data[sn])) {
            chains.push(dispatchClear(sn).then(function() {
              if (data[sn].length === 0) return;
              return dispatchBulkPut(sn, data[sn]);
            }).catch(function(e) { warn('importAll bulkPut ' + sn + ': ' + e.message); }));
          }
        });
        Promise.all(chains).then(function() { resolve(); }).catch(function(e) { warn('importAll failed: ' + e.message); reject(e); });
      }).catch(function() {
        var chains2 = [];
        STORE_NAMES.forEach(function(sn) {
          if (Array.isArray(data[sn])) chains2.push(dispatchClear(sn).then(function() { if (data[sn].length) return dispatchBulkPut(sn, data[sn]); }));
        });
        Promise.all(chains2).then(function() { resolve(); }).catch(function(e) { reject(e); });
      });
    });
  }

  function restoreAutoBackup() {
    return new Promise(function(resolve, reject) {
      var raw = null;
      try {
        if (hasLocalStorage()) raw = window.localStorage.getItem(BACKUP_KEY);
        if (raw === null || raw === undefined) raw = memoryMap.get(BACKUP_KEY) || null;
      } catch (e) { try { raw = memoryMap.get(BACKUP_KEY) || null; } catch (e2) {} }
      if (!raw) { warn('Нет резервной копии'); reject(new Error('No backup')); return; }
      var data;
      try { data = JSON.parse(raw); } catch (e) { warn('Битый JSON резервной копии'); reject(new Error('Broken backup JSON')); return; }
      var chains = [];
      STORE_NAMES.forEach(function(sn) {
        if (Array.isArray(data[sn])) chains.push(dispatchClear(sn).then(function() { if (data[sn].length) return dispatchBulkPut(sn, data[sn]); }));
      });
      Promise.all(chains).then(function() { resolve(); }).catch(function(e) { reject(e); });
    });
  }

  function buildDemoData() {
    var now = Date.now();
    var lessons = [];
    var notes = [];
    var practice = [];
    var portfolio = [];
    var flashcards = [];
    var questions = [];
    var hasCourseData = false;
    var modules = [];
    try {
      if (window.CourseData && Array.isArray(window.CourseData.modules) && window.CourseData.modules.length) {
        hasCourseData = true;
        modules = window.CourseData.modules.slice(0, 3);
      }
    } catch (e) {}
    if (hasCourseData) {
      modules.forEach(function(m, mi) {
        var lid = 'lesson-demo-' + (m.id || mi);
        lessons.push({ id: lid, moduleId: m.id || ('mod-' + mi), title: m.title || ('Модуль ' + (mi + 1)), status: mi === 0 ? 'done' : 'in_progress', progress: mi === 0 ? 100 : 40, isDemo: true, createdAt: new Date(now - mi * 86400000).toISOString() });
        notes.push({ id: 'note-demo-' + mi, lessonId: lid, title: 'Конспект: ' + (m.title || 'Модуль'), body: 'Демо-конспект по модулю. Самостоятельная практика: составь чек-лист.', isDemo: true, createdAt: new Date().toISOString() });
        questions.push({ id: 'q-demo-' + mi, moduleId: m.id || ('mod-' + mi), text: 'Что такое тест-кейс?', answer: 'Набор условий для проверки функциональности.', isDemo: true });
        flashcards.push({ id: 'fc-demo-' + mi, question: 'Определение QA', answer: 'Обеспечение качества процесса', nextReview: new Date(now + 86400000).toISOString(), isDemo: true });
        practice.push({ id: 'practice-demo-' + mi, title: 'Практика ' + (mi + 1), type: 'checklist', status: 'open', isDemo: true });
        portfolio.push({ id: 'portfolio-demo-' + mi, title: 'Артефакт ' + (mi + 1), description: 'Демо-артефакт портфолио', isDemo: true, createdAt: new Date().toISOString() });
      });
    } else {
      lessons = [
        { id: 'lesson-demo-1', moduleId: 'mod-1', title: 'Введение в тестирование', status: 'done', progress: 100, isDemo: true, createdAt: new Date(now).toISOString() },
        { id: 'lesson-demo-2', moduleId: 'mod-1', title: 'Виды тестирования', status: 'in_progress', progress: 40, isDemo: true, createdAt: new Date(now).toISOString() },
        { id: 'lesson-demo-3', moduleId: 'mod-2', title: 'Тест-дизайн', status: 'todo', progress: 0, isDemo: true, createdAt: new Date(now).toISOString() }
      ];
      notes = [
        { id: 'note-demo-1', lessonId: 'lesson-demo-1', title: 'Конспект: Введение', body: 'Демо-конспект. Самостоятельная практика: опиши цели тестирования.', isDemo: true, createdAt: new Date().toISOString() },
        { id: 'note-demo-2', lessonId: 'lesson-demo-2', title: 'Конспект: Виды', body: 'Функциональное, нефункциональное.', isDemo: true, createdAt: new Date().toISOString() }
      ];
      questions = [
        { id: 'q-demo-1', moduleId: 'mod-1', text: 'Что такое баг?', answer: 'Отклонение от ожидаемого результата.', isDemo: true },
        { id: 'q-demo-2', moduleId: 'mod-2', text: 'Техники тест-дизайна?', answer: 'Граничные значения, классы эквивалентности.', isDemo: true }
      ];
      flashcards = [
        { id: 'fc-demo-1', question: 'Что такое регресс?', answer: 'Проверка что новое не сломало старое', nextReview: new Date(now + 86400000).toISOString(), isDemo: true },
        { id: 'fc-demo-2', question: 'Smoke test?', answer: 'Быстрая проверка основной функциональности', nextReview: new Date(now + 86400000).toISOString(), isDemo: true }
      ];
      practice = [
        { id: 'practice-demo-1', title: 'Чек-лист формы логина', type: 'checklist', status: 'open', isDemo: true },
        { id: 'practice-demo-2', title: 'Баг-репорт: корзина', type: 'bug', status: 'open', isDemo: true }
      ];
      portfolio = [
        { id: 'portfolio-demo-1', title: 'Демо-портфолио: чек-лист', description: 'Пример артефакта', isDemo: true, createdAt: new Date().toISOString() }
      ];
    }
    return { lessons: lessons, notes: notes, questions: questions, flashcards: flashcards, practice: practice, portfolio: portfolio };
  }

  function loadDemoData() {
    var demo = buildDemoData();
    var tasks = [];
    if (demo.lessons.length) tasks.push(dispatchBulkPut('lessons', demo.lessons));
    if (demo.notes.length) tasks.push(dispatchBulkPut('notes', demo.notes));
    if (demo.questions.length) tasks.push(dispatchBulkPut('questions', demo.questions));
    if (demo.flashcards.length) tasks.push(dispatchBulkPut('flashcards', demo.flashcards));
    if (demo.practice.length) tasks.push(dispatchBulkPut('practice', demo.practice));
    if (demo.portfolio.length) tasks.push(dispatchBulkPut('portfolio', demo.portfolio));
    tasks.push(dispatchPut('tags', { id: 'tag-demo', name: 'demo', isDemo: true }));
    tasks.push(dispatchPut('categories', { id: 'cat-demo', name: 'Демо-категория', isDemo: true }));
    tasks.push(dispatchPut('sessions', { id: 'sess-demo-1', date: new Date().toISOString(), duration: 30, isDemo: true }));
    tasks.push(dispatchPut('journal', { id: 'journal-demo-1', date: new Date().toISOString(), text: 'Демо-запись журнала', isDemo: true }));
    tasks.push(dispatchPut('settings', { key: 'schemaVersion', value: DB_VERSION }));
    return Promise.all(tasks).then(function() {});
  }

  function clearDemo() {
    return doBackup().then(function() {
      var promises = STORE_NAMES.map(function(sn) {
        return dispatchGetAll(sn).then(function(arr) {
          var toDel = arr.filter(function(it) { return it && it.isDemo === true; });
          var dels = toDel.map(function(it) {
            var k = it.id !== undefined ? it.id : it.key;
            return dispatchDelete(sn, k).catch(function() {});
          });
          return Promise.all(dels);
        });
      });
      return Promise.all(promises);
    });
  }

  function resetProgress() {
    return doBackup().then(function() {
      return dispatchGetAll('lessons').then(function(lessons) {
        var puts = lessons.map(function(l) {
          var nl = {};
          for (var k in l) if (Object.prototype.hasOwnProperty.call(l, k)) nl[k] = l[k];
          nl.status = 'todo';
          nl.progress = 0;
          if (nl.score !== undefined) nl.score = 0;
          return dispatchPut('lessons', nl).catch(function() {});
        });
        return Promise.all(puts);
      }).then(function() {
        return dispatchGetAll('flashcards').then(function(cards) {
          var puts = cards.map(function(c) {
            var nc = {};
            for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) nc[k] = c[k];
            nc.nextReview = new Date().toISOString();
            if (nc.interval !== undefined) nc.interval = 0;
            if (nc.repetitions !== undefined) nc.repetitions = 0;
            return dispatchPut('flashcards', nc).catch(function() {});
          });
          return Promise.all(puts);
        });
      });
    });
  }

  function resetAll() {
    return doBackup().then(function() {
      var clears = STORE_NAMES.map(function(sn) { return dispatchClear(sn).catch(function() {}); });
      return Promise.all(clears);
    });
  }

  function init(options) {
    opts = options || {};
    setupStorageListener();
    setupBroadcast();
    return new Promise(function(resolve) {
      if (isInitialized) { resolve(mode); return; }
      if (!hasIndexedDB()) {
        if (hasLocalStorage()) { mode = 'localstorage'; warn('IndexedDB недоступен, используется localStorage'); }
        else { mode = 'memory'; warn('Работа в памяти: данные не сохраняются. Экспортируй перед закрытием.'); }
        isInitialized = true;
        resolve(mode);
        return;
      }
      openIndexedDB().then(function() {
        mode = 'indexeddb';
        isInitialized = true;
        dispatchPut('settings', { key: 'schemaVersion', value: DB_VERSION }).catch(function() {});
        resolve(mode);
      }).catch(function(e) {
        var name = e && e.name ? e.name : '';
        if (name === 'VersionError' || name === 'QuotaExceededError') warn('IndexedDB ' + name + ': fallback');
        else warn('IndexedDB недоступен (' + (e && e.message ? e.message : e) + '): fallback');
        if (hasLocalStorage()) {
          mode = 'localstorage';
          try { if (db) try { db.close(); } catch (e2) {} db = null; } catch (e2) {}
          isInitialized = true;
          resolve(mode);
        } else {
          mode = 'memory';
          warn('Работа в памяти: данные не сохраняются. Экспортируй перед закрытием.');
          try { if (db) try { db.close(); } catch (e2) {} db = null; } catch (e2) {}
          isInitialized = true;
          resolve(mode);
        }
      });
    });
  }

  function getMode() { return mode; }

  window.IDB = {
    init: init,
    getMode: getMode,
    migrate: migrate,
    get: function(storeName, key) { return dispatchGet(storeName, key).catch(function(e) { warn('get ' + storeName + ' failed: ' + (e && e.message ? e.message : e)); return Promise.reject(e); }); },
    getAll: function(storeName) { return dispatchGetAll(storeName).catch(function(e) { warn('getAll ' + storeName + ' failed'); return Promise.reject(e); }); },
    put: function(storeName, value) { return dispatchPut(storeName, value).catch(function(e) { if (e && e.name === 'QuotaExceededError') quotaWarn(100); warn('put failed: ' + (e && e.message ? e.message : e)); return Promise.reject(e); }); },
    bulkPut: function(storeName, values) { return dispatchBulkPut(storeName, values).catch(function(e) { if (e && e.name === 'QuotaExceededError') quotaWarn(100); warn('bulkPut failed'); return Promise.reject(e); }); },
    delete: function(storeName, key) { return dispatchDelete(storeName, key).catch(function(e) { warn('delete failed'); return Promise.reject(e); }); },
    clear: function(storeName) { return dispatchClear(storeName).catch(function(e) { warn('clear failed'); return Promise.reject(e); }); },
    getByIndex: function(storeName, indexName, value) { return dispatchGetByIndex(storeName, indexName, value).catch(function(e) { warn('getByIndex failed'); return Promise.reject(e); }); },
    autoSave: autoSave,
    estimate: estimate,
    clearOldSessions: clearOldSessions,
    exportAll: exportAll,
    importAll: importAll,
    exportStore: exportStore,
    loadDemoData: loadDemoData,
    clearDemo: clearDemo,
    resetProgress: resetProgress,
    resetAll: resetAll,
    restoreAutoBackup: restoreAutoBackup
  };

})(window);