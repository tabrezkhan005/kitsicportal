import "./load-env";
import { createAdminClient } from "./supabase-admin";
import { randomBytes } from "node:crypto";

async function seedExtended() {
  const supabase = createAdminClient();

  const { data: users } = await supabase.from("users").select("id, email").limit(10);
  if (!users?.length) {
    console.log("No users found.");
    process.exit(0);
  }

  const president = users.find((u) => u.email.includes("president")) ?? users[0];
  const techHead = users.find((u) => u.email.includes("techhead")) ?? users[1];
  const member = users.find((u) => u.email.includes("member")) ?? users[users.length - 1];

  console.log("Seeding projects...");
  await supabase.from("project_members").delete().neq("project_id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { data: projects } = await supabase.from("projects").insert([
    { name: "Club Website v2", description: "Redesign public website with CMS integration", status: "in_progress", progress: 65, domain: "Technical", repository_url: "https://github.com/kitsic/website", lead_id: techHead.id, created_by: president.id, is_public: true },
    { name: "AI Workshop Series", description: "Monthly workshops on ML and GenAI", status: "planning", progress: 20, domain: "Technical", lead_id: techHead.id, created_by: president.id, is_public: true },
    { name: "Smart Attendance System", description: "QR + Google Meet attendance tracker", status: "in_progress", progress: 80, domain: "Technical", lead_id: techHead.id, created_by: president.id, is_public: false },
    { name: "Annual Hackathon", description: "24-hour innovation hackathon", status: "completed", progress: 100, domain: "Events", lead_id: president.id, created_by: president.id, is_public: true },
  ]).select("id");

  if (projects) {
    for (const p of projects) {
      await supabase.from("project_members").insert([
        { project_id: p.id, user_id: techHead.id, role: "lead" },
        { project_id: p.id, user_id: member.id, role: "member" },
      ]);
    }
  }

  console.log("Seeding finance...");
  await supabase.from("expenses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("budgets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("sponsors").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  await supabase.from("budgets").insert([
    { name: "Annual Club Budget", total_amount: 150000, spent_amount: 87500, fiscal_year: "2025-26" },
    { name: "Events Fund", total_amount: 50000, spent_amount: 22000, fiscal_year: "2025-26" },
    { name: "Equipment Fund", total_amount: 30000, spent_amount: 18500, fiscal_year: "2025-26" },
  ]);

  await supabase.from("expenses").insert([
    { title: "Hackathon prizes", amount: 15000, category: "Events", status: "approved", paid_by: president.id, approved_by: president.id },
    { title: "Workshop materials", amount: 3500, category: "Resources", status: "approved", paid_by: president.id, approved_by: president.id },
    { title: "Domain renewal", amount: 1200, category: "Technical", status: "approved", paid_by: techHead.id, approved_by: president.id },
    { title: "Banner printing", amount: 2800, category: "Marketing", status: "pending", paid_by: president.id },
    { title: "Microphone set", amount: 8500, category: "Equipment", status: "approved", paid_by: president.id, approved_by: president.id },
  ]);

  await supabase.from("sponsors").insert([
    { name: "TechCorp Solutions", contact_email: "partnerships@techcorp.com", amount: 50000, tier: "gold", website: "https://techcorp.com" },
    { name: "InnovateLabs", contact_email: "hello@innovatelabs.io", amount: 25000, tier: "silver", website: "https://innovatelabs.io" },
    { name: "Campus Cafe", contact_email: "events@campuscafe.in", amount: 10000, tier: "bronze" },
  ]);

  console.log("Seeding inventory...");
  await supabase.from("inventory_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("inventory_items").insert([
    { name: "Projector Epson EB-X06", category: "AV Equipment", quantity: 2, condition: "good", location: "Storage Room A" },
    { name: "Wireless Microphone Set", category: "AV Equipment", quantity: 1, condition: "excellent", location: "Storage Room A", assigned_to: president.id },
    { name: "Extension Cords (5m)", category: "Electrical", quantity: 10, condition: "good", location: "Storage Room B" },
    { name: "Club Banner (6x3 ft)", category: "Marketing", quantity: 3, condition: "good", location: "Office" },
    { name: "Arduino Starter Kits", category: "Electronics", quantity: 15, condition: "good", location: "Lab 3" },
    { name: "Folding Tables", category: "Furniture", quantity: 8, condition: "fair", location: "Store Room" },
  ]);

  console.log("Seeding certificates...");
  await supabase.from("certificates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  for (const u of users) {
    await supabase.from("certificates").insert([
      { user_id: u.id, title: "Innovation Club Member", type: "membership", issued_by: president.id },
      { user_id: u.id, title: "Annual Hackathon Participant", type: "participation", issued_by: president.id },
    ]);
  }

  console.log("Seeding system settings...");
  await supabase.from("system_settings").upsert([
    { key: "club_name", value: { name: "KITS Innovation Club" } },
    { key: "academic_year", value: { year: "2025-26" } },
    { key: "notifications", value: { email: true, push: true, reminders: true } },
    { key: "integrations", value: { google_workspace: false, public_api: true } },
  ], { onConflict: "key" });

  console.log("Seeding demo API key...");
  await supabase.from("api_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const demoKey = `kitsic_${randomBytes(16).toString("hex")}`;
  await supabase.from("api_keys").insert({
    name: "Public Website",
    key_prefix: demoKey.slice(0, 12),
    key_hash: demoKey,
    scopes: ["events:read", "projects:read", "team:read"],
    created_by: president.id,
  });
  console.log(`Demo API key (save this): ${demoKey}`);

  console.log("Seeding QR sessions...");
  await supabase.from("qr_sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { data: recentMeetings } = await supabase.from("meetings").select("id").limit(1);
  const { data: recentEvents } = await supabase.from("events").select("id").limit(1);
  if (recentMeetings?.[0]) {
    await supabase.from("qr_sessions").insert({
      meeting_id: recentMeetings[0].id,
      code: randomBytes(4).toString("hex").toUpperCase(),
      expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
      created_by: president.id,
    });
  }
  if (recentEvents?.[0]) {
    await supabase.from("qr_sessions").insert({
      event_id: recentEvents[0].id,
      code: randomBytes(4).toString("hex").toUpperCase(),
      expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
      created_by: president.id,
    });
  }

  console.log("Extended seed complete.");
}

seedExtended().catch((e) => {
  console.error(e);
  process.exit(1);
});
