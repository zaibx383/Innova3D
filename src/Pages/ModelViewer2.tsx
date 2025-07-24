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
  const [_hoveredMeshName, setHoveredMeshName] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseMoveListenerAttachedRef = useRef<boolean>(false);
  const lastHighlightChangeRef = useRef<number>(0);
  const autoRotateRef = useRef<boolean>(true);
  const userInteractedRef = useRef<boolean>(false);
  const modelCenterRef = useRef<THREE.Vector3 | null>(null);
  const initialCameraPositionRef = useRef<THREE.Vector3 | null>(null);
  const initialTargetRef = useRef<THREE.Vector3 | null>(null);

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
    
    // Add a small threshold for better stability
    raycasterRef.current.params.Mesh = { 
      threshold: 0.01  // Small threshold to stabilize selection
    };
    
    // Perform the raycasting
    const intersects = raycasterRef.current.intersectObjects(targetMeshes, false);
    
    // Implement debouncing for highlight changes to reduce flickering
    const currentTime = Date.now();
    const debounceTime = 100; // ms
    
    // If no intersections, but we have a highlighted mesh
    if (intersects.length === 0) {
      if (currentlyHighlightedMeshRef.current && 
          (currentTime - lastHighlightChangeRef.current > debounceTime)) {
        // Reset the currently highlighted mesh
        const originalMaterial = originalMaterialsRef.current.get(currentlyHighlightedMeshRef.current.uuid);
        if (originalMaterial) {
          currentlyHighlightedMeshRef.current.material = originalMaterial;
        }
        currentlyHighlightedMeshRef.current = null;
        setHoveredMeshName(null);
        lastHighlightChangeRef.current = currentTime;
      }
      return;
    }
    
    // Check for undefined intersects[0]
    const firstIntersect = intersects[0];
    if (!firstIntersect || !firstIntersect.object) return;
    
    const mesh = firstIntersect.object as THREE.Mesh;
    
    // If we're already highlighting this mesh, do nothing
    if (currentlyHighlightedMeshRef.current === mesh) return;
    
    // Only change highlight if enough time has passed since last change
    if (currentTime - lastHighlightChangeRef.current < debounceTime) return;
    
    // Reset previous highlight if it exists
    if (currentlyHighlightedMeshRef.current) {
      const originalMaterial = originalMaterialsRef.current.get(currentlyHighlightedMeshRef.current.uuid);
      if (originalMaterial) {
        currentlyHighlightedMeshRef.current.material = originalMaterial;
      }
    }
    
    // Highlight the new mesh
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
    
    lastHighlightChangeRef.current = currentTime;
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
    
    const onUserInteraction = () => {
      userInteractedRef.current = true;
      autoRotateRef.current = false;
    };
    
    // Add mouse move event listener for raycasting only
    container.addEventListener('mousemove', onMouseMove);
    
    // These interactions will stop the rotation
    container.addEventListener('mousedown', onUserInteraction);
    container.addEventListener('wheel', onUserInteraction);
    container.addEventListener('touchstart', onUserInteraction);
    mouseMoveListenerAttachedRef.current = true;
    
    // Return cleanup function
    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onUserInteraction);
      container.removeEventListener('wheel', onUserInteraction);
      container.removeEventListener('touchstart', onUserInteraction);
      mouseMoveListenerAttachedRef.current = false;
    };
  };
  
  // Function to reset the camera and controls to initial position
  const resetCameraView = () => {
    if (!controlsRef.current || !cameraRef.current) return;
    
    // Reset camera position to initial position (if stored)
    if (initialCameraPositionRef.current && initialTargetRef.current) {
      // Smoothly animate to the initial position
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      
      // Store current position for animation
      const startPosition = camera.position.clone();
      const startTarget = controls.target.clone();
      
      // Set the target position to the stored initial values
      const endPosition = initialCameraPositionRef.current.clone();
      const endTarget = initialTargetRef.current.clone();
      
      // Animation parameters
      const duration = 1000; // ms
      const startTime = Date.now();
      
      // Stop auto-rotation during the animation
      const wasAutoRotating = autoRotateRef.current;
      autoRotateRef.current = false;
      
      // Define the animation function
      const animateReset = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease function (ease-out cubic)
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOut(progress);
        
        // Interpolate position and target
        camera.position.lerpVectors(startPosition, endPosition, easedProgress);
        controls.target.lerpVectors(startTarget, endTarget, easedProgress);
        controls.update();
        
        // Continue the animation if not complete
        if (progress < 1) {
          requestAnimationFrame(animateReset);
        } else {
          // Restore auto-rotation if it was on
          autoRotateRef.current = wasAutoRotating;
        }
      };
      
      // Start the animation
      animateReset();
      
      // Notify that user has interacted
      userInteractedRef.current = true;
    } else if (modelCenterRef.current) {
      // Fallback if no initial position is stored
      controlsRef.current.target.copy(modelCenterRef.current);
      controlsRef.current.update();
    }
  };

  // NEW FUNCTION: Smart target adjustment based on camera position and raycasting
  const updateControlTargetBasedOnView = () => {
    if (!cameraRef.current || !controlsRef.current || !sceneRef.current) return;
    
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    // Create direction vector pointing forward from camera
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    // Create a raycaster for detecting objects in view
    const raycaster = new THREE.Raycaster(camera.position, direction);
    
    // Get all meshes from the scene for raycasting
    const meshes: THREE.Mesh[] = [];
    sceneRef.current.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        meshes.push(object as THREE.Mesh);
      }
    });
    
    // Cast ray to find what's in front of the camera
    const intersects = raycaster.intersectObjects(meshes, false);
    
    if (intersects.length > 0) {
      // Get the closest intersection
      const intersection = intersects[0];
      
      // Calculate an ideal target based on distance to intersection
      // If close to a wall/object, set target closer to camera
      const distanceToObject = intersection.distance;
      
      // Calculate current distance from camera to target
      const distanceToTarget = camera.position.distanceTo(controls.target);
      
      // Get distance from camera to model center for reference
      let distanceToModelCenter = 10; // Default fallback
      if (modelCenterRef.current) {
        distanceToModelCenter = camera.position.distanceTo(modelCenterRef.current);
      }
      
      // Get model size for reference
      let modelSize = 10; // Default fallback
      if (modelRef.current) {
        const box = new THREE.Box3().setFromObject(modelRef.current);
        const size = box.getSize(new THREE.Vector3());
        modelSize = Math.max(size.x, size.y, size.z);
      }
      
      // Adaptive radius calculation based on current view context
      // When we're zoomed in (close to objects), we use a smaller rotation radius
      const closeToWall = distanceToObject < 1.5; // Detect when very close to a wall
      
      if (closeToWall || distanceToObject < distanceToTarget * 0.6) {
        // We're close to an object, adjust target to be closer to camera
        const newTargetDistance = Math.min(distanceToObject * 0.7, distanceToTarget);
        
        // Create new target point at this distance in front of camera
        const newTarget = camera.position.clone().add(
          direction.clone().multiplyScalar(newTargetDistance)
        );
        
        // Determine damping factor based on proximity to wall
        let dampingFactor = 0.05; // Default
        if (closeToWall) {
          // Very slow/laggy target movement when close to walls
          dampingFactor = 0.03;
        }
        
        // Smoothly move the target (with damping to create lag)
        controls.target.lerp(newTarget, dampingFactor);
        controls.update();
      } 
      // If we're very far from everything, reset to model center
      else if (distanceToObject > distanceToModelCenter * 1.5) {
        if (modelCenterRef.current) {
          controls.target.lerp(modelCenterRef.current, 0.03); // Slower lerp for more lag
          controls.update();
        }
      }
    }
  };

  // NEW FUNCTION: Dynamic zoom behavior adjustments based on camera position

  
  const adjustControlsBasedOnZoomLevel = () => {
    if (!cameraRef.current || !controlsRef.current || !modelCenterRef.current) return;
    
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const modelCenter = modelCenterRef.current;
    
    // Calculate distances
    const distanceToModel = camera.position.distanceTo(modelCenter);
    const distanceToTarget = camera.position.distanceTo(controls.target);
    
    // Get the model bounding box for reference
    let modelSize = 10; // Default fallback
    if (modelRef.current) {
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const size = box.getSize(new THREE.Vector3());
      modelSize = Math.max(size.x, size.y, size.z);
    }
    
    // Define zoom level thresholds relative to model size
    const farZoomThreshold = modelSize * 0.8;
    const midZoomThreshold = modelSize * 0.4;
    const closeZoomThreshold = modelSize * 0.2;
    const veryCloseZoomThreshold = modelSize * 0.1;
    
    // Adjust controls based on distance from model center
    if (distanceToModel > farZoomThreshold) {
      // Far zoom - default behavior
      controls.rotateSpeed = 0.7;
      controls.dampingFactor = 0.05;
      controls.panSpeed = 0.8;
    } 
    else if (distanceToModel > midZoomThreshold) {
      // Medium distance - slightly more responsive
      controls.rotateSpeed = 0.65;
      controls.dampingFactor = 0.07;
      controls.panSpeed = 0.7;
    }
    else if (distanceToModel > closeZoomThreshold) {
      // Closer zoom - more precision
      controls.rotateSpeed = 0.55;
      controls.dampingFactor = 0.12; // Increased damping
      controls.panSpeed = 0.6;
    }
    else if (distanceToModel > veryCloseZoomThreshold) {
      // Very close zoom - high precision with significant lag
      controls.rotateSpeed = 0.4; // Reduced from 0.45
      controls.dampingFactor = 0.25; // Increased from 0.15
      controls.panSpeed = 0.4;
    }
    else {
      // Extremely close (inside rooms) - maximum precision with heavy lag
      controls.rotateSpeed = 0.3; // Reduced from 0.35
      controls.dampingFactor = 0.35; // Increased from 0.2
      controls.panSpeed = 0.25; // Reduced from 0.3
    }
    
    // IMPORTANT: Dynamic target adjustment for close-up views
    // If we're very close to our current target, adjust target point to be closer to camera
    if (distanceToTarget < closeZoomThreshold * 0.3) {
      // When very close, create a target point that's in front of camera
      // This enables "first person" style navigation when inside rooms
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const newTargetDistance = Math.max(distanceToTarget, 0.6); // Increased minimum distance
      const newTarget = camera.position.clone().add(direction.multiplyScalar(newTargetDistance));
      
      // Apply with heavier damping to increase lag/resistance feel
      controls.target.lerp(newTarget, 0.06); // Reduced from 0.1 for more lag
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Clear any previous state ---
    targetMeshesRef.current.clear();
    originalMaterialsRef.current.clear();
    currentlyHighlightedMeshRef.current = null;
    setHoveredMeshName(null);
    userInteractedRef.current = false;
    autoRotateRef.current = true;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf5f5f5);

    // --- Camera Setup ---
    const camera = new THREE.PerspectiveCamera(
      45, // Reduced FOV for better initial view
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 8, 15);
    cameraRef.current = camera;

    // --- Renderer Setup with optimized settings ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true, // Changed to true to smooth edges
      powerPreference: 'high-performance',
      precision: 'mediump',
      alpha: true,  // Enable alpha channel
      stencil: true // Enable stencil buffer
    });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    
    const pixelRatio = Math.min(window.devicePixelRatio, 2); 
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
    controls.screenSpacePanning = true; // Enable screen space panning for more natural behavior
    controls.maxPolarAngle = Math.PI / 2.35;
    controls.minDistance = 0.5; // Reduced from 1.25 to allow closer inspection
    // More restricted max distance for zoom out
    controls.maxDistance = 20.0;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.7;
    controls.enableZoom = true;
    controls.panSpeed = 0.8; // Adjust pan speed for better control
    
    // Explicitly set mouse buttons for standard behavior
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    // Add event listeners for interactions
    controls.addEventListener('start', () => {
      userInteractedRef.current = true;
      autoRotateRef.current = false;
    });
    
    // Add an event listener to adjust target during significant changes
    controls.addEventListener('end', () => {
      // Reset rotation center if we're too far from the model
      if (modelCenterRef.current) {
        const distanceToModelCenter = camera.position.distanceTo(modelCenterRef.current);
        const distanceToTarget = camera.position.distanceTo(controls.target);
        
        // If we're much closer to the model than to the current target, recenter
        if (distanceToModelCenter < distanceToTarget * 0.5) {
          controls.target.copy(modelCenterRef.current);
          controls.update();
        }
      }
    });
    
    // NEW: Add event listener for zoom changes to update control behavior
    controls.addEventListener('change', () => {
      // This is called whenever the camera moves or controls change
      // We'll use it to update our dynamic control behavior
      if (cameraRef.current && controlsRef.current) {
        adjustControlsBasedOnZoomLevel();
      }
    });
    
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
      transparent: false,      // No transparency
      opacity: 1.0,            // Full opacity
      polygonOffset: true,     // Enable polygon offset to prevent z-fighting
      polygonOffsetFactor: -2, // Increased negative factor to pull further toward camera
      polygonOffsetUnits: -2,  // Increased offset units
      side: THREE.FrontSide,   // Only render front faces to avoid flickering
      depthWrite: true,        // Ensure proper depth writing
      depthTest: true,         // Keep depth testing enabled
      clipShadows: true        // Enable shadow clipping to reduce edge artifacts
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
    const animationDuration = 1500; // Shorter animation

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
        
        // Store the model center for camera targeting
        modelCenterRef.current = center.clone();
        
        model.position.sub(center);
        
        // Make the model bigger
        const size = box.getSize(new THREE.Vector3()).length();
        const baseScale = 12 / size; // Increased from 10 to 12
        const extraZoom = 1.8; // Increased from 1.5 to 1.8
        const scale = baseScale * extraZoom;
        model.scale.set(scale, scale, scale);
        
        // Make model face forward initially - no rotation
        model.rotation.y = 0;

        // Clear any previous maps
        targetMeshesRef.current.clear();
        originalMaterialsRef.current.clear();
        
        // Find and store all target meshes
        model.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            // Enable additional options to improve edge rendering
            mesh.frustumCulled = true;
            
            // Apply a small offset to all materials to avoid z-fighting
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => {
                if (mat.isMaterial) {
                  mat.polygonOffset = true;
                  mat.polygonOffsetFactor = 0.1;
                  mat.polygonOffsetUnits = 0.1;
                }
              });
            } else if (mesh.material && mesh.material.isMaterial) {
              mesh.material.polygonOffset = true;
              mesh.material.polygonOffsetFactor = 0.1;
              mesh.material.polygonOffsetUnits = 0.1;
            }
            
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
        
        // Important: Set the orbit controls target to the model center
        controls.target.copy(boundingSphere.center);
        
        // Calculate a better radius for a larger model view
        const radius = boundingSphere.radius;
        
        // Set better initial camera position for forward-facing view
        camera.position.set(
          boundingSphere.center.x,  // Center X (no offset)
          boundingSphere.center.y + radius * 0.4, // Slightly above center
          boundingSphere.center.z + radius * 1.3  // Positioned in front of model
        );
        
        const initialCameraPosition = camera.position.clone();
        initialCameraPositionRef.current = initialCameraPosition.clone();
        
        const targetCameraPosition = new THREE.Vector3(
          boundingSphere.center.x,  // Center X
          boundingSphere.center.y + radius * 0.5, // Slightly higher
          boundingSphere.center.z + radius * 1.6  // Further in front for better view
        );
        
        // Store the initial target for reset functionality
        initialTargetRef.current = boundingSphere.center.clone();

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
        
        // Set initial rotation to 0 to ensure model is facing forward
        if (model) {
          model.rotation.y = 0;
        }

        // Add a double-click event listener to reset camera to model center
        const handleDoubleClick = () => {
          resetCameraView();
        };
        
        container.addEventListener('dblclick', handleDoubleClick);

        // Animation loop
        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate);
          
          if (introAnimation) {
            const elapsed = Date.now() - animationStartTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOutCubic(progress);
            
            // No rotation during intro animation - just camera movement
            camera.position.lerpVectors(
              initialCameraPosition,
              targetCameraPosition,
              easedProgress
            );
            
            if (progress >= 1) {
              introAnimation = false;
              controls.enabled = true;
              // Store the final camera position after intro animation for reset
              initialCameraPositionRef.current = camera.position.clone();
              // Start auto-rotation after intro animation
              autoRotateRef.current = true;
            } else {
              controls.enabled = false;
            }
          } else if (model && autoRotateRef.current && !userInteractedRef.current) {
            // Slow automatic rotation when not interacting
            model.rotation.y += 0.001; // Very slow rotation
          }

          // Apply dynamic control adaptations based on zoom level
          if (!introAnimation) {
            adjustControlsBasedOnZoomLevel();
            
            // Update target less frequently for a more stable, laggy feel
            // Reduced from 0.05 (5%) to 0.02 (2%) for less frequent updates
            if (Math.random() < 0.02) {
              updateControlTargetBasedOnView();
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

        // Add cleanup for double-click handler
        return () => {
          container.removeEventListener('dblclick', handleDoubleClick);
        };
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
      modelCenterRef.current = null;
      initialCameraPositionRef.current = null;
      initialTargetRef.current = null;
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
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
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
          {/* Custom loading logo based on the reference image */}
          <div className="custom-loader">
            <div className="circle-segment segment-1"></div>
            <div className="circle-segment segment-2"></div>
            <div className="circle-segment segment-3"></div>
            <div className="circle-segment segment-4"></div>
          </div>
          <p style={{ 
            color: '#333', 
            fontSize: '16px', 
            fontWeight: '500',
            marginTop: '25px',
            fontFamily: 'Arial, sans-serif'
          }}>
            Loading 3D Model... {loadingProgress}%
          </p>
          <div style={{ 
            width: '240px', 
            height: '6px', 
            backgroundColor: '#e0e0e0', 
            borderRadius: '3px',
            overflow: 'hidden',
            marginTop: '8px'
          }}>
            <div style={{ 
              width: `${loadingProgress}%`, 
              height: '100%', 
              backgroundColor: '#e53935', // Red color matching the logo
              borderRadius: '3px',
              transition: 'width 0.3s ease-in-out'
            }} />
          </div>
          <style>
            {`
              .custom-loader {
                position: relative;
                width: 80px;
                height: 80px;
                animation: rotate 2s linear infinite;
              }
              
              .circle-segment {
                position: absolute;
                width: 45%;
                height: 45%;
                border-radius: 50%;
                background-color: #e53935; /* Red color */
              }
              
              .segment-1 {
                top: 0;
                left: 0;
              }
              
              .segment-2 {
                top: 0;
                right: 0;
              }
              
              .segment-3 {
                bottom: 0;
                right: 0;
              }
              
              .segment-4 {
                bottom: 0;
                left: 0;
              }
              
              @keyframes rotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
      
      {!isLoading && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px', // Changed from left to right
          padding: '10px 15px',
          color: '#333333',
          borderRadius: '5px',
          fontSize: '13px',
          fontFamily: 'Arial, sans-serif',
          fontWeight: '500',
          zIndex: 10,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '12px' // Space between instructions
        }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Left-click:</span> Rotate
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Right-click:</span> Pan
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Scroll:</span> Zoom
          </span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Double-click:</span> Reset View
          </span>
        </div>
      )}
    </div>
  );
};

export default ModelViewer;