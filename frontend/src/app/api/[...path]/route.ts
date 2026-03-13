/**
 * Catch-all API proxy route.
 *
 * Forwards ALL /api/* requests to the Python backend with no timeout limit.
 * This replaces the next.config.ts rewrite for API routes, which has a hard
 * 30-second proxy timeout that breaks long-running LLM calls (Genesis, Evaluation).
 */

import { NextRequest, NextResponse } from "next/server";

// Remove the Next.js default timeout — LLM calls can take 30s–3min
export const maxDuration = 300; // 5-minute ceiling
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const backendUrl = `${BACKEND}/api/${path.join("/")}`;

    // Forward query string if present
    const { search } = new URL(req.url);
    const targetUrl = search ? `${backendUrl}${search}` : backendUrl;

    const headers = new Headers(req.headers);
    headers.delete("host");

    console.log("[API Proxy] Forwarding to:", targetUrl);
    console.log("[API Proxy] Headers:", Array.from(headers.entries()));

    try {
        // AbortSignal.timeout overrides Node/undici's default 30s headersTimeout.
        // The evaluation pipeline can take 3–5 min; we allow up to 10 min.
        const backendRes = await fetch(targetUrl, {
            method: req.method,
            headers,
            body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
            // @ts-expect-error — Node.js fetch supports duplex for streaming bodies
            duplex: "half",
            signal: AbortSignal.timeout(600_000), // 10-minute ceiling
        });

        // Stream the response body back
        const responseHeaders = new Headers(backendRes.headers);
        // Ensure CORS headers are forwarded cleanly
        responseHeaders.delete("transfer-encoding");

        return new NextResponse(backendRes.body, {
            status: backendRes.status,
            statusText: backendRes.statusText,
            headers: responseHeaders,
        });
    } catch (err) {
        console.error("[API Proxy] Backend unreachable:", err);
        return NextResponse.json(
            { detail: "Backend unreachable. Is the FastAPI server running?" },
            { status: 502 }
        );
    }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
