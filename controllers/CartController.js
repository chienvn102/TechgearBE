const mongoose = require('mongoose');

/**
 * Cart Controller
 * Handles cart operations (add, update, remove, get)
 */

// Cart Schema (embedded in customer or separate collection)
const cartItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true
  },
  added_at: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  total_amount: {
    type: Number,
    default: 0
  },
  total_items: {
    type: Number,
    default: 0
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.total_items = this.items.reduce((total, item) => total + item.quantity, 0);
  this.total_amount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.updated_at = new Date();
  next();
});

const Cart = mongoose.model('Cart', cartSchema);

class CartController {
  
  /**
   * @desc    Get cart for customer
   * @route   GET /api/v1/cart/:customerId
   * @access  Private
   */
  static async getCart(req, res) {
    try {
      const { customerId } = req.params;
      
      // Validate customer ID
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID'
        });
      }
      
      // Find cart and populate product details
      let cart = await Cart.findOne({ customer_id: customerId })
        .populate({
          path: 'items.product_id',
          select: 'pd_name pd_price pd_sale_price product_images pd_quantity',
          populate: [
            { path: 'br_id', select: 'br_name' },
            { path: 'category_id', select: 'cg_name' }
          ]
        });
      
      // Create empty cart if doesn't exist
      if (!cart) {
        cart = new Cart({
          customer_id: customerId,
          items: [],
          total_amount: 0,
          total_items: 0
        });
        await cart.save();
      }
      
      res.status(200).json({
        success: true,
        message: 'Cart retrieved successfully',
        data: cart
      });
      
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while retrieving cart',
        error: error.message
      });
    }
  }
  
  /**
   * @desc    Add item to cart
   * @route   POST /api/v1/cart
   * @access  Private
   */
  static async addToCart(req, res) {
    try {
      const { customer_id, product_id, quantity = 1 } = req.body;
      
      // Validate input
      if (!customer_id || !product_id) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID and Product ID are required'
        });
      }
      
      if (!mongoose.Types.ObjectId.isValid(customer_id) || !mongoose.Types.ObjectId.isValid(product_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID or product ID'
        });
      }
      
      // Check if product exists
      const Product = mongoose.model('Product');
      const product = await Product.findById(product_id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Check product availability
      if (product.pd_quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.pd_quantity} items available in stock`
        });
      }
      
      // Get current price (sale price if available)
      const currentPrice = product.pd_sale_price || product.pd_price;
      
      // Find or create cart
      let cart = await Cart.findOne({ customer_id });
      
      if (!cart) {
        cart = new Cart({
          customer_id,
          items: []
        });
      }
      
      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        item => item.product_id.toString() === product_id
      );
      
      if (existingItemIndex > -1) {
        // Update existing item quantity
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;
        
        // Check total quantity against stock
        if (newQuantity > product.pd_quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot add ${quantity} more items. Only ${product.pd_quantity - cart.items[existingItemIndex].quantity} more available`
          });
        }
        
        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].price = currentPrice; // Update price
      } else {
        // Add new item
        cart.items.push({
          product_id,
          quantity,
          price: currentPrice
        });
      }
      
      await cart.save();
      
      // Populate cart for response
      cart = await Cart.findById(cart._id)
        .populate({
          path: 'items.product_id',
          select: 'pd_name pd_price pd_sale_price product_images',
          populate: [
            { path: 'br_id', select: 'br_name' },
            { path: 'category_id', select: 'cg_name' }
          ]
        });
      
      res.status(200).json({
        success: true,
        message: 'Item added to cart successfully',
        data: cart
      });
      
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while adding to cart',
        error: error.message
      });
    }
  }
  
  /**
   * @desc    Update cart item quantity
   * @route   PUT /api/v1/cart
   * @access  Private
   */
  static async updateCartItem(req, res) {
    try {
      const { customer_id, product_id, quantity } = req.body;
      
      // Validate input
      if (!customer_id || !product_id || quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID, Product ID, and quantity are required'
        });
      }
      
      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1'
        });
      }
      
      // Find cart
      let cart = await Cart.findOne({ customer_id });
      
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }
      
      // Find item in cart
      const itemIndex = cart.items.findIndex(
        item => item.product_id.toString() === product_id
      );
      
      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }
      
      // Check product stock
      const Product = mongoose.model('Product');
      const product = await Product.findById(product_id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      if (quantity > product.pd_quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.pd_quantity} items available in stock`
        });
      }
      
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price = product.pd_sale_price || product.pd_price;
      
      await cart.save();
      
      // Populate cart for response
      cart = await Cart.findById(cart._id)
        .populate({
          path: 'items.product_id',
          select: 'pd_name pd_price pd_sale_price product_images'
        });
      
      res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: cart
      });
      
    } catch (error) {
      console.error('Update cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating cart',
        error: error.message
      });
    }
  }
  
  /**
   * @desc    Remove item from cart
   * @route   DELETE /api/v1/cart
   * @access  Private
   */
  static async removeFromCart(req, res) {
    try {
      const { customer_id, product_id } = req.body;
      
      // Validate input
      if (!customer_id || !product_id) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID and Product ID are required'
        });
      }
      
      // Find cart
      let cart = await Cart.findOne({ customer_id });
      
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }
      
      // Remove item from cart
      const initialLength = cart.items.length;
      cart.items = cart.items.filter(
        item => item.product_id.toString() !== product_id
      );
      
      if (cart.items.length === initialLength) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }
      
      await cart.save();
      
      // Populate cart for response
      cart = await Cart.findById(cart._id)
        .populate({
          path: 'items.product_id',
          select: 'pd_name pd_price pd_sale_price product_images'
        });
      
      res.status(200).json({
        success: true,
        message: 'Item removed from cart successfully',
        data: cart
      });
      
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while removing from cart',
        error: error.message
      });
    }
  }
  
  /**
   * @desc    Clear entire cart
   * @route   DELETE /api/v1/cart/:customerId/clear
   * @access  Private
   */
  static async clearCart(req, res) {
    try {
      const { customerId } = req.params;
      
      // Find and clear cart
      let cart = await Cart.findOne({ customer_id: customerId });
      
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }
      
      cart.items = [];
      await cart.save();
      
      res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        data: cart
      });
      
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while clearing cart',
        error: error.message
      });
    }
  }
  
  /**
   * @desc    Get cart items count
   * @route   GET /api/v1/cart/:customerId/count
   * @access  Private
   */
  static async getCartCount(req, res) {
    try {
      const { customerId } = req.params;
      
      const cart = await Cart.findOne({ customer_id: customerId });
      
      const count = cart ? cart.total_items : 0;
      
      res.status(200).json({
        success: true,
        message: 'Cart count retrieved successfully',
        data: {
          count,
          total_items: count
        }
      });
      
    } catch (error) {
      console.error('Get cart count error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while getting cart count',
        error: error.message
      });
    }
  }
}

module.exports = CartController;
