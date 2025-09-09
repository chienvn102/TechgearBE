// controllers/PostController.js
// CRUD controller cho post collection 

const { Post } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class PostController {
  // GET /api/v1/posts - Get all posts
  static getAllPosts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { post_title: { $regex: search, $options: 'i' } },
        { post_content: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Post.countDocuments(query);

    const posts = await Post.find(query)
      .sort({ post_id: 1 }) // Sort by post_id since no created_at field
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/posts/:id - Get post by ID
  static getPostById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { post }
    });
  });

  // GET /api/v1/posts/by-post-id/:post_id - Get post by post_id
  static getPostByPostId = asyncHandler(async (req, res) => {
    const { post_id } = req.params;
    
    const post = await Post.findOne({ post_id });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { post }
    });
  });

  // POST /api/v1/posts - Create new post
  static createPost = asyncHandler(async (req, res) => {
    const { 
      post_id,
      post_img,
      post_title, 
      post_content
    } = req.body;

    if (!post_id || !post_title || !post_content) {
      return res.status(400).json({
        success: false,
        message: 'post_id, post_title and post_content are required',
        errors: [
          { field: 'post_id', message: 'post_id is required' },
          { field: 'post_title', message: 'post_title is required' },
          { field: 'post_content', message: 'post_content is required' }
        ]
      });
    }

    // Check if post_id already exists
    const existingPost = await Post.findOne({ post_id });
    if (existingPost) {
      return res.status(400).json({
        success: false,
        message: 'Post with this post_id already exists',
        errors: [{ field: 'post_id', message: 'post_id must be unique' }]
      });
    }

    const post = new Post({
      post_id,
      post_img: post_img || null,
      post_title,
      post_content
    });

    await post.save();

    res.status(201).json({
      success: true,
      data: { post },
      message: 'Post created successfully'
    });
  });

  // PUT /api/v1/posts/:id - Update post
  static updatePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      post_id,
      post_img,
      post_title, 
      post_content
    } = req.body;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if new post_id conflicts with existing posts
    if (post_id && post_id !== post.post_id) {
      const existingPost = await Post.findOne({ post_id });
      if (existingPost) {
        return res.status(400).json({
          success: false,
          message: 'Post with this post_id already exists',
          errors: [{ field: 'post_id', message: 'post_id must be unique' }]
        });
      }
    }

    // Update fields
    if (post_id) post.post_id = post_id;
    if (post_img !== undefined) post.post_img = post_img;
    if (post_title) post.post_title = post_title;
    if (post_content) post.post_content = post_content;

    await post.save();

    res.status(200).json({
      success: true,
      data: { post },
      message: 'Post updated successfully'
    });
  });

  // DELETE /api/v1/posts/:id - Delete post
  static deletePost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await Post.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  });

  // GET /api/v1/posts/search - Search posts
  static searchPosts = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { q, title_only } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
        errors: [{ field: 'q', message: 'Search query (q) is required' }]
      });
    }

    let query = {};
    
    if (title_only === 'true') {
      query.post_title = { $regex: q, $options: 'i' };
    } else {
      query.$or = [
        { post_title: { $regex: q, $options: 'i' } },
        { post_content: { $regex: q, $options: 'i' } }
      ];
    }

    const total = await Post.countDocuments(query);

    const posts = await Post.find(query)
      .sort({ post_id: 1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        posts,
        searchQuery: q,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });
}

module.exports = PostController;
