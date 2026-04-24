(() => {
  const LANG_KEY = 'diana_lang';
  const MSG_CACHE_PREFIX = 'diana_i18n_v1_';

  function getLang() {
    const saved = window.localStorage.getItem(LANG_KEY);
    return saved === 'pt' ? 'pt' : 'en';
  }

  function setLang(lang) {
    window.localStorage.setItem(LANG_KEY, lang);
  }

  function getCachedMessages(lang) {
    try {
      const raw = window.localStorage.getItem(`${MSG_CACHE_PREFIX}${lang}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function setCachedMessages(lang, messages) {
    try {
      window.localStorage.setItem(`${MSG_CACHE_PREFIX}${lang}`, JSON.stringify(messages));
    } catch {
      // ignore storage errors (quota/private mode)
    }
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
    const candidates = [];

    if (scriptUrl) {
      candidates.push(new URL(`../i18n/${lang}.json`, scriptUrl));
    }

    try {
      candidates.push(new URL(`../i18n/${lang}.json`, window.location.href));
      candidates.push(new URL(`src/i18n/${lang}.json`, window.location.href));
    } catch {
      // ignore
    }

    const seen = new Set();
    for (const url of candidates) {
      const key = url.toString();
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const json = await res.json();
        if (json && typeof json === 'object') setCachedMessages(lang, json);
        return json;
      } catch {
        // try next candidate
      }
    }

    return null;
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
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;

    let messages = getCachedMessages(lang);
    applyMessages(messages);
    updateLangToggleButton(lang, messages);

    messages = await loadMessages(lang);
    applyMessages(messages);
    updateLangToggleButton(lang, messages);

    document.addEventListener('click', (e) => {
      const link = e.target && e.target.closest ? e.target.closest('a[aria-disabled="true"]') : null;
      if (link) e.preventDefault();
    });

    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        lang = lang === 'en' ? 'pt' : 'en';
        setLang(lang);
        document.documentElement.lang = lang;
        document.documentElement.dataset.lang = lang;

        messages = getCachedMessages(lang);
        applyMessages(messages);
        updateLangToggleButton(lang, messages);

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
