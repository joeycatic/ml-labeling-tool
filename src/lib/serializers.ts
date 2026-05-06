import type { Email } from "@prisma/client";

export type EmailRecord = Omit<
  Email,
  "bodyHtml" | "receivedAt" | "labeledAt" | "createdAt" | "updatedAt"
> & {
  receivedAt: string;
  labeledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeEmail(email: Email | null): EmailRecord | null {
  if (!email) {
    return null;
  }

  const { bodyHtml, ...rest } = email;
  void bodyHtml;

  return {
    ...rest,
    receivedAt: rest.receivedAt.toISOString(),
    labeledAt: rest.labeledAt?.toISOString() ?? null,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
  };
}
