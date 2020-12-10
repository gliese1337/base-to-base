export type TwoPlus<T> = [T, T, ...T[]];

export class BaseConverter<A,B> {
  private from: Map<A, bigint>;
  private fb: bigint;
  private tb: bigint;

  constructor(from: TwoPlus<A>, private to: TwoPlus<B>) {
    this.from = new Map(from.map((v, i) => [v, BigInt(i)]));
    this.fb = BigInt(from.length);
    this.tb = BigInt(to.length);
  }

  * convertLE(digits: Iterable<A>) {
    const { from: sym2val, to, fb, tb } = this;
    let [v, m] = [0n, 1n];
    for (const d of digits) {
      const t = sym2val.get(d);
      if (t === void 0) throw new Error("Unrecognized digit");
      v += t * m;
      while (v >= tb) {
        yield to[Number(v % tb)];
        v /= tb;
        m /= tb;
      }
      m *= fb;
    }
  }

  convertBE(digits: A[]) {
    const { from: sym2val, to, fb, tb } = this;
    const arr: B[] = [];
    let [v, m] = [0n, 1n];
    for (let i = digits.length - 1; i >= 0; i--) {
      const t = sym2val.get(digits[i]);
      if (t === void 0) throw new Error("Unrecognized digit");
      v += t * m;
      if (v >= tb) {
        arr.push(to[Number(v % tb)]);
        v /= tb;
        m /= tb;
      }
      m *= fb;
    }

    return arr.reverse();
  }

  static fromIterator<T>(digits: Iterable<T>, from: TwoPlus<T>) {
    const b = BigInt(from.length);
    const sym2val = new Map(from.map((v, i) => [v, BigInt(i)]));

    let [v, m] = [0n, 1n];
    for (const d of digits) {
      const t = sym2val.get(d);
      if (t === void 0) throw new Error("Unrecognized digit");
      v += t * m;
      m *= b;
    }

    return v;
  }

  static * toIterator<T>(n: number | bigint, to: TwoPlus<T>) {
    const b = to.length;
    if (typeof n === 'bigint') {
      const bb = BigInt(b);
      while (n > 0n) {
        const d = n % bb;
        yield to[Number(d)];
        n /= bb;
      }
    } else while (n > 0) {
      // Once it's supported, use Math.idivmod(x, y)
      const d = n % b;
      yield to[d];
      n = n / b | 0;
    }
  }

  static fromArray<T>(digits: T[], from: TwoPlus<T>) {
    const b = BigInt(from.length);
    const sym2val = new Map(from.map((v, i) => [v, BigInt(i)]));

    let [v, m] = [0n, 1n];
    for (let i = digits.length - 1; i >= 0; i--) {
      const t = sym2val.get(digits[i]);
      if (t === void 0) throw new Error("Unrecognized digit");
      v += t * m;
      m *= b;
    }

    return v;   
  }

  static toArray<T>(n: number | bigint, to: TwoPlus<T>) {
    return [...BaseConverter.toIterator(n, to)].reverse();
  }
}