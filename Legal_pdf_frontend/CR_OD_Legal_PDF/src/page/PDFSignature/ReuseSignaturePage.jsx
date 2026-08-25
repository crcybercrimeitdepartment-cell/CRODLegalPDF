import React from 'react';
import ToolWorkspace from '../../ToolWorkspace';

export default function ReuseSignaturePage({ tool, onBack }) {
  return (
    <ToolWorkspace tool={tool} onBack={onBack} />
  );
}
