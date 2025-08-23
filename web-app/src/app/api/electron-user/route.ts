import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { electronAppId } = await request.json();

    console.log("Electron user request:", { electronAppId });

    if (!electronAppId) {
      return NextResponse.json({ error: "Missing electronAppId" }, { status: 400 });
    }

    // Get full user data from Convex
    const userData = await convex.query(api.electronAuth.getElectronUser, {
      electronAppId,
    });
    
    console.log("User data from Convex:", userData ? "Found" : "Not found");

    if (userData) {
      return NextResponse.json({
        success: true,
        user: userData
      });
    }

    return NextResponse.json({ success: false, user: null });
  } catch (error) {
    console.error("Electron user fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
