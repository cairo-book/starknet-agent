import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Environment variables (server-only)
const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001'
    : process.env.CAIRO_CODER_API_BASE_URL;
const API_KEY = process.env.CAIRO_CODER_API_KEY;
const API_KEY_HEADER = 'x-api-key';

function buildTargetUrl(pathSegments: string[]): string {
  if (!API_BASE) {
    throw new Error('CAIRO_CODER_API_BASE_URL is not set');
  }
  const base = API_BASE.replace(/\/$/, '');
  const path = pathSegments.join('/');
  return `${base}/${path}`;
}

function buildUpstreamHeaders(req: NextRequest): HeadersInit {
  const headers = new Headers();

  // Copy whitelisted incoming headers
  // Avoid forwarding hop-by-hop or sensitive headers like host, connection, etc.
  const forwardHeaders = [
    'content-type',
    'accept',
    'accept-encoding',
    'user-agent',
    'x-conversation-id',
  ];
  forwardHeaders.forEach((h) => {
    const v = req.headers.get(h);
    if (v) headers.set(h, v);
  });

  if (!API_KEY) {
    throw new Error('CAIRO_CODER_API_KEY is not set');
  }
  headers.set(API_KEY_HEADER, API_KEY);
  return headers;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    let url = buildTargetUrl(path);
    const search = req.nextUrl.search;
    if (search) {
      url += search;
    }

    const method = req.method;
    const headers = buildUpstreamHeaders(req);

    // Read body only for methods that can have a body
    let body: string | undefined;
    if (!['GET', 'HEAD'].includes(method)) {
      // Pass-through body as text; upstream expects JSON for our use-cases
      body = await req.text();
    }

    const upstream = await fetch(url, {
      method,
      headers,
      body,
      // Ensure no caching and allow streaming
      cache: 'no-store',
    });

    // Build response headers to pass through relevant ones
    const respHeaders = new Headers();
    const passthroughHeaders = [
      'content-type',
      'cache-control',
      'content-language',
      'x-content-type-options',
    ];
    passthroughHeaders.forEach((h) => {
      const v = upstream.headers.get(h);
      if (v) respHeaders.set(h, v);
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : 'Proxy error';
    // Provide slightly more context for debugging (safe; no secrets)
    const info = {
      error: 'Bad Gateway',
      message: msg,
      method: req.method,
      path: (await ctx.params).path?.join('/'),
      query: req.nextUrl.search || '',
    };
    return new Response(JSON.stringify(info), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, ctx);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, ctx);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, ctx);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, ctx);
}
