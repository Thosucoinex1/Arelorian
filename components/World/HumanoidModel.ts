import * as THREE from 'three';

export interface HumanoidAppearance {
  skinTone: string;
  hairStyle: 'bald' | 'short' | 'long' | 'mohawk' | 'ponytail';
  bodyScale: number;
}

export interface HumanoidBones {
  root: THREE.Bone;
  spine: THREE.Bone;
  chest: THREE.Bone;
  neck: THREE.Bone;
  head: THREE.Bone;
  upperArmL: THREE.Bone;
  forearmL: THREE.Bone;
  handL: THREE.Bone;
  upperArmR: THREE.Bone;
  forearmR: THREE.Bone;
  handR: THREE.Bone;
  upperLegL: THREE.Bone;
  lowerLegL: THREE.Bone;
  footL: THREE.Bone;
  upperLegR: THREE.Bone;
  lowerLegR: THREE.Bone;
  footR: THREE.Bone;
}

export interface HumanoidModel {
  group: THREE.Group;
  skeleton: THREE.Skeleton;
  bones: HumanoidBones;
  mesh: THREE.SkinnedMesh;
}

const DEFAULT_APPEARANCE: HumanoidAppearance = {
  skinTone: '#c68642',
  hairStyle: 'short',
  bodyScale: 1.0,
};

function createBone(name: string, length: number): THREE.Bone {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.y = length;
  return bone;
}

function buildSkeleton(): { bones: HumanoidBones; allBones: THREE.Bone[] } {
  const root = new THREE.Bone();
  root.name = 'root';
  root.position.set(0, 0, 0);

  const spine = createBone('spine', 0.0);
  const chest = createBone('chest', 0.45);
  const neck = createBone('neck', 0.4);
  const head = createBone('head', 0.15);

  const upperArmL = createBone('upperArmL', 0.0);
  upperArmL.position.set(-0.35, 0.35, 0);
  const forearmL = createBone('forearmL', -0.3);
  const handL = createBone('handL', -0.25);

  const upperArmR = createBone('upperArmR', 0.0);
  upperArmR.position.set(0.35, 0.35, 0);
  const forearmR = createBone('forearmR', -0.3);
  const handR = createBone('handR', -0.25);

  const upperLegL = createBone('upperLegL', 0.0);
  upperLegL.position.set(-0.15, 0.0, 0);
  const lowerLegL = createBone('lowerLegL', -0.35);
  const footL = createBone('footL', -0.35);

  const upperLegR = createBone('upperLegR', 0.0);
  upperLegR.position.set(0.15, 0.0, 0);
  const lowerLegR = createBone('lowerLegR', -0.35);
  const footR = createBone('footR', -0.35);

  root.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);

  chest.add(upperArmL);
  upperArmL.add(forearmL);
  forearmL.add(handL);

  chest.add(upperArmR);
  upperArmR.add(forearmR);
  forearmR.add(handR);

  root.add(upperLegL);
  upperLegL.add(lowerLegL);
  lowerLegL.add(footL);

  root.add(upperLegR);
  upperLegR.add(lowerLegR);
  lowerLegR.add(footR);

  const allBones = [
    root, spine, chest, neck, head,
    upperArmL, forearmL, handL,
    upperArmR, forearmR, handR,
    upperLegL, lowerLegL, footL,
    upperLegR, lowerLegR, footR,
  ];

  const bones: HumanoidBones = {
    root, spine, chest, neck, head,
    upperArmL, forearmL, handL,
    upperArmR, forearmR, handR,
    upperLegL, lowerLegL, footL,
    upperLegR, lowerLegR, footR,
  };

  return { bones, allBones };
}

interface BodyPart {
  geometry: THREE.BufferGeometry;
  boneIndex: number;
  offset: THREE.Vector3;
}

function createBodyParts(): BodyPart[] {
  const parts: BodyPart[] = [];

  parts.push({
    geometry: new THREE.BoxGeometry(0.4, 0.45, 0.25),
    boneIndex: 1,
    offset: new THREE.Vector3(0, 0.225, 0),
  });

  parts.push({
    geometry: new THREE.BoxGeometry(0.5, 0.4, 0.3),
    boneIndex: 2,
    offset: new THREE.Vector3(0, 0.2, 0),
  });

  parts.push({
    geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.15, 6),
    boneIndex: 3,
    offset: new THREE.Vector3(0, 0.075, 0),
  });

  parts.push({
    geometry: new THREE.SphereGeometry(0.18, 8, 8),
    boneIndex: 4,
    offset: new THREE.Vector3(0, 0.1, 0),
  });

  parts.push({
    geometry: new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6),
    boneIndex: 5,
    offset: new THREE.Vector3(0, -0.15, 0),
  });
  parts.push({
    geometry: new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6),
    boneIndex: 6,
    offset: new THREE.Vector3(0, -0.125, 0),
  });
  parts.push({
    geometry: new THREE.BoxGeometry(0.06, 0.06, 0.08),
    boneIndex: 7,
    offset: new THREE.Vector3(0, -0.03, 0),
  });

  parts.push({
    geometry: new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6),
    boneIndex: 8,
    offset: new THREE.Vector3(0, -0.15, 0),
  });
  parts.push({
    geometry: new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6),
    boneIndex: 9,
    offset: new THREE.Vector3(0, -0.125, 0),
  });
  parts.push({
    geometry: new THREE.BoxGeometry(0.06, 0.06, 0.08),
    boneIndex: 10,
    offset: new THREE.Vector3(0, -0.03, 0),
  });

  parts.push({
    geometry: new THREE.CylinderGeometry(0.08, 0.07, 0.35, 6),
    boneIndex: 11,
    offset: new THREE.Vector3(0, -0.175, 0),
  });
  parts.push({
    geometry: new THREE.CylinderGeometry(0.06, 0.07, 0.35, 6),
    boneIndex: 12,
    offset: new THREE.Vector3(0, -0.175, 0),
  });
  parts.push({
    geometry: new THREE.BoxGeometry(0.1, 0.05, 0.16),
    boneIndex: 13,
    offset: new THREE.Vector3(0, -0.025, 0.03),
  });

  parts.push({
    geometry: new THREE.CylinderGeometry(0.08, 0.07, 0.35, 6),
    boneIndex: 14,
    offset: new THREE.Vector3(0, -0.175, 0),
  });
  parts.push({
    geometry: new THREE.CylinderGeometry(0.06, 0.07, 0.35, 6),
    boneIndex: 15,
    offset: new THREE.Vector3(0, -0.175, 0),
  });
  parts.push({
    geometry: new THREE.BoxGeometry(0.1, 0.05, 0.16),
    boneIndex: 16,
    offset: new THREE.Vector3(0, -0.025, 0.03),
  });

  return parts;
}

