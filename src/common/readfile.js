const fs = require('fs').promises;
const path = require('path');

const templates = path.join(__dirname + "./../../templates/");

async function renderTemplate(filePath, req, res, entries) {
  try {
    const data = await fs.readFile(path.join(templates, filePath), "utf8");
    let result;
    if (!req.cookies || !req.cookies.oauth) {
      result = data.replace(/{{login}}/g, `<a href="/signup">Sign Up</a><a href="/login">Login</a>`)
            .replace(/{{footer}}/g, '<footer><div class="footer-nav"><a href="https://github.com/nathantsai1/annoy_friend">Github Repo</a><span> | <a href="/privacy">Privacy Policy</a><span> | </span><a href="/tos">Terms of Service</a><span> | </span><a href="/about">About</a></div><p>&copy; 2025 Annoy-Friend &mdash; Built with Node.js, Gmail API, and NeonDB.</p></footer>')
            .replace(/{{head}}/g, `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Annoy-Friend | {{title}}</title><link rel="stylesheet" href="/static/styles.css">`);
    } else {
      result = data.replace(/{{login}}/g, `<a href="/my-emails">My Emails</a><a href="/settings">Settings</a><a href="/logout">Logout</a>`)
      .replace(/{{footer}}/g, '<footer><div class="footer-nav"><a href="https://github.com/nathantsai1/annoy_friend">Github Repo</a><span> | <a href="/privacy">Privacy Policy</a><span> | </span><a href="/tos">Terms of Service</a><span> | </span><a href="/about">About</a></div><p>&copy; 2025 Annoy-Friend &mdash; Built with Node.js, Gmail API, and NeonDB.</p></footer>')
      .replace(/{{head}}/g, `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Annoy-Friend | {{title}}</title><link rel="stylesheet" href="/static/styles.css">`);
    }
    if(entries) {
      for (const [key, value] of Object.entries(entries)) {
        const regex = new RegExp(`{{${key}}}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        result = result.replace(regex, value);
      }
    }
    res.send(result);
    return true;
  } catch (error) {
    console.error('Error changing login:', error);
    return false; // Re-throw the error for further handling
  }

}

module.exports = { renderTemplate }