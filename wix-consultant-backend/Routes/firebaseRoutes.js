const { firebaseGetToken } = require("../Controller/firebaseController");
const express = require("express");
const firebaseRouter = express.Router();

firebaseRouter.post("/save-fcm-token", firebaseGetToken);

module.exports = firebaseRouter;