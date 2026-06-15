"use client";

import {
  ContactShadows,
  Environment,
  Grid,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState, memo } from "react";
import * as THREE from "three";
import { VehicleConfiguration } from "@/lib/types";

// ─── Material name→role mapping (Range Rover specific) ──────────────────────
// These are used for Range Rover. For other models we apply generic logic.
const BODY_MATS   = ["Boja dzipa"];
const RIM_MATS    = ["felna", "Zlatna", "Dzip_znak"];
const GLASS_MATS  = ["staklo", "staklo_svijetla"];
const SEAT_MATS   = ["Sjedista"];
const BLACK_MATS  = ["Crna glosy", "glosy_resetka", "glosy"];
const TIRE_MATS   = ["guma_procedural"];

// Generic keyword patterns to detect role of ANY GLB mesh by name
const GENERIC_GLASS_KEYWORDS = ["glass", "window", "windshield", "windscreen", "glazing", "windsheld", "staklo", "vidro", "cam", "verre", "glas"];
const GENERIC_WHEEL_KEYWORDS = ["wheel", "tire", "tyre", "rim", "felna", "tocak", "felge", "jante", "ruota", "guma"];
const GENERIC_SEAT_KEYWORDS  = ["seat", "interior", "upholstery", "leather", "fabric", "sjedista", "sedadlo"];
const GENERIC_LIGHT_KEYWORDS = ["light", "lamp", "headlight", "taillight", "lens", "svijetlo", "phare"];

function isGlassMesh(name: string, matName: string): boolean {
  const n = (name + " " + matName).toLowerCase();
  return GENERIC_GLASS_KEYWORDS.some(k => n.includes(k));
}
function isWheelMesh(name: string, matName: string): boolean {
  const n = (name + " " + matName).toLowerCase();
  return GENERIC_WHEEL_KEYWORDS.some(k => n.includes(k));
}
function isSeatMesh(name: string, matName: string): boolean {
  const n = (name + " " + matName).toLowerCase();
  return GENERIC_SEAT_KEYWORDS.some(k => n.includes(k));
}

const UPHOLSTERY_COLORS: Record<string, string> = {
  black:    "#141418",
  tan:      "#865735",
  cream:    "#d4c5a9",
  alcantara:"#3a3c42",
};

// ─── Component: CameraController ───────────────────────────────────────────
function CameraController({
  viewMode,
  focusedComponent,
  wheelbase,
}: {
  viewMode: "vehicle" | "engineering";
  focusedComponent: string;
  wheelbase: number;
}) {
  const { camera, controls } = useThree();
  const targetPos = useRef<THREE.Vector3 | null>(null);
  const targetLookAt = useRef<THREE.Vector3 | null>(null);
  const lerpActive = useRef(false);
  const startTime = useRef(0);
  
  useEffect(() => {
    if (viewMode !== "engineering" || !focusedComponent) {
      lerpActive.current = false;
      if (controls) {
        (controls as any).enabled = true;
      }
      return;
    }
    
    const dZ = ((wheelbase / 2900) - 1) * 1.2;
    
    let pos: [number, number, number] = [4.6, 2.0, 5.0];
    let look: [number, number, number] = [0, 0.5, 0];
    
    if (focusedComponent === "Engine") {
      pos = [2.2, 1.4, 1.7 + dZ / 2];
      look = [0, 0.7, 1.7 + dZ / 2];
    } else if (focusedComponent === "Battery") {
      pos = [3.2, 0.1, 0.25];
      look = [0, 0.25, 0.25];
    } else if (focusedComponent === "Chassis") {
      pos = [3.8, 1.9, 3.2];
      look = [0, 0.3, 0.25];
    } else if (focusedComponent === "Suspension") {
      pos = [-2.6, 0.9, 2.2 + dZ / 2];
      look = [-1.2, 0.5, 2.2 + dZ / 2];
    } else if (focusedComponent === "Seating") {
      pos = [2.0, 1.4, 0];
      look = [0, 0.7, 0];
    } else {
      return;
    }
    
    targetPos.current = new THREE.Vector3(...pos);
    targetLookAt.current = new THREE.Vector3(...look);
    lerpActive.current = true;
    startTime.current = Date.now();
    
    if (controls) {
      (controls as any).enabled = false;
    }
  }, [focusedComponent, viewMode, wheelbase, controls]);
  
  useFrame(() => {
    if (!lerpActive.current || !targetPos.current || !targetLookAt.current) return;
    
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (elapsed > 1.2) {
      lerpActive.current = false;
      if (controls) {
        (controls as any).enabled = true;
      }
      return;
    }
    
    camera.position.lerp(targetPos.current, 0.08);
    
    if (controls) {
      const ctrl = controls as any;
      const currentTarget = new THREE.Vector3().copy(ctrl.target);
      currentTarget.lerp(targetLookAt.current, 0.08);
      ctrl.target.copy(currentTarget);
      ctrl.update();
    }
  });
  
  return null;
}

