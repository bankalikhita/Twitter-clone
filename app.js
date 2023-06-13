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

//middleware//
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "secret", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

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
      let jwtToken = jwt.sign(payload, "secret");
      console.log(jwtToken);
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//api3//
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let { username } = request;
  const followinguseridsandtweets = `SELECT u.username,t.tweet, t.date_time as dateTime
FROM tweet AS t
INNER JOIN Follower AS f ON f.following_user_id = t.user_id
INNER JOIN User AS u ON u.user_id = f.following_user_id
INNER JOIN User AS u2 ON u2.user_id = f.follower_user_id
WHERE u2.username = '${username}'
ORDER BY t.date_time DESC
LIMIT 4;`;
  const dbres = await db.all(followinguseridsandtweets);
  response.send(dbres);
});

//api4//
app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  const allnames = `SELECT u.name
    FROM User AS u
    INNER JOIN Follower AS f ON f.following_user_id = u.user_id
    INNER JOIN User AS u2 ON u2.user_id = f.follower_user_id
    WHERE u2.username ='${username}';`;
  const dbres = await db.all(allnames);
  response.send(dbres);
});

//api5//
app.get("/user/followers/", authenticateToken, async (request, response) => {
  let { username } = request;
  const allnames = `SELECT u.name
    FROM User AS u
    INNER JOIN Follower AS f ON f.follower_user_id = u.user_id
    INNER JOIN User AS u2 ON u2.user_id = f.following_user_id
    WHERE u2.username ='${username}';`;
  const dbres = await db.all(allnames);
  response.send(dbres);
});

//api6//
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  let { username } = request;
  let { tweetId } = request.params;
  const allnames = `SELECT * FROM follower INNER JOIN user on follower_user_id =user.user_id where user.username='${username}' AND following_user_id = (SELECT user_id FROM tweet WHERE tweet_id = ${tweetId});`;
  const dbres = await db.all(allnames);
  if (err) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    const tweetres = `select tweet,count(like_id) as likes,count(reply_id) as replies,date_time as dateTime from tweet INNER JOIN reply on tweet.tweet_id=reply.tweet_id INNER JOIN like on reply.tweet_id=like.tweet_id;`;
    const tweetdb = await db.all(tweetres);
    response.send(tweetdb);
  }
});

module.exports = app;
