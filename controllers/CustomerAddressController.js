// controllers/CustomerAddressController.js
// CRUD controller cho customer_address collection 

const { CustomerAddress, Customer } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

class CustomerAddressController {
  // GET /api/v1/customer-addresses - Get all customer addresses
  static getAllCustomerAddresses = asyncHandler(async (req, res) => {
    const { page, limit, skip } = req.pagination;
    const { search, customer_id, is_default } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { ca_address: { $regex: search, $options: 'i' } },
        { ca_name: { $regex: search, $options: 'i' } },
        { ca_phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (customer_id) {
      query.customer_id = customer_id;
    }

    if (is_default !== undefined) {
      query.is_default = is_default === 'true';
    }

    const total = await CustomerAddress.countDocuments(query);

    const addresses = await CustomerAddress.find(query)
      .populate('customer_id', 'c_name c_email')
      .sort({ is_default: -1, created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        addresses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  // GET /api/v1/customer-addresses/:id - Get customer address by ID
  static getCustomerAddressById = asyncHandler(async (req, res) => {
    const address = await CustomerAddress.findById(req.params.id)
      .populate('customer_id', 'c_name c_email c_phone');

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Customer address not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { address }
    });
  });

  // POST /api/v1/customer-addresses - Create new customer address
  static createCustomerAddress = asyncHandler(async (req, res) => {
    const {
      customer_id,
      ca_name,
      ca_phone,
      ca_address,
      is_default = false
    } = req.body;

    if (!customer_id || !ca_name || !ca_phone || !ca_address) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID, name, phone, and address are required'
      });
    }

    // Verify customer exists
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(ca_phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Check if this is the first address for customer (should be default)
    const existingAddressCount = await CustomerAddress.countDocuments({ customer_id });
    const shouldBeDefault = existingAddressCount === 0 || is_default;

    // If setting as default, unset other default addresses for this customer
    if (shouldBeDefault) {
      await CustomerAddress.updateMany(
        { customer_id, is_default: true },
        { is_default: false }
      );
    }

    const address = new CustomerAddress({
      customer_id,
      ca_name,
      ca_phone,
      ca_address,
      is_default: shouldBeDefault,
      created_at: new Date()
    });

    await address.save();

    // Populate customer info for response
    await address.populate('customer_id', 'c_name c_email');

    res.status(201).json({
      success: true,
      message: 'Customer address created successfully',
      data: { address }
    });
  });

  // PUT /api/v1/customer-addresses/:id - Update customer address
  static updateCustomerAddress = asyncHandler(async (req, res) => {
    const {
      ca_name,
      ca_phone,
      ca_address,
      is_default
    } = req.body;

    const address = await CustomerAddress.findById(req.params.id);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Customer address not found'
      });
    }

    // Validate phone number if provided
    if (ca_phone) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(ca_phone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
    }

    // If setting as default, unset other default addresses for this customer
    if (is_default === true) {
      await CustomerAddress.updateMany(
        { customer_id: address.customer_id, _id: { $ne: address._id }, is_default: true },
        { is_default: false }
      );
    }

