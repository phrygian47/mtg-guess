import Link from "next/link";
import styles from "@/components/Sections/Classic-Info/ClassicInfo.module.css";

export default function ArtInfo() {
  return (
    <div className={styles.container}>
      <h2>Information</h2>
      <hr />

      <p>
        Art mode uses card artwork and metadata from the same Scryfall-backed
        card database as Classic mode. The answer is the card name, not a
        specific printing.
      </p>

      <p>
        Some cards have many printings and alternate illustrations. This mode
        currently chooses from the site&apos;s card pool and uses the stored art
        crop for that card row.
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
