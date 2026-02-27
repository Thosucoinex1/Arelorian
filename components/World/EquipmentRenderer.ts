import * as THREE from 'three';
import type { ItemRarity, ItemType, Item } from '../../types';

const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#9ca3af',
  UNCOMMON: '#22c55e',
  RARE: '#3b82f6',
  EPIC: '#a855f7',
  LEGENDARY: '#f97316',
  AXIOMATIC: '#ec4899',
};

function getRarityMaterial(rarity: ItemRarity): THREE.MeshStandardMaterial {
  const color = RARITY_COLORS[rarity] || RARITY_COLORS.COMMON;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rarity === 'LEGENDARY' || rarity === 'AXIOMATIC' ? 0.2 : 0.5,
    metalness: rarity === 'LEGENDARY' || rarity === 'AXIOMATIC' ? 0.8 : 0.4,
    emissive: rarity === 'EPIC' || rarity === 'LEGENDARY' || rarity === 'AXIOMATIC' ? color : '#000000',
    emissiveIntensity: rarity === 'AXIOMATIC' ? 0.4 : rarity === 'LEGENDARY' ? 0.25 : rarity === 'EPIC' ? 0.15 : 0,
    side: THREE.DoubleSide,
  });
}

function createHelmetMesh(rarity: ItemRarity): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const mat = getRarityMaterial(rarity);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'equipment_helmet';
  mesh.position.set(0, 0.12, 0);
  mesh.castShadow = true;
  return mesh;
}

function createChestArmorMesh(rarity: ItemRarity): THREE.Mesh {
  const geo = new THREE.BoxGeometry(0.56, 0.44, 0.34);
  const mat = getRarityMaterial(rarity);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'equipment_chest';
  mesh.position.set(0, 0.2, 0);
  mesh.castShadow = true;
  return mesh;
}

function createLegArmorMeshes(rarity: ItemRarity): THREE.Group {
  const group = new THREE.Group();
  group.name = 'equipment_legs';
  const mat = getRarityMaterial(rarity);

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.36, 6), mat);
  leftLeg.name = 'equipment_leg_left';
  leftLeg.position.set(0, -0.18, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.36, 6), mat.clone());
  rightLeg.name = 'equipment_leg_right';
  rightLeg.position.set(0, -0.18, 0);
  rightLeg.castShadow = true;

  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  return group;
}

function createWeaponMesh(rarity: ItemRarity): THREE.Group {
  const group = new THREE.Group();
  group.name = 'equipment_weapon';
  const mat = getRarityMaterial(rarity);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mat);
  handle.position.set(0, -0.25, 0);
  handle.castShadow = true;

  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 6), mat.clone());
  blade.position.set(0, -0.55, 0);
  blade.rotation.x = Math.PI;
  blade.castShadow = true;

  group.add(handle);
  group.add(blade);
  return group;
}

function createShieldMesh(rarity: ItemRarity): THREE.Mesh {
  const geo = new THREE.CircleGeometry(0.18, 8);
  const mat = getRarityMaterial(rarity);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'equipment_shield';
  mesh.position.set(0, -0.1, 0.1);
  mesh.rotation.y = Math.PI * 0.5;
  mesh.castShadow = true;
  return mesh;
}

function clearEquipmentFromBone(bone: THREE.Bone, prefix: string): void {
  const toRemove: THREE.Object3D[] = [];
  for (const child of bone.children) {
    if (child.name.startsWith(prefix)) {
      toRemove.push(child);
    }
  }
  for (const obj of toRemove) {
    bone.remove(obj);
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      if (obj.material instanceof THREE.Material) obj.material.dispose();
    }
    if (obj instanceof THREE.Group) {
      obj.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry?.dispose();
          if (c.material instanceof THREE.Material) c.material.dispose();
        }
      });
    }
  }
}

export interface EquipmentSlots {
  head: Item | null;
  chest: Item | null;
  legs: Item | null;
  mainHand: Item | null;
  offHand: Item | null;
}

export function attachEquipment(
  humanoidGroup: THREE.Group,
  equipmentSlots: EquipmentSlots
): void {
  const ud = humanoidGroup.userData;
  const headBone: THREE.Bone | undefined = ud.headBone;
  const chestBone: THREE.Bone | undefined = ud.chestBone;
  const handRBone: THREE.Bone | undefined = ud.handRBone;
  const handLBone: THREE.Bone | undefined = ud.handLBone;
  const legBones: {
    upperLegL?: THREE.Bone;
    upperLegR?: THREE.Bone;
  } | undefined = ud.legBones;

  if (headBone) {
    clearEquipmentFromBone(headBone, 'equipment_helmet');
    if (equipmentSlots.head) {
      const helmet = createHelmetMesh(equipmentSlots.head.rarity);
      headBone.add(helmet);
    }
  }

  if (chestBone) {
    clearEquipmentFromBone(chestBone, 'equipment_chest');
    if (equipmentSlots.chest) {
      const chest = createChestArmorMesh(equipmentSlots.chest.rarity);
      chestBone.add(chest);
    }
  }

  if (legBones) {
    const { upperLegL, upperLegR } = legBones;
    if (upperLegL) clearEquipmentFromBone(upperLegL, 'equipment_leg');
    if (upperLegR) clearEquipmentFromBone(upperLegR, 'equipment_leg');

    if (equipmentSlots.legs) {
      const legGroup = createLegArmorMeshes(equipmentSlots.legs.rarity);
      if (upperLegL && legGroup.userData.leftLeg) {
        upperLegL.add(legGroup.userData.leftLeg);
      }
      if (upperLegR && legGroup.userData.rightLeg) {
        upperLegR.add(legGroup.userData.rightLeg);
      }
    }
  }

  if (handRBone) {
    clearEquipmentFromBone(handRBone, 'equipment_weapon');
    if (equipmentSlots.mainHand) {
      const weapon = createWeaponMesh(equipmentSlots.mainHand.rarity);
      handRBone.add(weapon);
    }
  }

  if (handLBone) {
    clearEquipmentFromBone(handLBone, 'equipment_shield');
    if (equipmentSlots.offHand) {
      const shield = createShieldMesh(equipmentSlots.offHand.rarity);
      handLBone.add(shield);
    }
  }
}
