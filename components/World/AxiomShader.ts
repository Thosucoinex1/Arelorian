
// Vertex Shader - Improved for terrain displacement
export const axiomVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
// REMOVED: vNormal is no longer needed here as it was providing incorrect flat data.
// It will be calculated per-pixel in the fragment shader for accurate lighting.

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
  
  // We pass the world-space position to the fragment shader
  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vPosition = modelPosition.xyz;
  
  vElevation = elevation;

  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
`;

// Fragment Shader - Rewritten for Procedural Texturing and Correct Lighting
export const axiomFragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
// REMOVED: vNormal varying.

uniform float uTime;
uniform float uAwakeningDensity; 

// FIX: Noise functions must be declared before they are used by fbm.
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

// FBM for texture generation
float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5000 * snoise(p); p *= 2.02;
    f += 0.2500 * snoise(p); p *= 2.03;
    f += 0.1250 * snoise(p); p *= 2.01;
    f += 0.0625 * snoise(p);
    return f / 0.9375;
}

void main() {
    // FIX: Calculate normals per-pixel using derivatives for accurate lighting on displaced geometry.
    vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));

    // Texture Generation
    float rock_noise = fbm(vPosition.xz * 0.2);
    vec3 rock_color = vec3(0.15 + rock_noise * 0.1);

    float moss_noise = fbm(vPosition.xz * 1.5);
    vec3 moss_color = vec3(0.1, 0.25, 0.15) * (0.5 + moss_noise * 0.5);

    // Texture Blending based on slope (using the new, correct normal)
    float slope = 1.0 - normal.y;
    float blend_factor = smoothstep(0.2, 0.6, slope);
    vec3 terrain_color = mix(moss_color, rock_color, blend_factor);
    
    // Grid Logic
    float uGridSize = 0.02;
    vec3 uGridColor = vec3(0.2, 0.1, 0.8);
    vec2 grid = abs(fract(vPosition.xz * uGridSize - 0.5) - 0.5) / fwidth(vPosition.xz * uGridSize);
    float line = min(grid.x, grid.y);
    float gridPattern = 1.0 - min(line, 1.0);

    // Grid Overlay - Modulated by Awakening Density
    vec3 axiomCyan = vec3(0.023, 0.713, 0.831);
    vec3 awakenedGridColor = mix(uGridColor, axiomCyan, uAwakeningDensity);
    float gridIntensity = (0.05 + uAwakeningDensity * 0.3) * gridPattern;
    vec3 final_color = mix(terrain_color, awakenedGridColor, gridIntensity);

    // Lighting (using the new, correct normal)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 lighting = vec3(0.3) + vec3(0.7) * diff;
    final_color *= lighting;

    gl_FragColor = vec4(final_color, 1.0);
}
`;
