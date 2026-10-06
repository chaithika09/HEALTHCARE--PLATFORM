const Conversation = require("../models/Chat");

// ── Get All Conversations ─────────────────────────────────────
exports.getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      isActive: true,
    })
      .populate("participants", "name email avatar role")
      .sort({ "lastMessage.timestamp": -1 });

    res.json({ success: true, data: { conversations } });
  } catch (error) {
    next(error);
  }
};

// ── Get Messages ──────────────────────────────────────────────
exports.getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(id)
      .populate("participants", "name email avatar")
      .populate("messages.sender", "name _id");

    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });

    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );
    if (!isParticipant) return res.status(403).json({ success: false, message: "Access denied" });

    const total    = conversation.messages.length;
    const start    = Math.max(0, total - page * limit);
    const messages = conversation.messages.slice(start, start + parseInt(limit));

    // Mark messages as read
    conversation.messages.forEach((msg) => {
      const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
      if (senderId !== req.user._id.toString() && !msg.isRead) {
        msg.isRead = true;
        msg.readAt = new Date();
      }
    });
    await conversation.save();

    res.json({ success: true, data: { conversation, messages, pagination: { total, page: parseInt(page), limit: parseInt(limit) } } });
  } catch (error) {
    next(error);
  }
};

// ── Send Message ──────────────────────────────────────────────
exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, type = "text" } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) return res.status(403).json({ success: false, message: "Access denied" });

    const message = { sender: req.user._id, content, type };
    conversation.messages.push(message);
    conversation.lastMessage = { content, sender: req.user._id, timestamp: new Date() };
    await conversation.save();

    const newMsg = conversation.messages[conversation.messages.length - 1];
    res.status(201).json({ success: true, data: { message: newMsg } });
  } catch (error) {
    next(error);
  }
};

// ── Create or Get Conversation ────────────────────────────────
exports.createOrGet = async (req, res, next) => {
  try {
    const { participantId } = req.body;

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId], $size: 2 },
    }).populate("participants", "name email avatar role");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId],
      });
      await conversation.populate("participants", "name email avatar role");
    }

    res.json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
};
