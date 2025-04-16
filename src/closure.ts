/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import Code from './code';
import globals from './globals';
import Graph from './graph';
import { Hooks } from './handles';
import { configure, crashAt, describe } from './util';

type ENV = 'serialize' | 'defer';

export default function closure(graph: Graph, code: Code) {
    let env: ENV = 'serialize';
    function guard<F extends Function>(fn: F) {
        function wrapper(...args: any[]) {
            if (env === 'defer')
                crashAt(wrapper, 'serialize hooks used in defer context');
            return fn(...args);
        }
        configure(wrapper, 'name', fn.name);
        configure(wrapper, 'length', fn.length);
        return wrapper as any as F;
    }
    // Ref helper
    // __ref__ returns undefined upon failure, this is depended by inline().
    function __ref__(target: any, immediate: boolean) {
        if (code.context.has(target)) return code.context.get(target)!;
        if (globals().has(target)) return globals().get(target)!;
        // Force target object to be named
        if (!immediate && graph.objects.has(target))
            return code.register(target).name;
    }
    const refAsync = <Hooks.Ref>function (target: any) {
        const result = __ref__(target, false);
        if (result !== undefined) return result;
        crashAt(refAsync, `Cannot ref ${describe(target)} :: ${target}`);
    };
    const refSync = <Hooks.Ref>function (target: any) {
        const result = __ref__(target, true);
        if (result !== undefined) return result;
        // Ref guarantees to return non-undefined value
        crashAt(
            refSync,
            `Cannot immediate ref ${describe(target)} :: ${target}`,
        );
    };
    const ref = Object.assign(guard(refSync), { async: guard(refAsync) });
    // Inline helper
    function __inline__(target: any, immediate: boolean) {
        // Check if the target is already instantiated
        const resolvedName = __ref__(target, immediate);
        if (resolvedName !== undefined) return resolvedName;
        // If the object cannot be inlined, return undefined
        // This is only possible in async mode where the object is not yet
        // registered in the graph.
        if (graph.objects.has(target)) return;
        // Try to instantiate the target as an inline expression
        // At this stage, the object must either be an embedded object, or
        // a javascript primitive.
        const { deferred, ...hooks } = closure(graph, code);
        const expr = graph.handles.resolve(target).serialize(target, hooks);
        if (deferred()) {
            // Target must be referenced by name.
            const name = code.instantiate(target, expr);
            return name;
        } else if (code.context.has(target)) {
            // Target referenced its own name
            // i.e. ref(target) is called inside serialize(target).
            throw new Error('Unexpected context for target object');
            return code.context.get(target)!;
        } else {
            // Target can be inlined directly as an expression.
            return expr;
        }
    }
    const inlineSync = <Hooks.Inline<false>>function inline(target) {
        return __inline__(target, true);
    };
    const inlineAsync = <Hooks.Inline<false>>function inline(target) {
        return __inline__(target, false);
    };
    const inlineSyncForce = <Hooks.Inline<true>>function inline(target) {
        // Actual inline
        const result = __inline__(target, true);
        if (result !== undefined) return result;
        crashAt(
            inlineSyncForce,
            `Cannot force inline ${describe(target)} :: ${target}`,
        );
    };
    const inlineAsyncForce = <Hooks.Inline<true>>function inline(target) {
        // Actual inline
        const result = __inline__(target, false);
        if (result !== undefined) return result;
        crashAt(
            inlineAsyncForce,
            `Cannot force async inline ${describe(target)} :: ${target}`,
        );
    };
    const inline = Object.assign(guard(inlineSync), {
        async: guard(inlineAsync),
        force: guard(inlineSyncForce),
    });
    // The defer function passed to handle.serialize()
    let flag_defer = false;
    const defer: Hooks.Defer = function (callback, placeholder = '0') {
        flag_defer = true;
        const prev_env = env;
        env = 'defer';
        const result = callback({ ref: refAsync, inline: inlineAsyncForce });
        if (typeof result === 'string') code.addStatement(result);
        else code.addStatement(...result);
        env = prev_env;
        return placeholder;
    };
    return {
        ref,
        inline,
        defer,
        deferred: () => flag_defer,
    };
}
