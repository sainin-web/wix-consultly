import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  observeIframeHeight,
  resetIframeHeightCache,
  sendIframeHeightToParent,
  markWixEmbedDocument,
} from "./iframeResize";

/**
 * Keeps the Wix iframe height in sync with real rendered content.
 *
 * Previously this ran a 250ms setInterval (12 times), a MutationObserver, and
 * several setTimeouts, all feeding a height that was computed from screen size
 * rather than content. It now relies on a ResizeObserver over the real content
 * element — see iframeResize.js — so no polling is needed.
 */
function useAutoResizeIframe() {
  const location = useLocation();

  useEffect(() => {
    markWixEmbedDocument();
  }, []);

  // Route-scoped body classes (kept: CSS depends on them).
  useEffect(() => {
    const isChat = location.pathname.startsWith("/chats/");
    const isDashboard = location.pathname.startsWith("/consultant-dashboard");

    document.body.classList.toggle("wix-embed-chat", isChat);
    document.documentElement.classList.toggle("wix-embed-chat", isChat);
    document.body.classList.toggle("wix-embed-dashboard", isDashboard);
    document.documentElement.classList.toggle("wix-embed-dashboard", isDashboard);

    return () => {
      document.body.classList.remove("wix-embed-chat");
      document.documentElement.classList.remove("wix-embed-chat");
      document.body.classList.remove("wix-embed-dashboard");
      document.documentElement.classList.remove("wix-embed-dashboard");
    };
  }, [location.pathname]);

  // One observer for the lifetime of the app.
  useEffect(() => observeIframeHeight(), []);

  /*
   * On route change the new page may be SHORTER than the old one. Clearing the
   * cache forces the next measurement to be sent even if the delta is small,
   * which is what lets the iframe shrink rather than stay at its previous size.
   */
  useEffect(() => {
    resetIframeHeightCache();
    const frame = requestAnimationFrame(() => sendIframeHeightToParent(true));
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);
}

export default useAutoResizeIframe;
