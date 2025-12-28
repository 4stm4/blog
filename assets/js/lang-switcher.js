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
      },
      projects: {
        intro_text: "Здесь собраны конспекты, инструкции и пошаговые эксперименты для тех, кто настраивает инфраструктуру, пишет код, внедряет системы безопасности и любит разбираться в железе. Свежие заметки выходят регулярно — заглядывайте чаще!",
        header_title: "Открытые проекты 4stm4",
        header_subtitle: "Инструменты, которыми можно пользоваться прямо сейчас — от фоновых пайплайнов до лаборатории для проверки железа.",
        pyjobkit: {
          badge: "Python toolkit",
          lead: "Набор утилит для фоновых заданий, пакетных обработок и пайплайнов, которые запускаются локально или в контейнерах.",
          meta1: "минималистичное API для воркеров",
          meta2: "управление задачами как кодом",
          meta3: "удобное наблюдение за прогрессом",
          cta: "Открыть репозиторий"
        },
        ehatrom: {
          badge: "Rust crate",
          lead: "Библиотека для генерации и анализа EEPROM-образов Raspberry Pi HAT с аккуратной моделью TLV-записей.",
          meta1: "готовые типы `HatEeprom`, `TlvRecord`, `TlvType`",
          meta2: "валидация структуры TLV перед прошивкой",
          meta3: "без ручного редактирования hex-файлов",
          cta: "Открыть репозиторий"
        },
        testum: {
          badge: "Lab automation",
          lead: "Сценарии и инструменты для автоматизации испытаний экспериментальных плат, прошивок и драйверов.",
          meta1: "описание стендов и подключения",
          meta2: "сбор телеметрии и логов",
          meta3: "быстрые отчёты о регрессиях",
          cta: "Открыть репозиторий",
          status: "В работе"
        }
      },
      categories: {
        page_heading: "Категории блога",
        page_intro: "Мы собрали материалы в пять основных направлений — Linux, Programming, Hardware, Security и Tools — чтобы быстрее находить нужные инструкции, конспекты и примеры.",
        materials_with_guides: "материалов с пошаговыми инструкциями и аналитикой."
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
      },
      projects: {
        intro_text: "Here you'll find notes, tutorials, and step-by-step experiments for those who set up infrastructure, write code, implement security systems, and love diving into hardware. Fresh posts appear regularly — check back often!",
        header_title: "4stm4 Open Source Projects",
        header_subtitle: "Tools you can use right now — from background pipelines to hardware testing labs.",
        pyjobkit: {
          badge: "Python toolkit",
          lead: "A set of utilities for background jobs, batch processing, and pipelines that run locally or in containers.",
          meta1: "minimalist API for workers",
          meta2: "manage tasks as code",
          meta3: "convenient progress monitoring",
          cta: "Open repository"
        },
        ehatrom: {
          badge: "Rust crate",
          lead: "A library for generating and analyzing Raspberry Pi HAT EEPROM images with a clean TLV record model.",
          meta1: "ready-to-use `HatEeprom`, `TlvRecord`, `TlvType` types",
          meta2: "TLV structure validation before flashing",
          meta3: "no manual hex file editing",
          cta: "Open repository"
        },
        testum: {
          badge: "Lab automation",
          lead: "Scripts and tools for automating tests of experimental boards, firmware, and drivers.",
          meta1: "test stand and connection descriptions",
          meta2: "telemetry and log collection",
          meta3: "quick regression reports",
          cta: "Open repository",
          status: "In Progress"
        }
      },
      categories: {
        page_heading: "Blog Categories",
        page_intro: "We've organized materials into five main areas — Linux, Programming, Hardware, Security, and Tools — to help you quickly find the guides, notes, and examples you need.",
        materials_with_guides: "posts with step-by-step guides and analysis."
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
