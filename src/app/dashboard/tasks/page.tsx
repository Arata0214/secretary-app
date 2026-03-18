"use client";

import { useState, useEffect } from "react";
import styles from "./tasks.module.css";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  dueDate: string | null;
  status: string;
  priority: number;
};

const CATEGORIES: Record<string, { icon: string; label: string }> = {
  deadline: { icon: "🔴", label: "締切型" },
  project: { icon: "🟡", label: "プロジェクト型" },
  self: { icon: "🟢", label: "自主型" },
  misc: { icon: "⚪", label: "雑務型" },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("dueDate");
  const [viewMode, setViewMode] = useState<"list" | "daily">("list");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({ status: "todo", category: "misc", priority: 0 });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    if (data.tasks) {
      setTasks(data.tasks);
    }
  };

  const saveTask = async () => {
    const isUpdate = !!editingTask.id;
    const url = "/api/tasks";
    const method = isUpdate ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingTask),
    });
    
    setIsModalOpen(false);
    fetchTasks();
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: newStatus }),
    });
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    setIsModalOpen(false);
    fetchTasks();
  };

  const openNewTask = () => {
    setEditingTask({ status: "todo", category: "misc", priority: 0, title: "", description: "", dueDate: "" });
    setIsModalOpen(true);
  };

  // フィルタとソートの適用
  let visibleTasks = [...tasks];
  if (filter !== "all") {
    if (filter === "today") {
      const today = new Date().toISOString().split("T")[0];
      visibleTasks = visibleTasks.filter(t => t.dueDate && t.dueDate.startsWith(today));
    } else {
      visibleTasks = visibleTasks.filter(t => t.category === filter);
    }
  }

  visibleTasks.sort((a, b) => {
    if (sort === "dueDate") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sort === "priority") return b.priority - a.priority;
    return 0; // createdAt 順などは初期ソートを利用
  });

  const incompleteTasks = visibleTasks.filter(t => t.status !== "done");
  const doneTasks = visibleTasks.filter(t => t.status === "done");

  const getDaysLeft = (dateString: string | null) => {
    if (!dateString) return null;
    const diff = new Date(dateString).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>タスク管理</h1>
        <div className={styles.controls}>
          <select className={styles.select} value={viewMode} onChange={e => setViewMode(e.target.value as "list" | "daily")} style={{ fontWeight: "bold" }}>
            <option value="list">📝 リストビュー</option>
            <option value="daily">📅 日次ビュー</option>
          </select>
          <select className={styles.select} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">すべての分類</option>
            <option value="today">今日やるタスク</option>
            <option value="deadline">🔴 締切型</option>
            <option value="project">🟡 プロジェクト型</option>
            <option value="self">🟢 自主型</option>
            <option value="misc">⚪ 雑務型</option>
          </select>
          <select className={styles.select} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="dueDate">締切が近い順</option>
            <option value="priority">優先度順</option>
          </select>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>━━ 未完了タスク ━━</h2>
        {incompleteTasks.length === 0 ? (
          <p style={{ opacity: 0.6, padding: "1rem" }}>未完了のタスクはありません</p>
        ) : viewMode === "list" ? (
          incompleteTasks.map(task => {
            const daysLeft = getDaysLeft(task.dueDate);
            const isUrgent = daysLeft !== null && daysLeft <= 3;
            return (
              <div key={task.id} className={styles.taskItem}>
                <div className={styles.taskLeft}>
                  <input type="checkbox" className={styles.checkbox} checked={false} onChange={() => toggleStatus(task)} />
                  <span className={styles.categoryIcon}>{CATEGORIES[task.category]?.icon || "⚪"}</span>
                  <span className={styles.taskTitle} onClick={() => { setEditingTask(task); setIsModalOpen(true); }}>
                    {task.title}
                  </span>
                </div>
                <div className={styles.taskRight}>
                  {task.dueDate && (
                    <span className={`${styles.deadline} ${isUrgent ? styles.urgent : styles.normal}`}>
                      {new Date(task.dueDate).toLocaleDateString()}
                      {daysLeft !== null && daysLeft >= 0 ? ` (残り${daysLeft}日)` : ''}
                      {daysLeft !== null && daysLeft < 0 ? ` (期限切れ)` : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          (() => {
            const grouped = incompleteTasks.reduce((acc, t) => {
              const dateStr = t.dueDate ? new Date(new Date(t.dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0] : "日付なし";
              if (!acc[dateStr]) acc[dateStr] = [];
              acc[dateStr].push(t);
              return acc;
            }, {} as Record<string, Task[]>);
            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              if (a === "日付なし") return 1;
              if (b === "日付なし") return -1;
              return a.localeCompare(b);
            });
            return sortedKeys.map(dateKey => (
              <div key={dateKey} style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "0.5rem", paddingBottom: "0.25rem", borderBottom: "1px solid rgba(0,0,0,0.1)", color: "var(--color-blue)" }}>
                  {dateKey === "日付なし" ? "日付指定なし" : new Date(dateKey).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                </h3>
                {grouped[dateKey].map(task => {
                  const daysLeft = getDaysLeft(task.dueDate);
                  const isUrgent = daysLeft !== null && daysLeft <= 3;
                  return (
                    <div key={task.id} className={styles.taskItem} style={{ borderLeft: "3px solid var(--color-blue)", marginLeft: "0.5rem", paddingLeft: "0.75rem" }}>
                      <div className={styles.taskLeft}>
                        <input type="checkbox" className={styles.checkbox} checked={false} onChange={() => toggleStatus(task)} />
                        <span className={styles.categoryIcon}>{CATEGORIES[task.category]?.icon || "⚪"}</span>
                        <span className={styles.taskTitle} onClick={() => { setEditingTask(task); setIsModalOpen(true); }}>
                          {task.title}
                        </span>
                      </div>
                      <div className={styles.taskRight}>
                        {task.dueDate && (
                          <span className={`${styles.deadline} ${isUrgent ? styles.urgent : styles.normal}`}>
                            {new Date(task.dueDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            {daysLeft !== null && daysLeft >= 0 ? ` (残り${daysLeft}日)` : ''}
                            {daysLeft !== null && daysLeft < 0 ? ` (期限切れ)` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()
        )}
        
        <button className={styles.addButton} onClick={openNewTask} style={{ marginTop: "1rem" }}>
          + 新しいタスクを追加
        </button>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>━━ 完了済み ━━</h2>
        {doneTasks.length === 0 ? (
          <p style={{ opacity: 0.6, padding: "1rem" }}>完了済みタスクはありません</p>
        ) : (
          doneTasks.map(task => (
            <div key={task.id} className={`${styles.taskItem} ${styles.completed}`}>
              <div className={styles.taskLeft}>
                <input type="checkbox" className={styles.checkbox} checked={true} onChange={() => toggleStatus(task)} />
                <span className={styles.categoryIcon}>{CATEGORIES[task.category]?.icon || "⚪"}</span>
                <span className={styles.taskTitle} onClick={() => { setEditingTask(task); setIsModalOpen(true); }}>
                  {task.title}
                </span>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                style={{ background: "none", border: "1px solid var(--color-red)", color: "var(--color-red)", borderRadius: "6px", padding: "0.25rem 0.75rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}
              >
                削除
              </button>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>{editingTask.id ? 'タスクを編集' : '新しいタスク'}</h2>
            
            <div className={styles.field}>
              <label className={styles.label}>タイトル</label>
              <input type="text" className={styles.input} value={editingTask.title || ""} onChange={e => setEditingTask({...editingTask, title: e.target.value})} placeholder="やるべきことは？" />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>分類</label>
              <select className={styles.input} value={editingTask.category} onChange={e => setEditingTask({...editingTask, category: e.target.value})}>
                <option value="deadline">🔴 締切型 (明確な締切あり)</option>
                <option value="project">🟡 プロジェクト型 (長期・複数ステップ)</option>
                <option value="self">🟢 自主型 (締切なし・自分で進める)</option>
                <option value="misc">⚪ 雑務型 (日常的な小タスク)</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>締切 / 日時</label>
              <input type="datetime-local" className={styles.input} 
                value={editingTask.dueDate ? new Date(new Date(editingTask.dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} 
                onChange={e => setEditingTask({...editingTask, dueDate: new Date(e.target.value).toISOString()})} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>優先度 (数字が大きいほど優先)</label>
              <input type="number" className={styles.input} value={editingTask.priority || 0} onChange={e => setEditingTask({...editingTask, priority: parseInt(e.target.value)})} />
            </div>

            <div className={styles.actionRow}>
              {editingTask.id && (
                <button className={styles.deleteBtn} onClick={() => deleteTask(editingTask.id as string)}>削除</button>
              )}
              <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>キャンセル</button>
              <button className={styles.saveBtn} onClick={saveTask}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
