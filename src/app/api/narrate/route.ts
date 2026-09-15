import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { getGeminiKey } from "@/lib/keys/store";
import { narrate, NarrationError, NARRATION_MODEL } from "@/lib/narration/gemini";
import type { Analysis } from "@/lib/engine";

/**
 * The written read.
 *
 * Deliberately a second request rather than part of /api/scan. The scan is
 * deterministic and fast; this one waits on a model and on the user's own
 * quota. Splitting them means the levels are on screen in under half a second
 * and the prose arrives underneath when it is ready -- and a model failure
 * costs the paragraph, never the setup.
 *
 * It also means this endpoint is never reached for a pair with no setup worth
 * describing, which is most of them.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = await getGeminiKey(user.id);
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Add your Gemini API key in Profile to get a written read.",
        code: "NO_API_KEY",
      },
      { status: 428 }
    );
  }

  const body = await request.json().catch(() => null);
  const analysis = body?.analysis as Analysis | undefined;

  // The client sends back the analysis it was given rather than the server
  // recomputing it, so the prose always describes the numbers on screen. It is
  // a narration input only -- nothing here is trusted enough to act on.
  if (!analysis?.symbol || !analysis?.timeframe || !Array.isArray(analysis?.near)) {
    return NextResponse.json({ error: "Malformed analysis" }, { status: 400 });
  }

  try {
    const narrative = await narrate(analysis, apiKey);

    return NextResponse.json({ narrative, model: NARRATION_MODEL });
  } catch (error) {
    if (error instanceof NarrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    // Never let a provider error message reach the client: it can echo the
    // request, and the request carried the user's key in its URL.
    console.error("narration failed for", user.id, error);
    return NextResponse.json({ error: "Could not write the analysis" }, { status: 502 });
  }
}
