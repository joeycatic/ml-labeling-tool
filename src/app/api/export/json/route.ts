import { NextResponse } from "next/server";

import { getExportRows } from "@/lib/emails";
import { exportQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { includeSkipped } = exportQuerySchema.parse({
    includeSkipped: searchParams.get("includeSkipped") ?? undefined,
  });
  const rows = await getExportRows(includeSkipped);

  return NextResponse.json(rows, {
    headers: {
      "Content-Disposition": `attachment; filename="emails-${includeSkipped ? "with-skip" : "ml"}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
