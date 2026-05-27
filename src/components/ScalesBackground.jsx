import { useEffect, useRef, memo } from 'react';

const ScalesBackground = memo(function ScalesBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, raf;
    let t = 0;
    let mx = 0.5, my = 0.5;
    let tmx = 0.5, tmy = 0.5;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = e => {
      tmx = e.clientX / W;
      tmy = e.clientY / H;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    /* ── PARTICLES ── */
    const PCOUNT = 140;
    const particles = Array.from({ length: PCOUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.3 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      spd: 0.2 + Math.random() * 0.8,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -(0.04 + Math.random() * 0.15),
      alpha: 0.15 + Math.random() * 0.55,
      depth: Math.random(),
    }));

    /* ── DRAW A SINGLE PREMIUM SCALE ── */
    function drawScale(ox, oy, S, swing, opacity) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(ox, oy);

      const pillarH = S * 1.5;
      const beamHalfW = S * 0.52;
      const beamY = -pillarH + S * 0.05;
      const panDepth = S * 0.34 + swing * 0.15;     // left pan depth
      const panDepthR = S * 0.34 - swing * 0.15;    // right pan depth

      // ── PILLAR ──
      const pillarW = S * 0.018;
      const pg = ctx.createLinearGradient(-pillarW, -pillarH, pillarW * 2, 0);
      pg.addColorStop(0, 'rgba(255,255,255,0.55)');
      pg.addColorStop(0.35, 'rgba(203,213,225,0.28)');
      pg.addColorStop(0.7, 'rgba(148,163,184,0.12)');
      pg.addColorStop(1, 'rgba(100,116,139,0.04)');

      // Rounded pillar using bezier
      ctx.beginPath();
      ctx.moveTo(-pillarW / 2, 0);
      ctx.lineTo(-pillarW / 2, -pillarH + S * 0.06);
      ctx.bezierCurveTo(-pillarW / 2, -pillarH, pillarW / 2, -pillarH, pillarW / 2, -pillarH + S * 0.06);
      ctx.lineTo(pillarW / 2, 0);
      ctx.closePath();
      ctx.fillStyle = pg;
      ctx.fill();

      // Pillar edge highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-pillarW / 2 + 0.5, 0);
      ctx.lineTo(-pillarW / 2 + 0.5, -pillarH + S * 0.06);
      ctx.stroke();

      // ── TOP ORB / FINIAL ──
      const orbR = S * 0.038;
      const orbG = ctx.createRadialGradient(
        -orbR * 0.3, -pillarH - orbR * 0.3, orbR * 0.1,
        0, -pillarH, orbR
      );
      orbG.addColorStop(0, 'rgba(255,255,255,0.95)');
      orbG.addColorStop(0.4, 'rgba(220,230,240,0.5)');
      orbG.addColorStop(1, 'rgba(148,163,184,0)');
      ctx.fillStyle = orbG;
      ctx.beginPath();
      ctx.arc(0, -pillarH, orbR, 0, Math.PI * 2);
      ctx.fill();

      // Halo glow around finial
      const haloG = ctx.createRadialGradient(0, -pillarH, 0, 0, -pillarH, orbR * 3.5);
      haloG.addColorStop(0, `rgba(203,213,225,${0.12 + 0.06 * Math.sin(t)})`);
      haloG.addColorStop(1, 'rgba(203,213,225,0)');
      ctx.fillStyle = haloG;
      ctx.beginPath();
      ctx.arc(0, -pillarH, orbR * 3.5, 0, Math.PI * 2);
      ctx.fill();

      // ── BALANCE POINT PIN ──
      const pinY = beamY - S * 0.005;
      const pinG = ctx.createRadialGradient(-S * 0.004, pinY - S * 0.006, 0, 0, pinY, S * 0.015);
      pinG.addColorStop(0, 'rgba(255,255,255,0.9)');
      pinG.addColorStop(1, 'rgba(203,213,225,0)');
      ctx.fillStyle = pinG;
      ctx.beginPath();
      ctx.arc(0, pinY, S * 0.015, 0, Math.PI * 2);
      ctx.fill();

      // ── BEAM ──
      const beamTilt = Math.atan2(swing * S * 0.1, beamHalfW);
      ctx.save();
      ctx.translate(0, beamY);
      ctx.rotate(beamTilt);

      const beamThick = S * 0.016;
      const bG = ctx.createLinearGradient(0, -beamThick, 0, beamThick * 1.5);
      bG.addColorStop(0, 'rgba(255,255,255,0.65)');
      bG.addColorStop(0.4, 'rgba(203,213,225,0.35)');
      bG.addColorStop(1, 'rgba(100,116,139,0.08)');

      ctx.beginPath();
      ctx.moveTo(-beamHalfW, -beamThick * 0.4);
      ctx.lineTo(-beamHalfW, beamThick * 0.6);
      ctx.quadraticCurveTo(-beamHalfW + S * 0.04, beamThick, 0, beamThick * 0.5);
      ctx.quadraticCurveTo(beamHalfW - S * 0.04, beamThick, beamHalfW, beamThick * 0.6);
      ctx.lineTo(beamHalfW, -beamThick * 0.4);
      ctx.quadraticCurveTo(0, -beamThick * 0.8, -beamHalfW, -beamThick * 0.4);
      ctx.closePath();
      ctx.fillStyle = bG;
      ctx.fill();

      // Beam top edge highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-beamHalfW + S * 0.02, -beamThick * 0.35);
      ctx.quadraticCurveTo(0, -beamThick * 0.75, beamHalfW - S * 0.02, -beamThick * 0.35);
      ctx.stroke();

      // ── LEFT STRING + PAN ──
      const strLen = S * 0.32 + swing * S * 0.08;
      const strX = -beamHalfW + S * 0.04;
      drawPan(ctx, strX, 0, strLen, S, 1, t);

      // ── RIGHT STRING + PAN ──
      const strLenR = S * 0.32 - swing * S * 0.08;
      const strXR = beamHalfW - S * 0.04;
      drawPan(ctx, strXR, 0, strLenR, S, -1, t);

      ctx.restore(); // un-rotate beam

      // ── BASE PLATE ──
      const baseW = S * 0.3;
      const baseH = S * 0.022;
      const baseR = S * 0.011;

      const baseG = ctx.createLinearGradient(-baseW / 2, -baseH, baseW / 2, baseH);
      baseG.addColorStop(0, 'rgba(255,255,255,0.08)');
      baseG.addColorStop(0.5, 'rgba(203,213,225,0.22)');
      baseG.addColorStop(1, 'rgba(100,116,139,0.06)');

      ctx.beginPath();
      ctx.roundRect(-baseW / 2, -baseH, baseW, baseH + baseR, baseR);
      ctx.fillStyle = baseG;
      ctx.fill();

      // Base reflection line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-baseW / 2 + S * 0.02, -baseH * 0.5);
      ctx.lineTo(baseW / 2 - S * 0.02, -baseH * 0.5);
      ctx.stroke();

      // ── GROUND GLOW ──
      const gGlow = ctx.createEllipse
        ? null
        : ctx.createRadialGradient(0, 0, 0, 0, 0, baseW * 1.4);
      if (!gGlow) {
        const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, baseW * 1.4);
        gg.addColorStop(0, `rgba(203,213,225,${0.08 + 0.04 * Math.sin(t * 0.6)})`);
        gg.addColorStop(1, 'rgba(203,213,225,0)');
        ctx.fillStyle = gg;
        ctx.save();
        ctx.scale(1, 0.25);
        ctx.beginPath();
        ctx.arc(0, 0, baseW * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    /* ── DRAW A PAN (dish + strings) ── */
    function drawPan(ctx, sx, sy, len, S, side, t) {
      const panW = S * 0.24;
      const panH = S * 0.045;
      const ex = sx;
      const ey = sy + len;

      // Strings — 3 wires for realism
      const offsets = [-panW * 0.35, 0, panW * 0.35];
      ctx.save();
      offsets.forEach(off => {
        const sg = ctx.createLinearGradient(sx, sy, ex + off * 0.5, ey);
        sg.addColorStop(0, 'rgba(255,255,255,0.08)');
        sg.addColorStop(0.5, 'rgba(203,213,225,0.18)');
        sg.addColorStop(1, 'rgba(255,255,255,0.06)');
        ctx.strokeStyle = sg;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex + off * 0.5, ey - panH);
        ctx.stroke();
      });
      ctx.restore();

      // Pan bowl — ellipse with gradient for 3D depth
      ctx.save();

      // Bowl shadow (dark ellipse underneath)
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.save();
      ctx.scale(1, 0.3);
      ctx.beginPath();
      ctx.arc(ex, (ey + panH * 0.5) / 0.3, panW * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer rim glow
      const rimG = ctx.createRadialGradient(ex, ey, panW * 0.7, ex, ey, panW * 1.1);
      rimG.addColorStop(0, 'rgba(255,255,255,0)');
      rimG.addColorStop(0.85, `rgba(203,213,225,${0.08 + 0.04 * Math.sin(t * 0.7 + side)})`);
      rimG.addColorStop(1, 'rgba(203,213,225,0)');
      ctx.fillStyle = rimG;
      ctx.save();
      ctx.scale(1, 0.4);
      ctx.beginPath();
      ctx.arc(ex, ey / 0.4, panW * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Pan body — concave bowl shape
      ctx.beginPath();
      ctx.ellipse(ex, ey, panW, panH, 0, 0, Math.PI * 2);
      const bowlG = ctx.createRadialGradient(
        ex - panW * 0.25, ey - panH * 0.3, panW * 0.05,
        ex, ey, panW
      );
      bowlG.addColorStop(0, 'rgba(255,255,255,0.55)');
      bowlG.addColorStop(0.35, 'rgba(220,228,240,0.25)');
      bowlG.addColorStop(0.7, 'rgba(148,163,184,0.1)');
      bowlG.addColorStop(1, 'rgba(100,116,139,0.02)');
      ctx.fillStyle = bowlG;
      ctx.fill();

      // Rim highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(ex, ey - panH * 0.15, panW * 0.9, panH * 0.6, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    /* ── DRAW GRID DOTS ── */
    function drawDots() {
      const STEP = 72;
      for (let x = 0; x <= W; x += STEP) {
        for (let y = 0; y <= H; y += STEP) {
          const d = Math.hypot(x - W * 0.5, y - H * 0.45);
          const pulse = Math.sin(t * 0.5 - d * 0.006) * 0.5 + 0.5;
          const a = (0.04 + 0.025 * pulse) * Math.max(0, 1 - d / (W * 0.7));
          if (a < 0.003) continue;
          ctx.fillStyle = `rgba(203,213,225,${a})`;
          ctx.beginPath();
          ctx.arc(x, y, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    /* ── MAIN LOOP ── */
    function draw() {
      t += 0.007;
      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;

      ctx.clearRect(0, 0, W, H);

      // Background deep glow
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.38, 0, W * 0.5, H * 0.5, W * 0.85);
      bg.addColorStop(0, `rgba(18,20,28,${0.3 + 0.08 * Math.sin(t * 0.3)})`);
      bg.addColorStop(0.6, 'rgba(8,9,14,0.2)');
      bg.addColorStop(1, 'rgba(5,5,8,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      drawDots();

      // Center ambient glow
      const ag = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, W * 0.45);
      ag.addColorStop(0, `rgba(203,213,225,${0.04 + 0.018 * Math.sin(t * 0.4)})`);
      ag.addColorStop(0.5, `rgba(148,163,184,0.012)`);
      ag.addColorStop(1, 'rgba(5,5,8,0)');
      ctx.fillStyle = ag;
      ctx.fillRect(0, 0, W, H);

      // Mouse-reactive swing
      const swing = (mx - 0.5) * 1.2 + Math.sin(t * 0.55) * 0.18;

      // MAIN BIG SCALES — centered, massive
      const bigS = Math.min(W, H) * 0.52;
      drawScale(W * 0.5, H * 0.72, bigS, swing, 0.55);

      // PARTICLES
      for (const p of particles) {
        p.x += p.vx * 0.008;
        p.y += p.vy * 0.008;
        if (p.y < -0.03) { p.y = 1.03; p.x = Math.random(); }
        if (p.x < -0.03) p.x = 1.03;
        if (p.x > 1.03) p.x = -0.03;

        const px = p.x * W, py = p.y * H;
        const twink = p.alpha * (0.55 + 0.45 * Math.sin(t * p.spd + p.phase));
        const dx = px - mx * W, dy = py - my * H;
        const prox = Math.max(0, 1 - Math.hypot(dx, dy) / 200);

        if (prox > 0.1) {
          const pg = ctx.createRadialGradient(px, py, 0, px, py, p.r * 6 + prox * 10);
          pg.addColorStop(0, `rgba(255,255,255,${twink * 0.8})`);
          pg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = pg;
          ctx.beginPath();
          ctx.arc(px, py, p.r * 6 + prox * 10, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(210,220,232,${Math.min(1, twink + prox * 0.5)})`;
        ctx.beginPath();
        ctx.arc(px, py, p.r * (0.7 + p.depth * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }

      // Vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.95);
      vig.addColorStop(0, 'rgba(5,5,8,0)');
      vig.addColorStop(1, 'rgba(5,5,8,0.75)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // Top fade (for header readability)
      const topFade = ctx.createLinearGradient(0, 0, 0, H * 0.22);
      topFade.addColorStop(0, 'rgba(5,5,8,0.6)');
      topFade.addColorStop(1, 'rgba(5,5,8,0)');
      ctx.fillStyle = topFade;
      ctx.fillRect(0, 0, W, H * 0.22);

      raf = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#050508] pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
});

export default ScalesBackground;
