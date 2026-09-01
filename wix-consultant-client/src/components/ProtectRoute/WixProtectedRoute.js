import { useSelector } from "react-redux";
import { Navigate, useSearchParams } from "react-router-dom";

export default function WixProtectedRoute({ children }) {
  const { loading, isValid, billingActive, instance } = useSelector(
    (state) => state.wixAuth
  );
  const [searchParams] = useSearchParams();

  const inst =
    instance ||
    searchParams.get("instance") ||
    localStorage.getItem("wix_instance");
  const q = inst ? `?instance=${encodeURIComponent(inst)}` : "";

  console.log("WixProtectedRoute state →", { loading, isValid, billingActive, inst });

  if (loading) return <WixLoader />;

  if (!isValid) return <Navigate to={`/error${q}`} replace />;

  // TODO: Wix Payments integration will be added later — re-enable when billingActive is enforced
  if (!billingActive) {
    return <Navigate to={`/admin/pricing-page${q}`} replace />;
  }

  return children;
}

function WixLoader() {
  return (
    <div style={styles.wrap}>
      <div style={styles.spinner} />
      <p style={styles.text}>Loading…</p>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f4f6f8",
    fontFamily: "sans-serif",
  },
  spinner: {
    width: 44,
    height: 44,
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #116dff",
    borderRadius: "50%",
    animation: "wix-spin 0.75s linear infinite",
  },
  text: { marginTop: 16, color: "#666", fontSize: "0.95rem" },
};

if (typeof document !== "undefined" && !document.getElementById("wix-spin-style")) {
  const s = document.createElement("style");
  s.id = "wix-spin-style";
  s.textContent = `@keyframes wix-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}
