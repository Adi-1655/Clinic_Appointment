const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const adminManagementController = require("../controllers/adminManagementController");
const billingController = require("../controllers/billingController");



router.get("/login",adminController.showLogin);

router.post(
"/login",
adminController.login
);

router.post("/logout", adminController.logout);

const {isLoggedIn}=require("../middleware/auth");

router.get(
"/dashboard",
isLoggedIn,
adminController.dashboard
);

router.get("/todays-appointments", isLoggedIn, adminController.todaysAppointments);

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

router.get("/patients", isLoggedIn, adminManagementController.patients);
router.get("/patients/:id/edit", isLoggedIn, adminManagementController.editPatient);
router.patch("/patients/:id", isLoggedIn, adminManagementController.updatePatient);
router.get("/doctors", isLoggedIn, adminManagementController.doctors);
router.get("/doctors/:id/edit", isLoggedIn, adminManagementController.editDoctor);
router.post("/doctors", isLoggedIn, adminManagementController.createDoctor);
router.patch("/doctors/:id", isLoggedIn, adminManagementController.updateDoctor);
router.post("/doctors/:id/toggle", isLoggedIn, adminManagementController.toggleDoctor);
router.get("/appointments", isLoggedIn, adminManagementController.appointments);
router.get("/appointments/:id/reschedule", isLoggedIn, adminManagementController.showRescheduleForm);
router.get("/appointments/reschedule-slots", isLoggedIn, adminManagementController.rescheduleSlots);
router.post("/appointments/:id/cancel", isLoggedIn, adminManagementController.cancelAppointment);
router.post("/appointments/:id/reschedule", isLoggedIn, adminManagementController.rescheduleAppointment);
router.get("/billing", isLoggedIn, billingController.index);
router.get("/billing/history", isLoggedIn, billingController.history);
router.get("/billing/appointments/:appointmentId/invoice", isLoggedIn, billingController.showInvoiceForm);
router.post("/billing/appointments/:appointmentId/invoice", isLoggedIn, billingController.createManualInvoice);
router.get("/billing/:id/payment", isLoggedIn, billingController.showPaymentForm);
router.post("/billing/:id/payment", isLoggedIn, billingController.recordPayment);

module.exports = router;