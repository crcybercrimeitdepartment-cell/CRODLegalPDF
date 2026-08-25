import React from 'react';
import ScrollDesign from '../ScrollDesign';
import { workflowAutomationData as data, heading } from './WorkflowAutomationPageData';

export default function WorkflowAutomationPage() {
  return <ScrollDesign heading={heading} pages={data} />;
}
