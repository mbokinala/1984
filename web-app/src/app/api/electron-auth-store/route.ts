import { NextRequest, NextResponse } from "next/server";

// Store temporary auth sessions in memory (in production, use Redis or similar)
const electronAuthSessions = new Map<string, { sessionToken: string; user: any; timestamp: number }>();

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of electronAuthSessions.entries()) {
    if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutes
      electronAuthSessions.delete(key);
    }
  }
}, 60 * 1000); // Check every minute

export async function POST(request: NextRequest) {
  try {
    const { electronAppId, sessionToken, user } = await request.json();

    if (!electronAppId || !sessionToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Store the session
    electronAuthSessions.set(electronAppId, {
      sessionToken,
      user,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Electron auth store error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export the sessions map for use in the check endpoint
export { electronAuthSessions };
