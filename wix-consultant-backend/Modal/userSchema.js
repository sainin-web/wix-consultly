const mongoose = require("mongoose");

const registerUserSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shop_id: {
      type: String,
    },
    shop_Domain: {
      type: String,
      required: true,
    },
    wixMemberId: {
      type: String
    },
    password: {
      type: String,
      trim: true,
    },

    instanceId: {
      type: String,
      // trim: true,

    },
    isActive: {
      type: Boolean,
      default: false,
    },

    // User Type
    userType: {
      type: String,
      required: true,
    },

    displayName: {
      type: String,
    },

    phone: {
      type: String,
    },

    // Consultant Details
    experience: {
      type: String,
    },
    fees: {
      type: String,
    },
    language: {
      type: Array,
    },
    bio: {
      type: String,
      // required: true,
    },
    gender: {
      type: String,
    },

    // Address Fields
    houseNumber: {
      type: String,
    },
    streetArea: {
      type: String,
    },
    landmark: {
      type: String,
    },
    address: {
      type: String,
    },
    pincode: {
      type: String,
    },

    dateOfBirth: {
      type: Date,
    },

    pan_cardNumber: {
      type: String,
    },

    // User-specific
    agoraUid: {
      type: Number,
      unique: true,
      sparse: true,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },

    profession: {
      type: String,
    },
    specialization: {
      type: String,
    },
    licenseNo: {
      type: String,
      unique: true,
      sparse: true, // null values ko ignore karega - duplicate error se bachayega
    },
    consultantStatus: {
      type: Boolean,
    },
    profileImage: {
      type: String,
      // required: true,
      default: null,
    },

    // Shopify
    bigcommerceCustomerId: {
      type: String,
      sparse: true,
      trim: true,
    },
    chatCost: {
      type: Number,
      // default: 0,
    },
    voicePerMinute: {
      type: Number,
      // default: 0,
    },
    videoPerMinute: {
      type: Number,
      // default: 0,
    },
    chatPerMinute: {
      type: Number,
      // default: 0,
    },
    chatLock: {
      type: String,
      default: false,
    },
    isBusy: {
      type: Boolean,
    },
    isChatAccepted: {
      type: String,
      default: "request",
    },
    cartId: {
      type: String,
      defult: "",
    },

    firebaseToken: {
      token: { type: String, default: null },
      updatedAt: { type: Date, default: null },
      userAgent: { type: String, default: "" },
      browser: { type: String, default: "" },
      os: { type: String, default: "" },
    },
  },

  { timestamps: true },
);

// Model already exists check karo - duplicate model name se bachne ke liye
const User =
  mongoose.models.ragisterUser ||
  mongoose.model("ragisterUser", registerUserSchema);

module.exports = { User };
