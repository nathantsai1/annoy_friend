// check if email query is right
const validEmailQuery = (query) => {
  const required = ["email", "recipient", "subject", "content", "ai"];
  return required.every(field => query && query[field]);
};

module.exports = { validEmailQuery };