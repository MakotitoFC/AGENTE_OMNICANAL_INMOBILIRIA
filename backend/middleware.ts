import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const method = request.method;

    if (process.env.NODE_ENV === 'development') {
        console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);
    }

    if (method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': FRONTEND_URL,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-secret',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    const response = NextResponse.next();

    response.headers.set('Access-Control-Allow-Origin', FRONTEND_URL);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-secret');

    return response;
}

export const config = {
    matcher: '/api/:path*',
};