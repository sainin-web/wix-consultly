import React, { Fragment, useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./UserChat.module.css";
import "../../css/storefront-tokens.css";
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
import {
  setChatTimerStopped,
  setChatTimerStarted,
  clearChatEndSummary,
  setMessageRejected,
} from "../Redux/slices/sokectSlice";
import { formatCurrency } from "../Helper/Helper";
import PortalModal from "../middle-ware/PortalModal";

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
  // ── server-authoritative session state ──
  const [resumeSession, setResumeSession] = useState(null); // active session found on load
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [peerNote, setPeerNote] = useState(null); // { text, tone }
  const { chatEndSummary, peerConnection, messageRejected } = useSelector((state) => state.socket);
  const currency = userDetails?.data?.currency || "";
  
  useEffect(() => {
    if (userDetails?.data?.chatLock === "true") {
      setShowChatLock(true);
    } else {
      setShowChatLock(false);
    }
  }, [userDetails, showChatLock]);

  useEffect(() => {
    if (confirmChat) {
      console.log("[CHAT DEBUG] Consultant confirmed the request (acceptUser)", confirmChat);
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

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/chat/active-session/${clientId}`);
        if (cancelled) return;
        if (!data?.active || !data.session) {
          // Nothing active on the server: any local timer is stale.
          if (chatTimer.isRunning) dispatch(setChatTimerStopped());
          return;
        }
        console.log("[CHAT] Active session found on load", data.session.chatId);
        setResumeSession(data.session);
      } catch (err) {
        console.warn("[CHAT ERROR] active-session check failed:", err.message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const resumeActiveSession = () => {
    if (!resumeSession) return;
    console.log("[CHAT] Resuming session", resumeSession.chatId);
    dispatch(
      setChatTimerStarted({
        transactionId: resumeSession.chatId,
        startTime: resumeSession.startedAt,
        userId: resumeSession.userId,
        shopId: resumeSession.shopId,
        consultantId: resumeSession.consultantId,
      }),
    );
    setShowChatLock(false);
    seIsLock(false);
    setWaitingForAccept(false);
    dispatch(clearChatEndSummary());
    if (String(resumeSession.consultantId) !== String(consultantId)) {
      const q = window.location.search || "";
      navigate(`/chats/${resumeSession.consultantId}${q}`);
    }
    setResumeSession(null);
  };

  // Peer (consultant) connection banner with grace countdown
  useEffect(() => {
    if (!peerConnection || !chatTimer.isRunning) { setPeerNote(null); return; }
    if (peerConnection.connected) {
      setPeerNote({ text: "Connection restored", tone: "ok" });
      const t = setTimeout(() => setPeerNote(null), 3000);
      return () => clearTimeout(t);
    }
    const total = Math.round((peerConnection.graceMs || 20000) / 1000);
    const tick = () => {
      const left = Math.max(0, total - Math.floor((Date.now() - peerConnection.since) / 1000));
      setPeerNote({ text: `Consultant connection lost · waiting to reconnect (${left}s)`, tone: "warn" });
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [peerConnection, chatTimer.isRunning]);

  useEffect(() => {
    if (!messageRejected) return;
    setRejectNote(messageRejected.message || "Message not sent.");
    const t = setTimeout(() => { setRejectNote(""); dispatch(setMessageRejected(null)); }, 4000);
    return () => clearTimeout(t);
  }, [messageRejected, dispatch]);

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
    // A non-empty string argument is an explicit message (e.g. the "Hello" request);
    // anything else (no arg, event object, empty string) sends the typed text.
    const finalMessage =
      typeof input === "string" && input.trim() ? input : text;

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
    console.log("[CHAT DEBUG] Socket event emitted: sendMessage", { to: messageData.receiverId, shop: messageData.shop_id });
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
        console.log("[CHAT DEBUG] Incoming message received (user)", { from: message.senderId });
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

    setEnding(true);
    socket.emit("endChat", {
      transactionId: chatTimer.transactionId,
      userId: uid,
      consultantId: cid,
      shopId: sid,
    });
    // Fallback if the socket ack never arrives: the REST path is idempotent.
    setTimeout(async () => {
      try {
        await axios.post(`${process.env.REACT_APP_BACKEND_HOST}/api/chat/end-session/${chatTimer.transactionId}`, { endedBy: uid });
      } catch (err) {
        console.warn("[CHAT ERROR] end-session fallback:", err.message);
      }
    }, 6000);
  };

  useEffect(() => {
    if (!chatTimer.isRunning) setEnding(false);
  }, [chatTimer.isRunning]);

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

  // Messages can only be typed/sent once the session is active. The session
  // card (Start chat → waiting → Accept) drives showChatLock; nothing else is
  // needed. sendChat("Hello") from the card is the request itself and is
  // called directly, so it is unaffected by this gate.
  const canSend = !showChatLock;

  return (
    <Fragment>
      <InsufficientBalanceModal
        show={show}
        setShow={setShow}
        insufficientBalance={insufficientBalance}
      />

      <div className={`customer-chat ${styles.chatRouteFill}`}>
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
                        className={`${styles.chatHeaderStatus} ${consultantOverview?.consultant?.isActive ? styles.statusOnline : ""}`}
                      >
                        {consultantOverview?.consultant?.isActive
                          ? "Active now"
                          : "Offline"}
                      </div>
                    </div>
                  </div>
                  <div className={styles.chatHeaderActions}>
                    {chatTimer.isRunning && (
                      <div className={styles.timer}>
                        <span className={styles.timerValue}>
                          {minutes}:{String(remainingSeconds).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowEndConfirm(true)}
                          className={styles.stopBtn}
                          disabled={ending}
                        >
                          {ending ? "Ending…" : "End chat"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {peerNote && (
                  <div className={`${styles.peerBanner} ${peerNote.tone === "ok" ? styles.peerBannerOk : ""}`} role="status">
                    {peerNote.text}
                  </div>
                )}
                {/* Messages Area */}
                <div className={styles.messagesArea} ref={messagesAreaRef}>

                  {chatMessagesData.length === 0 ? (
                    <div className={styles.emptyChatState}>
                      <p className={styles.emptyChatText}>
                        No messages yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      {chatMessagesData.map((message, index) => {
                        const isOwn = message.senderId === clientId;
                        const prevMessage = chatMessagesData[index - 1];
                        const grouped =
                          !!prevMessage &&
                          String(prevMessage.senderId) === String(message.senderId);
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
                            className={`${styles.messageContainer} ${isOwn ? styles.messageContainerRight : styles.messageContainerLeft} ${grouped ? styles.messageContainerGrouped : ""}`}
                          >
                            <div
                              className={`${styles.messageBubble} ${isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther}`}
                            >
                              {!isOwn && !grouped && (
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

                {chatEndSummary && !chatTimer.isRunning && (
                  <div className={styles.endSummary} role="status">
                    <strong>
                      {chatEndSummary.endReason === "consultant_disconnected_timeout"
                        ? "Chat ended — the consultant did not reconnect"
                        : chatEndSummary.endReason === "user_disconnected_timeout"
                          ? "Chat ended — you were disconnected"
                          : chatEndSummary.endReason === "insufficient_balance"
                            ? "Chat ended — credits exhausted"
                            : String(chatEndSummary.endedBy) === String(clientId)
                              ? "You ended the chat"
                              : "Chat ended by the consultant"}
                    </strong>
                    <span>
                      Duration {Math.ceil((chatEndSummary.durationSeconds || 0) / 60)} min · Charged{" "}
                      {formatCurrency(currency, chatEndSummary.finalAmount)}
                    </span>
                  </div>
                )}
                {/* Session gate — outside the scroll area, above the composer */}
                  {showChatLock && (
                    <div className={styles.chatSessionAction}>
                      <div className={styles.chatEndBox}>
                        <div className={styles.lockWrapper}>
                          <div className={styles.lockIcon}>{waitingForAccept ? "⏳" : "🔒"}</div>
                          {waitingForAccept && (
                            <div className={styles.reverseRing}></div>
                          )}
                        </div>
                        <div className={styles.chatEndContent}>
                          <h4>{isLock ? "Consultant is ready" : "Start a chat session"}</h4>
                          <p>
                            {isLock
                              ? "Accept to begin the timed session."
                              : waitingForAccept
                                ? "Waiting for the consultant to accept…"
                                : "Send a request and the consultant will accept shortly."}
                          </p>
                        </div>
                        {isLock ? (
                          <button
                            type="button"
                            className={styles.chatEndButtonAccept}
                            onClick={() => {
                              startCHatHandler();
                              setShowChatLock(false);
                            }}
                          >
                            Accept chat
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`${styles.chatEndButtonStart} ${waitingForAccept ? styles.chatEndButtonWaiting : ""}`}
                            disabled={waitingForAccept ? true : false}
                            onClick={() => {
                              console.log("[CHAT DEBUG] User Start Chat clicked", { clientId, consultantId, shopId });
                              dispatch(clearChatEndSummary());
                              sendChat("Hello");
                              setWaitingForAccept(true);
                              setTimeout(() => {
                                setWaitingForAccept(false);
                              }, 60000);
                            }}
                          >
                            {waitingForAccept ? "Waiting…" : "Start chat"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                {rejectNote && (
                  <div className={styles.rejectNote} role="alert">{rejectNote}</div>
                )}
                {/* Message Input */}
                <div className={styles.messageInputArea}>
                  <div className={`${styles.inputGroup} ${canSend ? "" : styles.inputGroupDisabled}`}>
                    <button type="button" className={styles.attachButton} title="Attach File" disabled={!canSend}>
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
                      placeholder={
                        canSend
                          ? "Type a message..."
                          : waitingForAccept
                            ? "Waiting for the consultant to accept…"
                            : "Start a chat session to send messages"
                      }
                      disabled={!canSend}
                      aria-disabled={!canSend}
                      onKeyPress={(e) => {
                        if (canSend && e.key === "Enter" && text?.trim()) {
                          sendChat();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => canSend && sendChat()}
                      className={styles.sendButton}
                      title={canSend ? "Send" : "Start the session to send messages"}
                      disabled={!canSend}
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
      {resumeSession && (
        <PortalModal>
          <div className="customer-chat">
            <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="resume-title">
              <div className={styles.modalCard}>
                <h3 id="resume-title" className={styles.modalTitle}>Active chat session</h3>
                <p className={styles.modalText}>
                  You have an active chat with <strong>{resumeSession.counterpart?.fullname || "a consultant"}</strong>,
                  started {new Date(resumeSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                  Billing continues until the session is ended.
                </p>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalGhost}
                    disabled={ending}
                    onClick={async () => {
                      setEnding(true);
                      try {
                        await axios.post(`${process.env.REACT_APP_BACKEND_HOST}/api/chat/end-session/${resumeSession.chatId}`, { endedBy: clientId });
                        console.log("[CHAT] Session ended from resume modal", resumeSession.chatId);
                      } catch (err) {
                        console.warn("[CHAT ERROR] end from modal:", err.message);
                      } finally {
                        setEnding(false);
                        setResumeSession(null);
                        setShowChatLock(true);
                        if (clientId) dispatch(fetchUserDetailsByIds(clientId));
                      }
                    }}
                  >
                    {ending ? "Ending…" : "End chat"}
                  </button>
                  <button type="button" className={styles.modalPrimary} onClick={resumeActiveSession} disabled={ending}>
                    Resume chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </PortalModal>
      )}
      {showEndConfirm && (
        <PortalModal>
          <div className="customer-chat">
            <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="end-title">
              <div className={styles.modalCard}>
                <h3 id="end-title" className={styles.modalTitle}>End this consultation?</h3>
                <p className={styles.modalText}>Your final charges will be calculated from the session time.</p>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.modalGhost} onClick={() => setShowEndConfirm(false)} disabled={ending}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.modalDanger}
                    disabled={ending}
                    onClick={() => {
                      setShowEndConfirm(false);
                      stopChatTimer();
                    }}
                  >
                    {ending ? "Ending…" : "End chat"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </PortalModal>
      )}
      <ReactToast
        show={showChatEndToast}
        message="Chat ended"
        onClose={() => setShowChatEndToast(false)}
      />
    </Fragment>
  );
};

export default UserChat;
