import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections as data } from './ContactAndSupportPageData';

export default function ContactAndSupportPage() {
  return <ScrollDesign heading="Contact & Support" pages={data} />;
}
