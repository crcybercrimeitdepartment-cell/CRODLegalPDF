/**
 * @file SlideInText.jsx
 * @description Animated heading component that renders each character with a
 * staggered slide-in-from-left entrance effect.
 * Used in all sub-page hero headers to give titles a dynamic feel.
 *
 * Animation is driven by the CSS class `slide-in-char` defined in index.css.
 * Each character receives an `animationDelay` proportional to its index (28ms per char).
 */
import React, { useState, useEffect } from 'react';

/**
 * SlideInText
 * Splits a string into individual characters and animates each one
 * sliding in from the left with a cascading stagger delay.
 *
 * Accessibility: The parent <span> carries the full `aria-label` so screen readers
 * read the whole word, while each character span has `aria-hidden="true"` to
 * prevent double-reading.
 *
 * @component
 * @param {Object}  props           - Component props
 * @param {string}  props.text      - The heading text to animate character-by-character
 * @param {string}  [props.className=''] - Optional extra Tailwind classes for the wrapper span
 * @returns {JSX.Element} A span containing individually animated character spans
 *
 * @example
 * // Basic usage inside an <h1>
 * <h1><SlideInText text="Organize PDF" /></h1>
 */
export default function SlideInText({ text, className = '' }) {
  // Controls whether the slide-in CSS class is applied
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    // Reset animation on text change, then re-trigger on the next animation frame
    // so the browser has time to clear the previous transition state.
    setTriggered(false);
    const t = requestAnimationFrame(() => setTriggered(true));
    return () => cancelAnimationFrame(t); // Cleanup on unmount or text change
  }, [text]);

  // Convert string to character array; guard against non-string values
  const chars = typeof text === 'string' ? text.split('') : [];

  return (
    <span
      className={`inline-flex flex-wrap justify-center leading-tight ${className}`}
      aria-label={text} // Full text for screen readers
    >
      {chars.map((char, i) => (
        <span
          key={i}
          aria-hidden="true" // Hidden from screen readers (aria-label on parent handles it)
          className={triggered ? 'slide-in-char' : 'opacity-0 inline-block'}
          style={{
            animationDelay: triggered ? `${i * 28}ms` : '0ms', // Stagger: 28ms per character
            whiteSpace: char === ' ' ? 'pre' : 'normal',        // Preserve spaces
          }}
        >
          {/* Render non-breaking space for space chars to preserve visual spacing */}
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}
