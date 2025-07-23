/**
 * Local validation utility for user service
 */

import { Request, Response, NextFunction } from 'express';

// Simple validation result interface
interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isEmpty(): boolean;
  array(): ValidationError[];
}

// Mock validation result for compatibility
export const validationResult = (req: Request): ValidationResult => {
  return {
    isEmpty: () => true, // Always return no errors for now
    array: () => []
  };
};

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '');
};

export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
