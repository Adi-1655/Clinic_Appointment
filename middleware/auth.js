const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Set JWT_SECRET in the environment before starting the app.");
    return secret;
}

exports.loadAdmin = async (req, res, next) => {
    req.adminId = null;
    req.adminUsername = null;
    res.locals.isAdmin = false;
    res.locals.isSuperAdmin = false;
    res.locals.currentAdminUsername = null;

    const token = req.cookies?.adminToken;
    if (token) {
        try {
            const payload = jwt.verify(token, getJwtSecret());
            req.adminId = payload.adminId;
            res.locals.isAdmin = Boolean(req.adminId);

            if (req.adminId) {
                const admin = await Admin.findById(req.adminId).select("username");
                if (admin) {
                    req.adminUsername = admin.username;
                    res.locals.currentAdminUsername = admin.username;
                    res.locals.isSuperAdmin = (admin.username.toLowerCase() === "aditya01");
                }
            }
        } catch {
            res.clearCookie("adminToken", {
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/"
            });
        }
    }

    next();
};

exports.isLoggedIn = (req, res, next) => {
    if (!req.adminId) return res.redirect("/admin/login");
    next();
};

exports.isSuperAdmin = (req, res, next) => {
    if (!req.adminId || !req.adminUsername || req.adminUsername.toLowerCase() !== "aditya01") {
        return res.status(403).send("Access Denied: Only super administrator 'Aditya01' has permission to manage administrator accounts.");
    }
    next();
};