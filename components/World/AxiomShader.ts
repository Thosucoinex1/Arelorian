
// Vertex Shader - High Detail Displacement & Glitch Support
export const axiomVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying float vGlitch;

uniform float uTime;
uniform float uAwakeningDensity;

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
  
  // High detail terrain displacement
  float elevation = snoise(pos.xz * 0.015) * 3.5;
  elevation += snoise(pos.xz * 0.08) * 0.8;
  elevation += snoise(pos.xz * 0.4) * 0.15;
  
  // Dynamic Glitch effect for system instability
  float glitchFactor = step(0.95, sin(uTime * 2.0 + pos.x * 10.0)) * uAwakeningDensity;
  pos.x += glitchFactor * 0.5 * snoise(pos.xz + uTime);
  pos.z += glitchFactor * 0.5 * snoise(pos.zx - uTime);
  vGlitch = glitchFactor;

  pos.y += elevation;
  
  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vPosition = modelPosition.xyz;
  vElevation = elevation;

  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
`;

// Fragment Shader - Advanced Procedural Texturing & Chromatic Aberration
export const axiomFragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying float vGlitch;

uniform float uTime;
uniform float uAwakeningDensity; 
uniform float uBiome;

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

float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5000 * snoise(p); p *= 2.02;
    f += 0.2500 * snoise(p); p *= 2.03;
    f += 0.1250 * snoise(p); p *= 2.01;
    f += 0.0625 * snoise(p);
    return f / 0.9375;
}

void main() {
    vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));

    // Micro-texture detail
    float grain = snoise(vPosition.xz * 15.0) * 0.05;
    
    // High-fidelity terrain materials
    float stone_fbm = fbm(vPosition.xz * 0.15);
    vec3 stone_color = vec3(0.12 + stone_fbm * 0.1) + grain;

    float moss_fbm = fbm(vPosition.xz * 2.5);
    vec3 moss_color = vec3(0.05, 0.15, 0.05) * (0.6 + moss_fbm * 0.4);

    float slope = 1.0 - normal.y;
    float blend = smoothstep(0.15, 0.55, slope);
    vec3 terrain_color = mix(moss_color, stone_color, blend);
    
    // Biome Specific Adjustments
    if (uBiome == 0.0) terrain_color = mix(terrain_color, vec3(0.05), 0.7); // City - Dark asphalt
    if (uBiome == 2.0) terrain_color = mix(terrain_color, vec3(0.4), 0.5); // Mountain - Snow/Grey

    // Grid System (Axiom Projection)
    float grid_scale = 0.025;
    vec2 grid_uv = vPosition.xz * grid_scale;
    vec2 grid_lines = abs(fract(grid_uv - 0.5) - 0.5) / fwidth(grid_uv);
    float grid_pattern = 1.0 - min(min(grid_lines.x, grid_lines.y), 1.0);
    
    vec3 axiom_cyan = vec3(0.02, 0.8, 1.0);
    vec3 warning_red = vec3(1.0, 0.1, 0.1);
    
    // Glitch Visuals
    vec3 grid_color = mix(axiom_cyan, warning_red, uAwakeningDensity);
    if(vGlitch > 0.0) grid_color = mix(grid_color, vec3(1.0), 0.5);

    float grid_alpha = (0.1 + uAwakeningDensity * 0.5) * grid_pattern;
    vec3 base_with_grid = mix(terrain_color, grid_color, grid_alpha);

    // Final Lighting
    vec3 sun_dir = normalize(vec3(0.5, 1.0, 0.3));
    float diff = max(dot(normal, sun_dir), 0.0);
    vec3 ambient = vec3(0.2);
    vec3 final_color = base_with_grid * (ambient + diff * 0.8);

    // Chromatic Aberration / Glitch Flash
    if(vGlitch > 0.5) {
        final_color.r *= 1.5;
        final_color.b *= 0.5;
    }

    gl_FragColor = vec4(final_color, 1.0);
}
`;
