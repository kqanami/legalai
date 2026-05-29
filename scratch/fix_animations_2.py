import os
import glob
import re

def fix_animations():
    src_dir = r"d:\agent1.0\ai-legal-kz\src"
    jsx_files = glob.glob(os.path.join(src_dir, "**", "*.jsx"), recursive=True)
    
    for filepath in jsx_files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        modified = False
        
        # Replace transition
        new_content = re.sub(
            r'transition: \{ duration: 0\.6, ease: \[0\.23, 1, 0\.32, 1\] \}',
            "transition: { duration: 0.4, ease: 'easeOut' }",
            content
        )
        
        new_content = re.sub(
            r'transition=\{\{ duration: 0\.6, ease: \[0\.23, 1, 0\.32, 1\] \}\}',
            "transition={{ duration: 0.4, ease: 'easeOut' }}",
            new_content
        )

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {os.path.basename(filepath)}")

if __name__ == '__main__':
    fix_animations()
