import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AgoraRTC from "agora-rtc-sdk-ng";

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

// 🔊 MIC CONTROL HELPERS

export const enableMic = async () => {
    if (!localAudioTrack) {
        console.log("🎤 Creating & publishing mic track");
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        // await localAudioTrack.setEnabled(false)
        await client.publish([localAudioTrack]);
    } else {
        console.log("🎤 Enabling mic track");
        localAudioTrack.setEnabled(true);
    }
};

export const disableMic = async () => {
    if (localAudioTrack) {
        console.log("🔇 Disabling mic track");
        await client.unpublish([localAudioTrack]);
        localAudioTrack.stop();
        localAudioTrack.close();
        localAudioTrack = null;
    }
};


let localAudioTrack = null;
let localVideoTrack = null;
let remoteAudioTrack = null;
let remoteVideoTrack = null;

// Export functions to get tracks for video rendering
export const getLocalVideoTrack = () => localVideoTrack;
export const getRemoteVideoTrack = () => remoteVideoTrack;
let userLeftListenerAdded = false;
let callConnectedEmitted = false; // Track if call-connected event has been emitted
let timerStarted = false; // Track if timer start event has been emitted


const checkAndEmitCallConnected = () => {
    console.log("Both user joined and connection state is connected timer should start");
    if (
        client.connectionState === "CONNECTED" &&
        client.remoteUsers.length > 0 &&
        !callConnectedEmitted
    ) {
        callConnectedEmitted = true;

        window.dispatchEvent(
            new CustomEvent("call-connected", {
                detail: {
                    at: Date.now(),
                    remoteUid: client.remoteUsers[0]?.uid
                }
            })
        );

        console.log("🔥 CALL CONNECTED (SAFE)");
    }
};

// Timer start function - fires when both users join
const tryStartTimer = () => {
    if (
        !timerStarted &&
        client.connectionState === "CONNECTED" &&
        client.remoteUsers.length > 0
    ) {
        timerStarted = true;

        console.log("🔥 BOTH USER JOINED → TIMER START");

        window.dispatchEvent(
            new CustomEvent("call-timer-start", {
                detail: {
                    startedAt: Date.now(),
                    remoteUid: client.remoteUsers[0]?.uid
                }
            })
        );
    }
};


