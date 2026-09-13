(function (global, document) {
  'use strict';

  var BLOCKED_ELEMENTS = 'script,iframe,object,embed,base,meta,link';
  var URL_ATTRIBUTES = { href: true, src: true, action: true, formaction: true, poster: true, 'xlink:href': true };
  var UNSAFE_URL = /^\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i;

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function sanitizeHTML(value) {
    var template = document.createElement('template');
    template.innerHTML = String(value == null ? '' : value);
    template.content.querySelectorAll(BLOCKED_ELEMENTS).forEach(function (node) { node.remove(); });
    template.content.querySelectorAll('*').forEach(function (node) {
      Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
        var name = attribute.name.toLowerCase();
        var value = attribute.value || '';
        if (/^on/i.test(name) || name === 'srcdoc' || (URL_ATTRIBUTES[name] && UNSAFE_URL.test(value)) ||
            (name === 'style' && /(?:expression\s*\(|url\s*\(\s*["']?\s*javascript:)/i.test(value))) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    return template.innerHTML;
  }

  function setHTML(element, value) {
    if (!element) return;
    element.innerHTML = sanitizeHTML(value);
  }

  function cleanImportedData(input) {
    var visited = 0;
    function copy(value, depth) {
      visited += 1;
      if (visited > 250000 || depth > 100) throw new RangeError('Импортируемый файл слишком большой или имеет чрезмерную вложенность');
      if (value === null || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(function (item) { return copy(item, depth + 1); });
      var output = Object.create(null);
      Object.keys(value).forEach(function (key) {
        if (key !== '__proto__' && key !== 'prototype' && key !== 'constructor') output[key] = copy(value[key], depth + 1);
      });
      return output;
    }
    return copy(input, 0);
  }

  global.AppSecurity = Object.freeze({
    escapeHTML: escapeHTML,
    sanitizeHTML: sanitizeHTML,
    setHTML: setHTML,
    cleanImportedData: cleanImportedData
  });
})(window, document);
