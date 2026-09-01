const dotenv = require("dotenv");
dotenv.config();

const WIX_ORIGIN_PATTERNS = [
  /^https:\/\/[^/]+\.wix\.com$/i,
  /^https:\/\/[^/]+\.wixsite\.com$/i,
  /^https:\/\/[^/]+\.wix-dev-sites\.org$/i,
  /^https:\/\/[^/]+\.wix-development-sites\.org$/i,
  /^https:\/\/[^/]+\.wixstudio\.com$/i,
  /^https:\/\/[^/]+\.wixstudio\.io$/i,
  /^https:\/\/manage\.wix\.com$/i,
  /^https:\/\/editor\.wix\.com$/i,
];
function parseAllowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS || "";
  const fromEnv = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = [
    process.env.REACT_APP_FRONTEND_URL,
    process.env.WIX_DASHBOARD_URL,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean);
  return [...new Set([...fromEnv, ...defaults])];
}

const allowedList = parseAllowedOrigins();

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedList.includes(origin)) return true;
  if (WIX_ORIGIN_PATTERNS.some((re) => re.test(origin))) return true;
  if (origin.includes("ngrok-free.dev") || origin.includes("ngrok.io")) {
    return true;
  }
  if (
    process.env.NODE_ENV !== "production" &&
    (origin.includes("ngrok") || origin.includes("localhost"))
  ) {
    return true;
  }
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn("CORS blocked origin:", origin);
      callback(null, false);
    }
  },
  credentials: true,
};

const socketCors = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) callback(null, true);
    else callback(null, false);
  },
  methods: ["GET", "POST"],
  credentials: true,
};

module.exports = { corsOptions, socketCors, isAllowedOrigin };
