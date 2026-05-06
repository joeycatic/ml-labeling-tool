import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request.",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      error: "Unknown server error.",
    },
    { status: 500 },
  );
}
