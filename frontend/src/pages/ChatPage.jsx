import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch, FiSend, FiVideo, FiMoreVertical,
  FiArrowLeft, FiPlus, FiX, FiUser, FiCheck, FiCheckCircle, FiImage
} from "react-icons/fi";
import { chatAPI, doctorAPI, appointmentAPI } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { getSocket } from "../services/socket";
import toast from "react-hot-toast";

export default function ChatPage() {
  const { id: urlConvId }  = useParams();
  const navigate            = useNavigate();
  const { user, token }     = useAuthStore();

  /* ── state ── */
  const [conversations,  setConversations]  = useState([]);
  const [activeConv,     setActiveConv]     = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [newMsg,         setNewMsg]         = useState("");
  const [search,         setSearch]         = useState("");
  const [loading,        setLoading]        = useState(true);
  const [showNewChat,    setShowNewChat]     = useState(false);
  const [contacts,       setContacts]       = useState([]);
  const [contactSearch,  setContactSearch]  = useState("");
  const [typing,         setTyping]         = useState(false); // other person typing
  const [imageFile,      setImageFile]      = useState(null);
  const [imagePreview,   setImagePreview]   = useState(null);

  /* ── refs ── */
  const messagesEndRef  = useRef(null);
  const socketRef       = useRef(null);
  const inputRef        = useRef(null);
  const activeConvRef   = useRef(null);
  const typingTimer     = useRef(null);
  const fileInputRef    = useRef(null);

  /* ─────────────────────────── helpers ──────────────────────── */
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const getOther = useCallback((conv) => {
    if (!conv?.participants) return { name: "User", role: "" };
    return conv.participants.find(
      p => (p._id || p)?.toString() !== user?._id?.toString()
    ) || conv.participants[0];
  }, [user?._id]);

  const initials = (name = "") =>
    name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const fmtTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts), now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const isMine = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    const myId = user?._id;
    if (!senderId || !myId) return false;
    return senderId.toString() === myId.toString();
  };

  /* ─────────────────── socket (singleton) ───────────────────── */
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    const handleConnect = () => {
      chatAPI.getConversations().then(res => {
        const convs = res.data.data.conversations || [];
        convs.forEach(c => socket.emit("chat:join", c._id));
      }).catch(() => {});
      if (activeConvRef.current) socket.emit("chat:join", activeConvRef.current);
    };

    socket.on("connect", handleConnect);
    if (socket.connected) handleConnect();

    const handleMessage = ({ conversationId, message }) => {
      if (activeConvRef.current === conversationId) {
        setMessages(prev => {
          if (prev.find(m => m._id?.toString() === message._id?.toString())) return prev;
          setTimeout(scrollToBottom, 60);
          return [...prev, message];
        });
      }
      setConversations(prev => prev.map(c =>
        c._id === conversationId
          ? { ...c, lastMessage: { content: message.content, timestamp: new Date() } }
          : c
      ));
      if (activeConvRef.current !== conversationId) {
        const name = message.sender?.name || "Someone";
        const txt = message.type === "image" ? "📷 Photo" : (message.content || "").slice(0, 50);
        toast(`💬 ${name}: ${txt}`, { duration: 3000 });
      }
    };

    socket.on("chat:message", handleMessage);

    socket.on("chat:typing", ({ userId: tUserId, isTyping }) => {
      if (tUserId !== user?._id) setTyping(isTyping);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("chat:message", handleMessage);
      socket.off("chat:typing");
      // Don't disconnect — singleton is shared across the app
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ─────────────────── load conversations ───────────────────── */
  const loadConversations = useCallback(async () => {
    try {
      const res   = await chatAPI.getConversations();
      const convs = res.data.data.conversations || [];
      setConversations(convs);
      return convs;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─────────────────── load messages ────────────────────────── */
  const loadMessages = useCallback(async (convId) => {
    try {
      const res  = await chatAPI.getMessages(convId);
      const msgs = res.data.data.messages || [];
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ─────────────────── open conversation ────────────────────── */
  const openConv = useCallback((conv) => {
    activeConvRef.current = conv._id;
    setActiveConv(conv);
    setMessages([]);
    setTyping(false);
    loadMessages(conv._id);
    // Join socket room — emit immediately and also on next connect if socket reconnects
    if (socketRef.current?.connected) {
      socketRef.current.emit("chat:join", conv._id);
    }
    navigate(`/chat/${conv._id}`, { replace: true });
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loadMessages, navigate]);

  /* ─────────────────── init ──────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      const convs = await loadConversations();
      if (urlConvId) {
        const found = convs.find(c => c._id === urlConvId);
        if (found) openConv(found);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────── handle image select ──────────────────── */
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Max 5MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  /* ─────────────────── SEND (via socket only) ────────────────── */
  const sendMessage = () => {
    const content = newMsg.trim();
    if (!content && !imageFile) return;
    if (!activeConv || !socketRef.current) return;

    setNewMsg("");

    // If there's an image, send it as a base64 image message
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        const tempId = `tmp_img_${Date.now()}`;
        const optimistic = {
          _id: tempId,
          sender: { _id: user?._id, name: user?.name },
          content: base64,
          type: "image",
          createdAt: new Date().toISOString(),
          pending: true,
        };
        setMessages(prev => [...prev, optimistic]);
        setTimeout(scrollToBottom, 60);

        socketRef.current.emit(
          "chat:message",
          { conversationId: activeConv._id, content: base64, type: "image" },
          (ack) => {
            if (ack?.message) {
              setMessages(prev => prev.map(m => m._id === tempId ? { ...ack.message, pending: false } : m));
            } else {
              setMessages(prev => prev.map(m => m._id === tempId ? { ...m, pending: false } : m));
            }
          }
        );
        setConversations(prev => prev.map(c =>
          c._id === activeConv._id
            ? { ...c, lastMessage: { content: "📷 Photo", timestamp: new Date() } }
            : c
        ));
      };
      reader.readAsDataURL(imageFile);
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (!content) return; // if only image, stop here
    }

    if (!content) return;

    /* 1. Show optimistic bubble immediately */
    const tempId = `tmp_${Date.now()}`;
    const optimistic = {
      _id:       tempId,
      sender:    { _id: user?._id, name: user?.name },
      content,
      createdAt: new Date().toISOString(),
      pending:   true,
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(scrollToBottom, 60);

    /* 2. Emit to backend — backend saves + broadcasts to OTHER participants only
          The ACK callback gives us back the saved message to replace the temp */
    socketRef.current.emit(
      "chat:message",
      { conversationId: activeConv._id, content, type: "text" },
      (ack) => {
        if (ack?.message) {
          /* Replace temp bubble with confirmed saved message */
          setMessages(prev =>
            prev.map(m => m._id === tempId ? { ...ack.message, pending: false } : m)
          );
        } else {
          /* No ACK (old server or error) — just mark as sent */
          setMessages(prev =>
            prev.map(m => m._id === tempId ? { ...m, pending: false } : m)
          );
        }
      }
    );

    /* 3. Update sidebar preview immediately */
    setConversations(prev => prev.map(c =>
      c._id === activeConv._id
        ? { ...c, lastMessage: { content, timestamp: new Date() } }
        : c
    ));
  };

  /* ─────────────────── typing indicator ─────────────────────── */
  const handleTyping = (e) => {
    setNewMsg(e.target.value);
    if (!activeConv || !socketRef.current) return;
    socketRef.current.emit("chat:typing", {
      conversationId: activeConv._id,
      isTyping: true,
    });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit("chat:typing", {
        conversationId: activeConv._id,
        isTyping: false,
      });
    }, 1500);
  };

  /* ─────────────────── load contacts ────────────────────────── */
  const loadContacts = useCallback(async () => {
    try {
      if (user?.role === "patient") {
        const res  = await appointmentAPI.getAll();
        const apts = res.data.data.appointments || [];
        const seen = new Set(), docs = [];
        apts.forEach(a => {
          const docId = a.doctor?.user?._id || a.doctor?._id;
          if (docId && !seen.has(docId)) {
            seen.add(docId);
            docs.push({ _id: docId, name: a.doctor?.user?.name || "Doctor",
              role: "doctor", specialty: a.doctor?.specialty });
          }
        });
        setContacts(docs);
      } else {
        const res  = await doctorAPI.getAppointments();
        const apts = res.data.data.appointments || [];
        const seen = new Set(), pats = [];
        apts.forEach(a => {
          if (a.patient?._id && !seen.has(a.patient._id)) {
            seen.add(a.patient._id);
            pats.push({ _id: a.patient._id, name: a.patient.name, role: "patient" });
          }
        });
        setContacts(pats);
      }
    } catch (e) { console.error(e); }
  }, [user?.role]);

  /* ─────────────────── start / open conversation ─────────────── */
  const startConversation = async (contact) => {
    setShowNewChat(false);
    try {
      const SOCKET_URL = (process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1").replace("/api/v1", "");
      const res = await fetch(`${SOCKET_URL}/api/v1/chat/conversations`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ participantId: contact._id }),
      });
      const data = await res.json();
      if (data.success) {
        const conv = data.data.conversation;
        setConversations(prev =>
          prev.find(c => c._id === conv._id) ? prev : [conv, ...prev]
        );
        openConv(conv);
      }
    } catch (e) { toast.error("Could not start conversation"); }
  };

  /* ─────────────────── derived ───────────────────────────────── */
  const filteredConvs = conversations.filter(c =>
    getOther(c)?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase())
  );

  /* ═══════════════════════════ UI ════════════════════════════ */
  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 lg:-m-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">

      {/* ════════════ SIDEBAR ════════════ */}
      <div className={`w-80 flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 ${activeConv ? "hidden lg:flex" : "flex"}`}>

        {/* header */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chats</h2>
            <button onClick={() => { setShowNewChat(true); loadContacts(); }}
              className="w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center transition-colors shadow"
              title="New chat">
              <FiPlus size={16} />
            </button>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" placeholder="Search or start new chat"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-slate-800 rounded-full outline-none text-gray-900 dark:text-white placeholder-gray-400" />
          </div>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">No chats yet</p>
              <p className="text-xs text-gray-400 mt-1">Tap + to start a new conversation</p>
            </div>
          ) : filteredConvs.map(conv => {
            const other    = getOther(conv);
            const isActive = activeConv?._id === conv._id;
            return (
              <button key={conv._id} onClick={() => openConv(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-gray-50 dark:border-slate-800/50 ${
                  isActive ? "bg-primary-50 dark:bg-primary-900/20" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}>
                {/* avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                    {initials(other?.name)}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white dark:border-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{other?.name}</p>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {fmtTime(conv.lastMessage?.timestamp || conv.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">
                    {conv.lastMessage?.content || "Tap to chat"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════ CHAT AREA ════════════ */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#ECE5DD] dark:bg-slate-950">

          {/* chat header — WhatsApp style */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54] dark:bg-slate-900 flex-shrink-0">
            <button onClick={() => { setActiveConv(null); activeConvRef.current = null; navigate("/chat"); }}
              className="lg:hidden p-1 text-white/80 hover:text-white">
              <FiArrowLeft size={20} />
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                {initials(getOther(activeConv)?.name)}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-[#075E54] dark:border-slate-900" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm leading-tight">{getOther(activeConv)?.name}</p>
              <p className="text-xs text-green-200">
                {typing ? "typing…" : "Online"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Link to={`/video-call/${activeConv._id}`}
                className="p-2 text-white/80 hover:text-white transition-colors" title="Video call">
                <FiVideo size={20} />
              </Link>
              <button className="p-2 text-white/80 hover:text-white transition-colors">
                <FiMoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* messages — WhatsApp wallpaper feel */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>

            {messages.length === 0 ? (
              <div className="flex justify-center mt-8">
                <div className="bg-[#FFF9C4] dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 text-xs px-4 py-2 rounded-full shadow">
                  🔒 Messages are end-to-end encrypted
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => {
                  const mine     = isMine(msg);
                  const prevMsg  = messages[i - 1];
                  const sameSide = prevMsg ? isMine(prevMsg) === mine : false;

                  return (
                    <motion.div key={msg._id}
                      initial={{ opacity: 0, scale: 0.95, y: 4 }}
                      animate={{ opacity: 1, scale: 1,    y: 0 }}
                      transition={{ duration: 0.12 }}
                      className={`flex ${mine ? "justify-end" : "justify-start"} ${sameSide ? "mt-0.5" : "mt-3"}`}>

                      {/* received bubble */}
                      {!mine && !sameSide && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 self-end mr-1.5 mb-1">
                          {initials(getOther(activeConv)?.name)}
                        </div>
                      )}
                      {!mine && sameSide && <div className="w-7 mr-1.5" />}

                      <div className={`max-w-[68%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                        <div className={`px-3 py-2 shadow-sm ${
                          mine
                            ? `bg-[#DCF8C6] dark:bg-[#005C4B] rounded-2xl rounded-tr-sm ${msg.pending ? "opacity-75" : ""}`
                            : "bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm"
                        }`}>
                          {msg.type === "image" ? (
                            <img
                              src={msg.content}
                              alt="sent"
                              className="max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(msg.content, "_blank")}
                            />
                          ) : (
                            <p className="text-sm leading-relaxed break-words text-gray-900 dark:text-white">
                              {msg.content}
                            </p>
                          )}
                          <div className={`flex items-center gap-1 mt-0.5 ${mine ? "justify-end" : "justify-end"}`}>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500">
                              {msg.pending ? "sending" : fmtTime(msg.createdAt)}
                            </span>
                            {mine && (
                              msg.pending
                                ? <FiCheck size={11} className="text-gray-400" />
                                : <FiCheckCircle size={11} className="text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* typing indicator */}
                <AnimatePresence>
                  {typing && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex justify-start mt-2">
                      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} className="w-2 h-2 bg-gray-400 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* input bar — WhatsApp style */}
          <div className="flex items-end gap-2 px-3 py-2 bg-[#F0F0F0] dark:bg-slate-900 flex-shrink-0">
            {/* Hidden file input for photos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Photo attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Send photo"
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm transition-colors"
            >
              <FiImage size={18} />
            </button>

            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 shadow-sm">
              {/* Image preview */}
              {imagePreview && (
                <div className="relative mb-2 self-start">
                  <img src={imagePreview} alt="preview" className="h-20 rounded-xl object-cover border border-gray-200 dark:border-slate-700" />
                  <button
                    onClick={() => { setImagePreview(null); setImageFile(null); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    <FiX size={10} />
                  </button>
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={newMsg}
                onChange={handleTyping}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Type a message"
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() && !imageFile}
              className="w-12 h-12 rounded-full bg-[#075E54] hover:bg-[#128C7E] disabled:bg-gray-300 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow flex-shrink-0"
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>

      ) : (
        /* empty pane on desktop */
        <div className="flex-1 hidden lg:flex flex-col items-center justify-center bg-[#F8F9FA] dark:bg-slate-950 gap-3">
          <div className="text-6xl">💬</div>
          <p className="font-semibold text-gray-600 dark:text-slate-400">Healthcare Messenger</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">
            Select a conversation or click <strong>+</strong> to start one
          </p>
        </div>
      )}

      {/* ════════════ NEW CHAT PANEL ════════════ */}
      <AnimatePresence>
        {showNewChat && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNewChat(false)}
              className="fixed inset-0 bg-black/50 z-50" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col">

              <div className="bg-[#075E54] px-4 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">New Chat</h3>
                    <p className="text-green-200 text-xs mt-0.5">Select a contact to message</p>
                  </div>
                  <button onClick={() => setShowNewChat(false)} className="p-1.5 text-white/70 hover:text-white">
                    <FiX size={20} />
                  </button>
                </div>
                <div className="relative mt-3">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input autoFocus type="text" placeholder="Search contacts…"
                    value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white/20 backdrop-blur rounded-full text-white placeholder-white/60 outline-none" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {contacts.length === 0 ? (
                  <div className="text-center py-14 px-4">
                    <FiUser size={36} className="text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">No contacts</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {user?.role === "patient"
                        ? "Book an appointment with a doctor first"
                        : "Patients appear here after booking"}
                    </p>
                  </div>
                ) : filteredContacts.map(c => (
                  <button key={c._id} onClick={() => startConversation(c)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-50 dark:border-slate-800 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {initials(c.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 capitalize mt-0.5">
                        {c.specialty || c.role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
