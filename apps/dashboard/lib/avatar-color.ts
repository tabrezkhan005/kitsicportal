import { AVATAR_COLORS } from "@/lib/platform-constants";

export function getAvatarColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function resolveAvatarColor(userId: string, _stored?: string | null): string {
  return getAvatarColorForUser(userId);
}
