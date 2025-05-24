// todo: /about, /main /signup, /login /my-emails

// npm install
const express = require('express');
const path = require('path');

// my functions 
const { readFile } = require('./readfile');

// express
const app = express();
const PORT = 3000;

// what do these paths mean?
const templates = path.join(__dirname + "/../templates");
app.use('/static', express.static(path.join(__dirname, '../static')));
app.use('/templates', express.static(path.join(__dirname, '/../templates')));

app.get('/', (req, res) => {
    console.log(path.join(__dirname, '../static'));
    res.sendFile(path.join(templates, 'main.html'));
    return true;
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(templates, 'about.html'));
    return true;
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(templates, 'siugnup.html'));
    return true;});

app.get('/login', (req, res) => {
    res.sendFile(path.join(templates, 'login.html'));
    return true;
});

app.get('/my-emails', (req, res) => {
    res.sendFile(path.join(templates, 'my-emails.html'));
    return true;
});


// don't touch
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
