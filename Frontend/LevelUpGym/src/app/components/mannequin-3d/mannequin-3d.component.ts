import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MuscleInfo } from './interfaces/mannequin.interface';
import { Mannequin3DService } from './mannequin-3d.service';

@Component({
  selector: 'app-mannequin-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mannequin-3d.component.html',
  styleUrl: './mannequin-3d.component.css' // Using CSS for budget compliance
})
export class Mannequin3DComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Outputs as specified in Component Events requirement
  @Output() muscleHover = new EventEmitter<MuscleInfo>();
  @Output() muscleSelect = new EventEmitter<MuscleInfo>();
  @Output() muscleDeselect = new EventEmitter<void>();

  // Tooltip & State properties
  tooltipVisible = false;
  hoveredMuscleName = '';
  tooltipX = 0;
  tooltipY = 0;
  isAutoRotating = false;

  // Selected muscle status
  selectedMuscleId: string | null = null;

  // Three.js instances
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private animationFrameId!: number;
  private resizeObserver!: ResizeObserver;

  // Interaction properties
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private muscleMeshes: THREE.Mesh[] = [];
  private baseMeshes: THREE.Object3D[] = [];
  private hoveredMuscleId: string | null = null;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material>();

  // Reusable materials
  private baseMetallicMaterial!: THREE.MeshStandardMaterial;
  private muscleMaterial!: THREE.MeshStandardMaterial;
  private highlightMaterial!: THREE.MeshStandardMaterial;
  private selectedMaterial!: THREE.MeshStandardMaterial;

  constructor(private mannequinService: Mannequin3DService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initThree();
    this.createMannequin();
    this.setupResizeObserver();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.controls) {
      this.controls.dispose();
    }

    // Release GPU assets
    this.muscleMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });

    this.baseMeshes.forEach(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (this.baseMetallicMaterial) this.baseMetallicMaterial.dispose();
    if (this.muscleMaterial) this.muscleMaterial.dispose();
    if (this.highlightMaterial) this.highlightMaterial.dispose();
    if (this.selectedMaterial) this.selectedMaterial.dispose();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThree(): void {
    const width = this.containerRef.nativeElement.clientWidth || 400;
    const height = this.containerRef.nativeElement.clientHeight || 550;

    this.scene = new THREE.Scene();
    this.scene.background = null; // Transparent background for flexibility

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 1.8, 4.5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 7.0;
    this.controls.target.set(0, 1.0, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 7);
    this.scene.add(mainLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(-5, 5, -6);
    this.scene.add(backLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, 5, -5);
    this.scene.add(rimLight);

    // Materials: "Uniform metallic grey with shiny/semimatte finish"
    this.baseMetallicMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc, // Metallic silver/grey
      roughness: 0.35, // Shiny/semimatte finish
      metalness: 0.45, // Soft reflections
      transparent: false
    });

    this.muscleMaterial = new THREE.MeshStandardMaterial({
      color: 0x9ca3af, // Slightly darker grey for muscles
      roughness: 0.4,
      metalness: 0.3,
      transparent: false
    });

    // "Highlight muscle with transparent red color"
    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red
      roughness: 0.1,
      metalness: 0.5,
      emissive: 0xef4444,
      emissiveIntensity: 0.4
    });

    this.selectedMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333, // Glowing red for selected
      roughness: 0.1,
      metalness: 0.5,
      emissive: 0xff0000,
      emissiveIntensity: 0.6
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        this.resizeCanvas(entry.contentRect.width, entry.contentRect.height);
      }
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private resizeCanvas(width: number, height: number): void {
    if (width === 0 || height === 0) return;
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  // Create the metallic humanoid mannequin model
  private createMannequin(): void {
    const bodyGroup = new THREE.Group();

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 32), this.baseMetallicMaterial);
    head.position.set(0, 1.95, 0);
    bodyGroup.add(head);
    this.baseMeshes.push(head);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 16), this.baseMetallicMaterial);
    neck.position.set(0, 1.81, 0);
    bodyGroup.add(neck);
    this.baseMeshes.push(neck);

    // Spine Core
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.8, 16), this.baseMetallicMaterial);
    spine.position.set(0, 1.3, 0);
    bodyGroup.add(spine);
    this.baseMeshes.push(spine);

    // Pelvis
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.2, 16), this.baseMetallicMaterial);
    pelvis.position.set(0, 0.85, 0);
    bodyGroup.add(pelvis);
    this.baseMeshes.push(pelvis);

    // Shoulders
    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), this.baseMetallicMaterial);
    shoulderL.position.set(-0.25, 1.65, 0);
    bodyGroup.add(shoulderL);
    this.baseMeshes.push(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), this.baseMetallicMaterial);
    shoulderR.position.set(0.25, 1.65, 0);
    bodyGroup.add(shoulderR);
    this.baseMeshes.push(shoulderR);

    // 16 muscle meshes
    // Trapecios
    this.addMuscleMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), { x: -0.1, y: 1.76, z: -0.05 }, { x: 0.1, y: 0.1, z: 0.2 }, 'Trapecios', bodyGroup);
    this.addMuscleMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), { x: 0.1, y: 1.76, z: -0.05 }, { x: 0.1, y: -0.1, z: -0.2 }, 'Trapecios', bodyGroup);

    // Deltoides
    this.addMuscleMesh(new THREE.SphereGeometry(0.11, 16, 16), { x: -0.28, y: 1.63, z: 0 }, { x: 0, y: 0, z: 0.1 }, 'Deltoides', bodyGroup);
    this.addMuscleMesh(new THREE.SphereGeometry(0.11, 16, 16), { x: 0.28, y: 1.63, z: 0 }, { x: 0, y: 0, z: -0.1 }, 'Deltoides', bodyGroup);

    // Pectorales
    this.addMuscleMesh(new THREE.BoxGeometry(0.18, 0.18, 0.08), { x: -0.11, y: 1.54, z: 0.1 }, { x: 0.05, y: 0.1, z: -0.15 }, 'Pectorales', bodyGroup);
    this.addMuscleMesh(new THREE.BoxGeometry(0.18, 0.18, 0.08), { x: 0.11, y: 1.54, z: 0.1 }, { x: 0.05, y: -0.1, z: 0.15 }, 'Pectorales', bodyGroup);

    // Abdominales
    this.addMuscleMesh(new THREE.BoxGeometry(0.16, 0.26, 0.05), { x: 0, y: 1.25, z: 0.12 }, { x: 0, y: 0, z: 0 }, 'Abdominales', bodyGroup);

    // Oblicuos
    this.addMuscleMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 16), { x: -0.15, y: 1.22, z: 0.05 }, { x: 0.1, y: 0, z: 0.2 }, 'Oblicuos', bodyGroup);
    this.addMuscleMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 16), { x: 0.15, y: 1.22, z: 0.05 }, { x: 0.1, y: 0, z: -0.2 }, 'Oblicuos', bodyGroup);

    // Bíceps
    this.addMuscleMesh(new THREE.CylinderGeometry(0.06, 0.05, 0.2, 16), { x: -0.29, y: 1.45, z: 0.05 }, { x: 0.1, y: 0, z: 0.1 }, 'Bíceps', bodyGroup);
    this.addMuscleMesh(new THREE.CylinderGeometry(0.06, 0.05, 0.2, 16), { x: 0.29, y: 1.45, z: 0.05 }, { x: -0.1, y: 0, z: -0.1 }, 'Bíceps', bodyGroup);

    // Tríceps
    this.addMuscleMesh(new THREE.CylinderGeometry(0.06, 0.05, 0.22, 16), { x: -0.29, y: 1.43, z: -0.06 }, { x: -0.1, y: 0, z: 0.15 }, 'Tríceps', bodyGroup);
    this.addMuscleMesh(new THREE.CylinderGeometry(0.06, 0.05, 0.22, 16), { x: 0.29, y: 1.43, z: -0.06 }, { x: 0.1, y: 0, z: -0.15 }, 'Tríceps', bodyGroup);

    // Antebrazos
    this.addMuscleMesh(new THREE.CylinderGeometry(0.055, 0.04, 0.26, 16), { x: -0.32, y: 1.2, z: 0.02 }, { x: 0.15, y: 0, z: 0.15 }, 'Antebrazos', bodyGroup);
    this.addMuscleMesh(new THREE.CylinderGeometry(0.055, 0.04, 0.26, 16), { x: 0.32, y: 1.2, z: 0.02 }, { x: -0.15, y: 0, z: -0.15 }, 'Antebrazos', bodyGroup);

    // Dorsales
    this.addMuscleMesh(new THREE.BoxGeometry(0.18, 0.32, 0.07), { x: -0.16, y: 1.45, z: -0.1 }, { x: 0, y: -0.2, z: -0.2 }, 'Dorsales', bodyGroup);
    this.addMuscleMesh(new THREE.BoxGeometry(0.18, 0.32, 0.07), { x: 0.16, y: 1.45, z: -0.1 }, { x: 0, y: 0.2, z: 0.2 }, 'Dorsales', bodyGroup);

    // Espalda media
    this.addMuscleMesh(new THREE.BoxGeometry(0.14, 0.28, 0.06), { x: 0, y: 1.48, z: -0.11 }, { x: 0, y: 0, z: 0 }, 'Espalda media', bodyGroup);

    // Lumbares
    this.addMuscleMesh(new THREE.BoxGeometry(0.07, 0.18, 0.05), { x: -0.05, y: 1.18, z: -0.11 }, { x: 0, y: 0, z: 0.05 }, 'Lumbares', bodyGroup);
    this.addMuscleMesh(new THREE.BoxGeometry(0.07, 0.18, 0.05), { x: 0.05, y: 1.18, z: -0.11 }, { x: 0, y: 0, z: -0.05 }, 'Lumbares', bodyGroup);

    // Glúteos
    this.addMuscleMesh(new THREE.SphereGeometry(0.13, 16, 16), { x: -0.09, y: 0.88, z: -0.13 }, { x: 0.1, y: 0, z: 0 }, 'Glúteos', bodyGroup);
    this.addMuscleMesh(new THREE.SphereGeometry(0.13, 16, 16), { x: 0.09, y: 0.88, z: -0.13 }, { x: -0.1, y: 0, z: 0 }, 'Glúteos', bodyGroup);

    // Cuádriceps
    this.addMuscleMesh(new THREE.CylinderGeometry(0.11, 0.08, 0.44, 16), { x: -0.14, y: 0.54, z: 0.08 }, { x: 0.1, y: 0, z: 0.05 }, 'Cuádriceps', bodyGroup);
    this.addMuscleMesh(new THREE.CylinderGeometry(0.11, 0.08, 0.44, 16), { x: 0.14, y: 0.54, z: 0.08 }, { x: -0.1, y: 0, z: -0.05 }, 'Cuádriceps', bodyGroup);

    // Isquiotibiales
    this.addMuscleMesh(new THREE.CylinderGeometry(0.1, 0.08, 0.42, 16), { x: -0.14, y: 0.52, z: -0.08 }, { x: -0.05, y: 0, z: 0.05 }, 'Isquiotibiales', bodyGroup);
    this.addMuscleMesh(new THREE.CylinderGeometry(0.1, 0.08, 0.42, 16), { x: 0.14, y: 0.52, z: -0.08 }, { x: 0.05, y: 0, z: -0.05 }, 'Isquiotibiales', bodyGroup);

    // Aductores
    this.addMuscleMesh(new THREE.CylinderGeometry(0.06, 0.04, 0.36, 16), { x: -0.06, y: 0.56, z: 0 }, { x: 0, y: 0, z: -0.15 }, 'Aductores', bodyGroup);
    this.addMuscleMesh(new THREE.CylinderGeometry(0.06, 0.04, 0.36, 16), { x: 0.06, y: 0.56, z: 0 }, { x: 0, y: 0, z: 0.15 }, 'Aductores', bodyGroup);

    // Pantorrillas
    this.addMuscleMesh(new THREE.CylinderGeometry(0.075, 0.045, 0.38, 16), { x: -0.15, y: 0.18, z: -0.02 }, { x: 0, y: 0, z: 0.02 }, 'Pantorrillas', bodyGroup);
    this.addMuscleMesh(new THREE.CylinderGeometry(0.075, 0.045, 0.38, 16), { x: 0.15, y: 0.18, z: -0.02 }, { x: 0, y: 0, z: -0.02 }, 'Pantorrillas', bodyGroup);

    this.scene.add(bodyGroup);
    bodyGroup.scale.set(1.15, 1.15, 1.15);
  }

  private addMuscleMesh(
    geometry: THREE.BufferGeometry,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number },
    muscleName: string,
    group: THREE.Group
  ): void {
    const mesh = new THREE.Mesh(geometry, this.muscleMaterial.clone());
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    mesh.userData = { muscleName };
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    group.add(mesh);
    this.muscleMeshes.push(mesh);
    this.originalMaterials.set(mesh, mesh.material as THREE.Material);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  // CAMERA VIEWS (Front, Back, Left, Right, Reset, Auto-Rotate)
  setView(view: 'frontal' | 'posterior' | 'izquierda' | 'derecha' | 'reset'): void {
    this.isAutoRotating = false;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 1.0, 0);

    switch (view) {
      case 'frontal':
        this.camera.position.set(0, 1.8, 4.5);
        break;
      case 'posterior':
        this.camera.position.set(0, 1.8, -4.5);
        break;
      case 'izquierda':
        this.camera.position.set(-4.5, 1.8, 0);
        break;
      case 'derecha':
        this.camera.position.set(4.5, 1.8, 0);
        break;
      case 'reset':
        this.camera.position.set(0, 1.8, 4.5);
        this.resetDeselect();
        break;
    }
  }

  toggleAutoRotate(): void {
    this.isAutoRotating = !this.isAutoRotating;
    this.controls.autoRotate = this.isAutoRotating;
    this.controls.autoRotateSpeed = 2.0;
  }

  private resetDeselect() {
    this.selectedMuscleId = null;
    this.resetHighlightedMuscles();
    this.muscleDeselect.emit();
  }

  // Hover and Click raycasting handlers
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.muscleMeshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      const name = intersectedMesh.userData['muscleName'];

      if (this.hoveredMuscleId !== name) {
        this.hoveredMuscleId = name;
        this.highlightHoveredMuscle(name);
        
        // Retrieve Info for Hover Output event
        this.mannequinService.getMuscleById(name).subscribe(info => {
          if (info) this.muscleHover.emit(info);
        });
      }

      this.hoveredMuscleName = name;
      this.tooltipVisible = true;
      this.tooltipX = event.clientX - rect.left;
      this.tooltipY = event.clientY - rect.top;
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      if (this.hoveredMuscleId !== null) {
        this.hoveredMuscleId = null;
        this.resetHighlightedMuscles();
        this.tooltipVisible = false;
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  @HostListener('click', ['$event'])
  onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.muscleMeshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      const name = intersectedMesh.userData['muscleName'];

      this.selectedMuscleId = name;
      this.highlightSelectedMuscle(name);

      this.mannequinService.getMuscleById(name).subscribe(info => {
        if (info) this.muscleSelect.emit(info);
      });
    } else {
      // Double click or single click in background deselects (as per Double click in background to deselect requirement)
      if (event.detail === 2) {
        this.resetDeselect();
      }
    }
  }

  private highlightHoveredMuscle(name: string): void {
    this.muscleMeshes.forEach(mesh => {
      const isCurrentSelected = mesh.userData['muscleName'] === this.selectedMuscleId;
      if (mesh.userData['muscleName'] === name) {
        mesh.material = this.highlightMaterial;
      } else if (isCurrentSelected) {
        mesh.material = this.selectedMaterial;
      } else {
        const orig = this.originalMaterials.get(mesh);
        if (orig) mesh.material = orig;
      }
    });
  }

  private highlightSelectedMuscle(name: string): void {
    this.muscleMeshes.forEach(mesh => {
      if (mesh.userData['muscleName'] === name) {
        mesh.material = this.selectedMaterial;
      } else {
        const orig = this.originalMaterials.get(mesh);
        if (orig) mesh.material = orig;
      }
    });
  }

  private resetHighlightedMuscles(): void {
    this.muscleMeshes.forEach(mesh => {
      const isCurrentSelected = mesh.userData['muscleName'] === this.selectedMuscleId;
      if (isCurrentSelected) {
        mesh.material = this.selectedMaterial;
      } else {
        const orig = this.originalMaterials.get(mesh);
        if (orig) mesh.material = orig;
      }
    });
  }
}
