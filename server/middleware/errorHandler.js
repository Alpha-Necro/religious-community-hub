const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const errors = error.errors || [];

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      errors,
      statusCode
    }
  });
};

module.exports = errorHandler;
