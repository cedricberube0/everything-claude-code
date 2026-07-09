# Going live: payments, funnel & the box counter

The site is a **static** site (HTML/CSS/JS on GitHub Pages). That's perfect
for the storefront, but three things need a payment provider and/or a small
backend, because a static page can't take money or remember numbers between
visitors. Here's exactly what to do, cheapest/simplest first.

---

## 1. Take real payments

You do **not** need to build a payment system. Pick one of these:

### Option A — Stripe Payment Links (no code, ~20 min) ⭐ easiest
1. Create a free account at **stripe.com**.
2. Products → add two products:
   - *Seasonal subscription* — recurring, $225 first / $245 after (Stripe supports a discounted first invoice).
   - *One-time Autumn box* — one-time, $280.
3. For each, create a **Payment Link**. Stripe gives you a hosted, secure checkout URL.
4. In `script.js`, point the drawer button at those links instead of `checkout.html`:
   ```js
   // in openOffer(), replace the checkout href:
   var LINKS = {
     subscription: 'https://buy.stripe.com/XXXXXXXX',
     onetime:      'https://buy.stripe.com/YYYYYYYY'
   };
   $('#offer-checkout').setAttribute('href', LINKS[planKey]);
   ```
   Stripe handles cards, Apple/Google Pay, taxes, receipts and refunds. Our
   `checkout.html` then becomes optional (keep it as a branded preview, or drop it).

### Option B — Stripe Checkout with our own page (keep our checkout.html look)
Use our checkout form for contact/delivery, then hand off to Stripe for the
card step. This needs a tiny serverless function (Stripe requires a *secret*
key that must never live in front-end code):
1. Deploy one function (Vercel, Netlify Functions, or Cloudflare Workers — all free tiers) that creates a Checkout Session:
   ```js
   // /api/create-checkout-session
   const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
   module.exports = async (req, res) => {
     const { plan } = JSON.parse(req.body);
     const price = plan === 'subscription' ? 'price_SUB_ID' : 'price_ONETIME_ID';
     const session = await stripe.checkout.sessions.create({
       mode: plan === 'subscription' ? 'subscription' : 'payment',
       line_items: [{ price, quantity: 1 }],
       success_url: 'https://your-site/checkout.html?success=1',
       cancel_url:  'https://your-site/'
     });
     res.json({ url: session.url });
   };
   ```
2. In `checkout.js`, the `Stripe hook-up point` comment shows exactly where to
   `fetch('/api/create-checkout-session')` and redirect to `session.url`.

> ⚠️ Do not collect raw card numbers in our own form for real orders — that
> triggers heavy PCI compliance. The card fields in `checkout.html` are a
> **demo** only. Let Stripe host the card step (Option A or B).

### Option C — Shopify / Squarespace
If you'd rather not touch code at all, a Shopify store handles products,
payments, taxes, inventory (see the counter below) and shipping out of the
box (~$39/mo). You'd rebuild this design as a Shopify theme, or embed a
Shopify "Buy Button" into these pages.

**My recommendation:** start with **Option A (Payment Links)** to sell this
season with zero backend, then graduate to B or C if you want the fully
custom checkout.

---

## 2. Know how many people are buying (the funnel)

Add **Google Analytics 4** (free) plus a few event calls so you can see the
drop-off at each step: *viewed site → opened the box drawer → reached
checkout → purchased.*

1. Create a GA4 property, get your `G-XXXXXXX` id.
2. Add the GA snippet to `<head>` of `index.html` and `checkout.html`.
3. Fire events at the key moments (hooks are already where you need them):
   ```js
   // when the drawer opens (script.js openOffer):
   gtag('event', 'begin_checkout', { plan: planKey, value: plan.price });
   // on the Stripe success page:
   gtag('event', 'purchase', { value: total, currency: 'CAD' });
   ```
4. In GA4 → **Explore → Funnel exploration**, add those steps. You'll see the
   number and % of visitors reaching each stage.

Even simpler: **Stripe's own Dashboard** already shows every completed sale,
revenue, and subscriber count with no setup — great for "how many sold."
Use GA4 on top when you want to see *where people drop off* before buying.

Privacy-friendly alternatives to GA4: **Plausible** or **Fathom** (paid, no
cookie banner needed).

---

## 3. The real box counter (start at 22, count from 0, sold out at 50)

Today the counter is a **display value** set in one place — `script.js`:
```js
var CONFIG = { cap: 50, sold: 22, soldOut: false, ... };
```
Change `sold` and the meter, the drawer scarcity bar and the "X of 50" label
all update. Set `soldOut: true` (or `sold: 50`) and the whole site locks to
**Sold out** and the buttons become "join the waitlist."

But a static site can't *count real sales* — every visitor's browser is
separate, and GitHub Pages has no database. To make it real you need a tiny
shared counter. Two clean ways:

**Easiest — let the store be the source of truth.** If you sell on Shopify (or
via Stripe), set the product inventory to **50**. Shopify auto-decrements on
each sale and marks it sold out at 0 — then you just mirror that number.

**Custom — a 1-endpoint counter** (Cloudflare Workers + KV, or Upstash Redis, free tiers):
- A Stripe **webhook** increments `realSold` by 1 on every completed payment.
- A `GET /api/boxes` returns `{ realSold }`.
- On page load, fetch it and set the display:
  ```js
  fetch('/api/boxes').then(r => r.json()).then(({ realSold }) => {
    CONFIG.sold = Math.min(CONFIG.cap, DISPLAY_START + realSold); // see note
    CONFIG.soldOut = realSold >= CONFIG.cap;                      // true cap = real sales
    renderMeter(); applySoldOut();
  });
  ```

### ⚠️ One decision I need from you
You said: show **22** at launch, but **actually** count from 0 and go sold-out
at **50 real sales**. Those two can't both be literally true unless we decide
how the on-screen number moves. Which do you want?

- **(a) Head start:** screen shows `22 + realSales`. Feels busy immediately,
  but it would read "72 of 50" by the time you truly sell 50. We'd cap the
  *label* at 50 while the true cap is 50 real sales. (Most common growth-marketing choice.)
- **(b) Honest scaling:** screen starts at 22 and climbs to exactly 50 as real
  sales go 0→50 (so "50 of 50" == genuinely sold out). Cleaner story, slightly
  slower-looking momentum.
- **(c) Truthful:** screen shows the real number from 0. Simplest and fully honest.

Tell me **a, b, or c** and I'll wire the counter to match when you set up the
backend/store. Until then the site safely shows a fixed `22 of 50`.
