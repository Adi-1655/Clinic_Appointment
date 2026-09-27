const jwt = require("jsonwebtoken");

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Set JWT_SECRET in the environment before starting the app.");
    return secret;
}

exports.loadAdmin = (req, res, next) => {
    req.adminId = null;
    res.locals.isAdmin = false;

    const token = req.cookies?.adminToken;
    if (token) {
        try {
            const payload = jwt.verify(token, getJwtSecret());
            req.adminId = payload.adminId;
            res.locals.isAdmin = Boolean(req.adminId);
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