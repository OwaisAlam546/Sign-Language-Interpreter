import { useEffect, useRef, useState } from 'react';
import { WORLD_POLYGONS } from '../../lib/worldGeoPolygons.js';
import { FiCompass, FiRotateCw, FiPlus, FiMinus, FiMapPin } from 'react-icons/fi';

// Global research & linguistic hubs situated at exact geographic coordinates
const NETWORK_NODES = [
  { id: 'blr', name: 'Bengaluru Core HQ', role: 'Primary Research Node', lang: 'Indian Sign Language (ISL)', lat: 12.9716, lon: 77.5946, isPrimary: true, ping: '8ms' },
  { id: 'tyo', name: 'Tokyo Relay', role: 'Asia-Pacific Gateway', lang: 'Japanese Sign Language (JSL)', lat: 35.6895, lon: 139.6917, isPrimary: false, ping: '24ms' },
  { id: 'nyc', name: 'New York Lab', role: 'North America Cluster', lang: 'American Sign Language (ASL)', lat: 40.7128, lon: -74.006, isPrimary: false, ping: '42ms' },
  { id: 'sfo', name: 'San Francisco', role: 'West Edge Relay', lang: 'ASL Western Node', lat: 37.7749, lon: -122.4194, isPrimary: false, ping: '55ms' },
  { id: 'lon', name: 'London Institute', role: 'European Hub', lang: 'British Sign Language (BSL)', lat: 51.5074, lon: -0.1278, isPrimary: false, ping: '38ms' },
  { id: 'par', name: 'Paris Sorbonne', role: 'Linguistic Research', lang: 'French Sign Language (LSF)', lat: 48.8566, lon: 2.3522, isPrimary: false, ping: '36ms' },
  { id: 'ber', name: 'Berlin Lab', role: 'Central Euro Node', lang: 'German Sign Language (DGS)', lat: 52.52, lon: 13.405, isPrimary: false, ping: '34ms' },
  { id: 'syd', name: 'Sydney Centre', role: 'Oceania Endpoint', lang: 'Auslan Research Group', lat: -33.8688, lon: 151.2093, isPrimary: false, ping: '48ms' },
  { id: 'sao', name: 'São Paulo Lab', role: 'South America Cluster', lang: 'Língua Brasileira de Sinais (Libras)', lat: -23.5505, lon: -46.6333, isPrimary: false, ping: '62ms' },
  { id: 'cai', name: 'Cairo Node', role: 'Middle East & Africa', lang: 'Egyptian Sign Language (ESL)', lat: 30.0444, lon: 31.2357, isPrimary: false, ping: '45ms' },
  { id: 'cpt', name: 'Cape Town Hub', role: 'Southern Africa Gateway', lang: 'South African Sign Language (SASL)', lat: -33.9249, lon: 18.4241, isPrimary: false, ping: '58ms' },
  { id: 'sin', name: 'Singapore Lab', role: 'Equatorial Gateway', lang: 'Singapore Sign Language (SgSL)', lat: 1.3521, lon: 103.8198, isPrimary: false, ping: '18ms' },
  { id: 'sel', name: 'Seoul Institute', role: 'East Asian Sub-node', lang: 'Korean Sign Language (KSL)', lat: 37.5665, lon: 126.978, isPrimary: false, ping: '28ms' },
];

// Great-circle interconnect mesh
const NETWORK_LINKS = [
  ['blr', 'tyo'],
  ['blr', 'lon'],
  ['blr', 'sin'],
  ['blr', 'cai'],
  ['lon', 'par'],
  ['lon', 'nyc'],
  ['par', 'ber'],
  ['nyc', 'sfo'],
  ['nyc', 'sao'],
  ['tyo', 'sel'],
  ['tyo', 'syd'],
  ['sin', 'syd'],
  ['cai', 'cpt'],
  ['sao', 'cpt'],
  ['sfo', 'tyo'],
];

