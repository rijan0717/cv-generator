import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  userName?: string
) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || '"CV Generator" <noreply@cvgenerator.com>';

  // If SMTP is not fully configured, log the reset URL to console for easy local testing
  if (!host || !user || !pass) {
    console.log("==================================================");
    console.log("[DEV MODE EMAIL NOTIFICATION]");
    console.log(`To: ${to}`);
    console.log(`Subject: Reset your CV Generator password`);
    console.log(`Password Reset Link: ${resetUrl}`);
    console.log("==================================================");
    return {
      success: true,
      mode: "dev_logged",
      message: "Reset link generated and logged to console.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-top: 0;">Password Reset Request</h2>
        <p>Hello ${userName || "there"},</p>
        <p>We received a request to reset your password for your <strong>CV Generator</strong> account.</p>
        <p>Click the button below to reset your password. This link is valid for <strong>1 hour</strong>.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">CV Generator &copy; ${new Date().getFullYear()}</p>
      </div>
    `;

    await transporter.sendMail({
      from,
      to,
      subject: "Reset your CV Generator Password",
      html,
    });

    return { success: true, mode: "smtp_sent" };
  } catch (error: unknown) {
    console.error("Error sending email via SMTP:", error);
    // Even if SMTP fails, return error message
    throw new Error(error instanceof Error ? error.message : "Failed to send reset email");
  }
}
