/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

export type PropertyKey = string | number | symbol;

export const inBrowser = typeof window !== 'undefined';

export function crash(...messages: string[]): never {
    const message = ['[living-objects]', ...messages].join(' ');
    const error = new Error(message);
    Error.captureStackTrace(error, crash);
    throw error;
}

export function crashAt(scene: Function, ...messages: string[]): never {
    const message = ['[living-objects]', ...messages].join(' ');
    const error = new Error(message);
    Error.captureStackTrace(error, scene);
    throw error;
}

export function lazy<T>(fn: () => T): () => T {
    let value: T,
        initialized = false;
    return () => {
        if (!initialized) {
            value = fn();
            initialized = true;
        }
        return value;
    };
}

export function iter<T = any, R = any, N = any>(iterable: Iterable<T, R, N>) {
    return iterable[Symbol.iterator]();
}

export function concat<T = any>(
    ...iterators: Iterator<T>[]
): Iterable<T> & Iterator<T> {
    return <Iterable<T> & Iterator<T>>{
        [Symbol.iterator]() {
            return this as Iterator<T>;
        },
        next(): IteratorResult<T> {
            if (iterators.length === 0) return { done: true, value: undefined };
            const result = iterators[0].next();
            if (result.done) {
                iterators.shift();
                return this.next();
            } else {
                return result;
            }
        },
    };
}

/**
 * Factory function for min() and max() lookup
 */
export function lookup<T>(
    iterable: Iterable<T>,
    replace: (a: T, b: T) => boolean,
): T | undefined {
    let result: T | undefined,
        init: boolean = false;
    for (const item of iterable) {
        if (!init) {
            result = item;
            init = true;
        } else if (replace(result!, item)) {
            result = item;
        }
    }
    return result;
}

export function indexable(obj: any): obj is object {
    return (
        obj !== null && (typeof obj === 'object' || typeof obj === 'function')
    );
}

export function isValidVarName(name: PropertyKey): name is string {
    if (typeof name !== 'string') return false;
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
}

export function serializeSymbol(target: symbol) {
    const name = Symbol.keyFor(target);
    if (name === undefined) throw new Error('Cannot serialize private Symbol');
    return 'Symbol.for(' + JSON.stringify(name) + ')';
}

export function serializeObjectKey(key: string | number | symbol) {
    if (typeof key === 'string') {
        return isValidVarName(key) ? key.toString() : JSON.stringify(key);
    } else if (typeof key === 'number') {
        return key.toString();
    } else if (typeof key === 'symbol') {
        return `[${serializeSymbol(key)}]`;
    } else {
        throw new Error(`Cannot serialize object key ${key}`);
    }
}

export class Locals extends Map<string, { value: any; writable: boolean }> {
    constructor(context?: object, reserved?: Set<string>) {
        super();
        if (context === undefined) {
            return;
        }
        for (const [key, desc] of Object.entries(
            Object.getOwnPropertyDescriptors(context),
        )) {
            if (!isValidVarName(key)) continue;
            if (reserved?.has(key)) {
                console.warn(
                    `Local variable ${key} dropped due to name conflict`,
                );
                continue;
            }
            this.set(key, {
                value: (context as any)[key],
                writable: desc.writable ?? false,
            });
        }
    }
    values() {
        // TODO: Use polyfilled iterator helpers
        // return super.values().map((v) => v.value);
        return Array.from(super.values())
            .map((v) => v.value)
            [Symbol.iterator]();
    }
}

export function configure(object: object, prop: string, value: any) {
    const desc = Object.getOwnPropertyDescriptor(object, prop) ?? {
        value: undefined,
        writable: true,
        configurable: true,
        enumerable: true,
    };
    if (!Reflect.has(desc, 'value')) return false;
    if (desc.writable) {
        return Reflect.set(object, prop, value);
    } else if (desc.configurable) {
        desc.value = value;
        return Object.defineProperty(object, prop, desc);
    } else return false;
}

/**
 * Describe the target in human-readable format.
 */
export function describe(target: any): string {
    if (target instanceof Function && target.name) return target.name;
    else if (target instanceof Object && target[Symbol.toStringTag])
        return target[Symbol.toStringTag];
    else if (target instanceof Object && target?.constructor?.name)
        return target?.constructor?.name;
    else return typeof target;
}
