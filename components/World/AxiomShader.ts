
// Vertex Shader - High Detail Displacement & Glitch Support
export const axiomVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying float vGlitch;
varying float vFogDepth;

uniform float uTime;
uniform float uAwakeningDensity;
uniform float uBiome; // 0: City, 1: Forest, 2: Mountain, 3: Plains

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
  
  // Biome specific settings
  float amplitude = 1.0;
  float frequency = 1.0;
  
  if (abs(uBiome - 0.0) < 0.1) { // CITY
      amplitude = 0.2;
      frequency = 0.8;
  } else if (abs(uBiome - 1.0) < 0.1) { // FOREST
      amplitude = 2.5;
      frequency = 1.5;
  } else if (abs(uBiome - 2.0) < 0.1) { // MOUNTAIN
      amplitude = 9.0;
      frequency = 0.8;
  } else { // PLAINS
      amplitude = 1.5;
      frequency = 0.6;
  }

  // Multi-octave Terrain generation
  float elevation = snoise(pos.xz * 0.02 * frequency) * amplitude;
  elevation += snoise(pos.xz * 0.05 * frequency) * (amplitude * 0.4);
  elevation += snoise(pos.xz * 0.15) * (amplitude * 0.1);
  
  // Flatten city center slightly for building
  if (abs(uBiome - 0.0) < 0.1) {
      elevation *= 0.3;
  }

  // Dynamic Glitch effect
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

