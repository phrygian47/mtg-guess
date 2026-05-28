"use client";

import { useState } from "react";
import type React from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import styles from "./ContactForm.module.css";

type FormData = {
  type: string;
  email: string;
  subject: string;
  message: string;
};

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    type: "question",
    email: "",
    subject: "",
    message: "",
  });

  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData.message.trim()) {
      setStatus("Please enter a message before submitting.");
      return;
    }

    if (!turnstileToken) {
      setStatus("Please complete the security check before submitting.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Sending...");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          turnstileToken,
        }),
      });

      const data = await response.json();

      console.log("API response:", data);

      if (!response.ok) {
        setStatus(data.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("Thanks! Your message has been sent.");

      setFormData({
        type: "question",
        email: "",
        subject: "",
        message: "",
      });

      setTurnstileToken("");
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="type">What is this about?</label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={handleChange}
        >
          <option value="question">Question</option>
          <option value="suggestion">Suggestion</option>
          <option value="bug">Bug Report</option>
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Optional, but needed if you want a reply"
          value={formData.email}
          onChange={handleChange}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          name="subject"
          type="text"
          placeholder="Optional"
          value={formData.subject}
          onChange={handleChange}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          placeholder="Write your question, suggestion, or bug report here..."
          value={formData.message}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.turnstile}>
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
          onSuccess={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken("")}
          onError={() => {
            setTurnstileToken("");
            setStatus("Security check failed. Please try again.");
          }}
        />
      </div>

      <button type="submit" className={styles.button} disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>

      {status && <p className={styles.status}>{status}</p>}
    </form>
  );
}
