/*
 * QA Study Portfolio — графики на Canvas API
 * Зависимости: window.Utils (необязательно, палитра берется из него при наличии).
 * Публичный интерфейс: window.Charts
 */
(function (global) {
  'use strict';

  var GOLD = '#D4AF37';
  var NAVY = '#0A1929';
  var CREAM = '#F5F0E8';
  var MUTED = '#6B7A8F';
  var GRID = 'rgba(10,25,41,0.08)';
  var TRACK = 'rgba(10,25,41,0.10)';

  var FALLBACK_PALETTE = [
    '#D4AF37', '#B8860B', '#8B7355', '#C9A961', '#7D6B4F',
    '#A67C52', '#6B5B95', '#4A6741', '#8C5A3C', '#5D7B8A'
  ];

  function palette() {
    if (typeof global.Utils !== 'undefined' && global.Utils && global.Utils.PALETTE && global.Utils.PALETTE.tags) {
      return global.Utils.PALETTE.tags;
    }
    return FALLBACK_PALETTE;
  }

  function escapeText(value) {
    if (typeof global.Utils !== 'undefined' && global.Utils && global.Utils.Escape && typeof global.Utils.Escape.html === 'function') {
      return global.Utils.Escape.html(value);
    }
    return String(value == null ? '' : value);
  }

  function toNumber(value) {
    var n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  function sumValues(items) {
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += Math.max(0, toNumber(items[i].value));
    }
    return total;
  }

  function getContext(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      return null;
    }
    try {
      return canvas.getContext('2d');
    } catch (err) {
      return null;
    }
  }

  function setupCanvas(canvas, ctx) {
    var dpr = global.devicePixelRatio || 1;
    var rectW = canvas.clientWidth || canvas.width || 300;
    var rectH = canvas.clientHeight || canvas.height || 180;
    // Не трогаем размеры если уже масштабированы под текущий dpr
    var needScale = canvas.width !== Math.round(rectW * dpr) || canvas.height !== Math.round(rectH * dpr);
    if (needScale) {
      canvas.width = Math.round(rectW * dpr);
      canvas.height = Math.round(rectH * dpr);
      // Стили оставляем как были, чтобы верстка не прыгала
      if (!canvas.style.width) {
        canvas.style.width = rectW + 'px';
      }
      if (!canvas.style.height) {
        canvas.style.height = rectH + 'px';
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rectW, h: rectH, dpr: dpr };
  }

  function clearCanvas(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, w, h);
  }

  function drawEmpty(ctx, w, h) {
    clearCanvas(ctx, w, h);
    ctx.fillStyle = MUTED;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Нет данных', w / 2, h / 2);
  }

  function colorAt(index, explicit) {
    if (typeof explicit === 'string' && explicit) {
      return explicit;
    }
    var p = palette();
    return p[Math.abs(index) % p.length] || GOLD;
  }

  /* ========================================================================
   * Низкоуровневые примитивы — используются верхнеуровневыми рендерами
   * ======================================================================== */

  /**
   * Заливает прямоугольник. Скругление не применяется, чтобы не зависеть
   * от поддержки roundRect в разных браузерах.
   */
  function drawBar(ctx, x, y, w, h, color) {
    if (!ctx || typeof ctx.fillRect !== 'function') {
      return false;
    }
    ctx.fillStyle = color || GOLD;
    ctx.fillRect(x, y, w, h);
    return true;
  }

  /**
   * Рисует кольцевой прогресс: трек + дуга процента.
   */
  function drawCircle(ctx, cx, cy, r, percent, color) {
    if (!ctx || typeof ctx.arc !== 'function') {
      return false;
    }
    var p = Math.max(0, Math.min(100, toNumber(percent)));
    var start = -Math.PI / 2;
    var end = start + (Math.PI * 2 * p) / 100;
    ctx.lineWidth = Math.max(6, Math.round(r * 0.18));
    ctx.lineCap = 'round';
    ctx.strokeStyle = TRACK;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    if (p <= 0) {
      return true;
    }
    ctx.strokeStyle = color || GOLD;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
    return true;
  }

  /**
   * Ломаная по массиву точек [{x,y}]. Не создает алиасов.
   */
  function drawLine(ctx, points, color) {
    if (!ctx || typeof ctx.beginPath !== 'function') {
      return false;
    }
    if (Object.prototype.toString.call(points) !== '[object Array]' || points.length < 2) {
      return false;
    }
    ctx.strokeStyle = color || NAVY;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(toNumber(points[0].x), toNumber(points[0].y));
    for (var i = 1; i < points.length; i++) {
      ctx.lineTo(toNumber(points[i].x), toNumber(points[i].y));
    }
    ctx.stroke();
    return true;
  }

  /* ========================================================================
   * Верхний уровень
   * ======================================================================== */

  /**
   * Круговая диаграмма. items: [{label, value, color}]
   * Возвращает true при отрисовке, false если canvas недоступен.
   */
  function renderPie(canvas, items) {
    var ctx = getContext(canvas);
    if (!ctx) {
      return false;
    }
    var size = setupCanvas(canvas, ctx);
    var w = size.w;
    var h = size.h;

    if (Object.prototype.toString.call(items) !== '[object Array]' || items.length === 0) {
      drawEmpty(ctx, w, h);
      return true;
    }

    var filtered = [];
    for (var i = 0; i < items.length; i++) {
      var v = Math.max(0, toNumber(items[i].value));
      if (v > 0) {
        filtered.push({ label: escapeText(items[i].label), value: v, color: items[i].color });
      }
    }
    if (filtered.length === 0) {
      drawEmpty(ctx, w, h);
      return true;
    }

    var total = sumValues(filtered);
    clearCanvas(ctx, w, h);

    var cx = w / 2;
    var cy = h / 2;
    var r = Math.min(w, h) * 0.36;
    // Легенда снизу, поэтому центр чуть выше середины
    cy -= 10;

    var angle = -Math.PI / 2;
    for (var j = 0; j < filtered.length; j++) {
      var slice = (filtered[j].value / total) * Math.PI * 2;
      ctx.fillStyle = colorAt(j, filtered[j].color);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fill();
      // Тонкая светлая граница между секторами
      ctx.strokeStyle = CREAM;
      ctx.lineWidth = 2;
      ctx.stroke();
      angle += slice;
    }

    // Внутренний вырез — кольцо
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.56, 0, Math.PI * 2);
    ctx.fill();

    // Подпись в центре — сумма
    ctx.fillStyle = NAVY;
    ctx.font = '700 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(total), cx, cy - 4);
    ctx.fillStyle = MUTED;
    ctx.font = '11px sans-serif';
    ctx.fillText('всего', cx, cy + 12);

    // Легенда
    var legendY = h - 10;
    var legendX = 10;
    var maxW = w - 20;
    var x = legendX;
    var y = legendY;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (var k = 0; k < filtered.length; k++) {
      var label = filtered[k].label || '';
      var sw = 10;
      var gap = 6;
      var textW = ctx.measureText ? ctx.measureText(label).width : label.length * 6;
      var itemW = sw + gap + textW + 14;
      if (x + itemW > maxW + legendX && x !== legendX) {
        x = legendX;
        y -= 16;
      }
      if (y < cy + r + 16) {
        // Легенда не должна наезжать на диаграмму — обрезаем
        break;
      }
      ctx.fillStyle = colorAt(k, filtered[k].color);
      ctx.fillRect(x, y - 9, sw, sw);
      ctx.fillStyle = NAVY;
      ctx.fillText(label, x + sw + gap, y);
      x += itemW;
    }

    return true;
  }

  /**
   * Столбчатая диаграмма. items: [{label, value}]
   */
  function renderBars(canvas, items) {
    var ctx = getContext(canvas);
    if (!ctx) {
      return false;
    }
    var size = setupCanvas(canvas, ctx);
    var w = size.w;
    var h = size.h;

    if (Object.prototype.toString.call(items) !== '[object Array]' || items.length === 0) {
      drawEmpty(ctx, w, h);
      return true;
    }

    var values = [];
    var labels = [];
    var maxVal = 0;
    for (var i = 0; i < items.length; i++) {
      var vv = Math.max(0, toNumber(items[i].value));
      values.push(vv);
      labels.push(escapeText(items[i].label));
      if (vv > maxVal) {
        maxVal = vv;
      }
    }
    if (maxVal === 0) {
      drawEmpty(ctx, w, h);
      return true;
    }

    clearCanvas(ctx, w, h);

    var padL = 36;
    var padR = 12;
    var padT = 14;
    var padB = 28;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;

    // Сетка
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    var gridLines = 4;
    for (var g = 0; g <= gridLines; g++) {
      var gy = padT + (plotH / gridLines) * g;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(w - padR, gy);
      ctx.stroke();
    }

    var n = values.length;
    var gap = Math.max(6, Math.min(14, plotW / (n * 4)));
    var barW = (plotW - gap * (n + 1)) / n;
    if (barW < 6) {
      barW = 6;
      gap = (plotW - barW * n) / (n + 1);
    }

    // Шкала слева
    ctx.fillStyle = MUTED;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var s = 0; s <= gridLines; s++) {
      var val = Math.round(maxVal - (maxVal / gridLines) * s);
      var sy = padT + (plotH / gridLines) * s;
      ctx.fillText(String(val), padL - 8, sy);
    }

    // Столбцы
    for (var b = 0; b < n; b++) {
      var bh = (values[b] / maxVal) * plotH;
      var bx = padL + gap + b * (barW + gap);
      var by = padT + plotH - bh;
      drawBar(ctx, bx, by, barW, bh, colorAt(b));
      // Подпись
      ctx.fillStyle = NAVY;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      var lx = bx + barW / 2;
      var ly = padT + plotH + 6;
      // Обрезка длинных подписей
      var lbl = labels[b];
      if (ctx.measureText && ctx.measureText(lbl).width > barW + gap) {
        while (lbl.length > 2 && ctx.measureText(lbl + '…').width > barW + gap) {
          lbl = lbl.slice(0, -1);
        }
        lbl += '…';
      }
      ctx.fillText(lbl, lx, ly);
    }

    // Рамка области
    ctx.strokeStyle = 'rgba(10,25,41,0.12)';
    ctx.strokeRect(padL, padT, plotW, plotH);

    return true;
  }

  /**
   * Кольцевой прогресс 0..100.
   */
  function renderProgress(canvas, percent) {
    var ctx = getContext(canvas);
    if (!ctx) {
      return false;
    }
    var size = setupCanvas(canvas, ctx);
    var w = size.w;
    var h = size.h;
    clearCanvas(ctx, w, h);
    var p = Math.max(0, Math.min(100, toNumber(percent)));
    var cx = w / 2;
    var cy = h / 2;
    var r = Math.min(w, h) * 0.34;
    drawCircle(ctx, cx, cy, r, p, GOLD);
    ctx.fillStyle = NAVY;
    ctx.font = '700 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p + '%', cx, cy);
    return true;
  }

  global.Charts = {
    renderPie: renderPie,
    renderBars: renderBars,
    renderProgress: renderProgress,
    drawBar: drawBar,
    drawCircle: drawCircle,
    drawLine: drawLine
  };
}(typeof window !== 'undefined' ? window : this));
