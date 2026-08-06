import { runCompleteSignup } from "@/lib/complete-signup";
import { toActionErrorMessage } from "@/lib/action-error";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await runCompleteSignup(formData);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: toActionErrorMessage(err, "Signup failed unexpectedly. Please try again.") },
      { status: 500 },
    );
  }
}
