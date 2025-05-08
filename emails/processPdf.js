const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb, degrees } = require('pdf-lib');

const redactPdf = async (pdfFilename) => {
    // Load existing PDF
    const inputPdfBytes = fs.readFileSync(pdfFilename);
    const pdfDoc = await PDFDocument.load(inputPdfBytes);

    // Get the first page
    const page = pdfDoc.getPages()[0];

    // Crop the page
    const cropBox = page.getCropBox()
    page.setCropBox(0, 350, cropBox.width, 200);
    page.setMediaBox(0, 350, cropBox.width, 200);

    // Draw stuff
    page.drawRectangle({
      x: 20,
      y: 488,
      width: cropBox.width - 40,
      height: 10,
      color: rgb(0.95, 0.95, 0.95),
      borderWidth: 0,
    });

    // Add "TEST" text watermark
    const grid = {
      rows: 4,
      cols: 5,
      margin: { x: 40, y: 20 },
      spacing: {
        x: (cropBox.width - 80) / 4,
        y: 160 / 3
      }
    };
    for (let i = 0; i < grid.rows * grid.cols; i++) {
      const row = Math.floor(i / grid.cols);
      const col = i % grid.cols;
      page.drawText('TEST', {
        size: 14,
        opacity: 0.3,
        color: rgb(0.3, 0.3, 0.3),
        rotate: degrees(45),
        x: grid.margin.x + (col * grid.spacing.x),
        y: 370 + (row * grid.spacing.y)
      });
    }

    // Save and write output
    const outputPdfBytes = await pdfDoc.save();
    fs.writeFileSync('redacted_' + pdfFilename, outputPdfBytes);
    console.log('PDF saved with black boxes.');
}

const decryptPdf = (pdfFilename, password) => {
  return new Promise((resolve, reject) => {
    const input = path.resolve(__dirname, pdfFilename);
    const output = path.resolve(__dirname, 'decrypted_' + pdfFilename);

    execFile('qpdf', ['--password=' + password, '--decrypt', input, output], (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`Failed to decrypt: ${err.message}`));
        return;
      }
      resolve(output);
    });
  });
};

const initProcessPdf = async (filename, password) => {
  const pdf = await decryptPdf(filename, password);
  console.log('PDF decrypted successfully:', pdf);
  await redactPdf('decrypted_' + filename);
  console.log('PDF redacted successfully');
}

module.exports = {
  initProcessPdf
}