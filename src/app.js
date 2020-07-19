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

app.set("view engine", "ejs");
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

// Serve static files
app.use(express.static(__dirname + '/public'));

// App Routes
app.use("/", indexRouter);
app.use("/auth", usersRouter);
app.use("/projects", projectsRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// 404 handling
app.all("*", (req, res, next) => {
  res.status(404).send("404");
});

app.listen(port, () => {
  console.log("Server listening on port " + port);
});
