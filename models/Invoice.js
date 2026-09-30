const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: ["Cash", "UPI", "Card", "Bank transfer"], required: true },
    receivedAt: { type: Date, default: Date.now }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
        required: true,
        unique: true
    },
    consultationFee: { type: Number, min: 0, default: 0 },
    medicineCharges: { type: Number, min: 0, default: 0 },
    otherCharges: { type: Number, min: 0, default: 0 },
    payments: [paymentSchema],
    paymentStatus: {
        type: String,
        enum: ["Unpaid", "Paid"],
        default: "Unpaid"
    }
}, { timestamps: true });

invoiceSchema.virtual("totalAmount").get(function () {
    return this.consultationFee + this.medicineCharges + this.otherCharges;
});

invoiceSchema.virtual("amountPaid").get(function () {
    return this.payments.reduce((total, payment) => total + payment.amount, 0);
});

invoiceSchema.virtual("balanceDue").get(function () {
    if (this.paymentStatus === "Paid") return 0;
    return Math.max(0, this.totalAmount - this.amountPaid);
});

module.exports = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);