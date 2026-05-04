/**
 * ECMAScript 2026 Language Specification — Full Knowledge Base
 *
 * Crawled from: https://tc39.es/ecma262/
 * Covers all major sections of the ECMAScript® 2026 (ECMA-262) specification.
 *
 * Sections covered:
 *  §4  Overview
 *  §6  Data Types and Values
 *  §7  Abstract Operations
 *  §8  Syntax-Directed Operations
 *  §9  Executable Code and Execution Contexts
 *  §10 Ordinary and Exotic Objects
 *  §11 Source Text
 *  §12 Lexical Grammar
 *  §13 Expressions
 *  §14 Statements and Declarations
 *  §15 Functions and Classes
 *  §16 Scripts and Modules
 *  §18 The Global Object
 *  §19 Fundamental Objects (Object, Function, Boolean, Symbol, Error)
 *  §20 Numbers and Dates (Number, BigInt, Math, Date)
 *  §21 Text Processing (String, RegExp)
 *  §22 Indexed Collections (Array, TypedArray)
 *  §23 Keyed Collections (Map, Set, WeakMap, WeakSet)
 *  §24 Structured Data (ArrayBuffer, DataView, Atomics, JSON)
 *  §25 Managing Memory (WeakRef, FinalizationRegistry)
 *  §26 Control Abstraction (Iterator, Generator, Promise)
 *  §27 Reflection (Proxy, Reflect)
 */

// ============================================================================
// SECTION 4: ECMASCRIPT OVERVIEW — Terms and Definitions
// ============================================================================

export const ECMASCRIPT_TERMS = {
  type:
    "A set of data values as defined by this specification. Each value belongs to exactly one type.",
  primitiveValue:
    "A member of one of the following types: Undefined, Null, Boolean, Number, BigInt, Symbol, String.",
  object:
    "A member of the type Object. An object is a collection of properties with a prototype.",
  constructor:
    "A function that creates and initialises objects. The value of the constructor's prototype property is a prototype object used to implement inheritance.",
  prototype:
    "An object from which another object inherits properties. Constructor.prototype establishes the prototype chain.",
  ordinaryObject:
    "An object whose default behaviour for the essential internal methods is as specified in §10.1.",
  exoticObject:
    "An object that has one or more essential internal methods whose default behaviour differs from §10.1 (e.g. Array, String, Proxy, TypedArray).",
  standardObject:
    "An object whose semantics are defined by this specification.",
  builtInObject:
    "An object specified and supplied by an ECMAScript implementation (e.g. parseInt, Math, Array).",
  undefinedValue: "The unique value of the Undefined type.",
  nullValue: "The unique value of the Null type.",
  strictMode:
    "A restricted variant of ECMAScript that eliminates silent errors, improves performance, and forbids future-reserved syntax.",
};

// ============================================================================
// SECTION 6: ECMASCRIPT DATA TYPES AND VALUES
// ============================================================================

/** §6.1 — The seven ECMAScript Language Types */
export const LANGUAGE_TYPES = {
  Undefined: {
    spec: "§6.1.1",
    description:
      "Exactly one value: undefined. Used for uninitialized variables and missing properties.",
    typeofResult: "undefined",
    coercesToBoolean: false,
    coercesToNumber: NaN,
  },
  Null: {
    spec: "§6.1.2",
    description:
      "Exactly one value: null. Represents the intentional absence of an object value.",
    typeofResult: "object", // famous quirk
    coercesToBoolean: false,
    coercesToNumber: 0,
  },
  Boolean: {
    spec: "§6.1.3",
    description: "Exactly two values: true and false.",
    typeofResult: "boolean",
  },
  String: {
    spec: "§6.1.4",
    description:
      "Sequence of zero or more 16-bit unsigned integer values (UTF-16 code units). Max length 2^53 - 1.",
    typeofResult: "string",
    immutable: true,
    indexing: "0-based; indices are numeric string property keys",
  },
  Symbol: {
    spec: "§6.1.5",
    description:
      "Unique and immutable identifier. Created with Symbol(). Never auto-converted to string.",
    typeofResult: "symbol",
    wellKnownSymbols: [
      "Symbol.asyncIterator",
      "Symbol.hasInstance",
      "Symbol.isConcatSpreadable",
      "Symbol.iterator",
      "Symbol.match",
      "Symbol.matchAll",
      "Symbol.replace",
      "Symbol.search",
      "Symbol.species",
      "Symbol.split",
      "Symbol.toPrimitive",
      "Symbol.toStringTag",
      "Symbol.unscopables",
    ],
  },
  Number: {
    spec: "§6.1.6.1",
    description:
      "IEEE 754-2019 double-precision 64-bit floating-point. Includes +∞, -∞, -0, NaN.",
    typeofResult: "number",
    specialValues: {
      NaN: "Not-a-Number; result of invalid numeric operations. NaN !== NaN always.",
      Infinity: "Positive infinity.",
      negativeInfinity: "Negative infinity (-Infinity).",
      negativeZero: "-0 is distinct from +0 in SameValue but == using ===.",
    },
    safeIntegerRange: "-(2^53 - 1) to (2^53 - 1) inclusive",
    epsilon: "2.220446049250313e-16 (Number.EPSILON)",
  },
  BigInt: {
    spec: "§6.1.6.2",
    description:
      "Arbitrary-precision integer. Created with BigInt() or n suffix (e.g. 42n). Cannot mix with Number in arithmetic.",
    typeofResult: "bigint",
    cannotMixWithNumber: true,
    cannotUseUnsignedRightShift: true,
  },
  Object: {
    spec: "§6.1.7",
    description:
      "Collection of named properties. Each property is either a data property (value, writable, enumerable, configurable) or an accessor property (get, set, enumerable, configurable).",
    typeofResult: "object", // also 'function' for callable objects
    internalSlots: [
      "[[Prototype]]",
      "[[Extensible]]",
      "[[OwnPropertyKeys]]",
    ],
    essentialInternalMethods: [
      "[[GetPrototypeOf]]",
      "[[SetPrototypeOf]]",
      "[[IsExtensible]]",
      "[[PreventExtensions]]",
      "[[GetOwnProperty]]",
      "[[DefineOwnProperty]]",
      "[[HasProperty]]",
      "[[Get]]",
      "[[Set]]",
      "[[Delete]]",
      "[[OwnPropertyKeys]]",
      "[[Call]] (functions only)",
      "[[Construct]] (constructors only)",
    ],
  },
} as const;

/** §6.1.7.1 — Property Attributes */
export const PROPERTY_ATTRIBUTES = {
  dataProperty: {
    attributes: ["[[Value]]", "[[Writable]]", "[[Enumerable]]", "[[Configurable]]"],
    defaults: { Value: undefined, Writable: false, Enumerable: false, Configurable: false },
  },
  accessorProperty: {
    attributes: ["[[Get]]", "[[Set]]", "[[Enumerable]]", "[[Configurable]]"],
    defaults: { Get: undefined, Set: undefined, Enumerable: false, Configurable: false },
  },
  rules: {
    CONFIGURABLE_REQUIRED_TO_CHANGE:
      "A non-configurable property cannot be deleted or have its attributes changed (except value for writable data properties).",
    WRITABLE_REQUIRED_TO_SET_VALUE:
      "A non-writable data property's [[Value]] cannot be changed.",
    ACCESSOR_VS_DATA:
      "Cannot convert between data and accessor property without configurable: true.",
  },
};

/** §6.2.4 — The Completion Record Specification Type */
export const COMPLETION_RECORD = {
  spec: "§6.2.4",
  description:
    "Every statement and expression evaluation produces a Completion Record describing the result.",
  types: {
    normal:
      "Normal completion: { [[Type]]: normal, [[Value]]: value, [[Target]]: empty }",
    return:
      "Return completion from a function: { [[Type]]: return, [[Value]]: value, [[Target]]: empty }",
    throw:
      "Thrown exception: { [[Type]]: throw, [[Value]]: exception, [[Target]]: empty }",
    break:
      "Break statement: { [[Type]]: break, [[Value]]: empty, [[Target]]: label | empty }",
    continue:
      "Continue statement: { [[Type]]: continue, [[Value]]: empty, [[Target]]: label | empty }",
  },
  abruptCompletion:
    "Any completion whose type is not 'normal'. Propagates up the call stack until handled.",
  operations: {
    NormalCompletion: "Returns { [[Type]]: normal, [[Value]]: value }",
    ThrowCompletion: "Returns { [[Type]]: throw, [[Value]]: value }",
    ReturnCompletion: "Returns { [[Type]]: return, [[Value]]: value }",
    UpdateEmpty:
      "If completionRecord.[[Value]] is empty, replaces it with the supplied value.",
  },
};

/** §6.2.5 — Reference Record */
export const REFERENCE_RECORD = {
  spec: "§6.2.5",
  description:
    "Represents a binding reference. Used for assignment targets and variable lookups.",
  fields: {
    Base:
      "Object | Environment Record | 'unresolvable' — where the binding lives.",
    ReferencedName: "String | Symbol — the property name or binding name.",
    Strict: "Boolean — whether the reference is in strict mode.",
    ThisValue: "Only for super references.",
  },
  operations: {
    GetValue: "Retrieves the value at the reference. Throws ReferenceError if unresolvable.",
    PutValue: "Stores a value at the reference. Throws TypeError/ReferenceError as appropriate.",
    IsPropertyReference: "Returns true if base is an Object or is a primitive (auto-boxed).",
    GetThisValue: "Returns the this value for super references.",
  },
};

// ============================================================================
// SECTION 7: ABSTRACT OPERATIONS (TYPE CONVERSION & TESTING)
// ============================================================================

/** §7.1 — Type Conversion Rules */
export const TYPE_CONVERSION = {
  spec: "§7.1",

  ToPrimitive: {
    description:
      "Converts an Object to a primitive value. Consults Symbol.toPrimitive first, then hint-based methods.",
    algorithm: [
      "1. If input is not an Object, return input.",
      "2. If Symbol.toPrimitive method exists, call it with hint.",
      "3. If hint is 'number': try valueOf() then toString().",
      "4. If hint is 'string': try toString() then valueOf().",
      "5. If hint is 'default': same as 'number' (except for Date which uses 'string').",
    ],
  },

  ToBoolean: {
    spec: "§7.1.2",
    falsy: [undefined, null, false, 0, -0, 0n, NaN, ""],
    truthy: "Everything else, including empty objects {} and empty arrays []",
    rules: {
      undefined: false,
      null: false,
      boolean: "return as-is",
      number: "false if +0, -0, or NaN; true otherwise",
      bigint: "false if 0n; true otherwise",
      string: "false if empty string; true otherwise",
      symbol: true,
      object: true,
    },
  },

  ToNumber: {
    spec: "§7.1.4",
    rules: {
      undefined: NaN,
      null: 0,
      boolean: "true → 1, false → 0",
      number: "return as-is",
      bigint: "throw TypeError",
      string: "parse numeric literal; NaN if invalid",
      symbol: "throw TypeError",
      object: "ToPrimitive(hint: number), then ToNumber",
    },
    stringEdgeCases: {
      "''": 0,
      "' '": 0,
      "'0'": 0,
      "'0x10'": 16,
      "'Infinity'": Infinity,
      "'abc'": NaN,
      "'1n'": NaN,
    },
  },

  ToString: {
    spec: "§7.1.17",
    rules: {
      undefined: "'undefined'",
      null: "'null'",
      boolean: "'true' or 'false'",
      number:
        "Number::toString algorithm (IEEE 754 to shortest decimal representation)",
      bigint: "digits with no trailing n",
      string: "return as-is",
      symbol: "throw TypeError",
      object: "ToPrimitive(hint: string), then ToString",
    },
    numberEdgeCases: {
      "0": "'0'",
      "-0": "'0'",
      Infinity: "'Infinity'",
      NaN: "'NaN'",
    },
  },

  ToObject: {
    spec: "§7.1.18",
    rules: {
      undefined: "throw TypeError",
      null: "throw TypeError",
      boolean: "Boolean wrapper object",
      number: "Number wrapper object",
      bigint: "BigInt wrapper object",
      string: "String wrapper object",
      symbol: "Symbol wrapper object",
      object: "return as-is",
    },
  },

  ToNumeric: {
    spec: "§7.1.3",
    description:
      "Returns a Number or BigInt. Used by numeric operators.",
    algorithm: [
      "1. Let primValue = ToPrimitive(value, number).",
      "2. If Type(primValue) is BigInt, return primValue.",
      "3. Return ToNumber(primValue).",
    ],
  },

  ToPropertyKey: {
    spec: "§7.1.19",
    description: "Converts a value to a property key (String or Symbol).",
    algorithm: [
      "1. Let key = ToPrimitive(argument, string).",
      "2. If Type(key) is Symbol, return key.",
      "3. Return ToString(key).",
    ],
  },

  integerConversions: {
    ToInt32: "§7.1.6 — converts to 32-bit signed integer (for bitwise ops)",
    ToUint32: "§7.1.7 — converts to 32-bit unsigned integer (for >>> operator)",
    ToInt16: "§7.1.8",
    ToUint16: "§7.1.9",
    ToInt8: "§7.1.10",
    ToUint8: "§7.1.11",
    ToUint8Clamp: "§7.1.12 — clamps to [0,255] for Uint8ClampedArray",
    ToIntegerOrInfinity:
      "§7.1.5 — converts to integer or ±Infinity (used for length checks)",
  },
};

