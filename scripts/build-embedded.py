"""Build a single self-contained HTML page (used for the hosted claude.ai copy).

Usage: VITE_EMBEDDED=1 npm run build && python3 scripts/build-embedded.py OUT.html
"""
import glob
import sys

js = open(glob.glob('dist/assets/*.js')[0]).read()
css = open(glob.glob('dist/assets/*.css')[0]).read()
assert '</script' not in js.lower(), 'bundle contains a closing script tag'
html = f'''<title>GuerdoLandia</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap">
<style>{css}</style>
<div id="root"></div>
<script type="module">{js}</script>
'''
open(sys.argv[1], 'w').write(html)
print(f'wrote {sys.argv[1]} ({len(html) // 1024} KB)')
