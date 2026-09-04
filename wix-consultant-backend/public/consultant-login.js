

import { createClient } from "@wix/sdk";
import { site } from "@wix/site";
import { members } from "@wix/members";

// Auto-detect domain - works on any domain automatically
const BACKEND = "https://test-consultation-app.zend-apps.com";
const REACT = "https://viewy-hyperintelligently-toshiko.ngrok-free.dev";

// Sanity bounds for the measured iframe height. These are guard rails against a
// broken measurement, NOT a layout height — the real height comes from the
// React app's ResizeObserver via the IFRAME_HEIGHT message.
const MIN_IFRAME_H = 120;
const MAX_IFRAME_H = 6000;
const wixClient = createClient({
  auth: site.auth(),
  host: site.host({
    applicationId: "e87fc4f0-d74b-463f-ad77-b813eec84846",
  }),
  modules: {
    members,
  },
});

// Rejects if `promise` has not settled within `ms`.
// Required because the Wix SDK's token bridge never settles outside a native
// Custom Element host — see fetchInstance() below.
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

class ConsultantLogin extends HTMLElement {
  constructor() {
    super();
    this.loaded = false;
    this.instance = null;
    this.instanceId = null;
    this.wixMember = null;

    console.log("[WIDGET] constructor START");
    try {
      this.accessTokenListener = wixClient.auth.getAccessTokenInjector();
      console.log("[WIDGET] accessTokenInjector acquired");
    } catch (err) {
      console.error("[WIDGET] accessTokenInjector FAILED:", err.message, err.stack);
      this.accessTokenListener = null;
    }
    console.log("[WIDGET] constructor END");
  }

  // Instance sources that do not require the Wix SDK host bridge.
  // Used when running inside an HTML Embed iframe, where fetchWithAuth cannot work.
  readInstanceFallback() {
    const fromAttr =
      this.getAttribute("instance") || this.getAttribute("data-instance");
    if (fromAttr) {
      console.log("[WIDGET] instance from element attribute");
      return fromAttr;
    }

    const fromUrl = new URLSearchParams(window.location.search).get("instance");
    if (fromUrl) {
      console.log("[WIDGET] instance from page URL");
      return fromUrl;
    }

    // <script src=".../consultly-widget.js?instance=XXX">
    const tag = document.querySelector('script[src*="consultly-widget"]');
    if (tag) {
      const q = tag.src.split("?")[1];
      const fromTag = q && new URLSearchParams(q).get("instance");
      if (fromTag) {
        console.log("[WIDGET] instance from script tag query");
        return fromTag;
      }
    }

    console.warn("[WIDGET] no fallback instance available");
    return null;
  }

  async fetchInstance() {
    console.log("[WIDGET] fetchInstance START");

    const ATTEMPTS = 3;
    for (let i = 1; i <= ATTEMPTS; i++) {
      try {
        console.log(`[WIDGET] fetchWithAuth attempt ${i}/${ATTEMPTS} →`, `${BACKEND}/api/wix/get-instance`);

        const response = await withTimeout(
          wixClient.fetchWithAuth(`${BACKEND}/api/wix/get-instance`),
          5000,
          "fetchWithAuth",
        );

        console.log("[WIDGET] fetchWithAuth returned, status:", response.status);
        if (!response.ok)
          throw new Error(`get-instance HTTP ${response.status}`);

        const data = await response.json();
        console.log("[WIDGET] get-instance payload:", data);

        this.instanceId = data.instanceId || data.instance || null;
        this.instance = data.instance || this.instanceId || null;
        if (this.instanceId) {
          console.log("[WIDGET] fetchInstance SUCCESS:", this.instanceId);
          return true;
        }
        console.warn("[WIDGET] response ok but no instanceId in payload");
      } catch (err) {
        console.warn(
          `[WIDGET] fetchWithAuth attempt ${i} FAILED:`,
          err.message,
        );
        if (i < ATTEMPTS) await new Promise((r) => setTimeout(r, 600));
      }
    }

    console.warn("[WIDGET] SDK path exhausted — trying fallback instance sources");
    const fallback = this.readInstanceFallback();
    if (fallback) {
      this.instance = fallback;
      this.instanceId = fallback;
      console.log("[WIDGET] fetchInstance SUCCESS via fallback:", fallback);
      return true;
    }

    console.error("[WIDGET] fetchInstance FAILED — no instance from any source");
    return false;
  }

