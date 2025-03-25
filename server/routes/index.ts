import express from 'express';
import authRoutes from './auth';
import forumRoutes from './forum';
import resourcesRoutes from './resources';
import eventsRoutes from './events';
import csrfRoutes from './csrf';
import widgetRoutes from './widgets';

export function setupRoutes(app: express.Application) {
  // API versioning
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/forum', forumRoutes);
  app.use('/api/v1/resources', resourcesRoutes);
  app.use('/api/v1/events', eventsRoutes);
  app.use('/api/v1/csrf', csrfRoutes);
  app.use('/api/v1/widgets', widgetRoutes);

  // Test route
  app.get('/', (req: express.Request, res: express.Response) => {
    res.json({ message: 'Welcome to Religious Community Hub API' });
  });
}
