const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const slots = require("../utils/slots");
const { getScheduledSlots } = require("../utils/doctorSchedule");

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function linkLegacyPatients() {
    const unlinked = await Appointment.find({ patient: { $exists: false } });

    for (const appointment of unlinked) {
        const patient = await Patient.findOneAndUpdate(
            { mobile: appointment.mobile },
            {
                $setOnInsert: {
                    name: appointment.patientName,
                    age: appointment.age,
                    gender: appointment.gender
                }
            },
            { new: true, upsert: true, runValidators: true }
        );
        appointment.patient = patient._id;
        await appointment.save();
    }
}

exports.patients = async (req, res) => {
    await linkLegacyPatients();
    const query = String(req.query.q || "").trim();
    const filter = query
        ? { $or: [
            { name: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
            { mobile: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }
        ] }
        : {};
    const patients = await Patient.find(filter).sort({ name: 1 });
    res.render("admin/patients", { patients, query });
};

exports.editPatient = async (req, res) => {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).send("Patient not found.");
    res.render("admin/patient-edit", { patient });
};

exports.updatePatient = async (req, res) => {
    const { name, mobile, age, gender } = req.body;
    const patient = await Patient.findByIdAndUpdate(
        req.params.id,
        { name, mobile, age, gender },
        { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).send("Patient not found.");
    await Appointment.updateMany({ patient: patient._id }, {
        patientName: patient.name,
        mobile: patient.mobile,
        age: patient.age,
        gender: patient.gender
    });
    res.redirect("/admin/patients");
};

exports.doctors = async (req, res) => {
    const doctors = await Doctor.find().sort({ active: -1, name: 1 });
    res.render("admin/doctors", { doctors, slots, days });
};

exports.createDoctor = async (req, res) => {
    const schedule = buildSchedule(req.body);
    if (!req.body.name?.trim() || !req.body.specialty?.trim() || !schedule) {
        return res.status(400).send("Name, specialty, at least one weekday, and at least one time are required.");
    }

    await Doctor.create({
        name: req.body.name,
        specialty: req.body.specialty,
        schedule
    });
    res.redirect("/admin/doctors");
};

function buildSchedule(body) {
    const selectedDays = (Array.isArray(body.days) ? body.days : [body.days])
        .map(Number)
        .filter(day => Number.isInteger(day) && day >= 0 && day <= 6);
    const selectedSlots = (Array.isArray(body.slots) ? body.slots : [body.slots])
        .filter(slot => slots.includes(slot));
    if (!selectedDays.length || !selectedSlots.length) return null;
    return [...new Set(selectedDays)].map(dayOfWeek => ({ dayOfWeek, slots: selectedSlots }));
}

exports.editDoctor = async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).send("Doctor not found.");
    res.render("admin/doctor-edit", { doctor, slots, days });
};

exports.updateDoctor = async (req, res) => {
    const schedule = buildSchedule(req.body);
    if (!req.body.name?.trim() || !req.body.specialty?.trim() || !schedule) {
        return res.status(400).send("Name, specialty, at least one weekday, and at least one time are required.");
    }
    await Doctor.findByIdAndUpdate(req.params.id, {
        name: req.body.name,
        specialty: req.body.specialty,
        schedule
    }, { runValidators: true });
    res.redirect("/admin/doctors");
};

exports.toggleDoctor = async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).send("Doctor not found.");
    doctor.active = !doctor.active;
    await doctor.save();
    res.redirect("/admin/doctors");
};

exports.appointments = async (req, res) => {
    const status = ["Pending", "Completed", "Cancelled"].includes(req.query.status)
        ? req.query.status
        : "Pending";
    const filter = { status };
    const [appointments, doctors] = await Promise.all([
        Appointment.find(filter).populate("doctor", "name specialty")
            .sort({ appointmentDate: -1, slot: 1 }),
        Doctor.find({ active: true }).sort({ name: 1 })
    ]);
    res.render("admin/appointments", { appointments, doctors, slots, status });
};

exports.showRescheduleForm = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send("Invalid appointment.");
    }
    const [appointment, doctors] = await Promise.all([
        Appointment.findOne({ _id: req.params.id, status: "Pending" })
            .populate("doctor", "name specialty"),
        Doctor.find({ active: true }).sort({ name: 1 })
    ]);
    if (!appointment) return res.status(404).send("Pending appointment not found.");

    const doctor = doctors.find(item => String(item._id) === String(appointment.doctor?._id));
    const availableSlots = doctor
        ? getScheduledSlots(doctor.schedule, appointment.appointmentDate)
        : [];
    res.render("admin/reschedule-appointment", {
        appointment,
        doctors,
        availableSlots
    });
};

exports.rescheduleSlots = async (req, res) => {
    const doctor = await Doctor.findOne({ _id: req.query.doctorId, active: true });
    if (!doctor) return res.json({ slots: [] });
    res.json({ slots: getScheduledSlots(doctor.schedule, req.query.appointmentDate) });
};

exports.cancelAppointment = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send("Invalid appointment.");
    }
    await Appointment.findOneAndUpdate(
        { _id: req.params.id, status: "Pending" },
        { status: "Cancelled" }
    );
    res.redirect("/admin/appointments");
};

exports.rescheduleAppointment = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send("Invalid appointment.");
    }
    const appointment = await Appointment.findOne({ _id: req.params.id, status: "Pending" });
    const doctor = await Doctor.findOne({ _id: req.body.doctorId, active: true });
    const { appointmentDate, slot } = req.body;
    if (!appointment || !doctor || !getScheduledSlots(doctor.schedule, appointmentDate).includes(slot)) {
        return res.status(400).send("Choose an active doctor's available date and time.");
    }

    const slotQuery = {
        appointmentDate,
        doctor: doctor._id,
        slot,
        status: "Pending",
        _id: { $ne: appointment._id }
    };
    const [bookedCount, duplicate] = await Promise.all([
        Appointment.countDocuments(slotQuery),
        Appointment.exists({ ...slotQuery, mobile: appointment.mobile })
    ]);
    if (bookedCount >= 5 || duplicate) {
        return res.status(409).send("That doctor and time are full or already booked for this patient.");
    }

    appointment.appointmentDate = appointmentDate;
    appointment.doctor = doctor._id;
    appointment.slot = slot;
    await appointment.save();
    res.redirect("/admin/appointments");
};