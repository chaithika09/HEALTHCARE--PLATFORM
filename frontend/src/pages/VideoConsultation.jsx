import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhone,
  FiMessageSquare, FiMaximize2, FiMinimize2, FiUsers, FiSettings,
  FiSend
} from "react-icons/fi";
import { appointmentAPI } from "../services/api";
import { getSocket } from "../services/socket";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

// ── ICE servers (STUN) ──────────────────────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VideoConsultation() {
  const navigate = useNavigate();
  const { id: appointmentId } = useParams();
  const { user, token } = useAuthStore();

  // ── UI state ──────────────────────────────────────────────────
  const [micOn,      setMicOn]      = useState(true);
  const [camOn,      setCamOn]      = useState(true);
  const [chatOpen,   setChatOpen]   = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [messages,   setMessages]   = useState([]);
  const [newMsg,     setNewMsg]     = useState("");
  const [duration,   setDuration]   = useState("00:00:00");
  const [callStatus, setCallStatus] = useState("connecting"); 
  // connecting | ringing | active | ended

  // ── Data state ────────────────────────────────────────────────
  const [appointment, setAppointment] = useState(null);
  const [otherUser,   setOtherUser]   = useState(null);

  // ── Refs ──────────────────────────────────────────────────────
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef        = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef      = useRef(null);
  const startTimeRef   = useRef(null);
  const timerRef       = useRef(null);
  const chatEndRef     = useRef(null);

  // ── Derived data ──────────────────────────────────────────────
  const isDoctor          = user?.role === "doctor";
  const otherPersonName   = otherUser?.name   || "User";
  const otherPersonRole   = isDoctor ? "Patient" : "Doctor";
  const otherInitials     = otherPersonName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const myInitials        = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "ME";

  // ── Helpers ───────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setDuration(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Get local media ───────────────────────────────────────────
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.warn("Camera/mic not available:", err.message);
      toast("Camera or microphone not found — running without media.", { icon: "⚠️" });
      return null;
    }
  }, []);

  // ── Create peer connection ─────────────────────────────────────
  const createPeer = useCallback((stream, otherUserId, isInitiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    // Receive remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setCallStatus("active");
      startTimer();
    };

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("video:ice-candidate", {
          targetUserId: otherUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setCallStatus("ended");
        toast("Connection lost", { icon: "📵" });
      }
    };

    peerRef.current = pc;
    return pc;
  }, [startTimer]);

  // ── Fetch appointment ──────────────────────────────────────────
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await appointmentAPI.getById(appointmentId);
        const apt = res.data.data.appointment;
        setAppointment(apt);

        // Determine other person
        if (isDoctor) {
          setOtherUser(apt.patient);
        } else {
          // Patient sees doctor (populated User object from Appointment model)
          setOtherUser(apt.doctor);
        }
      } catch (err) {
        console.error("Failed to fetch appointment:", err);
        toast.error("Could not load appointment details");
      }
    };

    if (appointmentId) fetchAppointment();
  }, [appointmentId, isDoctor]);

  // ── Socket + WebRTC setup ──────────────────────────────────────
  useEffect(() => {
    if (!appointment) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    // Join video room for this appointment so we can receive calls
    if (socket.connected) {
      socket.emit("video:join-room", { appointmentId });
    }
    socket.on("connect", () => {
      socket.emit("video:join-room", { appointmentId });
    });

    const otherUserId = isDoctor
      ? appointment.patient?._id
      : appointment.doctor?.user?._id || appointment.doctor?._id;

    const init = async () => {
      const stream = await getLocalStream();

      // ── Caller (doctor initiates) ──────────────────────────
      if (isDoctor) {
        setCallStatus("ringing");

        console.log(`[VideoCall] Initiating call to: ${otherUserId}`);
        socket.emit("video:call-request", {
          targetUserId: otherUserId,
          appointmentId,
          callerName: user?.name || "Doctor",
        });

      socket.on("video:call-accepted", async () => {
        if (peerRef.current) {
          console.log("[WebRTC] Call already active or accepted. Ignoring duplicate accepted event.");
          return;
        }

        toast.success("Call accepted! Connecting...");
        setCallStatus("active");
        startTimer();

        // Small delay to ensure patient's page is fully loaded
        await new Promise(r => setTimeout(r, 500));

        try {
          const pc = createPeer(stream, otherUserId, true);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          socket.emit("video:offer", { targetUserId: otherUserId, offer });
          console.log("[WebRTC] Offer sent to target:", otherUserId);
        } catch (err) {
          console.error("[WebRTC] Error creating offer:", err);
          toast.error("Failed to start video connection");
        }
      });

        socket.on("video:call-rejected", () => {
          toast("Call was declined", { icon: "❌" });
          setCallStatus("ended");
          setTimeout(() => navigate(-1), 2000);
        });

        socket.on("video:target-offline", () => {
          // Generate a Jitsi Meet room as fallback
          const roomId = `mediq-${appointmentId?.slice(-8) || Date.now()}`;
          const jitsiUrl = `https://meet.jit.si/${roomId}`;
          
          toast(
            (t) => (
              <div>
                <p className="font-semibold">Patient may be offline</p>
                <p className="text-xs mt-1">Try video via Jitsi Meet:</p>
                <a 
                  href={jitsiUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-blue-500 underline text-xs block mt-1"
                  onClick={() => toast.dismiss(t.id)}
                >
                  Join: {roomId}
                </a>
              </div>
            ),
            { duration: 10000, icon: "📹" }
          );
          
          setCallStatus("ended");
          setTimeout(() => navigate(-1), 8000);
        });
      } else {
        // ── Callee (patient receives) ──────────────────────────
        setCallStatus("ringing");
        toast.success("Joining video call...");

        // Re-emit call-accepted in case doctor missed it from the modal
        // (handles timing issues when navigating to this page)
        const callerId = isDoctor
          ? appointment.patient?._id
          : appointment.doctor?.user?._id || appointment.doctor?._id;

        console.log(`[VideoCall] Patient re-emitting call-accepted to doctor: ${callerId}`);
        socket.emit("video:call-accepted", { callerId });
      }

      // ── WebRTC signaling ──────────────────────────────────
      socket.on("video:offer", async ({ offer, from }) => {
        if (peerRef.current) {
          console.warn("[WebRTC] Offer received but peer already exists. Ignoring.");
          return;
        }

        try {
          const pc = createPeer(stream, from, false);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("video:answer", { targetUserId: from, answer });

          if (callStatus !== "active") {
            setCallStatus("active");
            startTimer();
          }
        } catch (err) {
          console.error("[WebRTC] Error handling offer:", err);
        }
      });

      socket.on("video:answer", async ({ answer }) => {
        if (!peerRef.current) return;

        // Safety: Only process answer if we are in 'have-local-offer' state
        if (peerRef.current.signalingState !== "have-local-offer") {
          console.warn(`[WebRTC] Received answer in wrong state: ${peerRef.current.signalingState}. Ignoring.`);
          return;
        }

        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("[WebRTC] Remote answer set successfully");
        } catch (err) {
          console.error("[WebRTC] Failed to set remote answer:", err);
        }
      });

      socket.on("video:ice-candidate", async ({ candidate }) => {
        try {
          if (peerRef.current) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {
          console.error("ICE candidate error:", e);
        }
      });

      socket.on("video:call-ended", () => {
        toast("Call ended by the other participant", { icon: "📵" });
        handleEndCall(false);
      });
    };

    init();

    return () => {
      socket.off("video:call-accepted");
      socket.off("video:call-rejected");
      socket.off("video:offer");
      socket.off("video:answer");
      socket.off("video:ice-candidate");
      socket.off("video:call-ended");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment]);

  // ── End call ───────────────────────────────────────────────────
  const handleEndCall = useCallback((notifyOther = true) => {
    stopTimer();
    setCallStatus("ended");

    // Stop local media
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }

    // Close peer connection
    if (peerRef.current) {
      peerRef.current.close();
    }

    // Notify other party
    if (notifyOther && socketRef.current && appointment) {
      const otherUserId = isDoctor
        ? appointment.patient?._id
        : appointment.doctor?.user?._id || appointment.doctor?._id;

      socketRef.current.emit("video:call-ended", { targetUserId: otherUserId });
    }

    toast("Call ended", { icon: "📵" });
    setTimeout(() => navigate(-1), 1500);
  }, [stopTimer, appointment, isDoctor, navigate]);

  // ── Toggle mic ─────────────────────────────────────────────────
  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    }
    setMicOn(prev => !prev);
  };

  // ── Toggle camera ──────────────────────────────────────────────
  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    }
    setCamOn(prev => !prev);
  };

  // ── Send chat message ──────────────────────────────────────────
  const sendMessage = () => {
    if (!newMsg.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msg = { from: "me", text: newMsg.trim(), time };
    setMessages(prev => [...prev, msg]);
    setNewMsg("");
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    // In a real app, broadcast via socket:
    // socketRef.current?.emit("chat:message", { conversationId, content: newMsg });
  };

  // ── Scroll chat on new message ─────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTimer();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (peerRef.current) peerRef.current.close();
    };
  }, [stopTimer]);

  // ── Status label ───────────────────────────────────────────────
  const statusLabel = {
    connecting: "Connecting...",
    ringing:    isDoctor ? "Calling patient..." : "Joining call...",
    active:     duration,
    ended:      "Call ended",
  }[callStatus];

  const statusColor = callStatus === "active" ? "text-green-400" : "text-yellow-400";

  return (
    <div className={`fixed inset-0 bg-gray-900 flex flex-col z-50 ${fullscreen ? "" : ""}`}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900/90 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${callStatus === "active" ? "bg-green-400" : "bg-yellow-400"}`} />
          <span className="text-white font-semibold">{otherPersonName}</span>
          <span className="text-gray-400 text-xs">{otherPersonRole}</span>
          <span className={`text-sm font-mono ml-2 ${statusColor}`}>· {statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFullscreen(p => !p)} className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
            {fullscreen ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
          </button>
          <button className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
            <FiUsers size={15} />
          </button>
          <button className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
            <FiSettings size={15} />
          </button>
        </div>
      </div>

      {/* ── Call status overlay (ringing / connecting) ──────── */}
      <AnimatePresence>
        {callStatus !== "active" && callStatus !== "ended" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900/80 gap-6"
          >
            <div className="relative">
              {/* Animated ring */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-3xl z-10 relative">
                {otherInitials}
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-primary-400/40 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-semibold">{otherPersonName}</p>
              <p className="text-gray-400 text-sm mt-1">{statusLabel}</p>
            </div>
            <button
              onClick={() => handleEndCall(true)}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg"
            >
              <FiPhone size={24} className="rotate-[135deg]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* Remote video */}
        <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ display: callStatus === "active" ? "block" : "none" }}
          />

          {/* Avatar shown when no remote video */}
          {callStatus !== "active" && (
            <div className="text-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-3">
                {otherInitials}
              </div>
              <p className="text-white font-medium">{otherPersonName}</p>
              <p className="text-gray-400 text-sm">{otherPersonRole}</p>
            </div>
          )}

          {/* Self video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-40 h-28 rounded-2xl overflow-hidden border-2 border-gray-600 shadow-xl bg-gray-800">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ display: camOn ? "block" : "none" }}
            />
            {!camOn && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400">
                <FiVideoOff size={22} />
                <span className="text-xs">{myInitials}</span>
              </div>
            )}
            {/* Name label */}
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded-full">You ({myInitials})</span>
            </div>
          </div>
        </div>

        {/* ── Chat panel ──────────────────────────────────────── */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold text-sm">In-call Chat</h3>
                <p className="text-gray-500 text-xs mt-0.5">with {otherPersonName}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">No messages yet</p>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        msg.from === "me"
                          ? "bg-primary-600 text-white rounded-br-sm"
                          : "bg-gray-700 text-gray-100 rounded-bl-sm"
                      }`}>
                        {msg.from !== "me" && (
                          <p className="text-xs text-primary-300 font-medium mb-1">{otherPersonName}</p>
                        )}
                        <p>{msg.text}</p>
                        <p className="text-xs opacity-50 mt-1 text-right">{msg.time}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-gray-700 flex gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-2.5 bg-primary-600 rounded-xl text-white hover:bg-primary-700 transition-colors"
                >
                  <FiSend size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls ────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 py-5 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700">

        {/* Mic */}
        <button
          onClick={toggleMic}
          title={micOn ? "Mute mic" : "Unmute mic"}
          className={`w-13 h-13 w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            micOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-500 text-white"
          }`}
        >
          {micOn ? <FiMic size={22} /> : <FiMicOff size={22} />}
        </button>

        {/* Camera */}
        <button
          onClick={toggleCam}
          title={camOn ? "Turn off camera" : "Turn on camera"}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            camOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-500 text-white"
          }`}
        >
          {camOn ? <FiVideo size={22} /> : <FiVideoOff size={22} />}
        </button>

        {/* End call */}
        <button
          onClick={() => handleEndCall(true)}
          title="End call"
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg"
        >
          <FiPhone size={24} className="rotate-[135deg]" />
        </button>

        {/* Chat */}
        <button
          onClick={() => setChatOpen(p => !p)}
          title="Toggle chat"
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all relative ${
            chatOpen ? "bg-primary-600 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
          }`}
        >
          <FiMessageSquare size={22} />
          {messages.length > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
              {messages.length}
            </span>
          )}
        </button>

        {/* Fullscreen */}
        <button
          onClick={() => setFullscreen(p => !p)}
          title="Toggle fullscreen"
          className="w-14 h-14 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center transition-all"
        >
          {fullscreen ? <FiMinimize2 size={22} /> : <FiMaximize2 size={22} />}
        </button>
      </div>
    </div>
  );
}
