(function (global) {
  'use strict';

  function createSafeStorage(nativeStorage) {
    var memory = Object.create(null);

    function getRaw(key, fallback) {
      key = String(key);
      try {
        var value = nativeStorage.getItem(key);
        if (value !== null) return value;
      } catch (error) {
        // The in-memory fallback below keeps the current session usable.
      }
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : (fallback === undefined ? null : fallback);
    }

    function setRaw(key, value) {
      key = String(key);
      value = String(value);
      try {
        nativeStorage.setItem(key, value);
        delete memory[key];
        return true;
      } catch (error) {
        memory[key] = value;
        return false;
      }
    }

    function remove(key) {
      key = String(key);
      delete memory[key];
      try { nativeStorage.removeItem(key); return true; } catch (error) { return false; }
    }

    function clear() {
      memory = Object.create(null);
      try { nativeStorage.clear(); return true; } catch (error) { return false; }
    }

    function get(key, fallback) {
      var raw = getRaw(key, null);
      if (raw === null) return fallback;
      try { return JSON.parse(raw); } catch (error) { return fallback; }
    }

    function set(key, value) {
      try { return setRaw(key, JSON.stringify(value)); } catch (error) { return false; }
    }

    return Object.freeze({ getRaw: getRaw, setRaw: setRaw, get: get, set: set, remove: remove, clear: clear });
  }

  if (!global.safeStorage) global.safeStorage = createSafeStorage(global.localStorage);
  if (!global.safeSessionStorage) global.safeSessionStorage = createSafeStorage(global.sessionStorage);
})(window);
