const { default: mongoose } = require("mongoose");
const { shopModel } = require("../Modal/shopify");
const { resolveWixInstanceFromToken } = require("../services/wixInstanceFromToken");
const { User } = require("../Modal/userSchema");
const { WalletHistory } = require("../Modal/walletHistory");
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
            vouchers: admin.vouchers,
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

        const wallet = await WalletHistory.find({
            userId,
            shop_id: shopId
        })
            .populate("userId", "fullname email")
            .sort({ createdAt: -1 })
            .lean();

        // `populate()` can return `userId: null` if the referenced user was deleted.
        const safeWallet = (wallet || []).filter(
            (w) => w.userId && w.userId.fullname
        );

        return res.status(200).json({
            success: true,
            data: safeWallet
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
        const conversations = await TransactionHistroy.find({
            $or: [
                { senderId: id },
                { receiverId: id }
            ]
        })
            .populate("senderId", "fullname email")
            .populate("receiverId", "fullname email")
            .sort({ createdAt: -1 });

        const final = conversations.map(c => {
            const consultant =
                c.senderId._id.toString() === id
                    ? c.receiverId
                    : c.senderId;

            return {
                ...c.toObject(),
                consultant
            };
        });

        res.json({ success: true, data: final });

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
