// server/server.js
require("dotenv").config(); // Load .env first

console.log("OpenAI key loaded:", process.env.OPENAI_API_KEY ? "YES" : "NO");

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const OpenAI = require("openai");

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/chat", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*", methods: ["GET", "POST"] },
});

// Socket events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle user messages
  socket.on("message", async ({ sender, text }) => {
    try {
      // Save user message
      const userMsg = await Message.create({ sender, text });
      io.emit("message", userMsg); // broadcast to all clients

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // lightweight and fast
        messages: [{ role: "user", content: text }],
      });

      const botReply = completion.choices[0].message.content;

      // Save bot reply
      const botMsg = await Message.create({
        sender: "AI Bot",
        text: botReply,
      });

      // Send bot reply to all clients
      io.emit("message", botMsg);
    } catch (err) {
      console.error("OpenAI error:", err.message);
      socket.emit("message", {
        sender: "AI Bot",
        text: "⚠️ Sorry, I couldn’t process your request.",
      });
    }
  });

  // 🗑️ Handle delete message
  socket.on("deleteMessage", async (id) => {
    try {
      await Message.findByIdAndDelete(id);
      io.emit("deleteMessage", id); // notify all clients
    } catch (err) {
      console.error("Delete error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Health check route
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