export const startCall = createAsyncThunk(
    "call/startCall",
    async ({ token, channel, uid, appId, callType = "voice" }, { rejectWithValue }) => {
        try {
            const numericUid = typeof uid === 'string' ? parseInt(uid) : uid;
            const agoraAppId = appId || process.env.REACT_APP_AGORA_APP_ID;

            console.log(`Starting ${callType} call:`, {
                channel,
                uid: numericUid,
                appId: agoraAppId,
                tokenLength: token?.length,
                callType
            });

            if (!agoraAppId) {
                throw new Error("Agora App ID is required");
            }

            if (!token) {
                throw new Error("Token is required");
            }

            if (!channel) {
                throw new Error("Channel name is required");
            }

            // Leave existing connection if any
            if (client.connectionState !== "DISCONNECTED" && client.connectionState !== "DISCONNECTING") {
                console.log("Leaving existing connection...");
                try {
                    await client.leave();
                } catch (leaveError) {
                    console.warn("Error leaving previous connection:", leaveError);
                }
            }

            // Join channel
            console.log("Joining channel...", {
                appId: agoraAppId,
                channel,
                uid: numericUid,
                tokenPreview: token?.substring(0, 20) + "..."
            });

            try {
                await client.join(agoraAppId, channel, token, numericUid);
                console.log("Joined channel successfully. Connection state:", client.connectionState);
                console.log("Local UID after join:", client.uid);
            } catch (joinError) {
                console.error("Failed to join channel:", joinError);
                throw new Error(`Failed to join channel: ${joinError.message}`);
            }
            // ✅ JOIN hone ke baad hi listener lagana zaroori hai
            if (!userLeftListenerAdded) {
                client.on("user-left", (user, reason) => {
                    console.log("🚨 Remote user left:", user.uid, reason);

                    // Remote tracks cleanup
                    remoteAudioTrack?.stop();
                    remoteAudioTrack = null;

                    remoteVideoTrack?.stop();
                    remoteVideoTrack = null;

                    // 🔥 React ko inform karo
                    window.dispatchEvent(
                        new CustomEvent("remote-user-left", {
                            detail: { uid: user.uid, reason }
                        })
                    );
                });

                userLeftListenerAdded = true;
            }


            // Create and publish tracks based on call type
            if (callType === "video") {
                console.log("Creating video tracks...");
                try {
                    // Try to create both audio and video tracks
                    try {
                        [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                        console.log("Video tracks created successfully");
                    } catch (audioError) {
                        // If audio device not found, try creating only video track
                        if (audioError.code === 'DEVICE_NOT_FOUND' || audioError.message?.includes('device not found')) {
                            console.warn("Audio device not found, continuing with video only:", audioError.message);
                            try {
                                localVideoTrack = await AgoraRTC.createCameraVideoTrack({
                                    encoderConfig: {
                                        width: 640,
                                        height: 480,
                                        frameRate: 15,
                                        bitrateMin: 400,
                                        bitrateMax: 800
                                    }
                                });
                                console.log("Video track created successfully (audio unavailable)");
                            } catch (videoError) {
                                console.error("Failed to create video track:", videoError);
                                throw videoError;
                            }
                        } else {
                            throw audioError;
                        }
                    }

                    // Video call: default camera OFF and mic OFF; user turns on when ready
                    if (localAudioTrack) localAudioTrack.setEnabled(false);
                    if (localVideoTrack) localVideoTrack.setEnabled(false);

                    // Publish available tracks
                    const tracksToPublish = [localAudioTrack, localVideoTrack].filter(Boolean);
                    if (tracksToPublish.length > 0) {
                        console.log("Publishing tracks...", { audio: !!localAudioTrack, video: !!localVideoTrack });
                        await client.publish(tracksToPublish);
                        console.log("Published local tracks successfully");
                        console.log("Published tracks status:", {
                            audio: localAudioTrack?.isPlaying || false,
                            video: localVideoTrack?.isPlaying || false
                        });
                    } else {
                        console.warn("No tracks available to publish");
                    }

                    // Try to play local video immediately if element exists - Multiple attempts
                    if (localVideoTrack) {
                        const playLocalVideo = () => {
                            const localVideoElement = document.querySelector('[data-local-video]');
                            if (localVideoElement && localVideoTrack) {
                                localVideoTrack.play(localVideoElement).then(() => {
                                    console.log("Local video playing on element successfully");
                                }).catch(err => {
                                    console.error("Error playing local video:", err);
                                });
                            }
                        };

                        // Try multiple times with delays
                        setTimeout(playLocalVideo, 100);
                        setTimeout(playLocalVideo, 500);
                        setTimeout(playLocalVideo, 1000);

                        // Dispatch event for component to handle
                        window.dispatchEvent(new Event('local-video-ready'));
                    }
                } catch (trackError) {
                    console.error("Error creating/publishing video tracks:", trackError);
                    // Don't throw error - allow call to continue even without local tracks
                    // Remote user can still join and timer should start
                    console.warn("Continuing call without local tracks due to device error");
                }
            } else {
                console.log("Creating audio track...");
                try {
                    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                    console.log("Audio track created successfully");

                    // Start muted (matches initialState.muted: true); user unmutes to enable
                    if (localAudioTrack) localAudioTrack.setEnabled(false);

                    console.log("Publishing audio track...");
                    await client.publish([localAudioTrack]);
                    console.log("Published local audio track successfully");
                    console.log("Audio track status:", localAudioTrack?.isPlaying || false);
                } catch (trackError) {
                    // Handle device not found error gracefully
                    if (trackError.code === 'DEVICE_NOT_FOUND' || trackError.message?.includes('device not found')) {
                        console.warn("Audio device not found, continuing call without local audio:", trackError.message);
                        // Don't throw error - allow call to continue
                        // User can still receive remote audio and timer should start
                    } else {
                        console.error("Error creating/publishing audio track:", trackError);
                        // For other errors, still don't throw - allow call to continue
                        console.warn("Continuing call despite audio track error");
                    }
                }
            }

            // Verify tracks are published (default: mic and camera off for video call)
            const publishedTracks = client.localTracks;
            console.log("Local tracks published:", publishedTracks.length);

            // Verify connection state
            console.log("Final connection state:", client.connectionState);
            console.log("Channel name:", channel);
            console.log("Local UID:", client.uid);

            // Setup event listeners for remote users
            const handleUserPublished = async (user, mediaType) => {
                console.log(`Remote user published ${mediaType}. User UID:`, user.uid);

                try {
                    if (mediaType === "audio") {
                        remoteAudioTrack = await client.subscribe(user, mediaType);
                        await remoteAudioTrack.play();
                        console.log("Playing remote audio successfully");
                    } else if (mediaType === "video") {
                        remoteVideoTrack = await client.subscribe(user, mediaType);
                        console.log("Remote video track subscribed successfully");

                        // Try to play immediately and also dispatch event
                        const playRemoteVideo = () => {
                            const remoteVideoElement = document.querySelector('[data-remote-video]');
                            if (remoteVideoElement && remoteVideoTrack) {
                                remoteVideoTrack.play(remoteVideoElement, {
                                    fit: "contain"   // 🔥 NO ZOOM
                                }).then(() => {
                                    console.log("Playing remote video (no zoom)");
                                }).catch(err => {
                                    console.error("Error playing remote video:", err);
                                });
                            }
                        };

                        // Try immediately
                        setTimeout(playRemoteVideo, 100);

                        // Also try after a delay
                        setTimeout(playRemoteVideo, 500);
                        setTimeout(playRemoteVideo, 1000);

                        // Dispatch custom event to notify component
                        window.dispatchEvent(new Event('remote-video-ready'));
                    }
                } catch (error) {
                    console.error(`Error handling remote ${mediaType}:`, error);
                }
            };


            client.on("user-joined", (user) => {
                console.log("User joined channel. UID:", user.uid);
                checkAndEmitCallConnected();
                tryStartTimer(); // Start timer when both users join
                // Receiver refresh ke baad re-join par caller ko pata chale, call end na kare
                window.dispatchEvent(new CustomEvent("remote-user-rejoined", { detail: { uid: user.uid } }));
            });

            // Listen for connection state changes
            client.on("connection-state-change", (curState, revState) => {
                console.log("Connection state changed:", { from: revState, to: curState });
                checkAndEmitCallConnected();
                tryStartTimer(); // Start timer when connection state changes to CONNECTED
            });

            const handleUserUnpublished = async (user, mediaType) => {


                if (mediaType === "audio") {
                    console.log("Remote user unpublished audio");
                    remoteAudioTrack?.stop();
                    remoteAudioTrack = null;
                } else if (mediaType === "video") {
                    console.log("Remote user unpublished video");
                    remoteVideoTrack?.stop();
                    remoteVideoTrack = null;
                    window.dispatchEvent(new Event('remote-video-stopped'));
                }

            };

            // Remove old listeners and add new ones
            client.off("user-published", handleUserPublished);
            client.off("user-unpublished", handleUserUnpublished);
            client.on("user-published", handleUserPublished);
            client.on("user-unpublished", handleUserUnpublished);

            console.log(`${callType} call setup complete`);
            return { channel, type: callType };
        } catch (error) {
            console.error(`START ${callType.toUpperCase()} CALL FAILED:`, error);
            return rejectWithValue(error.message);
        }
    }
);

// Legacy functions for backward compatibility
export const startVoiceCall = createAsyncThunk(
    "call/startVoice",
    async (params, { dispatch }) => {
        return dispatch(startCall({ ...params, callType: "voice" })).unwrap();
    }
);

export const startVideoCall = createAsyncThunk(
    "call/startVideo",
    async (params, { dispatch }) => {
        return dispatch(startCall({ ...params, callType: "video" })).unwrap();
    }
);

export const endCall = createAsyncThunk(
    "call/end",
    async () => {
        // Stop and cleanup remote tracks
        remoteAudioTrack?.stop();
        remoteAudioTrack = null;
        remoteVideoTrack?.stop();
        remoteVideoTrack = null;

        // Stop and cleanup local tracks
        localAudioTrack?.stop();
        localAudioTrack?.close();
        localAudioTrack = null;

        localVideoTrack?.stop();
        localVideoTrack?.close();
        localVideoTrack = null;

        // Reset flags for next call
        callConnectedEmitted = false;
        timerStarted = false;

        // Leave channel – remote peer will get Agora "user offline" / "user-left" (reason: Quit)
        await client.leave();
        console.log("Call ended and cleaned up");
    }
);

const callSlice = createSlice({
    name: "call",
    initialState: {
        inCall: false,
        channel: null,
        type: null,
        muted: true,
        videoEnabled: true,
    },
    reducers: {
        // Use setEnabled only (sync) so voice transfers immediately. Do not destroy track on mute.
        toggleMute: state => {
            state.muted = !state.muted;
            if (localAudioTrack) {
                localAudioTrack.setEnabled(!state.muted);
                console.log("🎤 Mic", state.muted ? "muted" : "unmuted");
            }
        },

        toggleVideo: state => {
            state.videoEnabled = !state.videoEnabled;
            localVideoTrack?.setEnabled(state.videoEnabled);
        },
    },
    extraReducers: builder => {
        builder
            .addCase(startCall.pending, (state) => {
                console.log("Call pending...");
            })
            .addCase(startCall.fulfilled, (state, action) => {
                console.log("Call fulfilled:", action.payload);
                state.inCall = true;
                state.channel = action.payload.channel;
                state.type = action.payload.type;
                // Video call: start with camera off; voice call doesn't use video
                state.videoEnabled = action.payload.type === "video" ? false : true;
            })
            .addCase(startCall.rejected, (state, action) => {
                console.error("Call rejected:", action.payload);
                state.inCall = false;
                state.channel = null;
                state.type = null;
            })
            .addCase(startVoiceCall.fulfilled, (state, action) => {
                state.inCall = true;
                state.channel = action.payload.channel;
                state.type = "voice";
            })
            .addCase(startVideoCall.fulfilled, (state, action) => {
                state.inCall = true;
                state.channel = action.payload.channel;
                state.type = "video";
                state.videoEnabled = false; // Camera off by default
            })
            .addCase(endCall.fulfilled, state => {
                state.inCall = false;
                state.channel = null;
                state.type = null;
                state.muted = false;
                state.videoEnabled = true;
            });
    },
});

export const { toggleMute, toggleVideo } = callSlice.actions;
export default callSlice.reducer;
