/**
 * Authentication Middleware
 * 
 * Handles authentication checks and cookie-based session management.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Check if request has valid authentication cookie
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const authCookie = req.cookies?.auth;
  
  if (authCookie === "true") {
    return next();
  }
  
  return res.status(401).json({ 
    error: "Unauthorized",
    message: "Authentication required" 
  });
}

/**
 * Optional authentication - doesn't block request but adds auth info
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authCookie = req.cookies?.auth;
  (req as any).isAuthenticated = authCookie === "true";
  next();
}
