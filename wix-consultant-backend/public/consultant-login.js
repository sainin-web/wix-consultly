// import { createClient } from "@wix/sdk";
// import { site } from "@wix/site";
// import { members } from "@wix/members";
// const BACKEND = "https://test-wix-consultant.zend-apps.com";
// const REACT = "https://viewy-hyperintelligently-toshiko.ngrok-free.dev";

// const wixClient = createClient({
//   auth: site.auth(),
//   host: site.host({
//     applicationId: "e87fc4f0-d74b-463f-ad77-b813eec84846",
//   }),
//   modules: {
//     members,
//   },
// });

// class ConsultantLogin extends HTMLElement {
//   constructor() {
//     super();
//     this.loaded = false;
//     this.instance = null;
//     this.instanceId = null;
//     this.wixMember = null;
//     this.accessTokenListener = wixClient.auth.getAccessTokenInjector();
//   }

//   async testGetCurrentMember() {
//     try {
//       console.log("🧪 Testing getCurrentMember...");

//       // ✅ Seedha member lo — login check skip
//       const response = await wixClient.members.getCurrentMember({
//         fieldsets: ["FULL"],
//       });

//       console.log("✅ Full response:", JSON.stringify(response, null, 2));

//       if (!response?.member) {
//         console.log("❌ No member — user not logged in");
//         return;
//       }

//       const member = response.member;
//       console.log("✅ Member ID:", member._id);
//       console.log("✅ Email:", member.loginEmail);
//       console.log("✅ Name:", member.profile?.firstName);
//     } catch (err) {
//       console.error("❌ Test failed:", err.message);
//     }
//   }

//   async fetchInstance() {
//     for (let i = 0; i < 8; i++) {
//       try {
//         const response = await wixClient.fetchWithAuth(
//           `${BACKEND}/api/wix/get-instance`,
//         );
//         if (!response.ok) {
//           throw new Error(`get-instance HTTP ${response.status}`);
//         }
//         const data = await response.json();
//         this.instanceId = data.instanceId || data.instance || null;
//         this.instance = data.instance || this.instanceId || null;
//         if (this.instanceId) {
//           console.log("✅ Wix instance:", this.instanceId);
//           return true;
//         }
//       } catch (err) {
//         console.warn(`⚠️ get-instance attempt ${i + 1} failed:`, err.message);
//         await new Promise((r) => setTimeout(r, 800));
//       }
//     }
//     return false;
//   }

//   async connectedCallback() {
//     console.log("🔄 Widget connected...");
//     await this.testGetCurrentMember();
//     // const memberPromise = this.waitForMember();
//       await this.waitForMember();
//     await this.fetchInstance();
//     await memberPromise;

//     if (!this.instance) {
//       console.error(
//         "❌ No Wix instance — check app is installed, applicationId matches, and BACKEND URL is allowed in the Wix app",
//       );
//     }

//     // ✅ STEP 4 — Iframe load karo
//     const token = localStorage.getItem("token");
//     const isLoggedIn = localStorage.getItem("consultant_logged_in");
//     this.createIframe(token && isLoggedIn === "true" ? "dashboard" : "login");
//   }

//   // waitForMember() {
//   //   return new Promise((resolve) => {
//   //     // ✅ Check karo globalThis mein pehle se hai?
//   //     if (window.parent?.wixUserId) {
//   //       console.log("✅ globalThis se mila");
//   //       this._processMember(
//   //         {
//   //           type: "WIX_MEMBER",
//   //           memberId: window.parent.wixUserId,
//   //           email: window.parent.wixUserEmail,
//   //         },
//   //         resolve,
//   //       );
//   //       return;
//   //     }

//   //     const timeout = setTimeout(() => {
//   //       console.warn("⚠️ Timeout — guest user");
//   //       resolve();
//   //     }, 15000); // 15 sec

//   //     const handler = async (event) => {
//   //       if (event.data?.type !== "WIX_MEMBER") return;
//   //       console.log("✅ WIX_MEMBER pakda:", event.data.email);
//   //       window.postMessage({ type: "WIX_MEMBER_RECEIVED" }, "*");

//   //       clearTimeout(timeout);
//   //       window.removeEventListener("message", handler);

//   //       await this._processMember(event.data, resolve);
//   //     };

//   //     window.addEventListener("message", handler);
//   //     console.log("👂 Listener ready");
//   //   });
//   // }

