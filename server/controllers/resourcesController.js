const Resource = require('../models/Resource');
const { auth } = require('../middleware/auth');

const createResource = async (req, res) => {
  try {
    const { title, description, type, url } = req.body;
    const resource = await Resource.create({
      title,
      description,
      type,
      url,
      userId: req.userId,
    });
    res.status(201).json(resource);
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

const getResources = async (req, res) => {
  try {
    const resources = await Resource.findAll({
      where: {
        userId: req.userId,
      },
      order: [['createdAt', 'DESC']],
    });
    res.json(resources);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
};

const getResource = async (req, res) => {
  try {
    const resource = await Resource.findOne({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    res.json(resource);
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
};

const updateResource = async (req, res) => {
  try {
    const { title, description, type, url } = req.body;
    const resource = await Resource.findOne({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    await resource.update({
      title,
      description,
      type,
      url,
    });
    res.json(resource);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
};

const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findOne({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    await resource.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
};

module.exports = { createResource, getResources, getResource, updateResource, deleteResource };
