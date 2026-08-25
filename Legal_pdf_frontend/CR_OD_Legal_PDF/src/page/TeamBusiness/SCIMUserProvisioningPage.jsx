import React from 'react';
import ToolWorkspace from '../../ToolWorkspace';

export default function SCIMUserProvisioningPage({ tool, onBack }) {
  return (
    <ToolWorkspace tool={tool} onBack={onBack} />
  );
}
