const cookieParser = require('cookie-parser');

async function store_cookie(entries, time, req, res) {
    // Check if any cookies already exist
    const existingCookies = Object.keys(entries).filter(key => req.cookies && req.cookies[key]);
    if (existingCookies.length > 0) {
        console.log('Existing cookies found:', existingCookies);
        console.log('Overwriting cookies...');
    }

    // Set new cookies
    try {
        const cookieKeys = [];
        for (const [key, value] of Object.entries(entries)) {
            if (typeof value !== 'string') {
                console.error(`Invalid value for cookie ${key}: must be a string`);
                return false;
            }
            
            console.log(`Setting cookie: ${key}=${value}`);
            res.cookie(key, value, {
                maxAge: time, 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'Strict'
            });
            cookieKeys.push(key);
        }
        
        console.log(`Cookies set: [${cookieKeys.join(', ')}], expires in ${time} ms`);
    } catch (error) {
        console.error('Error setting cookie:', error);
        return false;
    }

    console.log('All cookies have been set successfully');
    return true;
}

module.exports = {
    store_cookie
};