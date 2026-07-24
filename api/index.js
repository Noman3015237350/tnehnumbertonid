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
        console.log(`✅ Database loaded with ${database.length} records`);
        return database;
    } catch (error) {
        console.error('❌ Error loading database:', error);
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
        console.error('❌ Error saving database:', error);
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

// Store API keys in memory
let apiKeys = ['tneh_demo_key_123'];

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
 * Helper function to normalize phone numbers for comparison
 */
function normalizeNumber(number) {
    if (!number) return '';
    const numStr = number.toString().trim();
    // Remove +880 or 880 prefix
    let normalized = numStr.replace(/^\+?880/, '');
    // Ensure it has 0 at start for 11 digit numbers
    if (normalized.length === 10 && !normalized.startsWith('0')) {
        normalized = '0' + normalized;
    }
    return normalized;
}

/**
 * Helper function to find user by number with multiple formats
 */
function findUserByNumber(searchNumber) {
    if (!searchNumber) return null;
    
    const normalizedSearch = normalizeNumber(searchNumber);
    
    // Try multiple matching strategies
    return database.find(user => {
        const userNumber = user.number.toString().trim();
        
        // Direct match
        if (userNumber === normalizedSearch) return true;
        
        // Match without leading zero
        if (normalizedSearch.startsWith('0') && 
            userNumber === normalizedSearch.substring(1)) return true;
        
        // Match with leading zero
        if (!normalizedSearch.startsWith('0') && 
            userNumber === '0' + normalizedSearch) return true;
        
        // Match with country code
        if (userNumber === '880' + normalizedSearch.replace(/^0/, '')) return true;
        if (userNumber === '+880' + normalizedSearch.replace(/^0/, '')) return true;
        
        // Match if search is without leading zero
        if (!normalizedSearch.startsWith('0') && 
            userNumber === normalizedSearch) return true;
        
        // Match if both are numbers
        if (parseInt(userNumber) === parseInt(normalizedSearch)) return true;
        
        return false;
    });
}

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
                endpoint: '/api/createkey?adminkey=TNEH3',
                description: 'Generate a new API key',
                auth_required: true
            },
            get_info_by_number: {
                method: 'GET',
                endpoint: '/api/info?key=API_KEY&number=PHONE_NUMBER',
                description: 'Get user info by phone number (supports multiple formats)',
                auth_required: true,
                params: ['key', 'number']
            },
            get_info_by_dob_nid: {
                method: 'GET',
                endpoint: '/api/info?key=API_KEY&dob=YYYY-MM-DD&nid=NID_NUMBER',
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
                endpoint: '/api/allkey?adminkey=TNEH3',
                description: 'Get all valid API keys',
                auth_required: true
            },
            debug_db: {
                method: 'GET',
                endpoint: '/api/debug/db?adminkey=TNEH3',
                description: 'Debug database contents',
                auth_required: true
            },
            search_all: {
                method: 'GET',
                endpoint: '/api/search?key=API_KEY&q=SEARCH_TERM',
                description: 'Search across all fields',
                auth_required: true,
                params: ['key', 'q']
            }
        },
        response_codes: {
            '200': 'Success - Request processed successfully',
            '400': 'Bad Request - Missing required parameters',
            '401': 'Unauthorized - Invalid or missing API key',
            '403': 'Forbidden - Admin access required',
            '404': 'Not Found - Resource not found',
            '500': 'Internal Server Error'
        },
        examples: {
            create_key: `${baseUrl}/api/createkey?adminkey=TNEH3`,
            get_info: `${baseUrl}/api/info?key=YOUR_KEY&number=01989076003`,
            get_info_nid: `${baseUrl}/api/info?key=YOUR_KEY&dob=1987-01-29&nid=2842458479`,
            check_key: `${baseUrl}/api/chack?key=YOUR_KEY`,
            delete_key: `${baseUrl}/api/delete?key=YOUR_KEY`,
            all_keys: `${baseUrl}/api/allkey?adminkey=TNEH3`,
            debug_db: `${baseUrl}/api/debug/db?adminkey=TNEH3`,
            search_all: `${baseUrl}/api/search?key=YOUR_KEY&q=89076003`
        }
    });
});

/**
 * 1. Create API Key
 * GET /api/createkey?adminkey=TNEH3
 */
