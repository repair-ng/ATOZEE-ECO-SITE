import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL || "AToZEE <no-reply@atozee.com>";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Falls back during build or missing env vars so top-level evaluation won't throw
    return new Resend("re_dummy_key_for_build");
  }
  return new Resend(apiKey);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your AToZEE password",
    html: `
      <p>We received a request to reset your AToZEE password.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

export async function sendQuoteConfirmationEmail(to: string, quoteId: string) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "We received your AToZEE quote request",
    html: `
      <p>Thanks for your request — our team will review it and send a quote shortly.</p>
      <p>Reference: ${quoteId}</p>
    `,
  });
}