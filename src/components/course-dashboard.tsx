"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Chapter, Lesson } from "@/lib/course";

const STORAGE_KEY = "architecture-course-progress-v1";

function linkTo(file: string) {
  return `/lesson/${encodeURIComponent(file)}`;
}

export function useProgress() {
  const [done, setDone] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const toggle = (id: string) =>
    setDone((current) => {
      const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

  return { done, toggle };
}

function LessonLine({ lesson, done, toggle }: { lesson: Lesson; done: boolean; toggle: () => void }) {
  return (
    <div className="lessonLine">
      <button
        type="button"
        aria-label={done ? "Снять отметку о прохождении" : "Отметить урок как пройденный"}
        className={`checkButton ${done ? "isDone" : ""}`}
        onClick={toggle}
      >
        <span className="check" />
      </button>

      <Link href={linkTo(lesson.file)} className="lessonLink">
        <span className="lessonTitle">{lesson.title}</span>
        <span className="fileType">{lesson.kind === "pdf" ? "PDF" : "Урок"}</span>
      </Link>
    </div>
  );
}

export function CourseDashboard({ chapters }: { chapters: Chapter[] }) {
  const { done, toggle } = useProgress();
  const lessons = useMemo(
    () => chapters.flatMap((chapter) => chapter.lessons).filter((lesson) => lesson.kind === "html"),
    [chapters],
  );

  const completed = lessons.filter((lesson) => done.includes(lesson.id)).length;
  const progress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;

  return (
    <main className="page">
      <header className="hero">
        <div className="heroBody">
          <span className="eyebrow">Архитектура ПО</span>
          <h1>Материалы курса и ваш прогресс</h1>
          <p>
            Все главы, уроки и переходы собраны в одном интерфейсе: можно быстро открыть нужную тему, отметить
            прохождение и вернуться к курсу с того же места.
          </p>
        </div>

        <div className="heroAside">
          <div className="heroAsideTop">
            <span>Ваш прогресс</span>
            <ThemeToggle compact />
          </div>

          <div className="overall">
            <div className="overallTop">
              <strong>{progress}%</strong>
              <span>пройдено</span>
            </div>

            <div className="progress" aria-hidden="true">
              <i style={{ width: `${progress}%` }} />
            </div>

            <div className="overallMeta">
              <span>
                {completed} из {lessons.length} уроков
              </span>
              <span>{chapters.length} глав</span>
            </div>
          </div>
        </div>
      </header>

      <section className="chapters">
        <div className="sectionHeading">
          <h2>Список глав</h2>
        </div>

        <div className="chapterList">
          {chapters.map((chapter, index) => {
            const current = chapter.lessons.filter((lesson) => lesson.kind === "html");
            const count = current.filter((lesson) => done.includes(lesson.id)).length;
            const percentage = current.length ? Math.round((count / current.length) * 100) : 0;

            return (
              <details id={`chapter-${chapter.id}`} key={chapter.id} className="chapter" open={index === 0}>
                <summary>
                  <div className="chapterNumber">{chapter.id.padStart(2, "0")}</div>

                  <div className="chapterMain">
                    <h3>{chapter.title}</h3>
                    <p>
                      {count} из {current.length} уроков пройдено
                    </p>
                  </div>

                  <div className="chapterStats">
                    <div className="chapterBar" aria-hidden="true">
                      <i style={{ width: `${percentage}%` }} />
                    </div>
                    <span>{percentage}%</span>
                  </div>

                  <span className="chapterChevron" aria-hidden="true" />
                </summary>

                <div className="sections">
                  {chapter.sections.map((section) => (
                    <section className="section" key={section.title}>
                      <h4>{section.title}</h4>

                      <div className="lessonGroup">
                        {section.lessons.map((lesson) => (
                          <LessonLine
                            key={lesson.id}
                            lesson={lesson}
                            done={done.includes(lesson.id)}
                            toggle={() => toggle(lesson.id)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export function LessonTools({ lesson, pdfHref }: { lesson: Lesson; pdfHref?: string }) {
  const { done, toggle } = useProgress();
  const isDone = done.includes(lesson.id);

  return (
    <div className="lessonTools">
      <button type="button" className={`completeButton ${isDone ? "isDone" : ""}`} onClick={() => toggle(lesson.id)}>
        {isDone ? "Урок отмечен как пройденный" : "Отметить как пройденный"}
      </button>

      {lesson.kind === "pdf" && pdfHref ? (
        <a className="secondaryButton" href={pdfHref} download>
          Скачать PDF
        </a>
      ) : null}
    </div>
  );
}
