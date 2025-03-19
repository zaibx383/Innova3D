import { useRef, useEffect, useState, FC } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PMREMGenerator } from 'three';

interface ModelViewerProps {
  modelPath?: string;
}

const ModelViewer: FC<ModelViewerProps> = ({ modelPath = '/assets/test3.glb' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf5f5f5);

    // --- Camera Setup ---
    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 8, 15);

    // --- Renderer Setup ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Enhanced shadow settings
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Casting to any because TS definitions might be missing these properties
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    (renderer as any).physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- Controls Setup ---
    const controls = new OrbitControls(camera, renderer.domElement) as OrbitControls;
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 3.0;
    controls.maxDistance = 30.0;
    controls.zoomSpeed = 0.8;

    // --- Lighting Setup ---
    // Ambient Light - reduce intensity to make shadows more prominent
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Increased a bit to preserve model colors

    scene.add(ambientLight);

    // Hemisphere Light - create a warm/cool contrast
    const hemiLight = new THREE.HemisphereLight(0xffd580, 0x80a0ff, 0.3);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Main Directional Light - simulating sun
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0); // Changed to white light to preserve colors
    // Fixed position to prevent flickering
    mainLight.position.set(15, 20, 15);
    mainLight.castShadow = true;
    
    // Enhanced shadow settings
    mainLight.shadow.mapSize.width = 4096; // High resolution shadows
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -25;
    mainLight.shadow.camera.right = 25;
    mainLight.shadow.camera.top = 25;
    mainLight.shadow.camera.bottom = -25;
    mainLight.shadow.bias = -0.0005; // Adjusted to prevent shadow acne
    mainLight.shadow.normalBias = 0.04; // Increased to help with shadow stability
    mainLight.shadow.radius = 1.5; // Slight blur to stabilize shadows
    
    directionalLightRef.current = mainLight;
    scene.add(mainLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3); // Changed to white to preserve colors
    fillLight.position.set(-15, 10, -15);
    scene.add(fillLight);

    // --- Ground Plane for receiving shadows ---
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe0e0e0, 
      roughness: 0.8,
      metalness: 0.1,
    });
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    groundPlane.position.y = -0.1; // Slightly below the model
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // --- Model Loading ---
    const loader = new GLTFLoader();

    // Variables for the intro animation
    let introAnimation = true;
    let animationStartTime = 0;
    const animationDuration = 3000; // 3 seconds

    loader.load(
      modelPath,
      (gltf: GLTF) => {
        const model = gltf.scene;
        modelRef.current = model;

        // Center model
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);

        // Scale model
        const size = box.getSize(new THREE.Vector3()).length();
        const scale = 10 / size;
        model.scale.set(scale, scale, scale);

        model.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            if (Array.isArray(mesh.material)) {
              // Cast the material array to the correct type
              const materials = mesh.material as THREE.Material[];
              
              materials.forEach((mat, index) => {
                if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
                  const basicMat = mat as THREE.MeshBasicMaterial;
                  const newMat = new THREE.MeshStandardMaterial({
                    color: basicMat.color,
                    map: basicMat.map,
                    transparent: basicMat.transparent,
                    opacity: basicMat.opacity,
                    roughness: 0.5,
                    metalness: 0.0
                  });
                  materials[index] = newMat;
                }
              });
              
              // Assign the modified materials array back to the mesh
              mesh.material = materials;
            } else if ((mesh.material as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
              const basicMat = mesh.material as THREE.MeshBasicMaterial;
              const newMat = new THREE.MeshStandardMaterial({
                color: basicMat.color,
                map: basicMat.map,
                transparent: basicMat.transparent,
                opacity: basicMat.opacity,
                roughness: 0.5,
                metalness: 0.0
              });
              mesh.material = newMat;
            }
          }
        });

        scene.add(model);

        // Camera positioning
        const boundingBox = new THREE.Box3().setFromObject(model);
        const boundingSphere = new THREE.Sphere();
        boundingBox.getBoundingSphere(boundingSphere);

        controls.target.copy(boundingSphere.center);

        // Set camera position for intro animation
        const radius = boundingSphere.radius;
        camera.position.set(
          boundingSphere.center.x - radius * 0.6,
          boundingSphere.center.y + radius * 0.3,
          boundingSphere.center.z + radius * 0.6
        );

        // Store initial camera position for animation
        const initialCameraPosition = camera.position.clone();
        const targetCameraPosition = new THREE.Vector3(
          boundingSphere.center.x - radius * 0.8,
          boundingSphere.center.y + radius * 0.5,
          boundingSphere.center.z + radius * 1.2
        );

        // Adjust the directional light and shadow camera based on the model size
        if (directionalLightRef.current) {
          const light = directionalLightRef.current;
          // Fixed position to avoid flickering shadows
          const lightRadius = boundingSphere.radius * 2.5;
          light.position.set(
            boundingSphere.center.x + lightRadius,
            boundingSphere.center.y + radius * 1.5,
            boundingSphere.center.z + lightRadius
          );
          
          // Create a target object at the center of the model
          const targetObject = new THREE.Object3D();
          targetObject.position.copy(boundingSphere.center);
          scene.add(targetObject);
          light.target = targetObject;
          
          // Update the shadow camera to fit the model precisely
          const shadowCameraSize = radius * 2.5;
          light.shadow.camera.left = -shadowCameraSize;
          light.shadow.camera.right = shadowCameraSize;
          light.shadow.camera.top = shadowCameraSize;
          light.shadow.camera.bottom = -shadowCameraSize;
          light.shadow.camera.updateProjectionMatrix();
          
          // Optional: add shadow camera helper for debugging
          // const shadowHelper = new THREE.CameraHelper(light.shadow.camera);
          // scene.add(shadowHelper);
        }

        controls.update();

        // Environment map
        const pmremGenerator = new PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const cubeRenderTarget = pmremGenerator.fromScene(new THREE.Scene());
        scene.environment = cubeRenderTarget.texture;
        pmremGenerator.dispose();

        // Model is loaded, hide spinner
        setIsLoading(false);

        // Start animation
        introAnimation = true;
        animationStartTime = Date.now();

        // Animate function with model rotation and camera movement
        const animate = () => {
          requestAnimationFrame(animate);
          controls.update();
          
          // We're no longer rotating the light to prevent flickering
          // The light stays in a fixed position

          if (introAnimation) {
            const elapsed = Date.now() - animationStartTime;
            const progress = Math.min(elapsed / animationDuration, 1);

            // Smooth animation curve using easeOutCubic
            const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOutCubic(progress);

            // Rotate model
            model.rotation.y = easedProgress * Math.PI * 0.25; // Rotate by 45 degrees

            // Move camera
            camera.position.lerpVectors(
              initialCameraPosition,
              targetCameraPosition,
              easedProgress
            );

            if (progress >= 1) {
              introAnimation = false;
              // Enable controls after animation
              controls.enabled = true;
            } else {
              // Disable controls during animation
              controls.enabled = false;
            }
          }

          renderer.render(scene, camera);
        };

        // Start the animation
        animate();
      },
      (xhr: ProgressEvent<EventTarget>) => {
        if (xhr.total) {
          console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
        }
      },
      (error: any) => {
        console.error('Model loading error:', error);
        setIsLoading(false); // Hide spinner even on error
      }
    );

    // Grid Helper (now less prominent)
    const gridHelper = new THREE.GridHelper(30, 30, 0x555555, 0x444444);
    gridHelper.position.y = -0.05; // Slightly above the ground plane
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // --- Basic Animation Loop (will be replaced when model is loaded) ---
    let frameId: number;
    const animatePreload = () => {
      frameId = requestAnimationFrame(animatePreload);
      controls.update();
      renderer.render(scene, camera);
    };
    animatePreload();

    // --- Resize Handler ---
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);

      // Dispose controls
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      // Dispose renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }

      // Dispose scene
      if (sceneRef.current) {
        // Dispose materials and geometries
        sceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });

        // Dispose environment
        if (sceneRef.current.environment) {
          (sceneRef.current.environment as any).dispose();
          sceneRef.current.environment = null;
        }

        // Clear scene
        sceneRef.current.clear();
      }

      // Clear model reference
      if (modelRef.current) {
        modelRef.current = null;
      }
    };
  }, [modelPath]);

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
          <p
            style={{
              color: '#333',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Loading 3D Model...
          </p>

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
    </div>
  );
};

export default ModelViewer;