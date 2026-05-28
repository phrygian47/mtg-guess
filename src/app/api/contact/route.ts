import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

type TurnstileResponse = {
  success: boolean;
  "error-codes"?: string[];
};

async function verifyTurnstileToken(token: string) {
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY as string,
        response: token,
      }),
    },
  );

  const data = (await response.json()) as TurnstileResponse;

  if (!data.success) {
    console.error("Turnstile failed:", data["error-codes"]);
  }

  return data.success;
}

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Missing RESEND_API_KEY." },
        { status: 500 },
      );
    }

    if (!process.env.TURNSTILE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing TURNSTILE_SECRET_KEY." },
        { status: 500 },
      );
    }

    if (!process.env.CONTACT_EMAIL) {
      return NextResponse.json(
        { error: "Missing CONTACT_EMAIL." },
        { status: 500 },
      );
    }

    const body = await request.json();

    const { type, email, subject, message, turnstileToken } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: "Message type and message are required." },
        { status: 400 },
      );
    }

    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Security check is required." },
        { status: 400 },
      );
    }

    const isHuman = await verifyTurnstileToken(turnstileToken);

    if (!isHuman) {
      return NextResponse.json(
        { error: "Security check failed. Please try again." },
        { status: 403 },
      );
    }

    const emailSubject = subject?.trim()
      ? `[Contact Form] ${subject}`
      : `[Contact Form] ${type}`;

    const emailBody = `
New contact form submission

Type:
${type}

Email:
${email || "Not provided"}

Subject:
${subject || "Not provided"}

Message:
${message}
    `.trim();

    const { data, error } = await resend.emails.send({
      from: "Contact Form <onboarding@resend.dev>",
      to: process.env.CONTACT_EMAIL,
      subject: emailSubject,
      text: emailBody,
      replyTo: email || undefined,
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        {
          error:
            "The message could not be sent. Check your Resend configuration.",
          details: error.message,
        },
        { status: 500 },
      );
    }

    console.log("Email sent:", data);

    return NextResponse.json({
      message: "Message sent successfully.",
      id: data?.id,
    });
  } catch (error) {
    console.error("Contact form error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 },
    );
  }
}
