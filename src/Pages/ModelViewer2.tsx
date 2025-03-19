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
    
    (renderer as any).outputColorSpace = THREE.SRGBColorSpace;
    (renderer as any).physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5; 
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
    // Reduce ambient light for greater contrast in shadows
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); 
    scene.add(ambientLight);

    // Hemisphere Light for subtle color contrast
    const hemiLight = new THREE.HemisphereLight(0xffd580, 0x80a0ff, 0.3);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Main Directional Light with enhanced shadow settings
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2); 
    mainLight.position.set(15, 20, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096; 
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -25;
    mainLight.shadow.camera.right = 25;
    mainLight.shadow.camera.top = 25;
    mainLight.shadow.camera.bottom = -25;
    mainLight.shadow.bias = -0.0005;
    mainLight.shadow.normalBias = 0.04; 
    mainLight.shadow.radius = 3; 

    directionalLightRef.current = mainLight;
    scene.add(mainLight);

    // Fill Light for overall illumination remains the same
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-15, 10, -15);
    scene.add(fillLight);

    // --- Ground Plane for Receiving Shadows ---
    // Using ShadowMaterial with maximum opacity and explicit black color
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 1.0 });
    groundMaterial.color = new THREE.Color(0x000000);
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2; 
    groundPlane.position.y = -0.1; 
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // --- Model Loading ---
    const loader = new GLTFLoader();
    let introAnimation = true;
    let animationStartTime = 0;
    const animationDuration = 3000; 

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
        const scale = 10 / size;
        model.scale.set(scale, scale, scale);

        model.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (Array.isArray(mesh.material)) {
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
          const shadowCameraSize = radius * 2.5;
          light.shadow.camera.left = -shadowCameraSize;
          light.shadow.camera.right = shadowCameraSize;
          light.shadow.camera.top = shadowCameraSize;
          light.shadow.camera.bottom = -shadowCameraSize;
          light.shadow.camera.updateProjectionMatrix();
        }

        controls.update();

        // Environment map
        const pmremGenerator = new PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const cubeRenderTarget = pmremGenerator.fromScene(new THREE.Scene());
        scene.environment = cubeRenderTarget.texture;
        pmremGenerator.dispose();

        setIsLoading(false);
        introAnimation = true;
        animationStartTime = Date.now();

        const animate = () => {
          requestAnimationFrame(animate);
          controls.update();

          if (introAnimation) {
            const elapsed = Date.now() - animationStartTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
            const easedProgress = easeOutCubic(progress);
            model.rotation.y = easedProgress * Math.PI * 0.25; 
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

          renderer.render(scene, camera);
        };

        animate();
      },
      (xhr: ProgressEvent<EventTarget>) => {
        if (xhr.total) {
          console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
        }
      },
      (error: any) => {
        console.error('Model loading error:', error);
        setIsLoading(false);
      }
    );

    // Grid Helper
    const gridHelper = new THREE.GridHelper(30, 30, 0x555555, 0x444444);
    gridHelper.position.y = -0.05; 
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Basic Animation Loop (pre-model load)
    let frameId: number;
    const animatePreload = () => {
      frameId = requestAnimationFrame(animatePreload);
      controls.update();
      renderer.render(scene, camera);
    };
    animatePreload();

    // Resize Handler
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      if (controlsRef.current) controlsRef.current.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
      if (sceneRef.current) {
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
        if (sceneRef.current.environment) {
          (sceneRef.current.environment as any).dispose();
          sceneRef.current.environment = null;
        }
        sceneRef.current.clear();
      }
      if (modelRef.current) modelRef.current = null;
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
          <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold' }}>
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
