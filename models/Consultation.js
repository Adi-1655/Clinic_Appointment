const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({

    medicineName:{
        type:String,
        required:true
    },

    morning:{
        type:Boolean,
        default:false
    },

    afternoon:{
        type:Boolean,
        default:false
    },

    night:{
        type:Boolean,
        default:false
    },

    days:{
        type:Number,
        required:true
    }

});

const consultationSchema = new mongoose.Schema({

    appointment:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Appointment",
        required:true
    },

    medicines:[medicineSchema],

    recommendation:{
        type:String
    },

    prescription:{
        type:String
    },

    pdfPath: {
        type: String
    }

},{timestamps:true});


module.exports = mongoose.models.Consultation || mongoose.model("Consultation", consultationSchema);