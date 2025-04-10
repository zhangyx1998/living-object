/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { type TypeHandle } from '.';
import {
    concat,
    isValidVarName,
    serializeSymbol,
    serializeFunction,
    serializeObjectKey,
} from '../util';

const Generic = <TypeHandle<Object>>{
    match: (obj) => typeof obj === 'object' && obj !== null,
    traverse: (obj) => {
        const keys = [
            ...Object.keys(obj),
            ...Object.getOwnPropertySymbols(obj),
        ];
        return keys.map((k) => (obj as any)[k]);
    },
    serialize(self, { inline, defer }) {
        const code: string[] = [];
        for (const k of [
            ...Object.keys(self),
            ...Object.getOwnPropertySymbols(self),
        ]) {
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
            code.push([key, val].join(':'));
        }
        return `{${code.join(',')}}`;
    },
};

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
            return JSON.stringify(value) ?? 'undefined';
        },
    },
    Date: <TypeHandle<Date>>{
        match: (obj) => obj instanceof Date,
        serialize: (date) => `new Date(${date.getTime()})`,
    },
    RegExp: <TypeHandle<RegExp>>{
        match: (obj) => obj instanceof RegExp,
        serialize: (regex) => `new RegExp(${JSON.stringify(regex.source)})`,
    },
    Error: <TypeHandle<Error>>{
        match: (obj) => obj instanceof Error,
        traverse: (self) => [self.message, self.stack, ...Object.values(self)],
        serialize: (self, ctx) => {
            const { name, message, stack, ...attrs } = self;
            const assign = Generic.serialize({ message, stack, ...attrs }, ctx);
            return `Object.assign(new Error(${JSON.stringify(name)}),${assign})`;
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
        traverse: (self) => self.values(),
        serialize(self, { inline, defer }) {
            const result = self.map(
                (v, i) =>
                    inline(v) ??
                    defer(
                        ({ ref, inline }) => `${ref(self)}[${i}]=${inline(v)}`,
                    ),
            );
            return `[${result.join(',')}]`;
        },
    },
    Function: <TypeHandle<Function>>{
        match: (obj) => typeof obj === 'function',
        traverse: Generic.traverse!,
        serialize(fn, ctx) {
            const body = serializeFunction(fn);
            if (
                Object.keys(fn).length > 0 ||
                Object.getOwnPropertySymbols(fn).length > 0
            ) {
                const extras = Generic.serialize(fn, ctx);
                return `Object.assign(${body},${extras})`;
            } else if (fn.name.length > 0) {
                return body;
            } else {
                // Avoid name pollution
                return `(0,${body})`;
            }
        },
    },
    Object: Generic,
};
