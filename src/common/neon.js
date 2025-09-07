// connect to neon db
const { neon } = require("@neondatabase/serverless");
require("dotenv").config();

const sql = neon(process.env.NEON_URL);

// Get all users from the database
async function getUsers() {
  try {
    const result = await sql.query(`SELECT * FROM users
      ORDER BY id ASC`);
    return result;
  } catch (e) {
    console.error("Error fetching users:", e);
    return false;
  }
};

async function getUser(email) {
  try {
    const response = await sql.query(`SELECT id FROM users WHERE email = $1`, [email]);
    return response;
  } catch (e) {
    console.error("Error fetching user:", e);
    return false;
  }
}
// Create a new user
async function createUser(userData) {
  try {
    const { name, email } = userData;
    // add to users page
    const result = await sql.query(`INSERT INTO users 
      (name, email, created_at) 
      VALUES ($1, $2, $3) 
      RETURNING id
    `, [name, email, Date.now()]);
    // add to emails page w/ user_id
    const userId = result[0].id;

    await sql.query(`INSERT INTO emails 
      (user_id, emails_sent, last_updated) 
      VALUES ($1, 0, $2) 
    `, [userId, Date.now()]);

    return userId;
  } catch (e) {
    console.error("Error creating user:", e);
    return false;
  }
};

// Update user information
async function updateUser(userId, userData) {
  try {
    const { name, email } = userData;
    const result = await sql.query(`UPDATE users 
      SET name = $1, email = $2
      WHERE id = $3
      RETURNING *
    `, [name, email, userId]);
    return result[0] || null;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
};

async function getEmailsSent(userId){
  try {
    const result = await sql.query(`SELECT * FROM emails
      WHERE user_id = $1`,
      [Number(userId)]);
    if (!result) return false;
    return result
  } catch(e) {
    console.log("./src/neon getEmailsSent err: ", e)
    return false;
  }
}

async function updateEmail(req) {
  try {
    const sent = await sql.query(`SELECT * FROM emails
    WHERE id = $1`,
    [req.cookies.id]);
    
    if (Date.now() - sent.last_updated > 24*60*60*1000) {
      // if before 24 hours
      await sql.query(`UPDATE emails 
        SET emails_sent = $1
        WHERE id = $2 `,
        [sent.emails_sent + 1, Number(req.cookies.id)]);
    } else {
      await sql.query(`UPDATE emails 
        SET emails_sent = 1
        WHERE id = $1 `,
        [req.cookies.id]);
    }
    return true;
  } catch(e) {
    console.log("./src/neon getEmailsSent err: ", e)
    return false;
  }
}

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  getEmailsSent,
  updateEmail
};