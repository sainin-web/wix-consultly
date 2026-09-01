const { Conversation } = require("../Modal/Histroy");
const { User } = require("../Modal/userSchema");
const { find } = require("../Modal/userSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { ChatList } = require("../Modal/chatListSchema");
const validator = require("validator");
const { TransactionHistroy } = require("../Modal/transactionHistroy");
const { WalletHistory } = require("../Modal/walletHistory");
const { WithdrawalRequestSchema } = require("../Modal/withdrawalSchema");
const { ConsultantClient } = require("../Modal/consultantClient");
const dotenv = require("dotenv");
const { shopModel } = require("../Modal/shopify");
dotenv.config();

/**
 * Create a new consultant
 * @param {Object} req - Request object with shop_id in params, body data, and profileImage file
 * @param {Object} res - Response object
 */

const consultantController = async (req, res) => {
  try {
    const { shop_id } = req.params;
    const body = req.body;
    const file = req.file;

    if (!shop_id || !mongoose.Types.ObjectId.isValid(shop_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    const requiredFields = [
      "fullName",
      "email",
      "password",
      "phoneNumber",
      "profession",
      "specialization",
      "licenseIdNumber",
      "yearOfExperience",
      "languages",
      "displayName",
      "gender",
      "houseNumber",
      "streetArea",
      "landmark",
      "address",
      "pincode",
      "dateOfBirth",
      "pancardNumber",
      "voicePerMinute",
      "videoPerMinute",
      "chatPerMinute",
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        missingFields,
      });
    }

    // if (!file) {
    //     return res.status(400).json({
    //         success: false,
    //         message: "Profile image is required"
    //     });
    // }

    const existingEmail = await User.findOne({
      email: body.email.toLowerCase().trim(),
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists. Please use a different email.",
      });
    }

    const existingLicense = await User.findOne({
      licenseNo: body.licenseIdNumber,
    });
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message:
          "License number already exists. Please use a different license number.",
      });
    }

    const uploadFolder = path.join("uploads", "consultants");
    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder, { recursive: true });
    }
    let imageURL = null;

    if (file) {
      const ext = path.extname(file.originalname);
      const fileName = `consultant-${Date.now()}${ext}`;
      const filePath = path.join(uploadFolder, fileName);

      fs.writeFileSync(filePath, file.buffer);
      imageURL = `uploads/consultants/${fileName}`;
    }

    let randomAgoraUid;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      randomAgoraUid = Math.floor(100000 + Math.random() * 900000);
      const existingAgoraUid = await User.findOne({ agoraUid: randomAgoraUid });
      if (!existingAgoraUid) {
        break;
      }
      attempts++;
      if (attempts >= maxAttempts) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate unique Agora UID. Please try again.",
        });
      }
    } while (true);

    let languagesArray;
    try {
      languagesArray = JSON.parse(body.languages);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid languages format. Expected JSON array.",
      });
    }
    if (!body.password || body.password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }
    const adminDomain = await shopModel.findById(shop_id)
    const hashPassword = await bcrypt.hash(body.password, 10);
    const consultantDetails = new User({
      shop_id,
      shop_Domain: adminDomain.shop_Domain || "demo",
      fullname: body.fullName,
      email: body.email.toLowerCase().trim(),
      phone: body.phoneNumber,
      password: hashPassword,
      profession: body.profession,
      specialization: body.specialization,
      licenseNo: body.licenseIdNumber,
      experience: String(body.yearOfExperience),
      // fees: String(body.chargingPerMinute),
      language: languagesArray,
      displayName: body.displayName,
      gender: body.gender,
      houseNumber: body.houseNumber,
      streetArea: body.streetArea,
      landmark: body.landmark,
      address: body.address,
      pincode: body.pincode,
      dateOfBirth: new Date(body.dateOfBirth),
      pan_cardNumber: body.pancardNumber,
      profileImage: imageURL,
      isActive: false,
      agoraUid: randomAgoraUid,
      userType: "consultant",
      consultantStatus: false,
      voicePerMinute: body.voicePerMinute,
      videoPerMinute: body.videoPerMinute,
      chatPerMinute: body.chatPerMinute,
    });

    await consultantDetails.save();

    return res.status(201).json({
      success: true,
      message: "Consultant created successfully",
      consultantId: consultantDetails._id,
    });
  } catch (error) {
    console.error("Error in consultantController:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please use a different value.`,
      });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const updateConsultantData = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const file = req.file;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consultant ID",
      });
    }

    const requiredFields = [
      "fullName",
      "email",
      "phoneNumber",
      "profession",
      "specialization",
      "licenseIdNumber",
      "yearOfExperience",
      "languages",
      "displayName",
      "gender",
      "houseNumber",
      "streetArea",
      "landmark",
      "address",
      "pincode",
      "dateOfBirth",
      "pancardNumber",
      "voicePerMinute",
      "videoPerMinute",
      "chatPerMinute",
    ];

    const missingFields = requiredFields.filter((field) => !body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
        missingFields,
      });
    }

    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Consultant not found",
      });
    }

    const emailExists = await User.findOne({
      email: body.email.toLowerCase().trim(),
      _id: { $ne: id },
    });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const licenseExists = await User.findOne({
      licenseNo: body.licenseIdNumber,
      _id: { $ne: id },
    });
    if (licenseExists) {
      return res.status(400).json({
        success: false,
        message: "License number already exists",
      });
    }

    let languagesArray;
    try {
      languagesArray = JSON.parse(body.languages);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid languages format. Expected JSON array.",
      });
    }

    let imageURL = existingUser.profileImage;
    if (file) {
      const uploadFolder = path.join("uploads", "consultants");
      if (!fs.existsSync(uploadFolder)) {
        fs.mkdirSync(uploadFolder, { recursive: true });
      }

      const ext = path.extname(file.originalname);
      const fileName = `consultant-${Date.now()}${ext}`;
      const filePath = path.join(uploadFolder, fileName);

      fs.writeFileSync(filePath, file.buffer);
      imageURL = `uploads/consultants/${fileName}`;
    }

    let hashedPassword = existingUser.password;
    if (body.password) {
      if (body.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }
      hashedPassword = await bcrypt.hash(body.password, 10);
    }

    const updatedData = {
      fullname: body.fullName,
      email: body.email.toLowerCase().trim(),
      phone: body.phoneNumber,
      password: hashedPassword,
      profession: body.profession,
      specialization: body.specialization,
      licenseNo: body.licenseIdNumber,
      experience: String(body.yearOfExperience),
      language: languagesArray,
      displayName: body.displayName,
      gender: body.gender,
      houseNumber: body.houseNumber,
      streetArea: body.streetArea,
      landmark: body.landmark,
      address: body.address,
      pincode: body.pincode,
      dateOfBirth: new Date(body.dateOfBirth),
      pan_cardNumber: body.pancardNumber,
      profileImage: imageURL,
      voicePerMinute: body.voicePerMinute,
      videoPerMinute: body.videoPerMinute,
      chatPerMinute: body.chatPerMinute,
    };

    await User.findByIdAndUpdate(id, updatedData, { new: true });

    return res.status(200).json({
      success: true,
      message: "Consultant updated successfully",
    });
  } catch (error) {
    console.error("Error in updateConsultantData:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * login consultant
 * @param {login} req
 * @param {*} res
 * @returns
 */

const loginConsultant = async (request, response) => {
  try {
    const { email, password } = request.body;
    const find_User = await User.findOne({ email });
    if (!find_User) {
      return response.status(400).send({
        success: false,
        message: "Incorrect email or password",
      });
    }

    if (find_User.consultantStatus === false) {
      return response.status(403).send({
        success: false,
        message: "Your account is blocked. Please contact administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, find_User.password);
    if (!isMatch) {
      return response.status(400).send({
        success: false,
        message: "Incorrect email or password",
      });
    }
    const store = await shopModel.findById(find_User.shop_id);
    if (!store) {
      return response.status(400).send({
        success: false,
        message: "Store not found",
      });
    }
    const token = jwt.sign(
      { id: find_User._id, role: "consultant" },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" },
    );

    return response.status(200).send({
      success: true,
      message: "Login successful",
      token,
      userData: find_User,
      secure_url: store.secure_url,
    });
  } catch (err) {
    return response.status(500).send({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const getConsultant = async (req, res) => {
  try {
    const { shop_id } = req.params;
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

const updateConsultantStatus = async (request, response) => {
  try {
    const { id } = request.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "Invalid consultant ID" });
    }
    if (!id) {
      return response
        .status(400)
        .json({ message: "Consultant ID is required" });
    }
    const consultant = await User.findById(id);
    if (!consultant) {
      return res.status(404).json({ message: "Consultant not found" });
    }
    // Toggle ONLY consultantStatus
    consultant.consultantStatus = !consultant.consultantStatus;
    await consultant.save();

    return response.status(200).send({
      success: true,
      message: "Status updated successfully",
      status: consultant.consultantStatus,
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

const getConsultantById = async (request, response) => {
  try {
    const { id } = request.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "Invalid consultant ID" });
    }
    if (!id) {
      return response
        .status(400)
        .json({ message: "Consultant ID is required" });
    }
    const consultant = await User.findById(id).select("-password");
    return response.status(200).send({ success: true, consultant });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

const getConsultantHistory = async (request, response) => {
  try {
    const { id } = request.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "Invalid consultant ID" });
    }
    if (!id) {
      return response
        .status(400)
        .json({ message: "Consultant ID is required" });
    }
    const history = await Conversation.find({ consultantId: id });
    const userHistory = [];
    for (const item of history) {
      userHistory.push({
        userId: item.userId,
        user: item.userSnapshot,
        type: item.type,
        startTime: item.startTime,
        endTime: item.endTime,
        durationSeconds: item.durationSeconds,
      });
    }
    return response.status(200).send({ success: true, userHistory });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

const getConsultantAllUser = async (request, response) => {
  try {
    const { id } = request.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "Invalid consultant ID" });
    }
    if (!id) {
      return response
        .status(400)
        .json({ message: "Consultant ID is required" });
    }
    const consultantUser = await Conversation.find({ consultantId: id });
    const userData = [];
    for (const item of consultantUser) {
      userData.push({
        userId: item.userId,
        user: item.userSnapshot,
        type: item.type,
        startTime: item.startTime,
        endTime: item.endTime,
        durationSeconds: item.durationSeconds,
      });
    }

    if (!consultantUser) {
      return response
        .status(400)
        .json({ message: "Consultant user not found" });
    }
    return response.status(200).send({ success: true, userData });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

const getConsultantAllUserHistory = async (request, response) => {
  try {
    const historyConsultantUser = await Conversation.find();
    if (!historyConsultantUser) {
      return response
        .status(400)
        .json({ message: "History consultant user not found" });
    }
    return response.status(200).send({ success: true, historyConsultantUser });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

/**
 * delete consultant
 * @param {string} id
 * @returns {Promise<{success: boolean, message: string}>}
 */
const deleteConsultant = async (request, response) => {
  try {
    const { id } = request.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "Invalid consultant ID" });
    }
    if (!id) {
      return response
        .status(400)
        .json({ message: "Consultant ID is required" });
    }
    const deleteConsultant = await User.findByIdAndDelete(id);
    // console.log("deleteConsultant", deleteConsultant);
    if (!deleteConsultant) {
      return response.status(400).json({ message: "Consultant not found" });
    }
    return response
      .status(200)
      .send({ success: true, message: "Consultant deleted successfully" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

/**
 * get consultant by shop id and consultant id
 * @param {string} shop_id
 * @returns {Promise<{success: boolean, message: string, consultants: User[]}>}
 */
const getConsultantByShopIdAndConsultantId = async (request, response) => {
  try {
    const { shop_id, consultant_id } = request.params;

    if (!mongoose.Types.ObjectId.isValid(shop_id)) {
      return response.status(400).json({ message: "Invalid shop ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(consultant_id)) {
      return response.status(400).json({ message: "Invalid consultant ID" });
    }
    if (!consultant_id || !shop_id) {
      return response
        .status(400)
        .json({ message: "Consultant Shop  ID is required" });
    }
    const consultant = await User.findOne({
      _id: consultant_id,
      shop_id: shop_id,
    });

    return response.status(200).send({ success: true, consultant });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

/**
 * get chat list by shop id and consultant id
 * @param {string} shop_id
 * @param {string} consultant_id
 * @returns {Promise<{success: boolean, message: string, chatList: ChatList[]}>}
 */
const getChatListByShopIdAndConsultantId = async (request, response) => {
  try {
    const { shop_id, consultant_id } = request.params;
    console.log("shop_id, consultant_id_______________________✅", shop_id, consultant_id);
    if (!mongoose.Types.ObjectId.isValid(shop_id)) {
      return response.status(400).json({ message: "Invalid shop ID" });
    }
    const chatList = await ChatList.find({
      shop_id: shop_id,
      receiverId: consultant_id,
    })
      .populate("senderId")
      .populate("receiverId")
      .populate("shop_id")
      .sort({ updatedAt: -1 });
    if (!chatList) {
      return response.status(400).json({ message: "Chat list not found" });
    }

    const payload = chatList.map((item) => {
      return {
        chatListId: item._id,

        sender: {
          id: item.senderId?._id,
          fullname: item.senderId?.fullname,
          profileImage: item.senderId?.profileImage,
          email: item.senderId?.email,
          isActive: item.senderId?.isActive,
        },

        receiver: {
          id: item.receiverId?._id,
          fullname: item.receiverId?.fullname,
          profileImage: item.receiverId?.profileImage,
        },

        shop: {
          id: item.shop_id?._id,
          shop: item.shop_id?.domain,
        },
        isRequest: item.isRequest,
        lastMessage: item.lastMessage,
        isChatAccepted: item.senderId?.isChatAccepted,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
      };
    });

    return response.status(200).send({
      success: true,
      message: "Chat list fetched successfully",
      payload,
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};

// remove chat list  and consultant id from chat list

const removeChatListAndConsultantIdFromChatList = async (req, res) => {
  try {
    const { id, senderId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(senderId)
    ) {
      return res.status(400).json({ message: "Invalid chat list ID" });
    }
    if (!id || !senderId) {
      return res.status(400).json({ message: "Chat list ID is required" });
    }
    const updateUserChatRequest = await User.findById(senderId);
    if (!updateUserChatRequest) {
      return res.status(400).json({ message: "User not found" });
    }
    updateUserChatRequest.isChatAccepted = "chatEnd";
    await updateUserChatRequest.save();

    const chatList = await ChatList.findByIdAndDelete(id);
    if (!chatList) {
      return res.status(400).json({ message: "Chat list not found" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Chat list removed successfully" });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: "Server error" });
  }
};
// const getConsultantAllUsers = async (req, res) => {
//     try {
//         const { id } = req.params;

//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid consultant ID",
//             });
//         }

//         const chats = await ChatList.find({
//             $or: [{ senderId: id }, { receiverId: id }],
//         })
//             .populate({
//                 path: "senderId",
//                 match: { userType: "customer" },
//                 select: "fullname email phone userType profileImage isActive",
//             })
//             .populate({
//                 path: "receiverId",
//                 match: { userType: "customer" },
//                 select: "fullname email phone userType profileImage isActive",
//             })
//             .sort({ createdAt: -1 });
//         const customers = chats
//             .map((chat) => {
//                 const customer = chat.senderId || chat.receiverId;

//                 if (!customer) return null;

//                 return {
//                     chatListId: chat._id,
//                     createdAt: chat.createdAt,
//                     lastMessage: chat.lastMessage,
//                     isRequest: chat.isRequest,
//                     _id: customer._id,
//                     fullname: customer.fullname,
//                     email: customer.email,
//                     phone: customer.phone,
//                     userType: customer.userType,
//                     profileImage: customer.profileImage,
//                     isActive: customer.isActive,
//                 };
//             })
//             .filter(Boolean);
//         return res.status(200).json({
//             success: true,
//             message: "Consultant users fetched successfully",
//             payload: customers,
//         });

//     } catch (error) {
//         console.error("getConsultantAllUsers error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Server error",
//         });
//     }
// };

const getConsultantAllUsers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid consultant ID",
      });
    }

    const chats = await ConsultantClient.find({
      consultantId: id,
    })
      .populate({
        path: "userId",
        match: { userType: "customer" },
        select: "fullname email phone userType profileImage isActive",
      })

      .sort({ createdAt: -1 });
    // const customers = chats
    //     .map((chat) => {
    //         const customer = chat.senderId || chat.receiverId;

    //         if (!customer) return null;

    //         return {
    //             chatListId: chat._id,
    //             createdAt: chat.createdAt,
    //             lastMessage: chat.lastMessage,
    //             isRequest: chat.isRequest,
    //             _id: customer._id,
    //             fullname: customer.fullname,
    //             email: customer.email,
    //             phone: customer.phone,
    //             userType: customer.userType,
    //             profileImage: customer.profileImage,
    //             isActive: customer.isActive,
    //         };
    //     })
    //     .filter(Boolean);
    return res.status(200).json({
      success: true,
      message: "Consultant users fetched successfully",
      payload: chats,
    });
  } catch (error) {
    console.error("getConsultantAllUsers error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const updateConsultantProfileStoreFront = async (req, res) => {
  try {
    const { consultantId, shopId, name, email, phone, gender } = req.body;
    if (
      !consultantId ||
      !mongoose.Types.ObjectId.isValid(consultantId) ||
      !shopId ||
      !mongoose.Types.ObjectId.isValid(shopId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid consultant ID or shop ID",
      });
    }
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }
    const existingConsultant = await User.findById(consultantId);
    if (!existingConsultant) {
      return res.status(404).json({
        success: false,
        message: "Consultant not found",
      });
    }
    await User.findByIdAndUpdate(
      consultantId,
      {
        fullname: name,
        email: email,
        phone: phone,
        gender: gender,
      },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Consultant profile updated successfully",
    });
  } catch (error) {
    console.error("Error in updateConsultantProfileStoreFront:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getUserConversationControllerConsultant = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("___________", id);
    if (!mongoose.Types.ObjectId.isValid(id))
      return console.log("Id is not valid");
    const conversations = await TransactionHistroy.find({
      $or: [{ senderId: id }, { receiverId: id }],
    })
      .populate("senderId", "fullname email")
      .populate("receiverId", "fullname email")
      .sort({ createdAt: -1 });

    const final = conversations.map((c) => {
      const user = c.senderId._id.toString() === id ? c.receiverId : c.senderId;

      return {
        ...c.toObject(),
        user,
      };
    });

    res.json({ success: true, data: final });
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: "Somthing went wrong " });
  }
};
const getConsultantWalletHistroy = async (req, res) => {
  try {
    const { userId, shopId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(shopId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID",
      });
    }

    const wallet = await WalletHistory.find({
      userId,
      shop_id: shopId,
    })
      .populate("userId", "fullname email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const WithdrawalRequestController = async (req, res) => {
  try {
    const { consultantId, shopId } = req.params;
    const { amount, note } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(consultantId) ||
      !mongoose.Types.ObjectId.isValid(shopId)
    ) {
      return res.status(400).send({ message: "Invalid Id" });
    }
    const consultant = await User.findById(consultantId);
    if (!consultant) {
      return res.status(404).send({ message: "Consultant not found" });
    }
    if (consultant.walletBalance < amount) {
      return res.status(400).send({ message: "Insufficient balance" });
    }
    consultant.walletBalance -= amount;
    await consultant.save();
    const reqSave = await WithdrawalRequestSchema.create({
      consultantId,
      shopId,
      note,
      amount,
      status: "pending",
    });

    return res.status(201).send({
      success: true,
      message: "Withdrawal request submitted",
      data: reqSave,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Server error",
    });
  }
};
const getWithdrawalRequest = async (req, res) => {
  try {
    const { consultantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(consultantId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }
    const widthrawal = await WithdrawalRequestSchema.find({
      consultantId: consultantId,
    })
      .populate("consultantId", "fullname email")
      .sort({ createdAt: -1 })
      .limit(10);

    if (!widthrawal) return;
    return res.status(200).json({
      success: true,
      message: "App status retrieved successfully",
      data: widthrawal,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

//----------------------- get monthly revenu -----------------------------------------

const getMonthlyRevenueController = async (req, res) => {
  try {
    const { shop_id, consultantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(shop_id)) {
      return res.status(400).json({ message: "Invalid shop ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(consultantId)) {
      return res.status(400).json({ message: "Invalid consultant ID" });
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const transactions = await TransactionHistroy.find({
      shop_id,
      status: "completed",
      $or: [{ senderId: consultantId }, { receiverId: consultantId }],
    }).lean();

    let currentMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let totalIncome = 0;

    transactions.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      const amount = Number(tx.consultantAmount) || 0;

      // total income (all time)
      totalIncome += amount;

      // current month
      if (
        txDate.getMonth() === currentMonth &&
        txDate.getFullYear() === currentYear
      ) {
        currentMonthRevenue += amount;
      }

      // last month
      if (
        txDate.getMonth() === lastMonth &&
        txDate.getFullYear() === lastMonthYear
      ) {
        lastMonthRevenue += amount;
      }
    });

    const percentageChange =
      lastMonthRevenue === 0
        ? 0
        : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

    return res.status(200).json({
      success: true,
      data: {
        currentMonthRevenue: Number(currentMonthRevenue.toFixed(2)),
        lastMonthRevenue: Number(lastMonthRevenue.toFixed(2)),
        totalIncome: Number(totalIncome.toFixed(2)),
        percentageChange: Number(percentageChange.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Monthly revenue error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const tokenVerifyController = async (req, res) => {
  try {
    // yahan token already middleware ne verify kar diya hai
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Token verification failed",
    });
  }
};

module.exports = {
  consultantController,
  getConsultant,
  updateConsultantData,
  updateConsultantStatus,
  getConsultantById,
  getConsultantHistory,
  getConsultantAllUser,
  getConsultantAllUserHistory,
  deleteConsultant,
  getConsultantByShopIdAndConsultantId,
  loginConsultant,
  getChatListByShopIdAndConsultantId,
  removeChatListAndConsultantIdFromChatList,
  getConsultantAllUsers,
  updateConsultantProfileStoreFront,
  getUserConversationControllerConsultant,
  getConsultantWalletHistroy,
  WithdrawalRequestController,
  getWithdrawalRequest,
  getMonthlyRevenueController,
  tokenVerifyController,
};
