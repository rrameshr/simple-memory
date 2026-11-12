import nodemailer from "nodemailer";

let transport;
function getTransport() {
  if (transport !== undefined) return transport;
  const port = Number(process.env.SMTP_PORT || 587);
  transport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
      })
    : null;
  return transport;
}

export async function sendMail({ to, subject, text }) {
  const t = getTransport();
  if (!t) {
    if (process.env.NODE_ENV !== "production") console.log(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    else console.warn(`[mail] SMTP is not configured; email to ${to} was not sent.`);
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM || "Couple Memories <no-reply@localhost>", to, subject, text });
}
