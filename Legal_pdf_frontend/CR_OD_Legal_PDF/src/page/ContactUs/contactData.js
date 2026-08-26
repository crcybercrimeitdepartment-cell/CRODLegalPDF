/**
 * @file contactData.js
 * @description Centralized data for Contact Us inquiry types and FAQ items.
 */

export const inquiryTypes = [
  'General Inquiry',
  'Technical Support',
  'Feedback & Suggestion',
  'Report a Bug',
  'Feature Request',
  'PDF Tool Issue',
  'Other',
];

export const faqItems = [
  {
    id: 'account',
    question: 'Do I need an account to use CR OD Legal PDF?',
    answer: 'No, you do not need an account to use most of our PDF tools. You can access the majority of features directly from the browser without signing up. Some advanced features may require registration.',
  },
  {
    id: 'security',
    question: 'Are uploaded PDF files secure?',
    answer: 'Yes. We take your privacy seriously. Files uploaded to our platform are processed securely and are automatically deleted from our servers after processing. We do not store, share, or access your documents.',
  },
  {
    id: 'processing',
    question: 'Why is my PDF not processing?',
    answer: 'PDF processing issues can occur due to file corruption, password protection, or unsupported encoding. Try re-saving your PDF from its source application, or check if the file exceeds the maximum supported size. If the problem persists, contact our technical support.',
  },
  {
    id: 'bug-report',
    question: 'Can I report a bug or feature issue?',
    answer: 'Absolutely. We welcome bug reports and issue reports. Use the contact form on this page, select "Report a Bug" as the inquiry type, and describe the problem in as much detail as possible including the steps to reproduce it.',
  },
  {
    id: 'suggestion',
    question: 'How can I suggest a new PDF tool?',
    answer: 'We love hearing from our users. Submit your idea through the contact form below, selecting "Feature Request" or "Feedback & Suggestion" as the inquiry type. Our team reviews all suggestions and considers them for future updates.',
  },
];
