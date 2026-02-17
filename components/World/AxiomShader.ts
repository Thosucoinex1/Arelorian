
// Vertex Shader - High Detail Displacement & Glitch Support
export const axiomVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying float vElevation;
varying float vGlitch;

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
      amplitude = 0.1;
      frequency = 0.5;
  } else if (abs(uBiome - 1.0) < 0.1) { // FOREST
      amplitude = 2.0;
      frequency = 1.2;
  } else if (abs(uBiome - 2.0) < 0.1) { // MOUNTAIN
      amplitude = 7.0;
      frequency = 0.7;
  } else { // PLAINS
      amplitude = 1.2;
      frequency = 0.5;
  }

  // Terrain generation
  float elevation = snoise(pos.xz * 0.02 * frequency) * amplitude;
  elevation += snoise(pos.xz * 0.1) * (amplitude * 0.2);
  
  // Flatten city center slightly
  if (abs(uBiome - 0.0) < 0.1) {
      elevation *= 0.5;
  }

  // Dynamic Glitch effect
  float glitchFactor = step(0.98, sin(uTime * 1.5 + pos.x * 20.0)) * uAwakeningDensity;
  pos.x += glitchFactor * 0.5 * snoise(pos.xz + uTime);
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
    // Normal calculation via derivatives for hard shading and slope detection
    vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
    float slope = 1.0 - normal.y; // 0 = flat, 1 = vertical cliff

    vec3 finalColor = vec3(0.0);
    
    // Base noises
    float noiseLarge = fbm(vPosition.xz * 0.1);
    float noiseSmall = snoise(vPosition.xz * 5.0);
    float grain = snoise(vPosition.xz * 20.0) * 0.05;

    // --- BIOME LOGIC ---
    
    if (abs(uBiome - 0.0) < 0.1) { 
        // CITY: Asphalt, Concrete, Grid Lines
        vec3 asphalt = vec3(0.12, 0.12, 0.14);
        vec3 concrete = vec3(0.25, 0.25, 0.28);
        
        // Procedural Street Grid
        vec2 streetUV = vPosition.xz * 0.08;
        float streetMask = step(0.92, fract(streetUV.x)) + step(0.92, fract(streetUV.y));
        streetMask = clamp(streetMask, 0.0, 1.0);
        
        vec3 ground = mix(asphalt, concrete, noiseLarge);
        finalColor = mix(ground, vec3(0.4), streetMask * 0.5);
        
        // Specular highlight for wet asphalt look
        vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
        vec3 viewDir = normalize(cameraPosition - vPosition);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        finalColor += spec * 0.2;
    } 
    else if (abs(uBiome - 1.0) < 0.1) {
        // FOREST: Mossy, Roots, Dark Dirt
        vec3 dirt = vec3(0.22, 0.16, 0.1);
        vec3 forestGreen = vec3(0.03, 0.15, 0.02);
        vec3 brightMoss = vec3(0.1, 0.25, 0.05);
        
        float grassMix = smoothstep(-0.3, 0.4, noiseLarge);
        vec3 ground = mix(dirt, forestGreen, grassMix);
        
        // Moss grows on flat surfaces
        float mossFactor = (1.0 - slope) * (noiseSmall * 0.5 + 0.5);
        ground = mix(ground, brightMoss, smoothstep(0.4, 0.8, mossFactor));
        
        finalColor = ground + grain;
    }
    else if (abs(uBiome - 2.0) < 0.1) {
        // MOUNTAIN: Rock, Snow Caps
        vec3 rockDark = vec3(0.15, 0.15, 0.17);
        vec3 rockLight = vec3(0.35, 0.35, 0.38);
        vec3 snow = vec3(0.9, 0.95, 1.0);
        
        vec3 rock = mix(rockDark, rockLight, noiseSmall);
        
        // Snow accumulation logic:
        // 1. Height based (higher = more snow)
        // 2. Slope based (snow falls off steep cliffs)
        float snowHeightLine = 2.0 + noiseLarge * 3.0;
        float snowFactor = smoothstep(snowHeightLine, snowHeightLine + 2.0, vPosition.y);
        snowFactor *= smoothstep(0.5, 0.2, slope); // Mask out steep slopes
        
        finalColor = mix(rock, snow, snowFactor);
    }
    else {
        // PLAINS: Grass, Dirt, Flowers
        vec3 grassDry = vec3(0.2, 0.35, 0.1);
        vec3 grassLush = vec3(0.1, 0.45, 0.15);
        vec3 flowerPurple = vec3(0.5, 0.2, 0.6);
        vec3 flowerYellow = vec3(0.8, 0.7, 0.1);
        
        vec3 ground = mix(grassDry, grassLush, noiseLarge + 0.2);
        
        // Procedural Flower patches
        float flowerPatch = snoise(vPosition.xz * 0.3);
        if (flowerPatch > 0.4) {
            float flowerNoise = snoise(vPosition.xz * 8.0);
            if (flowerNoise > 0.6) {
                ground = mix(ground, flowerPurple, 0.7);
            } else if (flowerNoise < -0.6) {
                ground = mix(ground, flowerYellow, 0.7);
            }
        }
        
        finalColor = ground + grain;
    }

    // --- AXIOM GRID OVERLAY ---
    // The digital matrix layer that represents the underlying simulation code
    float grid_scale = 0.5;
    vec2 grid_uv = vPosition.xz * grid_scale;
    vec2 grid_lines = abs(fract(grid_uv - 0.5) - 0.5) / fwidth(grid_uv);
    float grid_pattern = 1.0 - min(min(grid_lines.x, grid_lines.y), 1.0);
    
    vec3 axiom_cyan = vec3(0.0, 0.9, 1.0);
    vec3 warning_red = vec3(1.0, 0.2, 0.2);
    
    // Grid becomes red and more visible when reality stability is low
    vec3 grid_color = mix(axiom_cyan, warning_red, uAwakeningDensity);
    float grid_alpha = 0.03 + (uAwakeningDensity * 0.4); 
    
    finalColor = mix(finalColor, grid_color, grid_pattern * grid_alpha);

    // Basic Lighting
    vec3 sunDir = normalize(vec3(0.5, 0.8, 0.3));
    float diff = max(dot(normal, sunDir), 0.0);
    vec3 ambient = vec3(0.25);
    
    finalColor *= (ambient + diff * 0.8);

    // Chromatic Aberration Glitch on instability
    if(vGlitch > 0.5) {
        finalColor.r *= 1.4;
        finalColor.b *= 0.6;
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
