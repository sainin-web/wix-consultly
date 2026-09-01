import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { connectSocket, ensureSocketRegistered, SOCKET_ROLE } from "./SokectConfig";
import {
  setSocketDispatch,
  bindSocketListeners,
} from "./socketEventBridge";
import {
  getSocketRegisterId,
  isConsultantSession,
} from "../../utils/wixStorage";

/**
 * Registers socket listeners on the active instance and ensures user is in their room.
 */
export default function SocketProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    setSocketDispatch(dispatch);
    bindSocketListeners();

    const role = isConsultantSession()
      ? SOCKET_ROLE.CONSULTANT
      : SOCKET_ROLE.CUSTOMER;
    const socket = connectSocket(role);

    const registerIfKnown = () => {
      const id = getSocketRegisterId();
      if (!id) return;
      ensureSocketRegistered(id, { role }).then((ok) => {
        if (!ok) console.warn("[socket] register failed for", id, role);
        else bindSocketListeners();
      });
    };

    registerIfKnown();
    window.addEventListener("socket-identity-ready", registerIfKnown);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      window.removeEventListener("socket-identity-ready", registerIfKnown);
    };
  }, [dispatch]);

  return children;
}
