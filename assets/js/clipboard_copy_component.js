const CLIPBOARD_COPY_TIMER_DURATION = 2000;
function showSVG(svg) {
    svg.style.display = 'inline-block';
}
function hideSVG(svg) {
    svg.style.display = 'none';
}
// Toggle a copy button.
function showCopy(button) {
    const [copyIcon, checkIcon] = button.querySelectorAll('.octicon');
    if (!copyIcon || !checkIcon)
        return;
    showSVG(copyIcon);
    hideSVG(checkIcon);
}
// Toggle a copy button.
function showCheck(button) {
    const [copyIcon, checkIcon] = button.querySelectorAll('.octicon');
    if (!copyIcon || !checkIcon)
        return;
    hideSVG(copyIcon);
    showSVG(checkIcon);
}
const clipboardCopyElementTimers = new WeakMap();
document.addEventListener('clipboard-copy', function ({ target }) {
    if (!(target instanceof HTMLElement))
        return;
    const button = target.closest('clipboard-copy');
    if (!(button instanceof HTMLElement))
        return;
    const currentTimeout = clipboardCopyElementTimers.get(button);
    if (currentTimeout) {
        clearTimeout(currentTimeout);
        clipboardCopyElementTimers.delete(button);
    }
    else {
        showCheck(button);
        if (window.posthog && typeof window.posthog.capture === 'function') {
            window.posthog.capture('copy_code');
        }
    }
    clipboardCopyElementTimers.set(button, setTimeout(() => {
        showCopy(button);
        clipboardCopyElementTimers.delete(button);
    }, CLIPBOARD_COPY_TIMER_DURATION));
});
