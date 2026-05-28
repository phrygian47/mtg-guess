import styles from "./Tutorial-Section.module.css";
import { formatCountdown, useNextPuzzleCountdown } from "@/lib/game/countdown";

export default function TutorialSection() {
  const countdown = useNextPuzzleCountdown();

  return (
    <div className={styles.container}>
      <h2>How to Play</h2>
      <hr />

      <p>
        Guess today&apos;s card from Wizards of the Coast&apos;s collectible
        card game <strong>Magic: The Gathering</strong>. A new card is selected
        every 24 hours.
      </p>

      <div className={styles.timer}>
        <span className={styles.timer_text}>Next card in: </span>
        <span className={styles.timer_clock}>{formatCountdown(countdown)}</span>
        <span>
          <em>New card every local midnight</em>
        </span>
      </div>

      <p>
        In Classic mode, type a guess into the search bar and submit it to
        reveal clues about the target card and its properties.
      </p>

      <ul className={styles.clueList}>
        <li className={styles.clueItem}>
          <span className={`${styles.badge} ${styles.green}`}>Green</span>
          Indicates the guessed card property is an exact match to the target
          card.
        </li>

        <li className={styles.clueItem}>
          <span className={`${styles.badge} ${styles.yellow}`}>Yellow</span>
          Indicates the property is close. For Colors, at least one color
          matches. For Type Line, at least one subtype or main type is correct.
          For Tags, at least one tag is correct. For Release Year, the guessed
          year is within 2 years of the target.
        </li>
        <li className={styles.clueItem}>
          <span className={`${styles.badge} ${styles.red}`}>Red</span>
          Indicates the guessed card property has no matches with the target
          card.
        </li>
      </ul>

      <h2>Properties</h2>

      <ul className={styles.propertyList}>
        <li className={styles.propertyCard}>
          <h3>Color</h3>
          <p>
            <span className={styles.label}>Possible Values:</span> White, Blue,
            Black, Red, Green, Colorless.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Mana Value</h3>
          <p>
            <span className={styles.label}>Possible Values:</span> A decimal
            value ranging from 0-20.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Type Line</h3>
          <h4>
            Represents supertype, main type, and subtype. A card may have
            multiple subtypes.
          </h4>
          <p>
            <span className={styles.label}>Possible Values:</span> Instant,
            Sorcery, Creature, Human, Goblin, Land, etc.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Set</h3>
          <h4>Set name and symbol.</h4>
          <p>
            <span className={styles.label}>Possible Values:</span> Any official
            MTG set, such as Strixhaven, Ravnica, Avatar: The Last Airbender,
            etc.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Rarity</h3>
          <h4>Card rarity in its most recent printing.</h4>
          <p>
            <span className={styles.label}>Possible Values:</span> Common,
            Uncommon, Rare, Mythic.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Tags</h3>
          <h4>
            Colloquial terms used to describe cards from the Scryfall Tagger
            Project.
          </h4>
          <p>
            <span className={styles.label}>Possible Values:</span> Activated
            Ability, Anthem, Attack Trigger, Block Trigger, Card Draw, Cost
            Reducer, Counterspell, Death Trigger, Evasion, Impulse Draw, Mana
            Dork, Mana Rock, Mill, Ramp, Recursion, Spot Removal, Board Wipe,
            Triggered Ability, Tutor.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Release Year</h3>
          <h4>Most recent printing year, not including promos.</h4>
          <p>
            <span className={styles.label}>Possible Values:</span> Any year from
            Magic&apos;s release to the current day.
          </p>
        </li>
      </ul>
    </div>
  );
}
