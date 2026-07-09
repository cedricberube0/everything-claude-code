/* =========================================================
   Checkout — reads ?plan=, fills the order summary, validates
   the form. Payment is a front-end demo until Stripe is wired
   up (see NOTES.md). Keep PLANS in sync with script.js CONFIG.
   ========================================================= */
(function () {
  'use strict';

  var PLANS = {
    subscription: {
      name: 'Seasonal subscription',
      sub: 'Autumn Box · delivered this season',
      regular: 280, price: 225,
      recurring: 'Then $245 each season · cancel anytime after two seasons.'
    },
    onetime: {
      name: 'One-time Autumn box',
      sub: 'Autumn Box · no commitment',
      regular: 300, price: 280,
      recurring: 'A single box — no subscription, nothing recurring.'
    }
  };

  var $ = function (s) { return document.querySelector(s); };

  function money(n) { return '$' + n.toFixed(2); }

  function getPlanKey() {
    var p = new URLSearchParams(location.search).get('plan');
    return PLANS[p] ? p : 'subscription';
  }

  function fillSummary(key) {
    var plan = PLANS[key];
    var discount = plan.regular - plan.price;

    $('#sum-name').textContent = plan.name;
    $('#sum-sub').textContent = plan.sub;
    $('#sum-regular').textContent = money(plan.regular);

    var row = $('#sum-discount-row');
    if (discount > 0) {
      row.hidden = false;
      $('#sum-discount').textContent = '−' + money(discount);
      row.querySelector('dt').textContent = key === 'subscription' ? 'First-box discount' : 'Value discount';
    } else {
      row.hidden = true;
    }

    $('#sum-total').textContent = money(plan.price);
    $('#sum-recur').textContent = plan.recurring;

    var saved = $('#co-saved');
    if (discount > 0) { saved.hidden = false; saved.textContent = '🏷 You saved ' + money(discount); }
    else { saved.hidden = true; }

    // gift note is most relevant to one-time / gifting, but keep it for both
    document.title = plan.name + ' — Checkout — Maison des fêtes';
  }

  function initDeliveryToggle() {
    var radios = document.querySelectorAll('input[name="ship"]');
    var out = $('#sum-delivery');
    function sync() {
      var val = document.querySelector('input[name="ship"]:checked').value;
      out.textContent = val === 'ottawa' ? 'Free (Ottawa)' : 'Billed at cost';
    }
    radios.forEach(function (r) { r.addEventListener('change', sync); });
    sync();
  }

  function initForm(key) {
    var form = $('#checkout-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // basic required-field validation
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var valid = input.value.trim() !== '' &&
          (input.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()));
        input.classList.toggle('is-invalid', !valid);
        if (!valid && ok) { input.focus(); ok = false; }
      });
      if (!ok) return;

      // -------------------------------------------------------
      // Stripe hook-up point (see NOTES.md):
      //   fetch('/api/create-checkout-session', { method:'POST',
      //     body: JSON.stringify({ plan: key }) })
      //     .then(r => r.json())
      //     .then(({ url }) => location.href = url);   // Stripe-hosted page
      // For now we show a demo confirmation.
      // -------------------------------------------------------
      var plan = PLANS[key];
      $('#co-success-text').textContent =
        'We’ve noted your ' + plan.name.toLowerCase() +
        '. You’ll get a confirmation email shortly.';
      $('#co-success').hidden = false;
      document.body.style.overflow = 'hidden';
    });

    // clear invalid state as the user types
    form.addEventListener('input', function (e) {
      if (e.target.classList) e.target.classList.remove('is-invalid');
    });
  }

  function initExtras() {
    // express-checkout placeholders
    document.querySelectorAll('[data-express]').forEach(function (b) {
      b.addEventListener('click', function () {
        var note = $('#co-express-note');
        note.textContent = 'Express checkout activates once you connect Stripe / Shop Pay — see NOTES.md.';
        note.style.color = 'var(--terracotta)';
      });
    });
    // discount code (demo)
    var apply = $('#disc-apply');
    if (apply) apply.addEventListener('click', function () {
      var msg = $('#disc-msg');
      var code = ($('#disc-code').value || '').trim();
      msg.hidden = false;
      if (!code) { msg.textContent = 'Enter a code first.'; msg.style.color = 'var(--ink-muted)'; return; }
      msg.textContent = 'Discount codes activate once payments are connected (NOTES.md).';
      msg.style.color = 'var(--ink-muted)';
    });
  }

  function init() {
    var key = getPlanKey();
    fillSummary(key);
    initDeliveryToggle();
    initForm(key);
    initExtras();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
