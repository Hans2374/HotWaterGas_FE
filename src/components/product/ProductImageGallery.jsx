import React, { useCallback, useEffect, useRef, useState } from "react";

export const ProductImageGallery = ({ images = [], productName = "" }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);
  const activeIndexRef = useRef(0);
  const dragStartX = useRef(null);
  const total = images.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      navigateTo((activeIndexRef.current + 1) % total);
    }, 5000);
  }, [clearTimer, total]);

  useEffect(() => {
    if (total > 1) {
      startTimer();
    }
    return clearTimer;
  }, [total, startTimer, clearTimer]);

  const navigateTo = useCallback((nextIndex) => {
    if (nextIndex === activeIndexRef.current) return;
    setIsTransitioning(true);
    setTimeout(() => {
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      setIsTransitioning(false);
      if (total > 1) startTimer();
    }, 300);
  }, [startTimer, total]);

  const handlePointerDown = useCallback((e) => {
    dragStartX.current = e.clientX;
  }, []);

  const handlePointerMove = useCallback(() => {
    // No visual feedback needed during move
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) {
        navigateTo((activeIndexRef.current + 1) % total);
      } else {
        navigateTo((activeIndexRef.current - 1 + total) % total);
      }
    }
    dragStartX.current = null;
  }, [total, navigateTo]);

  const handleMouseEnter = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleMouseLeave = useCallback(() => {
    if (total > 1) startTimer();
  }, [total, startTimer]);

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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`pdp-gallery-main-inner${isTransitioning ? " fade-out" : " fade-in"}`}>
          <img
            src={activeImage?.url || ""}
            alt={`${productName} — image ${activeIndex + 1}`}
            className="pdp-gallery-main-img"
            draggable={false}
          />
        </div>

        {/* Arrows — shown on hover */}
        {total > 1 && (
          <>
            <button
              className="pdp-gallery-arrow pdp-gallery-arrow-prev"
              onClick={(e) => {
                e.stopPropagation();
                navigateTo((activeIndex - 1 + total) % total);
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              className="pdp-gallery-arrow pdp-gallery-arrow-next"
              onClick={(e) => {
                e.stopPropagation();
                navigateTo((activeIndex + 1) % total);
              }}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnail strip (always visible, horizontal scrollable) ── */}
      <div className="pdp-gallery-thumbnails" role="list">
        {images.map((img, i) => (
          <button
            key={img.id || img.url || i}
            type="button"
            role="listitem"
            className={`pdp-gallery-thumb${i === activeIndex ? " active" : ""}`}
            onClick={() => navigateTo(i)}
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
    </div>
  );
};
