import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errors';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export function validateRequest(schema: ValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        await validateObject(req.body, schema.body, 'body');
      }
      if (schema.query) {
        await validateObject(req.query, schema.query, 'query');
      }
      if (schema.params) {
        await validateObject(req.params, schema.params, 'params');
      }
      if (schema.headers) {
        await validateObject(req.headers, schema.headers, 'headers');
      }
      next();
    } catch (error) {
      next(new CustomError('Invalid request data', 'VALIDATION_ERROR', 400));
    }
  };
}

async function validateObject(
  data: any,
  schema: Joi.ObjectSchema,
  type: string
): Promise<void> {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    throw new CustomError(
      `Invalid ${type} data`,
      'VALIDATION_ERROR',
      400,
      { validationErrors: errors }
    );
  }
}

// Example schemas
export const userSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required',
    }),
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must be less than 50 characters',
      'any.required': 'Name is required',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});
