import { useRef, useEffect, useState, FC } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { PMREMGenerator } from 'three';

interface ModelViewerProps {
  modelPath?: string;
}

const ModelViewer: FC<ModelViewerProps> = ({ modelPath = '/assets/Mezz.glb' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hoveredMeshName, setHoveredMeshName] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseMoveListenerAttachedRef = useRef<boolean>(false);
  
  // Maps to store target meshes and their original materials
  const targetMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const originalMaterialsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());
  const highlightMaterialRef = useRef<THREE.Material | null>(null);
  const currentlyHighlightedMeshRef = useRef<THREE.Mesh | null>(null);
  
  // Improved function to extract the target number from mesh names
  const getTargetNumber = (name: string): number | null => {
    // First, try direct pattern match for names ending with _NUMBER
    const endMatch = name.match(/_(\d+)$/);
    if (endMatch && endMatch[1]) {
      const num = parseInt(endMatch[1], 10);
      if (num >= 1 && num <= 69) return num;
    }
    
    // Try to match names like "Mesh6497_2" where 2 is the unit number
    const complexMatch = name.match(/Mesh\d+_(\d+)/);
    if (complexMatch && complexMatch[1]) {
      const num = parseInt(complexMatch[1], 10);
      if (num >= 1 && num <= 69) return num;
    }
    
    // Try to match any number between 1-69 in the name
    const anyNumberMatch = name.match(/\b([1-9]|[1-5][0-9]|6[0-9])\b/);
    if (anyNumberMatch && anyNumberMatch[1]) {
      const num = parseInt(anyNumberMatch[1], 10);
      if (num >= 1 && num <= 69) return num;
    }
    
    return null;
  };
  
  // Function to check if this mesh is one of our target meshes (1-69)
  const isTargetMesh = (name: string): boolean => {
    const targetNum = getTargetNumber(name);
    return targetNum !== null && targetNum >= 1 && targetNum <= 69;
  };

  // Function to handle raycasting and intersection checking
  const checkIntersection = () => {
    if (!cameraRef.current || targetMeshesRef.current.size === 0) return;
    
    // Update the raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // Get all target meshes
    const targetMeshes = Array.from(targetMeshesRef.current.values());
    
    // Perform the raycasting
    const intersects = raycasterRef.current.intersectObjects(targetMeshes, false);
    
    // Reset the currently highlighted mesh if it exists
    if (currentlyHighlightedMeshRef.current) {
      const originalMaterial = originalMaterialsRef.current.get(currentlyHighlightedMeshRef.current.uuid);
      if (originalMaterial) {
        currentlyHighlightedMeshRef.current.material = originalMaterial;
      }
      currentlyHighlightedMeshRef.current = null;
      setHoveredMeshName(null);
    }
    
    // Highlight the new mesh if there's an intersection
    if (intersects.length > 0) {
      // Check for undefined intersects[0]
      const firstIntersect = intersects[0];
      if (firstIntersect && firstIntersect.object) {
        const mesh = firstIntersect.object as THREE.Mesh;
        currentlyHighlightedMeshRef.current = mesh;
        
        // Extract the unit number to display
        const targetNum = getTargetNumber(mesh.name);
        if (targetNum !== null) {
          setHoveredMeshName(targetNum.toString());
        } else {
          setHoveredMeshName(mesh.name);
        }
        
        // Apply the highlight material
        if (highlightMaterialRef.current) {
          // Store the original material if not already stored
          if (!originalMaterialsRef.current.has(mesh.uuid)) {
            originalMaterialsRef.current.set(mesh.uuid, mesh.material);
          }
          
          // Apply highlight material
          mesh.material = highlightMaterialRef.current;
        }
      }
    }
  };

  // Setup mouse event handling - moved outside the useEffect for better reuse
  const setupMouseEvents = () => {
    const container = containerRef.current;
    if (!container || mouseMoveListenerAttachedRef.current) return;
    
    const onMouseMove = (event: MouseEvent) => {
      // Calculate mouse position in normalized device coordinates
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    
    // Add mouse move event listener
    container.addEventListener('mousemove', onMouseMove);
    mouseMoveListenerAttachedRef.current = true;
    
    // Return cleanup function
    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      mouseMoveListenerAttachedRef.current = false;
    };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Clear any previous state ---
    targetMeshesRef.current.clear();
    originalMaterialsRef.current.clear();
    currentlyHighlightedMeshRef.current = null;
    setHoveredMeshName(null);

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf5f5f5);

    // --- Camera Setup ---
    const camera = new THREE.PerspectiveCamera(
      80,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 8, 15);
    cameraRef.current = camera;

    // --- Renderer Setup with optimized settings ---
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      precision: 'mediump'
    });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    
    const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(pixelRatio);
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    // --- Controls Setup ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 3.0;
    controls.maxDistance = 30.0;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.7;
    controls.enableZoom = true;
    controls.update();

    // --- Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(15, 20, 15);
    mainLight.castShadow = true;
    
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -25;
    mainLight.shadow.camera.right = 25;
    mainLight.shadow.camera.top = 25;
    mainLight.shadow.camera.bottom = -25;
    mainLight.shadow.bias = -0.0005;
    
    directionalLightRef.current = mainLight;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-15, 10, -15);
    scene.add(fillLight);

    // --- Ground Plane ---
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.8 });
    groundMaterial.color = new THREE.Color(0x000000);
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.1;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // --- Create highlight material ---
    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFECB3,         // soft pastel yellow
      emissive: 0xFFD54F,      // warmer glow
      emissiveIntensity: 0.5,
      roughness: 0.5,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9
    });
    
    highlightMaterialRef.current = highlightMaterial;

    // Setup mouse events - returns a cleanup function
    const cleanupMouseEvents = setupMouseEvents();

    // --- Model Loading ---
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
    dracoLoader.setDecoderConfig({ type: 'js' });

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    let introAnimation = true;
    let animationStartTime = 0;
    const animationDuration = 2000;

    // Load manager to track loading progress
    const loadManager = new THREE.LoadingManager();
    loadManager.onProgress = (_, loaded, total) => {
      if (total > 0) {
        const progress = Math.min(Math.floor((loaded / total) * 100), 100);
        setLoadingProgress(progress);
      }
    };
    
    loader.manager = loadManager;
    
    loader.load(
      modelPath,
      (gltf: GLTF) => {
        const model = gltf.scene;
        modelRef.current = model;

        // Center and scale model
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);
        const size = box.getSize(new THREE.Vector3()).length();
        const baseScale = 10 / size;
        const extraZoom = 1.5;
        const scale = baseScale * extraZoom;
        model.scale.set(scale, scale, scale);

        // Clear any previous maps
        targetMeshesRef.current.clear();
        originalMaterialsRef.current.clear();
        
        // Find and store all target meshes
        model.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            // Check if this is one of our target meshes
            if (isTargetMesh(child.name)) {
              // Store the mesh for raycasting
              targetMeshesRef.current.set(child.name, mesh);
              // Store the original material to restore it later
              originalMaterialsRef.current.set(child.uuid, mesh.material);
              console.log(`Found target mesh: ${child.name} with target number: ${getTargetNumber(child.name)}`);
            }
            
            // Optimize geometry
            if (mesh.geometry) {
              mesh.geometry.computeBoundingBox();
              mesh.geometry.computeBoundingSphere();
            }
            
            // Convert materials to more performant versions
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat, index) => {
                if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
                  const basicMat = mat as THREE.MeshBasicMaterial;
                  const newMat = new THREE.MeshStandardMaterial({
                    color: basicMat.color,
                    map: basicMat.map,
                    transparent: basicMat.transparent,
                    opacity: basicMat.opacity,
                    roughness: 0.7,
                    metalness: 0.0
                  });
                  // Type assertion to make TypeScript happy
                  (mesh.material as THREE.Material[])[index] = newMat;
                }
              });
            } else if ((mesh.material as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
              const basicMat = mesh.material as THREE.MeshBasicMaterial;
              const newMat = new THREE.MeshStandardMaterial({
                color: basicMat.color,
                map: basicMat.map,
                transparent: basicMat.transparent,
                opacity: basicMat.opacity,
                roughness: 0.7,
                metalness: 0.0
              });
              mesh.material = newMat;
            }
          }
        });

        // Debug log - Print out all found target meshes
        console.log(`Total target meshes found: ${targetMeshesRef.current.size}`);
        if (targetMeshesRef.current.size === 0) {
          console.warn("No target meshes found! Check mesh naming convention.");
        }

        scene.add(model);

        // Position camera based on model bounding sphere
        const boundingBox = new THREE.Box3().setFromObject(model);
        const boundingSphere = new THREE.Sphere();
        boundingBox.getBoundingSphere(boundingSphere);
        controls.target.copy(boundingSphere.center);
        const radius = boundingSphere.radius;
        camera.position.set(
          boundingSphere.center.x - radius * 0.6,
          boundingSphere.center.y + radius * 0.3,
          boundingSphere.center.z + radius * 0.6
        );
        const initialCameraPosition = camera.position.clone();
        const targetCameraPosition = new THREE.Vector3(
          boundingSphere.center.x - radius * 0.8,
          boundingSphere.center.y + radius * 0.5,
          boundingSphere.center.z + radius * 1.2
        );

        if (directionalLightRef.current) {
          const light = directionalLightRef.current;
          const lightRadius = boundingSphere.radius * 2.5;
          light.position.set(
            boundingSphere.center.x + lightRadius,
            boundingSphere.center.y + radius * 1.5,
            boundingSphere.center.z + lightRadius
          );
          const targetObject = new THREE.Object3D();
          targetObject.position.copy(boundingSphere.center);
          scene.add(targetObject);
          light.target = targetObject;
          
          // Adjust shadow camera to fit the model
          const shadowCameraSize = radius * 2;
          light.shadow.camera.left = -shadowCameraSize;
          light.shadow.camera.right = shadowCameraSize;
          light.shadow.camera.top = shadowCameraSize;
          light.shadow.camera.bottom = -shadowCameraSize;
          light.shadow.camera.updateProjectionMatrix();
        }

        controls.update();

        // Simple environment map for reflection
        const pmremGenerator = new PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const cubeRenderTarget = pmremGenerator.fromScene(new THREE.Scene());
        scene.environment = cubeRenderTarget.texture;
        pmremGenerator.dispose();

        setIsLoading(false);
        introAnimation = true;
        animationStartTime = Date.now();

        // Animation loop
        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate);
          
          if (introAnimation) {
            const elapsed = Date.now() - animationStartTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOutCubic(progress);
            
            if (model) {
              model.rotation.y = easedProgress * Math.PI * 0.25;
            }
            
            camera.position.lerpVectors(
              initialCameraPosition,
              targetCameraPosition,
              easedProgress
            );
            
            if (progress >= 1) {
              introAnimation = false;
              controls.enabled = true;
            } else {
              controls.enabled = false;
            }
          }

          controls.update();
          
          // Perform raycasting on each frame to update highlighted mesh
          checkIntersection();
          
          renderer.render(scene, camera);
        };

        // Cancel any existing animation frame
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animate();
      },
      (xhr: ProgressEvent<EventTarget>) => {
        if (xhr.total) {
          const progress = Math.min(Math.floor((xhr.loaded / xhr.total) * 100), 100);
          setLoadingProgress(progress);
        }
      },
      (error: any) => {
        console.error('Model loading error:', error);
        setIsLoading(false);
      }
    );

    // Basic Animation Loop (pre-model load)
    let lastFrameTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    
    const animatePreload = (currentTime: number) => {
      animationFrameRef.current = requestAnimationFrame(animatePreload);
      
      const deltaTime = currentTime - lastFrameTime;
      if (deltaTime < frameInterval) return;
      
      lastFrameTime = currentTime - (deltaTime % frameInterval);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animationFrameRef.current = requestAnimationFrame(animatePreload);

    // Handle window resize
    const handleResize = () => {
      if (!container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      if (cameraRef.current) {
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
      
      if (rendererRef.current) {
        rendererRef.current.setSize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      // Call the mouse events cleanup function
      if (cleanupMouseEvents) cleanupMouseEvents();
      
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      
      // Reset any highlighted mesh before cleanup
      if (currentlyHighlightedMeshRef.current) {
        const originalMaterial = originalMaterialsRef.current.get(currentlyHighlightedMeshRef.current.uuid);
        if (originalMaterial) {
          currentlyHighlightedMeshRef.current.material = originalMaterial;
        }
        currentlyHighlightedMeshRef.current = null;
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
      
      // Dispose of materials and geometries
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) {
              child.geometry.dispose();
            }
            
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => {
                if (material.map) material.map.dispose();
                material.dispose();
              });
            } else if (child.material) {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose();
            }
          }
        });
        
        if (sceneRef.current.environment) {
          sceneRef.current.environment.dispose();
          sceneRef.current.environment = null;
        }
        
        sceneRef.current.clear();
        sceneRef.current = null;
      }
      
      // Dispose of highlight material
      if (highlightMaterialRef.current) {
        (highlightMaterialRef.current as THREE.Material).dispose();
        highlightMaterialRef.current = null;
      }
      
      // Clear any other references
      if (dracoLoader) dracoLoader.dispose();
      targetMeshesRef.current.clear();
      originalMaterialsRef.current.clear();
      modelRef.current = null;
      directionalLightRef.current = null;
      cameraRef.current = null;
    };
  }, [modelPath]);

  // Add an extra effect specifically for ensuring mouse events are attached
  // This helps when component stays mounted but internal state changes
  useEffect(() => {
    // Setup mouse events
    const cleanupMouseEvents = setupMouseEvents();
    
    // Cleanup function
    return cleanupMouseEvents;
  }, [isLoading]); // Re-run when loading state changes

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100vh',
        backgroundColor: '#F5F5F5',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '1600px',
          maxHeight: '900px',
          margin: 'auto',
          boxShadow: '0 0 20px rgba(0,0,0,0.05)'
        }}
      />
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          <div
            className="spinner"
            style={{
              width: '60px',
              height: '60px',
              border: '5px solid rgba(0, 0, 0, 0.1)',
              borderTop: '5px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '15px'
            }}
          />
          <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold' }}>
            Loading 3D Model... {loadingProgress}%
          </p>
          <div style={{ 
            width: '200px', 
            height: '8px', 
            backgroundColor: '#e0e0e0', 
            borderRadius: '4px',
            overflow: 'hidden',
            marginTop: '5px'
          }}>
            <div style={{ 
              width: `${loadingProgress}%`, 
              height: '100%', 
              backgroundColor: '#3498db',
              borderRadius: '4px',
              transition: 'width 0.3s ease-in-out'
            }} />
          </div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
      
      {hoveredMeshName && !isLoading && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 15px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '5px',
          fontWeight: 'bold',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
       
        </div>
      )}
    </div>
  );
};

export default ModelViewer;