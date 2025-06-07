// connect to neon db
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.NEON_URL);

// Get all users from the database
const getUsers = async () => {
  try {
    const result = await sql`SELECT * FROM users ORDER BY id ASC`;
    console.log('Users fetched successfully:', result);
    return result;
  } catch (error) {
    console.error('Error fetching users:', error);
    return false;
  }
};

// Get a specific user by ID
const getUserById = async (userId) => {
  try {
    const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return false;
  }
};

// Get a user by email
const getUserByEmail = async (email) => {
  try {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return false;
  }
};

// Create a new user
const createUser = async (userData) => {
  try {
    const { name, email, oauth_id } = userData;
    const result = await sql`
      INSERT INTO users (name, email, oauth_id, created_at) 
      VALUES (${name}, ${email}, ${oauth_id}, NOW()) 
      RETURNING *
    `;
    console.log('User created successfully:', result[0]);
    return result[0];
  } catch (error) {
    console.error('Error creating user:', error);
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
  getUserById,
  getUserByEmail,
  createUser,
  updateUser
};