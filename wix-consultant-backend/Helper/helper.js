const axios = require("axios");
const xml2js = require("xml2js");

const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};



const getStoreDetailsFromAPI = async (storeHash, accessToken) => {
    try {
        // 1. API Call
        const response = await axios.get(
            `https://api.bigcommerce.com/stores/${storeHash}/v2/store`,
            {
                headers: {
                    "X-Auth-Token": accessToken,
                    "Accept": "application/xml"
                }
            }
        );

        // 2. XML → JSON convert
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        // 3. Extract fields
        const storeData = result.store;

        return {
            domain: storeData.domain,
            secure_url: storeData.secure_url,
            control_panel: storeData.control_panel_base_url,
            name: storeData.name
        };

    } catch (error) {
        console.error("Error fetching store:", error.message);
        return null;
    }
};
module.exports = { formatTime, getStoreDetailsFromAPI }
