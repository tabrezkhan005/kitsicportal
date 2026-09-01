import { requirePermission } from "@kitsic/auth";
import { getLeadershipMessages } from "@/lib/platform-data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { MessagesPanel } from "@/features/messages/messages-panel";
import { ACTIVE_HEAD_ROLE_SLUGS, userHasHeadRole } from "@/lib/leadership-roles";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  let user;
  try {
    user = await requirePermission("messages.send");
  } catch {
    try {
      user = await requirePermission("messages.read");
    } catch {
      return <ForbiddenPage />;
    }
  }

  const canReadInbox = user.permissions.includes("messages.read");
  const canSend = user.permissions.includes("messages.send");
  const isLeadership = userHasHeadRole(user.roles);

  const inboxRoles = isLeadership && canReadInbox
    ? ACTIVE_HEAD_ROLE_SLUGS.filter((slug) => user.roles.includes(slug))
    : [];

  const messages = await getLeadershipMessages(
    inboxRoles,
    canSend && !isLeadership ? user.id : undefined,
  );

  return (
    <MessagesPanel
      messages={messages}
      canSend={canSend && !isLeadership}
      canReadInbox={canReadInbox && isLeadership}
    />
  );
}
