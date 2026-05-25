/**
 * split-seed.js
 * Splits seed.sql into smaller chunks safe for Supabase SQL editor (~500 rows each)
 * Run: node supabase/split-seed.js
 * Then paste each output file into Supabase SQL Editor one at a time.
 */

const fs = require('fs')
const path = require('path')

const seedPath = path.join(__dirname, 'seed.sql')
const content = fs.readFileSync(seedPath, 'utf8')

// Extract the DELETE block (first 2 lines after the comments)
const deleteMatch = content.match(/(DELETE FROM submissions[^;]+;[\s\n]*DELETE FROM books[^;]+;)/i)
const deleteBlock = deleteMatch ? deleteMatch[1].trim() : ''

// Extract all individual row values: each line like "  ('title',...),\n"
const insertHeader = "INSERT INTO books (title, author, publisher, year, pages, category, language, synopsis, moral) VALUES"
const valuesSection = content.substring(content.indexOf(insertHeader) + insertHeader.length)

// Split into individual rows — each row ends with )," or ");"
const rowRegex = /\([^)]*(?:\([^)]*\)[^)]*)*\)/g
const rows = valuesSection.match(rowRegex) || []

console.log(`Total rows found: ${rows.length}`)

const CHUNK_SIZE = 500
const chunks = []
for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
  chunks.push(rows.slice(i, i + CHUNK_SIZE))
}

const outDir = path.join(__dirname, 'seed-chunks')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

// First chunk includes the DELETE block
chunks.forEach((chunk, idx) => {
  const chunkNum = idx + 1
  const values = chunk.join(',\n  ')
  let sql = ''
  if (idx === 0 && deleteBlock) {
    sql += deleteBlock + '\n\n'
  }
  sql += `${insertHeader}\n  ${values};\n`
  const outPath = path.join(outDir, `seed-chunk-${String(chunkNum).padStart(2, '0')}.sql`)
  fs.writeFileSync(outPath, sql)
  console.log(`Written: seed-chunk-${String(chunkNum).padStart(2, '0')}.sql (${chunk.length} rows)`)
})

console.log(`\nDone! ${chunks.length} files in supabase/seed-chunks/`)
console.log('Paste each file into Supabase SQL Editor in order (01 first, then 02, 03...).')
