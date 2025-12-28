// Language switcher functionality
(function() {
  'use strict';

  // Translations object (embedded for client-side switching)
  var translations = {
    ru: {
      skip_to_content: "Перейти к содержимому",
      site_description: "Технический блог инженера о Linux, DevOps, встраиваемых системах и практическом программировании.",
      nav: {
        home: "Главная",
        categories: "Категории",
        projects: "Проекты",
        contact: "Связаться"
      },
      footer: {
        about_title: "О блоге",
        about_text: "Практические заметки о Linux, инфраструктуре, встраиваемых системах и инженерных экспериментах для разработчиков и сисадминов.",
        all_topics: "Все темы",
        write_author: "Написать автору",
        subscription: "Подписка",
        made_with: "Сделано с любовью к инженерии."
      },
      home: {
        all_categories: "Все категории",
        materials_count: "материалов",
        new_materials: "Новые материалы",
        select_by_interests: "Выбрать по интересам",
        read_more: "Читать далее",
        subscribe_heading: "Подпишитесь на обновления",
        subscribe_text: "Получайте свежие инструкции и обзоры о Linux, Raspberry Pi, сетевой безопасности и архитектуре систем. Без спама — только дело.",
        get_news: "Получать новости",
        get_via_rss: "Получать через RSS"
      },
      post: {
        liked_article: "Понравилась статья? Напишите автору на",
        share_link: "или поделитесь ссылкой — это помогает блогу развиваться."
      }
    },
    en: {
      skip_to_content: "Skip to content",
      site_description: "Technical blog of an engineer about Linux, DevOps, embedded systems and practical programming.",
      nav: {
        home: "Home",
        categories: "Categories",
        projects: "Projects",
        contact: "Contact"
      },
      footer: {
        about_title: "About the blog",
        about_text: "Practical notes about Linux, infrastructure, embedded systems and engineering experiments for developers and sysadmins.",
        all_topics: "All topics",
        write_author: "Contact author",
        subscription: "Subscribe",
        made_with: "Made with love for engineering."
      },
      home: {
        all_categories: "All categories",
        materials_count: "posts",
        new_materials: "Recent posts",
        select_by_interests: "Browse by interest",
        read_more: "Read more",
        subscribe_heading: "Subscribe to updates",
        subscribe_text: "Get fresh tutorials and reviews about Linux, Raspberry Pi, network security and system architecture. No spam — just the good stuff.",
        get_news: "Get updates",
        get_via_rss: "Subscribe via RSS"
      },
      post: {
        liked_article: "Liked this article? Write to the author at",
        share_link: "or share the link — it helps the blog grow."
      }
    }
  };

  // Get current language from localStorage or default to 'ru'
  function getCurrentLang() {
    return localStorage.getItem('blog-lang') || 'ru';
  }

  // Apply translations to the page
  function applyTranslations(lang) {
    var t = translations[lang];

    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      var keys = key.split('.');
      var value = t;

      for (var i = 0; i < keys.length; i++) {
        value = value[keys[i]];
        if (!value) break;
      }

      if (value) {
        el.textContent = value;
      }
    });
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

    // Apply translations
    applyTranslations(lang);
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
