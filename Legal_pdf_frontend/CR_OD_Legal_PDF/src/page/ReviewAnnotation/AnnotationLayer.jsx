import React, { useState, useEffect, useContext } from 'react';
import { AnnotationContext } from './context/AnnotationContext';
import { AreaToolRenderer } from './AreaMeasurementPage';
import { ArrowToolRenderer } from './ArrowToolPage';
import { CalloutToolRenderer } from './CalloutPage';
import { CloudToolRenderer } from './CloudAnnotationPage';
import { DistanceToolRenderer } from './DistanceMeasurementPage';
import { EllipseToolRenderer } from './CircleEllipseToolPage';
import { FreeTextToolRenderer } from './FreeTextAnnotationPage';
import { HighlightToolRenderer } from './HighlightTextPage';
import { InkToolRenderer } from './InkAnnotationPage';
import { LineToolRenderer } from './LineToolPage';
import { MeasurementToolRenderer } from './MeasurementToolPage';
import { PencilToolRenderer } from './PencilToolPage';
import { PolygonToolRenderer } from './PolygonToolPage';
import { PolylineToolRenderer } from './PolylineToolPage';
import { RectangleToolRenderer } from './RectangleToolPage';
import { SquigglyToolRenderer } from './SquigglyUnderlinePage';
import { StampToolRenderer } from './StampToolPage';
import { StickyNoteToolRenderer } from './StickyNotesPage';
import { StrikeoutToolRenderer } from './StrikeoutTextPage';
import { TextBoxToolRenderer } from './TextBoxPage';
import { UnderlineToolRenderer } from './UnderlineTextPage';

export default function AnnotationLayer(props) {
    const { updateAnnotation, setSelectedAnnotationId } = useContext(AnnotationContext);
    const { zoom, tool, selectedAnnotationId } = props;
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartCoords, setDragStartCoords] = useState(null);
    const [draggingAnnId, setDraggingAnnId] = useState(null);

    const handleAnnotationPointerDown = (e, ann) => {
        if (tool === 'select') {
            e.stopPropagation();
            setSelectedAnnotationId(ann.id);
            setDraggingAnnId(ann.id);
            setDragStartCoords({ x: e.clientX, y: e.clientY });
            setIsDragging(true);
        }
        
        // If the tool's original handler was passed and we are NOT in select mode, 
        // we could call it, but usually the tool's handler is only for select anyway.
        // Actually, we should call the original one too just in case it handles something else.
        if (props.handleAnnotationPointerDown && tool !== 'select') {
            props.handleAnnotationPointerDown(e, ann);
        }
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (isDragging && draggingAnnId) {
                const dx = (e.clientX - dragStartCoords.x) / zoom;
                const dy = (e.clientY - dragStartCoords.y) / zoom;
                
                const ann = props.annotations.find(a => a.id === draggingAnnId);
                if (!ann) return;

                let newProps = {};
                if ('x' in ann && 'y' in ann) {
                    newProps = { x: ann.x + dx, y: ann.y + dy };
                } else if ('startX' in ann) {
                    newProps = { startX: ann.startX + dx, startY: ann.startY + dy, endX: ann.endX + dx, endY: ann.endY + dy };
                } else if (ann.vertices) {
                    newProps = { vertices: ann.vertices.map(v => ({ x: v.x + dx, y: v.y + dy })) };
                } else if (ann.rects) {
                    newProps = { rects: ann.rects.map(r => ({ ...r, x: r.x + dx, y: r.y + dy })) };
                } else if (ann.points) {
                    newProps = { points: ann.points.map(p => [p[0] + dx, p[1] + dy, ...p.slice(2)]) };
                }

                updateAnnotation(draggingAnnId, newProps);
                setDragStartCoords({ x: e.clientX, y: e.clientY });
            }
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            setDraggingAnnId(null);
        };

        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, draggingAnnId, dragStartCoords, zoom, updateAnnotation, props.annotations]);

    return props.annotations.filter(a => a.visibility).map(ann => {
        const isSelected = selectedAnnotationId === ann.id;
        const p = { ...props, ann, isSelected, handleAnnotationPointerDown };
        switch (ann.type) {
            case 'area': return <AreaToolRenderer key={ann.id} {...p} />;
            case 'arrow': return <ArrowToolRenderer key={ann.id} {...p} />;
            case 'callout': return <CalloutToolRenderer key={ann.id} {...p} />;
            case 'cloud': return <CloudToolRenderer key={ann.id} {...p} />;
            case 'distance': return <DistanceToolRenderer key={ann.id} {...p} />;
            case 'ellipse': return <EllipseToolRenderer key={ann.id} {...p} />;
            case 'freetext': return <FreeTextToolRenderer key={ann.id} {...p} />;
            case 'highlight': return <HighlightToolRenderer key={ann.id} {...p} />;
            case 'ink': return <InkToolRenderer key={ann.id} {...p} />;
            case 'line': return <LineToolRenderer key={ann.id} {...p} />;
            case 'measurement': return <MeasurementToolRenderer key={ann.id} {...p} />;
            case 'pencil': return <PencilToolRenderer key={ann.id} {...p} />;
            case 'polygon': return <PolygonToolRenderer key={ann.id} {...p} />;
            case 'polyline': return <PolylineToolRenderer key={ann.id} {...p} />;
            case 'rectangle': return <RectangleToolRenderer key={ann.id} {...p} />;
            case 'squiggly': return <SquigglyToolRenderer key={ann.id} {...p} />;
            case 'stamp': return <StampToolRenderer key={ann.id} {...p} />;
            case 'sticky': return <StickyNoteToolRenderer key={ann.id} {...p} />;
            case 'strikeout': return <StrikeoutToolRenderer key={ann.id} {...p} />;
            case 'textbox': return <TextBoxToolRenderer key={ann.id} {...p} />;
            case 'underline': return <UnderlineToolRenderer key={ann.id} {...p} />;
            case 'stickynote': return <StickyNoteToolRenderer key={ann.id} {...p} />;
            default: return null;
        }
    });
}
