// Global PostHog helpers and additional events
(function() {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function capture(eventName, props) {
    if (!(window.posthog && typeof window.posthog.capture === 'function')) {
      return;
    }
    window.posthog.capture(eventName, props || {});
  }

  function registerSourcesAndPageview() {
    if (!(window.posthog && typeof window.posthog.capture === 'function')) return;

    var searchParams = new URLSearchParams(window.location.search || '');
    var registerProps = {};
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    keys.forEach(function(key) {
      var value = searchParams.get(key);
      if (value) {
        registerProps[key] = value;
      }
    });

    var refParam = searchParams.get('ref');
    if (refParam) {
      registerProps.ref = refParam;
    }

    if (Object.keys(registerProps).length && typeof window.posthog.register === 'function') {
      window.posthog.register(registerProps);
    }

    var pageProps = {
      path: window.location.pathname || '/',
      url: window.location.href
    };

    if (document.referrer) {
      pageProps.referrer = document.referrer;
    }

    if (Object.keys(registerProps).length) {
      Object.assign(pageProps, registerProps);
    }

    capture('pageview', pageProps);
  }

  function trackNavClicks() {
    var navLinks = document.querySelectorAll('.primary-nav .nav-link');
    if (!navLinks.length) return;

    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        capture('nav_click', {
          label: (link.getAttribute('data-i18n') || link.textContent || '').trim(),
          href: link.href,
          path: window.location.pathname
        });
      });
    });
  }

  function trackFooterCtas() {
    var footerLinks = document.querySelectorAll('.footer-links a');
    if (!footerLinks.length) return;

    footerLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        capture('footer_cta_click', {
          label: (link.getAttribute('data-i18n') || link.textContent || '').trim(),
          href: link.href,
          path: window.location.pathname
        });
      });
    });
  }

  function createScrollTracker(eventName) {
    var sent = false;

    function handler() {
      if (sent) return;
      var body = document.body;
      var html = document.documentElement;
      var scrollTop = window.pageYOffset || html.scrollTop || body.scrollTop || 0;
      var viewportHeight = window.innerHeight || html.clientHeight || 0;
      var docHeight = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );

      if (!docHeight) return;
      var progress = (scrollTop + viewportHeight) / docHeight;
      if (progress >= 0.75) {
        capture(eventName, { path: window.location.pathname });
        sent = true;
        window.removeEventListener('scroll', handler);
      }
    }

    window.addEventListener('scroll', handler, { passive: true });
    handler();
  }

  function trackListingScroll() {
    var layout = document.body ? document.body.getAttribute('data-page-layout') : null;
    if (layout === 'home') {
      createScrollTracker('home_scroll_75');
    }

    var path = window.location.pathname || '/';
    var normalizedPath = path.replace(/\/+$/, '');
    if (normalizedPath === '/categories' || path === '/categories/' || path === '/categories/index.html') {
      createScrollTracker('categories_scroll_75');
    }
  }

  function setupFeatureFlags() {
    if (!(window.posthog && typeof window.posthog.onFeatureFlags === 'function')) return;

    window.blogFeatureFlags = window.blogFeatureFlags || {
      flags: [],
      isEnabled: function(flag) {
        return this.flags.indexOf(flag) !== -1;
      }
    };

    window.posthog.onFeatureFlags(function(flags) {
      window.blogFeatureFlags.flags = flags || [];
      if (document.body) {
        document.body.setAttribute('data-feature-flags', window.blogFeatureFlags.flags.join(' '));
      }
    });
  }

  ready(function() {
    registerSourcesAndPageview();
    trackNavClicks();
    trackFooterCtas();
    trackListingScroll();
    setupFeatureFlags();
  });
})();
