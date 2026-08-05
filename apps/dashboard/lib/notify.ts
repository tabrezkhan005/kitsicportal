import { createAdminClient } from "@kitsic/database";
import { sendNotificationEmail } from "@/lib/email";

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: string;
  sendEmail?: boolean;
}

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  sendEmail = true,
}: CreateNotificationInput) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({ user_id: userId, title, message, type, is_read: false })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  if (sendEmail) {
    const { data: user } = await supabase.from("users").select("email").eq("id", userId).single();
    if (user?.email) {
      await sendNotificationEmail(user.email, title, message);
    }
  }

  return { ok: true as const, id: data.id };
}

export async function notifyLeadership(recipientRole: string, senderName: string, subject: string) {
  const supabase = createAdminClient();
  const { data: role } = await supabase.from("roles").select("id").eq("slug", recipientRole).single();
  if (!role) return;

  const { data: userRoles } = await supabase.from("user_roles").select("user_id").eq("role_id", role.id);
  for (const entry of userRoles ?? []) {
    await createNotification({
      userId: entry.user_id,
      title: `New message: ${subject}`,
      message: `${senderName} sent a message to ${recipientRole.replace(/_/g, " ")}.`,
      type: "message",
    });
  }
}
