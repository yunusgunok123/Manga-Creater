const cheerio = require("cheerio");
const { Readable } = require("stream");
const { finished } = require("stream/promises");
const { createWriteStream, readdirSync, existsSync, mkdirSync } = require("fs");
const PDFDocument = require("pdfkit");
const sizeOf = require("image-size");

const base_url = "https://chapmanganato.to/manga-nf964840";
// https://ww8.manganelo.tv/manga/manga-ba979135
// https://ww8.manganelo.tv/chapter/manga-ba979135/chapter-1

let manga_name = "blank";

async function main() {
  await prepare_images();
  await prepare_pdf();
  console.log("Finished");
}

async function prepare_images() {
  manga_name = cheerio
    .load(await (await fetch(base_url)).text())("h1")
    .text();

  if (!existsSync(`./${manga_name}`)) mkdirSync(`./${manga_name}`);

  const mange_code = base_url.split("/").slice(-1);
  const template_url = `https://ww8.manganelo.tv/chapter/${mange_code}/chapter-`;

  let stop = false;
  let chapter = 1;

  while (!stop) {
    const chapter_url = `${template_url}${chapter}`;
    const res = await fetch(chapter_url);
    const html = await res.text();
    const $ = cheerio.load(html);

    stop = $("h1").text() == "Not Found";

    let image_urls = [];
    $("img").each((_, child) => image_urls.push($(child).attr("data-src")));
    image_urls = image_urls.filter((url) => typeof url == "string");

    const len = image_urls.length;
    for (let page = 0; page < len; page++) {
      const chapter_mod = String(chapter).padStart(4, "0");
      const page_mod = String(page).padStart(4, "0");
      const file_name = `./${manga_name}/${chapter_mod}-${page_mod}.jpg`;

      if (existsSync(file_name)) continue;

      const image_res = await fetch(image_urls[page]);
      const file_stream = createWriteStream(file_name, { flags: "wx" });
      await finished(Readable.fromWeb(image_res.body).pipe(file_stream));
    }

    chapter++;
  }
}

async function prepare_pdf() {
  const doc = new PDFDocument({ autoFirstPage: false });
  doc.pipe(createWriteStream(`${manga_name}.pdf`));
  const { outline } = doc;

  const image_files = readdirSync(`./${manga_name}`);
  let last_chapter = 0;
  let set_content = false;
  for (const image_file of image_files) {
    const current_chapter = Number(image_file.split("-")[0]);
    if (last_chapter != current_chapter) {
      last_chapter = current_chapter;
      set_content = true;
    } else if (set_content) {
      outline.addItem(`Chapter: ${current_chapter}`);
      set_content = false;
    }

    const { width, height } = sizeOf(`./${manga_name}/${image_file}`);
    doc
      .addPage({ size: [width, height], margin: 0 })
      .image(`./${manga_name}/${image_file}`);
  }

  doc.end();
}

main();
