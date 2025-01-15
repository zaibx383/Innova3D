
import { motion, AnimatePresence } from 'framer-motion';

interface ActionCardProps {
  progress: number;
  isVisible: boolean;
}

function ActionCard({ progress, isVisible }: ActionCardProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-32 left-[20%] -translate-x-1/2 rounded-2xl p-6 w-80"
          style={{
            background: `
              linear-gradient(to right, rgba(241, 245, 249, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(241, 245, 249, 0.15) 1px, transparent 1px),
              rgba(255, 255, 255, 0.5)
            `,
            backgroundSize: '24px 24px',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full text-white flex items-center justify-center font-medium">
                1
              </div>
              <h2 className="text-xl font-medium">Action</h2>
            </div>
            <p className="text-gray-700 mb-4 text-sm">
              On click zoom in the model, change opacity to 50% and change the state of the button to "selected". Update risk card accordingly.
            </p>
            <div className="flex items-center gap-2">
              <div className="text-gray-600">{progress}%</div>
              <div className="flex-1 bg-gray-200/50 rounded-full h-1.5">
                <motion.div
                  className="bg-blue-500 rounded-full h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ActionCard;