"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@kitsic/ui";
import { updateProfileExtended } from "@/lib/platform-actions";
import { AVATAR_COLORS } from "@/lib/platform-constants";

interface ProfileEditFormProps {
  fullName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  avatarColor: string;
  memberId: string | null;
  skills: string[];
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function ProfileEditForm({
  fullName,
  email,
  phone,
  avatarUrl,
  avatarColor,
  memberId,
  skills,
}: ProfileEditFormProps) {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [isPending, startTransition] = useTransition();

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateProfileExtended(formData);
      router.refresh();
    });
  }

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="font-display text-base text-primary">Edit profile</CardTitle>
        {memberId && (
          <p className="font-mono-brand text-xs text-muted">Member ID · {memberId}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border">
              {previewUrl ? <AvatarImage src={previewUrl} alt={fullName ?? email} /> : null}
              <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-white font-ui">
                {getInitials(fullName, email)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="avatar_file">Profile picture</Label>
              <Input
                id="avatar_file"
                name="avatar_file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={isPending}
                onChange={handleAvatarChange}
                className="font-body"
              />
              <p className="text-xs text-muted font-body">JPEG, PNG, WebP or GIF · max 5 MB</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" defaultValue={fullName ?? ""} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} disabled className="text-muted" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar_color">Avatar color</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input type="radio" name="avatar_color" value={color} defaultChecked={avatarColor === color} className="sr-only peer" />
                  <span
                    className="block h-8 w-8 rounded-full border-2 border-transparent peer-checked:border-primary"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input id="skills" name="skills" defaultValue={skills.join(", ")} placeholder="React, Python, Public speaking" disabled={isPending} />
          </div>
          <Button type="submit" disabled={isPending} className="font-ui">
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
