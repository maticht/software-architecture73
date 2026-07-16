import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type Lesson = { id: string; title: string; file: string; kind: "html" };
export type Section = { title: string; lessons: Lesson[] };
export type Chapter = { id: string; title: string; sections: Section[]; lessons: Lesson[] };

const customTitles: Record<string, string> = {
  "11": "Архитектура данных и технологическая стратегия",
  "12": "Завершение обучения и карьерный трек",
};

const THEORY_ROOT_CLASS = "theory-viewer";
const THEORY_ROOT_MARKER = '<section class="theory-viewer big-theory lesson__theory">';
const LARGE_LESSON_THRESHOLD = 20_000_000;
const ROOT = () => path.resolve(process.cwd(), "data");
const MEDIA_ROOT = () => path.resolve(process.cwd(), "public", "__course_media");

function normalize(value: string) {
  return value.replace(/\\/g, "/");
}

function readFiles(folder: string): string[] {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      return readFiles(full);
    }

    return /\.html$/i.test(entry.name) ? [full] : [];
  });
}

function lessonTitle(filename: string) {
  return filename.replace(/\.html$/i, "").replace(/^\d+(?:\.\d+)*\s*/, "");
}

function sourceFor(file: string) {
  if (!file.endsWith(".html") || file.includes("..")) {
    return "";
  }

  return fs.readFileSync(path.resolve(ROOT(), file), "utf8");
}

function classTokens(value: string) {
  return value.trim().split(/\s+/).filter(Boolean);
}

function tagBlock(source: string, start: number, tagName: string) {
  const tag = tagName.toLowerCase();
  const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
  tags.lastIndex = start;

  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tags.exec(source))) {
    const chunk = match[0];

    if (/\/>$/.test(chunk)) {
      continue;
    }

    depth += chunk.startsWith("</") ? -1 : 1;

    if (depth === 0) {
      return source.slice(start, tags.lastIndex);
    }
  }

  return "";
}

function classBlocks(source: string, matcher: (classes: string[]) => boolean) {
  const blocks: { start: number; end: number; html: string; classes: string[] }[] = [];
  const tags = /<([a-z0-9:-]+)\b[^>]*class="([^"]*)"[^>]*>/gi;

  let match: RegExpExecArray | null;

  while ((match = tags.exec(source))) {
    const classes = classTokens(match[2]);

    if (!matcher(classes)) {
      continue;
    }

    const html = tagBlock(source, match.index, match[1]);
    if (html) {
      blocks.push({ start: match.index, end: match.index + html.length, html, classes });
    }
  }

  return blocks;
}

function outermostBlocks<T extends { start: number; end: number }>(blocks: T[]) {
  const sorted = [...blocks].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return right.end - left.end;
  });

  const result: T[] = [];

  for (const block of sorted) {
    const last = result[result.length - 1];

    if (last && block.start >= last.start && block.end <= last.end) {
      continue;
    }

    result.push(block);
  }

  return result;
}

function removeClassBlocks(html: string, patterns: string[]) {
  const ranges = outermostBlocks(
    classBlocks(html, (classes) => patterns.some((pattern) => classes.some((name) => name.includes(pattern)))),
  ).sort((left, right) => right.start - left.start);

  let next = html;

  for (const block of ranges) {
    next = next.slice(0, block.start) + next.slice(block.start + block.html.length);
  }

  return next;
}

function replaceClassBlocks(
  html: string,
  matcher: (classes: string[]) => boolean,
  render: (block: { start: number; end: number; html: string; classes: string[] }) => string,
) {
  const ranges = outermostBlocks(classBlocks(html, matcher)).sort((left, right) => right.start - left.start);
  let next = html;

  for (const block of ranges) {
    const replacement = render(block);
    next = next.slice(0, block.start) + replacement + next.slice(block.start + block.html.length);
  }

  return next;
}

function theoryRoot(source: string) {
  const roots = classBlocks(source, (classes) => classes.includes(THEORY_ROOT_CLASS));
  const matched = roots.sort((left, right) => right.html.length - left.html.length)[0]?.html;

  if (matched) {
    return matched;
  }

  const markerIndex = source.indexOf(THEORY_ROOT_MARKER);

  if (markerIndex < 0) {
    return "";
  }

  const bodyEnd = source.indexOf("</body>", markerIndex);
  return source.slice(markerIndex, bodyEnd > markerIndex ? bodyEnd : undefined);
}

