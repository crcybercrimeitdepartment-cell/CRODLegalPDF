import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { sections } from './GlobalPresencePageData.js';

export default function GlobalPresencePage() {
  return <ScrollDesign heading="Global Presence" pages={sections} />;
}

