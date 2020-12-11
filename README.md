# bigint-repr-converter
 Conversion between integers in arbitrary bases represented with arbitrary symbol sets.

 Unlike other base conversion packages, this module
 * Does not privilege decimal.
 * Does not dictate a particular symbol set.
 * Allows direct conversion between any two bases.
 * Natively handles modern JS BigInts.

This library exports the convenience type `TwoPlus<T>`, a wrapper for arrays of length >= 2, and a class `BaseConverter`.

## Static Methods
* `BaseConverter.toLE<T>(n: number | bigint, to: TwoPlus<T>): Generator<T>`
* `BaseConverter.toBE<T>(n: number | bigint, to: TwoPlus<T>): T[]`
* `BaseConverter.fromLE<T>(digits: Iterable<T>, from: TwoPlus<T>): bigint`
* `BaseConverter.fromBE<T>(digits: Iterable<T>, from: TwoPlus<T>): bigint`

The `to*` methods take a number or bigint and return a sequence of digits representing the integer part of the input in the given base.
The `from*` methods take a sequence of digits anc convert it back into a native number type. `BigInt`s are used here because there is no limit on the number of input digits to convert. The can be cast to regular JavaScript numbers if you know them to be sufficiently small.

The `*LE` methods return results in little-ending order (i.e., least-significant digit first), while the `*BE` methods return results in big-endian order (i.e., most-significant digit first). Note that lower-order digits can be extracted one at a time, while the same is not true for higher-order digits; thus, big-endian representations require processing the entire integer before any data can be returned. Little-endian functions will thus usually return generators, while big-endian functions will return pre-populated arrays.

In each case, the base to convert to or from is specified by an array of at least two elements whose keys are the digit values, and whose value are the symbols used to represent each digit. The radix is specified by the length of the array. Thus, to convert to and from base-2, for example, one would pass in an array of two elements, where the first element (index 0) contains the symbol to use for 0 and the second element contains the symbol to use for 1. Symbols can be of any type, but should be unique. This is not automatically checked, but you will get weird results if array elements are duplicated.

## Constructor
`new BaseConverter<A, B>(from: TwoPlus<A>, to: TwoPlus<B>, stream = true)`

Creates a new BaseConverter instance specialized for a particular pair of radices and conversion direction. As with the static methods, the bases to convert between are specified by arrays containing symbols to use for the digits of each base. After accounting for the cost of object construction, using the instance methods is usually more efficient than making calls to static methods, especially if you have a large number of conversions to do. The optional `stream` argument indicates whether or not the converter should attempt to optimize little-endian-to-little-endian conversions to minimize memory usage. Numbers in bases whose radices are powers of a common sub-base can be processed in blocks, without having to look at the entire number at once, and setting `stream` to `true` tells the converter to look for this opportunity. Setting it to `false` short-circuits this optimization, which saves some time during initialization if you know that you will not need it.

## Instance methods 
* `BaseConverter<A,B>.prototype.toLE(n: number | bigint): Generator<B>`
* `BaseConverter<A,B>.prototype.toBE(n: number | bigint): B[]`
* `BaseConverter<A,B>.prototype.fromLE(digits: Iterable<A>): bigint`
* `BaseConverter<A,B>.prototype.fromBE(digits: Iterable<A>): bigint`

These four methods behave exactly like their corresponding static methods, except they use the `from` and `to` base descriptions provided to the constructor, rather than requiring them to be passed to the method. This allows amortizing the cost of some pre-processing steps.

* `BaseConverter<A,B>.prototype.convertLE(digits: Iterable<A>): Generator<B>` Converts a little-endian digit sequence in base A to a little-endian digit sequence in base B.
* `BaseConverter<A,B>.prototype.convertLE2BE(digits: Iterable<A>): B[]` Converts a little-endian digit sequence in base A to a big-endian digit array in base B.
* `BaseConverter<A,B>.prototype.convertBE(digits: Iterable<A>): B[]` Converts a big-endian digit sequence in base A to a big-endian digit array in base B.
* `BaseConverter<A,B>.prototype.convertBE2LE(digits: Iterable<A>): Generator<B>` Converts a big-endian digit sequence in base A to a little-endian digit sequence in base B. Note that this internally requires consuming the entire input number before any output can be produced, even though output digits can then be extracted one at a time.