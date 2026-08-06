/* =========================================================
   Maison des fêtes — waitlist backend (Google Apps Script)
   Paste this into a Google Sheet's Apps Script editor and
   deploy as a Web App. Full steps in NOTES.md.

   What it does on every waitlist signup:
     1. Appends the full submission to the "Submissions" sheet
     2. Emails all the answers to NOTIFY_EMAIL
   And for the Waitlist HQ dashboard (crm.html):
     3. GET ?key=SECRET returns all rows as JSON
   ========================================================= */

var SECRET = 'CHANGE-ME-to-a-long-random-phrase';   // <- change this!
var NOTIFY_EMAIL = 'maisonsdesfetes@gmail.com';      // <- double-check spelling

var HEADERS = ['ts', 'name', 'email', 'location', 'interest', 'boxTypes',
  'products', 'price', 'buying', 'feedback', 'maker', 'consent'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Submissions') || ss.insertSheet('Submissions');
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

/* ---------- receive a signup ---------- */
function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  sheet_().appendRow([
    new Date(), data.name || '', data.email || '', data.location || '',
    data.interest || '',
    (data.boxTypes || []).join(', '),
    (data.products || []).join(', '),
    data.price || '', data.buying || '',
    data.feedback || '', data.maker || '',
    data.consent ? 'yes' : 'no'
  ]);

  var row = function (q, a) {
    return '<tr><td style="padding:6px 12px 6px 0;color:#8A7960;vertical-align:top;white-space:nowrap">' +
      q + '</td><td style="padding:6px 0;color:#2E2418">' + (a || '—') + '</td></tr>';
  };

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '🎁 New waitlist signup — ' + (data.name || 'someone') +
      (data.location ? ' (' + data.location + ')' : ''),
    htmlBody:
      '<div style="font-family:Georgia,serif;max-width:560px">' +
      '<h2 style="color:#A94E24">New Maison des fêtes waitlist signup</h2>' +
      '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
      row('Name', data.name) +
      row('Email', data.email) +
      row('Location', data.location) +
      row('Interest', data.interest) +
      row('Box types', (data.boxTypes || []).join(', ')) +
      row('Products', (data.products || []).join(', ')) +
      row('Price comfort', data.price) +
      row('Buying preference', data.buying) +
      row('Worth buying if', data.feedback) +
      row('Maker tip', data.maker) +
      row('Consent', data.consent ? 'yes' : 'no') +
      '</table>' +
      '<p style="font-family:Arial,sans-serif;font-size:12px;color:#8A7960">Sent automatically by the waitlist · full stats in your Waitlist HQ page</p>' +
      '</div>'
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- serve the dashboard ---------- */
function doGet(e) {
  var out = function (obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
      .setMimeType(ContentService.MimeType.JSON);
  };

  if (!e || !e.parameter || e.parameter.key !== SECRET) {
    return out({ ok: false, error: 'unauthorized' });
  }

  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return out({ ok: true, rows: [] });

  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var rows = values.map(function (v) {
    return {
      ts: v[0], name: v[1], email: v[2], location: v[3], interest: v[4],
      boxTypes: String(v[5] || '').split(/,\s*/).filter(String),
      products: String(v[6] || '').split(/,\s*/).filter(String),
      price: v[7], buying: v[8], feedback: v[9], maker: v[10],
      consent: v[11] === 'yes'
    };
  });

  return out({ ok: true, rows: rows });
}
