"use client";

import { useState } from "react";

export default function TestEmailButton() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const sendTest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/test-email", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 4000);
      } else {
        alert("送信失敗: " + data.error);
      }
    } catch (e) {
      alert("エラーが発生しました");
    }
    setLoading(false);
  };

  return (
    <button
      onClick={sendTest}
      disabled={loading}
      style={{
        background: sent ? "var(--color-green)" : "transparent",
        color: sent ? "white" : "var(--foreground)",
        border: `1px solid ${sent ? "var(--color-green)" : "rgba(0,0,0,0.2)"}`,
        padding: "0.75rem 1.5rem",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.3s",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "送信中..." : sent ? "✅ 送信しました！" : "📧 テストメールを送信"}
    </button>
  );
}
