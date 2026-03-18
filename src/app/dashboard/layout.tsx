import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./layout.module.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", background: "linear-gradient(45deg, var(--color-blue), var(--color-green))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Secretary
        </h2>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navItem}>📊 ダッシュボード</Link>
          <Link href="/dashboard/calendar" className={styles.navItem}>📅 カレンダー</Link>
          <Link href="/dashboard/tasks" className={styles.navItem}>✅ タスク管理</Link>
          <Link href="/dashboard/schedule" className={styles.navItem}>📷 予定登録（AI）</Link>
        </nav>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <p style={{ fontWeight: 600 }}>{session.user.name}</p>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button type="submit" style={{ cursor: "pointer", background: "none", border: "1px solid var(--color-accent)", color: "var(--color-accent)", padding: "0.5rem", borderRadius: "8px", width: "100%", fontWeight: "bold" }}>
              ログアウト
            </button>
          </form>
        </div>
      </aside>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
