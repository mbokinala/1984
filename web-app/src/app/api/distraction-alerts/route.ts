import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const electronAppId = request.headers.get("x-electron-app-id");
    
    if (!electronAppId) {
      return NextResponse.json(
        { error: "Missing electron app ID" },
        { status: 400 }
      );
    }

    // Get unacknowledged distraction alerts from Convex
    const alerts = await convex.query(api.analysis.getUnacknowledgedAlerts, {
      electronAppId,
    });

    return NextResponse.json(alerts || []);
  } catch (error) {
    console.error("Error fetching distraction alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { alertId, acknowledged } = await request.json();
    
    if (!alertId) {
      return NextResponse.json(
        { error: "Missing alert ID" },
        { status: 400 }
      );
    }

    // Acknowledge the alert in Convex
    await convex.mutation(api.analysis.acknowledgeAlert, {
      alertId,
      acknowledged: acknowledged ?? true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alert" },
      { status: 500 }
    );
  }
}
