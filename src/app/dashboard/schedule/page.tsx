"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./schedule.module.css";

type Message = {
  role: "user" | "ai";
  content: string;
  imageUrl?: string;
  actions?: ActionItem[];
};

type ActionItem = {
  type: "task" | "event";
  title: string;
  category?: string;
  dueDate?: string;
  startTime?: string;
  location?: string;
  added?: boolean;
};

export default function ScheduleAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "こんにちは！Secretary AIアシスタントです 😊\n\nスクリーンショットを送っていただければ予定を読み取って登録できますし、「明日の準備でやるべきことを教えて」のように相談していただくこともできます。\n\n何でも聞いてくださいね！",
      actions: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const parseActions = (text: string): { cleanText: string; actions: ActionItem[] } => {
    const actions: ActionItem[] = [];
    let cleanText = text;

    // Parse [ADD_TASK:...] blocks
    const taskRegex = /\[ADD_TASK:(\{[^}]+\})\]/g;
    let match;
    while ((match = taskRegex.exec(text)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        actions.push({ type: "task", title: data.title, category: data.category, dueDate: data.dueDate });
        cleanText = cleanText.replace(match[0], "");
      } catch (e) {}
    }

    // Parse [ADD_EVENT:...] blocks
    const eventRegex = /\[ADD_EVENT:(\{[^}]+\})\]/g;
    while ((match = eventRegex.exec(text)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        actions.push({ type: "event", title: data.title, startTime: data.startTime, location: data.location });
        cleanText = cleanText.replace(match[0], "");
      } catch (e) {}
    }

    return { cleanText: cleanText.trim(), actions };
  };

  const addAction = async (action: ActionItem, msgIndex: number, actionIndex: number) => {
    if (action.type === "task") {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: action.title,
          category: action.category || "misc",
          dueDate: action.dueDate || null,
        }),
      });
    } else if (action.type === "event") {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: action.title,
          startTime: action.startTime,
          location: action.location || "",
        }),
      });
    }

    // Mark as added
    setMessages((prev) => {
      const updated = [...prev];
      if (updated[msgIndex].actions) {
        updated[msgIndex].actions![actionIndex] = { ...updated[msgIndex].actions![actionIndex], added: true };
      }
      return updated;
    });
  };

  const sendMessage = async () => {
    if (!input.trim() && !image) return;

    const userMessage: Message = {
      role: "user",
      content: input || (image ? "画像を送信しました" : ""),
      imageUrl: imagePreviewUrl || undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const formData = new FormData();
    formData.append("message", input);
    if (image) formData.append("image", image);

    // Send history (excluding system first message)
    const history = newMessages.slice(1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      content: m.content,
    }));
    formData.append("history", JSON.stringify(history));

    removeImage();

    try {
      const res = await fetch("/api/chat", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok && data.reply) {
        const { cleanText, actions } = parseActions(data.reply);
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: cleanText, actions },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `エラーが発生しました: ${data.error || "不明なエラー"}` },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "通信エラーが発生しました。もう一度お試しください。" },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.avatar}>🤖</div>
        <div className={styles.headerInfo}>
          <h1>AI アシスタント</h1>
          <p>予定・タスクの登録、相談、画像分析</p>
        </div>
      </div>

      <div className={styles.messagesArea}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div
              className={`${styles.messageBubble} ${
                msg.role === "user" ? styles.userBubble : styles.aiBubble
              }`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="uploaded"
                  style={{ maxWidth: "100%", borderRadius: "12px", marginBottom: "0.5rem" }}
                />
              )}
              {msg.content}
            </div>

            {msg.actions && msg.actions.length > 0 && (
              <div style={{ maxWidth: "80%", marginTop: "0.25rem" }}>
                {msg.actions.map((action, j) => (
                  <div key={j} className={styles.actionCard}>
                    <div className={styles.actionInfo}>
                      <div className={styles.actionTitle}>
                        {action.type === "task" ? "✅" : "📅"} {action.title}
                      </div>
                      <div className={styles.actionMeta}>
                        {action.type === "task" && action.dueDate && `締切: ${new Date(action.dueDate).toLocaleDateString()}`}
                        {action.type === "event" && action.startTime && `${new Date(action.startTime).toLocaleString()}`}
                        {action.location && ` | ${action.location}`}
                      </div>
                    </div>
                    <button
                      className={`${styles.addBtn} ${action.added ? styles.addedBtn : ""}`}
                      onClick={() => addAction(action, i, j)}
                      disabled={action.added}
                    >
                      {action.added ? "追加済み ✓" : "追加"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className={styles.typingIndicator}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {imagePreviewUrl && (
        <div className={styles.imagePreview}>
          <span>📎 画像を添付中</span>
          <button className={styles.removeImg} onClick={removeImage}>✕</button>
        </div>
      )}

      <div className={styles.inputArea}>
        <input type="file" ref={fileRef} onChange={handleFileChange} accept="image/*" style={{ display: "none" }} />
        <button className={`${styles.iconBtn} ${styles.uploadBtn}`} onClick={() => fileRef.current?.click()} title="画像を添付">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          className={styles.textInput}
          placeholder="メッセージを入力、またはスクショを添付..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className={`${styles.iconBtn} ${styles.sendBtn}`}
          onClick={sendMessage}
          disabled={loading || (!input.trim() && !image)}
          title="送信"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
