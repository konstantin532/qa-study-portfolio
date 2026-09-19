/* ===== MOTION PRO v3 =====
   Детект темы, карта заголовков, магнитный бегунок, спотлайт, наклон,
   счётчики, разметка кнопок/строк/плиток/алфавита, тосты, ripple. */
(function(){
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var $  = function(s,r){ return (r||document).querySelector(s); };
  var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

  /* --- 1. Тема: замеряем светлоту фона, ставим html.pro-dark --- */
  function syncTheme(){
    var bg = getComputedStyle(document.body).backgroundColor;
    var m = bg.match(/\d+/g);
    var dark = true;
    if(m && m.length >= 3){
      var lum = (0.2126*m[0] + 0.7152*m[1] + 0.0722*m[2]) / 255;
      dark = lum < 0.5;
    }
    var cls = document.documentElement.classList;
    if(cls.contains('dark') || document.documentElement.dataset.theme === 'dark') dark = true;
    cls.toggle('pro-dark', dark);
  }

  /* --- 2. Заголовок: из hash, а не из DOM (лечит «Материалы/Настройки/Заметки») --- */
  var TITLES = {
    '':'Главная', '#home':'Главная', '#dashboard':'Главная', '#today':'Сегодня',
    '#roadmap':'Учебный маршрут', '#path':'Учебный маршрут', '#map':'Карта знаний',
    '#knowledge':'Карта знаний', '#course':'Курс', '#modules':'Курс',
    '#notes':'Заметки', '#questions':'Вопросы', '#review':'Повторение',
    '#practice':'Практика', '#portfolio':'Портфолио', '#glossary':'Словарь',
    '#dictionary':'Словарь', '#pomodoro':'Pomodoro', '#stats':'Статистика',
    '#statistics':'Статистика', '#resources':'Материалы', '#materials':'Материалы',
    '#settings':'Настройки'
  };
  function routeName(){
    var h = (location.hash || '').split('?')[0].replace(/\/$/,'').toLowerCase();
    if(TITLES[h]) return TITLES[h];
    var link = $('#sidebar a[href="'+location.hash+'"]');
    if(link){
      var lbl = link.querySelector('span,strong,b');
      return (lbl ? lbl.textContent : link.textContent).trim().split('\n')[0].trim();
    }
    var inner = $('#main-content h1, #main-content h2');
    return inner ? inner.textContent.trim().split(/[—–:]/)[0].trim() : '';
  }
  function syncTitle(){
    var h1 = $('#header h1'); if(!h1) return;
    var t = routeName();
    if(t && h1.textContent.trim() !== t){
      h1.textContent = t;
      h1.setAttribute('data-swap','');
      setTimeout(function(){ h1.removeAttribute('data-swap'); }, 440);
    }
  }

  /* --- 3. Сайдбар: один активный пункт + магнитный бегунок --- */
  var rail;
  function syncSidebar(){
    var sb = $('#sidebar'); if(!sb) return;
    if(getComputedStyle(sb).position === 'static') sb.style.position = 'relative';
    if(!rail){ rail = document.createElement('i'); rail.id = 'pro-rail'; sb.appendChild(rail); }

    var links = $$('#sidebar a');
    var hash = location.hash || '#home';
    var active = links.filter(function(a){ return a.getAttribute('href') === hash; })[0]
              || links.filter(function(a){ return /(^|\s)(active|is-active)(\s|$)/.test(a.className) || a.hasAttribute('aria-current'); })[0];

    links.forEach(function(a){
      if(a === active) a.setAttribute('data-pro-active','');
      else a.removeAttribute('data-pro-active');
    });
    if(!active){ rail.style.opacity = 0; return; }
    var r = active.getBoundingClientRect(), s = sb.getBoundingClientRect();
    rail.style.height = Math.round(r.height - 12) + 'px';
    rail.style.transform = 'translateY(' + Math.round(r.top - s.top + sb.scrollTop + 6) + 'px)';
    rail.style.opacity = 1;
  }

  /* --- 4. Разметка элементов под CSS --- */
  var DANGER = /(удал|сброс|очист|полный сброс|remove|delete|reset)/i;
  var PRIMARY = /(создать|добавить|сохранить|старт|начать|экспорт|загрузить|продолжить|применить)/i;
  function tag(root){
    root = root || document;

    // кнопки
    $$('#main-content button, #main-content .btn', root).forEach(function(b){
      if(b.dataset.proTagged) return; b.dataset.proTagged = '1';
      var t = (b.textContent || '').trim();
      if(DANGER.test(t)) b.setAttribute('data-pro-danger','');
      else if(PRIMARY.test(t)) b.setAttribute('data-pro-primary','');
    });

    // строки «имя | значение»
    $$('#main-content div', root).forEach(function(d){
      if(d.dataset.proRowDone || d.children.length !== 2) return;
      var a = d.children[0], b = d.children[1];
      if(a.children.length || b.children.length) return;
      if(!/^[\d\s.,%]+\s*(мин|ч|мб|%|шт)?$/i.test((b.textContent||'').trim())) return;
      d.dataset.proRowDone = '1'; d.setAttribute('data-pro-row','');
    });

    // алфавит словаря
    $$('#main-content div', root).forEach(function(d){
      if(d.dataset.proAlphaDone) return;
      var btns = $$(':scope > button', d);
      if(btns.length < 12) return;
      var single = btns.filter(function(b){ return (b.textContent||'').trim().length <= 3; });
      if(single.length < btns.length * 0.8) return;
      d.dataset.proAlphaDone = '1'; d.setAttribute('data-pro-alpha','');
      btns.forEach(function(b){
        b.addEventListener('click', function(){
          btns.forEach(function(x){ x.removeAttribute('data-pro-on'); });
          b.setAttribute('data-pro-on','');
        });
      });
    });

    // плитки шаблонов практики
    $$('#main-content div', root).forEach(function(d){
      if(d.dataset.proTilesDone) return;
      var kids = $$(':scope > div', d);
      if(kids.length < 4 || kids.length > 24) return;
      var short = kids.filter(function(k){
        var t = (k.textContent||'').trim();
        return !k.children.length && t.length > 2 && t.length < 44;
      });
      if(short.length !== kids.length) return;
      d.dataset.proTilesDone = '1'; d.setAttribute('data-pro-tiles','');
    });

    // прозрачные оверлеи модалок
    $$('div', root).forEach(function(d){
      if(d.dataset.proOv) return;
      var cs = getComputedStyle(d);
      if(cs.position !== 'fixed') return;
      if(d.offsetWidth < innerWidth * 0.8 || d.offsetHeight < innerHeight * 0.8) return;
      d.dataset.proOv = '1'; d.setAttribute('data-pro-overlay','');
    });

    // полоса хранилища из текста «Занято 0 МБ из 10240 МБ (0%)»
    $$('#main-content *', root).forEach(function(el){
      if(el.dataset.proBar || el.children.length) return;
      var m = (el.textContent||'').match(/\((\d+(?:[.,]\d+)?)%\)/);
      if(!m || !/занято|из/i.test(el.textContent)) return;
      el.dataset.proBar = '1';
      var bar = document.createElement('div');
      bar.className = 'pro-bar'; bar.style.marginTop = '10px';
      bar.innerHTML = '<i style="width:0"></i>';
      el.after(bar);
      requestAnimationFrame(function(){
        bar.firstChild.style.width = Math.max(parseFloat(m[1].replace(',','.')), 1.5) + '%';
      });
    });
  }

  /* --- 5. Каскад появления --- */
  var io = (!reduce && 'IntersectionObserver' in window) ? new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){ e.target.setAttribute('data-reveal','in'); io.unobserve(e.target); }
    });
  }, { rootMargin:'0px 0px -6% 0px', threshold:.06 }) : null;

  function reveal(root){
    if(!io) return;
    var n = 0;
    $$('#main-content .card, #main-content > h1, #main-content > h2, .accordion > *, [data-pro-tiles] > *', root)
      .forEach(function(el){
        if(el.hasAttribute('data-reveal')) return;
        el.style.setProperty('--d', Math.min(n, 11) * 52 + 'ms');
        el.setAttribute('data-reveal',''); io.observe(el); n++;
      });
  }

  /* --- 6. Счётчики --- */
  function countUp(el, to, suf){
    var t0 = null;
    (function step(ts){
      if(t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 820, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to % 1 ? (to * e).toFixed(1) : Math.round(to * e)) + suf;
      if(p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  function numbers(root){
    if(reduce) return;
    $$('#main-content .card', root).forEach(function(c){
      var lead = c.firstElementChild;
      if(!lead || lead.dataset.proCount || lead.children.length) return;
      var m = (lead.textContent||'').trim().match(/^(\d+(?:[.,]\d+)?)(%|\s*мин|\s*ч)?$/);
      if(!m) return;
      lead.dataset.proCount = '1';
      countUp(lead, parseFloat(m[1].replace(',','.')), m[2] || '');
    });
  }

  /* --- 7. Спотлайт + наклон карточек --- */
  if(!reduce){
    document.addEventListener('pointermove', function(e){
      var c = e.target.closest && e.target.closest('.card');
      if(!c) return;
      var r = c.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      c.style.setProperty('--mx', x + 'px');
      c.style.setProperty('--my', y + 'px');
      if(r.width < 640){
        c.style.setProperty('--ry', ((x / r.width - .5) * 5).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((.5 - y / r.height) * 5).toFixed(2) + 'deg');
        c.setAttribute('data-tilt','');
      }
    }, { passive:true });
    document.addEventListener('pointerleave', function(e){
      var c = e.target.closest && e.target.closest('.card');
      if(c){ c.removeAttribute('data-tilt'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
    }, true);
  }

  /* --- 8. Ripple --- */
  if(!reduce) document.addEventListener('pointerdown', function(e){
    var b = e.target.closest('button, .btn, [role="button"], #sidebar a, [data-pro-tiles] > *');
    if(!b) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.1;
    var s = document.createElement('span');
    s.style.cssText = 'position:absolute;border-radius:50%;pointer-events:none;background:currentColor;'
      + 'opacity:.2;width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d/2)
      + 'px;top:' + (e.clientY - r.top - d/2) + 'px;transform:scale(0);'
      + 'transition:transform 520ms cubic-bezier(.22,.61,.36,1),opacity 520ms';
    var cs = getComputedStyle(b);
    if(cs.position === 'static') b.style.position = 'relative';
    if(cs.overflow !== 'hidden') b.style.overflow = 'hidden';
    b.appendChild(s);
    requestAnimationFrame(function(){ s.style.transform = 'scale(1)'; s.style.opacity = '0'; });
    setTimeout(function(){ s.remove(); }, 560);
  }, { passive:true });

  /* --- 9. Скролл: тень шапки + полоса прочитанного --- */
  var header = $('#header');
  function onScroll(){
    var y = scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - innerHeight;
    if(header){
      y > 4 ? header.setAttribute('data-scrolled','') : header.removeAttribute('data-scrolled');
      header.style.setProperty('--scrolled', (max > 0 ? (y / max) * 100 : 0).toFixed(2) + '%');
    }
  }
  addEventListener('scroll', onScroll, { passive:true });

  /* --- 10. Переход между разделами --- */
  if(!reduce && document.startViewTransition){
    var main = $('#main-content');
    if(main){
      var nat = main.replaceChildren.bind(main);
      main.replaceChildren = function(){
        var a = arguments;
        document.startViewTransition(function(){ nat.apply(null, a); });
      };
    }
  }

  /* --- 11. Цикл --- */
  function boot(root){
    syncTheme(); syncTitle(); syncSidebar();
    tag(root); reveal(root); numbers(root); onScroll();
  }
  var pending;
  function schedule(root){
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function(){ boot(root || document); });
  }

  ['#main-content','#context-panel','#sidebar','#header'].forEach(function(sel){
    var host = $(sel); if(!host) return;
    new MutationObserver(function(){ schedule(host.id === 'main-content' ? host : document); })
      .observe(host, { childList:true, subtree:true });
  });
  addEventListener('hashchange', function(){ syncTitle(); syncSidebar(); setTimeout(function(){ schedule(); }, 40); });
  addEventListener('resize', syncSidebar, { passive:true });
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes:true, attributeFilter:['class','data-theme','style'] });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ schedule(); });
  else schedule();
})();