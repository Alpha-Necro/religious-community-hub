const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Religious Community Hub API',
      version: '1.0.0',
      description: 'API documentation for the Religious Community Hub application',
      termsOfService: 'https://relcomhub.com/terms',
      contact: {
        name: 'API Support',
        email: 'support@relcomhub.com',
        url: 'https://relcomhub.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.relcomhub.com/v1',
        description: 'Production server'
      }
    ],
    externalDocs: {
      description: 'Find out more about our API',
      url: 'https://relcomhub.com/api-docs'
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Security',
        description: 'Security-related endpoints'
      },
      {
        name: 'Sessions',
        description: 'Session management endpoints'
      },
      {
        name: 'IP Control',
        description: 'IP-based access control endpoints'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-KEY'
        }
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Response status'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            message: {
              type: 'string',
              description: 'Response message'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'integer',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Error details'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    paths: {
      '/api/v1/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user and return JWT token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      description: 'User email'
                    },
                    password: {
                      type: 'string',
                      format: 'password',
                      description: 'User password'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: {
                        type: 'string',
                        description: 'JWT token'
                      },
                      refreshToken: {
                        type: 'string',
                        description: 'Refresh token'
                      },
                      expiresAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Token expiration time'
                      }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            '429': {
              description: 'Too many login attempts',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          },
          security: [],
          'x-rateLimit': {
            window: '15 minutes',
            max: 100,
            message: 'Too many requests from this IP, please try again later'
          }
        }
      },
      '/api/v1/auth/logout': {
        post: {
          tags: ['Authentication'],
          summary: 'User logout',
          description: 'Invalidate user session',
          responses: {
            '200': {
              description: 'Logout successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ApiResponse'
                  }
                }
              }
            },
            '401': {
              description: 'Invalid token',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          },
          'x-rateLimit': {
            window: '15 minutes',
            max: 100,
            message: 'Too many requests from this IP, please try again later'
          }
        }
      }
    }
  },
  apis: ['./routes/*.js']
};

module.exports = swaggerJsdoc(options);
