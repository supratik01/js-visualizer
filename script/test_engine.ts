// Compare simulator output to real Node for many programs.
// Run: npx tsx script/test_engine.ts
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseAndSimulate } from '../client/src/lib/executionEngine';

interface Case {
  name: string;
  code: string;
  asSet?: boolean;
  // If true, real Node produces wall-clock-dependent ordering; only check that all simulated lines are present in real lines.
  subset?: boolean;
}

const cases: Case[] = [
  { name: 'event-loop-1', code: `Promise.resolve().then(() => console.log(1));
setTimeout(() => console.log(2), 0);
queueMicrotask(() => {
  console.log(3);
  queueMicrotask(() => console.log(4));
});
console.log(5);` },
  { name: 'simple-sync', code: `console.log('a'); console.log('b'); const x = 1+2; console.log(x);` },
  { name: 'function-call', code: `function add(a,b){ return a+b }
console.log(add(2,3));
console.log(add(10, add(2,3)));` },
  { name: 'closure', code: `function makeCounter(){
  let n = 0;
  return () => ++n;
}
const c = makeCounter();
console.log(c());
console.log(c());
console.log(c());` },
  { name: 'promise-chain', code: `Promise.resolve(1)
  .then(v => v+1)
  .then(v => v*2)
  .then(v => console.log('result', v));
console.log('sync');` },
  { name: 'promise-reject-catch', code: `Promise.reject('boom')
  .catch(e => 'caught:'+e)
  .then(v => console.log(v));` },
  { name: 'async-await-1', code: `async function f(){
  const v = await Promise.resolve(42);
  console.log('got', v);
}
f();
console.log('after f');` },
  { name: 'async-await-order', code: `console.log('1');
async function a(){ console.log('2'); await Promise.resolve(); console.log('5'); }
a();
console.log('3');
Promise.resolve().then(()=>console.log('6'));
console.log('4');` },
  { name: 'array-methods', code: `const arr = [1,2,3,4,5];
console.log(arr.map(x=>x*2).join(','));
console.log(arr.filter(x=>x%2===0).join(','));
console.log(arr.reduce((a,b)=>a+b, 0));
arr.forEach(x=>console.log('x',x));` },
  { name: 'for-loop', code: `for (let i=0;i<3;i++) console.log(i);
let s=0;
for (let i=1;i<=4;i++) s+=i;
console.log('sum',s);` },
  { name: 'while-loop', code: `let i=0;
while(i<3){ console.log(i); i++ }
console.log('done');` },
  { name: 'try-catch', code: `try { throw new Error('bad'); } catch (e) { console.log('caught', e.message); }
console.log('after');` },
  { name: 'destructuring', code: `const obj = { a: 1, b: 2, c: 3 };
const { a, b, ...rest } = obj;
console.log(a, b, JSON.stringify(rest));
const [x, y, ...others] = [10, 20, 30, 40];
console.log(x, y, JSON.stringify(others));` },
  { name: 'template-literals', code: `const name = 'world';
console.log(\`Hello, \${name}! \${1+2}\`);` },
  { name: 'promise.all', code: `Promise.all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])
  .then(v => console.log(v.join(',')));` },
  { name: 'async-error', code: `async function f() {
  try { await Promise.reject('e'); } catch (e) { console.log('got', e); }
}
f();
console.log('sync');` },
  { name: 'nested-microtask', code: `Promise.resolve().then(() => {
  console.log('a');
  Promise.resolve().then(() => console.log('b'));
  Promise.resolve().then(() => console.log('c'));
});
queueMicrotask(() => console.log('d'));
console.log('sync');` },
  { name: 'classic-event-loop-quiz', code: `console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);
Promise.resolve()
  .then(() => console.log('promise1'))
  .then(() => console.log('promise2'));
console.log('script end');` },
  { name: 'class-basic', code: `class Animal {
  constructor(name) { this.name = name; }
  speak() { return this.name + ' speaks'; }
}
const a = new Animal('Cat');
console.log(a.speak());` },
  { name: 'inheritance', code: `class A { greet(){ return 'A' } }
class B extends A { greet(){ return 'B->'+super.greet() } }
console.log(new B().greet());` },
  { name: 'spread-rest', code: `function sum(...nums){ return nums.reduce((a,b)=>a+b,0); }
console.log(sum(1,2,3,4,5));
const a=[1,2], b=[3,4];
console.log([...a, ...b].join(','));` },
  { name: 'object-shorthand', code: `const x=1, y=2;
const o = { x, y, sum(){ return this.x + this.y } };
console.log(JSON.stringify({x: o.x, y: o.y, sum: o.sum()}));` },
  { name: 'switch', code: `function test(n){
  switch(n){
    case 1: return 'one';
    case 2: return 'two';
    default: return 'other';
  }
}
console.log(test(1));
console.log(test(2));
console.log(test(99));` },
  { name: 'nested-async', code: `async function outer(){
  console.log('outer start');
  await Promise.resolve();
  console.log('outer mid');
  async function inner(){
    console.log('inner start');
    await Promise.resolve();
    console.log('inner end');
  }
  await inner();
  console.log('outer end');
}
outer();
console.log('top');` },
  { name: 'this-binding', code: `const obj = { n: 7, get(){ return this.n } };
console.log(obj.get());
const f = obj.get;
const g = f.bind({ n: 99 });
console.log(g());` },
  { name: 'iife', code: `(function(){ console.log('iife'); })();
((x)=>console.log('arr', x))(42);` },
  { name: 'object-keys', code: `const o = { a:1, b:2, c:3 };
console.log(Object.keys(o).join(','));
console.log(Object.values(o).join(','));
console.log(Object.entries(o).map(([k,v])=>k+'='+v).join(','));` },
  { name: 'string-methods', code: `const s='Hello World';
console.log(s.toLowerCase());
console.log(s.toUpperCase());
console.log(s.split(' ').join('-'));
console.log(s.replace('World','JS'));
console.log(s.length);` },
  { name: 'json', code: `const o = { a:1, b:[2,3], c:{d:4} };
const s = JSON.stringify(o);
console.log(s);
const p = JSON.parse(s);
console.log(p.b[1], p.c.d);` },
  { name: 'array-from', code: `console.log(Array.from('hi').join(','));
console.log(Array.from({length:3}, (_,i)=>i*i).join(','));` },
  { name: 'try-finally', code: `function f(){
  try { console.log('try'); return 1; }
  finally { console.log('finally'); }
}
console.log(f());` },
  { name: 'generator-basic', code: `function* gen(){ yield 1; yield 2; yield 3; }
const g = gen();
console.log(g.next().value);
console.log(g.next().value);
console.log(g.next().value);
console.log(g.next().done);` },
  { name: 'map-set', code: `const m = new Map();
m.set('a', 1); m.set('b', 2);
console.log(m.get('a'), m.get('b'), m.size);
const s = new Set([1,2,2,3,3,3]);
console.log(s.size, [...s].join(','));` },
  { name: 'array-flat', code: `console.log([1,[2,[3,[4]]]].flat().join(','));
console.log([1,[2,[3,[4]]]].flat(Infinity).join(','));
console.log([[1,2],[3,4]].flatMap(a=>a.map(x=>x*2)).join(','));` },
  { name: 'optional-chaining', code: `const o = { a: { b: { c: 42 } } };
console.log(o?.a?.b?.c);
console.log(o?.x?.y?.z);
console.log(o?.foo?.());` },
  { name: 'nullish-coalescing', code: `console.log(null ?? 'a');
console.log(undefined ?? 'b');
console.log(0 ?? 'c');
console.log('' ?? 'd');
console.log(false ?? 'e');` },
  { name: 'logical-assign', code: `let a = null; a ??= 5; console.log(a);
let b = 0; b ||= 10; console.log(b);
let c = 1; c &&= 2; console.log(c);` },
  { name: 'try-catch-async-rejection-no-catch', code: `async function f() { throw new Error('e'); }
f().catch(e => console.log('caught', e.message));
console.log('sync');` },
  { name: 'promise-allSettled', code: `Promise.allSettled([Promise.resolve(1), Promise.reject('e'), Promise.resolve(3)])
  .then(results => {
    for (const r of results) {
      if (r.status === 'fulfilled') console.log('ok', r.value);
      else console.log('err', r.reason);
    }
  });` },
  { name: 'promise-any', code: `Promise.any([Promise.reject('a'), Promise.resolve(1), Promise.resolve(2)])
  .then(v => console.log('first', v));` },
  { name: 'await-then-await', code: `async function f() {
  const x = await Promise.resolve(1);
  const y = await Promise.resolve(x + 1);
  console.log(x, y);
}
f();` },
  { name: 'recursive-fn', code: `function fact(n){ return n<=1 ? 1 : n*fact(n-1); }
console.log(fact(5));
console.log(fact(10));` },
  { name: 'getter-setter', code: `const o = {
  _v: 0,
  get v(){ return this._v },
  set v(x){ this._v = x*2 }
};
o.v = 5;
console.log(o.v);` },
  { name: 'computed-prop', code: `const k = 'name';
const o = { [k]: 'Alice', ['age_'+1]: 30 };
console.log(o.name, o.age_1);` },
  { name: 'date-basic', code: `const d = new Date(2024, 0, 1);
console.log(d.getFullYear());
console.log(d.getMonth());` },
  { name: 'regexp', code: `const r = /^h(\\w+)/;
const m = 'hello'.match(r);
console.log(m[0], m[1]);` },
  { name: 'string-includes', code: `console.log('hello'.includes('ll'));
console.log('hello'.startsWith('he'));
console.log('hello'.endsWith('lo'));
console.log('hello'.repeat(2));` },
  { name: 'array-destructuring-default', code: `const [a=1, b=2, c=3] = [10];
console.log(a,b,c);` },
];

