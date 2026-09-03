import "server-only";

import { createAdminClient } from "@kitsic/database";
import { sendMeetingInviteEmail, sendMomAssignmentEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";

interface ClubMember {
  id: string;
  email: string;
  full_name: string | null;
}

const EMAIL_BATCH_SIZE = 8;

export async function getActiveClubMembers(): Promise<ClubMember[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, deleted_at")
    .order("full_name");

  if (error) {
    console.error("getActiveClubMembers:", error.message);
    const fallback = await supabase.from("users").select("id, email, full_name").order("full_name");
    return (fallback.data ?? [])
      .filter((row) => Boolean(row.email))
      .map((row) => ({ id: row.id, email: row.email, full_name: row.full_name }));
  }

  return (data ?? [])
    .filter((row) => !row.deleted_at && Boolean(row.email))
    .map((row) => ({ id: row.id, email: row.email, full_name: row.full_name }));
}

export function pickRandomMomAssignee(members: ClubMember[], excludeUserId?: string): ClubMember | null {
  const pool = excludeUserId
    ? members.filter((member) => member.id !== excludeUserId)
    : members;
  if (pool.length === 0) return members[0] ?? null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map((item) => worker(item)));
  }
}

export async function notifyMeetingCreated(input: {
  meetingId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  meetLink: string | null;
  createdByUserId: string;
}): Promise<{
  momAssigneeId: string | null;
  emailsSent: number;
  memberCount: number;
  emailErrors: string[];
}> {
  const members = await getActiveClubMembers();
  const momAssignee = pickRandomMomAssignee(members, input.createdByUserId);

  let emailsSent = 0;
  const emailErrors: string[] = [];

  await runInBatches(members, EMAIL_BATCH_SIZE, async (member) => {
    const result = await sendMeetingInviteEmail({
      to: member.email,
      recipientName: member.full_name ?? member.email,
      title: input.title,
      description: input.description,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      meetLink: input.meetLink,
      meetingId: input.meetingId,
    });

    if (result.ok) {
      emailsSent += 1;
    } else {
      emailErrors.push(`${member.email}: ${result.error ?? "send failed"}`);
    }

    try {
      await createNotification({
        userId: member.id,
        title: `Meeting: ${input.title}`,
        message: `Scheduled for ${new Date(input.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.${input.meetLink ? " Join via Google Meet from the portal." : ""}`,
        type: "meeting",
        sendEmail: false,
      });
    } catch (notifyError) {
      console.error("meeting notification insert failed", member.id, notifyError);
    }
  });

  if (momAssignee) {
    const momMail = await sendMomAssignmentEmail({
      to: momAssignee.email,
      recipientName: momAssignee.full_name ?? momAssignee.email,
      meetingTitle: input.title,
      startsAt: input.startsAt,
      meetingId: input.meetingId,
    });
    if (!momMail.ok) {
      emailErrors.push(`MOM ${momAssignee.email}: ${momMail.error ?? "send failed"}`);
    }

    try {
      await createNotification({
        userId: momAssignee.id,
        title: "MOM assignment",
        message: `Prepare and upload Minutes of Meeting for "${input.title}" after the meeting ends.`,
        type: "meeting",
        sendEmail: false,
      });
    } catch (notifyError) {
      console.error("MOM notification insert failed", momAssignee.id, notifyError);
    }
  }

  return {
    momAssigneeId: momAssignee?.id ?? null,
    emailsSent,
    memberCount: members.length,
    emailErrors,
  };
}
