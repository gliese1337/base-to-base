
import 'mocha';
import { expect } from 'chai';
import { BaseConverter, TwoPlus } from '../src';

const integers = Array.from({ length: 11 }, (_, i) => {
  let n = BigInt(1 + (Math.random() * 9)|0);
  i *= 2;
  while(i-- > 0) {
    n = n * 10n + BigInt((Math.random() * 10)|0);
  }
  return n;
});

for(let radix = 2; radix <= 120; radix += 3) {
  describe(`Converting to and from base ${ radix }`, () => {
    const symbols = Array.from({ length: radix }, (_, i) => i) as TwoPlus<number>;
    const c = new BaseConverter(symbols, symbols);
    for (const n of integers) {
      it(`should roundtrip ${ n } through base ${ radix } using array`, () => {
        const m = c.fromArray(c.toArray(n));
        expect(m).to.eql(n);
      });
      
      it(`should roundtrip ${ n } through base ${ radix } using iterable`, () => {
        const m = c.fromIterable(c.toIterable(n));
        expect(m).to.eql(n);
      });
    }
  });
}

describe("Interbase Conversion tests", () => {
  for(let r1 = 2; r1 <= 12; ++r1) {
    const from = Array.from({ length: r1 }, (_, i) => i) as TwoPlus<number>;  
    for(let r2 = 2; r2 <= 12; ++r2) {
      const to = Array.from({ length: r2 }, (_, i) => i+1) as TwoPlus<number>;

      describe(`Converting from base ${ r1 } to base ${ r2 }`, () => {
        const c = new BaseConverter(from, to);
        for (const n of integers) {
          it(`should roundtrip ${ n } through bases ${ r1 } and ${ r2 } in little-endian representation`, () => {
            const m = BaseConverter.fromIterable(
              c.convertLE(BaseConverter.toIterable(n, from)),
              to,
            );
            expect(''+m).to.eql(''+n);
          });

          it(`should roundtrip ${ n } through bases ${ r1 } and ${ r2 } in big-endian representation`, () => {
            const m = BaseConverter.fromArray(
              c.convertBE(BaseConverter.toArray(n, from)),
              to,
            );
            expect(''+m).to.eql(''+n);
          });
        }
      });
    }
  }
});