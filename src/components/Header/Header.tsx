import styles from "./Header.module.css";
import Image from "next/image";
import Link from "next/link";
import GameNav from "../UI/GameNav/GameNav";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/" aria-label="Go to home page">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={400}
            height={200}
            loading="eager"
            fetchPriority="high"
          />
        </Link>
      </div>
      <GameNav />
    </header>
  );
}