app.get('/api/createkey', validateAdminKey, (req, res) => {
    const newKey = `tneh_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    apiKeys.push(newKey);
    
    res.json({
        success: true,
        message: 'API key created successfully',
        key: newKey
    });
});

/**
 * 2. Get Info by Number (FIXED - supports all formats)
 * GET /api/info?key=API_KEY&number=PHONE_NUMBER
 */
app.get('/api/info', validateApiKey, (req, res) => {
    const { number, dob, nid } = req.query;
    
    // Search by phone number with enhanced matching
    if (number) {
        const user = findUserByNumber(number);
        
        if (!user) {
            // Provide debug info to help user
            const availableNumbers = database.slice(0, 10).map(u => u.number);
            const searchNormalized = normalizeNumber(number);
            
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: `No user found with number: ${number}`,
                debug: {
                    searched_number: number,
                    normalized_search: searchNormalized,
                    available_numbers_sample: availableNumbers,
                    total_records: database.length,
                    suggestion: "Make sure the number exists in the database or try searching with different formats (with/without leading zero)"
                }
            });
        }
        
        return res.json({
            success: true,
            data: user
        });
    }
    
    // Search by DOB and NID
    if (dob && nid) {
        const normalizedDob = dob.toString().trim();
        const normalizedNid = nid.toString().trim();
        
        const user = database.find(u => 
            u.dob === normalizedDob && 
            u.nid === normalizedNid
        );
        
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
        message: 'Please provide either number OR (dob and nid) parameters',
        example: {
            by_number: '/api/info?key=YOUR_KEY&number=01989076003',
            by_dob_nid: '/api/info?key=YOUR_KEY&dob=1987-01-29&nid=2842458479'
        }
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
 * GET /api/allkey?adminkey=TNEH3
 */
app.get('/api/allkey', validateAdminKey, (req, res) => {
    res.json({
        success: true,
        keys: apiKeys,
        count: apiKeys.length
    });
});

/**
 * 6. Debug Database (NEW)
 * GET /api/debug/db?adminkey=TNEH3
 */
app.get('/api/debug/db', validateAdminKey, (req, res) => {
    const sample = database.slice(0, 10);
    const allNumbers = database.map(u => u.number);
    const allNids = database.map(u => u.nid);
    
    // Check for duplicates
    const numberDuplicates = allNumbers.filter((n, i) => allNumbers.indexOf(n) !== i);
    const nidDuplicates = allNids.filter((n, i) => allNids.indexOf(n) !== i);
    
    res.json({
        success: true,
        stats: {
            total_records: database.length,
            unique_numbers: new Set(allNumbers).size,
            unique_nids: new Set(allNids).size,
            duplicate_numbers: numberDuplicates.length > 0 ? numberDuplicates : 'None',
            duplicate_nids: nidDuplicates.length > 0 ? nidDuplicates : 'None'
        },
        sample: sample,
        all_numbers: allNumbers,
        all_nids: allNids,
        database_path: DB_PATH
    });
});

/**
 * 7. Search Across All Fields (NEW)
 * GET /api/search?key=API_KEY&q=SEARCH_TERM
 */
app.get('/api/search', validateApiKey, (req, res) => {
    const query = req.query.q;
    
    if (!query) {
        return res.status(400).json({
            success: false,
            error: 'Search query required',
            message: 'Please provide search term with q parameter'
        });
    }
    
    const searchTerm = query.toString().trim().toLowerCase();
    
    // Search in all fields
    const results = database.filter(user => {
        return Object.values(user).some(value => 
            value.toString().toLowerCase().includes(searchTerm)
        );
    });
    
    res.json({
        success: true,
        query: query,
        results: results,
        count: results.length,
        message: results.length > 0 ? 'Found matching records' : 'No records found'
    });
});

/**
 * 8. Health Check
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database_loaded: database.length > 0,
        total_records: database.length,
        uptime: process.uptime()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TNEH Database API running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    console.log(`🏠 TNEH Group: http://localhost:${PORT}/`);
    console.log(`🔑 Admin Key: ${ADMIN_KEY}`);
    console.log(`📊 Database loaded with ${database.length} records`);
    console.log(`✅ Database connected and ready!`);
});

module.exports = app;