/** §7.2 — Testing and Comparison Operations */
export const COMPARISON_OPERATIONS = {
  IsLooselyEqual: {
    spec: "§7.2.13",
    description: "Implements == operator. Allows type coercion.",
    rules: [
      "Same type: use IsStrictlyEqual.",
      "null == undefined is true (and only those).",
      "number == string: ToNumber(string) then compare.",
      "boolean == anything: ToNumber(boolean) then compare.",
      "object == string/number/bigint/symbol: ToPrimitive(object) then compare.",
      "bigint == string: try BigInt(string); if NaN return false.",
    ],
  },
  IsStrictlyEqual: {
    spec: "§7.2.14",
    description: "Implements === operator. No type coercion.",
    rules: [
      "Different types: always false.",
      "NaN === NaN is false.",
      "+0 === -0 is true.",
      "Object identity: true only if same reference.",
    ],
  },
  SameValue: {
    spec: "§7.2.9",
    description:
      "Object.is() semantics. Like === but NaN === NaN is true, +0 !== -0.",
  },
  SameValueZero: {
    spec: "§7.2.10",
    description:
      "Used by Map, Set, Array.includes. Like SameValue but +0 === -0.",
  },
  IsArray: "§7.2.2 — true for Array exotic objects and Proxy wrapping arrays",
  IsCallable:
    "§7.2.3 — true if object has a [[Call]] internal method",
  IsConstructor:
    "§7.2.4 — true if object has a [[Construct]] internal method",
  IsExtensible:
    "§7.2.5 — false if [[PreventExtensions]] was called (Object.freeze/seal/preventExtensions)",
};

// ============================================================================
// SECTION 9: EXECUTION CONTEXTS AND ENVIRONMENTS
// ============================================================================

/** §9.1 — Environment Records */
export const ENVIRONMENT_RECORDS = {
  spec: "§9.1",
  description:
    "Environment Records track variable bindings. Nested to form scope chains.",

  DeclarativeEnvironmentRecord: {
    spec: "§9.1.1.1",
    description:
      "Used for: let/const/class declarations, function parameters, catch bindings, import bindings.",
    supports: ["HasBinding", "CreateMutableBinding", "CreateImmutableBinding",
               "InitializeBinding", "SetMutableBinding", "GetBindingValue", "DeleteBinding"],
    hasThisBinding: false,
    hasSuperBinding: false,
  },

  ObjectEnvironmentRecord: {
    spec: "§9.1.1.2",
    description:
      "Wraps an object's properties as bindings. Used for: global var declarations, with statements.",
    backingObject: "Any ordinary object (global object or with-statement subject)",
    hasThisBinding: false,
  },

  FunctionEnvironmentRecord: {
    spec: "§9.1.1.3",
    description:
      "Extends declarative record for function invocations. Adds 'this' binding.",
    thisBindingStatus: "uninitialized | initialized | lexical (arrow functions)",
    operations: {
      BindThisValue: "Sets [[ThisValue]]. Throws ReferenceError if already bound.",
      GetSuperBase: "Returns the home object's [[Prototype]] for super references.",
    },
  },

  GlobalEnvironmentRecord: {
    spec: "§9.1.1.4",
    description:
      "Top-level record. Combines an ObjectEnvironmentRecord (for var/function) and a DeclarativeEnvironmentRecord (for let/const/class).",
    properties: {
      ObjectRecord: "Wraps the global object. Holds var and function declarations.",
      DeclarativeRecord: "Holds let/const/class declarations.",
    },
    hasThisBinding: true,
    thisValue: "The global object (window in browsers, globalThis in all environments)",
  },

  ModuleEnvironmentRecord: {
    spec: "§9.1.1.5",
    description:
      "Extends declarative record for module scope. Import bindings are immutable live bindings.",
    hasThisBinding: true,
    thisValue: "undefined",
    importBindings: "CreateImportBinding — indirect binding to exported value in another module",
  },

  PrivateEnvironmentRecord: {
    spec: "§9.2",
    description:
      "Tracks private class fields and methods. Attached to each class body.",
    operations: {
      NewPrivateEnvironment: "Creates a new PrivateEnvironment linked to outer.",
      ResolvePrivateIdentifier: "Looks up a #name in the private environment chain.",
    },
  },

  scopeChain: {
    description:
      "Each Environment Record has an optional outer reference, forming a lexical scope chain.",
    resolution:
      "Variable lookup walks the chain outward until binding is found or global scope is reached (ReferenceError if unresolvable in strict mode).",
  },
};

/** §9.4 — Execution Contexts */
export const EXECUTION_CONTEXTS = {
  spec: "§9.4",
  description:
    "An Execution Context tracks the runtime state of a piece of code. The running context is always at the top of the execution context stack.",

  components: {
    codeEvaluationState: "State needed to suspend and resume evaluation (for async/generators).",
    Function:
      "The function object if this is a function context; null for script/module.",
    Realm: "The Realm Record in which this code is associated.",
    ScriptOrModule: "The script or module record this code belongs to.",
    LexicalEnvironment:
      "The environment used to resolve identifier references (let/const/class/function params).",
    VariableEnvironment:
      "The environment used for var binding instantiation. Same as LexicalEnvironment except in try/catch.",
    PrivateEnvironment:
      "The PrivateEnvironment Record for private class fields.",
  },

  lifecycle: [
    "1. A new execution context is created and pushed onto the stack.",
    "2. Code executes with the new context as the running context.",
    "3. When execution completes or is suspended (await/yield), the context is popped.",
    "4. The previous context resumes as the running context.",
  ],

  operations: {
    ResolveBinding:
      "§9.4.2 — resolves an identifier in the current lexical environment.",
    GetThisEnvironment:
      "§9.4.3 — walks up the environment chain to find the nearest this binding.",
    ResolveThisBinding:
      "§9.4.4 — returns the current this value by calling GetThisEnvironment.",
    GetNewTarget:
      "§9.4.5 — returns new.target value from the nearest function environment.",
    GetGlobalObject:
      "§9.4.6 — returns the global object of the current Realm.",
  },
};

/** §9.3 — Realms */
export const REALMS = {
  spec: "§9.3",
  description:
    "A Realm consists of intrinsic objects, a global environment, and all ECMAScript code within that context. Each browser tab or worker has its own Realm.",
  components: {
    Intrinsics: "Built-in objects (Array, Object, Function, etc.) unique to this Realm.",
    GlobalObject: "The global object (window / globalThis).",
    GlobalEnv: "The GlobalEnvironmentRecord for this Realm.",
    TemplateMap: "Caches template literal tag objects.",
    LoadedModules: "Module cache for dynamic import().",
  },
  crossRealmNotes: [
    "instanceof can fail across Realms (e.g., array from iframe fails instanceof Array).",
    "Symbol.iterator from different Realms are distinct symbols.",
    "Each Realm has its own Error, Promise, Array constructors.",
  ],
};

/** §9.5 — Jobs and Host Operations */
export const JOBS = {
  spec: "§9.5",
  description:
    "A Job is a specification mechanism for representing work to be done. The host enqueues jobs; ECMAScript defines when and how they run.",

  jobTypes: {
    PromiseJob:
      "Scheduled via HostEnqueuePromiseJob. Corresponds to microtasks (Promise callbacks, async resumptions).",
    GenericJob:
      "Scheduled via HostEnqueueGenericJob. Implementation-defined.",
    TimeoutJob:
      "Scheduled via HostEnqueueTimeoutJob with milliseconds delay. Corresponds to setTimeout.",
  },

  jobCallbackRecord: {
    spec: "§9.5.1",
    description:
      "Wraps a callback function and the Realm in which it was created. Allows the host to propagate incumbent realm information.",
    fields: ["[[Callback]]", "[[HostDefined]]"],
  },

  keyRules: {
    RUN_TO_COMPLETION:
      "A job runs to completion before any other job starts. No preemption within a job.",
    PROMISE_JOBS_ARE_MICROTASKS:
      "Promise reaction jobs (then/catch/finally callbacks) are microtasks — they run before the next task.",
    TIMEOUT_JOBS_ARE_TASKS:
      "HostEnqueueTimeoutJob corresponds to the HTML macrotask queue (setTimeout/setInterval callbacks).",
  },
};

/** §9.6 — Agents */
export const AGENTS = {
  spec: "§9.6",
  description:
    "An Agent is an independent execution unit with its own execution context stack, memory, and job queues. Web Workers run in separate agents.",
  components: {
    LittleEndian: "Byte order for this agent.",
    CanBlock: "Whether this agent can block (SharedArrayBuffer.wait).",
    Signifier: "Unique identifier for this agent.",
    ExecutingThread: "The underlying thread.",
    KeptAlive: "Objects kept alive for WeakRef GC purposes.",
    AgentRecord: "Shared state across an agent cluster.",
  },
};

// ============================================================================
// SECTION 10: ORDINARY AND EXOTIC OBJECT BEHAVIORS
// ============================================================================

export const OBJECT_INTERNAL_METHODS = {
  spec: "§10.1",
  essentialMethods: {
    "[[GetPrototypeOf]]":
      "Returns the [[Prototype]] value. Ordinary: returns O.[[Prototype]].",
    "[[SetPrototypeOf]] (V)":
      "Sets [[Prototype]] to V. Fails if O is non-extensible or creates a cycle.",
    "[[IsExtensible]]":
      "Returns O.[[Extensible]]. Once false, cannot be set back to true.",
    "[[PreventExtensions]]":
      "Sets O.[[Extensible]] to false. Called by Object.freeze/seal/preventExtensions.",
    "[[GetOwnProperty]] (P)":
      "Returns the property descriptor for own property P, or undefined.",
    "[[DefineOwnProperty]] (P, Desc)":
      "Defines or modifies own property P with descriptor Desc.",
    "[[HasProperty]] (P)":
      "Returns true if P is an own or inherited property.",
    "[[Get]] (P, Receiver)":
      "Retrieves the value of property P. Receiver is used for getters.",
    "[[Set]] (P, V, Receiver)":
      "Stores value V in property P. Receiver is used for setters.",
    "[[Delete]] (P)":
      "Removes own property P. Returns false if non-configurable.",
    "[[OwnPropertyKeys]]":
      "Returns an array of all own property keys (integers first, then strings, then symbols).",
    "[[Call]] (thisArgument, argumentsList)":
      "Invokes the function. Only present on callable objects.",
    "[[Construct]] (argumentsList, newTarget)":
      "Creates and returns a new object. Only present on constructor functions.",
  },

  exoticObjects: {
    Array: {
      spec: "§10.4.2",
      description:
        "Overrides [[DefineOwnProperty]] to maintain 'length' integrity. Changing length deletes elements.",
      lengthInvariant:
        "Setting length < current length deletes excess elements. Elements beyond new length are removed.",
    },
    String: {
      spec: "§10.4.3",
      description:
        "Overrides [[GetOwnProperty]] to expose character indices as read-only data properties.",
      indexedProperties: "string[0], string[1], etc. are non-writable, non-configurable, enumerable.",
    },
    Arguments: {
      spec: "§10.4.4",
      description:
        "In non-strict functions, index properties may be live bindings to parameters (mapped arguments object).",
      strictVsNonStrict:
        "Strict mode functions get a simple unmapped arguments object; non-strict may have live parameter mapping.",
    },
    BoundFunction: {
      spec: "§10.4.1",
      description: "Result of Function.prototype.bind(). Wraps target with fixed thisArg and initial args.",
      slots: ["[[BoundTargetFunction]]", "[[BoundThis]]", "[[BoundArguments]]"],
    },
    Proxy: {
      spec: "§10.5",
      description:
        "Intercepts all 13 internal methods via handler traps. Enforces invariants.",
      traps: [
        "getPrototypeOf", "setPrototypeOf", "isExtensible", "preventExtensions",
        "getOwnPropertyDescriptor", "defineProperty", "has", "get", "set",
        "deleteProperty", "ownKeys", "apply", "construct",
      ],
    },
    TypedArray: {
      spec: "§10.4.5",
      description:
        "Fixed-length integer/float array backed by an ArrayBuffer. Overrides all property methods for numeric index handling.",
    },
    ModuleNamespace: {
      spec: "§10.4.6",
      description:
        "Read-only namespace for module exports. [[Set]] always returns false; exports cannot be mutated externally.",
    },
  },
};

