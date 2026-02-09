import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token } = (await request.json()) as { token?: string };

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { ok: false, error: "Token is required." },
      { status: 400 }
    );
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = (await response.json()) as { ok?: boolean; result?: { username?: string; first_name?: string } };

  if (!response.ok || !data?.ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid token. Please check and try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    username: data.result?.username ?? null,
    name: data.result?.first_name ?? null,
  });
}
