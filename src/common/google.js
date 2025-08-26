"use strict";

const path = require("path");
const {google} = require("googleapis");
const fs = require("fs/promises");
const crypto = require('crypto');

require("dotenv").config();

// todo: uncomment
const main_url = process.env.MAIN_URL;
const gmail = google.gmail("v1");

const KEYFILE = path.join(__dirname, "../../oauth2.keys.json");
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send", 
  "https://www.googleapis.com/auth/userinfo.profile", 
  "https://www.googleapis.com/auth/userinfo.email"
];

const redirectUri = main_url + "oauth2callback/" + "login";
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri,
); // set up google client

// generate redirect url from path("login", "signup")
async function sendOauth2(path, state) {
  try {
    const url = await oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      state: state
    });

    return url;
  } catch (error) {
    console.error("Error reading OAuth2 keys: ", error);
    return false; // Re-throw the error for further handling
  }
}

// exchange code for token
async function takeToken(code, state, cookie_state) {
  try {    
    // Ensure oAuth2Client is initialized
    if (!state || state != cookie_state) {
      console.log(state, cookie_state);
      throw new Error("State mismatch. Possible CSRF attack");
    }
    
    const {tokens} = await oAuth2Client.getToken(code); // take token
    oAuth2Client.setCredentials(tokens);
    google.options({auth: oAuth2Client});
    return tokens;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return false;
  }
}

async function sendEmail(req) {
  try {
    oAuth2Client.setCredentials({access_token: req.cookies.oauth});
    google.options({auth: oAuth2Client});

    if (!req.query.email || !req.query.content || !req.query.recipient) throw new Error("Missing parameters");

    const emailLines = [ // create email
     `From: ${req.cookies.name} <${req.cookies.email}>`,
     `To: ${req.query.email}`,
      req.query.cc ? `Cc: ${req.query.cc}` : null,
     req.query.bcc ? `Bcc: ${req.query.bcc}` : null,
     `Content-Type: text/html; charset=UTF-8`,
     `MIME-Version: 1.0`,
     `Subject: ${req.query.subject}`,
     ``, // seperate headers from body
     `${req.query.content}`
   ].filter(line => line !== null); // Filter out null values, but keep empty strings
    
    const raw = Buffer.from(emailLines.join("\r\n")).toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
      
    await gmail.users.messages.send({ // send message. throws err if err
      userId: "me",
      requestBody: {
        raw: raw,
      },
    });
    return true;
    
  } catch (error) {
    console.error("Error sending email: ", error);
    return false;
  }
}
module.exports =  { takeToken, sendOauth2, sendEmail };