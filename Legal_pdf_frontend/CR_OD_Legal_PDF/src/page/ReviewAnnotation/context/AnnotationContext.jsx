import React, { createContext, useState, useCallback, useContext } from 'react';
import { HistoryContext } from './HistoryContext';

export const AnnotationContext = createContext();

export function AnnotationProvider({ children }) {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);

  const [annotations, setAnnotations] = useState([]);
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);

  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(false);
  const { addHistoryLog } = useContext(HistoryContext);

  const addAnnotation = useCallback((newAnnotation) => {
    setAnnotations((prev) => {
      const nextState = [...prev, newAnnotation];
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    addHistoryLog('CREATED', newAnnotation.id, { 
      type: newAnnotation.type,
      pageNumber: newAnnotation.pageNumber
    });
  }, [addHistoryLog]);

  const updateAnnotation = useCallback((id, updates) => {
    setAnnotations((prev) => {
      const nextState = prev.map((ann) => 
        ann.id === id ? { ...ann, ...updates, lastModifiedDate: new Date().toISOString() } : ann
      );
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    
    // Determine the type of update
    let actionType = 'EDITED';
    if (updates.resolved !== undefined) {
      actionType = updates.resolved ? 'RESOLVED' : 'REOPENED';
    }
    
    addHistoryLog(actionType, id, { 
      updatedFields: Object.keys(updates)
    });
  }, [addHistoryLog]);

  const deleteAnnotation = useCallback((id) => {
    setAnnotations((prev) => {
      const nextState = prev.filter((ann) => ann.id !== id);
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      if (selectedAnnotationId === id) {
        setSelectedAnnotationId(null);
      }
      return nextState;
    });
    addHistoryLog('DELETED', id);
  }, [selectedAnnotationId, addHistoryLog]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((h) => h.slice(0, h.length - 1));
    setRedoHistory((rh) => [annotations, ...rh]);
    setAnnotations(previousState);
  }, [history, annotations]);

  const redo = useCallback(() => {
    if (redoHistory.length === 0) return;
    const nextState = redoHistory[0];
    setRedoHistory((rh) => rh.slice(1));
    setHistory((h) => [...h, annotations]);
    setAnnotations(nextState);
  }, [redoHistory, annotations]);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    setHistory([]);
    setRedoHistory([]);
    setSelectedAnnotationId(null);
  }, []);

  const importAnnotations = useCallback((importedAnnotations, mode = 'MERGE') => {
    setAnnotations(prev => {
      let nextState;
      if (mode === 'REPLACE') {
        nextState = [...importedAnnotations];
      } else { // MERGE
        // Very basic merge: keep existing, add imported if ID doesn't exist
        const existingIds = new Set(prev.map(a => a.id));
        const newAnnotations = importedAnnotations.filter(a => !existingIds.has(a.id));
        nextState = [...prev, ...newAnnotations];
      }
      
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    addHistoryLog('IMPORTED', 'multiple', { mode });
  }, [addHistoryLog]);

  const addReply = useCallback((annotationId, replyContent) => {
    const newReply = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: replyContent,
      authorName: 'Reviewer',
      createdDate: new Date().toISOString()
    };
    
    setAnnotations(prev => {
      const nextState = prev.map(ann => {
        if (ann.id === annotationId) {
          return {
            ...ann,
            replies: [...(ann.replies || []), newReply],
            lastModifiedDate: new Date().toISOString()
          };
        }
        return ann;
      });
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    addHistoryLog('REPLIED', annotationId, { replyId: newReply.id });
  }, [addHistoryLog]);

  const deleteReply = useCallback((annotationId, replyId) => {
    setAnnotations(prev => {
      const nextState = prev.map(ann => {
        if (ann.id === annotationId && ann.replies) {
          return {
            ...ann,
            replies: ann.replies.filter(r => r.id !== replyId),
            lastModifiedDate: new Date().toISOString()
          };
        }
        return ann;
      });
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    // Can log DELETED reply if wanted, but typically just DELETED action works
    addHistoryLog('DELETED', annotationId, { replyId, type: 'reply' });
  }, [addHistoryLog]);

  return (
    <AnnotationContext.Provider
      value={{
        file, setFile,
        numPages, setNumPages,
        annotations, setAnnotations,
        selectedAnnotationId, setSelectedAnnotationId,
        addAnnotation, updateAnnotation, deleteAnnotation,
        undo, redo, canUndo: history.length > 0, canRedo: redoHistory.length > 0,
        clearAnnotations, importAnnotations,
        addReply, deleteReply,
        isCommentPanelOpen, setIsCommentPanelOpen,
        isPropertiesPanelOpen, setIsPropertiesPanelOpen
      }}
    >
      {children}
    </AnnotationContext.Provider>
  );
}
