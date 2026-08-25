import React from 'react';
import ToolWorkspace from '../../ToolWorkspace';

export default function SharedWorkspacePage({ tool, onBack }) {
  return (
    <ToolWorkspace tool={tool} onBack={onBack} />
  );
}
