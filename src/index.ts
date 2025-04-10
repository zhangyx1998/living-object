/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import { FormatOptions } from "./shared";
import Graph from "./graph";
import {
    type TypeHandle,
    type TypeHandles,
    builtinTypeHandles,
} from "./handles";
import Code from "./code";
import { crash, lookup, inBrowser, isValidVarName, Locals } from "./util";
import closure from "./closure";

export default class LivingObject {
    private handles: TypeHandles = builtinTypeHandles;

    constructor(private root: object) {}

    public register(...handles: TypeHandle[]) {
        this.handles = this.handles.extend(...handles);
        return this;
    }

    private reserved = new Set<string>();
    public reserve(namespace: Iterable<string>) {
        for (const name of namespace) {
            if (isValidVarName(name)) this.reserved.add(name);
        }
        return this;
    }

    compile(context?: object): Code {
        const { root, handles, reserved } = this;
        const locals = new Locals(context, reserved);
        const code = new Code(...reserved, ...locals.keys());
        // Build the dependency graph with initial optimization
        const graph = new Graph(handles, root, ...locals.values());
        // Reserve names for locals
        for (const [name, { value, writable }] of locals.entries()) {
            // Assign name
            code.register(value, { name, type: writable ? "let" : "const" });
        }
        // Initial optimization
        graph.optimize(code.named);
        // The serialization function
        function serialize(target: any) {
            if (code.context.has(target)) crash("Object already instantiated");
            if (!graph.objects.has(target))
                crash("Potential circular reference");
            // Obtain a name for the target object
            code.register(target);
            // Get expression
            const handle = handles.resolve(target);
            const expr = handle.serialize(target, closure(graph, code));
            // Pull object out of graph
            graph.remove(target, true);
            // Clean up the graph
            graph.optimize(code.named);
            // Return expression
            return expr;
        }
        // Start building
        while (graph.objects.size > 0) {
            // Look for next object with most parents
            const next = lookup(
                graph.objects
                    .values()
                    .filter((e) => e !== root)
                    .map((e) => [e, graph.refs.stat(e)]),
                ([_a, a], [_b, b]) => b > a
            );
            if (!next) break;
            const [target] = next;
            const expr = serialize(target);
            code.instantiate(target, expr);
        }
        // Root object is instantiated last
        if (graph.objects.has(root)) {
            // Must be named
            const expr = serialize(root);
            code.root = code.instantiate(root, expr);
        } else {
            // May be inlineable
            code.root =
                closure(graph, code).inline(root) ??
                crash("Cannot inline root");
        }
        // Additional check: objects should be empty
        if (graph.objects.size > 0) crash("Objects left in graph");
        // Return the code block
        return code;
    }

    /**
     * @param target Use "function" to get a function body, "module" to get a module.
     * In most cases, "function" should be used.
     * Use "module" when you intend to directly write the result to a js file.
     */
    static stringify(
        input: any,
        {
            target = "function",
            ...opts
        }: FormatOptions & {
            target?: "module" | "function" | ((ret: string) => string);
        } = {},
        context?: object
    ) {
        const result = new LivingObject(input).compile(context);
        if (target === "module") {
            return result.toModule(opts);
        } else if (target === "function") {
            return result.toFunctionBody(opts);
        } else {
            return result.complete(target, opts);
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
        const locals = new Locals(context);
        if (isolated && !inBrowser)
            return LivingObject.evalInNodeVM(input, context);
        // Interpolate injected context as function arguments
        const fn = new Function(...locals.keys(), `{${input}}`);
        if (!isolated) {
            return fn(...locals.values());
        } else if (inBrowser) {
            return LivingObject.evalInBrowser(fn, locals.values());
        }
    }

    private static async evalInBrowser(fn: Function, vals: Iterable<any>) {
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
