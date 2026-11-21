// Ethiks Workforce forms. FORM_ENDPOINT is where enquiries are posted as JSON.
// It is empty until an inbox or CRM is chosen; while empty, nothing is sent and the form says so.
var FORM_ENDPOINT = '';

document.querySelectorAll('form[data-form]').forEach(function (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = form.querySelector('.msg');
    var missing = Array.prototype.filter.call(form.querySelectorAll('[required]'), function (el) { return !el.value.trim(); });
    var email = form.querySelector('input[type="email"]');
    var badEmail = email && email.value.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim());
    function show(text, isError) { msg.hidden = false; msg.textContent = text; msg.classList.toggle('err', !!isError); }
    if (missing.length) { show('Fill in the missing details: ' + missing.map(function (el) { var l = el.closest('label'); return (el.getAttribute('aria-label') || (l ? l.firstChild.textContent : el.name)).trim().toLowerCase(); }).join(', ') + '.', true); missing[0].focus(); return; }
    if (badEmail) { show('Check the email address.', true); email.focus(); return; }
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
    fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error('send failed'); form.reset(); show('Thank you. We have your details and will call you back.'); })
      .catch(function () { show('Sorry, that did not send. Please try again in a moment.', true); })
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
