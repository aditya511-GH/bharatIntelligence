"use client";
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Line } from "@react-three/drei";
import * as THREE from "three";

function NetworkNodes() {
    const pointsRef = useRef<THREE.Points>(null);
    const linesRef = useRef<THREE.Group>(null);

    const { positions, linePoints } = useMemo(() => {
        const count = 120;
        const positions = new Float32Array(count * 3);
        const nodes: [number, number, number][] = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 14;
            const y = (Math.random() - 0.5) * 8;
            const z = (Math.random() - 0.5) * 6;
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            nodes.push([x, y, z]);
        }
        const linePoints: [number, number, number][][] = [];
        for (let i = 0; i < 40; i++) {
            const a = nodes[Math.floor(Math.random() * count)];
            const b = nodes[Math.floor(Math.random() * count)];
            if (Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) < 4) {
                linePoints.push([a, b]);
            }
        }
        return { positions, linePoints };
    }, []);

    useFrame((_, delta) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y += delta * 0.04;
            pointsRef.current.rotation.x += delta * 0.02;
        }
        if (linesRef.current) {
            linesRef.current.rotation.y += delta * 0.04;
            linesRef.current.rotation.x += delta * 0.02;
        }
    });

    return (
        <>
            <Points ref={pointsRef} positions={positions} stride={3}>
                <PointMaterial size={0.06} color="#42A5F5" sizeAttenuation transparent opacity={0.8} />
            </Points>
            <group ref={linesRef}>
                {linePoints.map((pts, i) => (
                    <Line
                        key={i}
                        points={pts}
                        color={i % 3 === 0 ? "#4DB6AC" : "#1E88E5"}
                        lineWidth={0.5}
                        transparent
                        opacity={0.25}
                    />
                ))}
            </group>
        </>
    );
}

export default function Hero3D() {
    return (
        <Canvas
            camera={{ position: [0, 0, 8], fov: 60 }}
            style={{ position: "absolute", inset: 0, zIndex: 0 }}
            gl={{ antialias: true, alpha: true }}
        >
            <ambientLight intensity={0.5} />
            <NetworkNodes />
        </Canvas>
    );
}
