// links: /, /about, /signup, /login, /my-emails
// more: /tos, /privacy, /logout
// even more: /oauth2callback/login, /oauth2callback/signup
// and more: /settings, /send_email, /505, /update_info
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
require('dotenv').config();
dotenv.config({path: path.join(__dirname, "/.env")});


// my functions 
const { takeToken, send_oauth2, send_email } = require('./common/send');
const { readFile, changeLogin, writeFile } = require('./common/readfile');
const { store_cookie } = require('./common/cookie');
const { is_loggedin } = require('./common/is_loggedin');
const { getUsers, createUser, updateUser, getEmailsSent, updateEmail } = require('./common/neon');
const { gemini } = require('./common/gemini');
// express
const app = express();
const PORT = 35295;

// what do these paths mean?
const templates = path.join(__dirname + "/../templates/");
app.use("/static", express.static(path.join(__dirname, "../static")));
app.use("/templates", express.static(path.resolve(__dirname, "../templates")));

const main_page = process.env.MAIN_URL;

// allow req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// yummmm cookies!
app.use(cookieParser());

// Serve favicon
app.get("favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, '../favicon.ico'));
});

app.get("/", async (req, res) => {
    const result = await readFile(path.join(templates, 'main.html'));
    if (req.query && req.query.login) {
        // if logged in change navbar
        changeLogin(result, req, res)
     } else {
        // if not logged in no change navbar
        changeLogin(result, req, res, {login: `${req.query.login}`, signup: `${req.query.signup}`});
     }
    return true;
});

app.get('/home', async (req, res) => {
    res.redirect('/')
})
app.get("/about", async (req, res) => {
    const result = await readFile(path.join(templates, 'about.html'));
    changeLogin(result, req, res);
    return true;
});

app.get("/signup", async (req, res) => {
    // cool checker for cookies
    if (await is_loggedin(false, req, res, {url: main_page + "signup"})) return true;
    
    // send signup html
    const result = await readFile(path.join(templates, 'signup.html'));
    const link = await send_oauth2(1);
    if (result === false || link === false) {
        console.error('Error reading login.html');
        res.status(500).send('Server Error');
        return false;
    }
    changeLogin(result, req, res, {oauth: `${link}`, title: 'signup'});
    return true;
});

