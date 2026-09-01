import React, { Fragment, useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./UserChat.module.css";
import {
  socket,
  ensureSocketRegistered,
  SOCKET_ROLE,
} from "../Sokect-io/SokectConfig";
import { getCustomerId, getShopId } from "../../utils/wixStorage";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchChatHistory,
  fetchConsultantById,
} from "../Redux/slices/ConsultantSlices";
import InsufficientBalanceModal from "../AlertModel/InsuffientBalance";
import ReactToast from "../AlertModel/ReactToast";
import { fetchUserDetailsByIds } from "../Redux/slices/UserSlices";
import { useWixUser } from "../../useContext/WixUserContext";
import { setChatTimerStopped } from "../Redux/slices/sokectSlice";

const UserChat = () => {
  const [text, setText] = useState();
  const navigate = useNavigate();
  const consultantId = useParams().id;
  const dispatch = useDispatch();
  const [clientId, setClientId] = useState(null);
  const [shopId, setShopId] = useState(null);
  const [show, setShow] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const parms = new URLSearchParams(window.location.search);
  const shop = parms.get("shop");
  const token = localStorage.getItem("token");
  const { user } = useWixUser();
  const userId = user?.wixDbId;
  console.log("userId", userId);
  useEffect(() => {
    const storedClientId =
       userId || getCustomerId();
    const storedShopId = getShopId();
    setClientId(storedClientId);
    setShopId(storedShopId);
  }, [userId]);

  useEffect(() => {
    if (!clientId) return;
    ensureSocketRegistered(clientId, { role: SOCKET_ROLE.CUSTOMER });
  }, [clientId]);

  const { consultantOverview } = useSelector((state) => state.consultants);
  const { chatHistory } = useSelector((state) => state.consultants);
  const { messages: socketMessages } = useSelector((state) => state.socket);
  const consultantView = consultantOverview?.consultant;
  const imageUrl = `${process.env.REACT_APP_BACKEND_HOST}/${consultantOverview?.consultant?.profileImage?.replace("\\", "/")}`;
  const [chatMessagesData, setChatMessagesData] = useState([]);
  const lastProcessedMessageId = useRef(null);
  const messagesAreaRef = useRef(null);
  const lastNotificationMessageId = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const { insufficientBalance } = useSelector((state) => state.socket);
  const [showChatEndToast, setShowChatEndToast] = useState(false);
  const [showChatLock, setShowChatLock] = useState(false);
  const [waitingForAccept, setWaitingForAccept] = useState(false);
  const prevIsRunningRef = useRef(null);
  const { userDetails } = useSelector((state) => state.users);
  const { confirmChat } = useSelector((state) => state.socket);
  const [isLock, seIsLock] = useState(false);
  
  useEffect(() => {
    if (userDetails?.data?.chatLock === "true") {
      setShowChatLock(true);
    } else {
      setShowChatLock(false);
    }
  }, [userDetails, showChatLock]);

  useEffect(() => {
    if (confirmChat) {
      seIsLock(true);
    }
  }, [confirmChat]);

  useEffect(() => {
    if (consultantId) {
      localStorage.setItem("___U-B", consultantId);
    } else {
      localStorage.removeItem("___U-B");
    }
  }, [consultantId]);

  useEffect(() => {
    if (insufficientBalance) {
      setShow(true);
    }
  }, [insufficientBalance]);
  useEffect(() => {
    dispatch(fetchUserDetailsByIds(clientId));
  }, [clientId, refreshed, showChatEndToast]);

  useEffect(() => {
    dispatch(
      fetchConsultantById({
        shop_id: shopId,
        consultant_id: consultantId,
        token: token,
        shop: shop,
      }),
    );
  }, [shopId, consultantId]);

  const isNearBottom = () => {
    if (!messagesAreaRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesAreaRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  const scrollToBottom = (force = false) => {
    if (!force && !shouldAutoScrollRef.current) return;

    setTimeout(() => {
      if (messagesAreaRef.current) {
        messagesAreaRef.current.scrollTop =
          messagesAreaRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    if (chatHistory?.chatHistory) {
      setChatMessagesData(chatHistory.chatHistory);
      lastProcessedMessageId.current = null;
      shouldAutoScrollRef.current = true;
      setTimeout(() => {
        scrollToBottom(true);
      }, 400);
    }
  }, [chatHistory, show]);

  useEffect(() => {
    if (!clientId || !consultantId || !shopId) {
      console.log("UserChat - Missing IDs:", {
        clientId,
        consultantId,
        shopId,
      });
      return;
    }
    if (!socketMessages || socketMessages.length === 0) {
      return;
    }

    socketMessages.forEach((message) => {
      if (!message || !message._id) {
        return;
      }
      if (message._id === lastProcessedMessageId.current) {
        return;
      }

      const messageShopId = String(message.shop_id || message.shopId || "");
      const currentShopId = String(shopId || "");
      const messageSenderId = String(message.senderId || "");
      const messageReceiverId = String(message.receiverId || "");
      const currentClientId = String(clientId || "");
      const currentConsultantId = String(consultantId || "");

      const isCurrentChatMessage =
        messageShopId === currentShopId &&
        ((messageSenderId === currentClientId &&
          messageReceiverId === currentConsultantId) ||
          (messageSenderId === currentConsultantId &&
            messageReceiverId === currentClientId));

      if (isCurrentChatMessage) {
        lastProcessedMessageId.current = message._id;

        setChatMessagesData((prev) => {
          const messageExists = prev.some((msg) => msg._id === message._id);
          if (messageExists) {
            return prev;
          }

          const tempMessageIndex = prev.findIndex(
            (msg) =>
              msg._id?.startsWith("temp-") &&
              msg.text === message.text &&
              String(msg.senderId) === messageSenderId,
          );

          if (tempMessageIndex !== -1) {
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = message;
            return newMessages;
          }

          return [...prev, message];
        });
      } else {
        console.log("UserChat -  Message doesn't belong to current chat");
      }
    });
  }, [socketMessages, clientId, consultantId, shopId]);

  useEffect(() => {
    if (!clientId || !consultantId || !shopId) return;
    if (!socketMessages || socketMessages.length === 0) return;

    const latestMessage = socketMessages[socketMessages.length - 1];
    if (!latestMessage) return;

    if (
      latestMessage._id &&
      latestMessage._id === lastNotificationMessageId.current
    ) {
      return;
    }

    const isIncoming =
      String(latestMessage.senderId) === String(consultantId) &&
      String(latestMessage.receiverId) === String(clientId) &&
      String(latestMessage.shop_id) === String(shopId);

    if (!isIncoming) return;

    const payload = {
      senderName: consultantOverview?.consultant?.fullname || "Consultant",
      text: latestMessage.text || "",
      avatar: consultantOverview?.consultant?.profileImage
        ? `${process.env.REACT_APP_BACKEND_HOST}/${consultantOverview.consultant.profileImage.replace("\\", "/")}`
        : null,
    };

    if (latestMessage._id) {
      lastNotificationMessageId.current = latestMessage._id;
    }
  }, [socketMessages, clientId, consultantId, shopId, consultantOverview]);

  const sendChat = async (input = "") => {
    const finalMessage = typeof input === "string" ? input : text;

    if (!finalMessage?.trim() || !clientId || !consultantId || !shopId) return;

    const ok = await ensureSocketRegistered(clientId, {
      role: SOCKET_ROLE.CUSTOMER,
    });
    if (!ok) {
      console.error("[chat] socket register failed — message not sent");
      return;
    }

    const messageData = {
      senderId: clientId,
      receiverId: consultantId,
      shop_id: shopId,
      text: finalMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessagesData((prev) => [
      ...prev,
      { _id: `temp-${Date.now()}`, ...messageData },
    ]);

    socket.emit("sendMessage", messageData);
    console.log("[chat] sendMessage", messageData);
    setText("");
    shouldAutoScrollRef.current = true;
    setTimeout(() => scrollToBottom(true), 100);
  };

  useEffect(() => {
    if (shopId && clientId && consultantId) {
      dispatch(
        fetchChatHistory({
          shopId: shopId,
          userId: clientId,
          consultantId: consultantId,
        }),
      );
      setChatMessagesData([]);
      lastProcessedMessageId.current = null;
    }
  }, [dispatch, shopId, clientId, consultantId]);

  useEffect(() => {
    if (chatMessagesData.length > 0 && messagesAreaRef.current) {
      if (isNearBottom() || shouldAutoScrollRef.current) {
        const timer = setTimeout(() => {
          scrollToBottom();
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [chatMessagesData.length]);

  useEffect(() => {
    const messagesArea = messagesAreaRef.current;
    if (!messagesArea) return;

    const handleScroll = () => {
      if (!isNearBottom()) {
        shouldAutoScrollRef.current = false;
      } else {
        shouldAutoScrollRef.current = true;
      }
    };

    messagesArea.addEventListener("scroll", handleScroll);
    return () => {
      messagesArea.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!clientId || !consultantId || !shopId) return;

    const handleDirectMessage = (message) => {
      const messageShopId = String(message.shop_id || message.shopId || "");
      const currentShopId = String(shopId || "");
      const messageSenderId = String(message.senderId || "");
      const messageReceiverId = String(message.receiverId || "");
      const currentClientId = String(clientId || "");
      const currentConsultantId = String(consultantId || "");

      const isCurrentChatMessage =
        messageShopId === currentShopId &&
        ((messageSenderId === currentClientId &&
          messageReceiverId === currentConsultantId) ||
          (messageSenderId === currentConsultantId &&
            messageReceiverId === currentClientId));

      if (isCurrentChatMessage && message._id) {
        if (message._id === lastProcessedMessageId.current) return;
        lastProcessedMessageId.current = message._id;

        setChatMessagesData((prev) => {
          const messageExists = prev.some((msg) => msg._id === message._id);
          if (messageExists) return prev;

          // Check for temp message
          const tempMessageIndex = prev.findIndex(
            (msg) =>
              msg._id?.startsWith("temp-") &&
              msg.text === message.text &&
              String(msg.senderId) === messageSenderId,
          );

          if (tempMessageIndex !== -1) {
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = message;
            return newMessages;
          }

          return [...prev, message];
        });
      }
    };

    socket.on("receiveMessage", handleDirectMessage);

    return () => {
      socket.off("receiveMessage", handleDirectMessage);
    };
  }, [clientId, consultantId, shopId]);

  /**
   * Mark messages as seen
   */

  useEffect(() => {
    if (!clientId || !consultantId) return;
    if (chatMessagesData.length === 0) return;
    socket.emit("markSeen", {
      senderId: consultantId,
      receiverId: clientId,
    });
  }, [clientId, consultantId]);
  const backToViewProfile = () => {
    const instance =
      new URLSearchParams(window.location.search).get("instance") ||
      localStorage.getItem("wix_instance");
    const q = instance ? `?instance=${encodeURIComponent(instance)}` : "";
    navigate(`/consultant/card${q}`);
  };

  const { chatTimer } = useSelector((state) => state.socket);
  const { autoChatEnded } = useSelector((state) => state.socket);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!chatTimer.isRunning || !chatTimer.startTime) return;

    const interval = setInterval(() => {
      const diff = Math.floor(
        (Date.now() - new Date(chatTimer.startTime)) / 1000,
      );
      setSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [chatTimer.isRunning, chatTimer.startTime]);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const stopChatTimer = async () => {
    const uid =
      clientId ||
      getCustomerId() ||
      chatTimer.userId ||
      confirmChat?.userId;
    const cid = consultantId || chatTimer.consultantId || confirmChat?.consultantId;
    const sid = shopId || chatTimer.shopId || confirmChat?.shopId;

    if (!chatTimer.transactionId || !uid || !cid || !sid) {
      console.error("[chat] stopChat — missing data", {
        transactionId: chatTimer.transactionId,
        uid,
        cid,
        sid,
      });
      return;
    }

    const ok = await ensureSocketRegistered(uid, {
      role: SOCKET_ROLE.CUSTOMER,
    });
    if (!ok) {
      console.error("[chat] stopChat — socket not registered");
      return;
    }

    console.log("[chat] endChat →", {
      transactionId: chatTimer.transactionId,
      userId: uid,
      consultantId: cid,
      shopId: sid,
    });

    socket.emit("endChat", {
      transactionId: chatTimer.transactionId,
      userId: uid,
      consultantId: cid,
      shopId: sid,
    });
  };

  const handleChatSessionEnded = useCallback(() => {
    dispatch(setChatTimerStopped());
    seIsLock(false);
    setSeconds(0);
    setWaitingForAccept(false);
    setShowChatEndToast(true);
    setShowChatLock(true);
    localStorage.removeItem("chatTimer");
    if (clientId) dispatch(fetchUserDetailsByIds(clientId));
    setRefreshed((prev) => !prev);
  }, [clientId, dispatch]);

  useEffect(() => {
    const onChatEnded = () => handleChatSessionEnded();
    socket.on("chatEnded", onChatEnded);
    return () => socket.off("chatEnded", onChatEnded);
  }, [handleChatSessionEnded]);

  useEffect(() => {
    if (!chatTimer.isRunning) {
      setSeconds(0);
    }
  }, [chatTimer.isRunning]);

  useEffect(() => {
    if (autoChatEnded) {
      dispatch(setChatTimerStopped());
      seIsLock(false);
      setSeconds(0);
      setShowChatEndToast(true);
      setShowChatLock(true);
      if (clientId) dispatch(fetchUserDetailsByIds(clientId));
      setRefreshed((prev) => !prev);
    }
  }, [autoChatEnded, clientId, dispatch]);

  useEffect(() => {
    if (prevIsRunningRef.current === true && chatTimer.isRunning === false) {
      setShowChatEndToast(true);
      seIsLock(false);
      setWaitingForAccept(false);
      setShowChatLock(true);
      setRefreshed((prev) => !prev);
    }
    prevIsRunningRef.current = chatTimer.isRunning;
  }, [chatTimer.isRunning]);

  const startCHatHandler = async () => {
    const uid =
      clientId ||
      getCustomerId() ||
      confirmChat?.userId ||
      chatTimer.userId;
    if (!uid || !confirmChat?.consultantId) return;

    const ok = await ensureSocketRegistered(uid, {
      role: SOCKET_ROLE.CUSTOMER,
    });
    if (!ok) return;

    socket.emit("acceptUserChat", {
      userId: uid,
      shopId: confirmChat.shopId || shopId,
      consultantId: confirmChat.consultantId || consultantId,
    });
    dispatch(fetchUserDetailsByIds(uid));
    setShowChatLock(false);
    setRefreshed((prev) => !prev);
  };

  return (
    <Fragment>
      <InsufficientBalanceModal
        show={show}
        setShow={setShow}
        insufficientBalance={insufficientBalance}
      />

      <div className={styles.chatRouteFill}>
        <div className={styles.chatPageContainer}>
          <div className={styles.container}>
            {/* Chat Window */}
            <div className={styles.chatWindow}>
              <div className={styles.chatWindowContent}>
                {/* Chat Header */}
                <div className={styles.chatHeader}>
                  <div className={styles.chatHeaderInfo}>
                    <button
                      onClick={() => backToViewProfile()}
                      className={styles.backButton}
                      title="Go Back"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className={styles.avatarWrapper}>
                      <div className={styles.chatHeaderAvatar}>
                        <img
                          src={imageUrl}
                          alt={consultantOverview?.consultant?.fullname}
                          className={styles.chatHeaderAvatar}
                        />
                      </div>
                      {consultantOverview?.consultant?.isActive && (
                        <div className={styles.onlineIndicator}></div>
                      )}
                    </div>
                    <div>
                      <div className={styles.chatHeaderName}>
                        {consultantOverview?.consultant?.fullname}
                      </div>
                      <div
                        className={styles.chatHeaderStatus}
                        style={{
                          color: consultantOverview?.consultant?.isActive
                            ? "#10b981"
                            : "#6c757d",
                        }}
                      >
                        {consultantOverview?.consultant?.isActive
                          ? "Active now"
                          : "Offline"}
                      </div>
                    </div>
                  </div>
                  <div className={styles.chatHeaderActions}>
                    {chatTimer.isRunning && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                          mr: "10px",
                        }}
                      >
                        <p>
                          {" "}
                          Timer: {minutes}:{remainingSeconds}
                        </p>
                        <div>
                          <button
                            onClick={stopChatTimer}
                            style={{
                              padding: "5px 12px",
                              backgroundColor: "#ff4d4f",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            Stop Chat
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages Area */}
                <div className={styles.messagesArea} ref={messagesAreaRef}>
                  {showChatLock && (
                    <div className={styles.chatEndOverlay}>
                      <div className={styles.chatEndBox}>
                        <div
                          style={{
                            position: "relative",
                            width: "44px",
                            height: "44px",
                          }}
                        >
                          <div className={styles.lockIcon}>🔒</div>
                          {waitingForAccept && (
                            <div className={styles.reverseRing}></div>
                          )}
                        </div>
                        <div className={styles.chatEndContent}>
                          <h4>chat unlock </h4>
                          <p>Your chat session has unlocked.</p>
                        </div>
                        {isLock ? (
                          <button
                            style={{
                              marginLeft: "auto",
                              background: "green",
                              color: "#fff",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              width: "100px",
                              fontFamily: "sans-serif",
                            }}
                            onClick={() => {
                              startCHatHandler();
                              setShowChatLock(false);
                            }}
                          >
                            Accept chat
                          </button>
                        ) : (
                          <button
                            style={{
                              marginLeft: "auto",
                              background: waitingForAccept ? "gray" : "yellow",
                              color: waitingForAccept ? "#fff" : "#000",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "12px",
                              width: "100px",
                              fontFamily: "sans-serif",
                            }}
                            disabled={waitingForAccept ? true : false}
                            onClick={() => {
                              sendChat("Hello");
                              setWaitingForAccept(true);
                              setTimeout(() => {
                                setWaitingForAccept(false);
                              }, 60000);
                            }}
                          >
                            {waitingForAccept ? "Wait" : "start chat"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {chatMessagesData.length === 0 ? (
                    <div className={styles.emptyChatState}>
                      <p className={styles.emptyChatText}>
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  ) : (
                    <>
                      {chatMessagesData.map((message) => {
                        const isOwn = message.senderId === clientId;
                        const timestamp = new Date(
                          message.timestamp,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        });

                        return (
                          <div
                            key={message._id}
                            className={`${styles.messageContainer} ${isOwn ? styles.messageContainerRight : styles.messageContainerLeft}`}
                          >
                            <div
                              className={`${styles.messageBubble} ${isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther}`}
                            >
                              {!isOwn && (
                                <div className={styles.messageSender}>
                                  {consultantOverview?.consultant?.fullname ||
                                    "Consultant"}
                                </div>
                              )}
                              <div className={styles.messageText}>
                                {message.text}
                              </div>
                              <div className={styles.messageTimestamp}>
                                {timestamp}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className={styles.messageInputArea}>
                  <div className={styles.inputGroup}>
                    <button className={styles.attachButton} title="Attach File">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>
                    <input
                      onChange={(e) => setText(e.target.value)}
                      value={text || ""}
                      type="text"
                      className={styles.messageInput}
                      placeholder="Type a message..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && text?.trim()) {
                          sendChat();
                        }
                      }}
                    />
                    <button
                      onClick={sendChat}
                      className={styles.sendButton}
                      title="Send"
                    >
                      <svg
                        className={styles.sendIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ReactToast
        show={showChatEndToast}
        message="Chat ended"
        onClose={() => setShowChatEndToast(false)}
      />
    </Fragment>
  );
};

export default UserChat;