// ============================================================================
// SECTION 12: LEXICAL GRAMMAR
// ============================================================================

export const LEXICAL_GRAMMAR = {
  spec: "§12",

  tokens: {
    identifierNames:
      "§12.7 — Unicode letters, digits, $, _, and some Unicode escapes. Cannot start with a digit.",
    keywords: [
      "await", "break", "case", "catch", "class", "const", "continue", "debugger",
      "default", "delete", "do", "else", "enum", "export", "extends", "false",
      "finally", "for", "function", "if", "import", "in", "instanceof", "let",
      "new", "null", "return", "static", "super", "switch", "this", "throw",
      "true", "try", "typeof", "var", "void", "while", "with", "yield",
    ],
    futureReserved: ["implements", "interface", "package", "private", "protected", "public"],
    literals: {
      null: "The literal null value.",
      boolean: "true and false literals.",
      numeric: "Decimal, hex (0x), octal (0o), binary (0b), BigInt (n suffix), separators (_).",
      string: "Single or double quoted, escape sequences (\\n \\t \\u{XXXX} etc.).",
      template: "Backtick strings with ${} interpolation.",
      regularExpression: "/pattern/flags — flags: d g i m s u v y",
    },
  },

  automaticSemicolonInsertion: {
    spec: "§12.10",
    description:
      "ASI inserts semicolons in certain contexts to allow optional semicolons in source.",
    rules: [
      "1. When a token cannot be parsed and there is a line terminator before it.",
      "2. When } is encountered where a statement is expected.",
      "3. At end of input if the program is otherwise invalid.",
    ],
    noASIBeforeThese: [
      "( — prevents line-initial ( from being treated as function call.",
      "[ — prevents line-initial [ from being treated as property access.",
      "` — prevents line-initial template from being treated as tagged template.",
    ],
    restrictedProductions: [
      "return [no LineTerminator here] Expression",
      "throw [no LineTerminator here] Expression",
      "break [no LineTerminator here] LabelIdentifier",
      "continue [no LineTerminator here] LabelIdentifier",
      "yield [no LineTerminator here] AssignmentExpression",
      "async [no LineTerminator here] function",
    ],
  },

  unicodeSupport: {
    sourceEncoding: "UTF-16",
    identifierEscapes: "Unicode escape sequences (\\uXXXX, \\u{XXXX}) allowed in identifiers.",
    regexpUnicode: "u and v flags enable Unicode-aware regex parsing.",
  },
};

// ============================================================================
// SECTION 13: EXPRESSIONS
// ============================================================================

export const EXPRESSION_SEMANTICS = {
  spec: "§13",

  primaryExpressions: {
    this: {
      spec: "§13.2.1",
      description:
        "Evaluates to the this binding of the current execution context via ResolveThisBinding().",
    },
    identifierReference: {
      spec: "§13.2.2",
      description:
        "Resolves to a Reference Record via ResolveBinding(). GetValue() is called to get the actual value.",
    },
    literals: {
      spec: "§13.2.3",
      description:
        "null, true, false, numbers, strings, and BigInts evaluate to their literal values.",
    },
    arrayInitializer: {
      spec: "§13.2.4",
      description:
        "Creates an Array exotic object. ArrayAccumulation evaluates each element/spread.",
      spreadBehavior: "...spread calls GetIterator() on the iterable and appends all values.",
    },
    objectInitializer: {
      spec: "§13.2.5",
      description:
        "Creates an ordinary object. PropertyDefinitionEvaluation for each property.",
      computedKeys: "Property keys in [] are evaluated as expressions via ToPropertyKey().",
      shorthandMethods: "method() {} — no [[Construct]], no prototype property.",
      getterSetter: "get p() {} / set p(v) {} — accessor descriptor.",
      spreadInObject: "...spread uses CopyDataProperties (own, enumerable properties only).",
    },
    templateLiteral: {
      spec: "§13.2.8",
      description:
        "Tagged templates call tag(strings, ...values). Untagged concatenate using ToString.",
      cookedVsRaw:
        "Tagged templates receive both cooked (escape-processed) and raw (as-written) strings.",
    },
  },

  operators: {
    memberAccess: {
      dotNotation: "obj.prop — ToPropertyKey('prop') then [[Get]].",
      bracketNotation: "obj[expr] — evaluates expr via ToPropertyKey() then [[Get]].",
      optionalChaining: "obj?.prop — returns undefined if obj is null/undefined, else normal access.",
    },
    callExpression: {
      spec: "§13.5",
      description:
        "Calls [[Call]] on the callee with evaluated arguments. Arguments are evaluated left-to-right.",
      newExpression: "new F() — calls [[Construct]] on F, creating a new object.",
      taggedTemplate: "fn`...` — fn called with (strings, ...values).",
    },
    optionalChaining: {
      spec: "§13.6",
      shortCircuit:
        "?. short-circuits the entire chain if base is null/undefined.",
      examples: ["a?.b", "a?.[b]", "a?.b.c.d", "a?.b?.c"],
    },
    updateExpressions: {
      "++x / x++": "Converts to Number via ToNumeric, increments, assigns back. Pre returns new; post returns old.",
      "--x / x--": "Same but decrements.",
    },
    unaryOperators: {
      delete: "§13.7.2 — deletes a property. Returns false if non-configurable. No-op on non-references.",
      void: "§13.7.3 — evaluates operand, returns undefined.",
      typeof: "§13.7.4 — returns string denoting type. Unique: does not throw for undeclared identifiers.",
      unaryPlus: "§13.7.5 — ToNumber(operand).",
      unaryMinus: "§13.7.6 — ToNumeric(operand) then negate.",
      bitwiseNot: "§13.7.7 — ToInt32 then bitwise NOT.",
      logicalNot: "§13.7.8 — ToBoolean then invert.",
    },
    exponentiation: {
      spec: "§13.8",
      operator: "**",
      rightAssociative: true,
      behavior: "Math.pow equivalent; delegates to Number::exponentiate or BigInt::exponentiate.",
    },
    arithmetic: {
      "+": "Add: if either operand is string (after ToPrimitive) → concatenation; else numeric add.",
      "-": "Subtract: ToNumeric both; Number or BigInt subtract.",
      "*": "ToNumeric both; multiply.",
      "/": "ToNumeric both; divide.",
      "%": "ToNumeric both; remainder (sign follows dividend).",
    },
    shift: {
      "<<": "ToInt32 left, ToUint32 right, left shift, return Int32.",
      ">>": "ToInt32 left, ToUint32 right, signed right shift.",
      ">>>": "ToUint32 both, unsigned right shift (result always non-negative).",
    },
    relational: {
      "<": "IsLessThan(x, y, true). Strings compared lexicographically; numbers numerically.",
      ">": "IsLessThan(y, x, false).",
      "<=": "IsLessThan(y, x, false) — NOT greater than.",
      ">=": "IsLessThan(x, y, true) — NOT less than.",
      in: "HasProperty(rval, ToPropertyKey(lval)).",
      instanceof: "OrdinaryHasInstance — walks prototype chain of lval checking against rval.prototype.",
    },
    equality: {
      "==": "IsLooselyEqual — type coercion allowed.",
      "!=": "Negation of IsLooselyEqual.",
      "===": "IsStrictlyEqual — no coercion, NaN !== NaN, +0 === -0.",
      "!==": "Negation of IsStrictlyEqual.",
    },
    bitwise: {
      "&": "ToInt32 both, bitwise AND, return Int32.",
      "^": "ToInt32 both, bitwise XOR, return Int32.",
      "|": "ToInt32 both, bitwise OR, return Int32.",
    },
    logical: {
      "&&": "Evaluate left. If falsy, return left value (short-circuit). Else evaluate and return right.",
      "||": "Evaluate left. If truthy, return left value (short-circuit). Else evaluate and return right.",
      "??": "Evaluate left. If null or undefined, evaluate and return right. Else return left (any truthy OR falsy non-nullish).",
      "&&=": "x &&= y  ≡  x && (x = y) — only assigns if x is truthy.",
      "||=": "x ||= y  ≡  x || (x = y) — only assigns if x is falsy.",
      "??=": "x ??= y  ≡  x ?? (x = y) — only assigns if x is null/undefined.",
    },
    conditional: {
      "?:": "condition ? consequent : alternate — evaluates condition to boolean; only one branch is evaluated.",
    },
    assignment: {
      "=": "PutValue(lref, rval). Lref must be a valid assignment target.",
      compoundAssignment:
        "op= shorthand: reads current value, applies op, assigns back (e.g., x += y is x = x + y).",
      destructuringAssignment:
        "[a, b] = arr or {x, y} = obj — uses iterator/property protocol.",
    },
    comma: {
      description:
        "Evaluates left operand (result discarded), then evaluates and returns right operand.",
    },
    spread: {
      "...": "In function calls, spreads iterable into argument list. In array/object literals, spreads values.",
    },
  },
};

// ============================================================================
// SECTION 14: STATEMENTS AND DECLARATIONS
// ============================================================================

export const STATEMENT_SEMANTICS = {
  spec: "§14",

  declarations: {
    var: {
      scope: "Function or global (never block). Hoisted to the top of the function.",
      hoisting: "Declaration hoisted; initialization NOT hoisted (stays undefined until assignment).",
      canRedeclare: true,
      functionScoped: true,
      TDZ: false,
    },
    let: {
      scope: "Block (between { and }).",
      hoisting: "Hoisted to block top but in Temporal Dead Zone until declaration is reached.",
      canRedeclare: false,
      TDZ: true,
      TDZError: "ReferenceError when accessed before declaration.",
    },
    const: {
      scope: "Block.",
      hoisting: "Hoisted to block top but in Temporal Dead Zone.",
      canRedeclare: false,
      TDZ: true,
      mustInitialize: true,
      reassignmentError: "TypeError when attempting to reassign.",
      note: "The binding is immutable but the value is not (objects can be mutated).",
    },
    functionDeclaration: {
      scope: "Function or global.",
      hoisting: "Both declaration AND definition are hoisted. Available throughout the scope.",
      blockScoped: "In strict mode (or modules), function declarations inside blocks are block-scoped.",
    },
    classDeclaration: {
      scope: "Block.",
      TDZ: true,
      note: "Unlike function declarations, class declarations are NOT hoisted with their definition.",
    },
  },

  blockStatement: {
    spec: "§14.2",
    description:
      "Creates a new DeclarativeEnvironmentRecord. let/const/class declarations are scoped to this block.",
    completionValue:
      "The last evaluated statement's value, or undefined for empty block.",
  },

  ifStatement: {
    spec: "§14.6",
    algorithm: [
      "1. Evaluate condition expression.",
      "2. ToBoolean(result).",
      "3. If true, evaluate consequent; else evaluate alternate (if present).",
    ],
  },

  iterationStatements: {
    while: {
      spec: "§14.7.3",
      algorithm:
        "1. Evaluate condition. 2. ToBoolean. 3. If false, return. 4. Execute body. 5. Handle break/continue. 6. Goto 1.",
    },
    doWhile: {
      spec: "§14.7.2",
      algorithm:
        "1. Execute body. 2. Handle break/continue. 3. Evaluate condition. 4. ToBoolean. 5. If false, return. 6. Goto 1.",
      note: "Body always executes at least once.",
    },
    forStatement: {
      spec: "§14.7.4",
      algorithm: [
        "1. If init has let/const, create new per-iteration scope.",
        "2. Evaluate init expression.",
        "3. Evaluate test expression; if false, return.",
        "4. Execute body.",
        "5. Handle break/continue.",
        "6. Evaluate update expression.",
        "7. Goto 3.",
      ],
      perIterationScope:
        "let/const in for-init creates a new binding copy per iteration (important for closures).",
    },
    forIn: {
      spec: "§14.7.5.6",
      iterates: "Enumerable string-keyed own and inherited properties.",
      order: "Not guaranteed by spec but most engines use insertion order.",
      caveats: [
        "Skips symbol keys.",
        "Includes inherited enumerable properties.",
        "Adding/deleting properties during iteration has undefined behavior.",
      ],
    },
    forOf: {
      spec: "§14.7.5.9",
      iterates: "Any iterable (objects with Symbol.iterator).",
      protocol:
        "Calls GetIterator(), then repeatedly IteratorStep() and IteratorValue().",
      cleanup:
        "If loop exits abnormally (break/throw), calls IteratorClose() to invoke iterator.return().",
    },
    forAwaitOf: {
      spec: "§14.7.5.10",
      description:
        "Like for-of but calls AsyncIteratorClose and awaits each IteratorNext() result.",
      context: "Only valid inside async functions or the top level of async modules.",
    },
  },

  switchStatement: {
    spec: "§14.12",
    algorithm: [
      "1. Evaluate discriminant.",
      "2. Scan cases using IsStrictlyEqual for match.",
      "3. If match found, execute from that case (falling through subsequent cases).",
      "4. If no match, execute default clause (if present).",
      "5. break statement exits the switch.",
    ],
    fallthrough:
      "Without break, execution continues into next case clause.",
  },

  jumpStatements: {
    break: {
      spec: "§14.9",
      description:
        "Produces a Completion Record of type break. With label, exits labeled statement.",
    },
    continue: {
      spec: "§14.10",
      description:
        "Produces a Completion Record of type continue. Skips remaining loop body; goes to update/condition.",
    },
    return: {
      spec: "§14.11",
      description:
        "Produces a return Completion Record. Without expression, value is undefined.",
    },
  },

  throwStatement: {
    spec: "§14.13",
    description:
      "Produces a throw Completion Record. The thrown value propagates up the call stack until caught.",
  },

  tryCatchFinally: {
    spec: "§14.15",
    algorithm: [
      "1. Execute try block.",
      "2. If throw completion: execute catch block (if present) with exception bound.",
      "3. Execute finally block regardless of try/catch outcome.",
      "4. If finally produces normal completion: return try/catch result.",
      "5. If finally produces abrupt completion (return/throw/break): THAT overrides the try/catch result.",
    ],
    finallyOverride:
      "CRITICAL: A return or throw in finally REPLACES any earlier return/throw from try/catch.",
    catchBinding: "The caught exception is bound in a new DeclarativeEnvironmentRecord within the catch block.",
  },

  labeledStatement: {
    spec: "§14.14",
    description:
      "Labels a statement for use with labeled break/continue. Primarily used with nested loops.",
  },

  debuggerStatement: {
    spec: "§14.16",
    description:
      "Host-defined behavior. Typically triggers a debugger breakpoint if developer tools are active; otherwise no effect.",
  },

  withStatement: {
    spec: "§14.11",
    deprecated: true,
    description:
      "Creates an ObjectEnvironmentRecord from the given object. Forbidden in strict mode.",
  },
};

