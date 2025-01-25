import { z } from "zod";
import { type Request, type Response, type NextFunction } from "express";

// Generic validation middleware creator
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors.map(err => ({
            path: err.path.join("."),
            message: err.message
          }))
        });
      }
      return next(error);
    }
  };
};

// Common validation schemas
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
  }),
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid ID format"),
  }),
});

// Document related schemas
export const uploadDocumentSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Document name is required"),
    type: z.string().min(1, "Document type is required"),
    size: z.number().positive("File size must be positive"),
  }),
});

// Project related schemas
export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Project name is required"),
    description: z.string().optional(),
    clientId: z.number().positive("Client ID must be positive"),
    status: z.enum(["active", "pending", "completed"]),
  }),
});

// Client related schemas
export const updateClientSchema = z.object({
  body: z.object({
    company: z.string().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    email: z.string().email("Invalid email").optional(),
  }),
  params: z.object({
    id: z.string().regex(/^\d+$/, "Invalid client ID format"),
  }),
});