// Major global city lights to recreate realistic nocturnal satellite view
const CITY_LIGHTS = [
  // North America
  [40.71, -74.01, 1.8], [34.05, -118.24, 1.7], [41.88, -87.63, 1.5], [29.76, -95.37, 1.4],
  [37.77, -122.42, 1.6], [47.61, -122.33, 1.4], [25.76, -80.19, 1.4], [33.75, -84.39, 1.3],
  [42.36, -71.06, 1.4], [32.78, -96.80, 1.4], [43.65, -79.38, 1.5], [45.50, -73.57, 1.4],
  [49.28, -123.12, 1.3], [19.43, -99.13, 1.6], [39.95, -75.17, 1.4], [38.91, -77.04, 1.5],
  // Europe
  [51.51, -0.13, 1.8], [48.86, 2.35, 1.7], [52.52, 13.41, 1.5], [40.42, -3.70, 1.5],
  [41.90, 12.50, 1.5], [52.37, 4.90, 1.4], [50.85, 4.35, 1.4], [48.21, 16.37, 1.3],
  [52.23, 21.01, 1.3], [59.33, 18.07, 1.2], [37.98, 23.73, 1.3], [53.35, -6.26, 1.2],
  [38.72, -9.14, 1.3], [50.08, 14.44, 1.3], [55.76, 37.62, 1.6], [59.93, 30.34, 1.4],
  // India & South Asia (Dense clusters)
  [12.97, 77.59, 2.2], [19.08, 72.88, 2.2], [28.61, 77.21, 2.2], [22.57, 88.36, 1.8],
  [13.08, 80.27, 1.8], [17.39, 78.49, 1.8], [23.02, 72.57, 1.5], [18.52, 73.86, 1.5],
  [26.85, 80.95, 1.4], [23.71, 90.41, 1.6], [24.86, 67.00, 1.6], [6.93, 79.86, 1.3],
  // East & SE Asia
  [35.69, 139.69, 2.4], [34.69, 135.50, 2.0], [37.57, 126.98, 2.2], [39.90, 116.41, 2.2],
  [31.23, 121.47, 2.4], [23.13, 113.26, 2.0], [22.54, 114.06, 2.0], [22.32, 114.17, 1.9],
  [25.03, 121.57, 1.6], [1.35, 103.82, 2.0], [13.76, 100.50, 1.7], [-6.21, 106.85, 1.8],
  [14.60, 120.98, 1.7], [3.14, 101.69, 1.6], [10.82, 106.63, 1.5],
  // Middle East
  [25.20, 55.27, 2.0], [24.71, 46.68, 1.6], [25.29, 51.53, 1.5], [32.09, 34.78, 1.5],
  [41.01, 28.98, 1.8], [35.69, 51.39, 1.5], [33.32, 44.36, 1.4], [29.38, 47.98, 1.4],
  // South America
  [-23.55, -46.63, 2.0], [-22.91, -43.17, 1.8], [-34.60, -58.38, 1.8], [-33.45, -70.67, 1.5],
  [4.71, -74.07, 1.5], [-12.05, -77.04, 1.4], [-15.79, -47.88, 1.3],
  // Africa
  [30.04, 31.24, 2.0], [6.52, 3.38, 1.7], [-26.20, 28.05, 1.7], [-33.92, 18.42, 1.5],
  [-1.29, 36.82, 1.5], [9.03, 38.74, 1.3], [33.57, -7.59, 1.4],
  // Oceania
  [-33.87, 151.21, 1.8], [-37.81, 144.96, 1.7], [-27.47, 153.03, 1.4], [-31.95, 115.86, 1.3],
  [-36.85, 174.76, 1.4],
];

// Region camera presets
const REGION_PRESETS = [
  { label: 'Asia & India', lon: -78, lat: 16 },
  { label: 'Europe & Africa', lon: -15, lat: 25 },
  { label: 'Americas', lon: 95, lat: 22 },
  { label: 'Asia-Pacific', lon: -140, lat: -12 },
];

