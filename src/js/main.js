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

  function bootGalleryLightbox() {
    const gallery = document.querySelector('[data-gallery]');
    if (!gallery) return;

    const images = Array.from(gallery.querySelectorAll('img'));
    if (!images.length) return;

    let overlay = document.querySelector('.lightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'lightbox';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-hidden', 'true');

      overlay.innerHTML = `
        <button class="lightbox-close" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4l-4.9-4.9 4.9-4.9a1 1 0 0 0 0-1.4Z"></path>
          </svg>
        </button>
        <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous image">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M14.7 5.7a1 1 0 0 1 0 1.4L10.8 11l3.9 3.9a1 1 0 1 1-1.4 1.4l-4.6-4.6a1 1 0 0 1 0-1.4l4.6-4.6a1 1 0 0 1 1.4 0Z"></path>
          </svg>
        </button>
        <img class="lightbox-image" alt="">
        <button class="lightbox-nav lightbox-next" type="button" aria-label="Next image">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9.3 18.3a1 1 0 0 1 0-1.4l3.9-3.9-3.9-3.9a1 1 0 0 1 1.4-1.4l4.6 4.6a1 1 0 0 1 0 1.4l-4.6 4.6a1 1 0 0 1-1.4 0Z"></path>
          </svg>
        </button>
      `;

      document.body.appendChild(overlay);
    }

    const lightboxImage = overlay.querySelector('.lightbox-image');
    const btnClose = overlay.querySelector('.lightbox-close');
    const btnPrev = overlay.querySelector('.lightbox-prev');
    const btnNext = overlay.querySelector('.lightbox-next');

    let activeIndex = 0;
    let lastFocus = null;

    const setImage = (idx) => {
      const nextIndex = (idx + images.length) % images.length;
      const img = images[nextIndex];
      activeIndex = nextIndex;
      lightboxImage.src = img.currentSrc || img.src;
      lightboxImage.alt = img.alt || `Image ${nextIndex + 1}`;
    };

    const open = (idx) => {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setImage(idx);
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('is-open');
      document.body.classList.add('is-lightbox-open');
      btnClose.focus();
    };

    const close = () => {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('is-open');
      document.body.classList.remove('is-lightbox-open');
      if (lastFocus) lastFocus.focus();
    };

    images.forEach((img, idx) => {
      img.tabIndex = 0;
      img.addEventListener('click', () => open(idx));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(idx);
        }
      });
    });

    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    btnPrev.addEventListener('click', () => setImage(activeIndex - 1));
    btnNext.addEventListener('click', () => setImage(activeIndex + 1));

    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setImage(activeIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setImage(activeIndex + 1);
      }
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

    bootGalleryLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootI18n);
  } else {
    bootI18n();
  }
})();
