import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = `${process.env.EMAIL_FROM_NAME || "NightWire"} <${process.env.EMAIL_FROM}>`;

export async function sendWelcomeEmail(toEmail, fullName) {
  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: "Welcome to NightWire",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#13131e;color:#f0ede8;border-radius:12px;">
          <h1 style="color:#e85d3a;margin-bottom:8px;">NightWire</h1>
          <p style="font-size:18px;margin-bottom:16px;">Hey <strong>${fullName}</strong>, welcome aboard!</p>
          <p style="color:#7a7a94;line-height:1.6;">
            Your account is ready. Start chatting in real time — your messages are delivered instantly.
          </p>
          <hr style="border:none;border-top:1px solid #232232;margin:24px 0;" />
          <p style="color:#7a7a94;font-size:12px;">You're receiving this because you signed up at NightWire.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Mailer] Failed to send welcome email:", err.message);
  }
}

export async function sendVerificationEmail(toEmail, fullName, code) {
  try {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: "Verify your NightWire email",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#13131e;color:#f0ede8;border-radius:12px;">
          <h1 style="color:#e85d3a;margin-bottom:8px;">Email Verification</h1>
          <p style="font-size:16px;margin-bottom:24px;">Hi <strong>${fullName}</strong>, enter this code to verify your email:</p>
          <div style="text-align:center;margin:24px 0;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#e85d3a;background:#1c1b2a;padding:16px 24px;border-radius:8px;">${code}</span>
          </div>
          <p style="color:#7a7a94;line-height:1.6;font-size:14px;">This code expires in 15 minutes.</p>
          <hr style="border:none;border-top:1px solid #232232;margin:24px 0;" />
          <p style="color:#7a7a94;font-size:12px;">If you didn't sign up, ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Mailer] Failed to send verification email:", err.message);
  }
}
