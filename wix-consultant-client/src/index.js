// FIX 1 — Must be first import: installs in-memory localStorage before
// Agora SDK or any other module touches window.localStorage
import "./localStoragePolyfill";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "@shopify/polaris/build/esm/styles.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./components/Redux/store/store";
import SocketProvider from "./components/Sokect-io/sokectProvider";
import ToastProvider from "./components/AlertModel/ToastProvider";
import { AppStatusProvider } from "./components/ProtectRoute/AppStatusProvider";
import { WixUserProvider } from "./useContext/WixUserContext";

// ─── Shared React tree ───────────────────────────────────────────────────────
// instanceId prop lets App.js receive the Wix instance without touching
// localStorage (which may be the in-memory fallback in sandboxed iframes).
function RootApp({ instanceId, embeddedInWidget = false }) {
  return (
    <React.StrictMode>
      <PolarisAppProvider i18n={en}>
        <ToastProvider>
          <Provider store={store}>
            <SocketProvider>
              <BrowserRouter>
                <AppStatusProvider>
                  <WixUserProvider>
                    <App
                      instanceId={instanceId}
                      embeddedInWidget={embeddedInWidget}
                    />
                  </WixUserProvider>
                </AppStatusProvider>
              </BrowserRouter>
            </SocketProvider>
          </Provider>
        </ToastProvider>
      </PolarisAppProvider>
    </React.StrictMode>
  );
}

// ─── FIX 2 + 3 — Custom Element <consultant-widget instance="..."> ───────────
//
// FIX 2: tag name is "consultant-widget" — must match the Wix dashboard config.
//        React mounts directly on the element (no Shadow DOM needed).
//
// FIX 3: observedAttributes + attributeChangedCallback handle the case where
//        Wix sets the "instance" attribute AFTER connectedCallback fires
//        (editorPointerAPI is empty on first render). A _mounted guard prevents
//        double-mounting if the element is moved in the DOM.
// ─────────────────────────────────────────────────────────────────────────────
class ConsultantWidget extends HTMLElement {
  static get observedAttributes() {
    return ["instance"];
  }

  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;

    const instanceId = this.getAttribute("instance") || "";

    if (!instanceId) {
      console.warn(
        "[consultant-widget] connected without 'instance' — " +
        "will re-render when attributeChangedCallback fires."
      );
    }

    if (!this._reactRoot) {
      this._reactRoot = ReactDOM.createRoot(this);
    }

    this._doRender(instanceId);
  }

  // Fires whenever the "instance" attribute is set/changed by Wix
  attributeChangedCallback(name, oldVal, newVal) {
    if (name !== "instance" || newVal === oldVal) return;

    console.info(
      "[consultant-widget] instance updated →",
      newVal ? newVal.slice(0, 20) + "…" : "(empty)"
    );

    if (this._reactRoot) {
      this._doRender(newVal || "");
    }
  }

  disconnectedCallback() {
    if (this._reactRoot) {
      this._reactRoot.unmount();
      this._reactRoot = null;
    }
    this._mounted = false;
  }

  _doRender(instanceId) {
    this._reactRoot.render(
      <RootApp instanceId={instanceId} embeddedInWidget />
    );
  }
}

// Register only once — safe across hot-reloads
if (!customElements.get("consultant-widget")) {
  customElements.define("consultant-widget", ConsultantWidget);
}

// ─── Admin dashboard mount (#root div in public/index.html) ─────────────────
const adminContainer =
  document.getElementById("root") ||
  document.getElementById("consultant-root");

if (adminContainer) {
  const urlParams = new URLSearchParams(window.location.search);
  const instanceId = urlParams.get("instance") || "";

  ReactDOM.createRoot(adminContainer).render(
    <RootApp instanceId={instanceId} />
  );
}

// ─── Service Worker (Firebase Cloud Messaging) ───────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((reg) => console.log("[SW] registered:", reg.scope))
      .catch((err) => console.error("[SW] failed:", err));
  });
}

// ─── Dev only: suppress CRA error overlay in sandboxed iframes ───────────────
if (process.env.NODE_ENV === "development") {
  new MutationObserver(() => {
    ["#react-error-overlay", 'iframe[id*="webpack-dev-server"]'].forEach(
      (sel) => {
        const el = document.querySelector(sel);
        if (el) el.remove();
      }
    );
  }).observe(document.body, { childList: true, subtree: true });
}