// ─── Component: Procedural Engine ───────────────────────────────────────────
function EngineBlock({
  type,
  focused,
  clearanceOffset,
  dZ,
}: {
  type: "V6" | "V8" | "V12" | "EV Motor";
  focused: boolean;
  clearanceOffset: number;
  dZ: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const lastType = useRef(type);

  useEffect(() => {
    if (type !== lastType.current) {
      lastType.current = type;
      if (groupRef.current) {
        groupRef.current.position.x = 2.0; // slide-in from right
      }
    }
  }, [type]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, 0.1);
    }
  });

  const blockLength = type === "V6" ? 0.75 : type === "V8" ? 1.05 : type === "V12" ? 1.35 : 0.5;
  const cylinderCount = type === "V6" ? 6 : type === "V8" ? 8 : type === "V12" ? 12 : 0;

  // Render EV Motor
  if (type === "EV Motor") {
    return (
      <group ref={groupRef} position={[0, 0.6 + clearanceOffset, 1.7 + dZ / 2]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.5, 32]} />
          <meshStandardMaterial
            color={focused ? "#38bdf8" : "#0284c7"}
            emissive={focused ? "#00f0ff" : "#0066ff"}
            emissiveIntensity={focused ? 2.5 : 1.0}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        {/* High voltage cables */}
        <mesh position={[0.1, 0.1, -0.2]} rotation={[Math.PI / 4, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color="#f97316" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[-0.1, 0.1, -0.2]} rotation={[Math.PI / 4, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color="#f97316" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  // Render V Engine (V6/V8/V12)
  const cylinders = [];
  const rows = cylinderCount / 2;
  const spacing = blockLength / (rows + 1);

  for (let r = 0; r < rows; r++) {
    const zOffset = -blockLength / 2 + (r + 1) * spacing;
    // Left bank (+x, angled)
    cylinders.push(
      <mesh
        key={`cyl-L-${r}`}
        position={[0.16, 0.16, zOffset]}
        rotation={[0, 0, -Math.PI / 6]}
      >
        <cylinderGeometry args={[0.065, 0.065, 0.2, 16]} />
        <meshStandardMaterial color="#c0c5cc" metalness={0.9} roughness={0.05} />
      </mesh>
    );
    // Right bank (-x, angled)
    cylinders.push(
      <mesh
        key={`cyl-R-${r}`}
        position={[-0.16, 0.16, zOffset]}
        rotation={[0, 0, Math.PI / 6]}
      >
        <cylinderGeometry args={[0.065, 0.065, 0.2, 16]} />
        <meshStandardMaterial color="#c0c5cc" metalness={0.9} roughness={0.05} />
      </mesh>
    );
  }

  return (
    <group ref={groupRef} position={[0, 0.65 + clearanceOffset, 1.7 + dZ / 2]}>
      {/* Main engine block */}
      <mesh>
        <boxGeometry args={[0.42, 0.38, blockLength]} />
        <meshStandardMaterial
          color={focused ? "#ef4444" : "#4b5563"}
          emissive={focused ? "#b91c1c" : "#000000"}
          emissiveIntensity={focused ? 1.5 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Oil filter or details */}
      <mesh position={[0.2, -0.1, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.12, 12]} />
        <meshStandardMaterial color="#eab308" metalness={0.5} roughness={0.3} />
      </mesh>
      {cylinders}
    </group>
  );
}

// ─── Component: Procedural Battery Pack ────────────────────────────────────
function BatteryPack({
  capacity,
  powertrain,
  focused,
  clearanceOffset,
  dZ,
}: {
  capacity: number;
  powertrain: "EV" | "Hybrid" | "Petrol" | "Diesel";
  focused: boolean;
  clearanceOffset: number;
  dZ: number;
}) {
  const pulseRef = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame((state) => {
    if (pulseRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.getElapsedTime() * 4);
      pulseRef.current.emissiveIntensity = (focused ? 2.5 : 1.0) * pulse;
    }
  });

  if (powertrain !== "EV" && powertrain !== "Hybrid") return null;

  // Sizing battery by capacity
  const width = capacity === 75 ? 0.95 : capacity === 100 ? 1.15 : 1.3;
  const length = capacity === 75 ? 1.6 : capacity === 100 ? 2.0 : 2.4;
  const thickness = capacity === 75 ? 0.11 : capacity === 100 ? 0.14 : 0.17;

  return (
    <group position={[0, 0.28 + clearanceOffset, 0.25]}>
      {/* Outer casing */}
      <mesh>
        <boxGeometry args={[width, thickness, length]} />
        <meshStandardMaterial
          color={focused ? "#10b981" : "#1f2937"}
          transparent
          opacity={0.85}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
      {/* Glowing Cell Segments */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[width - 0.08, thickness - 0.02, length - 0.08]} />
        <meshStandardMaterial
          ref={pulseRef}
          color="#059669"
          emissive="#10b981"
          emissiveIntensity={1.0}
          wireframe
        />
      </mesh>
    </group>
  );
}

// ─── Component: Procedural Chassis Frame ───────────────────────────────────
function ChassisFrame({
  wheelbase,
  focused,
  clearanceOffset,
}: {
  wheelbase: number;
  focused: boolean;
  clearanceOffset: number;
}) {
  const dZ = ((wheelbase / 2900) - 1) * 1.2;
  const startZ = -2.1 - dZ / 2;
  const endZ = 2.4 + dZ / 2;
  const length = endZ - startZ;
  const chassisZ = startZ + length / 2;

  return (
    <group position={[0, 0.3 + clearanceOffset, chassisZ]}>
      {/* Left rail (optimized to use static geometry scale instead of recreating geometry) */}
      <mesh position={[-0.52, 0, 0]} scale={[1, 1, length]}>
        <boxGeometry args={[0.06, 0.06, 1]} />
        <meshStandardMaterial
          color={focused ? "#f97316" : "#ea580c"}
          emissive={focused ? "#f97316" : "#c2410c"}
          emissiveIntensity={focused ? 1.8 : 0.4}
        />
      </mesh>
      {/* Right rail (optimized to use static geometry scale instead of recreating geometry) */}
      <mesh position={[0.52, 0, 0]} scale={[1, 1, length]}>
        <boxGeometry args={[0.06, 0.06, 1]} />
        <meshStandardMaterial
          color={focused ? "#f97316" : "#ea580c"}
          emissive={focused ? "#f97316" : "#c2410c"}
          emissiveIntensity={focused ? 1.8 : 0.4}
        />
      </mesh>
      {/* Cross members */}
      <mesh position={[0, 0, -length / 2.5]}>
        <boxGeometry args={[1.04, 0.04, 0.06]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.04, 0.04, 0.06]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
      <mesh position={[0, 0, length / 2.5]}>
        <boxGeometry args={[1.04, 0.04, 0.06]} />
        <meshStandardMaterial color="#ea580c" />
      </mesh>
    </group>
  );
}

// ─── Component: Suspension Corners ─────────────────────────────────────────
function SuspensionCorners({
  wheelbase,
  clearanceOffset,
  focused,
}: {
  wheelbase: number;
  clearanceOffset: number;
  focused: boolean;
}) {
  const dZ = ((wheelbase / 2900) - 1) * 1.2;
  const frontZ = 2.24 + dZ / 2;
  const rearZ = -1.74 - dZ / 2;

  const corners = [
    { x: -1.25, z: frontZ },
    { x: 1.25, z: frontZ },
    { x: -1.25, z: rearZ },
    { x: 1.25, z: rearZ },
  ];

  return (
    <group>
      {corners.map((corner, i) => {
        // Shock absorber stretches dynamically
        // Bottom is fixed at hub level (Y = 0.48), top is attached to rising chassis
        const bottomY = 0.48;
        const topY = 0.48 + 0.35 + clearanceOffset;
        const height = topY - bottomY;
        const centerY = bottomY + height / 2;

        return (
          <group key={`strut-${i}`} position={[corner.x, centerY, corner.z]}>
            {/* Outer sleeve (optimized to use static scale instead of recreating geometry) */}
            <mesh position={[0, -height / 4, 0]} scale={[1, height / 2, 1]}>
              <cylinderGeometry args={[0.042, 0.042, 1, 16]} />
              <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Inner sliding rod (optimized to use static scale instead of recreating geometry) */}
            <mesh position={[0, height / 4, 0]} scale={[1, height / 2, 1]}>
              <cylinderGeometry args={[0.018, 0.018, 1, 16]} />
              <meshStandardMaterial color="#e5e7eb" metalness={0.95} roughness={0.05} />
            </mesh>
            {/* Red Coil Spring (optimized to use static scale instead of recreating geometry) */}
            <mesh scale={[1, height - 0.05, 1]}>
              <cylinderGeometry args={[0.062, 0.062, 1, 16, 8]} />
              <meshStandardMaterial
                color={focused ? "#ef4444" : "#dc2626"}
                emissive={focused ? "#ef4444" : "#991b1b"}
                emissiveIntensity={focused ? 1.5 : 0.2}
                wireframe
              />
            </mesh>
            {/* Control arm linkage (chassis to wheel hub) */}
            <mesh
              position={[-corner.x / 4, -height / 2, 0]}
              rotation={[0, 0, corner.x > 0 ? -Math.PI / 12 : Math.PI / 12]}
            >
              <boxGeometry args={[0.45, 0.03, 0.05]} />
              <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ─── Component: Seat Rows ──────────────────────────────────────────────────
function SeatRows({
  seats,
  wheelbase,
  clearanceOffset,
  focused,
}: {
  seats: number;
  wheelbase: number;
  clearanceOffset: number;
  focused: boolean;
}) {
  const dZ = ((wheelbase / 2900) - 1) * 1.2;
  const seatHeight = 0.55 + clearanceOffset;

  const rows: { x: number; z: number }[] = [];

  // Front row (always present)
  rows.push({ x: -0.32, z: 0.7 + dZ / 4 });
  rows.push({ x: 0.32, z: 0.7 + dZ / 4 });

  // Second row (for 4+ seats)
  if (seats >= 4) {
    rows.push({ x: -0.32, z: -0.2 });
    rows.push({ x: 0.32, z: -0.2 });
    if (seats >= 5 && seats !== 6) {
      rows.push({ x: 0.0, z: -0.2 }); // middle seat
    }
  }

  // Third row (for 6+ seats)
  if (seats >= 6) {
    rows.push({ x: -0.32, z: -0.9 - dZ / 3 });
    rows.push({ x: 0.32, z: -0.9 - dZ / 3 });
  }

  return (
    <group>
      {rows.map((seat, i) => (
        <group key={`seat-${i}`} position={[seat.x, seatHeight, seat.z]}>
          {/* Seat cushion */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.34, 0.09, 0.35]} />
            <meshStandardMaterial
              color={focused ? "#fb923c" : "#e4e4e7"}
              emissive={focused ? "#f97316" : "#000000"}
              emissiveIntensity={focused ? 1.0 : 0}
              roughness={0.8}
            />
          </mesh>
          {/* Seat Backrest */}
          <mesh
            castShadow
            receiveShadow
            position={[0, 0.22, -0.15]}
            rotation={[-Math.PI / 18, 0, 0]}
          >
            <boxGeometry args={[0.34, 0.42, 0.08]} />
            <meshStandardMaterial
              color={focused ? "#fb923c" : "#e4e4e7"}
              emissive={focused ? "#f97316" : "#000000"}
              emissiveIntensity={focused ? 1.0 : 0}
              roughness={0.8}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Generic Model component (works for ANY GLB) ────────────────────────────
function VehicleModel({
  modelUrl,
  config,
  viewMode,
  clearanceOffset,
  children,
}: {
  modelUrl: string;
  config: VehicleConfiguration;
  viewMode: "vehicle" | "engineering";
  clearanceOffset: number;
  children?: React.ReactNode;
}) {
  const { scene } = useGLTF(modelUrl);
  const modelRef  = useRef<THREE.Group>(null!);

  // Compute material properties from config
  const roughness  = config.paint_finish === "matte" ? 0.72 : config.paint_finish === "gloss" ? 0.10 : 0.20;
  const metalness  = config.paint_finish === "matte" ? 0.06 : 0.88;
  const clearcoat  = config.paint_finish === "gloss" ? 1.0  : config.paint_finish === "metallic" ? 0.55 : 0.0;
  const glassOpac  = viewMode === "engineering" ? 0.06 : Math.max(0.08, 0.42 - config.window_tint / 130);
  const rimColor   = config.wheel_style === "luxury" ? "#d4bc7a" : config.wheel_style === "offroad" ? "#606666" : "#aeb5be";
  const seatColor  = UPHOLSTERY_COLORS[config.upholstery] ?? "#141418";
  const trimColor  = config.trim_finish === "chrome" ? "#c8cdd5" : config.trim_finish === "body" ? config.color : "#0a0b0e";

  // Cache meshes by role to prevent CPU scene graph traversal overhead during interaction
  useEffect(() => {
    if (!scene) return;
    
    (window as any).debugScene = scene;
    if (scene.userData.isCached) return;

    // 1. Hide original flat/small tire meshes, and add a beautiful 3D Torus rubber tire to all rims
    let tireMat = new THREE.MeshStandardMaterial({
      name: "guma_procedural",
      color: "#151518",
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.frustumCulled = false; // Disable frustum culling to optimize rendering speed
        
        const name = obj.name;
        // Hide only the original flat tires, NOT the procedural ones!
        if (name.includes("Tocak_guma") && !name.includes("procedural")) {
          obj.visible = false;
        }

        if (name.includes("Tocak_felna")) {
          const alreadyHasTire = obj.children.some(child => child.name.includes("guma_procedural"));
          if (!alreadyHasTire) {
            const tireGeom = new THREE.TorusGeometry(1.3, 0.35, 16, 64);
            const tireMesh = new THREE.Mesh(tireGeom, tireMat);
            tireMesh.rotation.x = Math.PI / 2;
            tireMesh.name = name.replace("felna", "guma_procedural");
            obj.add(tireMesh);
          }
        }
      }
    });

    // 2. Clone the Rear Right Rim (Tocak_felna.001) to create the missing Rear Left Rim (Tocak_felna.003)
    let rearRightRim: THREE.Object3D | undefined;
    scene.traverse((obj) => {
      if (obj.name.includes("felna") && (obj.name.includes("001") || obj.name.includes(".001"))) {
        rearRightRim = obj;
      }
    });

    let rearLeftRimExists = false;
    scene.traverse((obj) => {
      if (obj.name.includes("felna") && (obj.name.includes("003") || obj.name.includes(".003"))) {
        rearLeftRimExists = true;
      }
    });
    
    if (rearRightRim && !rearLeftRimExists) {
      const rearLeftRim = rearRightRim.clone();
      rearLeftRim.name = "Tocak_felna.003";
      
      // Mirror X position and flip scale X to face outward without corrupting quaternion
      rearLeftRim.position.x = -rearRightRim.position.x;
      rearLeftRim.position.z = rearRightRim.position.z;
      rearLeftRim.position.y = rearRightRim.position.y;
      rearLeftRim.scale.x = -rearRightRim.scale.x;
      
      scene.add(rearLeftRim);
      console.log("Successfully cloned and added Rear Left wheel robustly:", rearLeftRim.name);
    }

    // 3. Pre-cache all original mesh coordinates immediately before any scaling or translation starts
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.frustumCulled = false;
        
        if (obj.userData.originalPositionZ === undefined) {
          obj.userData.originalPositionZ = obj.position.z;
        }
        if (obj.userData.originalPositionY === undefined) {
          const isLight = obj.name.includes("Svijetlo") || obj.name.includes("Light") || obj.name.includes("Svijetla") || obj.name.includes("zadnje");
          obj.userData.originalPositionY = isLight ? 1.3 : obj.position.y;
        }
        
        const name = obj.name;
        const isWheel = name.includes("Tocak") || name.includes("felna") || name.includes("guma");
        const isLight = name.includes("Svijetlo") || name.includes("Light") || name.includes("Svijetla") || name.includes("zadnje");
        const isSign = name.includes("znak");
        const isMirror = name.includes("retrovizor");
        
        if (!isWheel && !isLight && !isSign && !isMirror) {
          const geom = obj.geometry;
          if (geom && geom.userData.originalPositions === undefined) {
            geom.userData.originalPositions = geom.attributes.position.array.slice();
          }
        }
      }
    });

    // 4. Categorize and cache all meshes for ultra-fast performance
    const wheels: THREE.Mesh[] = [];
    const lights: THREE.Mesh[] = [];
    const signs: THREE.Mesh[] = [];
    const mirrors: THREE.Mesh[] = [];
    const deformable: THREE.Mesh[] = [];
    const allMeshes: THREE.Mesh[] = [];

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        allMeshes.push(obj);
        const name = obj.name;
        const isWheel = name.includes("Tocak") || name.includes("felna") || name.includes("guma");
        const isLight = name.includes("Svijetlo") || name.includes("Light") || name.includes("Svijetla") || name.includes("zadnje");
        const isSign = name.includes("znak");
        const isMirror = name.includes("retrovizor");

        if (isWheel) wheels.push(obj);
        else if (isLight) lights.push(obj);
        else if (isSign) signs.push(obj);
        else if (isMirror) mirrors.push(obj);
        else deformable.push(obj);
      }
    });

    scene.userData.wheels = wheels;
    scene.userData.lights = lights;
    scene.userData.signs = signs;
    scene.userData.mirrors = mirrors;
    scene.userData.deformable = deformable;
    scene.userData.allMeshes = allMeshes;
    scene.userData.isCached = true;
  }, [scene]);

  // 1. Material transformation
  useEffect(() => {
    if (!scene) return;

    const meshes: THREE.Mesh[] = scene.userData.allMeshes || [];
    if (meshes.length === 0) {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) meshes.push(obj);
      });
    }

    meshes.forEach((obj) => {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];

      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial)) return;
        const name = mat.name;

        // Save original configurations if not saved yet
        if (mat.userData.originalOpacity === undefined) {
          mat.userData.originalOpacity = mat.opacity;
          mat.userData.originalTransparent = mat.transparent;
          mat.userData.originalDepthWrite = mat.depthWrite;
          mat.userData.originalRoughness = mat.roughness;
          mat.userData.originalMetalness = mat.metalness;
          if (mat instanceof THREE.MeshPhysicalMaterial) {
            mat.userData.originalClearcoat = mat.clearcoat;
          }
        }

        if (viewMode === "engineering") {
          // Semi-transparent hologram look
          mat.transparent = true;
          mat.depthWrite = false;
          
          // Reduce reflection & metallic shine to allow seeing the interior clearly
          mat.roughness = 0.95;
          mat.metalness = 0.05;
          if (mat instanceof THREE.MeshPhysicalMaterial) {
            mat.clearcoat = 0.0;
          }
          
          if (BODY_MATS.includes(name)) {
            mat.color.set(config.color);
            mat.opacity = 0.04;
          } else if (RIM_MATS.includes(name)) {
            mat.color.set(rimColor);
            mat.opacity = 0.05;
          } else if (GLASS_MATS.includes(name)) {
            mat.opacity = 0.01;
          } else if (SEAT_MATS.includes(name)) {
            // Hide seats inside GLB so our procedural ones look clean
            mat.opacity = 0.0;
          } else if (TIRE_MATS.includes(name) || name.includes("guma_procedural")) {
            mat.color.set("#151518");
            mat.opacity = 0.05;
          } else if (BLACK_MATS.includes(name)) {
            mat.opacity = 0.03;
          } else {
            mat.opacity = 0.03;
          }
          mat.needsUpdate = true;
        } else {
          // Restore original opaque properties
          mat.transparent = mat.userData.originalTransparent ?? false;
          mat.depthWrite = mat.userData.originalDepthWrite ?? true;
          
          if (BODY_MATS.includes(name)) {
            const m = mat as THREE.MeshPhysicalMaterial;
            m.color.set(config.color);
            m.opacity = mat.userData.originalOpacity ?? 1.0;
            m.roughness  = roughness;
            m.metalness  = metalness;
            m.clearcoat = clearcoat;
          } else if (RIM_MATS.includes(name)) {
            mat.color.set(rimColor);
            mat.opacity = mat.userData.originalOpacity ?? 1.0;
            mat.roughness = mat.userData.originalRoughness ?? 0.5;
            mat.metalness = mat.userData.originalMetalness ?? 0.5;
            if (mat instanceof THREE.MeshPhysicalMaterial) {
              mat.clearcoat = mat.userData.originalClearcoat ?? 0.0;
            }
          } else if (TIRE_MATS.includes(name) || name.includes("guma_procedural")) {
            mat.color.set("#151518");
            mat.opacity = 1.0;
            mat.roughness = 0.9;
            mat.metalness = 0.05;
          } else if (GLASS_MATS.includes(name)) {
            mat.transparent = true;
            mat.opacity = glassOpac;
            mat.roughness = mat.userData.originalRoughness ?? 0.1;
            mat.metalness = mat.userData.originalMetalness ?? 0.1;
            if (mat instanceof THREE.MeshPhysicalMaterial) {
              mat.clearcoat = mat.userData.originalClearcoat ?? 1.0;
            }
          } else if (SEAT_MATS.includes(name)) {
            mat.color.set(seatColor);
            mat.opacity = mat.userData.originalOpacity ?? 1.0;
            mat.roughness = mat.userData.originalRoughness ?? 0.8;
            mat.metalness = mat.userData.originalMetalness ?? 0.0;
            if (mat instanceof THREE.MeshPhysicalMaterial) {
              mat.clearcoat = mat.userData.originalClearcoat ?? 0.0;
            }
          } else if (name === "Dzip_znak") {
            mat.color.set(trimColor);
            mat.opacity = mat.userData.originalOpacity ?? 1.0;
            mat.roughness = mat.userData.originalRoughness ?? 0.2;
            mat.metalness = mat.userData.originalMetalness ?? 0.8;
            if (mat instanceof THREE.MeshPhysicalMaterial) {
              mat.clearcoat = mat.userData.originalClearcoat ?? 0.0;
            }
          } else {
            mat.opacity = mat.userData.originalOpacity ?? 1.0;
            mat.roughness = mat.userData.originalRoughness ?? 0.5;
            mat.metalness = mat.userData.originalMetalness ?? 0.5;
            if (mat instanceof THREE.MeshPhysicalMaterial) {
              mat.clearcoat = mat.userData.originalClearcoat ?? 0.0;
            }
          }
          mat.needsUpdate = true;
        }
      });
    });
  }, [scene, config.color, viewMode, roughness, metalness, clearcoat, glassOpac, rimColor, seatColor, trimColor]);

  // ─── Generic material fallback (for non-Range Rover models) ────────────────
  // Applies body color to all meshes that aren't glass / wheel / seat
  useEffect(() => {
    if (!scene) return;
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name.toLowerCase();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial)) return;
        const matName = mat.name.toLowerCase();
        // Only apply generic logic if NOT a named Range Rover material
        const isNamedRoverMat = [...BODY_MATS, ...RIM_MATS, ...GLASS_MATS, ...SEAT_MATS, ...BLACK_MATS, ...TIRE_MATS].includes(mat.name);
        if (isNamedRoverMat) return;

        if (isGlassMesh(name, matName)) {
          mat.transparent = true;
          mat.opacity = viewMode === "engineering" ? 0.01 : glassOpac;
          mat.roughness = 0.05;
          mat.needsUpdate = true;
        } else if (isWheelMesh(name, matName)) {
          mat.opacity = viewMode === "engineering" ? 0.04 : 1.0;
          mat.transparent = viewMode === "engineering";
          mat.needsUpdate = true;
        } else if (isSeatMesh(name, matName)) {
          mat.color.set(seatColor);
          mat.opacity = viewMode === "engineering" ? 0.0 : 1.0;
          mat.transparent = viewMode === "engineering";
          mat.needsUpdate = true;
        } else {
          // Treat as body paint
          mat.color.set(config.color);
          mat.roughness  = viewMode === "engineering" ? 0.95 : roughness;
          mat.metalness  = viewMode === "engineering" ? 0.05 : metalness;
          mat.transparent = viewMode === "engineering";
          mat.opacity = viewMode === "engineering" ? 0.04 : 1.0;
          if (mat instanceof THREE.MeshPhysicalMaterial) {
            mat.clearcoat = viewMode === "engineering" ? 0 : clearcoat;
          }
          mat.needsUpdate = true;
        }
      });
    });
  }, [scene, config.color, viewMode, roughness, metalness, clearcoat, glassOpac, seatColor]);

  // Center model and set static details
  useEffect(() => {
    if (!scene || !modelRef.current) return;
    
    if (scene.userData.isCentered === undefined) {
      const box    = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      scene.userData.originalScale = 2.8 / maxDim;
      scene.userData.originalCenter = [
        -center.x * scene.userData.originalScale,
        -center.y * scene.userData.originalScale,
        -center.z * scene.userData.originalScale
      ];
      scene.userData.isCentered = true;
    }

    const scale = scene.userData.originalScale;
    const center = scene.userData.originalCenter;
    
    scene.position.set(center[0], center[1], center[2]);
    modelRef.current.scale.setScalar(scale);

    if (scene.userData.minY === undefined) {
      const newBox  = new THREE.Box3().setFromObject(modelRef.current);
      scene.userData.minY = newBox.min.y;
    }
    modelRef.current.position.y = -scene.userData.minY;
  }, [scene]);

  // 2. Realistic wheelbase stretching in useEffect
  useEffect(() => {
    if (!scene) return;

    const dZ = ((config.wheelbase / 2900) - 1) * 1.2;
    const wheels = (scene.userData.wheels || []) as THREE.Mesh[];
    const lights = (scene.userData.lights || []) as THREE.Mesh[];
    const signs = (scene.userData.signs || []) as THREE.Mesh[];
    const mirrors = (scene.userData.mirrors || []) as THREE.Mesh[];
    const deformable = (scene.userData.deformable || []) as THREE.Mesh[];

    const rigidGroup = [...wheels, ...lights, ...signs, ...mirrors];

    if (rigidGroup.length > 0) {
      rigidGroup.forEach((obj) => {
        if (obj.userData.originalPositionZ === undefined) {
          obj.userData.originalPositionZ = obj.position.z;
        }
        const origZ = obj.userData.originalPositionZ;
        if (origZ > 0.5) {
          obj.position.z = origZ + dZ / 2;
        } else if (origZ < -0.5) {
          obj.position.z = origZ - dZ / 2;
        }
      });
      
      deformable.forEach((obj) => {
        const geom = obj.geometry;
        if (geom.userData.originalPositions === undefined) {
          geom.userData.originalPositions = geom.attributes.position.array.slice();
        }
        const orig = geom.userData.originalPositions;
        const posAttr = geom.attributes.position;
        const arr = posAttr.array as Float32Array;

        const frontLimit = 0.8;
        const rearLimit = -0.8;
        const cabinLength = frontLimit - rearLimit;

        const scaleZ = obj.scale.z || 1.0;
        const posZ = obj.position.z;

        for (let i = 2; i < arr.length; i += 3) {
          const zLocal = orig[i];
          const zCar = zLocal * scaleZ + posZ;

          let zCarNew = zCar;
          if (zCar > frontLimit) {
            zCarNew = zCar + dZ / 2;
          } else if (zCar < rearLimit) {
            zCarNew = zCar - dZ / 2;
          } else {
            const t = (zCar - rearLimit) / cabinLength;
            const newRear = rearLimit - dZ / 2;
            const newFront = frontLimit + dZ / 2;
            zCarNew = newRear + t * (newFront - newRear);
          }
          
          arr[i] = (zCarNew - posZ) / scaleZ;
        }
        posAttr.needsUpdate = true;
      });
    } else {
      // Fallback traverse
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const name = obj.name;
          const isWheel = name.includes("Tocak") || name.includes("felna") || name.includes("guma");
          const isLight = name.includes("Svijetlo") || name.includes("Light") || name.includes("Svijetla") || name.includes("zadnje");
          const isSign = name.includes("znak");
          const isMirror = name.includes("retrovizor");

          if (isWheel || isLight || isSign || isMirror) {
            if (obj.userData.originalPositionZ === undefined) {
              obj.userData.originalPositionZ = obj.position.z;
            }
            const origZ = obj.userData.originalPositionZ;
            if (origZ > 0.5) {
              obj.position.z = origZ + dZ / 2;
            } else if (origZ < -0.5) {
              obj.position.z = origZ - dZ / 2;
            }
          } else {
            const geom = obj.geometry;
            if (geom.userData.originalPositions === undefined) {
              geom.userData.originalPositions = geom.attributes.position.array.slice();
            }
            const orig = geom.userData.originalPositions;
            const posAttr = geom.attributes.position;
            const arr = posAttr.array as Float32Array;

            const frontLimit = 0.8;
            const rearLimit = -0.8;
            const cabinLength = frontLimit - rearLimit;

            const scaleZ = obj.scale.z || 1.0;
            const posZ = obj.position.z;

            for (let i = 2; i < arr.length; i += 3) {
              const zLocal = orig[i];
              const zCar = zLocal * scaleZ + posZ;

              let zCarNew = zCar;
              if (zCar > frontLimit) {
                zCarNew = zCar + dZ / 2;
              } else if (zCar < rearLimit) {
                zCarNew = zCar - dZ / 2;
              } else {
                const t = (zCar - rearLimit) / cabinLength;
                const newRear = rearLimit - dZ / 2;
                const newFront = frontLimit + dZ / 2;
                zCarNew = newRear + t * (newFront - newRear);
              }
              
              arr[i] = (zCarNew - posZ) / scaleZ;
            }
            posAttr.needsUpdate = true;
          }
        }
      });
    }
  }, [scene, config.wheelbase]);

  // Raise entire model body according to ground clearance (only the body group, not wheels)
  useEffect(() => {
    if (!modelRef.current || !scene) return;
    
    const wheels = (scene.userData.wheels || []) as THREE.Mesh[];
    const allMeshes = (scene.userData.allMeshes || []) as THREE.Mesh[];

    if (allMeshes.length > 0) {
      allMeshes.forEach((obj) => {
        const name = obj.name;
        const isWheel = wheels.includes(obj);
        const isLight = name.includes("Svijetlo") || name.includes("Light") || name.includes("Svijetla") || name.includes("zadnje");

        if (obj.userData.originalPositionY === undefined) {
          obj.userData.originalPositionY = isLight ? 1.3 : obj.position.y;
        }

        if (isWheel) {
          obj.position.y = obj.userData.originalPositionY;
        } else {
          obj.position.y = obj.userData.originalPositionY + clearanceOffset;
        }
      });
    } else {
      // Fallback traverse
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const name = obj.name;
          const isWheel = name.includes("Tocak") || name.includes("felna") || name.includes("guma");
          const isLight = name.includes("Svijetlo") || name.includes("Light") || name.includes("Svijetla") || name.includes("zadnje");
          
          if (obj.userData.originalPositionY === undefined) {
            obj.userData.originalPositionY = isLight ? 1.3 : obj.position.y;
          }

          if (isWheel) {
            obj.position.y = obj.userData.originalPositionY;
          } else {
            obj.position.y = obj.userData.originalPositionY + clearanceOffset;
          }
        }
      });
    }
  }, [scene, clearanceOffset]);

  return (
    <group ref={modelRef} castShadow receiveShadow>
      <primitive object={scene} />
      {scene && (
        <group position={scene.position}>
          {children}
        </group>
      )}
    </group>
  );
}

