import type { IncomingMessage, ServerResponse } from 'http';
import { handleApiRequest } from '../src/server/apiRouter';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return handleApiRequest(req, res);
}
