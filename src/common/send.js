'use strict';

const path = require('path');
const {google} = require('googleapis');
const fs = require('fs/promises');

const gmail = google.gmail('v1');

const KEYFILE = path.join(__dirname, '../../oauth2.keys.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

let oAuth2Client = null;
async function send_oauth2() {
  try {
    const keys = JSON.parse(await fs.readFile(KEYFILE, 'utf8')).web;
    const redirectUri = keys.redirect_uris[0];
    oAuth2Client = new google.auth.OAuth2(
      keys.client_id,
      keys.client_secret,
      redirectUri
    );
    const url = await oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    return [url, oAuth2Client];
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
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return false;
  }
}
async function runSample() { 
  // Obtain user credentials to use for the request
  console.log(KEYFILE);
  const keys = JSON.parse(await fs.readFile(KEYFILE, 'utf8')).web;
  const redirectUri = keys.redirect_uris[0];
  const oAuth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    redirectUri
  );
  google.options({auth});
  console.log(auth);
  const subject = '🤘 Hello 🤘';
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    'From: the fake joe<itsthefakejoe@gmail.com>',
    'To: liar<iamveryerverybadatchess@gmail.com>',
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '\nThis is a message just to say hello.',
    'So... <b>Hello!</b>  🤘❤️😎',
  ];
  const message = messageParts.join('\n');

  // The body needs to be base64url encoded.
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
  return res.data;
}

if (module === require.main) {
  runSample().catch(console.error);
}
module.exports =  { exchangeCodeForToken, send_oauth2, runSample };