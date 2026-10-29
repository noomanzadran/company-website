/* Team + leadership: click a photo or name to open a popup with the full biography.
   Reads the text from the card itself, so it also works in Dari and Pashto. */
(function () {
  var cards = document.querySelectorAll('#team .team-grid .member, #team .org .member');
  if (!cards.length) return;

  var modal = document.createElement('div');
  modal.className = 'team-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.hidden = true;
  modal.innerHTML =
    '<div class="team-modal-box">' +
      '<button type="button" class="team-modal-close" aria-label="Close"><i class="bi bi-x-lg"></i></button>' +
      '<div class="team-modal-photo"></div>' +
      '<h3 class="team-modal-name"></h3>' +
      '<span class="team-modal-role"></span>' +
      '<p class="team-modal-bio"></p>' +
    '</div>';
  document.body.appendChild(modal);

  var lastFocus = null;
  function open(card) {
    var img = card.querySelector('.member-img img');
    var initials = card.querySelector('.initials');
    var photo = modal.querySelector('.team-modal-photo');
    photo.innerHTML = img ? '<img src="' + img.getAttribute('src') + '" alt="">' : '<span>' + (initials ? initials.textContent : '') + '</span>';
    var name = card.querySelector('h4'), role = card.querySelector('h4 + span'), bio = card.querySelector('.member-info p, .bio');
    modal.querySelector('.team-modal-name').textContent = name ? name.textContent : '';
    modal.querySelector('.team-modal-role').textContent = role ? role.textContent : '';
    modal.querySelector('.team-modal-bio').textContent = bio ? bio.textContent : '';
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { modal.classList.add('show'); });
    modal.querySelector('.team-modal-close').focus();
  }
  function close() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(function () { modal.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }

  cards.forEach(function (card) {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('click', function () { open(card); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
    });
  });
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  modal.querySelector('.team-modal-close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
})();