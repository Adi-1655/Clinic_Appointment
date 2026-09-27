const express = require("express");

const router = express.Router();

const consultationController =
require("../controllers/consultationController");

const {isLoggedIn} =
require("../middleware/auth");

router.get(
    "/history",
    isLoggedIn,
    consultationController.history
);

router.get(
    "/pdf/:appointmentId",
    isLoggedIn,
    consultationController.downloadPrescription
);

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