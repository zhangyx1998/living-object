/* ---------------------------------------------------------
 * Copyright (c) 2023 Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import {
    NameGenerator,
    inline,
    isImmediateValue,
    crash,
    serializeFunction,
    serializeObjectKey,
    isValidAttributeName,
    inBrowser,
} from "./util";

type PropertyKey = string | number | symbol;

function keys(obj: object): PropertyKey[] {
    const keys: PropertyKey[] = Object.keys(obj);
    return keys.concat(Object.getOwnPropertySymbols(obj));
}

function values(obj: object): any[] {
    if (obj instanceof Map) return [...obj.keys(), ...obj.values()];
    if (obj instanceof Set) return [...obj.values()];
    return keys(obj).map((k) => (obj as any)[k]);
}

function entries(obj: object): [PropertyKey, any][] {
    return keys(obj).map((k) => [k, (obj as any)[k]]);
}

export default class CompileResult {
    constructor(
        private root: string,
        public readonly decl: string[],
        public readonly stmt: string[]
    ) {}

    toString() {
        const code = ['"use strict"'];
        if (this.decl.length > 0) code.push("const\n" + this.decl.join(",\n"));
        code.push(...this.stmt);
        return code.join(";\n");
    }

    toModule() {
        const statement = `export default ${this.root};`;
        return [this.toString(), statement].join(";\n");
    }

    toFunctionBody() {
        const statement = `return ${this.root};`;
        return [this.toString(), statement].join(";\n");
    }
}

export class LivingObject {
    private keyGen = new NameGenerator();
    private store = new Map<any, string>();
    private rootKey: string;

    constructor(private root: object) {
        this.rootKey =
            this.register(this.root) ??
            inline(this.root) ??
            crash(`Cannot deflate object ${this.root}`);
    }

    private register(
        target: object,
        preferredKey?: string
    ): string | undefined {
        if (isImmediateValue(target)) return;
        if (this.store.has(target)) return this.store.get(target)!;
        // Register new unique object
        const key = preferredKey ?? this.keyGen.next();
        this.store.set(target, key);
        // Traverse the interior of new object
        values(target).forEach((t) => this.register(t));
        return key;
    }

    compile(): CompileResult {
        const { store } = this;
        let root = this.rootKey;

        // Objects already declared in code context
        const context = new Map<any, string>();

        // Statements deferred after instantiation of given object
        const pending = new Map<any, ((key: string) => string)[]>();

        function getQueueOf(obj: any) {
            if (!pending.has(obj)) {
                pending.set(obj, []);
            }
            return pending.get(obj)!;
        }

        function defer(obj: any, target: string, key: string | number) {
            const accessor = isValidAttributeName(key)
                ? `${target}.${key.toString()}`
                : `${target}[${JSON.stringify(key)}]`;
            const callback = (value: string) => `${accessor} = ${value}`;
            getQueueOf(obj).push(callback);
        }

        function compile(obj: any, key: string): string {
            if (obj instanceof Date) return `new Date(${obj.getTime()})`;
            if (obj instanceof RegExp) return `new RegExp(${obj.toString()})`;
            if (obj instanceof Function) {
                const fn = serializeFunction(obj);
                const extras = entries(obj);
                if (extras.length > 0) {
                    const extra = compile(Object.fromEntries(extras), key);
                    return `Object.assign(${fn}, ${extra})`;
                } else {
                    return fn;
                }
            }
            if (obj instanceof Map) {
                function mapSet([k, v]: any[]) {
                    return `.set(${
                        inline(k, store) ??
                        crash(`Map key ${k} cannot be resolved`)
                    }, ${
                        inline(v, store) ??
                        crash(`Map val ${v} cannot be resolved`)
                    })`;
                }
                if (obj.size > 0)
                    getQueueOf(obj).push((key) =>
                        [key, ...obj.entries().map(mapSet)].join("")
                    );
                return "new Map";
            }
            if (obj instanceof Set) {
                function setAdd(v: any) {
                    return `.add(${
                        inline(v, store) ??
                        crash(`Set item ${v} cannot be resolved`)
                    })`;
                }
                if (obj.size > 0)
                    getQueueOf(obj).push((key) =>
                        [key, ...obj.values().map(setAdd)].join("")
                    );
                return "new Set";
            }
            if (Array.isArray(obj)) {
                return `[${obj
                    .map((el, i) => inline(el, context) ?? defer(el, key, i))
                    .join(",")}]`;
            }
            if (obj && typeof obj === "object") {
                const rewrite = ([k, v]: any[]) => [
                    serializeObjectKey(k),
                    inline(v, context) ?? defer(v, key, k),
                ];
                const content = entries(obj)
                    .map(rewrite)
                    .filter(([_, v]) => v !== undefined)
                    .map(([k, v]) => `${k}: ${v}`);
                return content.length > 0
                    ? `{\n\t${content.join(",\n\t")}\n}`
                    : "{}";
            }
            throw new Error(`Cannot deflate object ${obj}`);
        }

        const stmt: string[] = [];
        const decl = Array.from(this.store.entries())
            .reverse()
            .map(([object, key], index, array) => {
                const expression = compile(object, key);
                context.set(object, key);
                let expandRoot = key === root && index === array.length - 1;
                if (pending.has(object)) {
                    stmt.push(...pending.get(object)!.map((f) => f(key)));
                    pending.delete(object);
                    expandRoot = false;
                }
                if (!expandRoot) {
                    return `${key} = ${expression}`;
                } else {
                    root = expression;
                    return;
                }
            })
            .filter((s) => s !== undefined);
        return new CompileResult(root, decl as string[], stmt);
    }

    /**
     * @param target Use "function" to get a function body, "module" to get a module.
     * In most cases, "function" should be used.
     * Use "module" when you intend to directly write the result to a js file.
     */
    static stringify(input: any, target: "module" | "function" = "function") {
        const result = new LivingObject(input).compile();
        if (target === "module") {
            return result.toModule();
        } else if (target === "function") {
            return result.toFunctionBody();
        } else {
            return result.toString();
        }
    }

    static parse(input: string, context: object, isolated: false): any;
    static parse(input: string, context: object, isolated: true): Promise<any>;

    /**
     * Note that the context appears to be read-only when:
     * 1. `isolated == false`
     * 2. or Running in browser.
     * ONLY in Node VM mode (isolated: true), root attributes can be written back.
     */
    static parse(
        input: string,
        context: object = {},
        isolated: boolean = false
    ) {
        if (isolated && !inBrowser)
            return LivingObject.evalInNodeVM(input, context);
        const keys = Object.keys(context).filter(isValidAttributeName);
        const vals = keys.map((key) => (context as any)[key]);
        const fn = new Function(...keys, input);
        if (!isolated) {
            return fn(...vals);
        } else if (inBrowser) {
            return LivingObject.evalInBrowser(fn, vals);
        }
    }

    private static async evalInBrowser(fn: Function, vals: any[]) {
        const code = "export default " + fn.toString();
        const blob = new Blob([code], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        const module = await import(url);
        URL.revokeObjectURL(url);
        return module.default(...vals);
    }

    private static async evalInNodeVM(input: string, context: object) {
        const code = `(() => {\n${input}\n})()`;
        const vm = await import("node:vm");
        const ctx = vm.createContext(context);
        const script = new vm.Script(code);
        return await script.runInContext(ctx);
    }
}

export const stringify = LivingObject.stringify;
export const parse = LivingObject.parse;
