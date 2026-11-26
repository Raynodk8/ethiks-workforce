// Ethiks Workforce forms. FORM_ENDPOINT is where enquiries are posted as JSON.
// It points at the Zapier workflow "Ethiks website forms to email", which emails each form to the matching Ethiks inbox.
var FORM_ENDPOINT = 'https://hooks.zapier.com/hooks/catch/25369631/8KvtTZa0at3Oadt9/';

// Click and form counter. Cookieless: nothing is stored on the visitor's device and no form contents are sent.
// Each event records the page, the event and a short label. Counts are read from the ethiks-events Cloudflare Worker.
var EVENTS_ENDPOINT = 'https://ethiks-events.raynodk-0ff.workers.dev/e';
function track(event, label) {
  try {
    var body = JSON.stringify({ e: event, l: String(label || '').replace(/\s+/g, ' ').trim().slice(0, 160), p: location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon(EVENTS_ENDPOINT, body);
    else fetch(EVENTS_ENDPOINT, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' });
  } catch (err) {}
}
document.addEventListener('click', function (e) {
  var el = e.target.closest && e.target.closest('a, button, summary');
  if (!el || el.type === 'submit') return;
  var href = el.getAttribute('href') || '';
  var kind = /^tel:/.test(href) ? 'call' : /^mailto:/.test(href) ? 'email' : el.tagName === 'SUMMARY' ? 'faq_open' : 'click';
  var where = el.closest('header') ? 'menu' : el.closest('footer') ? 'footer' : el.closest('.hero') ? 'top' : 'page';
  var text = el.getAttribute('aria-label') || el.textContent || '';
  track(kind, where + ': ' + text + (kind === 'click' && href ? ' -> ' + href.replace(/^https?:\/\/(www\.)?/, '') : ''));
}, true);
document.querySelectorAll('form[data-form]').forEach(function (form) {
  var started = false;
  form.addEventListener('focusin', function () { if (!started) { started = true; track('form_start', form.getAttribute('data-form')); } });
  form.addEventListener('submit', function () { track('form_submit_click', form.getAttribute('data-form')); }, true);
});


document.querySelectorAll('form[data-form]').forEach(function (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = form.querySelector('.msg');
    var missing = Array.prototype.filter.call(form.querySelectorAll('[required]'), function (el) { return !el.value.trim(); });
    var email = form.querySelector('input[type="email"]');
    var badEmail = email && email.value.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim());
    function show(text, isError) { msg.hidden = false; msg.textContent = text; msg.classList.toggle('err', !!isError); }
    if (missing.length) { track('form_error', form.getAttribute('data-form') + ': missing ' + missing.map(function (el) { return el.name; }).join(', ')); show('Fill in the missing details: ' + missing.map(function (el) { var l = el.closest('label'); return (el.getAttribute('aria-label') || (l ? l.firstChild.textContent : el.name)).trim().toLowerCase(); }).join(', ') + '.', true); missing[0].focus(); return; }
    if (badEmail) { track('form_error', form.getAttribute('data-form') + ': bad email'); show('Check the email address.', true); email.focus(); return; }
    if (!FORM_ENDPOINT) {
      // No form service yet: hand the details to the visitor's own email app, addressed to the right inbox.
      var to = { client: 'workforce@ethiks.co.uk', eligibility: 'funding@ethiks.co.uk', manager: 'managers@ethiks.co.uk' }[form.getAttribute('data-form')] || 'workforce@ethiks.co.uk';
      var subject = { client: 'Site manager request', eligibility: 'Eligibility check', manager: 'Site manager registration' }[form.getAttribute('data-form')] || 'Enquiry';
      var lines = [];
      new FormData(form).forEach(function (v, k) { if (String(v).trim()) lines.push(k.replace(/_/g, ' ') + ': ' + v); });
      location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      show('Your email app should open with your details ready to send. If it does not, email ' + to + '.');
      return;
    }
    var data = { form: form.getAttribute('data-form'), page: location.pathname };
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    var button = form.querySelector('button'); button.disabled = true;
    // Sent as an ordinary form post, so the browser needs no permission check first.
    var body = new URLSearchParams(); Object.keys(data).forEach(function (k) { body.append(k, data[k]); });
    fetch(FORM_ENDPOINT, { method: 'POST', body: body })
      .then(function (r) { if (!r.ok) throw new Error('send failed'); track('form_sent', data.form); form.reset(); show(form.getAttribute('data-form') === 'eligibility' ? 'Thank you. We have your details. We will run the check and email you the answer.' : 'Thank you. We have your details and will call you back.'); })
      .catch(function () { track('form_failed', data.form); show('Sorry, that did not send. Please try again in a moment.', true); })
      .then(function () { button.disabled = false; });
  });
});

// phone menu: the button top right opens and closes the page links
(function () {
  var head = document.querySelector('.head'), btn = document.querySelector('.menu'), nav = document.getElementById('nav');
  if (!head || !btn || !nav) return;
  head.classList.add('has-menu');
  btn.addEventListener('click', function () { var open = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
})();
