import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonTools } from "@/components/course-dashboard";
import { LessonContent } from "@/components/lesson-content";
import { getLesson, getLessonContent } from "@/lib/course";

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
  const position = topics.findIndex((item) => item.id === lesson.id);
  const previous = topics[position - 1];
  const next = topics[position + 1];
  const content = lesson.kind === "html" ? getLessonContent(lesson.file) : "";

  return (
    <main className="readerPage">
      <header className="readerHeader">
        <Link href="/" className="backLink">
          ← Ко всем главам
        </Link>

        <div>
          <span>Глава {chapter.id}</span>
          <b>{chapter.title}</b>
        </div>

        <span className="topicCounter">
          Тема {position + 1} из {topics.length}
        </span>
      </header>

      <div className="readerGrid">
        <aside className="chapterNav">
          <p>Содержание главы</p>
          <h2>{chapter.title}</h2>

          <nav>
            {topics.map((item, index) => (
              <Link key={item.id} href={href(item.file)} className={item.id === lesson.id ? "active" : ""}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="readerMain">
          <section className="lessonIntro">
            <span className="eyebrow">Тема {position + 1}</span>
            <h1>{lesson.title}</h1>
            <LessonTools lesson={lesson} />
          </section>

          <section className="lessonReader">
            <div className="readerLabel">
              <span>Материал урока</span>
              <span>Нажмите на изображение, чтобы открыть его на весь экран</span>
            </div>

            {lesson.kind === "pdf" ? (
              <iframe title={lesson.title} src={`/api/content?file=${encodeURIComponent(lesson.file)}`} />
            ) : (
              <LessonContent html={content} />
            )}
          </section>

          <nav className="lessonNavigation" aria-label="Навигация по урокам">
            {previous ? (
              <Link href={href(previous.file)}>
                <small>← Предыдущая тема</small>
                <b>{previous.title}</b>
              </Link>
            ) : (
              <span />
            )}

            {next ? (
              <Link href={href(next.file)} className="next">
                <small>Следующая тема →</small>
                <b>{next.title}</b>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </div>
    </main>
  );
}
