import "server-only";

import { createAdminClient } from "@kitsic/database";
import { sendMeetingInviteEmail, sendMomAssignmentEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";

interface ClubMember {
  id: string;
  email: string;
  full_name: string | null;
}

export async function getActiveClubMembers(): Promise<ClubMember[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id, email, full_name")
    .is("deleted_at", null)
    .order("full_name");
  return data ?? [];
}

export function pickRandomMomAssignee(members: ClubMember[], excludeUserId?: string): ClubMember | null {
  const pool = excludeUserId
    ? members.filter((member) => member.id !== excludeUserId)
    : members;
  if (pool.length === 0) return members[0] ?? null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export async function notifyMeetingCreated(input: {
  meetingId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  meetLink: string | null;
  createdByUserId: string;
}): Promise<{ momAssigneeId: string | null; emailsSent: number }> {
  const members = await getActiveClubMembers();
  const momAssignee = pickRandomMomAssignee(members, input.createdByUserId);

  let emailsSent = 0;

  await Promise.all(
    members.map(async (member) => {
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
      if (result.ok) emailsSent += 1;

      await createNotification({
        userId: member.id,
        title: `Meeting: ${input.title}`,
        message: `Scheduled for ${new Date(input.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.${input.meetLink ? " Join via Google Meet from the portal." : ""}`,
        type: "meeting",
        sendEmail: false,
      });
    }),
  );

  if (momAssignee) {
    await sendMomAssignmentEmail({
      to: momAssignee.email,
      recipientName: momAssignee.full_name ?? momAssignee.email,
      meetingTitle: input.title,
      startsAt: input.startsAt,
      meetingId: input.meetingId,
    });

    await createNotification({
      userId: momAssignee.id,
      title: "MOM assignment",
      message: `Prepare and upload Minutes of Meeting for "${input.title}" after the meeting ends.`,
      type: "meeting",
      sendEmail: false,
    });
  }

  return { momAssigneeId: momAssignee?.id ?? null, emailsSent };
}
