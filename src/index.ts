export type TwoPlus<T> = [T, T, ...T[]];

function fromIterable<T>(digits: Iterable<T>, radix: bigint, sym2val: Map<T, bigint>) {
  let [v, m] = [0n, 1n];
  for (const d of digits) {
    const t = sym2val.get(d);
    if (t === void 0) throw new Error("Unrecognized digit");
    v += t * m;
    m *= radix;
  }

  return v;
}

function fromArray<T>(digits: T[], radix: bigint, sym2val: Map<T, bigint>) {
  let [v, m] = [0n, 1n];
  for (let i = digits.length - 1; i >= 0; i--) {
    const t = sym2val.get(digits[i]);
    if (t === void 0) throw new Error("Unrecognized digit");
    v += t * m;
    m *= radix;
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
      let n = this.fromIterable(digits);
      for (; n > 0n; n/= tb) yield to[Number(n % tb)];
    }
  }

  convertBE(digits: A[]) {
    const { from: sym2val, to, tb } = this;
    if (this.passthru) return [...passthru(digits, sym2val, to)];

    let n = this.fromArray(digits);
    const arr: B[] = [];
    for (; n > 0n; n/= tb) arr.push(to[Number(n % tb)]);
    return arr.reverse();
  }

  fromIterable(digits: Iterable<A>) {
    return fromIterable(digits, this.fb, this.from);
  }

  static fromIterable<T>(digits: Iterable<T>, from: TwoPlus<T>) {
    const b = BigInt(from.length);
    const sym2val = new Map(from.map((v, i) => [v, BigInt(i)]));
    return fromIterable(digits, b, sym2val);
  }

  toIterable(n: number | bigint) {
    return BaseConverter.toIterable(n, this.to);
  }

  static * toIterable<T>(n: number | bigint, to: TwoPlus<T>) {
    const b = to.length;
    if (typeof n === 'bigint') {
      const bb = BigInt(b);
      for (; n > 0n; n/= bb) yield to[Number(n % bb)];
    } else
      for (; n > 0; n = n / b | 0) yield to[n % b];
  }

  fromArray(digits: A[]) {
    return fromArray(digits, this.fb, this.from);
  }

  static fromArray<T>(digits: T[], from: TwoPlus<T>) {
    const b = BigInt(from.length);
    const sym2val = new Map(from.map((v, i) => [v, BigInt(i)]));
    return fromArray(digits, b, sym2val);
  }

  toArray(n: number | bigint) {
    return BaseConverter.toArray(n, this.to);
  }

  static toArray<T>(n: number | bigint, to: TwoPlus<T>) {
    return [...BaseConverter.toIterable(n, to)].reverse();
  }
}