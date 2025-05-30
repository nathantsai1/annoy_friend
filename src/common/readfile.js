const fs = require('fs').promises;

async function readFile(filePath, res) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data
}  catch (error) {
    console.error('Error reading file:', error);
    return false; // Re-throw the error for further handling
}}

module.exports = {readFile }