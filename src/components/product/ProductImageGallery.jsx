import React, { useCallback, useRef, useState } from "react";

export const ProductImageGallery = ({ images = [], productName = "" }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStartX = useRef(null);
  const total = images.length;

  const handlePointerDown = useCallback((e) => {
    dragStartX.current = e.clientX;
  }, []);

  const handlePointerMove = useCallback((e) => {
    // No visual feedback needed during move
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) {
        setActiveIndex((i) => (i + 1) % total);
      } else {
        setActiveIndex((i) => (i - 1 + total) % total);
      }
    }
    dragStartX.current = null;
  }, [total]);

  if (total === 0) {
    return (
      <div className="pdp-gallery-empty">
        <span>No images available</span>
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div className="pdp-gallery">
      {/* ── Main image area ── */}
      <div
        className="pdp-gallery-main"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        <img
          key={activeIndex}
          src={activeImage?.url || ""}
          alt={`${productName} — image ${activeIndex + 1}`}
          className="pdp-gallery-main-img"
          draggable={false}
        />

        {/* Arrows — shown on hover */}
        {total > 1 && (
          <>
            <button
              className="pdp-gallery-arrow pdp-gallery-arrow-prev"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((i) => (i - 1 + total) % total);
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              className="pdp-gallery-arrow pdp-gallery-arrow-next"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((i) => (i + 1) % total);
              }}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnail strip (horizontal, scrollable) ── */}
      {total > 1 && (
        <div className="pdp-gallery-thumbnails" role="list">
          {images.map((img, i) => (
            <button
              key={img.id || img.url || i}
              type="button"
              role="listitem"
              className={`pdp-gallery-thumb${i === activeIndex ? " active" : ""}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === activeIndex}
            >
              <img
                src={img.url || ""}
                alt={`${productName} thumbnail ${i + 1}`}
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
