
// Vertex Shader - High Detail Displacement & Glitch Support
export const axiomVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying float vGlitch;
varying float vFogDepth;

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

void main() {
  vUv = uv;
  vec3 pos = position;
  
  float amplitude = 1.0;
  float frequency = 1.0;
  
  if (abs(uBiome - 0.0) < 0.1) { 
      amplitude = 0.2;
      frequency = 0.8;
  } else if (abs(uBiome - 1.0) < 0.1) { 
      amplitude = 2.5;
      frequency = 1.5;
  } else if (abs(uBiome - 2.0) < 0.1) { 
      amplitude = 9.0;
      frequency = 0.8;
  } else { 
      amplitude = 1.5;
      frequency = 0.6;
  }

  float elevation = snoise(pos.xz * 0.02 * frequency) * amplitude;
  elevation += snoise(pos.xz * 0.05 * frequency) * (amplitude * 0.4);
  elevation += snoise(pos.xz * 0.15) * (amplitude * 0.1);
  
  if (abs(uBiome - 0.0) < 0.1) {
      elevation *= 0.3;
  }

  float glitchFactor = step(0.98, sin(uTime * 1.5 + pos.x * 20.0)) * uAwakeningDensity;
  pos.x += glitchFactor * 0.5 * snoise(pos.xz + uTime);
  vGlitch = glitchFactor;

  pos.y += elevation;
  
  vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  
  vPosition = modelPosition.xyz;
  vElevation = elevation;
  vFogDepth = -viewPosition.z;

  gl_Position = projectionMatrix * viewPosition;
}
`;

// Fragment Shader - Advanced Procedural Texturing & Fog of War
export const axiomFragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying float vGlitch;
varying float vFogDepth;

uniform float uTime;
uniform float uAwakeningDensity; 
uniform float uBiome;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

// Scouting System Uniforms
uniform vec3 uAgentPositions[10];
uniform float uAgentVisionRanges[10];
uniform float uExplorationLevel; // 0.0 to 1.0 (Gradient persistence)

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
    float slope = 1.0 - normal.y; 

    vec3 finalColor = vec3(0.0);
    float noiseBase = fbm(vPosition.xz * 0.15);
    float noiseDetail = snoise(vPosition.xz * 3.0);
    
    // --- Biome Logic ---
    if (abs(uBiome - 0.0) < 0.1) { 
        vec3 asphalt = vec3(0.1, 0.1, 0.12);
        vec3 concrete = vec3(0.35, 0.35, 0.38);
        vec2 gridCell = fract(vPosition.xz * 0.1);
        float roadMask = step(0.9, gridCell.x) + step(0.9, gridCell.y);
        finalColor = mix(concrete, asphalt, clamp(roadMask, 0.0, 1.0));
    } 
    else if (abs(uBiome - 1.0) < 0.1) {
        vec3 dirtDark = vec3(0.18, 0.14, 0.1);
        vec3 forestFloor = vec3(0.05, 0.12, 0.03);
        float vegMix = smoothstep(-0.2, 0.5, noiseBase + noiseDetail * 0.2);
        finalColor = mix(dirtDark, forestFloor, vegMix);
    }
    else if (abs(uBiome - 2.0) < 0.1) {
        vec3 rockGray = vec3(0.25, 0.25, 0.28);
        vec3 rockDark = vec3(0.1, 0.1, 0.12);
        vec3 snow = vec3(0.95, 0.98, 1.0);
        float cliffFactor = smoothstep(0.3, 0.7, slope);
        vec3 rock = mix(rockGray, rockDark, cliffFactor);
        float snowLine = smoothstep(4.0, 7.0, vPosition.y);
        finalColor = mix(rock, snow, snowLine * (1.0 - cliffFactor));
    }
    else {
        vec3 grassLush = vec3(0.1, 0.4, 0.1);
        vec3 grassDry = vec3(0.4, 0.45, 0.2);
        finalColor = mix(grassLush, grassDry, smoothstep(0.2, 0.7, noiseBase));
    }

    // --- SCOUTING / FOG OF WAR ---
    float visibility = 0.0;

    // FORCE VISIBILITY FOR CITY / SANCTUARY
    if (abs(uBiome - 0.0) < 0.1) {
        visibility = 1.0;
    } else {
        float instantVis = 0.0;
        for(int i = 0; i < 10; i++) {
            float dist = distance(vPosition.xz, uAgentPositions[i].xz);
            float v = 1.0 - smoothstep(uAgentVisionRanges[i] * 0.4, uAgentVisionRanges[i], dist);
            instantVis = max(instantVis, v);
        }

        // Shimmering discovery effect
        float shimmer = sin(uTime * 3.0 + vPosition.x * 0.5 + vPosition.z * 0.5) * 0.05 * instantVis;
        
        // Final visibility: Combine instant scout beam + persistent mapped knowledge (uExplorationLevel)
        visibility = max(instantVis + shimmer, uExplorationLevel * 0.35);
    }

    // Apply visibility to color
    finalColor *= visibility;

    // --- Grid Overlay ---
    vec2 grid_uv = vPosition.xz * 0.5;
    vec2 grid_lines = abs(fract(grid_uv - 0.5) - 0.5) / fwidth(grid_uv);
    float grid_pattern = 1.0 - min(min(grid_lines.x, grid_lines.y), 1.0);
    finalColor = mix(finalColor, vec3(0.0, 0.9, 1.0), grid_pattern * 0.05 * visibility);

    // Fog Calculation (Global atmosphere)
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    gl_FragColor = vec4(mix(finalColor, uFogColor, fogFactor), 1.0);
}
`;
