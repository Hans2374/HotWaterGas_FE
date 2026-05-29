import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getFeaturedProducts } from '../../api/productApi';
import './HeroBanner.css';

const AUTOPLAY_INTERVAL_MS = 5000;

export const HeroBanner = () => {
  const navigate = useNavigate();

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef(null);
  const touchStartX = useRef(null);

  const clearAutoplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    clearAutoplay();
    if (featuredProducts.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % featuredProducts.length);
    }, AUTOPLAY_INTERVAL_MS);
  }, [featuredProducts.length, clearAutoplay]);

  const goTo = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  const goNext = useCallback(() => {
    if (featuredProducts.length <= 1) return;
    setActiveIndex(prev => (prev + 1) % featuredProducts.length);
  }, [featuredProducts.length]);

  const goPrev = useCallback(() => {
    if (featuredProducts.length <= 1) return;
    setActiveIndex(prev => (prev - 1 + featuredProducts.length) % featuredProducts.length);
  }, [featuredProducts.length]);

  const handleMouseEnter = useCallback(() => {
    if (!isPaused) {
      setIsPaused(true);
      clearAutoplay();
    }
  }, [isPaused, clearAutoplay]);

  const handleMouseLeave = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      startAutoplay();
    }
  }, [isPaused, startAutoplay]);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current == null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  }, [goNext, goPrev]);

  const navigateToProduct = useCallback((product) => {
    const slug = product.slug || product.productSlug || '';
    if (slug) navigate(`/products/${slug}`);
  }, [navigate]);

  // ── Fetch featured products ──────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const fetchFeatured = async () => {
      setIsLoading(true);
      try {
        const data = await getFeaturedProducts();
        if (!cancelled) {
          setFeaturedProducts(Array.isArray(data) && data.length > 0 ? data : []);
        }
      } catch {
        if (!cancelled) setFeaturedProducts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchFeatured();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (featuredProducts.length > 0) startAutoplay();
    return clearAutoplay;
  }, [featuredProducts.length, startAutoplay, clearAutoplay]);

  // ── Guards — must be AFTER all hooks ─────────────────────────

  if (isLoading || featuredProducts.length === 0) return null;

  const total = featuredProducts.length;
  const slides = featuredProducts.map((_, i) => i);

  const getSlideStyle = (idx) => {
    const diff = (idx - activeIndex + total) % total;

    let x = 0;
    let scale = 1;
    let opacity = 1;
    let zIndex = 1;

    if (diff === 0) {
      x = 0;
      scale = 1;
      opacity = 1;
      zIndex = 4;
    } else if (diff === 1) {
      x = 33;
      scale = 0.88;
      opacity = 0.6;
      zIndex = 3;
    } else if (diff === total - 1) {
      x = -33;
      scale = 0.88;
      opacity = 0.6;
      zIndex = 3;
    } else if (diff === 2) {
      x = 66;
      scale = 0.76;
      opacity = 0;
      zIndex = 0;
    } else if (diff === total - 2) {
      x = -66;
      scale = 0.76;
      opacity = 0;
      zIndex = 0;
    }

    return {
      transform: `translateX(calc(-50% + ${x}%)) scale(${scale})`,
      opacity,
      zIndex,
      willChange: 'transform, opacity',
    };
  };

  return (
    <section
      className="hero-banner-section"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      aria-label="Featured games showcase"
    >
      <div className="hero-carousel-viewport">
        {/* ── Slides wrapper ── */}
        <div className="hero-slides-wrapper">
          {slides.map((idx) => {
            const product = featuredProducts[idx];
            const style = getSlideStyle(idx);

            return (
              <div
                key={product.id || idx}
                className="hero-slide"
                style={style}
                onClick={() => {
                  const diff = (idx - activeIndex + total) % total;
                  if (diff === 0) navigateToProduct(product);
                  else if (diff === 1) goNext();
                  else if (diff === total - 1) goPrev();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const diff = (idx - activeIndex + total) % total;
                    if (diff === 0) navigateToProduct(product);
                    else if (diff === 1) goNext();
                    else if (diff === total - 1) goPrev();
                  }
                }}
                aria-label={product.name}
              >
                <img
                  src={product.primaryImageUrl || product.primaryImage || ''}
                  alt={product.name}
                  loading={idx === activeIndex ? 'eager' : 'lazy'}
                  draggable={false}
                />
              </div>
            );
          })}
        </div>

        {/* ── Navigation arrows — hover-only ── */}
        {total > 1 && (
          <>
            <button
              className="hero-nav-btn hero-nav-prev"
              onClick={goPrev}
              aria-label="Previous featured game"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="hero-nav-btn hero-nav-next"
              onClick={goNext}
              aria-label="Next featured game"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </section>
  );
};
