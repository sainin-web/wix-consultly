/**
 * Iframe height reporting for the Wix embed.
 *
 * ── WHY THE OLD VERSION PRODUCED BLANK SPACE ────────────────────────────────
 * The previous implementation never measured content on the dashboard. It ran:
 *
 *     getDashboardIframeHeight() =
 *         max(900, window.screen.height * 0.92, viewportHeight)
 *
 * On a 1080p screen that is ~993px for EVERY page, no matter how little content
 * was rendered — so the iframe was always ~1000px tall and the leftover area
 * showed as blank space. A `clampIframeHeight()` floor of 500px meant it could
 * never shrink below that either. The CSS `min-height` rules were a companion
 * symptom, not the cause: the height was decided here, in JS, from screen size.
 *
 * ── WHAT IT DOES NOW ────────────────────────────────────────────────────────
 * Measures the real rendered height of the app's content element and reports it,
 * driven by a ResizeObserver so any content change (route, API data, table rows,
 * form open/close) updates the height — upward AND downward.
 */

export const IFRAME_HEIGHT_MESSAGE = "IFRAME_HEIGHT";

/**
 * Absolute floor. Deliberately tiny — just enough that a mid-render empty frame
 * does not collapse to 0px and make the widget disappear. This is NOT a layout
 * height; real pages always measure larger than this.
 */
export const IFRAME_MIN_HEIGHT = 120;

/** Sanity ceiling to guard against a runaway measurement feedback loop. */
export const IFRAME_MAX_HEIGHT = 6000;

/** Ignore sub-threshold jitter so we do not spam postMessage. */
const HEIGHT_CHANGE_THRESHOLD = 8;

/** Last height actually sent, so we only post on meaningful change. */
let lastSentHeight = 0;

export function clampIframeHeight(height) {
  return Math.min(
    Math.max(Math.ceil(height), IFRAME_MIN_HEIGHT),
    IFRAME_MAX_HEIGHT,
  );
}

/**
 * The element whose height defines the iframe height.
 * Ordered most- to least-specific; every storefront/dashboard route renders one
 * of these shells, and #root is the fallback.
 */
export function getMeasuredElement() {
  return (
    document.querySelector(".consultant-dashboard-shell") ||
    document.querySelector(".iframe-page-shell") ||
    document.getElementById("root") ||
    document.getElementById("consultant-root") ||
    document.body
  );
}

/**
 * Real rendered content height.
 *
 * Uses the max of the element's own box and the document scroll height, so
 * content that overflows the shell (or is absolutely positioned below it) is
 * still counted. No viewport or screen dimensions are involved — those are what
 * made the old version ignore content.
 */
export function measureIframeContentHeight() {
  const el = getMeasuredElement();
  if (!el) return IFRAME_MIN_HEIGHT;

  const rect = el.getBoundingClientRect();

  const height = Math.max(
    el.scrollHeight || 0,
    el.offsetHeight || 0,
    Math.ceil(rect.height) || 0,
    // Catch anything rendered outside the shell (modals, toasts, dropdowns).
    document.documentElement?.scrollHeight || 0,
    document.body?.scrollHeight || 0,
  );

  // Small buffer so the last line of text is never clipped by rounding.
  return clampIframeHeight(height + 8);
}

/**
 * Post the measured height to the Wix Custom Element.
 * @param {boolean} force send even if the height has not changed
 */
export function sendIframeHeightToParent(force = false) {
  if (window.self === window.top) return;

  const height = measureIframeContentHeight();

  if (!force && Math.abs(height - lastSentHeight) < HEIGHT_CHANGE_THRESHOLD) {
    return; // no meaningful change — stay quiet
  }
  lastSentHeight = height;

  window.parent.postMessage({ type: IFRAME_HEIGHT_MESSAGE, height }, "*");
}

/**
 * Observe real content size and report height changes.
 *
 * ResizeObserver fires on any layout change of the observed element — route
 * swaps, API data arriving, rows rendering, a form opening or closing — which
 * removes the need for the old setTimeout/setInterval guessing.
 *
 * @returns {() => void} cleanup that disconnects every listener
 */
export function observeIframeHeight() {
  if (window.self === window.top) return () => {};

  let frame = null;
  const schedule = () => {
    // Coalesce bursts into one measurement per animation frame.
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      sendIframeHeightToParent();
    });
  };

  // Initial measurement — force it so the first height always lands.
  sendIframeHeightToParent(true);

  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(schedule);
    const el = getMeasuredElement();
    if (el) ro.observe(el);
    // body too: catches content rendered outside the shell.
    if (document.body && document.body !== el) ro.observe(document.body);
  }

  // Fallback for browsers without ResizeObserver, and for DOM swaps that do not
  // change the observed element's own box.
  const mo = new MutationObserver(schedule);
  mo.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("resize", schedule);
  window.addEventListener("load", schedule);
  document.addEventListener("readystatechange", schedule);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    if (ro) ro.disconnect();
    mo.disconnect();
    window.removeEventListener("resize", schedule);
    window.removeEventListener("load", schedule);
    document.removeEventListener("readystatechange", schedule);
  };
}

/** Force the next send to go through, e.g. straight after a route change. */
export function resetIframeHeightCache() {
  lastSentHeight = 0;
}

export function markWixEmbedDocument() {
  if (window.self !== window.top) {
    document.documentElement.classList.add("wix-embed");
    document.body.classList.add("wix-embed");
  }
}
