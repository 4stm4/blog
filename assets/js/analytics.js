// Global Umami helpers and additional events
(function() {
  'use strict';

  var SOURCE_STORAGE_KEY = 'blog-analytics-source-props';
  var MAX_PENDING_EVENTS = 50;
  var pendingEvents = [];
  var flushTimer = null;
  var flushAttempts = 0;
  var sourceProps = readSourceProps();

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function readSourceProps() {
    try {
      if (!window.sessionStorage) return {};
      var raw = window.sessionStorage.getItem(SOURCE_STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function writeSourceProps(props) {
    try {
      if (window.sessionStorage) {
        window.sessionStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(props));
      }
    } catch (e) {}
  }

  function collectSourceProps() {
    if (typeof URLSearchParams !== 'function') return {};

    var searchParams = new URLSearchParams(window.location.search || '');
    var nextProps = {};
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    keys.forEach(function(key) {
      var value = searchParams.get(key);
      if (value) {
        nextProps[key] = value;
      }
    });

    var refParam = searchParams.get('ref');
    if (refParam) {
      nextProps.ref = refParam;
    }

    if (Object.keys(nextProps).length) {
      sourceProps = Object.assign({}, sourceProps, nextProps);
      writeSourceProps(sourceProps);
    }

    return nextProps;
  }

  function getTracker() {
    return window.umami && typeof window.umami.track === 'function' ? window.umami : null;
  }

  function normalizeProps(props) {
    var normalized = Object.assign({}, sourceProps);
    if (isPlainObject(props)) {
      Object.assign(normalized, props);
    }
    return normalized;
  }

  function sendToUmami(eventName, props) {
    var tracker = getTracker();
    if (!tracker) return false;

    try {
      tracker.track(eventName, props || {});
      return true;
    } catch (e) {
      return false;
    }
  }

  function flush() {
    if (!getTracker() || !pendingEvents.length) return false;

    while (pendingEvents.length) {
      var event = pendingEvents.shift();
      if (!sendToUmami(event.name, event.props)) {
        pendingEvents.unshift(event);
        return false;
      }
    }

    return true;
  }

  function scheduleFlush() {
    if (flushTimer || flushAttempts >= 10) return;
    flushTimer = window.setTimeout(function() {
      flushTimer = null;
      flushAttempts += 1;
      flush();
      if (pendingEvents.length) {
        scheduleFlush();
      }
    }, 500);
  }

  function capture(eventName, props) {
    if (!eventName) return false;

    var eventProps = normalizeProps(props);
    if (sendToUmami(eventName, eventProps)) {
      flushAttempts = 0;
      flush();
      return true;
    }

    if (pendingEvents.length >= MAX_PENDING_EVENTS) return false;
    pendingEvents.push({ name: eventName, props: eventProps });
    scheduleFlush();
    return true;
  }

  collectSourceProps();

  window.blogAnalytics = window.blogAnalytics || {};
  window.blogAnalytics.track = capture;
  window.blogAnalytics.flush = flush;

  function trackPageview() {
    var pageProps = {
      path: window.location.pathname || '/',
      url: window.location.href
    };

    if (document.referrer) {
      pageProps.referrer = document.referrer;
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

  ready(function() {
    trackPageview();
    trackNavClicks();
    trackFooterCtas();
    trackListingScroll();
    flush();
  });
})();
