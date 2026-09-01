import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function StorefrontNavbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const instance = localStorage.getItem("wix_instance");
    const q = instance ? `?instance=${instance}` : "";

    const isActive = (path) => location.pathname.startsWith(path);

    const navItems = [
        { label: "Home", path: `/consultant/card${q}` },
        { label: "My Profile", path: `/profile${q}` },
        { label: "Consultant Login", path: `/login${q}` },
    ];

    return (
        <nav style={styles.nav}>
            {navItems.map((item) => (
                <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    style={{
                        ...styles.btn,
                        ...(isActive(item.path.split('?')[0]) ? styles.active : {})
                    }}
                >
                    {item.label}
                </button>
            ))}
        </nav>
    );
}

const styles = {
    nav: {
        display: 'flex',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #eee',
        flexWrap: 'wrap',
    },
    btn: {
        background: 'none',
        border: '1px solid #ddd',
        borderRadius: '20px',
        padding: '6px 16px',
        cursor: 'pointer',
        fontSize: '13px',
        color: '#444',
        transition: 'all 0.2s',
    },
    active: {
        backgroundColor: '#000',
        color: '#fff',
        border: '1px solid #000',
    },
};

export default StorefrontNavbar;