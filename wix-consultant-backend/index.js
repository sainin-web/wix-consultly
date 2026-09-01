const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./Utils/db");
const { corsOptions } = require("./config/corsConfig");
dotenv.config();
connectDB();
const path = require("path");
const app = express();

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));


app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' *.wix.com *.wixsite.com *.wix-dev-sites.org *.wix-development-sites.org *.wixstudio.com *.wixstudio.io"
  );
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/api/our/consultant", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.sendFile(path.join(__dirname, "public", "consultant-login-bundle.js"));
});
const {
  resolveWixInstanceFromAuthHeader,
} = require("./services/wixInstanceFromToken");
app.get("/api/get-instance", async (req, res) => {
  const result = await resolveWixInstanceFromAuthHeader(
    req.headers.authorization
  );
  if (!result.success) {
    return res.status(result.status || 401).json({ error: result.error });
  }
  return res.json({
    instance: result.instance,
    instanceId: result.instanceId,
  });
});



const PORT = process.env.MVC_BACKEND_PORT
const server = http.createServer(app);
const { ioServer } = require("./server-io");

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  }),
);
app.use("/api/wp-connector", (req, res) => {
  console.log("req.body", req.body);
  res.send("Hello World");
  res.status(200).json({
    success: true,
    message: "Voucher bought successfully",
    data: req.body,
  });
});

const { callRoutes } = require("./Routes/videoCallRotes");
const { signinSignupRouter } = require("./Routes/signin-signupRoute");
const { userDetailsRouter } = require("./Routes/userDetailsRoutes");
const { consultantRoute } = require("./Routes/consultantRoute");
const chatRoutes = require("./Routes/chatRoutes");
const firebaseRouter = require("./Routes/firebaseRoutes");
const { userRouter } = require("./Routes/userRoutes");
const { adminRoute } = require("./Routes/adminRoute");

const { wixInstallectionRoute } = require("./Routes/wixInstallectionRoute");
const wixRoute = require("./Routes/wixRoute");
const {wixStroeFrontRoute} = require("./Routes/wixStroeFrontRoute");
app.use("/api/call", callRoutes);
app.use("/api/auth", signinSignupRouter);
app.use("/api/users", userDetailsRouter);
app.use("/api/api-consultant", consultantRoute);
app.use("/api", wixInstallectionRoute);
app.use("/api", wixRoute)
app.use("/api", wixStroeFrontRoute)
// /** Shopify Routes */
// app.use("/app", shopifyRoute);
// app.use("/apps", shopifyRoute);
// app.use("/api", shopifyRoute);
/** BigCommerce Installation Routes */

// app.use("/local-consultant/public/app", shopifyRoute);
// app.use("/local-consultant/public/apps", shopifyRoute);
const { webhookRoutes } = require("./Routes/webhookRoutes");
app.use("/api", webhookRoutes);
const { onboardingRoute } = require("./Routes/onboardingRoute");
app.use("/api/onboarding", onboardingRoute);
/** Chat Routes */
app.use("/api/chat", chatRoutes);
// app.use("/api", firebaseRouter);

/** User Routes */
app.use("/api/users", userRouter);
app.use("/api/fetch", adminRoute);
app.use("/api/admin", adminRoute);

// app.use("/api/princing", adminPrincingRoute);



ioServer(server);
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
