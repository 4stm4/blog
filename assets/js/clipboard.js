function createNode(text) {
    const node = document.createElement('pre');
    node.style.width = '1px';
    node.style.height = '1px';
    node.style.position = 'fixed';
    node.style.top = '5px';
    node.textContent = text;
    return node;
  }

  function legacyCopyNode(node) {
    const selection = window.getSelection();

    if (selection == null) {
      return Promise.reject(new Error('Unable to access selection for clipboard copy.'));
    }

    selection.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.addRange(range);

    let result;
    try {
      result = document.execCommand('copy');
    } finally {
      selection.removeAllRanges();
    }

    return result ? Promise.resolve() : Promise.reject(new Error('execCommand copy failed.'));
  }

  function legacyCopyText(text) {
    const body = document.body;

    if (!body) {
      return Promise.reject(new Error('Unable to find document body for clipboard copy.'));
    }

    const node = createNode(text);
    body.appendChild(node);
    return legacyCopyNode(node)
      .finally(() => {
        body.removeChild(node);
      });
  }

  function copyNode(node) {
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      const nodeText = node.textContent != null ? node.textContent : '';
      return navigator.clipboard.writeText(nodeText)
        .catch(() => legacyCopyNode(node));
    }

    return legacyCopyNode(node);
  }

  function copyText(text) {
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      const safeText = text != null ? text : '';
      return navigator.clipboard.writeText(safeText)
        .catch(() => legacyCopyText(text));
    }

    return legacyCopyText(text);
  }
  
  function copy(button) {
    const id = button.getAttribute('for');
    const text = button.getAttribute('value');
  
    function trigger() {
      button.dispatchEvent(new CustomEvent('clipboard-copy', {
        bubbles: true
      }));
    }

    function handleError(error) {
      console.error('clipboard-copy: unable to copy content', error);
    }

    if (text) {
      copyText(text).then(trigger).catch(handleError);
    } else if (id) {
      const root = 'getRootNode' in Element.prototype ? button.getRootNode() : button.ownerDocument;
      if (!(root instanceof Document || 'ShadowRoot' in window && root instanceof ShadowRoot)) return;
      const node = root.getElementById(id);
      if (node) copyTarget(node).then(trigger).catch(handleError);
    }
  }
  
  function copyTarget(content) {
    if (content instanceof HTMLInputElement || content instanceof HTMLTextAreaElement) {
      return copyText(content.value);
    } else if (content instanceof HTMLAnchorElement && content.hasAttribute('href')) {
      return copyText(content.href);
    } else {
      return copyNode(content);
    }
  }
  
  function clicked(event) {
    const button = event.currentTarget;
  
    if (button instanceof HTMLElement) {
      copy(button);
    }
  }
  
  function keydown(event) {
    if (event.key === ' ' || event.key === 'Enter') {
      const button = event.currentTarget;
  
      if (button instanceof HTMLElement) {
        event.preventDefault();
        copy(button);
      }
    }
  }
  
  function focused(event) {
    event.currentTarget.addEventListener('keydown', keydown);
  }
  
  function blurred(event) {
    event.currentTarget.removeEventListener('keydown', keydown);
  }
  
  class ClipboardCopyElement extends HTMLElement {
    constructor() {
      super();
      this.addEventListener('click', clicked);
      this.addEventListener('focus', focused);
      this.addEventListener('blur', blurred);
    }
  
    connectedCallback() {
      if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '0');
      }
  
      if (!this.hasAttribute('role')) {
        this.setAttribute('role', 'button');
      }
    }
  
    get value() {
      return this.getAttribute('value') || '';
    }
  
    set value(text) {
      this.setAttribute('value', text);
    }
  
  }
  
  if (!window.customElements.get('clipboard-copy')) {
    window.ClipboardCopyElement = ClipboardCopyElement;
    window.customElements.define('clipboard-copy', ClipboardCopyElement);
  }
  
  // export default ClipboardCopyElement;
  