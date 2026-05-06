import { exportRowsToCsv, getExportRows } from "@/lib/emails";
import { exportQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { includeSkipped } = exportQuerySchema.parse({
    includeSkipped: searchParams.get("includeSkipped") ?? undefined,
  });
  const rows = await getExportRows(includeSkipped);
  const csv = exportRowsToCsv(rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="emails-${includeSkipped ? "with-skip" : "ml"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
