const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require("body-parser");
const MongoStore = require("connect-mongo")(session);
const helmet = require("helmet");
const cors = require("cors");
const { CronJob } = require("cron");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const projectsRouter = require("./routes/projects");
const apiRouter = require("./routes/api");

const User = require("./models/user");

app.set("view engine", "ejs");
app.set("views", `${__dirname}/views`);

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
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
  })
);

// setup cors
app.use(cors());

// setup helmet
app.use(helmet());

// setup form parser
app.use(bodyParser.urlencoded({ extended: false }));

// Serve static files
app.use(
  express.static(`${__dirname}/public`, { etag: true, lastModified: true })
);

// Serve doc folder
app.use("/doc", express.static(`${__dirname}/../doc`));

// pass variables to our templates + all requests
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// App Routes
app.use("/", indexRouter);
app.use("/auth", usersRouter);
app.use("/projects", projectsRouter);
app.use("/api", apiRouter);

// Reset free quota each day (each minute)
const job = new CronJob("* * * * *", async () => {
  const resetDate = new Date();
  resetDate.setDate(resetDate.getDate() - 1);
  const users = await User.find({ lastReset: { $lt: resetDate } });
  if (users) {
    users.map(async (user) => {
      await user.updateOne({
        remainingRequests: user.dailyRequests,
        lastReset: Date.now(),
      });
    });
  }
});
job.start();

// Error handling
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// 404 handling
app.all("*", (req, res) => {
  res.status(404).send("404");
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});
