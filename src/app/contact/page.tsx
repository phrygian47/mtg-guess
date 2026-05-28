import ContactForm from "@/components/Sections/Contact/ContactForm";
import styles from "./page.module.css";

export default function Page() {
  return (
    <div className="page">
      <main className={`main ${styles.contactPage}`}>
        <section className={styles.window}>
          <div className={styles.header}>
            <h1>Contact</h1>

            <p>
              Have a question, suggestion, or bug report? Send a message below.
              Your email is optional, but I will need it if you would like a
              reply.
            </p>
          </div>

          <ContactForm />
        </section>
      </main>
    </div>
  );
}