app.get("/login", async (req, res) => {
    try {
        // Check if user should be logged in
        if (await is_loggedin(false, req, res, {url: main_page + "login"})) return true;
        
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

app.get("/my-emails", async (req, res) => {
    if (await is_loggedin(true, req, res, {url: main_page + "my-emails"})) return true;
    
    const result = await readFile(path.join(templates, 'my-emails.html'));
    changeLogin(result, req, res, {name: req.cookies.name});
});

app.get("/tos", async (req, res) => {
    const result = await readFile(path.join(templates, 'tos.html'));
    changeLogin(result, req, res);
});

app.get("/privacy", async (req, res) => {
    const result = await readFile(path.join(templates, 'privacy.html'));
    changeLogin(result, req, res);
});

app.get("/logout", async (req, res) => {
    // clear cookies
    Object.keys(req.cookies).forEach(key => res.clearCookie(key));
    res.redirect('/?logout=true'); // Redirect to login page after logout
    return true;
});

app.get("/oauth2callback/login", async (req, res) => {
    if (await is_loggedin(false, req, res, {url: main_page + "login"})) return true;
    try {
        // get code
        const code = req.query.code;
        if (!code) {
            const result = await readFile(path.join(templates, '404.html'));
            changeLogin(result, req, res);
            return false
        }
        
        // get token
        const result = await takeToken(code);
        if (!result) throw new Error("Noooooooooooooooooooooooooooooooooo!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.access_token}`,
                'Accept': 'application/json'
            }
        });

        // get user info
        const userInfo = await response.json();
        const is_user = await getUsers().then(users => {
            for (const user of users) {
                if (userInfo.email == user.email) return [true, user.id]
            };
            return [false, users[users.length - 1] + 1];
        });

        // store cookie
        let cookie = {
            oauth: result.access_token,
            scopes: result.scope,
            name: userInfo.name,
            email: userInfo.email,
        }
         if (!is_user[0]) {
            // not a user, sign up
            // create a user using cookie paramaters(name, email, oauth)
            cookie.id = await createUser(cookie);
            store_cookie(cookie, result.expiry_date - Date.now(), req, res);

            res.redirect('/?signup=true')
            return true;
        }
        // user, sign in
        cookie.id = is_user[1];
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
    if (await is_loggedin(false, req, res, {url: main_page + "login"})) return true;
    try {
        // get code
        const code = req.query.code;
        if (!code) {
            const result = await readFile(path.join(templates, '505.html'));
            changeLogin(result, req, res);
            return false;
        }

        // exchange code for token
        const result = await takeToken(code);
        if (result === false) {
            res.status(500).sendFile(templates + '505.html');
            return false;
        }
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.access_token}`,
                'Accept': 'application/json'
            }
        });
        // parse info
        const userInfo = await response.json();
        const is_user = await getUsers().then(users => {
            for (const user of users) {
                if (userInfo.email == user.email) return [true, user.id]
            };
            return [false, users[users.length - 1].id + 1]
        });

        // store cookie
        let cookie = {
            oauth: result.access_token,
            scopes: result.scope,
            name: userInfo.name,
            email: userInfo.email,
        }
        // create a user using cookie paramaters(name, email, oauth)
        if (is_user[0] == true) {
            // log in
            cookie.id = is_user[1];
            store_cookie(cookie, result.expiry_date - Date.now(), req, res);
            res.redirect('/?login=true')
            return true;
        }
        // create user/sign up
        const user = await createUser(cookie)
        cookie.id = user;
        store_cookie(cookie, result.expiry_date - Date.now(), req, res);
        res.redirect('/?signup=true'); // Redirect with query parameter
        return true;
    } catch (error) {
        console.error('Error in /oauth2callback/login route:', error);
        res.status(500).send('Server Error');
        return false;
    }
});

app.get("/settings", async (req, res) => {
    if (await is_loggedin(true, req, res, {url: main_page + "login"})) return true;
    try{
        // get settings.html
        const result = await readFile(path.join(templates, 'settings.html'));
        const emails_sent = await getEmailsSent(req.cookies.id)
        
        // get ready to add information
        const entries = {
            name: req.cookies.name,
            title: 'Settings',
            num_emails: emails_sent[0].emails_sent,
            email: req.cookies.email,
            date: new Date(Number(emails_sent[0].last_updated))
        }
        // add information
        changeLogin(result, req, res, entries);
        return true;
    } catch (e) {
        console.error(e);
        res.redirect('/505')
        return false;
    }
});

app.get("/send_email", async (req, res) => {
    if (await is_loggedin(true, req, res, {url: main_page + "login"})) return true;
    
    // check for required parameters
    if (!req.query || !req.query.email || !req.query.recipient || !req.query.subject || !req.query.content || !req.query.ai) {
        res.status(400).send('Bad Request: Missing required query parameters');
        return false;
    }
    
    // if user wants ai
    if (req.query.ai && req.query.ai == 'true') {
        // get prompt
        const prompt = req.query.prompt;
        if (!prompt == prompt) throw new Error('error');

        // create modified req to change req.query.content w/gemini
        let modifiedQuery = { 
            cookies: req.cookies,
            query: {
                email: req.query.email,
                cc: req.query.cc,
                bcc: req.query.bcc,
                subject: req.query.subject,
                content: await gemini(prompt)
            }
        };
        // send email
        (send_email(modifiedQuery)) ? res.redirect('/my-emails?success=true') : res.redirect('/my-emails?success=false');
    }
    else (send_email(req)) ? res.redirect('/my-emails?success=true') : res.redirect('/my-emails?success=false');
    updateEmail(req);
    return true;
});

app.get("/505", async (req, res) => {
    // 505 err, not really needed
    const result = await readFile(path.join(templates, '505.html'));
    changeLogin(result, req, res);
    return true;
});

app.post("/update_info", async (req, res) => {
    if (await is_loggedin(true, req, res, {url: main_page + "login"})) return true;
    
    // update info from /settings(literally just name)
    if (!req.body && !req.body.name) {
        const result = await readFile(path.join(templates, '404.html'));
        changeLogin(result, req, res);
    }
    // change name in: req.cookies, neon
    store_cookie({name: req.body.name.toString()}, req.cookies.time - Date.now(), req, res);
    updateUser(req.cookies.id, {name: req.body.name, email: req.cookies.email})
    res.redirect(`/?update=true&name=${req.body.name}`)
});

// don't touch
app.get("/:error_page", async (req, res) => {
    // Handle 404 errors
    const result = await readFile(path.join(templates, '404.html'));
    if (result === false) {
        console.error('Error reading 404.html');
        res.status(500).send('Server Error');
        return false;
    } else {
        changeLogin(result, req, res, {url: `${main_page + req.originalUrl}`});
    }
    return true;
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
