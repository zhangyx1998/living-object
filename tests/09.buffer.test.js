import { test } from './framework/runtime.js';

function gen(type, size, cvt = (_) => _) {
    const radix = 2 ** (8 * type.BYTES_PER_ELEMENT);
    return new type(
        Array.from({ length: size }, () => cvt(Math.random() * radix)),
    );
}

await test('ArrayBuffer', () => ({
    array_buffer: gen(Uint8Array, 100).buffer,
}));

await test('TypedArray', () => ({
    u8: gen(Uint8Array, 100),
    u16: gen(Uint16Array, 100),
    u32: gen(Uint32Array, 100),
    i8: gen(Int8Array, 100),
    i16: gen(Int16Array, 100),
    i32: gen(Int32Array, 100),
    f32: gen(Float32Array, 100),
    f64: gen(Float64Array, 100),
    bigInt64: gen(BigInt64Array, 100, BigInt),
    bigUint64: gen(BigUint64Array, 100, BigInt),
}));

await test('DataView', () => ({
    data_view: new DataView(gen(Uint8Array, 100).buffer),
}));
