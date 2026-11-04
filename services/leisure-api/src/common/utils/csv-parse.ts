/**
 * CSV 解析(零依赖;与导出侧 CSV BOM 格式配套)
 * 用途:批量凭证导入等小文件上传;支持引号转义/内嵌逗号与换行/BOM
 * 选取 CSV 而非 xlsx 解析:Excel/WPS 可直接另存「CSV UTF-8」,零外部依赖且免 ZIP 解析面
 */
export function parseCsvTable(text: string): string[][] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuote = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuote) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuote = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuote = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\r') {
      /* 跳过 CR */
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}
