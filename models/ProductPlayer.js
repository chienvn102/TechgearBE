// models/ProductPlayer.js
// Model cho product_player collection 

const mongoose = require('mongoose');

const productPlayerSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  player_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'player',
    required: true
  },
  is_primary: {
    type: Boolean,
    default: false
  },
  display_order: {
    type: Number,
    default: 1,
    min: 1
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'product_player',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound unique index để đảm bảo 1 product-player pair chỉ tồn tại 1 lần
productPlayerSchema.index({ product_id: 1, player_id: 1 }, { unique: true });

// Index để query hiệu quả
productPlayerSchema.index({ product_id: 1 });
productPlayerSchema.index({ player_id: 1 });
productPlayerSchema.index({ is_primary: 1 });

// Middleware để đảm bảo chỉ có 1 primary player per product
productPlayerSchema.pre('save', async function(next) {
  if (this.is_primary && this.isModified('is_primary')) {
    // Nếu set primary = true, tự động set các player khác của product này thành false
    await this.constructor.updateMany(
      { 
        product_id: this.product_id, 
        _id: { $ne: this._id } 
      },
      { is_primary: false }
    );
  }
  next();
});

// Static methods cho business logic
productPlayerSchema.statics.getProductPlayers = async function(productId) {
  return this.find({ product_id: productId })
    .populate('player_id', 'player_id player_name player_img team_name position')
    .sort({ is_primary: -1, display_order: 1 });
};

productPlayerSchema.statics.getPlayerProducts = async function(playerId) {
  return this.find({ player_id: playerId })
    .populate('product_id', 'pd_id pd_name pd_price pd_quantity color sku')
    .sort({ is_primary: -1, display_order: 1 });
};

productPlayerSchema.statics.setPrimaryPlayer = async function(productId, playerId) {
  // Set tất cả player của product thành non-primary
  await this.updateMany(
    { product_id: productId },
    { is_primary: false }
  );
  
  // Set player được chọn thành primary
  return this.findOneAndUpdate(
    { product_id: productId, player_id: playerId },
    { is_primary: true },
    { new: true }
  );
};

module.exports = mongoose.model('product_player', productPlayerSchema);
