
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
      it(`should roundtrip ${ n } through base ${ radix } in big-endian representation`, () => {
        const m = c.fromBE(c.toBE(n));
        expect(m).to.eql(n);
      });
      
      it(`should roundtrip ${ n } through base ${ radix } in little-endian representation`, () => {
        const m = c.fromLE(c.toLE(n));
        expect(m).to.eql(n);
      });
    }
  });
}

for(let radix = 3; radix <= 120; radix += 3) {
  describe(`Converting to and from bijective base ${ radix-1 }`, () => {
    const symbols = Array.from({ length: radix }, (_, i) => i) as TwoPlus<number>;
    const c = new BaseConverter({ symbols, bijective: true }, { symbols, bijective: true });
    for (const n of integers) {
      it(`should roundtrip ${ n } through bijective base ${ radix-1 } in big-endian representation`, () => {
        const m = c.fromBE(c.toBE(n));
        expect(m).to.eql(n);
      });
      
      it(`should roundtrip ${ n } through bijective base ${ radix-1 } in little-endian representation`, () => {
        const m = c.fromLE(c.toLE(n));
        expect(m).to.eql(n);
      });
    }
  });
}

describe("Interbase Conversion tests", () => {
  for(let r1 = 2; r1 <= 12; ++r1) {
    const from = Array.from({ length: r1 }, (_, i) => i+1) as TwoPlus<number>;  
    for(let r2 = 2; r2 <= 12; ++r2) {
      const to = Array.from({ length: r2 }, (_, i) => i) as TwoPlus<number>;
      const c = new BaseConverter(from, to);

      describe(`Converting from base ${ r1 } to base ${ r2 }`, () => {
        for (const n of integers) {
          it(`should roundtrip ${ n } through bases ${ r1 } and ${ r2 } in big-endian representation`, () => {
            const source = BaseConverter.toBE(n, from);
            const target = BaseConverter.toBE(n, to);
            
            const test = c.convertBE(source);
            expect(test).to.eql(target);

            const m = BaseConverter.fromBE(test, to);
            expect(''+m).to.eql(''+n);
          });

          it(`should roundtrip ${ n } through bases ${ r1 } and ${ r2 } in little-endian representation`, () => {
            const source = BaseConverter.toLE(n, from);
            const target = [...BaseConverter.toLE(n, to)];
            
            const test = [...c.convertLE(source)];
            expect(test).to.eql(target);

            const m = BaseConverter.fromLE(test, to);
            expect(''+m).to.eql(''+n);
          });
        }
      });

      if (r1 > 2 && r2 > 2) {
        const cb1 = new BaseConverter(from, { symbols: to, bijective: true });
        describe(`Converting from base ${ r1 } to bijective base ${ r2 - 1 }`, () => {
          for (const n of integers) {
            it(`should roundtrip ${ n } through bases ${ r1 } and bijective ${ r2 - 1 } in big-endian representation`, () => {
              const source = BaseConverter.toBE(n, from, false);
              const target = BaseConverter.toBE(n, to, true);
              
              const test = cb1.convertBE(source);
              expect(test).to.eql(target);

              const m = BaseConverter.fromBE(test, to, true);
              expect(''+m).to.eql(''+n);
            });

            it(`should roundtrip ${ n } through bases ${ r1 } and bijective ${ r2 - 1 } in little-endian representation`, () => {
              const source = BaseConverter.toLE(n, from, false);
              const target = [...BaseConverter.toLE(n, to, true)];
              
              const test = [...cb1.convertLE(source)];
              expect(test).to.eql(target);

              const m = BaseConverter.fromLE(test, to, true);
              expect(''+m).to.eql(''+n);
            });
          }
        });

        
        const cb2 = new BaseConverter({ symbols: from, bijective: true }, to);
        describe(`Converting from bijective base ${ r1 - 1 } to base ${ r2 }`, () => {
          for (const n of integers) {
            it(`should roundtrip ${ n } through bases bijective ${ r1 - 1 } and ${ r2 } in big-endian representation`, () => {
              const source = BaseConverter.toBE(n, from, true);
              const target = BaseConverter.toBE(n, to, false);
              
              const test = cb2.convertBE(source);
              expect(test).to.eql(target);

              const m = BaseConverter.fromBE(test, to, false);
              expect(''+m).to.eql(''+n);
            });

            it(`should roundtrip ${ n } through bases bijective ${ r1 - 1 } and ${ r2 } in little-endian representation`, () => {
              const source = BaseConverter.toLE(n, from, true);
              const target = [...BaseConverter.toLE(n, to, false)];
              
              const test = [...cb2.convertLE(source)];
              expect(test).to.eql(target);

              const m = BaseConverter.fromLE(test, to, false);
              expect(''+m).to.eql(''+n);
            });
          }
        });
      }
    }
  }
});