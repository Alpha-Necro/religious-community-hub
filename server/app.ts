import path from 'path';
import dotenv from 'dotenv';
import { performanceMonitor } from './services/performanceMonitor';
import { codeSplitting } from './middleware/codeSplitting';
import { config } from './config/configManager';
import { createApp, configureCors, configureHelmet } from './config/express';
import {
  configureSecurity,
  configureRateLimiting,
  configurePerformanceMonitoring,
  configureIPAccessControl,
  configureRequestSanitization,
  configureAPIVersioning,
} from './config/middleware';

dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize performance monitoring
performanceMonitor.initialize();

// Initialize code splitting
codeSplitting.initialize();

// Create and configure Express app
const app = createApp();

// Configure middleware
configureCors(app);
configureHelmet(app);
configureSecurity(app);
configureRateLimiting(app);
configurePerformanceMonitoring(app);
configureIPAccessControl(app);
configureRequestSanitization(app);
configureAPIVersioning(app);

app.listen(config.server.port, () => {
  console.log(`Server running in ${config.server.environment} mode on port ${config.server.port}`);
});

export default app;
