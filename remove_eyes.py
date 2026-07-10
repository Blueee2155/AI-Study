
# Read the file
with open(r'D:\AI Study\owlstudy-app.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')

# Find and remove the eye drawing code (lines 655-665, 0-indexed 654-664)
# The code to remove is:
#     (f.eyes||[]).slice(0,2).forEach(function(e){
#       var eb=e.bbox;
#       ctx.strokeStyle='#38bdf8';
#       ctx.lineWidth=2;
#       ctx.strokeRect(eb[0]*sx,eb[1]*sy,eb[2]*sx,eb[3]*sy);
#       if(e.state){
#         ctx.fillStyle='#0ea5e9';
#         ctx.font='bold 12px sans-serif';
#         ctx.fillText(e.state,eb[0]*sx,Math.max(12,eb[1]*sy-4));
#       }
#     });

# Let's find the exact lines
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if '(f.eyes||[]).slice(0,2).forEach' in line:
        start_idx = i
        print(f'Found start at line {i+1}: {line.rstrip()}')
    if start_idx is not None and '});' in line and i > start_idx:
        end_idx = i
        print(f'Found end at line {i+1}: {line.rstrip()}')
        break

if start_idx is not None and end_idx is not None:
    print(f'Removing lines {start_idx+1} to {end_idx+1}')
    # Remove those lines
    new_lines = lines[:start_idx] + lines[end_idx+1:]
    with open(r'D:\AI Study\owlstudy-app.html', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print('Successfully removed eye drawing code')
else:
    print('Could not find the code to remove')
