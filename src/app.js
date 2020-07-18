const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require("body-parser");
const MongoStore = require("connect-mongo")(session);

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const projectsRouter = require("./routes/projects");

app.set("view engine", "pug");
app.set("views", __dirname + "/views");

// setup database
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

// setup session
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

app.use("/", indexRouter);
app.use("/auth", usersRouter);
app.use("/projects", projectsRouter);

app.listen(port, () => {
  console.log("Server listening on port " + port);
});
