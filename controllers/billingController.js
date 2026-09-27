const Appointment = require("../models/Appointment");
const Invoice = require("../models/Invoice");
const mongoose = require("mongoose");

function getTodayDate() {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");
}

exports.index = async (req, res) => {
    const todayDate = getTodayDate();

    const appointments = await Appointment.find({
        appointmentDate: todayDate,
        status: { $ne: "Cancelled" }
    }).populate("doctor", "name")
        .sort({ slot: 1 });

    const invoices = await Invoice.find({
        appointment: { $in: appointments.map(appointment => appointment._id) }
    });
    const invoiceByAppointment = Object.create(null);
    for (const invoice of invoices) {
        invoiceByAppointment[String(invoice.appointment)] = invoice;
    }

    const notPaidAppointments = appointments.filter(appointment => {
        const invoice = invoiceByAppointment[String(appointment._id)];
        return !invoice || invoice.balanceDue > 0;
    });
    const paidAppointments = appointments.filter(appointment => {
        const invoice = invoiceByAppointment[String(appointment._id)];
        return invoice && invoice.balanceDue <= 0;
    });

    res.render("admin/billing", {
        notPaidAppointments,
        paidAppointments,
        invoiceByAppointment,
        todayDate
    });
};

exports.history = async (req, res) => {
    const invoices = await Invoice.find()
        .populate("appointment", "patientName mobile appointmentDate slot")
        .sort({ createdAt: -1 });

    res.render("admin/billing-history", { invoices });
};

exports.showInvoiceForm = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.appointmentId)) {
        return res.status(400).send("Invalid appointment.");
    }
    const appointment = await Appointment.findById(req.params.appointmentId)
        .populate("doctor", "name specialty");
    if (!appointment) return res.status(404).send("Appointment not found.");
    if (appointment.appointmentDate !== getTodayDate() || appointment.status === "Cancelled") {
        return res.status(400).send("Manual invoices can only be created for today's active appointments.");
    }
    const existingInvoice = await Invoice.exists({ appointment: appointment._id });
    if (existingInvoice) return res.redirect("/admin/billing");

    res.render("admin/manual-invoice", { appointment });
};

exports.createManualInvoice = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.appointmentId)) {
        return res.status(400).send("Invalid appointment.");
    }
    const appointment = await Appointment.findOne({
        _id: req.params.appointmentId,
        appointmentDate: getTodayDate(),
        status: { $ne: "Cancelled" }
    });
    if (!appointment) return res.status(404).send("Today's active appointment not found.");

    const consultationFee = Number(req.body.consultationFee);
    const medicineCharges = Number(req.body.medicineCharges);
    const otherCharges = Number(req.body.otherCharges);
    const paymentAmount = Number(req.body.paymentAmount || 0);
    const totalAmount = consultationFee + medicineCharges + otherCharges;
    const methods = ["Cash", "UPI", "Card", "Bank transfer"];
    const paymentMethod = req.body.paymentMethod;

    if (![consultationFee, medicineCharges, otherCharges, paymentAmount].every(Number.isFinite)
        || [consultationFee, medicineCharges, otherCharges, paymentAmount].some(amount => amount < 0)
        || totalAmount <= 0 || paymentAmount > totalAmount
        || (paymentAmount > 0 && !methods.includes(paymentMethod))) {
        return res.status(400).send("Enter valid non-negative charges and a payment no greater than the invoice total.");
    }

    try {
        const payments = paymentAmount > 0
            ? [{ amount: paymentAmount, method: paymentMethod }]
            : [];
        await Invoice.create({
            appointment: appointment._id,
            consultationFee,
            medicineCharges,
            otherCharges,
            payments,
            paymentStatus: paymentAmount >= totalAmount ? "Paid" : paymentAmount > 0 ? "Partially paid" : "Unpaid"
        });
    } catch (error) {
        if (error.code === 11000) return res.status(409).send("An invoice already exists for this appointment.");
        throw error;
    }

    res.redirect("/admin/billing");
};

exports.showPaymentForm = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send("Invalid bill.");
    }
    const invoice = await Invoice.findById(req.params.id)
        .populate("appointment", "patientName mobile appointmentDate slot");
    if (!invoice) return res.status(404).send("Bill not found.");
    if (invoice.balanceDue <= 0) return res.redirect("/admin/billing");

    res.render("admin/manage-payment", { invoice });
};

exports.recordPayment = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send("Invalid bill.");
    }
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).send("Bill not found.");

    const amount = Number(req.body.amount);
    const methods = ["Cash", "UPI", "Card", "Bank transfer"];
    if (!Number.isFinite(amount) || amount <= 0 || amount > invoice.balanceDue
        || !methods.includes(req.body.method)) {
        return res.status(400).send("Enter a valid payment amount up to the outstanding balance and choose a payment method.");
    }

    invoice.payments.push({ amount, method: req.body.method });
    const totalAmount = invoice.consultationFee + invoice.medicineCharges + invoice.otherCharges;
    const amountPaid = invoice.payments.reduce((total, payment) => total + payment.amount, 0);
    invoice.paymentStatus = amountPaid >= totalAmount
        ? "Paid"
        : amountPaid > 0
            ? "Partially paid"
            : "Unpaid";
    await invoice.save();
    res.redirect("/admin/billing");
};