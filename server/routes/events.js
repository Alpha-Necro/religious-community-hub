const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventsController');

// Events routes
router.post('/', auth, createEvent);
router.get('/', getEvents);
router.get('/:id', getEvent);
router.put('/:id', auth, updateEvent);
router.delete('/:id', auth, deleteEvent);

module.exports = router;
