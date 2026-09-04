import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const WixInstanceGuard = ({ children }) => {
    const [searchParams] = useSearchParams();
    const [allowed, setAllowed] = useState(null);

    useEffect(() => {
        const instanceFromUrl = searchParams.get("instance");

        // localStorage can throw inside a sandboxed iframe — must not crash the guard.
        let instanceFromStorage = null;
        try {
            instanceFromStorage = localStorage.getItem("wix_instance");
        } catch (err) {
            console.warn("[GUARD] localStorage unavailable:", err.message);
        }

        const instance = instanceFromUrl || instanceFromStorage;

        console.log("[GUARD] instance from URL    :", instanceFromUrl || "(none)");
        console.log("[GUARD] instance from storage:", instanceFromStorage || "(none)");

        if (instance) {
            if (instanceFromUrl) {
                try {
                    localStorage.setItem("wix_instance", instanceFromUrl);
                } catch (err) {
                    console.warn("[GUARD] could not persist instance:", err.message);
                }
            }
            console.log("[GUARD] ✅ access allowed");
            setAllowed(true);
        } else {
            console.warn(
                "[GUARD] ⛔ No Wix instance — access blocked. " +
                "The widget did not pass ?instance= in the iframe URL.",
            );
            setAllowed(false);
        }
    }, []);

    if (allowed === null) {
        return <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '500px',
            height: 'auto',
            fontFamily: 'Arial'
        }}>Loading...</div>;
    }

    if (!allowed) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '500px',
                height: 'auto',
                fontFamily: 'Arial',
                color: '#333',
                textAlign: 'center',
                padding: '20px'
            }}>
                <h2>⛔ Access Denied</h2>
                <p>This page can only be accessed through the Wix storefront.</p>
            </div>
        );
    }

    return children;
};

export default WixInstanceGuard;