const mongoose = require("mongoose");
const { TransactionHistroy } = require("../Modal/transactionHistroy");
const { User } = require("../Modal/userSchema");
const { WalletHistory } = require("../Modal/walletHistory");
const { WithdrawalRequestSchema } = require("../Modal/withdrawalSchema");
const { shopModel } = require("../Modal/shopify");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const dotenv = require("dotenv");
const { handleWixInstall } = require("../services/wix.service");
const {
  resolveWixInstanceFromToken,
} = require("../services/wixInstanceFromToken");
dotenv.config();

const checkAppBillingController_and_Installection = async (req, res) => {
  try {
    const instance = req.query.instance || req.body.instance;
    if (!instance || !String(instance).trim()) {
      return res.status(400).json({
        success: false,
        message: "Instance missing",
      });
    }

    const raw = String(instance).trim();
    const decoded = await resolveWixInstanceFromToken(raw);
    let shop;

    if (decoded?.instanceId) {
      shop = await handleWixInstall({
        instanceId: decoded.instanceId,
        appDefId: decoded.appDefId,
        siteOwnerId: decoded.siteOwnerId,
        siteMemberId: decoded.siteMemberId,
      });
    } else if (decoded?.shopMongoId) {
      shop = await shopModel.findById(decoded.shopMongoId);
      if (!shop) {
        return res.status(400).json({
          success: false,
          message: "Shop not found for instance id",
        });
      }
    } else {
      shop = await shopModel.findOne({ instanceId: raw });
      if (!shop) {
        return res.status(400).json({
          success: false,
          message: "Invalid or unsupported Wix instance",
        });
      }
    }

    const billingActive = true;
    const token = jwt.sign(
      { instanceId: shop.instanceId, role: "admin" },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "2h" },
    );
    // res.cookie("wix_admin_token", token, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "none",
    //   maxAge: 2 * 60 * 60 * 1000,
    // });

    res.json({
      success: true,
      billingActive,
      token,
      _id: shop._id,
    });
  } catch (error) {
    console.error(
      "check/billing error:",
      error.response?.data || error.message,
    );
    const message =
      error.message === "Failed to handle Wix Installation"
        ? "Could not sync with Wix — check WIX_CLIENT_ID and WIX_CLIENT_SECRET on server"
        : "Verification failed";
    res
      .status(error.message === "Failed to handle Wix Installation" ? 502 : 500)
      .json({
        success: false,
        message,
      });
  }
};
const getShopAllConsultant = async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }
    const shop_id = adminId;
    if (!mongoose.Types.ObjectId.isValid(shop_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid shop ID" });
    }
    let consultants = await User.find({
      userType: "consultant",
      shop_id: shop_id,
    }).select("-password");
    consultants = consultants.map((item) => {
      return {
        ...item._doc,
        profileImage: item.profileImage
          ? `${req.protocol}://${req.get("host")}/${item.profileImage.replace(/\\/g, "/")}`
          : null,
      };
    });

    return res.status(200).send({ success: true, findConsultant: consultants });
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, message: error.message });
  }
};

const adminController = async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }
    const admin = await shopModel.findById(adminId).select("-access_token");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Admin retrieved successfully",
      data: admin,
    });
  } catch (error) {
    console.error("Error in adminController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin data",
      error: error.message,
    });
  }
};

