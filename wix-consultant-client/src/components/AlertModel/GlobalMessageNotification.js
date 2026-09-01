import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import PopupNotification from "./MessageNotificationAlert";
import { getSocketRegisterId } from "../../utils/wixStorage";

export default function GlobalMessageNotification() {
    const [notificationMessage, setNotificationMessage] = useState(null);
    const [showNotification, setShowNotification] = useState(false);
    const lastProcessedMessageId = useRef(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const id = getSocketRegisterId();
        if (id) setUserId(id);
    }, []);

    const socketMessages = useSelector(
        (state) => state.socket.messages
    );

    useEffect(() => {
        // 🔒 basic safety checks
        if (!Array.isArray(socketMessages)) return;
        if (socketMessages.length === 0) return;
        if (!userId) return;

        const lastIndex = socketMessages.length - 1;
        const lastMessage = socketMessages[lastIndex];

        if (!lastMessage) return;

        // 🔔 sirf receiver ko notify
        if (lastMessage.receiverId !== userId) return;

        // 🔁 duplicate prevent
        if (lastProcessedMessageId.current === lastMessage._id) return;

        lastProcessedMessageId.current = lastMessage._id;

        setNotificationMessage(lastMessage);
        setShowNotification(true);

        const timer = setTimeout(() => {
            setShowNotification(false);
        }, 6000);

        return () => clearTimeout(timer);
    }, [socketMessages, userId]);

    return (
        <>
            {showNotification && notificationMessage && (
                <PopupNotification
                    message={notificationMessage}
                    onClose={() => setShowNotification(false)}
                />
            )}
        </>
    );
}
