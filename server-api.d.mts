import type { IncomingMessage, ServerResponse } from 'node:http';
export function searchMiddleware(req:IncomingMessage,res:ServerResponse,next:()=>void):Promise<void>;
