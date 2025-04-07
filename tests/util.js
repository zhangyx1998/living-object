import { stringify, parse } from "living-object";

function keys(obj) {
    const keys = Object.keys(obj);
    return keys.concat(Object.getOwnPropertySymbols(obj));
}

function values(obj) {
    const values = Object.values(obj);
    return values.concat(Object.getOwnPropertySymbols(obj));
}

export async function equivalence(a, b, checked = new WeakSet()) {
    if (checked.has(a) || checked.has(b)) {
        return true;
    }
    try {
        checked.add(a);
        checked.add(b);
    } catch { }
    if (typeof a !== typeof b) {
        console.log("Type mismatch:", { a, b }, { typeA: typeof a, typeB: typeof b });
        return false;
    }
    if (a instanceof Promise) {
        if (!(b instanceof Promise)) {
            console.log("Promise type mismatch:", { a, b });
            return false;
        }
        return equivalence(await a, await b, checked);
    }
    if (Array.isArray(a)) {
        if (!Array.isArray(b)) {
            console.log("Array type mismatch:", { a, b });
            return false;
        }
        if (a.length !== b.length) {
            console.log("Array length mismatch:", { a, b });
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!equivalence(a[i], b[i], checked)) return false;
        }
        return true;
    }
    if (a instanceof Map) {
        if (!(b instanceof Map)) {
            console.log("Map type mismatch:", { a, b });
            return false;
        }
        return equivalence(a.keys(), b.keys()), checked &&
            equivalence(a.values(), b.values(), checked);
    }
    if (a instanceof Set) {
        if (!(b instanceof Set)) {
            console.log("Set type mismatch:", { a, b });
            return false;
        }
        return equivalence(a.values(), b.values(), checked);
    }
    if (typeof a === "object" && a !== null && b !== null) {
        if (a.constructor !== b.constructor) {
            console.log("Object constructor mismatch:", { a, b }, { constructorA: a.constructor, constructorB: b.constructor });
            return false;
        }
        return equivalence(keys(a), keys(b), checked) &&
            equivalence(values(a), values(b), checked);
    }
    if (typeof a === "function" && typeof b === "function") {
        return equivalence(a(), b(), checked) &&
            equivalence(a.name, b.name, checked) &&
            equivalence(a.length, b.length, checked) &&
            equivalence(keys(a), keys(b), checked) &&
            equivalence(values(a), values(b), checked);
    }
    if (a !== b) {
        console.log("Value mismatch:", { a, b });
        return false;
    }
    return true;
}


export async function test(description, input, isolated = ("ISOLATED" in process.env)) {

    console.log(`\n==========\n${description}\n==========\n`);

    const deflated = stringify(input);
    console.log(deflated);
    process.stdout.write("\n");

    const inflated = await parse(deflated, {}, isolated);
    console.log(inflated);
    process.stdout.write("\n");

    console.assert(await equivalence(input, inflated), "equivalence failed");
}
