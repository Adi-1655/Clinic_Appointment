const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");


function generatePrescription(patient, consultation) {

    const pdfDir = path.join(__dirname, "../pdfs");

    if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir);
    }

    const fileName = `${patient.patientName}.pdf`;

    const pdfPath = path.join(pdfDir, fileName);

    const doc = new PDFDocument({
        margin:50
    });

    doc.pipe(fs.createWriteStream(pdfPath));

    /* ---------- Header ---------- */

    doc
    .fontSize(22)
    .fillColor("#0d6efd")
    .text("CITYCARE HOSPITAL",{
        align:"center"
    });

    doc
    .fontSize(12)
    .fillColor("black")
    .text("123 Hospital Road, Pune",{
        align:"center"
    });

    doc.moveDown();

    doc.moveTo(50,110)
       .lineTo(550,110)
       .stroke();

    /* ---------- Patient ---------- */

    doc.moveTo(60,110);
    doc
    .fontSize(18)
    .text("Patient Information");

    doc.moveDown(.5);

    doc.text(`Name : ${patient.patientName}`);
    doc.text(`Age : ${patient.age}`);
    doc.text(`Gender : ${patient.gender}`);
    doc.text(`Mobile : ${patient.mobile}`);
    doc.text(`Problem : ${patient.problem}`);
    doc.text(`Date : ${patient.appointmentDate}`);

    doc.moveDown();

    /* ---------- Medicines ---------- */

    doc
    .fontSize(18)
    .text("Medicines");

    doc.moveDown();

    console.log(JSON.stringify(consultation.medicines, null, 2));

    /* ---------- Medicines Table ---------- */

doc
    .fontSize(18)
    .text("Medicines");

doc.moveDown(0.5);

const startX = 50;
let y = doc.y;

const col1 = 180; // Medicine
const col2 = 70;  // Morning
const col3 = 80;  // Afternoon
const col4 = 60;  // Night
const col5 = 60;  // Days

// Draw header
doc
    .font("Helvetica-Bold")
    .fontSize(12);

doc.text("Medicine", startX, y, { width: col1 });
doc.text("Morning", startX + col1, y, { width: col2, align: "center" });
doc.text("Afternoon", startX + col1 + col2, y, { width: col3, align: "center" });
doc.text("Night", startX + col1 + col2 + col3, y, { width: col4, align: "center" });
doc.text("Days", startX + col1 + col2 + col3 + col4, y, { width: col5, align: "center" });

y += 20;

// Header line
doc.moveTo(startX, y - 5)
   .lineTo(550, y - 5)
   .stroke();

// Table rows
doc.font("Helvetica");

consultation.medicines.forEach((m) => {

    doc.text(m.medicineName, startX, y, { width: col1 });

    doc.text(
        m.morning ? "YES" : "-",
        startX + col1,
        y,
        { width: col2, align: "center" }
    );

    doc.text(
        m.afternoon ? "YES" : "-",
        startX + col1 + col2,
        y,
        { width: col3, align: "center" }
    );

    doc.text(
        m.night ? "YES" : "-",
        startX + col1 + col2 + col3,
        y,
        { width: col4, align: "center" }
    );

    doc.text(
        String(m.days),
        startX + col1 + col2 + col3 + col4,
        y,
        { width: col5, align: "center" }
    );

    y += 22;

    // Row separator
    doc.moveTo(startX, y - 4)
       .lineTo(550, y - 4)
       .stroke();

});

doc.x = 50;
doc.y = y + 20;
doc.moveDown();

doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Recommendation", 50, doc.y);

doc.moveDown(0.5);

doc
    .font("Helvetica")
    .fontSize(12)
    .text(
        consultation.recommendation,
        50,
        doc.y,
        {
            width: 500
        }
    );

doc.moveDown();

doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Prescription", 50, doc.y);

doc.moveDown(0.5);

doc
    .font("Helvetica")
    .fontSize(12)
    .text(
        consultation.prescription,
        50,
        doc.y,
        {
            width: 500
        }
    );

    doc.text(
"Doctor Signature",
{
align:"right"
}
);

    doc.end();

    return `/pdfs/${fileName}`;

}

module.exports = generatePrescription;