//   async waitForMember() {
//     try {
//       console.log("🔄 Getting current member...");

//       const response = await wixClient.members.getCurrentMember({
//         fieldsets: ["FULL"],
//       });

//       if (!response?.member) {
//         console.log("❌ Guest user — not logged in");
//         return;
//       }

//       const member = response.member;

//       console.log("✅ Member found:", member.loginEmail);

//       // ✅ _processMember call karo — existing code same rahega
//       await this._processMember(
//         {
//           type: "WIX_MEMBER",
//           memberId: member._id,
//           email: member.loginEmail,
//           firstName:
//             member.contact?.firstName || member.profile?.nickname || "",
//           lastName: member.contact?.lastName || "",
//           photo: member.profile?.photo?.url || "",
//         },
//         () => {},
//       );
//     } catch (err) {
//       console.error("❌ waitForMember error:", err.message);
//     }
//   }

//   async _processMember(data, resolve) {
//     try {
//       const res = await fetch(`${BACKEND}/api/wix-user-session`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           wixMemberId: data.memberId,
//           email: data.email,
//           firstName: data.firstName || "",
//           lastName: data.lastName || "",
//           photo: data.photo || "",
//           instanceId: this.instanceId,
//         }),
//       });

//       const saved = await res.json();
//       console.log("✅ DB save:", saved.dbId);

//       if (saved.dbId) {
//         localStorage.setItem("wix_customer_id", saved.dbId);
//         ["wix_user_db_id", "client_u_Identity", "user_id", "userId"].forEach(
//           (k) => localStorage.removeItem(k),
//         );
//         localStorage.setItem("wix_member_id", data.memberId);
//         localStorage.setItem("wix_email", data.email);
//         localStorage.setItem("wix_first_name", data.firstName || "");
//         localStorage.setItem("wix_last_name", data.lastName || "");
//         localStorage.setItem("wix_photo", data.photo || "");

//         this.wixMember = {
//           id: data.memberId,
//           email: data.email,
//           firstName: data.firstName || "",
//           lastName: data.lastName || "",
//           photo: data.photo || "",
//           dbId: saved.dbId,
//         };
//       }
//     } catch (e) {
//       console.error("❌ Save error:", e.message);
//     }

//     resolve();
//   }

//   createIframe(page) {
//     if (this.loaded) return;
//     this.loaded = true;
//     this.innerHTML = "";
//     const defaultH = page === "dashboard" ? 920 : 500;
//     this.style.cssText = `display:block; width:100%; min-height:${defaultH}px; position:relative;`;

//     // ✅ URL params banao
//     const params = new URLSearchParams();
//     params.set("instance", this.instance || this.instanceId || "");

//     if (this.wixMember) {
//       // ✅ Logged in user
//       params.set("wixLoggedIn", "true");
//       params.set("wixMemberId", this.wixMember.id || "");
//       params.set("wixEmail", this.wixMember.email || "");
//       params.set("wixName", this.wixMember.firstName || "");
//       params.set("wixLastName", this.wixMember.lastName || "");
//       params.set("wixPhoto", this.wixMember.photo || "");
//       params.set("wixDbId", this.wixMember.dbId || "");
//       console.log("✅ Logged in user — dashboard load hoga");
//     } else {
//       params.set("wixLoggedIn", "false");
//       console.log("❌ Guest user — login page load hoga");
//     }

//     const iframe = document.createElement("iframe");
//     iframe.src =
//       page === "dashboard"
//         ? `${REACT}/consultant-dashboard?${params.toString()}`
//         : `${REACT}/consultant/card?${params.toString()}`;

//     iframe.style.cssText = `width:100%; height:${defaultH}px; min-height:${defaultH}px; border:none; display:block;`;
//     iframe.allow = "camera; microphone";

//     window.addEventListener("message", (event) => {
//       if (event.data?.type === "IFRAME_HEIGHT") {
//         const h = Math.max(defaultH, Number(event.data.height) || defaultH);
//         iframe.style.height = h + "px";
//         iframe.style.minHeight = h + "px";
//         this.style.minHeight = h + "px";
//         return;
//       }

//       if (event.data?.tokenGenerated === true) {
//         console.log("✅ Login success — dashboard load hoga");
//         this.loaded = false;
//         this.innerHTML = "";
//         this.createIframe("dashboard");
//         return;
//       }

