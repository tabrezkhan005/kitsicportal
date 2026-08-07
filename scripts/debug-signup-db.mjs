import { config } from "dotenv";
import { resolve } from "node:path";
import postgres from "postgres";

config({ path: resolve(".env.local") });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const cols = await sql`
  SELECT column_name, is_nullable, column_default, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
  ORDER BY ordinal_position
`;
console.log("users columns:");
for (const row of cols) {
  console.log(`  ${row.column_name} nullable=${row.is_nullable} default=${row.column_default ?? "none"}`);
}

try {
  const [row] = await sql`SELECT public.generate_member_id() AS id`;
  console.log("generate_member_id:", row?.id);
} catch (error) {
  console.log("generate_member_id ERROR:", error.message);
}

const [fn] = await sql`
  SELECT pg_get_functiondef(p.oid) AS def
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
`;
console.log("handle_new_user defined:", Boolean(fn?.def));
if (fn?.def) console.log(String(fn.def).slice(0, 1000));

const fakeId = "00000000-0000-4000-8000-000000000099";
await sql`DELETE FROM user_roles WHERE user_id = ${fakeId}`;
await sql`DELETE FROM users WHERE id = ${fakeId}`;

try {
  await sql`
    INSERT INTO public.users (id, email, full_name, member_id)
    VALUES (${fakeId}, 'manual-test@local', 'Manual Test', public.generate_member_id())
  `;
  console.log("manual users insert with member_id: OK");
} catch (error) {
  console.log("manual users insert ERROR:", error.message);
}

await sql`DELETE FROM user_roles WHERE user_id = ${fakeId}`;
await sql`DELETE FROM users WHERE id = ${fakeId}`;

await sql.end();