// ============================================================================
// SECTION 15: FUNCTIONS AND CLASSES
// ============================================================================

export const FUNCTION_SEMANTICS = {
  spec: "§15",

  functionDeclaration: {
    description:
      "Creates a function object bound to an identifier in the enclosing scope.",
    hoisted: "Yes — both binding and value are hoisted.",
    executionSteps: [
      "1. OrdinaryFunctionCreate — allocates the function object with code, parameters, closure environment.",
      "2. SetFunctionName — sets .name property.",
      "3. MakeConstructor — adds .prototype property (with constructor back-reference).",
      "4. Binds the name in the current environment via CreateGlobalFunctionBinding or CreateMutableBinding.",
    ],
  },

  functionExpression: {
    description:
      "Creates a function object. Name is optional and scoped to the function body for recursion.",
    namedFunctionExpression:
      "The name is created in a new scope wrapping the function body, binding the function to itself.",
    anonymousFunctionExpression:
      "Name inferred from assignment target by NamedEvaluation operation.",
  },

  arrowFunction: {
    description:
      "Shorter syntax; lexically captures 'this' from surrounding scope.",
    differences: [
      "No own 'this' binding — uses enclosing context's 'this'.",
      "No 'arguments' object.",
      "Cannot be used as a constructor (no [[Construct]], no prototype).",
      "No 'super' binding of its own.",
      "Cannot use yield (unless inside a generator arrow — not allowed).",
    ],
    thisMode: "lexical",
    conciseBody:
      "Single expression without braces implicitly returns the expression value.",
  },

  generatorFunction: {
    spec: "§15.5",
    description:
      "Returns a Generator iterator. Body is NOT executed immediately.",
    returnValue: "A Generator object conforming to both iterator and iterable protocols.",
    executionModel: [
      "Calling the generator function creates a Generator in 'suspended-start' state.",
      "Calling .next() starts/resumes execution until next yield or return.",
      "yield expr suspends the generator, returning {value: expr, done: false}.",
      "return expr (or end of body) completes the generator, returning {value: expr, done: true}.",
      "Subsequent calls after completion return {value: undefined, done: true}.",
    ],
    generatorStates: [
      "suspended-start: created, not yet started",
      "executing: currently running",
      "suspended-yield: paused at yield",
      "completed: finished (return or exception)",
    ],
    nextArgument:
      "The value passed to .next(val) becomes the result of the yield expression inside the generator.",
    throwMethod:
      ".throw(err) injects an exception at the suspension point.",
    returnMethod:
      ".return(val) forces the generator to return val and enter completed state (runs finally blocks).",
  },

  asyncFunction: {
    spec: "§15.8",
    description:
      "Always returns a Promise. Syntax sugar over Promise chains.",
    executionModel: [
      "1. A new Promise is created for the async function's result.",
      "2. The function body begins executing synchronously.",
      "3. When 'await expr' is reached, Promise.resolve(expr) is called.",
      "4. If the result is pending, the function suspends (execution context suspended).",
      "5. When the awaited promise settles, a microtask is enqueued to resume the function.",
      "6. The function resumes with the resolved value (or throws the rejection reason).",
      "7. When the body completes, the outer promise is resolved/rejected.",
    ],
    awaitEquivalent:
      "await x is roughly Promise.resolve(x).then(continuation), but with proper this binding.",
    topLevelAwait:
      "Allowed in module scope (makes the module evaluation a Promise).",
    errorPropagation:
      "An uncaught throw inside async functions rejects the returned Promise.",
  },

  asyncGeneratorFunction: {
    spec: "§15.6",
    description:
      "Combines async and generator. Each .next() call returns a Promise<{value, done}>.",
    protocol: "AsyncIterator — callers await the promise returned by each .next().",
    forAwaitOf:
      "Designed to be consumed by 'for await...of' loops.",
  },

  classSyntax: {
    spec: "§15.7",
    description:
      "Syntactic sugar over prototype-based inheritance with better syntax for private members.",
    classDeclarationEvaluation: [
      "1. Create class constructor function (MakeClassConstructor).",
      "2. Set up prototype chain (class.prototype = Object.create(superclass.prototype)).",
      "3. Define prototype methods via DefineMethodProperty.",
      "4. Define static methods on the class constructor.",
      "5. Execute class fields initializers and static blocks.",
      "6. Bind class name in environment.",
    ],
    constructor: {
      description: "Called by 'new ClassName()'. Must call super() before accessing 'this' in subclasses.",
      defaultConstructor: "Implicitly added if not defined. Calls super(...args) for subclasses.",
    },
    inheritance: {
      extends: "Sets the prototype chain: DerivedClass.prototype.__proto__ = BaseClass.prototype.",
      super: {
        constructorCall: "super() — calls superclass [[Construct]]. Assigns this in derived class.",
        propertyAccess: "super.method() — looks up method on parent prototype.",
      },
    },
    classFields: {
      instanceFields: "Initialized in the constructor after super() returns, before user code.",
      staticFields: "Initialized during ClassDefinitionEvaluation after prototype methods.",
      privateFields:
        "#name — stored in a PrivateEnvironment. Only accessible within the class body.",
      privateMethodsAndAccessors:
        "Added via PrivateMethodOrAccessorAdd. Cannot be deleted. Shared across instances.",
    },
    staticBlocks: {
      spec: "§15.7.1.3",
      description:
        "static { ... } blocks execute once during class evaluation. Can access private members.",
    },
    classExpressions: "Like class declarations but can be unnamed or assigned.",
  },

  functionCallMechanics: {
    PrepareForOrdinaryCall: [
      "1. Create a new ExecutionContext.",
      "2. Set its Realm, Function, Code, and LexicalEnvironment.",
      "3. If F.[[ThisMode]] is lexical (arrow), copy outer this.",
      "4. Push context onto execution context stack.",
    ],
    OrdinaryCallBindThis: [
      "1. For strict or arrow functions: use thisArgument as-is.",
      "2. For sloppy mode non-arrow: null/undefined → globalThis; primitives → boxed.",
    ],
    FunctionDeclarationInstantiation: [
      "1. Create arguments object (mapped for non-strict, unmapped for strict/arrow).",
      "2. For each parameter: CreateMutableBinding in function env.",
      "3. For each 'var' declaration: CreateMutableBinding if not already bound.",
      "4. Hoist function declarations: CreateMutableBinding + InitializeBinding with function value.",
      "5. Bind 'arguments' in the environment (non-arrow, non-strict).",
    ],
  },
};

// ============================================================================
// SECTION 16: SCRIPTS AND MODULES
// ============================================================================

export const MODULE_SEMANTICS = {
  spec: "§16",

  scriptVsModule: {
    script: {
      description: "Classic <script> tag execution. 'this' at top level is the global object.",
      strictMode: "opt-in via 'use strict' directive.",
      variableScope: "var declarations become global properties.",
    },
    module: {
      description: "ES module. Has its own scope; top-level is module scope.",
      strictMode: "Always strict.",
      variableScope: "var/let/const are module-scoped, not global properties.",
      topLevelAwait: "Allowed; module evaluation becomes async.",
      importMetaUrl: "import.meta.url provides the module's URL.",
    },
  },

  importDeclarations: {
    namedImport: "import { x, y } from 'mod' — live read-only bindings to exports.",
    defaultImport: "import x from 'mod' — binds the 'default' export.",
    namespaceImport: "import * as ns from 'mod' — Module Namespace Object (immutable).",
    sideEffectImport: "import 'mod' — executes module with no bindings.",
    dynamicImport: "import('mod') — returns a Promise<ModuleNamespace>. Can be conditional.",
    liveBindings:
      "CRITICAL: Named imports are live bindings. If the exporting module updates the export, the importing module sees the update.",
  },

  exportDeclarations: {
    namedExport: "export { x, y }",
    defaultExport: "export default expr — creates the 'default' export.",
    reExport: "export { x } from 'mod' — re-export without importing locally.",
    namespaceReExport: "export * from 'mod' — re-export all named exports.",
    namespaceAsExport: "export * as ns from 'mod'",
  },

  moduleLoadingPhases: {
    parsing: "Parse source text into SourceTextModuleRecord.",
    linking:
      "Walk dependency graph. Resolve all imports to exports. Create module environments.",
    evaluation:
      "Execute module bodies in topological order (dependencies first). Cyclic modules are handled carefully.",
    cyclicModules:
      "Cyclic imports are allowed. When cycle is detected, partially-evaluated module is used; bindings are live.",
  },

  moduleRecords: {
    SourceTextModuleRecord:
      "Contains parsed AST, import/export entries, and evaluation state.",
    CyclicModuleRecord:
      "Abstract type for modules that participate in cycles. Tracks status (new, unlinked, linking, linked, evaluating, evaluated, errored).",
    evaluationStatus: [
      "new — created but not yet linked.",
      "unlinked — linking not yet started.",
      "linking — currently being linked (cycle detection).",
      "linked — ready to evaluate.",
      "evaluating — currently evaluating.",
      "evaluated — evaluation complete.",
      "errored — evaluation threw an error.",
    ],
  },
};

// ============================================================================
// SECTION 18: THE GLOBAL OBJECT
// ============================================================================

