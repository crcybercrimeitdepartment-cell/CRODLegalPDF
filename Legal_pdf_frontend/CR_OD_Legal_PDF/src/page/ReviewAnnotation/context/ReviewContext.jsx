import React, { createContext, useState, useEffect, useContext } from 'react';
import { AnnotationContext } from './AnnotationContext';

export const ReviewContext = createContext();

export function ReviewProvider({ children }) {
  const { annotations } = useContext(AnnotationContext);

  // Core Review State
  const [reviewId] = useState('REV-10492-X');
  const [reviewName, setReviewName] = useState('Q3 Architectural Floorplan Review');
  const [reviewType, setReviewType] = useState('Engineering Review');
  const [reviewStage, setReviewStage] = useState('Technical Validation');
  const [reviewStatus, setReviewStatus] = useState('In Review');
  const [priorityLevel, setPriorityLevel] = useState('High');
  const [department, setDepartment] = useState('Structural Engineering');
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);

  // Mock Reviewers
  const [reviewers, setReviewers] = useState([
    { id: 1, name: 'Alice Chen', role: 'Lead Architect', avatar: 'https://i.pravatar.cc/150?u=alice', status: 'Approved' },
    { id: 2, name: 'Bob Smith', role: 'Structural Engineer', avatar: 'https://i.pravatar.cc/150?u=bob', status: 'Pending' },
    { id: 3, name: 'Charlie Davis', role: 'MEP Consultant', avatar: 'https://i.pravatar.cc/150?u=charlie', status: 'Rejected' },
  ]);

  // Derived Metrics from Annotations
  const [metrics, setMetrics] = useState({
    totalAnnotations: 0,
    openComments: 0,
    resolvedComments: 0,
    completionPercentage: 0,
  });

  useEffect(() => {
    if (!annotations) return;
    const total = annotations.length;
    // Assuming annotations with replies or just the annotation itself has a `resolved` flag
    const resolved = annotations.filter(a => a.resolved).length;
    const open = total - resolved;
    const completion = total === 0 ? 0 : Math.round((resolved / total) * 100);

    setMetrics({
      totalAnnotations: total,
      openComments: open,
      resolvedComments: resolved,
      completionPercentage: completion,
    });
  }, [annotations]);

  // Workflow Actions
  const updateReviewStatus = (newStatus) => {
    setReviewStatus(newStatus);
  };

  const assignReviewer = (reviewer) => {
    setReviewers(prev => [...prev, reviewer]);
  };

  const removeReviewer = (id) => {
    setReviewers(prev => prev.filter(r => r.id !== id));
  };

  return (
    <ReviewContext.Provider
      value={{
        reviewId, reviewName, setReviewName,
        reviewType, setReviewType,
        reviewStage, setReviewStage,
        reviewStatus, setReviewStatus: updateReviewStatus,
        priorityLevel, setPriorityLevel,
        department, setDepartment,
        reviewers, assignReviewer, removeReviewer,
        metrics,
        isReviewPanelOpen, setIsReviewPanelOpen
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}
