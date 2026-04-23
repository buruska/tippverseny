type SendVerificationCodeEmailInput = {
  code: string;
  email: string;
  leagueName: string;
};

const emailFrom = process.env.EMAIL_FROM ?? "VB Tippverseny 2026 <no-reply@example.com>";

export async function sendVerificationCodeEmail({
  code,
  email,
  leagueName,
}: SendVerificationCodeEmailInput) {
  const subject = `Megerősítő kód: ${leagueName}`;
  const text = [
    `Szia!`,
    ``,
    `A(z) ${leagueName} ligához tartozó regisztrációd véglegesítéséhez használd ezt a kódot: ${code}`,
    ``,
    `A kód 1 percig érvényes. Ha nem te kérted, ezt az emailt figyelmen kívül hagyhatod.`,
  ].join("\n");

  if (!process.env.RESEND_API_KEY) {
    console.info(`[DEV EMAIL] ${email} | ${subject} | Kód: ${code}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: email,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error("Nem sikerült elküldeni a megerősítő emailt.");
  }
}
