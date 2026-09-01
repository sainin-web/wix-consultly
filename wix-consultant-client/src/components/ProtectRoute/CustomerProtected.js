import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function CustomerProtected() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    const loggedInCustomerId = params.get("logged_in_customer_Id");
    const shop = params.get("shop");

    useEffect(() => {
        if (!loggedInCustomerId && shop) {
            console.log("❌ Customer not logged in → redirecting to Shopify login");

            // 🔥 MUST break out of iframe
            window.top.location.href = `https://${shop}/account/login`;
        }
    }, [loggedInCustomerId, shop]);

    if (!loggedInCustomerId) {
        return <div>Redirecting to login...</div>;
    }

    return <Outlet />;
}
