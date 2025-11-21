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
    defaultWpm: 250,
    maxWpm: 600,
    defaultChunk: 1,
    adaptive: true,
    minDelayMs: 110,
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
      .rsvp-container{margin:1rem 0 1.5rem;}
      .rsvp-panel{background:#111a15;color:var(--text-color, #d1d0c5);border-radius:18px;padding:1.2rem 1.4rem;font-family:-apple-system, system-ui, 'Segoe UI', sans-serif;}
      .rsvp-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:0.75rem;gap:0.75rem;flex-wrap:wrap;}
      .rsvp-header-actions{display:flex;align-items:center;gap:0.65rem;flex-wrap:wrap;justify-content:flex-end;}
      .rsvp-header h2{margin:0;font-size:1rem;color:var(--muted-color, rgba(209, 208, 197, 0.7));letter-spacing:0.04em;text-transform:uppercase;}
      .rsvp-screen{background:var(--sub-color, #1b2620);border:1px solid var(--border-color, #2a2f33);border-radius:16px;min-height:160px;display:flex;align-items:center;justify-content:center;margin-bottom:0.35rem;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(122, 191, 157, 0.06);}
      .rsvp-word{font-size:2.6rem;letter-spacing:0.03em;color:var(--text-color, #d1d0c5);font-weight:700;text-shadow:0 6px 25px rgba(0,0,0,0.35);}
      .rsvp-word .orp{color:var(--select-color, #cb5800);}
      .rsvp-controls{display:flex;flex-direction:column;gap:0.75rem;align-items:stretch;}
      .rsvp-header .rsvp-wpm{display:flex;align-items:center;font-size:0.9rem;color:var(--muted-color, rgba(209, 208, 197, 0.7));gap:0.5rem;}
      .rsvp-controls input[type="number"],
      .rsvp-header .rsvp-wpm input[type="number"]{padding:0.35rem 0.5rem;border-radius:12px;border:1px solid var(--border-color, #2a2f33);background:var(--bg-color-light, #111a15);color:var(--text-color, #d1d0c5);box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);}
      .rsvp-btn{padding:0.35rem 0.85rem;border-radius:var(--border-radius-sm, 10px);border:1px solid transparent;background:none;color:var(--text-color, #d1d0c5);cursor:pointer;transition:all .2s ease;display:inline-flex;align-items:center;gap:0.4rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;}
      .rsvp-play-wrap.nav-item-cta .rsvp-btn.nav-link{border:1px solid rgba(122, 191, 157, 0.25);background:rgba(122, 191, 157, 0.1);box-shadow:var(--card-shadow, 0 10px 25px rgba(3, 8, 5, 0.4));}
      .rsvp-btn.nav-link{color:inherit;text-decoration:none;}
      .rsvp-btn:hover{background:rgba(122, 191, 157, 0.12);color:var(--active-color, #7abf9d);border-color:rgba(122, 191, 157, 0.45);transform:translateY(-1px);}
      .rsvp-progress{width:100%;height:9px;border-radius:999px;background:var(--border-color, #2a2f33);overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.35);}
      .rsvp-progress-bar{height:100%;background:linear-gradient(90deg,var(--active-color, #7abf9d),var(--select-color, #cb5800));width:0%;transition:width .15s ease;}
      .rsvp-warning{background:rgba(122, 191, 157, 0.12);color:var(--active-color, #7abf9d);padding:0.5rem 0.75rem;border-radius:12px;margin-bottom:0.5rem;font-size:0.85rem;border:1px solid rgba(122, 191, 157, 0.35);box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);}
      .rsvp-screen + .rsvp-controls .rsvp-progress{width:100%;}
      .rsvp-screen + .rsvp-controls{margin-top:0.25rem;}
      .rsvp-inline-highlight{background:rgba(203, 88, 0, 0.28);color:inherit;border-radius:8px;padding:0 0.12em;}
      .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
      .rsvp-word[data-rsvp-index]{display:inline;white-space:pre-wrap;transition:none !important;}
      .rsvp-word[data-rsvp-index].rsvp-current{background:rgba(203, 88, 0, 0.28);border-radius:6px;padding:0 0.08em;transition:none !important;}
    `;
    document.head.appendChild(style);
  }
  // Annotate readable text with indexed spans (single source of truth for RSVP)
  function annotateArticleForRsvp(rootSelector = 'article, .post, #content, main'){
    const root = typeof rootSelector === 'string' ? document.querySelector(rootSelector) : rootSelector;
    if(!root) return {words: [], elements: [], root: null, ready: Promise.resolve({words: [], elements: [], root: null})};
    if(root.querySelector('.rsvp-word')){
      const existing = Array.from(root.querySelectorAll('.rsvp-word'));
      const payload = {words: existing.map(el=>el.textContent), elements: existing, root};
      payload.ready = Promise.resolve(payload);
      return payload;
    }

    const WORD_RE = supportsUnicodeProps
      ? /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*(?:[.,!?;:…»«“”„)\]\-—–])?/gu
      : /[^\s\u00A0]+(?:[.,!?;:…»«“”„)\]\-]|—|–)?/g;
    const ignoredTags = /^(SCRIPT|STYLE|CODE|PRE|A|BUTTON|INPUT|TEXTAREA)$/i;
    const wordElements = [];

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        if(!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if(!p || ignoredTags.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        if(p.closest('[data-no-rsvp="true"], table, .commands, .cli')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while(walker.nextNode()){
      textNodes.push(walker.currentNode);
    }

    const processTextNodesInChunks = (nodes, onDone)=>{
      let i = 0;
      const chunk = ()=>{
        const end = Math.min(nodes.length, i + 50);
        for(; i < end; i++){
          const tn = nodes[i];
          const text = tn.nodeValue;
          const parent = tn.parentNode;
          const frag = document.createDocumentFragment();
          let lastIndex = 0;
          let match;
          while((match = WORD_RE.exec(text)) !== null){
            const pre = text.slice(lastIndex, match.index);
            if(pre) frag.appendChild(document.createTextNode(pre));

            const token = match[0];
            const span = document.createElement('span');
            span.className = 'rsvp-word';
            span.setAttribute('data-rsvp-index', wordElements.length);
            span.setAttribute('aria-hidden', 'true');
            span.textContent = token;
            frag.appendChild(span);
            wordElements.push(span);
            lastIndex = match.index + token.length;
          }
          const tail = text.slice(lastIndex);
          if(tail) frag.appendChild(document.createTextNode(tail));
          if(parent) parent.replaceChild(frag, tn);
        }
        if(i < nodes.length){
          if(typeof global.requestIdleCallback === 'function'){
            global.requestIdleCallback(chunk, {timeout:200});
          } else {
            setTimeout(chunk, 16);
          }
        } else {
          onDone();
        }
      };
      chunk();
    };

    const payload = {words: [], elements: wordElements, root, ready: null};
    payload.ready = new Promise(resolve=>{
      if(!textNodes.length){
        const domTokens = (root.innerText || '').trim().split(/\s+/).filter(Boolean).length;
        console.info('rsvp: annotated words count =', 0);
        console.info('rsvp: dom tokens =', domTokens);
        payload.words = [];
        resolve(payload);
        return;
      }
      processTextNodesInChunks(textNodes, ()=>{
        payload.words = wordElements.map(el=>el.textContent);
        const domTokens = (root.innerText || '').trim().split(/\s+/).filter(Boolean).length;
        console.info('rsvp: annotated words count =', payload.words.length);
        console.info('rsvp: dom tokens =', domTokens);
        resolve(payload);
      });
    });

    return payload;
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

  // Highlight RSVP tokens by index without costly DOM rewrites
  function makeRsvpHighlighter(elements){
    let prev = [];
    const scrollIfNeeded = (el)=>{
      if(!el || typeof el.getBoundingClientRect !== 'function') return;
      const rect = el.getBoundingClientRect();
      if(rect.top < 60 || rect.bottom > (window.innerHeight - 60)){
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
      }
    };

    return {
      highlightRange(start, count){
        prev.forEach(idx=>{ const el = elements[idx]; if(el) el.classList.remove('rsvp-current'); });
        const next = [];
        if(start >= 0 && count > 0){
          const end = Math.min(elements.length, Math.max(0, start) + count);
          for(let i = Math.max(0, start); i < end; i++){
            const el = elements[i];
            if(!el) continue;
            el.classList.add('rsvp-current');
            next.push(i);
          }
          if(next.length){
            const centerIdx = next[Math.floor(next.length/2)];
            scrollIfNeeded(elements[centerIdx]);
          }
        }
        prev = next;
      },
      clear(){
        prev.forEach(idx=>{ const el = elements[idx]; if(el) el.classList.remove('rsvp-current'); });
        prev = [];
      }
    };
  }

  // Smoothly sync the scroll position of the article with RSVP progress
  function syncArticleScroll(article, ratio){
    if(typeof window === 'undefined' || !article || ratio < 0) return;
    const doc = article.ownerDocument && article.ownerDocument.documentElement;
    const scrollTop = (window.pageYOffset || (doc && doc.scrollTop) || 0) - ((doc && doc.clientTop) || 0);
    const rect = article.getBoundingClientRect();
    const start = scrollTop + rect.top;
    const travel = Math.max(0, article.scrollHeight - window.innerHeight + 80);

    // Do not move the viewport backwards: clamp the effective ratio so that we
    // never scroll above the current position even if the computed RSVP
    // progress is behind the reader's manual scroll.
    const targetRatio = Math.min(1, ratio);
    const currentRatio = travel > 0 ? Math.min(1, Math.max(0, (scrollTop - start) / travel)) : 0;
    const effectiveRatio = Math.max(targetRatio, currentRatio);

    const target = start + travel * effectiveRatio;
    if(Math.abs(target - scrollTop) > 1){
      window.scrollTo({top: target, behavior: 'smooth'});
    }
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
    const titleId = `${idBase}-title`;
    const descId = `${idBase}-desc`;

    const container = document.createElement('div');
    container.className = 'rsvp-container';
    container.hidden = true;

    const panel = document.createElement('div');
    panel.className = 'rsvp-panel';
    panel.setAttribute('role','group');
    panel.setAttribute('aria-label','Скорочтение');

    const header = document.createElement('div');
    header.className = 'rsvp-header';
    const title = document.createElement('h2');
    title.id = titleId;
    title.textContent = 'Скорочтение';
    panel.setAttribute('aria-labelledby', title.id);

    const desc = document.createElement('p');
    desc.id = descId;
    desc.className = 'sr-only';
    desc.textContent = 'Пробел — play/pause, стрелки — prev/next.';
    panel.setAttribute('aria-describedby', desc.id);
    const headerActions = document.createElement('div');
    headerActions.className = 'rsvp-header-actions';
    header.append(title, headerActions);

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

    const progressWrap = document.createElement('div');
    progressWrap.className = 'rsvp-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'rsvp-progress-bar';
    progressWrap.appendChild(progressBar);

    const playBtn = document.createElement('button');
    playBtn.className = 'rsvp-btn nav-link';
    playBtn.textContent = 'Play / Pause';
    playBtn.title = 'Пробел — воспроизведение/пауза';

    const playWrap = document.createElement('div');
    playWrap.className = 'nav-item nav-item-cta rsvp-play-wrap';
    playWrap.appendChild(playBtn);

    const wpmLabel = document.createElement('label');
    wpmLabel.className = 'rsvp-wpm';
    wpmLabel.textContent = 'WPM';
    const wpmInput = document.createElement('input');
    wpmInput.type = 'number';
    wpmInput.min = '100';
    wpmInput.max = String(state.maxWpm || 1200);
    wpmInput.step = '25';
    wpmInput.value = state.wpm;
    wpmLabel.appendChild(wpmInput);

    headerActions.append(playWrap, wpmLabel);

    controls.append(progressWrap);

    panel.append(header, desc, warning, screen, controls);
    container.appendChild(panel);

    return {container, panel, playBtn, wordBox, wpmInput, progressBar, warning};
  }

  // Runner that handles scheduling
  function createPlayer(words, wordElements, state, ui, article, isPanelOpen){
    let timer = null;
    const freqMapHolder = {data:null, loaded:false};
    let plannedElapsed = 0;
    let startTs = 0;
    let lastStart = 0;

    const highlighter = makeRsvpHighlighter(wordElements);

    const clearHighlights = ()=>highlighter && highlighter.clear();

    const updateProgress = ()=>{
      const midpointOffset = Math.max(0, state.chunk - 1) / 2;
      const progressIndex = Math.max(0, state.index - midpointOffset);
      const ratio = words.length ? Math.min(1, progressIndex / words.length) : 0;
      const percent = ratio * 100;
      ui.progressBar.style.width = percent.toFixed(2) + '%';
      if(state.playing && article && isPanelOpen && isPanelOpen()){
        syncArticleScroll(article, ratio);
      }
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

    const computeWordDuration = (word, wordIndex)=>{
      if(typeof state.wordDuration === 'function'){
        const custom = state.wordDuration(word, wordIndex, state);
        return Math.max(state.minDelayMs || 0, Number.isFinite(custom) ? custom : 0);
      }
      const baseMs = 60000 / state.wpm;
      if(!state.adaptive) return Math.max(state.minDelayMs || 0, baseMs);
      let factor = 1;
      const clean = cleanForTiming(word);
      if(clean.length > state.lenThreshold){
        factor += (clean.length - state.lenThreshold) * state.lenFactorPerChar;
      }
      if(/[.?!…]$/.test(clean)) factor *= state.punctuationFactors.strong;
      else if(/[,:;]$/.test(clean)) factor *= state.punctuationFactors.medium;
      const punctuationBonus = /[.?!…]$/.test(clean) ? 180 : /[,:;]$/.test(clean) ? 110 : 0;
      factor *= lexicalComplexity(clean, state, freqMapHolder.data);
      const duration = Math.max(state.minDelayMs || 0, baseMs * factor + punctuationBonus);
      return duration;
    };

    const chunkDuration = (startIndex)=>{
      let total = 0;
      const end = Math.min(words.length, startIndex + state.chunk);
      for(let i = startIndex; i < end; i++){
        total += computeWordDuration(words[i], i);
      }
      return total;
    };

    const showWord = ()=>{
      if(state.index >= words.length){
        state.playing = false;
        timer = null;
        clearHighlights();
        return;
      }
      const startIndex = state.index;
      const slice = words.slice(startIndex, startIndex + state.chunk);
      const displaySlice = state.splitLongWords ? slice.flatMap(w=>splitLongWord(w, state)) : slice;
      highlighter.highlightRange(startIndex, state.chunk);
      lastStart = startIndex;
      renderSlice(displaySlice);
      state.index += state.chunk;
      updateProgress();

      if(state.playing){
        plannedElapsed += chunkDuration(startIndex);
        const target = startTs + plannedElapsed;
        const delay = Math.max(0, target - performance.now());
        timer = setTimeout(showWord, delay);
      }
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
      plannedElapsed = 0;
      startTs = performance.now();
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
      clearHighlights();
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

    const refreshHighlight = ()=>highlighter.highlightRange(lastStart, state.chunk);

    return {play, pause, stop, next, prev, updateProgress, clearHighlights, refreshHighlight};
  }

  // Main initializer
  function initRsvpReader(userOptions={}){
    const options = {...DEFAULT_OPTIONS, ...userOptions, selectorOverrides: {...DEFAULT_OPTIONS.selectorOverrides, ...(userOptions.selectorOverrides||{})}};
    injectStyles();

    const article = document.querySelector(options.selectorOverrides.article || 'article, .post, main, #content');
    if(!article || article.dataset.rsvpBound === 'true') return;

    const annotation = annotateArticleForRsvp(article);
    const proceed = ({words = [], elements: wordElements = [], root})=>{
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
        maxWpm: options.maxWpm,
        index: 0,
        lenThreshold: options.lenThreshold,
        lenFactorPerChar: options.lenFactorPerChar,
        punctuationFactors: options.punctuationFactors,
        lexicalBase: options.lexicalBase,
        lexicalVowelWeight: options.lexicalVowelWeight,
        lexicalHyphenWeight: options.lexicalHyphenWeight,
        lexicalLengthWeight: options.lexicalLengthWeight,
        minDelayMs: options.minDelayMs,
        splitLongWords: options.splitLongWords,
        wordDuration: options.wordDuration,
        freqMapUrl: options.freqMapUrl,
        enableFreqMap: options.enableFreqMap,
        freqMapTimeoutMs: options.freqMapTimeoutMs,
        freqMapMaxBytes: options.freqMapMaxBytes,
        freqMapMaxEntries: options.freqMapMaxEntries
      };
      let isPanelOpen = false;
      const ui = buildPanel(state, uniqueId('rsvp-panel'));
      const player = createPlayer(words, wordElements, state, ui, article, ()=>isPanelOpen);
      const diagRoot = root || article;
      const siteHeader = document.querySelector('.site-header .container-xl') || document.querySelector('.site-header');
      const headerEl = article.querySelector('.post-header') || titleEl.parentNode || article;

      if(typeof window !== 'undefined'){
        window.rsvp = {words, elements: wordElements, state, player};
        window._rsvp_diagnostics = ()=>{
          const domTokens = (diagRoot && diagRoot.innerText ? diagRoot.innerText : '').trim().split(/\s+/).filter(Boolean);
          return {
            spanCount: wordElements.length,
            first10: words.slice(0, 10),
            last10: words.slice(-10),
            compareFirst30: {
              words: words.slice(0, 30),
              dom: domTokens.slice(0, 30)
            }
          };
        };
      }

      if(siteHeader){
        siteHeader.appendChild(ui.container);
      } else if(headerEl && headerEl.parentNode){
        headerEl.parentNode.insertBefore(ui.container, headerEl.nextSibling);
      } else {
        article.insertBefore(ui.container, article.firstChild);
      }

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
          player.refreshHighlight();
          (ui.playBtn || ui.panel).focus();
        } else {
          player.pause();
          player.clearHighlights();
        }
      };

      const keyHandler = (e)=>{
        if(!isPanelOpen) return;
        const focusInside = ui.panel.contains(document.activeElement);
        if((e.code === 'Space' || e.key === ' ') && focusInside){ e.preventDefault(); player.play(); }
        else if(e.key === 'ArrowRight' && focusInside){ e.preventDefault(); player.next(); }
        else if(e.key === 'ArrowLeft' && focusInside){ e.preventDefault(); player.prev(); }
      };

      // Wiring UI controls
      toggle.addEventListener('click', ()=>setPanelVisibility(!isPanelOpen));
      ui.playBtn.addEventListener('click', ()=>player.play());
      ui.wpmInput.addEventListener('change', ()=>{
        const raw = parseInt(ui.wpmInput.value, 10);
        const clamped = Math.min(state.maxWpm || options.maxWpm || 1200, Math.max(100, raw || options.defaultWpm));
        state.wpm = clamped;
        ui.wpmInput.value = String(clamped);
      });
      ui.panel.addEventListener('keydown', keyHandler);

      // Simple demo mode for localhost or data attribute
      if(location.hostname === 'localhost' || document.body.dataset.demo === 'rsvp'){
        console.info('[RSVP] Demo mode enabled');
        setPanelVisibility(true);
        player.play();
      }
    };

    if(annotation && annotation.ready && typeof annotation.ready.then === 'function'){
      annotation.ready.then(proceed);
    } else {
      proceed(annotation || {});
    }
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
        initRsvpReader({defaultWpm:250, adaptive:true});
      }
    });
    // For SPA/router setups, call initRsvpReader() manually after route changes to reattach the toggle.
  }

  // README (3 строки)
  // 1) Подключите: <script src="/assets/js/rsvp-reader.js" defer></script>
  // 2) Вызовите: initRsvpReader({ selectorOverrides: { article: 'article', title: 'h1' }, defaultWpm: 350, adaptive: true });
  // 3) Кнопка появится возле заголовка статьи, панель раскрывается по клику.
  
  // Список селекторов 4stm4.ru: article, .post, main, #content, h1 — чтобы найти основную статью и заголовок без вмешательства в остальную вёрстку.
  // Консольные проверки в DevTools:
  // console.log('rsvp words:', window.rsvp?.words?.length ?? 'no rsvp object');
  // console.log('dom word count:', document.querySelector('article, .post, #content, main').innerText.trim().split(/\s+/).length);
  // window._rsvp_diagnostics();

})(typeof window !== 'undefined' ? window : globalThis);

// NOTE: экспорт ESM удалён — используйте global initRsvpReader из window.
// Для ESM делайте отдельный бандл с `export default initRsvpReader;`
