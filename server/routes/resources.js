const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
} = require('../controllers/resourcesController');

// Resources routes
router.post('/', auth, createResource);
router.get('/', auth, getResources);
router.get('/:id', auth, getResource);
router.put('/:id', auth, updateResource);
router.delete('/:id', auth, deleteResource);

module.exports = router;
