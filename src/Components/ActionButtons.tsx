import React from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';

interface ActionButtonsProps {
  progress: number;
  setProgress: (value: number) => void;
  handleZoomToggle: () => void;
}

function ActionButtons({ progress, setProgress, handleZoomToggle }: ActionButtonsProps) {
  return (
    <div className="absolute right-8 bottom-8 flex flex-col gap-2 z-10">
      <button
        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        onClick={() => setProgress(Math.min(100, progress + 10))}
      >
        <Plus className="w-5 h-5 text-gray-600" />
      </button>
      <button
        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        onClick={() => setProgress(Math.max(0, progress - 10))}
      >
        <Minus className="w-5 h-5 text-gray-600" />
      </button>
      <button
        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        onClick={handleZoomToggle}
      >
        <Maximize2 className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}

export default ActionButtons;