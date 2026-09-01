const mongoose = require("mongoose");
const { User } = require("../Modal/userSchema");


const usersController = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin ID",
      });
    }
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
    });
  }
};

const checkedUserBlance = async (req, res) => {
  try {
    const { userId, consultantId } = req.params;
    const { callType = "voice" } = req.query;

    const user = await User.findById(userId).select("walletBalance");
    const consultant = await User.findById(consultantId)
      .select("voicePerMinute videoPerMinute chatPerMinute")
      .lean();

    if (!user || !consultant) {
      return res.status(404).json({
        success: false,
        message: "User or consultant not found",
      });
    }

    let callCost = 0;

    if (callType === "chat") {
      callCost = consultant.chatPerMinute;
    } else if (callType === "voice") {
      callCost = consultant.voicePerMinute;
    } else if (callType === "video") {
      callCost = consultant.videoPerMinute;
    }

    if (!callCost) {
      return res.status(400).json({
        success: false,
        message: "Invalid call type",
      });
    }

    if (user.walletBalance < callCost) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userBalance: user.walletBalance,
        callCost,
        callType,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  usersController,
  checkedUserBlance,
};
