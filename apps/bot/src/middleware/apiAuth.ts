import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function apiAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!config.apiSecret) {
    next();
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
