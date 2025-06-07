'use strict';

const path = require('path');
const {google} = require('googleapis');
const fs = require('fs/promises');

const gmail = google.gmail('v1');

const KEYFILE = path.join(__dirname, '../../oauth2.keys.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

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
    if (!req.cookies.oauth) {
      console.error('OAuth token is required to send email');
      return false;
    }
    console.log(req.cookies.oauth)
    console.log(1)

    if (!oAuth2Client) {
      const keys = JSON.parse(await fs.readFile(KEYFILE, 'utf8')).web;
      oAuth2Client = new google.auth.OAuth2(
        keys.client_id,
        keys.client_secret,
        keys.redirect_uris[0] // Use first redirect URI or pass index as parameter
      );
    }
    // !req.query.email || !req.query.cc || !req.query.bcc || !req.query.recipient || !req.query.content
    oAuth2Client.setCredentials({access_token: req.cookies.oauth});
        google.options({auth: oAuth2Client});

          oAuth2Client.setCredentials({access_token: req.cookies.oauth});
    google.options({auth: oAuth2Client});

    const emailLines = [
     `From: ${req.cookies.name} <${req.cookies.email}>`,
     `To: ${req.query.email}`,
      req.query.cc ? `Cc: ${req.query.cc}` : null,
     req.query.bcc ? `Bcc: ${req.query.bcc}` : null,
     `Content-Type: text/html; charset=UTF-8`,
     `MIME-Version: 1.0`,
     `Subject: ${req.query.subject}`,
     ``, // This blank line is REQUIRED to separate headers from body
     `${req.query.content}`
   ].filter(line => line !== null); // Filter out null values, but keep empty strings
    
    const raw = Buffer.from(emailLines.join('\r\n')).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log('Prepared email:', emailLines.join('\r\n'));
    console.log('Content value:', req.query.content); // Debug log
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