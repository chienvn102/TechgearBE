// controllers/CustomerController.js
// Controller cho customer management 

const asyncHandler = require('express-async-handler');
const Customer = require('../models/Customer');
const CustomerRanking = require('../models/CustomerRanking');
const CustomerAddress = require('../models/CustomerAddress');
const Order = require('../models/Order');
const mongoose = require('mongoose');

class CustomerController {
  // GET /api/v1/customers - Get all customers
  static getAllCustomers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Customer.countDocuments(query);

    const customers = await Customer.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/customers/:id - Get customer by ID
  static getCustomerById = asyncHandler(async (req, res) => {
    // Try to find by ObjectId first, then by customer_id string
    let customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      // If not found by ObjectId, try by customer_id string
      customer = await Customer.findOne({ customer_id: req.params.id });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { customer_id: customer._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$order_total' }
        }
      }
    ]);

    const stats = orderStats.length > 0 ? orderStats[0] : {
      totalOrders: 0,
      totalSpent: 0
    };

    // Get customer addresses
    const addresses = await CustomerAddress.find({ customer_id: customer._id })
      .sort({ _id: 1 }); // First address is default according to business rules

    res.status(200).json({
      success: true,
      data: { 
        customer: {
          ...customer.toObject(),
          total_orders: stats.totalOrders,
          total_spent: stats.totalSpent,
          addresses: addresses
        }
      }
    });
  });

  // POST /api/v1/customers - Create new customer
  static createCustomer = asyncHandler(async (req, res) => {
    const {
      customer_id,
      name,
      email,
      phone_number
    } = req.body;

    if (!customer_id || !name || !email || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check unique constraints
    const existingCustomerId = await Customer.findOne({ customer_id });
    if (existingCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID already exists'
      });
    }

    const existingEmail = await Customer.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const customer = new Customer({
      customer_id,
      name,
      email,
      phone_number
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer }
    });
  });

  // PUT /api/v1/customers/:id - Update customer
  static updateCustomer = asyncHandler(async (req, res) => {
    const {
      name,
      email,
      phone_number
    } = req.body;

    const customer = await Customer.findOne({ customer_id: req.params.id });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check unique email if changed
    if (email && email !== customer.email) {
      const existingEmail = await Customer.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Update fields
    if (name) customer.name = name;
    if (email) customer.email = email;
    if (phone_number) customer.phone_number = phone_number;

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer }
    });
  });

  // DELETE /api/v1/customers/:id - Delete customer
  static deleteCustomer = asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({ customer_id: req.params.id });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has orders
    const orderCount = await Order.countDocuments({ customer_id: customer._id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing orders'
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  });

  // GET /api/v1/customers/statistics - Get customer statistics
  static getCustomerStatistics = asyncHandler(async (req, res) => {
    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({ status: { $ne: 'inactive' } });
    
    const rankingStats = await Customer.aggregate([
      {
        $lookup: {
          from: 'customer_ranking',
          localField: '_id',
          foreignField: 'customer_id',
          as: 'ranking'
        }
      },
      {
        $unwind: {
          path: '$ranking',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'ranking',
          localField: 'ranking.ranking_id',
          foreignField: '_id',
          as: 'rankingDetails'
        }
      },
      {
        $unwind: {
          path: '$rankingDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$rankingDetails.ranking_name',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        rankingDistribution: rankingStats
      }
    });
  });

  // GET /api/v1/customers/addresses - Get current customer addresses
  static getCurrentCustomerAddresses = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID not found in token'
      });
    }
    
    const addresses = await CustomerAddress.find({ customer_id: customerId })
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: { addresses }
    });
  });

  // GET /api/v1/customers/:id/addresses - Get customer addresses
  static getCustomerAddresses = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const addresses = await CustomerAddress.find({ customer_id: customer._id })
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: addresses
    });
  });

  // POST /api/v1/customers/addresses - Create current customer address
  static createCurrentCustomerAddress = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;
    const { name, phone_number, address, is_default } = req.body;

    // If this is set as default, unset other default addresses
    if (is_default) {
      await CustomerAddress.updateMany(
        { customer_id: customerId },
        { is_default: false }
      );
    }

    const newAddress = new CustomerAddress({
      customer_id: customerId,
      name,
      phone_number,
      address,
      is_default: is_default || false,
      created_at: new Date(),
      updated_at: new Date()
    });

    await newAddress.save();

    res.status(201).json({
      success: true,
      data: { address: newAddress },
      message: 'Address created successfully'
    });
  });

  // POST /api/v1/customers/:id/addresses - Create customer address
  static createCustomerAddress = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const { name, phone_number, address } = req.body;

    const newAddress = new CustomerAddress({
      customer_id: customer._id,
      name,
      phone_number,
      address
    });

    await newAddress.save();

    res.status(201).json({
      success: true,
      data: newAddress,
      message: 'Address created successfully'
    });
  });

  // PUT /api/v1/customers/:id/addresses/:addressId - Update customer address
  static updateCustomerAddress = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const address = await CustomerAddress.findOne({
      _id: req.params.addressId,
      customer_id: customer._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const { name, phone_number, address: addressText } = req.body;

    if (name) address.name = name;
    if (phone_number) address.phone_number = phone_number;
    if (addressText) address.address = addressText;

    await address.save();

    res.status(200).json({
      success: true,
      data: address,
      message: 'Address updated successfully'
    });
  });

  // DELETE /api/v1/customers/:id/addresses/:addressId - Delete customer address
  static deleteCustomerAddress = asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const address = await CustomerAddress.findOne({
      _id: req.params.addressId,
      customer_id: customer._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    await CustomerAddress.findByIdAndDelete(req.params.addressId);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  });

  // GET /api/v1/customers/:id/orders - Get customer orders
  static getCustomerOrders = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    
    // Find customer by customer_id (string) not ObjectId
    const customer = await Customer.findOne({ customer_id: req.params.id });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const total = await Order.countDocuments({ customer_id: customer._id });

    const orders = await Order.find({ customer_id: customer._id })
      .populate('pm_id', 'pm_name')
      .populate('payment_status_id', 'ps_name')
      .populate('customer_id', 'customer_id name')
      .populate('voucher_id', 'voucher_code voucher_name')
      .sort({ order_datetime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // PUT /api/v1/customers/:id/ranking - Update customer ranking
  static updateCustomerRanking = asyncHandler(async (req, res) => {
    const { ranking_id } = req.body;
    
    const customer = await Customer.findOne({ customer_id: req.params.id });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if ranking exists
    const Ranking = require('../models/Ranking');
    const ranking = await Ranking.findById(ranking_id);
    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    // Update or create customer ranking
    const customerRanking = await CustomerRanking.findOneAndUpdate(
      { customer_id: req.params.id },
      { 
        ranking_id,
        updated_at: new Date()
      },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    res.status(200).json({
      success: true,
      data: customerRanking,
      message: 'Customer ranking updated successfully'
    });
  });

  // PUT /api/v1/customers/addresses/:addressId - Update current customer address
  static updateCurrentCustomerAddress = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;
    const { addressId } = req.params;
    const updateData = req.body;

    const address = await CustomerAddress.findOne({
      _id: addressId,
      customer_id: customerId
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unset other default addresses
    if (updateData.is_default) {
      await CustomerAddress.updateMany(
        { customer_id: customerId, _id: { $ne: addressId } },
        { is_default: false }
      );
    }

    Object.assign(address, updateData);
    address.updated_at = new Date();
    await address.save();

    res.status(200).json({
      success: true,
      data: { address },
      message: 'Address updated successfully'
    });
  });

  // DELETE /api/v1/customers/addresses/:addressId - Delete current customer address
  static deleteCurrentCustomerAddress = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;
    const { addressId } = req.params;

    const address = await CustomerAddress.findOne({
      _id: addressId,
      customer_id: customerId
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    await CustomerAddress.findByIdAndDelete(addressId);

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  });

  // PUT /api/v1/customers/addresses/:addressId/set-default - Set default address
  static setDefaultAddress = asyncHandler(async (req, res) => {
    const customerId = req.user.customer_id;
    const { addressId } = req.params;

    const address = await CustomerAddress.findOne({
      _id: addressId,
      customer_id: customerId
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Unset all other default addresses
    await CustomerAddress.updateMany(
      { customer_id: customerId },
      { is_default: false }
    );

    // Set this address as default
    address.is_default = true;
    address.updated_at = new Date();
    await address.save();

    res.status(200).json({
      success: true,
      data: { address },
      message: 'Default address updated successfully'
    });
  });
}

module.exports = CustomerController;
