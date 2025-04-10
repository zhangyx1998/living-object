/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { keywords } from './keywords';

export type PropertyKey = string | number | symbol;

export const inBrowser = typeof window !== 'undefined';

export function crash(...messages: string[]): never {
    const message = ['[living-objects]', 'Error:', ...messages].join(' ');
    const error = new Error(message);
    Error.captureStackTrace(error, crash);
    debugger;
    throw error;
}

export class NameGenerator {
    private letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    private counter = 0;
    private excludes: Set<string>;

    constructor(excludes: Iterable<string> = []) {
        this.excludes = new Set<string>([...keywords, ...excludes]);
    }

    next(): string {
        let next: string;
        do {
            const result: number[] = [];
            let n = this.counter;
            this.counter++;
            do {
                result.push(n % this.letters.length);
                n = Math.floor(n / this.letters.length);
            } while (n > 0);
            next = result
                .reverse()
                .map((c) => this.letters[c])
                .join('');
        } while (this.excludes.has(next));
        return next;
    }
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

export function isValidVarName(name: PropertyKey): name is string {
    if (typeof name !== 'string') return false;
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
}

export function isImmediateValue(value: any): boolean {
    if (typeof value === 'object' && value !== null) return false;
    if (typeof value === 'function') return false;
    return true;
}

function isConciseMethod(f: string, name: string) {
    if (name.length === 0 || name === 'function') return false;
    f = f.trimStart();
    if (!f.startsWith(name)) return false;
    f = f.slice(name.length).trimStart();
    return f.startsWith('(');
}

export function serializeFunction(target: Function) {
    const raw = target.toString();
    // Strip async prefix
    const prefix = raw.match(/^\s*async\s+/)?.[0] ?? '';
    const stripped = raw.slice(prefix.length);
    // Special case:
    // fn() {} (needs fix => function fn() {})
    // mutations:
    // fn \s* () \s* {}
    // Not to be confused with:
    // () => {}
    // function () {}
    // function function() {}
    if (isConciseMethod(stripped, target.name))
        return [prefix.trim(), 'function', stripped].join(' ');
    else return raw;
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
        return super.values().map((v) => v.value);
    }
}
