// 💡 全角の数字・ピリオドを半角に変換するロジックを関数化
export const formatZenToHan = (value: string): string => {
  return value.replace(/[０-９．]/g, (s) => {
    if (s === '．') return '.';
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
};