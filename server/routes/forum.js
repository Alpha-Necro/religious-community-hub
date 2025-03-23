const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const { validateForumPost, validate } = require('../utils/validators');
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
} = require('../controllers/forumController');

// Forum routes with validation
router.post('/', [auth, validateForumPost, validate], createPost);
router.get('/', getPosts);
router.get('/:id', getPost);
router.put('/:id', [auth, validateForumPost, validate], updatePost);
router.delete('/:id', [auth, adminAuth], deletePost);

module.exports = router;
