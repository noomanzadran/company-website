/* Shams language switcher: English (default), Afghan Dari (fa-AF), Afghan Pashto (ps-AF).

   How it works (no libraries, no server, works offline and on any static host):
   - English text stays in the HTML. Elements that can be translated carry
       data-i18n="key"                    -> the element's own text
       data-i18n-attr="alt:key;title:key" -> attributes (alt, title, placeholder, aria-label, content)
   - Dari and Pashto text lives in assets/i18n/fa-AF.js and assets/i18n/ps-AF.js.
   - This file runs in <head>: it sets <html lang dir>, loads Bootstrap's RTL stylesheet and
     hides the page for a moment so returning Dari/Pashto visitors never see English flash.
   - The visitor's choice is saved in the browser (localStorage key "shams-lang").
     A link can also choose the language: index.html?lang=fa-AF (or ?lang=ps-AF / ?lang=en).
   See docs/I18N.md for how to edit translations. */
(function () {
  'use strict';

  var LANGS = {
    'en':    { dir: 'ltr', label: 'English' },
    'fa-AF': { dir: 'rtl', label: 'دری' },
    'ps-AF': { dir: 'rtl', label: 'پښتو' }
  };
  var ALIASES = { fa: 'fa-AF', prs: 'fa-AF', dari: 'fa-AF', ps: 'ps-AF', pashto: 'ps-AF', en: 'en' };
  var STORE_KEY = 'shams-lang';
  var DICT = window.SHAMS_I18N || {};
  var root = document.documentElement;
  var current = 'en';
  var ready = false;
  var missing = {};

  /* ---------- helpers ---------- */
  function normalize(code) {
    if (!code) return null;
    if (LANGS[code]) return code;
    var c = String(code).toLowerCase();
    for (var k in LANGS) if (k.toLowerCase() === c) return k;
    return ALIASES[c] || null;
  }
  function save(lang) { try { localStorage.setItem(STORE_KEY, lang); } catch (e) {} }
  function initialLang() {
    var m = location.search.match(/[?&]lang=([^&#]+)/);
    var fromUrl = m && normalize(decodeURIComponent(m[1]));
    if (fromUrl) { save(fromUrl); return fromUrl; }
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    return normalize(saved) || 'en';
  }
  function isRtl(lang) { return LANGS[lang].dir === 'rtl'; }

  /* Translation lookup. Falls back to the English text when a key is missing
     (and records it, so missing translations can be listed: ShamsI18n.missing()). */
  function t(key, english) {
    if (current === 'en') return english;
    var d = DICT[current] || {};
    if (Object.prototype.hasOwnProperty.call(d, key) && d[key] !== '') return d[key];
    (missing[current] = missing[current] || {})[key] = english;
    return english;
  }

  /* Western digits -> Eastern (Persian) digits, with Persian separators: 1,234.5% -> ۱٬۲۳۴٫۵٪ */
  var FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  function toEastern(s) {
    return s
      .replace(/(\d),(?=\d{3}(\D|$))/g, '$1٬')
      .replace(/(\d)\.(?=\d)/g, '$1٫')
      .replace(/(\d)\s?%/g, '$1٪')
      .replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; });
  }
  function toWestern(s) {
    return s
      .replace(/[۰-۹]/g, function (d) { return String(FA_DIGITS.indexOf(d)); })
      .replace(/(\d)٬(?=\d)/g, '$1,')
      .replace(/(\d)٫(?=\d)/g, '$1.')
      .replace(/(\d)٪/g, '$1%');
  }
  // Phone numbers, e-mail addresses, code and form fields keep Western digits.
  var KEEP_DIGITS = 'a[href^="tel:"], a[href^="mailto:"], [data-i18n-keep-digits], script, style, textarea, code, pre, svg, .lang-switch';
  function convertDigits(scope, toFa) {
    if (!scope) return;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (toFa ? !/[0-9]/.test(n.nodeValue) : !/[۰-۹]/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        return p && p.closest(KEEP_DIGITS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) { node.nodeValue = toFa ? toEastern(node.nodeValue) : toWestern(node.nodeValue); });
  }

  /* ---------- early phase (runs in <head>, before the page is painted) ---------- */
  function swapBootstrap(lang, animate) {
    var link = document.querySelector('link[href*="assets/vendor/bootstrap/css/bootstrap"]');
    if (!link) return;
    var want = isRtl(lang) ? 'bootstrap.rtl.min.css' : 'bootstrap.min.css';
    var href = link.getAttribute('href').replace(/bootstrap(\.rtl)?\.min\.css/, want);
    if (href === link.getAttribute('href')) return;
    if (!animate) { link.setAttribute('href', href); return; }
    // Load the new stylesheet first, then remove the old one: no unstyled flash while switching.
    var next = link.cloneNode();
    next.setAttribute('href', href);
    next.onload = next.onerror = function () { if (link.parentNode) link.parentNode.removeChild(link); };
    link.parentNode.insertBefore(next, link.nextSibling);
  }

  function setRootAttrs(lang) {
    root.setAttribute('lang', lang);
    root.setAttribute('dir', LANGS[lang].dir);
  }

  current = initialLang();
  setRootAttrs(current);
  swapBootstrap(current, false);
  if (current !== 'en') {
    // Hide the page until the translation has been applied (failsafe: show it after 3 s anyway).
    var hide = document.createElement('style');
    hide.id = 'i18n-pending-style';
    hide.textContent = 'html.i18n-pending body{visibility:hidden}';
    document.head.appendChild(hide);
    root.classList.add('i18n-pending');
    setTimeout(function () { root.classList.remove('i18n-pending'); }, 3000);
  }

  /* ---------- applying a language to the page ---------- */
  var englishText = [];   // [{el, nodes, values}] - original English, kept so English can be restored exactly
  var englishAttrs = [];  // [{el, attr, key, value}]

  function collectEnglish() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var nodes = [];
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3 && /\S/.test(n.nodeValue)) nodes.push(n);
      }
      if (nodes.length) englishText.push({ el: el, key: el.getAttribute('data-i18n'), nodes: nodes, values: nodes.map(function (x) { return x.nodeValue; }) });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-attr]'), function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var i = pair.indexOf(':');
        if (i < 1) return;
        var attr = pair.slice(0, i).trim(), key = pair.slice(i + 1).trim();
        englishAttrs.push({ el: el, attr: attr, key: key, value: el.getAttribute(attr) || '' });
      });
    });
  }

  function applyText(lang) {
    englishText.forEach(function (item) {
      var en = item.values.join(' ').replace(/\s+/g, ' ').trim();
      var text = lang === 'en' ? null : t(item.key, en);
      item.nodes.forEach(function (node, i) {
        if (text === null) { node.nodeValue = item.values[i]; return; }
        if (i > 0) { node.nodeValue = ''; return; }
        // keep the surrounding spaces of the original so spacing between elements stays the same
        var lead = item.values[0].match(/^\s*/)[0], trail = item.values[item.values.length - 1].match(/\s*$/)[0];
        node.nodeValue = lead + text + trail;
      });
    });
    englishAttrs.forEach(function (a) {
      a.el.setAttribute(a.attr, lang === 'en' ? a.value : t(a.key, a.value.replace(/\s+/g, ' ').trim()));
    });
  }

  function updateSwitcher(lang) {
    Array.prototype.forEach.call(document.querySelectorAll('.lang-switch'), function (sw) {
      var cur = sw.querySelector('.lang-current');
      if (cur) { cur.textContent = LANGS[lang].label; cur.setAttribute('lang', lang); cur.setAttribute('dir', LANGS[lang].dir); }
      Array.prototype.forEach.call(sw.querySelectorAll('[data-lang]'), function (b) {
        var on = b.getAttribute('data-lang') === lang;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  }

  function relayout() {
    // Portfolio grid (Isotope): lay items out from the right in RTL.
    if (window.Isotope) {
      if (Isotope.defaults) Isotope.defaults.originLeft = !isRtl(current);
      Array.prototype.forEach.call(document.querySelectorAll('.isotope-container'), function (c) {
        var iso = Isotope.data(c);
        if (iso) { iso.option({ originLeft: !isRtl(current) }); iso.layout(); }
      });
    }
    if (window.AOS && AOS.refresh) AOS.refresh();
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  function apply(lang, fromUser) {
    var prev = current;
    current = lang;
    if (fromUser) { save(lang); swapBootstrap(lang, true); }
    setRootAttrs(lang);
    if (isRtl(prev)) convertDigits(document.body, false);
    applyText(lang);
    if (isRtl(lang)) convertDigits(document.body, true);
    updateSwitcher(lang);
    relayout();
    root.classList.remove('i18n-pending');
    try { document.dispatchEvent(new CustomEvent('shams:languagechange', { detail: { lang: lang, dir: LANGS[lang].dir } })); } catch (e) {}
  }

  /* Animated counters (PureCounter) rewrite their numbers many times: keep them in Eastern digits. */
  function watchCounters() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function (list) {
      if (!isRtl(current)) return;
      list.forEach(function (m) {
        var el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
        if (el && /[0-9]/.test(el.textContent)) el.textContent = toEastern(el.textContent);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.purecounter'), function (el) {
      obs.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* Form validation messages in the visitor's language (the browser's own messages are used for English). */
  function translateValidation() {
    document.addEventListener('invalid', function (e) {
      var f = e.target;
      if (!f || !f.setCustomValidity || current === 'en') return;
      f.setCustomValidity('');
      if (f.validity.valueMissing) f.setCustomValidity(t('common.form-required', 'Please fill out this field.'));
      else if (f.validity.typeMismatch && f.type === 'email') f.setCustomValidity(t('common.form-email', 'Please enter a valid email address.'));
    }, true);
    document.addEventListener('input', function (e) { if (e.target && e.target.setCustomValidity) e.target.setCustomValidity(''); }, true);
  }

  function init() {
    if (ready) return;
    ready = true;
    collectEnglish();
    apply(current, false);
    watchCounters();
    translateValidation();
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.lang-switch [data-lang]');
      if (!b) return;
      var lang = normalize(b.getAttribute('data-lang'));
      if (lang && lang !== current) apply(lang, true);
    });
    // Isotope may be created after images load; make sure it uses the right direction.
    window.addEventListener('load', function () { setTimeout(relayout, 50); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Small public API (used by contact.js and for checking translations in the browser console).
  window.ShamsI18n = {
    t: function (key, english) { return t(key, english); },
    lang: function () { return current; },
    set: function (lang) { lang = normalize(lang); if (lang) apply(lang, true); },
    missing: function () { return missing; },
    languages: LANGS
  };
})();
