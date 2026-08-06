/* =========================================================
   Quiz / welcome popup — "watch the box get filled"
   Flow: fill animation → why question → email + $25 code →
   redirect to the landing page matching their answer.
   Shows once per completed visitor (localStorage); a small
   pill brings it back if they dismiss it mid-way.
   ========================================================= */
(function () {
  'use strict';

  var CODE = 'BIENVENUE25';

  var WHY_PAGES = {
    local: 'why-local.html',
    handmade: 'why-handmade.html',
    decorating: 'why-decorating.html',
    traditions: 'why-traditions.html'
  };

  var ITEMS = [
    { emoji: '🥣', name: 'Stoneware bowl — wheel-thrown by Camille' },
    { emoji: '🕯️', name: 'Beeswax candle — hand-poured by Noor' },
    { emoji: '🧵', name: 'Woven table runner — loomed by Benoît' },
    { emoji: '🧼', name: 'Botanical soap — from Ada’s garden' },
    { emoji: '🖼️', name: 'Original mini print — a guest artist' },
    { emoji: '🌿', name: 'Seasonal table piece — a surprise maker' }
  ];

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var quiz = $('#quiz');
  if (!quiz) return;

  // Waitlist mode: while the pre-launch overlay exists, the quiz stands
  // down entirely. Remove the #waitlist block and the quiz returns.
  if ($('#waitlist')) return;

  var pill = $('#quiz-pill');
  var answer = null;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function done() { try { return localStorage.getItem('mdf_quiz_done') === '1'; } catch (e) { return false; } }
  function dismissedThisSession() { try { return sessionStorage.getItem('mdf_quiz_dismissed') === '1'; } catch (e) { return false; } }

  /* ---------- open / close ---------- */
  function open() {
    quiz.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(function () { quiz.classList.add('is-open'); });
    if (pill) pill.hidden = true;
    var active = $('.quiz__step.is-active .btn, .quiz__step.is-active .quiz__answer', quiz);
    if (active) active.focus();
  }

  function close() {
    quiz.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    setTimeout(function () { quiz.hidden = true; }, 280);
    try { sessionStorage.setItem('mdf_quiz_dismissed', '1'); } catch (e) { /* private mode */ }
    if (!done() && pill) pill.hidden = false;
  }

  /* ---------- step switching ---------- */
  function go(step) {
    $$('.quiz__step', quiz).forEach(function (s) {
      s.classList.toggle('is-active', s.getAttribute('data-step') === step);
    });
    var idx = { fill: 0, why: 1, email: 2 }[step] || 0;
    $$('.quiz__dots span', quiz).forEach(function (d, i) {
      d.classList.toggle('is-on', i <= idx);
    });
  }

  /* ---------- step 1: fill animation ---------- */
  function runFill() {
    var btn = $('#quiz-fill-btn');
    var fill = $('#quiz-box-fill');
    var caption = $('#quiz-caption');
    var scene = $('.quiz__scene', quiz);
    btn.disabled = true;
    btn.textContent = 'Packing…';

    if (reducedMotion) {
      fill.style.height = '100%';
      caption.textContent = 'Packed with all six kinds of handmade 🎁';
      setTimeout(function () { go('why'); }, 700);
      return;
    }

    var i = 0;
    (function next() {
      if (i >= ITEMS.length) {
        caption.textContent = 'Packed and ready 🎁';
        setTimeout(function () { go('why'); }, 850);
        return;
      }
      var item = ITEMS[i];
      var drop = document.createElement('span');
      drop.className = 'quiz__drop';
      drop.textContent = item.emoji;
      scene.appendChild(drop);
      caption.textContent = '+ ' + item.name;
      fill.style.height = Math.round(((i + 1) / ITEMS.length) * 100) + '%';
      setTimeout(function () { drop.remove(); }, 700);
      i++;
      setTimeout(next, 520);
    })();
  }

  /* ---------- step 3: email + code ---------- */
  function initEmail() {
    var form = $('#quiz-form');
    var input = $('#quiz-email');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        input.classList.add('is-invalid');
        input.focus();
        return;
      }
      input.classList.remove('is-invalid');
      // Stash locally for now — wire to your email service later (NOTES.md)
      try {
        localStorage.setItem('mdf_quiz_email', v);
        localStorage.setItem('mdf_quiz_answer', answer || '');
        localStorage.setItem('mdf_quiz_done', '1');
      } catch (e2) { /* private mode */ }
      form.hidden = true;
      $('#quiz-email-sub').textContent = 'Merci! Here’s your code — it’s also saved on this device.';
      $('#quiz-reward').hidden = false;
      $('#quiz-continue').focus();
    });
    input.addEventListener('input', function () { input.classList.remove('is-invalid'); });

    $('#quiz-continue').addEventListener('click', function () {
      location.href = WHY_PAGES[answer] || WHY_PAGES.local;
    });
  }

  /* ---------- wiring ---------- */
  function init() {
    $('#quiz-fill-btn').addEventListener('click', runFill);

    $$('.quiz__answer', quiz).forEach(function (b) {
      b.addEventListener('click', function () {
        answer = b.getAttribute('data-why');
        $$('.quiz__answer', quiz).forEach(function (x) { x.classList.toggle('is-picked', x === b); });
        setTimeout(function () { go('email'); $('#quiz-email').focus(); }, 250);
      });
    });

    initEmail();

    $$('[data-quiz-close]', quiz).forEach(function (el) { el.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !quiz.hidden) close();
    });

    if (pill) pill.addEventListener('click', open);

    // auto-open once, politely
    if (!done()) {
      if (dismissedThisSession()) { pill.hidden = false; }
      else { setTimeout(open, 2200); }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
