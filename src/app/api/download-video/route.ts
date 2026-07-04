import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'video.mp4';

  if (!url) {
    return new Response('Missing url', { status: 400 });
  }

  const response = await fetch(url);
  if (!response.ok) {
    return new Response('Failed to fetch video', { status: response.status });
  }

  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
