"use server";

import { requirePermission, getSessionUser } from "@kitsic/auth";
import { createAdminClient, logAuditEvent } from "@kitsic/database";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { createNotification } from "@/lib/notify";
import { sendTaskAssignedEmail } from "@/lib/email";

export interface ActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  data?: Record<string, unknown>;
}

async function writeAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  newValue?: Record<string, unknown>,
) {
  const headerList = await headers();
  await logAuditEvent({
    userId,
    action,
    entityType,
    entityId,
    newValue,
    ipAddress: headerList.get("x-forwarded-for"),
    userAgent: headerList.get("user-agent"),
  });
}

function revalidateDashboard(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function createTask(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("tasks.create");
  const supabase = createAdminClient();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const { data, error } = await supabase.from("tasks").insert({
    title,
    description: (formData.get("description") as string) || null,
    status: "todo",
    priority: (formData.get("priority") as string) || "medium",
    category: (formData.get("category") as string) || null,
    assigned_to: (formData.get("assigned_to") as string) || null,
    assigned_by: user.id,
    due_date: (formData.get("due_date") as string) || null,
    progress: 0,
  }).select("id").single();

  if (error) return { error: error.message };

  const assignedTo = (formData.get("assigned_to") as string) || null;
  if (assignedTo && assignedTo !== user.id) {
    const { data: assignee } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", assignedTo)
      .single();

    await createNotification({
      userId: assignedTo,
      title: "Task assigned to you",
      message: `${user.fullName ?? "A club member"} assigned you "${title}".`,
      type: "task",
      sendEmail: false,
    });

    if (assignee?.email) {
      await sendTaskAssignedEmail({
        to: assignee.email,
        recipientName: assignee.full_name ?? assignee.email,
        taskTitle: title,
        assignerName: user.fullName ?? "A club member",
        dueDate: (formData.get("due_date") as string) || null,
      });
    }
  }

  await writeAudit(user.id, "task.create", "task", data.id, { title });
  revalidateDashboard("/tasks", "/");
  return { success: true };
}

export async function updateTaskStatus(taskId: string, status: string): Promise<ActionResult> {
  const user = await requirePermission("tasks.read");
  const supabase = createAdminClient();

  const progress = status === "completed" ? 100 : status === "in_progress" ? 50 : undefined;
  const { error } = await supabase.from("tasks").update({
    status,
    ...(progress !== undefined ? { progress } : {}),
  }).eq("id", taskId);

  if (error) return { error: error.message };
  await writeAudit(user.id, "task.update_status", "task", taskId, { status });
  revalidateDashboard("/tasks", "/");
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const user = await requirePermission("tasks.approve");
  const supabase = createAdminClient();

  const { error } = await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", taskId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "task.delete", "task", taskId);
  revalidateDashboard("/tasks", "/");
  return { success: true };
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function createEvent(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("events.manage");
  const supabase = createAdminClient();

  const title = (formData.get("title") as string)?.trim();
  const startsAt = formData.get("starts_at") as string;
  if (!title || !startsAt) return { error: "Title and start date are required" };

  const { data, error } = await supabase.from("events").insert({
    title,
    description: (formData.get("description") as string) || null,
    location: (formData.get("location") as string) || null,
    starts_at: startsAt,
    ends_at: (formData.get("ends_at") as string) || null,
    status: "upcoming",
    is_public: formData.get("is_public") === "true",
    created_by: user.id,
  }).select("id").single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "event.create", "event", data.id, { title });
  revalidateDashboard("/events", "/calendar", "/");
  return { success: true };
}

// ─── Meetings ────────────────────────────────────────────────────────────────

/** Parse datetime-local values as Asia/Kolkata (IST), not server UTC. */
function parseFormDateTime(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, year, month, day, hour, minute, second = "00"] = match;
    const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function createMeeting(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("meetings.manage");
  const supabase = createAdminClient();

  const title = (formData.get("title") as string)?.trim();
  const startsAt = parseFormDateTime(formData.get("starts_at"));
  if (!title || !startsAt) return { error: "Title and start date are required" };

  const endsAt =
    parseFormDateTime(formData.get("ends_at"))
    ?? new Date(new Date(startsAt).getTime() + 3600000).toISOString();

  const meetLinkInput = (formData.get("meet_link") as string)?.trim();
  let meetLink = meetLinkInput || null;
  let googleEventId: string | null = null;
  let googleMeetCode: string | null = null;

  if (!meetLink) {
    try {
      const { createGoogleCalendarMeeting } = await import("@/lib/google/calendar");
      const { getStoredGoogleTokens } = await import("@/lib/google/client");
      const connected = await getStoredGoogleTokens();
      if (!connected) {
        return {
          error: "Connect Google Calendar in Settings first, or paste a Meet link manually.",
        };
      }

      const created = await createGoogleCalendarMeeting({
        title,
        description: (formData.get("description") as string) || null,
        startsAt,
        endsAt,
      });
      meetLink = created.meetLink;
      googleEventId = created.googleEventId;
      googleMeetCode = created.googleMeetCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create Google Meet";
      return { error: message };
    }
  }

  const { data, error } = await supabase.from("meetings").insert({
    title,
    description: (formData.get("description") as string) || null,
    starts_at: startsAt,
    ends_at: endsAt,
    meet_link: meetLink,
    google_event_id: googleEventId,
    google_meet_code: googleMeetCode,
    meeting_mode: "online",
    status: "scheduled",
    created_by: user.id,
  }).select("id").single();

  if (error) return { error: error.message };

  const description = (formData.get("description") as string) || null;

  // Send invites after the response so Vercel timeouts don't cancel the meeting create.
  after(async () => {
    try {
      const { notifyMeetingCreated } = await import("@/lib/meeting-notifications");
      const { momAssigneeId, emailsSent, memberCount, emailErrors } = await notifyMeetingCreated({
        meetingId: data.id,
        title,
        description,
        startsAt,
        endsAt,
        meetLink,
        createdByUserId: user.id,
      });

      if (momAssigneeId) {
        await supabase
          .from("meetings")
          .update({ mom_assignee_id: momAssigneeId, mom_status: "pending" })
          .eq("id", data.id);
      }

      console.info(
        `createMeeting ${data.id}: emails ${emailsSent}/${memberCount}`
        + (emailErrors.length ? `; failures=${emailErrors.length}` : ""),
      );
      if (emailErrors.length > 0) {
        console.error("createMeeting invite failures", emailErrors.slice(0, 10));
      }
    } catch (notifyError) {
      console.error("createMeeting: notifications failed", notifyError);
    }
  });

  await writeAudit(user.id, "meeting.create", "meeting", data.id, { title, meetLink, googleEventId });
  revalidateDashboard("/meetings", "/calendar", `/meetings/${data.id}`);
  return {
    success: true,
    message: "Meeting scheduled. Invite emails are being sent to all registered members now.",
  };
}

export async function cancelMeeting(meetingId: string): Promise<ActionResult> {
  const user = await requirePermission("meetings.manage");
  const supabase = createAdminClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("google_event_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (meeting?.google_event_id) {
    try {
      const { cancelGoogleCalendarMeeting } = await import("@/lib/google/calendar");
      await cancelGoogleCalendarMeeting(meeting.google_event_id);
    } catch {
      // Continue cancelling locally even if Google delete fails.
    }
  }

  const { error } = await supabase
    .from("meetings")
    .update({ status: "cancelled" })
    .eq("id", meetingId);

  if (error) return { error: error.message };
  await writeAudit(user.id, "meeting.cancel", "meeting", meetingId);
  revalidateDashboard("/meetings", "/calendar", "/");
  return { success: true };
}

export async function joinMeeting(meetingId: string): Promise<ActionResult & { data?: { meetLink: string } }> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, meet_link, starts_at, ends_at, status")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting?.meet_link) return { error: "Meeting link not found" };
  if (meeting.status !== "scheduled") return { error: "Meeting is not active" };

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, joined_at")
    .eq("meeting_id", meetingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    if (!existing.joined_at) {
      await supabase
        .from("attendance_records")
        .update({ joined_at: now, status: "partial", source: "portal", updated_at: now })
        .eq("id", existing.id);
    }
  } else {
    await supabase.from("attendance_records").insert({
      user_id: user.id,
      meeting_id: meetingId,
      status: "partial",
      joined_at: now,
      duration_minutes: 0,
      source: "portal",
    });
  }

  revalidateDashboard("/meetings", `/meetings/${meetingId}`, "/attendance", "/profile");
  return { success: true, data: { meetLink: meeting.meet_link } };
}

