import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { getNextUnlabeledEmail } from "@/lib/emails";
import { serializeEmail } from "@/lib/serializers";
import { nextEmailQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { exclude } = nextEmailQuerySchema.parse({
      exclude: searchParams.get("exclude") ?? undefined,
    });

    const excludeIds = exclude
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    const email = await getNextUnlabeledEmail(excludeIds);

    return NextResponse.json({
      email: serializeEmail(email),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
