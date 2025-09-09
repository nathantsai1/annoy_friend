
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
const { requireNoAuth, requireAuth, is_loggedin } = require("./common/is_loggedin");
const { getUsers, getUser, createUser, updateUser, getEmailsSent, updateEmail } = require("./common/neon");
const { gemini } = require("./common/gemini");
const { validEmailQuery } = require("./common/check");
const { sendSlackMessage } = require("./common/slack");


// express from slack
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
});

const app = receiver.app;
const PORT = process.env.PORT;

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
    renderTemplate("main.html", req, res, req.query.login ? {} : {
        login: `${req.query.login}`, 
        signup: `${req.query.signup}`
    });
});

app.get("/logout", async (req, res) => {
    // clear cookies
    Object.keys(req.cookies).forEach(key => res.clearCookie(key));
    res.redirect("/?logout=true"); // Redirect to login page after logout
});

app.get("/oauth2callback/:request", requireNoAuth, async (req, res) => {
    const { code, state } = req.query;

    try {
        if (!["login", "signup"].includes(req.params.request) || !code) {
            throw new Error("Not valid url");
        }

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
        const cookie = {
            oauth: result.access_token,
            scopes: result.scope,
            name: userInfo.name,
            email: userInfo.email,
            state: state,
            type: "google"
        };

        const isNewUser = isUser.length === 0;
        cookie.id = isNewUser ? await createUser(cookie) : isUser[0].id;
        
        storeCookie(cookie, result.expiry_date - Date.now(), res);
        res.redirect(`/?${isNewUser ? 'signup' : 'login'}=true`);

    } catch(e) {
        console.error(`Error in /oauth2callback/${req.params.request} route:`, e);
        res.status(500).send("Server Error");
    }
});

app.get("/settings", requireAuth, async (req, res) => {
    try {
        const emailsSent = await getEmailsSent(req.cookies.id);
        
        // add information
        renderTemplate("settings.html", req, res, {
            name: req.cookies.name,
            title: "Settings",
            num_emails: emailsSent[0].emails_sent,
            email: req.cookies.email,
            date: new Date(Number(emailsSent[0].last_updated))
        });
    } catch (e) {
        console.error(e);
        res.redirect("/505");
    }
});

app.get("/send_email", requireAuth, async (req, res) => {
    // check for required 
    try {
        if (!validEmailQuery(req.query)) {
            return res.status(400).send("Bad Request: Missing required query parameters");
        }

        let emailReq = req;
        
        // if user wants ai
        if (req.query.ai === "true") {
            // get prompt
            const prompt = req.query.prompt;
            if (!prompt?.trim()) throw new Error("bad prompt");

            // create modified req to change req.query.content w/gemini
            emailReq = { 
                cookies: req.cookies,
                query: {
                    ...req.query,
                    content: await gemini(prompt)
                }
            };
        }
        
        // send email
        const success = await sendEmail(emailReq);
        res.redirect(`/my-emails?success=${success}`);
        updateEmail(req);
    } catch (e) {
        console.log("/send_email err: ", e);
        res.redirect("/505");
    }
});


app.get("/test", async (req, res) => {
    // 505 err, not really needed
    res.send(req.cookies);
});

app.post("/update_info", requireAuth, async (req, res) => {    
    // update info from /settings(literally just name)
    if (!req.body?.name) {
        res.redirect("/505");
        return;
    }

    // change name in: 
    storeCookie({name: req.body.name.toString()}, req.cookies.time - Date.now(), res); // req.cookies
    updateUser(req.cookies.id, {name: req.body.name, email: req.cookies.email}); // neon
    res.redirect(`/?update=true&name=${req.body.name}`);
});












// Remove duplicate/broken auth/slack route - using the correct one below

slackApp.command("/test-radio", async ({ command, ack, respond }) => {
      try {
        // Call the conversations.list method using the built-in WebClient
        const result = await app.client.conversations.list({
          token: process.env.SLACK_USER_TOKEN,
          exclude_archived: true,
          
        });

        console.log(result);
        console.log(result.json());
        const name = "nathans-dev-channel";
        let conversationId;
        for (const channel of result.channels) {
          if (channel.name === name) {
            conversationId = channel.id;

            // Print result
            console.log("Found conversation ID: " + conversationId);
            // Break from for loop
            break;
          }
        }

        const message = {
          "channel": conversationId,
          "text": "Hello, world"
        }

      } catch (e) {
        console.log("Error: ", e);
      }

      return true;
});

app.get("/slack/test", async (req, res) => {
    try {
        const result = await fetch("https://slack.com/api/users.profile.get", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": "Bearer " + process.env.SLACK_USER_TOKEN,
            }
        });

        const data = await result.json();

        if (!data.ok) {
            console.log(data);
            return res.redirect("/500");
        } 

        res.json(data);
    } catch (error) {
        console.error('Slack test error:', error);
        res.status(500).json({ error: 'Failed to test Slack API' });
    }
});

