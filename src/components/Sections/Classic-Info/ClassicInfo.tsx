import styles from "./ClassicInfo.module.css";

import Link from "next/link";

export default function ClassicInfo() {
  return (
    <div className={styles.container}>
      <h2>Information</h2>
      <hr />

      <p>
        If you have any questions, conerns, suggestions, or would like to report
        a bug, please send me a message
        <span className={styles.gold}>
          <Link href="/contact"> here. </Link>
        </span>
      </p>

      <h3>Scryfall Tagger Project</h3>
      <p>
        The Scryfall Tagger Project is used heavily in this game to provide
        useful hints and properties for card guesses. It is important to note
        that this project is <em>entirely</em> community driven. As such there
        may be some information that is not accurate and some cards that are
        missing tags. We also do not use <em>every</em> tag that is tracked, if
        you would like to see what tags we currently use, see the "How To"
        section.
      </p>
      <p>
        If you would like to participate in the Scryfall Tagger program, visit
        their site
        <span className={styles.gold}>
          <a href="https://tagger.scryfall.com/" target="/">
            {" "}
            here.{" "}
          </a>
        </span>
        The tag import script will be scheduled to run nightly, so any approved
        changes to the scryfall tagger program will be updated accordingly on
        this page.
      </p>
    </div>
  );
}
