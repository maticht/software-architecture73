/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GalleryImage = { src: string; alt: string };

function isDecorativeBanner(image: HTMLImageElement) {
  const { naturalWidth, naturalHeight } = image;

  return naturalWidth >= 600 && naturalHeight > 0 && naturalHeight <= 200 && naturalWidth / naturalHeight >= 8;
}

export function LessonContent({ html }: { html: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [current, setCurrent] = useState(0);

  const move = useCallback(
    (step: number) => {
      setCurrent((value) => (value + step + images.length) % images.length);
    },
    [images.length],
  );

  const open = (event: React.MouseEvent<HTMLDivElement>) => {
    const image = (event.target as HTMLElement).closest("img");
    if (!image || !root.current) {
      return;
    }

    const all = Array.from(root.current.querySelectorAll("img"))
      .filter((item) => !isDecorativeBanner(item))
      .map((item) => ({ src: item.currentSrc || item.src, alt: item.alt || "" }))
      .filter((item) => item.src);

    const active = (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src;
    const index = all.findIndex((item) => item.src === active);

    if (index >= 0) {
      setImages(all);
      setCurrent(index);
    }
  };

  useEffect(() => {
    if (!images.length) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImages([]);
      }

      if (event.key === "ArrowLeft") {
        move(-1);
      }

      if (event.key === "ArrowRight") {
        move(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, move]);

  useEffect(() => {
    if (!root.current) {
      return;
    }

    const blocks = Array.from(root.current.querySelectorAll("p, .paragraph"));

    for (const block of blocks) {
      const text = (block.textContent ?? "").trim();
      const strong = block.querySelector("strong");
      const strongText = (strong?.textContent ?? "").trim();

      if (text.startsWith("Пример.") || strongText === "Пример.") {
        block.classList.add("exampleParagraph");
      }
    }
  }, [html]);

  useEffect(() => {
    if (!root.current) {
      return;
    }

    const pictures = Array.from(root.current.querySelectorAll<HTMLImageElement>("img"));
    const listeners: Array<{ picture: HTMLImageElement; handler: () => void }> = [];
    const markDecorative = (picture: HTMLImageElement) => {
      if (isDecorativeBanner(picture)) {
        picture.classList.add("decorativeImage");
      }
    };

    for (const picture of pictures) {
      if (picture.complete) {
        markDecorative(picture);
      } else {
        const handler = () => markDecorative(picture);
        picture.addEventListener("load", handler, { once: true });
        listeners.push({ picture, handler });
      }
    }

    return () => {
      for (const { picture, handler } of listeners) {
        picture.removeEventListener("load", handler);
      }
    };
  }, [html]);

  return (
    <>
      <div ref={root} className="courseContent" onClick={open}>
        <div className="courseContentChunk" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {images.length > 0 && (
        <div className="imageModal" role="dialog" aria-modal="true" onClick={() => setImages([])}>
          <button
            type="button"
            className="imageClose"
            aria-label="Закрыть изображение"
            onClick={(event) => {
              event.stopPropagation();
              setImages([]);
            }}
          >
            <span className="modalIcon" aria-hidden="true">
              ×
            </span>
          </button>

          {images.length > 1 && (
            <button
              type="button"
              className="imageArrow prev"
              aria-label="Предыдущее изображение"
              onClick={(event) => {
                event.stopPropagation();
                move(-1);
              }}
            >
              <span className="modalIcon" aria-hidden="true">
                ‹
              </span>
            </button>
          )}

          <div className="imageStage" onClick={(event) => event.stopPropagation()}>
            <img src={images[current]?.src} alt={images[current]?.alt || `Изображение ${current + 1}`} />

            {images.length > 1 && (
              <div className="imageThumbs">
                {images.map((image, imageIndex) => (
                  <button
                    key={`${image.src}-${imageIndex}`}
                    type="button"
                    className={imageIndex === current ? "isActive" : ""}
                    onClick={() => setCurrent(imageIndex)}
                    aria-label={`Открыть изображение ${imageIndex + 1}`}
                  >
                    <img src={image.src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {images.length > 1 && (
            <button
              type="button"
              className="imageArrow next"
              aria-label="Следующее изображение"
              onClick={(event) => {
                event.stopPropagation();
                move(1);
              }}
            >
              <span className="modalIcon" aria-hidden="true">
                ›
              </span>
            </button>
          )}

          <div className="imageCounter">
            {current + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
