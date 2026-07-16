"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/course";

function href(file: string) {
  return `/lesson/${encodeURIComponent(file)}`;
}

type LessonChapterNavProps = {
  chapterId: string;
  chapterTitle: string;
  currentLessonId: string;
  topics: Lesson[];
};

export function LessonChapterNav({ chapterId, chapterTitle, currentLessonId, topics }: LessonChapterNavProps) {
  const [open, setOpen] = useState(false);

  const currentIndex = topics.findIndex((item) => item.id === currentLessonId);
  const currentLesson = currentIndex >= 0 ? topics[currentIndex] : topics[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="chapterNavMobile">
        <button
          type="button"
          className="chapterNavTrigger"
          aria-expanded={open}
          aria-controls="chapter-mobile-nav"
          onClick={() => setOpen(true)}
        >
          <span className="chapterNavTriggerMeta">
            Тема {Math.max(currentIndex + 1, 1)} из {topics.length}
          </span>
          <strong>{currentLesson?.title ?? chapterTitle}</strong>
          <span className="chapterNavTriggerIcon" aria-hidden="true">
            +
          </span>
        </button>
      </div>

      <aside className="chapterNav">
        <div className="chapterNavHeader">
          <span>Глава {chapterId}</span>
          <strong>{chapterTitle}</strong>
        </div>

        <nav aria-label={`Содержание главы ${chapterTitle}`}>
          {topics.map((item, index) => (
            <Link key={item.id} href={href(item.file)} className={item.id === currentLessonId ? "active" : ""}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>

      {open ? (
        <div className="chapterNavOverlay" onClick={() => setOpen(false)}>
          <div
            id="chapter-mobile-nav"
            className="chapterNavSheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Темы главы ${chapterTitle}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="chapterNavSheetHeader">
              <div>
                <span>Содержание главы</span>
                <strong>{chapterTitle}</strong>
              </div>

              <button type="button" className="chapterNavSheetClose" aria-label="Закрыть список тем" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <nav className="chapterNavSheetList">
              {topics.map((item, index) => (
                <Link
                  key={item.id}
                  href={href(item.file)}
                  className={item.id === currentLessonId ? "active" : ""}
                  onClick={() => setOpen(false)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
