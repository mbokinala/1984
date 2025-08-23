import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/uploadRecording",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Step 1: Store the file
    const blob = await request.blob();
    const storageId = await ctx.storage.store(blob);

    const startTime = new URL(request.url).searchParams.get("startTime");
    const realWorldTime = new URL(request.url).searchParams.get(
      "realWorldTime"
    );

    const recordingId = await ctx.runMutation(api.recordings.createRecording, {
      storageId,
      startTime: startTime ? parseInt(startTime) : 0,
      realWorldTime: realWorldTime ? parseInt(realWorldTime) : 0,
    });

    await ctx.runMutation(api.workflows.kickoffWorkflow, {
      recordingId,
    });

    // Step 3: Return a response with the correct CORS headers
    return new Response(null, {
      status: 200,
      // CORS headers
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        Vary: "origin",
      }),
    });
  }),
});

export default http;
