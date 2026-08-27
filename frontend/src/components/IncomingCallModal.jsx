import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiPhone, FiPhoneOff } from "react-icons/fi";
import { getSocket } from "../services/socket";
import { useAuthStore } from "../store/authStore";

export default function IncomingCallModal() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuthStore();
  const [call, setCall] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket(token);

    const handleIncomingCall = (data) => {
      console.log("Incoming call event received in Modal:", data);
      setCall(data);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCall(null), 30000);
    };

    const handleCallEnded = () => {
      setCall(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    socket.on("video:incoming-call", handleIncomingCall);
    socket.on("video:call-ended", handleCallEnded);

    return () => {
      socket.off("video:incoming-call", handleIncomingCall);
      socket.off("video:call-ended", handleCallEnded);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isAuthenticated, token]);

  const acceptCall = () => {
    if (!call) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const socket = getSocket(token);
    socket.emit("video:call-accepted", { callerId: call.from });
    setCall(null);
    navigate(`/video-call/${call.appointmentId}`);
  };

  const rejectCall = () => {
    if (!call) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const socket = getSocket(token);
    socket.emit("video:call-rejected", { callerId: call.from });
    setCall(null);
  };

  const callerInitials = call?.callerName
    ?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "DR";

  return (
    <AnimatePresence>
      {call && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0,   scale: 1 }}
          exit={{   opacity: 0, y: -80, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-6 right-6 z-[9999] w-80 bg-gray-900 rounded-3xl shadow-2xl border border-gray-700 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-primary-500 to-primary-400 animate-pulse" />
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
                  {callerInitials}
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-primary-400/40 animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary-400 font-medium uppercase tracking-wider mb-0.5">Incoming Video Call</p>
                <p className="text-white font-bold text-base leading-tight">{call.callerName}</p>
                <p className="text-gray-400 text-sm mt-0.5">Doctor · Healthcare Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 justify-center my-4">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 2.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  className="w-1 h-3 bg-primary-400 rounded-full"
                />
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={rejectCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all font-medium text-sm">
                <FiPhoneOff size={18} /> Decline
              </button>
              <button onClick={acceptCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 text-white hover:bg-green-600 transition-all font-medium text-sm shadow-lg shadow-green-500/30">
                <FiPhone size={18} /> Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