// const voucherController = async (req, res) => {
//   try {
//     const { adminId } = req.params;
//     const { totalCoin, extraCoin, voucherCode } = req.body;
//     console.log("req.body______________", req.body);

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "Admin ID is required",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(adminId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid admin ID",
//       });
//     }
//     const admin = await shopModel.findOne({ _id: adminId });

//     if (!admin) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin not found",
//       });
//     }

//     const voucher = {
//       voucherCode: voucherCode || "",
//       totalCoin,
//       extraCoin,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     admin.vouchers.push(voucher);
//     await admin.save();

//     res.status(200).json({
//       success: true,
//       message: "Voucher + Product created successfully",
//       data: voucher,
//     });
//   } catch (error) {
//     console.error(
//       "Error in voucherController:",
//       error.response?.data || error.message,
//     );

//     res.status(500).json({
//       success: false,
//       message: "Something went wrong",
//     });
//   }
// };

const voucherController = async (req, res) => {
  try {
    const { adminId } = req.params;

    const { totalCoin, extraCoin, voucherCode } = req.body;
    const price = totalCoin;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    if (!totalCoin || !extraCoin || !price) {
      return res.status(400).json({
        success: false,
        message: "totalCoin, extraCoin, and price are required",
      });
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    /*
      ============================
      FIND ADMIN
      ============================
    */

    const admin = await shopModel.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (!admin.accessToken) {
      return res.status(400).json({
        success: false,
        message: "Admin Wix access token is missing",
      });
    }

    let catalogVersion = "V1";

    try {
      const versionRes = await axios.get(
        "https://www.wixapis.com/stores/v3/provision/version",
        {
          headers: {
            Authorization: admin.accessToken,
            "Content-Type": "application/json",
          },
        },
      );

      catalogVersion = versionRes.data.catalogVersion || "V1";
    } catch (versionError) {
      console.log(
        "Catalog version check failed, defaulting to V1:",
        versionError.response?.data || versionError.message,
      );
    }

    console.log("Wix Catalog Version:", catalogVersion);

    let wixProduct;

    if (catalogVersion === "V3") {
      const wixResponse = await axios.post(
        "https://www.wixapis.com/stores/v3/products",
        {
          product: {
            name: `${totalCoin} Coins Voucher`,

            description: `Get ${totalCoin} coins + ${extraCoin} bonus coins`,

            productType: "digital",

            visible: true,

            variants: [
              {
                price: {
                  basePrice: Number(price),
                },
              },
            ],
          },
        },
        {
          headers: {
            Authorization: admin.accessToken,
            "Content-Type": "application/json",
          },
        },
      );

      wixProduct = wixResponse.data.product;
    } else {
      const wixResponse = await axios.post(
        "https://www.wixapis.com/stores/v1/products",
        {
          product: {
            name: `${totalCoin} Coins Voucher`,

            description: `Get ${totalCoin} coins + ${extraCoin} bonus coins`,

            priceData: {
              price: Number(price),
            },

            productType: "physical",

            visible: true,
          },
        },
        {
          headers: {
            Authorization: admin.accessToken,
            "Content-Type": "application/json",
          },
        },
      );

      wixProduct = wixResponse.data.product;
    }

    console.log("Wix Product Created:", wixProduct);

    const voucher = {
      voucherCode: voucherCode || "",
      totalCoin,
      extraCoin,
      price,
      wixProductId: wixProduct._id || wixProduct.id,
      wixProductSlug: wixProduct.slug,
      catalogVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("voucher______________", voucher);
    admin.vouchers.push(voucher);
    await admin.save();

    return res.status(201).json({
      success: true,
      message: "Voucher + Wix Product created",

      data: voucher,
    });
  } catch (error) {
    console.log("Voucher create error", error.response?.data || error.message);

    /*
      ============================
      WIX API SPECIFIC ERRORS
      ============================
    */

    if (error.response) {
      const status = error.response.status;
      const wixError = error.response.data;

      if (status === 401) {
        return res.status(401).json({
          success: false,
          message: "Wix access token is invalid or expired",
          wixError,
        });
      }

      if (status === 403) {
        return res.status(403).json({
          success: false,
          message:
            "Insufficient Wix permissions. Ensure 'Manage Products' permission is granted",
          wixError,
        });
      }

      if (status === 400) {
        return res.status(400).json({
          success: false,
          message: "Invalid product data sent to Wix API",
          wixError,
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
const deleteAdminController = async (req, res) => {
  try {
    const shop = req.headers["x-shopify-shop-domain"];

    const admin = await shopModel.findOneAndUpdate(
      { shop },
      {
        access_token: null,
        uninstalledAt: new Date(),
      },
    );
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteAdminController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete admin",
      error: error.message,
    });
  }
};

const getTransactionController = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.searchQuery?.trim();
    const type = Number(req.query.type) || 0;
    const skip = (page - 1) * limit;

    const typeMap = {
      0: "all",
      1: "chat",
      2: "voice",
      3: "video",
    };

    const typeValue = typeMap[type] || "all";

    const filter = { shop_id: adminId };

    // 🔹 Type filter
    if (typeValue !== "all") {
      filter.type = typeValue;
    }

    // 🔹 SEARCH LOGIC
    if (search) {
      const users = await User.find({
        fullname: { $regex: search, $options: "i" },
      }).select("_id");

      const userIds = users.map((u) => u._id);

      filter.$or = [
        { senderId: { $in: userIds } },
        { receiverId: { $in: userIds } },
      ];
    }

    const transactions = await TransactionHistroy.find(filter)
      .populate("senderId", "fullname email profileImage userType")
      .populate("receiverId", "fullname email profileImage userType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalItems = await TransactionHistroy.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully",
      data: transactions,
      totalItems,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error in getTransactionController:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getUserConsultantController = async (req, res) => {
  try {
    const { adminId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.searchQuery || "";

    const skip = (page - 1) * limit;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    const customers = await WalletHistory.find({
      shop_id: adminId,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        select: "fullname email profileImage phone userType",
        match: search ? { fullname: { $regex: search, $options: "i" } } : {},
      })
      .skip(skip)
      .limit(limit)
      .lean();
    const filteredData = customers.filter(
      (item) =>
        item.userId !== null &&
        item.userId.fullname.toLowerCase().includes(search.toLowerCase()),
    );
    const totalItems = await WalletHistory.countDocuments({ shop_id: adminId });
    if (!customers || customers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customers not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customers retrieved successfully ?",
      data: filteredData,
      totalItems,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error in getUserConsultantController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get customers",
    });
  }
};

const getShopAllUserController = async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }
    const admin = await shopModel.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }
    const users = await User.find({
      instanceId: admin.instanceId,
      userType: "customer",
    })
      .select(
        "fullname email profileImage userType walletBalance updatedAt phone",
      )
      .lean();

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Users not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error in getShopAllUserController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
};

// const getShopAllConsultantController = async (req, res) => {
//   try {
//     const { adminId } = req.params;
//     if (!mongoose.Types.ObjectId.isValid(adminId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid admin ID",
//       });
//     }
//     const users = await User.find({
//       shop_id: adminId,
//       userType: "consultant",
//     })
//       .select(
//         "fullname email profileImage userType walletBalance updatedAt phone",
//       )
//       .lean();

//     if (!users || users.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Consultants not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Users retrieved successfully",
//       data: users,
//     });
//   } catch (error) {
//     console.error("Error in getShopAllUserController:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to get users",
//     });
//   }
// };
const updateUserConsultantController = async (req, res) => {
  try {
    const { adminId } = req.params;
    const body = req.body;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }
    const user = await User.findById(body.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const mType = body.mainType === "manual_credit" ? "credit" : "debit";
    const uAmount = +body.amount;
    user.walletBalance =
      mType === "credit"
        ? user.walletBalance + uAmount
        : user.walletBalance - uAmount;
    await user.save();
    await WalletHistory.create({
      userId: body.userId,
      shop_id: adminId,
      amount: uAmount,
      referenceType: "manual",
      description: body.description,
      transactionType: body.mainType,
      direction: mType,
      status: "success",
    });
    res.status(200).json({
      success: true,
      message: "User wallet updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error in updateUserConsultantController:", error);
  }
};

// app enable and disable
const appEnableAndDisableController = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { appStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    const admin = await shopModel.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    admin.appEnabled = appStatus;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: `App ${appStatus ? "enabled" : "disabled"} successfully`,
      appEnabled: admin.appEnabled,
    });
  } catch (error) {
    console.error("Error in appEnableAndDisableController:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to enable or disable app",
    });
  }
};

const checkAppBillingController = async (req, res) => {
  try {
    const { adminId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }
    const shop = await shopModel.findById(adminId).select("-accessToken");
    if (!shop) return;
    return res.status(200).json({
      success: true,
      message: "App status retrieved successfully",
      data: shop,
    });
  } catch (error) {
    console.error("Error in appEnableAndDisableController:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to enable or disable app",
    });
  }
};

const voucherHandlerController = async (req, res) => {
  try {
    const { shopId, voucherId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(shopId) ||
      !mongoose.Types.ObjectId.isValid(voucherId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const shop = await shopModel.findById(shopId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    shop.vouchers = shop.vouchers.filter((v) => v._id.toString() !== voucherId);

    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Voucher deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const updatesVoucherController = async (req, res) => {
  try {
    const { shopId, voucherId } = req.params;
    const { totalCoin, extraCoin } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(shopId) ||
      !mongoose.Types.ObjectId.isValid(voucherId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const shop = await shopModel.findById(shopId);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const voucher = shop.vouchers.id(voucherId);

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Voucher not found",
      });
    }

    if (totalCoin !== undefined) voucher.totalCoin = totalCoin;
    if (extraCoin !== undefined) voucher.extraCoin = extraCoin;

    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Voucher updated successfully",
      voucher,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const getWithdrawalRequest = async (req, res) => {
  try {
    const { adminId } = req.params;
    const page = Number(req.query.page) || 3;
    const limit = Number(req.query.limit) || 14;
    const skip = (page - 1) * limit;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }
    const widthrawal = await WithdrawalRequestSchema.find({
      shopId: adminId,
    })
      .populate("consultantId", "fullname email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!widthrawal) return;
    const totalItems = await WithdrawalRequestSchema.countDocuments({
      shopId: adminId,
    });

    return res.status(200).json({
      success: true,
      message: "App status retrieved successfully",
      data: widthrawal,
      totalItems,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const updateConsultantWidthrawalRequest = async (req, res) => {
  try {
    const { adminId } = req.params;
    const body = req.body;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }
    const user = await User.findById(body.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const updateReq = await WithdrawalRequestSchema.findByIdAndUpdate(
      body.transactionId,
      {
        status: "paid",
        transactionNumber: body.transactionNumber,
        description: body.description,
      },
    );

    await WalletHistory.create({
      userId: body.userId,
      shop_id: adminId,
      amount: body.amount,
      referenceType: "withdraw",
      description: body.description,
      transactionType: "withdraw",
      direction: body.mainType === "paid" ? "credit" : "",
      status: "success",
    });

    res.status(200).json({
      success: true,
      message: "Paymet successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error in updateUserConsultantController:", error);
  }
};

const declineWithdrawalRequest = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const withdrawal = await WithdrawalRequestSchema.findById(transactionId);
    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Withdrawal already processed",
      });
    }
    if (withdrawal.status == "paid" || withdrawal.status == "declined") {
      return res.status(400).json({
        success: false,
        message: "Alredy Updated ? ",
      });
    }

    const user = await User.findById(withdrawal.consultantId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Consultant not found",
      });
    }

    user.walletBalance += withdrawal.amount;
    await user.save();

    withdrawal.status = "declined";
    await withdrawal.save();

    return res.status(200).json({
      success: true,
      message: "Withdrawal request declined and amount refunded",
    });
  } catch (error) {
    console.error("Decline withdrawal error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const updateAdminPercentage = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { adminPercentage } = req.body;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }

    if (
      adminPercentage === undefined ||
      adminPercentage < 0 ||
      adminPercentage > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Admin percentage must be between 0 and 100",
      });
    }

    const updatedShop = await shopModel.findByIdAndUpdate(
      adminId,
      {
        adminPersenTage: adminPercentage,
      },
      { new: true },
    );

    if (!updatedShop) {
      return res.status(404).json({
        success: false,
        message: "Admin / Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin percentage updated successfully",
      data: updatedShop,
    });
  } catch (error) {
    console.error("Update admin percentage error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  adminController,
  voucherController,
  deleteAdminController,
  getTransactionController,
  getUserConsultantController,
  getShopAllUserController,
  // getShopAllConsultantController,
  updateUserConsultantController,
  appEnableAndDisableController,
  checkAppBillingController,
  voucherHandlerController,
  updatesVoucherController,
  getWithdrawalRequest,
  updateConsultantWidthrawalRequest,
  declineWithdrawalRequest,
  updateAdminPercentage,
  checkAppBillingController_and_Installection,
  getShopAllConsultant,
};