export async function syncMeetingAttendance(meetingId: string): Promise<ActionResult> {
  await requirePermission("attendance.manage");
  try {
    const { syncMeetingAttendanceFromGoogle } = await import("@/lib/google/meet-sync");
    const result = await syncMeetingAttendanceFromGoogle(meetingId);
    revalidateDashboard("/meetings", `/meetings/${meetingId}`, "/attendance");
    return {
      success: true,
      data: {
        synced: result.synced,
        conferenceFound: result.conferenceFound,
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Sync failed" };
  }
}

export async function disconnectGoogleCalendar(): Promise<ActionResult> {
  const user = await requirePermission("settings.manage");
  const { clearGoogleTokens } = await import("@/lib/google/client");
  await clearGoogleTokens();
  await writeAudit(user.id, "google.disconnect", "system_setting", undefined);
  revalidateDashboard("/settings", "/meetings");
  return { success: true };
}

export async function uploadMeetingMom(meetingId: string, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, mom_assignee_id, mom_status")
    .eq("id", meetingId)
    .maybeSingle();

  if (!meeting) return { error: "Meeting not found" };

  const canManage = user.permissions.includes("meetings.manage");
  const isAssignee = meeting.mom_assignee_id === user.id;
  if (!isAssignee && !canManage) {
    return { error: "Only the assigned MOM writer or leadership can upload minutes" };
  }

  const file = formData.get("mom_file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a MOM file to upload" };
  }

  const { uploadMeetingMomFile } = await import("@/lib/storage");
  const result = await uploadMeetingMomFile(user.id, meetingId, file);
  if ("error" in result && result.error) return { error: result.error };

  const { error: updateError } = await supabase
    .from("meetings")
    .update({
      mom_file_url: result.url,
      mom_file_name: result.fileName,
      mom_uploaded_at: new Date().toISOString(),
      mom_status: "uploaded",
    })
    .eq("id", meetingId);

  if (updateError) return { error: updateError.message };

  await writeAudit(user.id, "meeting.mom_upload", "meeting", meetingId, {
    fileName: result.fileName,
  });

  revalidateDashboard("/meetings", `/meetings/${meetingId}`);
  return { success: true };
}

// ─── Announcements ───────────────────────────────────────────────────────────

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("announcements.manage");
  const supabase = createAdminClient();

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!title || !content) return { error: "Title and content are required" };

  const { data, error } = await supabase.from("announcements").insert({
    title,
    content,
    is_pinned: formData.get("is_pinned") === "true",
    created_by: user.id,
  }).select("id").single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "announcement.create", "announcement", data.id, { title });
  revalidateDashboard("/announcements", "/");
  return { success: true };
}

