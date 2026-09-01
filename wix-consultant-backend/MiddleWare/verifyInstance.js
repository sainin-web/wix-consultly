const verifyWixInstance = (req, res, next) => {
    try {
        const instance = req.query.instance || req.headers["x-wix-instance"];

        if (!instance) {
            return res.status(401).json({
                success: false,
                message: "Instance missing"
            });
        }

        // 🔓 decode instance
        const parts = instance.split(".");
        if (parts.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Invalid instance format"
            });
        }

        const payload = parts[1];

        const decoded = JSON.parse(
            Buffer.from(payload, "base64").toString("utf-8")
        );

        // ✅ attach to request
        req.wixData = decoded;
        console.log("INSTANCE VERIFY SUCCESS", instance)

        next();

    } catch (err) {
        console.error("INSTANCE VERIFY ERROR:", err.message);

        return res.status(401).json({
            success: false,
            message: "Invalid instance"
        });
    }
};

module.exports = verifyWixInstance;