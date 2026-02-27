import * as THREE from 'three';
import { AgentState } from '../../types';
import type { HumanoidBones } from './HumanoidModel';

export type AnimationName = 'idle' | 'walk' | 'run' | 'attack' | 'death';

const CROSSFADE_DURATION = 0.3;

function createIdleClip(bones: HumanoidBones): THREE.AnimationClip {
  const duration = 2.0;
  const fps = 30;
  const numFrames = duration * fps;
  const times: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    times.push((i / numFrames) * duration);
  }

  const tracks: THREE.KeyframeTrack[] = [];

  const spineQuats: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(Math.sin(t) * 0.015, 0, Math.sin(t * 0.5) * 0.01));
    spineQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.spine.name}.quaternion`, times, spineQuats));

  const chestQuats: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(Math.sin(t + 0.5) * 0.01, 0, 0));
    chestQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.chest.name}.quaternion`, times, chestQuats));

  const headQuats: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(Math.sin(t * 0.7) * 0.02, Math.sin(t * 0.3) * 0.015, 0));
    headQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.head.name}.quaternion`, times, headQuats));

  const armSwayL: number[] = [];
  const armSwayR: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;
    const qL = new THREE.Quaternion();
    qL.setFromEuler(new THREE.Euler(Math.sin(t) * 0.02, 0, 0.05));
    armSwayL.push(qL.x, qL.y, qL.z, qL.w);
    const qR = new THREE.Quaternion();
    qR.setFromEuler(new THREE.Euler(Math.sin(t + Math.PI) * 0.02, 0, -0.05));
    armSwayR.push(qR.x, qR.y, qR.z, qR.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmL.name}.quaternion`, times, armSwayL));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmR.name}.quaternion`, times, armSwayR));

  return new THREE.AnimationClip('idle', duration, tracks);
}

function createWalkClip(bones: HumanoidBones): THREE.AnimationClip {
  const duration = 1.0;
  const fps = 30;
  const numFrames = duration * fps;
  const times: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    times.push((i / numFrames) * duration);
  }

  const tracks: THREE.KeyframeTrack[] = [];

  const legPairs: [THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone, THREE.Bone][] = [
    [bones.upperLegL, bones.lowerLegL, bones.footL, bones.upperLegR, bones.lowerLegR, bones.footR],
  ];

  for (const [upperL, lowerL, footL, upperR, lowerR, footR] of legPairs) {
    const upperLQuats: number[] = [];
    const lowerLQuats: number[] = [];
    const upperRQuats: number[] = [];
    const lowerRQuats: number[] = [];

    for (let i = 0; i <= numFrames; i++) {
      const t = (i / numFrames) * Math.PI * 2;

      const qUL = new THREE.Quaternion();
      qUL.setFromEuler(new THREE.Euler(Math.sin(t) * 0.4, 0, 0));
      upperLQuats.push(qUL.x, qUL.y, qUL.z, qUL.w);

      const qLL = new THREE.Quaternion();
      const lowerBend = Math.max(0, -Math.sin(t)) * 0.5;
      qLL.setFromEuler(new THREE.Euler(lowerBend, 0, 0));
      lowerLQuats.push(qLL.x, qLL.y, qLL.z, qLL.w);

      const qUR = new THREE.Quaternion();
      qUR.setFromEuler(new THREE.Euler(Math.sin(t + Math.PI) * 0.4, 0, 0));
      upperRQuats.push(qUR.x, qUR.y, qUR.z, qUR.w);

      const qLR = new THREE.Quaternion();
      const lowerBendR = Math.max(0, -Math.sin(t + Math.PI)) * 0.5;
      qLR.setFromEuler(new THREE.Euler(lowerBendR, 0, 0));
      lowerRQuats.push(qLR.x, qLR.y, qLR.z, qLR.w);
    }

    tracks.push(new THREE.QuaternionKeyframeTrack(`${upperL.name}.quaternion`, times, upperLQuats));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${lowerL.name}.quaternion`, times, lowerLQuats));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${upperR.name}.quaternion`, times, upperRQuats));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${lowerR.name}.quaternion`, times, lowerRQuats));
  }

  const armLQuats: number[] = [];
  const armRQuats: number[] = [];
  const forearmLQuats: number[] = [];
  const forearmRQuats: number[] = [];

  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;

    const qAL = new THREE.Quaternion();
    qAL.setFromEuler(new THREE.Euler(Math.sin(t + Math.PI) * 0.3, 0, 0.1));
    armLQuats.push(qAL.x, qAL.y, qAL.z, qAL.w);

    const qAR = new THREE.Quaternion();
    qAR.setFromEuler(new THREE.Euler(Math.sin(t) * 0.3, 0, -0.1));
    armRQuats.push(qAR.x, qAR.y, qAR.z, qAR.w);

    const qFL = new THREE.Quaternion();
    qFL.setFromEuler(new THREE.Euler(-0.15, 0, 0));
    forearmLQuats.push(qFL.x, qFL.y, qFL.z, qFL.w);

    const qFR = new THREE.Quaternion();
    qFR.setFromEuler(new THREE.Euler(-0.15, 0, 0));
    forearmRQuats.push(qFR.x, qFR.y, qFR.z, qFR.w);
  }

  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmL.name}.quaternion`, times, armLQuats));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmR.name}.quaternion`, times, armRQuats));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.forearmL.name}.quaternion`, times, forearmLQuats));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.forearmR.name}.quaternion`, times, forearmRQuats));

  const spineQuats: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(0, Math.sin(t) * 0.05, 0));
    spineQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.spine.name}.quaternion`, times, spineQuats));

  return new THREE.AnimationClip('walk', duration, tracks);
}

function createRunClip(bones: HumanoidBones): THREE.AnimationClip {
  const duration = 0.6;
  const fps = 30;
  const numFrames = Math.round(duration * fps);
  const times: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    times.push((i / numFrames) * duration);
  }

  const tracks: THREE.KeyframeTrack[] = [];

  const upperLLegQuats: number[] = [];
  const lowerLLegQuats: number[] = [];
  const upperRLegQuats: number[] = [];
  const lowerRLegQuats: number[] = [];

  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;

    const qUL = new THREE.Quaternion();
    qUL.setFromEuler(new THREE.Euler(Math.sin(t) * 0.6, 0, 0));
    upperLLegQuats.push(qUL.x, qUL.y, qUL.z, qUL.w);

    const qLL = new THREE.Quaternion();
    qLL.setFromEuler(new THREE.Euler(Math.max(0, -Math.sin(t)) * 0.8, 0, 0));
    lowerLLegQuats.push(qLL.x, qLL.y, qLL.z, qLL.w);

    const qUR = new THREE.Quaternion();
    qUR.setFromEuler(new THREE.Euler(Math.sin(t + Math.PI) * 0.6, 0, 0));
    upperRLegQuats.push(qUR.x, qUR.y, qUR.z, qUR.w);

    const qLR = new THREE.Quaternion();
    qLR.setFromEuler(new THREE.Euler(Math.max(0, -Math.sin(t + Math.PI)) * 0.8, 0, 0));
    lowerRLegQuats.push(qLR.x, qLR.y, qLR.z, qLR.w);
  }

  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperLegL.name}.quaternion`, times, upperLLegQuats));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.lowerLegL.name}.quaternion`, times, lowerLLegQuats));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperLegR.name}.quaternion`, times, upperRLegQuats));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.lowerLegR.name}.quaternion`, times, lowerRLegQuats));

  const armLQuats: number[] = [];
  const armRQuats: number[] = [];

  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;

    const qAL = new THREE.Quaternion();
    qAL.setFromEuler(new THREE.Euler(Math.sin(t + Math.PI) * 0.5, 0, 0.15));
    armLQuats.push(qAL.x, qAL.y, qAL.z, qAL.w);

    const qAR = new THREE.Quaternion();
    qAR.setFromEuler(new THREE.Euler(Math.sin(t) * 0.5, 0, -0.15));
    armRQuats.push(qAR.x, qAR.y, qAR.z, qAR.w);
  }

  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmL.name}.quaternion`, times, armLQuats));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmR.name}.quaternion`, times, armRQuats));

  const chestQuats: number[] = [];
  for (let i = 0; i <= numFrames; i++) {
    const t = (i / numFrames) * Math.PI * 2;
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(0.08, Math.sin(t) * 0.08, 0));
    chestQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.chest.name}.quaternion`, times, chestQuats));

  return new THREE.AnimationClip('run', duration, tracks);
}

