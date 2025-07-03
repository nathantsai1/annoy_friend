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
    // add to users page
    const result = await sql`
      INSERT INTO users (name, email, created_at) 
      VALUES (${name}, ${email}, ${Date.now()}) 
      RETURNING id
    `;
    // add to emails page w/ user_id
    const userId = result[0].id;

    await sql`
      INSERT INTO emails (user_id, emails_sent, last_updated) 
      VALUES (${userId}, 0, ${Date.now()}) 
    `;

    console.log('User created successfully:', await userId);
    return userId;
  } catch (e) {
    console.error('Error creating user:', e);
    return false;
  }
};

// Update user information
async function updateUser(userId, userData) {
  try {
    const { name, email } = userData;
    const result = await sql`
      UPDATE users 
      SET name = ${name}, email = ${email}
      WHERE id = ${userId} 
      RETURNING *
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
};

async function getEmailsSent(userId){
  try {
    const result = await sql `
      SELECT * FROM emails
      WHERE user_id = ${userId.toString()}`
    if (!result) return false;
    return result
  } catch(e) {
    console.log("./src/neon getEmailsSent err: ", e)
    return false;
  }
}

async function general_neon(input) {
   try {
    const result = await sql `${input}`;
    if (!result) return false;
    return result
  } catch(e) {
    console.log("./src/neon getEmailsSent err: ", e)
    return false;
  }
}
module.exports = {
  getUsers,
  createUser,
  updateUser,
  getEmailsSent,
  general_neon
};