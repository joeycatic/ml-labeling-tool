import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import {
  buildImportPlan,
  parseImportRequest,
  serializeImportPlan,
} from "@/lib/import-emails";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await parseImportRequest(request);
    const plan = await buildImportPlan(payload);

    return NextResponse.json(serializeImportPlan(plan));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
