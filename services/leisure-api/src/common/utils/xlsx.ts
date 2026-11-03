/**
 * 零依赖最小 xlsx 生成器(报表导出;单工作簿多工作表,stored 无压缩)
 * 依据:ECMA-376 SpreadsheetML;仅需 [Content_Types].xml/_rels/workbook/sheet 骨架
 * 适用:行数 ≤ 数万(报表上限 200 行/页,安全余量大);数字写 <v>,文本 inlineStr(免 sharedStrings)
 */

type CellValue = string | number | null | boolean | Date

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function cellXml(v: CellValue, ref: string): string {
  if (v === null) return ''
  if (typeof v === 'number' && Number.isFinite(v)) {
    return `<c r="${ref}"><v>${String(v)}</v></c>`
  }
  if (typeof v === 'boolean') {
    return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`
  }
  const s = v instanceof Date ? v.toISOString().slice(0, 19).replace('T', ' ') : String(v)
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escXml(s)}</t></is></c>`
}

function colRef(col: number): string {
  let s = ''
  let x: number = col
  while (x > 0) {
    const m: number = (x - 1) % 26
    s = String.fromCharCode(65 + m) + s
    x = Math.floor((x - 1) / 26)
  }
  return s
}

function sheetXml(rows: CellValue[][]): string {
  const lines: string[] = []
  for (let r = 0; r < rows.length; r++) {
    const cells: string[] = []
    for (let c = 0; c < rows[r]!.length; c++) {
      const cell = cellXml(rows[r]![c]!, colRef(c + 1) + String(r + 1))
      if (cell !== '') cells.push(cell)
    }
    lines.push(`<row r="${String(r + 1)}">${cells.join('')}</row>`)
  }
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>' + lines.join('') + '</sheetData></worksheet>'
  )
}

function workbookXml(names: string[]): string {
  const sheets = names
    .map((n, i) => `<sheet name="${escXml(n)}" sheetId="${String(i + 1)}" r:id="rId${String(i + 1)}"/>`)
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' + sheets + '</sheets></workbook>'
  )
}

/* ── ZIP(stored)── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface ZipEntry {
  name: string
  data: Buffer
}

function zipStore(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8')
    const crc = crc32(e.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // flags: UTF-8 names
    local.writeUInt16LE(0, 8) // method: stored
    local.writeUInt16LE(0, 10) // time
    local.writeUInt16LE(0x5291, 12) // date(固定基准;仅元信息)
    local.writeUInt32LE(crc, 14) // crc32
    local.writeUInt32LE(e.data.length, 18) // compressed
    local.writeUInt32LE(e.data.length, 22) // uncompressed
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, nameBuf, e.data)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0x5291, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(e.data.length, 20)
    central.writeUInt32LE(e.data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt16LE(0, 38)
    central.writeUInt32LE(0, 40)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuf)
    offset += 30 + nameBuf.length + e.data.length
  }
  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, centralBuf, end])
}

/* ── 对外:xlsx 组装 ── */

export interface XlsxSheet {
  name: string
  rows: CellValue[][]
}

/** 生成最小 xlsx(每表首行为表头;Excel/WPS 直开) */
export function toXlsx(sheets: XlsxSheet[]): Buffer {
  const entries: ZipEntry[] = []
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${String(i + 1)}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('') +
    '</Types>'
  entries.push({ name: '[Content_Types].xml', data: Buffer.from(contentTypes) })
  entries.push({
    name: '_rels/.rels',
    data: Buffer.from(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    ),
  })
  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${String(i + 1)}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${String(i + 1)}.xml"/>`,
      )
      .join('') +
    '</Relationships>'
  entries.push({ name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(rels) })
  entries.push({ name: 'xl/workbook.xml', data: Buffer.from(workbookXml(sheets.map((s) => s.name))) })
  for (let i = 0; i < sheets.length; i++) {
    entries.push({ name: `xl/worksheets/sheet${String(i + 1)}.xml`, data: Buffer.from(sheetXml(sheets[i]!.rows)) })
  }
  return zipStore(entries)
}
