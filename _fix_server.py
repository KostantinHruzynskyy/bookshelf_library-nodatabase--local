import pathlib

p = pathlib.Path('server.js')
lines = p.read_text(encoding='utf-8').split('\n')

# Find and remove lines 57-71 (0-indexed) which are the duplicate declarations
# Line 57 is empty, 58 is const BOOKS_FILE, ..., 71 is }
# We want to keep the migration block (lines 43-56) and remove 57-71

# Identify lines to remove
remove_start = None
remove_end = None
for i, line in enumerate(lines):
    if 'const BOOKS_FILE = path.join(__dirname, "books.json");' in line and remove_start is None:
        # Check if this is the second occurrence (after migration block)
        # Count how many times we've seen BOOKS_FILE before this line
        count_before = sum(1 for l in lines[:i] if 'BOOKS_FILE' in l)
        if count_before >= 1:
            remove_start = i - 1  # include the blank line before
            # Find the end of this block (the closing } of ensure books.json)
            for j in range(i, min(i+20, len(lines))):
                if lines[j].strip() == '}' and 'BOOKS_FILE' in ''.join(lines[i:j+1]):
                    remove_end = j + 1
                    break

print(f"Removing lines {remove_start} to {remove_end}")
if remove_start is not None and remove_end is not None:
    new_lines = lines[:remove_start] + lines[remove_end:]
    p.write_text('\n'.join(new_lines), encoding='utf-8')
    print(f"Done. Removed {remove_end - remove_start} lines")
else:
    print("Could not find block to remove")
