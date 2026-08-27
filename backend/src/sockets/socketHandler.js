const { Server } = require("socket.io");
const { verifyAccessToken } = require("../utils/jwtUtils");
const Conversation = require("../models/Chat");
const Notification = require("../models/Notification");
const logger = require("../utils/logger");

let io;

// Track online users: userId -> socketId
const onlineUsers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin:      (process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000").split(","),
      methods:     ["GET", "POST"],
      credentials: true,
    },
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  // ── Auth middleware ─────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) return next(new Error("Authentication required"));
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId?.toString();
    if (!userId) return socket.disconnect();

    logger.info(`Socket connected: ${userId} (${socket.id})`);

    // Register user as online
    onlineUsers.set(userId, socket.id);
    io.emit("user:online", { userId, online: true });

    // ── Join personal room ────────────────────────────────────
    socket.join(`user:${userId}`);

    // ── Chat events ───────────────────────────────────────────
    socket.on("chat:join", (conversationId) => {
      socket.join(`conv:${conversationId}`);
      logger.debug(`User ${userId} joined conversation ${conversationId}`);
    });

    socket.on("chat:leave", (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on("chat:message", async (data, callback) => {
      try {
        const { conversationId, content, type = "text" } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isParticipant = conversation.participants.some((p) => p.toString() === userId);
        if (!isParticipant) return;

        const message = { sender: userId, content, type, createdAt: new Date() };
        conversation.messages.push(message);
        conversation.lastMessage = { content, sender: userId, timestamp: new Date() };
        await conversation.save();

        const savedMsg = conversation.messages[conversation.messages.length - 1];

        // Broadcast ONLY to other participants (not back to sender)
        socket.to(`conv:${conversationId}`).emit("chat:message", {
          conversationId,
          message: savedMsg,
        });

        // ACK back to sender only
        if (typeof callback === "function") {
          callback({ message: savedMsg });
        }

        // Notify offline participants
        conversation.participants.forEach((participantId) => {
          if (participantId.toString() !== userId) {
            const recipientSocketId = onlineUsers.get(participantId.toString());
            if (!recipientSocketId) {
              Notification.create({
                recipient: participantId,
                sender:    userId,
                type:      "message",
                title:     "New Message",
                message:   content.length > 60 ? content.slice(0, 60) + "..." : content,
                data:      { conversationId },
              }).catch((e) => logger.error("Notification create error:", e.message));
            }
          }
        });
      } catch (error) {
        logger.error("Socket chat:message error:", error.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("chat:typing", (data) => {
      socket.to(`conv:${data.conversationId}`).emit("chat:typing", {
        conversationId: data.conversationId,
        userId,
        isTyping: data.isTyping,
      });
    });

    // ── Video call events ─────────────────────────────────────
    socket.on("video:call-request", (data) => {
      const { targetUserId, appointmentId, callerName } = data;
      const targetIdStr = targetUserId?.toString();
      const isTargetOnline = onlineUsers.has(targetIdStr);

      logger.info(`Call request from sender ${userId} to target ${targetIdStr}. Target online: ${isTargetOnline}`);

      if (isTargetOnline) {
        logger.info(`Routing call to user room: user:${targetIdStr}`);
        // Use user room instead of single socket ID to support multiple tabs/devices
        io.to(`user:${targetIdStr}`).emit("video:incoming-call", {
          from:          userId,
          callerName,
          appointmentId,
        });
      } else {
        logger.warn(`Call target ${targetIdStr} is offline.`);
        socket.emit("video:target-offline", { targetUserId: targetIdStr });
      }
    });

    socket.on("video:call-accepted", (data) => {
      const callerIdStr = data.callerId?.toString();
      logger.info(`Call accepted by ${userId} for caller ${callerIdStr}`);
      io.to(`user:${callerIdStr}`).emit("video:call-accepted", { by: userId });
    });

    socket.on("video:call-rejected", (data) => {
      const callerIdStr = data.callerId?.toString();
      io.to(`user:${callerIdStr}`).emit("video:call-rejected", { by: userId });
    });

    socket.on("video:call-ended", (data) => {
      const targetIdStr = data.targetUserId?.toString();
      io.to(`user:${targetIdStr}`).emit("video:call-ended", { by: userId });
    });

    // WebRTC signaling (Target specific user rooms)
    socket.on("video:offer", (data) => {
      const targetIdStr = data.targetUserId?.toString();
      io.to(`user:${targetIdStr}`).emit("video:offer", { offer: data.offer, from: userId });
    });

    socket.on("video:answer", (data) => {
      const targetIdStr = data.targetUserId?.toString();
      io.to(`user:${targetIdStr}`).emit("video:answer", { answer: data.answer, from: userId });
    });

    socket.on("video:ice-candidate", (data) => {
      const targetIdStr = data.targetUserId?.toString();
      io.to(`user:${targetIdStr}`).emit("video:ice-candidate", { candidate: data.candidate, from: userId });
    });

    // ── Notifications ─────────────────────────────────────────
    socket.on("notification:read", async (notificationId) => {
      try {
        await Notification.findOneAndUpdate(
          { _id: notificationId, recipient: userId },
          { isRead: true, readAt: new Date() }
        );
      } catch (error) {
        logger.error("Socket notification:read error:", error.message);
      }
    });

    // ── Disconnect ────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      onlineUsers.delete(userId);
      io.emit("user:online", { userId, online: false });
      logger.info(`Socket disconnected: ${userId} — ${reason}`);
    });
  });

  logger.info("✅ Socket.io initialized");
  return io;
};

// Send notification to a specific user via socket
const sendNotification = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }
};

// Check if user is online
const isUserOnline = (userId) => onlineUsers.has(userId.toString());

module.exports = { initSocket, sendNotification, isUserOnline };