export const GLOBAL_OBJECT = {
  spec: "§18",

  valueProperties: {
    globalThis: "The global 'this' value — the global object itself.",
    Infinity: "IEEE 754 positive infinity. Same as Number.POSITIVE_INFINITY.",
    NaN: "IEEE 754 NaN. Same as Number.NaN.",
    undefined: "The Undefined type's only value. Read-only.",
  },

  functionProperties: {
    eval: {
      description: "Parses and executes a string as JavaScript code.",
      directEval:
        "eval() called directly uses the current scope (can see local variables).",
      indirectEval:
        "(0,eval)() or globalThis.eval() runs in global scope with no local variable access.",
      strictMode: "In strict mode, direct eval has its own Variable Environment.",
    },
    isFinite: "Returns true if the argument converts to a finite number (not NaN, +/-Infinity).",
    isNaN: "Returns true if the argument converts to NaN. Prefer Number.isNaN for strict check.",
    parseFloat: "Parses a string to a floating-point number. Stops at first invalid character.",
    parseInt: "Parses a string to an integer. Supports radix 2-36.",
    decodeURI: "Decodes URI components (does not decode reserved characters like /,?,=).",
    decodeURIComponent: "Decodes all percent-encoded sequences including reserved characters.",
    encodeURI: "Encodes a URI, preserving reserved characters.",
    encodeURIComponent: "Encodes a URI component, encoding all special characters.",
  },

  constructors: [
    "AggregateError", "Array", "ArrayBuffer", "BigInt", "BigInt64Array",
    "BigUint64Array", "Boolean", "DataView", "Date", "Error", "EvalError",
    "FinalizationRegistry", "Float32Array", "Float64Array", "Function",
    "Int16Array", "Int32Array", "Int8Array", "Iterator", "Map", "Number",
    "Object", "Promise", "Proxy", "RangeError", "ReferenceError", "RegExp",
    "Set", "SharedArrayBuffer", "String", "Symbol", "SyntaxError",
    "TypeError", "URIError", "Uint16Array", "Uint32Array", "Uint8Array",
    "Uint8ClampedArray", "WeakMap", "WeakRef", "WeakSet",
  ],

  otherObjects: [
    "Atomics", "JSON", "Math", "Reflect",
  ],
};

// ============================================================================
// SECTION 19: FUNDAMENTAL OBJECTS
// ============================================================================

export const FUNDAMENTAL_OBJECTS = {
  Object: {
    spec: "§19.1",
    staticMethods: {
      "Object.assign(target, ...sources)":
        "Copies own enumerable properties from each source to target. Shallow. Returns target.",
      "Object.create(proto, propertiesObj)":
        "Creates a new object with given prototype. propertiesObj uses defineProperties format.",
      "Object.defineProperty(obj, prop, descriptor)":
        "Defines or modifies a property. descriptor is {value, writable, enumerable, configurable, get, set}.",
      "Object.defineProperties(obj, props)":
        "Defines multiple properties at once.",
      "Object.entries(obj)":
        "Returns [[key, value]] pairs of own enumerable string-keyed properties. Same order as for-in.",
      "Object.freeze(obj)":
        "Prevents adding/deleting properties and makes all data properties non-writable. Shallow.",
      "Object.fromEntries(iterable)":
        "Inverse of Object.entries. Creates object from [[key, value]] pairs.",
      "Object.getOwnPropertyDescriptor(obj, prop)":
        "Returns the property descriptor for an own property, or undefined.",
      "Object.getOwnPropertyDescriptors(obj)":
        "Returns an object of all own property descriptors.",
      "Object.getOwnPropertyNames(obj)":
        "Returns array of own string property names (including non-enumerable). No symbols.",
      "Object.getOwnPropertySymbols(obj)":
        "Returns array of own symbol property keys.",
      "Object.getPrototypeOf(obj)":
        "Returns [[Prototype]] of obj. Throws TypeError for non-object in strict.",
      "Object.hasOwn(obj, prop)":
        "ES2022. Returns true if obj has own property prop. Preferred over obj.hasOwnProperty().",
      "Object.is(x, y)":
        "SameValue comparison: like === but NaN === NaN is true, +0 !== -0.",
      "Object.isFrozen(obj)":
        "Returns true if no properties can be added/removed/changed.",
      "Object.isSealed(obj)":
        "Returns true if no properties can be added/removed (values may change).",
      "Object.keys(obj)":
        "Returns array of own enumerable string property keys. Same order as for-in.",
      "Object.preventExtensions(obj)":
        "Prevents adding new properties. Existing can still be modified/deleted.",
      "Object.seal(obj)":
        "Prevents adding/removing properties; makes all configurable: false. Values can change.",
      "Object.setPrototypeOf(obj, proto)":
        "Sets [[Prototype]] of obj to proto. Throws if would create a cycle.",
      "Object.values(obj)":
        "Returns array of own enumerable property values.",
    },
    prototypeProperties: {
      hasOwnProperty: "Returns true if the property is an own property (not inherited).",
      isPrototypeOf: "Returns true if this object is in the prototype chain of the argument.",
      propertyIsEnumerable: "Returns true if the property is own and enumerable.",
      toString: "Returns a string like '[object ClassName]'. Used by template literals and concatenation.",
      valueOf: "Returns the primitive value of the object. Default returns the object itself.",
      toLocaleString: "Locale-aware string representation.",
    },
  },

  Function: {
    spec: "§19.2",
    staticMethods: {
      "Function(...)": "Dynamic function constructor. Creates a function from string arguments.",
    },
    prototypeProperties: {
      apply: "fn.apply(thisArg, argsArray) — calls fn with given thisArg and spread arguments.",
      bind:
        "fn.bind(thisArg, ...args) — returns a new BoundFunction with fixed thisArg and initial arguments.",
      call: "fn.call(thisArg, ...args) — calls fn with given thisArg and arguments.",
      toString:
        "Returns source text representation of the function (or '[native code]').",
      length: "Number of formal parameters (excluding rest params and defaults).",
      name: "Inferred or explicit function name.",
    },
  },

  Boolean: {
    spec: "§19.3",
    description:
      "Constructor for Boolean wrapper objects. Rarely used directly; prefer primitives.",
    note: "new Boolean(false) is TRUTHY as an object! Use Boolean(x) without new for type conversion.",
  },

  Symbol: {
    spec: "§19.4",
    description:
      "Unique, non-string property keys. Cannot be created with new Symbol().",
    globalRegistry: {
      "Symbol.for(key)":
        "Searches global registry by key. Creates if not found. Cross-realm shared.",
      "Symbol.keyFor(symbol)":
        "Returns the key for a symbol in the global registry, or undefined.",
    },
    description_property:
      "symbol.description — the optional string description from Symbol(description).",
    coercibility:
      "Cannot be coerced to strings or numbers. Explicit String(symbol) works.",
  },

  Error: {
    spec: "§19.5",
    errorTypes: {
      Error: "Base error type.",
      EvalError: "Deprecated. Was for misuse of eval().",
      RangeError: "Number is outside of its valid range (e.g., array length < 0, toFixed with negative digits).",
      ReferenceError:
        "Reference to an undeclared variable in strict mode, or TDZ access.",
      SyntaxError:
        "Malformed code at parse time (thrown by eval() or thrown internally).",
      TypeError:
        "Most common. Value is not of the expected type (calling non-function, accessing null/undefined property, etc.).",
      URIError:
        "malformed URI sequence in encodeURI/decodeURI.",
      AggregateError:
        "§19.5.7. Wraps multiple errors. Used by Promise.any when all promises reject.",
    },
    properties: {
      message: "Human-readable description of the error.",
      name: "Error type name ('TypeError', etc.).",
      stack: "Non-standard but universally supported stack trace string.",
      cause: "ES2022. Optional error that caused this one: new Error('msg', {cause: originalErr}).",
    },
  },
};

// ============================================================================
// SECTION 20: NUMBERS AND DATES
// ============================================================================

export const NUMBERS_AND_DATES = {
  Number: {
    spec: "§20.1",
    constants: {
      "Number.EPSILON": "2^-52 ≈ 2.22e-16. Smallest difference between 1 and the next representable number.",
      "Number.MAX_SAFE_INTEGER": "2^53 - 1 = 9007199254740991. Integers above this lose precision.",
      "Number.MIN_SAFE_INTEGER": "-(2^53 - 1).",
      "Number.MAX_VALUE": "Largest finite IEEE 754 number ≈ 1.79e+308.",
      "Number.MIN_VALUE": "Smallest positive non-zero number ≈ 5e-324.",
      "Number.POSITIVE_INFINITY": "+∞",
      "Number.NEGATIVE_INFINITY": "-∞",
      "Number.NaN": "Not-a-Number.",
    },
    staticMethods: {
      "Number.isFinite(x)":
        "Returns true if x is a finite Number. Does NOT convert; Number.isFinite('5') is false.",
      "Number.isInteger(x)":
        "Returns true if x is a finite integer.",
      "Number.isNaN(x)":
        "Returns true only if x is the NaN value. Does not convert. Prefer over global isNaN().",
      "Number.isSafeInteger(x)":
        "Returns true if x is an integer in [-MAX_SAFE_INTEGER, MAX_SAFE_INTEGER].",
      "Number.parseFloat(string)": "Same as global parseFloat.",
      "Number.parseInt(string, radix)": "Same as global parseInt.",
    },
    prototypeProperties: {
      toFixed: "Returns string with fixed decimal places (rounds, may use scientific notation for large).",
      toExponential: "Returns string in exponential notation.",
      toPrecision: "Returns string with specified number of significant digits.",
      toString: "Returns string representation. Optional radix (2-36).",
    },
  },

  BigInt: {
    spec: "§20.2",
    description: "Arbitrary-precision integers. Suffix n. Cannot be mixed with Number arithmetic.",
    staticMethods: {
      "BigInt.asIntN(n, x)": "Returns x as a signed n-bit integer (wraps around).",
      "BigInt.asUintN(n, x)": "Returns x as an unsigned n-bit integer.",
    },
    comparisonWithNumber: "BigInt and Number can be compared with < > <= >= == but not === without conversion.",
  },

  Math: {
    spec: "§20.3",
    constants: {
      "Math.E": "Euler's number ≈ 2.718",
      "Math.PI": "π ≈ 3.14159",
      "Math.LN2": "Natural log of 2 ≈ 0.693",
      "Math.LN10": "Natural log of 10 ≈ 2.303",
      "Math.LOG2E": "log2(e) ≈ 1.443",
      "Math.LOG10E": "log10(e) ≈ 0.434",
      "Math.SQRT2": "√2 ≈ 1.414",
      "Math.SQRT1_2": "√(1/2) ≈ 0.707",
    },
    methods: {
      "Math.abs(x)": "Absolute value.",
      "Math.ceil(x)": "Rounds up to nearest integer.",
      "Math.floor(x)": "Rounds down to nearest integer.",
      "Math.round(x)": "Rounds to nearest integer (ties round toward +∞).",
      "Math.trunc(x)": "Removes fractional part (truncates toward 0).",
      "Math.sign(x)": "Returns -1, 0, or 1.",
      "Math.max(...values)": "Returns the largest value. Returns -Infinity for no args.",
      "Math.min(...values)": "Returns the smallest value. Returns +Infinity for no args.",
      "Math.pow(base, exp)": "base ** exp. Note: Math.pow(NaN, 0) === 1.",
      "Math.sqrt(x)": "Square root. NaN for negative.",
      "Math.cbrt(x)": "Cube root.",
      "Math.hypot(...values)": "√(sum of squares). Avoids overflow.",
      "Math.random()": "Returns [0, 1) uniform random. Not cryptographically secure.",
      "Math.log(x)": "Natural logarithm (base e). NaN for negative.",
      "Math.log2(x)": "Base-2 logarithm.",
      "Math.log10(x)": "Base-10 logarithm.",
      "Math.exp(x)": "e^x.",
      "Math.sin/cos/tan": "Trigonometric functions (radians).",
      "Math.asin/acos/atan": "Inverse trigonometric (radians).",
      "Math.atan2(y, x)": "Angle from positive x-axis to (x,y) in radians.",
      "Math.sinh/cosh/tanh": "Hyperbolic functions.",
      "Math.clz32(x)": "Count leading zeros in 32-bit binary representation.",
      "Math.imul(a, b)": "C-like 32-bit multiplication.",
      "Math.fround(x)": "Rounds to nearest 32-bit float.",
    },
  },

  Date: {
    spec: "§20.4",
    description:
      "Represents a single moment in time as milliseconds since 1970-01-01T00:00:00Z (Unix epoch).",
    staticMethods: {
      "Date.now()": "Returns current time as milliseconds since epoch.",
      "Date.parse(string)": "Parses a date string. Returns milliseconds. Behavior is implementation-dependent for non-ISO formats.",
      "Date.UTC(year, month, ...)": "Returns milliseconds for the UTC date.",
    },
    prototypeProperties: {
      getFullYear: "Local year (4-digit).",
      getMonth: "Local month (0-11).",
      getDate: "Local day of month (1-31).",
      getDay: "Local day of week (0=Sunday).",
      getHours: "Local hours (0-23).",
      getMinutes: "Local minutes (0-59).",
      getSeconds: "Local seconds (0-59).",
      getMilliseconds: "Local milliseconds (0-999).",
      getTime: "Milliseconds since epoch (UTC).",
      getTimezoneOffset: "Difference in minutes between UTC and local time.",
      toISOString: "Returns ISO 8601 string (UTC): '2024-01-01T00:00:00.000Z'.",
      toLocaleDateString: "Locale-aware date string.",
      toJSON: "Returns toISOString().",
    },
  },
};

