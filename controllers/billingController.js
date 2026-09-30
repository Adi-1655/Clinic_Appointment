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
        if (appointment.status !== "Completed") return false;
        const invoice = invoiceByAppointment[String(appointment._id)];
        return !invoice || invoice.paymentStatus !== "Paid";
    });
    const paidAppointments = appointments.filter(appointment => {
        const invoice = invoiceByAppointment[String(appointment._id)];
        return invoice && invoice.paymentStatus === "Paid";
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
    if (appointment.appointmentDate !== getTodayDate() || appointment.status !== "Completed") {
        return res.status(400).send("Manual invoices can only be created for today's completed visits.");
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
        status: "Completed"
    });
    if (!appointment) return res.status(404).send("Today's completed appointment not found.");

    const consultationFee = Number(req.body.consultationFee || 0);
    const medicineCharges = Number(req.body.medicineCharges || 0);
    const otherCharges = Number(req.body.otherCharges || 0);
    const totalAmount = consultationFee + medicineCharges + otherCharges;
    const methods = ["Cash", "UPI", "Card", "Bank transfer"];
    const isPaid = req.body.paymentAction === "paid" || (req.body.paymentMethod && req.body.paymentMethod !== "");
    const paymentMethod = req.body.paymentMethod;

    if (![consultationFee, medicineCharges, otherCharges].every(Number.isFinite)
        || [consultationFee, medicineCharges, otherCharges].some(amount => amount < 0)
        || totalAmount <= 0) {
        return res.status(400).send("Enter valid non-negative charges totaling greater than 0.");
    }

    if (isPaid && !methods.includes(paymentMethod)) {
        return res.status(400).send("Please select a valid payment method for full one-time payment.");
    }

    try {
        const payments = isPaid
            ? [{ amount: totalAmount, method: paymentMethod, receivedAt: new Date() }]
            : [];
        await Invoice.create({
            appointment: appointment._id,
            consultationFee,
            medicineCharges,
            otherCharges,
            payments,
            paymentStatus: isPaid ? "Paid" : "Unpaid"
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
        .populate("appointment", "patientName mobile appointmentDate slot problem");
    if (!invoice) return res.status(404).send("Bill not found.");
    if (invoice.paymentStatus === "Paid") return res.redirect("/admin/billing");

    res.render("admin/manage-payment", { invoice });
};

exports.recordPayment = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send("Invalid bill.");
    }
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).send("Bill not found.");
    if (invoice.paymentStatus === "Paid") return res.redirect("/admin/billing");

    const methods = ["Cash", "UPI", "Card", "Bank transfer"];
    const method = req.body.method;
    if (!methods.includes(method)) {
        return res.status(400).send("Please select a valid payment method.");
    }

    invoice.payments = [{
        amount: invoice.totalAmount,
        method,
        receivedAt: new Date()
    }];
    invoice.paymentStatus = "Paid";
    await invoice.save();
    res.redirect("/admin/billing");
};