// import { createClient } from '@wix/sdk';
// import { site } from '@wix/site';

// const BACKEND = 'https://test-wix-consultant.zend-apps.com';
// const APP_URL  = 'https://projectable-eely-minerva.ngrok-free.dev';
// const APP_ID   = 'e87fc4f0-d74b-463f-ad77-b813eec84846';

// const wixClient = createClient({
//   auth: site.auth(),
//   host: site.host({ applicationId: APP_ID }),
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // <our-consultant> Custom Element
// //
// // Flow:
// //  1. connectedCallback → fetch instance from backend
// //  2. Render iframe pointing to /login?instance=...
// //  3. React app logs in → navigates internally to /consultant-dashboard
// //     (stays inside the iframe — no window.top navigation)
// // ─────────────────────────────────────────────────────────────────────────────
// class ConsultantLogin extends HTMLElement {
//   constructor() {
//     super();
//     // Injects Wix access token into every fetchWithAuth call
//     this.accessTokenListener = wixClient.auth.getAccessTokenInjector();
//     this._instanceId = null;
//     this._iframe     = null;
//   }

//   async connectedCallback() {
//     console.log('🔄 [our-consultant] Widget connected...');

//     // Show a loading placeholder immediately so the widget isn't blank
//     this._showLoader();

//     try {
//       const response = await wixClient.fetchWithAuth(
//         `${BACKEND}/api/get-instance`
//       );
//       const data = await response.json();

//       console.log('✅ instanceId:', data.instanceId);
//       console.log('✅ memberId:',   data.memberId);

//       this._instanceId = data.instanceId;
//     } catch (err) {
//       console.error('❌ Failed to fetch instance:', err);
//       this._instanceId = 'error';
//     }

//     this._renderIframe();
//   }

//   disconnectedCallback() {
//     // Clean up the message listener when the element is removed
//     if (this._msgHandler) {
//       window.removeEventListener('message', this._msgHandler);
//     }
//   }

//   // ── Private helpers ────────────────────────────────────────────────────────

//   _showLoader() {
//     this.innerHTML = `
//       <div style="
//         display:flex; align-items:center; justify-content:center;
//         height:600px; font-family:sans-serif; color:#666; font-size:14px;
//       ">
//         Loading consultant widget…
//       </div>
//     `;
//   }

//   _renderIframe() {
//     if (this._iframe) return; // already rendered

//     this.innerHTML = '';

//     const iframe = document.createElement('iframe');

//     // Start on the LOGIN page — React Router handles navigation to dashboard
//     // after successful login (stays inside the iframe)
//     iframe.src = `${APP_URL}/login?instance=${encodeURIComponent(this._instanceId)}`;

//     iframe.style.cssText = `
//       width: 100%;
//       height: 600px;
//       border: none;
//       display: block;
//     `;

//     // Allow iframe to resize itself via postMessage
//     iframe.setAttribute('scrolling', 'no');

//     this._iframe = iframe;
//     this.appendChild(iframe);

//     // Listen for height-resize messages from the React app
//     this._msgHandler = (event) => {
//       if (event.data?.type === 'AGORA_IFRAME_HEIGHT' && event.data?.height) {
//         iframe.style.height = `${event.data.height}px`;
//       }
//     };
//     window.addEventListener('message', this._msgHandler);
//   }
// }

// if (!customElements.get('our-consultant')) {
//   customElements.define('our-consultant', ConsultantLogin);
// }
