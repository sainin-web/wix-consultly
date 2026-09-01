const jwt = require("jsonwebtoken");
const { User } = require("../Modal/userSchema");
const { shopModel } = require("../Modal/shopify");
const { default: axios } = require("axios");
const mongoose = require("mongoose");

const wixUserController = async (req, res) => {
  const { wixMemberId, email, firstName, lastName, photo, instanceId } =
    req.body;
  console.log("📥 wix-user-session:", req.body);

  if (!wixMemberId) {
    return res.status(400).json({ error: "wixMemberId required" });
  }

  try {
    let record = await User.findOne({ wixMemberId });

    if (record) {
      /*
        ============================
        UPDATE EXISTING USER
        ============================
      */
      record.email = email || record.email;
      record.fullname = firstName || record.fullname; // ✅ fullname
      record.lastName = lastName || record.lastName;
      record.profileImage = photo || record.profileImage;
      record.instanceId = instanceId || record.instanceId;
      record.lastSeen = new Date();
      await record.save();
      console.log("✅ User updated:", record.email);
    } else {
      /*
        ============================
        CREATE NEW USER
        ============================
      */
      record = await User.create({
        wixMemberId,
        email,
        fullname: firstName || "", // ✅ fullname
        lastName: lastName || "",
        profileImage: photo || "",
        instanceId: instanceId || "",
        walletBalance: 0,
        isActive: true,
        isChatAccepted: "request",
        userType: "customer",
        shop_Domain: "defult",
        chatLock: true,
        lastSeen: new Date(),
      });
      console.log("✅ New user created:", record.email);
    }

    return res.json({
      success: true,
      dbId: record._id.toString(),
      email: record.email,
      name: `${record.fullname || ""} ${record.lastName || ""}`.trim(), // ✅ fullname
    });
  } catch (err) {
    console.error("❌ wix-user-session error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
const getMemberFromInstance = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const { instance, adminId = "6a05a2a968ff4f71b20ef0d1" } = req.body;

    if (!instance) {
      return res.status(400).json({
        success: false,
        message: "instance is required in body",
      });
    }

    /*
      ============================
      STEP 1: DECODE INSTANCE
      ============================
    */
    let uid, siteOwnerId;

    try {
      const cleanToken = instance.includes("OauthNG.JWS.")
        ? instance.replace("OauthNG.JWS.", "")
        : instance;

      const parts = cleanToken.split(".");
      const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
      const payload = JSON.parse(payloadStr);

      const instanceData =
        typeof payload.data === "string"
          ? JSON.parse(payload.data)
          : payload.data;

      uid = instanceData?.instance?.uid;
      siteOwnerId = instanceData?.instance?.siteOwnerId;

      console.log("UID:", uid);
      console.log("siteOwnerId:", siteOwnerId);
    } catch (decodeErr) {
      return res.status(400).json({
        success: false,
        message: "Invalid instance token",
        error: decodeErr.message,
      });
    }

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "User not logged in — uid is null",
      });
    }

    /*
      ============================
      STEP 2: GET ADMIN
      ============================
    */

    const memberRes = await axios.get(
      `https://www.wixapis.com/members/v1/members/${uid}`,
      {
        headers: {
          Authorization:
            "OauthNG.JWS.eyJraWQiOiJZSEJzdUpwSCIsImFsZyI6IkhTMjU2In0.eyJkYXRhIjoie1wiaW5zdGFuY2VcIjp7XCJpbnN0YW5jZUlkXCI6XCI0MTgxMzhlOS0wMzk4LTRiOTctOTBiZC1lNDVlMzI0Y2I0OWFcIixcImFwcERlZklkXCI6XCJlODdmYzRmMC1kNzRiLTQ2M2YtYWQ3Ny1iODEzZWVjODQ4NDZcIixcInNpZ25EYXRlXCI6XCIyMDI2LTA1LTI3VDA0OjQzOjU1LjcwOVpcIixcInBlcm1pc3Npb25zXCI6XCJcIixcImRlbW9Nb2RlXCI6ZmFsc2UsXCJzaXRlT3duZXJJZFwiOlwiZjE4OTk0OTktNzVhYi00ODYzLWJlZDMtZDM1M2Y3YjI5ZGZmXCIsXCJtZXRhU2l0ZUlkXCI6XCI5NzAwYzIyZi1jMmNjLTRkNjYtOTMxZS0xM2E3OTVlOTAwZDdcIixcImV4cGlyYXRpb25EYXRlXCI6XCIyMDI2LTA1LTI3VDA4OjQzOjU1LjcwOVpcIixcInBzXCI6XCJlODdmYzRmMC1kNzRiLTQ2M2YtYWQ3Ny1iODEzZWVjODQ4NDY6ZGV2XCIsXCJzY2RcIjpcIjIwMjItMDYtMTBUMDY6NTQ6MjQuNDcwWlwiLFwiYWNkXCI6XCIyMDIyLTAyLTA3VDE2OjI3OjQ0WlwifX0iLCJpYXQiOjE3Nzk4NTcwMzUsImV4cCI6MTc3OTg3MTQzNX0.15YSY7AvWd0u1wHUlVnnz42_MiQSFgPgToxPFyYDjMM",
          "wix-site-id": siteOwnerId, // ✅ KEY FIX
          "Content-Type": "application/json",
        },
      },
    );

    const member = memberRes.data.member;
    console.log("Member:", JSON.stringify(member, null, 2));

    return res.status(200).json({
      success: true,
      data: {
        uid,
        memberId: member.id,
        email: member.loginEmail,
        name: member.profile?.nickname || member.profile?.name || "",
        status: member.status,
        contactId: member.contactId,
      },
    });
  } catch (error) {
    console.log("Get member error:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: "Wix token invalid or expired",
      });
    }
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Member not found on Wix",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

module.exports = { wixUserController, getMemberFromInstance };
