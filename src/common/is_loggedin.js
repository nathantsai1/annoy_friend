const path = require("path");
require("dotenv").config();
const crypto = require('crypto');

const { renderTemplate } = require("./readfile");
const { storeCookie } = require("./cookie");

const main_page = process.env.MAIN_URL;

async function is_loggedin(bool, req, res, entries = {}) {
  try {
    // bool=false means user should not be logged in (block if logged in)
    // bool=true means user should be logged in (block if not logged in)
    // if (!req.cookies.state) { // for google oauth
    //   console.log("error on is_logged_in")
    //   const state = crypto.randomBytes(32).toString('hex'); // prevent CSRF attacks
    //   storeCookie({
    //     state: state
    //   }, 1000*60*30, req, res); // store state
    //   res.redirect(req.originalUrl);
    //   return false;
    // }
    const is_token = (req.cookies && req.cookies.oauth) ? true : false;
    if (bool == false && is_token==true) return change(req, res, entries);
    else if (bool == true && is_token==false) return change(req, res, entries);
    return false; // to return back to server as false
  } catch(e) {
    console.log(e);
  }
}

const requireAuth = async (req, res, next) => {
  if (await is_loggedin(true, req, res, {url: main_page + req.path})) return; // if user is not logged in
  next(); // Continue to the actual route handler if logged in
};

const requireNoAuth = async (req, res, next) => {
  if (await is_loggedin(false, req, res, {url: main_page + req.path})) return; // if user has logged in
  next(); // Continue if not logged in
};

async function change(req, res, entries) {
    // User doesn't meet the requirement, show 404/redirect
    if (entries) {
        renderTemplate("404.html", req, res, entries);
    } else {
         renderTemplate("404.html", req, res);
    }
    return true; // Blocked/redirected
}

module.exports = {
    is_loggedin,
    requireNoAuth,
    requireAuth
};