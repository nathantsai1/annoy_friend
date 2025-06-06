// todo: /about, /main /signup, /login /my-emails

// links: /favicon.ico, /, /about, /signup, /login, 
// /my-emails, /tos, /privacy, /logout, 
// /oauth2callback/login, 
// /oauth2callback/signup, /505
// /test, /cookies, /:error_page

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

// my functions 
const { exchangeCodeForToken, send_oauth2, send_email } = require('./common/send');
const { readFile, changeLogin, writeFile } = require('./common/readfile');
const { store_cookie } = require('./common/cookie');
const { is_loggedin } = require('./common/is_loggedin');
const { send } = require('process');

// express
const app = express();
const PORT = 3000;

// what do these paths mean?
const templates = path.join(__dirname + "/../templates");
app.use('/static', express.static(path.join(__dirname, '../static')));
app.use('/templates', express.static(path.join(__dirname, '/../templates')));

const main_page = 'http://localhost:3000/';

// allow req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// yummmm cookies!
const cookieParser = require('cookie-parser');
const { write } = require('fs');
app.use(cookieParser()); // Add this line

// Serve favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '../favicon.ico'));
});

app.get("/", async (req, res) => {
    console.log("hi")
    const result = await readFile(path.join(templates, 'main.html'));
    if (req.query && req.query.login) {
        changeLogin(result, req, res)
     } else {
        changeLogin(result, req, res, {login: `${req.query.login}`, signup: `${req.query.signup}`});
     }

    return true;
});

app.get('/about', async (req, res) => {
    const result = await readFile(path.join(templates, 'about.html'));
    changeLogin(result, req, res);
    return true;
});

app.get('/signup', async (req, res) => {
    if (await is_loggedin(true, req, res, {url: main_page + "signup"})) return true;
    const result = await readFile(path.join(templates, 'signup.html'));
    const link = await send_oauth2(1);
    if (result === false || link === false) {
        console.error('Error reading login.html');
        res.status(500).send('Server Error');
        return false;
    }
    changeLogin(result, req, res, {oauth: `${link}`});
    return true;
});

app.get('/login', async (req, res) => {
    try {
        // Check if user is already logged in
        if (await is_loggedin(true, req, res, {url: main_page + "login"})) return true;
        
        // Read login template and get OAuth link
        const result = await readFile(path.join(templates, 'login.html'));
        const link = await send_oauth2(0);
        
        if (result === false || link === false) {
            console.error('Error reading login.html or generating OAuth link');
            res.status(500).send('Server Error');
            return false;
        }
        
        // Render the login page with OAuth link
        changeLogin(result, req, res, {oauth: `${link}`});
        return true;
        
    } catch (error) {
        console.error('Error in /login route:', error);
        res.status(500).send('Server Error');
        return false;
    }
});

app.get('/my-emails', async (req, res) => {
    const result = await readFile(path.join(templates, 'my-emails.html'));
    changeLogin(result, req, res);
});

app.get('/tos', async (req, res) => {
    const result = await readFile(path.join(templates, 'tos.html'));
    changeLogin(result, req, res);
});

app.get('/privacy', async (req, res) => {
    const result = await readFile(path.join(templates, 'privacy.html'));
    changeLogin(result, req, res);
});

app.get('/logout', async (req, res) => {
    // Clear the cookie by setting its maxAge to 0
    // if (!req.cookies || !req.cookies.oauth) {
    //     const result = await readFile(path.join(templates, '404.html'));
    //     changeLogin(result, req, res, {url: `${main_page}logout`});
    //     return false;
    // }
    Object.keys(req.cookies).forEach(key => res.clearCookie(key));
    console.log('Cookies has been cleared');
    res.redirect('/?logout=true'); // Redirect to login page after logout
    return true;
});

app.get("/oauth2callback/login", async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            res.status(500).send('Server error');
            return false;
        }
        const result = await exchangeCodeForToken(code);
        console.log(`Received OAuth2 auth:`, result);
        let cookie = {
            oauth: result.access_token,
            scopes: result.scope,
        }
        store_cookie(cookie, result.expiry_date - Date.now(), req, res);
        res.redirect('/?login=true'); // Redirect with query parameter
        return true;
    } catch (error) {
        console.error('Error in /oauth2callback/login route:', error);
        res.status(500).send('Server Error');
        return false;
    }
});

app.get("/oauth2callback/signup", async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            res.status(500).send('Server error');
            return false;
        }        
        const result = await exchangeCodeForToken(code);
        console.log(`Received OAuth2 auth:`, result);
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.access_token}`,
                'Accept': 'application/json'
            }
        });
        const userInfo = await response.json();
        let cookie = {
            oauth: result.access_token,
            scopes: result.scope,
            id: userInfo.id,
            name: userInfo.name
        }
        store_cookie(cookie, result.expiry_date - Date.now(), req, res);
        res.redirect('/?signup=true'); // Redirect with query parameter
        return true;
    } catch (error) {
        console.error('Error in /oauth2callback/login route:', error);
        res.status(500).send('Server Error');
        return false;
    }
});

app.get("/send_email", async (req, res) => {
    if (!req.query || !req.query.email || !req.query.cc || !req.query.bcc || !req.query.recipient || !req.query.content) {
        res.status(400).send('Bad Request: Missing required query parameters');
        return false;
    }
    
    (send_email(req)) ? res.send('Email sent successfully') : res.status(500).send('Failed to send email');
    return true;
});
app.get("/505", async (req, res) => {
    const result = await readFile(path.join(templates, '505.html'));
    changeLogin(result, req, res);
});

// testing:
app.get('/test' , async (req, res) => {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${req.cookies.oauth}`,
                'Accept': 'application/json'
            }
        });       
        const userInfo = await response.json();
        console.log(userInfo);
        try {
        store_cookie({
            id: userInfo.id,
            name: userInfo.name
        }, 60*60*1000, req, res);
        res.redirect("/")
        return true;
    } catch (error) {
        console.error('Error storing cookie:', error);
        return false;
    }
        // const result = await readFile(path.join(templates, 'privacy.txt'));
        // console.log(await writeFile(path.join(templates, 'privacy.txt'), result));
        // res.send(1);
        // return true;
        
        // res.sendFile(path.join(templates, 'new_privacy_clean.html'));
        // let result = await readFile(path.join(templates, '../json/goauth.json'));
        // result = JSON.parse(result);
        // store_cookie('oauth', result.access_token, result.expiry_date, req, res);
        // res.json(result)
        // return true;
    } catch (error) {
        console.error('Error in /test route:', error);
        res.status(500).send('Server Error');
        return false;
    }
});

app.get('/cookies', async (req, res) => {
    // Check if the cookie is set
    if (req.cookies && Object.keys(req.cookies).length > 0) {
        res.json(req.cookies);
    } else {
        res.send("no cookies found")
        console.log('No cookies found');    }
    return true;
});

// don't touch
app.get('/:error_page', async (req, res) => {
    // Handle 404 errors
    const result = await readFile(path.join(templates, '404.html'));
    if (result === false) {
        console.error('Error reading 404.html');
        res.status(500).send('Server Error');
        return false;
    } else {
        changeLogin(result, req, res, {url: `${req.protocol + '://' + req.get('host') + req.originalUrl}`});
    }
    return true;
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
