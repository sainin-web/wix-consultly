import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import {
  ensureWixCustomerSession,
  persistWixCustomerIds,
} from "../utils/wixCustomerSession";
import { getCustomerId, KEYS, migrateLegacyCustomerId } from "../utils/wixStorage";

const WixUserContext = createContext(null);

function readUserFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const wixDbId = params.get("wixDbId");
  console.log("wixDbId", wixDbId);
  if (params.get("wixLoggedIn") !== "true" || !wixDbId) return null;
  return {
    email: params.get("wixEmail") || "",
    firstName: params.get("wixName") || "",
    lastName: params.get("wixLastName") || "",
    memberId: params.get("wixMemberId") || "",
    photo: params.get("wixPhoto") || "",
    wixDbId,
  };
}

function readUserFromStorage() {
  const wixDbId = getCustomerId();
  if (!wixDbId) return null;
  return {
    email: localStorage.getItem(KEYS.CUSTOMER_EMAIL) || "",
    firstName: localStorage.getItem(KEYS.CUSTOMER_FIRST) || "",
    lastName: localStorage.getItem(KEYS.CUSTOMER_LAST) || "",
    memberId: localStorage.getItem(KEYS.CUSTOMER_MEMBER) || "",
    photo: localStorage.getItem(KEYS.CUSTOMER_PHOTO) || "",
    wixDbId,
  };
}

export const WixUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyWixUser = useCallback((userData) => {
    if (!userData?.wixDbId) return;
    setUser(userData);
    persistWixCustomerIds(userData.wixDbId, userData);
    console.log("🎯 Wix user active:", userData.email, userData.wixDbId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      migrateLegacyCustomerId();
      const fromUrl = readUserFromUrl();
      if (fromUrl) {
        applyWixUser(fromUrl);
        if (!cancelled) setLoading(false);
        return;
      }

      const fromStorage = readUserFromStorage();
      if (fromStorage) {
        applyWixUser(fromStorage);
        if (!cancelled) setLoading(false);
        return;
      }

      console.log("⚠️ Wix user — guest (no wixDbId in URL or storage yet)");
      if (!cancelled) setLoading(false);
    };

    init();

    const onMessage = async (event) => {
      const { type, dbId, wixDbId, memberId, email, firstName, lastName, photo } =
        event.data || {};

      if (type === "WIX_USER_READY" && (dbId || wixDbId)) {
        applyWixUser({
          wixDbId: dbId || wixDbId,
          email: email || "",
          firstName: firstName || "",
          lastName: lastName || "",
          memberId: memberId || "",
          photo: photo || "",
        });
        return;
      }

      if (type === "WIX_MEMBER" && memberId) {
        try {
          const instanceId =
            localStorage.getItem("wix_instance") ||
            new URLSearchParams(window.location.search).get("instance") ||
            "";
          const saved = await ensureWixCustomerSession({
            wixMemberId: memberId,
            email: email || "",
            firstName: firstName || "",
            lastName: lastName || "",
            photo: photo || "",
            instanceId,
          });
          if (saved?.dbId) {
            applyWixUser({
              wixDbId: saved.dbId,
              email: saved.email || email,
              firstName,
              lastName,
              memberId,
              photo,
            });
          }
        } catch (err) {
          console.error("Wix member session failed:", err.message);
        }
      }
    };

    const onIdentityReady = () => {
      const stored = readUserFromStorage();
      if (stored) applyWixUser(stored);
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("socket-identity-ready", onIdentityReady);

    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
      window.removeEventListener("socket-identity-ready", onIdentityReady);
    };
  }, [applyWixUser]);

  return (
    <WixUserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </WixUserContext.Provider>
  );
};

export const useWixUser = () => {
  const context = useContext(WixUserContext);
  if (!context) {
    throw new Error("useWixUser must be used within a WixUserProvider");
  }
  return context;
};
