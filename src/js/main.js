(() => {
  const LANG_KEY = 'diana_lang';

  function getLang() {
    const saved = window.localStorage.getItem(LANG_KEY);
    return saved === 'pt' ? 'pt' : 'en';
  }

  function setLang(lang) {
    window.localStorage.setItem(LANG_KEY, lang);
  }

  function getScriptUrl() {
    const script = document.querySelector('script[src*="js/main.js"]');
    if (!script) return null;
    try {
      return new URL(script.getAttribute('src') || '', window.location.href);
    } catch {
      return null;
    }
  }

  async function loadMessages(lang) {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) return null;
    const url = new URL(`../i18n/${lang}.json`, scriptUrl);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  }

  function getKey(obj, key) {
    const parts = key.split('.');
    let cur = obj;
    for (const p of parts) {
      if (!cur || typeof cur !== 'object' || !(p in cur)) return null;
      cur = cur[p];
    }
    return typeof cur === 'string' ? cur : null;
  }

  function applyMessages(messages) {
    if (!messages) return;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = key ? getKey(messages, key) : null;
      if (value != null) el.textContent = value;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const value = key ? getKey(messages, key) : null;
      if (value != null) el.innerHTML = value;
    });
  }

  function updateLangToggleButton(lang, messages) {
    const btns = document.querySelectorAll('[data-lang-toggle]');
    if (!btns.length) return;

    const toLang = lang === 'en' ? 'pt' : 'en';
    const labelKey = toLang === 'pt' ? 'lang.button_to_pt' : 'lang.button_to_en';
    const ariaKey = toLang === 'pt' ? 'lang.aria_to_pt' : 'lang.aria_to_en';

    const label = messages ? getKey(messages, labelKey) : null;
    const aria = messages ? getKey(messages, ariaKey) : null;

    btns.forEach((btn) => {
      if (label) btn.textContent = label;
      if (aria) btn.setAttribute('aria-label', aria);
    });
  }

  async function bootI18n() {
    let lang = getLang();
    let messages = await loadMessages(lang);
    applyMessages(messages);
    updateLangToggleButton(lang, messages);

    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        lang = lang === 'en' ? 'pt' : 'en';
        setLang(lang);
        messages = await loadMessages(lang);
        applyMessages(messages);
        updateLangToggleButton(lang, messages);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootI18n);
  } else {
    bootI18n();
  }
})();
