import { test, session, assert } from './framework/runtime.js';
import { stringify } from 'living-object';

// Global symbol should work
const g = Symbol.for('test symbol (global)');
await test('symbol as root', () => g);
await test('symbol as key', () => ({ [g]: 'hello' }));

const p = Symbol('test symbol (private)');

await session('private symbol as value', () => {
    try {
        stringify(p);
        assert(false, 'should have thrown an error');
    } catch (e) {
        assert.passthrough(e);
        console.log('Error thrown as expected:', e);
    }
});

await session('private symbol as key', () => {
    try {
        stringify({ [p]: 'hello' });
        assert(false, 'should have thrown an error');
    } catch (e) {
        assert.passthrough(e);
        console.log('Error thrown as expected:', e);
    }
});
