/*
 * QA Study Portfolio — формы, черновики, теги и категории
 * Зависимости: window.Utils (необязательно), window.App (необязательно).
 * Публичный интерфейс: window.Forms = { FormManager, DraftAutoSave, TagInput, CategorySelect }
 *
 * Внутри форм используется только Utils.Storage (для черновиков) и Utils.Validate.
 * Часть 3 ожидает контракт (container, schema, options), а не (selector, options).
 */
(function (global) {
  'use strict';

  var GOLD = '#D4AF37';

  var MAX = {
    tag: 30,
    tags: 10
  };

  function utils() {
    if (typeof global.Utils !== 'undefined' && global.Utils) {
      return global.Utils;
    }
    return null;
  }

  function validate() {
    var u = utils();
    return u && u.Validate ? u.Validate : null;
  }

  function storage() {
    var u = utils();
    return u && u.Storage ? u.Storage : null;
  }

  function tagsManager() {
    if (global.App && global.App.TagsManager && typeof global.App.TagsManager === 'object') {
      return global.App.TagsManager;
    }
    return null;
  }

  function categoriesManager() {
    if (global.App && global.App.CategoriesManager && typeof global.App.CategoriesManager === 'object') {
      return global.App.CategoriesManager;
    }
    return null;
  }

  function toast(message, type) {
    if (global.App && typeof global.App.toast === 'function') {
      global.App.toast(message, type);
      return true;
    }
    return false;
  }

  function escapeHtml(value) {
    var u = utils();
    if (u && u.Escape && typeof u.Escape.html === 'function') {
      return u.Escape.html(value);
    }
    if (value === null || typeof value === 'undefined') {
      return '';
    }
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function debounce(fn, ms) {
    var u = utils();
    if (u && u.Data && typeof u.Data.debounce === 'function') {
      return u.Data.debounce(fn, ms);
    }
    var timer = null;
    function wrapped() {
      var ctx = this;
      var args = arguments;
      if (timer) {
        global.clearTimeout(timer);
      }
      timer = global.setTimeout(function () {
        timer = null;
        fn.apply(ctx, args);
      }, ms || 300);
    }
    wrapped.cancel = function () {
      if (timer) {
        global.clearTimeout(timer);
        timer = null;
      }
    };
    return wrapped;
  }

  function fieldError(field, message) {
    var box = field.parentNode && field.parentNode.querySelector('.form-error');
    if (box) {
      box.textContent = message || '';
      box.classList.toggle('is-hidden', !message);
    }
  }

  function setCounter(counter, used, max, warnAt) {
    if (!counter) {
      return;
    }
    counter.textContent = used + ' / ' + max;
    var pct = max > 0 ? used / max : 0;
    counter.classList.remove('is-warn', 'is-danger');
    if (pct >= 1) {
      counter.classList.add('is-danger');
    } else if (warnAt && pct >= warnAt) {
      counter.classList.add('is-warn');
    }
  }

  /* ======================================================================
   * FormManager
   * ====================================================================== */

  var FormManager = function (container, schema, options) {
    if (!container || !global.document || typeof container.appendChild !== 'function') {
      throw new Error('FormManager: контейнер невалиден');
    }
    var self = this;
    var opts = options && typeof options === 'object' ? options : {};
    var fields = {};
    var fieldEls = {};
    var destroyers = [];
    var submitBtn = null;
    var dirty = false;

    this.container = container;
    this.schema = Object.prototype.toString.call(schema) === '[object Array]' ? schema.slice() : [];

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    var form = global.document.createElement('form');
    form.className = 'form';
    form.setAttribute('novalidate', 'novalidate');
    container.appendChild(form);

    var i;
    for (i = 0; i < this.schema.length; i++) {
      this._renderField(form, this.schema[i], opts);
    }

    // Кнопка отправки
    submitBtn = global.document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = opts.submitText || 'Сохранить';
    form.appendChild(submitBtn);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var values = self.getValues();
      var errors = self.validate();
      if (errors.length > 0) {
        self._focusFirstError();
        return;
      }
      if (typeof opts.onSubmit === 'function') {
        opts.onSubmit(values);
      }
    });

    destroyers.push(function () {
      form.removeEventListener('submit');
    });

    // Автодрафт
    if (opts.autoSaveKey && typeof opts.autoSaveKey === 'string') {
      var autosave = DraftAutoSave.create(opts.autoSaveKey);
      this._autosave = autosave;
      var saved = autosave.load();
      if (saved && typeof saved === 'object') {
        this.setValues(saved);
      }
      this.on('change', function (vals) {
        autosave.save(vals);
      });
    }
  };

  FormManager.prototype._renderField = function (form, field, opts) {
    var self = this;
    var type = field.type || 'text';
    var label = field.label || field.name || '';
    var required = field.required === true;
    var maxLen = typeof field.maxLength === 'number' ? field.maxLength : 0;
    var name = field.name;

    var wrap = global.document.createElement('div');
    wrap.className = 'form-field';

    var labelEl = global.document.createElement('label');
    labelEl.className = 'form-label';
    labelEl.textContent = label;
    labelEl.setAttribute('for', 'field-' + name);
    if (required) {
      var star = global.document.createElement('span');
      star.className = 'form-required';
      star.textContent = ' *';
      labelEl.appendChild(star);
    }
    wrap.appendChild(labelEl);

    var control = null;
    var counter = null;
    var hint = typeof field.hint === 'string' ? field.hint : '';

    switch (type) {
      case 'textarea':
        control = global.document.createElement('textarea');
        control.id = 'field-' + name;
        control.className = 'form-control';
        control.rows = 4;
        if (maxLen > 0) {
          control.setAttribute('maxlength', String(maxLen));
        }
        if (typeof field.placeholder === 'string') {
          control.setAttribute('placeholder', field.placeholder);
        }
        wrap.appendChild(control);
        break;

      case 'number':
        control = global.document.createElement('input');
        control.type = 'number';
        control.id = 'field-' + name;
        control.className = 'form-control';
        if (typeof field.min === 'number') {
          control.setAttribute('min', String(field.min));
        }
        if (typeof field.max === 'number') {
          control.setAttribute('max', String(field.max));
        }
        wrap.appendChild(control);
        break;

      case 'select':
        control = global.document.createElement('select');
        control.id = 'field-' + name;
        control.className = 'form-control';
        var optsList = Object.prototype.toString.call(field.options) === '[object Array]' ? field.options : [];
        var placeholderOpt = global.document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = field.placeholder || '— выберите —';
        control.appendChild(placeholderOpt);
        for (var o = 0; o < optsList.length; o++) {
          var opt = optsList[o];
          var optVal = typeof opt === 'string' ? opt : opt.value;
          var optLabel = typeof opt === 'string' ? opt : opt.label;
          var option = global.document.createElement('option');
          option.value = String(optVal == null ? '' : optVal);
          option.textContent = String(optLabel == null ? (opt == null ? '' : opt) : optLabel);
          control.appendChild(option);
        }
        wrap.appendChild(control);
        break;

      case 'checkbox':
        control = global.document.createElement('input');
        control.type = 'checkbox';
        control.id = 'field-' + name;
        control.className = 'form-checkbox';
        wrap.appendChild(control);
        break;

      case 'date':
        control = global.document.createElement('input');
        control.type = 'date';
        control.id = 'field-' + name;
        control.className = 'form-control';
        wrap.appendChild(control);
        break;

      case 'tags':
        control = global.document.createElement('div');
        control.className = 'tag-input-wrap';
        control.id = 'field-' + name;
        var tagInput = TagInput.create(control, {
          maxTags: MAX.tags,
          maxTagLength: MAX.tag,
          value: field.value,
          onChange: function (tags) {
            self._onFieldChange(name, tags);
            self._triggerChange();
          }
        });
        this._tagInputs = this._tagInputs || {};
        this._tagInputs[name] = tagInput;
        wrap.appendChild(control);
        break;

      case 'category':
        control = global.document.createElement('div');
        control.className = 'category-select-wrap';
        control.id = 'field-' + name;
        var catSelect = CategorySelect.create(control, {
          value: field.value,
          onChange: function (value) {
            self._onFieldChange(name, value);
            self._triggerChange();
          }
        });
        this._categorySelects = this._categorySelects || {};
        this._categorySelects[name] = catSelect;
        wrap.appendChild(control);
        break;

      case 'text':
      default:
        control = global.document.createElement('input');
        control.type = 'text';
        control.id = 'field-' + name;
        control.className = 'form-control';
        if (maxLen > 0) {
          control.setAttribute('maxlength', String(maxLen));
        }
        if (typeof field.placeholder === 'string') {
          control.setAttribute('placeholder', field.placeholder);
        }
        wrap.appendChild(control);
    }

    // Счетчик символов
    if (maxLen > 0 && (type === 'text' || type === 'textarea')) {
      counter = global.document.createElement('div');
      counter.className = 'char-counter';
      wrap.appendChild(counter);
      var warnAt = typeof opts.warnAt === 'number' ? opts.warnAt : 0.9;
      var upd = function () {
        var val = control.value || '';
        setCounter(counter, val.length, maxLen, warnAt);
      };
      control.addEventListener('input', upd);
      destroyers.push(function () {
        control.removeEventListener('input', upd);
      });
      upd();
    }

    // Ошибка
    var err = global.document.createElement('div');
    err.className = 'form-error is-hidden';
    wrap.appendChild(err);

    // Подсказка
    if (hint) {
      var hintEl = global.document.createElement('div');
      hintEl.className = 'form-hint';
      hintEl.textContent = hint;
      wrap.appendChild(hintEl);
    }

    // Валидация по blur
    if (opts.validateOnBlur !== false) {
      (function (ctype, cname) {
        var handleBlur = function () {
          self._validateField(cname, ctype);
        };
        control.addEventListener('blur', handleBlur);
        destroyers.push(function () {
          control.removeEventListener('blur', handleBlur);
        });
      }(type, name));
    }

    fields[name] = { type: type, required: required, maxLength: maxLen, schema: field };
    fieldEls[name] = control;
    form.appendChild(wrap);
  };

  FormManager.prototype._errorFor = function (name) {
    var control = fieldEls[name];
    if (!control) {
      return null;
    }
    var wrap = control.closest ? control.closest('.form-field') : control.parentNode;
    return wrap ? wrap.querySelector('.form-error') : null;
  };

  FormManager.prototype._validateField = function (name, type) {
    var cfg = fields[name];
    if (!cfg) {
      return [];
    }
    var errors = [];
    var v = validate();
    var value = this.getFieldValue(name, cfg.type);
    var schema = cfg.schema;

    if (cfg.required && !v.required(value)) {
      errors.push('Поле обязательно');
    } else if (value !== '' && value !== null && typeof value !== 'undefined') {
      if (type === 'email' && v && !v.email(value)) {
        errors.push('Некорректный адрес почты');
      }
      if (cfg.maxLength > 0 && typeof value === 'string' && value.length > cfg.maxLength) {
        errors.push('Превышена длина');
      }
      if (type === 'number') {
        var num = Number(value);
        if (value !== '' && isNaN(num)) {
          errors.push('Введите число');
        } else if (typeof schema.min === 'number' && num < schema.min) {
          errors.push('Меньше минимума');
        } else if (typeof schema.max === 'number' && num > schema.max) {
          errors.push('Больше максимума');
        }
      }
    }
    var box = this._errorFor(name);
    if (box) {
      box.textContent = errors.length ? errors.join('; ') : '';
      box.classList.toggle('is-hidden', errors.length === 0);
    }
    return errors;
  };

  FormManager.prototype._validateAll = function () {
    var errors = [];
    for (var name in fields) {
      if (Object.prototype.hasOwnProperty.call(fields, name)) {
        var fieldErrors = this._validateField(name, fields[name].type);
        for (var i = 0; i < fieldErrors.length; i++) {
          errors.push({ name: name, message: fieldErrors[i] });
        }
      }
    }
    return errors;
  };

  FormManager.prototype.getFieldValue = function (name, type) {
    var el = fieldEls[name];
    if (!el) {
      return undefined;
    }
    var t = type || fields[name].type;
    if (t === 'checkbox') {
      return el.checked;
    }
    if (t === 'tags') {
      if (this._tagInputs && this._tagInputs[name]) {
        return this._tagInputs[name].getValue();
      }
      return [];
    }
    if (t === 'category') {
      if (this._categorySelects && this._categorySelects[name]) {
        return this._categorySelects[name].getValue();
      }
      return null;
    }
    return el.value || '';
  };

  FormManager.prototype.setFieldValue = function (name, value) {
    var el = fieldEls[name];
    if (!el) {
      return false;
    }
    var t = fields[name].type;
    if (t === 'checkbox') {
      el.checked = value === true;
    } else if (t === 'tags') {
      if (this._tagInputs && this._tagInputs[name]) {
        this._tagInputs[name].setValue(value);
      }
    } else if (t === 'category') {
      if (this._categorySelects && this._categorySelects[name]) {
        this._categorySelects[name].setValue(value);
      }
    } else {
      el.value = value == null ? '' : String(value);
    }
    return true;
  };

  FormManager.prototype._onFieldChange = function () {
    dirty = true;
  };

  FormManager.prototype._triggerChange = function () {
    if (typeof this._onChange === 'function') {
      this._onChange(this.getValues());
    }
  };

  FormManager.prototype.getValues = function () {
    var result = {};
    for (var name in fields) {
      if (Object.prototype.hasOwnProperty.call(fields, name)) {
        result[name] = this.getFieldValue(name, fields[name].type);
      }
    }
    return result;
  };

  FormManager.prototype.setValues = function (values) {
    if (!values || typeof values !== 'object') {
      return false;
    }
    for (var name in values) {
      if (Object.prototype.hasOwnProperty.call(values, name) && fieldEls[name]) {
        this.setFieldValue(name, values[name]);
      }
    }
    return true;
  };

  FormManager.prototype.validate = function () {
    return this._validateAll();
  };

  FormManager.prototype.on = function (event, handler) {
    if (event === 'change' && typeof handler === 'function') {
      this._onChange = handler;
    }
  };

  FormManager.prototype._focusFirstError = function () {
    for (var name in fields) {
      if (Object.prototype.hasOwnProperty.call(fields, name)) {
        var box = this._errorFor(name);
        if (box && !box.classList.contains('is-hidden')) {
          var el = fieldEls[name];
          if (el && typeof el.focus === 'function') {
            el.focus();
          }
          break;
        }
      }
    }
  };

  FormManager.prototype.destroy = function () {
    for (var i = 0; i < destroyers.length; i++) {
      try {
        destroyers[i]();
      } catch (err) {
        /* игнорируем при уничтожении */
      }
    }
    destroyers = [];
    if (this._autosave) {
      DraftAutoSave.destroy(this._autosave);
    }
    if (this.container && typeof this.container.removeChild === 'function') {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
    }
    fields = {};
    fieldEls = {};
  };

  /* ======================================================================
   * DraftAutoSave
   * ====================================================================== */

  var DraftAutoSave = {
    create: function (formId) {
      var store = storage();
      var key = 'qa-draft-' + formId;
      var saveFn = debounce(function (values) {
        if (store) {
          store.set(key, values);
        }
      }, 300);
      return { key: key, save: saveFn, load: null, clear: null };
    },

    save: function (draft, values) {
      if (draft && typeof draft.save === 'function') {
        draft.save(values);
      }
    },

    load: function (draft) {
      if (!draft) {
        return null;
      }
      var store = storage();
      var data = store ? store.get(draft.key, null) : null;
      return data && typeof data === 'object' ? data : null;
    },

    clear: function (draft) {
      if (!draft) {
        return false;
      }
      var store = storage();
      if (store) {
        store.remove(draft.key);
      }
      return true;
    },

    destroy: function (draft) {
      if (draft && draft.save && typeof draft.save.cancel === 'function') {
        draft.save.cancel();
      }
    }
  };

  /* ======================================================================
   * TagInput
   * ====================================================================== */

  var TagInput = {
    create: function (container, options) {
      var self = this;
      var opts = options && typeof options === 'object' ? options : {};
      var maxTags = typeof opts.maxTags === 'number' ? opts.maxTags : MAX.tags;
      var maxTagLength = typeof opts.maxTagLength === 'number' ? opts.maxTagLength : MAX.tag;
      var tags = [];
      var root;
      var input;

      if (typeof container.appendChild === 'function') {
        root = global.document.createElement('div');
        root.className = 'tag-input';
        container.appendChild(root);
      } else {
        root = container;
      }

      var manager = tagsManager();

      function normalize(name) {
        if (manager && typeof manager.normalize === 'function') {
          try {
            return String(manager.normalize(name));
          } catch (err) {
            /* локально ниже */
          }
        }
        return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/[^a-zа-яё0-9 _-]/g, '');
      }

      function render() {
        while (root.firstChild) {
          root.removeChild(root.firstChild);
        }
        for (var i = 0; i < tags.length; i++) {
          (function (idx) {
            var chip = global.document.createElement('span');
            chip.className = 'tag-chip';
            chip.textContent = tags[idx];
            var index = idx;
            var btn = global.document.createElement('button');
            btn.type = 'button';
            btn.className = 'tag-chip-remove';
            btn.setAttribute('aria-label', 'Удалить тег ' + tags[idx]);
            btn.textContent = '×';
            btn.addEventListener('click', function () {
              tags.splice(index, 1);
              render();
              if (typeof opts.onChange === 'function') {
                opts.onChange(tags.slice());
              }
            });
            chip.appendChild(btn);
            root.appendChild(chip);
          }(i));
        }
        input = global.document.createElement('input');
        input.type = 'text';
        input.className = 'tag-input-field';
        input.setAttribute('maxlength', String(maxTagLength));
        input.setAttribute('placeholder', 'Введите тег и нажмите Enter');
        root.appendChild(input);
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
            tags.pop();
            render();
            if (typeof opts.onChange === 'function') {
              opts.onChange(tags.slice());
            }
          }
        });
        input.addEventListener('blur', function () {
          add();
        });
      }

      function add() {
        var raw = input ? input.value : '';
        var normalized = normalize(raw);
        if (!normalized) {
          if (input) { input.value = ''; }
          return;
        }
        if (normalized.length > maxTagLength) {
          toast('Тег не длиннее ' + maxTagLength + ' символов', 'warn');
          return;
        }
        if (tags.length >= maxTags) {
          toast('Максимум ' + maxTags + ' тегов', 'warn');
          if (input) { input.value = ''; }
          return;
        }
        if (tags.indexOf(normalized) !== -1) {
          if (input) { input.value = ''; }
          return;
        }
        tags.push(normalized);
        if (input) { input.value = ''; }
        render();
        if (typeof opts.onChange === 'function') {
          opts.onChange(tags.slice());
        }
      }

      // Предложения при вводе
      var suggestBox = null;
      var suggestDebounced = debounce(function () {
        var q = input ? input.value.trim() : '';
        if (!q) {
          hideSuggest();
          return;
        }
        var list = [];
        if (manager && typeof manager.getTagsWithCount === 'function') {
          try {
            var data = manager.getTagsWithCount();
            if (Object.prototype.toString.call(data) === '[object Array]') {
              list = data;
            }
          } catch (err) {
            /* нет предложений */
          }
        }
        var matches = [];
        for (var i = 0; i < list.length && matches.length < 6; i++) {
          var item = list[i];
          var name = typeof item === 'string' ? item : (item && item.name) || '';
          if (name.toLowerCase().indexOf(q.toLowerCase()) !== -1 && tags.indexOf(name) === -1) {
            matches.push(name);
          }
        }
        if (matches.length === 0) {
          hideSuggest();
          return;
        }
        if (!suggestBox || !suggestBox.parentNode) {
          suggestBox = global.document.createElement('div');
          suggestBox.className = 'tag-suggest';
          root.appendChild(suggestBox);
        }
        suggestBox.textContent = '';
        for (var m = 0; m < matches.length; m++) {
          (function (mm) {
            var opt = global.document.createElement('div');
            opt.className = 'tag-suggest-item';
            opt.textContent = matches[mm];
            opt.addEventListener('mousedown', function (e) {
              e.preventDefault();
              if (input) { input.value = matches[mm]; }
              add();
              hideSuggest();
            });
            suggestBox.appendChild(opt);
          }(m));
        }
      }, 200);

      function hideSuggest() {
        if (suggestBox && suggestBox.parentNode) {
          suggestBox.parentNode.removeChild(suggestBox);
        }
        suggestBox = null;
      }

      if (input) {
        input.addEventListener('input', suggestDebounced);
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') {
            hideSuggest();
          }
        });
      }

      if (opts.value && Object.prototype.toString.call(opts.value) === '[object Array]') {
        for (var i = 0; i < opts.value.length; i++) {
          var t = normalize(opts.value[i]);
          if (t) {
            tags.push(t);
          }
        }
      }
      tags = tags.filter(function (t, idx) { return tags.indexOf(t) === idx; });

      render();

      return {
        getValue: function () { return tags.slice(); },
        setValue: function (arr) {
          if (Object.prototype.toString.call(arr) === '[object Array]') {
            tags = arr.map(normalize).filter(Boolean).filter(function (t, idx, a2) {
              return a2.indexOf(t) === idx;
            });
            render();
          }
        },
        clear: function () {
          tags = [];
          render();
        },
        destroy: function () {
          hideSuggest();
          if (suggestDebounced && typeof suggestDebounced.cancel === 'function') {
            suggestDebounced.cancel();
          }
          if (root && typeof root.removeChild === 'function') {
            while (root.firstChild) {
              root.removeChild(root.firstChild);
            }
          }
        }
      };
    }
  };

  /* ======================================================================
   * CategorySelect
   * ====================================================================== */

  var CategorySelect = {
    create: function (container, options) {
      var opts = options && typeof options === 'object' ? options : {};
      var value = opts.value || null;
      var open = false;
      var root;
      var button;
      var menu;

      if (typeof container.appendChild === 'function') {
        root = global.document.createElement('div');
        root.className = 'category-select';
        container.appendChild(root);
      } else {
        root = container;
      }

      var manager = categoriesManager();

      function getTree() {
        if (manager && typeof manager.getTree === 'function') {
          try {
            var tree = manager.getTree();
            if (Object.prototype.toString.call(tree) === '[object Array]') {
              return tree;
            }
          } catch (err) {
            /* пустое дерево ниже */
          }
        }
        return [];
      }

      function selectedPath() {
        var tree = getTree();
        var path = [];
        if (manager && typeof manager.getPath === 'function') {
          try {
            var p = manager.getPath(tree, value);
            if (Object.prototype.toString.call(p) === '[object Array]') {
              path = p;
            }
          } catch (err) {
            path = [];
          }
        }
        if (path.length === 0 && value) {
          path = [{ id: value, name: value, parentId: null }];
        }
        return path;
      }

      function labelFor(id) {
        var tree = getTree();
        if (manager && typeof manager.findInTree === 'function') {
          try {
            var node = manager.findInTree(tree, id);
            if (node && node.name) {
              return node.name;
            }
          } catch (err) {
            /* ниже */
          }
        }
        return id || null;
      }

      function render() {
        while (root.firstChild) {
          root.removeChild(root.firstChild);
        }
        button = global.document.createElement('button');
        button.type = 'button';
        button.className = 'category-select-btn';
        var path = selectedPath();
        var names = [];
        for (var i = 0; i < path.length; i++) {
          if (path[i].name) {
            names.push(path[i].name);
          }
        }
        button.textContent = value && names.length ? names.join(' / ') : (opts.placeholder || '— выберите категорию —');
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', String(open));
        button.addEventListener('click', function () {
          open = !open;
          if (open) {
            showMenu();
          } else {
            hideMenu();
          }
          renderButton();
        });
        root.appendChild(button);
      }

      function renderButton() {
        if (button) {
          button.setAttribute('aria-expanded', String(open));
        }
      }

      function showMenu() {
        hideMenu();
        menu = global.document.createElement('div');
        menu.className = 'category-select-menu';
        menu.setAttribute('role', 'listbox');
        var tree = getTree();
        if (tree.length === 0) {
          var empty = global.document.createElement('div');
          empty.className = 'category-select-empty';
          empty.textContent = 'Нет категорий';
          menu.appendChild(empty);
        } else {
          renderNodes(tree, menu, 0);
        }
        root.appendChild(menu);
        var closeDoc = function (e) {
          if (root.contains(e.target)) {
            return;
          }
          open = false;
          hideMenu();
          renderButton();
          global.document.removeEventListener('mousedown', closeDoc);
        };
        global.setTimeout(function () {
          global.document.addEventListener('mousedown', closeDoc);
        }, 0);
      }

      function renderNodes(nodes, parent, depth) {
        for (var i = 0; i < nodes.length; i++) {
          (function (node) {
            var item = global.document.createElement('div');
            item.className = 'category-select-item';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(value === node.id));
            if (depth > 0) {
              item.style.paddingLeft = (12 + depth * 16) + 'px';
            }
            var marker = global.document.createElement('span');
            marker.className = 'category-select-marker';
            marker.textContent = node.children && node.children.length ? '▸ ' : '';
            item.appendChild(marker);
            item.appendChild(global.document.createTextNode(node.name || String(node.id)));
            item.addEventListener('mousedown', function (e) {
              e.preventDefault();
              value = node.id;
              open = false;
              hideMenu();
              render();
              if (typeof opts.onChange === 'function') {
                opts.onChange(node.id);
              }
            });
            parent.appendChild(item);
            if (node.children && Object.prototype.toString.call(node.children) === '[object Array]' && node.children.length) {
              renderNodes(node.children, parent, depth + 1);
            }
          }(nodes[i]));
        }
      }

      function hideMenu() {
        if (menu && menu.parentNode) {
          menu.parentNode.removeChild(menu);
        }
        menu = null;
      }

      render();

      return {
        getValue: function () { return value; },
        setValue: function (id) {
          value = id || null;
          render();
        },
        getSelectedLabel: function () { return labelFor(value); },
        destroy: function () {
          hideMenu();
          if (root && typeof root.removeChild === 'function') {
            while (root.firstChild) {
              root.removeChild(root.firstChild);
            }
          }
        }
      };
    }
  };

  global.Forms = {
    FormManager: FormManager,
    DraftAutoSave: DraftAutoSave,
    TagInput: TagInput,
    CategorySelect: CategorySelect
  };
}(typeof window !== 'undefined' ? window : this));