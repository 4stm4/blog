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

  // Injects minimal CSS for inline panel and toggle button. Keeps it scoped with prefixes to avoid collisions.
  function injectStyles(){
    if (document.getElementById('rsvp-reader-style')) return;
    const style = document.createElement('style');
    style.id = 'rsvp-reader-style';
    style.textContent = `
      .rsvp-toggle{margin-left:0.5rem;padding:0.35rem 0.65rem;border-radius:10px;border:1px solid var(--border-color, #2a2f33);background:var(--sub-color-light, #242f29);color:var(--text-color, #d1d0c5);font-size:0.9rem;cursor:pointer;transition:all .2s ease;box-shadow:0 6px 18px rgba(4, 17, 12, 0.24);}
      .rsvp-toggle:hover{background:var(--active-color, #7abf9d);color:var(--bg-color, #060c09);border-color:rgba(122, 191, 157, 0.4);transform:translateY(-1px);}
      .rsvp-container{margin:0;}
      .rsvp-panel{background:#111a15;color:var(--text-color, #d1d0c5);border-radius:18px;padding:0;font-family:-apple-system, system-ui, 'Segoe UI', sans-serif;}
      .rsvp-layout{display:grid;grid-template-columns:auto 1fr;gap:1rem;align-items:flex-start;padding:0.75rem;}
      @media (max-width:720px){
        .rsvp-layout{grid-template-columns:1fr;}
      }
      .rsvp-screen-wrap{display:flex;flex-direction:column;gap:0.35rem;width:100%;}
      .rsvp-screen{background:#080c0a;border:1px solid #263d31;border-radius:16px;min-height:120px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(122, 191, 157, 0.06);}
      .rsvp-word{font-size:2.6rem;letter-spacing:0.03em;color:var(--text-color, #d1d0c5);font-weight:700;text-shadow:0 6px 25px rgba(0,0,0,0.35);}
      .rsvp-word .orp{color:var(--select-color, #cb5800);}
      .rsvp-controls{display:flex;flex-direction:column;gap:0.65rem;align-items:stretch;padding:0.25rem 0.75rem 0.75rem;}
      .rsvp-controls label{display:flex;flex-direction:row;align-items:center;font-size:0.9rem;color:var(--muted-color, rgba(209, 208, 197, 0.7));gap:0.5rem;justify-content:space-between;}
      .rsvp-controls input[type="number"]{padding:0.35rem 0.5rem;border-radius:12px;border:1px solid var(--border-color, #2a2f33);background:var(--bg-color-light, #111a15);color:var(--text-color, #d1d0c5);box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);}
      .rsvp-control-btn{display:flex;align-items:center;justify-content:center;gap:0.35rem;padding:0.55rem 0.75rem;border-radius:12px;border:1px solid rgba(122, 191, 157, 0.25);background:rgba(122, 191, 157, 0.1);color:var(--text-color, #d1d0c5);cursor:pointer;transition:all .2s ease;box-shadow:0 10px 25px rgba(3, 8, 5, 0.4);text-transform:uppercase;font-weight:700;letter-spacing:0.05em;}
      .rsvp-control-btn:hover{background:var(--active-color, #7abf9d);color:var(--bg-color, #060c09);border-color:rgba(122, 191, 157, 0.45);transform:translateY(-1px);}
      .rsvp-progress{width:100%;height:9px;border-radius:999px;background:var(--border-color, #2a2f33);overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.35);}
      .rsvp-progress-bar{height:100%;background:linear-gradient(90deg,var(--active-color, #7abf9d),var(--select-color, #cb5800));width:0%;transition:width .15s ease;}
      .rsvp-warning{background:rgba(122, 191, 157, 0.12);color:var(--active-color, #7abf9d);padding:0.5rem 0.75rem;border-radius:12px;margin-bottom:0.5rem;font-size:0.85rem;border:1px solid rgba(122, 191, 157, 0.35);box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);}
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

  // Inline panel builder
  function buildPanel(state, idBase){
    const descId = `${idBase}-desc`;

    const container = document.createElement('div');
    container.className = 'rsvp-container';
    container.hidden = true;

    const panel = document.createElement('div');
    panel.className = 'rsvp-panel';
    panel.setAttribute('role','group');
    panel.setAttribute('aria-label','Скорочтение');

    const desc = document.createElement('p');
    desc.id = descId;
    desc.className = 'sr-only';
    desc.textContent = 'Пробел — play/pause, стрелки — prev/next.';
    panel.setAttribute('aria-describedby', desc.id);

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

    const layout = document.createElement('div');
    layout.className = 'rsvp-layout';

    const screenWrap = document.createElement('div');
    screenWrap.className = 'rsvp-screen-wrap';

    const progressWrap = document.createElement('div');
    progressWrap.className = 'rsvp-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'rsvp-progress-bar';
    progressWrap.appendChild(progressBar);

    const playBtn = document.createElement('button');
    playBtn.className = 'nav-link nav-item-cta rsvp-control-btn';
    playBtn.textContent = 'Play';
    playBtn.title = 'Пробел — воспроизведение';

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'nav-link nav-item-cta rsvp-control-btn';
    pauseBtn.textContent = 'Pause';
    pauseBtn.title = 'Пауза';

    const restartBtn = document.createElement('button');
    restartBtn.className = 'nav-link nav-item-cta rsvp-control-btn';
    restartBtn.textContent = 'Restart';
    restartBtn.title = 'Начать сначала';

    const wpmLabel = document.createElement('label');
    wpmLabel.textContent = 'WPM';
    const wpmInput = document.createElement('input');
    wpmInput.type = 'number';
    wpmInput.min = '100';
    wpmInput.max = '1200';
    wpmInput.step = '25';
    wpmInput.value = state.wpm;
    wpmLabel.appendChild(wpmInput);

    controls.append(wpmLabel, playBtn, pauseBtn, restartBtn);

    screenWrap.append(screen, progressWrap);
    layout.append(controls, screenWrap);

    panel.append(desc, warning, layout);
    container.appendChild(panel);

    return {container, panel, playBtn, pauseBtn, restartBtn, wordBox, wpmInput, progressBar, warning};
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
      if(state.playing) return;
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

    const restart = ()=>{
      stop();
      play();
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

    return {play, pause, stop, restart, next, prev, updateProgress};
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
      toggle.title = 'Скорочтение (RSVP) — показать панель';
      toggle.setAttribute('aria-expanded','false');
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
      const ui = buildPanel(state, uniqueId('rsvp-panel'));
      const player = createPlayer(words, state, ui);
      const headerEl = article.querySelector('.post-header') || titleEl.parentNode || article;
      if(headerEl && headerEl.parentNode){
        headerEl.parentNode.insertBefore(ui.container, headerEl.nextSibling);
      } else {
        article.insertBefore(ui.container, article.firstChild);
      }
      let isPanelOpen = false;

      const setPanelVisibility = (open)=>{
        isPanelOpen = open;
        ui.container.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Скрыть скорочтение' : 'Скорочтение';
        if(open){
          if(commandRatio > options.commandRatioWarn){
            ui.warning.style.display = 'block';
          }
          player.updateProgress();
          (ui.playBtn || ui.panel).focus();
        } else {
          player.pause();
        }
      };

      const keyHandler = (e)=>{
        if(!isPanelOpen) return;
        const focusInside = ui.panel.contains(document.activeElement);
        if((e.code === 'Space' || e.key === ' ') && focusInside){ e.preventDefault(); state.playing ? player.pause() : player.play(); }
        else if(e.key === 'ArrowRight' && focusInside){ e.preventDefault(); player.next(); }
        else if(e.key === 'ArrowLeft' && focusInside){ e.preventDefault(); player.prev(); }
      };

      // Wiring UI controls
      toggle.addEventListener('click', ()=>setPanelVisibility(!isPanelOpen));
      ui.playBtn.addEventListener('click', ()=>player.play());
      ui.pauseBtn.addEventListener('click', ()=>player.pause());
      ui.restartBtn.addEventListener('click', ()=>player.restart());
      ui.wpmInput.addEventListener('change', ()=>{ state.wpm = Math.max(100, parseInt(ui.wpmInput.value,10)||options.defaultWpm); });
      ui.panel.addEventListener('keydown', keyHandler);

      // Simple demo mode for localhost or data attribute
      if(location.hostname === 'localhost' || document.body.dataset.demo === 'rsvp'){
        console.info('[RSVP] Demo mode enabled');
        setPanelVisibility(true);
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
  // 3) Кнопка появится возле заголовка статьи, панель раскрывается по клику.

  // Список селекторов 4stm4.ru: article, .post, main, #content, h1 — чтобы найти основную статью и заголовок без вмешательства в остальную вёрстку.

})(typeof window !== 'undefined' ? window : globalThis);

// NOTE: экспорт ESM удалён — используйте global initRsvpReader из window.
// Для ESM делайте отдельный бандл с `export default initRsvpReader;`