// ============================================================================
// SECTION 21: TEXT PROCESSING
// ============================================================================

export const TEXT_PROCESSING = {
  String: {
    spec: "§21.1",
    staticMethods: {
      "String.fromCharCode(...codes)": "Creates string from UTF-16 code units.",
      "String.fromCodePoint(...codePoints)": "Creates string from Unicode code points. Handles supplementary characters.",
      "String.raw(template, ...substitutions)": "Template tag that returns raw (non-escape-processed) string.",
    },
    prototypeProperties: {
      at: "Returns character at index. Negative indices count from end.",
      charAt: "Returns character at index (empty string if out of range).",
      charCodeAt: "Returns UTF-16 code unit at index.",
      codePointAt: "Returns full Unicode code point at position (handles surrogate pairs).",
      concat: "Concatenates strings. + operator is generally preferred.",
      endsWith: "Returns true if string ends with searchString.",
      includes: "Returns true if string contains searchString.",
      indexOf: "First index of searchString, or -1.",
      lastIndexOf: "Last index of searchString, or -1.",
      match: "Matches against a RegExp. Returns array or null.",
      matchAll: "Returns iterator of all matches (requires /g flag).",
      normalize: "Unicode normalization (NFC/NFD/NFKC/NFKD).",
      padEnd: "Pads string to target length with pad string on the right.",
      padStart: "Pads string to target length with pad string on the left.",
      repeat: "Returns string repeated n times.",
      replace: "Replaces first match (or all if /g) with replacement string or function.",
      replaceAll: "Replaces all occurrences. Requires /g flag or string pattern.",
      search: "Returns index of first RegExp match, or -1.",
      slice: "Returns substring. Negative indices count from end.",
      split: "Splits by separator into array. RegExp separator supported.",
      startsWith: "Returns true if string starts with searchString.",
      substring: "Returns substring between two indices. Negative → 0.",
      toLowerCase: "Returns string in lower case (locale-independent).",
      toUpperCase: "Returns string in upper case.",
      toLocaleLowerCase: "Lower case using locale rules.",
      toLocaleUpperCase: "Upper case using locale rules.",
      trim: "Removes leading and trailing whitespace.",
      trimEnd: "Removes trailing whitespace.",
      trimStart: "Removes leading whitespace.",
    },
  },

  RegExp: {
    spec: "§21.2",
    flags: {
      d: "hasIndices — include start/end indices of each match.",
      g: "global — find all matches, not just first.",
      i: "ignoreCase — case-insensitive matching.",
      m: "multiline — ^ and $ match start/end of each line.",
      s: "dotAll — . matches newlines too.",
      u: "unicode — enables full Unicode matching (code points, not code units).",
      v: "unicodeSets — enhanced Unicode set notation (superset of u flag).",
      y: "sticky — matches starting at lastIndex only.",
    },
    methods: {
      exec: "Returns array of match details + index, or null. Stateful with /g flag.",
      test: "Returns boolean for whether pattern matches. Stateful with /g flag.",
    },
    patterns: {
      "Special characters": "\\d digit, \\w word char, \\s whitespace, \\b word boundary.",
      "Quantifiers": "* (0+), + (1+), ? (0 or 1), {n}, {n,}, {n,m}.",
      "Greedy vs Lazy": "* is greedy; *? is lazy (minimal match).",
      "Groups": "(pattern) capturing group, (?:pattern) non-capturing, (?<name>pattern) named.",
      "Lookahead": "(?=pattern) positive, (?!pattern) negative.",
      "Lookbehind": "(?<=pattern) positive, (?<!pattern) negative.",
      "Backreferences": "\\1 or \\k<name> refers to captured group.",
    },
  },
};

// ============================================================================
// SECTION 22: INDEXED COLLECTIONS
// ============================================================================

export const INDEXED_COLLECTIONS = {
  Array: {
    spec: "§22.1",
    creation: {
      "Array.from(iterable, mapFn)": "Creates from iterable or array-like. Optional map function.",
      "Array.of(...items)": "Creates array from arguments (unlike Array(n) which creates sparse array).",
      "Array.isArray(value)": "true for Array exotic objects.",
      "[]": "Array literal — most common.",
    },
    mutatingMethods: {
      push: "Appends elements, returns new length.",
      pop: "Removes and returns last element. O(1).",
      unshift: "Prepends elements, returns new length. O(n).",
      shift: "Removes and returns first element. O(n).",
      splice: "Removes/inserts elements at index. Modifies in place. Returns removed elements.",
      sort: "Sorts in place. Default: lexicographic. Provide compareFn(a,b) → negative/0/positive.",
      reverse: "Reverses in place.",
      fill: "Fills range with value.",
      copyWithin: "Copies part of array to another location within the same array.",
    },
    nonMutatingMethods: {
      at: "Returns element at index. Negative counts from end.",
      concat: "Returns new array with elements appended.",
      entries: "Returns iterator of [index, value] pairs.",
      every: "Returns true if predicate returns true for all elements.",
      filter: "Returns new array of elements where predicate returns truthy.",
      find: "Returns first element where predicate returns truthy, else undefined.",
      findIndex: "Returns index of first matching element, else -1.",
      findLast: "Returns last element where predicate returns truthy.",
      findLastIndex: "Returns index of last matching element, else -1.",
      flat: "Flattens nested arrays by specified depth (default 1).",
      flatMap: "map followed by flat(1). Returns new array.",
      forEach: "Calls callback for each element. Returns undefined.",
      includes: "Returns true if array contains value (uses SameValueZero).",
      indexOf: "Returns first index of value (uses IsStrictlyEqual), else -1.",
      join: "Joins elements into string with separator (default ',').",
      keys: "Returns iterator of indices.",
      lastIndexOf: "Returns last index of value, else -1.",
      map: "Returns new array of transformed elements.",
      reduce: "Accumulates a single value left-to-right.",
      reduceRight: "Accumulates right-to-left.",
      slice: "Returns shallow copy of a portion.",
      some: "Returns true if predicate returns truthy for any element.",
      toReversed: "Returns new reversed array (non-mutating version of reverse).",
      toSorted: "Returns new sorted array (non-mutating version of sort).",
      toSpliced: "Returns new array with splice applied (non-mutating).",
      values: "Returns iterator of values.",
      with: "Returns new array with one element replaced at given index.",
    },
    sortingAlgorithm:
      "Implementation-defined but required to be stable (as of ES2019).",
    sparseArrays:
      "Arrays can have 'holes' (empty slots). Many methods skip holes; behavior is inconsistent.",
  },

  TypedArrays: {
    spec: "§22.2",
    types: [
      "Int8Array (int8, 1 byte)",
      "Uint8Array (uint8, 1 byte)",
      "Uint8ClampedArray (uint8 clamped, 1 byte)",
      "Int16Array (int16, 2 bytes)",
      "Uint16Array (uint16, 2 bytes)",
      "Int32Array (int32, 4 bytes)",
      "Uint32Array (uint32, 4 bytes)",
      "Float32Array (float32, 4 bytes)",
      "Float64Array (float64, 8 bytes)",
      "BigInt64Array (int64, 8 bytes)",
      "BigUint64Array (uint64, 8 bytes)",
    ],
    keyProperties: {
      buffer: "Underlying ArrayBuffer.",
      byteOffset: "Offset into the buffer where this view starts.",
      byteLength: "Total byte length.",
      length: "Number of elements.",
    },
    differenceFromArray: [
      "Fixed length — cannot push/pop.",
      "All elements must be the same type.",
      "Out-of-range writes are silently ignored.",
      "Backed by a raw memory buffer.",
    ],
  },
};

// ============================================================================
// SECTION 23: KEYED COLLECTIONS
// ============================================================================

export const KEYED_COLLECTIONS = {
  Map: {
    spec: "§23.1",
    description:
      "Ordered map of key-value pairs. Keys can be any value (uses SameValueZero comparison).",
    methods: {
      "new Map(iterable)": "Creates from [[key,value]] iterable.",
      "map.set(key, value)": "Sets key-value pair. Returns map (chainable).",
      "map.get(key)": "Returns value or undefined.",
      "map.has(key)": "Returns true if key exists.",
      "map.delete(key)": "Removes key. Returns true if key existed.",
      "map.clear()": "Removes all entries.",
      "map.size": "Number of entries.",
      "map.entries()": "Iterator of [key, value] pairs.",
      "map.keys()": "Iterator of keys.",
      "map.values()": "Iterator of values.",
      "map.forEach(fn)": "Calls fn(value, key, map) for each entry in insertion order.",
    },
    vsObject: [
      "Map allows any key type; Object keys are strings or symbols.",
      "Map preserves insertion order; Object does too but with different ordering rules.",
      "Map has .size; Object needs Object.keys().length.",
      "Map is directly iterable.",
      "Map has no prototype pollution risk.",
    ],
  },

  Set: {
    spec: "§23.2",
    description:
      "Collection of unique values (uses SameValueZero). Maintains insertion order.",
    methods: {
      "new Set(iterable)": "Creates from iterable.",
      "set.add(value)": "Adds value. Returns set (chainable).",
      "set.has(value)": "Returns true if value exists.",
      "set.delete(value)": "Removes value. Returns true if existed.",
      "set.clear()": "Removes all values.",
      "set.size": "Number of values.",
      "set.entries()": "Iterator of [value, value] pairs (for API symmetry with Map).",
      "set.keys()": "Iterator of values (same as values()).",
      "set.values()": "Iterator of values.",
      "set.forEach(fn)": "Calls fn(value, value, set) for each value.",
    },
    setOperations: {
      "set.union(other)": "ES2025 — returns new Set with all elements from both.",
      "set.intersection(other)": "ES2025 — returns new Set with only common elements.",
      "set.difference(other)": "ES2025 — returns new Set with elements in this but not in other.",
      "set.symmetricDifference(other)": "ES2025 — elements in either but not both.",
      "set.isSubsetOf(other)": "ES2025 — true if all elements of this are in other.",
      "set.isSupersetOf(other)": "ES2025 — true if all elements of other are in this.",
      "set.isDisjointFrom(other)": "ES2025 — true if no common elements.",
    },
  },

  WeakMap: {
    spec: "§23.3",
    description:
      "Like Map but keys must be objects or non-registered symbols. Keys are weakly referenced (eligible for GC).",
    noIteration: "Cannot iterate over entries — keys may have been GC'd.",
    methods: ["set", "get", "has", "delete"],
    useCases: [
      "Private data for objects without preventing GC.",
      "Associating metadata with DOM elements.",
      "Memoization caches that don't prevent GC of keys.",
    ],
  },

  WeakSet: {
    spec: "§23.4",
    description:
      "Like Set but values must be objects or non-registered symbols. Values are weakly referenced.",
    noIteration: "Cannot iterate or get size.",
    methods: ["add", "has", "delete"],
    useCases: [
      "Tracking visited objects without preventing GC.",
      "Tagging objects with a 'seen' marker.",
    ],
  },
};

// ============================================================================
// SECTION 24: STRUCTURED DATA
// ============================================================================