app.get("/slack/status", requireAuth, async (req, res) => {
    try {
        // Check if user has Slack tokens stored
        const slackToken = req.cookies.slack_token || req.cookies.slack_access_token;
        
        if (!slackToken) {
            return res.json({ 
                connected: false,
                workspace: null 
            });
        }

        // Test the token by calling Slack API
        const response = await fetch('https://slack.com/api/auth.test', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${slackToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.ok) {
            res.json({ 
                connected: true, 
                workspace: data.team,
                user: data.user 
            });
        } else {
            // Token is invalid, clear it
            res.clearCookie('slack_token');
            res.clearCookie('slack_access_token');
            res.json({ 
                connected: false,
                workspace: null 
            });
        }
    } catch (error) {
        console.error('Error checking Slack status:', error);
        res.json({ 
            connected: false,
            workspace: null,
            error: error.message 
        });
    }
});

app.get("/auth/slack", requireAuth, async (req, res) => {
    try {
        const state = crypto.randomBytes(32).toString('hex');
        
        // Store state for CSRF protection
        res.cookie('slack_oauth_state', state, {
            maxAge: 10 * 60 * 1000, // 10 minutes
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'Lax'
        });

        const slackAuthUrl = `https://slack.com/oauth/v2/authorize?` +
            `client_id=${process.env.SLACK_CLIENT_ID}&` +
            `scope=chat:write,users:read&` +
            `redirect_uri=${encodeURIComponent(process.env.SLACK_REDIRECT_URI)}&` +
            `state=${state}`;

        res.redirect(slackAuthUrl);
    } catch (error) {
        console.error('Error starting Slack OAuth:', error);
        res.status(500).send('Failed to initiate Slack connection');
    }
});

app.get("/auth/slack/callback", requireAuth, async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error) {
            console.error('Slack OAuth error:', error);
            return res.redirect('/slack?error=access_denied');
        }

        if (!code || !state) {
            return res.redirect('/slack?error=missing_params');
        }

        // Verify state parameter
        if (state !== req.cookies.slack_oauth_state) {
            return res.redirect('/slack?error=state_mismatch');
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.SLACK_CLIENT_ID,
                client_secret: process.env.SLACK_CLIENT_SECRET,
                code: code,
                redirect_uri: process.env.SLACK_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.ok) {
            console.error('Slack token exchange failed:', tokenData);
            return res.redirect('/slack?error=token_exchange_failed');
        }

        // Store the access token
        res.cookie('slack_access_token', tokenData.access_token, {
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'Lax'
        });

        // Clear the state cookie
        res.clearCookie('slack_oauth_state');

        // Redirect back to slack page with success
        res.redirect('/slack?connected=true');

    } catch (error) {
        console.error('Error in Slack OAuth callback:', error);
        res.redirect('/slack?error=server_error');
    }
});

// Serve Slack page
app.get("/slack", requireAuth, async (req, res) => {
    renderTemplate("slack.html", req, res, {
        title: "Slack Messages",
        name: req.cookies.name || "User"
    });
});

// Efficient Slack message sending route (manual & AI)
app.get("/send_slack", requireAuth, async (req, res) => {
    try {
        const slackToken = req.cookies.slack_access_token;
        if (!slackToken) {
            return res.redirect("/slack?error=not_connected");
        }

        // Get channel or user (target) and message content
        const { target, content, ai, reactions } = req.query;
        let text = content;

        // If AI, generate message content
        if (ai === "true" && req.query.prompt) {
            text = await gemini(req.query.prompt);
        }

        // Parse reactions if provided
        const reactionList = reactions ? reactions.split(",").map(r => r.trim()).filter(Boolean) : [];

        const success = await sendSlackMessage({
            token: slackToken,
            channel: target,
            text,
            reactions: reactionList
        });

        res.redirect(`/slack?success=${success}`);
    } catch (e) {
        console.error("/send_slack err: ", e);
        res.redirect("/slack?success=false");
    }
});










// don't touch
app.get("/:error_page", async (req, res) => {
    const path = req.params.error_page;
    
    if (["login", "signup"].includes(path)) {
        // login or sign up
        if (await is_loggedin(false, req, res, {url: main_page + req.path})) return;
        
        // Clear old state cookie and set new one
        const state = crypto.randomBytes(32).toString('hex'); // prevent CSRF attacks
        res.clearCookie('state');
        storeCookie({state: state}, 1000 * 60 * 30, res, "Lax");

        const link = await sendOauth2(state);
        if (link === false) {
            console.error("Error reading login.html");
            return res.redirect("/505");
        }
        
        renderTemplate(path + ".html", req, res, {
            title: path.charAt(0).toUpperCase() + path.slice(1), 
            oauth: link
        });
    } else {
        const possible_paths = [
            {name: "my-emails", need_oauth: true, type: "google"},
            {name: "tos", need_oauth: null},
            {name: "privacy", need_oauth: null},
            {name: "about", need_oauth: null},
            {name: "505", need_oauth: null}
        ];
        
        // loop through paths to see if any are viable options
        const pathMatch = possible_paths.find(p => p.name.toLowerCase() === path);
        
        if (pathMatch) {
            const validOauth = pathMatch.need_oauth === null || 
                              (pathMatch.type === req.cookies.type && Boolean(req.cookies.oauth) === pathMatch.need_oauth);
            
            if (validOauth) {
                return renderTemplate(pathMatch.name.toLowerCase() + ".html", req, res, {name: req.cookies.name});
            }
        }
        
        // else Handle 404 errors
        renderTemplate("404.html", req, res, {url: `${main_page + req.originalUrl}`});
    }
});

(async () => {
    await slackApp.start(PORT || PORT);
    console.log(`Server running at http://localhost:${PORT}/`);
})();
