/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Analyser } from './analyser';

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createMandalaLayers, mandalaColors } from './mandala-geometry';

@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private mandalaGroup!: THREE.Group;
  private centerCircle!: THREE.Mesh;
  private rings!: THREE.Mesh[];
  private petalGroup!: THREE.Group;
  private triangleGroup!: THREE.Group;
  private lineGroup!: THREE.Group;
  private particles!: THREE.Points;
  private prevTime = 0;

  private _outputNode!: AudioNode;
  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }
  get outputNode() { return this._outputNode; }

  private _inputNode!: AudioNode;
  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }
  get inputNode() { return this._inputNode; }

  private canvas!: HTMLCanvasElement;

  static styles = css`
    canvas {
      width: 100% !important;
      height: 100% !important;
      position: absolute;
      inset: 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
  }

  private init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001F3F);

    // Câmera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);
    this.camera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const greenLight = new THREE.PointLight(mandalaColors.verde, 4, 20);
    greenLight.position.set(3, 3, 5);
    scene.add(greenLight);

    const yellowLight = new THREE.PointLight(mandalaColors.amarelo, 4, 20);
    yellowLight.position.set(-3, -3, 5);
    scene.add(yellowLight);

    const blueLight = new THREE.PointLight(mandalaColors.azul, 3, 20);
    blueLight.position.set(0, 0, 8);
    scene.add(blueLight);

    // Criar mandala
    const mandalaLayers = createMandalaLayers(scene);
    this.mandalaGroup = mandalaLayers.mandalaGroup;
    this.centerCircle = mandalaLayers.centerCircle;
    this.rings = mandalaLayers.rings;
    this.petalGroup = mandalaLayers.petalGroup;
    this.triangleGroup = mandalaLayers.triangleGroup;
    this.lineGroup = mandalaLayers.lineGroup;

    scene.add(this.mandalaGroup);

    // Partículas orbitais
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 500;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);

    const colorArray = [
      mandalaColors.verde,
      mandalaColors.azul,
      mandalaColors.amarelo,
      mandalaColors.coral,
      mandalaColors.turquesa
    ];

    for (let i = 0; i < particlesCount; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 2;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;
      positions[i3 + 2] = (Math.random() - 0.5) * 2;

      const color = new THREE.Color(colorArray[Math.floor(Math.random() * colorArray.length)]);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(this.particles);

    // Post-processing
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.85
    );

    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    this.composer = composer;

    // Resize
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onWindowResize);
    this.animation();
  }

  private animation() {
    requestAnimationFrame(() => this.animation());

    this.inputAnalyser.update();
    this.outputAnalyser.update();

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 60);
    this.prevTime = t;

    // Calcular intensidades de áudio
    const inputAvg = this.inputAnalyser.data.reduce((a, b) => a + b, 0) / this.inputAnalyser.data.length;
    const outputAvg = this.outputAnalyser.data.reduce((a, b) => a + b, 0) / this.outputAnalyser.data.length;

    // Normalizar valores (0 a 1)
    const inputIntensity = inputAvg / 255;
    const outputIntensity = outputAvg / 255;

    // Intensidade combinada para pulsação geral
    const totalIntensity = Math.max(inputIntensity, outputIntensity);

    // ===== ROTAÇÃO GERAL DA MANDALA =====
    const rotationSpeed = 0.002 + (0.003 * totalIntensity);
    this.mandalaGroup.rotation.z += rotationSpeed;

    // ===== PULSAÇÃO DO CENTRO (mais intensa) =====
    const centerBasePulse = 1 + Math.sin(t * 0.003) * 0.1;
    const centerAudioPulse = 1 + (inputIntensity * 0.4) + (outputIntensity * 0.6);
    const centerScale = centerBasePulse * centerAudioPulse;
    this.centerCircle.scale.setScalar(centerScale);

    // Brilho do centro
    const centerMaterial = this.centerCircle.material as THREE.MeshPhongMaterial;
    centerMaterial.emissiveIntensity = 0.8 + (totalIntensity * 0.5);

    // ===== PULSAÇÃO DOS ANÉIS (5 regiões) =====
    this.rings.forEach((ring, i) => {
      // Rotação alternada + aceleração com áudio
      const rotationDir = i % 2 === 0 ? 1 : -1;
      const audioBoost = 1 + (totalIntensity * 2);
      ring.rotation.z += rotationDir * 0.003 * audioBoost;

      // Escala individual baseada em frequências específicas
      const audioIndex = i % this.outputAnalyser.data.length;
      const ringAudioIntensity = this.outputAnalyser.data[audioIndex] / 255;
      const ringScale = 1 + (ringAudioIntensity * 0.3) + (totalIntensity * 0.2);
      ring.scale.setScalar(ringScale);

      // Brilho do anel
      const material = ring.material as THREE.MeshPhongMaterial;
      material.emissiveIntensity = 0.4 + (ringAudioIntensity * 0.4) + (totalIntensity * 0.3);

      // Opacidade pulsante
      material.opacity = 0.7 + (ringAudioIntensity * 0.3);
    });

    // ===== PULSAÇÃO DAS PÉTALAS (cestaria) =====
    this.petalGroup.children.forEach((petal, i) => {
      const audioIndex = i % this.inputAnalyser.data.length;
      const petalInputIntensity = this.inputAnalyser.data[audioIndex] / 255;

      // Escala forte quando você fala
      const petalScale = 1 + (petalInputIntensity * 0.5) + (totalIntensity * 0.3);
      petal.scale.setScalar(petalScale);

      // Brilho
      const material = petal.material as THREE.MeshPhongMaterial;
      material.emissiveIntensity = 0.3 + (petalInputIntensity * 0.5) + (totalIntensity * 0.2);
    });

    // ===== PULSAÇÃO DOS TRIÂNGULOS (grafismos) =====
    this.triangleGroup.rotation.z -= 0.001 * (1 + totalIntensity * 3);

    this.triangleGroup.children.forEach((triangle, i) => {
      const audioIndex = i % this.outputAnalyser.data.length;
      const triangleOutputIntensity = this.outputAnalyser.data[audioIndex] / 255;

      // Escala forte quando ela responde
      const triangleScale = 1 + (triangleOutputIntensity * 0.4) + (totalIntensity * 0.25);
      triangle.scale.setScalar(triangleScale);

      // Brilho intenso
      const material = triangle.material as THREE.MeshPhongMaterial;
      material.emissiveIntensity = 0.3 + (triangleOutputIntensity * 0.6) + (totalIntensity * 0.3);
    });

    // ===== LINHAS RADIAIS (conexões) =====
    this.lineGroup.rotation.z += 0.0005 * (1 + totalIntensity * 2);

    // Opacidade das linhas baseada no áudio
    this.lineGroup.children.forEach((line) => {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = 0.15 + (totalIntensity * 0.3);
    });

    // ===== PARTÍCULAS (dados culturais) =====
    this.particles.rotation.z += 0.001 + (0.004 * totalIntensity);

    // Tamanho das partículas
    const particlesMaterial = this.particles.material as THREE.PointsMaterial;
    particlesMaterial.size = 0.08 + (totalIntensity * 0.08);
    particlesMaterial.opacity = 0.8 + (totalIntensity * 0.2);

    // ===== ESCALA GERAL DA MANDALA (pulsação master) =====
    const mandalaGlobalScale = 1 + (totalIntensity * 0.15);
    this.mandalaGroup.scale.setScalar(mandalaGlobalScale);

    this.composer.render();
  }

  protected firstUpdated() {
    this.canvas = this.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
    this.init();
  }

  protected render() {
    return html`<canvas></canvas>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gdm-live-audio-visuals-3d': GdmLiveAudioVisuals3D;
  }
}