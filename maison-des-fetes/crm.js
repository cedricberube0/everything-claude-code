/* =========================================================
   Waitlist HQ — private dashboard logic.
   Connects to the Apps Script endpoint (apps-script.gs),
   pulls raw submissions, aggregates client-side, renders
   tiles + single-hue answer charts + timeline + table.
   "demo" as the endpoint renders generated sample data.
   Auto-refreshes every 60s while connected.
   ========================================================= */
(function () {
  'use strict';

  var QUESTIONS = [
    { key: 'interest', title: 'Interest level', multi: false },
    { key: 'price', title: 'Price comfort', multi: false },
    { key: 'buying', title: 'Buying preference', multi: false },
    { key: 'boxTypes', title: 'Box types (multi-select)', multi: true },
    { key: 'products', title: 'Product interest (multi-select)', multi: true },
    { key: 'location', title: 'Top locations', multi: false, freeText: true }
  ];

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  var rows = [];
  var timer = null;

  /* ---------- connection ---------- */
  function saved() {
    try {
      return {
        endpoint: localStorage.getItem('mdf_crm_endpoint') || '',
        key: localStorage.getItem('mdf_crm_key') || ''
      };
    } catch (e) { return { endpoint: '', key: '' }; }
  }

  function connect(endpoint, key, silent) {
    var err = $('#crm-connect-err');
    err.hidden = true;

    var apply = function (data) {
      rows = data;
      try {
        localStorage.setItem('mdf_crm_endpoint', endpoint);
        localStorage.setItem('mdf_crm_key', key);
      } catch (e) { /* private mode */ }
      $('#crm-connect').hidden = true;
      $('#crm-dash').hidden = false;
      $('#crm-refresh').hidden = false;
      $('#crm-settings').hidden = false;
      $('#crm-updated').textContent = 'updated ' + new Date().toLocaleTimeString();
      render();
      if (timer) clearInterval(timer);
      if (endpoint !== 'demo') timer = setInterval(function () { refresh(true); }, 60000);
    };

    if (endpoint === 'demo') { apply(demoRows()); return; }

    fetch(endpoint + (endpoint.indexOf('?') > -1 ? '&' : '?') + 'key=' + encodeURIComponent(key))
      .then(function (r) { return r.json(); })
      .then(function (json) {
        if (!json.ok) throw new Error(json.error || 'unauthorized');
        apply(json.rows || []);
      })
      .catch(function (e) {
        if (silent) return;
        err.hidden = false;
        err.textContent = 'Couldn’t connect: ' + e.message + '. Check the URL and key (NOTES.md has the steps).';
        $('#crm-connect').hidden = false;
        $('#crm-dash').hidden = true;
      });
  }

  function refresh(silent) {
    var s = saved();
    if (!s.endpoint) return;
    connect(s.endpoint, s.key, silent);
  }

  /* ---------- aggregation ---------- */
  function tally(key, multi) {
    var counts = {};
    rows.forEach(function (r) {
      var v = r[key];
      var vals = multi ? (Array.isArray(v) ? v : String(v || '').split(/,\s*/).filter(Boolean)) : [v];
      vals.forEach(function (x) {
        x = String(x == null ? '' : x).trim();
        if (!x) return;
        counts[x] = (counts[x] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .map(function (k) { return { label: k, n: counts[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  function top(key, multi) {
    var t = tally(key, multi);
    return t.length ? t[0].label : '—';
  }

  /* ---------- rendering ---------- */
  function render() {
    var total = rows.length;
    var now = Date.now();
    var week = rows.filter(function (r) { return now - new Date(r.ts).getTime() < 7 * 86400000; }).length;

    $('#crm-tiles').innerHTML = [
      tile('Total signups', total, total ? 'since the waitlist opened' : 'share the link to start collecting'),
      tile('Last 7 days', week, week ? '+' + week + ' new this week' : 'no new signups this week'),
      tile('Winning price', top('price'), 'most-picked price range'),
      tile('Top box', shortLabel(top('boxTypes', true)), 'most-wanted box type')
    ].join('');

    renderTimeline();

    $('#crm-charts').innerHTML = QUESTIONS.map(function (q) {
      var data = tally(q.key, q.multi);
      if (q.freeText) data = data.slice(0, 8);
      var max = data.length ? data[0].n : 1;
      var base = total || 1;
      var bars = data.map(function (d, i) {
        var pct = Math.round(d.n / base * 100);
        return '<div class="crm-bar' + (i === 0 ? ' crm-bar--top' : '') + '" data-tip="' +
          esc(d.n + (d.n === 1 ? ' person' : ' people') + ' · ' + pct + '% of signups') + '">' +
          '<span class="crm-bar__label">' + esc(d.label) + '</span>' +
          '<span class="crm-bar__track"><span class="crm-bar__fill" style="width:' + Math.max(2, Math.round(d.n / max * 100)) + '%"></span></span>' +
          '<span class="crm-bar__val">' + d.n + '</span></div>';
      }).join('');
      return '<div class="crm-panel"><h2 class="crm-panel__title">' + esc(q.title) + '</h2>' +
        (data.length ? '<div class="crm-bars">' + bars + '</div>' : '<p class="crm-panel__note">No answers yet.</p>') +
        (q.multi ? '<p class="crm-panel__note">People can pick several — bars show how many chose each.</p>' : '') +
        '</div>';
    }).join('');

    renderTable();
    initTips();
    $('#crm-export').href = csvUrl();
  }

  function tile(label, value, hint) {
    return '<div class="crm-tile"><div class="crm-tile__label">' + esc(label) + '</div>' +
      '<div class="crm-tile__value">' + esc(value) + '</div>' +
      '<div class="crm-tile__hint">' + esc(hint) + '</div></div>';
  }

  function shortLabel(s) {
    s = String(s);
    return s.length > 26 ? s.slice(0, 24) + '…' : s;
  }

  function renderTimeline() {
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      days.push({ date: d, n: 0 });
    }
    rows.forEach(function (r) {
      var t = new Date(r.ts); t.setHours(0, 0, 0, 0);
      days.forEach(function (day) { if (day.date.getTime() === t.getTime()) day.n++; });
    });
    var max = Math.max.apply(null, days.map(function (d) { return d.n; }).concat([1]));
    $('#crm-timeline').innerHTML = days.map(function (d) {
      var label = (d.date.getMonth() + 1) + '/' + d.date.getDate();
      return '<div class="crm-day" data-tip="' + esc(label + ' · ' + d.n + ' signup' + (d.n === 1 ? '' : 's')) + '">' +
        '<div class="crm-day__bar' + (d.n === 0 ? ' crm-day__bar--zero' : '') + '" style="height:' + Math.max(3, Math.round(d.n / max * 96)) + 'px"></div>' +
        '<span class="crm-day__label">' + label + '</span></div>';
    }).join('');
  }

  function renderTable() {
    var tbody = $('#crm-table tbody');
    var sorted = rows.slice().sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
    tbody.innerHTML = sorted.map(function (r) {
      var extra = '';
      if (r.feedback || r.maker || (r.boxTypes && r.boxTypes.length) || (r.products && r.products.length)) {
        extra = '<details><summary>more</summary>' +
          (r.boxTypes && r.boxTypes.length ? '<p><strong>Boxes:</strong> ' + esc([].concat(r.boxTypes).join(', ')) + '</p>' : '') +
          (r.products && r.products.length ? '<p><strong>Items:</strong> ' + esc([].concat(r.products).join(', ')) + '</p>' : '') +
          (r.feedback ? '<p><strong>Worth buying if:</strong> ' + esc(r.feedback) + '</p>' : '') +
          (r.maker ? '<p><strong>Maker tip:</strong> ' + esc(r.maker) + '</p>' : '') +
          '</details>';
      }
      return '<tr><td>' + esc(new Date(r.ts).toLocaleDateString()) + '</td>' +
        '<td>' + esc(r.name) + '</td><td>' + esc(r.email) + '</td><td>' + esc(r.location || '—') + '</td>' +
        '<td>' + esc(r.interest || '—') + '</td><td>' + esc(r.price || '—') + '</td><td>' + esc(r.buying || '—') + '</td>' +
        '<td>' + extra + '</td></tr>';
    }).join('');
  }

  /* ---------- CSV export ---------- */
  function csvUrl() {
    var head = ['date', 'name', 'email', 'location', 'interest', 'boxTypes', 'products', 'price', 'buying', 'feedback', 'maker'];
    var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
    var lines = [head.join(',')].concat(rows.map(function (r) {
      return [r.ts, r.name, r.email, r.location, r.interest,
        [].concat(r.boxTypes || []).join('; '), [].concat(r.products || []).join('; '),
        r.price, r.buying, r.feedback, r.maker].map(q).join(',');
    }));
    return URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  }

  /* ---------- tooltip ---------- */
  function initTips() {
    var tip = $('#crm-tip');
    document.querySelectorAll('[data-tip]').forEach(function (el) {
      el.addEventListener('mouseenter', function () { tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; });
      el.addEventListener('mousemove', function (e) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; });
      el.addEventListener('mouseleave', function () { tip.hidden = true; });
    });
  }

  /* ---------- demo data ---------- */
  function demoRows() {
    var names = ['Marianne L', 'Sofia R', 'Jenn K', 'Paul B', 'Amelia T', 'Dev P', 'Chloé G', 'Marcus W', 'Rita S', 'Owen H'];
    var locs = ['Ottawa', 'Ottawa', 'Ottawa', 'Gatineau', 'Toronto', 'Sudbury', 'Kanata', 'Ottawa', 'Almonte', 'Orleans'];
    var interests = ['Very interested', 'Very interested', 'Interested, depending on the box', 'Maybe, I\'d like to learn more', 'Very interested', 'Not sure yet'];
    var prices = ['$150-$199', '$200-$249', '$200-$249', 'Under $150', '$250-$299', '$200-$249', '$300+ if the items feel worth it'];
    var buys = ['I\'d try one box first, then maybe subscribe', 'Seasonal membership with recurring boxes', 'One-time box only', 'I\'d try one box first, then maybe subscribe', 'Buying as a gift for someone else'];
    var boxes = ['Christmas / holiday decor box', 'Autumn / fall decor box', 'Winter cozy home box', 'Halloween decor box', 'I\'d be interested in multiple boxes per year', 'Spring / Easter decor box'];
    var prods = ['Handmade candles', 'Handmade ceramic decor', 'Local chocolate or treats', 'Mini garlands / greenery / dried florals', 'Wooden decor pieces', 'Local maker story cards', 'Seasonal coasters', 'Stained glass decor'];
    var out = [];
    for (var i = 0; i < 47; i++) {
      var d = new Date(); d.setDate(d.getDate() - Math.floor(Math.pow(Math.random(), 1.6) * 14));
      out.push({
        ts: d.toISOString(),
        name: names[i % names.length] + (i >= names.length ? ' ' + Math.ceil(i / names.length) : ''),
        email: 'demo' + i + '@example.com',
        location: locs[i % locs.length],
        interest: interests[i % interests.length],
        boxTypes: [boxes[i % boxes.length]].concat(Math.random() > 0.5 ? [boxes[(i + 2) % boxes.length]] : []),
        products: [prods[i % prods.length], prods[(i + 3) % prods.length]],
        price: prices[i % prices.length],
        buying: buys[i % buys.length],
        feedback: i % 4 === 0 ? 'Local chocolate and a candle would make it perfect.' : '',
        maker: i % 7 === 0 ? '@ottawaceramics on Instagram' : '',
        consent: true
      });
    }
    return out;
  }

  /* ---------- init ---------- */
  function init() {
    $('#crm-connect-btn').addEventListener('click', function () {
      connect($('#crm-endpoint').value.trim(), $('#crm-key').value.trim());
    });
    $('#crm-refresh').addEventListener('click', function () { refresh(false); });
    $('#crm-settings').addEventListener('click', function () {
      try { localStorage.removeItem('mdf_crm_endpoint'); localStorage.removeItem('mdf_crm_key'); } catch (e) {}
      location.reload();
    });
    var s = saved();
    if (s.endpoint) {
      $('#crm-endpoint').value = s.endpoint;
      $('#crm-key').value = s.key;
      connect(s.endpoint, s.key, false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
