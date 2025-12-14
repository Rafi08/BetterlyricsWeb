import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const VertexShader = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const FragmentShader = `
uniform float Time;
uniform sampler2D BlurredCoverArt;

uniform vec2 BackgroundCircleOrigin;
uniform float BackgroundCircleRadius;

uniform vec2 LeftCircleOrigin;
uniform float LeftCircleRadius;

uniform vec2 RightCircleOrigin;
uniform float RightCircleRadius;

const vec2 rotateCenter = vec2(0.5, 0.5);
vec2 RotateAroundCenter(vec2 point, float angle) {
  vec2 offset = (point - rotateCenter);

  float s = sin(angle);
  float c = cos(angle);
  mat2 rotation = mat2(c, -s, s, c);
  offset = (rotation * offset);

  return (rotateCenter + offset);
}

const vec4 DefaultColor = vec4(0.0, 0.0, 0.0, 0.0);
void main() {
  gl_FragColor = DefaultColor;

  vec2 BackgroundCircleOffset = (gl_FragCoord.xy - BackgroundCircleOrigin);
  if (length(BackgroundCircleOffset) <= BackgroundCircleRadius) {
    gl_FragColor = texture2D(
      BlurredCoverArt,
      RotateAroundCenter(
        (((BackgroundCircleOffset / BackgroundCircleRadius) + 1.0) * 0.5),
        (Time * -0.25)
      )
    );
    gl_FragColor.a = 1.0;
  }

  vec2 LeftCircleOffset = (gl_FragCoord.xy - LeftCircleOrigin);
  if (length(LeftCircleOffset) <= LeftCircleRadius) {
    vec4 newColor = texture2D(
      BlurredCoverArt,
      RotateAroundCenter(
        (((LeftCircleOffset / LeftCircleRadius) + 1.0) * 0.5),
        (Time * 1.0)
      )
    );
    newColor.a *= 0.5;

    gl_FragColor.rgb = ((newColor.rgb * newColor.a) + (gl_FragColor.rgb * (1.0 - newColor.a)));
    gl_FragColor.a = (newColor.a + (gl_FragColor.a * (1.0 - newColor.a)));
  }

  vec2 RightCircleOffset = (gl_FragCoord.xy - RightCircleOrigin);
  if (length(RightCircleOffset) <= RightCircleRadius) {
    vec4 newColor = texture2D(
      BlurredCoverArt,
      RotateAroundCenter(
        (((RightCircleOffset / RightCircleRadius) + 1.0) * 0.5),
        (Time * -0.75)
      )
    );
    newColor.a *= 0.5;

    gl_FragColor.rgb = ((newColor.rgb * newColor.a) + (gl_FragColor.rgb * (1.0 - newColor.a)));
    gl_FragColor.a = (newColor.a + (gl_FragColor.a * (1.0 - newColor.a)));
  }
}
`;

const BackgroundMesh = ({ texture }: { texture: THREE.Texture | null }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  const uniforms = useMemo(() => ({
    Time: { value: 0 },
    BlurredCoverArt: { value: null },
    BackgroundCircleOrigin: { value: new THREE.Vector2() },
    BackgroundCircleRadius: { value: 0 },
    LeftCircleOrigin: { value: new THREE.Vector2() },
    LeftCircleRadius: { value: 0 },
    RightCircleOrigin: { value: new THREE.Vector2() },
    RightCircleRadius: { value: 0 },
  }), []);

  // Update uniforms on resize
  useEffect(() => {
    const { width, height } = size;
    const dpr = window.devicePixelRatio;
    const w = width * dpr;
    const h = height * dpr;

    const largestAxisSize = Math.max(w, h);

    // Background circle
    uniforms.BackgroundCircleOrigin.value.set(w / 2, h / 2);
    uniforms.BackgroundCircleRadius.value = largestAxisSize * 1.4;

    // Left circle
    uniforms.LeftCircleOrigin.value.set(w * 0.2, h * 0.8);
    uniforms.LeftCircleRadius.value = largestAxisSize * 0.6;

    // Right circle 
    uniforms.RightCircleOrigin.value.set(w * 0.8, h * 0.2);
    uniforms.RightCircleRadius.value = largestAxisSize * 0.6;

  }, [size, uniforms]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.Time.value = state.clock.elapsedTime / 3.5;
      if (texture) {
        materialRef.current.uniforms.BlurredCoverArt.value = texture;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VertexShader}
        fragmentShader={FragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
};

interface BackgroundProps {
  coverArt?: string;
}

const Background: React.FC<BackgroundProps> = ({ coverArt }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!coverArt) return;

    const generateBlur = async () => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = coverArt;
      await img.decode();

      const originalSize = Math.min(img.width, img.height);
      const blurExtent = 120; // 3 * 40

      const canvas = document.createElement('canvas');
      canvas.width = originalSize;
      canvas.height = originalSize;
      const ctx = canvas.getContext('2d')!;

      // Clip circle
      ctx.beginPath();
      ctx.arc(originalSize / 2, originalSize / 2, originalSize / 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw image centered
      ctx.drawImage(img, (img.width - originalSize) / 2, (img.height - originalSize) / 2, originalSize, originalSize, 0, 0, originalSize, originalSize);

      // Second pass: blur
      const expandedSize = originalSize + blurExtent * 1.5;
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = expandedSize;
      blurCanvas.height = expandedSize;
      const blurCtx = blurCanvas.getContext('2d')!;

      blurCtx.filter = `blur(40px)`;
      blurCtx.drawImage(canvas, blurExtent / 2, blurExtent / 2);

      const tex = new THREE.CanvasTexture(blurCanvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      setTexture(tex);
    };

    generateBlur();
  }, [coverArt]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
      <Canvas orthographic camera={{ zoom: 1, position: [0, 0, 1] }} dpr={window.devicePixelRatio}>
        <BackgroundMesh texture={texture} />
      </Canvas>
      {/* Overlay Blur to remove sharp edges/artifacts */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backdropFilter: 'blur(100px) brightness(0.6) saturate(1.5)', // Heavy blur + darken + saturate
        WebkitBackdropFilter: 'blur(100px) brightness(0.6) saturate(1.5)', // Safari support
        zIndex: 1
      }} />
    </div>
  );
};

export default Background;
