// routes/addressRoutes.js
// Proxy routes for Vietnam Address API to avoid CORS and certificate issues

const express = require('express');
const router = express.Router();
const axios = require('axios');
const https = require('https');

// Base URL for Vietnam Address API
const VIETNAM_API_BASE = 'https://provinces.open-api.vn/api';

// Create axios instance with SSL bypass (certificate expired issue)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false // Bypass SSL certificate validation
  })
});

// GET /api/v1/address/provinces - Get all provinces
router.get('/provinces', async (req, res) => {
  try {
    const response = await axiosInstance.get(`${VIETNAM_API_BASE}/p/`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch provinces',
      error: error.message 
    });
  }
});

// GET /api/v1/address/provinces/:code - Get province with districts
router.get('/provinces/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const response = await axiosInstance.get(`${VIETNAM_API_BASE}/p/${code}?depth=2`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch province details',
      error: error.message 
    });
  }
});

// GET /api/v1/address/districts/:code - Get district with wards
router.get('/districts/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const response = await axiosInstance.get(`${VIETNAM_API_BASE}/d/${code}?depth=2`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch district details',
      error: error.message 
    });
  }
});

module.exports = router;
