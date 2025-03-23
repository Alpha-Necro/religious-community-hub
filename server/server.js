require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forum');
const resourcesRoutes = require('./routes/resources');
const eventsRoutes = require('./routes/events');
const csrfRoutes = require('./routes/csrf');
const widgetRoutes = require('./routes/widgets');
const { auth } = require('./middleware/auth');
const { security, csrfProtection, corsOptions, setupSecurity } = require('./middleware/security');
const validateInput = require('./middleware/inputValidator');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Set up security
setupSecurity(app);

// CORS configuration
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Input validation middleware
app.use(validateInput);

// API versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/forum', forumRoutes);
app.use('/api/v1/resources', resourcesRoutes);
app.use('/api/v1/events', eventsRoutes);
app.use('/api/v1/csrf', csrfRoutes);
app.use('/api/v1/widgets', widgetRoutes);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Religious Community Hub API' });
});

// Error handling
app.use(errorHandler);

// Sync database
sequelize.sync()
  .then(() => {
    console.log('Database synced successfully');
  })
  .catch((err) => {
    console.error('Error syncing database:', err);
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  sequelize.authenticate()
    .then(() => console.log('Database connected successfully'))
    .catch(err => console.error('Database connection error:', err));
});

module.exports = app;
