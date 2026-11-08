const DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const POSITIONS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

function convertGroup(numStr: string): string {
  let result = ''
  const len = numStr.length
  for (let i = 0; i < len; i++) {
    const digit = Number(numStr[i])
    const posFromRight = len - i - 1
    if (digit === 0) continue
    if (posFromRight === 0 && digit === 1 && len > 1) {
      result += 'เอ็ด'
    } else if (posFromRight === 1 && digit === 1) {
      result += 'สิบ'
    } else if (posFromRight === 1 && digit === 2) {
      result += 'ยี่สิบ'
    } else {
      result += DIGITS[digit] + POSITIONS[posFromRight]
    }
  }
  return result
}

function convertInteger(n: number): string {
  if (n === 0) return 'ศูนย์'
  let numStr = String(n)
  let result = ''
  // แบ่งทีละ 6 หลักจากขวา แล้วต่อด้วย "ล้าน" ซ้ำสำหรับจำนวนที่เกินล้าน
  const millionGroups: string[] = []
  while (numStr.length > 0) {
    millionGroups.unshift(numStr.slice(-6))
    numStr = numStr.slice(0, -6)
  }
  for (let i = 0; i < millionGroups.length; i++) {
    const group = millionGroups[i].replace(/^0+(?=\d)/, '')
    if (group === '') continue
    result += convertGroup(group)
    if (i < millionGroups.length - 1) result += 'ล้าน'
  }
  return result
}

export function bahtText(amount: number): string {
  const rounded = Math.round(Math.abs(amount) * 100) / 100
  const baht = Math.floor(rounded)
  const satang = Math.round((rounded - baht) * 100)

  let text = convertInteger(baht) + 'บาท'
  text += satang === 0 ? 'ถ้วน' : convertInteger(satang) + 'สตางค์'
  return text
}
