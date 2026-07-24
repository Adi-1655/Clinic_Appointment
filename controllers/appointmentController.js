exports.showBookingForm = (req, res) => {
  res.render("appointments/book");
};

const Appointment = require("../models/Appointment");
const slots = require("../utils/slots");


exports.checkSlots = async (req, res) => {

    const { appointmentDate } = req.query;

    const availableSlots = [];

    for (let slot of slots) {

        const count = await Appointment.countDocuments({
            appointmentDate,
            slot,
            status: "Pending"
        });

        availableSlots.push({
            slot,
            booked: count,
            available: count < 5
        });

    }

    res.render("appointments/details", {
        appointmentDate,
        availableSlots
    });

};

exports.bookAppointment = async (req, res) => {
    try {

        const {
            patientName,
            mobile,
            age,
            gender,
            problem,
            appointmentDate,
            slot
        } = req.body;

        // Validate slot
        if (!slots.includes(slot)) {
            return res.send("Invalid Slot");
        }

        // Count current bookings for the selected slot
        const bookedCount = await Appointment.countDocuments({
            appointmentDate,
            slot,
            status: "Pending"
        });

        // Maximum 5 patients per slot
        if (bookedCount >= 5) {
            return res.send("Sorry! This slot is already full.");
        }

        // Prevent duplicate booking for same mobile/date/slot
        const existingAppointment = await Appointment.findOne({
            mobile,
            appointmentDate,
            slot,
            status: "Pending"
        });

        if (existingAppointment) {
            return res.send("You have already booked this slot.");
        }

        // Save appointment
        const appointment = new Appointment({
            patientName,
            mobile,
            age,
            gender,
            problem,
            appointmentDate,
            slot
        });

        await appointment.save();

        res.render("appointments/success", {
            appointment
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("Server Error");
    }
};