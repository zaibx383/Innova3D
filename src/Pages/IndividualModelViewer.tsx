import { useRef, useEffect, useState, FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import image3 from "../assets/img-3.png";
import image4 from "../assets/img-4.png";
import { PMREMGenerator } from 'three';

interface IndividualModelViewerProps {
  initialModelPath?: string;
}

const IndividualModelViewer: FC<IndividualModelViewerProps> = () => {
  const { variant = 'with', unitId } = useParams<{ variant: string, unitId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const autoRotateRef = useRef<boolean>(true);
  const userInteractedRef = useRef<boolean>(false);
  const modelCenterRef = useRef<THREE.Vector3 | null>(null);
  const initialCameraPositionRef = useRef<THREE.Vector3 | null>(null);
  const initialTargetRef = useRef<THREE.Vector3 | null>(null);
  const modelBoundsRef = useRef<THREE.Box3 | null>(null);
  const modelSizeRef = useRef<number>(1);
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  const buttonClickTimeRef = useRef<number>(0);

  // Camera orbit params
  const cameraOrbitRadiusRef = useRef<number>(12);
  const cameraOrbitHeightRef = useRef<number>(5);

  // Helper: get model path from variant
  const getModelPath = () =>
    variant === 'without'
      ? '/assets/Without_Mezzanine.glb'
      : '/assets/Mezzanine_3.glb';

  const [currentModelPath, setCurrentModelPath] = useState<string>(getModelPath());
  const [activeModelButton, setActiveModelButton] = useState<string>(
    variant === 'without' ? 'withoutMezzanine' : 'withMezzanine'
  );

  // Update model path when variant changes
  useEffect(() => {
    setCurrentModelPath(getModelPath());
    setActiveModelButton(variant === 'without' ? 'withoutMezzanine' : 'withMezzanine');
  }, [variant]);

  // Function to create or update ground plane
  const setupGroundPlane = (model: THREE.Group) => {
    if (!sceneRef.current) return;
    if (groundPlaneRef.current && sceneRef.current.getObjectById(groundPlaneRef.current.id)) {
      sceneRef.current.remove(groundPlaneRef.current);
      groundPlaneRef.current = null;
    }
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = new THREE.Vector3();
    box.getCenter(center);
    const groundSize = Math.max(size.x, size.z) * 3;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.22, color: 0x000000 });
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = box.min.y - 0.01;
    groundPlane.position.x = center.x;
    groundPlane.position.z = center.z;
    groundPlane.receiveShadow = true;
    sceneRef.current.add(groundPlane);
    groundPlaneRef.current = groundPlane;
  };

  // Debounced model switch
  const changeModel = (modelPath: string, buttonId: string, newVariant: 'with' | 'without') => {
    const now = Date.now();
    if (now - buttonClickTimeRef.current < 500) return;
    if (activeModelButton === buttonId) return;
    buttonClickTimeRef.current = now;
    setIsLoading(true);
    setCurrentModelPath(modelPath);
    setActiveModelButton(buttonId);
    navigate(`/individual/${newVariant}/${unitId}`);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- INIT Three.js essentials
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf5f5f5);

    // Camera: start at _exactly_ the start of the intro
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
      alpha: true,
      stencil: true
    });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2.20;
    controls.minPolarAngle = 0;
    controls.minDistance = 0.5;
    controls.maxDistance = 20.0;
    controls.zoomSpeed = 1.8;
    controls.rotateSpeed = 0.7;
    controls.enableZoom = true;
    controls.panSpeed = 1.8;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    controls.addEventListener('start', () => {
      userInteractedRef.current = true;
      autoRotateRef.current = false;
    });

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
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

    // Mouse event disables auto-rotate on user interaction
    const setupMouseEvents = () => {
      const onUserInteraction = () => {
        userInteractedRef.current = true;
        autoRotateRef.current = false;
      };
      container.addEventListener('mousedown', onUserInteraction);
      container.addEventListener('wheel', onUserInteraction);
      container.addEventListener('touchstart', onUserInteraction);
      return () => {
        container.removeEventListener('mousedown', onUserInteraction);
        container.removeEventListener('wheel', onUserInteraction);
        container.removeEventListener('touchstart', onUserInteraction);
      };
    };
    const cleanupMouseEvents = setupMouseEvents();

    // Draco + GLTF loader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.159.0/examples/jsm/libs/draco/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Animation state
    let introAnimation = true;
    let animationStartTime = 0;
    const animationDuration = 1500;

    // Load model
    loader.load(
      currentModelPath,
      (gltf: GLTF) => {
        // Remove previous model if present
        if (modelRef.current && sceneRef.current) {
          sceneRef.current.remove(modelRef.current);
          modelRef.current = null;
        }
        const model = gltf.scene;
        modelRef.current = model;

        // --- CENTER AND SCALE THE MODEL
        const box = new THREE.Box3().setFromObject(model);
        modelBoundsRef.current = box.clone();
        const center = new THREE.Vector3();
        box.getCenter(center);
        modelCenterRef.current = center.clone();

        const size = box.getSize(new THREE.Vector3());
        const modelDiagonal = size.length();
        modelSizeRef.current = modelDiagonal;
        model.position.set(0, 0, 0);
        const newBox = new THREE.Box3().setFromObject(model);
        const newCenter = new THREE.Vector3();
        newBox.getCenter(newCenter);
        model.position.sub(newCenter);
        const baseScale = 15 / modelDiagonal;
        model.scale.set(baseScale, baseScale, baseScale);

        // Update center after scaling
        const finalBox = new THREE.Box3().setFromObject(model);
        finalBox.getCenter(modelCenterRef.current);
        modelBoundsRef.current = finalBox.clone();
        model.rotation.y = 0;

        // Enable shadows, convert MeshBasicMaterial to MeshStandardMaterial
        model.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;
            if (mesh.geometry) {
              mesh.geometry.computeBoundingBox();
              mesh.geometry.computeBoundingSphere();
            }
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat, idx) => {
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
                  (mesh.material as THREE.Material[])[idx] = newMat;
                }
              });
            } else if ((mesh.material as THREE.MeshBasicMaterial).isMeshBasicMaterial) {
              const basicMat = mesh.material as THREE.MeshBasicMaterial;
              mesh.material = new THREE.MeshStandardMaterial({
                color: basicMat.color,
                map: basicMat.map,
                transparent: basicMat.transparent,
                opacity: basicMat.opacity,
                roughness: 0.7,
                metalness: 0.0
              });
            }
          }
        });

        // --- Ground plane
        setupGroundPlane(model);

        // --- Prepare camera/controls for **perfect** intro
        // Calculate orbit params from model bounds
        const boundingBox = new THREE.Box3().setFromObject(model);
        const boundingSphere = new THREE.Sphere();
        boundingBox.getBoundingSphere(boundingSphere);
        const cameraOrbitRadius = boundingSphere.radius * 2.2;
        const cameraOrbitHeight = boundingSphere.center.y + boundingSphere.radius * 0.7;
        cameraOrbitRadiusRef.current = cameraOrbitRadius;
        cameraOrbitHeightRef.current = cameraOrbitHeight;

        // Intro animation: camera should start at angleStart, end at angleEnd
        const centerVec = boundingSphere.center.clone();
        const angleStart = -Math.PI / 4;
        const angleEnd = 0;
        // Start: before first render, camera sits at angleStart
        camera.position.set(
          centerVec.x + cameraOrbitRadius * Math.sin(angleStart),
          cameraOrbitHeight,
          centerVec.z + cameraOrbitRadius * Math.cos(angleStart)
        );
        camera.lookAt(centerVec);

        // Controls target must be set before model is added!
        controls.target.copy(centerVec);
        controls.update();

        // Set initial values for reset
        initialCameraPositionRef.current = camera.position.clone();
        initialTargetRef.current = centerVec.clone();

        // Light follow model
        if (directionalLightRef.current) {
          const light = directionalLightRef.current;
          light.position.set(
            boundingSphere.center.x + boundingSphere.radius * 1.5,
            boundingSphere.center.y + boundingSphere.radius * 2.0,
            boundingSphere.center.z + boundingSphere.radius * 1.5
          );
          const targetObject = new THREE.Object3D();
          targetObject.position.copy(boundingSphere.center);
          scene.add(targetObject);
          light.target = targetObject;
          const shadowCameraSize = Math.max(boundingSphere.radius * 2, 5);
          light.shadow.camera.left = -shadowCameraSize;
          light.shadow.camera.right = shadowCameraSize;
          light.shadow.camera.top = shadowCameraSize;
          light.shadow.camera.bottom = -shadowCameraSize;
          light.shadow.camera.updateProjectionMatrix();
        }

        // Only now add the model! (No flicker, no pop.)
        scene.add(model);

        // Environment
        const pmremGenerator = new PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();
        const cubeRenderTarget = pmremGenerator.fromScene(new THREE.Scene());
        scene.environment = cubeRenderTarget.texture;
        pmremGenerator.dispose();

        // Hide loader, model is ready, animation can start from correct camera/model position
        setIsLoading(false);

        // --- Animation loop
        introAnimation = true;
        animationStartTime = Date.now();

        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate);

          if (introAnimation) {
            const elapsed = Date.now() - animationStartTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            // Use smooth easeInOutQuad
            const t = progress < 0.5
              ? 2 * progress * progress
              : -1 + (4 - 2 * progress) * progress;
            const angle = angleStart + (angleEnd - angleStart) * t;
            camera.position.set(
              centerVec.x + cameraOrbitRadius * Math.sin(angle),
              cameraOrbitHeight,
              centerVec.z + cameraOrbitRadius * Math.cos(angle)
            );
            controls.target.lerp(centerVec, t);
            camera.lookAt(centerVec);

            if (progress >= 1) {
              introAnimation = false;
              controls.enabled = true;
              initialCameraPositionRef.current = camera.position.clone();
              autoRotateRef.current = true;
            } else {
              controls.enabled = false;
            }
          } else if (model && autoRotateRef.current && !userInteractedRef.current) {
            const slowOrbitSpeed = 0.00012;
            const angle =
              ((Date.now() - animationStartTime) * slowOrbitSpeed) % (2 * Math.PI);
            camera.position.x = centerVec.x + cameraOrbitRadius * Math.sin(angle);
            camera.position.z = centerVec.z + cameraOrbitRadius * Math.cos(angle);
            camera.position.y = cameraOrbitHeight;
            camera.lookAt(centerVec);
          }
          controls.update();
          renderer.render(scene, camera);
        };

        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animate();

        // Double-click = reset view
        const handleDoubleClick = () => {
          if (initialCameraPositionRef.current && initialTargetRef.current) {
            const controls = controlsRef.current;
            const camera = cameraRef.current;
            if (!controls || !camera) return;
            const startPosition = camera.position.clone();
            const startTarget = controls.target.clone();
            const endPosition = initialCameraPositionRef.current.clone();
            const endTarget = initialTargetRef.current.clone();
            const duration = 1000;
            const startTime = Date.now();
            const animateReset = () => {
              const now = Date.now();
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
              const easedProgress = easeOut(progress);
              camera.position.lerpVectors(startPosition, endPosition, easedProgress);
              controls.target.lerpVectors(startTarget, endTarget, easedProgress);
              controls.update();
              if (progress < 1) requestAnimationFrame(animateReset);
            };
            animateReset();
          }
        };
        container.addEventListener('dblclick', handleDoubleClick);

        // Clamp pan target so it can't go below ground
        const getMinTargetY = () =>
          groundPlaneRef.current ? groundPlaneRef.current.position.y : -0.01;
        controls.addEventListener('change', () => {
          const minTargetY = getMinTargetY();
          if (controls.target.y < minTargetY) {
            controls.target.y = minTargetY;
            controls.update();
          }
        });

        // Clean up
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

    // Preload animation at lower FPS (while loading)
    let lastFrameTime = 0;
    const targetFPS = 24;
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

    // Throttled resize handler
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
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
      }, 100);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (cleanupMouseEvents) cleanupMouseEvents();
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
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
      if (groundPlaneRef.current) {
        groundPlaneRef.current = null;
      }
      if (dracoLoader) dracoLoader.dispose();
      modelRef.current = null;
      directionalLightRef.current = null;
      cameraRef.current = null;
      modelCenterRef.current = null;
      initialCameraPositionRef.current = null;
      initialTargetRef.current = null;
      modelBoundsRef.current = null;
    };
  }, [currentModelPath, unitId, variant]);

  // --- RENDER ---
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
              backgroundColor: '#e53935',
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
                background-color: #e53935;
              }
              .segment-1 { top: 0; left: 0; }
              .segment-2 { top: 0; right: 0; }
              .segment-3 { bottom: 0; right: 0; }
              .segment-4 { bottom: 0; left: 0; }
              @keyframes rotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
  
      {/* Back button on top left */}
      {!isLoading && (
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '100px',
            left: '20px',
            zIndex: 20,
            padding: '8px 15px',
            cursor: 'pointer',
            border: '2px solid #555',
            borderRadius: '4px',
            backgroundColor: '#f5f5f5',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#333333',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span style={{ fontSize: '18px' }}>←</span> Back to Main View
        </button>
      )}
  
      {/* Model selection buttons at bottom left for individual models */}
      {!isLoading && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <button
            onClick={() => changeModel('/assets/Mezzanine_3.glb', 'withMezzanine', 'with')}
            style={{
              padding: 0,
              cursor: 'pointer',
              border: activeModelButton === 'withMezzanine' ? '2px solid #e53935' : '2px solid #aaaaaa',
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: 'transparent',
              width: '145px',
              height: '110px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <img
              src={image3}
              alt="With Mezzanine"
              style={{
                width: '100%',
                height: '75%',
                objectFit: 'cover'
              }}
            />
            <div style={{
              width: '100%',
              backgroundColor: '#f5f5f5',
              padding: '7px 0 4px 0',
              textAlign: 'center',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              color: '#333333',
              fontWeight: 'bold'
            }}>
              With Mezzanine
            </div>
          </button>
          <button
            onClick={() => changeModel('/assets/Without_Mezzanine.glb', 'withoutMezzanine', 'without')}
            style={{
              padding: 0,
              cursor: 'pointer',
              border: activeModelButton === 'withoutMezzanine' ? '2px solid #e53935' : '2px solid #aaaaaa',
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: 'transparent',
              width: '145px',
              height: '110px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <img
              src={image4}
              alt="Without Mezzanine"
              style={{
                width: '100%',
                height: '75%',
                objectFit: 'cover'
              }}
            />
            <div style={{
              width: '100%',
              backgroundColor: '#f5f5f5',
              padding: '7px 0 4px 0',
              textAlign: 'center',
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              color: '#333333',
              fontWeight: 'bold'
            }}>
              Without Mezzanine
            </div>
          </button>
        </div>
      )}
  
      {/* Unit Number Display (shifted to the right so it doesn't overlap back button) */}
      {!isLoading && unitId && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '180px',
          padding: '8px 15px',
          backgroundColor: '#e53935',
          color: 'white',
          borderRadius: '4px',
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          zIndex: 10
        }}>
          Unit #{unitId}
        </div>
      )}
  
      {/* Controls help */}
      {!isLoading && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
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
          gap: '12px'
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
export default IndividualModelViewer;