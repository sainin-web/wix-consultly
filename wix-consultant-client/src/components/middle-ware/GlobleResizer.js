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
 * The observer is re-attached on every route change because the measured
 * element differs per route (.iframe-page-shell on the storefront,
 * .consultant-dashboard-shell on the dashboard) and React replaces the node.
 * A single mount-time observer would end up watching a detached element.
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

  useEffect(() => {
    /*
     * Clearing the cache lets a SMALLER height through on the next send, which
     * is what allows the iframe to shrink when moving to a shorter page. It does
     * not itself cause a loop: the measurement is content-only, so once the page
     * settles the value repeats and the dedup check goes quiet.
     */
    resetIframeHeightCache();

    // Measure after the new route has painted, then attach the observer to the
    // element that route actually rendered.
    const frame = requestAnimationFrame(() => {
      sendIframeHeightToParent(true, "route-change");
    });

    const disconnect = observeIframeHeight();

    return () => {
      cancelAnimationFrame(frame);
      disconnect();
    };
  }, [location.pathname]);
}

export default useAutoResizeIframe;
