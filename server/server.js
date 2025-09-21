require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const OpenAI = require("openai");

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chat")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Message schema
const messageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // Send all previous messages when user joins
  Message.find().sort({ createdAt: 1 }).then((msgs) => {
    socket.emit("chat:message", msgs); // emit array on first connection
  });

  // Receive user message
  socket.on("chat:message", async ({ sender, text }) => {
    try {
      const userMsg = await Message.create({ sender, text });
      io.emit("chat:message", userMsg);

      // AI reply
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: text }],
      });

      const botText =
        completion.choices?.[0]?.message?.content || "⚠️ No response from AI.";

      const botMsg = await Message.create({ sender: "AI Bot", text: botText });
      io.emit("chat:message", botMsg);
    } catch (err) {
      console.error("❌ Error:", err.message);
      socket.emit("chat:message", {
        sender: "AI Bot",
        text: "⚠️ Sorry, I couldn’t process your request.",
      });
    }
  });

  // Delete message
  socket.on("chat:delete", async (id) => {
    try {
      await Message.findByIdAndDelete(id);
      io.emit("chat:delete", id);
    } catch (err) {
      console.error("❌ Delete error:", err.message);
    }
  });

  socket.on("disconnect", () => console.log("👋 User disconnected:", socket.id));
});

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
