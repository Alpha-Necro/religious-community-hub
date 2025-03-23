const express = require('express');
const router = express.Router();

// Get CSRF token
router.get('/csrf-token', (req, res) => {
  res.json({
    csrfToken: req.csrfToken(),
  });
});

module.exports = router;
