const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
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
    const [totalDoctors, totalPatients, totalToday, specializations, totalAdmins, admins] = await Promise.all([
        Doctor.countDocuments({ active: true }),
        Patient.countDocuments(),
        Appointment.countDocuments({ appointmentDate: today, status: { $ne: "Cancelled" } }),
        Doctor.aggregate([
            { $match: { active: true } },
            { $group: { _id: "$specialty", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]),
        Admin.countDocuments(),
        Admin.find({}, "username createdAt").sort({ createdAt: -1 })
    ]);

    res.render("admin/dashboard", {
        totalDoctors,
        totalPatients,
        totalToday,
        specializations,
        totalAdmins,
        admins,
        currentAdminId: req.adminId,
        success: req.query.success,
        error: req.query.error
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

exports.listAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}, "username createdAt").sort({ createdAt: -1 });
        res.render("admin/admins", {
            admins,
            totalAdmins: admins.length,
            currentAdminId: req.adminId,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error("Error fetching admins:", err);
        res.status(500).send("Server Error");
    }
};

exports.createAdmin = async (req, res) => {
    const redirectTo = req.body.redirectTo === "/admin/admins" ? "/admin/admins" : "/admin/dashboard";
    try {
        if (!req.adminUsername || req.adminUsername.toLowerCase() !== "aditya01") {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("Permission denied: Only 'Aditya01' can add new administrators.")}`);
        }

        const username = String(req.body.username || "").trim();
        const password = String(req.body.password || "");
        const confirmPassword = String(req.body.confirmPassword || "");

        if (!username || username.length < 3) {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("Username must be at least 3 characters long.")}`);
        }

        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("Username can only contain letters, numbers, dots, hyphens, and underscores.")}`);
        }

        if (!password || password.length < 6) {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("Password must be at least 6 characters long.")}`);
        }

        if (password !== confirmPassword) {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("Passwords do not match.")}`);
        }

        const existingAdmin = await Admin.findOne({
            username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
        });

        if (existingAdmin) {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("An admin with this username already exists.")}`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await Admin.create({
            username,
            password: hashedPassword
        });

        return res.redirect(`${redirectTo}?success=${encodeURIComponent(`Admin '${username}' created successfully.`)}`);
    } catch (err) {
        console.error("Error creating admin:", err);
        return res.redirect(`${redirectTo}?error=${encodeURIComponent("Failed to create admin. Please try again.")}`);
    }
};

exports.deleteAdmin = async (req, res) => {
    const redirectTo = req.body.redirectTo === "/admin/admins" ? "/admin/admins" : "/admin/dashboard";
    try {
        if (!req.adminUsername || req.adminUsername.toLowerCase() !== "aditya01") {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("Permission denied: Only 'Aditya01' can delete administrators.")}`);
        }

        const { id } = req.params;

        if (id === String(req.adminId)) {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("You cannot delete your own admin account.")}`);
        }

        const totalAdmins = await Admin.countDocuments();
        if (totalAdmins <= 1) {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("Cannot delete the only remaining admin account.")}`);
        }

        const deleted = await Admin.findByIdAndDelete(id);
        if (!deleted) {
            return res.redirect(`${redirectTo}?error=${encodeURIComponent("Admin account not found.")}`);
        }

        return res.redirect(`${redirectTo}?success=${encodeURIComponent(`Admin '${deleted.username}' deleted successfully.`)}`);
    } catch (err) {
        console.error("Error deleting admin:", err);
        return res.redirect(`${redirectTo}?error=${encodeURIComponent("Failed to delete admin.")}`);
    }
};