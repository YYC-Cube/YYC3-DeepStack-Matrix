// AI 智能配色
class AIColorGenerator {
  // 基于主色生成配色方案
  static generateColorScheme(primaryColor) {
    const hsl = this.hexToHSL(primaryColor);
    const scheme = {
      primary: primaryColor,
      secondary: this.adjustHue(hsl, 30),
      accent: this.adjustHue(hsl, 180),
      background: this.adjustLightness(hsl, -80),
      card: this.adjustLightness(hsl, -70),
      text: this.adjustLightness(hsl, 80),
    };
    return scheme;
  }
  
  // 调整色相
  static adjustHue(hsl, delta) {
    const newHue = (hsl.h + delta) % 360;
    return `hsl(${newHue}, ${hsl.s}%, ${hsl.l}%)`;
  }
  
  // 调整亮度
  static adjustLightness(hsl, delta) {
    const newLightness = Math.max(0, Math.min(100, hsl.l + delta));
    return `hsl(${hsl.h}, ${hsl.s}%, ${newLightness}%)`;
  }
  
  // HEX 转 HSL
  static hexToHSL(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
}

// 使用示例
const scheme = AIColorGenerator.generateColorScheme('#00ff87');
console.log(scheme);
