const express = require("express");
const router = express.Router();
const { landingPage } = require("../controllers/index-controller");

router.get("/", landingPage);

module.exports = router;
