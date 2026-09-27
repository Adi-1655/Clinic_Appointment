const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { getScheduledSlots } = require("../utils/doctorSchedule");

exports.showBookingForm = async (req, res) => {
        const doctors = await Doctor.find({ active: true }).sort({ name: 1 });
        res.render("appointments/book", { doctors });
};


exports.checkSlots = async (req, res) => {

    const { appointmentDate, doctorId } = req.query;
    const doctor = await Doctor.findOne({ _id: doctorId, active: true });

    if (!doctor) {
        return res.status(400).send("Select an available doctor.");
    }

    const slots = getScheduledSlots(doctor.schedule, appointmentDate);
    const availableSlots = [];

    for (const slot of slots) {

        const count = await Appointment.countDocuments({
            appointmentDate,
            doctor: doctor._id,
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
        doctor,
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
            slot,
            doctorId
        } = req.body;

        const doctor = await Doctor.findOne({ _id: doctorId, active: true });
        if (!doctor || !getScheduledSlots(doctor.schedule, appointmentDate).includes(slot)) {
            return res.status(400).send("That doctor is not available for the selected slot.");
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
            doctor: doctor._id,
            slot,
            status: "Pending"
        });

        if (existingAppointment) {
            return res.send("You have already booked this slot.");
        }

        const patient = await Patient.findOneAndUpdate(
            { mobile: mobile.trim() },
            { name: patientName, age, gender },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        const appointment = new Appointment({
            patient: patient._id,
            doctor: doctor._id,
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