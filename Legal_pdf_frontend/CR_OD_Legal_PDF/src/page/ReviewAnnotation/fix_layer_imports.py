import os
import re

target_dir = r"d:\PRINCE CRCCF\Final Projects\CR_OD_Legal_PDF\src\page\ReviewAnnotation"
layer_file = os.path.join(target_dir, "AnnotationLayer.jsx")

mapping = {
    'PencilTool': 'PencilToolPage',
    'ArrowTool': 'ArrowToolPage',
    'StampTool': 'StampToolPage',
    'CalloutTool': 'CalloutPage',
    'InkTool': 'InkAnnotationPage',
    'HighlightTool': 'HighlightTextPage',
    'UnderlineTool': 'UnderlineTextPage',
    'StrikeoutTool': 'StrikeoutTextPage',
    'SquigglyTool': 'SquigglyUnderlinePage',
    'StickyNoteTool': 'StickyNotesPage',
    'TextBoxTool': 'TextBoxPage',
    'FreeTextTool': 'FreeTextAnnotationPage',
    'RectangleTool': 'RectangleToolPage',
    'EllipseTool': 'CircleEllipseToolPage',
    'LineTool': 'LineToolPage',
    'PolylineTool': 'PolylineToolPage',
    'PolygonTool': 'PolygonToolPage',
    'CloudTool': 'CloudAnnotationPage',
    'MeasurementTool': 'MeasurementToolPage',
    'AreaTool': 'AreaMeasurementPage',
    'DistanceTool': 'DistanceMeasurementPage'
}

with open(layer_file, 'r', encoding='utf-8') as f:
    content = f.read()

for old_name, new_name in mapping.items():
    # Replace from './OldName' to from './NewName'
    content = re.sub(rf"from\s+'\./{old_name}'", f"from './{new_name}'", content)
    content = re.sub(rf'from\s+"\./{old_name}"', f'from "./{new_name}"', content)

with open(layer_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed AnnotationLayer.jsx imports")
