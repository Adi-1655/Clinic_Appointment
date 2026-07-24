const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/appointmentController");

router.get("/appointment", appointmentController.showBookingForm);

router.get(
    "/appointment/check-slots",
    appointmentController.checkSlots
);

router.post(
    "/appointment",
    appointmentController.bookAppointment
);

module.exports = router;

