const cookieParser = require("cookie-parser");

async function storeCookie(entries, time = 10*60*1000, res, type = "Strict") {
    entries.time = time + Date.now();
    
    // Set new cookies
    try {
        const cookieKeys = [];
        for (const [key, value] of Object.entries(entries)) {
            if (typeof value !== "string" && typeof value !== "number") {
                console.error(`Invalid value for cookie ${key}: must be a string`);
                return false;
            }
            
            res.cookie(key, value, {
                maxAge: time,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: type
            });
            cookieKeys.push(key);
        }
        return true;
    } catch (error) {
        console.error("Error setting cookie:", error);
        return false;
    }
}

module.exports = {
    storeCookie
};