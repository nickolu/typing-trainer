import { useEffect, useState, useRef } from 'react';

interface TypingCursorProps {
  containerRef: React.RefObject<HTMLDivElement>;
  currentWordIndex: number;
  currentCharIndex: number;
  isActive: boolean;
}

export function TypingCursor({
  containerRef,
  currentWordIndex,
  currentCharIndex,
  isActive,
}: TypingCursorProps) {
  const [position, setPosition] = useState<{ top: number; left: number; height: number } | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!containerRef.current) return;

      // Find the current word element
      const wordElements = containerRef.current.querySelectorAll('[data-word-index]');
      const currentWordElement = Array.from(wordElements).find(
        (el) => el.getAttribute('data-word-index') === String(currentWordIndex)
      ) as HTMLElement | undefined;

      if (!currentWordElement) {
        setPosition(null);
        return;
      }

      // Get the word content span
      const wordSpan = currentWordElement.querySelector('.test-word-current, .test-word-pending, .test-word-correct, .test-word-incorrect');

      if (!wordSpan) {
        setPosition(null);
        return;
      }

      // Get all character spans within the word
      const charSpans = wordSpan.querySelectorAll('span');

      // Calculate cursor position
      let targetElement: HTMLElement | null = null;
      let positionAtStart = true;

      if (currentCharIndex === 0 && charSpans.length > 0) {
        // Cursor at the beginning of the word
        targetElement = charSpans[0] as HTMLElement;
        positionAtStart = true;
      } else if (currentCharIndex > 0 && currentCharIndex <= charSpans.length) {
        // Cursor after a character (use previous character's position)
        targetElement = charSpans[currentCharIndex - 1] as HTMLElement;
        positionAtStart = false;
      }

      if (!targetElement) {
        setPosition(null);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      // Position cursor relative to container
      const top = targetRect.top - containerRect.top;
      const left = positionAtStart
        ? targetRect.left - containerRect.left - 1
        : targetRect.right - containerRect.left - 1;
      const height = targetRect.height;

      setPosition({ top, left, height });
    };

    updatePosition();

    // Also update on resize or font load
    const resizeObserver = new ResizeObserver(updatePosition);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, currentWordIndex, currentCharIndex, isActive]);

  if (!position || !isActive) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      className="absolute w-0.5 bg-editor-accent pointer-events-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        height: `${position.height}px`,
        transition: 'top 0.15s ease-out, left 0.15s ease-out, height 0.15s ease-out',
        zIndex: 10,
        animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
    />
  );
}
