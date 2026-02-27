
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
uniform float uAxiomaticIntensity;
uniform float uStability;
uniform float uCorruption;

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
      amplitude = 0.15;
      frequency = 0.8;
  } else if (abs(uBiome - 1.0) < 0.1) { 
      amplitude = 2.5;
      frequency = 1.5;
  } else if (abs(uBiome - 2.0) < 0.1) { 
      amplitude = 9.0;
      frequency = 0.8;
  } else if (abs(uBiome - 4.0) < 0.1) { 
      amplitude = 3.0;
      frequency = 0.4;
  } else if (abs(uBiome - 5.0) < 0.1) { 
      amplitude = 0.5;
      frequency = 0.5;
  } else { 
      amplitude = 1.2;
      frequency = 0.6;
  }

  float elevation = snoise(pos.xz * 0.02 * frequency) * amplitude;
  elevation += snoise(pos.xz * 0.05 * frequency) * (amplitude * 0.4);
  elevation += snoise(pos.xz * 0.15) * (amplitude * 0.1);
  
  if (abs(uBiome - 0.0) < 0.1) {
      elevation *= 0.15;
  }

  float glitchFactor = step(0.98, sin(uTime * 1.5 + pos.x * 20.0)) * (uAwakeningDensity + uCorruption * 0.5);
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

// Fragment Shader - Rich Biome Texturing with Procedural Detail
export const axiomFragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying float vGlitch;
varying float vFogDepth;

uniform float uTime;
uniform float uAwakeningDensity; 
uniform float uBiome;
uniform float uAxiomaticIntensity;
uniform float uStability;
uniform float uCorruption;
uniform bool uIsHovered;
uniform bool uIsSelected;
uniform vec3 uCameraPosition;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

uniform vec3 uAgentPositions[10];
uniform float uAgentVisionRanges[10];
uniform float uExplorationLevel;

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

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 grassPattern(vec2 pos, vec3 baseColor, vec3 tipColor) {
    float blade = snoise(pos * 40.0);
    float clump = snoise(pos * 8.0) * 0.5 + 0.5;
    float detail = snoise(pos * 80.0) * 0.3;
    float grassMask = smoothstep(0.2, 0.8, blade + detail) * clump;
    float windSway = sin(uTime * 2.0 + pos.x * 3.0 + pos.y * 2.0) * 0.05;
    return mix(baseColor, tipColor, grassMask + windSway);
}

