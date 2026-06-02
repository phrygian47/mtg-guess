import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

type ContactRequestBody = {
  type?: string;
  name?: string;
  email?: string;
  message?: string;
  turnstileToken?: string;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(apiKey);
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

async function verifyTurnstileToken(token: string) {
  const secretKey = getRequiredEnv("TURNSTILE_SECRET_KEY");

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    },
  );

  if (!response.ok) {
    return false;
  }

  const data = await response.json();

  return Boolean(data.success);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ContactRequestBody;

    const type = body.type?.trim();
    const name = body.name?.trim();
    const email = body.email?.trim();
    const message = body.message?.trim();
    const turnstileToken = body.turnstileToken?.trim();

    if (!type || !name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Missing Turnstile verification token." },
        { status: 400 },
      );
    }

    const isTurnstileValid = await verifyTurnstileToken(turnstileToken);

    if (!isTurnstileValid) {
      return NextResponse.json(
        { error: "Turnstile verification failed." },
        { status: 400 },
      );
    }

    const resend = getResendClient();

    const toEmail = getRequiredEnv("CONTACT_TO_EMAIL");
    const fromEmail =
      process.env.CONTACT_FROM_EMAIL ?? "MTG Guess <onboarding@resend.dev>";

    const safeType = escapeHtml(type);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: `MTG Guess Contact Form: ${type}`,
      html: `
        <h2>New contact form submission</h2>

        <p><strong>Type:</strong> ${safeType}</p>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>

        <h3>Message</h3>
        <p>${safeMessage}</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);

    return NextResponse.json(
      { error: "Failed to send contact message." },
      { status: 500 },
    );
  }
}