function mergeAndSkin(parts: BodyPart[], boneCount: number): { geometry: THREE.BufferGeometry } {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  let vertexOffset = 0;

  for (const part of parts) {
    const geo = part.geometry;
    const pos = geo.getAttribute('position');
    const norm = geo.getAttribute('normal');
    const idx = geo.getIndex();

    for (let i = 0; i < pos.count; i++) {
      positions.push(
        pos.getX(i) + part.offset.x,
        pos.getY(i) + part.offset.y,
        pos.getZ(i) + part.offset.z,
      );
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      skinIndices.push(part.boneIndex, 0, 0, 0);
      skinWeights.push(1, 0, 0, 0);
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + vertexOffset);
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices.push(i + vertexOffset);
      }
    }

    vertexOffset += pos.count;
    geo.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  return { geometry };
}

function createHairMesh(style: HumanoidAppearance['hairStyle'], skinTone: string): THREE.Mesh | null {
  const hairColor = darkenColor(skinTone, 0.3);
  const mat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.8,
    metalness: 0.0,
  });

  let geo: THREE.BufferGeometry;

  switch (style) {
    case 'bald':
      return null;
    case 'short':
      geo = new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
      break;
    case 'long':
      geo = new THREE.BoxGeometry(0.38, 0.35, 0.28);
      break;
    case 'mohawk':
      geo = new THREE.BoxGeometry(0.06, 0.18, 0.3);
      break;
    case 'ponytail':
      geo = new THREE.CylinderGeometry(0.04, 0.03, 0.3, 6);
      break;
    default:
      return null;
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'hair';

  switch (style) {
    case 'short':
      mesh.position.set(0, 0.12, 0);
      break;
    case 'long':
      mesh.position.set(0, 0.1, -0.05);
      break;
    case 'mohawk':
      mesh.position.set(0, 0.27, 0);
      break;
    case 'ponytail':
      mesh.position.set(0, 0.0, -0.15);
      mesh.rotation.x = 0.5;
      break;
  }

  return mesh;
}

function darkenColor(hex: string, factor: number): string {
  const c = new THREE.Color(hex);
  c.r = Math.max(0, c.r * (1 - factor));
  c.g = Math.max(0, c.g * (1 - factor));
  c.b = Math.max(0, c.b * (1 - factor));
  return '#' + c.getHexString();
}

export function createHumanoidModel(config?: Partial<HumanoidAppearance>): HumanoidModel {
  const appearance: HumanoidAppearance = { ...DEFAULT_APPEARANCE, ...config };
  const scale = appearance.bodyScale;

  const { bones, allBones } = buildSkeleton();
  const skeleton = new THREE.Skeleton(allBones);

  const parts = createBodyParts();

  const boneWorldPositions: THREE.Vector3[] = [];
  const tempRoot = bones.root.clone(true);
  tempRoot.updateWorldMatrix(true, true);

  const collectBonePositions = (bone: THREE.Bone, list: THREE.Vector3[]) => {
    const wp = new THREE.Vector3();
    bone.getWorldPosition(wp);
    list.push(wp);
    for (const child of bone.children) {
      if (child instanceof THREE.Bone) {
        collectBonePositions(child, list);
      }
    }
  };

  bones.root.updateWorldMatrix(true, true);

  const { geometry } = mergeAndSkin(parts, allBones.length);

  const material = new THREE.MeshStandardMaterial({
    color: appearance.skinTone,
    roughness: 0.7,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
  skinnedMesh.name = 'humanoidBody';
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;

  skinnedMesh.add(bones.root);
  skinnedMesh.bind(skeleton);

  const group = new THREE.Group();
  group.name = 'humanoidModel';
  group.add(skinnedMesh);

  group.scale.set(scale, scale, scale);

  const hairMesh = createHairMesh(appearance.hairStyle, appearance.skinTone);
  if (hairMesh) {
    bones.head.add(hairMesh);
  }

  group.userData = {
    headBone: bones.head,
    chestBone: bones.chest,
    handRBone: bones.handR,
    handLBone: bones.handL,
    legBones: {
      upperLegL: bones.upperLegL,
      upperLegR: bones.upperLegR,
      lowerLegL: bones.lowerLegL,
      lowerLegR: bones.lowerLegR,
    },
    neckBone: bones.neck,
    spineBone: bones.spine,
  };

  return {
    group,
    skeleton,
    bones,
    mesh: skinnedMesh,
  };
}