  // Which page the iframe should show, based on locally stored consultant login.
  _resolvePage() {
    let token = null;
    let isLoggedIn = null;
    try {
      token = localStorage.getItem("token");
      isLoggedIn = localStorage.getItem("consultant_logged_in");
    } catch (err) {
      console.warn("[WIDGET] localStorage unavailable:", err.message);
    }
    return token && isLoggedIn === "true" ? "dashboard" : "login";
  }

  _render(reason) {
    const page = this._resolvePage();
    console.log(`[WIDGET] createIframe START (${reason}), page:`, page);
    try {
      this.createIframe(page);
      console.log("[WIDGET] createIframe FINISHED");
    } catch (err) {
      console.error("[WIDGET] createIframe FAILED:", err.message, err.stack);
    }
  }

  async connectedCallback() {
    console.log("[WIDGET] connectedCallback START");

    // ── Step 1: resolve the app instance (required for the storefront) ──
    try {
      const gotInstance = await this.fetchInstance();
      console.log("[WIDGET] fetchInstance RESULT:", gotInstance, "instance:", this.instance);
    } catch (err) {
      console.error("[WIDGET] FATAL ERROR IN fetchInstance:", err.message);
      console.error("[WIDGET] stack:", err.stack);
    }

    if (!this.instance) {
      console.error(
        "[WIDGET] ⛔ NO INSTANCE RESOLVED — storefront will be blocked by WixInstanceGuard",
      );
    }

    // ── Step 2: render the public storefront NOW ──
    // Guests must not wait on member lookup. This is the whole point:
    // instance identification and member identification are separate problems.
    this._render("initial");

    // ── Step 3: member lookup is optional and must never block Step 2 ──
    console.log("[WIDGET] waitForMember START (non-blocking)");
    this.waitForMember()
      .then(() => {
        if (this.wixMember) {
          console.log("[WIDGET] member resolved:", this.wixMember.email, "— re-rendering with member context");
          this.loaded = false;
          this.innerHTML = "";
          this._render("member-upgrade");
        } else {
          console.log("[WIDGET] no member (guest) — keeping public storefront");
        }
      })
      .catch((err) => {
        console.warn("[WIDGET] waitForMember rejected (non-fatal):", err.message);
      });

    console.log("[WIDGET] connectedCallback END");
  }

  async waitForMember() {
    try {
      console.log("🔄 Getting current member...");

      const response = await withTimeout(
        wixClient.members.getCurrentMember({ fieldsets: ["FULL"] }),
        5000,
        "getCurrentMember",
      );

      if (!response?.member) {
        console.log("❌ Guest user — not logged in");
        return;
      }

      const member = response.member;
      console.log("✅ Member found:", member.loginEmail);
      console.log("✅ Member found:", JSON.stringify(member, null, 2));


      await this._processMember(
        {
          type: "WIX_MEMBER",
          memberId: member._id,
          email: member.loginEmail,
          firstName:
            member.contact?.firstName || member.profile?.nickname || "",
          lastName: member.contact?.lastName || "",
          photo: member.profile?.photo?.url || "",
        },
        () => {},
      );
    } catch (err) {
      console.error("[WIDGET] waitForMember error:", err.message);
      console.error("[WIDGET] stack:", err.stack);
    }
  }

