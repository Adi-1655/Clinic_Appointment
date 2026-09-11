require("dotenv").config();

const express = require("express");
const path = require("path");
const ejsMate = require("ejs-mate");

const connectDB = require("./config/db");

const app = express();

const appointmentRoutes = require("./routes/appointmentRoutes");
const adminRoutes=require("./routes/adminRoutes");

const session = require("express-session");
const methodOverride = require("method-override");

const consultationRoutes = require("./routes/consultationRoutes");

// Database
connectDB();

// Middleware

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride("_method"));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "mysecret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

app.use("/admin/consultation",consultationRoutes);

app.use("/", appointmentRoutes);
app.use("/admin",adminRoutes);

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.engine("ejs", ejsMate);


// Home Route
app.get("/", (req, res) => {
    res.render("appointments/home");
});

app.get("/test", (req, res) => {
    console.log(req.session);
    res.send("Check terminal");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});