export async function toggleAnnouncementPin(id: string, pinned: boolean): Promise<ActionResult> {
  const user = await requirePermission("announcements.manage");
  const supabase = createAdminClient();

  const { error } = await supabase.from("announcements").update({ is_pinned: pinned }).eq("id", id);
  if (error) return { error: error.message };
  await writeAudit(user.id, "announcement.pin", "announcement", id, { pinned });
  revalidateDashboard("/announcements");
  return { success: true };
}

// ─── Members / Roles ─────────────────────────────────────────────────────────

export async function assignMemberRole(userId: string, roleSlug: string): Promise<ActionResult> {
  const actor = await requirePermission("roles.assign");
  const supabase = createAdminClient();

  const { data: role } = await supabase.from("roles").select("id").eq("slug", roleSlug).single();
  if (!role) return { error: "Role not found" };

  await supabase.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role_id: role.id });
  if (error) return { error: error.message };

  await writeAudit(actor.id, "member.assign_role", "user", userId, { roleSlug });
  revalidateDashboard("/members");
  return { success: true };
}

export async function deleteMember(userId: string): Promise<ActionResult> {
  const actor = await requirePermission("members.delete");
  if (actor.id === userId) return { error: "You cannot delete your own account." };

  const { deleteUserCompletely } = await import("@/lib/delete-user");
  const result = await deleteUserCompletely(userId);
  if (!result.ok) return { error: result.error ?? "Could not delete member." };

  await writeAudit(actor.id, "member.delete", "user", userId);
  revalidateDashboard("/members");
  return { success: true };
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidateDashboard("/notifications");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  if (error) return { error: error.message };
  revalidateDashboard("/notifications");
  return { success: true };
}

// ─── Attendance / QR ─────────────────────────────────────────────────────────

export async function createQrSession(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("attendance.manage");
  const supabase = createAdminClient();

  const meetingId = (formData.get("meeting_id") as string) || null;
  const eventId = (formData.get("event_id") as string) || null;
  if (!meetingId && !eventId) return { error: "Select a meeting or event" };

  const code = randomBytes(4).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 2 * 3600000).toISOString();

  const { data, error } = await supabase.from("qr_sessions").insert({
    meeting_id: meetingId,
    event_id: eventId,
    code,
    expires_at: expiresAt,
    created_by: user.id,
  }).select("code").single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "qr.create", "qr_session", undefined, { code, meetingId, eventId });
  revalidateDashboard("/attendance");
  return { success: true, data: { code: data.code } };
}

