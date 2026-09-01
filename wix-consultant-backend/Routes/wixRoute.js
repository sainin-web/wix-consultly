const express = require('express');
const { wixUserController, getMemberFromInstance } = require('../Controller/wixUserController');
const wixRoute = express.Router();

wixRoute.post('/wix-user-session', wixUserController);
wixRoute.post('/wix-member-from-instance/', getMemberFromInstance);
module.exports = wixRoute;
