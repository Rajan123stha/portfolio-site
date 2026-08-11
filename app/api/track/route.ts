import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db";
import { pageViews } from "@/db/schema";
import {
  clientIp,
  detectDevice,
  hashVisitor,
  isBot,
  normalisePath,
  referrerHost,
} from "@/lib/analytics/collect";

/**
 * Page-view collector.
 *
 * A route handler rather than a server action, because the browser sends this
 * with `navigator.sendBeacon`, which can only issue a plain POST and needs the
 * request to survive the page being closed.
 *
 * It always answers 204, whatever happens. Analytics is the least important
 * thing on the page: a failure here must never surface as a console error to a
 * visitor, and the response carries nothing worth inspecting.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  try {
    // Do Not Track is a clear, explicit request. Honour it.
    if (request.headers.get("dnt") === "1") return noContent();

    const userAgent = request.headers.get("user-agent");
    if (isBot(userAgent)) return noContent();

    const body = (await request.json().catch(() => null)) as {
      path?: unknown;
      referrer?: unknown;
    } | null;

    const path = normalisePath(body?.path);
    if (!path) return noContent();

    // The admin panel is the owner's own traffic; counting it would distort
    // every number on the dashboard that reads from this table.
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return noContent();
    }

    await db.insert(pageViews).values({
      path,
      referrerHost: referrerHost(
        typeof body?.referrer === "string" ? body.referrer : null,
        request.headers.get("host"),
      ),
      // Set by the hosting platform's edge; absent when self-hosted.
      country:
        request.headers.get("x-vercel-ip-country") ??
        request.headers.get("cf-ipcountry") ??
        null,
      device: detectDevice(userAgent),
      visitorHash: hashVisitor(clientIp(request.headers), userAgent),
    });

    return noContent();
  } catch (error) {
    console.error("[analytics] failed to record page view", error);
    return noContent();
  }
}
