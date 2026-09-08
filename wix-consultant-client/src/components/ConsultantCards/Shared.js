import React from "react";

/*
 * Shared presentational pieces for the storefront (home, card, profile).
 * Pure UI — no data fetching, no business logic.
 */

export const DEFAULT_AVATAR = "/images/flag/teamdefault.png";

/** Force https (mixed-content inside the Wix iframe) and normalise Windows paths. */
export function imageUrl(raw) {
  if (!raw) return "";
  const s = String(raw).replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
  return `${process.env.REACT_APP_BACKEND_HOST}/${s}`;
}

/** language can be an array, a JSON string, or an array holding a JSON string. */
export function parseLanguages(raw) {
  try {
    let v = raw;
    if (typeof v === "string") v = JSON.parse(v);
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string" && v[0].trim().startsWith("[")) v = JSON.parse(v[0]);
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    return [];
  } catch (e) {
    return typeof raw === "string" && raw.trim() ? [raw.trim()] : [];
  }
}

/** "Astrology, Tarot; Numerology" → ["Astrology", "Tarot", "Numerology"] */
export function splitTags(raw) {
  return String(raw || "").split(/[,;|/]/).map((s) => s.trim()).filter(Boolean);
}

export function availabilityOf({ isBusy, isActive }) {
  if (isBusy) return { key: "busy", label: "In session" };
  if (isActive) return { key: "online", label: "Available now" };
  return { key: "offline", label: "Offline" };
}

export function initials(name) {
  return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("") || "C";
}

export function Avatar({ src, name, size = 56, status, className = "" }) {
  const [broken, setBroken] = React.useState(false);
  const url = imageUrl(src);
  return (
    <span className={`sf-avatar sf-avatar--${status || "none"} ${className}`} style={{ "--sf-avatar-size": `${size}px` }}>
      {url && !broken ? (
        <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="sf-avatar__initials" aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

export function StatusBadge({ status, compact = false }) {
  return (
    <span className={`sf-status sf-status--${status.key}${compact ? " sf-status--compact" : ""}`}>
      <span className="sf-status__dot" aria-hidden="true" />
      {status.label}
    </span>
  );
}

const PATHS = {
  chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />,
  voice: <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />,
  video: <><path d="M23 7 16 12l7 5V7Z" /><rect x="1" y="5" width="15" height="14" rx="2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 18l-6-6 6-6" />,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
};

export function Icon({ name, size = 16, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export const SERVICES = [
  { kind: "chat", label: "Chat", title: "Chat consultation", blurb: "Text-based, at your own pace." },
  { kind: "voice", label: "Audio", title: "Audio consultation", blurb: "Talk it through on a voice call." },
  { kind: "video", label: "Video", title: "Video consultation", blurb: "Face to face, screen to screen." },
];

/** Login-required / error dialogs. Same markup for both pages. */
export function Dialog({ title, text, icon, actions, labelledBy }) {
  return (
    <div className="sf-dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="sf-dialog__panel">
        {icon && <span className="sf-dialog__icon"><Icon name={icon} size={18} /></span>}
        <h2 className="sf-dialog__title" id={labelledBy}>{title}</h2>
        <p className="sf-dialog__text">{text}</p>
        <div className="sf-dialog__actions">{actions}</div>
      </div>
    </div>
  );
}
