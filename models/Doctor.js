const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    specialty: {
        type: String,
        required: true,
        trim: true
    },
    schedule: [{
        dayOfWeek: {
            type: Number,
            required: true,
            min: 0,
            max: 6
        },
        slots: [{
            type: String,
            required: true
        }]
    }],
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Doctor", doctorSchema);