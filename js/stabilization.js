/**
 * Stage 1 runtime stabilization.
 * Adds safe storage helpers and captures unexpected runtime failures without
 * replacing the application's business logic.
 */
(function () {
  'use strict';

  const STORAGE_ERROR_EVENT = 'app:storage-error';

  function reportStorageError(operation, key, error) {
    const detail = {
      operation,
      key: String(key || ''),
      name: error && error.name ? error.name : 'StorageError',
      message: error && error.message ? error.message : String(error)
    };
    document.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail }));
    console.warn('[storage]', operation, detail.key, detail.name);
    return detail;
  }

  window.safeStorage = Object.freeze({
    get(key, fallbackValue) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return fallbackValue;
        try {
          return JSON.parse(raw);
        } catch (error) {
          reportStorageError('parse', key, error);
          return fallbackValue;
        }
      } catch (error) {
        reportStorageError('get', key, error);
        return fallbackValue;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        reportStorageError('set', key, error);
        return false;
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (error) {
        reportStorageError('remove', key, error);
        return false;
      }
    }
  });

  // Mark JS as available for progressive-enhancement CSS and test probes.
  document.documentElement.classList.add('js-ready');
}());
