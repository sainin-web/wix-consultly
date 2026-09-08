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
const wixCatalog = require("../services/wixCatalog");
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

    console.log("[VOUCHER CREATE] Starting voucher creation", { adminId, totalCoin, extraCoin, price });
    console.log("[VOUCHER CREATE] Instance:", admin.instanceId);

    // Token may be missing/expired since install → refresh through the install
    // service for this existing instance. Still nothing → cannot talk to Wix.
    let token = admin.accessToken;
    if (!token || !admin.tokenExpiry || admin.tokenExpiry <= Date.now() + 60000) {
      try {
        const fresh = await handleWixInstall({ instanceId: admin.instanceId });
        token = fresh?.accessToken || token;
      } catch (tokenError) {
        console.error("[VOUCHER CREATE] Token refresh failed", tokenError.message);
      }
    }
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Admin Wix access token is missing",
      });
    }

    // Catalog version decides the product API. V3_CATALOG → V3 endpoints, never V1.
    let catalogVersion;
    try {
      const cv = await wixCatalog.getCatalogVersion(token);
      catalogVersion = cv.version;
      console.log("[VOUCHER CREATE] Catalog version:", cv.raw || "(empty)", "→", catalogVersion);
    } catch (versionError) {
      console.warn("[VOUCHER CREATE] Catalog version check failed → defaulting to V1", wixCatalog.wixErrorInfo(versionError));
      catalogVersion = "V1";
    }
    if (catalogVersion === "NONE") {
      return res.status(409).json({ success: false, code: "stores_not_installed", message: "Wix Stores is not installed on this site. Install Wix Stores, then create the voucher again." });
    }

    const productName = String(req.body.name || "").trim() || `${totalCoin} Coins Voucher`;
    const productDescription = `Get ${totalCoin} coins + ${extraCoin} bonus coins`;
    let created;
    try {
      created = await wixCatalog.createVoucherProduct({ token, version: catalogVersion, name: productName, description: productDescription, price });
    } catch (createError) {
      if (createError.code && createError.productId) {
        // Product exists but failed read-back verification: do not keep a broken product.
        console.error("[VOUCHER CREATE] Product created but NOT purchasable — deleting it", { productId: createError.productId, code: createError.code, detail: createError.detail });
        try { await wixCatalog.deleteVoucherProduct({ token, version: catalogVersion, productId: createError.productId }); } catch (e) { console.error("[VOUCHER CREATE] cleanup failed", wixCatalog.wixErrorInfo(e)); }
        return res.status(502).json({ success: false, code: createError.code, message: `Wix created the product but it is not purchasable: ${createError.detail}` });
      }
      throw createError;
    }
    if (!created.productId) {
      console.error("[VOUCHER CREATE] Wix API returned no product id — voucher NOT saved");
      return res.status(502).json({ success: false, message: "Wix did not return a product id" });
    }
    console.log("[VOUCHER CREATE] Wix product created:", created.productId, { catalog: catalogVersion, variantId: created.variantId || null, wixPrice: created.price ?? null, currency: created.currency ?? null, availability: created.availability ?? null });

    const voucher = {
      voucherCode: voucherCode || "",
      name: req.body.name ? productName : "",
      active: true,
      totalCoin,
      extraCoin,
      price,
      wixProductId: created.productId,
      wixProductSlug: created.slug,
      wixVariantId: created.variantId || undefined,
      catalogVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    admin.vouchers.push(voucher);
    try {
      await admin.save();
    } catch (dbError) {
      // Never leave a purchasable product that no voucher points to.
      console.error("[VOUCHER CREATE] DB save failed after Wix product creation — cleaning up orphan product", { productId: created.productId, error: dbError.message });
      try {
        await wixCatalog.deleteVoucherProduct({ token, version: catalogVersion, productId: created.productId });
        console.log("[VOUCHER CREATE] Orphan Wix product deleted", created.productId);
      } catch (cleanupError) {
        console.error("[VOUCHER CREATE] ORPHAN Wix product could not be deleted — delete it manually in the Wix dashboard", { productId: created.productId, ...wixCatalog.wixErrorInfo(cleanupError) });
      }
      throw dbError;
    }
    console.log("[VOUCHER CREATE] Voucher saved with wixProductId", { voucherId: String(admin.vouchers[admin.vouchers.length - 1]._id), wixProductId: created.productId });

    return res.status(201).json({
      success: true,
      message: "Voucher + Wix Product created",
      // the saved sub-document (has _id) — the admin UI edits/deletes by id
      data: admin.vouchers[admin.vouchers.length - 1],
    });
  } catch (error) {
    console.error("[VOUCHER CREATE] Wix API failed", wixCatalog.wixErrorInfo(error));

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
/**
 * PUT /api/admin/admin/voucher-repair/:shopId
 * Verify every Catalog V3 voucher against Wix and repair what can be repaired:
 * missing inventory item → created (inStock:true); wrong/missing variant id →
 * adopted from the product. Reports the rest (missing product, zero price).
 * Read-then-fix; never touches purchases or wallets.
 */
const repairVouchersController = async (req, res) => {
  try {
    const { shopId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(shopId)) return res.status(400).json({ success: false, message: "Invalid ID" });
    const shop = await shopModel.findById(shopId);
    if (!shop) return res.status(404).json({ success: false, message: "Shop not found" });
    let token = shop.accessToken;
    if (!token || !shop.tokenExpiry || shop.tokenExpiry <= Date.now() + 60000) {
      const fresh = await handleWixInstall({ instanceId: shop.instanceId });
      token = fresh?.accessToken || token;
    }
    const report = [];
    let changed = false;
    for (const v of shop.vouchers) {
      if (!v.wixProductId) { report.push({ voucherId: String(v._id), status: "no_product" }); continue; }
      if (!wixCatalog.isV3(v.catalogVersion)) { report.push({ voucherId: String(v._id), status: "v1_skipped" }); continue; }
      try {
        const r = await wixCatalog.verifyV3Purchasable({ token, productId: v.wixProductId, variantId: v.wixVariantId, expectedPrice: v.price });
        if (r.ok) {
          if (r.variantId !== v.wixVariantId) { v.wixVariantId = r.variantId; changed = true; }
          report.push({ voucherId: String(v._id), status: "ok", repaired: r.repaired, variantId: r.variantId, wixPrice: r.price, voucherPrice: v.price, availability: r.availability });
        } else {
          report.push({ voucherId: String(v._id), status: r.code, message: r.message, state: r.state });
        }
      } catch (e) {
        report.push({ voucherId: String(v._id), status: "error", error: wixCatalog.wixErrorInfo(e) });
      }
    }
    if (changed) await shop.save();
    console.log("[VOUCHER REPAIR]", { shopId, results: report.map((r) => `${r.voucherId}:${r.status}${r.repaired ? "(repaired)" : ""}`) });
    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("[VOUCHER REPAIR] failed", error.message);
    return res.status(500).json({ success: false, message: "Something went wrong" });
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

    const target = shop.vouchers.id(voucherId);
    if (!target) return res.status(404).json({ success: false, message: "Voucher not found" });

    // Delete the store product first so no orphan stays purchasable. If Wix
    // refuses (other than 404), keep the voucher so the admin can retry.
    if (target.wixProductId) {
      let token = shop.accessToken;
      if (!shop.tokenExpiry || shop.tokenExpiry <= Date.now() + 60000) {
        const fresh = await handleWixInstall({ instanceId: shop.instanceId });
        token = fresh?.accessToken || token;
      }
      try {
        const r = await wixCatalog.deleteVoucherProduct({ token, version: target.catalogVersion, productId: target.wixProductId });
        console.log("[VOUCHER DELETE] Wix product", r.alreadyGone ? "already gone" : "deleted", { productId: target.wixProductId });
      } catch (wixError) {
        console.error("[VOUCHER DELETE] Wix API failed — voucher kept", wixCatalog.wixErrorInfo(wixError));
        return res.status(502).json({ success: false, code: "wix_delete_failed", message: "The store product could not be deleted. The voucher was kept so you can retry.", wixError: wixCatalog.wixErrorInfo(wixError) });
      }
    }

    shop.vouchers = shop.vouchers.filter((v) => v._id.toString() !== voucherId);

    await shop.save();
    console.log("[VOUCHER DELETE] Voucher removed", { voucherId });

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
    const { totalCoin, extraCoin, name, active } = req.body;

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

    // Price follows totalCoin (existing convention). Push name/price to the
    // Wix product FIRST using the voucher's own catalog version; only then
    // persist, so the store and the voucher never disagree.
    const priceChanged = totalCoin !== undefined && Number(totalCoin) !== Number(voucher.price);
    const nameChanged = name !== undefined && String(name || "").trim() !== String(voucher.name || "");
    if (voucher.wixProductId && (priceChanged || nameChanged)) {
      let token = shop.accessToken;
      if (!shop.tokenExpiry || shop.tokenExpiry <= Date.now() + 60000) {
        const fresh = await handleWixInstall({ instanceId: shop.instanceId });
        token = fresh?.accessToken || token;
      }
      console.log("[VOUCHER UPDATE] Syncing Wix product", { voucherId, catalog: wixCatalog.normalizeCatalogVersion(voucher.catalogVersion), priceChanged, nameChanged });
      try {
        const r = await wixCatalog.updateVoucherProduct({
          token,
          version: voucher.catalogVersion,
          productId: voucher.wixProductId,
          name: nameChanged ? (String(name || "").trim() || `${totalCoin ?? voucher.totalCoin} Coins Voucher`) : undefined,
          price: priceChanged ? Number(totalCoin) : undefined,
        });
        if (r.variantId && !voucher.wixVariantId) voucher.wixVariantId = r.variantId;
        console.log("[VOUCHER UPDATE] Wix product updated", { productId: voucher.wixProductId });
      } catch (wixError) {
        console.error("[VOUCHER UPDATE] Wix API failed — voucher NOT changed", wixCatalog.wixErrorInfo(wixError));
        return res.status(502).json({ success: false, code: "wix_update_failed", message: "The store product could not be updated. No changes were saved.", wixError: wixCatalog.wixErrorInfo(wixError) });
      }
    }

    if (totalCoin !== undefined) { voucher.totalCoin = totalCoin; voucher.price = Number(totalCoin); }
    if (extraCoin !== undefined) voucher.extraCoin = extraCoin;
    if (name !== undefined) voucher.name = String(name || "").trim();
    if (active !== undefined) voucher.active = Boolean(active);
    voucher.updatedAt = new Date();

    await shop.save();
    console.log("[VOUCHER ADMIN] updated", { voucherId, active: voucher.active });

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
  repairVouchersController,
  getWithdrawalRequest,
  updateConsultantWidthrawalRequest,
  declineWithdrawalRequest,
  updateAdminPercentage,
  checkAppBillingController_and_Installection,
  getShopAllConsultant,
};
