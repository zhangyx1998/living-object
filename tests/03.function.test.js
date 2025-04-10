import { test } from './framework/runtime.js';

await test('Concise functions', () => ({
    foo() {
        return 'hello from foo (concise function)';
    },
    async bar() {
        return 'hello from bar (concise function)';
    },
}));

await test('Unnamed functions', () => ({
    foo: function () {
        return 'hello from foo (unnamed function)';
    },
    bar: async function () {
        return 'hello from bar (unnamed function)';
    },
}));

await test('Named functions', () => ({
    foo: function foo() {
        return 'hello from foo (named function)';
    },
    bar: async function bar() {
        return 'hello from bar (named function)';
    },
}));

await test('Arrow functions', () => ({
    foo: () => 'hello from foo (arrow function)',
    bar: async () => 'hello from bar (arrow function)',
}));

await test('Concise function with weird names', () => ({
    function() {
        return 'hello from foo (concise function)';
    },
    async() {
        return 'hello from async (concise function)';
    },
}));

await test('Function with attributes', () => {
    function fn() {
        return 'hello from fn (function with attributes)';
    }
    fn.a = 1;
    fn.b = true;
    fn.c = 'hello';
    fn.d = Symbol.for('test');
    fn.e = undefined;
    fn.f = null;
    fn.g = BigInt(1234567890123456789012345678901234567890);
    fn.h = [1, 2, 3];
    fn.i = { a: 1, b: 2, c: 3 };
    fn.j = () => 'hello from fn (arrow function)';
    fn.k = async () => 'hello from fn (async arrow function)';
    fn.l = function () {
        return 'hello from fn (function with no name)';
    };
    fn.m = async function () {
        return 'hello from fn (async function with no name)';
    };
    fn.loop = fn;
    return fn;
});
