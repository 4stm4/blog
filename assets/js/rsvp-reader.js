/*
 * RSVP Reader for 4stm4.ru
 * Install: <script src="/assets/js/rsvp-reader.js" defer></script>
 * UMD/Global: window.initRsvpReader();
 * ESM build: ship a separate bundle that re-exports initRsvpReader.
 */

(function(global){
  'use strict';

  // Default configuration values tuned for Russian text and blog layout
  const DEFAULT_OPTIONS = {
    selectorOverrides: {
      article: 'article, .post, main, #content',
      title: 'h1'
    },
    defaultWpm: 350,
    defaultChunk: 1,
    adaptive: true,
    lenThreshold: 8,
    lenFactorPerChar: 0.05,
    longWordSplitAt: 16,
    splitLongWords: true,
    punctuationFactors: {
      strong: 2.0, // . ? !
      medium: 1.4 // , ; :
    },
    lexicalBase: 1.0,
    lexicalVowelWeight: 0.05,
    lexicalHyphenWeight: 0.15,
    lexicalLengthWeight: 0.02,
    freqMapUrl: '/freqMap.json',
    enableFreqMap: false,
    freqMapTimeoutMs: 4000,
    freqMapMaxBytes: 2000000,
    freqMapMaxEntries: 120000,
    minWords: 120,
    commandRatioWarn: 0.3,
    idleChunkWords: 20000
  };

  // Unique IDs to avoid aria-labelledby / describedby collisions across instances
  const uniqueId = (()=>{ let i = 0; return (prefix='rsvp')=>`${prefix}-${Date.now()}-${++i}`; })();

  // Small helper for requestIdleCallback fallback
  const ric = (global && global.requestIdleCallback) || function(cb){ return setTimeout(()=>cb({didTimeout:false,timeRemaining:()=>50}), 1); };

  // Feature-detect Unicode property escapes; fall back for older engines/WebViews
  const supportsUnicodeProps = (()=>{
    try {
      new RegExp('\\p{L}', 'u');
      return true;
    } catch (e) {
      return false;
    }
  })();

  // Fallback character class includes Latin, Cyrillic, and common CJK ranges
  const FALLBACK_CLASS = 'A-Za-zА-Яа-яЁё0-9\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uac00-\\ud7af';

  // Injects minimal CSS for modal and button. Keeps it scoped with prefixes to avoid collisions.
  function injectStyles(){
    if (document.getElementById('rsvp-reader-style')) return;
    const style = document.createElement('style');
    style.id = 'rsvp-reader-style';
    style.textContent = `
      .rsvp-toggle{margin-left:0.5rem;padding:0.35rem 0.65rem;border-radius:6px;border:1px solid #4a5568;background:#1a202c;color:#f7fafc;font-size:0.9rem;cursor:pointer;transition:all .2s ease;}
      .rsvp-toggle:hover{background:#2d3748;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,0.15);} 
      .rsvp-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:2147483000;opacity:0;pointer-events:none;transition:opacity .2s ease;}
      .rsvp-backdrop.active{opacity:1;pointer-events:all;}
      .rsvp-modal{background:#0b0f1a;color:#e2e8f0;min-width: min(90vw,720px);max-width: min(95vw,900px);border-radius:14px;padding:1.2rem 1.4rem;box-shadow:0 20px 40px rgba(0,0,0,0.35);position:relative;font-family:-apple-system, system-ui, 'Segoe UI', sans-serif;}
      .rsvp-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;gap:0.5rem;}
      .rsvp-header h2{margin:0;font-size:1rem;color:#cbd5e0;}
      .rsvp-close{background:none;border:none;color:#a0aec0;font-size:1.3rem;cursor:pointer;}
      .rsvp-screen{background:#111827;border:1px solid #2d3748;border-radius:12px;min-height:160px;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;position:relative;overflow:hidden;}
      .rsvp-word{font-size:2.6rem;letter-spacing:0.03em;color:#e2e8f0;font-weight:600;}
      .rsvp-word .orp{color:#f56565;}
      .rsvp-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:0.75rem;align-items:center;}
      .rsvp-controls label{display:flex;flex-direction:column;font-size:0.85rem;color:#a0aec0;gap:0.25rem;}
      .rsvp-controls input[type="number"]{padding:0.35rem 0.5rem;border-radius:8px;border:1px solid #2d3748;background:#1a202c;color:#edf2f7;}
      .rsvp-btn{padding:0.45rem 0.65rem;border-radius:10px;border:1px solid #2d3748;background:#2d3748;color:#e2e8f0;cursor:pointer;transition:background .2s ease;}
      .rsvp-btn:hover{background:#4a5568;}
      .rsvp-progress{width:100%;height:8px;border-radius:999px;background:#2d3748;overflow:hidden;}
      .rsvp-progress-bar{height:100%;background:linear-gradient(90deg,#63b3ed,#f56565);width:0%;transition:width .15s ease;}
      .rsvp-warning{background:#2c5282;color:#bee3f8;padding:0.5rem 0.75rem;border-radius:8px;margin-bottom:0.5rem;font-size:0.85rem;}
      .rsvp-row{display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;}
      .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
    `;
    document.head.appendChild(style);
  }

  // Utility: find closest ancestor matching any selector
  function isInside(element, selectors){
    if (!element) return false;
    return element.closest(selectors);
  }

  // Extract readable text nodes respecting exclusions
  function extractWords(container, options, done){
    const allowed = Array.from(container.querySelectorAll('p, h2, h3, h4, li, blockquote'));
    const words = [];
    const skipSelectors = 'pre, code, table, .commands, .cli, [data-no-rsvp="true"]';
    const pushClean = (text)=>{
      const cleaned = text.replace(/\s+/g,' ').trim();
      if(!cleaned) return;
      // drop footer-like phrases
      if(/понравилась статья|поделиться|рассылка/i.test(cleaned)) return;
      cleaned.split(/\s+/).forEach(w=>words.push(w));
    };

    // Process in idle chunks for huge posts
    let index = 0;
    const processChunk = ()=>{
      const end = Math.min(allowed.length, index + 50);
      for(; index < end; index++){
        const el = allowed[index];
        if(isInside(el, skipSelectors)) continue;
        pushClean(el.textContent || '');
      }
      if(index < allowed.length){
        ric(processChunk);
      } else {
        done(words);
      }
    };
    processChunk();
  }

  // Heuristic for command heavy content
  function computeCommandRatio(text){
    const lines = text.split(/\n+/).filter(Boolean);
    if(!lines.length) return 0;
    const commandLines = lines.filter(l=>/^\s{4}|^\$/.test(l)).length;
    return commandLines / lines.length;
  }

  // Simple cleaner that respects Unicode fallback support (keeps punctuation for timing)
  function cleanForTiming(word){
    return supportsUnicodeProps ? word.replace(/[^\p{L}\p{N}.,;:!?-]/gu,'') : word.replace(new RegExp(`[^${FALLBACK_CLASS}.,;:!?-]`,'g'),'');
  }

  // Lexical complexity heuristic
  function lexicalComplexity(word, options, freqMap){
    let multiplier = options.lexicalBase;
    const clean = (supportsUnicodeProps ? word.replace(/[^\p{L}-]/gu,'') : word.replace(new RegExp(`[^${FALLBACK_CLASS}-]`,'g'))).toLowerCase();
    if(!clean) return 1;
    const vowels = clean.match(/[aeiouаеёиоуыэюя]/gi);
    const vowelCount = vowels ? vowels.length : 0;
    multiplier += vowelCount * options.lexicalVowelWeight;
    const hyphenCount = (clean.match(/-/g)||[]).length;
    multiplier += hyphenCount * options.lexicalHyphenWeight;
    multiplier += Math.max(0, clean.length - options.lenThreshold) * options.lexicalLengthWeight;
    if(freqMap && freqMap[clean] !== undefined){
      // more frequent words reduce multiplier slightly
      const freq = freqMap[clean];
      multiplier *= Math.max(0.6, 1 - Math.min(freq/10000, 0.35));
    }
    return multiplier;
  }

  // Validate and normalize freqMap payloads to avoid heavy or malformed data
  function validateFreqMap(data, options){
    if(!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const cleaned = {};
    const entries = Object.entries(data);
    if(entries.length > options.freqMapMaxEntries) return null;
    for(const [k,v] of entries){
      if(typeof k !== 'string') continue;
      if(typeof v !== 'number' || !isFinite(v) || v < 0) continue;
      const key = k.trim().toLowerCase();
      if(!key) continue;
      cleaned[key] = v;
      if(Object.keys(cleaned).length >= options.freqMapMaxEntries) break;
    }
    return Object.keys(cleaned).length ? cleaned : null;
  }

  // Split very long words for readability
  function splitLongWord(word, options){
    if(!options.splitLongWords || word.length <= options.longWordSplitAt) return [word];
    const parts = [];
    let start = 0;
    while(start < word.length){
      const chunk = word.slice(start, start + options.longWordSplitAt - 1);
      parts.push(chunk + (start + chunk.length < word.length ? '…' : ''));
      start += options.longWordSplitAt - 1;
    }
    return parts;
  }

  // Build ORP highlighting by centering around pivot character
  function formatWord(word){
    const clean = word.trim();
    if(!clean) return {prefix:'', pivot:'', suffix:''};
    const idx = Math.min(Math.max(1, Math.floor(clean.length*0.35)), clean.length-1);
    return {
      prefix: clean.slice(0, idx),
      pivot: clean.charAt(idx),
      suffix: clean.slice(idx+1)
    };
  }

  // Modal builder
  function buildModal(state, idBase){
    const titleId = `${idBase}-title`;
    const descId = `${idBase}-desc`;
    const backdrop = document.createElement('div');
    backdrop.className = 'rsvp-backdrop';
    backdrop.setAttribute('aria-hidden','true');

    const modal = document.createElement('div');
    modal.className = 'rsvp-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','Скорочтение');
    modal.tabIndex = -1; // make focusable for programmatic focus()

    const srReturn = document.createElement('div');
    srReturn.className = 'sr-only';
    srReturn.tabIndex = 0;
    srReturn.textContent = 'Начало диалога скорочтения';

    const header = document.createElement('div');
    header.className = 'rsvp-header';
    const title = document.createElement('h2');
    title.id = titleId;
    title.textContent = 'Скорочтение';
    modal.setAttribute('aria-labelledby', title.id);

    const desc = document.createElement('p');
    desc.id = descId;
    desc.className = 'sr-only';
    desc.textContent = 'Пробел — play/pause, стрелки — prev/next, Esc — закрыть.';
    modal.setAttribute('aria-describedby', desc.id);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'rsvp-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Закрыть (Esc)';
    header.append(title, closeBtn);

    const warning = document.createElement('div');
    warning.className = 'rsvp-warning';
    warning.style.display = 'none';
    warning.textContent = 'Статья содержит много команд — рекомендуем читать обычным видом.';

    const screen = document.createElement('div');
    screen.className = 'rsvp-screen';
    const wordBox = document.createElement('div');
    wordBox.className = 'rsvp-word';
    screen.appendChild(wordBox);

    const controls = document.createElement('div');
    controls.className = 'rsvp-controls';

    const playBtn = document.createElement('button');
    playBtn.className = 'rsvp-btn';
    playBtn.textContent = 'Play / Pause';
    playBtn.title = 'Пробел — воспроизведение/пауза';

    const stopBtn = document.createElement('button');
    stopBtn.className = 'rsvp-btn';
    stopBtn.textContent = 'Stop';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'rsvp-btn';
    prevBtn.textContent = 'Prev (←)';
    const nextBtn = document.createElement('button');
    nextBtn.className = 'rsvp-btn';
    nextBtn.textContent = 'Next (→)';

    const wpmLabel = document.createElement('label');
    wpmLabel.textContent = 'WPM';
    const wpmInput = document.createElement('input');
    wpmInput.type = 'number';
    wpmInput.min = '100';
    wpmInput.max = '1200';
    wpmInput.value = state.wpm;
    wpmLabel.appendChild(wpmInput);

    const chunkLabel = document.createElement('label');
    chunkLabel.textContent = 'Chunk size (слов за тик)';
    const chunkInput = document.createElement('input');
    chunkInput.type = 'number';
    chunkInput.min = '1';
    chunkInput.max = '6';
    chunkInput.value = state.chunk;
    chunkLabel.appendChild(chunkInput);

    const adaptiveLabel = document.createElement('label');
    adaptiveLabel.textContent = 'Адаптивная длительность';
    const adaptiveToggle = document.createElement('button');
    adaptiveToggle.className = 'rsvp-btn';
    adaptiveToggle.textContent = state.adaptive ? 'ON' : 'OFF';
    adaptiveToggle.setAttribute('aria-pressed', state.adaptive);
    adaptiveLabel.appendChild(adaptiveToggle);

    const openOriginal = document.createElement('button');
    openOriginal.className = 'rsvp-btn';
    openOriginal.textContent = 'Открыть оригинал';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'rsvp-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'rsvp-progress-bar';
    progressWrap.appendChild(progressBar);

    const row1 = document.createElement('div');
    row1.className = 'rsvp-row';
    row1.append(playBtn, stopBtn, prevBtn, nextBtn, openOriginal);

    const row2 = document.createElement('div');
    row2.className = 'rsvp-row';
    row2.append(wpmLabel, chunkLabel, adaptiveLabel);

    controls.append(row1, row2, progressWrap);

    modal.append(srReturn, header, desc, warning, screen, controls);
    backdrop.appendChild(modal);

    return {backdrop, modal, closeBtn, playBtn, stopBtn, prevBtn, nextBtn, wordBox, wpmInput, chunkInput, adaptiveToggle, progressBar, openOriginal, warning};
  }

  // Runner that handles scheduling
  function createPlayer(words, state, ui){
    let timer = null;
    const freqMapHolder = {data:null, loaded:false};

    const updateProgress = ()=>{
      const percent = Math.min(100, (state.index / words.length) * 100);
      ui.progressBar.style.width = percent.toFixed(2) + '%';
    };

    const renderSlice = (slice)=>{
      ui.wordBox.textContent = '';
      const target = slice[Math.floor(slice.length/2)] || slice[0] || '';
      const {prefix, pivot, suffix} = formatWord(target);
      const prefixNode = document.createTextNode(prefix);
      const pivotNode = document.createElement('span');
      pivotNode.className = 'orp';
      pivotNode.textContent = pivot;
      const suffixNode = document.createTextNode(suffix);
      ui.wordBox.append(prefixNode, pivotNode, suffixNode);
      if(state.chunk>1){
        const countSpan = document.createElement('span');
        countSpan.className = 'orp';
        countSpan.style.opacity = '.6';
        countSpan.style.fontSize = '.75em';
        countSpan.style.marginLeft = '.4em';
        countSpan.textContent = `(${slice.length})`;
        ui.wordBox.append(' ', countSpan);
      }
    };

    const showWord = ()=>{
      if(state.index >= words.length){
        state.playing = false;
        timer = null;
        return;
      }
      const slice = words.slice(state.index, state.index + state.chunk);
      renderSlice(slice);
      state.index += state.chunk;
      updateProgress();

      if(state.playing){
        const delay = computeDelay(slice, state, freqMapHolder.data);
        timer = setTimeout(showWord, delay);
      }
    };

    const computeDelay = (chunkWords, st, freqMap)=>{
      const baseMs = (60000 / st.wpm) * Math.max(1, chunkWords.length);
      if(!st.adaptive) return baseMs;
      // use max multiplier in chunk to stay safe
      const multipliers = chunkWords.map(w=>{
        let factor = 1;
        const clean = cleanForTiming(w);
        if(clean.length > st.lenThreshold){
          factor += (clean.length - st.lenThreshold) * st.lenFactorPerChar;
        }
        if(/[.?!]$/.test(clean)) factor *= st.punctuationFactors.strong;
        else if(/[,:;]$/.test(clean)) factor *= st.punctuationFactors.medium;
        factor *= lexicalComplexity(clean, st, freqMap);
        return factor;
      });
      return baseMs * Math.max(...multipliers);
    };

    const play = ()=>{
      if(state.index >= words.length) state.index = 0;
      if(state.playing){
        state.playing = false;
        if(timer) clearTimeout(timer);
        timer = null;
        return;
      }
      state.playing = true;
      if(!freqMapHolder.loaded && state.enableFreqMap){
        freqMapHolder.loaded = true;
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), state.freqMapTimeoutMs);
        fetch(state.freqMapUrl, {signal: controller.signal}).then(r=>{
          clearTimeout(timeout);
          if(!r.ok) return null;
          const contentLength = Number(r.headers.get('content-length')||0);
          if(contentLength && contentLength > state.freqMapMaxBytes) return null;
          return r.text().then(text=>{
            if(text.length > state.freqMapMaxBytes) return null;
            let parsed = null;
            try { parsed = JSON.parse(text); } catch(e){ return null; }
            return validateFreqMap(parsed, state);
          });
        }).then(validated=>{ freqMapHolder.data = validated; }).catch(()=>{});
      }
      showWord();
    };

    const pause = ()=>{
      state.playing = false;
      if(timer) clearTimeout(timer);
      timer = null;
    };

    const stop = ()=>{
      pause();
      state.index = 0;
      updateProgress();
      ui.wordBox.textContent = '';
    };

    const next = ()=>{
      pause();
      state.index = Math.min(words.length, state.index + state.chunk);
      showWord();
    };

    const prev = ()=>{
      pause();
      state.index = Math.max(0, state.index - state.chunk);
      showWord();
    };

    return {play, pause, stop, next, prev, updateProgress};
  }

  // Main initializer
  function initRsvpReader(userOptions={}){
    const options = {...DEFAULT_OPTIONS, ...userOptions, selectorOverrides: {...DEFAULT_OPTIONS.selectorOverrides, ...(userOptions.selectorOverrides||{})}};
    injectStyles();

    const article = document.querySelector(options.selectorOverrides.article || 'article, .post, main, #content');
    if(!article || article.dataset.rsvpBound === 'true') return;

    extractWords(article, options, (rawWords)=>{
      // Expand long words
      let words = rawWords.flatMap(w=>splitLongWord(w, options));
      if(words.length < options.minWords) return;

      const commandRatio = computeCommandRatio(article.innerText || '');

      // create button near title (avoid duplicates)
      let titleEl = document.querySelector(options.selectorOverrides.title || 'h1');
      if(!titleEl) titleEl = article.querySelector('h1') || article.querySelector('h2') || article;
      if(titleEl && titleEl.parentNode && titleEl.parentNode.querySelector('.rsvp-toggle')) return;
      const toggle = document.createElement('button');
      toggle.className = 'rsvp-toggle';
      toggle.type = 'button';
      toggle.title = 'Скорочтение (RSVP) — показать модальное окно';
      toggle.textContent = 'Скорочтение';
      titleEl.parentNode.insertBefore(toggle, titleEl.nextSibling);
      article.dataset.rsvpBound = 'true';

      const state = {
        wpm: options.defaultWpm,
        chunk: options.defaultChunk,
        adaptive: options.adaptive,
        index: 0,
        lenThreshold: options.lenThreshold,
        lenFactorPerChar: options.lenFactorPerChar,
        punctuationFactors: options.punctuationFactors,
        lexicalBase: options.lexicalBase,
        lexicalVowelWeight: options.lexicalVowelWeight,
        lexicalHyphenWeight: options.lexicalHyphenWeight,
        lexicalLengthWeight: options.lexicalLengthWeight,
        freqMapUrl: options.freqMapUrl,
        enableFreqMap: options.enableFreqMap,
        freqMapTimeoutMs: options.freqMapTimeoutMs,
        freqMapMaxBytes: options.freqMapMaxBytes,
        freqMapMaxEntries: options.freqMapMaxEntries
      };
      const ui = buildModal(state, uniqueId('rsvp-modal'));
      const player = createPlayer(words, state, ui);
      let lastFocused = null;
      const backgroundContainer = article.closest('main, #content') || article.closest('body') || article;
      let isModalOpen = false;
      let inertApplied = false;
      let prevPointer = '';
      let prevInert = false;

      const openModal = ()=>{
        if(isModalOpen) return;
        lastFocused = document.activeElement;
        document.body.appendChild(ui.backdrop);
        setTimeout(()=>ui.backdrop.classList.add('active'), 10);
        ui.backdrop.setAttribute('aria-hidden','false');
        isModalOpen = true;
        // Prefer focusing the first actionable control for keyboard users
        (ui.playBtn || ui.modal).focus();
        // hide background content from screen readers
        try { backgroundContainer.setAttribute('aria-hidden','true'); } catch(e){/*noop*/ }
        if(backgroundContainer){
          if('inert' in backgroundContainer){
            prevInert = backgroundContainer.inert;
            backgroundContainer.inert = true;
            inertApplied = true;
          } else {
            prevPointer = backgroundContainer.style.pointerEvents;
            backgroundContainer.style.pointerEvents = 'none';
            inertApplied = true;
          }
        }
        if(commandRatio > options.commandRatioWarn){
          ui.warning.style.display = 'block';
        }
        player.updateProgress();
        document.addEventListener('keydown', keyHandler);
      };

      const closeModal = ()=>{
        if(!isModalOpen) return;
        player.pause();
        ui.backdrop.classList.remove('active');
        ui.backdrop.setAttribute('aria-hidden','true');
        setTimeout(()=>{
          if(ui.backdrop.parentNode) ui.backdrop.parentNode.removeChild(ui.backdrop);
        }, 200);
        document.removeEventListener('keydown', keyHandler);
        try { backgroundContainer.removeAttribute('aria-hidden'); } catch(e){/*noop*/ }
        if(inertApplied && backgroundContainer){
          if('inert' in backgroundContainer){
            backgroundContainer.inert = prevInert;
          } else {
            backgroundContainer.style.pointerEvents = prevPointer;
          }
          inertApplied = false;
        }
        isModalOpen = false;
        if(lastFocused && lastFocused.focus) lastFocused.focus();
      };

      const keyHandler = (e)=>{
        if(!isModalOpen) return;
        const focusable = Array.from(ui.modal.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')).filter(el=>!el.disabled);
        const focusInside = ui.modal.contains(document.activeElement);
        if((e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape')){ closeModal(); }
        else if(e.key === 'Tab'){
          if(!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length-1];
          if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
          else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
        }
        else if((e.code === 'Space' || e.key === ' ') && focusInside){ e.preventDefault(); player.play(); }
        else if(e.key === 'ArrowRight' && focusInside){ e.preventDefault(); player.next(); }
        else if(e.key === 'ArrowLeft' && focusInside){ e.preventDefault(); player.prev(); }
      };

      // Wiring UI controls
      toggle.addEventListener('click', openModal);
      ui.closeBtn.addEventListener('click', closeModal);
      ui.backdrop.addEventListener('click', (e)=>{ if(e.target === ui.backdrop) closeModal(); });
      ui.playBtn.addEventListener('click', ()=>player.play());
      ui.stopBtn.addEventListener('click', ()=>player.stop());
      ui.nextBtn.addEventListener('click', ()=>player.next());
      ui.prevBtn.addEventListener('click', ()=>player.prev());
      ui.wpmInput.addEventListener('change', ()=>{ state.wpm = Math.max(100, parseInt(ui.wpmInput.value,10)||options.defaultWpm); });
      ui.chunkInput.addEventListener('change', ()=>{ state.chunk = Math.max(1, parseInt(ui.chunkInput.value,10)||options.defaultChunk); });
      ui.adaptiveToggle.addEventListener('click', ()=>{ state.adaptive = !state.adaptive; ui.adaptiveToggle.textContent = state.adaptive ? 'ON' : 'OFF'; ui.adaptiveToggle.setAttribute('aria-pressed', state.adaptive); });
      ui.openOriginal.addEventListener('click', ()=>{ closeModal(); window.scrollTo({top:0, behavior:'smooth'}); });

      // Simple demo mode for localhost or data attribute
      if(location.hostname === 'localhost' || document.body.dataset.demo === 'rsvp'){
        console.info('[RSVP] Demo mode enabled');
        openModal();
        player.play();
      }
    });
  }

  // Export for ESM and global usage
  if(typeof module !== 'undefined' && module.exports){
    module.exports = initRsvpReader;
  }
  if(typeof define === 'function' && define.amd){
    define([], ()=>initRsvpReader);
  }
  global.initRsvpReader = initRsvpReader;
  if(typeof window !== 'undefined'){
    window.initRsvpReader = initRsvpReader;
  }

  // Auto-init in case consumer wants immediate usage
  if(typeof window !== 'undefined'){
    window.addEventListener('DOMContentLoaded', ()=>{
      if(window.rsvpAutoInit !== false){
        initRsvpReader({defaultWpm:350, adaptive:true});
      }
    });
    // For SPA/router setups, call initRsvpReader() manually after route changes to reattach the toggle.
  }

  // README (3 строки)
  // 1) Подключите: <script src="/assets/js/rsvp-reader.js" defer></script>
  // 2) Вызовите: initRsvpReader({ selectorOverrides: { article: 'article', title: 'h1' }, defaultWpm: 350, adaptive: true });
  // 3) Кнопка появится возле заголовка статьи, модал открывается по клику.

  // Список селекторов 4stm4.ru: article, .post, main, #content, h1 — чтобы найти основную статью и заголовок без вмешательства в остальную вёрстку.

})(typeof window !== 'undefined' ? window : globalThis);

// NOTE: экспорт ESM удалён — используйте global initRsvpReader из window.
// Для ESM делайте отдельный бандл с `export default initRsvpReader;`
