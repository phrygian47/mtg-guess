import Link from "next/link";
import styles from "./SaltInfo.module.css";

export default function SaltInfo() {
  return (
    <div className={styles.container}>
      <h2>Information</h2>
      <hr />

      <p>
        Salt Score mode uses commander salt values from the card import data.
        The score is based on the EDHRec Salt Score, this score is technically
        variable, but regular updates will keep this as up to date as possible.
        But to avoid confusion, current scores are a snapshot of their score at
        the time of puzzle creation.
      </p>

      <p>
        Questions, suggestions, and bug reports can be sent
        <span className={styles.gold}>
          <Link href="/contact"> here. </Link>
        </span>
      </p>
    </div>
  );
}
