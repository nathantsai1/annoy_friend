async function readFile(filePath, res) {
  const fs = require('fs');
  try {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Server Error');
        } else {
            res.setHeader('Content-Type', 'text/html');
            res.send(data);
        }
    });
}  catch (error) {
    console.error('Error reading file:', error);
    throw error; // Re-throw the error for further handling
}}

module.exports = {readFile }