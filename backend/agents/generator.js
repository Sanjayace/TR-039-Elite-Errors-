/**
 * Generator Agent
 * Takes a problem statement and produces initial code.
 * Uses intelligent simulation for common patterns (JS, Python, etc.)
 */

const CODE_TEMPLATES = {
  reverse: {
    lang: 'javascript',
    code: `/**
 * Reverses a string
 * @param {string} str - The input string
 * @returns {string} The reversed string
 */
function reverseString(str) {
  if (typeof str !== 'string') throw new TypeError('Input must be a string');
  return str.split('').reverse().join('');
}

// Example usage
console.log(reverseString('hello'));  // 'olleh'
console.log(reverseString('world'));  // 'dlrow'`,
  },
  factorial: {
    lang: 'javascript',
    code: `/**
 * Computes the factorial of a non-negative integer
 * @param {number} n - The input number
 * @returns {number} n!
 */
function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('Input must be a non-negative integer');
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
}

// Example usage
console.log(factorial(5));   // 120
console.log(factorial(10));  // 3628800`,
  },
  palindrome: {
    lang: 'javascript',
    code: `/**
 * Checks if a string is a palindrome
 * @param {string} str - The input string
 * @returns {boolean} True if palindrome
 */
function isPalindrome(str) {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}

// Example usage
console.log(isPalindrome('racecar'));  // true
console.log(isPalindrome('hello'));    // false`,
  },
  sort: {
    lang: 'javascript',
    code: `/**
 * Sorts an array of numbers using bubble sort
 * @param {number[]} arr - The input array
 * @returns {number[]} Sorted array (ascending)
 */
function bubbleSort(arr) {
  const a = [...arr];
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
      }
    }
  }
  return a;
}

// Example usage
console.log(bubbleSort([5, 3, 8, 1, 4]));  // [1, 3, 4, 5, 8]`,
  },
  fibonacci: {
    lang: 'javascript',
    code: `/**
 * Returns the nth Fibonacci number
 * @param {number} n - Position in Fibonacci sequence
 * @returns {number} The nth Fibonacci number
 */
function fibonacci(n) {
  if (n < 0) throw new RangeError('Input must be non-negative');
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

// Example usage
console.log(fibonacci(10));  // 55
console.log(fibonacci(0));   // 0`,
  },
  prime: {
    lang: 'javascript',
    code: `/**
 * Checks if a number is prime
 * @param {number} n - The number to check
 * @returns {boolean} True if prime
 */
function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

// Example usage
console.log(isPrime(17));  // true
console.log(isPrime(18));  // false`,
  },
  sum: {
    lang: 'javascript',
    code: `/**
 * Calculates the sum of an array of numbers
 * @param {number[]} arr - Array of numbers
 * @returns {number} The total sum
 */
function sumArray(arr) {
  if (!Array.isArray(arr)) throw new TypeError('Input must be an array');
  return arr.reduce((acc, val) => acc + val, 0);
}

// Example usage
console.log(sumArray([1, 2, 3, 4, 5]));  // 15
console.log(sumArray([]));                // 0`,
  },
  search: {
    lang: 'javascript',
    code: `/**
 * Binary search on a sorted array
 * @param {number[]} arr - Sorted array
 * @param {number} target - Value to find
 * @returns {number} Index of target, or -1 if not found
 */
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

// Example usage
console.log(binarySearch([1, 3, 5, 7, 9], 5));  // 2
console.log(binarySearch([1, 3, 5, 7, 9], 6));  // -1`,
  },
};

function detectTemplate(problem) {
  const p = problem.toLowerCase();
  if (p.includes('reverse')) return CODE_TEMPLATES.reverse;
  if (p.includes('factorial')) return CODE_TEMPLATES.factorial;
  if (p.includes('palindrome')) return CODE_TEMPLATES.palindrome;
  if (p.includes('sort') || p.includes('bubble')) return CODE_TEMPLATES.sort;
  if (p.includes('fibonacci') || p.includes('fib')) return CODE_TEMPLATES.fibonacci;
  if (p.includes('prime')) return CODE_TEMPLATES.prime;
  if (p.includes('sum') || p.includes('total')) return CODE_TEMPLATES.sum;
  if (p.includes('search') || p.includes('binary')) return CODE_TEMPLATES.search;
  return null;
}

function generateGenericCode(problem) {
  // Extract a function name hint from the problem
  const words = problem.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
  const meaningful = words.filter(w => w.length > 3 && !['write', 'create', 'make', 'build', 'that', 'function', 'which', 'with', 'from', 'this'].includes(w));
  const name = meaningful.length > 0
    ? meaningful.slice(0, 2).map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('')
    : 'solution';

  return {
    lang: 'javascript',
    code: `/**
 * ${problem}
 * @param {*} input - Input data
 * @returns {*} Result
 */
function ${name}(input) {
  // TODO: Implement logic for: ${problem}
  if (input === null || input === undefined) {
    throw new Error('Input cannot be null or undefined');
  }
  
  const result = processInput(input);
  return result;
}

function processInput(data) {
  // Core processing logic
  if (Array.isArray(data)) {
    return data.filter(Boolean).map(item => transform(item));
  }
  return transform(data);
}

function transform(value) {
  // Apply transformation
  return typeof value === 'string' ? value.trim() : value;
}

// Example usage
console.log(${name}('test input'));`,
  };
}

async function run(problem) {
  // Simulate network/processing delay
  await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

  const template = detectTemplate(problem);
  const result = template || generateGenericCode(problem);

  return {
    agent: 'Generator',
    language: result.lang,
    code: result.code,
    confidence: template ? 0.92 : 0.68,
    message: template
      ? `Matched known pattern. Generated ${result.lang} solution with high confidence.`
      : `Generated generic ${result.lang} scaffold for: "${problem}"`,
  };
}

module.exports = { run };
