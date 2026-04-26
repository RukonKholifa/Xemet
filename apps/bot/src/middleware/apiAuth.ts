import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function apiAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!config.apiSecret) {
    console.warn('WARNING: API_SECRET is not set — all API requests will be rejected.');
    res.status(503).json({ error: 'Service unavailable: API_SECRET is not configured' });
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== config.apiSecret) {
    res.status(403).json({ error: 'Forbidden: invalid API secret' });
    return;
  }

  next();
}
