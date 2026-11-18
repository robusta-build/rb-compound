const empty = { __MASALA_EMPTY__: "empty" };
class Option {
  constructor(value) {
    this.value = value;
  }
  isPresent() {
    return this.value !== empty;
  }
  map(bindCall) {
    if (this.isPresent()) {
      return someOrNone(bindCall(this.value));
    } else {
      return this;
    }
  }
  flatMap(bindCall) {
    if (this.isPresent()) {
      return bindCall(this.value);
    } else {
      return this;
    }
  }
  filter(f) {
    if (this.isPresent() && f(this.value)) {
      return this;
    }
    return new Option(empty);
  }
  get() {
    return this.value;
  }
  orElse(value) {
    if (this.isPresent()) {
      return this.value;
    } else {
      return value;
    }
  }
  orLazyElse(value) {
    if (this.isPresent()) {
      return this.value;
    } else {
      return value();
    }
  }
}
function someOrNone(value) {
  return new Option(value);
}
function none() {
  return new Option(empty);
}
const option = {
  some: someOrNone,
  none
};
class Try {
  constructor(value, error2) {
    this.value = value;
    this.error = error2;
  }
  isSuccess() {
    return this.error === null;
  }
  isFailure() {
    return !this.isSuccess();
  }
  onSuccess(bindCall) {
    if (this.isSuccess()) {
      bindCall(this.value);
    }
    return this;
  }
  onFailure(bindCall) {
    if (this.isFailure()) {
      bindCall(this.error);
    }
    return this;
  }
  map(bindCall) {
    if (this.isSuccess()) {
      try {
        return success(bindCall(this.value));
      } catch (e) {
        return failure(e);
      }
    } else {
      return this;
    }
  }
  flatMap(bindCall) {
    if (this.isSuccess()) {
      try {
        return bindCall(this.value);
      } catch (e) {
        return failure(e);
      }
    } else {
      return this;
    }
  }
  success() {
    return this.value;
  }
  failure() {
    return this.error;
  }
  recoverWith(value) {
    if (this.isSuccess()) {
      return this.value;
    } else {
      return value;
    }
  }
  lazyRecoverWith(value) {
    if (this.isSuccess()) {
      return this.value;
    } else {
      return value(this.error);
    }
  }
  filter(f) {
    if (this.isSuccess()) {
      if (f(this.value)) {
        return this;
      } else {
        return failure(new Error("invalid filter"));
      }
    }
    return this;
  }
}
function success(value) {
  return new Try(value, null);
}
function failure(error2) {
  return new Try(null, error2);
}
const atry = {
  success,
  failure
};
class Unit {
}
const unit = new Unit();
const NEUTRAL = Symbol("MASALA_NEUTRAL");
class Tuple {
  constructor(array) {
    if (array === void 0) {
      array = [];
    }
    this.value = array;
  }
  at(index) {
    return this.value[index];
  }
  array() {
    return [...this.value];
  }
  single() {
    return this.value[0];
  }
  first() {
    return this.value[0];
  }
  last() {
    return this.value[this.size() - 1];
  }
  join(j = "") {
    return this.value.join(j);
  }
  append(element) {
    if (element === NEUTRAL) {
      return new Tuple([...this.value]);
    }
    if (isTuple(element)) {
      return new Tuple([...this.value, ...element.value]);
    }
    return new Tuple([...this.value, element]);
  }
  isEmpty() {
    return this.size() === 0;
  }
  size() {
    return this.value.length;
  }
  map(f) {
    const mapped = this.array().map(f);
    return new Tuple(mapped);
  }
}
function isTuple(object) {
  return object instanceof Tuple;
}
class ParserResponse {
  constructor(input, offset, consumed) {
    this.input = input;
    this.offset = offset;
    this.consumed = consumed;
  }
  // Response 'a 'c => unit -> bool
  isAccepted() {
    return this.fold(
      function() {
        return true;
      },
      function() {
        return false;
      }
    );
  }
  // Response 'a 'c => unit -> bool
  toTry() {
    return this.fold(
      (accept2) => atry.success(accept2.value),
      (reject2) => atry.failure(new Error("parser error at " + reject2.offset))
    );
  }
  isEos() {
    return false;
  }
  getOffset() {
    return this.offset;
  }
  location() {
    return this.input.location(this.getOffset());
  }
  /**
   * fold takes a function to map the value depending on result
   * Abstract function fold(accept, reject)
   *
   * flatMap is a specialization of fold
   */
}
class Reject extends ParserResponse {
  constructor(input, offset, consumed) {
    super(input, offset, consumed);
  }
  // Response 'a 'c => (Accept 'a 'c -> 'a) -> (Reject 'a 'c -> 'a) -> 'a
  fold(_, reject2) {
    return reject2(this);
  }
  // Response 'a 'c => ('a -> 'b) -> Response 'b 'c
  map() {
    return this;
  }
  // Response 'a 'c => ('a -> Response 'b 'c) -> Response 'b 'c
  flatMap() {
    return this;
  }
  // Response 'a 'c => ('a -> bool) -> Response 'b 'c
  filter() {
    return new Reject(this.input, this.offset, false);
  }
}
class Accept extends ParserResponse {
  constructor(value, input, offset, consumed) {
    super(input, offset, consumed);
    this.value = value;
  }
  isEos() {
    return this.input.endOfStream(this.offset);
  }
  // Response 'a 'c => (Accept 'a 'c -> 'a) -> (Reject 'a 'c -> 'a) -> 'a
  fold(accept2) {
    return accept2(this);
  }
  // Response 'a 'c => ('a -> 'b) -> Response 'b 'c
  map(callback) {
    return new Accept(
      callback(this.value, this),
      this.input,
      this.offset,
      this.consumed
    );
  }
  // Response 'a 'c => ('a -> Response 'b 'c) -> Response 'b 'c
  flatMap(callback) {
    return callback(this.value, this);
  }
  // Response 'a 'c => ('a -> bool) -> Response 'b 'c
  filter(predicate) {
    if (predicate(this.value)) {
      return this;
    } else {
      return new Reject(this.input, this.offset, false);
    }
  }
}
const accept = (value, input, offset, consumed) => new Accept(value, input, offset, consumed);
const reject = (input, offset, consumed) => new Reject(input, offset, consumed);
const response = { accept, reject };
const TRACE_REGISTRY = /* @__PURE__ */ new Set();
const TRACE_META = /* @__PURE__ */ new WeakMap();
const TRACE_NAME_SYM = Symbol("masala.trace.name");
function registerTrace(parser, name, opts = {}) {
  if (typeof name !== "string" || !name) {
    throw new Error("Parser.trace(name): name must be a non-empty string");
  }
  TRACE_REGISTRY.add(parser);
  TRACE_META.set(parser, { name, opts });
  try {
    Object.defineProperty(parser, TRACE_NAME_SYM, {
      value: name,
      configurable: true,
      enumerable: false,
      writable: false
    });
  } catch (_) {
  }
}
let Stream$1 = class Stream {
  constructor() {
  }
  // Stream 'a => number -> number
  location(index) {
    return index;
  }
  // Stream 'a => number -> Try 'a
  get(index) {
    try {
      if (this.endOfStream(index)) {
        return atry.failure(new Error("End of stream reached"));
      } else {
        return atry.success(this.unsafeGet(index));
      }
    } catch (e) {
      return atry.failure(e);
    }
  }
  // Stream 'a => [Comparable 'a] -> number -> boolean
  subStreamAt(s, index) {
    for (var i = 0; i < s.length; i++) {
      var value = this.get(i + index);
      if (!value.isSuccess() || value.success() !== s[i]) {
        return false;
      }
    }
    return true;
  }
};
class CharStream extends Stream$1 {
  constructor(source) {
    super();
    this.source = source;
    this.__is__char__stream = true;
  }
  // CharStream 'a => unit -> boolean
  endOfStream(index) {
    return this.source.length <= index;
  }
  // CharStream 'a => number -> 'a <+> error
  unsafeGet(index) {
    return this.source.charAt(index);
  }
}
function factory$3(source) {
  return new CharStream(source);
}
class ArrayStream extends Stream$1 {
  constructor(source) {
    super();
    this.source = source;
  }
  // ArrayStream 'a => unit -> boolean
  endOfStream(index) {
    return index >= this.source.length;
  }
  // ArrayStream 'a => number -> 'a <+> error
  unsafeGet(index) {
    return this.source[index];
  }
}
function factory$2(source) {
  return new ArrayStream(source);
}
class ParserStream extends Stream$1 {
  constructor(parser, lowerStream) {
    super();
    this.source = parser;
    this.input = lowerStream;
    this.offsets = [0];
  }
  getOffset(index) {
    if (index < this.offsets.length) {
      return option.some(this.offsets[index]);
    }
    return option.none();
  }
  // Stream 'a => number -> number
  location(index) {
    if (index === 0) {
      return 0;
    }
    const option2 = this.getOffset(index);
    if (option2.isPresent()) {
      return this.input.location(option2.get());
    } else {
      throw "No location has been found yet for index " + index;
    }
  }
  // ParserStream 'a => unit -> boolean
  endOfStream(index) {
    const option2 = this.getOffset(index);
    if (option2.isPresent()) {
      return this.input.endOfStream(option2.get());
    } else {
      const last = this.offsets[this.offsets.length - 1];
      return this.input.endOfStream(last + 1);
    }
  }
  // ParserStream 'a => number -> 'a <+> error
  /**
   * index is the token index ; It uses getOffset(index) to retrieve the location
   * in the charStream
   * @param index  token index
   */
  unsafeGet(index) {
    let sourceIndex;
    let option2 = this.getOffset(index);
    if (option2.isPresent()) {
      sourceIndex = option2.get();
    } else {
      throw new Error();
    }
    const result = this.source.parse(this.input, sourceIndex);
    if (result.isAccepted()) {
      this.offsets.push(result.offset);
      return result.value;
    } else {
      throw new Error();
    }
  }
}
function factory$1(parser, lowerStream) {
  return new ParserStream(parser, lowerStream);
}
class BufferedStream extends Stream$1 {
  constructor(source) {
    super();
    this.source = source;
    this.cache = {};
  }
  location(index) {
    return this.source.location(index);
  }
  // BufferedStream 'a => unit -> boolean
  endOfStream(index) {
    return this.source.endOfStream(index);
  }
  // override, BufferedStream 'a => number -> Try 'a
  get(index) {
    var self = this;
    if (!self.cache[index]) {
      self.cache[index] = self.source.get(index);
    }
    return self.cache[index];
  }
}
function factory(source) {
  return new BufferedStream(source);
}
const Stream2 = {
  ofChars: factory$3,
  ofArrays: factory$2,
  ofParsers: factory$1,
  buffered: factory
};
class Parser {
  // (Stream 'c -> number -> Response 'a 'c) -> Parser 'a 'c
  constructor(parse2) {
    this.parse = parse2.bind(this);
  }
  val(text) {
    return this.parse(Stream2.ofChars(text)).value;
  }
  // Parser 'a 'c => ('a -> Parser 'b 'c) -> Parser 'b 'c
  flatMap(f) {
    return bind(this, f);
  }
  // Parser 'a 'c => ('a -> 'b) -> Parser 'b 'c
  map(f) {
    var self = this;
    return new Parser((input, index = 0) => self.parse(input, index).map(f));
  }
  tupleMap(f) {
    return this.map((tuple) => {
      if (!isTuple(tuple)) {
        throw new Error("Calling tupleMap on a non tuple object");
      }
      return tuple.map(f);
    });
  }
  // Parser 'a 'c => ('a -> boolean) -> Parser 'a 'c
  filter(p) {
    var self = this;
    return new Parser(
      (input, index = 0) => self.parse(input, index).filter(p)
    );
  }
  // Parser 'a 'c => Comparable 'a -> Parser 'a 'c
  match(v) {
    return this.filter((a) => a === v);
  }
  // Parser 'a 'c => Parser 'b 'c -> Parser ('a,'b) 'c
  // Parser 'a 'c => Parser 'b 'c -> Parser ('a,'b) 'c
  then(p) {
    return this.flatMap(
      (a) => p.map((b) => new Tuple([]).append(a).append(b))
    );
  }
  single() {
    return this.map((tuple) => tuple.single());
  }
  last() {
    return this.map((tuple) => tuple.last());
  }
  first() {
    return this.map((tuple) => tuple.first());
  }
  // Should be called only on ListParser ; Always returns an array
  array() {
    return this.map((value) => {
      if (!isTuple(value)) {
        throw "array() is called only on TupleParser";
      }
      return value.array();
    });
  }
  join(j = "") {
    return this.map((value) => {
      if (!isTuple(value)) {
        throw "Error: join() is called only on TupleParser";
      }
      return value.join(j);
    });
  }
  thenEos() {
    return this.then(eos().drop());
  }
  eos() {
    return new Parser(
      (input, index = 0) => this.parse(input, index).fold(
        (accept2) => {
          return input.endOfStream(accept2.offset) ? response.accept(
            accept2.value,
            accept2.input,
            accept2.offset,
            true
          ) : response.reject(
            accept2.input,
            accept2.offset,
            accept2.consumed
          );
        },
        (reject2) => response.reject(
          reject2.input,
          reject2.offset,
          reject2.consumed
        )
      )
    );
  }
  concat(p) {
    return this.then(p);
  }
  drop() {
    return this.map(() => NEUTRAL);
  }
  // Parser 'a 'c => Parser 'b 'c -> Parser 'a 'c
  thenLeft(p) {
    return this.then(p.drop());
  }
  // Parser 'a 'c => Parser 'b 'c -> Parser 'b 'c
  thenRight(p) {
    return this.drop().then(p);
  }
  // Parser 'a 'c => 'b -> Parser 'b 'c
  returns(v) {
    return this.drop().map(() => v);
  }
  // Parser 'a 'c -> Parser 'a 'c
  or(p) {
    return choice(this, p);
  }
  /**
   * Must be used with F.layer()
   * @param p
   * @returns {Parser}
   */
  and(p) {
    return both(this, p);
  }
  // Parser 'a 'c => unit -> Parser (Option 'a) 'c
  opt() {
    return this.map(option.some).or(returns$1(option.none()));
  }
  // Parser 'a 'c => unit -> Parser (List 'a) 'c
  rep() {
    return repeatable(
      this,
      () => true,
      (l) => l !== 0
    );
  }
  // Parser 'a 'c => number -> Parser (List 'a) 'c
  occurrence(occurrence) {
    return repeatable(
      this,
      (l) => l < occurrence,
      (l) => l === occurrence
    );
  }
  // Parser 'a 'c => unit -> Parser (List 'a) 'c
  optrep() {
    return repeatable(
      this,
      () => true,
      () => true
    );
  }
  // Parser 'a 'c => Parser 'b 'a -> Parser 'b 'c
  chain(p) {
    var self = this;
    return new Parser(
      (input, index = 0) => p.parse(Stream2.buffered(Stream2.ofParsers(self, input)), index)
    );
  }
  /**
   * Prints a hint if the parser enters in this step
   * @param hint
   * @param details
   * @returns the equivalent Parser
   */
  debug(hint, details = true) {
    var f = (p) => {
      if (details) {
        console.log("[debug] : ", hint, p);
      } else {
        console.log("[debug] : ", hint);
      }
      return p;
    };
    return this.map(f);
  }
  trace(name, opts = {}) {
    registerTrace(this, name, opts);
    return this;
  }
}
function bindAccepted(accept_a, f) {
  return f(accept_a.value).parse(accept_a.input, accept_a.offset).fold(
    (accept_b) => response.accept(
      accept_b.value,
      accept_b.input,
      accept_b.offset,
      accept_a.consumed || accept_b.consumed
    ),
    (reject_b) => response.reject(
      reject_b.input,
      reject_b.offset,
      accept_a.consumed || reject_b.consumed
    )
  );
}
function bind(self, f) {
  return new Parser(
    (input, index = 0) => self.parse(input, index).fold(
      (accept_a) => bindAccepted(accept_a, f),
      (reject_a) => reject_a
    )
  );
}
function choice(self, f) {
  return new Parser(
    (input, index = 0) => self.parse(input, index).fold(
      (accept2) => accept2,
      (reject2) => reject2.consumed ? reject2 : f.parse(input, index)
    )
  );
}
function both(self, f) {
  return new Parser(
    (input, index = 0) => self.parse(input, index).fold(
      (accept2) => f.parse(input, index).map((r) => accept2.value.append(r)),
      (reject2) => reject2
    )
  );
}
function repeatable(self, occurrences, accept2) {
  return new Parser((input, index = 0) => {
    var consumed = false, value = new Tuple([]), offset = index, current = self.parse(input, index), occurrence = 0;
    while (current.isAccepted() && occurrences(occurrence)) {
      occurrence += 1;
      value = value.append(current.value);
      consumed = consumed || current.consumed;
      offset = current.offset;
      current = self.parse(input, current.offset);
    }
    if (accept2(occurrence)) {
      return response.accept(value, input, offset, consumed);
    }
    return response.reject(input, offset, consumed);
  });
}
function returns$1(v) {
  return new Parser(
    (input, index = 0) => response.accept(v, input, index, false)
  );
}
function eos() {
  return new Parser((input, index = 0) => {
    if (input.endOfStream(index)) {
      return response.accept(unit, input, index, false);
    } else {
      return response.reject(input, index, false);
    }
  });
}
function parse(p) {
  return new Parser(p);
}
function lazy(p, parameters, self = {}) {
  if (parameters && !Array.isArray(parameters)) {
    throw "Lazy(parser, [params]) function expect parser parameters to be packed into an array";
  }
  return new Parser(
    (input, index = 0) => p.apply(self, parameters).parse(input, index)
  );
}
function returns(v) {
  return new Parser(
    (input, index = 0) => response.accept(v, input, index, false)
  );
}
function error() {
  return new Parser((input, index = 0) => {
    return response.reject(input, index, false);
  });
}
function satisfy(predicate) {
  return new Parser(
    (input, index = 0) => input.get(index).filter(predicate).map((value) => response.accept(value, input, index + 1, true)).lazyRecoverWith(() => response.reject(input, index, false))
  );
}
function doTry(p) {
  return new Parser((input, index = 0) => {
    return p.parse(input, index).fold(
      (accept2) => accept2,
      // we come back to initial offset
      (_) => response.reject(input, index, false)
    );
  });
}
function layer(p) {
  return new Parser(
    (input, index = 0) => p.parse(input, index).fold(
      (accept2) => {
        return response.accept(
          new Tuple().append(accept2.value),
          input,
          index,
          false
        );
      },
      // Compared to satisfy, we come back to initial offset
      (reject2) => reject2
    )
  );
}
function any() {
  return satisfy(() => true);
}
function nop() {
  return new Parser(
    (input, index = 0) => response.accept(NEUTRAL, input, index, true)
  );
}
function not(p) {
  return doTry(p).then(error()).or(any());
}
function subStream(length) {
  return any().occurrence(length);
}
function startWith(value) {
  return nop().returns(value);
}
function moveUntil(stop, include = false) {
  if (typeof stop === "string") {
    return searchStringStart(stop, include);
  }
  if (Array.isArray(stop)) {
    return searchArrayStringStart(stop, include);
  }
  let findParser = not(stop).rep().join();
  if (include) {
    return findParser.then(stop).join();
  }
  const foundEos = Symbol("found-eos");
  return doTry(findParser.then(eos()).returns(foundEos)).or(findParser).filter((v) => v !== foundEos);
}
function dropTo(stop) {
  if (typeof stop === "string") {
    return moveUntil(stop).then(string(stop)).drop();
  } else {
    return moveUntil(stop).then(stop).drop();
  }
}
function regex(rg) {
  const flags = rg.flags.includes("y") ? rg.flags : rg.flags + "y";
  const sticky = new RegExp(rg.source, flags);
  return new Parser((input, index = 0) => {
    sticky.lastIndex = index;
    const matches = sticky.exec(input.source);
    if (!matches) {
      return response.reject(input, index, false);
    } else {
      const text = matches[0];
      return response.accept(text, input, sticky.lastIndex, true);
    }
  });
}
function tryAll(parsers) {
  if (parsers.length === 0) {
    return nop();
  }
  let combinator = doTry(parsers[0]);
  for (let i = 1; i < parsers.length; i++) {
    combinator = doTry(combinator.or(doTry(parsers[i])));
  }
  return combinator;
}
const flow = {
  parse,
  nop,
  try: doTry,
  any,
  subStream,
  not,
  layer,
  lazy,
  returns,
  error,
  eos,
  satisfy,
  startWith,
  moveUntil,
  dropTo,
  regex,
  tryAll
};
function searchStringStart(string2, include = false) {
  return new Parser((input, index = 0) => {
    if (typeof input.source !== "string") {
      throw "Input source must be a String";
    }
    const sourceIndex = input.source.indexOf(string2, index);
    let offset = sourceIndex;
    let result = input.source.substring(index, sourceIndex);
    if (include) {
      result += string2;
      offset += string2.length;
    }
    if (sourceIndex > 0) {
      return response.accept(result, input, offset, true);
    } else {
      return response.reject(input, index, false);
    }
  });
}
function searchArrayStringStart(array, include = false) {
  return new Parser((input, index = 0) => {
    if (typeof input.source !== "string") {
      throw "Input source must be a String";
    }
    let sourceIndex = -1;
    let offset, result;
    let i = 0;
    while (sourceIndex < 0 && i < array.length) {
      const needle = array[i];
      sourceIndex = input.source.indexOf(needle, index);
      i++;
      if (sourceIndex > 0) {
        offset = sourceIndex;
        result = input.source.substring(index, sourceIndex);
        if (include) {
          result += needle;
          offset += needle.length;
        }
        break;
      }
    }
    if (sourceIndex > 0) {
      return response.accept(result, input, offset, true);
    } else {
      return response.reject(input, index, false);
    }
  });
}
function string(s) {
  return new Parser((input, index = 0) => {
    if (input.subStreamAt(s.split(""), index)) {
      return response.accept(s, input, index + s.length, true);
    } else {
      return response.reject(input, index, false);
    }
  });
}
const ASCII_LETTER = Symbol("ASCII");
const OCCIDENTAL_LETTER = Symbol("OCCIDENTAL");
const UTF8_LETTER = Symbol("UTF8");
function isUtf8Letter(char2) {
  return char2.toLowerCase() !== char2.toUpperCase();
}
function isExtendedOccidental(v) {
  return /(?![\u00F7\u00D7])[\u00C0-\u017F^\u00F7]/.test(v);
}
function letter(symbol = null) {
  if (symbol === null || symbol === OCCIDENTAL_LETTER) {
    return flow.satisfy(
      (c) => "a" <= c && c <= "z" || "A" <= c && c <= "Z" || isExtendedOccidental(c)
    );
  }
  if (symbol === ASCII_LETTER) {
    return flow.satisfy(
      (c) => "a" <= c && c <= "z" || "A" <= c && c <= "Z"
    );
  }
  if (symbol === UTF8_LETTER) {
    return flow.satisfy(
      (c) => "a" <= c && c <= "z" || "A" <= c && c <= "Z" || isUtf8Letter(c)
    );
  }
  throw "Parameter " + symbol.toString() + " has wrong type : Should be C.OCCIDENTAL_LETTER, C.ASCII_LETTER or C.UTF8_LETTER";
}
function utf8Letter() {
  return flow.satisfy(isUtf8Letter);
}
function emoji() {
  return flow.satisfy((c) => !isUtf8Letter(c) && isEmojiRegex()).rep();
}
function letters(symbolOrTestFunctionOrRegex) {
  return letter(symbolOrTestFunctionOrRegex).rep().map((values) => values.join(""));
}
function char(c) {
  if (c.length !== 1) {
    throw new Error("Char parser must contains one character");
  }
  return flow.satisfy((v) => c === v);
}
function notChar(c) {
  if (c.length !== 1) {
    throw new Error("Char parser must contains one character");
  }
  return flow.satisfy((v) => c !== v);
}
function charIn(c) {
  return flow.satisfy((v) => c.indexOf(v) !== -1);
}
function charNotIn(c) {
  return flow.satisfy((v) => c.indexOf(v) === -1);
}
function subString(length) {
  return flow.subStream(length).map((s) => s.join(""));
}
function stringIn(array) {
  const tryString = (s) => flow.try(string(s));
  if (array.length === 0) {
    return flow.nop();
  }
  if (array.length === 1) {
    return tryString(array[0]);
  }
  const initial = tryString(array[0]);
  const workArray = array.slice(1);
  return workArray.reduce(
    // Then try again and again the next one, coming always back to start
    (accu, next) => accu.or(tryString(next)),
    initial
  );
}
function notString(s) {
  return flow.not(string(s));
}
function stringLiteral() {
  const anyChar = string('\\"').or(notChar('"'));
  return char('"').thenRight(anyChar.optrep()).thenLeft(char('"')).map((r) => r.join(""));
}
function charLiteral() {
  const anyChar = string("\\'").or(notChar("'"));
  return char("'").thenRight(anyChar).thenLeft(char("'")).single();
}
function lowerCase() {
  return flow.satisfy((v) => "a" <= v && v <= "z");
}
function upperCase() {
  return flow.satisfy((v) => "A" <= v && v <= "Z");
}
function inRegexRange(regexRange) {
  const regExp = new RegExp(`^[${regexRange}]$`);
  return flow.satisfy((c) => regExp.test(c));
}
const chars = {
  utf8Letter,
  letter,
  letterAs: letter,
  letters,
  lettersAs: letters,
  emoji,
  notChar,
  char,
  charIn,
  inRegexRange,
  charNotIn,
  subString,
  string,
  stringIn,
  notString,
  charLiteral,
  stringLiteral,
  lowerCase,
  upperCase,
  UTF8_LETTER,
  OCCIDENTAL_LETTER,
  ASCII_LETTER
};
function isEmojiRegex() {
  return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74)\uDB40\uDC7F|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC68(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92])|(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2695\u2696\u2708]\uFE0F|(?:\uD83C[\uDFFB-\uDFFF])\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]))|\uD83D\uDC69\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92])|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2695\u2696\u2708]|(?:(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)\uFE0F|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDD6-\uDDDD])(?:(?:\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\u200D[\u2640\u2642])|\uD83D\uDC69\u200D[\u2695\u2696\u2708])\uFE0F|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC68(?:\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])\u200D(?:\uD83C[\uDF3E\uDF73\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92])|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83C\uDDF4\uD83C\uDDF2|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83D\uDC69(?:\uD83C[\uDFFB-\uDFFF])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD37-\uDD39\uDD3D\uDD3E\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270A-\u270D]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC70\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDCAA\uDD74\uDD7A\uDD90\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD36\uDDD1-\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC69\uDC6E\uDC70-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD18-\uDD1C\uDD1E\uDD1F\uDD26\uDD30-\uDD39\uDD3D\uDD3E\uDDD1-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])?|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDEEB\uDEEC\uDEF4-\uDEF8]|\uD83E[\uDD10-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4C\uDD50-\uDD6B\uDD80-\uDD97\uDDC0\uDDD0-\uDDE6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267B\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEF8]|\uD83E[\uDD10-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4C\uDD50-\uDD6B\uDD80-\uDD97\uDDC0\uDDD0-\uDDE6])\uFE0F/;
}
function number() {
  var join = (r) => r.join(""), joinOrEmpty = (r) => r.map(join).orElse(""), digits2 = digit().rep().map(join), integer2 = chars.charIn("+-").opt().then(digits2).array().map((r) => r[0].orElse("") + r[1]), float = integer2.then(chars.char(".").then(digits2).opt().map(joinOrEmpty)).then(chars.charIn("eE").then(integer2).opt().map(joinOrEmpty)).array().map((r) => r[0] + r[1] + r[2]);
  return float.map((r) => parseFloat(r, 10));
}
function digit() {
  return flow.satisfy((v) => "0" <= v && v <= "9").map((c) => parseInt(c));
}
function digits() {
  return digit().rep().map((v) => parseInt(v.join("")));
}
function integer() {
  var join = (r) => r.join(""), digits2 = digit().rep().map(join), integer2 = chars.charIn("+-").opt().then(digits2).array().map((r) => r[0].orElse("") + r[1]);
  return integer2.map((i) => parseInt(i, 10));
}
const numbers = {
  number,
  digit,
  digits,
  integer
};
const C = chars;
const F = flow;
const N = numbers;
class TokenDefinition {
  // value will be determined at runtime while parsing
  constructor(parser, name, priority) {
    this.parser = parser;
    this.name = name;
    this.priority = priority;
  }
}
class Token {
  __token = true;
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
}
class GenLex {
  _nospace = false;
  constructor() {
    this.spaces = defaultSpaces();
    this.definitions = [];
    this.tokensMap = {};
  }
  tokenize(parser, name, priority = 1e3) {
    if (typeof parser === "string") {
      if (name === void 0) {
        name = parser;
      }
      return this.tokenize(C.string(parser), name, priority);
    }
    const definition = new TokenDefinition(parser, name, priority);
    this.definitions.unshift(definition);
    const tokenParser = expectToken(name);
    this.tokensMap[name] = tokenParser;
    return tokenParser;
  }
  keywords(keys, priority = 1e3) {
    return keys.reduce(
      (acc, key) => acc.concat(this.tokenize(key, key, priority)),
      []
    );
  }
  noSeparator() {
    this._nospace = true;
    return this;
  }
  setSeparators(spacesCharacters) {
    this._nospace = false;
    if (typeof spacesCharacters !== "string") {
      throw "setSeparators needs a string as separators, such as ' \r\n\f	' ; use  setSeparatorsParser to declare a parser";
    }
    this.spaces = C.charIn(spacesCharacters).map(() => unit);
    return this;
  }
  /**
   * Set separator Parser. It's up to the parser to accept or not
   * optional repetition
   * @param spacesParser
   */
  setSeparatorsParser(spacesParser) {
    this._nospace = false;
    this.spaces = spacesParser.map(() => unit);
    return this;
  }
  buildTokenizer() {
    const token = this.findTokenByPriority();
    if (this._nospace) {
      return token;
    }
    return this.spaces.optrep().drop().then(token).then(this.spaces.optrep().drop()).single();
  }
  use(grammar) {
    return this.buildTokenizer().chain(grammar);
  }
  findTokenByPriority() {
    const sortedDefinitions = this.definitions.sort(
      (d1, d2) => d2.priority - d1.priority
    );
    return sortedDefinitions.reduce(
      (combinator, definition) => F.try(getTokenParser(definition)).or(combinator),
      F.error()
    );
  }
  remove(tokenName) {
    this.definitions = this.definitions.filter((d) => d.name !== tokenName);
    delete this.tokensMap[tokenName];
  }
  // type: { [key: string]: Parser }
  tokens() {
    return this.tokensMap;
  }
  get(tokenName) {
    return this.tokensMap[tokenName];
  }
}
function getTokenParser(def) {
  return def.parser.map((value) => new Token(def.name, value));
}
function expectToken(name) {
  return F.parse((tokenStream, index) => {
    return tokenStream.get(index).map((token) => {
      const accepted = token.name === name;
      if (accepted) {
        return response.accept(token, tokenStream, index + 1, true);
      } else {
        return response.reject(tokenStream, index, false);
      }
    }).lazyRecoverWith(() => {
      return response.reject(tokenStream, index, false);
    });
  });
}
function defaultSpaces() {
  return C.charIn(" \r\n\f	").map(() => unit);
}
function leanToken(tokenValue) {
  if (tokenValue === void 0 || tokenValue === null) {
    return tokenValue;
  }
  if (tokenValue.__token) {
    return tokenValue.value;
  }
  return tokenValue;
}
let genlex = new GenLex();
genlex.keywords(["null", "false", "true", "{", "}", "[", "]", ":", ","]);
genlex.tokenize(N.number(), "number", 1100).map(leanToken);
genlex.tokenize(C.stringLiteral(), "string", 800).map(leanToken);
export {
  C,
  F,
  Stream2 as S
};
