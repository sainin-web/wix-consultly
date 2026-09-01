import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  sendIframeHeightToParent,
  markWixEmbedDocument,
} from "./iframeResize";

function useAutoResizeIframe() {
  const location = useLocation();

  useEffect(() => {
    markWixEmbedDocument();
  }, []);

  useEffect(() => {
    const isChat = location.pathname.startsWith("/chats/");
    const isDashboard = location.pathname.startsWith("/consultant-dashboard");
    document.body.classList.toggle("wix-embed-chat", isChat);
    document.documentElement.classList.toggle("wix-embed-chat", isChat);
    document.body.classList.toggle("wix-embed-dashboard", isDashboard);
    document.documentElement.classList.toggle("wix-embed-dashboard", isDashboard);

    if (isChat || isDashboard) {
      sendIframeHeightToParent();
      const t1 = setTimeout(sendIframeHeightToParent, 150);
      const t2 = setTimeout(sendIframeHeightToParent, 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        document.body.classList.remove("wix-embed-chat");
        document.documentElement.classList.remove("wix-embed-chat");
        document.body.classList.remove("wix-embed-dashboard");
        document.documentElement.classList.remove("wix-embed-dashboard");
      };
    }
    return () => {
      document.body.classList.remove("wix-embed-chat");
      document.documentElement.classList.remove("wix-embed-chat");
      document.body.classList.remove("wix-embed-dashboard");
      document.documentElement.classList.remove("wix-embed-dashboard");
    };
  }, [location.pathname]);

  useEffect(() => {
    let resizeInterval;
    let debounceTimer;

    const scheduleSend = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        requestAnimationFrame(sendIframeHeightToParent);
      }, 80);
    };

    scheduleSend();

    let count = 0;
    resizeInterval = setInterval(() => {
      scheduleSend();
      count += 1;
      if (count > 12) clearInterval(resizeInterval);
    }, 250);

    const observer = new MutationObserver(scheduleSend);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("load", scheduleSend);
    window.addEventListener("resize", scheduleSend);

    return () => {
      clearInterval(resizeInterval);
      clearTimeout(debounceTimer);
      observer.disconnect();
      window.removeEventListener("load", scheduleSend);
      window.removeEventListener("resize", scheduleSend);
    };
  }, [location.pathname]);
}

export default useAutoResizeIframe;
