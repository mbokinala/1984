import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { electronAppId } = await request.json();

    if (!electronAppId) {
      return NextResponse.json({ error: "Missing electronAppId" }, { status: 400 });
    }

    // Clear the electron session
    await convex.mutation(api.electronAuth.clearElectronSession, {
      electronAppId,
    });

    console.log(`Cleared electron session for ${electronAppId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing electron session:", error);
    return NextResponse.json(
      { success: false },
      { status: 200 } // Return 200 to avoid breaking the flow
    );
  }
}
