// connect to neon db
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.NEON_URL);

// Get all users from the database
async function getUsers() {
  try {
    const result = await sql`SELECT * FROM users ORDER BY id ASC`;
    return result;
  } catch (e) {
    console.error('Error fetching users:', e);
    return false;
  }
};

// Create a new user
async function createUser(userData) {
  try {
    const { name, email } = userData;
    const result = await sql`
      INSERT INTO users (name, email, created_at) 
      VALUES (${name}, ${email}, ${Date.now()}) 
    `;
    console.log('User created successfully:', await result[0]);
    return result[0];
  } catch (e) {
    console.error('Error creating user:', e);
    return false;
  }
};

// Update user information
const updateUser = async (userId, userData) => {
  try {
    const { name, email } = userData;
    const result = await sql`
      UPDATE users 
      SET name = ${name}, email = ${email}, updated_at = NOW() 
      WHERE id = ${userId} 
      RETURNING *
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser
};