import styles from "./dashboard.module.css";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import AiSuggestModal from "@/components/AiSuggestModal";
import TestEmailButton from "@/components/TestEmailButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const events = await prisma.eventCache.findMany({
    where: { userId: session.user.id, startTime: { gte: todayStart, lt: todayEnd } },
    orderBy: { startTime: 'asc' }
  });

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id, status: { not: "done" } },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }]
  });

  // 締切が近い順にソート（期限超過済みは超過期間が長いほど上位）
  const now = new Date();
  const urgentTasks = tasks
    .filter((t: any) => t.dueDate)
    .sort((a: any, b: any) => {
      const aDue = new Date(a.dueDate!).getTime();
      const bDue = new Date(b.dueDate!).getTime();
      const aOverdue = aDue < now.getTime();
      const bOverdue = bDue < now.getTime();
      // 両方超過: 超過期間が長いほど上
      if (aOverdue && bOverdue) return aDue - bDue;
      // 超過のみ上
      if (aOverdue) return -1;
      if (bOverdue) return 1;
      // 両方未来: 締切が近いほど上
      return aDue - bDue;
    })
    .slice(0, 5);
  
  // Progress
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const allWeekTasks = await prisma.task.findMany({
    where: { userId: session.user.id, updatedAt: { gte: weekStart } }
  });
  const completedWeekTasks = allWeekTasks.filter((t: any) => t.status === 'done').length;
  const progressPercent = allWeekTasks.length > 0 ? Math.round((completedWeekTasks / allWeekTasks.length) * 100) : 0;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>{todayStart.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} 今日やること</h1>
      </div>
      
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>⏰ 今日の予定</h2>
          {events.length === 0 ? <p style={{opacity:0.6}}>今日の予定はありません。</p> : events.map((event: any) => (
            <div key={event.id} className={styles.warningItem} style={{ marginBottom: "1rem" }}>
              <p style={{ fontWeight: "bold" }}>{event.startTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} {event.title} {event.location ? `(${event.location})` : ''}</p>
              <Link href="/dashboard/schedule" style={{ display: "inline-block", marginTop: "0.5rem", padding: "0.25rem 0.5rem", background: "var(--color-yellow)", borderRadius: "4px", fontSize: "0.875rem", fontWeight: "bold", color: "#111", textDecoration: "none" }}>時刻を確認する</Link>
            </div>
          ))}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>🚨 締切が近いタスク</h2>
          {urgentTasks.length === 0 ? <p style={{opacity:0.6}}>締切のあるタスクはありません。</p> : urgentTasks.map((task: any) => {
            const daysLeft = Math.ceil((new Date(task.dueDate!).getTime() - now.getTime()) / (1000 * 3600 * 24));
            const isOverdue = daysLeft < 0;
            return (
             <div key={task.id} className={styles.listItem}>
               <div>
                 <span className={isOverdue || task.category === "deadline" ? styles.deadlineItem : ""}>
                   {isOverdue ? "【期限超過】" : task.category === "deadline" ? "【締切】" : ""} {task.title}
                 </span>
               </div>
               <span style={{ fontSize: "0.875rem", color: isOverdue ? "var(--color-red)" : "var(--color-blue)", fontWeight: "bold" }}>
                 {isOverdue ? `${Math.abs(daysLeft)}日超過` : `残り${daysLeft}日`}
               </span>
             </div>
            );
          })}
        </div>

        <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
          <h2 className={styles.cardTitle}>📊 今週の進捗</h2>
          <div style={{ background: "rgba(0,0,0,0.1)", borderRadius: "8px", height: "24px", width: "100%", overflow: "hidden", position: "relative" }}>
            <div style={{ background: "var(--color-green)", width: `${progressPercent}%`, height: "100%", transition: "width 0.5s" }}></div>
            <span style={{ position: "absolute", width: "100%", textAlign: "center", top: "2px", fontSize: "0.875rem", fontWeight: "bold", color: progressPercent > 50 ? "white" : "var(--foreground)"}}>
              {progressPercent}% ({completedWeekTasks}/{allWeekTasks.length}タスク完了)
            </span>
          </div>
        </div>

        <div className={styles.card} style={{ gridColumn: "1 / -1", background: "rgba(69, 123, 157, 0.05)" }}>
          <h2 className={styles.cardTitle}>━━ クイックアクション ━━</h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/dashboard/schedule" className={styles.primaryBtn} style={{ textDecoration: "none", textAlign: "center", border: "1px solid var(--color-green)" }}>🤖 AIに相談</Link>
            <Link href="/dashboard/tasks" className={styles.secondaryBtn} style={{ textDecoration: "none", textAlign: "center", background:"var(--background)" }}>➕ タスク追加</Link>
            <AiSuggestModal />
            <TestEmailButton />
          </div>
        </div>
      </div>
    </div>
  );
}
