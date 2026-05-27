import React, { useRef, useEffect } from "react";
import * as THREE from "three";

/**
 * GenerativeArtScene
 * Props:
 *   isThinking: bool — when true the orb pulses faster and glows brighter
 */
export function GenerativeArtScene({ isThinking = false }) {
  const mountRef = useRef(null);
  const isThinkingRef = useRef(isThinking);

  // Keep ref in sync without restarting the whole effect
  useEffect(() => {
    isThinkingRef.current = isThinking;
  }, [isThinking]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(1.2, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time:           { value: 0 },
        pointLightPos:  { value: new THREE.Vector3(0, 0, 5) },
        color:          { value: new THREE.Color(0xd4d4d8) },
        pulseIntensity: { value: 0.0 },
      },
      vertexShader: `
        uniform float time;
        uniform float pulseIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;

        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g  = step(x0.yzx, x0.xyz);
          vec3 l  = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x  = x_ * ns.x + ns.yyyy;
          vec4 y  = y_ * ns.x + ns.yyyy;
          vec4 h  = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          vec4 s0 = floor(b0)*2.0+1.0;
          vec4 s1 = floor(b1)*2.0+1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vNormal   = normal;
          vPosition = position;
          // base noise + extra turbulence when AI is thinking
          float speed     = 0.5 + pulseIntensity * 2.5;
          float amplitude = 0.2 + pulseIntensity * 0.35;
          float displacement = snoise(position * 2.0 + time * speed) * amplitude;
          vec3 newPosition = position + normal * displacement;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 pointLightPos;
        uniform float pulseIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vec3 n        = normalize(vNormal);
          vec3 lightDir = normalize(pointLightPos - vPosition);
          float diffuse = max(dot(n, lightDir), 0.0);

          // Fresnel glow
          float fresnel = 1.0 - dot(n, vec3(0.0, 0.0, 1.0));
          fresnel = pow(fresnel, 2.0);

          // Extra rim brightness when thinking
          float glowBoost = 1.0 + pulseIntensity * 1.8;
          vec3 finalColor = color * diffuse + color * fresnel * 0.5 * glowBoost;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Smooth lerp target for pulseIntensity
    let currentPulse = 0;

    let frameId;
    const animate = (t) => {
      const targetPulse = isThinkingRef.current ? 1.0 : 0.0;
      currentPulse += (targetPulse - currentPulse) * 0.04; // smooth transition

      material.uniforms.time.value = t * 0.0003;
      material.uniforms.pulseIntensity.value = currentPulse;

      // Spin faster when thinking
      const rotSpeed = 0.0005 + currentPulse * 0.004;
      mesh.rotation.y += rotSpeed;
      mesh.rotation.x += rotSpeed * 0.4;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate(0);

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    const handleMouseMove = (e) => {
      const rect = currentMount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const vec = new THREE.Vector3(x, y, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const dist = -camera.position.z / dir.z;
      const pos = camera.position.clone().add(dir.multiplyScalar(dist));
      pointLight.position.copy(pos);
      material.uniforms.pointLightPos.value = pos;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 cursor-default" />;
}
