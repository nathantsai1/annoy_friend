// todo: /about, /main /signup, /login /my-emails

// npm install
const express = require('express');
const path = require('path');

// my functions 
const { exchangeCodeForToken, send_oauth2, runSample } = require('./common/send');
const { readFile } = require('./common/readfile');
const { store_cookie } = require('./common/cookie');
// express

const app = express();
const PORT = 3000;
const cookieParser = require('cookie-parser'); // Add this

// what do these paths mean?
const templates = path.join(__dirname + "/../templates");
app.use('/static', express.static(path.join(__dirname, '../static')));
app.use('/templates', express.static(path.join(__dirname, '/../templates')));

// allow req.body and cookies
app.use(cookieParser()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(templates, 'main.html'));
    return true;
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(templates, 'about.html'));
    return true;
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(templates, 'signup.html'));
    return true;});

app.get('/login', async (req, res) => {
    if (req.query && req.query.success && req.query.success === 'true') {
        
    }
    const result = await readFile(path.join(templates, 'login.html'));
    const link = await send_oauth2();    
    if (result === false || link[0] === false) {
        console.error('Error reading login.html');
        res.status(500).send('Server Error');
        return false;
    }
    const parsedResult = result.replace(/{{oauth}}/g, link[0]);
    res.type('html').send(parsedResult);
    return true;
});

app.get('/my-emails', (req, res) => {
    res.sendFile(path.join(templates, 'my-emails.html'));
    return true;
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(templates, 'privacy.html'));
    return true;
});

app.get('/tos', (req, res) => {
    res.sendFile(path.join(templates, 'tos.html'));
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
        store_cookie('oauth', result.access_token, result.expiry_date, req, res);
        res.redirect('/login?success=true'); // Redirect with query parameter
        return true;
    } catch (error) {
        console.error('Error in /oauth2callback/login route:', error);
        res.status(500).send('Server Error');
        return false;
    }
});

app.get("/505", (req, res) => {
    res.sendFile(path.join(templates, '505.html'));
    return true;
});
// testing:
app.get('/test' , async (req, res) => {
    try {
        const result = await runSample();
        console.log(result);
        console.log(req.body);
        res.send(result);
        return true;
    } catch (error) {
        console.error('Error in /test route:', error);
        res.status(500).send('Server Error');
        return false;
    }
});

app.get('/cookies', (req, res) => {
    // Check if the cookie is set
    if (req.cookies && Object.keys(req.cookies).length > 0) {
        res.json(req.cookies);
    } else {
        console.log('No cookies found');
        res.send('No cookies found');
    }
    return true;
});

// don't touch
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
