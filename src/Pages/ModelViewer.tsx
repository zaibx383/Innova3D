// import React, { Suspense, useState, useRef } from 'react';
// import { Canvas } from '@react-three/fiber';
// import * as THREE from 'three';
// import { OrbitControls, useGLTF, Environment, PerspectiveCamera } from '@react-three/drei';
// import { Plus, Minus, Maximize2, Bell, UserCircle, Heart, Brain } from 'lucide-react';
// import { LayoutDashboard, Target, FileText, Pill, TestTube2 } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';

// import { useSpring, animated } from '@react-spring/three';
// import { Group } from 'three';



// interface ModelProps {
//     opacity?: number;
//     isZoomed: boolean;
//   }

//   function Model({ opacity = 1, isZoomed }: ModelProps) {
//     const { scene } = useGLTF('/assets/demo-body-1.glb') as { scene: Group };

//     const { position, rotation } = useSpring({
//         position: isZoomed ? [0, -1.5, 0] : [0, -1.1, 0],
//         rotation: isZoomed ? [0, Math.PI * 0.05, 0] : [0, 0, 0],
//         config: {
//           mass: 1,
//           tension: 170,
//           friction: 26,
//         },
//       });
  
  
//     // Clone materials to avoid affecting other instances
//     React.useEffect(() => {
//       scene.traverse((child) => {
//         if ((child as any).isMesh) {
//           const mesh = child as THREE.Mesh;
//           if (mesh.material) {
//             // Clone the material to make it unique to this instance
//             mesh.material = (mesh.material as THREE.Material).clone();
//             // Set up material properties
//             (mesh.material as THREE.MeshStandardMaterial).transparent = true;
//             (mesh.material as THREE.MeshStandardMaterial).roughness = 0.7;
//             (mesh.material as THREE.MeshStandardMaterial).metalness = 0.3;
//           }
//         }
//       });
//     }, [scene]);
  
//     // Update opacity separately
//     React.useEffect(() => {
//       scene.traverse((child) => {
//         if ((child as any).isMesh) {
//           const mesh = child as THREE.Mesh;
//           if (mesh.material) {
//             (mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
//           }
//         }
//       });
//     }, [scene, opacity]);
  
//     return (
//     <animated.primitive
//       object={scene}
//       scale={[0.09, 0.09, 0.09]}
//       position={position as unknown as THREE.Vector3}
//       rotation={rotation as unknown as THREE.Euler}
//     />
//   );

//   }

// interface ActionCardProps {
//   progress: number;
//   isVisible: boolean;
// }

// function ActionCard({ progress, isVisible }: ActionCardProps) {
//     return (
//       <AnimatePresence>
//         {isVisible && (
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             exit={{ opacity: 0, y: -20 }}
//             className="absolute top-32 left-[20%] -translate-x-1/2 rounded-2xl p-6 w-80"
//             style={{
//               background: `
//                 linear-gradient(to right, rgba(241, 245, 249, 0.15) 1px, transparent 1px),
//                 linear-gradient(to bottom, rgba(241, 245, 249, 0.15) 1px, transparent 1px),
//                 rgba(255, 255, 255, 0.5)
//               `,
//               backgroundSize: '24px 24px',
//               backdropFilter: 'blur(4px)',
//               WebkitBackdropFilter: 'blur(12px)',
//             }}
//           >
//             <div className="relative">
//               <div className="flex items-center gap-3 mb-4">
//                 <div className="w-8 h-8 bg-blue-500 rounded-full text-white flex items-center justify-center font-medium">
//                   1
//                 </div>
//                 <h2 className="text-xl font-medium">Action</h2>
//               </div>
//               <p className="text-gray-700 mb-4 text-sm">
//                 On click zoom in the model, change opacity to 50% and change the state of the button to "selected". Update risk card accordingly.
//               </p>
//               <div className="flex items-center gap-2">
//                 <div className="text-gray-600">{progress}%</div>
//                 <div className="flex-1 bg-gray-200/50 rounded-full h-1.5">
//                   <motion.div
//                     className="bg-blue-500 rounded-full h-full"
//                     initial={{ width: 0 }}
//                     animate={{ width: `${progress}%` }}
//                     transition={{ duration: 0.5 }}
//                   />
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     );
//   }

