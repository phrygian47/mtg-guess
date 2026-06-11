import styles from "./page.module.css";

export default function PrivacyPage() {
  return (
    <div className="page">
      <main className={`main ${styles.privacyPage}`}>
        <article className={styles.window}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>MTGdle.net</p>
            <h1>Privacy Policy</h1>
            <p>
              MTGdle.net is completely free and does not require an account.
              MTGdle.net does not intentionally collect personal information
              from its visitors.
            </p>
          </header>

          <div className={styles.content}>
            <section>
              <h2>Analytics and Information</h2>
              <p>
                MTGdle.net does not ask visitors to create an account, provide
                a name, or submit personal information in order to play.
              </p>
              <p>
                Like many websites, MTGdle.net uses web analytics to receive
                limited technical information when you visit. Such as your
                browser type, device information, pages visited, referring page,
                approximate location, and IP address.
              </p>
              <p>
                MTGdle.net does not sell personal information. Limited
                technical or usage information may be processed by service
                providers that help operate, host, analyze, or secure the site.
              </p>
            </section>

            <section>
              <h2>Cookies</h2>
              <p>
                MTGdle.net may use local browser storage to remember game
                progress, preferences, or completed daily puzzles. This data
                stays on your device.
              </p>
            </section>

            <section>
              <h2>Contact</h2>
              <p>
                If you contact MTGdle.net, any information you provide will only
                be used to respond to your message.
              </p>
            </section>

            <section>
              <h2>Unofficial Fan Content</h2>
              <p>
                MTGdle.net is unofficial Fan Content permitted under the Wizards
                of the Coast Fan Content Policy. Magic: The Gathering and
                related properties are trademarks of Wizards of the Coast LLC.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
