
import { Heart, Brain } from 'lucide-react';

function FloatingButtons() {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
      <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
        <Heart className="w-5 h-5 text-gray-600" />
      </button>
      <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
        <Brain className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}

export default FloatingButtons;