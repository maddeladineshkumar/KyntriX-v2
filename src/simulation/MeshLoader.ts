import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

class MeshLoaderService {
  private loader: STLLoader;
  private cache: Map<string, THREE.BufferGeometry>;
  private loadingPromises: Map<string, Promise<THREE.BufferGeometry | null>>;

  constructor() {
    this.loader = new STLLoader();
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Load an STL mesh from URL, returning an independent clone of the cached THREE.BufferGeometry.
   * Clones protect the cached master geometry from GPU buffer deallocation when individual meshes are disposed.
   */
  async loadSTL(url: string): Promise<THREE.BufferGeometry | null> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!.clone();
    }

    if (this.loadingPromises.has(url)) {
      const master = await this.loadingPromises.get(url)!;
      return master ? master.clone() : null;
    }

    const base = import.meta.env.BASE_URL || '/';
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const resolvedUrl = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')
      ? url
      : (base.endsWith('/') ? `${base}${cleanUrl}` : `${base}/${cleanUrl}`);

    const promise = new Promise<THREE.BufferGeometry | null>((resolve) => {
      this.loader.load(
        resolvedUrl,
        (geometry) => {
          geometry.computeVertexNormals();
          this.cache.set(url, geometry);
          this.loadingPromises.delete(url);
          resolve(geometry);
        },
        undefined,
        (error) => {
          console.warn(`Could not load STL at ${url}:`, error);
          this.loadingPromises.delete(url);
          resolve(null);
        }
      );
    });

    this.loadingPromises.set(url, promise);
    const master = await promise;
    return master ? master.clone() : null;
  }

  /**
   * Clear cached geometries and dispose WebGL buffers.
   */
  clearCache(): void {
    for (const geom of this.cache.values()) {
      geom.dispose();
    }
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

export const meshLoader = new MeshLoaderService();
