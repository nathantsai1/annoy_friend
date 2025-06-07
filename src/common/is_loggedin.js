const path = require("path");

const { readFile, changeLogin } = require('./readfile');

const templates = path.join(__dirname + "/../../templates/404.html");

async function is_loggedin(bool, req, res, entries) {
    // bool=true means user should not be logged in (block if logged in)
    // bool=false means user should be logged in (block if not logged in)
    
    const hasValidToken = req.cookies && req.cookies.oauth;
    
    if ((bool === true && hasValidToken) || (bool === false && !hasValidToken)) {
        // User doesn't meet the requirement, show 404/redirect
        const result = await readFile(templates);
        if (entries) {
            changeLogin(result, req, res, entries);
        } else {
            changeLogin(result, req, res);
        }
        return true; // Blocked/redirected
    } else {
        return false; // Allow to continue
    }
}

module.exports = {
    is_loggedin,
};