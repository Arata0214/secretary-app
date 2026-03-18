import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import styles from "./page.module.css";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Secretary</h1>
      <p className={styles.subtitle}>
        学生生活で大切な約束を見逃さないために。<br />
        スクリーンショットからAIが予定を抽出し、Googleカレンダーと連携してタスクを完全にサポートします。
      </p>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button type="submit" className={styles.button}>
          <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
          </svg>
          Googleでログインして始める
        </button>
      </form>
    </main>
  );
}
