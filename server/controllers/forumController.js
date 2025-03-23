const ForumPost = require('../models/ForumPost');
const { auth } = require('../middleware/auth');

const createPost = async (req, res) => {
  try {
    const { title, content, categoryId } = req.body;
    const post = await ForumPost.create({
      title,
      content,
      categoryId,
      userId: req.userId,
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
};

const getPosts = async (req, res) => {
  try {
    const posts = await ForumPost.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

const getPost = async (req, res) => {
  try {
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedPost = await post.update(req.body);
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update post' });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await ForumPost.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await post.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

module.exports = { createPost, getPosts, getPost, updatePost, deletePost };
