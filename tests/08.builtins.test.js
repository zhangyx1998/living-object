import { test, assert } from './framework/runtime.js';

// Inject items into globalThis for later use
const Injected = class Injected {};
globalThis.Injected = Injected;

await test('Well known classes', () => {
    return {
        Number,
        String,
        Boolean,
        Array,
        Object,
        Function,
        Date,
        RegExp,
        Error,
        EvalError,
        RangeError,
        ReferenceError,
        SyntaxError,
        TypeError,
        URIError,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Promise,
        Symbol,
        BigInt,
        JSON,
        Math,
        Reflect,
    };
});

await test('Injected class', () => {
    delete globalThis.Injected;
    return { Injected };
});