    // Check if trying to unset default when it's the only address
    if (is_default === false && address.is_default) {
      const addressCount = await CustomerAddress.countDocuments({ customer_id: address.customer_id });
      if (addressCount === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot unset default for the only address. Customer must have at least one default address.'
        });
      }

      // If unsetting default, set another address as default
      const anotherAddress = await CustomerAddress.findOne({
        customer_id: address.customer_id,
        _id: { $ne: address._id }
      }).sort({ created_at: 1 });

      if (anotherAddress) {
        anotherAddress.is_default = true;
        await anotherAddress.save();
      }
    }

    // Update fields
    if (ca_name) address.ca_name = ca_name;
    if (ca_phone) address.ca_phone = ca_phone;
    if (ca_address) address.ca_address = ca_address;
    if (is_default !== undefined) address.is_default = is_default;

    await address.save();
    await address.populate('customer_id', 'c_name c_email');

    res.status(200).json({
      success: true,
      message: 'Customer address updated successfully',
      data: { address }
    });
  });

  // DELETE /api/v1/customer-addresses/:id - Delete customer address
  static deleteCustomerAddress = asyncHandler(async (req, res) => {
    const address = await CustomerAddress.findById(req.params.id);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Customer address not found'
      });
    }

    // Check if this is the default address
    if (address.is_default) {
      const addressCount = await CustomerAddress.countDocuments({ customer_id: address.customer_id });
      
      if (addressCount > 1) {
        // Set another address as default before deleting
        const anotherAddress = await CustomerAddress.findOne({
          customer_id: address.customer_id,
          _id: { $ne: address._id }
        }).sort({ created_at: 1 });

        if (anotherAddress) {
          anotherAddress.is_default = true;
          await anotherAddress.save();
        }
      }
    }

    await CustomerAddress.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Customer address deleted successfully'
    });
  });

  // GET /api/v1/customers/:customerId/addresses - Get addresses for specific customer
  static getCustomerAddresses = asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { include_default_first } = req.query;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    let sortQuery = { created_at: -1 };
    if (include_default_first === 'true') {
      sortQuery = { is_default: -1, created_at: -1 };
    }

    const addresses = await CustomerAddress.find({ customer_id: customerId })
      .sort(sortQuery);

    res.status(200).json({
      success: true,
      data: {
        customer: {
          _id: customer._id,
          c_name: customer.c_name,
          c_email: customer.c_email
        },
        addresses,
        total: addresses.length,
        default_address: addresses.find(addr => addr.is_default) || null
      }
    });
  });

  // GET /api/v1/customers/:customerId/addresses/default - Get default address for customer
  static getCustomerDefaultAddress = asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const defaultAddress = await CustomerAddress.findOne({
      customer_id: customerId,
      is_default: true
    });

    if (!defaultAddress) {
      return res.status(404).json({
        success: false,
        message: 'No default address found for this customer'
      });
    }

    res.status(200).json({
      success: true,
      data: { address: defaultAddress }
    });
  });

  // PUT /api/v1/customer-addresses/:id/set-default - Set address as default
  static setAsDefault = asyncHandler(async (req, res) => {
    const address = await CustomerAddress.findById(req.params.id);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Customer address not found'
      });
    }

    if (address.is_default) {
      return res.status(400).json({
        success: false,
        message: 'Address is already the default'
      });
    }

    // Unset other default addresses for this customer
    await CustomerAddress.updateMany(
      { customer_id: address.customer_id, is_default: true },
      { is_default: false }
    );

    // Set this address as default
    address.is_default = true;
    await address.save();
    await address.populate('customer_id', 'c_name c_email');

    res.status(200).json({
      success: true,
      message: 'Address set as default successfully',
      data: { address }
    });
  });

  // GET /api/v1/customer-addresses/statistics - Get customer address statistics
  static getCustomerAddressStatistics = asyncHandler(async (req, res) => {
    const totalAddresses = await CustomerAddress.countDocuments();
    
    // Customers with multiple addresses
    const customersWithMultipleAddresses = await CustomerAddress.aggregate([
      {
        $group: {
          _id: '$customer_id',
          address_count: { $sum: 1 }
        }
      },
      {
        $match: {
          address_count: { $gt: 1 }
        }
      },
      {
        $count: 'customers_with_multiple'
      }
    ]);

    // Address distribution by customer
    const addressDistribution = await CustomerAddress.aggregate([
      {
        $group: {
          _id: '$customer_id',
          address_count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$address_count',
          customer_count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Default addresses count
    const defaultAddressesCount = await CustomerAddress.countDocuments({ is_default: true });

    // Customers without addresses
    const totalCustomers = await Customer.countDocuments();
    const customersWithAddresses = await CustomerAddress.distinct('customer_id');
    const customersWithoutAddresses = totalCustomers - customersWithAddresses.length;

    res.status(200).json({
      success: true,
      data: {
        totalAddresses,
        defaultAddressesCount,
        customersWithoutAddresses,
        customersWithMultipleAddresses: customersWithMultipleAddresses[0]?.customers_with_multiple || 0,
        addressDistribution
      }
    });
  });

  // POST /api/v1/customer-addresses/bulk-create - Create multiple addresses
  static bulkCreateAddresses = asyncHandler(async (req, res) => {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Addresses array is required'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < addresses.length; i++) {
      try {
        const addressData = addresses[i];
        
        // Validate required fields
        if (!addressData.customer_id || !addressData.ca_name || !addressData.ca_phone || !addressData.ca_address) {
          errors.push({
            index: i,
            error: 'Missing required fields'
          });
          continue;
        }

        // Verify customer exists
        const customer = await Customer.findById(addressData.customer_id);
        if (!customer) {
          errors.push({
            index: i,
            error: 'Customer not found'
          });
          continue;
        }

        // Check if this is first address for customer
        const existingCount = await CustomerAddress.countDocuments({ 
          customer_id: addressData.customer_id 
        });
        
        const shouldBeDefault = existingCount === 0 || addressData.is_default;

        // If setting as default, unset others
        if (shouldBeDefault) {
          await CustomerAddress.updateMany(
            { customer_id: addressData.customer_id, is_default: true },
            { is_default: false }
          );
        }

        const address = new CustomerAddress({
          ...addressData,
          is_default: shouldBeDefault,
          created_at: new Date()
        });

        await address.save();
        results.push(address);

      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    res.status(results.length > 0 ? 201 : 400).json({
      success: results.length > 0,
      message: `Bulk create completed. ${results.length} success, ${errors.length} errors`,
      data: {
        created: results,
        errors: errors
      }
    });
  });
}

module.exports = CustomerAddressController;
