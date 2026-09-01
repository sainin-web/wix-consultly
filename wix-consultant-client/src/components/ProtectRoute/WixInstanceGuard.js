import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const WixInstanceGuard = ({ children }) => {
    const [searchParams] = useSearchParams();
    const [allowed, setAllowed] = useState(null);

    useEffect(() => {
        const instanceFromUrl = searchParams.get("instance");
        const instanceFromStorage = localStorage.getItem("wix_instance");
        const instance = instanceFromUrl || instanceFromStorage;

        if (instance) {
            if (instanceFromUrl) {
                localStorage.setItem("wix_instance", instanceFromUrl);
            }
            setAllowed(true);
        } else {
            console.warn("⛔ No Wix instance — access blocked");
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