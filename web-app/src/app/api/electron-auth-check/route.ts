import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { electronAuthStore } from "@/lib/electron-auth-store";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://artful-duck-190.convex.cloud");

export async function POST(request: NextRequest) {
  try {
    const { electronAppId } = await request.json();

    console.log("Electron auth check request:", { electronAppId });

    if (!electronAppId) {
      return NextResponse.json({ error: "Missing electronAppId" }, { status: 400 });
    }

    // Check if we have a session for this electron app
    const session = electronAuthStore.get(electronAppId);
    
    if (session) {
      console.log("Found session, verifying with Convex...");
      
      // Verify the session is still valid
      const result = await convex.query(api.auth.verifySession, {
        sessionToken: session.sessionToken,
      });

      console.log("Convex verification result:", result);

      if (result.valid) {
        return NextResponse.json({
          authenticated: true,
          sessionToken: session.sessionToken,
          user: session.user,
        });
      } else {
        // Remove invalid session
        electronAuthStore.delete(electronAppId);
      }
    } else {
      console.log("No session found for electronAppId:", electronAppId);
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