function mediaSource(src: string) {
  if (!src.startsWith("data:image/")) {
    return src;
  }

  const match = src.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);

  if (!match) {
    return src;
  }

  const mime = match[1].toLowerCase();
  const payload = match[2];
  const extension = mime.split("/")[1]?.replace("svg+xml", "svg") || "img";
  const hash = crypto.createHash("sha1").update(src).digest("hex");
  const filename = `${hash}.${extension}`;
  const target = path.join(MEDIA_ROOT(), filename);

  if (!fs.existsSync(target)) {
    fs.mkdirSync(MEDIA_ROOT(), { recursive: true });
    fs.writeFileSync(target, Buffer.from(payload, "base64"));
  }

  return `/__course_media/${filename}`;
}

function firstImageTag(html: string) {
  const imageIndex = html.indexOf("<img");

  if (imageIndex < 0) {
    return null;
  }

  const tagEnd = html.indexOf(">", imageIndex);

  if (tagEnd < 0) {
    return null;
  }
  const srcIndex = html.indexOf('src="', imageIndex);

  if (srcIndex < 0 || srcIndex > tagEnd) {
    return null;
  }

  const srcStart = srcIndex + 5;
  const srcEnd = html.indexOf('"', srcStart);

  if (srcEnd < 0 || srcEnd > tagEnd) {
    return null;
  }

  const src = html.slice(srcStart, srcEnd);

  if (!src) {
    return null;
  }

  const altIndex = html.indexOf('alt="', imageIndex);
  let alt = "";

  if (altIndex >= 0 && altIndex < tagEnd) {
    const altStart = altIndex + 5;
    const altEnd = html.indexOf('"', altStart);

    if (altEnd >= 0 && altEnd <= tagEnd) {
      alt = html.slice(altStart, altEnd);
    }
  }

  return { src, alt };
}

function imageFromStyle(html: string) {
  const styleIndex = html.indexOf("background-image");

  if (styleIndex < 0) {
    return null;
  }

  const dataIndex = html.indexOf("data:image/", styleIndex);

  if (dataIndex < 0) {
    return null;
  }

  const endIndex = html.indexOf(")", dataIndex);

  if (endIndex < 0) {
    return null;
  }

  return html.slice(dataIndex, endIndex).replace(/&quot;|"/g, "").trim();
}

function normalizeImageMarkup(src: string, alt = "") {
  return `<figure class="lessonImage"><img src="${mediaSource(src)}" alt="${alt}" class="image image_expandable" /></figure>`;
}

function simplifyMediaBlocks(html: string) {
  let next = html;

  next = replaceClassBlocks(
    next,
    (classes) => classes.includes("image-gallery"),
    (block) => {
      const styleMatch = imageFromStyle(block.html);
      const imageMatch = firstImageTag(block.html);
      const src = styleMatch ?? imageMatch?.src;
      const alt = imageMatch?.alt ?? "";
      return src ? normalizeImageMarkup(src, alt) : "";
    },
  );

  next = replaceClassBlocks(
    next,
    (classes) => classes.includes("downloadable-image"),
    (block) => {
      const imageMatch = firstImageTag(block.html);
      return imageMatch ? normalizeImageMarkup(imageMatch.src, imageMatch.alt) : "";
    },
  );

  return next
    .replace(
      /<div class="paragraph"[^>]*>\s*<a\b[^>]*href="[^"]+\.mov[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/div>/gi,
      "",
    )
    .replace(
      /<a\b[^>]*href="[^"]+\.(?:mov|mp4)[^"]*"[^>]*>[\s\S]*?<img\b[^>]*data:image\/png;base64[^>]*>[\s\S]*?<\/a>/gi,
      "",
    );
}

function sanitizeContent(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<iframe\b[^>]*\/?>/gi, "")
    .replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, "")
    .replace(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi, "")
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
    .replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    .replace(/<(?:path|defs|use|symbol|clipPath|mask|g)\b[^>]*\/?>/gi, "")
    .replace(/<source\b[^>]*\/?>/gi, "")
    .replace(/\sdata-testid="[^"]*"/gi, "")
    .replace(/\sshadowrootmode="[^"]*"/gi, "")
    .replace(/(^|>)[^<]*(?:currentColor|fill-opacity=|fill-rule=|clip-rule=|stroke-width=)[^<]*(?=<|$)/gi, "$1")
    .replace(/(^|>)[A-Za-z0-9+/=]{1000,}(?=<|$)/g, "$1")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<div>\s*<\/div>/gi, "")
    .trim();
}

