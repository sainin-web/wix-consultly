const JWT = require("jsonwebtoken")
const dotenv = require("dotenv");
dotenv.config();



const verify_Token = async (request) => {
   try {
      const auth = request.headers.authorization || request.headers.Authorization
  
      if (!auth || typeof auth !== "string") {
         return false
      }

      const parts = auth.trim().split(" ")
      if (parts.length !== 2) {
         return false
      }

      const [scheme, token] = parts
      if (!/^Bearer$/i.test(scheme) || !token) {
         return false
      }

      const jwt_ = JWT.verify(token,process.env.JWT_SECRET_KEY)
      return !!jwt_ && jwt_
   } catch (err) {
      console.log("token is invalid ", err)
      return false
   }
}
module.exports = { verify_Token }