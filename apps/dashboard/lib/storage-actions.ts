"use server";

import { getSessionUser } from "@kitsic/auth";
import { createAdminClient } from "@kitsic/database";
import { uploadAvatarFile, uploadClubDocumentFile } from "@/lib/storage";

export async function uploadAvatar(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "Choose an image to upload" };

  const result = await uploadAvatarFile(user.id, file);
  if ("error" in result) return { error: result.error };

  const supabase = createAdminClient();
  const { error: updateError } = await supabase
    .from("users")
    .update({ avatar_url: result.url })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  return { success: true, url: result.url };
}

export async function uploadClubDocument(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return { error: "Unauthorized" };

  const file = formData.get("attachment") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file to upload" };

  const folder = (formData.get("folder") as string) || "uploads";
  const result = await uploadClubDocumentFile(user.id, file, folder);
  if ("error" in result) return { error: result.error };

  return { success: true, url: result.url, fileName: result.fileName };
}
