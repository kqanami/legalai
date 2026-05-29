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
        
        # Replace itemVariants
        new_content = re.sub(
            r'const itemVariants = \{\s*hidden:.*?(?:y:\s*\d+)?\},\s*visible: \{\s*opacity: 1,\s*y:\s*0,\s*transition: \{[^}]+\}\s*\},?\s*\};',
            "const itemVariants = {\n  hidden: { opacity: 0, y: 20 },\n  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } }\n};",
            content,
            flags=re.DOTALL
        )
        
        # Alternative single line replace
        new_content = re.sub(
            r'transition: \{ type: [\'"]spring[\'"], stiffness: \d+, damping: \d+ \}',
            "transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] }",
            new_content
        )
        
        # Replace containerVariants
        new_content = re.sub(
            r'const containerVariants = \{\s*hidden: \{\s*opacity:\s*0\s*\},\s*visible: \{\s*opacity: 1,\s*transition: \{ staggerChildren: [\d.]+ \}\s*\},?\s*\};',
            "const containerVariants = {\n  hidden: { opacity: 0 },\n  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }\n};",
            new_content,
            flags=re.DOTALL
        )
        
        # Replace msgVariants in ChatPage
        new_content = re.sub(
            r'const msgVariants = \{\s*hidden:.*?\s*visible: \{.*?ease: \[.*?\] \} \},\s*exit: \{.*?\} \},\s*\};',
            "const msgVariants = {\n  hidden: { opacity: 0, y: 20 },\n  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] } },\n  exit: { opacity: 0, transition: { duration: 0.3 } },\n};",
            new_content,
            flags=re.DOTALL
        )
        
        # Also find any hardcoded spring animations in motion.div attributes
        new_content = re.sub(
            r'transition=\{\{ type: [\'"]spring[\'"], stiffness: \d+, damping: \d+ \}\}',
            "transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}",
            new_content
        )

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {os.path.basename(filepath)}")

if __name__ == '__main__':
    fix_animations()