function createAttackClip(bones: HumanoidBones): THREE.AnimationClip {
  const duration = 0.8;
  const times = [0, 0.15, 0.35, 0.55, 0.8];

  const tracks: THREE.KeyframeTrack[] = [];

  const armRQuats: number[] = [];
  const poses = [
    new THREE.Euler(0, 0, -0.1),
    new THREE.Euler(-0.8, 0, -0.3),
    new THREE.Euler(0.6, 0, 0.2),
    new THREE.Euler(0.3, 0, 0.1),
    new THREE.Euler(0, 0, -0.1),
  ];
  for (const euler of poses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    armRQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmR.name}.quaternion`, times, armRQuats));

  const forearmRQuats: number[] = [];
  const forearmPoses = [
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(-0.5, 0, 0),
    new THREE.Euler(-0.2, 0, 0),
    new THREE.Euler(-0.1, 0, 0),
    new THREE.Euler(0, 0, 0),
  ];
  for (const euler of forearmPoses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    forearmRQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.forearmR.name}.quaternion`, times, forearmRQuats));

  const chestQuats: number[] = [];
  const chestPoses = [
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(0, -0.2, 0),
    new THREE.Euler(0.1, 0.3, 0),
    new THREE.Euler(0.05, 0.1, 0),
    new THREE.Euler(0, 0, 0),
  ];
  for (const euler of chestPoses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    chestQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.chest.name}.quaternion`, times, chestQuats));

  const armLQuats: number[] = [];
  const armLPoses = [
    new THREE.Euler(0, 0, 0.1),
    new THREE.Euler(0.2, 0, 0.2),
    new THREE.Euler(-0.1, 0, 0.15),
    new THREE.Euler(0, 0, 0.12),
    new THREE.Euler(0, 0, 0.1),
  ];
  for (const euler of armLPoses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    armLQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmL.name}.quaternion`, times, armLQuats));

  return new THREE.AnimationClip('attack', duration, tracks);
}

