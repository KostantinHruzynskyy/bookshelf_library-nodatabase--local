import pathlib

p = pathlib.Path('src/repositories/books.js')
c = p.read_text(encoding='utf-8')

# The regex /<style[^>]*>[\s\S]*?</style>/gi has an unescaped / before 'style>'
# Inside a regex literal, / must be escaped as \/
# Fix: replace </style> with <\/style> inside the regex

lines = c.split('\n')
fixed = []
for line in lines:
    if 'replace(/<style' in line and '</style>' in line:
        # Escape the / in </style> within the regex
        line = line.replace('</style>/gi', '<\\/style>/gi')
    if 'replace(/<script' in line and '</script>' in line:
        line = line.replace('</script>/gi', '<\\/script>/gi')
    fixed.append(line)

c = '\n'.join(fixed)
p.write_text(c, encoding='utf-8')
print('Fixed regex escaping in books.js')
