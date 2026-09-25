/**
 * Image/Video Carousel Component
 * Auto-rotates every 4 seconds, supports manual navigation
 * Responsive and lazy-loads images
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  white: '#FFFFFF',
  gray: '#64748B',
  border: '#E2E8F0',
};

interface CarouselSlide {
  id: string;
  url?: string;
  alt: string;
  type: 'image' | 'video';
  videoUrl?: string;
}

interface CarouselProps {
  slides: CarouselSlide[];
  autoRotateInterval?: number; // ms, default 4000
}

export default function Carousel({
  slides,
  autoRotateInterval = 4000,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);

  // Memoize slides to prevent unnecessary re-renders
  const memoizedSlides = useMemo(() => slides, [slides]);

  if (!memoizedSlides || memoizedSlides.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          background: BRAND_COLORS.border,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: BRAND_COLORS.gray,
          fontSize: '16px',
        }}
      >
        No content available
      </div>
    );
  }

  // Memoize navigation handlers
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index % memoizedSlides.length);
    setAutoRotate(false);
  }, [memoizedSlides.length]);

  const goToPrevious = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // Auto-rotate effect
  useEffect(() => {
    if (!autoRotate || memoizedSlides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % memoizedSlides.length);
    }, autoRotateInterval);

    return () => clearInterval(timer);
  }, [autoRotate, autoRotateInterval, memoizedSlides.length]);

  const currentSlide = memoizedSlides[currentIndex];

  return (
    <div
      style={{
        width: '100%',
        marginBottom: '32px',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Main Carousel Display */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          background: BRAND_COLORS.border,
          overflow: 'hidden',
        }}
        onMouseEnter={() => setAutoRotate(false)}
        onMouseLeave={() => setAutoRotate(true)}
      >
        {/* Content */}
        {currentSlide.type === 'image' && currentSlide.url && (
          <Image
            src={currentSlide.url}
            alt={currentSlide.alt}
            fill
            style={{ objectFit: 'cover' }}
            priority={currentIndex === 0}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 100vw"
          />
        )}

        {currentSlide.type === 'video' && currentSlide.videoUrl && (
          <iframe
            width="100%"
            height="100%"
            src={currentSlide.videoUrl}
            title={currentSlide.alt}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        )}

        {/* Navigation Arrows */}
        {memoizedSlides.length > 1 && (
          <>
            <NavigationButton
              direction="left"
              onClick={goToPrevious}
              ariaLabel="Previous slide"
            />
            <NavigationButton
              direction="right"
              onClick={goToNext}
              ariaLabel="Next slide"
            />
          </>
        )}

        {/* Slide Counter */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: BRAND_COLORS.white,
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          {currentIndex + 1} / {memoizedSlides.length}
        </div>
      </div>

      {/* Indicator Dots */}
      {memoizedSlides.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            background: BRAND_COLORS.white,
            borderTop: `1px solid ${BRAND_COLORS.border}`,
          }}
        >
          {memoizedSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: 'none',
                background:
                  index === currentIndex ? BRAND_COLORS.teal : BRAND_COLORS.border,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (index !== currentIndex) {
                  e.currentTarget.style.background = BRAND_COLORS.gray;
                }
              }}
              onMouseLeave={(e) => {
                if (index !== currentIndex) {
                  e.currentTarget.style.background = BRAND_COLORS.border;
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NavigationButtonProps {
  direction: 'left' | 'right';
  onClick: () => void;
  ariaLabel: string;
}

function NavigationButton({
  direction,
  onClick,
  ariaLabel,
}: NavigationButtonProps) {
  const isLeft = direction === 'left';

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        position: 'absolute',
        top: '50%',
        [isLeft ? 'left' : 'right']: '16px',
        transform: 'translateY(-50%)',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.5)',
        border: 'none',
        color: BRAND_COLORS.white,
        fontSize: '24px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s ease',
        zIndex: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = BRAND_COLORS.teal;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
      }}
    >
      {isLeft ? '‹' : '›'}
    </button>
  );
}
