import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const transporter = getTransporter();

  if (!transporter || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:dev]", { to, subject, text: text ?? html });
      return { ok: true as const, dev: true as const };
    }
    return { ok: false as const, error: "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS." };
  }

  try {
    await transporter.sendMail({ from, to, subject, html, text });
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return { ok: false as const, error: message };
  }
}

export async function sendOtpEmail(to: string, otp: string) {
  return sendEmail({
    to,
    subject: "Your KITSIC verification code",
    text: `Your KITSIC verification code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#033565;margin:0 0 12px">KITS Innovation Club</h2>
        <p style="color:#5a7290;line-height:1.5">Use this code to verify your email and complete signup:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#033565;margin:24px 0">${otp}</p>
        <p style="color:#5a7290;font-size:13px">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendNotificationEmail(to: string, title: string, message: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return sendEmail({
    to,
    subject: `[KITSIC] ${title}`,
    text: `${title}\n\n${message}\n\nOpen dashboard: ${appUrl}/notifications`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#033565;margin:0 0 8px">${title}</h2>
        <p style="color:#5a7290;line-height:1.6">${message}</p>
        <a href="${appUrl}/notifications" style="display:inline-block;margin-top:20px;background:#033565;color:#fefefe;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">View in dashboard</a>
      </div>
    `,
  });
}

function emailShell(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#033565;margin:0 0 12px">${title}</h2>
      ${bodyHtml}
      <a href="${ctaUrl}" style="display:inline-block;margin-top:20px;background:#033565;color:#fefefe;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">${ctaLabel}</a>
    </div>
  `;
}

export async function sendMeetingInviteEmail(input: {
  to: string;
  recipientName: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  meetLink: string | null;
  meetingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const when = new Date(input.startsAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" });
  const endWhen = input.endsAt
    ? new Date(input.endsAt).toLocaleString("en-IN", { timeStyle: "short" })
    : null;

  const body = `
    <p style="color:#5a7290;line-height:1.6">Hi ${input.recipientName},</p>
    <p style="color:#5a7290;line-height:1.6">A new club meeting has been scheduled:</p>
    <p style="color:#033565;font-weight:600;font-size:18px;margin:16px 0">${input.title}</p>
    ${input.description ? `<p style="color:#5a7290;line-height:1.6">${input.description}</p>` : ""}
    <p style="color:#5a7290;line-height:1.6"><strong>When:</strong> ${when}${endWhen ? ` – ${endWhen}` : ""}</p>
    ${input.meetLink ? `<p style="color:#5a7290;line-height:1.6"><strong>Google Meet:</strong> <a href="${input.meetLink}">${input.meetLink}</a></p>` : ""}
    <p style="color:#5a7290;line-height:1.6">Join from the portal and your attendance will be tracked automatically.</p>
  `;

  return sendEmail({
    to: input.to,
    subject: `[KITSIC] Meeting scheduled: ${input.title}`,
    text: `Meeting: ${input.title}\nWhen: ${when}\n${input.meetLink ? `Meet: ${input.meetLink}\n` : ""}Portal: ${appUrl}/meetings/${input.meetingId}`,
    html: emailShell("Club meeting scheduled", body, "View meeting", `${appUrl}/meetings/${input.meetingId}`),
  });
}

export async function sendMomAssignmentEmail(input: {
  to: string;
  recipientName: string;
  meetingTitle: string;
  startsAt: string;
  meetingId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const when = new Date(input.startsAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" });

  const body = `
    <p style="color:#5a7290;line-height:1.6">Hi ${input.recipientName},</p>
    <p style="color:#5a7290;line-height:1.6">You have been randomly selected to prepare the <strong>Minutes of Meeting (MOM)</strong> for:</p>
    <p style="color:#033565;font-weight:600;font-size:18px;margin:16px 0">${input.meetingTitle}</p>
    <p style="color:#5a7290;line-height:1.6"><strong>Meeting time:</strong> ${when}</p>
    <p style="color:#5a7290;line-height:1.6">After the meeting, upload the MOM document (PDF or Word) on the meeting page in the portal.</p>
  `;

  return sendEmail({
    to: input.to,
    subject: `[KITSIC] MOM assigned: ${input.meetingTitle}`,
    text: `You are assigned to prepare MOM for "${input.meetingTitle}" on ${when}. Upload at ${appUrl}/meetings/${input.meetingId}`,
    html: emailShell("MOM assignment", body, "Upload MOM", `${appUrl}/meetings/${input.meetingId}`),
  });
}

export async function sendTaskAssignedEmail(input: {
  to: string;
  recipientName: string;
  taskTitle: string;
  assignerName: string;
  dueDate: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dueLine = input.dueDate
    ? `<p style="color:#5a7290;line-height:1.6"><strong>Due:</strong> ${new Date(input.dueDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>`
    : "";

  const body = `
    <p style="color:#5a7290;line-height:1.6">Hi ${input.recipientName},</p>
    <p style="color:#5a7290;line-height:1.6">${input.assignerName} assigned you a task:</p>
    <p style="color:#033565;font-weight:600;font-size:18px;margin:16px 0">${input.taskTitle}</p>
    ${dueLine}
  `;

  return sendEmail({
    to: input.to,
    subject: `[KITSIC] Task assigned: ${input.taskTitle}`,
    text: `${input.assignerName} assigned you "${input.taskTitle}". Open ${appUrl}/tasks`,
    html: emailShell("New task assigned", body, "Open tasks board", `${appUrl}/tasks`),
  });
}
