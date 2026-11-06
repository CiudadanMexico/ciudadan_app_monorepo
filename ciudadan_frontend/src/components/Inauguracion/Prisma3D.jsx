import React, { useEffect, useRef } from 'react';

/**
 * Prisma 3D real con Three.js (ya presente en el monorepo).
 * Carga diferida, pausa fuera de pantalla, reduced-motion, cleanup de recursos.
 * Es decorativo: nunca impide consultar el evento o registrarse.
 */
export default function Prisma3D() {
  const holderRef = useRef(null);

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let disposed = false;
    let release = () => {};

    import('three').then((THREE) => {
      if (disposed || !holder) return;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      } catch (error) {
        return; // Sin WebGL: la página y registro siguen funcionando.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      holder.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 50);
      camera.position.set(0, 0, 6.4);
      const group = new THREE.Group();
      scene.add(group);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xbca2ff, metalness: 0.48, roughness: 0.12, transparent: true,
        opacity: 0.73, transmission: 0.24, thickness: 0.4,
        iridescence: 0.8, iridescenceIOR: 1.4, side: THREE.DoubleSide,
      });
      const geometry = new THREE.OctahedronGeometry(1.75, 0);
      const main = new THREE.Mesh(geometry, material);
      group.add(main);
      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: 0xffd448, transparent: true, opacity: 0.92 }));
      group.add(edges);
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.48, 1),
        new THREE.MeshBasicMaterial({ color: 0x84f4d5, wireframe: true, transparent: true, opacity: 0.76 })
      );
      group.add(core);
      scene.add(new THREE.AmbientLight(0xffffff, 1.35));
      const pink = new THREE.PointLight(0xff43e5, 35, 10); pink.position.set(-3, 1.6, 3); scene.add(pink);
      const cyan = new THREE.PointLight(0x61efff, 30, 10); cyan.position.set(3, -1.3, 3); scene.add(cyan);
      let visible = true;
      let raf = 0;
      let last = 0;
      let mouseX = 0; let mouseY = 0;
      const resize = () => {
        const bounds = holder.getBoundingClientRect();
        const width = Math.max(1, Math.round(bounds.width));
        const height = Math.max(1, Math.round(bounds.height));
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      const onPointerMove = (event) => {
        const rect = holder.getBoundingClientRect();
        mouseX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.4;
        mouseY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.35;
      };
      const tick = (timestamp) => {
        raf = 0;
        if (document.hidden || !visible) return;
        const dt = Math.min((timestamp - (last || timestamp)) / 1000, 0.04);
        last = timestamp;
        group.rotation.y += dt * 0.23;
        group.rotation.x += dt * 0.12;
        group.rotation.y += (mouseX - group.rotation.y * 0.12) * 0.006;
        group.rotation.x += (mouseY - group.rotation.x * 0.12) * 0.006;
        core.rotation.z -= dt * 0.24;
        renderer.render(scene, camera);
        raf = window.requestAnimationFrame(tick);
      };
      const request = () => { if (!raf && visible && !document.hidden) raf = window.requestAnimationFrame(tick); };
      const onVisibility = () => { last = 0; request(); };
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; } request(); }, { threshold: 0 });
      observer.observe(holder);
      const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
      resizeObserver?.observe(holder);
      window.addEventListener('resize', resize);
      holder.addEventListener('pointermove', onPointerMove);
      document.addEventListener('visibilitychange', onVisibility);
      resize(); request();
      release = () => {
        if (raf) cancelAnimationFrame(raf);
        observer.disconnect(); resizeObserver?.disconnect();
        window.removeEventListener('resize', resize);
        holder.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('visibilitychange', onVisibility);
        geometry.dispose(); material.dispose(); edgeGeometry.dispose();
        edges.material.dispose(); core.geometry.dispose(); core.material.dispose(); renderer.dispose();
        if (renderer.domElement.parentNode === holder) holder.removeChild(renderer.domElement);
      };
    }).catch(() => {});
    return () => { disposed = true; release(); };
  }, []);

  return <div className="inau-prisma" ref={holderRef} aria-hidden="true" />;
}
