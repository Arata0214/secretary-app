"use client";

import { useState } from "react";
import styles from "@/app/dashboard/dashboard.module.css";

export default function AiSuggestModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      const res = await fetch("/api/ai-suggest", { method: "POST" });
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        alert("エラー: " + (data.error || "不明なエラー"));
        setIsOpen(false);
      }
    } catch (e) {
      alert("AI提案の取得に失敗しました。");
      setIsOpen(false);
    }
    setLoading(false);
  };

  const addTasks = async (items: any[]) => {
    for (const item of items) {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: item.title, dueDate: item.dueDate ? item.dueDate + 'T21:00:00' : null, category: "misc" })
      });
    }
    alert("追加しました！");
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={fetchSuggestions} className={styles.aiButton}>
        <span>🤖 AIに提案してもらう</span>
      </button>

      {isOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--background)", padding: "2rem", borderRadius: "12px", width: "90%", maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1.5rem" }}>AI分析結果</h2>
            
            {loading ? (
              <p>AIが過去の行動とこれからの予定を分析し、今日やるべきタスクを考えています...</p>
            ) : suggestions.length === 0 ? (
              <p>提案がありませんでした。</p>
            ) : (
              <div>
                {suggestions.map((sug, i) => (
                  <div key={i} style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>━━ {sug.category} ━━</h3>
                    {sug.items.map((item: any, j: number) => (
                      <div key={j} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
                        <input type="checkbox" defaultChecked />
                        <div>
                          <strong>{item.title}</strong>
                          {item.dueDate && <span style={{ fontSize: "0.875rem", color: "var(--color-red)", marginLeft: "0.5rem" }}>({item.dueDate})</span>}
                          <p style={{ fontSize: "0.875rem", opacity: 0.7, margin: 0 }}>理由: {item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                  <button onClick={() => addTasks(suggestions.flatMap(s => s.items))} style={{ background: "var(--color-green)", color: "white", padding: "0.75rem", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer", flex: 1 }}>すべて追加</button>
                  <button onClick={() => setIsOpen(false)} style={{ background: "transparent", color: "var(--foreground)", padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.2)", fontWeight: "bold", cursor: "pointer" }}>閉じる</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
