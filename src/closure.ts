/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */
import Code from './code';
import Graph from './graph';
import { Hooks } from './handles';
import { crash } from './util';

type ENV = 'serialize' | 'defer';

export default function closure(graph: Graph, code: Code) {
    let env: ENV = 'serialize';
    function limit<T extends Function>(bound_env: ENV, fn: T, name: string) {
        return function wrapper(...args: any[]) {
            if (env !== bound_env) {
                const message = `Calling ${bound_env} version of ${name}() inside ${env} callback`;
                const error = new Error(message);
                Error.captureStackTrace?.(error, wrapper);
                throw error;
            }
            return fn(...args);
        } as unknown as T;
    }
    // Helper functions
    const ref = Object.assign(
        <Hooks.Ref>(
            ((target, immediate) =>
                ref.try(target, immediate) ??
                crash(`Cannot ref ${typeof target} (${target})`))
        ),
        {
            try(target: any, immediate = true) {
                if (code.context.has(target)) return code.context.get(target)!;
                if (
                    (!immediate || env === 'defer') &&
                    graph.objects.has(target)
                ) {
                    // Force target object to be named
                    return code.register(target).name;
                }
            },
        },
    );
    // The inline function passed to handle.serialize()
    const inline: Hooks.Inline = function (target, immediate) {
        // Check if the target is already instantiated
        const resolvedName = ref.try(target, immediate);
        if (resolvedName !== undefined) return resolvedName;
        // If the object cannot be inlined, return undefined
        if (env === 'serialize' && graph.objects.has(target)) return;
        // Try to instantiate the target as an inline expression
        // At this stage, the object must either be an embedded object, or
        // a javascript primitive.
        const { deferred, ...hooks } = closure(graph, code);
        const expr = graph.handles.resolve(target).serialize(target, hooks);
        if (deferred()) {
            // Object must be referenced by name.
            return code.instantiate(target, expr);
        } else {
            return code.context.get(target) ?? expr;
        }
    };
    // The defer function passed to handle.serialize()
    let flag_defer = false;
    const defer: Hooks.Defer = function (callback, placeholder = '0') {
        flag_defer = true;
        const prev_env = env;
        env = 'defer';
        const result = callback({
            ref: limit('defer', ref, 'ref') as Hooks.StatementHooks['ref'],
            inline: limit(
                'defer',
                inline,
                'inline',
            ) as Hooks.StatementHooks['inline'],
        });
        if (typeof result === 'string') code.addStatement(result);
        else code.addStatement(...result);
        env = prev_env;
        return placeholder;
    };
    return {
        ref: limit('serialize', ref, 'ref'),
        inline: limit('serialize', inline, 'inline'),
        defer,
        deferred: () => flag_defer,
    };
}
