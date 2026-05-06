import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api";
import { importEmails } from "@/lib/import-emails";
import { parseMailboxImport } from "@/lib/mail-import";
import { importRequestSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      const format = formData.get("format");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
      }

      if (format !== "eml" && format !== "mbox") {
        return NextResponse.json({ error: "Unsupported mailbox format." }, { status: 400 });
      }

      const emails = await parseMailboxImport({
        format,
        fileName: file.name,
        content: await file.text(),
      });
      const result = await importEmails(emails);

      return NextResponse.json(result);
    }

    const body = await request.json();
    const parsed = importRequestSchema.parse(body);
    const emails =
      "emails" in parsed
        ? parsed.emails
        : await parseMailboxImport({
            format: parsed.format,
            fileName: parsed.fileName,
            content: parsed.content,
          });
    const result = await importEmails(emails);

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
