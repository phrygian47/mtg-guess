import SaltInfoBar from "@/components/Info/Salt-Info/Salt-Info";
import styles from "./page.module.css";

export default function Page() {
  return (
    <div className="page">
      <main className="main">
        <div className={styles.infoBar}>
          <SaltInfoBar />
        </div>
      </main>
    </div>
  );
}
