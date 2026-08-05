import { requirePermission } from "@kitsic/auth";
import { getLeadershipMessages } from "@/lib/platform-data";
import { ForbiddenPage } from "@/components/forbidden-page";
import { MessagesPanel } from "@/features/messages/messages-panel";

export const metadata = { title: "Messages" };

const LEADERSHIP_SLUGS = ["president", "vice_president", "secretary", "treasurer"];

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
  const isLeadership = user.roles.some((role) => LEADERSHIP_SLUGS.includes(role));

  const messages = await getLeadershipMessages(
    isLeadership && canReadInbox ? LEADERSHIP_SLUGS.filter((slug) => user.roles.includes(slug)) : [],
    canSend && !isLeadership ? user.id : undefined,
  );

  return <MessagesPanel messages={messages} canSend={canSend && !isLeadership} canReadInbox={canReadInbox && isLeadership} />;
}
