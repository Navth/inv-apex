/**
 * Request Validation Middleware
 * 
 * Provides validation utilities using Zod schemas.
 */

import type { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema } from "zod";

/**
 * Middleware factory for validating request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }
      return res.status(400).json({ error: "Invalid request body" });
    }
  };
}

/**
 * Middleware factory for validating query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid query parameters",
          details: error.errors,
        });
      }
      return res.status(400).json({ error: "Invalid query parameters" });
    }
  };
}

/**
 * Middleware factory for validating route parameters
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid route parameters",
          details: error.errors,
        });
      }
      return res.status(400).json({ error: "Invalid route parameters" });
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /** Month parameter in MM-YYYY format */
  month: z.string().regex(/^\d{2}-\d{4}$/, "Month must be in MM-YYYY format"),
  
  /** Employee ID parameter */
  empId: z.string().min(1, "Employee ID is required"),
  
  /** Numeric ID parameter */
  id: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().positive()),
  
  /** Optional month query */
  monthQuery: z.object({
    month: z.string().regex(/^\d{2}-\d{4}$/).optional(),
  }),
};
