import React from 'react';
import ToolWorkspace from '../../ToolWorkspace';

export default function VisibleSignatureDesignerPage({ tool, onBack }) {
  return (
    <ToolWorkspace tool={tool} onBack={onBack} />
  );
}
