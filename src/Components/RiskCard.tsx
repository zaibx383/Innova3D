import React from 'react';
import { motion } from 'framer-motion';

interface RiskCardProps {
  progress: number;
  onClick: () => void;
  isSelected: boolean;
}

function RiskCard({ progress, onClick, isSelected }: RiskCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg w-64"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold">+2</div>
      </div>
      <p className="text-sm text-gray-500 mb-2">
        More risks considered for your wellness
      </p>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
          <div
            className="relative h-full"
            style={{ width: `${progress}%` }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.5 }}
              style={{
                background: 'linear-gradient(90deg, #60A5FA 0%, #3B82F6 100%)',
              }}
            />
          </div>
        </div>
        <div className="text-sm text-gray-500">{progress}%</div>
      </div>
      <button
        onClick={onClick}
        className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-blue-500'}`}
      >
        Order DNA Test
      </button>
    </motion.div>
  );
}

export default RiskCard;