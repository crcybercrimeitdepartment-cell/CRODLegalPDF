import React from 'react';
import ToolWorkspace from '../../ToolWorkspace';

export default function DelegatedSigningPage({ tool, onBack }) {
  return (
    <ToolWorkspace tool={tool} onBack={onBack} />
  );
}
