import re

with open(r'D:\AI Study\owlstudy-app.html', 'r', encoding='utf-8') as f:
    content = f.read()

print('File length:', len(content))

# Search for eye-related code
idx = content.find('f.eyes')
if idx != -1:
    print(f'Found f.eyes at position {idx}')
    print('--- Context ---')
    print(content[idx-200:idx+600])
    print('--- End Context ---')
else:
    print('f.eyes not found')

# Try to find the eye drawing code
pattern = r'\(f\.eyes\|\|\[\)\.slice\(0,2\)\.forEach.*?\}\);'
match = re.search(pattern, content, re.DOTALL)
if match:
    print('\nFound match with regex:')
    print(match.group(0))
    old_code = match.group(0)
    new_content = content.replace(old_code, '')
    with open(r'D:\AI Study\owlstudy-app.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('\nSuccessfully removed eye drawing code')
else:
    print('\nNo match with regex')
