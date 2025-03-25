import swaggerUi from 'swagger-ui-express';

const specs = {
  openapi: '3.0.0',
  info: {
    title: 'Religious Community Hub API',
    version: '1.0.0',
    description: 'API documentation for Religious Community Hub',
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development server',
    },
  ],
  paths: {},
};

export { swaggerUi, specs };
