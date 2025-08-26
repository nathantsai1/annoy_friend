// links: /, /about, /signup, /login, /my-emails
// more: /tos, /privacy, /logout
// even more: /oauth2callback/login, /oauth2callback/signup
// and more: /settings, /send_email, /505, /update_info
const express = require("express");
const path = require("path");
const crypto = require('crypto');
const fetch = require("node-fetch");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const { App, ExpressReceiver } = require("@slack/bolt"); // slack!!


// my functions 
const { takeToken, sendOauth2, sendEmail } = require("./common/google");
const { renderTemplate } = require("./common/readfile");
const { storeCookie } = require("./common/cookie");
const { requireNoAuth, requireAuth } = require("./common/is_loggedin");
const { getUsers, getUser, createUser, updateUser, getEmailsSent, updateEmail } = require("./common/neon");
const { gemini } = require("./common/gemini");
const { validateEmailQuery } = require("./common/check");

// express from slack
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

const app = receiver.app;
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
app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "./../favicon.ico"));
});

app.get("/", async (req, res) => {
    if (req.query && req.query.login) {
        // if logged in change navbar
        renderTemplate("main.html", req, res)
     } else {
        // if not logged in no change navbar
        renderTemplate("main.html", req, res, {
            login: `${req.query.login}`, 
            signup: `${req.query.signup}`
        });
     }
    return true;
});

app.get("/logout", async (req, res) => {
    // clear cookies
    Object.keys(req.cookies).forEach(key => res.clearCookie(key));
    res.redirect("/?logout=true"); // Redirect to login page after logout
    return true;
});

app.get("/oauth2callback/:request", requireNoAuth, async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;
    if ((req.params.request != "login" && req.params.request != "signup") || !code) 
        throw new Error("Not valid url")

    try {
        // exchange google toekn for authentication
        const result = await takeToken(code, state, req.cookies.state);
        if (result === false) {
            throw new Error("bad code from user");
        }

        const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${result.access_token}`,
                "Accept": "application/json"
            }
        }); // google db

        // parse info
        const userInfo = await response.json();
        const isUser = await getUser(userInfo.email); // neon db
        let cookie = {
            oauth: result.access_token,
            scopes: result.scope,
            name: userInfo.name,
            email: userInfo.email,
            state: state
        }

        if (isUser.length == 0) {
            // user email not found. sign up
            const user = await createUser(cookie);
            cookie.id = user;
            storeCookie(cookie, result.expiry_date - Date.now(), req, res);
            res.redirect("/?signup=true"); // Redirect with query parameter
        } else {
            // log in
            cookie.id = isUser[0].id;
            storeCookie(cookie, result.expiry_date - Date.now(), req, res);
            res.redirect("/?login=true")
            return true;
        }

    } catch(e) {
        console.error(`Error in /oauth2callback/${req.params.request} route:`, e);
        res.status(500).send("Server Error");
        return false;
    }

});

app.get("/settings", requireAuth, async (req, res) => {
    try{
        const emailsSent = await getEmailsSent(req.cookies.id)
        
        // get ready to add information
        const entries = {
            name: req.cookies.name,
            title: "Settings",
            num_emails: emails_sent[0].emails_sent,
            email: req.cookies.email,
            date: new Date(Number(emailsSent[0].last_updated))
        };

        // add information
        renderTemplate("settings.html", req, res, entries);
        return true;
    } catch (e) {
        console.error(e);
        res.redirect("/505")
        return false;
    }
});

app.get("/send_email", requireAuth, async (req, res) => {
    // check for required parameters
    if (!validateEmailQuery(req.query)) {
        res.status(400).send("Bad Request: Missing required query parameters");
        return false;
    }

    // if user wants ai
    if (req.query.ai && req.query.ai == "true") {
        // get prompt
        const prompt = req.query.prompt;
        if (!prompt || prompt.trim() === '') throw new Error("bad prompt");

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
        res.redirect(`/my-emails?success=${ await sendEmail(modifiedQuery)}`);
    }
    else res.redirect(`/my-emails?success=${await sendEmail(req)}`);
    updateEmail(req);
    return true;
});


app.get("/test", async (req, res) => {
    // 505 err, not really needed
    res.send(req.cookies)
    // storeCookie({test: "test"}, Date.now() + 1000, req, res);
    // res.send("worked");
    return true;
    // console.log(await getUser("; DROP TABLE blah;"));
    return true;
});

app.post("/update_info", requireAuth, async (req, res) => {    
    // update info from /settings(literally just name)
    if (!req.body && !req.body.name) {
        renderTemplate("404.html", req, res);
    }
    // change name in: 
    storeCookie({name: req.body.name.toString()}, req.cookies.time - Date.now(), req, res); // req.cookies
    updateUser(req.cookies.id, {name: req.body.name, email: req.cookies.email}); // neon
    res.redirect(`/?update=true&name=${req.body.name}`);
});












app.get("/auth/slack", async ( req, res ) => {
    const body = req.query; // get query
    const code = body.code; // get oauth code

    const result = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        body: JSON.stringify({ 
            client_secret: process.env.SLACK_CLIENT_SECRET,
            client_id: process.env.SLACK_CLIENT_ID,
            code: code
        }),
    });

    res.send(result)

})

app.get("/slack/test", async (req, res) => {
    const result = await fetch("https://slack.com/api/" + "users.profile.get", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
            "Authorization": "Bearer " + process.env.SLACK_USER_TOKEN,
        }
    });

    const data = await result.json();

    if (!data.ok) {
        console.log(data);
        res.redirect("/500");
        return true;
    } 

    return data;
})












// don't touch
app.get("/:error_page", async (req, res) => {
    let path = req.params.error_page
    if (path == "login" || path == "signup") {
        // login or sign up
        const state = crypto.randomBytes(32).toString('hex'); // prevent CSRF attacks
        storeCookie({
                state: state
            },
            1000 * 30,
            req,
            res
        )
        const link = await sendOauth2(path, state);
        console.log(link);
        if (link == false) {
            console.error("Error reading login.html");
            res.redirect("/505");
        }
        renderTemplate(path + ".html", req, res, {
            title: String(path).charAt(0).toUpperCase() + String(path).slice(1), 
            oauth: link
        });
        return true;
    }

    let possible_paths = ["my-emails", "tos", "privacy", "about", "505"];
    // loop through paths to see if any are viable options
    for (let i in possible_paths) {
        if (possible_paths[i].toLowerCase() == path) {
            renderTemplate(possible_paths[i].toLowerCase() + ".html", req, res, {name: req.cookies.name});
            return true; // redirected succcessfully
        }
    }
    // else Handle 404 errors
    renderTemplate("404.html", req, res, {url: `${main_page + req.originalUrl}`});
    return true;
});

(async () => {
    await slackApp.start(process.env.PORT || PORT);
    console.log(`Server running at http://localhost:${PORT}/`);
})();
