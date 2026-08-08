"use server";

import { requirePermission, getSessionUser } from "@kitsic/auth";
import { createAdminClient } from "@kitsic/database";
import { revalidatePath } from "next/cache";
import { notifyLeadership, createNotification } from "@/lib/notify";
import { calculateLearningPoints } from "@/lib/learning-points";
import { gradeAnswer, normalizeQuestions } from "@/lib/learning-questions";
import type { GradeResult, LearningQuestion } from "@/lib/learning-types";
import { uploadClubDocumentFile, uploadAvatarFile } from "@/lib/storage";
import type { ActionResult } from "@/lib/actions";
import { toActionErrorMessage } from "@/lib/action-error";

function revalidate(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function buildProposalDescription(formData: FormData): string | null {
  const about = optionalText(formData.get("about"));
  const eventType = optionalText(formData.get("event_type"));
  const audience = optionalText(formData.get("audience"));
  const timing = optionalText(formData.get("preferred_timing"));
  const why = optionalText(formData.get("why_host"));

  const sections: string[] = [];
  if (about) sections.push(about);

  const meta: string[] = [];
  if (eventType) meta.push(`Type: ${eventType}`);
  if (audience) meta.push(`Audience: ${audience}`);
  if (timing) meta.push(`Preferred timing: ${timing}`);
  if (why) meta.push(`Why host this: ${why}`);

  if (meta.length > 0) {
    sections.push(meta.join("\n"));
  }

  return sections.length > 0 ? sections.join("\n\n") : null;
}

export async function proposeEvent(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("events.propose");
    const supabase = createAdminClient();

    const title = optionalText(formData.get("title"));
    const about = optionalText(formData.get("about"));
    if (!title) return { error: "Please give your event a name." };
    if (!about) return { error: "Tell us what the event is about." };

    const description = buildProposalDescription(formData);
    const location = optionalText(formData.get("location"));

    const { data, error } = await supabase
      .from("event_proposals")
      .insert({
        title,
        description,
        location,
        proposed_starts_at: null,
        proposed_ends_at: null,
        proposed_by: user.id,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      if (error.message.includes("event_proposals")) {
        return { error: "Event proposals are not set up yet. Ask leadership to run the platform database migration." };
      }
      return { error: error.message };
    }

    const file = formData.get("attachment") as File | null;
    if (file && file.size > 0) {
      const uploaded = await uploadClubDocumentFile(user.id, file, "proposals");
      if ("error" in uploaded) {
        return {
          error: `Proposal saved, but the file could not be uploaded: ${uploaded.error}. You can edit the proposal later or try a smaller file.`,
        };
      }
      const { error: attachmentError } = await supabase.from("event_proposal_attachments").insert({
        proposal_id: data.id,
        file_name: uploaded.fileName,
        file_url: uploaded.url,
        uploaded_by: user.id,
      });
      if (attachmentError) {
        return { error: `Proposal saved, but attachment metadata failed: ${attachmentError.message}` };
      }
    }

    try {
      await notifyLeadership("president", user.fullName ?? "Member", `Event proposal: ${title}`);
    } catch (notifyError) {
      console.error("proposeEvent: leadership notify failed", notifyError);
    }

    revalidate("/events");
    return { success: true };
  } catch (err) {
    return { error: toActionErrorMessage(err, "Could not submit your proposal. Please try again.") };
  }
}

export async function reviewEventProposal(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("events.manage");
  const supabase = createAdminClient();

  const proposalId = formData.get("proposal_id") as string;
  const decision = formData.get("decision") as string;
  const note = (formData.get("review_note") as string) || null;
  if (!proposalId || !["approved", "rejected"].includes(decision)) {
    return { error: "Invalid review request" };
  }

  const { data: proposal, error } = await supabase
    .from("event_proposals")
    .update({
      status: decision,
      reviewed_by: user.id,
      review_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select("*")
    .single();

  if (error || !proposal) return { error: error?.message ?? "Proposal not found" };

  if (decision === "approved" && proposal.proposed_by) {
    if (proposal.proposed_starts_at) {
      await supabase.from("events").insert({
        title: proposal.title,
        description: proposal.description,
        location: proposal.location,
        starts_at: proposal.proposed_starts_at,
        ends_at: proposal.proposed_ends_at,
        status: "upcoming",
        created_by: user.id,
      });
    }
    await createNotification({
      userId: proposal.proposed_by,
      title: "Event proposal approved",
      message: `Your proposal "${proposal.title}" was approved.${note ? ` Note: ${note}` : ""}`,
      type: "event",
    });
  } else if (proposal.proposed_by) {
    await createNotification({
      userId: proposal.proposed_by,
      title: "Event proposal reviewed",
      message: `Your proposal "${proposal.title}" was not approved.${note ? ` Note: ${note}` : ""}`,
      type: "event",
    });
  }

  revalidate("/events");
  return { success: true };
}

export async function updateMemberSkills(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("profile.update");
  const supabase = createAdminClient();
  const raw = (formData.get("skills") as string)?.trim() ?? "";
  const skills = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  const { error } = await supabase.from("users").update({ skills }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidate("/members", "/profile");
  return { success: true };
}

export async function createResource(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("resources.manage");
  const supabase = createAdminClient();

  const title = (formData.get("title") as string)?.trim();
  let url = (formData.get("url") as string)?.trim();
  const file = formData.get("attachment") as File | null;

  if (file && file.size > 0) {
    const uploaded = await uploadClubDocumentFile(user.id, file, "resources");
    if ("error" in uploaded) return { error: uploaded.error };
    url = uploaded.url;
  }

  if (!title || !url) return { error: "Title and a URL or file are required" };

  const { error } = await supabase.from("club_resources").insert({
    title,
    url,
    description: (formData.get("description") as string) || null,
    category: (formData.get("category") as string) || "other",
    created_by: user.id,
    is_published: true,
  });

  if (error) return { error: error.message };
  revalidate("/resources");
  return { success: true };
}

export async function createLearningModule(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("learning.manage");
    const supabase = createAdminClient();

    const title = optionalText(formData.get("title"));
    const type = (formData.get("type") as string) || "quiz";
    if (!title) return { error: "Title is required" };

    const questionsRaw = (formData.get("questions") as string)?.trim();
    let questions: LearningQuestion[] = [];
    if (questionsRaw) {
      try {
        const parsed = JSON.parse(questionsRaw) as unknown;
        questions = normalizeQuestions(parsed);
      } catch {
        return { error: "Invalid quiz questions. Please review your question list." };
      }
    }

    if (type === "quiz" && questions.length === 0) {
      return { error: "Add at least one quiz question." };
    }

    const dueDateRaw = optionalText(formData.get("due_date"));

    const { error } = await supabase.from("learning_modules").insert({
      title,
      description: optionalText(formData.get("description")),
      type,
      questions,
      due_date: dueDateRaw,
      created_by: user.id,
      is_published: formData.get("publish") === "on" || formData.get("publish") === "true",
    });

    if (error) return { error: error.message };
    revalidate("/learning");
    return { success: true };
  } catch (err) {
    return { error: toActionErrorMessage(err, "Could not create learning module.") };
  }
}

export async function gradeQuizAnswer(
  moduleId: string,
  questionId: string,
  answer: string,
): Promise<ActionResult> {
  try {
    await requirePermission("learning.read");
    const supabase = createAdminClient();

    const { data: module } = await supabase
      .from("learning_modules")
      .select("questions, type, is_published")
      .eq("id", moduleId)
      .single();

    if (!module?.is_published || module.type !== "quiz") {
      return { error: "Quiz is not available." };
    }

    const questions = normalizeQuestions(module.questions);
    const question = questions.find((item) => item.id === questionId);
    if (!question) return { error: "Question not found." };

    const result = gradeAnswer(question, answer);
    return { success: true, data: { ...result } };
  } catch (err) {
    return { error: toActionErrorMessage(err, "Could not check your answer.") };
  }
}

export async function submitLearningModule(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("learning.read");
    const supabase = createAdminClient();

    const moduleId = formData.get("module_id") as string;
    const answersRaw = (formData.get("answers") as string)?.trim();
    if (!moduleId || !answersRaw) return { error: "Submission is incomplete" };

    let answers: Record<string, string> = {};
    try {
      answers = JSON.parse(answersRaw);
    } catch {
      return { error: "Invalid answers" };
    }

    const { data: module } = await supabase
      .from("learning_modules")
      .select("questions, type, is_published")
      .eq("id", moduleId)
      .single();
    if (!module?.is_published) return { error: "Module is not available" };

    const questions = normalizeQuestions(module.questions);

    const result = calculateLearningPoints(
      module.type as "quiz" | "assignment",
      questions,
      answers,
    );

    const perQuestion = module.type === "quiz"
      ? questions.map((question) => ({
          id: question.id,
          ...gradeAnswer(question, answers[question.id] ?? ""),
        }))
      : [];

    const { error } = await supabase.from("learning_submissions").upsert({
      module_id: moduleId,
      user_id: user.id,
      answers,
      score: result.score,
      points_earned: result.pointsEarned,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });

    if (error) return { error: error.message };
    revalidate("/learning", "/profile", "/");
    return {
      success: true,
      data: {
        score: result.score ?? undefined,
        pointsEarned: result.pointsEarned,
        breakdown: perQuestion,
      },
    };
  } catch (err) {
    return { error: toActionErrorMessage(err, "Could not submit your quiz.") };
  }
}

export async function sendLeadershipMessage(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("messages.send");
  const supabase = createAdminClient();

  const recipientRole = (formData.get("recipient_role") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  if (!recipientRole || !subject || !body) return { error: "All fields are required" };

  const allowed = ["president", "vice_president", "secretary", "treasurer"];
  if (!allowed.includes(recipientRole)) return { error: "Invalid recipient" };

  const { error } = await supabase.from("leadership_messages").insert({
    sender_id: user.id,
    recipient_role: recipientRole,
    subject,
    body,
  });

  if (error) return { error: error.message };
  await notifyLeadership(recipientRole, user.fullName ?? "Member", subject);
  revalidate("/messages");
  return { success: true };
}

export async function markLeadershipMessageRead(messageId: string): Promise<ActionResult> {
  await requirePermission("messages.read");
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("leadership_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { error: error.message };
  revalidate("/messages");
  return { success: true };
}

export async function updateProfileExtended(formData: FormData): Promise<ActionResult> {
  const user = await requirePermission("profile.update");
  const supabase = createAdminClient();

  const fullName = (formData.get("full_name") as string)?.trim();
  let avatarUrl = (formData.get("avatar_url") as string)?.trim() || null;
  const avatarColor = (formData.get("avatar_color") as string)?.trim() || "#033565";
  const phone = (formData.get("phone") as string)?.trim() || null;
  const skillsRaw = (formData.get("skills") as string)?.trim() ?? "";
  const skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);

  const avatarFile = formData.get("avatar_file") as File | null;
  if (avatarFile && avatarFile.size > 0) {
    const uploaded = await uploadAvatarFile(user.id, avatarFile);
    if ("error" in uploaded) return { error: uploaded.error };
    avatarUrl = uploaded.url;
  }

  const { error } = await supabase.from("users").update({
    full_name: fullName || null,
    avatar_url: avatarUrl,
    avatar_color: avatarColor,
    phone,
    skills,
  }).eq("id", user.id);

  if (error) return { error: error.message };
  revalidate("/profile", "/members");
  return { success: true };
}
