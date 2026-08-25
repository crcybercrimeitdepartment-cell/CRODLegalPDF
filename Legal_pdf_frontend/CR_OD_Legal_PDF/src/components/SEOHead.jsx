/**
 * @file SEOHead.jsx
 * @description Dynamic SEO Head component. Automatically updates document title,
 * meta description, canonical link, open graph, twitter cards, and injects
 * JSON-LD structured data into document <head> without external heavy dependencies.
 */

import React, { useEffect } from 'react';
import { getSEOMetadata, generateStructuredData } from '../utils/seoKeywords';

/**
 * SEOHead Component
 *
 * @component
 * @param {Object} props - Props
 * @param {string} [props.activePage="home"] - Active page id (e.g. 'organize-pdf')
 * @param {Object} [props.tool=null] - Selected tool object (if inside workspace)
 * @returns {null} Renders nothing in DOM tree; operates directly on document head
 */
export default function SEOHead({ activePage = 'home', tool = null }) {
  useEffect(() => {
    const meta = getSEOMetadata(activePage, tool);

    // 1. Update Document Title
    document.title = meta.title;

    // 2. Helper to set/create meta element by selector
    const updateMeta = (nameAttr, nameValue, contentValue) => {
      let element = document.querySelector(`meta[${nameAttr}="${nameValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, nameValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
    };

    // 3. Helper to set link element
    const updateLink = (relValue, hrefValue) => {
      let element = document.querySelector(`link[rel="${relValue}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', relValue);
        document.head.appendChild(element);
      }
      element.setAttribute('href', hrefValue);
    };

    // Standard Meta Tags
    updateMeta('name', 'description', meta.description);
    updateMeta('name', 'keywords', meta.keywords);
    updateMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    updateLink('canonical', meta.canonical);

    // Open Graph Meta Tags
    updateMeta('property', 'og:title', meta.title);
    updateMeta('property', 'og:description', meta.description);
    updateMeta('property', 'og:url', meta.canonical);
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:image', 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1785473491/LegalPDFLogo_uzgtsd.png');

    // Twitter Card Meta Tags
    updateMeta('name', 'twitter:title', meta.title);
    updateMeta('name', 'twitter:description', meta.description);
    updateMeta('name', 'twitter:url', meta.canonical);
    updateMeta('name', 'twitter:card', 'summary_large_image');
    updateMeta('name', 'twitter:image', 'https://res.cloudinary.com/dlhmkbijh/image/upload/v1785473491/LegalPDFLogo_uzgtsd.png');

    // 4. Inject / Update JSON-LD Structured Data
    const schemas = generateStructuredData(meta);
    let scriptElement = document.querySelector('#seo-json-ld');
    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.id = 'seo-json-ld';
      scriptElement.type = 'application/ld+json';
      document.head.appendChild(scriptElement);
    }
    scriptElement.textContent = JSON.stringify(schemas, null, 2);

  }, [activePage, tool]);

  return null;
}
