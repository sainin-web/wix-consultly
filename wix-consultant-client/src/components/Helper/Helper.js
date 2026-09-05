export const getDuration = (start, end) => {
    if (!start || !end) return "00:00";
    const diffMs = new Date(end) - new Date(start);
    if (diffMs <= 0) return "00:00";
    const diff = Math.floor(diffMs / 1000);
    const m = String(Math.floor(diff / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    return `${m}:${s}`;
};


export const formatAmountHelper = (num) => {
    if (num === null || num === undefined) return "0";

    // Mongo Decimal128 / string / anything → number me convert
    const value = Number(num);

    if (isNaN(value)) return "0";

    // single digit OR below 1000 → normal number (no K)
    if (value < 1000) {
        return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }

    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + "B";
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";

    return value.toString();
};
/** Backend may return adminPersenTage as a number or as Mongo Decimal128 `{ $numberDecimal }`. */
export const parseAdminPersenTage = (raw) => {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "object" && raw !== null && "$numberDecimal" in raw) {
        const n = Number(raw.$numberDecimal);
        return Number.isNaN(n) ? null : n;
    }
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
};

export const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return 0;

    const num = Number(value);
    if (isNaN(num)) return 0;

    // integer value → return as is
    if (Number.isInteger(num)) {
        return num;
    }

    // decimal value → toFixed
    return Number(num.toFixed(decimals));
};


/**
 * One status → Polaris Badge tone mapping for every admin table.
 * Uses the status values the backend actually emits.
 */
export const statusTone = (status) => {
    const s = String(status || "").toLowerCase();
    if (["paid", "success", "completed", "ended", "approved", "credit", "active", "enabled"].includes(s)) return "success";
    if (["pending", "ongoing", "processing"].includes(s)) return "attention";
    if (["declined", "failed", "rejected", "cancelled", "debit", "missed", "disabled"].includes(s)) return "critical";
    return undefined;
};

/** Sentence-case a backend status token: "manual_credit" -> "Manual credit". */
export const humanizeStatus = (value) => {
    if (value === null || value === undefined || value === "" || value === "-") return "-";
    const s = String(value).replace(/_/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

/** Currency prefix + 2dp. Accepts numbers, numeric strings and Decimal128 objects. */
export const formatCurrency = (currency, value) => {
    const raw = value && typeof value === "object" && "$numberDecimal" in value ? value.$numberDecimal : value;
    const n = Number(raw);
    if (!Number.isFinite(n)) return `${currency || ""}0.00`;
    return `${currency || ""}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
