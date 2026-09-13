import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { nanoid } from 'nanoid'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'academy.db.json')

let data = { users: [], players: [], results: [], slots: [], bookings: [], import_batches: [], comments: [], notifications: [], conversion_requests: [], expenses: [] }

if (existsSync(DB_PATH)) {
  try { data = JSON.parse(readFileSync(DB_PATH, 'utf-8')) } catch { /* start fresh */ }
}

// Ensure all expected collections exist (handles adding new collections)
const DEFAULTS = { users: [], players: [], results: [], slots: [], bookings: [], import_batches: [], comments: [], notifications: [], conversion_requests: [], expenses: [] }
for (const [key, val] of Object.entries(DEFAULTS)) {
  if (!Array.isArray(data[key])) data[key] = val
}

function save() { writeFileSync(DB_PATH, JSON.stringify(data, null, 2)) }

function nextId(collection) {
  const items = data[collection]
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1
}

function now() { return new Date().toISOString().replace('T', ' ').slice(0, 19) }

const db = {
  save,

  query(collection, { where, orderBy, limit, offset } = {}) {
    let items = [...data[collection]]
    if (where) items = items.filter(where)
    if (orderBy) items.sort(orderBy)
    if (offset) items = items.slice(offset)
    if (limit) items = items.slice(0, limit)
    return items
  },

  get(collection, id) {
    return data[collection].find(i => i.id === id) || null
  },

  find(collection, predicate) {
    return data[collection].find(predicate) || null
  },

  findAll(collection, predicate) {
    return predicate ? data[collection].filter(predicate) : [...data[collection]]
  },

  insert(collection, record) {
    const id = nextId(collection)
    const rec = { id, ...record, created_at: record.created_at || now(), updated_at: now() }
    data[collection].push(rec)
    save()
    return rec
  },

  update(collection, id, updates) {
    const idx = data[collection].findIndex(i => i.id === id)
    if (idx === -1) return null
    data[collection][idx] = { ...data[collection][idx], ...updates, updated_at: now() }
    save()
    return data[collection][idx]
  },

  remove(collection, id) {
    const idx = data[collection].findIndex(i => i.id === id)
    if (idx === -1) return false
    data[collection].splice(idx, 1)
    save()
    return true
  },

  count(collection, predicate) {
    return predicate ? data[collection].filter(predicate).length : data[collection].length
  },

  sum(collection, field, predicate) {
    const items = predicate ? data[collection].filter(predicate) : data[collection]
    return items.reduce((s, i) => s + (Number(i[field]) || 0), 0)
  },

  insertBatch(collection, records) {
    let count = 0
    for (const record of records) {
      const id = nextId(collection)
      const rec = { id, ...record, created_at: now(), updated_at: now() }
      data[collection].push(rec)
      count++
    }
    save()
    return count
  },

  upsert(collection, matchFields, record) {
    const idx = data[collection].findIndex(i => matchFields.every(f => i[f] === record[f]))
    if (idx >= 0) {
      data[collection][idx] = { ...data[collection][idx], ...record, updated_at: now() }
      save()
      return data[collection][idx]
    }
    return db.insert(collection, record)
  },

  transaction(fn) {
    fn()
    save()
  },

  clear(collection) {
    data[collection] = []
    save()
  }
}

export default db
