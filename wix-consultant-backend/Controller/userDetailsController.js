const { default: mongoose } = require("mongoose");
const { shopModel } = require("../Modal/shopify");
const { resolveWixInstanceFromToken } = require("../services/wixInstanceFromToken");
const { User } = require("../Modal/userSchema");
const { WalletHistory } = require("../Modal/walletHistory");
const { parsePage, pageMeta } = require("../utils/paginate");
const { CallSession } = require("../Modal/callSessions");
const { TransactionHistroy } = require("../Modal/transactionHistroy");

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: "user" }).select("-password")

        res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            count: users.length,
            data: users
        });

    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("-password")
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            data: user
        });

    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user",
            error: error.message
        });
    }
};

const getShopifyUserByCustomerId = async (req, res) => {
    try {
        const { customerId } = req.params;
        console.log("customerId", customerId);
        const user = await User.findOne({ shopifyCustomerId: customerId });
        console.log("user__SHOPIFY__", user);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "User retrieved successfully",
            data: user
        });

    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch user",
            error: error.message
        });
    }
}
const getVouchersController = async (req, res) => {
    try {
        const { adminId } = req.params;
        console.log("adminId", adminId)
        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }
        if (!mongoose.Types.ObjectId.isValid(adminId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }
        const admin = await shopModel.findById(adminId).select("-access_token").select("vouchers").select("_id");

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }
        const vouchers = {
            vouchers: (admin.vouchers || []).filter((v) => v.active !== false),
            shopCurrency: admin.currency,
            id: admin._id
        };
        res.status(200).json({
            success: true,
            message: "Vouchers retrieved successfully",
            data: vouchers
        });
    } catch (error) {
        console.error("Error in getVouchersController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}

// get app status (storefront — resolve admin by Mongo id or Wix instance)
const getAppStatusController = async (req, res) => {
    try {
        const { instance, adminIdLocal } = req.query;
        let admin = null;

        if (adminIdLocal && mongoose.Types.ObjectId.isValid(adminIdLocal)) {
            admin = await shopModel.findById(adminIdLocal);
        }

        if (!admin && instance) {
            const resolved = await resolveWixInstanceFromToken(instance);
            if (resolved?.shopMongoId) {
                admin = await shopModel.findById(resolved.shopMongoId);
            } else if (resolved?.instanceId) {
                admin = await shopModel.findOne({
                    instanceId: resolved.instanceId,
                });
            } else {
                admin = await shopModel.findOne({ instanceId: instance });
            }
        }

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "App status retrieved successfully",
            data: Boolean(admin.appEnabled),
            adminId: admin._id,
        });
    } catch (error) {
        console.error("Error in getAppStatusController:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error",
        });
    }
};

const getUserWalletHistroy = async (req, res) => {
    try {
        const { userId, shopId } = req.params;

        if (
            !mongoose.Types.ObjectId.isValid(userId) ||
            !mongoose.Types.ObjectId.isValid(shopId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid ID"
            });
        }

        // Optional server-side paging + row kind. kind=credits → credit rows that
        // are NOT voucher purchases (those have their own list in the profile).
        const pg = parsePage(req.query);
        const match = { userId, shop_id: shopId };
        if (req.query.kind === "credits") { match.direction = "credit"; match.transactionType = { $ne: "voucher_purchase" }; }
        else if (req.query.kind === "debits") match.direction = "debit";

        let q = WalletHistory.find(match).populate("userId", "fullname email").sort({ createdAt: -1 });
        if (pg) q = q.skip(pg.skip).limit(pg.limit);
        const [wallet, total] = await Promise.all([q.lean(), pg ? WalletHistory.countDocuments(match) : Promise.resolve(0)]);

        // `populate()` can return `userId: null` if the referenced user was deleted.
        const safeWallet = (wallet || []).filter(
            (w) => w.userId && w.userId.fullname
        );

        return res.status(200).json({
            success: true,
            data: safeWallet,
            ...(pg ? { pagination: pageMeta(pg, total) } : {}),
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getcallSessionsController = async (req, res) => {
    try {
        const { channelName } = req.query;
        console.log("channel__", req.body, channelName)
        const callSession = await CallSession.findOne({ sessionId: channelName });
        if (!callSession) {
            return res.status(404).json({
                success: false,
                message: "Call session not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: callSession
        });
    } catch (error) {
        console.error("Error fetching call session:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch call session",
            error: error.message
        });
    }
}

const getUserConversationController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Id is not valid" })
        // Optional server-side paging (page/limit) + type filter. Without a page
        // param the legacy "all rows" response is returned unchanged.
        const pg = parsePage(req.query);
        const type = ["chat", "voice", "video"].includes(req.query.type) ? req.query.type : null;
        const party = { $or: [{ senderId: id }, { receiverId: id }] };
        const match = type ? { ...party, type } : party;

        let q = TransactionHistroy.find(match)
            .populate("senderId", "fullname email")
            .populate("receiverId", "fullname email")
            .sort({ createdAt: -1 });
        if (pg) q = q.skip(pg.skip).limit(pg.limit);

        const oid = new mongoose.Types.ObjectId(id);
        const [conversations, total, summaryRows] = await Promise.all([
            q,
            pg ? TransactionHistroy.countDocuments(match) : Promise.resolve(0),
            // Per-type totals over ALL of the user's sessions (the tiles must not depend on the page).
            pg ? TransactionHistroy.aggregate([
                { $match: { $or: [{ senderId: oid }, { receiverId: oid }] } },
                { $group: { _id: "$type", count: { $sum: 1 }, amount: { $sum: { $convert: { input: "$amount", to: "double", onError: 0, onNull: 0 } } } } },
            ]) : Promise.resolve([]),
        ]);

        const final = conversations.map(c => {
            const sender = c.senderId; const receiver = c.receiverId;
            const consultant = sender && sender._id && sender._id.toString() === id ? receiver : sender;
            return { ...c.toObject(), consultant };
        });

        if (!pg) return res.json({ success: true, data: final });

        const summary = { chat: { count: 0, amount: 0 }, voice: { count: 0, amount: 0 }, video: { count: 0, amount: 0 } };
        for (const r of summaryRows) if (summary[r._id]) summary[r._id] = { count: r.count, amount: Math.round(r.amount * 100) / 100 };
        res.json({ success: true, data: final, pagination: pageMeta(pg, total), summary });

    } catch (error) {
        return res.status(500).send({ success: false, message: "Somthing went wrong " })
    }
}

module.exports =
{
    getAllUsers,
    getUserById,
    getShopifyUserByCustomerId,
    getVouchersController,
    getAppStatusController,
    getUserWalletHistroy,
    getcallSessionsController,
    getUserConversationController
};
