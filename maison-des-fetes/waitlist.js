/* =========================================================
   Waitlist overlay — validation, submission, background lock.
   The live site stays intact behind the overlay: scroll-locked,
   inert (unclickable/untabbable) and visually faded by the CSS.

   Connecting real collection later (see NOTES.md):
   set WAITLIST_ENDPOINT to a form handler URL (Formspree,
   Google Apps Script, your own API…) and every submission is
   POSTed there as JSON. Until then entries are kept in the
   visitor's localStorage under "mdf_waitlist".
   ========================================================= */
(function () {
  'use strict';

  var WAITLIST_ENDPOINT = ''; // e.g. 'https://formspree.io/f/XXXXXXXX'

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var overlay = $('#waitlist');
  if (!overlay) return;

  /* ---------- lock the site behind ---------- */
  function lockBackground() {
    document.body.classList.add('wl-active');
    ['#ribbon', '#nav', '#main', '#offer-modal', '#quiz', '#quiz-pill'].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      el.setAttribute('aria-hidden', 'true');
      try { el.inert = true; } catch (e) { /* older browsers: overlay still covers clicks */ }
    });
    $('#wl-card').focus({ preventScroll: true });
  }

  /* ---------- gather + validate ---------- */
  function collect(form) {
    var val = function (name) { var el = form.elements[name]; return el ? (el.value || '').trim() : ''; };
    var picked = function (name) {
      return $$('input[name="' + name + '"]:checked', form).map(function (i) { return i.value; });
    };
    return {
      name: val('name'),
      email: val('email'),
      location: val('location'),
      interest: picked('interest')[0] || '',
      boxTypes: picked('boxtypes'),
      products: picked('products'),
      price: picked('price')[0] || '',
      buying: picked('buying')[0] || '',
      feedback: val('feedback'),
      maker: val('maker'),
      consent: picked('consent').length > 0,
      submittedAt: new Date().toISOString(),
      source: 'waitlist-overlay'
    };
  }

  function validate(form, data) {
    var firstBad = null;
    var mark = function (el, bad) {
      if (!el) return;
      el.classList.toggle('is-invalid', bad);
      if (bad && !firstBad) firstBad = el;
    };

    mark(form.elements.name, !data.name);
    mark(form.elements.email, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email));
    mark($('[data-group="interest"]', form), !data.interest);
    mark($('[data-group="price"]', form), !data.price);
    mark($('[data-group="buying"]', form), !data.buying);
    mark($('[data-group="consent"]', form), !data.consent);

    return firstBad;
  }

  /* ---------- store / send ---------- */
  function persist(data) {
    try {
      var all = JSON.parse(localStorage.getItem('mdf_waitlist') || '[]');
      all.push(data);
      localStorage.setItem('mdf_waitlist', JSON.stringify(all));
    } catch (e) { /* private mode — endpoint is the real store anyway */ }

    if (WAITLIST_ENDPOINT) {
      // text/plain body = no CORS preflight, which Google Apps Script
      // can't answer. The script JSON-parses the body server-side.
      fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      }).catch(function () { /* keep UX smooth; entry is still in localStorage */ });
    }
  }

  /* ---------- submit flow ---------- */
  function init() {
    lockBackground();

    var form = $('#wl-form');
    var errorLine = $('#wl-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var data = collect(form);
      var firstBad = validate(form, data);

      if (firstBad) {
        errorLine.hidden = false;
        firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var input = firstBad.matches('input, textarea') ? firstBad : $('input', firstBad);
        if (input) input.focus({ preventScroll: true });
        return;
      }

      errorLine.hidden = true;
      persist(data);

      form.hidden = true;
      $('#wl-success').hidden = false;
      $('#wl-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // clear invalid marks as people fix things
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.classList) t.classList.remove('is-invalid');
      var group = t.closest('.is-invalid');
      if (group) group.classList.remove('is-invalid');
      errorLine.hidden = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