export const STRUCTURED_DATA = {
  ArrayBuffer: {
    spec: "§24.1",
    description:
      "Fixed-length raw binary data buffer. Must be accessed via TypedArray or DataView views.",
    methods: {
      "new ArrayBuffer(byteLength, {maxByteLength})":
        "Creates a buffer. maxByteLength enables resizing.",
      "buffer.byteLength": "Current byte length.",
      "buffer.maxByteLength": "Maximum byte length (for resizable buffers).",
      "buffer.resizable": "true if created with maxByteLength.",
      "buffer.resize(newByteLength)": "Changes size of a resizable buffer.",
      "buffer.slice(begin, end)": "Returns a new ArrayBuffer copy of the given range.",
      "buffer.transfer(newByteLength)": "ES2024. Transfers ownership; original becomes detached.",
      "ArrayBuffer.isView(value)": "Returns true for TypedArray and DataView instances.",
    },
  },

  SharedArrayBuffer: {
    spec: "§24.2",
    description:
      "Like ArrayBuffer but can be shared across agents (Web Workers). Requires cross-origin isolation headers.",
    keyDifference:
      "SharedArrayBuffer cannot be detached. Supports Atomics operations for synchronization.",
  },

  DataView: {
    spec: "§24.3",
    description:
      "Low-level read/write interface over an ArrayBuffer. Supports multiple element types and explicit endianness.",
    methods:
      "getInt8/setInt8, getUint8/setUint8, getInt16/setInt16, getUint16/setUint16, getInt32/setInt32, getFloat32/setFloat32, getFloat64/setFloat64, getBigInt64/setBigInt64 — all take byteOffset and optional littleEndian.",
  },

  Atomics: {
    spec: "§24.4",
    description:
      "Provides atomic operations on SharedArrayBuffer. Ensures operations are not interrupted by other agents.",
    methods: {
      "Atomics.add(typedArray, index, value)": "Atomically adds value to element, returns old value.",
      "Atomics.and(ta, i, v)": "Bitwise AND.",
      "Atomics.or(ta, i, v)": "Bitwise OR.",
      "Atomics.xor(ta, i, v)": "Bitwise XOR.",
      "Atomics.sub(ta, i, v)": "Atomically subtracts.",
      "Atomics.exchange(ta, i, v)": "Sets and returns old value.",
      "Atomics.compareExchange(ta, i, expected, replacement)":
        "CAS — sets only if current value equals expected. Returns old value.",
      "Atomics.load(ta, i)": "Atomically reads value.",
      "Atomics.store(ta, i, v)": "Atomically writes value. Returns v.",
      "Atomics.wait(ta, i, value, timeout)":
        "Blocks current agent if ta[i] === value. Returns 'ok', 'not-equal', or 'timed-out'.",
      "Atomics.waitAsync(ta, i, value, timeout)":
        "Non-blocking async version of wait. Returns a Promise.",
      "Atomics.notify(ta, i, count)": "Wakes up agents waiting on ta[i].",
      "Atomics.isLockFree(size)": "Returns true if atomic ops on size bytes are lock-free.",
    },
  },

  JSON: {
    spec: "§24.5",
    methods: {
      "JSON.parse(text, reviver)": {
        description: "Parses a JSON string. Reviver is called with each key-value pair during construction.",
        validJSONValues: "objects, arrays, strings, numbers, true, false, null",
        invalidJSONValues: "undefined, functions, Symbols, circular references, BigInt",
        reviver: "reviver(key, value) — return the value to use, or undefined to omit the key.",
      },
      "JSON.stringify(value, replacer, space)": {
        description: "Converts a value to a JSON string.",
        replacer:
          "Array of keys to include, or function(key, value) → value (undefined omits the key).",
        space: "Number of spaces (max 10) or a string for indentation.",
        toJSON: "If an object has toJSON(), its return value is serialized instead.",
        omits: "undefined, functions, Symbols in object values → omitted. In arrays → null.",
        circular: "Throws TypeError on circular references.",
        specialNumbers: "NaN, Infinity, -Infinity → null.",
      },
    },
  },
};

// ============================================================================
// SECTION 25: MANAGING MEMORY
// ============================================================================

export const MEMORY_MANAGEMENT = {
  spec: "§25",

  WeakRef: {
    spec: "§25.1",
    description:
      "Holds a weak reference to an object that does not prevent GC.",
    creation: "new WeakRef(target) — target must be an object or non-registered symbol.",
    "weakRef.deref()":
      "Returns the target if still alive, or undefined if GC'd. Result valid only until next GC opportunity.",
    garbageCollectionModel: [
      "The GC may collect the target at any time after no strong references remain.",
      "deref() may return the object even after all other references are gone (until next GC cycle).",
      "Do not use WeakRef for resurrection patterns.",
    ],
    useCase: "Caches that don't prevent GC of their entries.",
  },

  FinalizationRegistry: {
    spec: "§25.2",
    description:
      "Calls a cleanup callback when registered objects are GC'd.",
    creation: "new FinalizationRegistry(cleanupCallback)",
    methods: {
      "registry.register(target, heldValue, unregisterToken)":
        "Registers target. cleanupCallback(heldValue) will be called after target is GC'd.",
      "registry.unregister(unregisterToken)":
        "Cancels the registration associated with the token.",
    },
    guarantees: [
      "The callback is called asynchronously after GC.",
      "The callback may not be called if the program exits first.",
      "The exact timing is unspecified.",
      "The registered target itself is not accessible in the callback.",
    ],
    useCase: "Closing native resources (file handles, WebGL textures) associated with JS objects.",
  },

  agentLiveness: {
    spec: "§9.9",
    description:
      "An object is 'live' if any agent can access it via strong references. WeakRef targets can be GC'd when not live.",
    keepAlive:
      "ClearKeptObjects() / AddToKeptObjects() manage the set of objects that must be kept alive for the current job.",
  },
};

// ============================================================================
// SECTION 26: CONTROL ABSTRACTION OBJECTS (ITERATORS, GENERATORS, PROMISES)
// ============================================================================

export const CONTROL_ABSTRACTION = {
  spec: "§26",

  iteratorProtocol: {
    description:
      "An object is an iterator if it has a .next() method returning {value, done}.",
    iterableProtocol:
      "An object is iterable if it has a [Symbol.iterator]() method returning an iterator.",
    operations: {
      "GetIterator(obj, kind)":
        "Calls obj[Symbol.iterator]() (or Symbol.asyncIterator for async). Returns an IteratorRecord.",
      "IteratorNext(iteratorRecord, value)":
        "Calls iterator.next(value). Returns result object.",
      "IteratorStep(iteratorRecord)":
        "Calls IteratorNext, returns false if done, otherwise result.",
      "IteratorStepValue(iteratorRecord)":
        "Calls IteratorNext, returns undefined if done, otherwise value.",
      "IteratorClose(iteratorRecord, completion)":
        "Calls iterator.return() if defined, passing completion. Used by for-of cleanup.",
    },
    builtInIterables:
      "String, Array, TypedArray, Map, Set, generator objects, arguments, NodeList.",
  },

  generatorProtocol: {
    spec: "§26.4",
    states: {
      "suspended-start":
        "Just created. No code has run yet.",
      executing:
        "Currently running. Calling .next() while executing throws TypeError.",
      "suspended-yield":
        "Paused at a yield expression. Waiting for .next()/.throw()/.return().",
      completed:
        "Body has returned or thrown. All subsequent .next() calls return {value: undefined, done: true}.",
    },
    operations: {
      GeneratorStart: "Initializes the generator's execution context.",
      GeneratorResume:
        "Resumes from suspended state. The value arg becomes the result of yield.",
      GeneratorYield:
        "Suspends the generator. Returns {value: yieldValue, done: false} to caller.",
    },
    delegationWithYieldStar:
      "yield* iterable — delegates to another iterator. Passes through .next()/.throw()/.return() calls.",
  },

  asyncGeneratorProtocol: {
    spec: "§26.6",
    description:
      "Each .next() returns a Promise. Consumes async iterables via for-await-of.",
    queueing:
      "Multiple .next() calls before resolution are queued. Requests are processed in order.",
  },

  promiseSpec: {
    spec: "§26.6",
    internalSlots: {
      "[[PromiseState]]": "'pending' | 'fulfilled' | 'rejected'",
      "[[PromiseResult]]":
        "The fulfillment value or rejection reason. undefined when pending.",
      "[[PromiseFulfillReactions]]":
        "List of PromiseReaction records for fulfillment handlers. Cleared on resolution.",
      "[[PromiseRejectReactions]]":
        "List of PromiseReaction records for rejection handlers. Cleared on resolution.",
      "[[PromiseIsHandled]]":
        "Boolean — whether a rejection handler has been attached. Used for unhandled rejection tracking.",
    },

    states: {
      pending: "Initial state. Neither fulfilled nor rejected.",
      fulfilled: "Has a value. [[PromiseState]] = 'fulfilled'.",
      rejected: "Has a reason. [[PromiseState]] = 'rejected'.",
    },

    keyRules: [
      "A promise is settled once it transitions from pending to fulfilled or rejected.",
      "Settlement is permanent — the state and result never change after settling.",
      "Promise callbacks (then/catch/finally) are ALWAYS called asynchronously (as microtasks).",
      "Even an already-resolved promise schedules its handler asynchronously.",
    ],

    performPromiseThen: {
      spec: "§27.2.5.4.1",
      algorithm: [
        "1. Assert promise.[[PromiseState]] is valid.",
        "2. Create fulfillReaction (wraps onFulfilled callback) and rejectReaction.",
        "3. If pending: add reactions to [[PromiseFulfillReactions]] and [[PromiseRejectReactions]].",
        "4. If fulfilled: enqueue HostEnqueuePromiseJob(fulfillReaction, realmToUse).",
        "5. If rejected: enqueue HostEnqueuePromiseJob(rejectReaction, realmToUse).",
        "6. Return a new promise capable of resolving when the reaction runs.",
      ],
    },

    promiseResolve: {
      algorithm: [
        "1. If value is a promise from the same realm: return that promise directly.",
        "2. If value is a thenable (has .then method): wrap in a new promise that adopts its state.",
        "3. Otherwise: fulfill immediately with value.",
      ],
      thenableAssimilation:
        "When resolving with a thenable, a microtask is queued to call its .then(). This adds an extra microtask tick.",
    },

    staticMethods: {
      "Promise.resolve(value)":
        "Returns a resolved promise. If value is a promise, returns it directly.",
      "Promise.reject(reason)":
        "Returns a rejected promise with the given reason.",
      "Promise.all(iterable)": {
        description: "Resolves when all promises resolve. Rejects immediately on first rejection.",
        result: "Array of resolved values in input order (not resolution order).",
        emptyIterable: "Resolves with [].",
      },
      "Promise.allSettled(iterable)": {
        description: "Waits for all promises to settle (regardless of outcome).",
        result: "Array of {status: 'fulfilled'|'rejected', value?, reason?} in input order.",
      },
      "Promise.race(iterable)": {
        description: "Resolves/rejects with the first settled promise.",
        emptyIterable: "Never settles.",
      },
      "Promise.any(iterable)": {
        description: "Resolves with the first fulfilled promise. Rejects only if ALL promises reject.",
        rejectionError: "AggregateError containing all rejection reasons.",
        emptyIterable: "Rejects with AggregateError.",
      },
      "Promise.withResolvers()":
        "ES2024. Returns {promise, resolve, reject} — a promise with its resolvers exposed.",
    },

    executionOrderExamples: {
      basicMicrotaskVsTask: {
        code: `console.log('1'); setTimeout(() => console.log('2'), 0); Promise.resolve().then(() => console.log('3')); console.log('4');`,
        output: ["1", "4", "3", "2"],
        explanation: "Sync runs first; then microtask (Promise.then); then task (setTimeout).",
      },
      nestedMicrotasks: {
        code: `Promise.resolve().then(() => { console.log('1'); Promise.resolve().then(() => console.log('2')); }); Promise.resolve().then(() => console.log('3')); console.log('4');`,
        output: ["4", "1", "3", "2"],
        explanation: "4 (sync), then 1 (first microtask), 3 (second microtask), 2 (nested microtask added during processing).",
      },
      awaitTiming: {
        code: `async function foo() { console.log('1'); await Promise.resolve(); console.log('2'); } console.log('3'); foo(); console.log('4');`,
        output: ["3", "1", "4", "2"],
        explanation: "3 (sync), 1 (sync inside foo), 4 (sync after foo() call), 2 (after await — microtask).",
      },
    },
  },
};

// ============================================================================
// SECTION 27: REFLECTION
// ============================================================================

