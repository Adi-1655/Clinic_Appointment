exports.isLoggedIn=(req,res,next)=>{

    if(!req.session || !req.session.adminId){

        return res.redirect("/admin/login");

    }

    next();

};