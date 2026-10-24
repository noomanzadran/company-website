/* Contact form: sends the message straight to our Gmail through FormSubmit (no server, nothing stored on our side).
   The WhatsApp button opens the same message in WhatsApp instead. */
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;
  var PHONE = '93799781780';
  var EMAIL = 'shams.technology.team@gmail.com';
  var loading = form.querySelector('.loading');
  var sent = form.querySelector('.sent-message');
  var error = form.querySelector('.error-message');
  var button = form.querySelector('button[type="submit"]');

  // "Request a demo" button: fill the subject and put the cursor in the message box
  if (/[?&]demo=1/.test(location.search) && form.elements.subject) {
    form.elements.subject.value = 'Demo request';
    setTimeout(function () { form.elements.name && form.elements.name.focus({ preventScroll: true }); }, 600);
  }

  function show(el, on) { if (el) el.classList.toggle('d-block', on); }
  function value(name) { return (form.elements[name] && form.elements[name].value || '').trim(); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (value('_honey')) return; // spam bot
    show(sent, false); show(error, false); show(loading, true); button.disabled = true;

    fetch('https://formsubmit.co/ajax/' + EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name: value('name'),
        email: value('email'),
        subject: value('subject') || 'New project enquiry',
        message: value('message'),
        _subject: 'Website message: ' + (value('subject') || 'New project enquiry'),
        _replyto: value('email'),
        _template: 'table'
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        show(loading, false); button.disabled = false;
        if (String(data.success) === 'true') { show(sent, true); form.reset(); }
        else {
          // e.g. the first message ever: FormSubmit asks us to activate the form by email
          if (error) error.textContent = data.message || 'Sorry, the message could not be sent. Please try again or contact us on WhatsApp.';
          show(error, true);
        }
      })
      .catch(function () {
        show(loading, false); button.disabled = false;
        if (error) error.textContent = 'Sorry, the message could not be sent. Please try again or contact us on WhatsApp.';
        show(error, true);
      });
  });

  // Open WhatsApp the fastest way:
  // phone -> the WhatsApp app; computer -> the WhatsApp desktop app if installed, otherwise WhatsApp Web directly
  // (skips the slow wa.me -> api.whatsapp.com redirect page).
  function openWhatsApp(text) {
    var t = encodeURIComponent(text);
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = 'whatsapp://send?phone=' + PHONE + '&text=' + t;
      return;
    }
    var appOpened = false;
    var onBlur = function () { appOpened = true; };
    window.addEventListener('blur', onBlur);
    window.location.href = 'whatsapp://send?phone=' + PHONE + '&text=' + t;
    setTimeout(function () {
      window.removeEventListener('blur', onBlur);
      if (!appOpened) window.open('https://web.whatsapp.com/send?phone=' + PHONE + '&text=' + t, '_blank', 'noopener');
    }, 1200);
  }

  var wa = document.getElementById('sendWhatsApp');
  if (wa) wa.addEventListener('click', function () {
    if (!form.reportValidity()) return;
    var text = 'Hello Shams Technology Team,\n\n' + value('message') + '\n\nName: ' + value('name') + '\nEmail: ' + value('email');
    openWhatsApp(text);
  });
})();