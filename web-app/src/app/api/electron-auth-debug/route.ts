import { NextRequest, NextResponse } from "next/server";
import { electronAuthStore } from "@/lib/electron-auth-store";

export async function GET(request: NextRequest) {
  const sessions = electronAuthStore.getAll();
  
  return NextResponse.json({
    totalSessions: sessions.length,
    sessions: sessions.map(([id, data]) => ({
      electronAppId: id,
      hasToken: !!data.sessionToken,
      hasUser: !!data.user,
      timestamp: new Date(data.timestamp).toISOString(),
    }))
  });
}
