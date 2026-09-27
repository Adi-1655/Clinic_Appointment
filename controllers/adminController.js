const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");

const authCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/"
};

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Set JWT_SECRET in the environment before starting the app.");
    return secret;
}

exports.showLogin = (req,res)=>{
    res.render("admin/login");
};

exports.login=async(req,res)=>{

    if (!process.env.JWT_SECRET) {
        return res.status(503).send("Admin login is not configured. Add a secure JWT_SECRET to the .env file.");
    }

    const {username,password}=req.body;

    const admin=await Admin.findOne({username});


    if(!admin){

        return res.send("Invalid Username");

    }


    const valid=await bcrypt.compare(
        password,
        admin.password
    );


    if(!valid){

        return res.send("Invalid Password");

    }


    const token = jwt.sign(
        { adminId: String(admin._id) },
        getJwtSecret(),
        { expiresIn: "8h" }
    );

    res.cookie("adminToken", token, authCookieOptions);
    res.redirect("/admin/dashboard");

};

exports.logout = (req, res) => {
    res.clearCookie("adminToken", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/"
    });
    res.redirect("/");
};



const Appointment=require("../models/Appointment");

exports.dashboard = async (req, res) => {
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    const [totalDoctors, totalPatients, totalToday, specializations] = await Promise.all([
        Doctor.countDocuments({ active: true }),
        Patient.countDocuments(),
        Appointment.countDocuments({ appointmentDate: today, status: { $ne: "Cancelled" } }),
        Doctor.aggregate([
            { $match: { active: true } },
            { $group: { _id: "$specialty", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ])
    ]);

    res.render("admin/dashboard", {
        totalDoctors,
        totalPatients,
        totalToday,
        specializations
    });
};

exports.todaysAppointments = async (req, res) => {
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    const [appointments, totalToday, pendingToday, completedToday] = await Promise.all([
        Appointment.find({ appointmentDate: today, status: "Pending" })
            .populate("doctor", "name specialty")
            .sort({ slot: 1 }),
        Appointment.countDocuments({ appointmentDate: today, status: { $ne: "Cancelled" } }),
        Appointment.countDocuments({ appointmentDate: today, status: "Pending" }),
        Appointment.countDocuments({ appointmentDate: today, status: "Completed" })
    ]);

    res.render("admin/todays-appointments", {
        appointments,
        totalToday,
        pendingToday,
        completedToday,
        today
    });
};

exports.markAsDone = async (req, res) => {
    try {

        const { id } = req.params;

        await Appointment.findByIdAndUpdate(id, {
            status: "Completed"
        });

        res.redirect("/admin/dashboard");

    } catch (err) {

        console.log(err);

        res.status(500).send("Server Error");

    }
};

exports.completedAppointments = async (req, res) => {

    const appointments = await Appointment.find({

        status: "Completed"

    }).sort({ updatedAt: -1 });

    res.render("admin/completed", {

        appointments

    });

};