const bcrypt = require("bcrypt");

const hash = bcrypt.hashSync("123456", 10);

console.log("Hashed Password:", hash);