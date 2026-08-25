import React from 'react';
import ToolWorkspace from '../../ToolWorkspace';

export default function BiometricSignaturePage({ tool, onBack }) {
  return (
    <ToolWorkspace tool={tool} onBack={onBack} />
  );
}
