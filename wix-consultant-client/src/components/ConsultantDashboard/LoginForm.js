import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./LoginForm.module.css";
import axios from "axios";
import openTokenWindow from "../../firebase/utils/openTokenWindow";
import { setConsultantSession } from "../../utils/wixStorage";
import { ensureSocketRegistered, SOCKET_ROLE } from "../Sokect-io/SokectConfig";

const LoginForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [consultantBlockedError, setConsultantBlockedError] = useState("");

  const instance = searchParams.get("instance") || localStorage.getItem("wix_instance") || "";
  const q = instance ? `?instance=${instance}` : "";

  // ✅ Fix 1 — Agar already logged in hai toh seedha dashboard pe bhejo
  useEffect(() => {
    const token = localStorage.getItem("token");
    const isLoggedIn = localStorage.getItem("consultant_logged_in");
    if (token && isLoggedIn === "true") {
      console.log("✅ Already logged in — redirecting to dashboard");
      navigate(`/consultant-dashboard${q}`, { replace: true });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FCM token window se message aane pe dashboard pe jao
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.tokenGenerated === true) {
        console.log("✅ Token generated — navigating to dashboard");

        // ✅ Fix 2 — Widget ko bhi batao
        window.parent.postMessage({ tokenGenerated: true }, '*');

        navigate(`/consultant-dashboard${q}`, { replace: true });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate, q]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setConsultantBlockedError("");

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/login-consultant`,
        formData,
      );

      const { userData, token, secure_url } = response?.data;

      if (response.status === 200 && userData?._id) {
        const userId = userData._id;
        const shopId = userData.shop_id;

        setConsultantSession({
          id: userId,
          shopId,
          token,
          secureUrl: secure_url,
          displayName: userData.fullname,
          displayEmail: userData.email,
        });

        await ensureSocketRegistered(userId, {
          role: SOCKET_ROLE.CONSULTANT,
          force: true,
        });
        // openTokenWindow({ userId, shopId });
      } else {
        setErrors({ email: "Invalid email or password" });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong.";
      setConsultantBlockedError(msg);
      setErrors({ email: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginContainer}>
        <h1 className={styles.loginTitle}>Login</h1>
        <form className={styles.loginForm} onSubmit={handleSubmit}>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>Email</label>
            <input
              type="email" id="email" name="email"
              className={`${styles.formInput} ${errors.email ? styles.inputError : ""}`}
              value={formData.email} onChange={handleChange} autoComplete="email"
            />
            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>Password</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? "text" : "password"} id="password" name="password"
                className={`${styles.formInput} ${errors.password ? styles.inputError : ""}`}
                value={formData.password} onChange={handleChange} autoComplete="current-password"
              />
              <button type="button" className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className={styles.errorMessage}>{errors.password}</span>}
          </div>

          <div className={styles.forgotPasswordContainer}>
            <a href="#" className={styles.forgotPassword} onClick={(e) => e.preventDefault()}>
              Forgot your password?
            </a>
          </div>

          <button type="submit"
            className={`${styles.submitButton} ${isLoading ? styles.buttonLoading : ""}`}
            disabled={isLoading}>
            {isLoading ? (
              <>
                <svg className={styles.spinner} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                Signing in...
              </>
            ) : "Log in"}
          </button>

          {consultantBlockedError && (
            <div className={styles.errorMessage}>{consultantBlockedError}</div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginForm;