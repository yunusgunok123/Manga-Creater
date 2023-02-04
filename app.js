const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { writeFile, readdir } = require("fs").promises;
const { createWriteStream } = require("fs");
const cheerio = require("cheerio");
const PDFDocument = require("pdfkit");

const totalChapters = 110;

async function main() {
  // for (let chapter = 1; chapter <= totalChapters; chapter++) {
  //   const links = await getImageUrls(chapter);
  //   const buffers = [];
  //   for (const link of links) buffers.push(await getImageBuffer(link));
  //   const promise = Promise.all(
  //     buffers.map((buffer, index) => saveImage(buffer, chapter, index + 1))
  //   );
  //   await promise;
  // }
}

async function getImageUrls(chapter) {
  const res = await fetch(
    `https://jojolionmanga.com/manga/jojos-bizarre-adventure-part-8-jojolion-chapter-${chapter}/`
  );
  const text = await res.text();
  const $ = cheerio.load(text);

  const links = [];
  $("img").each((i, child) => links.push($(child).attr("src")));
  return links;
}

async function getImageBuffer(link) {
  const res = await fetch(link);
  return Buffer.from(await res.arrayBuffer());
}

async function saveImage(buffer, chapter, page) {
  await writeFile(`./images/${chapter}-${page}.png`, buffer);
}

async function createPDF() {
  const images = await readdir("./images");
  images.sort((a, b) => {
    const a_s = a.split(".")[0].split("-");
    const b_s = b.split(".")[0].split("-");

    if (Number(a_s[0]) < Number(b_s[0])) return -1;
    else if (Number(a_s[0]) > Number(b_s[0])) return 1;

    if (Number(a_s[1]) < Number(b_s[1])) return -1;
    else if (Number(a_s[1]) > Number(b_s[1])) return 1;
  });

  const doc = new PDFDocument({ size: [2000, 1400], margin: 0 });
  doc.pipe(createWriteStream("./output.pdf"));

  for (const image of images)
    doc.addPage().image(`./images/${image}`, {
      fit: [2000, 1400],
      align: "center",
      valign: "center",
    });

  doc.end();
}

main();
