const path = require("path");
require("dotenv").config();

const { changeLogin } = require("./readfile");

const main_page = process.env.MAIN_URL;

async function is_loggedin(bool, req, res, entries) {
    // bool=false means user should not be logged in (block if logged in)
    // bool=true means user should be logged in (block if not logged in)

    const is_token = (req.cookies && req.cookies.oauth) ? true : false;
    if (bool == false && is_token==true) return change(req, res, entries);
    else if (bool == true && is_token==false) return change(req, res, entries)
    return false; // to return back to server as
}

const requireAuth = async (req, res, next) => {
  if (await is_loggedin(true, req, res, {url: main_page + "login"})) return; // if user is not logged in
  next(); // Continue to the actual route handler if logged in
};

const requireNoAuth = async (req, res, next) => {
  if (await is_loggedin(false, req, res, {url: main_page + req.path})) return; // if user has logged in
  next(); // Continue if not logged in
};

async function change(req, res, entries) {
    // User doesn't meet the requirement, show 404/redirect
    if (entries) {
        changeLogin("404.html", req, res, entries);
    } else {
         changeLogin("404.html", req, res);
    }
    return true; // Blocked/redirected
}

module.exports = {
    is_loggedin,
    requireNoAuth,
    requireAuth
};