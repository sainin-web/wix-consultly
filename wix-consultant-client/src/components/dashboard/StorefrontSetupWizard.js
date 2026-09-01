import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  Fragment,
} from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { getWixAdminToken } from "../../utils/getWixAdminToken";

const BACKEND = (process.env.REACT_APP_BACKEND_HOST || "").replace(/\/$/, "");

const STATUS = {
  CHECKING: "checking",
  CONNECTED: "connected",
  NOT_CONNECTED: "not_connected",
  CONNECTING: "connecting",
  ERROR: "error",
};

const POLL_IDLE_MS = 12000; // card visible, not connected yet
const POLL_ACTIVE_MS = 5000; // wizard open / editor launched

/**
 * Storefront Setup Wizard — premium onboarding for merchants.
 * Presentation + two additive onboarding endpoints only; reuses the existing
 * admin JWT (wix_access_token) and localStorage wix_id like every admin page.
 */
export function StorefrontSetupWizard({ consultantCount = 0 }) {
  const [status, setStatus] = useState(STATUS.CHECKING);
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [serverConsultants, setServerConsultants] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [editorOpened, setEditorOpened] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const wasConnectedRef = useRef(false);
  const pollRef = useRef(null);

  const adminId =
    typeof window !== "undefined" ? localStorage.getItem("wix_id") : null;

  const fetchStatus = useCallback(async () => {
    if (!adminId || !BACKEND) {
      setStatus(STATUS.ERROR);
      return;
    }
    try {
      const token = await getWixAdminToken();
      const { data } = await axios.get(
        `${BACKEND}/api/onboarding/storefront-status/${adminId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data?.success) {
        setLastSeenAt(data.lastSeenAt || null);
        if (typeof data.consultantCount === "number") {
          setServerConsultants(data.consultantCount);
        }
        const connected = !!data.storefrontConnected;
        if (connected && !wasConnectedRef.current) {
          // celebrate only on the transition, not on every poll
          if (wasConnectedRef.current === false && status !== STATUS.CHECKING) {
            setJustConnected(true);
          }
        }
        wasConnectedRef.current = connected;
        setStatus(connected ? STATUS.CONNECTED : STATUS.NOT_CONNECTED);
      } else {
        setStatus(STATUS.ERROR);
      }
    } catch (err) {
      setStatus((prev) =>
        prev === STATUS.CONNECTED ? STATUS.CONNECTED : STATUS.ERROR,
      );
    }
  }, [adminId, status]);

  // Initial load + adaptive polling until connected
  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === STATUS.CONNECTED && !wizardOpen) return undefined;
    const interval =
      wizardOpen || editorOpened ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    pollRef.current = setInterval(fetchStatus, interval);
    return () => clearInterval(pollRef.current);
  }, [status, wizardOpen, editorOpened, fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setFallbackMode(false);
    try {
      const token = await getWixAdminToken();
      const { data } = await axios.post(
        `${BACKEND}/api/onboarding/editor-deep-link/${adminId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data?.success && data.url) {
        window.open(data.url, "_blank", "noopener");
        setEditorOpened(true);
      } else {
        setFallbackMode(true);
      }
    } catch (err) {
      setFallbackMode(true);
    } finally {
      setConnecting(false);
    }
  };

  const consultants =
    serverConsultants !== null ? serverConsultants : consultantCount;
  const isConnected = status === STATUS.CONNECTED;

  const steps = [
    {
      key: "installed",
      title: "App Installed",
      caption: "Consulty is installed on your Wix site.",
      done: true,
    },
    {
      key: "consultant",
      title: "Consultant Added",
      caption:
        consultants > 0
          ? `${consultants} consultant${consultants === 1 ? "" : "s"} ready to go.`
          : "Add your first consultant to show on your website.",
      done: consultants > 0,
    },
    {
      key: "storefront",
      title: "Connect Storefront",
      caption: isConnected
        ? "The Consulty widget is live on your website."
        : "Add the Consulty widget to your website.",
      done: isConnected,
    },
    {
      key: "publish",
      title: "Publish Website",
      caption: isConnected
        ? "Your website is publishing the widget."
        : "Publish your site so visitors can see your consultants.",
      done: isConnected,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const currentIndex = steps.findIndex((s) => !s.done);
  const progress = Math.round((doneCount / steps.length) * 100);

  const badge = {
    [STATUS.CHECKING]: { label: "Checking…", cls: "checking" },
    [STATUS.CONNECTED]: { label: "Connected", cls: "connected" },
    [STATUS.NOT_CONNECTED]: { label: "Not Connected", cls: "off" },
    [STATUS.CONNECTING]: { label: "Connecting…", cls: "checking" },
    [STATUS.ERROR]: { label: "Status unavailable", cls: "error" },
  }[status];

  return (
    <Fragment>
      {/* ── Dashboard card ── */}
      <motion.div
        className={`saas-connect-card${isConnected ? " is-connected" : ""}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="saas-connect-icon" aria-hidden="true">
          {isConnected ? (
            <i className="bi bi-check-circle-fill" />
          ) : (
            <i className="bi bi-globe2" />
          )}
        </div>
        <div className="saas-connect-body">
          <div className="saas-connect-titlerow">
            <h3>{isConnected ? "Website Connected" : "Connect Your Website"}</h3>
            <span className={`saas-connect-badge saas-connect-badge--${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <p>
            {isConnected
              ? "Your storefront is live — visitors can see and book your consultants."
              : "Your consultants are not visible until your storefront is connected."}
          </p>
          {isConnected && lastSeenAt && (
            <p className="saas-connect-meta">
              Last activity: {new Date(lastSeenAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="saas-connect-actions">
          {isConnected ? (
            <button
              type="button"
              className="saas-btn-ghost"
              onClick={() => setWizardOpen(true)}
            >
              View setup
            </button>
          ) : (
            <button
              type="button"
              className="saas-btn-primary"
              onClick={() => setWizardOpen(true)}
              disabled={status === STATUS.CHECKING}
            >
              🚀 Connect Storefront
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Wizard modal ── */}
      <AnimatePresence>
        {wizardOpen && (
          <motion.div
            className="saas-wizard-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setWizardOpen(false)}
          >
            <motion.div
              className="saas-wizard"
              role="dialog"
              aria-modal="true"
              aria-label="Storefront setup wizard"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="saas-wizard-close"
                aria-label="Close setup wizard"
                onClick={() => setWizardOpen(false)}
              >
                ✕
              </button>

              <div className="saas-wizard-head">
                <span className="saas-wizard-illustration" aria-hidden="true">
                  {isConnected ? "🎉" : "🌐"}
                </span>
                <h2>
                  {isConnected
                    ? "Your website is connected!"
                    : "Storefront Setup"}
                </h2>
                <p>
                  {isConnected
                    ? "Everything is live. Visitors can now see and book your consultants."
                    : "Get your consultants in front of visitors in a few guided steps."}
                </p>
              </div>

              <div
                className="saas-wizard-progress"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="saas-wizard-progress-track">
                  <motion.div
                    className="saas-wizard-progress-fill"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="saas-wizard-progress-label">
                  {doneCount} of {steps.length} completed
                </span>
              </div>

              <ol className="saas-wizard-steps">
                {steps.map((step, i) => {
                  const state = step.done
                    ? "done"
                    : i === currentIndex
                      ? "current"
                      : "pending";
                  return (
                    <motion.li
                      key={step.key}
                      className={`saas-wizard-step saas-wizard-step--${state}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <span className="saas-wizard-step-circle" aria-hidden="true">
                        {step.done ? <i className="bi bi-check-lg" /> : i + 1}
                      </span>
                      <span className="saas-wizard-step-body">
                        <span className="saas-wizard-step-title">
                          {step.title}
                        </span>
                        <span className="saas-wizard-step-caption">
                          {step.caption}
                        </span>

                        {/* Step 3 actions */}
                        {step.key === "storefront" && !step.done && (
                          <span className="saas-wizard-step-actions">
                            <button
                              type="button"
                              className="saas-btn-primary"
                              onClick={handleConnect}
                              disabled={connecting}
                            >
                              {connecting ? (
                                <Fragment>
                                  <span className="saas-spinner" aria-hidden="true" />
                                  Opening your editor…
                                </Fragment>
                              ) : editorOpened ? (
                                "Reopen Wix Editor"
                              ) : (
                                "🚀 Connect Storefront"
                              )}
                            </button>
                            {editorOpened && !fallbackMode && (
                              <span className="saas-wizard-hint">
                                Your Wix Editor opened in a new tab with the
                                Consulty widget added. Click{" "}
                                <strong>Publish</strong> there — this page
                                updates automatically.
                              </span>
                            )}
                            {fallbackMode && (
                              <span className="saas-wizard-hint saas-wizard-hint--warn">
                                One-click connect is temporarily unavailable.
                                Open your Wix Editor, click{" "}
                                <strong>Add&nbsp;(+) → App Widgets →
                                Consulty</strong>, place the widget, then
                                Publish. This page updates automatically.
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                      <span
                        className={`saas-wizard-step-badge saas-wizard-step-badge--${state}`}
                      >
                        {state === "done"
                          ? "Completed"
                          : state === "current"
                            ? "Current"
                            : "Pending"}
                      </span>
                    </motion.li>
                  );
                })}
              </ol>

              <AnimatePresence>
                {(isConnected || justConnected) && (
                  <motion.div
                    className="saas-wizard-success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    ✅ Your website is already connected.
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Fragment>
  );
}

export default StorefrontSetupWizard;
