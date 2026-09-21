import re

with open('NavBar.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the indentation and extra > on the bottom bar div line
# Match the line with too many spaces and the extra >
pattern = r'( {6})\{/\* fila inferior: botones del menú \*/\}\n([ ]+)(<div className=.*bottom-bar.*?\}style={{ zIndex: 1400 }})>>'
replacement = r'\1{/* fila inferior: botones del menú */}\n      \3>'

new_content = re.sub(pattern, replacement, content)

if new_content != content:
    with open('NavBar.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed!")
else:
    print("Pattern not found")
    # Show context
    lines = content.split('\n')
    for i in range(449, min(456, len(lines))):
        print(f"{i+1}: {repr(lines[i])}")