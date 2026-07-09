/* =========================================================
   Maison des fêtes — interactions
   Vanilla JS, no dependencies. Progressive: the page is fully
   readable without it; this layer adds behaviour and content.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Data ---------- */
  var SEASON = 'Autumn'; // change to Summer / Winter / Spring to reskin content

  var makers = [
    { name: 'Camille Roy', craft: 'Ceramics', place: 'Hintonburg',
      video: 'Camille wedging clay and pulling a bowl on the wheel',
      blurb: 'Camille throws small-batch stoneware in her Hintonburg studio, glazing each run in colours drawn from the Ottawa Valley — river blues in summer, birch whites in winter.' },
    { name: 'Noor Haddad', craft: 'Candles', place: 'Westboro',
      video: 'Noor hand-pouring beeswax candles, talking about scent design',
      blurb: 'Noor pours beeswax from Ontario apiaries into vintage moulds, building seasonal scents from cedar, orange peel and dried lavender.' },
    { name: 'Benoît Lefebvre', craft: 'Textiles', place: 'Almonte',
      video: 'Benoît weaving linen on his century-old floor loom',
      blurb: 'On a century-old floor loom in Almonte, Benoît weaves table linens and runners in patterns passed down through three generations of weavers.' },
    { name: 'Ada Whitmore', craft: 'Soap & botanicals', place: 'Manotick',
      video: 'Ada cutting cold-process soap and pressing garden botanicals',
      blurb: 'Ada grows the calendula, mint and rose that end up pressed into her cold-process soaps — everything starts in her Manotick garden.' }
  ];

  var boxItems = [
    { name: 'Stoneware serving bowl', by: 'Wheel-thrown by Camille, Hintonburg', photo: 'glazed bowl on linen' },
    { name: 'Hand-poured candle', by: 'Beeswax, poured by Noor, Westboro', photo: 'candle in amber glass' },
    { name: 'Woven table runner', by: 'Loomed by Benoît, Almonte', photo: 'folded linen runner' },
    { name: 'Cold-process soap', by: 'Garden botanicals by Ada, Manotick', photo: 'soap bars with pressed flowers' },
    { name: 'Original mini print', by: 'A rotating guest artist', photo: 'framed print on shelf' },
    { name: 'Seasonal table piece', by: 'A different maker every box', photo: 'centrepiece styled on table' }
  ];

  var faqs = [
    { q: 'Can I pause or cancel?', a: 'After your first two seasons, yes — pause or cancel anytime from your account. No phone calls, no guilt.' },
    { q: 'What if I live outside Ottawa?', a: 'We ship across Ontario and Québec. You cover shipping at cost, calculated at checkout — inside the greenbelt, delivery is free and by hand.' },
    { q: 'Is every box really a surprise?', a: 'Always. We never reveal the full lineup — newsletter readers get exactly one hint per season.' },
    { q: 'Can I send one as a gift?', a: 'The one-time box was made for it. Add a note at checkout and we’ll write it out by hand.' }
  ];

  var TICKS = 50;
  var TICKS_SOLD = 32;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Season text ---------- */
  function applySeason() {
    $$('[data-season]').forEach(function (el) { el.textContent = SEASON; });
    $$('[data-season-upper]').forEach(function (el) { el.textContent = SEASON.toUpperCase(); });
  }

  /* ---------- Countdown to ship date ---------- */
  function updateCountdown() {
    var ship = new Date('2026-09-01T00:00:00');
    var days = Math.max(0, Math.ceil((ship - new Date()) / 86400000));
    var el = $('[data-days-to-ship]');
    if (el) el.textContent = days + ' day' + (days === 1 ? '' : 's');
  }

  /* ---------- Box item cards ---------- */
  function renderBoxItems() {
    var wrap = $('#box-items');
    if (!wrap) return;
    var html = boxItems.map(function (item) {
      return '<article class="box-card">' +
        '<div class="box-card__photo">[ photo: ' + esc(item.photo) + ' ]</div>' +
        '<div class="box-card__body">' +
          '<h3 class="box-card__name">' + esc(item.name) + '</h3>' +
          '<p class="box-card__by">' + esc(item.by) + '</p>' +
        '</div>' +
      '</article>';
    }).join('');
    wrap.innerHTML = html;
  }

  /* ---------- Makers selector ---------- */
  function renderMakers() {
    var list = $('#maker-list');
    if (!list) return;

    makers.forEach(function (m, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'maker-btn';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.innerHTML =
        '<span class="maker-btn__name">' + esc(m.name) + '</span>' +
        '<span class="maker-btn__meta">' + esc(m.craft) + ' · ' + esc(m.place) + '</span>';
      btn.addEventListener('click', function () { selectMaker(i); });
      list.appendChild(btn);
    });

    selectMaker(0);
  }

  function selectMaker(i) {
    var m = makers[i];
    $('#maker-name').textContent = m.name;
    $('#maker-tag').textContent = (m.craft + ' · ' + m.place).toUpperCase();
    $('#maker-blurb').textContent = m.blurb;
    $('#maker-video').textContent = '[ video: ' + m.video + ' ]';
    $$('#maker-list .maker-btn').forEach(function (b, idx) {
      b.setAttribute('aria-selected', idx === i ? 'true' : 'false');
    });
  }

  /* ---------- FAQ accordion ---------- */
  function renderFaq() {
    var wrap = $('#faq');
    if (!wrap) return;

    faqs.forEach(function (f, i) {
      var item = document.createElement('div');
      item.className = 'faq__item';

      var panelId = 'faq-panel-' + i;
      var btnId = 'faq-btn-' + i;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'faq__q';
      btn.id = btnId;
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', panelId);
      btn.innerHTML =
        '<span class="faq__q-text">' + esc(f.q) + '</span>' +
        '<span class="faq__icon" aria-hidden="true">+</span>';

      var panel = document.createElement('div');
      panel.className = 'faq__a';
      panel.id = panelId;
      panel.setAttribute('role', 'region');
      panel.setAttribute('aria-labelledby', btnId);
      panel.innerHTML = '<div class="faq__a-inner">' + esc(f.a) + '</div>';

      btn.addEventListener('click', function () { toggleFaq(btn, panel); });

      item.appendChild(btn);
      item.appendChild(panel);
      wrap.appendChild(item);
    });
  }

  function toggleFaq(btn, panel) {
    var open = btn.getAttribute('aria-expanded') === 'true';
    // close others
    $$('#faq .faq__q').forEach(function (b) {
      if (b !== btn) {
        b.setAttribute('aria-expanded', 'false');
        b.querySelector('.faq__icon').textContent = '+';
        var p = document.getElementById(b.getAttribute('aria-controls'));
        if (p) p.style.maxHeight = null;
      }
    });

    if (open) {
      btn.setAttribute('aria-expanded', 'false');
      btn.querySelector('.faq__icon').textContent = '+';
      panel.style.maxHeight = null;
    } else {
      btn.setAttribute('aria-expanded', 'true');
      btn.querySelector('.faq__icon').textContent = '–';
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
  }

  /* ---------- Tick meter ---------- */
  function renderMeter() {
    var track = $('#meter-track');
    if (!track) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < TICKS; i++) {
      var t = document.createElement('span');
      t.className = 'tick';
      t.dataset.index = i;
      frag.appendChild(t);
    }
    track.appendChild(frag);

    var left = TICKS - TICKS_SOLD;
    var flag = $('#meter-flag');
    if (flag) flag.textContent = 'ONLY ' + left + ' LEFT ↓';

    // Animate the fill once the meter scrolls into view
    var animated = false;
    function fill() {
      if (animated) return;
      animated = true;
      $$('.tick', track).forEach(function (t, i) {
        if (i < TICKS_SOLD) {
          setTimeout(function () { t.classList.add('is-filled'); }, i * 14);
        }
      });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { fill(); io.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(track);
    } else {
      fill();
    }
  }

  /* ---------- Mobile nav ---------- */
  function initNav() {
    var toggle = $('#nav-toggle');
    var links = $('#nav-links');
    if (!toggle || !links) return;

    function close() {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      links.classList.remove('is-open');
    }
    function open() {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      links.classList.add('is-open');
    }

    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') close(); else open();
    });
    // close after choosing a link
    $$('a', links).forEach(function (a) { a.addEventListener('click', close); });
    // close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    // close when resizing back to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) close();
    });
  }

  /* ---------- Sticky header shadow ---------- */
  function initStickyHeader() {
    var nav = $('#nav');
    if (!nav) return;
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
    document.body.prepend(sentinel);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
      });
      io.observe(sentinel);
    } else {
      window.addEventListener('scroll', function () {
        nav.classList.toggle('is-stuck', window.scrollY > 4);
      }, { passive: true });
    }
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Newsletter ---------- */
  function initSignup() {
    var form = $('#signup');
    if (!form) return;
    var input = $('#email');
    var btn = $('#signup-btn');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (!valid) {
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      btn.textContent = 'Merci ✓';
      btn.disabled = true;
      input.value = '';
      input.placeholder = 'You’re on the list.';
    });

    input.addEventListener('input', function () {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    });
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- init ---------- */
  function init() {
    applySeason();
    updateCountdown();
    renderBoxItems();
    renderMakers();
    renderFaq();
    renderMeter();
    initNav();
    initStickyHeader();
    initReveal();
    initSignup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
