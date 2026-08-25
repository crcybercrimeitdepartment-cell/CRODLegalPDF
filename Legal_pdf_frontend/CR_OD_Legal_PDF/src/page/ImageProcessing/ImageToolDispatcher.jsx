import React from 'react';
import ImageEditor from './ImageEditor';
import FlipImages from './FlipImages';
import CropImages from './CropImages';
import ResizeImages from './ResizeImages';
import RotateImages from './RotateImages';
import EnhanceImages from './EnhanceImages';
import SharpenImages from './SharpenImages';
import AdjustBrightness from './AdjustBrightness';
import AdjustContrast from './AdjustContrast';
import AdjustSaturation from './AdjustSaturation';
import AutoColorCorrection from './AutoColorCorrection';
import WhiteBalanceAdjustment from './WhiteBalanceAdjustment';
import GammaCorrection from './GammaCorrection';
import ConvertImageFormat from './ConvertImageFormat';
import ImageCompression from './CompressImages';
import ImageUpscalingAISuperResolution from './ImageUpscalingAISuperResolution';
import RemoveBackground from './BgRemoveImages';
import BackgroundReplacement from './BgReplaceImages';
import WatermarkImages from './WatermarkImages';
import ReplaceImages from './ReplaceImages';
import ScanDocuments from './ScanDocuments';
import MultiPageScanning from './MultiPageScanning';
import AutoDetectPageBorders from './AutoDetectPageBorders';
import DeskewImages from './DeskewImages';
import RemoveNoise from './RemoveNoise';
import PerspectiveCorrection from './PerspectiveCorrection';
import LensDistortionCorrection from './LensDistortionCorrection';
import DeblurImagesAI from './DeblurImagesAI';
import ImageDenoiseAI from './ImageDenoiseAI';
import EXIFMetadataEditor from './EXIFMetadataEditor';
import EXIFMetadataRemover from './EXIFMetadataRemover';
import ImageResolutionDPIConverter from './ImageResolutionDPIConverter';

const ImageToolDispatcher = ({ tool, onBack }) => {
  switch (tool.id) {
    case 'image-editor': return <ImageEditor tool={tool} onBack={onBack} />;
    case 'flip-images': return <FlipImages tool={tool} onBack={onBack} />;
    case 'crop-images': return <CropImages tool={tool} onBack={onBack} />;
    case 'resize-images': return <ResizeImages tool={tool} onBack={onBack} />;
    case 'rotate-images': return <RotateImages tool={tool} onBack={onBack} />;
    case 'enhance-images': return <EnhanceImages tool={tool} onBack={onBack} />;
    case 'sharpen-images': return <SharpenImages tool={tool} onBack={onBack} />;
    case 'adjust-brightness': return <AdjustBrightness tool={tool} onBack={onBack} />;
    case 'adjust-contrast': return <AdjustContrast tool={tool} onBack={onBack} />;
    case 'adjust-saturation': return <AdjustSaturation tool={tool} onBack={onBack} />;
    case 'auto-color-correction': return <AutoColorCorrection tool={tool} onBack={onBack} />;
    case 'white-balance-adjustment': return <WhiteBalanceAdjustment tool={tool} onBack={onBack} />;
    case 'gamma-correction': return <GammaCorrection tool={tool} onBack={onBack} />;
    case 'convert-image-format': return <ConvertImageFormat tool={tool} onBack={onBack} />;
    case 'image-compression': return <ImageCompression tool={tool} onBack={onBack} />;
    case 'image-upscaling-ai-super-resolution': return <ImageUpscalingAISuperResolution tool={tool} onBack={onBack} />;
    case 'remove-background': return <RemoveBackground tool={tool} onBack={onBack} />;
    case 'background-replacement': return <BackgroundReplacement tool={tool} onBack={onBack} />;
    case 'watermark-images': return <WatermarkImages tool={tool} onBack={onBack} />;
    case 'replace-images': return <ReplaceImages tool={tool} onBack={onBack} />;
    case 'scan-documents': return <ScanDocuments tool={tool} onBack={onBack} />;
    case 'multi-page-scanning': return <MultiPageScanning tool={tool} onBack={onBack} />;
    case 'auto-detect-page-borders': return <AutoDetectPageBorders tool={tool} onBack={onBack} />;
    case 'deskew-images': return <DeskewImages tool={tool} onBack={onBack} />;
    case 'remove-noise': return <RemoveNoise tool={tool} onBack={onBack} />;
    case 'perspective-correction': return <PerspectiveCorrection tool={tool} onBack={onBack} />;
    case 'lens-distortion-correction': return <LensDistortionCorrection tool={tool} onBack={onBack} />;
    case 'deblur-images-ai': return <DeblurImagesAI tool={tool} onBack={onBack} />;
    case 'image-denoise-ai': return <ImageDenoiseAI tool={tool} onBack={onBack} />;
    case 'exif-metadata-editor': return <EXIFMetadataEditor tool={tool} onBack={onBack} />;
    case 'exif-metadata-remover': return <EXIFMetadataRemover tool={tool} onBack={onBack} />;
    case 'image-resolution-dpi-converter': return <ImageResolutionDPIConverter tool={tool} onBack={onBack} />;

    default:
      return (
        <div className="p-8 text-center">
          <h2>Tool not found: {tool.id}</h2>
          <button onClick={onBack} className="mt-4 text-blue-600 underline">Back</button>
        </div>
      );
  }
};

export default ImageToolDispatcher;
