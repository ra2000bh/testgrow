import { NextRequest } from "next/server";
import { tryVerifyUserByPayment } from "@/lib/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(request: NextRequest) {
  const telegramId = request.cookies.get("stellargrow_telegram_id")?.value;
  const decoded = telegramId ? decodeURIComponent(telegramId.trim()) : "";

  if (!decoded) {
    return new Response(JSON.stringify({ error: "Missing session" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ status: "listening" });

      for (let i = 0; i < 120; i += 1) {
        const result = await tryVerifyUserByPayment(decoded);
        if (result.kind === "verified") {
          send({ status: "verified" });
          controller.close();
          return;
        }
        if (result.kind === "error") {
          send({ status: "error", message: result.message });
          controller.close();
          return;
        }
        send({ status: "listening" });
        await sleep(4000);
      }

      send({ status: "timeout" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform, private, no-store",
    },
  });
}