// interface RiskCardProps {
//   progress: number;
//   onClick: () => void;
//   isSelected: boolean;
// }

// function RiskCard({ progress, onClick, isSelected }: RiskCardProps) {
//   return (
//     <motion.div
//       initial={{ opacity: 0, x: -20 }}
//       animate={{ opacity: 1, x: 0 }}
//       className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg w-64"
//     >
//       <div className="flex items-center justify-between mb-2">
//         <div className="text-lg font-semibold">+2</div>
//       </div>
//       <p className="text-sm text-gray-500 mb-2">
//         More risks considered for your wellness
//       </p>
//       <div className="flex items-center gap-2 mb-3">
//         <div className="flex-1 bg-gray-100 rounded-full h-2.5">
//           <div
//             className="relative h-full"
//             style={{ width: `${progress}%` }}
//           >
//             <motion.div
//               className="absolute inset-0 rounded-full"
//               initial={{ width: 0 }}
//               animate={{ width: '100%' }}
//               transition={{ duration: 0.5 }}
//               style={{
//                 background: 'linear-gradient(90deg, #60A5FA 0%, #3B82F6 100%)',
//               }}
//             />
//           </div>
//         </div>
//         <div className="text-sm text-gray-500">{progress}%</div>
//       </div>
//       <button
//         onClick={onClick}
//         className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-blue-500'}`}
//       >
//         Order DNA Test
//       </button>
//     </motion.div>
//   );
// }

// export default function ModelViewer() {
//     const [progress, setProgress] = useState<number>(50);
//     const [modelOpacity, setModelOpacity] = useState<number>(1);
//     const [isZoomed, setIsZoomed] = useState<boolean>(false);
//     const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
//     const handleZoomToggle = () => {
//       setIsZoomed(!isZoomed);
  
//       if (cameraRef.current) {
//         const { position } = cameraRef.current;
//         const duration = 1500;
//         const startTime = Date.now();
  
//         const animate = () => {
//           const elapsed = Date.now() - startTime;
//           const progress = Math.min(elapsed / duration, 1);
//           const easeProgress = progress;
  
//           const targetPos: [number, number, number] = isZoomed ? [0, 0, 3] : [0, 0, 2];
//           const startPos: [number, number, number] = [...position.toArray()] as [number, number, number];
          
//           position.set(
//             startPos[0] + (targetPos[0] - startPos[0]) * easeProgress,
//             startPos[1] + (targetPos[1] - startPos[1]) * easeProgress,
//             startPos[2] + (targetPos[2] - startPos[2]) * easeProgress
//           );
//           if (progress < 1) {
//             requestAnimationFrame(animate);
//           }
//         };
  
//         requestAnimationFrame(animate);
//       }
  
//       const opacityTarget = isZoomed ? 1 : 0.5;
//       const startOpacity = modelOpacity;
//       const startTime = Date.now();
//       const duration = 800;
  
//       const animateOpacity = () => {
//         const elapsed = Date.now() - startTime;
//         const progress = Math.min(elapsed / duration, 1);
//         const easeProgress = progress;
  
//         setModelOpacity(startOpacity + (opacityTarget - startOpacity) * easeProgress);
  
//         if (progress < 1) {
//           requestAnimationFrame(animateOpacity);
//         }
//       };
  
//       requestAnimationFrame(animateOpacity);
//       setProgress(isZoomed ? 50 : 100);
//     };