  async _processMember(data, resolve) {
    try {
      const res = await fetch(`${BACKEND}/api/wix-user-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wixMemberId: data.memberId,
          email: data.email,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          photo: data.photo || "",
          instanceId: this.instanceId,
        }),
      });

      const saved = await res.json();
      console.log("✅ DB save:", saved.dbId);

      if (saved.dbId) {
        localStorage.setItem("wix_customer_id", saved.dbId);
        ["wix_user_db_id", "client_u_Identity", "user_id", "userId"].forEach(
          (k) => localStorage.removeItem(k),
        );
        localStorage.setItem("wix_member_id", data.memberId);
        localStorage.setItem("wix_email", data.email);
        localStorage.setItem("wix_first_name", data.firstName || "");
        localStorage.setItem("wix_last_name", data.lastName || "");
        localStorage.setItem("wix_photo", data.photo || "");

        this.wixMember = {
          id: data.memberId,
          email: data.email,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          photo: data.photo || "",
          dbId: saved.dbId,
        };
      }
    } catch (e) {
      console.error("❌ Save error:", e.message);
    }

    resolve();
  }

  createIframe(page) {
    if (this.loaded) {
      console.warn("[WIDGET] createIframe SKIPPED — already loaded");
      return;
    }
    this.loaded = true;
    this.innerHTML = "";
    const defaultH = page === "dashboard" ? 920 : 500;
    this.style.cssText = `display:block; width:100%; min-height:${defaultH}px; position:relative;`;

    const params = new URLSearchParams();
    const resolvedInstance = this.instance || this.instanceId || "";

    console.log("[WIDGET] instance   :", this.instance);
    console.log("[WIDGET] instanceId :", this.instanceId);
    if (!resolvedInstance) {
      console.error(
        "[WIDGET] ⛔ instance is EMPTY — the iframe URL will have no ?instance= " +
          "and WixInstanceGuard will show Access Denied.",
      );
    }
    params.set("instance", resolvedInstance);

    if (this.wixMember) {
      params.set("wixLoggedIn", "true");
      params.set("wixMemberId", this.wixMember.id || "");
      params.set("wixEmail", this.wixMember.email || "");
      params.set("wixName", this.wixMember.firstName || "");
      params.set("wixLastName", this.wixMember.lastName || "");
      params.set("wixPhoto", this.wixMember.photo || "");
      params.set("wixDbId", this.wixMember.dbId || "");
      console.log("✅ Logged in user — dashboard load hoga");
    } else {
      params.set("wixLoggedIn", "false");
      console.log("❌ Guest user — login page load hoga");
    }

    const iframe = document.createElement("iframe");
    iframe.src =
      page === "dashboard"
        ? `${REACT}/consultant-dashboard?${params.toString()}`
        : `${REACT}/consultant/card?${params.toString()}`;

    console.log("[WIDGET] iframe params:", params.toString());
    console.log("[WIDGET] iframe URL:", iframe.src);
    iframe.addEventListener("load", () =>
      console.log("[WIDGET] iframe LOADED ok"),
    );
    iframe.addEventListener("error", (e) =>
      console.error("[WIDGET] iframe FAILED to load", e),
    );

    iframe.style.cssText = `width:100%; height:${defaultH}px; min-height:${defaultH}px; border:none; display:block;`;
    iframe.allow = "camera; microphone";

    window.addEventListener("message", (event) => {
      if (event.data?.type === "IFRAME_HEIGHT") {
        // Only accept height messages from THIS widget's own iframe. Without
        // this check any page or embed could resize our frame.
        if (event.source !== iframe.contentWindow) {
          console.warn("[WIDGET] ignored IFRAME_HEIGHT from a foreign window");
          return;
        }

        const reported = Number(event.data.height);
        if (!Number.isFinite(reported) || reported <= 0) return;

        // Clamp to sane bounds only — NOT to defaultH. The previous code used
        // Math.max(defaultH, reported), which pinned the dashboard iframe at
        // 920px forever: it could grow but never shrink, so short pages left a
        // large blank area. defaultH is now purely the pre-measurement height.
        const h = Math.min(Math.max(reported, MIN_IFRAME_H), MAX_IFRAME_H);

        iframe.style.height = h + "px";
        iframe.style.minHeight = "0";
        this.style.minHeight = "0";
        return;
      }

      if (event.data?.tokenGenerated === true) {
        console.log("✅ Login success — dashboard load hoga");
        this.loaded = false;
        this.innerHTML = "";
        this.createIframe("dashboard");
        return;
      }

      if (event.data?.consultantLoggedOut === true) {
        console.log("✅ Logout — login page load hoga");
        this.loaded = false;
        this.innerHTML = "";
        this.wixMember = null;
        localStorage.removeItem("wix_customer_id");
        ["wix_user_db_id", "client_u_Identity", "user_id", "userId"].forEach(
          (k) => localStorage.removeItem(k),
        );
        localStorage.removeItem("wix_member_id");
        localStorage.removeItem("wix_email");
        localStorage.removeItem("wix_first_name");
        localStorage.removeItem("wix_last_name");
        localStorage.removeItem("wix_photo");
        localStorage.removeItem("token");
        localStorage.removeItem("consultant_logged_in");
        this.createIframe("login");
        return;
      }

      if (event.data?.type === "WIX_MEMBER" && !this.wixMember) {
        console.log("✅ Late WIX_MEMBER mila — reloading");
        this.loaded = false;
        this.innerHTML = "";
        this.connectedCallback();
        return;
      }
    });

    this.appendChild(iframe);
    console.log("✅ Iframe loaded:", iframe.src);
  }
}

// Wix Studio Custom Element tag name — must match the "Tag name" field in Wix Studio
if (!customElements.get("consultly-widget")) {
  customElements.define("consultly-widget", ConsultantLogin);
}

// Legacy tag — kept so sites already embedding <our-consultant> keep working
if (!customElements.get("our-consultant")) {
  customElements.define("our-consultant", class extends ConsultantLogin {});
}
