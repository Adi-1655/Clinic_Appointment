const generatePrescription = require("../utils/pdfGenerator");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");
const path = require("path");

exports.showConsultation = async(req,res)=>{

    const patient = await Appointment.findById(
        req.params.id
    );

    res.render(
        "admin/consultation",
        {
            patient
        }
    );

}

exports.history = async (req, res) => {
    const consultations = await Consultation.find()
        .populate("appointment", "patientName mobile appointmentDate slot")
        .sort({ createdAt: -1 });
    res.render("admin/consultations", { consultations });
};

exports.downloadPrescription = async (req, res) => {
    const consultation = await Consultation.findOne({ appointment: req.params.appointmentId });
    if (!consultation?.pdfPath) return res.status(404).send("Prescription PDF not found.");

    const fileName = path.basename(consultation.pdfPath);
    const filePath = path.join(__dirname, "../pdfs", fileName);
    res.download(filePath, `${fileName}`);
};

exports.saveConsultation = async (req, res) => {

    try {

        const {

            appointmentId,
            recommendation,
            prescription

        } = req.body;

        const medicines = [];

        const medicineNames = req.body.medicineName || [];
        const mornings = req.body.morning || [];
        const afternoons = req.body.afternoon || [];
        const nights = req.body.night || [];
        const days = req.body.days || [];

        for (let i = 0; i < medicineNames.length; i++) {

            medicines.push({

                medicineName: medicineNames[i],

                morning: Array.isArray(mornings)
                    ? mornings.includes(String(i))
                    : mornings === String(i),

                afternoon: Array.isArray(afternoons)
                    ? afternoons.includes(String(i))
                    : afternoons === String(i),

                night: Array.isArray(nights)
                    ? nights.includes(String(i))
                    : nights === String(i),

                days: Number(days[i])

            });

        }

        const consultation = await Consultation.create({
            appointment: appointmentId,
            medicines,
            recommendation,
            prescription
        });

        const patient =
            await Appointment.findById(
            appointmentId
        );


        const generatedPdf = await generatePrescription(patient, consultation);

        consultation.pdfPath = generatedPdf.publicPath;
        await consultation.save();

        await Appointment.findByIdAndUpdate(

            appointmentId,

            {
                status: "Completed"
            }

        );

        res.redirect("/admin/dashboard");

    } catch (err) {

        console.log(err);

        res.send(err.message);

    }

};