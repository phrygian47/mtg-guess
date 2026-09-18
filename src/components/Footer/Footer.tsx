import Link from "next/link";
import styles from "./Footer.module.css";
import Image from "next/image";

const currentYear = new Date().getFullYear();

const playLinks = [
  { href: "/classic", label: "Classic" },
  { href: "/art", label: "Card Art" },
];

const siteLinks = [
  { href: "/", label: "Home" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <section className={styles.brand} aria-label="About MTGdle">
          <Link href="/" className={styles.logo}>
            <Image
              src="/logo.webp"
              alt="MTGdle Logo"
              width={150}
              height={75}
              loading="eager"
            />
          </Link>
          <p>
            A daily Magic: The Gathering guessing game with classic clues and
            pixelated card art puzzles.
          </p>
        </section>

        <nav className={styles.nav} aria-label="Footer navigation">
          <div className={styles.group}>
            <h2>Play</h2>
            <ul>
              {playLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.group}>
            <h2>Site</h2>
            <ul>
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className={styles.bottom}>
        <p>&copy; {currentYear} Robert Elliott. All rights reserved.</p>
        <p className={styles.disclaimer}>
          MTGdle is unofficial Fan Content permitted under the Wizards of the
          Coast Fan Content Policy. Magic: The Gathering is a trademark of
          Wizards of the Coast LLC.
        </p>
      </div>
    </footer>
  );
}
