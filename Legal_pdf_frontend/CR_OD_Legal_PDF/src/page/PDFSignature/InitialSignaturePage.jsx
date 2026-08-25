import React from 'react';
import ToolWorkspace from '../../ToolWorkspace';

export default function InitialSignaturePage({ tool, onBack }) {
  return (
    <ToolWorkspace tool={tool} onBack={onBack} />
  );
}
