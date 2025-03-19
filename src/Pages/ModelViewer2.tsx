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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Casting to any because TS definitions might be missing these properties
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    (renderer as any).physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- Controls Setup ---
    // If you encounter deep type instantiation issues, you can cast to any here:
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
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x98c3ff, 0x7c6b4e, 0.5);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Main Directional Light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(15, 25, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    mainLight.shadow.bias = -0.0005;
    scene.add(mainLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xffffeb, 0.3);
    fillLight.position.set(-15, 10, -15);
    scene.add(fillLight);

    // Top Light
    const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
    topLight.position.set(0, 30, 0);
    topLight.castShadow = true;
    scene.add(topLight);

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

        // Material enhancements
        model.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
        
            if (Array.isArray(mesh.material)) {
              // Explicitly type the material array
              const materials = mesh.material as THREE.Material[];
              materials.forEach((mat, index) => {
                if ((mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
                  const basicMat = mat as THREE.MeshBasicMaterial;
                  const newMat = new THREE.MeshStandardMaterial({
                    color: basicMat.color,
                    map: basicMat.map,
                    transparent: basicMat.transparent,
                    opacity: basicMat.opacity,
                    roughness: 0.7,
                    metalness: 0.2,
                    envMapIntensity: 0.8
                  });
                  // Assign to the explicitly typed array
                  materials[index] = newMat;
                } else if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                  const standardMat = mat as THREE.MeshStandardMaterial;
                  standardMat.roughness = Math.max(0.6, standardMat.roughness);
                  standardMat.metalness = Math.min(0.3, standardMat.metalness);
                }
              });
              // Reassign the entire materials array back to mesh.material
              mesh.material = materials;
            } else {
              if ((mesh.material as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
                const basicMat = mesh.material as THREE.MeshBasicMaterial;
                const newMat = new THREE.MeshStandardMaterial({
                  color: basicMat.color,
                  map: basicMat.map,
                  transparent: basicMat.transparent,
                  opacity: basicMat.opacity,
                  roughness: 0.7,
                  metalness: 0.2,
                  envMapIntensity: 0.8
                });
                mesh.material = newMat;
              } else if ((mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const standardMat = mesh.material as THREE.MeshStandardMaterial;
                standardMat.roughness = Math.max(0.6, standardMat.roughness);
                standardMat.metalness = Math.min(0.3, standardMat.metalness);
              }
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

    // Grid Helper
    const gridHelper = new THREE.GridHelper(30, 30, 0x777777, 0x555555);
    gridHelper.position.y = -0.01;
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
