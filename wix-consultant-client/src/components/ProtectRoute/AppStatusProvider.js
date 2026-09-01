import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  KEYS,
  migrateLegacyCustomerId,
  persistCustomerId,
} from "../../utils/wixStorage";
import { isStorefrontPath } from "./storefrontRoutes";

const AppStatusContext = createContext({
  loading: true,
  appEnabled: true,
  isStorefront: false,
});

export const AppStatusProvider = ({ children }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const storefront = isStorefrontPath(location.pathname);

  const [loading, setLoading] = useState(storefront);
  const [appEnabled, setAppEnabled] = useState(!storefront);

  const shop_id =
    searchParams.get("shopid") ||
    searchParams.get("shopId") ||
    localStorage.getItem(KEYS.SHOP_ID);
  const user_id = searchParams.get("customerId");
  const instance =
    searchParams.get("instance") ||
    localStorage.getItem(KEYS.INSTANCE);

  useEffect(() => {
    if (shop_id) {
      localStorage.setItem(KEYS.SHOP_ID, shop_id);
    }
    if (user_id) {
      persistCustomerId(user_id);
    }
    migrateLegacyCustomerId();
  }, [shop_id, user_id]);

  useEffect(() => {
    if (!storefront) {
      setAppEnabled(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const checkAppStatus = async () => {
      try {
        const adminIdLocal =
          shop_id || localStorage.getItem(KEYS.SHOP_ID) || undefined;

        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_HOST}/api/users/app-status-verify-app-status`,
          {
            params: {
              instance: instance || undefined,
              adminIdLocal: adminIdLocal || undefined,
            },
          },
        );

        if (cancelled) return;

        if (response.data?.success) {
          setAppEnabled(Boolean(response.data.data));
          if (response.data.adminId) {
            localStorage.setItem(KEYS.SHOP_ID, String(response.data.adminId));
          }
        } else {
          setAppEnabled(false);
        }
      } catch (err) {
        console.error("App status check failed:", err?.message || err);
        if (!cancelled) setAppEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAppStatus();
    return () => {
      cancelled = true;
    };
  }, [storefront, instance, shop_id]);

  return (
    <AppStatusContext.Provider
      value={{ loading, appEnabled, isStorefront: storefront }}
    >
      {children}
    </AppStatusContext.Provider>
  );
};

export const useAppStatus = () => useContext(AppStatusContext);
