import { Request, Response, NextFunction } from 'express';

export function validateInput(req: Request, res: Response, next: NextFunction) {
  // Add your input validation logic here
  next();
}
