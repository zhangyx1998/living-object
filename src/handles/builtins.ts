/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { SerializeContext, type TypeHandle } from '.';
import {
    concat,
    isValidVarName,
    serializeSymbol,
    serializeObjectKey,
} from '../util';
import serializeFunction from './function';
import globals from '../globals';

function keys(obj: any): PropertyKey[] {
    return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)];
}

function values(obj: any): any[] {
    return keys(obj).map((k) => (obj as any)[k]);
}

function serializeObject(
    self: any,
    { inline, defer }: SerializeContext,
    subset?: Iterable<PropertyKey>,
) {
    const code: string[] = [];
    for (const k of subset ?? keys(self)) {
        const v = (self as any)[k];
        const key = serializeObjectKey(k);
        const val =
            inline(v) ??
            // When a property cannot be inlined, defer it as an assignment statement
            defer(({ ref, inline }) => {
                const s = ref(self),
                    expr = inline(v);
                if (isValidVarName(k)) {
                    return `${s}.${k}=${expr}`;
                } else {
                    return `${s}[${inline(k)}]=${expr}`;
                }
            });
        if (k === key && k === val) code.push(k);
        else code.push([key, val].join(':'));
    }
    return `{${code.join(',')}}`;
}

type Primitive = string | number | boolean | undefined | symbol | bigint | null;

export default {
    Primitive: <TypeHandle<Primitive>>{
        match: (obj) =>
            typeof obj === 'string' ||
            typeof obj === 'number' ||
            typeof obj === 'boolean' ||
            typeof obj === 'undefined' ||
            typeof obj === 'symbol' ||
            typeof obj === 'bigint' ||
            obj === null,
        serialize: (value) => {
            if (typeof value === 'symbol') return serializeSymbol(value);
            if (typeof value === 'bigint') return value.toString() + 'n';
            // NaN, +Infinity, -Infinity
            if (typeof value === 'number') return value.toString();
            return JSON.stringify(value) ?? 'undefined';
        },
    },
    // Well-known global objects - they should also treated as primitives
    Global: <TypeHandle<any>>{
        match: (obj) => globals().has(obj),
        serialize: (value) => globals().get(value)!,
    },
    Date: <TypeHandle<Date>>{
        match: (obj) => obj instanceof Date,
        serialize: (date) => `new Date(${date.getTime()})`,
    },
    RegExp: <TypeHandle<RegExp>>{
        match: (obj) => obj instanceof RegExp,
        serialize: (regex) => regex.toString(),
    },
    Error: <TypeHandle<Error>>{
        match: (obj) => obj instanceof Error,
        traverse: (self) => [self.message, self.stack, ...Object.values(self)],
        serialize: (self, ctx) => {
            const data = serializeObject(self, ctx);
            return `Object.assign(new Error,${data})`;
        },
    },
    Map: <TypeHandle<Map<any, any>>>{
        match: (obj) => obj instanceof Map,
        traverse: (map) => concat(map.keys(), map.values()),
        serialize(self, { ref, inline, defer }) {
            const inlined: string[] = [];
            const deferred: [any, any][] = [];
            for (const [k, v] of self.entries()) {
                if (deferred.length > 0) deferred.push(v);
                const key = inline(k);
                if (key === undefined) {
                    deferred.push([k, v]);
                    continue;
                }
                const value = inline(v);
                if (value === undefined) {
                    deferred.push([k, v]);
                    continue;
                }
                inlined.push(`[${key},${value}]`);
            }
            if (deferred.length > 0) {
                defer(({ inline }) =>
                    [
                        ref(self),
                        ...deferred.map(
                            ([k, v]) => `.set(${inline(k)}, ${inline(v)})`,
                        ),
                    ].join(''),
                );
            }
            if (inlined.length > 0) {
                return `new Map([${inlined.join(',')}])`;
            } else {
                return `new Map`;
            }
        },
    },
    Set: <TypeHandle<Set<any>>>{
        match: (obj) => obj instanceof Set,
        traverse: (self) => [...self.values()],
        serialize(self, { ref, inline, defer }) {
            const inlined: string[] = [];
            const deferred: any[] = [];
            for (const v of self.values()) {
                if (deferred.length > 0) deferred.push(v);
                const expr = inline(v);
                expr !== undefined ? inlined.push(expr) : deferred.push(v);
            }
            if (deferred.length > 0) {
                defer(({ inline }) =>
                    [
                        ref(self),
                        ...deferred.map((v) => `.add(${inline(v)})`),
                    ].join(''),
                );
            }
            if (inlined.length > 0) {
                return `new Set([${inlined.join(',')}])`;
            } else {
                return `new Set`;
            }
        },
    },
    Array: <TypeHandle<Array<any>>>{
        match: (obj) => Array.isArray(obj),
        traverse: values,
        serialize(self, ctx) {
            const { inline, defer } = ctx;
            const allKeys = new Set(keys(self));
            // Determine if length needs to be explicitly set
            if (self.length > 0 && !allKeys.has((self.length - 1).toString()))
                allKeys.add('length');
            // Dense elements in an array that can be directly put into []
            const denseItems: string[] = [];
            // Assume the array is dense
            for (const i of self.keys()) {
                if (!allKeys.delete(i.toString())) break;
                const v = (self as any)[i];
                denseItems.push(
                    inline(v) ??
                        defer(
                            ({ ref, inline }) =>
                                `${ref(self)}[${i}]=${inline(v)}`,
                        ),
                );
            }
            // Collect all dense elements into an array expression
            const denseExpr = `[${denseItems.join(',')}]`;
            // If there are any sparse elements, assign them to the array
            if (allKeys.size > 0) {
                const sparseExpr = serializeObject(self, ctx, allKeys);
                return `Object.assign(${denseExpr},${sparseExpr})`;
            } else {
                return denseExpr;
            }
        },
    },
    Function: <TypeHandle<Function>>{
        match: (obj) => typeof obj === 'function',
        traverse: values,
        serialize(fn, ctx) {
            const body = serializeFunction(fn);
            if (keys(fn).length > 0) {
                const extras = serializeObject(fn, ctx);
                return `Object.assign(${body},${extras})`;
            } else if (fn.name.length > 0) {
                return body;
            } else {
                // Avoid name pollution from assignment expressions.
                // e.g. `const a = function () {}; a.name` => "a" (bad)
                return `(0,${body})`;
            }
        },
    },
    Object: <TypeHandle<Object>>{
        match: (obj) => typeof obj === 'object' && obj !== null,
        traverse: values,
        serialize: serializeObject,
    },
};
