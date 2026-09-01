import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  setIncomingCall,
  setCallRejected,
} from "../Redux/slices/sokectSlice";
import {
  socket,
  ensureSocketRegistered,
  SOCKET_ROLE,
} from "../Sokect-io/SokectConfig";
import { bindSocketListeners } from "../Sokect-io/socketEventBridge";
import { checkMicPermission } from "../ConsultantCards/ConsultantCards";
import TestRingtone from "../../pages/TestRingtone";
import axios from "axios";
import {
  buildCallPageUrl,
  navigateToCallPage,
} from "../middle-ware/OpenCallingPage";
import { getConsultantId, getShopId } from "../../utils/wixStorage";

export default function IncomingCallAlert() {
  const dispatch = useDispatch();
  const consultantId = getConsultantId();
  const { incomingCall, callEnded, callRejected } = useSelector(
    (state) => state.socket,
  );

  useEffect(() => {
    if (!consultantId) return;
    ensureSocketRegistered(consultantId, { role: SOCKET_ROLE.CONSULTANT }).then(
      (ok) => {
        if (ok) bindSocketListeners();
      },
    );
  }, [consultantId]);

  useEffect(() => {
    if ((callEnded || callRejected) && incomingCall) {
      dispatch(setIncomingCall(null));
    }
  }, [callEnded, callRejected, incomingCall, dispatch]);

  if (!incomingCall) return null;

  const { callerId, callType, channelName, callerName, shop } = incomingCall;

  const handleAccept = async () => {
    const receiverId = consultantId;
    if (!receiverId || !callerId) return;

    const shopId = getShopId() || localStorage.getItem("wix_id");

    const micState = await checkMicPermission();
    if (micState === "denied") {
      alert("Please grant microphone permission to start the call");
      return;
    }

    const ok = await ensureSocketRegistered(receiverId, {
      role: SOCKET_ROLE.CONSULTANT,
    });
    if (!ok) {
      alert("Could not connect. Please refresh and try again.");
      return;
    }

    const uid = Math.floor(Math.random() * 1000000);
    const res = await axios.post(
      `${process.env.REACT_APP_BACKEND_HOST}/api/call/generate-token`,
      {
        channelName,
        uid,
        callerId,
        receiverId,
      },
      { headers: { "Content-Type": "application/json" } },
    );

    const data = res.data;
    if (!data?.token) {
      alert("Could not start call. Please try again.");
      return;
    }

    socket.emit("call-accepted", {
      callerId,
      receiverId,
      channelName,
      callType: callType || "voice",
      shopId,
    });

    dispatch(setIncomingCall(null));

    const returnUrl = `${window.location.origin}/consultant-dashboard`;

    const callUrl = buildCallPageUrl({
      callerId,
      receiverId,
      callType: callType || "voice",
      uid,
      channelName,
      token: data.token,
      appId: data.appId,
      userId: receiverId,
      userType: "consultant",
      shopId,
      returnUrl,
    });

    setTimeout(() => navigateToCallPage(callUrl), 300);
  };

  const handleReject = async () => {
    const receiverId = consultantId;
    if (!receiverId) return;

    await ensureSocketRegistered(receiverId, {
      role: SOCKET_ROLE.CONSULTANT,
    });

    socket.emit("reject-call", {
      callerId,
      receiverId,
      channelName,
      callType: callType || "voice",
    });
    dispatch(setIncomingCall(null));
    dispatch(setCallRejected(null));
  };

  return (
    <>
      <TestRingtone incomingCall={incomingCall} />
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          width: "320px",
          backgroundColor: "#ffffff",
          boxShadow: "0px 4px 14px rgba(0, 0, 0, 0.15)",
          borderRadius: "12px",
          zIndex: 10000,
          padding: "10px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <img
            src="https://imgs.search.brave.com/8vitWtK7-18taVi4PjQG1jZwM0baiJg4CfpjJVibqtw/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9wZnBt/YWtlci5jb20vaW1h/Z2VzL2xhbmRpbmcv/aGVhZHNob3RzL2Js/b2dfMC5qcGc"
            alt="Caller"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              marginRight: "12px",
              objectFit: "cover",
            }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: "600",
                color: "#222",
              }}
            >
              {callType} call
            </p>
            <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>
              {callerName} is calling you
            </p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            type="button"
            onClick={handleAccept}
            style={{
              flex: 1,
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px",
              fontSize: "14px",
              cursor: "pointer",
              marginRight: "8px",
            }}
          >
            Accept
          </button>

          <button
            type="button"
            onClick={handleReject}
            style={{
              flex: 1,
              backgroundColor: "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Reject
          </button>
        </div>
      </div>
    </>
  );
}