function createDeathClip(bones: HumanoidBones): THREE.AnimationClip {
  const duration = 1.2;
  const times = [0, 0.3, 0.6, 0.9, 1.2];

  const tracks: THREE.KeyframeTrack[] = [];

  const spineQuats: number[] = [];
  const spinePoses = [
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(0.2, 0, 0.1),
    new THREE.Euler(0.5, 0, 0.3),
    new THREE.Euler(0.8, 0, 0.5),
    new THREE.Euler(Math.PI / 2, 0, 0.6),
  ];
  for (const euler of spinePoses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    spineQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.spine.name}.quaternion`, times, spineQuats));

  const headQuats: number[] = [];
  const headPoses = [
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(0.3, 0, 0),
    new THREE.Euler(0.5, 0.2, 0),
    new THREE.Euler(0.4, 0.1, 0.2),
    new THREE.Euler(0.3, 0, 0.3),
  ];
  for (const euler of headPoses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    headQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.head.name}.quaternion`, times, headQuats));

  const armLQuats: number[] = [];
  const armLPoses = [
    new THREE.Euler(0, 0, 0.1),
    new THREE.Euler(0.3, 0, 0.4),
    new THREE.Euler(0.5, 0, 0.8),
    new THREE.Euler(0.4, 0, 1.0),
    new THREE.Euler(0.2, 0, 1.2),
  ];
  for (const euler of armLPoses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    armLQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmL.name}.quaternion`, times, armLQuats));

  const armRQuats: number[] = [];
  const armRPoses = [
    new THREE.Euler(0, 0, -0.1),
    new THREE.Euler(0.3, 0, -0.4),
    new THREE.Euler(0.5, 0, -0.8),
    new THREE.Euler(0.4, 0, -1.0),
    new THREE.Euler(0.2, 0, -1.2),
  ];
  for (const euler of armRPoses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    armRQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperArmR.name}.quaternion`, times, armRQuats));

  const legLQuats: number[] = [];
  const legLPoses = [
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(-0.1, 0, 0),
    new THREE.Euler(-0.2, 0, 0.1),
    new THREE.Euler(-0.1, 0, 0.15),
    new THREE.Euler(0, 0, 0.2),
  ];
  for (const euler of legLPoses) {
    const q = new THREE.Quaternion();
    q.setFromEuler(euler);
    legLQuats.push(q.x, q.y, q.z, q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperLegL.name}.quaternion`, times, legLQuats));
  tracks.push(new THREE.QuaternionKeyframeTrack(`${bones.upperLegR.name}.quaternion`, times, legLQuats));

  const rootPos: number[] = [
    0, 0, 0,
    0, -0.05, 0,
    0, -0.15, 0,
    0, -0.3, 0,
    0, -0.5, 0,
  ];
  tracks.push(new THREE.VectorKeyframeTrack(`${bones.root.name}.position`, times, rootPos));

  return new THREE.AnimationClip('death', duration, tracks);
}

export function createAnimationClips(bones: HumanoidBones): Record<AnimationName, THREE.AnimationClip> {
  return {
    idle: createIdleClip(bones),
    walk: createWalkClip(bones),
    run: createRunClip(bones),
    attack: createAttackClip(bones),
    death: createDeathClip(bones),
  };
}

const STATE_TO_ANIMATION: Record<string, AnimationName> = {
  [AgentState.IDLE]: 'idle',
  [AgentState.THINKING]: 'idle',
  [AgentState.BANKING]: 'idle',
  [AgentState.MARKETING]: 'idle',
  [AgentState.TRADING]: 'idle',
  [AgentState.CRAFTING]: 'idle',
  [AgentState.ALLIANCE_FORMING]: 'idle',
  [AgentState.GATHERING]: 'walk',
  [AgentState.EXPLORING]: 'walk',
  [AgentState.QUESTING]: 'walk',
  [AgentState.BUILDING]: 'walk',
  [AgentState.COMBAT]: 'attack',
  [AgentState.ASCENDING]: 'run',
  [AgentState.DUNGEONEERING]: 'run',
  [AgentState.MOUNTED]: 'run',
};

export function getAnimationForState(state: AgentState): AnimationName {
  return STATE_TO_ANIMATION[state] || 'idle';
}

export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private actions: Record<AnimationName, THREE.AnimationAction>;
  private currentAction: THREE.AnimationAction;
  private currentName: AnimationName;

  constructor(mesh: THREE.SkinnedMesh, clips: Record<AnimationName, THREE.AnimationClip>) {
    this.mixer = new THREE.AnimationMixer(mesh);

    this.actions = {} as Record<AnimationName, THREE.AnimationAction>;
    for (const [name, clip] of Object.entries(clips)) {
      const action = this.mixer.clipAction(clip);
      if (name === 'death') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else if (name === 'attack') {
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      this.actions[name as AnimationName] = action;
    }

    this.currentName = 'idle';
    this.currentAction = this.actions.idle;
    this.currentAction.play();
  }

  play(name: AnimationName): void {
    if (name === this.currentName) return;

    const nextAction = this.actions[name];
    if (!nextAction) return;

    nextAction.reset();
    nextAction.play();
    this.currentAction.crossFadeTo(nextAction, CROSSFADE_DURATION, true);

    this.currentAction = nextAction;
    this.currentName = name;
  }

  playForState(state: AgentState): void {
    const animName = getAnimationForState(state);
    this.play(animName);
  }

  update(delta: number): void {
    this.mixer.update(delta);
  }

  getCurrentAnimation(): AnimationName {
    return this.currentName;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.mixer.getRoot());
  }
}
