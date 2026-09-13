/* charts.js — SVG-based charting library for QA Study Portfolio (no external deps) */

(function () {
  'use strict';

  // ========================================================================
  // CONSTANTS & INTERNAL STATE
  // ========================================================================

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var DEFAULTS = {
    width: 600,
    height: 400,
    padding: 40,
    paddingLarge: 60,
    paddingSmall: 20,
    barHeight: 36,
    nodeRadius: 22,
    nodeRadiusSmall: 16,
    legendItemHeight: 24,
    fontSize: 12,
    fontSizeLarge: 14,
    fontSizeSmall: 10,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    strokeWidth: 2,
    strokeColor: 'var(--border-color, #e2e8f0)',
    gridColor: 'var(--chart-grid, #f1f5f9)',
    textColor: 'var(--text-secondary, #64748b)',
    textPrimary: 'var(--text-primary, #1e293b)',
    emptyColor: 'var(--text-tertiary, #94a3b8)',
    axisColor: 'var(--chart-axis, #cbd5e1)'
  };

  // Color palette derived from CSS variables at render time
  var COLOR_PALETTE = [
    '#0ea5b8', '#6366f1', '#f59e0b', '#ec4899',
    '#22c55e', '#8b5cf6', '#ef4444', '#14b8a6',
    '#f97316', '#3b82f6'
  ];

  // Internal state for active charts (for resize)
  var _activeCharts = {};

  // ========================================================================
  // SVG ELEMENT CREATION HELPERS
  // ========================================================================

  /**
   * Create an SVG element with given tag and attributes
   */
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          if (key === 'text') {
            el.textContent = attrs[key];
          } else if (key === 'class') {
            el.setAttribute('class', attrs[key]);
          } else if (key.indexOf('data-') === 0) {
            el.setAttribute(key, attrs[key]);
          } else {
            el.setAttribute(key, attrs[key]);
          }
        }
      }
    }
    return el;
  }

  function svgRect(x, y, w, h, attrs) {
    attrs = attrs || {};
    attrs.x = x;
    attrs.y = y;
    attrs.width = w;
    attrs.height = h;
    return svgEl('rect', attrs);
  }

  function svgCircle(cx, cy, r, attrs) {
    attrs = attrs || {};
    attrs.cx = cx;
    attrs.cy = cy;
    attrs.r = r;
    return svgEl('circle', attrs);
  }

  function svgLine(x1, y1, x2, y2, attrs) {
    attrs = attrs || {};
    attrs.x1 = x1;
    attrs.y1 = y1;
    attrs.x2 = x2;
    attrs.y2 = y2;
    return svgEl('line', attrs);
  }

  function svgText(x, y, text, attrs) {
    attrs = attrs || {};
    attrs.x = x;
    attrs.y = y;
    attrs.text = text;
    if (!attrs['font-family']) attrs['font-family'] = DEFAULTS.fontFamily;
    if (!attrs['font-size']) attrs['font-size'] = DEFAULTS.fontSize;
    if (!attrs.fill) attrs.fill = DEFAULTS.textColor;
    return svgEl('text', attrs);
  }

  function svgGroup(attrs) {
    return svgEl('g', attrs || {});
  }

  function svgPath(d, attrs) {
    attrs = attrs || {};
    attrs.d = d;
    return svgEl('path', attrs);
  }

  function svgPolyline(points, attrs) {
    attrs = attrs || {};
    attrs.points = points;
    return svgEl('polyline', attrs);
  }

  // ========================================================================
  // MATH & LAYOUT HELPERS
  // ========================================================================

  /**
   * Polar to Cartesian coordinates
   */
  function polarToCartesian(cx, cy, r, angleDeg) {
    var rad = (angleDeg - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  /**
   * Create an SVG arc path between two angles
   */
  function arcPath(cx, cy, r, startAngle, endAngle) {
    var start = polarToCartesian(cx, cy, r, endAngle);
    var end = polarToCartesian(cx, cy, r, startAngle);
    var largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return [
      'M', start.x, start.y,
      'A', r, r, 0, largeArc, 0, end.x, end.y,
      'L', cx, cy, 'Z'
    ].join(' ');
  }

  /**
   * Get a scale function that maps a domain [min, max] to a range [0, rangeSize]
   */
  function getScale(min, max, rangeSize) {
    var domain = max - min;
    if (domain === 0) domain = 1;
    return function (value) {
      return ((value - min) / domain) * rangeSize;
    };
  }

  /**
   * Calculate pie sectors from data array
   * Each item: { label, value, color }
   * Returns array of { startAngle, endAngle, color, label, value, percentage }
   */
  function calculatePieSectors(data) {
    var total = data.reduce(function (sum, d) { return sum + (d.value || 0); }, 0);
    if (total === 0) return [];

    var currentAngle = 0;
    return data.map(function (d, i) {
      var fraction = (d.value || 0) / total;
      var angle = fraction * 360;
      var sector = {
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: d.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
        label: d.label,
        value: d.value || 0,
        percentage: fraction * 100
      };
      currentAngle += angle;
      return sector;
    });
  }

  /**
   * Auto-calculate node positions in a grid layout if coordinates are missing
   */
  function calculateLayout(nodes, width, height) {
    var cols = Math.ceil(Math.sqrt(nodes.length));
    var rows = Math.ceil(nodes.length / cols);
    var cellW = width / (cols + 1);
    var cellH = height / (rows + 1);

    nodes.forEach(function (node, i) {
      if (node.x === undefined || node.x === null || node.y === undefined || node.y === null) {
        var col = i % cols;
        var row = Math.floor(i / cols);
        node.x = cellW * (col + 1);
        node.y = cellH * (row + 1);
      }
    });

    return nodes;
  }

  /**
   * Calculate moving average for trend line
   */
  function movingAverage(data, window) {
    if (!data.length) return [];
    window = Math.min(window, data.length);
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var start = Math.max(0, i - Math.floor(window / 2));
      var end = Math.min(data.length - 1, i + Math.ceil(window / 2));
      var sum = 0;
      var count = 0;
      for (var j = start; j <= end; j++) {
        sum += data[j];
        count++;
      }
      result.push(sum / count);
    }
    return result;
  }

  /**
   * Get container dimensions, falling back to defaults
   */
  function getContainerSize(container) {
    if (!container) return { width: DEFAULTS.width, height: DEFAULTS.height };
    var rect = container.getBoundingClientRect();
    var w = rect.width > 0 ? rect.width : DEFAULTS.width;
    var h = rect.height > 0 ? rect.height : DEFAULTS.height;
    // Constrain to reasonable bounds
    w = Math.max(w, 280);
    h = Math.max(h, 200);
    return { width: Math.floor(w), height: Math.floor(h) };
  }

  /**
   * Determine if we're on a small screen
   */
  function isCompactView() {
    return window.innerWidth < Utils.constants.BREAKPOINTS.MD;
  }

  /**
   * Get color for index from palette
   */
  function getColor(index) {
  index = Number(index);

  if (!Number.isFinite(index)) {
    index = 0;
  }

  index = Math.abs(Math.floor(index));

  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}
  // ========================================================================
  // SVG ROOT CREATION
  // ========================================================================

  /**
   * Create the root SVG element with viewBox
   */
  function createRootSvg(width, height) {
    var svg = svgEl('svg', {
      'viewBox': '0 0 ' + width + ' ' + height,
      'preserveAspectRatio': 'xMidYMid meet',
      'width': '100%',
      'height': '100%',
      'class': 'chart-svg'
    });
    return svg;
  }

  /**
   * Create an "empty state" placeholder SVG
   */
  function emptyStateSvg(width, height, message) {
    var svg = createRootSvg(width, height);
    var text = svgText(width / 2, height / 2, message || 'Нет данных', {
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-size': DEFAULTS.fontSizeLarge,
      'fill': DEFAULTS.emptyColor
    });
    svg.appendChild(text);
    return svg;
  }

  // ========================================================================
  // DEFS (gradients, patterns)
  // ========================================================================

  function createDefs(svg) {
    var defs = svgEl('defs');

    // Gradient for progress bar segments
    var grad = svgEl('linearGradient', { id: 'chart-progress-gradient' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#0ea5b8', 'stop-opacity': '0.8' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#0ea5b8', 'stop-opacity': '1' }));
    defs.appendChild(grad);

    // Shadow filter for nodes
    var filter = svgEl('filter', { id: 'chart-node-shadow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    var feGaussianBlur = svgEl('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: '2' });
    var feOffset = svgEl('feOffset', { dx: '0', dy: '2', result: 'offsetblur' });
    var feMerge = svgEl('feMerge');
    feMerge.appendChild(svgEl('feMergeNode'));
    feMerge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feOffset);
    filter.appendChild(feMerge);
    defs.appendChild(filter);

    svg.appendChild(defs);
    return defs;
  }

  // ========================================================================
  // CHART 1: PROGRESS BAR (Horizontal Stacked Bar)
  // ========================================================================

  function renderProgress(container, data, options) {
    options = options || {};
    if (!container) {
      console.error('[Charts] renderProgress: container not found');
      return null;
    }

    var size = getContainerSize(container);
    var w = size.width;
    var h = DEFAULTS.barHeight + DEFAULTS.padding * 2;
    var compact = isCompactView();

    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
      var empty = emptyStateSvg(w, h, 'Нет данных о прогрессе');
      Utils.dom.empty(container);
      container.appendChild(empty);
      _activeCharts[container.id || 'progress'] = { type: 'progress', container: container, data: data, options: options };
      return empty;
    }

    // Filter out invalid entries
    var modules = data.filter(function (m) {
      return m && typeof m.progress === 'number' && m.progress >= 0 && m.progress <= 100;
    });

    if (modules.length === 0) {
      var empty2 = emptyStateSvg(w, h, 'Нет данных о прогрессе');
      Utils.dom.empty(container);
      container.appendChild(empty2);
      return empty2;
    }

    var svg = createRootSvg(w, h);
    createDefs(svg);

    var padding = compact ? DEFAULTS.paddingSmall : DEFAULTS.padding;
    var barY = padding;
    var barH = DEFAULTS.barHeight;
    var barW = w - padding * 2;
    var barX = padding;

    // Background bar
    svg.appendChild(svgRect(barX, barY, barW, barH, {
      rx: 6,
      fill: DEFAULTS.gridColor,
      'class': 'chart-progress-bg'
    }));

    // Calculate segment widths based on equal distribution (each module gets equal share)
    var segmentCount = modules.length;
    var segmentW = barW / segmentCount;
    var minLabelWidth = compact ? 80 : 60;

    modules.forEach(function (mod, i) {
      var segX = barX + i * segmentW;
      var color = getColor(i);
      var progressW = segmentW * (mod.progress / 100);

      // Segment background (unfilled portion)
      if (segmentW > 4) {
        svg.appendChild(svgRect(segX + 2, barY + 2, segmentW - 4, barH - 4, {
          rx: 4,
          fill: color,
          'fill-opacity': '0.15',
          'class': 'chart-progress-segment-bg',
          'data-module': mod.id || mod.title || ''
        }));
      }

      // Filled portion
      if (progressW > 4 && segmentW > 4) {
  svg.appendChild(svgRect(
    segX + 2,
    barY + 2,
    Math.max(0, Math.min(progressW - 4, segmentW - 4)),
    barH - 4,
    {
      rx: 4,
      fill: color,
      'class': 'chart-progress-segment-fill',
      'data-module': mod.id || mod.title || '',
      'data-progress': mod.progress
    }
  ));
}

      // Labels: show if segment is wide enough or not in compact mode
      var showLabel = !compact || segmentW > minLabelWidth;

      if (showLabel) {
        // Module title above the bar
        var titleText = compact
          ? Utils.format.truncate(mod.title || '', 12)
          : Utils.format.truncate(mod.title || '', Math.floor(segmentW / 7));

        svg.appendChild(svgText(segX + segmentW / 2, barY - 8, titleText, {
          'text-anchor': 'middle',
          'font-size': DEFAULTS.fontSizeSmall,
          'fill': DEFAULTS.textColor,
          'class': 'chart-progress-label'
        }));

        // Percentage inside or below the bar
        var pctText = Utils.format.formatPercent(mod.progress);
        var labelY = mod.progress > 30 ? barY + barH / 2 + 4 : barY + barH + 14;
        var labelFill = mod.progress > 30 ? '#ffffff' : DEFAULTS.textColor;

        svg.appendChild(svgText(segX + segmentW / 2, labelY, pctText, {
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'font-size': DEFAULTS.fontSizeSmall,
          'font-weight': '600',
          'fill': labelFill,
          'class': 'chart-progress-pct'
        }));
      }
    });

    // Overall progress label
    var overallProgress = modules.reduce(function (sum, m) { return sum + m.progress; }, 0) / modules.length;
    svg.appendChild(svgText(w - padding, barY + barH + (compact ? 28 : 24),
      'Общий: ' + Utils.format.formatPercent(overallProgress), {
      'text-anchor': 'end',
      'font-size': DEFAULTS.fontSize,
      'font-weight': '600',
      'fill': DEFAULTS.textPrimary,
      'class': 'chart-progress-overall'
    }));

    Utils.dom.empty(container);
    container.appendChild(svg);

    _activeCharts[container.id || 'progress'] = {
      type: 'progress',
      container: container,
      data: data,
      options: options
    };

    return svg;
  }

  // ========================================================================
  // CHART 2: ROADMAP GRAPH
  // ========================================================================

  var _roadmapState = {
    panX: 0,
    panY: 0,
    scale: 1,
    isPanning: false,
    startX: 0,
    startY: 0
  };

  function renderRoadmapGraph(container, data, options) {
    options = options || {};
    if (!container) {
      console.error('[Charts] renderRoadmapGraph: container not found');
      return null;
    }

    var size = getContainerSize(container);
    var w = size.width;
    var h = size.height;
    var compact = isCompactView();

    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
      var empty = emptyStateSvg(w, h, 'Нет данных для дорожной карты');
      Utils.dom.empty(container);
      container.appendChild(empty);
      _activeCharts[container.id || 'roadmap'] = { type: 'roadmap', container: container, data: data, options: options };
      return empty;
    }

    // Clone data to avoid mutation
    var nodes = Utils.misc.deepClone(data);

    // Determine bounds of node coordinates
    var maxX = 0, maxY = 0, minX = Infinity, minY = Infinity;
    nodes.forEach(function (n) {
      if (n.x !== undefined) { maxX = Math.max(maxX, n.x); minX = Math.min(minX, n.x); }
      if (n.y !== undefined) { maxY = Math.max(maxY, n.y); minY = Math.min(minY, n.y); }
    });

    // Auto-layout if no coordinates
    var hasCoords = nodes.every(function (n) { return n.x !== undefined && n.y !== undefined; });
    if (!hasCoords) {
      calculateLayout(nodes, w - DEFAULTS.padding * 2, h - DEFAULTS.padding * 2);
      nodes.forEach(function (n) {
        n.x += DEFAULTS.padding;
        n.y += DEFAULTS.padding;
      });
      maxX = w; maxY = h; minX = 0; minY = 0;
    }

    // Calculate content dimensions
    var contentW = Math.max(maxX - minX, 100);
    var contentH = Math.max(maxY - minY, 100);

    // Add margins to content bounds
    var margin = DEFAULTS.nodeRadius + 20;
    var svgW = contentW + margin * 2;
    var svgH = contentH + margin * 2;

    // Normalize coordinates to start from margin
    nodes.forEach(function (n) {
      n.x = (n.x - minX) + margin;
      n.y = (n.y - minY) + margin;
    });

    // Build edge list from dependencies
    var edges = [];
    nodes.forEach(function (n) {
      if (n.dependencies && n.dependencies.length) {
        n.dependencies.forEach(function (depId) {
          var target = nodes.find(function (n2) { return n2.id === depId; });
          if (target) {
            edges.push({ from: target, to: n });
          }
        });
      }
    });

    // Create SVG
    var svg = createRootSvg(svgW, svgH);
    svg.setAttribute('class', 'chart-svg chart-roadmap-svg');
    createDefs(svg);

    // Main transform group (for pan/zoom)
    var transformGroup = svgGroup({ 'class': 'chart-roadmap-transform' });
    svg.appendChild(transformGroup);

    // Reset pan/zoom state
    _roadmapState.panX = 0;
    _roadmapState.panY = 0;
    _roadmapState.scale = 1;

    function updateTransform() {
      transformGroup.setAttribute('transform',
        'translate(' + _roadmapState.panX + ',' + _roadmapState.panY + ') scale(' + _roadmapState.scale + ')');
    }

    // --- Render edges (connections) ---
    var edgesGroup = svgGroup({ 'class': 'chart-roadmap-edges' });
    transformGroup.appendChild(edgesGroup);

    edges.forEach(function (edge) {
      // Draw a curved path between nodes
      var x1 = edge.from.x;
      var y1 = edge.from.y;
      var x2 = edge.to.x;
      var y2 = edge.to.y;

      // Calculate control point for slight curve
      var midX = (x1 + x2) / 2;
      var midY = (y1 + y2) / 2;
      var dx = x2 - x1;
      var dy = y2 - y1;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var curve = Math.min(dist * 0.15, 30);
      var ctrlX = midX + (-dy / (dist || 1)) * curve;
      var ctrlY = midY + (dx / (dist || 1)) * curve;

      var d = 'M ' + x1 + ' ' + y1 + ' Q ' + ctrlX + ' ' + ctrlY + ' ' + x2 + ' ' + y2;

      var path = svgPath(d, {
        fill: 'none',
        stroke: DEFAULTS.axisColor,
        'stroke-width': '1.5',
        'stroke-dasharray': '4 3',
        'class': 'chart-roadmap-edge',
        'data-from': edge.from.id,
        'data-to': edge.to.id
      });
      edgesGroup.appendChild(path);

      // Arrow marker at the end
      var angle = Math.atan2(y2 - ctrlY, x2 - ctrlX);
      var arrowSize = 6;
      var ax = x2 - DEFAULTS.nodeRadius * 0.8 * Math.cos(angle);
      var ay = y2 - DEFAULTS.nodeRadius * 0.8 * Math.sin(angle);
      var ax1 = ax - arrowSize * Math.cos(angle - Math.PI / 6);
      var ay1 = ay - arrowSize * Math.sin(angle - Math.PI / 6);
      var ax2 = ax - arrowSize * Math.cos(angle + Math.PI / 6);
      var ay2 = ay - arrowSize * Math.sin(angle + Math.PI / 6);

      edgesGroup.appendChild(svgPath(
        'M ' + ax + ' ' + ay + ' L ' + ax1 + ' ' + ay1 + ' L ' + ax2 + ' ' + ay2 + ' Z',
        { fill: DEFAULTS.axisColor, 'class': 'chart-roadmap-arrow' }
      ));
    });

    // --- Render nodes ---
    var nodesGroup = svgGroup({ 'class': 'chart-roadmap-nodes' });
    transformGroup.appendChild(nodesGroup);

    var r = compact ? DEFAULTS.nodeRadiusSmall : DEFAULTS.nodeRadius;

    nodes.forEach(function (node, i) {
  var colorIndex = node.colorIndex !== undefined
    ? Number(node.colorIndex)
    : i;

  if (!Number.isFinite(colorIndex)) {
    colorIndex = i;
  }

  var color = getColor(colorIndex);

  var rawStatus = String(node.status || 'pending').toLowerCase();

  var status =
    rawStatus === 'done' || rawStatus === 'completed'
      ? 'done'
      : rawStatus === 'active'
        ? 'active'
        : rawStatus === 'locked'
          ? 'locked'
          : 'pending';

  var isInactive =
    status === 'locked' ||
    status === 'pending';

  var statusColor =
    status === 'done'
      ? '#22c55e'
      : status === 'active'
        ? color
        : DEFAULTS.axisColor;

      var statusColor = node.status === 'done' ? '#22c55e' :
                        node.status === 'active' ? color :
                        DEFAULTS.axisColor;

      var nodeGroup = svgGroup({
  'class': 'chart-roadmap-node',
  'data-node-id': node.id || '',
  'data-node-title': node.title || '',
  'data-node-status': status,
  'data-node-type': node.type || 'module'
});

      // Outer circle (status ring)
      nodeGroup.appendChild(svgCircle(node.x, node.y, r, {
        fill: node.status === 'locked' ? 'var(--surface-secondary, #f1f5f9)' : color,
        'fill-opacity': node.status === 'locked' ? '1' : '0.15',
        stroke: statusColor,
        'stroke-width': '2',
        'class': 'chart-roadmap-node-circle',
        'filter': 'url(#chart-node-shadow)'
      }));

      // Inner circle for completed nodes
      if (status === 'done') {
        nodeGroup.appendChild(svgCircle(node.x, node.y, r * 0.5, {
          fill: statusColor,
          'class': 'chart-roadmap-node-inner'
        }));
        // Checkmark
        nodeGroup.appendChild(svgText(node.x, node.y + 1, '\u2713', {
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'font-size': r * 0.6,
          'fill': '#ffffff',
          'font-weight': '700',
          'class': 'chart-roadmap-node-check'
        }));
      } else if (status === 'active') {
        nodeGroup.appendChild(svgCircle(node.x, node.y, r * 0.3, {
          fill: statusColor,
          'class': 'chart-roadmap-node-inner'
        }));
      }

      // Node label
      var label = Utils.format.truncate(node.title || '', compact ? 14 : 18);
      var labelY = node.y + r + (compact ? 12 : 14);

      nodeGroup.appendChild(svgText(node.x, labelY, label, {
        'text-anchor': 'middle',
        'font-size': DEFAULTS.fontSizeSmall,
        'fill': DEFAULTS.textPrimary,
        'class': 'chart-roadmap-node-label'
      }));

      // Type badge below label
      if (!compact) {
        nodeGroup.appendChild(svgText(node.x, labelY + 12,
          node.type === 'module' ? 'Модуль' : 'Урок', {
          'text-anchor': 'middle',
          'font-size': 9,
          'fill': DEFAULTS.textColor,
          'class': 'chart-roadmap-node-type'
        }));
      }

      nodesGroup.appendChild(nodeGroup);
    });

    // --- Pan & Zoom ---

    // Mouse wheel zoom
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? 0.9 : 1.1;
      _roadmapState.scale = Utils.misc.clamp(_roadmapState.scale * delta, 0.5, 3);
      updateTransform();
    }, { passive: false });

    // Pan on drag
    svg.addEventListener('mousedown', function (e) {
      // Don't pan when clicking on a node
      if (e.target.closest('.chart-roadmap-node')) return;
      _roadmapState.isPanning = true;
      _roadmapState.startX = e.clientX - _roadmapState.panX;
      _roadmapState.startY = e.clientY - _roadmapState.panY;
      svg.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function (e) {
      if (!_roadmapState.isPanning) return;
      _roadmapState.panX = e.clientX - _roadmapState.startX;
      _roadmapState.panY = e.clientY - _roadmapState.startY;
      updateTransform();
    });

    document.addEventListener('mouseup', function () {
      if (_roadmapState.isPanning) {
        _roadmapState.isPanning = false;
        svg.style.cursor = '';
      }
    });

    // Touch support (basic)
    var touchStartX = 0, touchStartY = 0;
    svg.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX - _roadmapState.panX;
        touchStartY = e.touches[0].clientY - _roadmapState.panY;
      }
    }, { passive: true });

    svg.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) {
        e.preventDefault();
        _roadmapState.panX = e.touches[0].clientX - touchStartX;
        _roadmapState.panY = e.touches[0].clientY - touchStartY;
        updateTransform();
      }
    }, { passive: false });

    // --- Node hover (via event delegation) ---
    var tooltipEl = null;

    Utils.event.delegate(nodesGroup, 'mouseenter', '.chart-roadmap-node', function () {
      var title = this.getAttribute('data-node-title');
      var status = this.getAttribute('data-node-status');
      var type = this.getAttribute('data-node-type');
      if (!title) return;

      // Create or update tooltip
      if (!tooltipEl) {
        tooltipEl = Utils.dom.create('div', { class: 'chart-tooltip' });
        document.body.appendChild(tooltipEl);
      }
      tooltipEl.innerHTML =
        '<div class="chart-tooltip-title">' + Utils.format.escapeHtml(title) + '</div>' +
        '<div class="chart-tooltip-meta">' +
          (type === 'module' ? 'Модуль' : 'Урок') + ' · ' +
          (status === 'done' ? 'Завершено' : status === 'active' ? 'В процессе' : 'Заблокировано') +
        '</div>';
      tooltipEl.style.display = 'block';
    });

    Utils.event.delegate(nodesGroup, 'mousemove', '.chart-roadmap-node', function (e) {
      if (!tooltipEl) return;
      tooltipEl.style.left = (e.clientX + 12) + 'px';
      tooltipEl.style.top = (e.clientY + 12) + 'px';
    });

    Utils.event.delegate(nodesGroup, 'mouseleave', '.chart-roadmap-node', function () {
      if (tooltipEl) tooltipEl.style.display = 'none';
    });

    // Cleanup tooltip on container removal
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.removedNodes.forEach(function (node) {
          if (node === svg && tooltipEl) {
            Utils.dom.remove(tooltipEl);
            tooltipEl = null;
          }
        });
      });
    });
    if (container.parentNode) {
      observer.observe(container.parentNode, { childList: true });
    }

    Utils.dom.empty(container);
    container.appendChild(svg);

    _activeCharts[container.id || 'roadmap'] = {
      type: 'roadmap',
      container: container,
      data: data,
      options: options
    };

    return svg;
  }

  // ========================================================================
  // CHART 3: PIE CHART (Artifacts Distribution)
  // ========================================================================

  function renderArtifactsDistribution(container, data, options) {
    options = options || {};
    if (!container) {
      console.error('[Charts] renderArtifactsDistribution: container not found');
      return null;
    }

    var size = getContainerSize(container);
    var w = size.width;
    var h = Math.max(size.height, 240);
    var compact = isCompactView();

    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
      var empty = emptyStateSvg(w, h, 'Нет артефактов для отображения');
      Utils.dom.empty(container);
      container.appendChild(empty);
      _activeCharts[container.id || 'pie'] = { type: 'pie', container: container, data: data, options: options };
      return empty;
    }

    // Normalize data into { label, value, color } format
    var pieData = data.map(function (d, i) {
      return {
        label: d.label || d.type || ('Item ' + (i + 1)),
        value: d.value || d.count || 0,
        color: d.color || getColor(i)
      };
    }).filter(function (d) { return d.value > 0; });

    if (pieData.length === 0) {
      var empty2 = emptyStateSvg(w, h, 'Нет артефактов для отображения');
      Utils.dom.empty(container);
      container.appendChild(empty2);
      return empty2;
    }

    var svg = createRootSvg(w, h);
    svg.setAttribute('class', 'chart-svg chart-pie-svg');

    var legendW = compact ? 0 : 160;
    var chartW = w - legendW - DEFAULTS.padding;
    var cx = DEFAULTS.padding + chartW / 2;
    var cy = h / 2;
    var r = Math.min(chartW, h) / 2 - DEFAULTS.padding / 2;
    r = Math.max(r, 40);

    var total = pieData.reduce(function (sum, d) { return sum + d.value; }, 0);
    var sectors = calculatePieSectors(pieData);

    // --- Donut hole (for donut chart style) ---
    var innerR = r * 0.55;

    // --- Render sectors ---
    sectors.forEach(function (sector, i) {
      var path = svgPath(arcPath(cx, cy, r, sector.startAngle, sector.endAngle), {
        fill: sector.color,
        stroke: 'var(--surface-primary, #ffffff)',
        'stroke-width': '2',
        'class': 'chart-pie-sector',
        'data-label': sector.label,
        'data-value': sector.value,
        'data-percentage': sector.percentage.toFixed(1)
      });
      svg.appendChild(path);

      // Percentage label inside sector (if large enough)
      if (sector.percentage >= 8) {
        var labelAngle = (sector.startAngle + sector.endAngle) / 2;
        var labelR = (r + innerR) / 2;
        var labelPos = polarToCartesian(cx, cy, labelR, labelAngle);
        svg.appendChild(svgText(labelPos.x, labelPos.y, Utils.format.formatPercent(sector.percentage, 0), {
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          'font-size': DEFAULTS.fontSize,
          'font-weight': '700',
          fill: '#ffffff',
          'class': 'chart-pie-label',
          'pointer-events': 'none'
        }));
      }

      // External label for small sectors
      if (sector.percentage < 8 && sector.percentage >= 1 && !compact) {
        var extAngle = (sector.startAngle + sector.endAngle) / 2;
        var extPos = polarToCartesian(cx, cy, r + 8, extAngle);
        svg.appendChild(svgText(extPos.x, extPos.y, Utils.format.formatPercent(sector.percentage, 0), {
          'text-anchor': extPos.x > cx ? 'start' : 'end',
          'font-size': DEFAULTS.fontSizeSmall,
          fill: DEFAULTS.textColor,
          'class': 'chart-pie-label-ext',
          'pointer-events': 'none'
        }));
      }
    });

    // --- Donut center text ---
    svg.appendChild(svgCircle(cx, cy, innerR - 2, {
      fill: 'var(--surface-primary, #ffffff)',
      'class': 'chart-pie-center-bg'
    }));
    svg.appendChild(svgText(cx, cy - 6, String(total), {
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-size': DEFAULTS.fontSizeLarge * 1.4,
      'font-weight': '700',
      fill: DEFAULTS.textPrimary,
      'class': 'chart-pie-center-value'
    }));
    svg.appendChild(svgText(cx, cy + 12, compact ? 'всего' : 'артефактов', {
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'font-size': DEFAULTS.fontSizeSmall,
      fill: DEFAULTS.textColor,
      'class': 'chart-pie-center-label'
    }));

    // --- Legend ---
    if (!compact && legendW > 0) {
      var legendX = w - legendW;
      var legendY = (h - pieData.length * DEFAULTS.legendItemHeight) / 2;

      pieData.forEach(function (d, i) {
        var ly = legendY + i * DEFAULTS.legendItemHeight + DEFAULTS.legendItemHeight / 2;

        // Color marker
        svg.appendChild(svgRect(legendX, ly - 7, 14, 14, {
          rx: 3,
          fill: d.color,
          'class': 'chart-pie-legend-marker'
        }));

        // Label and count
        var labelText = Utils.format.truncate(d.label, 16);
        svg.appendChild(svgText(legendX + 20, ly + 4, labelText, {
          'font-size': DEFAULTS.fontSize,
          fill: DEFAULTS.textPrimary,
          'class': 'chart-pie-legend-label'
        }));

        // Count on the right
        svg.appendChild(svgText(w - DEFAULTS.paddingSmall, ly + 4, String(d.value), {
          'text-anchor': 'end',
          'font-size': DEFAULTS.fontSize,
          'font-weight': '600',
          fill: DEFAULTS.textColor,
          'class': 'chart-pie-legend-count'
        }));
      });
    }

    // --- Sector hover ---
    var pieTooltip = null;

    Utils.event.delegate(svg, 'mouseenter', '.chart-pie-sector', function () {
      var label = this.getAttribute('data-label');
      var value = this.getAttribute('data-value');
      var pct = this.getAttribute('data-percentage');
      if (!label) return;

      this.style.opacity = '0.85';
      this.style.transform = 'scale(1.03)';
      this.style.transformOrigin = cx + 'px ' + cy + 'px';

      if (!pieTooltip) {
        pieTooltip = Utils.dom.create('div', { class: 'chart-tooltip' });
        document.body.appendChild(pieTooltip);
      }
      pieTooltip.innerHTML =
        '<div class="chart-tooltip-title">' + Utils.format.escapeHtml(label) + '</div>' +
        '<div class="chart-tooltip-meta">' + value + ' шт · ' + pct + '%</div>';
      pieTooltip.style.display = 'block';
    });

    Utils.event.delegate(svg, 'mousemove', '.chart-pie-sector', function (e) {
      if (!pieTooltip) return;
      pieTooltip.style.left = (e.clientX + 12) + 'px';
      pieTooltip.style.top = (e.clientY + 12) + 'px';
    });

    Utils.event.delegate(svg, 'mouseleave', '.chart-pie-sector', function () {
      this.style.opacity = '';
      this.style.transform = '';
      if (pieTooltip) pieTooltip.style.display = 'none';
    });

    Utils.dom.empty(container);
    container.appendChild(svg);

    _activeCharts[container.id || 'pie'] = {
      type: 'pie',
      container: container,
      data: data,
      options: options
    };

    return svg;
  }

  // ========================================================================
  // CHART 4: POMODORO STATS (Bar/Line Chart)
  // ========================================================================

  function renderPomodoroStats(container, data, options) {
    options = options || {};
    if (!container) {
      console.error('[Charts] renderPomodoroStats: container not found');
      return null;
    }

    var size = getContainerSize(container);
    var w = size.width;
    var h = size.height;
    var compact = isCompactView();
    var showTrend = options.showTrend !== false && !compact;

    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
      var empty = emptyStateSvg(w, h, 'Нет данных о сессиях');
      Utils.dom.empty(container);
      container.appendChild(empty);
      _activeCharts[container.id || 'pomodoro'] = { type: 'pomodoro', container: container, data: data, options: options };
      return empty;
    }

    // Normalize data
    var records = data.filter(function (d) {
      return d && d.date && typeof d.minutes === 'number' && d.minutes >= 0;
    }).map(function (d) {
      return { date: d.date, minutes: d.minutes };
    });

    if (records.length === 0) {
      var empty2 = emptyStateSvg(w, h, 'Нет данных о сессиях');
      Utils.dom.empty(container);
      container.appendChild(empty2);
      return empty2;
    }

    // Sort by date
    records.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });

    // Limit display to last 14 days for readability
    var maxDays = compact ? 7 : 14;
    if (records.length > maxDays) {
      records = records.slice(-maxDays);
    }

    var svg = createRootSvg(w, h);
    svg.setAttribute('class', 'chart-svg chart-pomodoro-svg');

    // Layout
    var padL = DEFAULTS.paddingLarge;
    var padR = DEFAULTS.padding;
    var padT = DEFAULTS.padding;
    var padB = DEFAULTS.paddingLarge;
    var chartW = w - padL - padR;
    var chartH = h - padT - padB;

    // Y-axis scale
    var maxMinutes = Utils.misc.max(records.map(function (r) { return r.minutes; }));
    maxMinutes = Math.ceil(maxMinutes / 30) * 30 || 60; // Round up to nearest 30
    var yScale = getScale(0, maxMinutes, chartH);

    // X-axis: one slot per day
    var dayCount = records.length;
    var barW = chartW / dayCount * 0.6;
    var barGap = chartW / dayCount * 0.4;
    var slotW = chartW / dayCount;

    // --- Grid lines (horizontal) ---
    var gridLines = 5;
    for (var i = 0; i <= gridLines; i++) {
      var gridY = padT + (chartH / gridLines) * i;
      var gridVal = maxMinutes - (maxMinutes / gridLines) * i;

      // Grid line
      svg.appendChild(svgLine(padL, gridY, padL + chartW, gridY, {
        stroke: DEFAULTS.gridColor,
        'stroke-width': '1',
        'class': 'chart-pomodoro-grid'
      }));

      // Y-axis label
      svg.appendChild(svgText(padL - 8, gridY + 4, Utils.format.formatDurationRu(gridVal * 60), {
        'text-anchor': 'end',
        'font-size': DEFAULTS.fontSizeSmall,
        'fill': DEFAULTS.textColor,
        'class': 'chart-pomodoro-y-label'
      }));
    }

    // --- X-axis line ---
    svg.appendChild(svgLine(padL, padT + chartH, padL + chartW, padT + chartH, {
      stroke: DEFAULTS.axisColor,
      'stroke-width': '1.5',
      'class': 'chart-pomodoro-x-axis'
    }));

    // --- Y-axis line ---
    svg.appendChild(svgLine(padL, padT, padL, padT + chartH, {
      stroke: DEFAULTS.axisColor,
      'stroke-width': '1.5',
      'class': 'chart-pomodoro-y-axis'
    }));

    // --- Bars ---
    var barColor = getColor(0);
    records.forEach(function (r, i) {
      var barX = padL + i * slotW + barGap / 2;
      var barH = yScale(r.minutes);
      var barY = padT + chartH - barH;

      // Bar
      svg.appendChild(svgRect(barX, barY, barW, barH, {
        rx: 3,
        fill: barColor,
        'fill-opacity': '0.8',
        'class': 'chart-pomodoro-bar',
        'data-date': r.date,
        'data-minutes': r.minutes
      }));

      // X-axis label (date)
      var dateLabel = compact
        ? Utils.format.formatDate(r.date, 'DD.MM')
        : Utils.format.formatDate(r.date, 'DD.MM');

      // Show label every day or every other day if too many
      var showLabel = compact ? (i % 2 === 0) : true;
      if (dayCount > 10 && !compact) {
        showLabel = i % 2 === 0;
      }

      if (showLabel) {
        svg.appendChild(svgText(barX + barW / 2, padT + chartH + 16, dateLabel, {
          'text-anchor': 'middle',
          'font-size': DEFAULTS.fontSizeSmall,
          'fill': DEFAULTS.textColor,
          'class': 'chart-pomodoro-x-label'
        }));
      }

      // Value on top of bar (if tall enough)
      if (barH > 20 && !compact) {
        svg.appendChild(svgText(barX + barW / 2, barY - 4, String(r.minutes) + 'м', {
          'text-anchor': 'middle',
          'font-size': DEFAULTS.fontSizeSmall,
          'fill': DEFAULTS.textColor,
          'class': 'chart-pomodoro-bar-value'
        }));
      }
    });

    // --- Trend line (moving average) ---
    if (showTrend && records.length >= 3) {
      var trendData = movingAverage(records.map(function (r) { return r.minutes; }), 3);

      // Build polyline points
      var points = trendData.map(function (val, i) {
        var px = padL + i * slotW + slotW / 2;
        var py = padT + chartH - yScale(val);
        return px + ',' + py;
      }).join(' ');

      svg.appendChild(svgPolyline(points, {
        fill: 'none',
        stroke: getColor(1),
        'stroke-width': '2',
        'stroke-dasharray': '5 3',
        'class': 'chart-pomodoro-trend',
        'pointer-events': 'none'
      }));

      // Trend dots
      trendData.forEach(function (val, i) {
        var px = padL + i * slotW + slotW / 2;
        var py = padT + chartH - yScale(val);
        svg.appendChild(svgCircle(px, py, 3, {
          fill: getColor(1),
          'class': 'chart-pomodoro-trend-dot',
          'pointer-events': 'none'
        }));
      });

      // Legend for trend
      svg.appendChild(svgLine(w - padR - 100, padT + 10, w - padR - 80, padT + 10, {
        stroke: getColor(1),
        'stroke-width': '2',
        'stroke-dasharray': '5 3'
      }));
      svg.appendChild(svgText(w - padR - 74, padT + 13, 'Тренд', {
        'font-size': DEFAULTS.fontSizeSmall,
        fill: DEFAULTS.textColor
      }));
    }

    // --- Title ---
    if (options.title) {
      svg.appendChild(svgText(padL, padT - 12, options.title, {
        'font-size': DEFAULTS.fontSizeLarge,
        'font-weight': '600',
        fill: DEFAULTS.textPrimary,
        'class': 'chart-pomodoro-title'
      }));
    }

    // --- Bar hover ---
    var pomoTooltip = null;

    Utils.event.delegate(svg, 'mouseenter', '.chart-pomodoro-bar', function () {
      var date = this.getAttribute('data-date');
      var minutes = this.getAttribute('data-minutes');
      if (!date) return;

      this.setAttribute('fill-opacity', '1');

      if (!pomoTooltip) {
        pomoTooltip = Utils.dom.create('div', { class: 'chart-tooltip' });
        document.body.appendChild(pomoTooltip);
      }
      pomoTooltip.innerHTML =
        '<div class="chart-tooltip-title">' + Utils.format.formatDateRu(date) + '</div>' +
        '<div class="chart-tooltip-meta">' + minutes + ' минут</div>';
      pomoTooltip.style.display = 'block';
    });

    Utils.event.delegate(svg, 'mousemove', '.chart-pomodoro-bar', function (e) {
      if (!pomoTooltip) return;
      pomoTooltip.style.left = (e.clientX + 12) + 'px';
      pomoTooltip.style.top = (e.clientY + 12) + 'px';
    });

    Utils.event.delegate(svg, 'mouseleave', '.chart-pomodoro-bar', function () {
      this.setAttribute('fill-opacity', '0.8');
      if (pomoTooltip) pomoTooltip.style.display = 'none';
    });

    Utils.dom.empty(container);
    container.appendChild(svg);

    _activeCharts[container.id || 'pomodoro'] = {
      type: 'pomodoro',
      container: container,
      data: data,
      options: options
    };

    return svg;
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  window.Charts = {
    /**
     * Initialize a chart container — clears it and prepares for rendering
     */
    init: function (containerId) {
  // App.init() вызывает Charts.init() без параметров.
  // В таком режиме требуется только инициализация модуля.
  if (containerId === undefined || containerId === null) {
    console.log('[Charts] Module initialized');
    return true;
  }

  var container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;

  if (!container || container.nodeType !== 1) {
    console.error(
      '[Charts] init: container "' +
      String(containerId) +
      '" not found'
    );
    return null;
  }

  Utils.dom.addClass(container, 'chart-container');
  Utils.dom.empty(container);

  return container;
},

    /**
     * Render progress bar chart
     * @param {string|HTMLElement} containerId - Container element or ID
     * @param {Array} data - Array of { id, title, progress }
     * @param {Object} options - Optional configuration
     * @returns {SVGElement|null}
     */
    renderProgress: function (containerId, data, options) {
      var container = typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId;
      return renderProgress(container, data, options);
    },

    /**
     * Render roadmap graph
     * @param {string|HTMLElement} containerId - Container element or ID
     * @param {Array} data - Array of nodes from CourseData.getRoadmap()
     * @param {Object} options - Optional configuration
     * @returns {SVGElement|null}
     */
    renderRoadmapGraph: function (containerId, data, options) {
      var container = typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId;
      return renderRoadmapGraph(container, data, options);
    },

    /**
     * Render artifacts distribution pie chart
     * @param {string|HTMLElement} containerId - Container element or ID
     * @param {Array} data - Array of { type, count } or { label, value }
     * @param {Object} options - Optional configuration
     * @returns {SVGElement|null}
     */
    renderArtifactsDistribution: function (containerId, data, options) {
      var container = typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId;
      return renderArtifactsDistribution(container, data, options);
    },

    /**
     * Render pomodoro statistics chart
     * @param {string|HTMLElement} containerId - Container element or ID
     * @param {Array} data - Array of { date, minutes }
     * @param {Object} options - Optional configuration (showTrend, title)
     * @returns {SVGElement|null}
     */
    renderPomodoroStats: function (containerId, data, options) {
      var container = typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId;
      return renderPomodoroStats(container, data, options);
    },

    /**
     * Clear chart container
     * @param {string|HTMLElement} containerId - Container element or ID
     */
    clear: function (containerId) {
      var container = typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId;

      if (!container) return;

      Utils.dom.empty(container);

      // Remove from active charts
      var key = typeof containerId === 'string' ? containerId : (container.id || '');
      if (key && _activeCharts[key]) {
        delete _activeCharts[key];
      }

      // Remove any tooltips
      var tooltips = Utils.dom.$$('.chart-tooltip');
      tooltips.forEach(function (t) { Utils.dom.remove(t); });
    },

    /**
     * Resize/redraw all active charts
     * Called on window resize (throttled)
     */
    resize: function (containerId) {
      if (containerId) {
        var chart = _activeCharts[containerId];
        if (chart) {
          redrawChart(chart);
        }
        return;
      }

      // Redraw all active charts
      for (var key in _activeCharts) {
        if (_activeCharts.hasOwnProperty(key)) {
          redrawChart(_activeCharts[key]);
        }
      }
    },

    /**
     * Get color palette
     * @returns {Array} Array of hex color strings
     */
    getPalette: function () {
      return COLOR_PALETTE.slice();
    },

    /**
     * Get a color by index
     * @param {number} index - Color index
     * @returns {string} Hex color
     */
    getColor: function (index) {
      return getColor(index);
    },

    /**
     * Destroy all charts and clean up
     */
    destroy: function () {
      for (var key in _activeCharts) {
        if (_activeCharts.hasOwnProperty(key)) {
          var chart = _activeCharts[key];
          if (chart.container) {
            Utils.dom.empty(chart.container);
          }
        }
      }
      _activeCharts = {};
      // Remove tooltips
      var tooltips = Utils.dom.$$('.chart-tooltip');
      tooltips.forEach(function (t) { Utils.dom.remove(t); });
    }
  };

  // ========================================================================
  // INTERNAL: Redraw a chart from saved state
  // ========================================================================

  function redrawChart(chart) {
    if (!chart || !chart.container) return;

    switch (chart.type) {
      case 'progress':
        renderProgress(chart.container, chart.data, chart.options);
        break;
      case 'roadmap':
        renderRoadmapGraph(chart.container, chart.data, chart.options);
        break;
      case 'pie':
        renderArtifactsDistribution(chart.container, chart.data, chart.options);
        break;
      case 'pomodoro':
        renderPomodoroStats(chart.container, chart.data, chart.options);
        break;
    }
  }

  // ========================================================================
  // AUTO-RESIZE (throttled window resize listener)
  // ========================================================================

  // TODO: Replace with ResizeObserver for per-container resize detection
  var throttledResize = Utils.event.throttle(function () {
    window.Charts.resize();
  }, Utils.constants.TIMING.THROTTLE_RESIZE);

  window.addEventListener('resize', throttledResize);

  // ========================================================================
  // CSS INJECTION (minimal styles for tooltips)
  // ========================================================================

  (function injectStyles() {
    var styleId = 'charts-js-styles';
    if (document.getElementById(styleId)) return;

    var css = [
      '.chart-container { width: 100%; min-height: 200px; position: relative; }',
      '.chart-svg { display: block; width: 100%; height: 100%; }',
      '.chart-roadmap-svg { cursor: grab; }',
      '.chart-roadmap-svg:active { cursor: grabbing; }',
      '.chart-roadmap-node { cursor: pointer; transition: opacity 0.2s; }',
      '.chart-roadmap-node:hover { opacity: 0.8; }',
      '.chart-roadmap-node-circle { transition: stroke-width 0.2s; }',
      '.chart-roadmap-node:hover .chart-roadmap-node-circle { stroke-width: 3; }',
      '.chart-pie-sector { transition: opacity 0.2s, transform 0.2s; cursor: pointer; }',
      '.chart-pie-sector:hover { opacity: 0.85; }',
      '.chart-pomodoro-bar { transition: fill-opacity 0.2s; cursor: pointer; }',
      '.chart-pomodoro-bar:hover { fill-opacity: 1 !important; }',
      '.chart-tooltip {',
      '  position: fixed;',
      '  display: none;',
      '  background: var(--surface-primary, #1e293b);',
      '  color: var(--text-on-primary, #f8fafc);',
      '  padding: 8px 12px;',
      '  border-radius: 6px;',
      '  font-size: 13px;',
      '  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
      '  pointer-events: none;',
      '  z-index: ' + Utils.constants.Z_INDEX.TOOLTIP + ';',
      '  box-shadow: 0 4px 12px rgba(0,0,0,0.15);',
      '  max-width: 240px;',
      '}',
      '.chart-tooltip-title { font-weight: 600; margin-bottom: 2px; }',
      '.chart-tooltip-meta { font-size: 12px; opacity: 0.8; }',
      '@media (max-width: ' + (Utils.constants.BREAKPOINTS.MD - 1) + 'px) {',
      '  .chart-pie-label-ext { display: none; }',
      '  .chart-pomodoro-trend { display: none; }',
      '  .chart-pomodoro-trend-dot { display: none; }',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  })();

  // ========================================================================
  // INITIALIZATION LOG
  // ========================================================================

  console.log('%c[Charts] SVG charting library loaded',
    'color: #0ea5b8;');

})();