void main() {
    vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
    float slope = 1.0 - normal.y; 
    float sunDot = max(dot(normal, normalize(vec3(0.6, 0.8, 0.4))), 0.0);
    float lighting = 0.45 + sunDot * 0.55;

    vec3 finalColor = vec3(0.0);
    float noiseBase = fbm(vPosition.xz * 0.15);
    float noiseDetail = snoise(vPosition.xz * 3.0);
    
    if (abs(uBiome - 0.0) < 0.1) { 
        vec3 cobbleLight = vec3(0.55, 0.50, 0.45);
        vec3 cobbleDark = vec3(0.38, 0.34, 0.30);
        vec3 cobbleMid = vec3(0.48, 0.44, 0.40);
        
        vec2 stoneUV = vPosition.xz * 0.4;
        float stoneNoise = snoise(stoneUV * 3.0 + vec2(hash(floor(stoneUV * 3.0))));
        vec2 brickUV = vPosition.xz * 0.25;
        vec2 brickCell = fract(brickUV);
        float brickOffset = step(0.5, fract(brickUV.y * 0.5)) * 0.5;
        brickCell.x = fract(brickCell.x + brickOffset);
        float brickEdge = step(0.06, brickCell.x) * step(0.06, brickCell.y);
        float brickVar = hash(floor(brickUV + vec2(brickOffset, 0.0)));
        
        vec3 brick = mix(cobbleDark, cobbleLight, brickVar);
        finalColor = mix(vec3(0.32, 0.28, 0.24), brick, brickEdge);
        
        vec2 roadCenter = fract(vPosition.xz * 0.025);
        float isRoad = smoothstep(0.35, 0.4, roadCenter.x) * smoothstep(0.35, 0.4, 1.0 - roadCenter.x);
        float isRoadZ = smoothstep(0.35, 0.4, roadCenter.y) * smoothstep(0.35, 0.4, 1.0 - roadCenter.y);
        float roadMask = max(1.0 - isRoad, 1.0 - isRoadZ);
        vec3 roadColor = mix(vec3(0.35, 0.33, 0.30), vec3(0.42, 0.40, 0.36), snoise(vPosition.xz * 2.0) * 0.5 + 0.5);
        finalColor = mix(finalColor, roadColor, roadMask * 0.6);
        
        float grassEdge = smoothstep(0.0, 0.15, snoise(vPosition.xz * 0.3) * 0.5 + 0.3);
        vec3 cityGrass = vec3(0.25, 0.42, 0.15);
        finalColor = mix(finalColor, cityGrass, grassEdge * 0.25 * (1.0 - roadMask));
    } 
    else if (abs(uBiome - 1.0) < 0.1) {
        vec3 darkSoil = vec3(0.15, 0.10, 0.06);
        vec3 forestGreen = vec3(0.08, 0.22, 0.05);
        vec3 brightGreen = vec3(0.18, 0.40, 0.08);
        vec3 mossGreen = vec3(0.12, 0.30, 0.06);
        vec3 leafLitter = vec3(0.30, 0.18, 0.08);
        
        float vegMix = smoothstep(-0.3, 0.6, noiseBase + noiseDetail * 0.2);
        vec3 baseForest = mix(darkSoil, forestGreen, vegMix);
        
        baseForest = grassPattern(vPosition.xz * 0.5, baseForest, brightGreen);
        
        float mossMask = smoothstep(0.3, 0.7, snoise(vPosition.xz * 1.5));
        baseForest = mix(baseForest, mossGreen, mossMask * 0.35);
        
        float litterMask = smoothstep(0.6, 0.8, snoise(vPosition.xz * 4.0 + 100.0));
        baseForest = mix(baseForest, leafLitter, litterMask * 0.3);
        
        float slopeDirt = smoothstep(0.3, 0.6, slope);
        baseForest = mix(baseForest, darkSoil, slopeDirt * 0.5);
        
        float dappled = snoise(vPosition.xz * 6.0 + uTime * 0.3) * 0.08;
        baseForest += vec3(dappled * 0.3, dappled, dappled * 0.2);
        
        finalColor = baseForest;
    }
    else if (abs(uBiome - 2.0) < 0.1) {
        vec3 rockLight = vec3(0.45, 0.43, 0.40);
        vec3 rockMid = vec3(0.32, 0.30, 0.28);
        vec3 rockDark = vec3(0.18, 0.16, 0.14);
        vec3 snow = vec3(0.92, 0.95, 0.98);
        vec3 snowShadow = vec3(0.70, 0.78, 0.88);
        vec3 moss = vec3(0.15, 0.25, 0.08);
        
        float rockNoise = fbm(vPosition.xz * 0.3);
        float cliffFactor = smoothstep(0.25, 0.65, slope);
        vec3 rock = mix(rockLight, rockMid, rockNoise * 0.5 + 0.5);
        rock = mix(rock, rockDark, cliffFactor);
        
        float strata = sin(vPosition.y * 3.0 + rockNoise * 5.0) * 0.5 + 0.5;
        rock = mix(rock, rockDark * 0.8, strata * 0.15 * cliffFactor);
        
        float mossFactor = snoise(vPosition.xz * 0.8) * (1.0 - cliffFactor) * (1.0 - smoothstep(3.0, 5.0, vPosition.y));
        rock = mix(rock, moss, smoothstep(0.3, 0.6, mossFactor) * 0.45);
        
        float snowLine = smoothstep(3.5, 6.0, vPosition.y);
        float snowNoise = snoise(vPosition.xz * 2.0) * 0.3 + 0.5;
        float snowCover = snowLine * (1.0 - cliffFactor * 0.8) * snowNoise;
        vec3 snowColor = mix(snowShadow, snow, sunDot * 0.5 + 0.5);
        finalColor = mix(rock, snowColor, smoothstep(0.2, 0.5, snowCover));
        
        float gravelDetail = snoise(vPosition.xz * 15.0);
        finalColor += vec3(gravelDetail * 0.03);
    }
    else if (abs(uBiome - 4.0) < 0.1) {
        vec3 sand = vec3(0.76, 0.65, 0.42);
        vec3 sandDark = vec3(0.58, 0.48, 0.30);
        vec3 sandLight = vec3(0.85, 0.78, 0.55);
        
        float dunes = snoise(vPosition.xz * 0.08) * 0.5 + 0.5;
        float ripple = snoise(vPosition.xz * 3.0 + vec2(uTime * 0.02, 0.0)) * 0.5 + 0.5;
        
        finalColor = mix(sandDark, sandLight, dunes);
        finalColor = mix(finalColor, sand, ripple * 0.3);
        float sparkle = step(0.97, snoise(vPosition.xz * 50.0));
        finalColor += vec3(sparkle * 0.15);
    }
    else if (abs(uBiome - 5.0) < 0.1) {
        vec3 swampMud = vec3(0.18, 0.15, 0.08);
        vec3 swampGreen = vec3(0.10, 0.18, 0.05);
        vec3 swampWater = vec3(0.08, 0.15, 0.10);
        
        float mudMask = snoise(vPosition.xz * 0.5) * 0.5 + 0.5;
        float waterPool = smoothstep(0.55, 0.6, snoise(vPosition.xz * 0.3));
        
        finalColor = mix(swampMud, swampGreen, mudMask);
        finalColor = mix(finalColor, swampWater, waterPool * 0.6);
        float waterShimmer = sin(uTime * 1.5 + vPosition.x * 2.0) * 0.03 * waterPool;
        finalColor += vec3(waterShimmer * 0.5, waterShimmer, waterShimmer * 0.3);
    }
    else {
        vec3 grassBase = vec3(0.20, 0.45, 0.12);
        vec3 grassLight = vec3(0.35, 0.55, 0.15);
        vec3 grassDry = vec3(0.50, 0.52, 0.22);
        vec3 wildflowerPink = vec3(0.75, 0.30, 0.45);
        vec3 wildflowerYellow = vec3(0.80, 0.72, 0.20);
        vec3 wildflowerWhite = vec3(0.90, 0.88, 0.82);
        vec3 dirtPath = vec3(0.42, 0.32, 0.18);
        
        float grassMix = smoothstep(0.1, 0.8, noiseBase + noiseDetail * 0.15);
        vec3 baseGrass = mix(grassBase, grassLight, grassMix);
        baseGrass = grassPattern(vPosition.xz, baseGrass, grassLight);
        
        float dryPatch = smoothstep(0.6, 0.9, snoise(vPosition.xz * 0.3 + 50.0));
        baseGrass = mix(baseGrass, grassDry, dryPatch * 0.4);
        
        float flowerNoise = snoise(vPosition.xz * 5.0);
        float flowerMask = step(0.88, flowerNoise);
        float flowerType = hash(floor(vPosition.xz * 5.0));
        vec3 flowerColor = flowerType > 0.66 ? wildflowerPink : flowerType > 0.33 ? wildflowerYellow : wildflowerWhite;
        baseGrass = mix(baseGrass, flowerColor, flowerMask * 0.6);
        
        float pathNoise = snoise(vPosition.xz * 0.1);
        float pathMask = smoothstep(0.45, 0.5, pathNoise) * (1.0 - smoothstep(0.5, 0.55, pathNoise));
        baseGrass = mix(baseGrass, dirtPath, pathMask * 0.7);
        
        finalColor = baseGrass;
    }

    finalColor *= lighting;

    float distToCamera = distance(vPosition, uCameraPosition);
    float lodFactor = smoothstep(100.0, 250.0, distToCamera);

    if (lodFactor < 1.0) {
        vec2 hex_uv = vPosition.xz * 0.3;
        vec3 hex_p1 = fract(hex_uv.xyx / vec3(1.0, 0.866, 0.5));
        float hex_d = abs(hex_p1.z - 0.5);
        hex_d = max(hex_d, abs(dot(hex_p1.xy, vec2(0.5, 0.866)) - 0.5));
        hex_d = max(hex_d, abs(dot(hex_p1.xy, vec2(-0.5, 0.866)) - 0.5));
        float hex_pulse = sin(uTime * (1.5 + uStability * 3.0) + vPosition.x * 0.1) * 0.5 + 0.5;
        float hex_grid = smoothstep(0.01, 0.02, hex_d) * (0.5 + hex_pulse * 0.5);
        finalColor = mix(finalColor, vec3(0.1, 0.8, 1.0), hex_grid * uStability * 0.15 * (1.0 - lodFactor));

        if (uCorruption > 0.1) {
            vec2 warpedUV = vUv + vec2(snoise(vUv * 5.0 + uTime * 0.2), snoise(vUv * 5.0 - uTime * 0.2)) * 0.1 * uCorruption;
            float corruptionNoise = snoise(warpedUV * 15.0 + uTime);
            finalColor.r += step(0.8, corruptionNoise) * uCorruption * 0.4 * (1.0 - lodFactor);
            finalColor.g *= 1.0 - (step(0.7, corruptionNoise) * uCorruption * 0.3 * (1.0 - lodFactor));
        }
    }

    float visibility = 0.0;
    float instantVis = 0.0;

    for(int i = 0; i < 10; i++) {
        float dist = distance(vPosition.xz, uAgentPositions[i].xz);
        float v = smoothstep(uAgentVisionRanges[i], uAgentVisionRanges[i] * 0.3, dist);
        instantVis = max(instantVis, v);
    }

    float pulse = (sin(uTime * 3.5 + vPosition.x * 0.3 + vPosition.z * 0.3) * 0.5 + 0.5) * 0.05 * instantVis;
    
    float axiomPulse = (sin(uTime * 1.5 + vPosition.x * 2.0 + vPosition.z * 2.0) * 0.5 + 0.5) * uAxiomaticIntensity * 0.1 * visibility;
    finalColor += vec3(0.0, 0.7, 1.0) * axiomPulse;

    float cacheNoise = fbm(vPosition.xz * 0.8 + uTime * 0.05);
    float persistentVis = uExplorationLevel * (0.5 + 0.3 * cacheNoise);

    visibility = max(instantVis + pulse, persistentVis);
    visibility = max(visibility, 0.15);

    if (abs(uBiome - 0.0) < 0.1) {
        visibility = 1.0;
    }

    finalColor *= visibility;

    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    vec3 fogColor = mix(uFogColor, vec3(0.15, 0.20, 0.30), 0.3);
    vec3 finalFogColor = mix(finalColor, fogColor, fogFactor);

    if (uIsSelected) {
        finalFogColor = mix(finalFogColor, vec3(1.0, 0.8, 0.2), 0.3);
    } else if (uIsHovered) {
        finalFogColor += vec3(0.1, 0.1, 0.1);
    }

    gl_FragColor = vec4(finalFogColor, 1.0);
}
`;
