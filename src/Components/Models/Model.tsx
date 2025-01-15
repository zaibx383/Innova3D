import React, { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { Group } from 'three';

interface ModelProps {
  opacity: number;
  isZoomed: boolean;
}

function Model({ opacity, isZoomed }: ModelProps) {
  const { scene } = useGLTF('/assets/demo-body-1.glb') as { scene: Group };
  const springs = useSpring({
    position: isZoomed ? [0, -1.5, 0] : [0, -1.1, 0],
    rotation: isZoomed ? [0, Math.PI * 0.05, 0] : [0, 0, 0],
    config: { mass: 1, tension: 170, friction: 26 },
  });

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
          (mesh.material as THREE.MeshStandardMaterial).transparent = true;
          (mesh.material as THREE.MeshStandardMaterial).roughness = 0.7;
          (mesh.material as THREE.MeshStandardMaterial).metalness = 0.3;
        }
      }
    });
  }, [scene]);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
        }
      }
    });
  }, [scene, opacity]);

  return (
    <animated.primitive
      object={scene}
      scale={0.09}
      position={springs.position}
      rotation={springs.rotation}
    />
  );
}

export default Model;