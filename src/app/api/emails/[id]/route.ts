import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { getEmailById, updateEmail } from "@/lib/emails";
import { serializeEmail } from "@/lib/serializers";
import { emailIdParamsSchema, updateEmailSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const { id } = emailIdParamsSchema.parse(params);
    const email = await getEmailById(id);

    if (!email) {
      return NextResponse.json({ error: "Email not found." }, { status: 404 });
    }

    return NextResponse.json({
      email: serializeEmail(email),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const { id } = emailIdParamsSchema.parse(params);
    const body = await request.json();
    const parsedBody = updateEmailSchema.parse(body);
    const email = await updateEmail(id, parsedBody);

    return NextResponse.json({
      email: serializeEmail(email),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
