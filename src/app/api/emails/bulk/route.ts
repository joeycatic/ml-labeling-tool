import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { bulkUpdateEmails } from "@/lib/emails";
import { bulkUpdateEmailsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = bulkUpdateEmailsSchema.parse(body);
    const result = await bulkUpdateEmails(parsedBody);

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
