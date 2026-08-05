import { createHash, randomInt } from "node:crypto";
import { createAdminClient } from "@kitsic/database";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashOtp(otp: string) {
  return createHash("sha256").update(otp).digest("hex");
}

export function generateOtp() {
  return String(randomInt(100000, 999999));
}

export async function storeOtp(email: string, payload: Record<string, unknown>) {
  const supabase = createAdminClient();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  await supabase.from("email_otps").delete().eq("email", email.toLowerCase());

  const { error } = await supabase.from("email_otps").insert({
    email: email.toLowerCase(),
    otp_hash: hashOtp(otp),
    payload,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);
  return otp;
}

export async function verifyOtp(email: string, otp: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("email_otps")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return { ok: false as const, error: "No verification code found. Request a new one." };
  if (new Date(data.expires_at) < new Date()) return { ok: false as const, error: "Verification code expired." };
  if (data.otp_hash !== hashOtp(otp)) return { ok: false as const, error: "Invalid verification code." };

  await supabase.from("email_otps").update({ verified: true }).eq("id", data.id);
  return { ok: true as const, payload: data.payload as Record<string, string> };
}

export async function generateMemberIdPreview() {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("generate_member_id");
  if (typeof data === "string") return data;
  const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
  return `IC${String((count ?? 0) + 1).padStart(2, "0")}`;
}
