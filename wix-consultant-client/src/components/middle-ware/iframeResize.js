/** Global iframe height rules for Wix embed — use only this module */

export const IFRAME_MIN_HEIGHT = 500;
export const IFRAME_MAX_HEIGHT = 4000;
/** Chat page minimum iframe height */
export const IFRAME_CHAT_MIN_HEIGHT = 700;
/** Consultant dashboard minimum iframe height (Wix embed) */
export const IFRAME_DASHBOARD_MIN_HEIGHT = 900;
export const IFRAME_HEIGHT_MESSAGE = "IFRAME_HEIGHT";

/** Tall chat panel — covers most of the screen inside Wix */
export function getChatIframeHeight() {
  const screenBased =
    typeof window.screen?.height === "number"
      ? Math.round(window.screen.height * 0.78)
      : IFRAME_CHAT_MIN_HEIGHT;

  return Math.min(
    Math.max(IFRAME_CHAT_MIN_HEIGHT, screenBased, window.innerHeight),
    IFRAME_MAX_HEIGHT
  );
}

/** Tall dashboard panel — fixed target height (avoids 100vh feedback loop). */
export function getDashboardIframeHeight() {
  const screenBased =
    typeof window.screen?.height === "number"
      ? Math.round(window.screen.height * 0.92)
      : IFRAME_DASHBOARD_MIN_HEIGHT;
  const viewportH =
    window.visualViewport?.height ||
    document.documentElement?.clientHeight ||
    0;

  return clampIframeHeight(
    Math.max(IFRAME_DASHBOARD_MIN_HEIGHT, screenBased, viewportH)
  );
}

/**
 * Measure visible page content (not viewport loops from 100vh).
 */
export function measureIframeContentHeight() {
  if (document.querySelector(".chat-route-shell")) {
    return getChatIframeHeight();
  }

  if (document.querySelector(".consultant-dashboard-shell")) {
    return getDashboardIframeHeight();
  }

  const shell = document.querySelector(".iframe-page-shell");

  if (shell) {
    const rect = shell.getBoundingClientRect();
    const height = Math.ceil(
      Math.max(shell.scrollHeight, shell.offsetHeight, rect.height) +
        window.scrollY +
        12
    );
    return clampIframeHeight(height);
  }

  const root = document.getElementById("root") || document.getElementById("consultant-root");
  const measureRoot = root || document.body;
  let bottom = 0;

  Array.from(measureRoot.children).forEach((el) => {
    if (el.nodeType !== 1) return;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;
    bottom = Math.max(bottom, el.getBoundingClientRect().bottom + window.scrollY);
  });

  if (bottom === 0) {
    bottom = measureRoot.getBoundingClientRect().bottom + window.scrollY;
  }

  return clampIframeHeight(Math.ceil(bottom + 12));
}

export function clampIframeHeight(height) {
  return Math.min(
    Math.max(Math.ceil(height), IFRAME_MIN_HEIGHT),
    IFRAME_MAX_HEIGHT
  );
}

export function sendIframeHeightToParent() {
  if (window.self === window.top) return;

  const height = measureIframeContentHeight();
  window.parent.postMessage(
    { type: IFRAME_HEIGHT_MESSAGE, height },
    "*"
  );
}

export function markWixEmbedDocument() {
  if (window.self !== window.top) {
    document.documentElement.classList.add("wix-embed");
    document.body.classList.add("wix-embed");
  }
}