//       if (event.data?.consultantLoggedOut === true) {
//         console.log("✅ Logout — login page load hoga");
//         this.loaded = false;
//         this.innerHTML = "";
//         this.wixMember = null;

//         localStorage.removeItem("wix_customer_id");
//         ["wix_user_db_id", "client_u_Identity", "user_id", "userId"].forEach(
//           (k) => localStorage.removeItem(k),
//         );
//         localStorage.removeItem("wix_member_id");
//         localStorage.removeItem("wix_email");
//         localStorage.removeItem("wix_first_name");
//         localStorage.removeItem("wix_last_name");
//         localStorage.removeItem("wix_photo");
//         localStorage.removeItem("token");
//         localStorage.removeItem("consultant_logged_in");

//         this.createIframe("login");
//         return;
//       }

//       if (event.data?.type === "WIX_MEMBER" && !this.wixMember) {
//         console.log("✅ Late WIX_MEMBER mila — reloading");
//         this.loaded = false;
//         this.innerHTML = "";
//         this.connectedCallback();
//         return;
//       }
//     });

//     this.appendChild(iframe);
//     console.log("✅ Iframe loaded:", iframe.src);
//   }
// }

// if (!customElements.get("our-consultant")) {
//   customElements.define("our-consultant", ConsultantLogin);
// }

import { createClient } from "@wix/sdk";
import { site } from "@wix/site";
import { members } from "@wix/members";

const BACKEND = "https://test-wix-consultant.zend-apps.com";
const REACT = "https://viewy-hyperintelligently-toshiko.ngrok-free.dev";

const wixClient = createClient({
  auth: site.auth(),
  host: site.host({
    applicationId: "e87fc4f0-d74b-463f-ad77-b813eec84846",
  }),
  modules: {
    members,
  },
});

class ConsultantLogin extends HTMLElement {
  constructor() {
    super();
    this.loaded = false;
    this.instance = null;
    this.instanceId = null;
    this.wixMember = null;
    this.accessTokenListener = wixClient.auth.getAccessTokenInjector();
  }

  async fetchInstance() {
    for (let i = 0; i < 8; i++) {
      try {
        const response = await wixClient.fetchWithAuth(
          `${BACKEND}/api/wix/get-instance`,
        );
        if (!response.ok)
          throw new Error(`get-instance HTTP ${response.status}`);
        const data = await response.json();
        this.instanceId = data.instanceId || data.instance || null;
        this.instance = data.instance || this.instanceId || null;
        if (this.instanceId) {
          console.log("✅ Wix instance:", this.instanceId);
          return true;
        }
      } catch (err) {
        console.warn(`⚠️ get-instance attempt ${i + 1} failed:`, err.message);
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    return false;
  }

  async connectedCallback() {
    console.log("🔄 Widget connected...");

    await this.fetchInstance(); // ✅ pehle instance
    await this.waitForMember(); // ✅ phir member

    if (!this.instance) {
      console.error("❌ No Wix instance");
    }

    const token = localStorage.getItem("token");
    const isLoggedIn = localStorage.getItem("consultant_logged_in");
    this.createIframe(token && isLoggedIn === "true" ? "dashboard" : "login");
  }

  async waitForMember() {
    try {
      console.log("🔄 Getting current member...");

      const response = await wixClient.members.getCurrentMember({
        fieldsets: ["FULL"],
      });

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
      console.error("❌ waitForMember error:", err.message);
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
    if (this.loaded) return;
    this.loaded = true;
    this.innerHTML = "";
    const defaultH = page === "dashboard" ? 920 : 500;
    this.style.cssText = `display:block; width:100%; min-height:${defaultH}px; position:relative;`;

    const params = new URLSearchParams();
    params.set("instance", this.instance || this.instanceId || "");

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

    iframe.style.cssText = `width:100%; height:${defaultH}px; min-height:${defaultH}px; border:none; display:block;`;
    iframe.allow = "camera; microphone";

    window.addEventListener("message", (event) => {
      if (event.data?.type === "IFRAME_HEIGHT") {
        const h = Math.max(defaultH, Number(event.data.height) || defaultH);
        iframe.style.height = h + "px";
        iframe.style.minHeight = h + "px";
        this.style.minHeight = h + "px";
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

if (!customElements.get("our-consultant")) {
  customElements.define("our-consultant", ConsultantLogin);
}
