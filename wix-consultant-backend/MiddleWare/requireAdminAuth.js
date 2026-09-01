const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const requireAdminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("authHeader", authHeader);

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token",
      });
    }

    const token = authHeader.split(" ")[1];

    console.log("token", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    console.log("decoded", decoded);

    req.admin = decoded;

    next();
  } catch (error) {
    console.log("JWT ERROR", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

module.exports = { requireAdminAuth };