export async function checkInWithCode(code: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from("qr_sessions")
    .select("id, meeting_id, event_id, expires_at")
    .eq("code", code.toUpperCase())
    .single();

  if (!session) return { error: "Invalid QR code" };
  if (new Date(session.expires_at) < new Date()) return { error: "QR code expired" };

  const { error } = await supabase.from("attendance_records").insert({
    user_id: user.id,
    meeting_id: session.meeting_id,
    event_id: session.event_id,
    status: "present",
    joined_at: new Date().toISOString(),
    duration_minutes: 0,
  });

  if (error) return { error: error.message };
  revalidateDashboard("/attendance", "/profile");
  return { success: true };
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export async function createExpense(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("finance.manage");
  const supabase = createAdminClient();

  const title = (formData.get("title") as string)?.trim();
  const amount = Number(formData.get("amount"));
  const category = (formData.get("category") as string)?.trim();
  if (!title || !amount || !category) return { error: "Title, amount, and category are required" };

  const { data, error } = await supabase.from("expenses").insert({
    title,
    amount,
    category,
    status: "pending",
    description: (formData.get("description") as string) || null,
    paid_by: user.id,
  }).select("id").single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "expense.create", "expense", data.id, { title, amount });
  revalidateDashboard("/finance");
  return { success: true };
}

export async function approveExpense(expenseId: string): Promise<ActionResult> {
  const user = await requirePermission("finance.manage");
  const supabase = createAdminClient();

  const { error } = await supabase.from("expenses").update({
    status: "approved",
    approved_by: user.id,
  }).eq("id", expenseId);

  if (error) return { error: error.message };
  await writeAudit(user.id, "expense.approve", "expense", expenseId);
  revalidateDashboard("/finance");
  return { success: true };
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export async function createInventoryItem(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("inventory.manage");
  const supabase = createAdminClient();

  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  if (!name || !category) return { error: "Name and category are required" };

  const { data, error } = await supabase.from("inventory_items").insert({
    name,
    category,
    quantity: Number(formData.get("quantity")) || 1,
    condition: (formData.get("condition") as string) || "good",
    location: (formData.get("location") as string) || null,
    notes: (formData.get("notes") as string) || null,
  }).select("id").single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "inventory.create", "inventory_item", data.id, { name });
  revalidateDashboard("/inventory");
  return { success: true };
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function createProject(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("projects.manage");
  const supabase = createAdminClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name is required" };

  const { data, error } = await supabase.from("projects").insert({
    name,
    description: (formData.get("description") as string) || null,
    status: "planning",
    progress: 0,
    domain: (formData.get("domain") as string) || null,
    lead_id: (formData.get("lead_id") as string) || user.id,
    created_by: user.id,
    is_public: formData.get("is_public") === "true",
  }).select("id").single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "project.create", "project", data.id, { name });
  revalidateDashboard("/projects");
  return { success: true };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("profile.update");
  const supabase = createAdminClient();

  const fullName = (formData.get("full_name") as string)?.trim();
  const { error } = await supabase.from("users").update({
    full_name: fullName || null,
  }).eq("id", user.id);

  if (error) return { error: error.message };
  await writeAudit(user.id, "profile.update", "user", user.id, { fullName });
  revalidateDashboard("/profile");
  return { success: true };
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function updateSystemSetting(key: string, value: Record<string, unknown>): Promise<ActionResult> {
  const user = await requirePermission("settings.manage");
  const supabase = createAdminClient();

  const { error } = await supabase.from("system_settings").upsert({ key, value }, { onConflict: "key" });
  if (error) return { error: error.message };
  await writeAudit(user.id, "settings.update", "system_setting", undefined, { key, value });
  revalidateDashboard("/settings");
  return { success: true };
}

export async function createApiKey(name: string): Promise<ActionResult> {
  const user = await requirePermission("settings.manage");
  const supabase = createAdminClient();

  const rawKey = `kitsic_${randomBytes(16).toString("hex")}`;
  const { error } = await supabase.from("api_keys").insert({
    name,
    key_prefix: rawKey.slice(0, 12),
    key_hash: rawKey,
    scopes: ["events:read", "projects:read", "team:read"],
    created_by: user.id,
  });

  if (error) return { error: error.message };
  await writeAudit(user.id, "api_key.create", "api_key", undefined, { name });
  revalidateDashboard("/settings");
  return { success: true, data: { key: rawKey } };
}

export async function revokeApiKey(keyId: string): Promise<ActionResult> {
  const user = await requirePermission("settings.manage");
  const supabase = createAdminClient();

  const { error } = await supabase.from("api_keys").update({ is_active: false }).eq("id", keyId);
  if (error) return { error: error.message };
  await writeAudit(user.id, "api_key.revoke", "api_key", keyId);
  revalidateDashboard("/settings");
  return { success: true };
}

// ─── Certificates ────────────────────────────────────────────────────────────

export async function issueCertificate(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("certificates.manage");
  const supabase = createAdminClient();

  const userId = formData.get("user_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const type = (formData.get("type") as string) || "participation";
  if (!userId || !title) return { error: "Member and title are required" };

  const { data, error } = await supabase.from("certificates").insert({
    user_id: userId,
    title,
    type,
    issued_by: user.id,
  }).select("id").single();

  if (error) return { error: error.message };
  await writeAudit(user.id, "certificate.issue", "certificate", data.id, { title, userId });
  revalidateDashboard("/members", "/profile");
  return { success: true };
}