function realConsole(code: string): string[] {
  const dir = tmpdir();
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `__test_${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(file, code);
  try {
    const out = execFileSync(process.execPath, [file], { encoding: 'utf8', timeout: 4000 });
    // Drop only the trailing empty line produced by Node's last newline, keep internal blank lines.
    const lines = out.replace(/\r/g, '').split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  } catch (e: any) {
    const stdout = (e.stdout || '').toString();
    const stderr = (e.stderr || '').toString();
    const lines = (stdout + (stdout && stderr ? '\n' : '') + stderr).split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }
}

function simConsole(code: string): string[] {
  const steps = parseAndSimulate(code);
  const out: string[] = [];
  for (const s of steps) {
    if (s.type === 'console') {
      const v = (s.data as any).value;
      const t = (s.data as any).type;
      if (t === 'error' || t === 'warn') out.push(String(v));
      else out.push(String(v));
    }
  }
  return out;
}

function arrEq(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function main() {
  let pass = 0, fail = 0;
  const failures: Array<{ name: string; expected: string[]; got: string[] }> = [];

  for (const c of cases) {
    const real = realConsole(c.code);
    const got = simConsole(c.code);
    const match = c.subset
      ? got.every(g => real.includes(g))
      : c.asSet
        ? new Set(real).size === new Set(got).size && [...new Set(real)].every(x => got.includes(x))
        : arrEq(real, got);
    if (match) {
      pass++;
      console.log(`PASS  ${c.name}`);
    } else {
      fail++;
      failures.push({ name: c.name, expected: real, got });
      console.log(`FAIL  ${c.name}`);
      console.log('   exp:', JSON.stringify(real));
      console.log('   got:', JSON.stringify(got));
    }
  }

  console.log(`\n=== ${pass}/${pass + fail} passed ===`);
  process.exit(failures.length ? 1 : 0);
}

main();
