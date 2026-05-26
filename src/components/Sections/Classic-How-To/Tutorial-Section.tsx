import styles from "./Tutorial-Section.module.css";

export default function TutorialSection() {
  return (
    <div className={styles.container}>
      <h2>How to play?</h2>
      <hr />
      <p>
        Guess today's card from Wizards of the Coast's collectible card game
        "Magic: The Gathering". A new card is selected every 24 hours
      </p>
      <div className={styles.timer}>Timer Section for Next Card</div>
      <p>
        In Classic mode, just type a guess into the search bar and submit to
        reveal clues about the target card and its properties.
      </p>
      <ul>
        <li>
          <span>Green</span> Indicates the guessed card property is an exact
          match to the target card
        </li>
        <li>
          <span>Yellow</span> Indicates the property is close. If Colors is
          yellow, at least one color matches. If Type Line is yellow, at least
          one subtype or main type is correct. If Tags is yellow, at least one
          tag is correct, and if Release year is Yellow, it is within 2 years of
          the target
        </li>
      </ul>
    </div>
  );
}
