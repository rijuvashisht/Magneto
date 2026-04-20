"use client";

import { useEffect, useRef, useCallback } from "react";

interface Tick {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  angle: number;
  baseAngle: number;
  length: number;
  opacity: number;
  baseOpacity: number;
  vx: number;
  vy: number;
  vAngle: number;
}

// Gradient colors - pink/red on left to purple/blue on right like Angular.dev
function getGradientColor(x: number, width: number, opacity: number, isLightMode: boolean): string {
  const t = x / width;
  
  // Pink to purple gradient - works for both modes
  const r1 = 236, g1 = 72, b1 = 153;   // Pink (#ec4899)
  const r2 = 168, g2 = 85, b2 = 247;   // Purple (#a855f7)
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  // Higher opacity for light mode since background is white
  const finalOpacity = isLightMode ? opacity * 0.8 : opacity * 0.6;
  
  return `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
}

export default function MagneticField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ticksRef = useRef<Tick[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number | null>(null);

  // Initialize tick marks
  const initTicks = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ticks: Tick[] = [];
    const spacingX = 25;
    const spacingY = 20;
    const cols = Math.ceil(canvas.width / spacingX) + 2;
    const rows = Math.ceil(canvas.height / spacingY) + 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * spacingX;
        const y = row * spacingY;
        
        // Fade out towards top and edges
        const verticalFade = Math.min(1, row / 3); // Faster fade in from top
        const horizontalFade = 1 - Math.abs((col / cols) - 0.5) * 0.1; // Very slight fade at edges
        const baseOpacity = verticalFade * horizontalFade * 0.9;
        
        ticks.push({
          x,
          y,
          baseX: x,
          baseY: y,
          angle: Math.PI / 4, // 45 degree diagonal tick
          baseAngle: Math.PI / 4,
          length: 8,
          opacity: baseOpacity,
          baseOpacity,
          vx: 0,
          vy: 0,
          vAngle: 0,
        });
      }
    }

    ticksRef.current = ticks;
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Check if light mode is active
    const isLightMode = document.documentElement.classList.contains("light");

    const mouse = mouseRef.current;
    const strongRadius = 150;       // Strong magnetic zone (close)
    const farRadius = 500;          // Subtle influence zone (far)
    const magneticStrength = 0.12;
    const returnStrength = 0.06;
    const friction = 0.88;

    ticksRef.current.forEach((tick) => {
      const dx = mouse.x - tick.x;
      const dy = mouse.y - tick.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < strongRadius && distance > 0) {
        // STRONG ZONE: Close particles react strongly
        const force = Math.pow((strongRadius - distance) / strongRadius, 2);
        
        // Move towards cursor
        tick.vx += (dx / distance) * force * magneticStrength * 15;
        tick.vy += (dy / distance) * force * magneticStrength * 15;
        
        // Rotate to point towards cursor
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - tick.angle;
        tick.vAngle += angleDiff * force * 0.15;
        
        // Increase opacity when affected
        tick.opacity = tick.baseOpacity + force * 0.6;
        
        // Add subtle trembling
        tick.vx += (Math.random() - 0.5) * force * 0.5;
        tick.vy += (Math.random() - 0.5) * force * 0.5;
      } else if (distance < farRadius && distance > 0) {
        // FAR ZONE: Distant particles react subtly
        const farForce = Math.pow((farRadius - distance) / (farRadius - strongRadius), 1.5) * 0.25;
        
        // Gentle pull towards cursor
        tick.vx += (dx / distance) * farForce * magneticStrength * 4;
        tick.vy += (dy / distance) * farForce * magneticStrength * 4;
        
        // Subtle rotation towards cursor
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - tick.angle;
        tick.vAngle += angleDiff * farForce * 0.05;
        
        // Slight opacity boost
        tick.opacity = tick.baseOpacity + farForce * 0.2;
      } else {
        // Return opacity to base
        tick.opacity += (tick.baseOpacity - tick.opacity) * 0.1;
      }

      // Spring back to base position
      tick.vx += (tick.baseX - tick.x) * returnStrength;
      tick.vy += (tick.baseY - tick.y) * returnStrength;
      tick.vAngle += (tick.baseAngle - tick.angle) * returnStrength;

      // Apply friction
      tick.vx *= friction;
      tick.vy *= friction;
      tick.vAngle *= friction;

      // Update position and angle
      tick.x += tick.vx;
      tick.y += tick.vy;
      tick.angle += tick.vAngle;

      // Draw tick mark (diagonal line)
      const halfLen = tick.length / 2;
      const x1 = tick.x - Math.cos(tick.angle) * halfLen;
      const y1 = tick.y - Math.sin(tick.angle) * halfLen;
      const x2 = tick.x + Math.cos(tick.angle) * halfLen;
      const y2 = tick.y + Math.sin(tick.angle) * halfLen;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = getGradientColor(tick.baseX, canvas.width, tick.opacity, isLightMode);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Setup canvas and event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initTicks();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { 
        x: e.clientX, 
        y: e.clientY
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    // Initial setup
    resize();
    
    // Start animation immediately
    const startAnimation = () => {
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Small delay to ensure DOM is ready
    setTimeout(startAnimation, 100);

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initTicks, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
}
