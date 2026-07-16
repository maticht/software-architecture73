import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonTools } from "@/components/course-dashboard";
import { LessonChapterNav } from "@/components/lesson-chapter-nav";
import { LessonContent } from "@/components/lesson-content";
import { getLesson, getLessonContent, getLessonDocumentUrl } from "@/lib/course";

function href(file: string) {
  return `/lesson/${encodeURIComponent(file)}`;
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getLesson(decodeURIComponent(id));

  if (!found) {
    notFound();
  }

  const { lesson, chapter } = found;
  const topics = chapter.lessons.filter((item) => item.kind === lesson.kind);
  const currentIndex = topics.findIndex((item) => item.id === lesson.id);
  const previous = topics[currentIndex - 1];
  const next = topics[currentIndex + 1];
  const content = lesson.kind === "html" ? getLessonContent(lesson.file) : "";
  const pdfHref = lesson.kind === "pdf" ? getLessonDocumentUrl(lesson.file) : undefined;
  const navigationClassName = [
    "lessonNavigation",
    previous && next ? "" : "isSingle",
    !previous && next ? "nextOnly" : "",
    previous && !next ? "prevOnly" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="readerPage">
      <div className="readerGrid">
        <LessonChapterNav chapterId={chapter.id} chapterTitle={chapter.title} currentLessonId={lesson.id} topics={topics} />

        <div className="readerMain">
          <section className="lessonIntro">
            <h1>{lesson.title}</h1>
            <div className="lessonIntroActions">
              <LessonTools lesson={lesson} pdfHref={pdfHref} />
              <Link href="/" className="backLink">
                <span>К списку глав</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 6H5v12h5" />
                  <path d="M14 8l4 4-4 4M18 12H9" />
                </svg>
              </Link>
            </div>
          </section>

          <section className="lessonReader">
            <div className="readerLabel">
              <span>Материал урока</span>
              <span>Нажмите на изображение, чтобы открыть его на весь экран</span>
            </div>

            {lesson.kind === "pdf" ? (
              <iframe title={lesson.title} src={pdfHref} />
            ) : (
              <LessonContent html={content} />
            )}
          </section>

          {previous || next ? (
            <nav className={navigationClassName} aria-label="Навигация по урокам">
              {previous ? (
                <Link href={href(previous.file)}>
                  <small>← Предыдущая тема</small>
                  <b>{previous.title}</b>
                </Link>
              ) : null}

              {next ? (
                <Link href={href(next.file)} className="next">
                  <small>Следующая тема →</small>
                  <b>{next.title}</b>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </main>
  );
}
