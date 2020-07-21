const express = require("express");
const router = express.Router();

router.get("/", (req, res) =>
  res.render("home", { title: "Turn your Google Sheet into an API" })
);

router.get("/privacy-policy", (req, res) =>
    res.render("privacy", { title: "Privacy Policy" })
);

module.exports = router;
