// todo: /about, /main /signup, /login /my-emails

// links: /favicon.ico, /, /about, /signup, /login, 
// /my-emails, /tos, /privacy, /logout, 
// /oauth2callback/login, /settings
// /oauth2callback/signup, /505
// /test, /cookies, /:error_page

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

// my functions 
const { takeToken, send_oauth2, send_email } = require('./common/send');
const { readFile, changeLogin, writeFile } = require('./common/readfile');
const { store_cookie } = require('./common/cookie');
const { is_loggedin } = require('./common/is_loggedin');
const { getUsers, createUser, updateUser, getEmailsSent, general_neon } = require('./common/neon');
const { gemini } = require('./common/gemini');
// express
const app = express();
const PORT = 3000;

// what do these paths mean?
const templates = path.join(__dirname + "/../templates/");
app.use("/static", express.static(path.join(__dirname, "../static")));
app.use("/templates", express.static(path.join(__dirname, "/../templates")));

const main_page = process.env.MAIN_URL;

// allow req.body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// yummmm cookies!
const cookieParser = require('cookie-parser');
const { write } = require('fs');
app.use(cookieParser()); // Add this line

// Serve favicon
app.get("favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, '../favicon.ico'));
});

app.get("/", async (req, res) => {
    const result = await readFile(path.join(templates, 'main.html'));
    if (req.query && req.query.login) {
        changeLogin(result, req, res)
     } else {
        changeLogin(result, req, res, {login: `${req.query.login}`, signup: `${req.query.signup}`});
     }

    return true;
});

app.get("/about", async (req, res) => {
    const result = await readFile(path.join(templates, 'about.html'));
    changeLogin(result, req, res);
    return true;
});

app.get("/signup", async (req, res) => {
    if (await is_loggedin(false, req, res, {url: main_page + "signup"})) return true;
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
        const code = req.query.code;
        if (!code) {
            res.status(500).send('Server error');
            return false;
        }
        const result = await takeToken(code);
        if (!result) throw new Error("Noooooooooooooooooooooooooooooooooo!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${result.access_token}`,
                'Accept': 'application/json'
            }
        });
        const userInfo = await response.json();
        const is_user = await getUsers().then(users => {
            for (const user of users) {
                if (userInfo.email == user.email) return [true, user.id]
            };
            return [false, users[users.length - 1] + 1];
        });

        let cookie = {
            oauth: result.access_token,
            scopes: result.scope,
            name: userInfo.name,
            email: userInfo.email,
        }
         if (!is_user[0]) {
            // create a user using cookie paramaters(name, email, oauth)
            cookie.id = await createUser(cookie);
            console.log(cookie);
            store_cookie(cookie, result.expiry_date - Date.now(), req, res);

            res.redirect('/?signup=true')
            return true;
        }
        cookie.id = is_user[1];
        console.log(cookie);
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
        const code = req.query.code;
        if (!code) {
            res.status(500).send('Server error');
            return false;
        }
        console.log(code)
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
        const userInfo = await response.json();
        const is_user = await getUsers().then(users => {
            for (const user of users) {
                if (userInfo.email == user.email) return [true, user.id]
            };
            return [false, users[users.length - 1].id + 1]
        });
        let cookie = {
            oauth: result.access_token,
            scopes: result.scope,
            name: userInfo.name,
            email: userInfo.email,
        }
        // create a user using cookie paramaters(name, email, oauth)
        if (is_user[0] == true) {
            cookie.id = is_user[1];
            console.log(cookie)
            store_cookie(cookie, result.expiry_date - Date.now(), req, res);
            res.redirect('/?login=true')
            return true;
        }
        const user = await createUser(cookie)
        cookie.id = user;
        console.log(cookie)
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
        const result = await readFile(path.join(templates, 'settings.html'));
        const emails_sent = await getEmailsSent(req.cookies.id)
        const entries = {
            name: req.cookies.name,
            title: 'Settings',
            num_emails: emails_sent[0].emails_sent,
            email: req.cookies.email,
            date: new Date(Number(emails_sent[0].last_updated))
        }
        changeLogin(result, req, res, entries);
        return true;
    } catch (e) {
        console.error(e);
        res.redirect('/505')
        return false;
    }
});

app.get("/send_email", async (req, res) => {
    if (!req.query || !req.query.email || !req.query.recipient || !req.query.subject || !req.query.content || !req.query.ai) {
        res.status(400).send('Bad Request: Missing required query parameters');
        return false;
    }
    
    (send_email(req)) ? res.redirect('/my-emails?success=true') : res.redirect('/my-emails?success=false');
    return true;
});

app.get("/505", async (req, res) => {
    const result = await readFile(path.join(templates, '505.html'));
    changeLogin(result, req, res);
    return true;
});

app.get("/gemini", async (req, res) => {
    const prompt = await readFile(path.join(__dirname, './../txt/content.ex.txt'));
    await gemini(prompt);
    console.log('/server-end worked')
    res.redirect(`/505`)
})
app.post("/update_info", async (req, res) => {
    if (!req.body && !req.body.name) {
        const result = await readFile(path.join(templates, '404.html'));
        changeLogin(result, req, res);
    }
    // todo: change name from req.cookies.name to req.body.name and in neon
    // change name in: cookie, neon
    store_cookie({name: req.body.name.toString()}, req.cookies.time - Date.now(), req, res);
    updateUser(req.cookies.id, {name: req.body.name, email: req.cookies.email})
    console.log(req.body);
    res.redirect(`/?update=true&name=${req.body.name}`)
});

// technical stuff
app.get("/cookies", async (req, res) => {
    // Check if the user is logged in    
    // Read the cookies from the request
    // Send the response
    res.send(req.cookies);
});

app.get("/test", async (req, res) => {
    // sending right information for /User_info
    const result = await readFile(path.join(templates, 'settings.html'));
    const emails_sent = await getEmailsSent(req.cookies.id)
    const entries = {
        name: req.cookies.name,
        title: 'Settings',
        num_emails: emails_sent[0].emails_sent,
        email: req.cookies.email,
        date: new Date(Number(emails_sent[0].last_updated))
    }

    changeLogin(result, req, res, entries);
    return true;
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
