import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { whyChooseUsData as data, heading } from './WhyChooseUsPageData';

export default function WhyChooseUsPage() {
  return <ScrollDesign heading={heading} pages={data} />;
}
