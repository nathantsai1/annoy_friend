const cookieParser = require('cookie-parser');

async function store_cookie(key, value, time, req, res) {    // Check if the cookie is already set
    if (req.cookies && req.cookies[key]) {
        console.log('Cookie already exists:', req.cookies[key]);
        return true;
    }

    // Set a new cookie
    res.cookie(key, value, {
        maxAge: time, // Cookie will expire in 15 minutes
        httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'Strict' // Helps prevent CSRF attacks
    });

    console.log('Cookie has been set');
    return true;
}

module.exports = {
    store_cookie
};