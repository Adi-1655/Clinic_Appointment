const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

router.get("/login",adminController.showLogin);

router.post(
"/login",
adminController.login
);

const {isLoggedIn}=require("../middleware/auth");

router.get(
"/dashboard",
isLoggedIn,
adminController.dashboard
);

router.patch(
    "/appointments/:id",
    isLoggedIn,
    adminController.markAsDone
);

router.get(
    "/completed",
    isLoggedIn,
    adminController.completedAppointments
);

module.exports = router;