/**
 * Iframe height reporting for the Wix embed.
 *
 * ── THE FEEDBACK LOOP THIS FILE MUST NOT RECREATE ───────────────────────────
 * A previous version measured:
 *
 *     max(el.scrollHeight, el.offsetHeight, rect.height,
 *         document.documentElement.scrollHeight,   // <-- viewport-coupled
 *         document.body.scrollHeight)              // <-- viewport-coupled
 *     + 8                                          // <-- unconditional ratchet
 *
 * `documentElement.scrollHeight` returns max(content, VIEWPORT) by spec. Inside
 * an iframe the viewport IS the iframe height, so once the parent applied a new
 * height the next measurement read that height back as if it were content:
 *
 *     measure 650 -> send 658 -> iframe 658 -> viewport 658
 *     -> measure 658 -> send 666 -> iframe 666 -> viewport 666 -> ...
 *
 * It also observed `document.body`, so enlarging the iframe resized the observed
 * element and re-triggered the observer. And the dedup threshold was 8 while the
 * increment was +8 — `Math.abs(658-650) < 8` is false, so the guard never fired.
 *
 * ── THE THREE RULES THAT MAKE GROWTH IMPOSSIBLE ─────────────────────────────
 * 1. Measure ONLY the content element's own box. Never documentElement/body
 *    scrollHeight, never innerHeight/screen — those reflect the iframe viewport.
 * 2. Add NOTHING to the measurement. Any constant added to a value that is fed
 *    back will ratchet.
 * 3. Observe ONLY the content element. Observing body couples the observer to
 *    the viewport that the parent controls.
 *
 * The content element is `height: auto; min-height: 0` (see App.css), so its
 * scrollHeight is a pure function of its content and does NOT change when the
 * parent resizes the iframe. That is what makes the cycle terminate.
 */

export const IFRAME_HEIGHT_MESSAGE = "IFRAME_HEIGHT";

/** Anti-collapse floor only — not a layout height. */
export const IFRAME_MIN_HEIGHT = 80;

/** Guard rail against a pathological measurement. NOT the loop fix. */
export const IFRAME_MAX_HEIGHT = 6000;

/**
 * Ignore sub-pixel jitter. Deliberately small AND unrelated to any increment,
 * because nothing is added to the measurement any more.
 */
const HEIGHT_CHANGE_THRESHOLD = 2;

let lastSentHeight = 0;

/** Enable in the browser with: localStorage.setItem('debug_iframe_height','1') */
function debugEnabled() {
  try {
    return localStorage.getItem("debug_iframe_height") === "1";
  } catch (err) {
    return false;
  }
}

function debugLog(measured, reason, sent) {
  if (!debugEnabled()) return;
  console.log(
    "[IFRAME HEIGHT]",
    "measured:", measured,
    "| lastSent:", lastSentHeight,
    "| reason:", reason,
    "| route:", window.location.pathname,
    "| sent:", sent ? "YES" : "no (unchanged)",
  );
}

export function clampIframeHeight(height) {
  return Math.min(
    Math.max(Math.ceil(height), IFRAME_MIN_HEIGHT),
    IFRAME_MAX_HEIGHT,
  );
}

/**
 * The single element whose content defines the iframe height.
 * NOTE: `document.body` is intentionally absent — measuring or observing it
 * reintroduces viewport coupling.
 */
export function getMeasuredElement() {
  return (
    document.querySelector(".consultant-dashboard-shell") ||
    document.querySelector(".iframe-page-shell") ||
    document.getElementById("root") ||
    document.getElementById("consultant-root")
  );
}

/**
 * Real content height of the measured element.
 *
 * Uses ONLY element-scoped metrics. `scrollHeight` on a non-root element is the
 * height of its content box and is unaffected by the iframe viewport, so it
 * cannot grow merely because the parent made the iframe taller.
 */
export function measureIframeContentHeight() {
  const el = getMeasuredElement();
  if (!el) return IFRAME_MIN_HEIGHT;

  // No additive buffer: a constant added to a fed-back value ratchets.
  return clampIframeHeight(
    Math.max(el.scrollHeight || 0, el.offsetHeight || 0),
  );
}

/**
 * Post the measured height to the Wix Custom Element.
 * @param {boolean} force bypass the dedup check (used on route change so a
 *   SMALLER height is still sent and the iframe can shrink)
 * @param {string} reason diagnostic label
 */
export function sendIframeHeightToParent(force = false, reason = "observer") {
  if (window.self === window.top) return;

  const height = measureIframeContentHeight();
  const changed = Math.abs(height - lastSentHeight) >= HEIGHT_CHANGE_THRESHOLD;

  if (!force && !changed) {
    debugLog(height, reason, false);
    return; // stable — silence is what terminates the cycle
  }

  lastSentHeight = height;
  debugLog(height, reason, true);
  window.parent.postMessage({ type: IFRAME_HEIGHT_MESSAGE, height }, "*");
}

/**
 * Observe the content element and report height changes.
 *
 * Only ONE element is observed. There is no MutationObserver: ResizeObserver
 * already fires when content changes the element's box (route swaps, API rows,
 * forms opening), and a body-wide MutationObserver was an extra feedback path.
 *
 * @returns {() => void} cleanup
 */
export function observeIframeHeight() {
  if (window.self === window.top) return () => {};

  let frame = null;
  const schedule = (reason) => {
    if (frame) return; // coalesce a burst into one measurement per frame
    frame = requestAnimationFrame(() => {
      frame = null;
      sendIframeHeightToParent(false, reason);
    });
  };

  sendIframeHeightToParent(true, "initial");

  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    const el = getMeasuredElement();
    if (el) {
      ro = new ResizeObserver(() => schedule("resize-observer"));
      ro.observe(el);
    }
  }

  const onWindowResize = () => schedule("window-resize");
  window.addEventListener("resize", onWindowResize);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    if (ro) ro.disconnect();
    window.removeEventListener("resize", onWindowResize);
  };
}

/** Allow the next send through even if the delta is small (used on route change). */
export function resetIframeHeightCache() {
  lastSentHeight = 0;
}

export function markWixEmbedDocument() {
  if (window.self !== window.top) {
    document.documentElement.classList.add("wix-embed");
    document.body.classList.add("wix-embed");
  }
}
