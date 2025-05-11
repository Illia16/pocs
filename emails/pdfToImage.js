const fs = require('fs/promises');

const pdfToImg = async (filename, saveImg = false) => {
  const { pdf } = await import("pdf-to-img");
  const filenameWithoutExt = filename.split('.')[0];

  const document = await pdf(filename, { scale: 3 });
  const page1buffer = await document.getPage(1)
  if (saveImg) {
    await fs.writeFile(`${filenameWithoutExt}.png`, page1buffer);
  }

  return {
    buffer: page1buffer,
    filename: `${filenameWithoutExt}.png`
  }
}

module.exports = {
  pdfToImg
}