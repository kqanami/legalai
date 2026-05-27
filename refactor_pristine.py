import sys
import re

def refactor():
    filepath = "d:/agent1.0/ai-legal-kz/src/pages/LandingPage.jsx"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if "import HeroCanvas" not in content:
        content = content.replace("import { motion", "import { Suspense } from 'react';\nimport HeroCanvas from '../components/three/HeroCanvas';\nimport { motion")

    content = content.replace("bg-obsidian-950", "bg-transparent")
    content = content.replace("bg-obsidian-900", "bg-transparent")
    
    split_marker = "{/* ══════ HERO ══════ */}"
    parts = content.split(split_marker)
    if len(parts) != 2:
        print("Could not find split marker")
        return
        
    top_part = parts[0]
    bottom_part = split_marker + parts[1]
    
    # We want to replace the final `    </div>\n  );\n}` with the wrappers.
    # So we split at the last `</div>`
    last_div_idx = bottom_part.rfind("</div>")
    
    inner_content = bottom_part[:last_div_idx]
    
    new_bottom = f"""
      <Suspense fallback={{null}}>
        <HeroCanvas>
          <div className="pointer-events-none w-full flex flex-col items-center">
            <div className="pointer-events-auto w-full">
{inner_content}
            </div>
          </div>
        </HeroCanvas>
      </Suspense>
    </div>
  );
}}
"""
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(top_part + new_bottom)

    print("Refactoring complete.")

if __name__ == "__main__":
    refactor()
