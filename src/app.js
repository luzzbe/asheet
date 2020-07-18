const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require("body-parser");
const MongoStore = require("connect-mongo")(session);
const { google } = require("googleapis");

const {
  login,
  loginHandle,
  isLoggedIn,
  logoutHandle,
} = require("./user/userController");
const {
  createProjectHandle,
  getProjectsHandle,
  deleteProjectHandle,
  getProjectHandle,
  syncProjectHandle,
  getProjectEndpointHandle,
} = require("./project/projectController");
const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");

mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.get("/", (req, res) => res.render("home"));

app.get("/projects", isLoggedIn, getProjectsHandle);
app
  .route("/projects/new")
  .get(isLoggedIn, (req, res) => res.render("projects/new"))
  .post(isLoggedIn, createProjectHandle);
app.get("/project/:id", isLoggedIn, getProjectHandle);
app.get("/project/:id/sync", isLoggedIn, syncProjectHandle);
app.get("/project/:id/delete", isLoggedIn, deleteProjectHandle);

app.get("/api/:project/:endpoint", getProjectEndpointHandle);

app.get("/auth/google", login);
app.get("/auth/logout", logoutHandle);
app.get("/auth/google/callback", loginHandle);

module.exports = app;
