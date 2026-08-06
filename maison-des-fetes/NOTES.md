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

**Chosen approach: (c) show the true number from 0** — fully honest. The
on-screen count equals real sales: it starts at `0 of 50` and climbs one box
per real order, locking to **Sold out** at 50.

The counter is a single value in `script.js`:
```js
var CONFIG = { cap: 50, sold: 0, soldOut: false, ... };
```
`sold` is the **real** sales count. Change it (or point it at your store /
Stripe) and the meter, the drawer scarcity bar and the "X of 50" label all
update. Set `soldOut: true` (or `sold: 50`) and the whole site locks to
**Sold out** and the buttons become "join the waitlist."

> Right now `sold: 0`, so the site truthfully shows "0 of 50 · 50 left" until
> real orders exist. If you ever want to hand-set it (e.g. after phone/market
> sales), just edit that one number and redeploy.

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
  // Option (c) — show the true number from 0:
  fetch('/api/boxes').then(r => r.json()).then(({ realSold }) => {
    CONFIG.sold = Math.min(CONFIG.cap, realSold);
    CONFIG.soldOut = realSold >= CONFIG.cap;
    renderMeter(); applySoldOut();
  });
  ```

That's the whole counter: the endpoint returns how many boxes have really
sold, the site shows it, and at 50 it locks itself to **Sold out**. Nothing
else to decide — I'll drop this fetch in when you pick a store/Stripe and have
the endpoint (or inventory) ready.

---

## 4. The quiz popup & the four landing pages

The homepage shows a "watch the box get filled" popup (once per visitor):
fill animation → *why do you want the box?* → email for the **BIENVENUE25**
($25 off) code → redirect to a landing page matched to their answer:

| Answer | Page |
|---|---|
| Support local makers | `why-local.html` |
| Unique, handmade pieces | `why-handmade.html` |
| Effortless holiday decorating | `why-decorating.html` |
| Meaningful holiday traditions | `why-traditions.html` |

Config lives at the top of `popup.js` (code, page mapping, box items).

**Two things to wire before real launch:**

1. **The emails go nowhere yet.** Quiz emails are saved only in the visitor's
   own browser (`localStorage.mdf_quiz_email`, with their answer in
   `mdf_quiz_answer`). To actually collect them, connect an email service —
   Mailchimp/Klaviyo/Beehiiv all give you a form endpoint; replace the
   localStorage lines in `popup.js` with a `fetch()` to that endpoint. Their
   quiz answer makes a great segmentation tag for later campaigns.

2. **The code is cosmetic until payments exist.** `BIENVENUE25` displays and
   even applies −$25 on our demo checkout, but a *real* discount must be
   created in Stripe (Coupon/Promotion Code) or Shopify (Discount code) with
   the same name once you set payments up.

**Funnel measurement:** each answer lands on its own URL, so in GA4 (or even
Stripe) you can see which motivation converts best — that's your ad angle.

---

## 5. The waitlist overlay (pre-launch mode)

The homepage is currently gated by a full-page waitlist overlay: the site
stays fully intact behind it (blurred, faded, unclickable) and the form is
the only entry point. The quiz popup automatically stands down while the
overlay exists.

**Where things live:** markup is the `#waitlist` block at the bottom of
`index.html`; styles in `waitlist.css`; validation/submission in
`waitlist.js`.

**Collecting the responses for real:** submissions are currently saved only
in each visitor's own browser (`localStorage.mdf_waitlist`) — you can't see
them. To receive them, set `WAITLIST_ENDPOINT` at the top of `waitlist.js`
to a form handler URL and every submission is POSTed there as JSON:

- **Formspree** (easiest, free tier): create a form at formspree.io, copy
  the `https://formspree.io/f/XXXX` URL in — done. Entries arrive in your
  Formspree dashboard + email, exportable to CSV.
- **Google Sheets**: a small Apps Script web app that appends rows.
- **Mailchimp/Klaviyo**: use their form endpoint; the JSON field names
  (name, email, location, interest, boxTypes, products, price, buying,
  feedback, maker, consent) map cleanly to merge fields/properties.

**Relaunching the full site later:** delete the `#waitlist` block from
`index.html` plus the `waitlist.css` link and `waitlist.js` script tags.
Nothing else was touched — the site and quiz come back exactly as they were.
