const express = require("express");

const router = express.Router();

const consultationController =
require("../controllers/consultationController");

const {isLoggedIn} =
require("../middleware/auth");

router.get(
    "/:id",
    isLoggedIn,
    consultationController.showConsultation
);

router.post(
    "/",
    isLoggedIn,
    consultationController.saveConsultation
);
module.exports = router;