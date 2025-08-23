import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { electronAppId } = await request.json();

    console.log("Electron auth check request:", { electronAppId });

    if (!electronAppId) {
      return NextResponse.json({ error: "Missing electronAppId" }, { status: 400 });
    }

    // Check if electron app is linked to a user
    const authData = await convex.query(api.electronAuth.checkElectronAuth, {
      electronAppId,
    });
    
    console.log("Auth data from Convex:", authData);

    return NextResponse.json(authData);
  } catch (error) {
    console.error("Electron auth check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}