"use client";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";

export default function Chat({ username }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on("connect", () => console.log("Connected:", socket.id));

    socket.on("chat:message", (msg) => {
      if (Array.isArray(msg)) {
        // initial array of messages
        setMessages(msg);
      } else {
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("chat:delete", (id) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    });

    return () => {
      socket.off("chat:message");
      socket.off("chat:delete");
    };
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socketRef.current.emit("chat:message", { sender: username, text });
    setText("");
  };

  const deleteMessage = (id) => {
    socketRef.current.emit("chat:delete", id);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        ref={messagesRef}
        className="bg-white text-black h-96 overflow-auto p-4 rounded shadow"
      >
        {messages.map((m) => (
          <div key={m._id} className="mb-3 flex justify-between items-start gap-2">
            <div className="flex-1">
              <div className="font-bold text-sm text-black">{m.sender}</div>
              <div className="bg-gray-100 text-black p-2 rounded">{m.text}</div>
            </div>
            <button
              onClick={() => deleteMessage(m._id)}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-2 border rounded"
          placeholder="Type a message..."
        />
        <button className="px-4 py-2 bg-indigo-600 text-white rounded">Send</button>
      </form>
    </div>
  );
}
