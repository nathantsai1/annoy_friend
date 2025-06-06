const path = require("path");

const { readFile, changeLogin } = require('./readfile');

const templates = path.join(__dirname + "/../../templates/404.html");

async function is_loggedin(bool, req, res, entries) {
    if ((bool == true && req.cookies && req.cookies.oauth) || (bool == false && !req.cookies && !req.cookies.oauth)) {
        const result = await readFile(templates);
        if (entries) {
            changeLogin(result, req, res, entries);
        } else {
            changeLogin(result, req, res);
        }
        return true; // User is logged in
    } else {
        return false; // User is not logged in
    }
}

module.exports = {
    is_loggedin,
};