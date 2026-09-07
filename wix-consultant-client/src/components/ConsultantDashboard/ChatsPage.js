import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { attachEndOnPageHide } from "../../utils/chatBeacon";
import styles from "./ChatsPage.module.css";
import axios from "axios";
import { socket, ensureSocketRegistered, SOCKET_ROLE } from "../Sokect-io/SokectConfig";
import { getConsultantId, getShopId, clearConsultantSession } from "../../utils/wixStorage";
import { fetchChatHistory, updateUserRequestById } from "../Redux/slices/ConsultantSlices";
import { useDispatch, useSelector } from "react-redux";
import { addMessage, setChatTimerStopped, setChatTimerStarted, clearChatEndSummary, setMessageRejected, dismissNotificationsFrom } from "../Redux/slices/sokectSlice";
import { formatCurrency } from "../Helper/Helper";
import PortalModal from "../middle-ware/PortalModal";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineArrowLeft,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
} from "react-icons/hi2";
import ReactToast from "../AlertModel/ReactToast";

/*
 * Consultant chat.
 *
 * ARCHITECTURE (unchanged):
 *   customer "Start chat" → socket sendMessage("Hello")
 *     → backend creates ChatList{isRequest:false} + Message, emits
 *       receiveMessage to both parties (room = userId)
 *   consultant socketEventBridge → redux socket.messages (this page refetches
 *       the chat list on every new message and shows the pending request)
 *   consultant "Accept request" → PUT update-user-request (isRequest:true)
 *   consultant "Accept & start" → socket conFirmChatEmit → backend emits
 *       acceptUser to the customer → customer acceptUserChat → backend
 *       creates the Transaction and emits chatTimerStarted to both
 *   either side "End chat" → socket endChat → chatEnded to both
 *
 * Every emit, API path and payload below is the pre-existing one.
 */

const BACKEND = process.env.REACT_APP_BACKEND_HOST;
const DEFAULT_AVATAR = "/images/flag/teamdefault.png";
const dbg = (...a) => console.log("[CHAT DEBUG]", ...a);

function resolveAvatar(raw) {
  if (!raw) return DEFAULT_AVATAR;
  if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, "https://");
  return `${BACKEND}/${String(raw).replace(/\\/g, "/")}`;
}

