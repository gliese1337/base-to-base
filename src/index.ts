export type TwoPlus<T> = [T, T, ...T[]];

function fromLE<T>(digits: Iterable<T>, radix: bigint, sym2val: Map<T, bigint>, bijective: boolean) {
  let [v, m] = [0n, 1n];
  if (bijective) {
    radix--;
    for (const d of digits) {
      const t = sym2val.get(d);
      if (t === void 0) throw new Error("Unrecognized digit");
      if (t === 0n) continue;
      v += t * m;
      m *= radix;
    }
  } else for (const d of digits) {
    const t = sym2val.get(d);
    if (t === void 0) throw new Error("Unrecognized digit");
    v += t * m;
    m *= radix;
  }

  return v;
}

function fromBE<T>(digits: Iterable<T>, radix: bigint, sym2val: Map<T, bigint>, bijective: boolean) {
  let v = 0n;
  if (bijective) {
    radix--;
    for (const d of digits) {
      const t = sym2val.get(d);
      if (t === void 0) throw new Error("Unrecognized digit");
      if (t === 0n) continue;
      v = v * radix + t;
    }
  } else for (const d of digits) {
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
  while (f) [f, g] = [g - f * Math.floor(g/f), f];

  // return x == the factor by which
  // to multiply w so as to reach its
  // least common multiple with z.
  return n < m ? [z/g, w/g] : [w/g, z/g];
}

export type Base<T> = TwoPlus<T> | { bijective: boolean; symbols: TwoPlus<T> };

export class BaseConverter<A,B> {
  private from: Map<A, bigint>;
  private to: TwoPlus<B>;
  private fb: bigint;
  private tb: bigint;
  private fbijective: boolean;
  private tbijective: boolean;
  private idigits: number;
  private odigits: number;
  private passthru: boolean;

  constructor(from: Base<A>, to: Base<B>, stream = true) {
    const { fbijective, fsymbols, fradix } = Array.isArray(from) ? 
      { fbijective: false, fsymbols: from, fradix: from.length } :
      {
        fbijective: from.bijective,
        fsymbols: from.symbols,
        fradix: from.symbols.length,
      };
    const { tbijective, tsymbols, tradix } = Array.isArray(to) ? 
      { tbijective: false, tsymbols: to, tradix: to.length } :
      {
        tbijective: to.bijective,
        tsymbols: to.symbols,
        tradix: to.symbols.length,
      };

    this.from = new Map(fsymbols.map((v, i) => [v, BigInt(i)]));
    this.to = tsymbols;
    this.fb = BigInt(fradix);
    this.tb = BigInt(tradix);
    this.fbijective = fbijective;
    this.tbijective = tbijective;
    this.passthru = fradix === tradix && fbijective === tbijective;
    [this.idigits, this.odigits] = stream && !(fbijective || tbijective) ? 
      digit_ratio(fradix, tradix) : [Infinity, Infinity];
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
      yield * BaseConverter.toLE(
        fromLE(digits, fb, sym2val, this.fbijective),
        to, this.tbijective,
      );
    }
  }

  convertLE2BE(digits: Iterable<A>) {
    const { from: sym2val, to} = this;
    return this.passthru ?
      [...passthru(digits, sym2val, to)].reverse() :
      this.toBE(this.fromLE(digits));
  }

  convertBE(digits: Iterable<A>) {
    const { from: sym2val, to} = this;
    return this.passthru ?
      [...passthru(digits, sym2val, to)] :
      this.toBE(this.fromBE(digits));
  }

  * convertBE2LE(digits: Iterable<A>) {
    const { from: sym2val, to } = this;
    if (this.passthru) {
      const arr = [...passthru(digits, sym2val, to)];
      for (let i = arr.length - 1; i >= 0; i--) yield arr[i];
    }

    return this.toLE(this.fromBE(digits));
  }

  fromLE(digits: Iterable<A>) {
    return fromLE(digits, this.fb, this.from, this.fbijective);
  }

  static fromLE<T>(digits: Iterable<T>, from: TwoPlus<T>, bijective = false) {
    const b = BigInt(from.length);
    const sym2val = new Map(from.map((v, i) => [v, BigInt(i)]));
    return fromLE(digits, b, sym2val, bijective);
  }

  toLE(n: number | bigint) {
    return BaseConverter.toLE(n, this.to, this.tbijective);
  }

  static * toLE<T>(n: number | bigint, to: TwoPlus<T>, bijective = false) {
    const b = to.length;
    if (bijective) {
      if (n === 0 || n === 0n) yield to[0];
      else if (typeof n === 'bigint') {
        const k = BigInt(b - 1);
        while (n !== 0n) {
          const qp: bigint =
            n % k === 0n ? n / k - 1n : n / k;
          yield to[Number(n - qp * k)];
          n = qp;
        }
      } else {
        const k = b - 1;
        while (n !== k) {
          const qp: number = Math.ceil(n / k) - 1;
          yield to[n - qp * k];
          n = qp;
        }
      }
    } else {
      if (typeof n === 'bigint') {
        const bb = BigInt(b);
        for (; n > 0n; n/= bb) yield to[Number(n % bb)];
      } else
        for (n = n | 0; n > 0; n = n / b | 0) yield to[n % b];
    }
  }

  fromBE(digits: Iterable<A>) {
    return fromBE(digits, this.fb, this.from, this.fbijective);
  }

  static fromBE<T>(digits: Iterable<T>, from: TwoPlus<T>, bijective = false) {
    const b = BigInt(from.length);
    const sym2val = new Map(from.map((v, i) => [v, BigInt(i)]));
    return fromBE(digits, b, sym2val, bijective);
  }

  toBE(n: number | bigint) {
    return BaseConverter.toBE(n, this.to, this.tbijective);
  }

  static toBE<T>(n: number | bigint, to: TwoPlus<T>, bijective = false) {
    return [...BaseConverter.toLE(n, to, bijective)].reverse();
  }
}