
// Vertex Shader - Improved for terrain displacement
export const axiomVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying vec3 vNormal;

// Simplex Noise Function needed in Vertex for displacement
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vUv = uv;
  vec3 pos = position;
  
  // Gentle displacement
  float elevation = snoise(pos.xz * 0.02) * 2.0;
  elevation += snoise(pos.xz * 0.1) * 0.5;
  
  pos.y += elevation;
  vPosition = pos;
  vElevation = elevation;
  vNormal = normal;

  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`;

// Fragment Shader - High-Fidelity with fixes for "Brown Glitch"
export const axiomFragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying vec3 vNormal;

uniform float uTime;
uniform vec3 uColorA; // Deep
uniform vec3 uColorB; // High
uniform vec3 uGridColor;
uniform float uGridSize;

// Re-declare noise for fragment detail
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  // Grid Logic
  vec2 grid = abs(fract(vPosition.xz * uGridSize - 0.5) - 0.5) / fwidth(vPosition.xz * uGridSize);
  float line = min(grid.x, grid.y);
  float gridPattern = 1.0 - min(line, 1.0);

  // Detail Noise
  float detail = snoise(vPosition.xz * 0.5 + uTime * 0.02);
  float rocky = snoise(vPosition.xz * 0.1);

  // Mix factor based on elevation + noise
  float mixStrength = (vElevation + rocky * 2.0 + 1.0) * 0.25; 
  mixStrength = clamp(mixStrength, 0.0, 1.0); // Fix for brown glitch: clamp to avoid negative mix

  vec3 color = mix(uColorA, uColorB, mixStrength);
  
  // Add texture detail (noise overlay)
  color += vec3(detail * 0.05);

  // Grid Overlay
  color = mix(color, uGridColor, gridPattern * 0.3);

  // Specular highlight for "Wet" or "Magical" ground
  // Simple fake lighting
  vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
  float diff = max(dot(vNormal, lightDir), 0.0);
  color *= (0.5 + diff * 0.5); // Ambient + Diffuse

  gl_FragColor = vec4(color, 1.0);
}
`;
