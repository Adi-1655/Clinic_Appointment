const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");

exports.showLogin = (req,res)=>{
    res.render("admin/login");
};

exports.login=async(req,res)=>{

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


    req.session.adminId=admin._id;  

    res.redirect("/admin/dashboard");

};



const Appointment=require("../models/Appointment");

exports.dashboard = async (req, res) => {

    const today = new Date().toISOString().split("T")[0];

    const pendingAppointments = await Appointment.find({

        appointmentDate: today,

        status: "Pending"

    });

    const totalToday = await Appointment.countDocuments({

        appointmentDate: today

    });

    const completedToday = await Appointment.countDocuments({

        appointmentDate: today,

        status: "Completed"

    });

    res.render("admin/dashboard", {

        appointments: pendingAppointments,

        totalToday,

        completedToday,

        pendingToday: pendingAppointments.length

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