useGLTF.preload("/models/range-rover-suv.glb");
useGLTF.preload("/models/mahindra-thar.glb");
useGLTF.preload("/models/mercedes-amg.glb");
useGLTF.preload("/models/chevy-suv.glb");

// ─── Loading placeholder ─────────────────────────────────────────────────────
function Loader() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[3, 1.2, 5.5]} />
      <meshStandardMaterial color="#1a2030" wireframe />
    </mesh>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────
type EnvName = "studio" | "sunset" | "night";
const ENV_MAP: Record<string, EnvName> = {
  studio: "studio",
  sunset: "sunset",
  night:  "night",
};

const ENV_BG: Record<string, string> = {
  studio: "#05070c",
  sunset: "#110705",
  night:  "#010204",
};

export const VehicleScene = memo(function VehicleScene({
  model = "/models/range-rover-suv.glb",
  config,
  environment = "studio",
  cameraView  = "3/4",
  viewMode = "vehicle",
  focusedComponent = "",
}: {
  model?:       string;
  config:       VehicleConfiguration;
  environment?: string;
  cameraView?:  string;
  viewMode?:    "vehicle" | "engineering";
  focusedComponent?: string;
}) {
  const env = ENV_MAP[environment] ?? "studio";
  const bg  = ENV_BG[environment]  ?? "#05070c";

  const fillColor =
    env === "night"  ? "#2040b0" :
    env === "sunset" ? "#ff4020" :
    "#3a60d0";

  // Calculate clearance offset (standard is 170mm, maps to 0 offset)
  const clearanceOffset = (config.ground_clearance - 170) / 1000;
  const dZ = ((config.wheelbase / 2900) - 1) * 1.2;

  return (
    <Canvas
      shadows
      camera={{ position: [4.6, 2.0, 5.0], fov: 32 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
    >
      <color attach="background" args={[bg]} />

      {/* Lighting */}
      <ambientLight intensity={env === "night" ? 0.12 : 0.3} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={env === "night" ? 2.0 : 3.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      <directionalLight
        position={[-6, 3, -4]}
        intensity={env === "sunset" ? 1.0 : 0.8}
        color={env === "sunset" ? "#ffb066" : "#6f7aa6"}
      />
      <directionalLight
        position={[-3, 2, 6]}
        intensity={env === "night" ? 0.8 : 1.2}
        color={fillColor}
      />

      {/* Underhood blue highlight light when in Engineering Mode */}
      {viewMode === "engineering" && (
        <pointLight
          position={[0, 0.7 + clearanceOffset, 1.7 + dZ / 2]}
          intensity={3.5}
          distance={1.8}
          color="#00a2ff"
        />
      )}

      {/* Ground disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial
          color={env === "studio" ? "#11141d" : env === "sunset" ? "#2a1c1e" : "#05070a"}
          roughness={0.95}
        />
      </mesh>

      {/* Real 3D model */}
      <Suspense fallback={<Loader />}>
        <VehicleModel
          modelUrl={model}
          config={config}
          viewMode={viewMode}
          clearanceOffset={clearanceOffset}
        >
          {/* Procedural Components */}
          {viewMode === "engineering" && (
            <group>
              <EngineBlock
                type={config.engine_type}
                focused={focusedComponent === "Engine"}
                clearanceOffset={clearanceOffset}
                dZ={dZ}
              />
              <BatteryPack
                capacity={config.battery_capacity}
                powertrain={config.powertrain}
                focused={focusedComponent === "Battery"}
                clearanceOffset={clearanceOffset}
                dZ={dZ}
              />
              <ChassisFrame
                wheelbase={config.wheelbase}
                focused={focusedComponent === "Chassis"}
                clearanceOffset={clearanceOffset}
              />
              <SuspensionCorners
                wheelbase={config.wheelbase}
                clearanceOffset={clearanceOffset}
                focused={focusedComponent === "Suspension"}
              />
              <SeatRows
                seats={config.seats}
                wheelbase={config.wheelbase}
                clearanceOffset={clearanceOffset}
                focused={focusedComponent === "Seating"}
              />
            </group>
          )}
        </VehicleModel>
      </Suspense>

      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={env === "night" ? 0.45 : 0.65}
        scale={14}
        blur={2.2}
        far={5}
      />

      <Environment preset={env} />

      {/* Ground grid */}
      <Grid
        position={[0, 0.005, 0]}
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.3}
        cellColor={env === "night" ? "#142240" : "#171d2b"}
        sectionSize={4}
        sectionThickness={0.7}
        sectionColor={env === "night" ? "#1c2850" : "#20283c"}
        fadeDistance={18}
        fadeStrength={1.2}
        followCamera={false}
        infiniteGrid
      />

      {/* Fly-camera controller */}
      <CameraController
        viewMode={viewMode}
        focusedComponent={focusedComponent}
        wheelbase={config.wheelbase}
      />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={14}
        maxPolarAngle={Math.PI * 0.49}
        target={[0, 0.55, 0]}
      />
    </Canvas>
  );
});
