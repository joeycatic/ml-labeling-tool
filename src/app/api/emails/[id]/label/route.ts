import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { labelEmail } from "@/lib/emails";
import { serializeEmail } from "@/lib/serializers";
import { emailIdParamsSchema, labelEmailSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const { id } = emailIdParamsSchema.parse(params);
    const body = await request.json();
    const parsedBody = labelEmailSchema.parse(body);
    const email = await labelEmail(id, parsedBody);

    return NextResponse.json({
      email: serializeEmail(email),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