export default function SpinningGlobe({
  highlightIndia = true,
  className = '',
  showControls = true,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isAutoSpin, setIsAutoSpin] = useState(true);
  const [activeRegion, setActiveRegion] = useState('Asia & India');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [headingDegrees, setHeadingDegrees] = useState(78);

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const mouseVelocityRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ lon: -78, lat: 16 }); // Centered on India / Indian Ocean
  const targetRotationRef = useRef(null);
  const isAutoSpinRef = useRef(true);
  const zoomRef = useRef(1.0);

  // Sync refs
  useEffect(() => {
    isAutoSpinRef.current = isAutoSpin;
  }, [isAutoSpin]);

  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);

  // Main 3D canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    let width = 0;
    let height = 0;
    let baseRadius = 0;
    let centerX = 0;
    let centerY = 0;

    // Pre-generate background space stars
    const starCount = 90;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        xRatio: Math.random(),
        yRatio: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: Math.random() * 0.04 + 0.01,
      });
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      baseRadius = Math.min(width, height) * 0.40;
      centerX = width / 2;
      centerY = height / 2;
    };

    resize();
    window.addEventListener('resize', resize);

    // 3D Spherical projection with axial rotation, camera tilt, and zoom factor
    const project3D = (lat, lon, r = baseRadius * zoomRef.current) => {
      const phi = (lat * Math.PI) / 180;
      const theta = ((lon + rotationRef.current.lon) * Math.PI) / 180;
      const tilt = (rotationRef.current.lat * Math.PI) / 180;

      // Base spherical coordinates
      const x = r * Math.cos(phi) * Math.sin(theta);
      const y = -r * Math.sin(phi);
      const z = r * Math.cos(phi) * Math.cos(theta);

      // Pitch rotation around X axis (axial camera tilt)
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const yTilted = y * cosT - z * sinT;
      const zTilted = y * sinT + z * cosT;

      return {
        x: centerX + x,
        y: centerY + yTilted,
        z: zTilted,
        visible: zTilted > -r * 0.05,
      };
    };

    // Sutherland-Hodgman polygon clipping against front hemisphere (z >= 0)
    const clipPolyFront = (poly3D) => {
      const out = [];
      const len = poly3D.length;
      if (len < 3) return out;

      for (let i = 0; i < len; i++) {
        const a = poly3D[i];
        const b = poly3D[(i + 1) % len];
        const aIn = a.z >= 0;
        const bIn = b.z >= 0;

        if (aIn && bIn) {
          out.push(b);
        } else if (aIn && !bIn) {
          const t = a.z / (a.z - b.z);
          out.push({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: 0,
            isClip: true,
          });
        } else if (!aIn && bIn) {
          const t = a.z / (a.z - b.z);
          out.push({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: 0,
            isClip: true,
          });
          out.push(b);
        }
      }
      return out;
    };

    let time = 0;
    let headingTicker = 0;

    const render = () => {
      time += 0.018;
      headingTicker++;

      // Update heading degrees for rotation compass display periodically
      if (headingTicker % 8 === 0) {
        const deg = Math.round(((-rotationRef.current.lon % 360) + 360) % 360);
        setHeadingDegrees(deg);
      }

      // Smooth camera interpolation if transitioning to a region preset
      if (targetRotationRef.current) {
        const target = targetRotationRef.current;
        rotationRef.current.lon += (target.lon - rotationRef.current.lon) * 0.08;
        rotationRef.current.lat += (target.lat - rotationRef.current.lat) * 0.08;

        if (
          Math.abs(target.lon - rotationRef.current.lon) < 0.2 &&
          Math.abs(target.lat - rotationRef.current.lat) < 0.2
        ) {
          rotationRef.current.lon = target.lon;
          rotationRef.current.lat = target.lat;
          targetRotationRef.current = null;
        }
      } else if (!isDraggingRef.current) {
        // Friction damping for flick gestures
        if (Math.abs(mouseVelocityRef.current.x) > 0.02) {
          rotationRef.current.lon += mouseVelocityRef.current.x;
          mouseVelocityRef.current.x *= 0.94;
        }
        if (Math.abs(mouseVelocityRef.current.y) > 0.02) {
          rotationRef.current.lat += mouseVelocityRef.current.y;
          mouseVelocityRef.current.y *= 0.94;
          rotationRef.current.lat = Math.max(-55, Math.min(55, rotationRef.current.lat));
        }

        // Continuous automatic rotation
        if (isAutoSpinRef.current) {
          rotationRef.current.lon += 0.22;
        }
      }

      const radius = baseRadius * zoomRef.current;

      ctx.clearRect(0, 0, width, height);

      // -------------------------------------------------------------
      // 1. Deep Space Starfield Background
      // -------------------------------------------------------------
      stars.forEach((s) => {
        const sx = s.xRatio * width;
        const sy = s.yRatio * height;
        const distFromCenter = Math.hypot(sx - centerX, sy - centerY);
        if (distFromCenter > radius * 0.95) {
          const curAlpha = s.alpha * (0.6 + 0.4 * Math.sin(time * 2 + s.twinkleSpeed * 100));
          ctx.fillStyle = `rgba(224, 242, 254, ${curAlpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // -------------------------------------------------------------
      // 2. Atmospheric Outer Glow (Centered 360-degree Cyan Aura)
      // -------------------------------------------------------------
      const outerAura = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.94,
        centerX,
        centerY,
        radius * 1.34
      );
      outerAura.addColorStop(0, 'rgba(0, 225, 255, 0.28)');
      outerAura.addColorStop(0.35, 'rgba(14, 165, 233, 0.13)');
      outerAura.addColorStop(0.75, 'rgba(6, 182, 212, 0.03)');
      outerAura.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = outerAura;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.34, 0, Math.PI * 2);
      ctx.fill();

      // -------------------------------------------------------------
      // 3. Base Planet Sphere Disc (Evenly Illuminated Deep Ocean)
      // -------------------------------------------------------------
      const sphereGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );
      sphereGrad.addColorStop(0, '#0c2444');
      sphereGrad.addColorStop(0.55, '#071830');
      sphereGrad.addColorStop(0.85, '#041022');
      sphereGrad.addColorStop(1, '#020914');

      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Clip subsequent rendering to the Earth disc
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 0.5, 0, Math.PI * 2);
      ctx.clip();

      // -------------------------------------------------------------
      // 4. Fine Latitude & Longitude Graticule Grid
      // -------------------------------------------------------------
      [-60, -30, 0, 30, 60].forEach((lat) => {
        ctx.beginPath();
        let active = false;
        for (let lon = -180; lon <= 180; lon += 4) {
          const pt = project3D(lat, lon, radius);
          if (pt.z >= 0) {
            if (!active) {
              ctx.moveTo(pt.x, pt.y);
              active = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            active = false;
          }
        }
        ctx.strokeStyle = lat === 0 ? 'rgba(0, 217, 255, 0.28)' : 'rgba(148, 163, 184, 0.09)';
        ctx.lineWidth = lat === 0 ? 1.0 : 0.55;
        ctx.stroke();
      });

      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let active = false;
        for (let lat = -85; lat <= 85; lat += 4) {
          const pt = project3D(lat, lon, radius);
          if (pt.z >= 0) {
            if (!active) {
              ctx.moveTo(pt.x, pt.y);
              active = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            active = false;
          }
        }
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
        ctx.lineWidth = 0.55;
        ctx.stroke();
      }

      // -------------------------------------------------------------
      // 5. Authentic Natural Earth Continents & Country Borders
      // -------------------------------------------------------------
      // Pass 1: Shaded continent landmass fills (chords routed along disc perimeter)
      WORLD_POLYGONS.forEach((poly) => {
        const ring = poly.ring;
        const pts3D = ring.map(([lon, lat]) => project3D(lat, lon, radius));
        const clipped = clipPolyFront(pts3D);
        if (clipped.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(clipped[0].x, clipped[0].y);
          for (let i = 0; i < clipped.length; i++) {
            const curr = clipped[i];
            const next = clipped[(i + 1) % clipped.length];
            if (curr.isClip && next.isClip) {
              const chord = Math.hypot(curr.x - next.x, curr.y - next.y);
              if (chord > radius * 0.45) {
                const a1 = Math.atan2(curr.y - centerY, curr.x - centerX);
                const a2 = Math.atan2(next.y - centerY, next.x - centerX);
                let diff = a2 - a1;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                ctx.arc(centerX, centerY, radius, a1, a2, diff < 0);
                continue;
              }
            }
            if (i < clipped.length - 1) {
              ctx.lineTo(next.x, next.y);
            }
          }
          ctx.closePath();
          if (highlightIndia && poly.name === 'India') {
            ctx.fillStyle = 'rgba(255, 153, 51, 0.45)';
            ctx.fill();
          } else {
            ctx.fillStyle = 'rgba(16, 44, 76, 0.78)';
            ctx.fill();
          }
        }
      });

      // Pass 2: Electric cyan coastlines and country boundary outlines (segment-level clipping)
      ctx.strokeStyle = 'rgba(0, 220, 255, 0.75)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      WORLD_POLYGONS.forEach((poly) => {
        if (highlightIndia && poly.name === 'India') return;
        const ring = poly.ring;
        const len = ring.length;
        for (let i = 0; i < len; i++) {
          const p1 = project3D(ring[i][1], ring[i][0], radius);
          const p2 = project3D(ring[(i + 1) % len][1], ring[(i + 1) % len][0], radius);
          if (p1.z >= 0 && p2.z >= 0) {
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          } else if (p1.z >= 0 && p2.z < 0) {
            const t = p1.z / (p1.z - p2.z);
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t);
          } else if (p1.z < 0 && p2.z >= 0) {
            const t = p1.z / (p1.z - p2.z);
            ctx.moveTo(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      });
      ctx.stroke();

      // Pass 2b: Prominent glowing saffron/orange outline for India
      if (highlightIndia) {
        const indiaPoly = WORLD_POLYGONS.find((p) => p.name === 'India');
        if (indiaPoly) {
          ctx.save();
          ctx.strokeStyle = '#FF9933';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#FF9933';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          const ring = indiaPoly.ring;
          const len = ring.length;
          for (let i = 0; i < len; i++) {
            const p1 = project3D(ring[i][1], ring[i][0], radius);
            const p2 = project3D(ring[(i + 1) % len][1], ring[(i + 1) % len][0], radius);
            if (p1.z >= 0 && p2.z >= 0) {
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
            } else if (p1.z >= 0 && p2.z < 0) {
              const t = p1.z / (p1.z - p2.z);
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t);
            } else if (p1.z < 0 && p2.z >= 0) {
              const t = p1.z / (p1.z - p2.z);
              ctx.moveTo(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t);
              ctx.lineTo(p2.x, p2.y);
            }
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // -------------------------------------------------------------
      // 6. Nocturnal City Lights (Warm golden/amber glow on continents)
      // -------------------------------------------------------------
      CITY_LIGHTS.forEach(([lat, lon, size]) => {
        const pt = project3D(lat, lon, radius);
        if (pt.z > 0) {
          const depthAlpha = Math.max(0.2, pt.z / radius);
          ctx.fillStyle = `rgba(255, 200, 100, ${0.45 * depthAlpha})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size * 1.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FFE6A0';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // -------------------------------------------------------------
      // 7. Spherical Limb Atmosphere / Fresnel Glow (Centered 360-degree Rim)
      // -------------------------------------------------------------
      const innerRimGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.72,
        centerX,
        centerY,
        radius
      );
      innerRimGlow.addColorStop(0, 'rgba(0, 220, 255, 0.0)');
      innerRimGlow.addColorStop(0.7, 'rgba(0, 220, 255, 0.08)');
      innerRimGlow.addColorStop(1, 'rgba(0, 220, 255, 0.25)');

      ctx.fillStyle = innerRimGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // -------------------------------------------------------------
      // 8. Limb Reflection Ring
      // -------------------------------------------------------------
      ctx.strokeStyle = 'rgba(0, 225, 255, 0.82)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // -------------------------------------------------------------
      // 9. 3D Great-Circle Network Arcs & Traveling Photons
      // -------------------------------------------------------------
      const nodeMap = {};
      NETWORK_NODES.forEach((n) => {
        nodeMap[n.id] = n;
      });

      NETWORK_LINKS.forEach(([idA, idB], linkIdx) => {
        const nodeA = nodeMap[idA];
        const nodeB = nodeMap[idB];
        if (!nodeA || !nodeB) return;

        const ptA = project3D(nodeA.lat, nodeA.lon, radius);
        const ptB = project3D(nodeB.lat, nodeB.lon, radius);

        if (ptA.z > -radius * 0.3 || ptB.z > -radius * 0.3) {
          const steps = 24;
          const arcPoints = [];

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const midLat = nodeA.lat + (nodeB.lat - nodeA.lat) * t;
            const midLon = nodeA.lon + (nodeB.lon - nodeA.lon) * t;
            const elev = Math.sin(t * Math.PI) * (radius * 0.15);
            arcPoints.push(project3D(midLat, midLon, radius + elev));
          }

          ctx.beginPath();
          let drawn = false;
          arcPoints.forEach((pt) => {
            if (pt.z >= -radius * 0.1) {
              if (!drawn) {
                ctx.moveTo(pt.x, pt.y);
                drawn = true;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            } else {
              drawn = false;
            }
          });

          ctx.strokeStyle = 'rgba(0, 217, 255, 0.32)';
          ctx.lineWidth = 1.1;
          ctx.stroke();

          const pulseT = ((time * 0.65 + linkIdx * 0.13) % 1);
          const pLat = nodeA.lat + (nodeB.lat - nodeA.lat) * pulseT;
          const pLon = nodeA.lon + (nodeB.lon - nodeA.lon) * pulseT;
          const pElev = Math.sin(pulseT * Math.PI) * (radius * 0.15);
          const pulsePt = project3D(pLat, pLon, radius + pElev);

          if (pulsePt.z > 0) {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#00D9FF';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(pulsePt.x, pulsePt.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      // -------------------------------------------------------------
      // 10. Glowing Research Nodes & Anchored Floating HUD Callouts
      // -------------------------------------------------------------
      NETWORK_NODES.forEach((node) => {
        const pt = project3D(node.lat, node.lon, radius);
        if (pt.z > 0) {
          const depthAlpha = Math.max(0.3, Math.min(1, pt.z / radius));
          const isPrimary = node.isPrimary;
          const isHovered = hoveredNode?.id === node.id;
          const isIndiaHQ = highlightIndia && node.id === 'blr';

          const pulseSize = (Math.sin(time * 3 + (isPrimary ? 0 : 1.5)) + 1) * 0.5;

          ctx.fillStyle = isIndiaHQ
            ? `rgba(255, 153, 51, ${0.45 * depthAlpha})`
            : isPrimary
            ? `rgba(0, 217, 255, ${0.35 * depthAlpha})`
            : `rgba(22, 139, 255, ${0.25 * depthAlpha})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, (isIndiaHQ || isPrimary ? 8 : 6) + pulseSize * 3, 0, Math.PI * 2);
          ctx.fill();

          if (isIndiaHQ) {
            ctx.save();
            ctx.strokeStyle = '#FF9933';
            ctx.lineWidth = 1.6;
            ctx.shadowColor = '#FF9933';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 11 + pulseSize * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          ctx.fillStyle = isHovered
            ? '#FFFFFF'
            : isIndiaHQ
            ? '#FF9933'
            : isPrimary
            ? '#00D9FF'
            : '#67E8F9';
          ctx.shadowColor = isIndiaHQ ? '#FF9933' : '#00D9FF';
          ctx.shadowBlur = isIndiaHQ ? 16 : isPrimary ? 14 : 7;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isIndiaHQ ? 4.5 : isPrimary ? 4 : 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          if ((isPrimary || isHovered) && pt.z > radius * 0.25) {
            const calloutX = pt.x + 24;
            const calloutY = pt.y - 28;

            ctx.strokeStyle = isIndiaHQ ? 'rgba(255, 153, 51, 0.7)' : 'rgba(0, 217, 255, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x + 12, pt.y - 14);
            ctx.lineTo(calloutX, calloutY + 8);
            ctx.stroke();

            const boxWidth = 148;
            const boxHeight = 36;
            ctx.fillStyle = 'rgba(2, 6, 14, 0.9)';
            ctx.fillRect(calloutX, calloutY - 14, boxWidth, boxHeight);
            ctx.strokeStyle = isIndiaHQ ? 'rgba(255, 153, 51, 0.6)' : 'rgba(0, 217, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(calloutX, calloutY - 14, boxWidth, boxHeight);

            ctx.fillStyle = isIndiaHQ ? '#FF9933' : '#38BDF8';
            ctx.font = '700 9px monospace';
            ctx.fillText(isIndiaHQ ? '● NCV-8950 // BENGALURU' : `● ${node.name.toUpperCase()}`, calloutX + 6, calloutY - 2);

            ctx.fillStyle = '#94A3B8';
            ctx.font = '500 8.5px monospace';
            ctx.fillText(`Ping: ${node.ping} · SIMD Active`, calloutX + 6, calloutY + 11);
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    mouseVelocityRef.current = { x: 0, y: 0 };
    targetRotationRef.current = null;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const radius = Math.min(rect.width, rect.height) * 0.42 * zoomRef.current;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      let closest = null;
      let closestDist = 20;

      NETWORK_NODES.forEach((node) => {
        const phi = (node.lat * Math.PI) / 180;
        const theta = ((node.lon + rotationRef.current.lon) * Math.PI) / 180;
        const tilt = (rotationRef.current.lat * Math.PI) / 180;

        const x = radius * Math.cos(phi) * Math.sin(theta);
        const y = -radius * Math.sin(phi);
        const z = radius * Math.cos(phi) * Math.cos(theta);

        const yTilted = y * Math.cos(tilt) - z * Math.sin(tilt);
        const zTilted = y * Math.sin(tilt) + z * Math.cos(tilt);

        if (zTilted > 0) {
          const px = centerX + x;
          const py = centerY + yTilted;
          const dist = Math.hypot(mouseX - px, mouseY - py);
          if (dist < closestDist) {
            closestDist = dist;
            closest = node;
          }
        }
      });

      setHoveredNode(closest);
      return;
    }

    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    rotationRef.current.lon += dx * 0.38;
    rotationRef.current.lat = Math.max(-55, Math.min(55, rotationRef.current.lat - dy * 0.3));

    mouseVelocityRef.current = { x: dx * 0.25, y: -dy * 0.2 };
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      mouseVelocityRef.current = { x: 0, y: 0 };
      targetRotationRef.current = null;
    }
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePosRef.current.x;
    const dy = e.touches[0].clientY - lastMousePosRef.current.y;

    rotationRef.current.lon += dx * 0.38;
    rotationRef.current.lat = Math.max(-55, Math.min(55, rotationRef.current.lat - dy * 0.3));

    mouseVelocityRef.current = { x: dx * 0.25, y: -dy * 0.2 };
    lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const handleSelectRegion = (preset) => {
    setActiveRegion(preset.label);
    targetRotationRef.current = { lon: preset.lon, lat: preset.lat };
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))));
  const zoomOut = () => setZoomLevel((z) => Math.max(0.75, Number((z - 0.1).toFixed(2))));

  return (
    <div ref={containerRef} className={`relative w-full flex flex-col items-center select-none py-0.5 ${className}`}>
      {showControls && (
        <div className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2 px-1 mb-1.5 font-mono text-xs z-20">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  highlightIndia ? 'bg-amber-400' : 'bg-cyan-400'
                } opacity-75`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  highlightIndia ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
              />
            </span>
            <span className="font-bold text-white uppercase tracking-wider text-[10px] sm:text-[11px]">
              {highlightIndia
                ? 'Global Network // India HQ Central Node Active'
                : 'Global Earth // 177 Countries Vector Geography'}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {REGION_PRESETS.map((p) => {
              const isActive = activeRegion === p.label;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleSelectRegion(p)}
                  className={`px-2 py-0.5 rounded-md border text-[9px] sm:text-[10px] transition-all cursor-pointer ${
                    isActive
                      ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200 font-bold shadow-[0_0_8px_rgba(0,217,255,0.25)]'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsAutoSpin(!isAutoSpin)}
              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                isAutoSpin
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-300'
                  : 'border-white/10 bg-white/5 text-slate-500 hover:text-white'
              }`}
              title={isAutoSpin ? 'Pause Continuous Spin' : 'Resume Continuous Spin'}
            >
              <FiRotateCw className={`h-3 w-3 ${isAutoSpin ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive 3D Globe Canvas Area */}
      <div
        className="relative w-full h-[330px] sm:h-[350px] lg:h-[360px] max-w-[560px] flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="w-full h-full drop-shadow-[0_0_35px_rgba(0,217,255,0.22)]" />

        {/* Right-Side Floating Zoom Controls */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
          <button
            type="button"
            onClick={zoomIn}
            className="grid h-6 w-6 place-items-center rounded-md border border-white/10 bg-slate-950/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/50 backdrop-blur-md transition-colors cursor-pointer shadow-md"
            title="Zoom in"
          >
            <FiPlus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="grid h-6 w-6 place-items-center rounded-md border border-white/10 bg-slate-950/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/50 backdrop-blur-md transition-colors cursor-pointer shadow-md"
            title="Zoom out"
          >
            <FiMinus className="h-3 w-3" />
          </button>
        </div>

        {/* Circular Compass / Rotation Dial (Bottom-Right, Compact) */}
        <div
          onClick={() => {
            rotationRef.current.lon += 45;
          }}
          className="absolute right-3 bottom-2.5 flex flex-col items-center gap-0.5 cursor-pointer group z-20"
          title="Click to advance longitude heading"
        >
          <div className="relative grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full border border-cyan-400/30 bg-slate-950/80 backdrop-blur-md shadow-[0_0_15px_rgba(0,217,255,0.15)] group-hover:border-cyan-400/60 transition-all">
            <div className="absolute inset-1 rounded-full border border-dashed border-white/15" />
            <div
              className="absolute w-0.5 h-4.5 sm:h-5 bg-gradient-to-t from-transparent via-cyan-400 to-white -top-0.5 rounded-full origin-bottom transition-transform"
              style={{
                transform: `rotate(${headingDegrees}deg)`,
                transformOrigin: 'bottom center',
                bottom: '50%',
              }}
            />
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00D9FF]" />
            <span className="absolute bottom-0.5 font-mono text-[7px] sm:text-[8px] text-cyan-300 font-bold">{headingDegrees}°</span>
          </div>
          <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400 group-hover:text-cyan-300 transition-colors">
            Rotate
          </span>
        </div>

        {/* Floating Node HUD Card on Hover */}
        {hoveredNode && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-xl border border-cyan-400/40 bg-slate-950/90 p-2.5 backdrop-blur-md text-xs font-mono text-slate-200 shadow-2xl z-30 flex flex-col gap-1 min-w-[220px]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <FiMapPin className="h-3 w-3 text-cyan-400" />
                {hoveredNode.name}
              </span>
              <span className="text-[9px] text-cyan-300 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/25">
                {hoveredNode.ping}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">{hoveredNode.lang}</div>
            <div className="text-[9px] text-slate-500 flex items-center justify-between border-t border-white/10 pt-1 mt-0.5">
              <span>Coord: {hoveredNode.lat.toFixed(2)}°, {hoveredNode.lon.toFixed(2)}°</span>
              <span className="text-emerald-400">Node Online</span>
            </div>
          </div>
        )}

        {/* Bottom Interactive Guidance Pill */}
        <div className="pointer-events-none absolute bottom-2 sm:bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-slate-950/85 px-3 py-0.5 backdrop-blur-md text-[9px] font-mono text-cyan-300 shadow-[0_0_12px_rgba(0,217,255,0.18)]">
          <FiCompass className="h-2.5 w-2.5 text-cyan-400" />
          <span>
            {highlightIndia
              ? 'Drag to rotate · India Highlighted (HQ) · Nocturnal City Lights'
              : 'Click & drag to rotate · Recognizable Continents · Great-Circle Mesh'}
          </span>
        </div>
      </div>
    </div>
  );
}
