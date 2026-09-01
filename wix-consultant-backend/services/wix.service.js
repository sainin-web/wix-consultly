const axios = require("axios");
const { shopModel } = require("../Modal/shopify");
const dotenv = require("dotenv")
dotenv.config()

/**
 * Fetch the site display name / domain from Wix Site Properties API
 * Requires a valid access token for the instance
 */

/**
 * Shared install logic — fetch token + save to DB
 * Called from both the install controller (GET) and webhook (POST)
 */
const handleWixInstall = async ({ instanceId, appDefId = "", siteOwnerId = "", siteMemberId = "" }) => {
    try {
        // 1. Check if shop exists and token is still fresh
        const existing = await shopModel.findOne({ instanceId });

        // Token valid hai toh refresh ki zaroorat nahi
        // Buffer: 60 seconds pehle hi refresh kar lo safety ke liye
        if (existing && existing.accessToken && existing.tokenExpiry > (Date.now() + 60000)) {
            console.log("⏭️ Token still valid for:", instanceId);
            return existing;
        }

        console.log("📡 Fetching new access token for:", instanceId);

        // 2. Wix Token API Call
        const tokenRes = await axios.post(
            "https://www.wixapis.com/oauth2/token",
            {
                grant_type: "client_credentials",
                client_id: process.env.WIX_CLIENT_ID,
                client_secret: process.env.WIX_CLIENT_SECRET,
                instance_id: instanceId,
            },
            { headers: { "Content-Type": "application/json" } }
        );

        const { access_token, expires_in } = tokenRes.data;

        // 3. Fetch site domain using the new token

        // 4. Upsert
        // Sirf wahi fields update karo jo param mein aayi hain (siteOwnerId etc.)
        const updateData = {
            accessToken: access_token,
            tokenExpiry: Date.now() + expires_in * 1000,
            updatedAt: new Date(),
        };

        if (appDefId) updateData.appDefId = appDefId;
        if (siteOwnerId) updateData.siteOwnerId = siteOwnerId;
        if (siteMemberId) updateData.siteMemberId = siteMemberId;
        // if (siteDomain) updateData.shop_Domain = siteDomain;
        if (!existing) updateData.installedAt = new Date();

        const updatedShop = await shopModel.findOneAndUpdate(
            { instanceId },
            { $set: updateData },
            { upsert: true, new: true }
        );

        console.log("✅ DB Sync Complete for:", instanceId);
        return updatedShop;

    } catch (error) {
        console.error("❌ Wix Install/Token Error:", error.response?.data || error.message);
        throw new Error("Failed to handle Wix Installation");
    }
};

module.exports = { handleWixInstall };
