import { NextRequest, NextResponse } from "next/server";
import { electronAuthStore } from "@/lib/electron-auth-store";

export async function POST(request: NextRequest) {
  try {
    const { electronAppId, sessionToken, user } = await request.json();

    console.log("Electron auth store request:", { electronAppId, hasToken: !!sessionToken, hasUser: !!user });

    if (!electronAppId || !sessionToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Store the session
    electronAuthStore.set(electronAppId, sessionToken, user);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Electron auth store error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
