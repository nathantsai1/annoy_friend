const fs = require('fs').promises;

async function readFile(filePath, res) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data
}  catch (error) {
    console.error('Error reading file:', error);
    return false; // Re-throw the error for further handling
}}

async function changeLogin(file, req, res, entries) {
  try {
    let result;
    if (!req.cookies || !req.cookies.oauth) {
      result = file.replace(/{{login}}/g, `<a href="/signup">Sign Up</a><a href="/login">Login</a>`)
            .replace(/{{footer}}/g, '<footer><div class="footer-nav"><a href="/privacy">Privacy Policy</a><span> | </span><a href="/tos">Terms of Service</a><span> | </span><a href="/about">About</a></div><p>&copy; 2025 Annoy-Friend &mdash; Built with Node.js, Gmail API, and NeonDB.</p></footer>')
            .replace(/{{head}}/g, `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Annoy-Friend | {{title}}</title><link rel="stylesheet" href="/static/styles.css">`);
    } else {
      result = file.replace(/{{login}}/g, `<a href="/my-emails">My Emails</a><a href="/settings">Settings</a><a href="/logout">Logout</a>`)
      .replace(/{{footer}}/g, '<footer><div class="footer-nav"><a href="/privacy">Privacy Policy</a><span> | </span><a href="/tos">Terms of Service</a><span> | </span><a href="/about">About</a></div><p>&copy; 2025 Annoy-Friend &mdash; Built with Node.js, Gmail API, and NeonDB.</p></footer>')
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

// used to delete useless html bloat that were a part of creating TOS page
async function writeFile(filePath, data) {
  try {
    await fs.writeFile(filePath, data, 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing file:', filePath, error);
    return false; // Re-throw the error for further handling
  }
}
module.exports = {readFile, changeLogin, writeFile }