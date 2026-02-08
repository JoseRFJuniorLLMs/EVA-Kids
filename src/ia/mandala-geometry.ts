/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

// Cores vibrantes para crianças (Kids-friendly palette)
export const mandalaColors = {
  verde: 0x69DB7C,      // Kids green
  azul: 0x4DABF7,       // Kids blue
  amarelo: 0xFFE066,    // Kids yellow
  coral: 0xFF6B6B,      // Kids red/coral
  turquesa: 0x38D9A9,   // Kids teal
  roxo: 0xDA77F2,       // Kids purple
  rosa: 0xF783AC,       // Kids pink
  laranja: 0xFFA94D,    // Kids orange
  indigo: 0x748FFC      // Kids indigo
};

export function createMandalaLayers(scene: THREE.Scene) {
  const mandalaGroup = new THREE.Group();

  // ===== CENTRO (Círculo central) =====
  const centerGeometry = new THREE.CircleGeometry(0.5, 64);
  const centerMaterial = new THREE.MeshPhongMaterial({
    color: mandalaColors.amarelo,
    emissive: mandalaColors.amarelo,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide
  });
  const centerCircle = new THREE.Mesh(centerGeometry, centerMaterial);
  centerCircle.position.z = 0.1;
  mandalaGroup.add(centerCircle);

  // ===== ANÉIS CONCÊNTRICOS (5 regiões) =====
  const rings: THREE.Mesh[] = [];
  const ringColors = [
    mandalaColors.coral,
    mandalaColors.laranja,
    mandalaColors.verde,
    mandalaColors.azul,
    mandalaColors.roxo
  ];

  for (let i = 0; i < 5; i++) {
    const innerRadius = 0.6 + (i * 0.5);
    const outerRadius = 0.85 + (i * 0.5);

    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const ringMaterial = new THREE.MeshPhongMaterial({
      color: ringColors[i],
      emissive: ringColors[i],
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.z = 0.05 - (i * 0.01);
    rings.push(ring);
    mandalaGroup.add(ring);
  }

  // ===== PÉTALAS (padrão de cestaria) =====
  const petalGroup = new THREE.Group();
  const petalCount = 12;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;

    // Criar forma de pétala (elipse)
    const petalGeometry = new THREE.CircleGeometry(0.3, 32);
    petalGeometry.scale(1, 2, 1);

    const petalMaterial = new THREE.MeshPhongMaterial({
      color: i % 2 === 0 ? mandalaColors.turquesa : mandalaColors.rosa,
      emissive: i % 2 === 0 ? mandalaColors.turquesa : mandalaColors.rosa,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
    petal.position.x = Math.cos(angle) * 1.5;
    petal.position.y = Math.sin(angle) * 1.5;
    petal.rotation.z = angle + Math.PI / 2;

    petalGroup.add(petal);
  }
  mandalaGroup.add(petalGroup);

  // ===== TRIÂNGULOS (grafismos geométricos) =====
  const triangleGroup = new THREE.Group();
  const triangleCount = 8;

  for (let i = 0; i < triangleCount; i++) {
    const angle = (i / triangleCount) * Math.PI * 2;

    const triangleGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0.4, 0,
      -0.2, 0, 0,
      0.2, 0, 0
    ]);
    triangleGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    triangleGeometry.computeVertexNormals();

    const triangleMaterial = new THREE.MeshPhongMaterial({
      color: mandalaColors.indigo,
      emissive: mandalaColors.indigo,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });

    const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
    triangle.position.x = Math.cos(angle) * 2.8;
    triangle.position.y = Math.sin(angle) * 2.8;
    triangle.rotation.z = angle - Math.PI / 2;

    triangleGroup.add(triangle);
  }
  triangleGroup.position.z = -0.05;
  mandalaGroup.add(triangleGroup);

  // ===== LINHAS RADIAIS (conexões) =====
  const lineGroup = new THREE.Group();
  const lineCount = 24;

  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;

    const lineGeometry = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0),
      new THREE.Vector3(Math.cos(angle) * 4, Math.sin(angle) * 4, 0)
    ];
    lineGeometry.setFromPoints(points);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);
    lineGroup.add(line);
  }
  lineGroup.position.z = -0.1;
  mandalaGroup.add(lineGroup);

  return {
    mandalaGroup,
    centerCircle,
    rings,
    petalGroup,
    triangleGroup,
    lineGroup
  };
}
