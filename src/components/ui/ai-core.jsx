import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AICore() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      // Normalize mouse coordinates from -1 to 1
      const x = (clientX / innerWidth) * 2 - 1;
      const y = (clientY / innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Map mouse position to rotation with spring physics for smooth tracking
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [35, -35]), { damping: 40, stiffness: 150 });
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-35, 35]), { damping: 40, stiffness: 150 });

  return (
    <div className="w-full h-full flex items-center justify-center relative cursor-default" style={{ perspective: "1200px" }}>
      
      {/* Background massive glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/5 blur-[100px] rounded-full pointer-events-none" />

      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-72 h-72 md:w-[28rem] md:h-[28rem]"
      >
        {/* Core glowing sphere */}
        <div 
          className="absolute inset-0 rounded-full border border-neutral-700 bg-neutral-950/80 shadow-[inset_0_0_100px_rgba(255,255,255,0.05),_0_0_80px_rgba(255,255,255,0.05)] overflow-hidden"
          style={{ transform: "translateZ(0px)", transformStyle: "preserve-3d" }}
        >
           {/* Abstract grid lines inside the sphere */}
           <div className="absolute inset-0 border border-white/[0.03] rounded-full animate-[spin_20s_linear_infinite]" style={{ transform: "rotateX(75deg)" }} />
           <div className="absolute inset-0 border border-white/[0.03] rounded-full animate-[spin_25s_linear_infinite_reverse]" style={{ transform: "rotateY(75deg)" }} />
           <div className="absolute inset-0 border border-white/[0.03] rounded-full animate-[spin_30s_linear_infinite]" style={{ transform: "rotateZ(75deg)" }} />
           
           {/* Inner bright core */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/10 blur-3xl rounded-full animate-pulse" />
        </div>

        {/* Floating elements tracking in 3D space */}
        {/* Ring 1 */}
        <motion.div 
          className="absolute inset-[-20%] rounded-full border border-white/10"
          style={{ transform: "translateZ(80px) rotateX(60deg) rotateY(20deg)", transformStyle: "preserve-3d" }}
          animate={{ rotateZ: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
           <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full blur-[2px] shadow-[0_0_10px_white]" />
        </motion.div>

        {/* Ring 2 */}
        <motion.div 
          className="absolute inset-[-40%] rounded-full border border-white/[0.05]"
          style={{ transform: "translateZ(-60px) rotateX(-40deg) rotateY(-30deg)", transformStyle: "preserve-3d" }}
          animate={{ rotateZ: -360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
           <div className="absolute bottom-0 right-1/4 w-3 h-3 bg-neutral-400 rounded-full blur-[1px] shadow-[0_0_15px_rgba(163,163,163,0.8)]" />
        </motion.div>

        {/* Data points floating */}
        <div className="absolute inset-0" style={{ transform: "translateZ(120px)" }}>
           <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-white/80 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
           <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-white/60 rounded-full animate-ping" style={{ animationDuration: "4s", animationDelay: "1s" }} />
           <div className="absolute top-1/2 right-1/8 w-2 h-2 bg-neutral-300/50 rounded-full animate-pulse" />
        </div>
      </motion.div>
    </div>
  );
}
