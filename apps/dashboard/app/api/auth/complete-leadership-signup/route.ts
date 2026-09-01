import { runCompleteLeadershipSignup } from "@/lib/complete-leadership-signup";
import { toActionErrorMessage } from "@/lib/action-error";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await runCompleteLeadershipSignup(formData);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: toActionErrorMessage(err, "Leadership signup failed.") },
      { status: 500 },
    );
  }
}
