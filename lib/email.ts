type SendVerificationCodeEmailInput = {
  code: string;
  email: string;
  leagueName: string;
};

type SendPasswordResetEmailInput = {
  email: string;
  resetUrl: string;
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

export async function sendPasswordResetEmail({
  email,
  resetUrl,
}: SendPasswordResetEmailInput) {
  const subject = "Jelszó-visszaállítás";
  const text = [
    "Szia!",
    "",
    "Jelszó-visszaállítást kértél a VB Tippverseny 2026 fiókodhoz.",
    "",
    `Az új jelszó beállításához kattints erre a linkre: ${resetUrl}`,
    "",
    "A link 1 óráig érvényes. Ha nem te kérted, hagyd figyelmen kívül ezt az emailt.",
  ].join("\n");

  if (!process.env.RESEND_API_KEY) {
    console.info(`[DEV EMAIL] ${email} | ${subject} | Link: ${resetUrl}`);
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
    throw new Error("Nem sikerült elküldeni a jelszó-visszaállító emailt.");
  }
}
