"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kitsic/ui";
import { FileText, Upload } from "lucide-react";
import { uploadMeetingMom } from "@/lib/actions";

interface MeetingMomSectionProps {
  meetingId: string;
  meetingTitle: string;
  momAssignee: { id: string; fullName: string; email: string } | null;
  momStatus: string | null;
  momFileUrl: string | null;
  momFileName: string | null;
  momUploadedAt: string | null;
  currentUserId: string;
  canUpload: boolean;
}

export function MeetingMomSection({
  meetingId,
  meetingTitle,
  momAssignee,
  momStatus,
  momFileUrl,
  momFileName,
  momUploadedAt,
  canUpload,
}: MeetingMomSectionProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF or Word document first.");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.set("mom_file", file);

    startTransition(async () => {
      const result = await uploadMeetingMom(meetingId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <Card className="dashboard-card border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-accent" />
          Minutes of Meeting (MOM)
        </CardTitle>
        <CardDescription>
          A member is randomly assigned after each meeting is scheduled to prepare and upload the MOM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Assigned to:</span>
          {momAssignee ? (
            <>
              <span className="font-medium text-primary">{momAssignee.fullName}</span>
              <Badge variant={momStatus === "uploaded" ? "accent" : "muted"} className="capitalize">
                {momStatus === "uploaded" ? "Uploaded" : "Pending"}
              </Badge>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Not assigned yet</span>
          )}
        </div>

        {momFileUrl && momFileName ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--dashboard-border-subtle)] p-4">
            <p className="text-sm font-medium text-primary">{momFileName}</p>
            {momUploadedAt && (
              <p className="text-xs text-muted-foreground">
                Uploaded {new Date(momUploadedAt).toLocaleString("en-IN")}
              </p>
            )}
            <a
              href={momFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-sm font-semibold text-accent underline-offset-2 hover:underline"
            >
              Download MOM
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No MOM uploaded yet for &ldquo;{meetingTitle}&rdquo;.
          </p>
        )}

        {canUpload && (
          <div className="space-y-2 border-t border-[var(--dashboard-border-subtle)] pt-4">
            <p className="text-sm font-medium text-primary">Upload MOM document</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="button" disabled={isPending} onClick={handleUpload} className="font-ui rounded-lg">
              <Upload className="h-4 w-4" />
              {isPending ? "Uploading…" : "Upload MOM"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