function formatClock(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const ChatsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showChatView, setShowChatView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [chatMessagesData, setChatMessagesData] = useState([]);
  const [consultantId, setConsultantId] = useState(null);
  const [shopId, setShopId] = useState(null);
  const [chaterIds, setChaterIds] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const dispatch = useDispatch();
  const { chatHistory, userInRequest } = useSelector((state) => state.consultants);
  const messages = useSelector((state) => state.socket.messages);
  const { chatTimer, chatEndSummary, peerConnection, messageRejected } = useSelector((state) => state.socket);
  const { voucherData } = useSelector((state) => state.users);
  const currency = voucherData?.shopCurrency || "";
  const [pendingResume, setPendingResume] = useState(null); // { userId, shopId } from the server
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [peerNote, setPeerNote] = useState(null);
  const [chatAccepted, setChatAccepted] = useState(null);
  const lastProcessedMessageId = useRef(null);
  const lastUnreadMessageId = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const [refreshed, setRefreshed] = useState(false);
  const [userControlMenu, setUserControlMenu] = useState(null);
  const [showChatEndToast, setShowChatEndToast] = useState(false);
  const [showChatEndPop, setShowChatEndPop] = useState(false);
  const prevIsRunningRef = useRef(null);
  const [seconds, setSeconds] = useState(0);
  const [unread, setUnread] = useState({}); // senderId -> count (session-scoped)
  const isActiveChatUser = localStorage.getItem("activeChatUserId");
  const token = localStorage.getItem("token");

  /* ── identity + socket ─────────────────────────────────────── */

  useEffect(() => {
    const id = getConsultantId();
    const sid = getShopId();
    setConsultantId(id);
    setShopId(sid);
    dbg("Consultant ID", id, "| shop", sid);
  }, []);

  useEffect(() => {
    if (!consultantId) return;
    ensureSocketRegistered(consultantId, { role: SOCKET_ROLE.CONSULTANT }).then((ok) => {
      dbg("Consultant socket connected", { consultantId, ok, socketId: socket.id || "(pending)" });
    });
  }, [consultantId]);

  useEffect(() => {
    if (chatTimer.isRunning) localStorage.setItem("activeChatUserId", chatTimer.userId);
  }, [chatTimer.isRunning, chatTimer.userId]);

  useEffect(() => {
    if (!consultantId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${BACKEND}/api/chat/active-session/${consultantId}`);
        if (cancelled) return;
        if (!data?.active || !data.session) {
          if (chatTimer.isRunning) dispatch(setChatTimerStopped());
          localStorage.removeItem("activeChatUserId");
          return;
        }
        const sess = data.session;
        dbg("Active session restored from server", sess.chatId);
        dispatch(
          setChatTimerStarted({
            transactionId: sess.chatId,
            startTime: sess.startedAt,
            userId: sess.userId,
            shopId: sess.shopId,
            consultantId: sess.consultantId,
          }),
        );
        localStorage.setItem("activeChatUserId", sess.userId);
        setPendingResume({ userId: sess.userId, shopId: sess.shopId });
      } catch (err) {
        console.warn("[CHAT ERROR] active-session check failed:", err.message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantId]);

  // Refresh / close during an active session ends it immediately (no grace).
  const timerRef = useRef(chatTimer);
  useEffect(() => { timerRef.current = { ...chatTimer, consultantId, endedBy: consultantId }; }, [chatTimer, consultantId]);
  useEffect(() => attachEndOnPageHide(() => timerRef.current), []);

  // Opened from the bell: select that client once the list is in.
  useEffect(() => {
    const target = location.state?.openUserId;
    if (!target || !chatList.length) return;
    const conv = chatList.find((c) => String(c.sender?.id) === String(target));
    if (conv) {
      handleChatSelect({ shopId: conv.shop.id, userId: conv.sender.id, isChatAccepted: conv.isChatAccepted });
      window.history.replaceState({}, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, chatList]);

  // Once the chat list is in, open the conversation the server says is active.
  useEffect(() => {
    if (!pendingResume || !chatList.length) return;
    const conv = chatList.find((c) => String(c.sender?.id) === String(pendingResume.userId));
    if (conv) {
      handleChatSelect({ shopId: conv.shop.id, userId: conv.sender.id, isChatAccepted: conv.isChatAccepted });
      setPendingResume(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingResume, chatList]);

  useEffect(() => {
    if (!chatTimer.isRunning) setEnding(false);
  }, [chatTimer.isRunning]);

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
      setPeerNote({ text: `Client connection lost · waiting to reconnect (${left}s)`, tone: "warn" });
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setShowChatView(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* ── auth failure → back to in-app consultant login (no Shopify URLs) ── */

  const handleUnauthorized = useCallback(() => {
    clearConsultantSession();
    localStorage.removeItem("shop");
    const instance = localStorage.getItem("wix_instance");
    navigate(`/login${instance ? `?instance=${encodeURIComponent(instance)}` : ""}`, { replace: true });
  }, [navigate]);

  /* ── scrolling: only the message panel ─────────────────────── */

  const scrollToBottom = () => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  };

  /* ── history: guard against stale responses when switching fast ── */

  useEffect(() => {
    if (!chatHistory?.chatHistory) return;
    const rows = chatHistory.chatHistory;
    // Only accept a history that actually belongs to the open conversation.
    if (chaterIds && rows.length) {
      const belongs = rows.every(
        (m) =>
          [String(m.senderId), String(m.receiverId)].includes(String(chaterIds.userId)) &&
          String(m.shop_id) === String(chaterIds.shopId),
      );
      if (!belongs) {
        dbg("Ignored stale history for a different conversation");
        return;
      }
    }
    setChatMessagesData(rows);
    lastProcessedMessageId.current = null;
    dbg("Messages loaded", { count: rows.length });
    setTimeout(scrollToBottom, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory]);

  useEffect(() => {
    if (chatMessagesData.length > 0 && messagesAreaRef.current) {
      const t = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(t);
    }
  }, [chatMessagesData]);

  /* ── live messages → open conversation + unread counters ───── */

  useEffect(() => {
    if (!consultantId || !messages.length) return;
    const latest = messages[messages.length - 1];
    if (!latest) return;

    const isIncoming = String(latest.senderId) !== String(consultantId);
    const forOpenChat =
      chaterIds &&
      String(latest.shop_id) === String(chaterIds.shopId) &&
      ((String(latest.senderId) === String(chaterIds.userId) &&
        String(latest.receiverId) === String(consultantId)) ||
        (String(latest.senderId) === String(consultantId) &&
          String(latest.receiverId) === String(chaterIds.userId)));

    if (isIncoming && latest._id && latest._id !== lastUnreadMessageId.current) {
      lastUnreadMessageId.current = latest._id;
      dbg("Incoming message received", { from: latest.senderId, forOpenChat: Boolean(forOpenChat) });
      if (!forOpenChat) {
        const key = String(latest.senderId);
        setUnread((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      } else {
        dispatch(dismissNotificationsFrom(latest.senderId));
      }
    }

    if (!forOpenChat) return;
    if (latest._id && latest._id === lastProcessedMessageId.current) return;
    lastProcessedMessageId.current = latest._id || null;

    setChatMessagesData((prev) => {
      if (latest._id && prev.some((m) => m._id === latest._id)) return prev;
      const tempIndex = prev.findIndex(
        (m) =>
          m._id?.startsWith("temp-") &&
          m.text === latest.text &&
          String(m.senderId) === String(latest.senderId),
      );
      if (tempIndex !== -1) {
        const next = [...prev];
        next[tempIndex] = latest;
        return next;
      }
      return [...prev, latest];
    });
  }, [messages, chaterIds, consultantId]);

  /* ── chat list ─────────────────────────────────────────────── */

  const getChatList = useCallback(async () => {
    if (!shopId || !consultantId) return;
    try {
      const response = await axios.get(
        `${BACKEND}/api/api-consultant/get/chat-list/${shopId}/${consultantId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data?.payload) {
        setChatList(response.data.payload);
        dbg("Chat list loaded", {
          total: response.data.payload.length,
          pending: response.data.payload.filter((c) => c.isRequest === false).length,
        });
      }
    } catch (error) {
      if (error.response?.status === 401) handleUnauthorized();
      else console.error("[CHAT DEBUG] chat list failed:", error.message);
    } finally {
      setListLoaded(true);
    }
  }, [shopId, consultantId, token, handleUnauthorized]);

  useEffect(() => {
    getChatList();
  }, [getChatList, messages, userInRequest, chatAccepted, refreshed]);

  const selectedConversation = useMemo(
    () =>
      chaterIds
        ? chatList.find(
            (conv) =>
              String(conv.sender?.id) === String(chaterIds.userId) &&
              String(conv.shop?.id) === String(chaterIds.shopId),
          )
        : null,
    [chatList, chaterIds],
  );

  useEffect(() => {
    if (selectedConversation) localStorage.setItem("___U-B", selectedConversation.sender.id);
  }, [selectedConversation]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rows = q
      ? chatList.filter((c) => c.sender?.fullname?.toLowerCase().includes(q))
      : chatList;
    // Pending requests first, then most recent.
    return [...rows].sort((a, b) => {
      const pa = a.isRequest === false ? 0 : 1;
      const pb = b.isRequest === false ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }, [chatList, searchQuery]);

  const pendingCount = useMemo(() => chatList.filter((c) => c.isRequest === false).length, [chatList]);

  /* ── actions (emits/APIs unchanged) ────────────────────────── */

  const handleChatSelect = (chatData) => {
    dbg("Conversation selected", chatData);
    dispatch(dismissNotificationsFrom(chatData.userId));
    setChaterIds(chatData);
    setChatAccepted(chatData);
    setUnread((prev) => {
      if (!prev[String(chatData.userId)]) return prev;
      const next = { ...prev };
      delete next[String(chatData.userId)];
      return next;
    });
    setChatMessagesData([]);
    if (isMobile) setShowChatView(true);
    dbg("Loading conversation history", { shopId: chatData.shopId, userId: chatData.userId, consultantId });
    dispatch(fetchChatHistory({ shopId: chatData.shopId, userId: chatData.userId, consultantId }));
  };

  const updateUser = (conversation) => {
    dbg("Accepting chat request", { userId: conversation.sender.id, shopId: conversation.shop.id });
    dispatch(
      updateUserRequestById({
        shopId: conversation.shop.id,
        userId: conversation.sender.id,
        consultantId,
        token,
        shop: localStorage.getItem("shop"),
      }),
    );
    setUserControlMenu(null);
    setRefreshed((prev) => !prev);
  };

  const sendChat = async () => {
    const body = text.trim();
    if (!body || !chaterIds || !consultantId || sending) return;
    setSending(true);
    try {
      const ok = await ensureSocketRegistered(consultantId, { role: SOCKET_ROLE.CONSULTANT });
      if (!ok) {
        console.error("[CHAT DEBUG] consultant socket register failed — message not sent");
        return;
      }
      const messageData = {
        senderId: consultantId,
        receiverId: chaterIds.userId,
        shop_id: shopId || chaterIds.shopId,
        text: body,
        timestamp: new Date().toISOString(),
      };
      socket.emit("sendMessage", messageData);
      dbg("Socket event emitted: sendMessage", { to: messageData.receiverId });
      setText("");
      // Optimistic echo with a temp id so the server copy REPLACES it instead
      // of duplicating it (the server echoes receiveMessage to the sender too).
      dispatch(addMessage({ _id: `temp-${Date.now()}`, ...messageData }));
    } finally {
      setSending(false);
    }
  };

  const acceptUserChat = (data) => {
    if (!data || !consultantId) return;
    const acceptDataIds = { userId: data.userId, shopId: data.shopId, consultantId };
    socket.emit("conFirmChatEmit", acceptDataIds);
    dbg("Socket event emitted: conFirmChatEmit", acceptDataIds);
    setChatAccepted((prev) => !prev);
  };

  useEffect(() => {
    if (!chatTimer.isRunning || !chatTimer.startTime) return;
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - new Date(chatTimer.startTime)) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [chatTimer.isRunning, chatTimer.startTime]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const stopChatTimer = async () => {
    const uid = chaterIds?.userId || chatTimer.userId;
    const cid = consultantId;
    const sid = chatTimer.shopId || chaterIds?.shopId || shopId;
    const tid = chatTimer.transactionId;
    if (!tid || !uid || !cid || !sid) {
      console.error("[CHAT DEBUG] stopChat — missing ids", { tid, uid, cid, sid });
      return;
    }
    setEnding(true);
    const ok = await ensureSocketRegistered(cid, { role: SOCKET_ROLE.CONSULTANT });
    if (!ok) {
      console.error("[CHAT DEBUG] consultant register failed — endChat not sent");
      return;
    }
    socket.emit("endChat", { transactionId: tid, userId: uid, consultantId: cid, shopId: sid });
    dbg("Socket event emitted: endChat", { tid });
    // Idempotent REST fallback if the socket ack never arrives.
    setTimeout(async () => {
      try {
        await axios.post(`${BACKEND}/api/chat/end-session/${tid}`, { endedBy: cid });
      } catch (err) {
        console.warn("[CHAT ERROR] end-session fallback:", err.message);
      }
    }, 6000);
  };

  const HandleRemoveUser = async (conversation) => {
    try {
      const response = await axios.delete(
        `${BACKEND}/api/api-consultant/remove/user/chat-list/${conversation.chatListId}/${conversation?.sender?.id}`,
      );
      if (response.status === 200 || response.status === 204) {
        setUserControlMenu(null);
        if (String(chaterIds?.userId) === String(conversation?.sender?.id)) {
          setChaterIds(null);
          setChatMessagesData([]);
        }
        setRefreshed((prev) => !prev);
      }
    } catch (error) {
      console.error("[CHAT DEBUG] remove failed:", error.message);
    }
  };

  useEffect(() => {
    if (prevIsRunningRef.current === true && chatTimer.isRunning === false) {
      setShowChatEndToast(true);
      setShowChatEndPop(true);
      setSeconds(0);
      localStorage.removeItem("activeChatUserId");
      localStorage.removeItem("___U-B");
      setRefreshed((prev) => !prev);
    }
    prevIsRunningRef.current = chatTimer.isRunning;
  }, [chatTimer.isRunning]);

  useEffect(() => {
    if (chatTimer.isRunning) localStorage.setItem("chatTimer", JSON.stringify(chatTimer));
  }, [chatTimer]);

  // Close the per-row menu on outside click / Escape
  useEffect(() => {
    if (!userControlMenu) return;
    const close = () => setUserControlMenu(null);
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [userControlMenu]);

  /* ── derived ───────────────────────────────────────────────── */

  const currentUserId = localStorage.getItem("activeChatUserId");
  const timerRunningForOpen =
    chatTimer.isRunning && String(isActiveChatUser) === String(selectedConversation?.sender?.id);
  const requestPendingInWindow = chatAccepted?.isChatAccepted === "request";
  const canSend = Boolean(chaterIds) && !showChatEndPop;

  /* ── render ────────────────────────────────────────────────── */

  const renderConversation = (conversation) => {
    const senderId = conversation.sender?.id;
    const pending = conversation.isRequest === false;
    const isSelected = String(senderId) === String(chaterIds?.userId);
    const lockedByOtherSession =
      chatTimer.isRunning && currentUserId && String(senderId) !== String(currentUserId);
    const count = unread[String(senderId)] || 0;
    const select = () => {
      if (lockedByOtherSession) return;
      handleChatSelect({
        shopId: conversation.shop.id,
        userId: senderId,
        isChatAccepted: conversation.isChatAccepted,
      });
    };

    return (
      <div
        key={conversation.chatListId || senderId}
        role="button"
        tabIndex={0}
        onClick={select}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && select()}
        className={[
          styles.conversationItem,
          isSelected ? styles.conversationItemActive : "",
          lockedByOtherSession ? styles.disabledItem : "",
          pending ? styles.conversationPending : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={isSelected ? "true" : undefined}
      >
        <div className={styles.avatarWrapper}>
          <img src={resolveAvatar(conversation.sender?.profileImage)} alt="" className={styles.conversationAvatar} />
          {conversation.sender?.isActive && <span className={styles.onlineIndicator} />}
        </div>
        <div className={styles.conversationDetails}>
          <div className={styles.conversationHeader}>
            <span className={styles.conversationName}>{conversation.sender?.fullname || "Client"}</span>
            <span className={styles.conversationTimestamp}>{formatClock(conversation.updatedAt)}</span>
          </div>
          <div className={styles.conversationMessage}>
            <span className={styles.previewText}>{conversation.lastMessage || "No messages yet"}</span>
            {pending ? (
              <span className={styles.requestPill}>New request</span>
            ) : count > 0 ? (
              <span className={styles.unreadBadge} aria-label={`${count} unread`}>{count}</span>
            ) : null}
          </div>
          {pending && (
            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.acceptInline}
                onClick={(e) => {
                  e.stopPropagation();
                  updateUser(conversation);
                  select();
                }}
              >
                Accept request
              </button>
              <button
                type="button"
                className={styles.declineInline}
                onClick={(e) => {
                  e.stopPropagation();
                  HandleRemoveUser(conversation);
                }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
        {!pending && (
          <div className={styles.moreMenuWrapper} onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.unreadBadgeIcon}
              aria-label="Conversation options"
              onClick={(e) => {
                e.stopPropagation();
                setUserControlMenu((prev) => (prev === conversation.chatListId ? null : conversation.chatListId));
              }}
            >
              <BsThreeDotsVertical />
            </button>
            {userControlMenu === conversation.chatListId && (
              <div className={styles.moreMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.moreMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    HandleRemoveUser(conversation);
                  }}
                >
                  Remove conversation
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Fragment>
      <div className={styles.pageContainer}>
        <div className={styles.headerSection}>
          <h1 className={styles.pageTitle}>Chats</h1>
          <p className={styles.pageDescription}>
            Manage your client conversations.
            {pendingCount > 0 && (
              <span className={styles.pendingNote}>
                {" "}· {pendingCount} new {pendingCount === 1 ? "request" : "requests"}
              </span>
            )}
          </p>
        </div>

        <div className={styles.chatLayout}>
          {/* ── Client list ── */}
          <aside className={`${styles.conversationsSidebar} ${showChatView ? styles.hideOnMobile : ""}`}>
            <div className={styles.searchBar}>
              <div className={styles.searchInputWrapper}>
                <HiOutlineMagnifyingGlass className={styles.searchIcon} />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search clients"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.conversationsList}>
              {!listLoaded ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>Loading conversations…</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className={styles.emptyState}>
                  <HiOutlineChatBubbleLeftRight className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>{searchQuery ? "No matches" : "No conversations yet"}</p>
                  <p className={styles.emptyText}>
                    {searchQuery
                      ? "Try a different name."
                      : "When clients start a consultation, their conversations will appear here."}
                  </p>
                </div>
              ) : (
                filteredConversations.map(renderConversation)
              )}
            </div>
          </aside>

          {/* ── Conversation ── */}
          <section className={`${styles.chatWindow} ${!showChatView ? styles.hideOnMobile : ""}`}>
            {selectedConversation ? (
              <>
                <div className={styles.chatHeader}>
                  <button
                    type="button"
                    className={styles.mobileBackButton}
                    onClick={() => setShowChatView(false)}
                    aria-label="Back to conversations"
                  >
                    <HiOutlineArrowLeft />
                  </button>
                  <div className={styles.chatHeaderInfo}>
                    <div className={styles.avatarWrapper}>
                      <img
                        src={resolveAvatar(selectedConversation.sender?.profileImage)}
                        alt=""
                        className={styles.chatHeaderAvatar}
                      />
                      {selectedConversation.sender?.isActive && <span className={styles.onlineIndicator} />}
                    </div>
                    <div className={styles.chatHeaderText}>
                      <div className={styles.chatHeaderName}>{selectedConversation.sender?.fullname || "Client"}</div>
                      <div
                        className={`${styles.chatHeaderStatus} ${selectedConversation.sender?.isActive ? styles.statusOnline : ""}`}
                      >
                        {selectedConversation.sender?.isActive ? "Online" : "Offline"}
                      </div>
                    </div>
                  </div>
                  {timerRunningForOpen && (
                    <div className={styles.timer}>
                      <span className={styles.timerValue}>
                        {minutes}:{String(remainingSeconds).padStart(2, "0")}
                      </span>
                      <button type="button" onClick={() => setShowEndConfirm(true)} className={styles.dangerBtn} disabled={ending}>
                        {ending ? "Ending…" : "End chat"}
                      </button>
                    </div>
                  )}
                </div>

                {peerNote && (
                  <div className={`${styles.peerBanner} ${peerNote.tone === "ok" ? styles.peerBannerOk : ""}`} role="status">
                    {peerNote.text}
                  </div>
                )}
                <div className={styles.messagesArea} ref={messagesAreaRef}>
                  {chatMessagesData.length === 0 ? (
                    <div className={styles.emptyChatState}>
                      <p className={styles.emptyText}>No messages yet.</p>
                    </div>
                  ) : (
                    chatMessagesData.map((message, index) => {
                      const isOwn = String(message.senderId) === String(consultantId);
                      const prev = chatMessagesData[index - 1];
                      const grouped = !!prev && String(prev.senderId) === String(message.senderId);
                      return (
                        <div
                          key={message._id || index}
                          className={`${styles.messageContainer} ${isOwn ? styles.messageContainerRight : styles.messageContainerLeft} ${grouped ? styles.messageContainerGrouped : ""}`}
                        >
                          <div className={`${styles.messageBubble} ${isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther}`}>
                            <div className={styles.messageText}>{message.text}</div>
                            <div className={styles.messageTimestamp}>
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Session strip — outside the scroll area, above the composer */}
                {showChatEndPop ? (
                  <div className={styles.sessionStrip}>
                    <div className={styles.chatRequestBox}>
                      <div className={styles.chatIcon}>✓</div>
                      <div className={styles.chatRequestContent}>
                        <h4>
                          {chatEndSummary?.endReason === "user_disconnected_timeout"
                            ? "Chat ended — client did not reconnect"
                            : chatEndSummary?.endReason === "consultant_disconnected_timeout"
                              ? "Chat ended — you were disconnected"
                              : chatEndSummary?.endReason === "insufficient_balance"
                                ? "Chat ended — client credits exhausted"
                                : String(chatEndSummary?.endedBy) === String(consultantId)
                                  ? "You ended the chat"
                                  : "Chat ended by the client"}
                        </h4>
                        <p>
                          {chatEndSummary
                            ? `Duration ${Math.ceil((chatEndSummary.durationSeconds || 0) / 60)} min · Billed ${formatCurrency(currency, chatEndSummary.finalAmount)} · Your share ${formatCurrency(currency, chatEndSummary.consultantShare)}`
                            : "The session has been closed and billed."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatEndPop(false);
                          dispatch(clearChatEndSummary());
                        }}
                        className={styles.acceptBtn}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                ) : requestPendingInWindow ? (
                  <div className={styles.sessionStrip}>
                    <div className={styles.chatRequestBox}>
                      <div className={styles.chatIcon}>💬</div>
                      <div className={styles.chatRequestContent}>
                        <h4>Client is waiting to start</h4>
                        <p>Accept to invite the client to begin the timed session.</p>
                      </div>
                      <button type="button" onClick={() => acceptUserChat(chatAccepted)} className={styles.acceptBtn}>
                        Accept &amp; start
                      </button>
                    </div>
                  </div>
                ) : null}

                {rejectNote && <div className={styles.rejectNote} role="alert">{rejectNote}</div>}
                <div className={styles.messageInputArea}>
                  <div className={`${styles.inputGroup} ${canSend ? "" : styles.inputGroupDisabled}`}>
                    <button type="button" className={styles.attachButton} title="Attach file" disabled={!canSend}>
                      <HiOutlinePaperClip />
                    </button>
                    <input
                      type="text"
                      className={styles.messageInput}
                      placeholder={canSend ? "Type a message…" : "Select a conversation"}
                      value={text}
                      disabled={!canSend}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && canSend && text.trim()) {
                          e.preventDefault();
                          sendChat();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={sendChat}
                      className={styles.sendButton}
                      title="Send"
                      disabled={!canSend || !text.trim() || sending}
                    >
                      <HiOutlinePaperAirplane className={styles.sendIcon} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyChatState}>
                <div className={styles.emptyChatContent}>
                  <HiOutlineChatBubbleLeftRight className={styles.emptyChatIcon} />
                  <p className={styles.emptyTitle}>Select a conversation</p>
                  <p className={styles.emptyText}>Choose a client from the list to view the conversation.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {showEndConfirm && (
        <PortalModal>
          <div className="consultant-dashboard-shell">
            <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="end-title">
              <div className={styles.modalCard}>
                <h3 id="end-title" className={styles.modalTitle}>End chat?</h3>
                <p className={styles.modalText}>This will end the consultation and finalize billing for the client.</p>
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
      <ReactToast show={showChatEndToast} message="Chat ended" onClose={() => setShowChatEndToast(false)} />
    </Fragment>
  );
};

export default ChatsPage;
