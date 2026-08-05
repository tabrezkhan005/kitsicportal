import { createAdminClient } from "@kitsic/database";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()+\s]/g, "_").replace(/\s+/g, "-");
}

export async function uploadAvatarFile(userId: string, file: File) {
  if (!file.type.startsWith("image/")) return { error: "Only image files are allowed" as const };
  if (file.size > MAX_AVATAR_BYTES) return { error: "Image must be under 5 MB" as const };

  const supabase = createAdminClient();
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: urlData.publicUrl };
}

export async function uploadClubDocumentFile(userId: string, file: File, folder = "uploads") {
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "File must be under 15 MB" as const };

  const supabase = createAdminClient();
  const path = `${userId}/${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("club-documents").upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from("club-documents").getPublicUrl(path);
  return { url: urlData.publicUrl, fileName: file.name };
}
