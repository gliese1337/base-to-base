export type TwoPlus<T> = [T, T, ...T[]];

function fromLE<T>(digits: Iterable<T>, radix: bigint, sym2val: Map<T, bigint>) {
  let [v, m] = [0n, 1n];
  for (const d of digits) {
    const t = sym2val.get(d);
    if (t === void 0) throw new Error("Unrecognized digit");
    v += t * m;
    m *= radix;
  }

  return v;
}

function fromBE<T>(digits: Iterable<T>, radix: bigint, sym2val: Map<T, bigint>) {
  let v = 0n;
  for (const d of digits) {
    const t = sym2val.get(d);
    if (t === void 0) throw new Error("Unrecognized digit");
    v = v * radix + t;
  }

  return v;
}

function * passthru<A, B>(digits: Iterable<A>, sym2val: Map<A, bigint>, to: B[]) {
  for (const d of digits) {
    const t = sym2val.get(d);
    if (t === void 0) throw new Error("Unrecognized digit");
    yield to[Number(t)];
  }
}

function digit_ratio(n: number, m: number) {
  if (n === m) return [1, 1];
  const [a, b] = n < m ? [n, m] : [m, n];

  // Find x such that a ^ x = b ^ y
  // Find c such that a = c ^ w and b = c ^ z
  // c only exists if b = 0 mod a (c ^ z = 0 mod c ^ w)
  if (b % a > 0) return [Infinity, Infinity];

  // Use repeated division to find c.
  // c ^ (z - w) = c ^ z / c ^ w
  let [c, d] = [b, a];
  for (;;) {
    c = c / d | 0;
    if (c === d) break;
    if (c < d) [c, d] = [d, c];
    if (c % d > 0) return [Infinity, Infinity];
  }

  const logc = Math.log(c);
  const w = Math.log(a)/logc|0;
  const z = Math.log(b)/logc|0;

  // put GCD(w, z) in g
  let [g, f] = [w, z];
  while (f) [f, g] = [g % f, f];

  // return x == the factor by which
  // to multiply w so as to reach its
  // least common multiple with z.
  return n < m ? [z/g, w/g] : [w/g, z/g];
}

export class BaseConverter<A,B> {
  private from: Map<A, bigint>;
  private fb: bigint;
  private tb: bigint;
  private idigits: number;
  private odigits: number;
  private passthru: boolean;

  constructor(from: TwoPlus<A>, private to: TwoPlus<B>, stream = true) {
    this.from = new Map(from.map((v, i) => [v, BigInt(i)]));
    this.fb = BigInt(from.length);
    this.tb = BigInt(to.length);
    this.passthru = this.fb === this.tb;
    [this.idigits, this.odigits] = stream ? 
      digit_ratio(from.length, to.length) : [Infinity, Infinity];
  }

  * convertLE(digits: Iterable<A>) {
    const { idigits, from: sym2val, to, fb } = this;
    if (this.passthru) yield * passthru(digits, sym2val, to);
    else if (isFinite(idigits)) {
      const { odigits, tb } = this;
      let [n, place_value, c, out] = [0n, 1n, 0, false];
      for (const d of digits) {
        if (out) {
          // Wait to output until the following
          // iteration because the last block
          // of digits needs special treatment.
          [place_value, out] = [1n, false];
          for (let p = 0; p < odigits; p++) {
            yield to[Number(n % tb)];
            n /= tb;
          }
        }
        const t = sym2val.get(d);
        if (t === void 0) throw new Error("Unrecognized digit");
        n += t * place_value;
        place_value *= fb;
        if (++c === idigits) [c, out] = [0, true];
      }
      // The highest-order digit must not be zero,
      // so only output final digits until n is zero.
      while (n > 0n) {
        yield to[Number(n % tb)];
        n /= tb;
      }
    } else {
      yield * BaseConverter.toLE(fromLE(digits, fb, sym2val), to);
    }
  }

  convertLE2BE(digits: Iterable<A>) {
    const { from: sym2val, to, tb } = this;
    if (this.passthru) return [...passthru(digits, sym2val, to)].reverse();

    let n = this.fromLE(digits);
    const arr: B[] = [];
    for (; n > 0n; n/= tb) arr.push(to[Number(n % tb)]);
    return arr.reverse();
  }

  convertBE(digits: Iterable<A>) {
    const { from: sym2val, to, tb } = this;
    if (this.passthru) return [...passthru(digits, sym2val, to)];

    let n = this.fromBE(digits);
    const arr: B[] = [];
    for (; n > 0n; n/= tb) arr.push(to[Number(n % tb)]);
    return arr.reverse();
  }

  * convertBE2LE(digits: Iterable<A>) {
    const { from: sym2val, to, tb } = this;
    if (this.passthru) {
      const arr = [...passthru(digits, sym2val, to)];
      for (let i = arr.length - 1; i >= 0; i--) yield arr[i];
    }

    let n = this.fromBE(digits);
    for (; n > 0n; n/= tb) yield to[Number(n % tb)];
  }

  fromLE(digits: Iterable<A>) {
    return fromLE(digits, this.fb, this.from);
  }

  static fromLE<T>(digits: Iterable<T>, from: TwoPlus<T>) {
    const b = BigInt(from.length);
    const sym2val = new Map(from.map((v, i) => [v, BigInt(i)]));
    return fromLE(digits, b, sym2val);
  }

  toLE(n: number | bigint) {
    return BaseConverter.toLE(n, this.to);
  }

  static * toLE<T>(n: number | bigint, to: TwoPlus<T>) {
    const b = to.length;
    if (typeof n === 'bigint') {
      const bb = BigInt(b);
      for (; n > 0n; n/= bb) yield to[Number(n % bb)];
    } else
      for (n = n | 0; n > 0; n = n / b | 0) yield to[n % b];
  }

  fromBE(digits: Iterable<A>) {
    return fromBE(digits, this.fb, this.from);
  }

  static fromBE<T>(digits: Iterable<T>, from: TwoPlus<T>) {
    const b = BigInt(from.length);
    const sym2val = new Map(from.map((v, i) => [v, BigInt(i)]));
    return fromBE(digits, b, sym2val);
  }

  toBE(n: number | bigint) {
    return BaseConverter.toBE(n, this.to);
  }

  static toBE<T>(n: number | bigint, to: TwoPlus<T>) {
    return [...BaseConverter.toLE(n, to)].reverse();
  }
}