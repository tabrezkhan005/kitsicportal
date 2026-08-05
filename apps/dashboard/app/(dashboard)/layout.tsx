import { redirect } from "next/navigation";
import { getSessionUser, getNavigationForUser } from "@kitsic/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const navigation = await getNavigationForUser(user.id);

  return (
    <DashboardShell navigation={navigation} user={user}>
      {children}
    </DashboardShell>
  );
}
