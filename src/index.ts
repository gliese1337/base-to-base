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

export class BaseConverter<A,B> {
  private from: Map<A, bigint>;
  private fb: bigint;
  private tb: bigint;
  private passthru: boolean;

  constructor(from: TwoPlus<A>, private to: TwoPlus<B>) {
    this.from = new Map(from.map((v, i) => [v, BigInt(i)]));
    this.fb = BigInt(from.length);
    this.tb = BigInt(to.length);
    this.passthru = this.fb === this.tb;
  }

  * convertLE(digits: Iterable<A>) {
    const { from: sym2val, to, tb } = this;
    if (this.passthru) yield * passthru(digits, sym2val, to);
    else {
      let n = this.fromLE(digits);
      for (; n > 0n; n/= tb) yield to[Number(n % tb)];
    }
  }

  convertLE2BE(digits: Iterable<A>) {
    const { from: sym2val, to, tb } = this;
    if (this.passthru) {
      return [...passthru(digits, sym2val, to)].reverse();
    } else {
      let n = this.fromLE(digits);
      const arr: B[] = [];
      for (; n > 0n; n/= tb) arr.push(to[Number(n % tb)]);
      return arr.reverse();
    }
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
      for (; n > 0; n = n / b | 0) yield to[n % b];
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