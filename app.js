const express = require("express");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbpath = path.join(__dirname, "twitterClone.db");
let db = null;
const initializedb = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running");
    });
  } catch (e) {
    console.log(`DB ERROR:${e.message}`);
    process.exit(1);
  }
};
initializedb();

//api1//
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const checkuserexist = `select * from user where username='${username}';`;
  const checkuser = await db.get(checkuserexist);
  if (checkuser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedpwd = await bcrypt.hash(password, 10);
      const Createquery = `insert into user (username, password, name, gender) values('${username}', '${hashedpwd}', '${name}', '${gender}');`;
      const createuser = await db.run(Createquery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//api2//
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkuserquery = `select * from user where username='${username}';`;
  const checkuser = await db.get(checkuserquery);
  if (checkuser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const pwdmatch = await bcrypt.compare(password, checkuser.password);
    if (pwdmatch === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "secret");
      console.log(jwtToken);
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
module.exports = app;
