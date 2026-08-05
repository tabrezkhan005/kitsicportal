import { Avatar, AvatarFallback, AvatarImage } from "@kitsic/ui";
import { getInitials } from "@kitsic/utils";

interface UserAvatarProps {
  name: string | null;
  email?: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-16 w-16 text-sm",
};

export function UserAvatar({
  name,
  email,
  avatarUrl,
  avatarColor = "#033565",
  className,
  size = "md",
}: UserAvatarProps) {
  const label = name ?? email ?? "Member";
  const initials = getInitials(label);

  return (
    <Avatar className={`${sizeClasses[size]} border border-[var(--dashboard-border)] ${className ?? ""}`}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={label} className="object-cover" />
      ) : null}
      <AvatarFallback
        className="font-ui font-semibold text-white"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
