// Language switcher functionality
(function() {
  'use strict';

  // Get current language from localStorage or default to 'ru'
  function getCurrentLang() {
    return localStorage.getItem('blog-lang') || 'ru';
  }

  // Set language
  function setLanguage(lang) {
    localStorage.setItem('blog-lang', lang);
    document.documentElement.setAttribute('lang', lang);

    // Update active state on language buttons
    document.querySelectorAll('.lang-switcher button').forEach(function(btn) {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Initialize language on page load
  function initLanguage() {
    var currentLang = getCurrentLang();
    setLanguage(currentLang);
  }

  // Setup event listeners
  function setupEventListeners() {
    document.querySelectorAll('.lang-switcher button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var lang = this.getAttribute('data-lang');
        setLanguage(lang);

        // Redirect to appropriate version of the page
        // For now, we'll just reload the page
        // In the future, you might want to redirect to /en/ or /ru/ versions
        window.location.reload();
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initLanguage();
      setupEventListeners();
    });
  } else {
    initLanguage();
    setupEventListeners();
  }
})();