export const REFLECTION = {
  spec: "§27",

  Proxy: {
    spec: "§27.1",
    description:
      "Wraps a target object/function with a handler that intercepts operations via traps.",
    creation: "new Proxy(target, handler)",
    revocable: "Proxy.revocable(target, handler) — returns {proxy, revoke()}. Revoke disables all traps.",

    traps: {
      getPrototypeOf:
        "Intercepts Object.getPrototypeOf(), __proto__, Reflect.getPrototypeOf(), instanceof.",
      setPrototypeOf:
        "Intercepts Object.setPrototypeOf(), __proto__ assignment.",
      isExtensible:
        "Intercepts Object.isExtensible(). Must return same as target's extensibility.",
      preventExtensions:
        "Intercepts Object.preventExtensions(), Object.freeze(), Object.seal().",
      getOwnPropertyDescriptor:
        "Intercepts Object.getOwnPropertyDescriptor(). Must be consistent with target.",
      defineProperty:
        "Intercepts Object.defineProperty(), property assignments that create properties.",
      has: "Intercepts 'in' operator.",
      get: "Intercepts property reads, including prototype chain reads.",
      set: "Intercepts property writes.",
      deleteProperty: "Intercepts delete operator.",
      ownKeys:
        "Intercepts Object.keys(), Object.getOwnPropertyNames(), Object.getOwnPropertySymbols(), for-in.",
      apply: "Intercepts function calls (target must be a function).",
      construct: "Intercepts new operator (target must be a constructor).",
    },

    invariants: [
      "getPrototypeOf must return target's prototype if target is non-extensible.",
      "isExtensible must match Object.isExtensible(target).",
      "A non-configurable own property must not be reported as non-existent by has or getOwnPropertyDescriptor.",
      "Non-configurable non-writable property must not be reported with different value by get.",
    ],
  },

  Reflect: {
    spec: "§27.2",
    description:
      "Object with static methods corresponding to Proxy traps. Allows calling internal methods explicitly.",
    methods: {
      "Reflect.apply(target, thisArg, argList)":
        "Calls target with thisArg and arguments. Like Function.prototype.apply.",
      "Reflect.construct(target, argList, newTarget)":
        "Like new target(...argList). Optional newTarget for new.target.",
      "Reflect.defineProperty(target, prop, descriptor)":
        "Like Object.defineProperty but returns boolean instead of throwing.",
      "Reflect.deleteProperty(target, prop)":
        "Like delete target[prop]. Returns boolean.",
      "Reflect.get(target, prop, receiver)":
        "Like target[prop]. Receiver is used as 'this' for getters.",
      "Reflect.getOwnPropertyDescriptor(target, prop)":
        "Like Object.getOwnPropertyDescriptor.",
      "Reflect.getPrototypeOf(target)":
        "Like Object.getPrototypeOf.",
      "Reflect.has(target, prop)":
        "Like prop in target.",
      "Reflect.isExtensible(target)":
        "Like Object.isExtensible.",
      "Reflect.ownKeys(target)":
        "Returns all own keys: integers + strings + symbols. Like Object.getOwnPropertyNames + getOwnPropertySymbols combined.",
      "Reflect.preventExtensions(target)":
        "Like Object.preventExtensions. Returns boolean.",
      "Reflect.set(target, prop, value, receiver)":
        "Like target[prop] = value. Returns boolean.",
      "Reflect.setPrototypeOf(target, proto)":
        "Like Object.setPrototypeOf. Returns boolean.",
    },
    vsObjectMethods:
      "Reflect methods return booleans instead of throwing on failure, making them suitable for use in Proxy traps.",
  },
};

// ============================================================================
// VISUALIZATION HELPERS — Spec-to-Visualizer Mappings
// ============================================================================

export const SPEC_TO_VISUALIZER_MAP = {
  callStack: {
    specConcept: "Execution Context Stack (§9.4)",
    description:
      "Each function call pushes a new Execution Context. Return pops it.",
    components: {
      LexicalEnvironment: "Contains let/const/class/param bindings",
      VariableEnvironment: "Contains var bindings",
      thisBinding: "The current this value",
      functionObject: "Reference to the function being executed",
    },
  },

  memoryHeap: {
    specConcept: "Object heap (§6.1.7)",
    description:
      "All objects live in an unstructured heap. References are followed to access their values.",
  },

  taskQueue: {
    specConcept: "HostEnqueueTimeoutJob (§9.5.6)",
    sources: ["setTimeout callback", "setInterval callback", "I/O callbacks", "User events"],
    behavior: "One task runs to completion per event loop iteration.",
  },

  microtaskQueue: {
    specConcept: "HostEnqueuePromiseJob (§9.5.5)",
    sources: [
      "Promise.then/catch/finally callbacks",
      "await resumption points",
      "queueMicrotask()",
    ],
    behavior:
      "ALL microtasks are drained (including newly added ones) before the next task starts.",
  },

  environmentRecord: {
    specConcept: "Environment Records (§9.1)",
    description:
      "The visual 'scope' or variable box in the memory panel. Chains to outer scope.",
  },

  promiseState: {
    specConcept: "[[PromiseState]] internal slot (§26.6)",
    states: {
      pending: "Gray/yellow indicator — waiting for resolution.",
      fulfilled: "Green indicator — has a value.",
      rejected: "Red indicator — has a reason.",
    },
  },

  generatorState: {
    specConcept: "Generator [[GeneratorState]] internal slot (§26.4)",
    states: {
      "suspended-start": "Created but not started.",
      executing: "Currently running (cannot call .next()).",
      "suspended-yield": "Paused at yield — waiting.",
      completed: "Finished — all .next() calls return done:true.",
    },
  },

  closureCapture: {
    specConcept: "Lexical Environment outer reference chain (§9.1)",
    description:
      "When a function is created, it captures a reference to the current environment. This forms the closure.",
  },
};

// ============================================================================
// COMPREHENSIVE SPEC SECTION INDEX
// ============================================================================

export const SPEC_SECTION_INDEX: Record<string, { section: string; url: string; description: string }> = {
  "Language Types":          { section: "§6.1",   url: "https://tc39.es/ecma262/#sec-ecmascript-language-types", description: "The 8 ECMAScript types" },
  "Completion Records":      { section: "§6.2.4", url: "https://tc39.es/ecma262/#sec-completion-record-specification-type", description: "How control flow is represented" },
  "Reference Records":       { section: "§6.2.5", url: "https://tc39.es/ecma262/#sec-reference-record-specification-type", description: "Assignment target representation" },
  "Type Conversion":         { section: "§7.1",   url: "https://tc39.es/ecma262/#sec-type-conversion", description: "ToPrimitive, ToBoolean, ToNumber, ToString" },
  "Comparison Operations":   { section: "§7.2",   url: "https://tc39.es/ecma262/#sec-testing-and-comparison-operations", description: "SameValue, IsLooselyEqual, IsStrictlyEqual" },
  "Object Operations":       { section: "§7.3",   url: "https://tc39.es/ecma262/#sec-operations-on-objects", description: "Get, Set, HasProperty, Call, Construct" },
  "Iterator Operations":     { section: "§7.4",   url: "https://tc39.es/ecma262/#sec-operations-on-iterator-objects", description: "GetIterator, IteratorNext, IteratorStep" },
  "Scope Analysis":          { section: "§8.2",   url: "https://tc39.es/ecma262/#sec-syntax-directed-operations-scope-analysis", description: "BoundNames, VarDeclaredNames, LexicallyDeclaredNames" },
  "Environment Records":     { section: "§9.1",   url: "https://tc39.es/ecma262/#sec-environment-records", description: "Declarative, Object, Function, Global, Module environments" },
  "Execution Contexts":      { section: "§9.4",   url: "https://tc39.es/ecma262/#sec-execution-contexts", description: "The running execution context and context stack" },
  "Jobs":                    { section: "§9.5",   url: "https://tc39.es/ecma262/#sec-jobs", description: "Promise jobs and timeout jobs" },
  "Agents":                  { section: "§9.6",   url: "https://tc39.es/ecma262/#sec-agents", description: "Isolated execution environments" },
  "Ordinary Objects":        { section: "§10.1",  url: "https://tc39.es/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots", description: "Default internal method implementations" },
  "Function Objects":        { section: "§10.2",  url: "https://tc39.es/ecma262/#sec-ecmascript-function-objects", description: "[[Call]], [[Construct]], FunctionDeclarationInstantiation" },
  "Lexical Grammar":         { section: "§12",    url: "https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar", description: "Tokens, keywords, ASI rules" },
  "Expressions":             { section: "§13",    url: "https://tc39.es/ecma262/#sec-ecmascript-language-expressions", description: "All expression types and operators" },
  "Statements":              { section: "§14",    url: "https://tc39.es/ecma262/#sec-ecmascript-language-statements-and-declarations", description: "All statement types" },
  "Functions and Classes":   { section: "§15",    url: "https://tc39.es/ecma262/#sec-ecmascript-language-functions-and-classes", description: "Function and class definitions" },
  "Modules":                 { section: "§16",    url: "https://tc39.es/ecma262/#sec-ecmascript-language-scripts-and-modules", description: "Import, export, module loading" },
  "Global Object":           { section: "§18",    url: "https://tc39.es/ecma262/#sec-global-object", description: "eval, isNaN, parseFloat, parseInt, etc." },
  "Object":                  { section: "§19.1",  url: "https://tc39.es/ecma262/#sec-object-objects", description: "Object constructor and methods" },
  "Function":                { section: "§19.2",  url: "https://tc39.es/ecma262/#sec-function-objects", description: "Function.prototype.apply/bind/call" },
  "Symbol":                  { section: "§19.4",  url: "https://tc39.es/ecma262/#sec-symbol-objects", description: "Symbol.for, Symbol.keyFor, well-known symbols" },
  "Error Types":             { section: "§19.5",  url: "https://tc39.es/ecma262/#sec-error-objects", description: "Error, TypeError, RangeError, etc." },
  "Number":                  { section: "§20.1",  url: "https://tc39.es/ecma262/#sec-number-objects", description: "Number constants and methods" },
  "Math":                    { section: "§20.3",  url: "https://tc39.es/ecma262/#sec-math-object", description: "Mathematical functions" },
  "Date":                    { section: "§20.4",  url: "https://tc39.es/ecma262/#sec-date-objects", description: "Date construction and methods" },
  "String":                  { section: "§21.1",  url: "https://tc39.es/ecma262/#sec-string-objects", description: "String methods" },
  "RegExp":                  { section: "§21.2",  url: "https://tc39.es/ecma262/#sec-regexp-regular-expression-objects", description: "Regular expressions" },
  "Array":                   { section: "§22.1",  url: "https://tc39.es/ecma262/#sec-array-objects", description: "Array methods" },
  "TypedArray":              { section: "§22.2",  url: "https://tc39.es/ecma262/#sec-typedarray-objects", description: "Typed array types" },
  "Map":                     { section: "§23.1",  url: "https://tc39.es/ecma262/#sec-map-objects", description: "Map collection" },
  "Set":                     { section: "§23.2",  url: "https://tc39.es/ecma262/#sec-set-objects", description: "Set collection" },
  "WeakMap":                 { section: "§23.3",  url: "https://tc39.es/ecma262/#sec-weakmap-objects", description: "WeakMap" },
  "WeakSet":                 { section: "§23.4",  url: "https://tc39.es/ecma262/#sec-weakset-objects", description: "WeakSet" },
  "ArrayBuffer":             { section: "§24.1",  url: "https://tc39.es/ecma262/#sec-arraybuffer-objects", description: "Binary data buffers" },
  "Atomics":                 { section: "§24.4",  url: "https://tc39.es/ecma262/#sec-atomics-object", description: "Atomic shared memory operations" },
  "JSON":                    { section: "§24.5",  url: "https://tc39.es/ecma262/#sec-json-object", description: "JSON.parse and JSON.stringify" },
  "WeakRef":                 { section: "§25.1",  url: "https://tc39.es/ecma262/#sec-weak-ref-objects", description: "Weak references" },
  "FinalizationRegistry":    { section: "§25.2",  url: "https://tc39.es/ecma262/#sec-finalization-registry-objects", description: "GC callbacks" },
  "Iterator Protocol":       { section: "§26.1",  url: "https://tc39.es/ecma262/#sec-iteration", description: "Iterator and iterable protocols" },
  "Generator Protocol":      { section: "§26.4",  url: "https://tc39.es/ecma262/#sec-generator-objects", description: "Generator state machine" },
  "Promise":                 { section: "§26.6",  url: "https://tc39.es/ecma262/#sec-promise-objects", description: "Promise state machine and combinators" },
  "Proxy":                   { section: "§27.1",  url: "https://tc39.es/ecma262/#sec-proxy-objects", description: "Proxy traps and invariants" },
  "Reflect":                 { section: "§27.2",  url: "https://tc39.es/ecma262/#sec-reflect-object", description: "Reflect methods" },
};

export default {
  ECMASCRIPT_TERMS,
  LANGUAGE_TYPES,
  PROPERTY_ATTRIBUTES,
  COMPLETION_RECORD,
  REFERENCE_RECORD,
  TYPE_CONVERSION,
  COMPARISON_OPERATIONS,
  ENVIRONMENT_RECORDS,
  EXECUTION_CONTEXTS,
  REALMS,
  JOBS,
  AGENTS,
  OBJECT_INTERNAL_METHODS,
  LEXICAL_GRAMMAR,
  EXPRESSION_SEMANTICS,
  STATEMENT_SEMANTICS,
  FUNCTION_SEMANTICS,
  MODULE_SEMANTICS,
  GLOBAL_OBJECT,
  FUNDAMENTAL_OBJECTS,
  NUMBERS_AND_DATES,
  TEXT_PROCESSING,
  INDEXED_COLLECTIONS,
  KEYED_COLLECTIONS,
  STRUCTURED_DATA,
  MEMORY_MANAGEMENT,
  CONTROL_ABSTRACTION,
  REFLECTION,
  SPEC_TO_VISUALIZER_MAP,
  SPEC_SECTION_INDEX,
};
