import express from 'express';
import { app } from './app.ts';
import { logger } from './utils/logger.ts';

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
