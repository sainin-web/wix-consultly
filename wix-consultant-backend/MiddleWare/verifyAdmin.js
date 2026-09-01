const jwt = require("jsonwebtoken");
const dotenv = require("dotenv")
dotenv.config()

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = decoded; // { instanceId }
    console.log("JWT IS Verify ")
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
module.exports = { verifyAdmin }  