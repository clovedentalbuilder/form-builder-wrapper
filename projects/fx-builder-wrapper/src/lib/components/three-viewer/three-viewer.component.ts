import { 
  Component, ElementRef, AfterViewInit, ViewChild, Input, OnChanges, SimpleChanges, OnDestroy 
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

@Component({
  selector: 'app-three-viewer',
  templateUrl: './three-viewer.component.html',
  styleUrls: ['./three-viewer.component.scss'],
  standalone: true
})
export class ThreeViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('viewerContainer', { static: true }) viewerContainer!: ElementRef;
  @Input() file!: any;
  @Input() manualFileUpload: Blob | null = null;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private loader = new STLLoader();
  private model!: THREE.Mesh | null;

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private zoomSpeed = 1.1;

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    this.initThree();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manualFileUpload']?.currentValue && this.manualFileUpload) {
      this.loadModelFromBlob(this.manualFileUpload);
    }
  }

  ngOnDestroy(): void {
    this.cleanupThreeJS();
  }

  private initThree(): void {
    const container = this.viewerContainer.nativeElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    this.scene.add(directionalLight);

    this.initControls();
    this.animate();
  }

  private initControls(): void {
    const canvas = this.renderer.domElement;

    // Mouse Drag for Rotation
    canvas.addEventListener('mousedown', (event) => {
      this.isDragging = true;
      this.previousMousePosition.x = event.clientX;
      this.previousMousePosition.y = event.clientY;
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mousemove', (event) => {
      if (!this.isDragging) return;

      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      const rotationSpeed = 0.005;
      this.model?.rotateY(deltaX * rotationSpeed);
      this.model?.rotateX(deltaY * rotationSpeed);

      this.previousMousePosition.x = event.clientX;
      this.previousMousePosition.y = event.clientY;
    });

    // Scroll for Zoom
    canvas.addEventListener('wheel', (event) => {
      // event.preventDefault();
      if (event.deltaY < 0) {
        this.camera.position.multiplyScalar(1 / this.zoomSpeed); // Zoom In
      } else {
        this.camera.position.multiplyScalar(this.zoomSpeed); // Zoom Out
      }
      this.camera.updateProjectionMatrix();
    });

    // Resize Handling
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private loadModelFromBlob(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const geometry = this.loader.parse(arrayBuffer);
      geometry.computeVertexNormals();

      if (this.model) {
        this.scene.remove(this.model);
        this.model.geometry.dispose();
      }

      const material = new THREE.MeshPhysicalMaterial({
        color: 0xF8F0E3,
        metalness: 0.1,
        roughness: 0.5,
        transmission: 0.5, // Creates slight translucency
        clearcoat: 1.0,    // Adds enamel-like reflection
        clearcoatRoughness: 0.3
      });
      
      this.model = new THREE.Mesh(geometry, material);
      this.scene.add(this.model);

      this.centerModel();
    };
    reader.readAsArrayBuffer(blob);
  }

  private centerModel(): void {
    if (!this.model) return;
    const box = new THREE.Box3().setFromObject(this.model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.model.position.sub(center);

    const size = box.getSize(new THREE.Vector3()).length();
    this.camera.position.set(0, 0, size * 2);
    this.camera.updateProjectionMatrix();
    this.onWindowResize();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  };

  onWindowResize(): void {
    const container = this.viewerContainer.nativeElement;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private cleanupThreeJS(): void {
    // Remove event listeners
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousedown', () => {});
    canvas.removeEventListener('mouseup', () => {});
    canvas.removeEventListener('mousemove', () => {});
    canvas.removeEventListener('wheel', () => {});
    window.removeEventListener('resize', () => this.onWindowResize());

    // Dispose of Three.js resources
    if (this.model) {
      this.scene.remove(this.model);
      this.model.geometry.dispose();
    }
    this.renderer.dispose();
  }
}