// Fragment Shader - Advanced Procedural Texturing & Fog
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
    // Advanced Normal Calculation
    vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
    float slope = 1.0 - normal.y; // 0 = flat, 1 = vertical cliff

    vec3 finalColor = vec3(0.0);
    
    // High-Res Noises
    float noiseBase = fbm(vPosition.xz * 0.15);
    float noiseDetail = snoise(vPosition.xz * 3.0);
    float noiseMicro = snoise(vPosition.xz * 15.0);
    
    // --- BIOME LOGIC ---
    
    if (abs(uBiome - 0.0) < 0.1) { 
        // CITY: Asphalt, Concrete, Markings
        vec3 asphalt = vec3(0.1, 0.1, 0.12);
        vec3 concrete = vec3(0.35, 0.35, 0.38);
        vec3 markingWhite = vec3(0.8, 0.8, 0.8);
        
        // Procedural Roads
        vec2 gridUV = vPosition.xz * 0.1; // Scale for blocks
        vec2 gridCell = fract(gridUV);
        float roadMask = step(0.9, gridCell.x) + step(0.9, gridCell.y);
        roadMask = clamp(roadMask, 0.0, 1.0);
        
        // Dashed Lines
        float dash = step(0.5, fract(vPosition.x * 0.5 + vPosition.z * 0.5)); 
        float laneMarking = roadMask * dash * step(0.94, max(gridCell.x, gridCell.y)) * step(0.96, 1.0 - min(gridCell.x, gridCell.y));

        vec3 ground = mix(concrete, asphalt, roadMask);
        ground = mix(ground, markingWhite, laneMarking);
        
        // Puddles / Wetness
        float puddle = smoothstep(0.4, 0.6, noiseDetail);
        float roughness = mix(0.8, 0.1, puddle * roadMask);
        
        finalColor = ground;
        
        // City Specular
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        vec3 viewDir = normalize(cameraPosition - vPosition);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        finalColor += spec * (1.0 - roughness) * 0.5;
    } 
    else if (abs(uBiome - 1.0) < 0.1) {
        // FOREST: Loam, Moss, Roots
        vec3 dirtDark = vec3(0.18, 0.14, 0.1);
        vec3 dirtLight = vec3(0.24, 0.20, 0.14);
        vec3 moss = vec3(0.15, 0.3, 0.05);
        vec3 forestFloor = vec3(0.05, 0.12, 0.03);
        
        // Mix dirt and vegetation
        float vegMix = smoothstep(-0.2, 0.5, noiseBase + noiseDetail * 0.2);
        vec3 ground = mix(dirtDark, forestFloor, vegMix);
        
        // Add patches of light dirt
        ground = mix(ground, dirtLight, smoothstep(0.6, 0.8, noiseMicro) * (1.0 - vegMix));
        
        // Moss logic: Grows on top of forms, not steep slopes
        float mossGrow = smoothstep(0.5, 1.0, normal.y) * smoothstep(0.0, 0.6, noiseDetail);
        ground = mix(ground, moss, mossGrow * 0.7);
        
        finalColor = ground;
    }
    else if (abs(uBiome - 2.0) < 0.1) {
        // MOUNTAIN: Rock, Cliffs, Snow
        vec3 rockGray = vec3(0.25, 0.25, 0.28);
        vec3 rockDark = vec3(0.1, 0.1, 0.12);
        vec3 snow = vec3(0.95, 0.98, 1.0);
        
        // Slope texturing: Steep parts are darker (cliffs)
        float cliffFactor = smoothstep(0.3, 0.7, slope);
        vec3 rock = mix(rockGray, rockDark, cliffFactor);
        
        // Add noise texture to rock
        rock *= (0.8 + 0.4 * noiseMicro);

        // Snow logic:
        // 1. Height threshold (vPosition.y)
        // 2. Slope check (snow slides off steep walls)
        // 3. Noise variation for natural edges
        float snowThreshold = 4.0 + noiseBase * 5.0;
        float snowLine = smoothstep(snowThreshold, snowThreshold + 3.0, vPosition.y);
        float snowStick = smoothstep(0.6, 0.3, slope); // Only sticks to flat-ish surfaces
        
        finalColor = mix(rock, snow, snowLine * snowStick);
    }
    else {
        // PLAINS: Lush Grass, Dry Patches, Flowers
        vec3 grassLush = vec3(0.1, 0.4, 0.1);
        vec3 grassDry = vec3(0.4, 0.45, 0.2);
        vec3 flowerA = vec3(0.8, 0.2, 0.5); // Magenta
        vec3 flowerB = vec3(1.0, 0.8, 0.2); // Gold
        
        float dryMix = smoothstep(0.2, 0.7, noiseBase);
        vec3 ground = mix(grassLush, grassDry, dryMix);
        
        // Flower procedural placement
        float flowerNoise = snoise(vPosition.xz * 12.0);
        float flowerMask = smoothstep(0.7, 0.75, flowerNoise) * smoothstep(0.6, 1.0, noiseBase); // Clustered
        
        vec3 flowerColor = mix(flowerA, flowerB, step(0.5, snoise(vPosition.xz * 2.0)));
        finalColor = mix(ground, flowerColor, flowerMask);
    }

    // --- AXIOM GRID OVERLAY ---
    // Digital matrix overlay that reacts to Reality Stability
    float grid_scale = 0.5;
    vec2 grid_uv = vPosition.xz * grid_scale;
    vec2 grid_lines = abs(fract(grid_uv - 0.5) - 0.5) / fwidth(grid_uv);
    float grid_pattern = 1.0 - min(min(grid_lines.x, grid_lines.y), 1.0);
    
    vec3 axiom_cyan = vec3(0.0, 0.9, 1.0);
    vec3 warning_red = vec3(1.0, 0.2, 0.2);
    
    vec3 grid_color = mix(axiom_cyan, warning_red, uAwakeningDensity);
    float grid_alpha = 0.02 + (uAwakeningDensity * 0.4); 
    
    finalColor = mix(finalColor, grid_color, grid_pattern * grid_alpha);

    // Basic Lighting
    vec3 sunDir = normalize(vec3(0.5, 0.8, 0.3));
    float diff = max(dot(normal, sunDir), 0.05);
    vec3 ambient = vec3(0.3); // Slightly higher ambient for visibility
    
    finalColor *= (ambient + diff);

    // Glitch Chromatic Aberration
    if(vGlitch > 0.5) {
        finalColor.r = finalColor.r * 1.5;
        finalColor.b = finalColor.b * 0.5;
    }

    // --- FOG CALCULATION ---
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    gl_FragColor = vec4(mix(finalColor, uFogColor, fogFactor), 1.0);
}
`;
