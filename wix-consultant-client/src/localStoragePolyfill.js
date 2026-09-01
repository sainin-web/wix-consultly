/**
 * localStorage polyfill for sandboxed Wix iframes.
 * Import this as the FIRST import in index.js.
 * Runs immediately when the module is evaluated — before Agora SDK loads.
 */
(function () {
  var canUseReal = false;
  try {
    window.localStorage.setItem("__t__", "1");
    window.localStorage.removeItem("__t__");
    canUseReal = true;
  } catch (_) {}

  if (canUseReal) return;

  var _data = Object.create(null);

  var mockStorage = {
    getItem: function (k) {
      return Object.prototype.hasOwnProperty.call(_data, k) ? _data[k] : null;
    },
    setItem: function (k, v) {
      _data[String(k)] = String(v);
    },
    removeItem: function (k) {
      delete _data[k];
    },
    clear: function () {
      _data = Object.create(null);
    },
    key: function (i) {
      return Object.keys(_data)[i] || null;
    },
    get length() {
      return Object.keys(_data).length;
    },
  };

  try {
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  } catch (_) {
    window.localStorage = mockStorage;
  }

  console.info("[Consulty] Sandboxed iframe — in-memory localStorage installed.");
})();
