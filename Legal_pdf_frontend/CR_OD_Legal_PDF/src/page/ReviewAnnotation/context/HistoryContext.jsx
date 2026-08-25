import React, { createContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const HistoryContext = createContext();

export function HistoryProvider({ children }) {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  // Example Log Structure:
  // {
  //   id: 'uuid',
  //   annotationId: 'ann-123',
  //   documentId: 'doc-1',
  //   actionType: 'CREATED' | 'EDITED' | 'DELETED' | 'RESOLVED' | 'REPLIED',
  //   authorName: 'Current User',
  //   timestamp: new Date().toISOString(),
  //   details: { previousValue, updatedValue, changedField, toolType }
  // }

  const addHistoryLog = useCallback((actionType, annotationId, details = {}) => {
    const newLog = {
      id: uuidv4(),
      annotationId,
      documentId: 'current-doc', // Simplified for single doc
      actionType,
      authorName: 'Current User', // Mocked user
      timestamp: new Date().toISOString(),
      details
    };

    setHistoryLogs(prev => [newLog, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryLogs([]);
  }, []);

  return (
    <HistoryContext.Provider
      value={{
        historyLogs,
        addHistoryLog,
        clearHistory,
        isHistoryPanelOpen,
        setIsHistoryPanelOpen
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}
