import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { listEmails } from "@/lib/emails";
import { serializeEmail } from "@/lib/serializers";
import { listEmailsQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = listEmailsQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      label: searchParams.get("label") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      emailId: searchParams.get("emailId") ?? undefined,
    });
    const result = await listEmails(parsed);

    return NextResponse.json({
      ...result,
      emails: result.emails.map(serializeEmail),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
