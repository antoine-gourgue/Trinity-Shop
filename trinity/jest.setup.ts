import 'whatwg-fetch';

import { NextRequest, NextResponse } from 'next/server';

if (typeof global.Request === 'undefined') {
    global.Request = NextRequest as unknown as typeof Request;
}
if (typeof global.Response === 'undefined') {
    global.Response = NextResponse as unknown as typeof Response;
}
