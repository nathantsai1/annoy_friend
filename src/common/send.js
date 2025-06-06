'use strict';

const path = require('path');
const {google} = require('googleapis');
const fs = require('fs/promises');

const gmail = google.gmail('v1');

const KEYFILE = path.join(__dirname, '../../json/oauth2.keys.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/userinfo.profile'];

let oAuth2Client = null;
async function send_oauth2(i) {
  try {
    const keys = JSON.parse(await fs.readFile(KEYFILE, 'utf8')).web;
    const redirectUri = keys.redirect_uris[i];
    oAuth2Client = new google.auth.OAuth2(
      keys.client_id,
      keys.client_secret,
      redirectUri
    );
    const url = await oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    return url;
  } catch (error) {
    console.error('Error reading OAuth2 keys:', error);
    return false; // Re-throw the error for further handling
  }
}

async function exchangeCodeForToken(code) {
  try {
    const {tokens} = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    google.options({auth: oAuth2Client});
    console.log('Tokens obtained:', tokens);
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return false;
  }
}
async function send_email(req) {
  try {
    if (!oauth) {
      console.error('OAuth token is required to send email');
      return false;
    }
    console.log(1)
    // !req.query.email || !req.query.cc || !req.query.bcc || !req.query.recipient || !req.query.content
    oAuth2Client.setCredentials({access_token: req.cookies.oauth});
    const raw = Buffer.from(`To: ${req.query.email}\nCc: ${req.query.cc}\nBcc: ${req.query.bcc}\nSubject: Annoy Friend\n\n${req.query.content}`).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: raw,
      },
    });
    console.log('Email sent successfully:', res.data);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
module.exports =  { exchangeCodeForToken, send_oauth2, send_email };