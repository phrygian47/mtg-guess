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
          Indicates the guessed card property is close to the target card. Each
          property explains what counts as close below.
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
            If this property is{" "}
            <span className={`${styles.mini_badge} ${styles.mini_yellow}`}>
              Yellow
            </span>{" "}
            then at least one color matches with the target.
          </p>
          <br />
          <p>
            <span className={styles.label}>Possible Values:</span> White, Blue,
            Black, Red, Green, Colorless.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Mana Value</h3>
          <h4>Represents the total mana value of the card.</h4>
          <p>
            If this property is{" "}
            <span className={`${styles.mini_badge} ${styles.mini_yellow}`}>
              Yellow
            </span>{" "}
            then the guessed card is within +/- 1 mana value of the target.
          </p>
          <br />
          <p>
            <span className={styles.label}>Possible Values:</span> A numeric
            value, usually ranging from 0 upward.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Type Line</h3>
          <h4>
            Represents supertypes, card types, and subtypes. A card may have
            multiple types and subtypes.
          </h4>
          <p>
            If this property is{" "}
            <span className={`${styles.mini_badge} ${styles.mini_yellow}`}>
              Yellow
            </span>{" "}
            then the guessed card shares at least one supertype, type, or
            subtype with the target.
          </p>
          <br />
          <p>
            <span className={styles.label}>Possible Values:</span> Legendary,
            Creature, Instant, Sorcery, Artifact, Human, Goblin, Land, etc.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Set</h3>
          <h4>Shows the set name, set symbol, and release year.</h4>
          <p>
            If this property is{" "}
            <span className={`${styles.mini_badge} ${styles.mini_yellow}`}>
              Yellow
            </span>{" "}
            then the guessed card is from a different set released in the same
            year as the target.
          </p>
          <p>
            If this property is{" "}
            <span className={`${styles.mini_badge} ${styles.mini_red}`}>
              Red
            </span>{" "}
            then a chevron hint shows whether the target card&apos;s release
            year is higher or lower than the guessed card&apos;s release year.
          </p>
          <br />
          <p>
            <span className={styles.label}>Possible Values:</span> Any set
            included in the game&apos;s card pool, plus its release year.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Rarity</h3>
          <h4>Card rarity in its most recent printing.</h4>
          <p>
            If this property is{" "}
            <span className={`${styles.mini_badge} ${styles.mini_yellow}`}>
              Yellow
            </span>{" "}
            then something is wrong because this should not be possible.
          </p>
          <br />
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
            If this property is{" "}
            <span className={`${styles.mini_badge} ${styles.mini_yellow}`}>
              Yellow
            </span>{" "}
            then the card shares at least one tag with the target.
          </p>
          <br />
          <p>
            <span className={styles.label}>Possible Values:</span> Activated
            Ability, Anthem, Attack Trigger, Block Trigger, Card Draw, Cost
            Reducer, Counterspell, Death Trigger, Evasion, Impulse Draw, Mana
            Dork, Mana Rock, Mill, Ramp, Recursion, Spot Removal, Sac Outlet,
            Board Wipe, Triggered Ability, Tutor.
          </p>
        </li>
      </ul>
    </div>
  );
}
