import { stringify, parse } from "living-object";

const loop = {}
loop.loop = loop;

const loop_str = stringify(loop);
console.log(loop_str);
const loop_obj = parse(loop_str);
console.assert(loop_obj === loop_obj.loop, "loop detection failed");
