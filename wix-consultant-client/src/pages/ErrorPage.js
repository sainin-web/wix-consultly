import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useSelector } from "react-redux";

export default function ErrorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isValid } = useSelector((state) => state.wixAuth);
  const instance =
    searchParams.get("instance") ||
    localStorage.getItem("wix_instance") ||
    "";

  useEffect(() => {
    if (isValid) {
      const q = instance ? `?instance=${encodeURIComponent(instance)}` : "";
      navigate(`/${q}`, { replace: true });
    }
  }, [isValid, instance, navigate]);

  const retry = () => {
    const q = instance ? `?instance=${encodeURIComponent(instance)}` : "";
    navigate(`/${q}`);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <span style={styles.icon}>⚠️</span>
        <h1 style={styles.title}>Something Went Wrong</h1>
        <p style={styles.sub}>
          We couldn't verify your Wix app instance. Please try again or
          reinstall the app from the Wix App Market.
        </p>
        <button style={styles.btn} onClick={retry}>
          Retry
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#f4f6f8", fontFamily:"sans-serif" },
  card: { background:"#fff", borderRadius:12, padding:"48px 40px", textAlign:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", maxWidth:420, width:"100%" },
  icon: { fontSize:"3rem" },
  title: { fontSize:"1.8rem", color:"#e53e3e", margin:"16px 0 12px" },
  sub: { color:"#666", lineHeight:1.6, marginBottom:28 },
  btn: { background:"#e53e3e", color:"#fff", border:"none", borderRadius:8, padding:"12px 32px", fontSize:"1rem", cursor:"pointer" },
};
