import { useAppStatus } from "./AppStatusProvider";

const shellStyle = {
  minHeight: "420px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
  color: "#333",
};

const ProtectStoreFront = ({ children }) => {
  const { loading, appEnabled, isStorefront } = useAppStatus();

  if (!isStorefront) {
    return children;
  }

  if (loading) {
    return (
      <div style={shellStyle}>
        <p style={{ margin: 0, fontSize: "16px" }}>Loading…</p>
      </div>
    );
  }

  if (!appEnabled) {
    return (
      <div style={shellStyle} role="alert">
        <div
          style={{
            maxWidth: "420px",
            padding: "28px 24px",
            borderRadius: "12px",
            background: "#f6f6f7",
            border: "1px solid #e3e3e3",
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 600 }}>
            App currently deactivated
          </h2>
          <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.5, color: "#555" }}>
            The consultant app has been turned off by the store owner. Please
            check back later or contact the site administrator.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectStoreFront;
