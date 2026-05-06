import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { getStats } from "@/lib/emails";
import { serializeEmail } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getStats();

    return NextResponse.json({
      ...stats,
      recentActivity: stats.recentActivity.map(serializeEmail),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
