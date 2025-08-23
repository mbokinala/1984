import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { electronAuthSessions } from "../electron-auth-store/route";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://artful-duck-190.convex.cloud");

export async function POST(request: NextRequest) {
  try {
    const { electronAppId } = await request.json();

    if (!electronAppId) {
      return NextResponse.json({ error: "Missing electronAppId" }, { status: 400 });
    }

    // Check if we have a session for this electron app
    const session = electronAuthSessions.get(electronAppId);
    
    if (session) {
      // Verify the session is still valid
      const result = await convex.query(api.auth.verifySession, {
        sessionToken: session.sessionToken,
      });

      if (result.valid) {
        return NextResponse.json({
          authenticated: true,
          sessionToken: session.sessionToken,
          user: session.user,
        });
      } else {
        // Remove invalid session
        electronAuthSessions.delete(electronAppId);
      }
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error("Electron auth check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