function cleanLessonHtml(html: string) {
  return sanitizeContent(
    simplifyMediaBlocks(
      removeClassBlocks(html, [
        "block_type_quiz",
        "block_type_action-button",
        "block_type_dialog",
        "block_type_video",
        "video-player",
        "video-placeholder",
        "video-gif",
        "chat",
        "dialog",
        "chat__body",
        "chat__message",
        "bubble_type_text",
        "bubble_side_left",
        "bubble_side_right",
        "support-chat",
        "vsc-controller",
        "downloadable-image__button",
        "quiz-form",
        "quiz__content",
      ]),
    ),
  );
}

function withoutLeadingLessonTitle(html: string, file: string) {
  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);

  if (!heading || heading.index > 5_000) {
    return html;
  }

  const normalizeText = (value: string) =>
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("ru");

  const expectedTitle = lessonTitle(path.basename(file));

  if (normalizeText(heading[1]) !== normalizeText(expectedTitle)) {
    return html;
  }

  return html.slice(0, heading.index) + html.slice(heading.index + heading[0].length);
}

export function getCourse(): Chapter[] {
  return fs
    .readdirSync(ROOT(), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^(0[1-9]|1[0-2])(?:\s|$)/.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, "ru", { numeric: true }))
    .map((entry) => {
      const chapterPath = path.join(ROOT(), entry.name);
      const grouped = new Map<string, Lesson[]>();

      readFiles(chapterPath)
        .sort((left, right) => left.localeCompare(right, "ru", { numeric: true }))
        .forEach((file) => {
          const relative = normalize(path.relative(ROOT(), file));
          const parts = path.relative(chapterPath, file).split(path.sep);
          const section = parts.length > 1 ? parts[0].replace(/^\d+\s*/, "") : "Материалы главы";

          const lesson: Lesson = {
            id: relative,
            title: lessonTitle(path.basename(file)),
            file: relative,
            kind: "html",
          };

          grouped.set(section, [...(grouped.get(section) ?? []), lesson]);
        });

      const id = entry.name.match(/^\d+/)?.[0] ?? entry.name;
      const sections = [...grouped].map(([title, lessons]) => ({ title, lessons }));

      return {
        id,
        title: customTitles[id] ?? entry.name.replace(/^\d+\s*/, ""),
        sections,
        lessons: sections.flatMap((section) => section.lessons),
      };
    });
}

export function getLesson(file: string) {
  return getCourse()
    .flatMap((chapter) => chapter.lessons.map((lesson) => ({ lesson, chapter })))
    .find(({ lesson }) => lesson.file === file);
}

export function getLessonContent(file: string) {
  const source = sourceFor(file);
  const rootHtml = theoryRoot(source);

  if (!rootHtml) {
    return "";
  }

  if (source.length > LARGE_LESSON_THRESHOLD) {
    return withoutLeadingLessonTitle(
      sanitizeContent(
        removeClassBlocks(rootHtml, [
        "block_type_quiz",
        "block_type_action-button",
        "block_type_dialog",
        "block_type_video",
        "video-player",
        "video-placeholder",
        "video-gif",
        "chat",
        "dialog",
        "chat__body",
        "chat__message",
        "bubble_type_text",
        "bubble_side_left",
        "bubble_side_right",
        "support-chat",
        "vsc-controller",
        "downloadable-image__button",
        "downloadable-image",
        "image-gallery",
        "quiz-form",
        "quiz__content",
        ]),
      ),
      file,
    );
  }

  return withoutLeadingLessonTitle(cleanLessonHtml(rootHtml), file);
}
