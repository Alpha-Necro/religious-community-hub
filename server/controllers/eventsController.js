const Event = require('../models/Event');
const { auth } = require('../middleware/auth');

const createEvent = async (req, res) => {
  try {
    const { title, description, dateTime, location, type } = req.body;
    const event = await Event.create({
      title,
      description,
      dateTime,
      location,
      type,
      userId: req.userId,
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
};

const getEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      order: [['dateTime', 'ASC']],
      where: {
        dateTime: {
          [Op.gte]: new Date(),
        },
      },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

const getEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedEvent = await event.update(req.body);
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await event.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

module.exports = { createEvent, getEvents, getEvent, updateEvent, deleteEvent };
