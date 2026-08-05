import "./load-env";
import { createAdminClient } from "./supabase-admin";

async function seedModules() {
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("Skipping demo module seed. Set SEED_DEMO_DATA=true for local demo content.");
    process.exit(0);
  }

  const supabase = createAdminClient();

  const { data: users } = await supabase.from("users").select("id, email").limit(10);
  if (!users?.length) {
    console.log("No users found. Run db:seed:demo first.");
    process.exit(0);
  }

  const president = users.find((u) => u.email.includes("president")) ?? users[0];
  const member = users.find((u) => u.email.includes("member")) ?? users[users.length - 1];

  console.log("Seeding task board cards...");
  const boardId = "a0000000-0000-0000-0000-000000000001";
  const listTodo = "a0000000-0000-0000-0000-000000000011";
  const listProgress = "a0000000-0000-0000-0000-000000000012";
  const listReview = "a0000000-0000-0000-0000-000000000013";
  const listDone = "a0000000-0000-0000-0000-000000000014";

  await supabase.from("task_cards").delete().eq("board_id", boardId);

  const demoCards = [
    { list_id: listProgress, title: "Prepare hackathon proposal", position: 0, created_by: president.id },
    { list_id: listTodo, title: "Design event posters", position: 0, created_by: president.id },
    { list_id: listReview, title: "Update club documentation", position: 0, created_by: president.id },
    { list_id: listDone, title: "Venue booking for workshop", position: 0, created_by: president.id },
    { list_id: listProgress, title: "Social media campaign Q1", position: 1, created_by: president.id },
    { list_id: listTodo, title: "Member onboarding guide", position: 1, created_by: president.id },
  ].map((c) => ({ ...c, board_id: boardId }));

  const { data: insertedCards } = await supabase.from("task_cards").insert(demoCards).select("id, title, list_id");

  if (insertedCards?.length) {
    const labelTechnical = "a0000000-0000-0000-0000-000000000021";
    const labelMarketing = "a0000000-0000-0000-0000-000000000024";
    await supabase.from("task_card_labels").insert([
      { card_id: insertedCards[0].id, label_id: labelTechnical },
      { card_id: insertedCards[4].id, label_id: labelMarketing },
    ]);
    await supabase.from("task_card_members").insert(
      insertedCards.slice(0, 4).map((c) => ({ card_id: c.id, user_id: member.id })),
    );
    const { data: checklist } = await supabase
      .from("task_checklists")
      .insert({ card_id: insertedCards[0].id, title: "Hackathon prep", position: 0 })
      .select("id")
      .single();
    if (checklist) {
      await supabase.from("task_checklist_items").insert([
        { checklist_id: checklist.id, title: "Finalize theme", is_completed: true, position: 0 },
        { checklist_id: checklist.id, title: "Confirm sponsors", is_completed: false, position: 1 },
        { checklist_id: checklist.id, title: "Book judges", is_completed: false, position: 2 },
      ]);
    }
  }

  console.log("Seeding legacy tasks...");
  const tasks = [
    { title: "Prepare hackathon proposal", status: "in_progress", priority: "high", assigned_to: member.id, assigned_by: president.id, progress: 60, category: "Technical" },
    { title: "Design event posters", status: "todo", priority: "medium", assigned_to: member.id, assigned_by: president.id, progress: 0, category: "Design" },
    { title: "Update club documentation", status: "under_review", priority: "low", assigned_to: member.id, assigned_by: president.id, progress: 90, category: "Technical" },
    { title: "Venue booking for workshop", status: "completed", priority: "high", assigned_to: member.id, assigned_by: president.id, progress: 100, category: "Logistics" },
    { title: "Social media campaign Q1", status: "in_progress", priority: "medium", assigned_to: member.id, assigned_by: president.id, progress: 45, category: "Marketing" },
    { title: "Member onboarding guide", status: "todo", priority: "low", assigned_to: member.id, assigned_by: president.id, progress: 10, category: "Resources" },
  ];

  await supabase.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("tasks").insert(tasks);

  console.log("Seeding events...");
  const now = new Date();
  const events = [
    { title: "Innovation Summit 2026", description: "Annual club showcase", location: "Main Auditorium", starts_at: new Date(now.getTime() + 7 * 86400000).toISOString(), status: "upcoming", is_public: true, created_by: president.id },
    { title: "Web Dev Workshop", description: "Next.js fundamentals", location: "Lab 3", starts_at: new Date(now.getTime() + 3 * 86400000).toISOString(), status: "upcoming", is_public: false, created_by: president.id },
    { title: "Ideathon Finals", description: "Final pitching round", location: "Seminar Hall", starts_at: new Date(now.getTime() - 14 * 86400000).toISOString(), status: "completed", is_public: true, created_by: president.id },
  ];

  await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { data: insertedEvents } = await supabase.from("events").insert(events).select("id");

  console.log("Seeding meetings...");
  const meetings = [
    {
      title: "Weekly Core Team Sync",
      description: "Department heads meeting",
      starts_at: new Date(now.getTime() + 2 * 86400000).toISOString(),
      ends_at: new Date(now.getTime() + 2 * 86400000 + 3600000).toISOString(),
      meet_link: "https://meet.google.com/abc-defg-hij",
      status: "scheduled",
      created_by: president.id,
    },
    {
      title: "Project Review",
      description: "Q1 project status",
      starts_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
      ends_at: new Date(now.getTime() - 3 * 86400000 + 3600000).toISOString(),
      meet_link: "https://meet.google.com/klm-nopq-rst",
      status: "completed",
      created_by: president.id,
    },
  ];

  await supabase.from("meetings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { data: insertedMeetings } = await supabase.from("meetings").insert(meetings).select("id");

  console.log("Seeding attendance...");
  await supabase.from("attendance_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const u of users) {
    await supabase.from("attendance_records").insert([
      { user_id: u.id, meeting_id: insertedMeetings?.[1]?.id, status: "present", joined_at: new Date(now.getTime() - 3 * 86400000).toISOString(), duration_minutes: 55 },
      { user_id: u.id, event_id: insertedEvents?.[2]?.id, status: Math.random() > 0.2 ? "present" : "absent", joined_at: new Date(now.getTime() - 14 * 86400000).toISOString(), duration_minutes: 120 },
    ]);
  }

  console.log("Seeding notifications...");
  await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const u of users.slice(0, 5)) {
    await supabase.from("notifications").insert([
      { user_id: u.id, title: "New task assigned", message: "You have a new task waiting for review.", type: "task" },
      { user_id: u.id, title: "Meeting reminder", message: "Weekly Core Team Sync starts in 2 days.", type: "meeting", is_read: true },
    ]);
  }

  console.log("Seeding announcements...");
  await supabase.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("announcements").insert([
    { title: "Welcome to KITSIC Dashboard", content: "The Innovation Club platform is now live. Explore tasks, events, and analytics.", is_pinned: true, created_by: president.id },
    { title: "Hackathon Registration Open", content: "Register before Friday for the upcoming internal hackathon.", is_pinned: false, created_by: president.id },
  ]);

  console.log("Seeding learning modules...");
  await supabase.from("learning_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("learning_modules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("learning_modules").insert([
    {
      title: "Innovation Club Basics",
      description: "Quick quiz on KITSIC — earn up to 55 points with a perfect score.",
      type: "quiz",
      questions: [
        { id: "q1", prompt: "What does KITSIC stand for?", answer: "KITS Innovation Club" },
        { id: "q2", prompt: "What is the club's focus?", answer: "Innovation" },
      ],
      is_published: true,
      created_by: president.id,
    },
    {
      title: "Git & GitHub Essentials",
      description: "Test your version control knowledge — 3 questions, up to 70 points.",
      type: "quiz",
      questions: [
        { id: "q1", prompt: "What command creates a new Git repository?", answer: "git init" },
        { id: "q2", prompt: "What does git push do?", answer: "upload commits" },
        { id: "q3", prompt: "What is a pull request used for?", answer: "code review" },
      ],
      is_published: true,
      created_by: president.id,
    },
    {
      title: "Event Proposal Write-up",
      description: "Draft a one-paragraph event proposal for the club. Earn 40 points on submission.",
      type: "assignment",
      questions: [
        { id: "a1", prompt: "Describe your proposed event: name, audience, and expected outcome." },
      ],
      due_date: new Date(now.getTime() + 14 * 86400000).toISOString(),
      is_published: true,
      created_by: president.id,
    },
  ]);

  console.log("Module seed complete.");
}

seedModules().catch((error) => {
  console.error("Module seed failed:", error);
  process.exit(1);
});
