const path = require("path");

const { readFile, changeLogin } = require('./readfile');

const templates = path.join(__dirname + "/../../templates/404.html");

async function is_loggedin(bool, req, res, entries) {
    // bool=false means user should not be logged in (block if logged in)
    // bool=true means user should be logged in (block if not logged in)

    const is_token = (req.cookies && req.cookies.oauth) ? true : false;
    if (bool == false && is_token==true) return change(req, res, entries);
    else if (bool == true && is_token==false) return change(req, res, entries)
    return false; // to return back to server as
}

async function change(req, res, entries) {
    // User doesn't meet the requirement, show 404/redirect
    const result = await readFile(templates);
    if (entries) {
        changeLogin(result, req, res, entries);
    } else {
         changeLogin(result, req, res);
    }
    return true; // Blocked/redirected
}

module.exports = {
    is_loggedin,
};