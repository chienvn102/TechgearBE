// utils/numberToVietnamese.js
// Convert number to Vietnamese words

const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];

function convertLessThanOneThousand(number) {
  let result = '';
  
  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  
  if (hundreds > 0) {
    result += ones[hundreds] + ' trăm';
    if (remainder > 0 && remainder < 10) {
      result += ' lẻ';
    }
  }
  
  if (remainder >= 10 && remainder < 20) {
    result += ' ' + teens[remainder - 10];
  } else if (remainder >= 20) {
    const tens = Math.floor(remainder / 10);
    const onesDigit = remainder % 10;
    
    result += ' ' + ones[tens] + ' mươi';
    if (onesDigit === 1) {
      result += ' mốt';
    } else if (onesDigit === 5 && tens >= 1) {
      result += ' lăm';
    } else if (onesDigit > 0) {
      result += ' ' + ones[onesDigit];
    }
  } else if (remainder > 0 && remainder < 10 && hundreds > 0) {
    result += ' ' + ones[remainder];
  } else if (remainder > 0) {
    result += ones[remainder];
  }
  
  return result.trim();
}

function numberToVietnamese(number) {
  if (number === 0) return 'không';
  if (!number || isNaN(number)) return '';
  
  number = Math.floor(number); // Remove decimals
  
  if (number < 0) {
    return 'âm ' + numberToVietnamese(Math.abs(number));
  }
  
  let result = '';
  
  const billion = Math.floor(number / 1000000000);
  const million = Math.floor((number % 1000000000) / 1000000);
  const thousand = Math.floor((number % 1000000) / 1000);
  const remainder = number % 1000;
  
  if (billion > 0) {
    result += convertLessThanOneThousand(billion) + ' tỷ';
  }
  
  if (million > 0) {
    result += ' ' + convertLessThanOneThousand(million) + ' triệu';
  }
  
  if (thousand > 0) {
    result += ' ' + convertLessThanOneThousand(thousand) + ' nghìn';
  }
  
  if (remainder > 0) {
    result += ' ' + convertLessThanOneThousand(remainder);
  }
  
  result = result.trim();
  
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

module.exports = { numberToVietnamese };
