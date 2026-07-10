import sys

try:
    with open(r'D:\AI Study\owlstudy-app.html', 'r', encoding='utf-8') as f:
        content = f.read()

    old = """    (f.eyes||[]).slice(0,2).forEach(function(e){
      var eb=e.bbox;
      ctx.strokeStyle='#38bdf8';
      ctx.lineWidth=2;
      ctx.strokeRect(eb[0]*sx,eb[1]*sy,eb[2]*sx,eb[3]*sy);
      if(e.state){
        ctx.fillStyle='#0ea5e9';
        ctx.font='bold 12px sans-serif';
        ctx.fillText(e.state,eb[0]*sx,Math.max(12,eb[1]*sy-4));
      }
    });
"""

    if old in content:
        new_content = content.replace(old, "")
        with open(r'D:\AI Study\owlstudy-app.html', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('SUCCESS: Removed eye drawing code')
    else:
        print('FAILED: Code pattern not found')
        # Try to find it with different whitespace
        idx = content.find('(f.eyes||[])')
        if idx != -1:
            print(f'Found at index {idx}')
            print(repr(content[idx:idx+500]))
except Exception as e:
    print(f'ERROR: {e}')
    import traceback
    traceback.print_exc()
