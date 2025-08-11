// check if email query is right
const validateEmailQuery = (query) => {
  const required = ["email", "recipient", "subject", "content", "ai"];
  return required.every(field => query && query[field]);
};

module.exports = { validateEmailQuery };