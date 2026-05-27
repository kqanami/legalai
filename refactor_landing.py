import sys
import re

def refactor():
    filepath = "d:/agent1.0/ai-legal-kz/src/pages/LandingPage.jsx"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Replace bg-obsidian-950 with bg-transparent so canvas shows through
    content = content.replace("bg-obsidian-950", "bg-transparent")

    # 2. Remove the old HeroCanvas rendering logic from the Hero section
    old_canvas_block = """        {/* 3D Canvas — fills the entire hero */}
        {webglSupported && (
          <div className="absolute inset-0 z-0">
            <Suspense fallback={null}>
              <HeroCanvas scrollProgress={scrollProgress3D} />
            </Suspense>
          </div>
        )}

        {/* Fallback gradient when no WebGL */}
        {!webglSupported && (
          <div className="absolute inset-0 z-0"
            style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(40,60,120,0.3) 0%, transparent 65%)' }} />
        )}"""
    
    content = content.replace(old_canvas_block, "")

    # 3. Find the split point to insert the Canvas wrapper
    split_marker = "{/* ═══════════════════════════════════════════\n          HERO — 3D Cinematic Scales"
    parts = content.split(split_marker)
    if len(parts) != 2:
        print("Could not find split marker")
        return
        
    top_part = parts[0]
    bottom_part = split_marker + parts[1]
    
    # 4. In bottom_part, extract the closing statements of the LandingPage component
    # Specifically, find the last `</div>` followed by `  );\n}`
    
    match = re.search(r'(</PaymentModal>\s*|\/>\s*)</div>\s*\);\s*}\s*$', bottom_part)
    if not match:
        print("Could not find end of component")
        return
        
    inner_content = bottom_part[:match.start()]
    modal_and_end = bottom_part[match.start():]
    
    # We also want to put PaymentModal outside, let's extract it if it's in inner_content
    # (Actually it's usually at the end right before the final div)
    payment_modal_idx = inner_content.rfind("<PaymentModal")
    if payment_modal_idx != -1:
        payment_modal_str = inner_content[payment_modal_idx:]
        inner_content = inner_content[:payment_modal_idx]
    else:
        payment_modal_str = ""
        
    # Combine the payment modal strings
    final_end = payment_modal_str + modal_and_end
    
    new_bottom = f"""
      <Suspense fallback={{null}}>
        {{webglSupported ? (
          <HeroCanvas>
            <div className="pointer-events-none w-full">
              <div className="pointer-events-auto">
{inner_content}
              </div>
            </div>
          </HeroCanvas>
        ) : (
          <div className="fallback-layout">
{inner_content}
          </div>
        )}}
      </Suspense>
      {final_end}
"""
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(top_part + new_bottom)

    print("Refactoring complete.")

if __name__ == "__main__":
    refactor()
