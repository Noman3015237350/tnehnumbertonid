const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Load database
const DB_PATH = path.join(__dirname, '../Database.json');
let database = [];

// Load database function
function loadDatabase() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        database = JSON.parse(data);
        return database;
    } catch (error) {
        console.error('Error loading database:', error);
        database = [];
        return database;
    }
}

// Save database function
function saveDatabase() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving database:', error);
        return false;
    }
}

// Load initial data
loadDatabase();

// ADMIN KEY
const ADMIN_KEY = 'TNEH3';

// =============================================
// API ROUTES
// =============================================

/**
 * API Documentation Route
 * GET /api/docs
 */
app.get('/api/docs', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
        success: true,
        message: 'TNEH Database API',
        base_url: baseUrl,
        version: '1.0.0',
        endpoints: {
            create_key: {
                method: 'GET',
                endpoint: '/api/adminkey=TNEH3&createkey',
                description: 'Generate a new API key',
                auth_required: true
            },
            get_info_by_number: {
                method: 'GET',
                endpoint: '/api/info?key=API_KEY&number=PHONE_NUMBER',
                description: 'Get user info by phone number',
                auth_required: true,
                params: ['key', 'number']
            },
            get_info_by_dob_nid: {
                method: 'GET',
                endpoint: '/api/info?key=API_KEY&dob=DD-MM-YYYY&nid=NID_NUMBER',
                description: 'Get user info by DOB and NID',
                auth_required: true,
                params: ['key', 'dob', 'nid']
            },
            check_key: {
                method: 'GET',
                endpoint: '/api/chack?key=API_KEY',
                description: 'Check if API key is valid',
                auth_required: true,
                params: ['key']
            },
            delete_key: {
                method: 'GET',
                endpoint: '/api/delete?key=API_KEY',
                description: 'Delete an API key',
                auth_required: true,
                params: ['key']
            },
            all_keys: {
                method: 'GET',
                endpoint: '/api/allkey',
                description: 'Get all valid API keys',
                auth_required: true
            }
        },
        response_codes: {
            '200': 'Success - Request processed successfully',
            '400': 'Bad Request - Missing required parameters',
            '401': 'Unauthorized - Invalid or missing API key',
            '403': 'Forbidden - Admin access required',
            '404': 'Not Found - Resource not found',
            '409': 'Conflict - Key already exists',
            '500': 'Internal Server Error'
        },
        examples: {
            create_key: `${baseUrl}/api/adminkey=TNEH3&createkey`,
            get_info: `${baseUrl}/api/info?key=YOUR_KEY&number=01717471131`,
            get_info_nid: `${baseUrl}/api/info?key=YOUR_KEY&dob=1996-08-02&nid=6007128553`,
            check_key: `${baseUrl}/api/chack?key=YOUR_KEY`,
            delete_key: `${baseUrl}/api/delete?key=YOUR_KEY`,
            all_keys: `${baseUrl}/api/allkey`
        }
    });
});

// =============================================
// API ENDPOINTS
// =============================================

// Store API keys in memory (in production, use a database)
let apiKeys = ['tneh_demo_key_123']; // Demo key

// Middleware to validate API key
function validateApiKey(req, res, next) {
    const key = req.query.key || req.headers['x-api-key'];
    
    if (!key) {
        return res.status(401).json({
            success: false,
            error: 'API key required',
            message: 'Please provide an API key via query parameter or x-api-key header'
        });
    }
    
    if (!apiKeys.includes(key)) {
        return res.status(401).json({
            success: false,
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
        });
    }
    
    req.apiKey = key;
    next();
}

// Middleware to validate admin key
function validateAdminKey(req, res, next) {
    const adminKey = req.query.adminkey || req.headers['x-admin-key'];
    
    if (!adminKey || adminKey !== ADMIN_KEY) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            message: 'Valid admin key is required for this operation'
        });
    }
    
    next();
}

/**
 * 1. Create API Key
 * GET /api/adminkey=TNEH3&createkey
 */
app.get('/api/adminkey=TNEH3&createkey', validateAdminKey, (req, res) => {
    const newKey = `tneh_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    apiKeys.push(newKey);
    
    res.json({
        success: true,
        message: 'API key created successfully',
        key: newKey
    });
});

/**
 * 2. Get Info by Number
 * GET /api/info?key=API_KEY&number=PHONE_NUMBER
 */
app.get('/api/info', validateApiKey, (req, res) => {
    const { number, dob, nid } = req.query;
    
    // Search by phone number
    if (number) {
        const user = database.find(u => u.number === number);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: `No user found with number: ${number}`
            });
        }
        
        return res.json({
            success: true,
            data: user
        });
    }
    
    // Search by DOB and NID
    if (dob && nid) {
        const user = database.find(u => u.dob === dob && u.nid === nid);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: `No user found with DOB: ${dob} and NID: ${nid}`
            });
        }
        
        return res.json({
            success: true,
            data: user
        });
    }
    
    // Missing parameters
    return res.status(400).json({
        success: false,
        error: 'Missing parameters',
        message: 'Please provide either number OR (dob and nid) parameters'
    });
});

/**
 * 3. Check API Key
 * GET /api/chack?key=API_KEY
 */
app.get('/api/chack', (req, res) => {
    const key = req.query.key;
    
    if (!key) {
        return res.status(400).json({
            success: false,
            error: 'Key parameter required',
            message: 'Please provide the key parameter'
        });
    }
    
    const isValid = apiKeys.includes(key);
    
    if (isValid) {
        res.json({
            success: true,
            valid: true,
            message: 'API key is valid'
        });
    } else {
        res.status(401).json({
            success: false,
            valid: false,
            message: 'API key is invalid'
        });
    }
});

/**
 * 4. Delete API Key
 * GET /api/delete?key=API_KEY
 */
app.get('/api/delete', (req, res) => {
    const key = req.query.key;
    
    if (!key) {
        return res.status(400).json({
            success: false,
            error: 'Key parameter required',
            message: 'Please provide the key parameter'
        });
    }
    
    const index = apiKeys.indexOf(key);
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Key not found',
            message: 'The specified API key does not exist'
        });
    }
    
    apiKeys.splice(index, 1);
    res.json({
        success: true,
        message: 'API key deleted successfully'
    });
});

/**
 * 5. Get All API Keys
 * GET /api/allkey
 */
app.get('/api/allkey', validateAdminKey, (req, res) => {
    res.json({
        success: true,
        keys: apiKeys,
        count: apiKeys.length
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TNEH Database API running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`🏠 TNEH Group: http://localhost:${PORT}/`);
    console.log(`🔑 Admin Key: ${ADMIN_KEY}`);
    console.log(`📊 Database loaded with ${database.length} records`);
});

module.exports = app;