//   return (
//     <div className="relative w-full h-screen rounded-2xl overflow-hidden bg-gray-100">
//       {/* Navigation */}
//       <nav className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
//         {/* Navigation buttons */}
//         <div className="w-32" />
//         <div className="flex gap-2 bg-gray-300 backdrop-blur-sm px-1 py-1 rounded-full z-10 border-2 border-white">
//           <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
//             <LayoutDashboard className="w-5 h-5 group-hover:text-blue-500" />
//             <span className="text-sm group-hover:text-black">Dashboard</span>
//           </button>
//           <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
//             <Target className="w-5 h-5 group-hover:text-blue-500" />
//             <span className="text-sm group-hover:text-black">Goals</span>
//           </button>
//           <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
//             <FileText className="w-5 h-5 group-hover:text-blue-500" />
//             <span className="text-sm group-hover:text-black">Report</span>
//           </button>
//           <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
//             <Pill className="w-5 h-5 group-hover:text-blue-500" />
//             <span className="text-sm group-hover:text-black">Supplements</span>
//           </button>
//           <button className="flex items-center gap-2 px-3 py-1 text-gray-600 hover:bg-white rounded-full transition-colors group">
//             <TestTube2 className="w-5 h-5 group-hover:text-blue-500" />
//             <span className="text-sm group-hover:text-black">Tests</span>
//           </button>
//         </div>
//         {/* Icons */}
//         <div className="flex items-center gap-3 pr-4">
//           <button className="relative w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
//             <Bell className="w-4 h-4 text-gray-600" />
//             <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
//           </button>
//           <button className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
//             <UserCircle className="w-5 h-5 text-gray-600" />
//           </button>
//         </div>
//       </nav>

//       {/* Floating Buttons */}
//       <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
//         <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
//           <Heart className="w-5 h-5 text-gray-600" />
//         </button>
//         <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
//           <Brain className="w-5 h-5 text-gray-600" />
//         </button>
//       </div>

//       {/* 3D Canvas */}
//       <div className="w-full h-full">
//         <Canvas shadows style={{ background: '#c0c4c8' }}>
//           <PerspectiveCamera
//             makeDefault
//             position={[0, 0, 3]}
//             ref={cameraRef}
//             fov={45}
//             near={0.1}
//             far={1000}
//           />
//           <Suspense fallback={null}>
//             <ambientLight intensity={0.3} />
//             <directionalLight position={[10, 10, 5]} intensity={0.8} />
//             <directionalLight position={[-10, -10, -5]} intensity={0.1} />
//             <pointLight position={[0, 5, 0]} intensity={0.2} />
//             <Environment preset="studio" />
//             <Model opacity={modelOpacity} isZoomed={isZoomed} />
//             <OrbitControls
//               enableZoom={true} 
//               minZoom={0.5}
//               maxZoom={2} 
//               zoomSpeed={0.5} 
//               enablePan={false}
//               maxPolarAngle={Math.PI / 1.5}
//               minPolarAngle={Math.PI / 3}
//               dampingFactor={0.05}
//               rotateSpeed={0.5}
//               minDistance={2} 
//               maxDistance={4}
//             />
//           </Suspense>
//         </Canvas>
//       </div>

//       {/* Action Buttons */}
//       <div className="absolute right-8 bottom-8 flex flex-col gap-2 z-10">
//         <button
//           className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
//           onClick={() => setProgress(Math.min(100, progress + 10))}
//         >
//           <Plus className="w-5 h-5 text-gray-600" />
//         </button>
//         <button
//           className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
//           onClick={() => setProgress(Math.max(0, progress - 10))}
//         >
//           <Minus className="w-5 h-5 text-gray-600" />
//         </button>
//         <button
//           className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
//           onClick={handleZoomToggle}
//         >
//           <Maximize2 className="w-5 h-5 text-gray-600" />
//         </button>
//       </div>

//       {/* Cards */}
//       <ActionCard progress={progress} isVisible={!isZoomed} />
//       <RiskCard progress={progress} onClick={handleZoomToggle} isSelected={isZoomed} />
//     </div>
//   );
// }