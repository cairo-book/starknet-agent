import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface FalconViewerProps {
  modelPath?: string;
  width?: number;
  height?: number;
  className?: string;
  autoRotate?: boolean;
  enableControls?: boolean;
  modelColor?: string;
}

const FalconViewer: React.FC<FalconViewerProps> = ({
  modelPath = '/models/Falcon.glb',
  width = 600,
  height = 400,
  className = '',
  autoRotate = true,
  enableControls = true,
  modelColor = '#ffffff',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    
    // Add a background color for small canvases to debug
    if (width <= 200) {
      scene.background = new THREE.Color(0x222222);
    }

    // Camera setup - Adjusted for canvas size
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    
    // For small canvases (like hover button), use MUCH closer camera
    if (width <= 200) {
      camera.position.set(0.5, 0.3, 1.5);
    } else {
      camera.position.set(3, 1.5, 8);
    }
    camera.lookAt(0, 0, 0);

    // Renderer setup for transparent background
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;

    // Simple lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 4, 2);
    scene.add(directionalLight);
    
    // No test cube anymore

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1;
    controls.enabled = enableControls;
    controls.enableZoom = false;

    let animationIntervalId: ReturnType<typeof setInterval> | null = null;

    // Load model
    const loader = new GLTFLoader();

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Scale based on canvas size - MUCH bigger for small canvases
        if (width <= 200) {
          model.scale.setScalar(0.005);
          
          // Calculate bounding box and center the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          
          // Move model so its center is at origin
          model.position.set(-center.x, -center.y, -center.z);
          
          console.log('📦 Model centered at origin. Original center was:', center);
        } else {
          model.scale.setScalar(0.01);
          model.position.set(0, 0, 0);
        }

        scene.add(model);

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            console.log('🔍 Mesh found:', child.name, 'visible:', child.visible);
            if (child.material) {
              const materials = Array.isArray(child.material)
                ? child.material
                : [child.material];
              materials.forEach((mat) => {
                if ('color' in mat) {
                  (mat as THREE.MeshStandardMaterial).color = new THREE.Color(
                    modelColor,
                  );
                }
                mat.wireframe = false;
                mat.transparent = false;
                mat.opacity = 1;
                
                // Force visibility
                if ('visible' in mat) {
                  mat.visible = true;
                }
              });
            }
            // Force mesh to be visible
            child.visible = true;
          }
        });

        // DISABLE ANIMATION for small canvases to debug
        if (width > 200 && gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          const action = mixer.clipAction(gltf.animations[0]);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          scene.userData.mixer = mixer;

          // Restart animation every 15 seconds
          if (animationIntervalId) clearInterval(animationIntervalId);
          animationIntervalId = setInterval(() => {
            action.reset();
            action.play();
          }, 15000);
        } else {
          console.log('🚫 Animation DISABLED for debugging');
        }

        setLoading(false);
      },
      undefined,
      (loadError) => {
        console.error('[FalconViewer] ❌ Error loading model:', loadError);
        setError('Failed to load model');
        setLoading(false);
      },
    );

    const clock = new THREE.Clock();
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();
      controls.update();
      if (scene.userData.mixer) {
        scene.userData.mixer.update(deltaTime);
      }
      renderer.render(scene, camera);
    };

    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }
    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (animationIntervalId) {
        clearInterval(animationIntervalId);
      }
      if (
        mountRef.current &&
        renderer.domElement.parentNode === mountRef.current
      ) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [modelPath, width, height, autoRotate, enableControls, modelColor]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-900 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const rootClassNames =
    `relative ${className} ${loading ? 'hidden' : ''}`.trim();
  const rootStyle: React.CSSProperties = {
    width: width,
    height: height,
  };

  if (loading) {
    rootStyle.display = 'none';
  }

  return (
    <div className={rootClassNames} style={rootStyle}>
      <div
        ref={mountRef}
        className="w-full h-full rounded-lg overflow-hidden"
      />
    </div>
  );
};

export default FalconViewer;
