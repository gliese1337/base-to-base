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
    const { from: sym2val, to } = this;
    if (this.passthru) {
      for (const d of digits) {
        const t = sym2val.get(d);
        if (t === void 0) throw new Error("Unrecognized digit");
        yield to[Number(t)];
      }
    } else {
      yield * this.toIterable(this.fromIterable(digits));
    }
  }

  convertBE(digits: A[]) {
    const { from: sym2val, to } = this;
    if (this.passthru) {
      return digits.map(d => {
        const t = sym2val.get(d);
        if (t === void 0) throw new Error("Unrecognized digit");
        return to[Number(t)];
      })
    }

    return this.toArray(this.fromArray(digits));
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