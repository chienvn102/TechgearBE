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
    // Find customer by customer_id (string) not ObjectId
    const customer = await Customer.findOne({ customer_id: req.params.id });

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

  // GET /api/v1/customers/:id/addresses - Get customer addresses
  static getCustomerAddresses = asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({ customer_id: req.params.id });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const addresses = await CustomerAddress.find({ customer_id: req.params.id })
      .sort({ is_default: -1, created_at: -1 });

    res.status(200).json({
      success: true,
      data: addresses
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
}

module.exports = CustomerController;
