import { io } from "socket.io-client";
import { KEYS, isConsultantSession } from "../../utils/wixStorage";

const SOCKET_URL = process.env.REACT_APP_BACKEND_HOST;

export const SOCKET_ROLE = {
  CUSTOMER: "customer",
  CONSULTANT: "consultant",
};

const ROLE_KEY = "wix_socket_role";

let socketInstance = null;
let registeredUserId = null;
let registeredRole = null;
/** @type {Map<string, Promise<boolean>>} */
const registerInFlight = new Map();

function registerKey(userId, role) {
  return `${role}:${String(userId)}`;
}

export function setSocketRole(role) {
  if (role) sessionStorage.setItem(ROLE_KEY, role);
  else sessionStorage.removeItem(ROLE_KEY);
}

export function getSocketRole() {
  return sessionStorage.getItem(ROLE_KEY);
}

function resolveRole(explicitRole) {
  if (explicitRole) return explicitRole;
  const stored = getSocketRole();
  if (stored === SOCKET_ROLE.CUSTOMER || stored === SOCKET_ROLE.CONSULTANT) {
    return stored;
  }
  return isConsultantSession()
    ? SOCKET_ROLE.CONSULTANT
    : SOCKET_ROLE.CUSTOMER;
}

function getAuthTokenForRole(role) {
  if (role === SOCKET_ROLE.CONSULTANT) {
    return localStorage.getItem(KEYS.CONSULTANT_TOKEN) || undefined;
  }
  return undefined;
}

export function destroySocket() {
  if (socketInstance) {
    socketInstance.disconnect();
  }
  socketInstance = null;
  registeredUserId = null;
  registeredRole = null;
  registerInFlight.clear();
}

export function getSocket(role) {
  const r = resolveRole(role);
  const authToken = getAuthTokenForRole(r);

  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: authToken ? { token: authToken } : {},
    });
  } else if (authToken) {
    socketInstance.auth = { token: authToken };
  } else {
    socketInstance.auth = {};
  }

  return socketInstance;
}

/**
 * Register socket with server; resolves when registerAck.success === true.
 * @param {string} userId Mongo _id
 * @param {{ role?: 'customer'|'consultant', force?: boolean }} options
 */
export function ensureSocketRegistered(userId, options = {}) {
  if (!userId) return Promise.resolve(false);

  const role = resolveRole(options.role);
  setSocketRole(role);

  const uid = String(userId);
  const key = registerKey(uid, role);

  // Customer chat must not reuse a socket that still has consultant JWT on handshake
  if (role === SOCKET_ROLE.CUSTOMER && socketInstance?.auth?.token) {
    console.log("[socket] clearing consultant auth for customer session");
    destroySocket();
  } else if (registeredRole && registeredRole !== role) {
    console.log("[socket] role changed", registeredRole, "→", role);
    destroySocket();
  }

  if (
    !options.force &&
    registeredUserId === uid &&
    registeredRole === role &&
    socketInstance?.connected
  ) {
    return Promise.resolve(true);
  }

  if (registerInFlight.has(key)) {
    return registerInFlight.get(key);
  }

  const socket = getSocket(role);
  socket.auth = getAuthTokenForRole(role)
    ? { token: getAuthTokenForRole(role) }
    : {};

  const promise = new Promise((resolve) => {
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      registerInFlight.delete(key);
      if (ok) {
        registeredUserId = uid;
        registeredRole = role;
        import("./socketEventBridge").then((m) => m.bindSocketListeners());
      }
      resolve(ok);
    };

    const timeout = setTimeout(() => {
      console.warn("[socket] register timeout for", uid, role);
      finish(false);
    }, 12000);

    const onAck = (ack) => {
      clearTimeout(timeout);
      if (ack?.success && String(ack.userId) === uid) {
        console.log("[socket] registerAck ok →", uid, role);
        finish(true);
      } else {
        console.warn("[socket] registerAck failed", ack, "expected", uid);
        finish(false);
      }
    };

    const emitRegister = () => {
      socket.off("registerAck", onAck);
      socket.once("registerAck", onAck);
      console.log("[socket] register →", uid, role);
      socket.emit("register", uid);
    };

    if (socket.connected) {
      emitRegister();
    } else {
      const onConnect = () => {
        socket.off("connect", onConnect);
        emitRegister();
      };
      socket.once("connect", onConnect);
      socket.connect();
    }
  });

  registerInFlight.set(key, promise);
  return promise;
}

/** @deprecated use ensureSocketRegistered */
export function emitSocketRegister(userId, options = {}) {
  ensureSocketRegistered(userId, options);
}

/** @deprecated use ensureSocketRegistered with force */
export function registerSocketUserId(userId, { forceReconnect = false } = {}) {
  return ensureSocketRegistered(userId, {
    role: getSocketRole() || undefined,
    force: forceReconnect,
  });
}

export function getRegisteredUserId() {
  return registeredUserId;
}

export function connectSocket(role) {
  const socket = getSocket(role);
  if (!socket.connected) socket.connect();
  return socket;
}

export function getSocketInstance() {
  return getSocket();
}

function socketProxy() {
  return getSocket();
}

export const socket = new Proxy(
  {},
  {
    get(_, prop) {
      const s = socketProxy();
      const val = s[prop];
      return typeof val === "function" ? val.bind(s) : val;
    },
  }
);
