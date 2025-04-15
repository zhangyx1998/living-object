/* ---------------------------------------------------------
 * Copyright (c) 2025-present Yuxuan Zhang, web-dev@z-yx.cc
 * This source code is licensed under the MIT license.
 * You may find the full license in project root directory.
 * ------------------------------------------------------ */

import { crash, isImmediateValue } from './util';
import { type TypeHandles } from './handles';

class CountMap extends Map<any, number> {
    get(key: any): number {
        return super.get(key) ?? 0;
    }
    increment(key: any) {
        this.set(key, this.get(key) + 1);
    }
    sum() {
        // TODO: Use polyfilled iterator helpers
        // return this.values().reduce((acc, v) => acc + v, 0);
        let sum = 0;
        for (const v of this.values()) {
            sum += v;
        }
        return sum;
    }
}

class OneWayGraph extends Map<any, CountMap> {
    ensure(key: any): CountMap {
        const existing = this.get(key);
        if (existing === undefined) {
            const val = new CountMap();
            this.set(key, val);
            return val;
        } else {
            return existing!;
        }
    }
    stat(src: any) {
        return this.get(src)?.sum() ?? 0;
    }
    // Increment the count of a src-dst pair
    increment(src: any, dst: any) {
        this.ensure(src).increment(dst);
    }
}

export default class Graph {
    constructor(
        public readonly handles: TypeHandles,
        public readonly root: any,
        ...extras: any[]
    ) {
        this.traverse(root);
        // Extra tracked objects
        for (const obj of extras) {
            this.traverse(obj);
        }
    }
    /**
     * @internal
     * Traverse object tree and build dependency graph
     */
    private traverse(target: any) {
        if (isImmediateValue(target)) return;
        if (this.objects.has(target)) return;
        this.objects.add(target);
        // Only traverse children upon first encounter
        const { traverse } = this.handles.resolve(target);
        const children = traverse?.(target);
        if (children) {
            for (const child of children) {
                // Skip immediate values
                if (isImmediateValue(child)) continue;
                // Record parent / child relationship
                this.add(target, child);
                this.traverse(child);
            }
        }
    }
    /** #### All unique objects in the graph */
    readonly objects = new Set<any>();
    /** #### Objects that should be embedded (0 child, 0~1 parent) */
    readonly embedded = new Set<any>();
    /** #### parent => children */
    readonly deps = new OneWayGraph();
    /** #### child => parents */
    readonly refs = new OneWayGraph();
    // Add a dependency pair to the graph
    add(parent: any, child: any) {
        this.deps.increment(parent, child);
        this.refs.increment(child, parent);
    }
    // Unlink from all children
    unlinkChildren(obj: any) {
        for (const child of this.deps.get(obj)?.keys() ?? []) {
            this.refs.get(child)?.delete(obj);
        }
        this.deps.delete(obj);
    }
    // Unlink from all parents
    unlinkParents(obj: any) {
        for (const parent of this.refs.get(obj)?.keys() ?? []) {
            this.deps.get(parent)?.delete(obj);
        }
        this.refs.delete(obj);
    }
    // Remove an item from the graph
    remove(obj: any, force = false) {
        this.unlinkParents(obj);
        this.deps.stat(obj) > 0 && !force
            ? crash('Cannot remove graph node with children')
            : this.deps.delete(obj);
        this.objects.delete(obj);
    }
    /**
     * A graph node can be embedded if:
     * 1. It does not have any children (dep)
     * 2. It has at most one parent (ref)
     */
    private isEdgeNode(obj: any) {
        return this.deps.stat(obj) === 0 && this.refs.stat(obj) <= 1;
    }
    /**
     * Recursively embed leaf nodes with <=1 parent.
     * @param ignored - Set of nodes that cannot be embedded
     */
    optimize(ignored?: Set<any> | Map<any, any>) {
        let finished;
        do {
            finished = true;
            for (const obj of this.objects) {
                if (this.embedded.has(obj))
                    crash('Internal Error: object already embedded');
                if (this.isEdgeNode(obj) && !ignored?.has(obj)) {
                    this.embedded.add(obj);
                    this.objects.delete(obj);
                    this.remove(obj);
                    finished = false;
                }
            }
        } while (!finished);
        return this;
    }
}
