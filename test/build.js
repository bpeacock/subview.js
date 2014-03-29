(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
}).call(this,require("/Users/brianpeacock/apps/subview/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":4,"/Users/brianpeacock/apps/subview/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":3,"inherits":2}],6:[function(require,module,exports){
"use strict";
/*globals Handlebars: true */
var Handlebars = require("./handlebars.runtime")["default"];

// Compiler imports
var AST = require("./handlebars/compiler/ast")["default"];
var Parser = require("./handlebars/compiler/base").parser;
var parse = require("./handlebars/compiler/base").parse;
var Compiler = require("./handlebars/compiler/compiler").Compiler;
var compile = require("./handlebars/compiler/compiler").compile;
var precompile = require("./handlebars/compiler/compiler").precompile;
var JavaScriptCompiler = require("./handlebars/compiler/javascript-compiler")["default"];

var _create = Handlebars.create;
var create = function() {
  var hb = _create();

  hb.compile = function(input, options) {
    return compile(input, options, hb);
  };
  hb.precompile = function (input, options) {
    return precompile(input, options, hb);
  };

  hb.AST = AST;
  hb.Compiler = Compiler;
  hb.JavaScriptCompiler = JavaScriptCompiler;
  hb.Parser = Parser;
  hb.parse = parse;

  return hb;
};

Handlebars = create();
Handlebars.create = create;

exports["default"] = Handlebars;
},{"./handlebars.runtime":7,"./handlebars/compiler/ast":9,"./handlebars/compiler/base":10,"./handlebars/compiler/compiler":11,"./handlebars/compiler/javascript-compiler":12}],7:[function(require,module,exports){
"use strict";
/*globals Handlebars: true */
var base = require("./handlebars/base");

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)
var SafeString = require("./handlebars/safe-string")["default"];
var Exception = require("./handlebars/exception")["default"];
var Utils = require("./handlebars/utils");
var runtime = require("./handlebars/runtime");

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
var create = function() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = SafeString;
  hb.Exception = Exception;
  hb.Utils = Utils;

  hb.VM = runtime;
  hb.template = function(spec) {
    return runtime.template(spec, hb);
  };

  return hb;
};

var Handlebars = create();
Handlebars.create = create;

exports["default"] = Handlebars;
},{"./handlebars/base":8,"./handlebars/exception":16,"./handlebars/runtime":17,"./handlebars/safe-string":18,"./handlebars/utils":19}],8:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];

var VERSION = "2.0.0-alpha.2";
exports.VERSION = VERSION;var COMPILER_REVISION = 5;
exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '>= 2.0.0'
};
exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

exports.HandlebarsEnvironment = HandlebarsEnvironment;HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function(name, fn, inverse) {
    if (toString.call(name) === objectType) {
      if (inverse || fn) { throw new Exception('Arg not supported with multiple helpers'); }
      Utils.extend(this.helpers, name);
    } else {
      if (inverse) { fn.not = inverse; }
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function(name) {
    delete this.helpers[name];
  },

  registerPartial: function(name, str) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials,  name);
    } else {
      this.partials[name] = str;
    }
  },
  unregisterPartial: function(name) {
    delete this.partials[name];
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function(/* [args, ]options */) {
    if(arguments.length === 1) {
      // A missing field in a {{foo}} constuct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new Exception("Missing helper: '" + arguments[arguments.length-1].name + "'");
    }
  });

  instance.registerHelper('blockHelperMissing', function(context, options) {
    var inverse = options.inverse || function() {}, fn = options.fn;

    if (isFunction(context)) { context = context.call(this); }

    if(context === true) {
      return fn(this);
    } else if(context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if(context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
        options = {data: data};
      }

      return fn(context, options);
    }
  });

  instance.registerHelper('each', function(context, options) {
    // Allow for {{#each}}
    if (!options) {
      options = context;
      context = this;
    }

    var fn = options.fn, inverse = options.inverse;
    var i = 0, ret = "", data;

    var contextPath;
    if (options.data && options.ids) {
      contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (isFunction(context)) { context = context.call(this); }

    if (options.data) {
      data = createFrame(options.data);
    }

    if(context && typeof context === 'object') {
      if (isArray(context)) {
        for(var j = context.length; i<j; i++) {
          if (data) {
            data.index = i;
            data.first = (i === 0);
            data.last  = (i === (context.length-1));

            if (contextPath) {
              data.contextPath = contextPath + i;
            }
          }
          ret = ret + fn(context[i], { data: data });
        }
      } else {
        for(var key in context) {
          if(context.hasOwnProperty(key)) {
            if(data) {
              data.key = key;
              data.index = i;
              data.first = (i === 0);

              if (contextPath) {
                data.contextPath = contextPath + key;
              }
            }
            ret = ret + fn(context[key], {data: data});
            i++;
          }
        }
      }
    }

    if(i === 0){
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function(conditional, options) {
    if (isFunction(conditional)) { conditional = conditional.call(this); }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if ((!options.hash.includeZero && !conditional) || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function(conditional, options) {
    return instance.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn, hash: options.hash});
  });

  instance.registerHelper('with', function(context, options) {
    if (isFunction(context)) { context = context.call(this); }

    var fn = options.fn;

    if (!Utils.isEmpty(context)) {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
        options = {data:data};
      }

      return fn(context, options);
    }
  });

  instance.registerHelper('log', function(context, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, context);
  });

  instance.registerHelper('lookup', function(obj, field, options) {
    return obj && obj[field];
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 3,

  // can be overridden in the host environment
  log: function(level, obj) {
    if (logger.level <= level) {
      var method = logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};
exports.logger = logger;
function log(level, obj) { logger.log(level, obj); }

exports.log = log;var createFrame = function(object) {
  var frame = Utils.extend({}, object);
  frame._parent = object;
  return frame;
};
exports.createFrame = createFrame;
},{"./exception":16,"./utils":19}],9:[function(require,module,exports){
"use strict";
var Exception = require("../exception")["default"];

function LocationInfo(locInfo){
  locInfo = locInfo || {};
  this.firstLine   = locInfo.first_line;
  this.firstColumn = locInfo.first_column;
  this.lastColumn  = locInfo.last_column;
  this.lastLine    = locInfo.last_line;
}

var AST = {
  ProgramNode: function(statements, inverseStrip, inverse, locInfo) {
    var inverseLocationInfo, firstInverseNode;
    if (arguments.length === 3) {
      locInfo = inverse;
      inverse = null;
    } else if (arguments.length === 2) {
      locInfo = inverseStrip;
      inverseStrip = null;
    }

    LocationInfo.call(this, locInfo);
    this.type = "program";
    this.statements = statements;
    this.strip = {};

    if(inverse) {
      firstInverseNode = inverse[0];
      if (firstInverseNode) {
        inverseLocationInfo = {
          first_line: firstInverseNode.firstLine,
          last_line: firstInverseNode.lastLine,
          last_column: firstInverseNode.lastColumn,
          first_column: firstInverseNode.firstColumn
        };
        this.inverse = new AST.ProgramNode(inverse, inverseStrip, inverseLocationInfo);
      } else {
        this.inverse = new AST.ProgramNode(inverse, inverseStrip);
      }
      this.strip.right = inverseStrip.left;
    } else if (inverseStrip) {
      this.strip.left = inverseStrip.right;
    }
  },

  MustacheNode: function(rawParams, hash, open, strip, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "mustache";
    this.strip = strip;

    // Open may be a string parsed from the parser or a passed boolean flag
    if (open != null && open.charAt) {
      // Must use charAt to support IE pre-10
      var escapeFlag = open.charAt(3) || open.charAt(2);
      this.escaped = escapeFlag !== '{' && escapeFlag !== '&';
    } else {
      this.escaped = !!open;
    }

    if (rawParams instanceof AST.SexprNode) {
      this.sexpr = rawParams;
    } else {
      // Support old AST API
      this.sexpr = new AST.SexprNode(rawParams, hash);
    }

    this.sexpr.isRoot = true;

    // Support old AST API that stored this info in MustacheNode
    this.id = this.sexpr.id;
    this.params = this.sexpr.params;
    this.hash = this.sexpr.hash;
    this.eligibleHelper = this.sexpr.eligibleHelper;
    this.isHelper = this.sexpr.isHelper;
  },

  SexprNode: function(rawParams, hash, locInfo) {
    LocationInfo.call(this, locInfo);

    this.type = "sexpr";
    this.hash = hash;

    var id = this.id = rawParams[0];
    var params = this.params = rawParams.slice(1);

    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    this.isHelper = params.length || hash;

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    this.eligibleHelper = this.isHelper || id.isSimple;

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
  },

  PartialNode: function(partialName, context, hash, strip, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type         = "partial";
    this.partialName  = partialName;
    this.context      = context;
    this.hash = hash;
    this.strip = strip;
  },

  BlockNode: function(mustache, program, inverse, close, locInfo) {
    LocationInfo.call(this, locInfo);

    if(mustache.sexpr.id.original !== close.path.original) {
      throw new Exception(mustache.sexpr.id.original + " doesn't match " + close.path.original, this);
    }

    this.type = 'block';
    this.mustache = mustache;
    this.program  = program;
    this.inverse  = inverse;

    this.strip = {
      left: mustache.strip.left,
      right: close.strip.right
    };

    (program || inverse).strip.left = mustache.strip.right;
    (inverse || program).strip.right = close.strip.left;

    if (inverse && !program) {
      this.isInverse = true;
    }
  },

  RawBlockNode: function(mustache, content, close, locInfo) {
    LocationInfo.call(this, locInfo);

    if (mustache.sexpr.id.original !== close) {
      throw new Exception(mustache.sexpr.id.original + " doesn't match " + close, this);
    }

    content = new AST.ContentNode(content, locInfo);

    this.type = 'block';
    this.mustache = mustache;
    this.program = new AST.ProgramNode([content], locInfo);
  },

  ContentNode: function(string, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "content";
    this.string = string;
  },

  HashNode: function(pairs, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "hash";
    this.pairs = pairs;
  },

  IdNode: function(parts, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "ID";

    var original = "",
        dig = [],
        depth = 0,
        depthString = '';

    for(var i=0,l=parts.length; i<l; i++) {
      var part = parts[i].part;
      original += (parts[i].separator || '') + part;

      if (part === ".." || part === "." || part === "this") {
        if (dig.length > 0) {
          throw new Exception("Invalid path: " + original, this);
        } else if (part === "..") {
          depth++;
          depthString += '../';
        } else {
          this.isScoped = true;
        }
      } else {
        dig.push(part);
      }
    }

    this.original = original;
    this.parts    = dig;
    this.string   = dig.join('.');
    this.depth    = depth;
    this.idName   = depthString + this.string;

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;

    this.stringModeValue = this.string;
  },

  PartialNameNode: function(name, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "PARTIAL_NAME";
    this.name = name.original;
  },

  DataNode: function(id, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "DATA";
    this.id = id;
    this.stringModeValue = id.stringModeValue;
    this.idName = '@' + id.stringModeValue;
  },

  StringNode: function(string, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "STRING";
    this.original =
      this.string =
      this.stringModeValue = string;
  },

  NumberNode: function(number, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "NUMBER";
    this.original =
      this.number = number;
    this.stringModeValue = Number(number);
  },

  BooleanNode: function(bool, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "BOOLEAN";
    this.bool = bool;
    this.stringModeValue = bool === "true";
  },

  CommentNode: function(comment, locInfo) {
    LocationInfo.call(this, locInfo);
    this.type = "comment";
    this.comment = comment;
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// most modify the object to operate properly.
exports["default"] = AST;
},{"../exception":16}],10:[function(require,module,exports){
"use strict";
var parser = require("./parser")["default"];
var AST = require("./ast")["default"];

exports.parser = parser;

function parse(input) {
  // Just return if an already-compile AST was passed in.
  if(input.constructor === AST.ProgramNode) { return input; }

  parser.yy = AST;
  return parser.parse(input);
}

exports.parse = parse;
},{"./ast":9,"./parser":13}],11:[function(require,module,exports){
"use strict";
var Exception = require("../exception")["default"];

function Compiler() {}

exports.Compiler = Compiler;// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  disassemble: function() {
    var opcodes = this.opcodes, opcode, out = [], params, param;

    for (var i=0, l=opcodes.length; i<l; i++) {
      opcode = opcodes[i];

      if (opcode.opcode === 'DECLARE') {
        out.push("DECLARE " + opcode.name + "=" + opcode.value);
      } else {
        params = [];
        for (var j=0; j<opcode.args.length; j++) {
          param = opcode.args[j];
          if (typeof param === "string") {
            param = "\"" + param.replace("\n", "\\n") + "\"";
          }
          params.push(param);
        }
        out.push(opcode.opcode + " " + params.join(" "));
      }
    }

    return out.join("\n");
  },

  equals: function(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || opcode.args.length !== otherOpcode.args.length) {
        return false;
      }
      for (var j = 0; j < opcode.args.length; j++) {
        if (opcode.args[j] !== otherOpcode.args[j]) {
          return false;
        }
      }
    }

    len = this.children.length;
    if (other.children.length !== len) {
      return false;
    }
    for (i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function(program, options) {
    this.opcodes = [];
    this.children = [];
    this.depths = {list: []};
    this.options = options;
    this.stringParams = options.stringParams;
    this.trackIds = options.trackIds;

    // These changes will propagate to the other compiler components
    var knownHelpers = this.options.knownHelpers;
    this.options.knownHelpers = {
      'helperMissing': true,
      'blockHelperMissing': true,
      'each': true,
      'if': true,
      'unless': true,
      'with': true,
      'log': true,
      'lookup': true
    };
    if (knownHelpers) {
      for (var name in knownHelpers) {
        this.options.knownHelpers[name] = knownHelpers[name];
      }
    }

    return this.accept(program);
  },

  accept: function(node) {
    var strip = node.strip || {},
        ret;
    if (strip.left) {
      this.opcode('strip');
    }

    ret = this[node.type](node);

    if (strip.right) {
      this.opcode('strip');
    }

    return ret;
  },

  program: function(program) {
    var statements = program.statements;

    for(var i=0, l=statements.length; i<l; i++) {
      this.accept(statements[i]);
    }
    this.isSimple = l === 1;

    this.depths.list = this.depths.list.sort(function(a, b) {
      return a - b;
    });

    return this;
  },

  compileProgram: function(program) {
    var result = new this.compiler().compile(program, this.options);
    var guid = this.guid++, depth;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;

    for(var i=0, l=result.depths.list.length; i<l; i++) {
      depth = result.depths.list[i];

      if(depth < 2) { continue; }
      else { this.addDepth(depth - 1); }
    }

    return guid;
  },

  block: function(block) {
    var mustache = block.mustache,
        program = block.program,
        inverse = block.inverse;

    if (program) {
      program = this.compileProgram(program);
    }

    if (inverse) {
      inverse = this.compileProgram(inverse);
    }

    var sexpr = mustache.sexpr;
    var type = this.classifySexpr(sexpr);

    if (type === "helper") {
      this.helperSexpr(sexpr, program, inverse);
    } else if (type === "simple") {
      this.simpleSexpr(sexpr);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue', sexpr.id.original);
    } else {
      this.ambiguousSexpr(sexpr, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  hash: function(hash) {
    var pairs = hash.pairs, i, l;

    this.opcode('pushHash');

    for(i=0, l=pairs.length; i<l; i++) {
      this.pushParam(pairs[i][1]);
    }
    while(i--) {
      this.opcode('assignToHash', pairs[i][0]);
    }
    this.opcode('popHash');
  },

  partial: function(partial) {
    var partialName = partial.partialName;
    this.usePartial = true;

    if (partial.hash) {
      this.accept(partial.hash);
    } else {
      this.opcode('push', 'undefined');
    }

    if (partial.context) {
      this.accept(partial.context);
    } else {
      this.opcode('push', 'depth0');
    }

    this.opcode('invokePartial', partialName.name);
    this.opcode('append');
  },

  content: function(content) {
    this.opcode('appendContent', content.string);
  },

  mustache: function(mustache) {
    this.sexpr(mustache.sexpr);

    if(mustache.escaped && !this.options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },

  ambiguousSexpr: function(sexpr, program, inverse) {
    var id = sexpr.id,
        name = id.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', id.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleSexpr: function(sexpr) {
    var id = sexpr.id;

    if (id.type === 'DATA') {
      this.DATA(id);
    } else if (id.parts.length) {
      this.ID(id);
    } else {
      // Simplified ID for `this`
      this.addDepth(id.depth);
      this.opcode('getContext', id.depth);
      this.opcode('pushContext');
    }

    this.opcode('resolvePossibleLambda');
  },

  helperSexpr: function(sexpr, program, inverse) {
    var params = this.setupFullMustacheParams(sexpr, program, inverse),
        id = sexpr.id,
        name = id.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new Exception("You specified knownHelpersOnly, but used the unknown helper " + name, sexpr);
    } else {
      this.ID(id);
      this.opcode('invokeHelper', params.length, name, sexpr.isRoot);
    }
  },

  sexpr: function(sexpr) {
    var type = this.classifySexpr(sexpr);

    if (type === "simple") {
      this.simpleSexpr(sexpr);
    } else if (type === "helper") {
      this.helperSexpr(sexpr);
    } else {
      this.ambiguousSexpr(sexpr);
    }
  },

  ID: function(id) {
    this.addDepth(id.depth);
    this.opcode('getContext', id.depth);

    var name = id.parts[0];
    if (!name) {
      this.opcode('pushContext');
    } else {
      this.opcode('lookupOnContext', id.parts[0]);
    }

    for(var i=1, l=id.parts.length; i<l; i++) {
      this.opcode('lookup', id.parts[i]);
    }
  },

  DATA: function(data) {
    this.options.data = true;
    this.opcode('lookupData', data.id.depth);
    var parts = data.id.parts;
    for(var i=0, l=parts.length; i<l; i++) {
      this.opcode('lookup', parts[i]);
    }
  },

  STRING: function(string) {
    this.opcode('pushString', string.string);
  },

  NUMBER: function(number) {
    this.opcode('pushLiteral', number.number);
  },

  BOOLEAN: function(bool) {
    this.opcode('pushLiteral', bool.bool);
  },

  comment: function() {},

  // HELPERS
  opcode: function(name) {
    this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
  },

  declare: function(name, value) {
    this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
  },

  addDepth: function(depth) {
    if(depth === 0) { return; }

    if(!this.depths[depth]) {
      this.depths[depth] = true;
      this.depths.list.push(depth);
    }
  },

  classifySexpr: function(sexpr) {
    var isHelper   = sexpr.isHelper;
    var isEligible = sexpr.eligibleHelper;
    var options    = this.options;

    // if ambiguous, we can possibly resolve the ambiguity now
    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
    if (isEligible && !isHelper) {
      var name = sexpr.id.parts[0];

      if (options.knownHelpers[name]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) { return "helper"; }
    else if (isEligible) { return "ambiguous"; }
    else { return "simple"; }
  },

  pushParams: function(params) {
    for(var i=0, l=params.length; i<l; i++) {
      this.pushParam(params[i]);
    }
  },

  pushParam: function(val) {
    if (this.stringParams) {
      if(val.depth) {
        this.addDepth(val.depth);
      }
      this.opcode('getContext', val.depth || 0);
      this.opcode('pushStringParam', val.stringModeValue, val.type);

      if (val.type === 'sexpr') {
        // Subexpressions get evaluated and passed in
        // in string params mode.
        this.sexpr(val);
      }
    } else {
      if (this.trackIds) {
        this.opcode('pushId', val.type, val.idName || val.stringModeValue);
      }
      this.accept(val);
    }
  },

  setupFullMustacheParams: function(sexpr, program, inverse) {
    var params = sexpr.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if (sexpr.hash) {
      this.hash(sexpr.hash);
    } else {
      this.opcode('emptyHash');
    }

    return params;
  }
};

function precompile(input, options, env) {
  if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.precompile. You passed " + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }

  var ast = env.parse(input);
  var environment = new env.Compiler().compile(ast, options);
  return new env.JavaScriptCompiler().compile(environment, options);
}

exports.precompile = precompile;function compile(input, options, env) {
  if (input == null || (typeof input !== 'string' && input.constructor !== env.AST.ProgramNode)) {
    throw new Exception("You must pass a string or Handlebars AST to Handlebars.compile. You passed " + input);
  }

  options = options || {};

  if (!('data' in options)) {
    options.data = true;
  }

  var compiled;

  function compileInput() {
    var ast = env.parse(input);
    var environment = new env.Compiler().compile(ast, options);
    var templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
    return env.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  var ret = function(context, options) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.call(this, context, options);
  };
  ret.child = function(i) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.child(i);
  };
  return ret;
}

exports.compile = compile;
},{"../exception":16}],12:[function(require,module,exports){
"use strict";
var COMPILER_REVISION = require("../base").COMPILER_REVISION;
var REVISION_CHANGES = require("../base").REVISION_CHANGES;
var log = require("../base").log;
var Exception = require("../exception")["default"];

function Literal(value) {
  this.value = value;
}

function JavaScriptCompiler() {}

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function(parent, name /* , type*/) {
    var wrap,
        ret;
    if (parent.indexOf('depth') === 0) {
      wrap = true;
    }

    if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      ret = parent + "." + name;
    } else {
      ret = parent + "['" + name + "']";
    }

    if (wrap) {
      return '(' + parent + ' && ' + ret + ')';
    } else {
      return ret;
    }
  },

  compilerInfo: function() {
    var revision = COMPILER_REVISION,
        versions = REVISION_CHANGES[revision];
    return [revision, versions];
  },

  appendToBuffer: function(string) {
    if (this.environment.isSimple) {
      return "return " + string + ";";
    } else {
      return {
        appendToBuffer: true,
        content: string,
        toString: function() { return "buffer += " + string + ";"; }
      };
    }
  },

  initializeBuffer: function() {
    return this.quotedString("");
  },

  namespace: "Handlebars",
  // END PUBLIC API

  compile: function(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options || {};
    this.stringParams = this.options.stringParams;
    this.trackIds = this.options.trackIds;
    this.precompile = !asObject;

    log('debug', this.environment.disassemble() + "\n\n");

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      programs: [],
      environments: []
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.aliases = {};
    this.registers = { list: [] };
    this.hashes = [];
    this.compileStack = [];
    this.inlineStack = [];

    this.compileChildren(environment, options);

    var opcodes = environment.opcodes,
        opcode,
        i,
        l;

    for (i = 0, l = opcodes.length; i < l; i++) {
      opcode = opcodes[i];

      if(opcode.opcode === 'DECLARE') {
        this[opcode.name] = opcode.value;
      } else {
        this[opcode.opcode].apply(this, opcode.args);
      }

      // Reset the stripNext flag if it was not set by this operation.
      if (opcode.opcode !== this.stripNext) {
        this.stripNext = false;
      }
    }

    // Flush any trailing content that might be pending.
    this.pushSource('');

    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
      throw new Exception('Compile completed with content left on stack');
    }

    var fn = this.createFunctionContext(asObject);
    if (!this.isChild) {
      var ret = {
        compiler: this.compilerInfo(),
        main: fn
      };
      var programs = this.context.programs;
      for (i = 0, l = programs.length; i < l; i++) {
        if (programs[i]) {
          ret[i] = programs[i];
        }
      }

      if (this.environment.usePartial) {
        ret.usePartial = true;
      }
      if (this.options.data) {
        ret.useData = true;
      }

      if (!asObject) {
        ret.compiler = JSON.stringify(ret.compiler);
        ret = this.objectLiteral(ret);
      }

      return ret;
    } else {
      return fn;
    }
  },

  preamble: function() {
    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = [];
  },

  createFunctionContext: function(asObject) {
    var varDeclarations = '';

    var locals = this.stackVars.concat(this.registers.list);
    if(locals.length > 0) {
      varDeclarations += ", " + locals.join(", ");
    }

    // Generate minimizer alias mappings
    for (var alias in this.aliases) {
      if (this.aliases.hasOwnProperty(alias)) {
        varDeclarations += ', ' + alias + '=' + this.aliases[alias];
      }
    }

    var params = ["depth0", "helpers", "partials", "data"];

    for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
      params.push("depth" + this.environment.depths.list[i]);
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource(varDeclarations);

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      return 'function(' + params.join(',') + ') {\n  ' + source + '}';
    }
  },
  mergeSource: function(varDeclarations) {
    var source = '',
        buffer,
        appendOnly = !this.forceBuffer,
        appendFirst;

    for (var i = 0, len = this.source.length; i < len; i++) {
      var line = this.source[i];
      if (line.appendToBuffer) {
        if (buffer) {
          buffer = buffer + '\n    + ' + line.content;
        } else {
          buffer = line.content;
        }
      } else {
        if (buffer) {
          if (!source) {
            appendFirst = true;
            source = buffer + ';\n  ';
          } else {
            source += 'buffer += ' + buffer + ';\n  ';
          }
          buffer = undefined;
        }
        source += line + '\n  ';

        if (!this.environment.isSimple) {
          appendOnly = false;
        }
      }
    }

    if (appendOnly) {
      if (buffer || !source) {
        source += 'return ' + (buffer || '""') + ';\n';
      }
    } else {
      varDeclarations += ", buffer = " + (appendFirst ? '' : this.initializeBuffer());
      if (buffer) {
        source += 'return buffer + ' + buffer + ';\n';
      } else {
        source += 'return buffer;\n';
      }
    }

    if (varDeclarations) {
      source = 'var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n  ') + source;
    }

    return source;
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function(name) {
    this.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

    var params = ["depth0"];
    this.setupParams(name, 0, params);

    this.replaceStack(function(current) {
      params.splice(1, 0, current);
      return "blockHelperMissing.call(" + params.join(", ") + ")";
    });
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function() {
    this.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

    // We're being a bit cheeky and reusing the options value from the prior exec
    var params = ["depth0"];
    this.setupParams('', 0, params, true);

    this.flushInline();

    var current = this.topStack();
    params.splice(1, 0, current);

    this.pushSource("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function(content) {
    if (this.pendingContent) {
      content = this.pendingContent + content;
    }
    if (this.stripNext) {
      content = content.replace(/^\s+/, '');
    }

    this.pendingContent = content;
  },

  // [strip]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Removes any trailing whitespace from the prior content node and flags
  // the next operation for stripping if it is a content node.
  strip: function() {
    if (this.pendingContent) {
      this.pendingContent = this.pendingContent.replace(/\s+$/, '');
    }
    this.stripNext = 'strip';
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function() {
    // Force anything that is inlined onto the stack so we don't have duplication
    // when we examine local
    this.flushInline();
    var local = this.popStack();
    this.pushSource("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
    if (this.environment.isSimple) {
      this.pushSource("else { " + this.appendToBuffer("''") + " }");
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function() {
    this.aliases.escapeExpression = 'this.escapeExpression';

    this.pushSource(this.appendToBuffer("escapeExpression(" + this.popStack() + ")"));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function(depth) {
    if(this.lastContext !== depth) {
      this.lastContext = depth;
    }
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function(name) {
    this.push(this.nameLookup('depth' + this.lastContext, name, 'context'));
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function() {
    this.pushStackLiteral('depth' + this.lastContext);
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function() {
    this.aliases.functionType = '"function"';

    this.replaceStack(function(current) {
      return "typeof " + current + " === functionType ? " + current + ".apply(depth0) : " + current;
    });
  },

  // [lookup]
  //
  // On stack, before: value, ...
  // On stack, after: value[name], ...
  //
  // Replace the value on the stack with the result of looking
  // up `name` on `value`
  lookup: function(name) {
    this.replaceStack(function(current) {
      return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
    });
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data, ...
  //
  // Push the data lookup operator
  lookupData: function(depth) {
    if (!depth) {
      this.pushStackLiteral('data');
    } else {
      this.pushStackLiteral('this.data(data, ' + depth + ')');
    }
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function(string, type) {
    this.pushStackLiteral('depth' + this.lastContext);

    this.pushString(type);

    // If it's a subexpression, the string result
    // will be pushed after this opcode.
    if (type !== 'sexpr') {
      if (typeof string === 'string') {
        this.pushString(string);
      } else {
        this.pushStackLiteral(string);
      }
    }
  },

  emptyHash: function() {
    this.pushStackLiteral('{}');

    if (this.trackIds) {
      this.push('{}'); // hashIds
    }
    if (this.stringParams) {
      this.push('{}'); // hashContexts
      this.push('{}'); // hashTypes
    }
  },
  pushHash: function() {
    if (this.hash) {
      this.hashes.push(this.hash);
    }
    this.hash = {values: [], types: [], contexts: [], ids: []};
  },
  popHash: function() {
    var hash = this.hash;
    this.hash = this.hashes.pop();

    if (this.trackIds) {
      this.push('{' + hash.ids.join(',') + '}');
    }
    if (this.stringParams) {
      this.push('{' + hash.contexts.join(',') + '}');
      this.push('{' + hash.types.join(',') + '}');
    }

    this.push('{\n    ' + hash.values.join(',\n    ') + '\n  }');
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [push]
  //
  // On stack, before: ...
  // On stack, after: expr, ...
  //
  // Push an expression onto the stack
  push: function(expr) {
    this.inlineStack.push(expr);
    return expr;
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function(paramSize, name, isRoot) {
    this.aliases.helperMissing = 'helpers.helperMissing';
    this.useRegister('helper');

    var nonHelper = this.popStack();
    var helper = this.setupHelper(paramSize, name);

    var lookup = 'helper = ' + helper.name + ' || ' + nonHelper + ' || helperMissing';
    if (helper.paramsInit) {
      lookup += ',' + helper.paramsInit;
    }

    this.push('(' + lookup + ',helper.call(' + helper.callParams + '))');

    // Always flush subexpressions. This is both to prevent the compounding size issue that
    // occurs when the code has to be duplicated for inlining and also to prevent errors
    // due to the incorrect options object being passed due to the shared register.
    if (!isRoot) {
      this.flushInline();
    }
  },

  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(helper.name + ".call(" + helper.callParams + ")");
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function(name, helperCall) {
    this.aliases.functionType = '"function"';
    this.useRegister('helper');

    this.emptyHash();
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');
    var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');

    this.push(
      '((helper = ' + helperName + ' || ' + nonHelper
        + (helper.paramsInit ? '),(' + helper.paramsInit : '') + '),'
      + '(typeof helper === functionType ? helper.call(' + helper.callParams + ') : helper))');
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function(name) {
    var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), this.popStack(), "helpers", "partials"];

    if (this.options.data) {
      params.push("data");
    }

    this.push("this.invokePartial(" + params.join(", ") + ")");
  },

  // [assignToHash]
  //
  // On stack, before: value, ..., hash, ...
  // On stack, after: ..., hash, ...
  //
  // Pops a value off the stack and assigns it to the current hash
  assignToHash: function(key) {
    var value = this.popStack(),
        context,
        type,
        id;

    if (this.trackIds) {
      id = this.popStack();
    }
    if (this.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts.push("'" + key + "': " + context);
    }
    if (type) {
      hash.types.push("'" + key + "': " + type);
    }
    if (id) {
      hash.ids.push("'" + key + "': " + id);
    }
    hash.values.push("'" + key + "': (" + value + ")");
  },

  pushId: function(type, name) {
    if (type === 'ID' || type === 'DATA') {
      this.pushString(name);
    } else if (type === 'sexpr') {
      this.pushStackLiteral('true');
    } else {
      this.pushStackLiteral('null');
    }
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function(environment, options) {
    var children = environment.children, child, compiler;

    for(var i=0, l=children.length; i<l; i++) {
      child = children[i];
      compiler = new this.compiler();

      var index = this.matchExistingProgram(child);

      if (index == null) {
        this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
        index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
        this.context.environments[index] = child;
      } else {
        child.index = index;
        child.name = 'program' + index;
      }
    }
  },
  matchExistingProgram: function(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return i;
      }
    }
  },

  programExpression: function(guid) {
    if(guid == null) {
      return 'this.noop';
    }

    var child = this.environment.children[guid],
        depths = child.depths.list, depth;

    var programParams = [child.index, 'data'];

    for(var i=0, l = depths.length; i<l; i++) {
      depth = depths[i];

      programParams.push('depth' + (depth - 1));
    }

    return (depths.length === 0 ? 'this.program(' : 'this.programWithDepth(') + programParams.join(', ') + ')';
  },

  register: function(name, val) {
    this.useRegister(name);
    this.pushSource(name + " = " + val + ";");
  },

  useRegister: function(name) {
    if(!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  pushStackLiteral: function(item) {
    return this.push(new Literal(item));
  },

  pushSource: function(source) {
    if (this.pendingContent) {
      this.source.push(this.appendToBuffer(this.quotedString(this.pendingContent)));
      this.pendingContent = undefined;
    }

    if (source) {
      this.source.push(source);
    }
  },

  pushStack: function(item) {
    this.flushInline();

    var stack = this.incrStack();
    if (item) {
      this.pushSource(stack + " = " + item + ";");
    }
    this.compileStack.push(stack);
    return stack;
  },

  replaceStack: function(callback) {
    var prefix = '',
        inline = this.isInline(),
        stack,
        createdStack,
        usedLiteral;

    // If we are currently inline then we want to merge the inline statement into the
    // replacement statement via ','
    if (inline) {
      var top = this.popStack(true);

      if (top instanceof Literal) {
        // Literals do not need to be inlined
        stack = top.value;
        usedLiteral = true;
      } else {
        // Get or create the current stack name for use by the inline
        createdStack = !this.stackSlot;
        var name = !createdStack ? this.topStackName() : this.incrStack();

        prefix = '(' + this.push(name) + ' = ' + top + '),';
        stack = this.topStack();
      }
    } else {
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (inline) {
      if (!usedLiteral) {
        this.popStack();
      }
      if (createdStack) {
        this.stackSlot--;
      }
      this.push('(' + prefix + item + ')');
    } else {
      // Prevent modification of the context depth variable. Through replaceStack
      if (!/^stack/.test(stack)) {
        stack = this.nextStack();
      }

      this.pushSource(stack + " = (" + prefix + item + ");");
    }
    return stack;
  },

  nextStack: function() {
    return this.pushStack();
  },

  incrStack: function() {
    this.stackSlot++;
    if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
    return this.topStackName();
  },
  topStackName: function() {
    return "stack" + this.stackSlot;
  },
  flushInline: function() {
    var inlineStack = this.inlineStack;
    if (inlineStack.length) {
      this.inlineStack = [];
      for (var i = 0, len = inlineStack.length; i < len; i++) {
        var entry = inlineStack[i];
        if (entry instanceof Literal) {
          this.compileStack.push(entry);
        } else {
          this.pushStack(entry);
        }
      }
    }
  },
  isInline: function() {
    return this.inlineStack.length;
  },

  popStack: function(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && (item instanceof Literal)) {
      return item.value;
    } else {
      if (!inline) {
        if (!this.stackSlot) {
          throw new Exception('Invalid stack pop');
        }
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function(wrapped) {
    var stack = (this.isInline() ? this.inlineStack : this.compileStack),
        item = stack[stack.length - 1];

    if (!wrapped && (item instanceof Literal)) {
      return item.value;
    } else {
      return item;
    }
  },

  quotedString: function(str) {
    return '"' + str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\u2028/g, '\\u2028')   // Per Ecma-262 7.3 + 7.8.4
      .replace(/\u2029/g, '\\u2029') + '"';
  },

  objectLiteral: function(obj) {
    var pairs = [];

    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        pairs.push(this.quotedString(key) + ':' + obj[key]);
      }
    }

    return '{' + pairs.join(',') + '}';
  },

  setupHelper: function(paramSize, name, blockHelper) {
    var params = [],
        paramsInit = this.setupParams(name, paramSize, params, blockHelper);
    var foundHelper = this.nameLookup('helpers', name, 'helper');

    return {
      params: params,
      paramsInit: paramsInit,
      name: foundHelper,
      callParams: ["depth0"].concat(params).join(", ")
    };
  },

  setupOptions: function(helper, paramSize, params) {
    var options = {}, contexts = [], types = [], ids = [], param, inverse, program;

    options.name = this.quotedString(helper);
    options.hash = this.popStack();

    if (this.trackIds) {
      options.hashIds = this.popStack();
    }
    if (this.stringParams) {
      options.hashTypes = this.popStack();
      options.hashContexts = this.popStack();
    }

    inverse = this.popStack();
    program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      if (!program) {
        program = 'this.noop';
      }

      if (!inverse) {
        inverse = 'this.noop';
      }

      options.fn = program;
      options.inverse = inverse;
    }

    // The parameters go on to the stack in order (making sure that they are evaluated in order)
    // so we need to pop them off the stack in reverse order
    var i = paramSize;
    while (i--) {
      param = this.popStack();
      params[i] = param;

      if (this.trackIds) {
        ids[i] = this.popStack();
      }
      if (this.stringParams) {
        types[i] = this.popStack();
        contexts[i] = this.popStack();
      }
    }

    if (this.trackIds) {
      options.ids = "[" + ids.join(",") + "]";
    }
    if (this.stringParams) {
      options.types = "[" + types.join(",") + "]";
      options.contexts = "[" + contexts.join(",") + "]";
    }

    if (this.options.data) {
      options.data = "data";
    }

    return options;
  },

  // the params and contexts arguments are passed in arrays
  // to fill in
  setupParams: function(helperName, paramSize, params, useRegister) {
    var options = this.objectLiteral(this.setupOptions(helperName, paramSize, params));

    if (useRegister) {
      this.useRegister('options');
      params.push('options');
      return 'options=' + options;
    } else {
      params.push(options);
      return '';
    }
  }
};

var reservedWords = (
  "break else new var" +
  " case finally return void" +
  " catch for switch while" +
  " continue function this with" +
  " default if throw" +
  " delete in try" +
  " do instanceof typeof" +
  " abstract enum int short" +
  " boolean export interface static" +
  " byte extends long super" +
  " char final native synchronized" +
  " class float package throws" +
  " const goto private transient" +
  " debugger implements protected volatile" +
  " double import public let yield"
).split(" ");

var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

for(var i=0, l=reservedWords.length; i<l; i++) {
  compilerWords[reservedWords[i]] = true;
}

JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
  return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
};

exports["default"] = JavaScriptCompiler;
},{"../base":8,"../exception":16}],13:[function(require,module,exports){
"use strict";
/* jshint ignore:start */
/* Jison generated parser */
var handlebars = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"root":3,"statements":4,"EOF":5,"program":6,"simpleInverse":7,"statement":8,"openRawBlock":9,"CONTENT":10,"END_RAW_BLOCK":11,"openInverse":12,"closeBlock":13,"openBlock":14,"mustache":15,"partial":16,"COMMENT":17,"OPEN_RAW_BLOCK":18,"sexpr":19,"CLOSE_RAW_BLOCK":20,"OPEN_BLOCK":21,"CLOSE":22,"OPEN_INVERSE":23,"OPEN_ENDBLOCK":24,"path":25,"OPEN":26,"OPEN_UNESCAPED":27,"CLOSE_UNESCAPED":28,"OPEN_PARTIAL":29,"partialName":30,"param":31,"partial_option0":32,"partial_option1":33,"sexpr_repetition0":34,"sexpr_option0":35,"dataName":36,"STRING":37,"NUMBER":38,"BOOLEAN":39,"OPEN_SEXPR":40,"CLOSE_SEXPR":41,"hash":42,"hash_repetition_plus0":43,"hashSegment":44,"ID":45,"EQUALS":46,"DATA":47,"pathSegments":48,"SEP":49,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",10:"CONTENT",11:"END_RAW_BLOCK",17:"COMMENT",18:"OPEN_RAW_BLOCK",20:"CLOSE_RAW_BLOCK",21:"OPEN_BLOCK",22:"CLOSE",23:"OPEN_INVERSE",24:"OPEN_ENDBLOCK",26:"OPEN",27:"OPEN_UNESCAPED",28:"CLOSE_UNESCAPED",29:"OPEN_PARTIAL",37:"STRING",38:"NUMBER",39:"BOOLEAN",40:"OPEN_SEXPR",41:"CLOSE_SEXPR",45:"ID",46:"EQUALS",47:"DATA",49:"SEP"},
productions_: [0,[3,2],[3,1],[6,2],[6,3],[6,2],[6,1],[6,1],[6,0],[4,1],[4,2],[8,3],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[9,3],[14,3],[12,3],[13,3],[15,3],[15,3],[16,5],[16,4],[7,2],[19,3],[19,1],[31,1],[31,1],[31,1],[31,1],[31,1],[31,3],[42,1],[44,3],[30,1],[30,1],[30,1],[36,2],[25,1],[48,3],[48,1],[32,0],[32,1],[33,0],[33,1],[34,0],[34,2],[35,0],[35,1],[43,1],[43,2]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1: return new yy.ProgramNode($$[$0-1], this._$); 
break;
case 2: return new yy.ProgramNode([], this._$); 
break;
case 3:this.$ = new yy.ProgramNode([], $$[$0-1], $$[$0], this._$);
break;
case 4:this.$ = new yy.ProgramNode($$[$0-2], $$[$0-1], $$[$0], this._$);
break;
case 5:this.$ = new yy.ProgramNode($$[$0-1], $$[$0], [], this._$);
break;
case 6:this.$ = new yy.ProgramNode($$[$0], this._$);
break;
case 7:this.$ = new yy.ProgramNode([], this._$);
break;
case 8:this.$ = new yy.ProgramNode([], this._$);
break;
case 9:this.$ = [$$[$0]];
break;
case 10: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 11:this.$ = new yy.RawBlockNode($$[$0-2], $$[$0-1], $$[$0], this._$);
break;
case 12:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0], this._$);
break;
case 13:this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0], this._$);
break;
case 14:this.$ = $$[$0];
break;
case 15:this.$ = $$[$0];
break;
case 16:this.$ = new yy.ContentNode($$[$0], this._$);
break;
case 17:this.$ = new yy.CommentNode($$[$0], this._$);
break;
case 18:this.$ = new yy.MustacheNode($$[$0-1], null, '', '', this._$);
break;
case 19:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 20:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 21:this.$ = {path: $$[$0-1], strip: stripFlags($$[$0-2], $$[$0])};
break;
case 22:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 23:this.$ = new yy.MustacheNode($$[$0-1], null, $$[$0-2], stripFlags($$[$0-2], $$[$0]), this._$);
break;
case 24:this.$ = new yy.PartialNode($$[$0-3], $$[$0-2], $$[$0-1], stripFlags($$[$0-4], $$[$0]), this._$);
break;
case 25:this.$ = new yy.PartialNode($$[$0-2], undefined, $$[$0-1], stripFlags($$[$0-3], $$[$0]), this._$);
break;
case 26:this.$ = stripFlags($$[$0-1], $$[$0]);
break;
case 27:this.$ = new yy.SexprNode([$$[$0-2]].concat($$[$0-1]), $$[$0], this._$);
break;
case 28:this.$ = new yy.SexprNode([$$[$0]], null, this._$);
break;
case 29:this.$ = $$[$0];
break;
case 30:this.$ = new yy.StringNode($$[$0], this._$);
break;
case 31:this.$ = new yy.NumberNode($$[$0], this._$);
break;
case 32:this.$ = new yy.BooleanNode($$[$0], this._$);
break;
case 33:this.$ = $$[$0];
break;
case 34:$$[$0-1].isHelper = true; this.$ = $$[$0-1];
break;
case 35:this.$ = new yy.HashNode($$[$0], this._$);
break;
case 36:this.$ = [$$[$0-2], $$[$0]];
break;
case 37:this.$ = new yy.PartialNameNode($$[$0], this._$);
break;
case 38:this.$ = new yy.PartialNameNode(new yy.StringNode($$[$0], this._$), this._$);
break;
case 39:this.$ = new yy.PartialNameNode(new yy.NumberNode($$[$0], this._$));
break;
case 40:this.$ = new yy.DataNode($$[$0], this._$);
break;
case 41:this.$ = new yy.IdNode($$[$0], this._$);
break;
case 42: $$[$0-2].push({part: $$[$0], separator: $$[$0-1]}); this.$ = $$[$0-2]; 
break;
case 43:this.$ = [{part: $$[$0]}];
break;
case 48:this.$ = [];
break;
case 49:$$[$0-1].push($$[$0]);
break;
case 52:this.$ = [$$[$0]];
break;
case 53:$$[$0-1].push($$[$0]);
break;
}
},
table: [{3:1,4:2,5:[1,3],8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],26:[1,15],27:[1,16],29:[1,17]},{1:[3]},{5:[1,18],8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],26:[1,15],27:[1,16],29:[1,17]},{1:[2,2]},{5:[2,9],10:[2,9],17:[2,9],18:[2,9],21:[2,9],23:[2,9],24:[2,9],26:[2,9],27:[2,9],29:[2,9]},{10:[1,20]},{4:23,6:21,7:22,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,8],26:[1,15],27:[1,16],29:[1,17]},{4:23,6:25,7:22,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,8],26:[1,15],27:[1,16],29:[1,17]},{5:[2,14],10:[2,14],17:[2,14],18:[2,14],21:[2,14],23:[2,14],24:[2,14],26:[2,14],27:[2,14],29:[2,14]},{5:[2,15],10:[2,15],17:[2,15],18:[2,15],21:[2,15],23:[2,15],24:[2,15],26:[2,15],27:[2,15],29:[2,15]},{5:[2,16],10:[2,16],17:[2,16],18:[2,16],21:[2,16],23:[2,16],24:[2,16],26:[2,16],27:[2,16],29:[2,16]},{5:[2,17],10:[2,17],17:[2,17],18:[2,17],21:[2,17],23:[2,17],24:[2,17],26:[2,17],27:[2,17],29:[2,17]},{19:26,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:32,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:33,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:34,25:27,36:28,45:[1,31],47:[1,30],48:29},{19:35,25:27,36:28,45:[1,31],47:[1,30],48:29},{25:37,30:36,37:[1,38],38:[1,39],45:[1,31],48:29},{1:[2,1]},{5:[2,10],10:[2,10],17:[2,10],18:[2,10],21:[2,10],23:[2,10],24:[2,10],26:[2,10],27:[2,10],29:[2,10]},{11:[1,40]},{13:41,24:[1,42]},{4:43,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,7],26:[1,15],27:[1,16],29:[1,17]},{7:44,8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,24],24:[2,6],26:[1,15],27:[1,16],29:[1,17]},{19:32,22:[1,45],25:27,36:28,45:[1,31],47:[1,30],48:29},{13:46,24:[1,42]},{20:[1,47]},{20:[2,48],22:[2,48],28:[2,48],34:48,37:[2,48],38:[2,48],39:[2,48],40:[2,48],41:[2,48],45:[2,48],47:[2,48]},{20:[2,28],22:[2,28],28:[2,28],41:[2,28]},{20:[2,41],22:[2,41],28:[2,41],37:[2,41],38:[2,41],39:[2,41],40:[2,41],41:[2,41],45:[2,41],47:[2,41],49:[1,49]},{25:50,45:[1,31],48:29},{20:[2,43],22:[2,43],28:[2,43],37:[2,43],38:[2,43],39:[2,43],40:[2,43],41:[2,43],45:[2,43],47:[2,43],49:[2,43]},{22:[1,51]},{22:[1,52]},{22:[1,53]},{28:[1,54]},{22:[2,46],25:57,31:55,33:56,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],42:63,43:64,44:66,45:[1,65],47:[1,30],48:29},{22:[2,37],37:[2,37],38:[2,37],39:[2,37],40:[2,37],45:[2,37],47:[2,37]},{22:[2,38],37:[2,38],38:[2,38],39:[2,38],40:[2,38],45:[2,38],47:[2,38]},{22:[2,39],37:[2,39],38:[2,39],39:[2,39],40:[2,39],45:[2,39],47:[2,39]},{5:[2,11],10:[2,11],17:[2,11],18:[2,11],21:[2,11],23:[2,11],24:[2,11],26:[2,11],27:[2,11],29:[2,11]},{5:[2,12],10:[2,12],17:[2,12],18:[2,12],21:[2,12],23:[2,12],24:[2,12],26:[2,12],27:[2,12],29:[2,12]},{25:67,45:[1,31],48:29},{8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,3],26:[1,15],27:[1,16],29:[1,17]},{4:68,8:4,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,5],26:[1,15],27:[1,16],29:[1,17]},{10:[2,26],17:[2,26],18:[2,26],21:[2,26],23:[2,26],24:[2,26],26:[2,26],27:[2,26],29:[2,26]},{5:[2,13],10:[2,13],17:[2,13],18:[2,13],21:[2,13],23:[2,13],24:[2,13],26:[2,13],27:[2,13],29:[2,13]},{10:[2,18]},{20:[2,50],22:[2,50],25:57,28:[2,50],31:70,35:69,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],41:[2,50],42:71,43:64,44:66,45:[1,65],47:[1,30],48:29},{45:[1,72]},{20:[2,40],22:[2,40],28:[2,40],37:[2,40],38:[2,40],39:[2,40],40:[2,40],41:[2,40],45:[2,40],47:[2,40]},{10:[2,20],17:[2,20],18:[2,20],21:[2,20],23:[2,20],24:[2,20],26:[2,20],27:[2,20],29:[2,20]},{10:[2,19],17:[2,19],18:[2,19],21:[2,19],23:[2,19],24:[2,19],26:[2,19],27:[2,19],29:[2,19]},{5:[2,22],10:[2,22],17:[2,22],18:[2,22],21:[2,22],23:[2,22],24:[2,22],26:[2,22],27:[2,22],29:[2,22]},{5:[2,23],10:[2,23],17:[2,23],18:[2,23],21:[2,23],23:[2,23],24:[2,23],26:[2,23],27:[2,23],29:[2,23]},{22:[2,44],32:73,42:74,43:64,44:66,45:[1,75]},{22:[1,76]},{20:[2,29],22:[2,29],28:[2,29],37:[2,29],38:[2,29],39:[2,29],40:[2,29],41:[2,29],45:[2,29],47:[2,29]},{20:[2,30],22:[2,30],28:[2,30],37:[2,30],38:[2,30],39:[2,30],40:[2,30],41:[2,30],45:[2,30],47:[2,30]},{20:[2,31],22:[2,31],28:[2,31],37:[2,31],38:[2,31],39:[2,31],40:[2,31],41:[2,31],45:[2,31],47:[2,31]},{20:[2,32],22:[2,32],28:[2,32],37:[2,32],38:[2,32],39:[2,32],40:[2,32],41:[2,32],45:[2,32],47:[2,32]},{20:[2,33],22:[2,33],28:[2,33],37:[2,33],38:[2,33],39:[2,33],40:[2,33],41:[2,33],45:[2,33],47:[2,33]},{19:77,25:27,36:28,45:[1,31],47:[1,30],48:29},{22:[2,47]},{20:[2,35],22:[2,35],28:[2,35],41:[2,35],44:78,45:[1,75]},{20:[2,43],22:[2,43],28:[2,43],37:[2,43],38:[2,43],39:[2,43],40:[2,43],41:[2,43],45:[2,43],46:[1,79],47:[2,43],49:[2,43]},{20:[2,52],22:[2,52],28:[2,52],41:[2,52],45:[2,52]},{22:[1,80]},{8:19,9:5,10:[1,10],12:6,14:7,15:8,16:9,17:[1,11],18:[1,12],21:[1,14],23:[1,13],24:[2,4],26:[1,15],27:[1,16],29:[1,17]},{20:[2,27],22:[2,27],28:[2,27],41:[2,27]},{20:[2,49],22:[2,49],28:[2,49],37:[2,49],38:[2,49],39:[2,49],40:[2,49],41:[2,49],45:[2,49],47:[2,49]},{20:[2,51],22:[2,51],28:[2,51],41:[2,51]},{20:[2,42],22:[2,42],28:[2,42],37:[2,42],38:[2,42],39:[2,42],40:[2,42],41:[2,42],45:[2,42],47:[2,42],49:[2,42]},{22:[1,81]},{22:[2,45]},{46:[1,79]},{5:[2,25],10:[2,25],17:[2,25],18:[2,25],21:[2,25],23:[2,25],24:[2,25],26:[2,25],27:[2,25],29:[2,25]},{41:[1,82]},{20:[2,53],22:[2,53],28:[2,53],41:[2,53],45:[2,53]},{25:57,31:83,36:61,37:[1,58],38:[1,59],39:[1,60],40:[1,62],45:[1,31],47:[1,30],48:29},{5:[2,21],10:[2,21],17:[2,21],18:[2,21],21:[2,21],23:[2,21],24:[2,21],26:[2,21],27:[2,21],29:[2,21]},{5:[2,24],10:[2,24],17:[2,24],18:[2,24],21:[2,24],23:[2,24],24:[2,24],26:[2,24],27:[2,24],29:[2,24]},{20:[2,34],22:[2,34],28:[2,34],37:[2,34],38:[2,34],39:[2,34],40:[2,34],41:[2,34],45:[2,34],47:[2,34]},{20:[2,36],22:[2,36],28:[2,36],41:[2,36],45:[2,36]}],
defaultActions: {3:[2,2],18:[2,1],47:[2,18],63:[2,47],74:[2,45]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == "undefined")
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === "function")
        this.parseError = this.yy.parseError;
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || 1;
        if (typeof token !== "number") {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == "undefined") {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
            var errStr = "";
            if (!recovering) {
                expected = [];
                for (p in table[state])
                    if (this.terminals_[p] && p > 2) {
                        expected.push("'" + this.terminals_[p] + "'");
                    }
                if (this.lexer.showPosition) {
                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                } else {
                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                }
                this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }
        }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0)
                    recovering--;
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
            if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
            }
            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
            if (typeof r !== "undefined") {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}
};


function stripFlags(open, close) {
  return {
    left: open.charAt(2) === '~',
    right: close.charAt(0) === '~' || close.charAt(1) === '~'
  };
}

/* Jison generated lexer */
var lexer = (function(){
var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        if (this.options.ranges) this.yylloc.range = [0,0];
        this.offset = 0;
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) this.yylloc.range[1]++;

        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length-1);
        this.matched = this.matched.substr(0, this.matched.length-1);

        if (lines.length-1) this.yylineno -= lines.length-1;
        var r = this.yylloc.range;

        this.yylloc = {first_line: this.yylloc.first_line,
          last_line: this.yylineno+1,
          first_column: this.yylloc.first_column,
          last_column: lines ?
              (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
              this.yylloc.first_column - len
          };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
less:function (n) {
        this.unput(this.match.slice(n));
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            tempMatch,
            index,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (!this.options.flex) break;
            }
        }
        if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = {first_line: this.yylloc.last_line,
                           last_line: this.yylineno+1,
                           first_column: this.yylloc.last_column,
                           last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
                this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;
            else return;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    },
topState:function () {
        return this.conditionStack[this.conditionStack.length-2];
    },
pushState:function begin(condition) {
        this.begin(condition);
    }});
lexer.options = {};
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {


function strip(start, end) {
  return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng-end);
}


var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0:
                                   if(yy_.yytext.slice(-2) === "\\\\") {
                                     strip(0,1);
                                     this.begin("mu");
                                   } else if(yy_.yytext.slice(-1) === "\\") {
                                     strip(0,1);
                                     this.begin("emu");
                                   } else {
                                     this.begin("mu");
                                   }
                                   if(yy_.yytext) return 10;
                                 
break;
case 1:return 10;
break;
case 2:
                                   this.popState();
                                   return 10;
                                 
break;
case 3:
                                  yy_.yytext = yy_.yytext.substr(5, yy_.yyleng-9);
                                  this.popState();
                                  return 11;
                                 
break;
case 4: return 10; 
break;
case 5:strip(0,4); this.popState(); return 17;
break;
case 6:return 40;
break;
case 7:return 41;
break;
case 8: return 18; 
break;
case 9:
                                  this.popState();
                                  this.begin('raw');
                                  return 20;
                                 
break;
case 10:
                                  yy_.yytext = yy_.yytext.substr(4, yy_.yyleng-8);
                                  this.popState();
                                  return 'RAW_BLOCK';
                                 
break;
case 11:return 29;
break;
case 12:return 21;
break;
case 13:return 24;
break;
case 14:return 23;
break;
case 15:return 23;
break;
case 16:return 27;
break;
case 17:return 26;
break;
case 18:this.popState(); this.begin('com');
break;
case 19:strip(3,5); this.popState(); return 17;
break;
case 20:return 26;
break;
case 21:return 46;
break;
case 22:return 45;
break;
case 23:return 45;
break;
case 24:return 49;
break;
case 25:// ignore whitespace
break;
case 26:this.popState(); return 28;
break;
case 27:this.popState(); return 22;
break;
case 28:yy_.yytext = strip(1,2).replace(/\\"/g,'"'); return 37;
break;
case 29:yy_.yytext = strip(1,2).replace(/\\'/g,"'"); return 37;
break;
case 30:return 47;
break;
case 31:return 39;
break;
case 32:return 39;
break;
case 33:return 38;
break;
case 34:return 45;
break;
case 35:yy_.yytext = strip(1,2); return 45;
break;
case 36:return 'INVALID';
break;
case 37:return 5;
break;
}
};
lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/,/^(?:[^\x00]*?(?=(\{\{\{\{\/)))/,/^(?:[\s\S]*?--\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{\{\{)/,/^(?:\}\}\}\})/,/^(?:\{\{\{\{[^\x00]*\}\}\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{!--)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{(~)?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)]))))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
lexer.conditions = {"mu":{"rules":[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"com":{"rules":[5],"inclusive":false},"raw":{"rules":[3,4],"inclusive":false},"INITIAL":{"rules":[0,1,37],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;
function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();exports["default"] = handlebars;
/* jshint ignore:end */
},{}],14:[function(require,module,exports){
"use strict";
var Visitor = require("./visitor")["default"];

function print(ast) {
  return new PrintVisitor().accept(ast);
}

exports.print = print;function PrintVisitor() {
  this.padding = 0;
}

exports.PrintVisitor = PrintVisitor;PrintVisitor.prototype = new Visitor();

PrintVisitor.prototype.pad = function(string, newline) {
  var out = "";

  for(var i=0,l=this.padding; i<l; i++) {
    out = out + "  ";
  }

  out = out + string;

  if(newline !== false) { out = out + "\n"; }
  return out;
};

PrintVisitor.prototype.program = function(program) {
  var out = "",
      statements = program.statements,
      i, l;

  for(i=0, l=statements.length; i<l; i++) {
    out = out + this.accept(statements[i]);
  }

  this.padding--;

  return out;
};

PrintVisitor.prototype.block = function(block) {
  var out = "";

  out = out + this.pad("BLOCK:");
  this.padding++;
  out = out + this.accept(block.mustache);
  if (block.program) {
    out = out + this.pad("PROGRAM:");
    this.padding++;
    out = out + this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) { this.padding++; }
    out = out + this.pad("{{^}}");
    this.padding++;
    out = out + this.accept(block.inverse);
    this.padding--;
    if (block.program) { this.padding--; }
  }
  this.padding--;

  return out;
};

PrintVisitor.prototype.sexpr = function(sexpr) {
  var params = sexpr.params, paramStrings = [], hash;

  for(var i=0, l=params.length; i<l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params = "[" + paramStrings.join(", ") + "]";

  hash = sexpr.hash ? " " + this.accept(sexpr.hash) : "";

  return this.accept(sexpr.id) + " " + params + hash;
};

PrintVisitor.prototype.mustache = function(mustache) {
  return this.pad("{{ " + this.accept(mustache.sexpr) + " }}");
};

PrintVisitor.prototype.partial = function(partial) {
  var content = this.accept(partial.partialName);
  if(partial.context) {
    content += " " + this.accept(partial.context);
  }
  if (partial.hash) {
    content += " " + this.accept(partial.hash);
  }
  return this.pad("{{> " + content + " }}");
};

PrintVisitor.prototype.hash = function(hash) {
  var pairs = hash.pairs;
  var joinedPairs = [], left, right;

  for(var i=0, l=pairs.length; i<l; i++) {
    left = pairs[i][0];
    right = this.accept(pairs[i][1]);
    joinedPairs.push( left + "=" + right );
  }

  return "HASH{" + joinedPairs.join(", ") + "}";
};

PrintVisitor.prototype.STRING = function(string) {
  return '"' + string.string + '"';
};

PrintVisitor.prototype.NUMBER = function(number) {
  return "NUMBER{" + number.number + "}";
};

PrintVisitor.prototype.BOOLEAN = function(bool) {
  return "BOOLEAN{" + bool.bool + "}";
};

PrintVisitor.prototype.ID = function(id) {
  var path = id.parts.join("/");
  if(id.parts.length > 1) {
    return "PATH:" + path;
  } else {
    return "ID:" + path;
  }
};

PrintVisitor.prototype.PARTIAL_NAME = function(partialName) {
    return "PARTIAL:" + partialName.name;
};

PrintVisitor.prototype.DATA = function(data) {
  return "@" + this.accept(data.id);
};

PrintVisitor.prototype.content = function(content) {
  return this.pad("CONTENT[ '" + content.string + "' ]");
};

PrintVisitor.prototype.comment = function(comment) {
  return this.pad("{{! '" + comment.comment + "' }}");
};
},{"./visitor":15}],15:[function(require,module,exports){
"use strict";
function Visitor() {}

Visitor.prototype = {
  constructor: Visitor,

  accept: function(object) {
    return this[object.type](object);
  }
};

exports["default"] = Visitor;
},{}],16:[function(require,module,exports){
"use strict";

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var line;
  if (node && node.firstLine) {
    line = node.firstLine;

    message += ' - ' + line + ':' + node.firstColumn;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (line) {
    this.lineNumber = line;
    this.column = node.firstColumn;
  }
}

Exception.prototype = new Error();

exports["default"] = Exception;
},{}],17:[function(require,module,exports){
"use strict";
var Utils = require("./utils");
var Exception = require("./exception")["default"];
var COMPILER_REVISION = require("./base").COMPILER_REVISION;
var REVISION_CHANGES = require("./base").REVISION_CHANGES;
var createFrame = require("./base").createFrame;

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = REVISION_CHANGES[currentRevision],
          compilerVersions = REVISION_CHANGES[compilerRevision];
      throw new Exception("Template was precompiled with an older version of Handlebars than the current runtime. "+
            "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").");
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new Exception("Template was precompiled with a newer version of Handlebars than the current runtime. "+
            "Please update your runtime to a newer version ("+compilerInfo[1]+").");
    }
  }
}

exports.checkRevision = checkRevision;// TODO: Remove this line and break up compilePartial

function template(templateSpec, env) {
  if (!env) {
    throw new Exception("No environment passed to template");
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  var invokePartialWrapper = function(partial, name, context, hash, helpers, partials, data) {
    if (hash) {
      context = Utils.extend({}, context, hash);
    }

    var result = env.VM.invokePartial.call(this, partial, name, context, helpers, partials, data);
    if (result != null) { return result; }

    if (env.compile) {
      var options = { helpers: helpers, partials: partials, data: data };
      partials[name] = env.compile(partial, { data: data !== undefined }, env);
      return partials[name](context, options);
    } else {
      throw new Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    }
  };

  // Just add water
  var container = {
    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function(i) {
      return templateSpec[i];
    },

    programs: [],
    program: function(i, data) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if(data) {
        programWrapper = program(this, i, fn, data);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = program(this, i, fn);
      }
      return programWrapper;
    },
    programWithDepth: env.VM.programWithDepth,

    initData: function(context, data) {
      if (!data || !('root' in data)) {
        data = data ? createFrame(data) : {};
        data.root = context;
      }
      return data;
    },
    data: function(data, depth) {
      while (data && depth--) {
        data = data._parent;
      }
      return data;
    },
    merge: function(param, common) {
      var ret = param || common;

      if (param && common && (param !== common)) {
        ret = Utils.extend({}, common, param);
      }

      return ret;
    },

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  var ret = function(context, options) {
    options = options || {};
    var namespace = options.partial ? options : env,
        helpers,
        partials,
        data = options.data;

    if (!options.partial) {
      helpers = container.helpers = container.merge(options.helpers, namespace.helpers);

      if (templateSpec.usePartial) {
        partials = container.partials = container.merge(options.partials, namespace.partials);
      }
      if (templateSpec.useData) {
        data = container.initData(context, data);
      }
    } else {
      helpers = container.helpers = options.helpers;
      partials = container.partials = options.partials;
    }
    return templateSpec.main.call(container, context, helpers, partials, data);
  };

  ret.child = function(i) {
    return container.programWithDepth(i);
  };
  return ret;
}

exports.template = template;function programWithDepth(i, data /*, $depth */) {
  /*jshint -W040 */
  var args = Array.prototype.slice.call(arguments, 2),
      container = this,
      fn = container.fn(i);

  var prog = function(context, options) {
    options = options || {};

    return fn.apply(container, [context, container.helpers, container.partials, options.data || data].concat(args));
  };
  prog.program = i;
  prog.depth = args.length;
  return prog;
}

exports.programWithDepth = programWithDepth;function program(container, i, fn, data) {
  var prog = function(context, options) {
    options = options || {};

    return fn.call(container, context, container.helpers, container.partials, options.data || data);
  };
  prog.program = i;
  prog.depth = 0;
  return prog;
}

exports.program = program;function invokePartial(partial, name, context, helpers, partials, data) {
  var options = { partial: true, helpers: helpers, partials: partials, data: data };

  if(partial === undefined) {
    throw new Exception("The partial " + name + " could not be found");
  } else if(partial instanceof Function) {
    return partial(context, options);
  }
}

exports.invokePartial = invokePartial;function noop() { return ""; }

exports.noop = noop;
},{"./base":8,"./exception":16,"./utils":19}],18:[function(require,module,exports){
"use strict";
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = function() {
  return "" + this.string;
};

exports["default"] = SafeString;
},{}],19:[function(require,module,exports){
"use strict";
/*jshint -W004 */
var SafeString = require("./safe-string")["default"];

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr] || "&amp;";
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

exports.extend = extend;var toString = Object.prototype.toString;
exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
var isFunction = function(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
if (isFunction(/x/)) {
  isFunction = function(value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
var isArray = Array.isArray || function(value) {
  return (value && typeof value === 'object') ? toString.call(value) === '[object Array]' : false;
};
exports.isArray = isArray;

function escapeExpression(string) {
  // don't escape SafeStrings, since they're already safe
  if (string instanceof SafeString) {
    return string.toString();
  } else if (!string && string !== 0) {
    return "";
  }

  // Force a string conversion as this will be done by the append regardless and
  // the regex test will do this transparently behind the scenes, causing issues if
  // an object's to string has escaped characters in it.
  string = "" + string;

  if(!possible.test(string)) { return string; }
  return string.replace(badChars, escapeChar);
}

exports.escapeExpression = escapeExpression;function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

exports.isEmpty = isEmpty;function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}

exports.appendContextPath = appendContextPath;
},{"./safe-string":18}],20:[function(require,module,exports){
// USAGE:
// var handlebars = require('handlebars');

// var local = handlebars.create();

var handlebars = require('../dist/cjs/handlebars')["default"];

handlebars.Visitor = require('../dist/cjs/handlebars/compiler/visitor')["default"];

var printer = require('../dist/cjs/handlebars/compiler/printer');
handlebars.PrintVisitor = printer.PrintVisitor;
handlebars.print = printer.print;

module.exports = handlebars;

// Publish a Node.js require() handler for .handlebars and .hbs files
if (typeof require !== 'undefined' && require.extensions) {
  var extension = function(module, filename) {
    var fs = require("fs");
    var templateString = fs.readFileSync(filename, "utf8");
    module.exports = handlebars.compile(templateString);
  };
  require.extensions[".handlebars"] = extension;
  require.extensions[".hbs"] = extension;
}

},{"../dist/cjs/handlebars":6,"../dist/cjs/handlebars/compiler/printer":14,"../dist/cjs/handlebars/compiler/visitor":15,"fs":1}],21:[function(require,module,exports){
/*
 * loglevel - https://github.com/pimterry/loglevel
 *
 * Copyright (c) 2013 Tim Perry
 * Licensed under the MIT license.
 */

;(function (undefined) {
    var undefinedType = "undefined";

    (function (name, definition) {
        if (typeof module !== 'undefined') {
            module.exports = definition();
        } else if (typeof define === 'function' && typeof define.amd === 'object') {
            define(definition);
        } else {
            this[name] = definition();
        }
    }('log', function () {
        var self = {};
        var noop = function() {};

        function realMethod(methodName) {
            if (typeof console === undefinedType) {
                return noop;
            } else if (console[methodName] === undefined) {
                if (console.log !== undefined) {
                    return boundToConsole(console, 'log');
                } else {
                    return noop;
                }
            } else {
                return boundToConsole(console, methodName);
            }
        }

        function boundToConsole(console, methodName) {
            var method = console[methodName];
            if (method.bind === undefined) {
                if (Function.prototype.bind === undefined) {
                    return functionBindingWrapper(method, console);
                } else {
                    try {
                        return Function.prototype.bind.call(console[methodName], console);
                    } catch (e) {
                        // In IE8 + Modernizr, the bind shim will reject the above, so we fall back to wrapping
                        return functionBindingWrapper(method, console);
                    }
                }
            } else {
                return console[methodName].bind(console);
            }
        }

        function functionBindingWrapper(f, context) {
            return function() {
                Function.prototype.apply.apply(f, [context, arguments]);
            };
        }

        var logMethods = [
            "trace",
            "debug",
            "info",
            "warn",
            "error"
        ];

        function replaceLoggingMethods(methodFactory) {
            for (var ii = 0; ii < logMethods.length; ii++) {
                self[logMethods[ii]] = methodFactory(logMethods[ii]);
            }
        }

        function cookiesAvailable() {
            return (typeof window !== undefinedType &&
                    window.document !== undefined &&
                    window.document.cookie !== undefined);
        }

        function localStorageAvailable() {
            try {
                return (typeof window !== undefinedType &&
                        window.localStorage !== undefined);
            } catch (e) {
                return false;
            }
        }

        function persistLevelIfPossible(levelNum) {
            var levelName;

            for (var key in self.levels) {
                if (self.levels.hasOwnProperty(key) && self.levels[key] === levelNum) {
                    levelName = key;
                    break;
                }
            }

            if (localStorageAvailable()) {
                window.localStorage['loglevel'] = levelName;
            } else if (cookiesAvailable()) {
                window.document.cookie = "loglevel=" + levelName + ";";
            } else {
                return;
            }
        }

        var cookieRegex = /loglevel=([^;]+)/;

        function loadPersistedLevel() {
            var storedLevel;

            if (localStorageAvailable()) {
                storedLevel = window.localStorage['loglevel'];
            }

            if (!storedLevel && cookiesAvailable()) {
                var cookieMatch = cookieRegex.exec(window.document.cookie) || [];
                storedLevel = cookieMatch[1];
            }

            self.setLevel(self.levels[storedLevel] || self.levels.WARN);
        }

        /*
         *
         * Public API
         *
         */

        self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
            "ERROR": 4, "SILENT": 5};

        self.setLevel = function (level) {
            if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
                persistLevelIfPossible(level);

                if (level === self.levels.SILENT) {
                    replaceLoggingMethods(function () {
                        return noop;
                    });
                    return;
                } else if (typeof console === undefinedType) {
                    replaceLoggingMethods(function (methodName) {
                        return function () {
                            if (typeof console !== undefinedType) {
                                self.setLevel(level);
                                self[methodName].apply(self, arguments);
                            }
                        };
                    });
                    return "No console available for logging";
                } else {
                    replaceLoggingMethods(function (methodName) {
                        if (level <= self.levels[methodName.toUpperCase()]) {
                            return realMethod(methodName);
                        } else {
                            return noop;
                        }
                    });
                }
            } else if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
                self.setLevel(self.levels[level.toUpperCase()]);
            } else {
                throw "log.setLevel() called with invalid level: " + level;
            }
        };

        self.enableAll = function() {
            self.setLevel(self.levels.TRACE);
        };

        self.disableAll = function() {
            self.setLevel(self.levels.SILENT);
        };

        loadPersistedLevel();
        return self;
    }));
})();

},{}],22:[function(require,module,exports){
/*jslint eqeqeq: false, onevar: false, forin: true, nomen: false, regexp: false, plusplus: false*/
/*global module, require, __dirname, document*/
/**
 * Sinon core utilities. For internal use only.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

var sinon = (function (formatio) {
    var div = typeof document != "undefined" && document.createElement("div");
    var hasOwn = Object.prototype.hasOwnProperty;

    function isDOMNode(obj) {
        var success = false;

        try {
            obj.appendChild(div);
            success = div.parentNode == obj;
        } catch (e) {
            return false;
        } finally {
            try {
                obj.removeChild(div);
            } catch (e) {
                // Remove failed, not much we can do about that
            }
        }

        return success;
    }

    function isElement(obj) {
        return div && obj && obj.nodeType === 1 && isDOMNode(obj);
    }

    function isFunction(obj) {
        return typeof obj === "function" || !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function mirrorProperties(target, source) {
        for (var prop in source) {
            if (!hasOwn.call(target, prop)) {
                target[prop] = source[prop];
            }
        }
    }

    function isRestorable (obj) {
        return typeof obj === "function" && typeof obj.restore === "function" && obj.restore.sinon;
    }

    var sinon = {
        wrapMethod: function wrapMethod(object, property, method) {
            if (!object) {
                throw new TypeError("Should wrap property of object");
            }

            if (typeof method != "function") {
                throw new TypeError("Method wrapper should be function");
            }

            var wrappedMethod = object[property],
                error;

            if (!isFunction(wrappedMethod)) {
                error = new TypeError("Attempted to wrap " + (typeof wrappedMethod) + " property " +
                                    property + " as function");
            }

            if (wrappedMethod.restore && wrappedMethod.restore.sinon) {
                error = new TypeError("Attempted to wrap " + property + " which is already wrapped");
            }

            if (wrappedMethod.calledBefore) {
                var verb = !!wrappedMethod.returns ? "stubbed" : "spied on";
                error = new TypeError("Attempted to wrap " + property + " which is already " + verb);
            }

            if (error) {
                if (wrappedMethod._stack) {
                    error.stack += '\n--------------\n' + wrappedMethod._stack;
                }
                throw error;
            }

            // IE 8 does not support hasOwnProperty on the window object and Firefox has a problem
            // when using hasOwn.call on objects from other frames.
            var owned = object.hasOwnProperty ? object.hasOwnProperty(property) : hasOwn.call(object, property);
            object[property] = method;
            method.displayName = property;
            // Set up a stack trace which can be used later to find what line of
            // code the original method was created on.
            method._stack = (new Error('Stack Trace for original')).stack;

            method.restore = function () {
                // For prototype properties try to reset by delete first.
                // If this fails (ex: localStorage on mobile safari) then force a reset
                // via direct assignment.
                if (!owned) {
                    delete object[property];
                }
                if (object[property] === method) {
                    object[property] = wrappedMethod;
                }
            };

            method.restore.sinon = true;
            mirrorProperties(method, wrappedMethod);

            return method;
        },

        extend: function extend(target) {
            for (var i = 1, l = arguments.length; i < l; i += 1) {
                for (var prop in arguments[i]) {
                    if (arguments[i].hasOwnProperty(prop)) {
                        target[prop] = arguments[i][prop];
                    }

                    // DONT ENUM bug, only care about toString
                    if (arguments[i].hasOwnProperty("toString") &&
                        arguments[i].toString != target.toString) {
                        target.toString = arguments[i].toString;
                    }
                }
            }

            return target;
        },

        create: function create(proto) {
            var F = function () {};
            F.prototype = proto;
            return new F();
        },

        deepEqual: function deepEqual(a, b) {
            if (sinon.match && sinon.match.isMatcher(a)) {
                return a.test(b);
            }
            if (typeof a != "object" || typeof b != "object") {
                return a === b;
            }

            if (isElement(a) || isElement(b)) {
                return a === b;
            }

            if (a === b) {
                return true;
            }

            if ((a === null && b !== null) || (a !== null && b === null)) {
                return false;
            }

            var aString = Object.prototype.toString.call(a);
            if (aString != Object.prototype.toString.call(b)) {
                return false;
            }

            if (aString == "[object Date]") {
                return a.valueOf() === b.valueOf();
            }

            var prop, aLength = 0, bLength = 0;

            if (aString == "[object Array]" && a.length !== b.length) {
                return false;
            }

            for (prop in a) {
                aLength += 1;

                if (!deepEqual(a[prop], b[prop])) {
                    return false;
                }
            }

            for (prop in b) {
                bLength += 1;
            }

            return aLength == bLength;
        },

        functionName: function functionName(func) {
            var name = func.displayName || func.name;

            // Use function decomposition as a last resort to get function
            // name. Does not rely on function decomposition to work - if it
            // doesn't debugging will be slightly less informative
            // (i.e. toString will say 'spy' rather than 'myFunc').
            if (!name) {
                var matches = func.toString().match(/function ([^\s\(]+)/);
                name = matches && matches[1];
            }

            return name;
        },

        functionToString: function toString() {
            if (this.getCall && this.callCount) {
                var thisValue, prop, i = this.callCount;

                while (i--) {
                    thisValue = this.getCall(i).thisValue;

                    for (prop in thisValue) {
                        if (thisValue[prop] === this) {
                            return prop;
                        }
                    }
                }
            }

            return this.displayName || "sinon fake";
        },

        getConfig: function (custom) {
            var config = {};
            custom = custom || {};
            var defaults = sinon.defaultConfig;

            for (var prop in defaults) {
                if (defaults.hasOwnProperty(prop)) {
                    config[prop] = custom.hasOwnProperty(prop) ? custom[prop] : defaults[prop];
                }
            }

            return config;
        },

        format: function (val) {
            return "" + val;
        },

        defaultConfig: {
            injectIntoThis: true,
            injectInto: null,
            properties: ["spy", "stub", "mock", "clock", "server", "requests"],
            useFakeTimers: true,
            useFakeServer: true
        },

        timesInWords: function timesInWords(count) {
            return count == 1 && "once" ||
                count == 2 && "twice" ||
                count == 3 && "thrice" ||
                (count || 0) + " times";
        },

        calledInOrder: function (spies) {
            for (var i = 1, l = spies.length; i < l; i++) {
                if (!spies[i - 1].calledBefore(spies[i]) || !spies[i].called) {
                    return false;
                }
            }

            return true;
        },

        orderByFirstCall: function (spies) {
            return spies.sort(function (a, b) {
                // uuid, won't ever be equal
                var aCall = a.getCall(0);
                var bCall = b.getCall(0);
                var aId = aCall && aCall.callId || -1;
                var bId = bCall && bCall.callId || -1;

                return aId < bId ? -1 : 1;
            });
        },

        log: function () {},

        logError: function (label, err) {
            var msg = label + " threw exception: ";
            sinon.log(msg + "[" + err.name + "] " + err.message);
            if (err.stack) { sinon.log(err.stack); }

            setTimeout(function () {
                err.message = msg + err.message;
                throw err;
            }, 0);
        },

        typeOf: function (value) {
            if (value === null) {
                return "null";
            }
            else if (value === undefined) {
                return "undefined";
            }
            var string = Object.prototype.toString.call(value);
            return string.substring(8, string.length - 1).toLowerCase();
        },

        createStubInstance: function (constructor) {
            if (typeof constructor !== "function") {
                throw new TypeError("The constructor should be a function.");
            }
            return sinon.stub(sinon.create(constructor.prototype));
        },

        restore: function (object) {
            if (object !== null && typeof object === "object") {
                for (var prop in object) {
                    if (isRestorable(object[prop])) {
                        object[prop].restore();
                    }
                }
            }
            else if (isRestorable(object)) {
                object.restore();
            }
        }
    };

    var isNode = typeof module !== "undefined" && module.exports;
    var isAMD = typeof define === 'function' && typeof define.amd === 'object' && define.amd;

    if (isAMD) {
        define(function(){
            return sinon;
        });
    } else if (isNode) {
        try {
            formatio = require("formatio");
        } catch (e) {}
        module.exports = sinon;
        module.exports.spy = require("./sinon/spy");
        module.exports.spyCall = require("./sinon/call");
        module.exports.behavior = require("./sinon/behavior");
        module.exports.stub = require("./sinon/stub");
        module.exports.mock = require("./sinon/mock");
        module.exports.collection = require("./sinon/collection");
        module.exports.assert = require("./sinon/assert");
        module.exports.sandbox = require("./sinon/sandbox");
        module.exports.test = require("./sinon/test");
        module.exports.testCase = require("./sinon/test_case");
        module.exports.assert = require("./sinon/assert");
        module.exports.match = require("./sinon/match");
    }

    if (formatio) {
        var formatter = formatio.configure({ quoteStrings: false });
        sinon.format = function () {
            return formatter.ascii.apply(formatter, arguments);
        };
    } else if (isNode) {
        try {
            var util = require("util");
            sinon.format = function (value) {
                return typeof value == "object" && value.toString === Object.prototype.toString ? util.inspect(value) : value;
            };
        } catch (e) {
            /* Node, but no util module - would be very old, but better safe than
             sorry */
        }
    }

    return sinon;
}(typeof formatio == "object" && formatio));

},{"./sinon/assert":23,"./sinon/behavior":24,"./sinon/call":25,"./sinon/collection":26,"./sinon/match":27,"./sinon/mock":28,"./sinon/sandbox":29,"./sinon/spy":30,"./sinon/stub":31,"./sinon/test":32,"./sinon/test_case":33,"formatio":35,"util":5}],23:[function(require,module,exports){
(function (global){/**
 * @depend ../sinon.js
 * @depend stub.js
 */
/*jslint eqeqeq: false, onevar: false, nomen: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Assertions matching the test spy retrieval interface.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon, global) {
    var commonJSModule = typeof module !== "undefined" && module.exports;
    var slice = Array.prototype.slice;
    var assert;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function verifyIsStub() {
        var method;

        for (var i = 0, l = arguments.length; i < l; ++i) {
            method = arguments[i];

            if (!method) {
                assert.fail("fake is not a spy");
            }

            if (typeof method != "function") {
                assert.fail(method + " is not a function");
            }

            if (typeof method.getCall != "function") {
                assert.fail(method + " is not stubbed");
            }
        }
    }

    function failAssertion(object, msg) {
        object = object || global;
        var failMethod = object.fail || assert.fail;
        failMethod.call(object, msg);
    }

    function mirrorPropAsAssertion(name, method, message) {
        if (arguments.length == 2) {
            message = method;
            method = name;
        }

        assert[name] = function (fake) {
            verifyIsStub(fake);

            var args = slice.call(arguments, 1);
            var failed = false;

            if (typeof method == "function") {
                failed = !method(fake);
            } else {
                failed = typeof fake[method] == "function" ?
                    !fake[method].apply(fake, args) : !fake[method];
            }

            if (failed) {
                failAssertion(this, fake.printf.apply(fake, [message].concat(args)));
            } else {
                assert.pass(name);
            }
        };
    }

    function exposedName(prefix, prop) {
        return !prefix || /^fail/.test(prop) ? prop :
            prefix + prop.slice(0, 1).toUpperCase() + prop.slice(1);
    }

    assert = {
        failException: "AssertError",

        fail: function fail(message) {
            var error = new Error(message);
            error.name = this.failException || assert.failException;

            throw error;
        },

        pass: function pass(assertion) {},

        callOrder: function assertCallOrder() {
            verifyIsStub.apply(null, arguments);
            var expected = "", actual = "";

            if (!sinon.calledInOrder(arguments)) {
                try {
                    expected = [].join.call(arguments, ", ");
                    var calls = slice.call(arguments);
                    var i = calls.length;
                    while (i) {
                        if (!calls[--i].called) {
                            calls.splice(i, 1);
                        }
                    }
                    actual = sinon.orderByFirstCall(calls).join(", ");
                } catch (e) {
                    // If this fails, we'll just fall back to the blank string
                }

                failAssertion(this, "expected " + expected + " to be " +
                              "called in order but were called as " + actual);
            } else {
                assert.pass("callOrder");
            }
        },

        callCount: function assertCallCount(method, count) {
            verifyIsStub(method);

            if (method.callCount != count) {
                var msg = "expected %n to be called " + sinon.timesInWords(count) +
                    " but was called %c%C";
                failAssertion(this, method.printf(msg));
            } else {
                assert.pass("callCount");
            }
        },

        expose: function expose(target, options) {
            if (!target) {
                throw new TypeError("target is null or undefined");
            }

            var o = options || {};
            var prefix = typeof o.prefix == "undefined" && "assert" || o.prefix;
            var includeFail = typeof o.includeFail == "undefined" || !!o.includeFail;

            for (var method in this) {
                if (method != "export" && (includeFail || !/^(fail)/.test(method))) {
                    target[exposedName(prefix, method)] = this[method];
                }
            }

            return target;
        }
    };

    mirrorPropAsAssertion("called", "expected %n to have been called at least once but was never called");
    mirrorPropAsAssertion("notCalled", function (spy) { return !spy.called; },
                          "expected %n to not have been called but was called %c%C");
    mirrorPropAsAssertion("calledOnce", "expected %n to be called once but was called %c%C");
    mirrorPropAsAssertion("calledTwice", "expected %n to be called twice but was called %c%C");
    mirrorPropAsAssertion("calledThrice", "expected %n to be called thrice but was called %c%C");
    mirrorPropAsAssertion("calledOn", "expected %n to be called with %1 as this but was called with %t");
    mirrorPropAsAssertion("alwaysCalledOn", "expected %n to always be called with %1 as this but was called with %t");
    mirrorPropAsAssertion("calledWithNew", "expected %n to be called with new");
    mirrorPropAsAssertion("alwaysCalledWithNew", "expected %n to always be called with new");
    mirrorPropAsAssertion("calledWith", "expected %n to be called with arguments %*%C");
    mirrorPropAsAssertion("calledWithMatch", "expected %n to be called with match %*%C");
    mirrorPropAsAssertion("alwaysCalledWith", "expected %n to always be called with arguments %*%C");
    mirrorPropAsAssertion("alwaysCalledWithMatch", "expected %n to always be called with match %*%C");
    mirrorPropAsAssertion("calledWithExactly", "expected %n to be called with exact arguments %*%C");
    mirrorPropAsAssertion("alwaysCalledWithExactly", "expected %n to always be called with exact arguments %*%C");
    mirrorPropAsAssertion("neverCalledWith", "expected %n to never be called with arguments %*%C");
    mirrorPropAsAssertion("neverCalledWithMatch", "expected %n to never be called with match %*%C");
    mirrorPropAsAssertion("threw", "%n did not throw exception%C");
    mirrorPropAsAssertion("alwaysThrew", "%n did not always throw exception%C");

    if (commonJSModule) {
        module.exports = assert;
    } else {
        sinon.assert = assert;
    }
}(typeof sinon == "object" && sinon || null, typeof window != "undefined" ? window : (typeof self != "undefined") ? self : global));
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../sinon":22}],24:[function(require,module,exports){
(function (process){/**
 * @depend ../sinon.js
 */
/*jslint eqeqeq: false, onevar: false*/
/*global module, require, sinon, process, setImmediate, setTimeout*/
/**
 * Stub behavior
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @author Tim Fischbach (mail@timfischbach.de)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    var slice = Array.prototype.slice;
    var join = Array.prototype.join;
    var proto;

    var nextTick = (function () {
        if (typeof process === "object" && typeof process.nextTick === "function") {
            return process.nextTick;
        } else if (typeof setImmediate === "function") {
            return setImmediate;
        } else {
            return function (callback) {
                setTimeout(callback, 0);
            };
        }
    })();

    function throwsException(error, message) {
        if (typeof error == "string") {
            this.exception = new Error(message || "");
            this.exception.name = error;
        } else if (!error) {
            this.exception = new Error("Error");
        } else {
            this.exception = error;
        }

        return this;
    }

    function getCallback(behavior, args) {
        var callArgAt = behavior.callArgAt;

        if (callArgAt < 0) {
            var callArgProp = behavior.callArgProp;

            for (var i = 0, l = args.length; i < l; ++i) {
                if (!callArgProp && typeof args[i] == "function") {
                    return args[i];
                }

                if (callArgProp && args[i] &&
                    typeof args[i][callArgProp] == "function") {
                    return args[i][callArgProp];
                }
            }

            return null;
        }

        return args[callArgAt];
    }

    function getCallbackError(behavior, func, args) {
        if (behavior.callArgAt < 0) {
            var msg;

            if (behavior.callArgProp) {
                msg = sinon.functionName(behavior.stub) +
                    " expected to yield to '" + behavior.callArgProp +
                    "', but no object with such a property was passed.";
            } else {
                msg = sinon.functionName(behavior.stub) +
                    " expected to yield, but no callback was passed.";
            }

            if (args.length > 0) {
                msg += " Received [" + join.call(args, ", ") + "]";
            }

            return msg;
        }

        return "argument at index " + behavior.callArgAt + " is not a function: " + func;
    }

    function callCallback(behavior, args) {
        if (typeof behavior.callArgAt == "number") {
            var func = getCallback(behavior, args);

            if (typeof func != "function") {
                throw new TypeError(getCallbackError(behavior, func, args));
            }

            if (behavior.callbackAsync) {
                nextTick(function() {
                    func.apply(behavior.callbackContext, behavior.callbackArguments);
                });
            } else {
                func.apply(behavior.callbackContext, behavior.callbackArguments);
            }
        }
    }

    proto = {
        create: function(stub) {
            var behavior = sinon.extend({}, sinon.behavior);
            delete behavior.create;
            behavior.stub = stub;

            return behavior;
        },

        isPresent: function() {
            return (typeof this.callArgAt == 'number' ||
                    this.exception ||
                    typeof this.returnArgAt == 'number' ||
                    this.returnThis ||
                    this.returnValueDefined);
        },

        invoke: function(context, args) {
            callCallback(this, args);

            if (this.exception) {
                throw this.exception;
            } else if (typeof this.returnArgAt == 'number') {
                return args[this.returnArgAt];
            } else if (this.returnThis) {
                return context;
            }

            return this.returnValue;
        },

        onCall: function(index) {
            return this.stub.onCall(index);
        },

        onFirstCall: function() {
            return this.stub.onFirstCall();
        },

        onSecondCall: function() {
            return this.stub.onSecondCall();
        },

        onThirdCall: function() {
            return this.stub.onThirdCall();
        },

        withArgs: function(/* arguments */) {
            throw new Error('Defining a stub by invoking "stub.onCall(...).withArgs(...)" is not supported. ' +
                            'Use "stub.withArgs(...).onCall(...)" to define sequential behavior for calls with certain arguments.');
        },

        callsArg: function callsArg(pos) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }

            this.callArgAt = pos;
            this.callbackArguments = [];
            this.callbackContext = undefined;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        callsArgOn: function callsArgOn(pos, context) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }
            if (typeof context != "object") {
                throw new TypeError("argument context is not an object");
            }

            this.callArgAt = pos;
            this.callbackArguments = [];
            this.callbackContext = context;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        callsArgWith: function callsArgWith(pos) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }

            this.callArgAt = pos;
            this.callbackArguments = slice.call(arguments, 1);
            this.callbackContext = undefined;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        callsArgOnWith: function callsArgWith(pos, context) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }
            if (typeof context != "object") {
                throw new TypeError("argument context is not an object");
            }

            this.callArgAt = pos;
            this.callbackArguments = slice.call(arguments, 2);
            this.callbackContext = context;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        yields: function () {
            this.callArgAt = -1;
            this.callbackArguments = slice.call(arguments, 0);
            this.callbackContext = undefined;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        yieldsOn: function (context) {
            if (typeof context != "object") {
                throw new TypeError("argument context is not an object");
            }

            this.callArgAt = -1;
            this.callbackArguments = slice.call(arguments, 1);
            this.callbackContext = context;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        yieldsTo: function (prop) {
            this.callArgAt = -1;
            this.callbackArguments = slice.call(arguments, 1);
            this.callbackContext = undefined;
            this.callArgProp = prop;
            this.callbackAsync = false;

            return this;
        },

        yieldsToOn: function (prop, context) {
            if (typeof context != "object") {
                throw new TypeError("argument context is not an object");
            }

            this.callArgAt = -1;
            this.callbackArguments = slice.call(arguments, 2);
            this.callbackContext = context;
            this.callArgProp = prop;
            this.callbackAsync = false;

            return this;
        },


        "throws": throwsException,
        throwsException: throwsException,

        returns: function returns(value) {
            this.returnValue = value;
            this.returnValueDefined = true;

            return this;
        },

        returnsArg: function returnsArg(pos) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }

            this.returnArgAt = pos;

            return this;
        },

        returnsThis: function returnsThis() {
            this.returnThis = true;

            return this;
        }
    };

    // create asynchronous versions of callsArg* and yields* methods
    for (var method in proto) {
        // need to avoid creating anotherasync versions of the newly added async methods
        if (proto.hasOwnProperty(method) &&
            method.match(/^(callsArg|yields)/) &&
            !method.match(/Async/)) {
            proto[method + 'Async'] = (function (syncFnName) {
                return function () {
                    var result = this[syncFnName].apply(this, arguments);
                    this.callbackAsync = true;
                    return result;
                };
            })(method);
        }
    }

    if (commonJSModule) {
        module.exports = proto;
    } else {
        sinon.behavior = proto;
    }
}(typeof sinon == "object" && sinon || null));}).call(this,require("/Users/brianpeacock/apps/subview/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"../sinon":22,"/Users/brianpeacock/apps/subview/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":3}],25:[function(require,module,exports){
/**
  * @depend ../sinon.js
  * @depend match.js
  */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
  * Spy calls
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @author Maximilian Antoni (mail@maxantoni.de)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  * Copyright (c) 2013 Maximilian Antoni
  */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;
    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function throwYieldError(proxy, text, args) {
        var msg = sinon.functionName(proxy) + text;
        if (args.length) {
            msg += " Received [" + slice.call(args).join(", ") + "]";
        }
        throw new Error(msg);
    }

    var slice = Array.prototype.slice;

    var callProto = {
        calledOn: function calledOn(thisValue) {
            if (sinon.match && sinon.match.isMatcher(thisValue)) {
                return thisValue.test(this.thisValue);
            }
            return this.thisValue === thisValue;
        },

        calledWith: function calledWith() {
            for (var i = 0, l = arguments.length; i < l; i += 1) {
                if (!sinon.deepEqual(arguments[i], this.args[i])) {
                    return false;
                }
            }

            return true;
        },

        calledWithMatch: function calledWithMatch() {
            for (var i = 0, l = arguments.length; i < l; i += 1) {
                var actual = this.args[i];
                var expectation = arguments[i];
                if (!sinon.match || !sinon.match(expectation).test(actual)) {
                    return false;
                }
            }
            return true;
        },

        calledWithExactly: function calledWithExactly() {
            return arguments.length == this.args.length &&
                this.calledWith.apply(this, arguments);
        },

        notCalledWith: function notCalledWith() {
            return !this.calledWith.apply(this, arguments);
        },

        notCalledWithMatch: function notCalledWithMatch() {
            return !this.calledWithMatch.apply(this, arguments);
        },

        returned: function returned(value) {
            return sinon.deepEqual(value, this.returnValue);
        },

        threw: function threw(error) {
            if (typeof error === "undefined" || !this.exception) {
                return !!this.exception;
            }

            return this.exception === error || this.exception.name === error;
        },

        calledWithNew: function calledWithNew() {
            return this.proxy.prototype && this.thisValue instanceof this.proxy;
        },

        calledBefore: function (other) {
            return this.callId < other.callId;
        },

        calledAfter: function (other) {
            return this.callId > other.callId;
        },

        callArg: function (pos) {
            this.args[pos]();
        },

        callArgOn: function (pos, thisValue) {
            this.args[pos].apply(thisValue);
        },

        callArgWith: function (pos) {
            this.callArgOnWith.apply(this, [pos, null].concat(slice.call(arguments, 1)));
        },

        callArgOnWith: function (pos, thisValue) {
            var args = slice.call(arguments, 2);
            this.args[pos].apply(thisValue, args);
        },

        "yield": function () {
            this.yieldOn.apply(this, [null].concat(slice.call(arguments, 0)));
        },

        yieldOn: function (thisValue) {
            var args = this.args;
            for (var i = 0, l = args.length; i < l; ++i) {
                if (typeof args[i] === "function") {
                    args[i].apply(thisValue, slice.call(arguments, 1));
                    return;
                }
            }
            throwYieldError(this.proxy, " cannot yield since no callback was passed.", args);
        },

        yieldTo: function (prop) {
            this.yieldToOn.apply(this, [prop, null].concat(slice.call(arguments, 1)));
        },

        yieldToOn: function (prop, thisValue) {
            var args = this.args;
            for (var i = 0, l = args.length; i < l; ++i) {
                if (args[i] && typeof args[i][prop] === "function") {
                    args[i][prop].apply(thisValue, slice.call(arguments, 2));
                    return;
                }
            }
            throwYieldError(this.proxy, " cannot yield to '" + prop +
                "' since no callback was passed.", args);
        },

        toString: function () {
            var callStr = this.proxy.toString() + "(";
            var args = [];

            for (var i = 0, l = this.args.length; i < l; ++i) {
                args.push(sinon.format(this.args[i]));
            }

            callStr = callStr + args.join(", ") + ")";

            if (typeof this.returnValue != "undefined") {
                callStr += " => " + sinon.format(this.returnValue);
            }

            if (this.exception) {
                callStr += " !" + this.exception.name;

                if (this.exception.message) {
                    callStr += "(" + this.exception.message + ")";
                }
            }

            return callStr;
        }
    };

    callProto.invokeCallback = callProto.yield;

    function createSpyCall(spy, thisValue, args, returnValue, exception, id) {
        if (typeof id !== "number") {
            throw new TypeError("Call id is not a number");
        }
        var proxyCall = sinon.create(callProto);
        proxyCall.proxy = spy;
        proxyCall.thisValue = thisValue;
        proxyCall.args = args;
        proxyCall.returnValue = returnValue;
        proxyCall.exception = exception;
        proxyCall.callId = id;

        return proxyCall;
    }
    createSpyCall.toString = callProto.toString; // used by mocks

    if (commonJSModule) {
        module.exports = createSpyCall;
    } else {
        sinon.spyCall = createSpyCall;
    }
}(typeof sinon == "object" && sinon || null));


},{"../sinon":22}],26:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 * @depend mock.js
 */
/*jslint eqeqeq: false, onevar: false, forin: true*/
/*global module, require, sinon*/
/**
 * Collections of stubs, spies and mocks.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;
    var push = [].push;
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function getFakes(fakeCollection) {
        if (!fakeCollection.fakes) {
            fakeCollection.fakes = [];
        }

        return fakeCollection.fakes;
    }

    function each(fakeCollection, method) {
        var fakes = getFakes(fakeCollection);

        for (var i = 0, l = fakes.length; i < l; i += 1) {
            if (typeof fakes[i][method] == "function") {
                fakes[i][method]();
            }
        }
    }

    function compact(fakeCollection) {
        var fakes = getFakes(fakeCollection);
        var i = 0;
        while (i < fakes.length) {
          fakes.splice(i, 1);
        }
    }

    var collection = {
        verify: function resolve() {
            each(this, "verify");
        },

        restore: function restore() {
            each(this, "restore");
            compact(this);
        },

        verifyAndRestore: function verifyAndRestore() {
            var exception;

            try {
                this.verify();
            } catch (e) {
                exception = e;
            }

            this.restore();

            if (exception) {
                throw exception;
            }
        },

        add: function add(fake) {
            push.call(getFakes(this), fake);
            return fake;
        },

        spy: function spy() {
            return this.add(sinon.spy.apply(sinon, arguments));
        },

        stub: function stub(object, property, value) {
            if (property) {
                var original = object[property];

                if (typeof original != "function") {
                    if (!hasOwnProperty.call(object, property)) {
                        throw new TypeError("Cannot stub non-existent own property " + property);
                    }

                    object[property] = value;

                    return this.add({
                        restore: function () {
                            object[property] = original;
                        }
                    });
                }
            }
            if (!property && !!object && typeof object == "object") {
                var stubbedObj = sinon.stub.apply(sinon, arguments);

                for (var prop in stubbedObj) {
                    if (typeof stubbedObj[prop] === "function") {
                        this.add(stubbedObj[prop]);
                    }
                }

                return stubbedObj;
            }

            return this.add(sinon.stub.apply(sinon, arguments));
        },

        mock: function mock() {
            return this.add(sinon.mock.apply(sinon, arguments));
        },

        inject: function inject(obj) {
            var col = this;

            obj.spy = function () {
                return col.spy.apply(col, arguments);
            };

            obj.stub = function () {
                return col.stub.apply(col, arguments);
            };

            obj.mock = function () {
                return col.mock.apply(col, arguments);
            };

            return obj;
        }
    };

    if (commonJSModule) {
        module.exports = collection;
    } else {
        sinon.collection = collection;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":22}],27:[function(require,module,exports){
/* @depend ../sinon.js */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Match functions
 *
 * @author Maximilian Antoni (mail@maxantoni.de)
 * @license BSD
 *
 * Copyright (c) 2012 Maximilian Antoni
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function assertType(value, type, name) {
        var actual = sinon.typeOf(value);
        if (actual !== type) {
            throw new TypeError("Expected type of " + name + " to be " +
                type + ", but was " + actual);
        }
    }

    var matcher = {
        toString: function () {
            return this.message;
        }
    };

    function isMatcher(object) {
        return matcher.isPrototypeOf(object);
    }

    function matchObject(expectation, actual) {
        if (actual === null || actual === undefined) {
            return false;
        }
        for (var key in expectation) {
            if (expectation.hasOwnProperty(key)) {
                var exp = expectation[key];
                var act = actual[key];
                if (match.isMatcher(exp)) {
                    if (!exp.test(act)) {
                        return false;
                    }
                } else if (sinon.typeOf(exp) === "object") {
                    if (!matchObject(exp, act)) {
                        return false;
                    }
                } else if (!sinon.deepEqual(exp, act)) {
                    return false;
                }
            }
        }
        return true;
    }

    matcher.or = function (m2) {
        if (!isMatcher(m2)) {
            throw new TypeError("Matcher expected");
        }
        var m1 = this;
        var or = sinon.create(matcher);
        or.test = function (actual) {
            return m1.test(actual) || m2.test(actual);
        };
        or.message = m1.message + ".or(" + m2.message + ")";
        return or;
    };

    matcher.and = function (m2) {
        if (!isMatcher(m2)) {
            throw new TypeError("Matcher expected");
        }
        var m1 = this;
        var and = sinon.create(matcher);
        and.test = function (actual) {
            return m1.test(actual) && m2.test(actual);
        };
        and.message = m1.message + ".and(" + m2.message + ")";
        return and;
    };

    var match = function (expectation, message) {
        var m = sinon.create(matcher);
        var type = sinon.typeOf(expectation);
        switch (type) {
        case "object":
            if (typeof expectation.test === "function") {
                m.test = function (actual) {
                    return expectation.test(actual) === true;
                };
                m.message = "match(" + sinon.functionName(expectation.test) + ")";
                return m;
            }
            var str = [];
            for (var key in expectation) {
                if (expectation.hasOwnProperty(key)) {
                    str.push(key + ": " + expectation[key]);
                }
            }
            m.test = function (actual) {
                return matchObject(expectation, actual);
            };
            m.message = "match(" + str.join(", ") + ")";
            break;
        case "number":
            m.test = function (actual) {
                return expectation == actual;
            };
            break;
        case "string":
            m.test = function (actual) {
                if (typeof actual !== "string") {
                    return false;
                }
                return actual.indexOf(expectation) !== -1;
            };
            m.message = "match(\"" + expectation + "\")";
            break;
        case "regexp":
            m.test = function (actual) {
                if (typeof actual !== "string") {
                    return false;
                }
                return expectation.test(actual);
            };
            break;
        case "function":
            m.test = expectation;
            if (message) {
                m.message = message;
            } else {
                m.message = "match(" + sinon.functionName(expectation) + ")";
            }
            break;
        default:
            m.test = function (actual) {
              return sinon.deepEqual(expectation, actual);
            };
        }
        if (!m.message) {
            m.message = "match(" + expectation + ")";
        }
        return m;
    };

    match.isMatcher = isMatcher;

    match.any = match(function () {
        return true;
    }, "any");

    match.defined = match(function (actual) {
        return actual !== null && actual !== undefined;
    }, "defined");

    match.truthy = match(function (actual) {
        return !!actual;
    }, "truthy");

    match.falsy = match(function (actual) {
        return !actual;
    }, "falsy");

    match.same = function (expectation) {
        return match(function (actual) {
            return expectation === actual;
        }, "same(" + expectation + ")");
    };

    match.typeOf = function (type) {
        assertType(type, "string", "type");
        return match(function (actual) {
            return sinon.typeOf(actual) === type;
        }, "typeOf(\"" + type + "\")");
    };

    match.instanceOf = function (type) {
        assertType(type, "function", "type");
        return match(function (actual) {
            return actual instanceof type;
        }, "instanceOf(" + sinon.functionName(type) + ")");
    };

    function createPropertyMatcher(propertyTest, messagePrefix) {
        return function (property, value) {
            assertType(property, "string", "property");
            var onlyProperty = arguments.length === 1;
            var message = messagePrefix + "(\"" + property + "\"";
            if (!onlyProperty) {
                message += ", " + value;
            }
            message += ")";
            return match(function (actual) {
                if (actual === undefined || actual === null ||
                        !propertyTest(actual, property)) {
                    return false;
                }
                return onlyProperty || sinon.deepEqual(value, actual[property]);
            }, message);
        };
    }

    match.has = createPropertyMatcher(function (actual, property) {
        if (typeof actual === "object") {
            return property in actual;
        }
        return actual[property] !== undefined;
    }, "has");

    match.hasOwn = createPropertyMatcher(function (actual, property) {
        return actual.hasOwnProperty(property);
    }, "hasOwn");

    match.bool = match.typeOf("boolean");
    match.number = match.typeOf("number");
    match.string = match.typeOf("string");
    match.object = match.typeOf("object");
    match.func = match.typeOf("function");
    match.array = match.typeOf("array");
    match.regexp = match.typeOf("regexp");
    match.date = match.typeOf("date");

    if (commonJSModule) {
        module.exports = match;
    } else {
        sinon.match = match;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":22}],28:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 */
/*jslint eqeqeq: false, onevar: false, nomen: false*/
/*global module, require, sinon*/
/**
 * Mock functions.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;
    var push = [].push;
    var match;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    match = sinon.match;

    if (!match && commonJSModule) {
        match = require("./match");
    }

    function mock(object) {
        if (!object) {
            return sinon.expectation.create("Anonymous mock");
        }

        return mock.create(object);
    }

    sinon.mock = mock;

    sinon.extend(mock, (function () {
        function each(collection, callback) {
            if (!collection) {
                return;
            }

            for (var i = 0, l = collection.length; i < l; i += 1) {
                callback(collection[i]);
            }
        }

        return {
            create: function create(object) {
                if (!object) {
                    throw new TypeError("object is null");
                }

                var mockObject = sinon.extend({}, mock);
                mockObject.object = object;
                delete mockObject.create;

                return mockObject;
            },

            expects: function expects(method) {
                if (!method) {
                    throw new TypeError("method is falsy");
                }

                if (!this.expectations) {
                    this.expectations = {};
                    this.proxies = [];
                }

                if (!this.expectations[method]) {
                    this.expectations[method] = [];
                    var mockObject = this;

                    sinon.wrapMethod(this.object, method, function () {
                        return mockObject.invokeMethod(method, this, arguments);
                    });

                    push.call(this.proxies, method);
                }

                var expectation = sinon.expectation.create(method);
                push.call(this.expectations[method], expectation);

                return expectation;
            },

            restore: function restore() {
                var object = this.object;

                each(this.proxies, function (proxy) {
                    if (typeof object[proxy].restore == "function") {
                        object[proxy].restore();
                    }
                });
            },

            verify: function verify() {
                var expectations = this.expectations || {};
                var messages = [], met = [];

                each(this.proxies, function (proxy) {
                    each(expectations[proxy], function (expectation) {
                        if (!expectation.met()) {
                            push.call(messages, expectation.toString());
                        } else {
                            push.call(met, expectation.toString());
                        }
                    });
                });

                this.restore();

                if (messages.length > 0) {
                    sinon.expectation.fail(messages.concat(met).join("\n"));
                } else {
                    sinon.expectation.pass(messages.concat(met).join("\n"));
                }

                return true;
            },

            invokeMethod: function invokeMethod(method, thisValue, args) {
                var expectations = this.expectations && this.expectations[method];
                var length = expectations && expectations.length || 0, i;

                for (i = 0; i < length; i += 1) {
                    if (!expectations[i].met() &&
                        expectations[i].allowsCall(thisValue, args)) {
                        return expectations[i].apply(thisValue, args);
                    }
                }

                var messages = [], available, exhausted = 0;

                for (i = 0; i < length; i += 1) {
                    if (expectations[i].allowsCall(thisValue, args)) {
                        available = available || expectations[i];
                    } else {
                        exhausted += 1;
                    }
                    push.call(messages, "    " + expectations[i].toString());
                }

                if (exhausted === 0) {
                    return available.apply(thisValue, args);
                }

                messages.unshift("Unexpected call: " + sinon.spyCall.toString.call({
                    proxy: method,
                    args: args
                }));

                sinon.expectation.fail(messages.join("\n"));
            }
        };
    }()));

    var times = sinon.timesInWords;

    sinon.expectation = (function () {
        var slice = Array.prototype.slice;
        var _invoke = sinon.spy.invoke;

        function callCountInWords(callCount) {
            if (callCount == 0) {
                return "never called";
            } else {
                return "called " + times(callCount);
            }
        }

        function expectedCallCountInWords(expectation) {
            var min = expectation.minCalls;
            var max = expectation.maxCalls;

            if (typeof min == "number" && typeof max == "number") {
                var str = times(min);

                if (min != max) {
                    str = "at least " + str + " and at most " + times(max);
                }

                return str;
            }

            if (typeof min == "number") {
                return "at least " + times(min);
            }

            return "at most " + times(max);
        }

        function receivedMinCalls(expectation) {
            var hasMinLimit = typeof expectation.minCalls == "number";
            return !hasMinLimit || expectation.callCount >= expectation.minCalls;
        }

        function receivedMaxCalls(expectation) {
            if (typeof expectation.maxCalls != "number") {
                return false;
            }

            return expectation.callCount == expectation.maxCalls;
        }

        function verifyMatcher(possibleMatcher, arg){
            if (match && match.isMatcher(possibleMatcher)) {
                return possibleMatcher.test(arg);
            } else {
                return true;
            }
        }

        return {
            minCalls: 1,
            maxCalls: 1,

            create: function create(methodName) {
                var expectation = sinon.extend(sinon.stub.create(), sinon.expectation);
                delete expectation.create;
                expectation.method = methodName;

                return expectation;
            },

            invoke: function invoke(func, thisValue, args) {
                this.verifyCallAllowed(thisValue, args);

                return _invoke.apply(this, arguments);
            },

            atLeast: function atLeast(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.maxCalls = null;
                    this.limitsSet = true;
                }

                this.minCalls = num;

                return this;
            },

            atMost: function atMost(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.minCalls = null;
                    this.limitsSet = true;
                }

                this.maxCalls = num;

                return this;
            },

            never: function never() {
                return this.exactly(0);
            },

            once: function once() {
                return this.exactly(1);
            },

            twice: function twice() {
                return this.exactly(2);
            },

            thrice: function thrice() {
                return this.exactly(3);
            },

            exactly: function exactly(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not a number");
                }

                this.atLeast(num);
                return this.atMost(num);
            },

            met: function met() {
                return !this.failed && receivedMinCalls(this);
            },

            verifyCallAllowed: function verifyCallAllowed(thisValue, args) {
                if (receivedMaxCalls(this)) {
                    this.failed = true;
                    sinon.expectation.fail(this.method + " already called " + times(this.maxCalls));
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    sinon.expectation.fail(this.method + " called with " + thisValue + " as thisValue, expected " +
                        this.expectedThis);
                }

                if (!("expectedArguments" in this)) {
                    return;
                }

                if (!args) {
                    sinon.expectation.fail(this.method + " received no arguments, expected " +
                        sinon.format(this.expectedArguments));
                }

                if (args.length < this.expectedArguments.length) {
                    sinon.expectation.fail(this.method + " received too few arguments (" + sinon.format(args) +
                        "), expected " + sinon.format(this.expectedArguments));
                }

                if (this.expectsExactArgCount &&
                    args.length != this.expectedArguments.length) {
                    sinon.expectation.fail(this.method + " received too many arguments (" + sinon.format(args) +
                        "), expected " + sinon.format(this.expectedArguments));
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {

                    if (!verifyMatcher(this.expectedArguments[i],args[i])) {
                        sinon.expectation.fail(this.method + " received wrong arguments " + sinon.format(args) +
                            ", didn't match " + this.expectedArguments.toString());
                    }

                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        sinon.expectation.fail(this.method + " received wrong arguments " + sinon.format(args) +
                            ", expected " + sinon.format(this.expectedArguments));
                    }
                }
            },

            allowsCall: function allowsCall(thisValue, args) {
                if (this.met() && receivedMaxCalls(this)) {
                    return false;
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    return false;
                }

                if (!("expectedArguments" in this)) {
                    return true;
                }

                args = args || [];

                if (args.length < this.expectedArguments.length) {
                    return false;
                }

                if (this.expectsExactArgCount &&
                    args.length != this.expectedArguments.length) {
                    return false;
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {
                    if (!verifyMatcher(this.expectedArguments[i],args[i])) {
                        return false;
                    }

                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        return false;
                    }
                }

                return true;
            },

            withArgs: function withArgs() {
                this.expectedArguments = slice.call(arguments);
                return this;
            },

            withExactArgs: function withExactArgs() {
                this.withArgs.apply(this, arguments);
                this.expectsExactArgCount = true;
                return this;
            },

            on: function on(thisValue) {
                this.expectedThis = thisValue;
                return this;
            },

            toString: function () {
                var args = (this.expectedArguments || []).slice();

                if (!this.expectsExactArgCount) {
                    push.call(args, "[...]");
                }

                var callStr = sinon.spyCall.toString.call({
                    proxy: this.method || "anonymous mock expectation",
                    args: args
                });

                var message = callStr.replace(", [...", "[, ...") + " " +
                    expectedCallCountInWords(this);

                if (this.met()) {
                    return "Expectation met: " + message;
                }

                return "Expected " + message + " (" +
                    callCountInWords(this.callCount) + ")";
            },

            verify: function verify() {
                if (!this.met()) {
                    sinon.expectation.fail(this.toString());
                } else {
                    sinon.expectation.pass(this.toString());
                }

                return true;
            },

            pass: function(message) {
              sinon.assert.pass(message);
            },
            fail: function (message) {
                var exception = new Error(message);
                exception.name = "ExpectationError";

                throw exception;
            }
        };
    }());

    if (commonJSModule) {
        module.exports = mock;
    } else {
        sinon.mock = mock;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":22,"./match":27}],29:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend collection.js
 * @depend util/fake_timers.js
 * @depend util/fake_server_with_clock.js
 */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global require, module*/
/**
 * Manages fake collections as well as fake utilities such as Sinon's
 * timers and fake XHR implementation in one convenient object.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

if (typeof module !== 'undefined' && module.exports) {
    var sinon = require("../sinon");
    sinon.extend(sinon, require("./util/fake_timers"));
}

(function () {
    var push = [].push;

    function exposeValue(sandbox, config, key, value) {
        if (!value) {
            return;
        }

        if (config.injectInto && !(key in config.injectInto) ) {
            config.injectInto[key] = value;
        } else {
            push.call(sandbox.args, value);
        }
    }

    function prepareSandboxFromConfig(config) {
        var sandbox = sinon.create(sinon.sandbox);

        if (config.useFakeServer) {
            if (typeof config.useFakeServer == "object") {
                sandbox.serverPrototype = config.useFakeServer;
            }

            sandbox.useFakeServer();
        }

        if (config.useFakeTimers) {
            if (typeof config.useFakeTimers == "object") {
                sandbox.useFakeTimers.apply(sandbox, config.useFakeTimers);
            } else {
                sandbox.useFakeTimers();
            }
        }

        return sandbox;
    }

    sinon.sandbox = sinon.extend(sinon.create(sinon.collection), {
        useFakeTimers: function useFakeTimers() {
            this.clock = sinon.useFakeTimers.apply(sinon, arguments);

            return this.add(this.clock);
        },

        serverPrototype: sinon.fakeServer,

        useFakeServer: function useFakeServer() {
            var proto = this.serverPrototype || sinon.fakeServer;

            if (!proto || !proto.create) {
                return null;
            }

            this.server = proto.create();
            return this.add(this.server);
        },

        inject: function (obj) {
            sinon.collection.inject.call(this, obj);

            if (this.clock) {
                obj.clock = this.clock;
            }

            if (this.server) {
                obj.server = this.server;
                obj.requests = this.server.requests;
            }

            return obj;
        },

        create: function (config) {
            if (!config) {
                return sinon.create(sinon.sandbox);
            }

            var sandbox = prepareSandboxFromConfig(config);
            sandbox.args = sandbox.args || [];
            var prop, value, exposed = sandbox.inject({});

            if (config.properties) {
                for (var i = 0, l = config.properties.length; i < l; i++) {
                    prop = config.properties[i];
                    value = exposed[prop] || prop == "sandbox" && sandbox;
                    exposeValue(sandbox, config, prop, value);
                }
            } else {
                exposeValue(sandbox, config, "sandbox", value);
            }

            return sandbox;
        }
    });

    sinon.sandbox.useFakeXMLHttpRequest = sinon.sandbox.useFakeServer;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sinon.sandbox;
    }
}());

},{"../sinon":22,"./util/fake_timers":34}],30:[function(require,module,exports){
/**
  * @depend ../sinon.js
  * @depend call.js
  */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
  * Spy functions
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;
    var push = Array.prototype.push;
    var slice = Array.prototype.slice;
    var callId = 0;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function spy(object, property) {
        if (!property && typeof object == "function") {
            return spy.create(object);
        }

        if (!object && !property) {
            return spy.create(function () { });
        }

        var method = object[property];
        return sinon.wrapMethod(object, property, spy.create(method));
    }

    function matchingFake(fakes, args, strict) {
        if (!fakes) {
            return;
        }

        for (var i = 0, l = fakes.length; i < l; i++) {
            if (fakes[i].matches(args, strict)) {
                return fakes[i];
            }
        }
    }

    function incrementCallCount() {
        this.called = true;
        this.callCount += 1;
        this.notCalled = false;
        this.calledOnce = this.callCount == 1;
        this.calledTwice = this.callCount == 2;
        this.calledThrice = this.callCount == 3;
    }

    function createCallProperties() {
        this.firstCall = this.getCall(0);
        this.secondCall = this.getCall(1);
        this.thirdCall = this.getCall(2);
        this.lastCall = this.getCall(this.callCount - 1);
    }

    var vars = "a,b,c,d,e,f,g,h,i,j,k,l";
    function createProxy(func) {
        // Retain the function length:
        var p;
        if (func.length) {
            eval("p = (function proxy(" + vars.substring(0, func.length * 2 - 1) +
                ") { return p.invoke(func, this, slice.call(arguments)); });");
        }
        else {
            p = function proxy() {
                return p.invoke(func, this, slice.call(arguments));
            };
        }
        return p;
    }

    var uuid = 0;

    // Public API
    var spyApi = {
        reset: function () {
            this.called = false;
            this.notCalled = true;
            this.calledOnce = false;
            this.calledTwice = false;
            this.calledThrice = false;
            this.callCount = 0;
            this.firstCall = null;
            this.secondCall = null;
            this.thirdCall = null;
            this.lastCall = null;
            this.args = [];
            this.returnValues = [];
            this.thisValues = [];
            this.exceptions = [];
            this.callIds = [];
            if (this.fakes) {
                for (var i = 0; i < this.fakes.length; i++) {
                    this.fakes[i].reset();
                }
            }
        },

        create: function create(func) {
            var name;

            if (typeof func != "function") {
                func = function () { };
            } else {
                name = sinon.functionName(func);
            }

            var proxy = createProxy(func);

            sinon.extend(proxy, spy);
            delete proxy.create;
            sinon.extend(proxy, func);

            proxy.reset();
            proxy.prototype = func.prototype;
            proxy.displayName = name || "spy";
            proxy.toString = sinon.functionToString;
            proxy._create = sinon.spy.create;
            proxy.id = "spy#" + uuid++;

            return proxy;
        },

        invoke: function invoke(func, thisValue, args) {
            var matching = matchingFake(this.fakes, args);
            var exception, returnValue;

            incrementCallCount.call(this);
            push.call(this.thisValues, thisValue);
            push.call(this.args, args);
            push.call(this.callIds, callId++);

            try {
                if (matching) {
                    returnValue = matching.invoke(func, thisValue, args);
                } else {
                    returnValue = (this.func || func).apply(thisValue, args);
                }

                var thisCall = this.getCall(this.callCount - 1);
                if (thisCall.calledWithNew() && typeof returnValue !== 'object') {
                    returnValue = thisValue;
                }
            } catch (e) {
                exception = e;
            }

            push.call(this.exceptions, exception);
            push.call(this.returnValues, returnValue);

            createCallProperties.call(this);

            if (exception !== undefined) {
                throw exception;
            }

            return returnValue;
        },

        getCall: function getCall(i) {
            if (i < 0 || i >= this.callCount) {
                return null;
            }

            return sinon.spyCall(this, this.thisValues[i], this.args[i],
                                    this.returnValues[i], this.exceptions[i],
                                    this.callIds[i]);
        },

        getCalls: function () {
            var calls = [];
            var i;

            for (i = 0; i < this.callCount; i++) {
                calls.push(this.getCall(i));
            }

            return calls;
        },

        calledBefore: function calledBefore(spyFn) {
            if (!this.called) {
                return false;
            }

            if (!spyFn.called) {
                return true;
            }

            return this.callIds[0] < spyFn.callIds[spyFn.callIds.length - 1];
        },

        calledAfter: function calledAfter(spyFn) {
            if (!this.called || !spyFn.called) {
                return false;
            }

            return this.callIds[this.callCount - 1] > spyFn.callIds[spyFn.callCount - 1];
        },

        withArgs: function () {
            var args = slice.call(arguments);

            if (this.fakes) {
                var match = matchingFake(this.fakes, args, true);

                if (match) {
                    return match;
                }
            } else {
                this.fakes = [];
            }

            var original = this;
            var fake = this._create();
            fake.matchingAguments = args;
            fake.parent = this;
            push.call(this.fakes, fake);

            fake.withArgs = function () {
                return original.withArgs.apply(original, arguments);
            };

            for (var i = 0; i < this.args.length; i++) {
                if (fake.matches(this.args[i])) {
                    incrementCallCount.call(fake);
                    push.call(fake.thisValues, this.thisValues[i]);
                    push.call(fake.args, this.args[i]);
                    push.call(fake.returnValues, this.returnValues[i]);
                    push.call(fake.exceptions, this.exceptions[i]);
                    push.call(fake.callIds, this.callIds[i]);
                }
            }
            createCallProperties.call(fake);

            return fake;
        },

        matches: function (args, strict) {
            var margs = this.matchingAguments;

            if (margs.length <= args.length &&
                sinon.deepEqual(margs, args.slice(0, margs.length))) {
                return !strict || margs.length == args.length;
            }
        },

        printf: function (format) {
            var spy = this;
            var args = slice.call(arguments, 1);
            var formatter;

            return (format || "").replace(/%(.)/g, function (match, specifyer) {
                formatter = spyApi.formatters[specifyer];

                if (typeof formatter == "function") {
                    return formatter.call(null, spy, args);
                } else if (!isNaN(parseInt(specifyer, 10))) {
                    return sinon.format(args[specifyer - 1]);
                }

                return "%" + specifyer;
            });
        }
    };

    function delegateToCalls(method, matchAny, actual, notCalled) {
        spyApi[method] = function () {
            if (!this.called) {
                if (notCalled) {
                    return notCalled.apply(this, arguments);
                }
                return false;
            }

            var currentCall;
            var matches = 0;

            for (var i = 0, l = this.callCount; i < l; i += 1) {
                currentCall = this.getCall(i);

                if (currentCall[actual || method].apply(currentCall, arguments)) {
                    matches += 1;

                    if (matchAny) {
                        return true;
                    }
                }
            }

            return matches === this.callCount;
        };
    }

    delegateToCalls("calledOn", true);
    delegateToCalls("alwaysCalledOn", false, "calledOn");
    delegateToCalls("calledWith", true);
    delegateToCalls("calledWithMatch", true);
    delegateToCalls("alwaysCalledWith", false, "calledWith");
    delegateToCalls("alwaysCalledWithMatch", false, "calledWithMatch");
    delegateToCalls("calledWithExactly", true);
    delegateToCalls("alwaysCalledWithExactly", false, "calledWithExactly");
    delegateToCalls("neverCalledWith", false, "notCalledWith",
        function () { return true; });
    delegateToCalls("neverCalledWithMatch", false, "notCalledWithMatch",
        function () { return true; });
    delegateToCalls("threw", true);
    delegateToCalls("alwaysThrew", false, "threw");
    delegateToCalls("returned", true);
    delegateToCalls("alwaysReturned", false, "returned");
    delegateToCalls("calledWithNew", true);
    delegateToCalls("alwaysCalledWithNew", false, "calledWithNew");
    delegateToCalls("callArg", false, "callArgWith", function () {
        throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
    });
    spyApi.callArgWith = spyApi.callArg;
    delegateToCalls("callArgOn", false, "callArgOnWith", function () {
        throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
    });
    spyApi.callArgOnWith = spyApi.callArgOn;
    delegateToCalls("yield", false, "yield", function () {
        throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
    });
    // "invokeCallback" is an alias for "yield" since "yield" is invalid in strict mode.
    spyApi.invokeCallback = spyApi.yield;
    delegateToCalls("yieldOn", false, "yieldOn", function () {
        throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
    });
    delegateToCalls("yieldTo", false, "yieldTo", function (property) {
        throw new Error(this.toString() + " cannot yield to '" + property +
            "' since it was not yet invoked.");
    });
    delegateToCalls("yieldToOn", false, "yieldToOn", function (property) {
        throw new Error(this.toString() + " cannot yield to '" + property +
            "' since it was not yet invoked.");
    });

    spyApi.formatters = {
        "c": function (spy) {
            return sinon.timesInWords(spy.callCount);
        },

        "n": function (spy) {
            return spy.toString();
        },

        "C": function (spy) {
            var calls = [];

            for (var i = 0, l = spy.callCount; i < l; ++i) {
                var stringifiedCall = "    " + spy.getCall(i).toString();
                if (/\n/.test(calls[i - 1])) {
                    stringifiedCall = "\n" + stringifiedCall;
                }
                push.call(calls, stringifiedCall);
            }

            return calls.length > 0 ? "\n" + calls.join("\n") : "";
        },

        "t": function (spy) {
            var objects = [];

            for (var i = 0, l = spy.callCount; i < l; ++i) {
                push.call(objects, sinon.format(spy.thisValues[i]));
            }

            return objects.join(", ");
        },

        "*": function (spy, args) {
            var formatted = [];

            for (var i = 0, l = args.length; i < l; ++i) {
                push.call(formatted, sinon.format(args[i]));
            }

            return formatted.join(", ");
        }
    };

    sinon.extend(spy, spyApi);

    spy.spyCall = sinon.spyCall;

    if (commonJSModule) {
        module.exports = spy;
    } else {
        sinon.spy = spy;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":22}],31:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend spy.js
 * @depend behavior.js
 */
/*jslint eqeqeq: false, onevar: false*/
/*global module, require, sinon*/
/**
 * Stub functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function stub(object, property, func) {
        if (!!func && typeof func != "function") {
            throw new TypeError("Custom stub should be function");
        }

        var wrapper;

        if (func) {
            wrapper = sinon.spy && sinon.spy.create ? sinon.spy.create(func) : func;
        } else {
            wrapper = stub.create();
        }

        if (!object && typeof property === "undefined") {
            return sinon.stub.create();
        }

        if (typeof property === "undefined" && typeof object == "object") {
            for (var prop in object) {
                if (typeof object[prop] === "function") {
                    stub(object, prop);
                }
            }

            return object;
        }

        return sinon.wrapMethod(object, property, wrapper);
    }

    function getDefaultBehavior(stub) {
        return stub.defaultBehavior || getParentBehaviour(stub) || sinon.behavior.create(stub);
    }

    function getParentBehaviour(stub) {
        return (stub.parent && getCurrentBehavior(stub.parent));
    }

    function getCurrentBehavior(stub) {
        var behavior = stub.behaviors[stub.callCount - 1];
        return behavior && behavior.isPresent() ? behavior : getDefaultBehavior(stub);
    }

    var uuid = 0;

    sinon.extend(stub, (function () {
        var proto = {
            create: function create() {
                var functionStub = function () {
                    return getCurrentBehavior(functionStub).invoke(this, arguments);
                };

                functionStub.id = "stub#" + uuid++;
                var orig = functionStub;
                functionStub = sinon.spy.create(functionStub);
                functionStub.func = orig;

                sinon.extend(functionStub, stub);
                functionStub._create = sinon.stub.create;
                functionStub.displayName = "stub";
                functionStub.toString = sinon.functionToString;

                functionStub.defaultBehavior = null;
                functionStub.behaviors = [];

                return functionStub;
            },

            resetBehavior: function () {
                var i;

                this.defaultBehavior = null;
                this.behaviors = [];

                delete this.returnValue;
                delete this.returnArgAt;
                this.returnThis = false;

                if (this.fakes) {
                    for (i = 0; i < this.fakes.length; i++) {
                        this.fakes[i].resetBehavior();
                    }
                }
            },

            onCall: function(index) {
                if (!this.behaviors[index]) {
                    this.behaviors[index] = sinon.behavior.create(this);
                }

                return this.behaviors[index];
            },

            onFirstCall: function() {
                return this.onCall(0);
            },

            onSecondCall: function() {
                return this.onCall(1);
            },

            onThirdCall: function() {
                return this.onCall(2);
            }
        };

        for (var method in sinon.behavior) {
            if (sinon.behavior.hasOwnProperty(method) &&
                !proto.hasOwnProperty(method) &&
                method != 'create' &&
                method != 'withArgs' &&
                method != 'invoke') {
                proto[method] = (function(behaviorMethod) {
                    return function() {
                        this.defaultBehavior = this.defaultBehavior || sinon.behavior.create(this);
                        this.defaultBehavior[behaviorMethod].apply(this.defaultBehavior, arguments);
                        return this;
                    };
                }(method));
            }
        }

        return proto;
    }()));

    if (commonJSModule) {
        module.exports = stub;
    } else {
        sinon.stub = stub;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":22}],32:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 * @depend mock.js
 * @depend sandbox.js
 */
/*jslint eqeqeq: false, onevar: false, forin: true, plusplus: false*/
/*global module, require, sinon*/
/**
 * Test function, sandboxes fakes
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function test(callback) {
        var type = typeof callback;

        if (type != "function") {
            throw new TypeError("sinon.test needs to wrap a test function, got " + type);
        }

        return function () {
            var config = sinon.getConfig(sinon.config);
            config.injectInto = config.injectIntoThis && this || config.injectInto;
            var sandbox = sinon.sandbox.create(config);
            var exception, result;
            var args = Array.prototype.slice.call(arguments).concat(sandbox.args);

            try {
                result = callback.apply(this, args);
            } catch (e) {
                exception = e;
            }

            if (typeof exception !== "undefined") {
                sandbox.restore();
                throw exception;
            }
            else {
                sandbox.verifyAndRestore();
            }

            return result;
        };
    }

    test.config = {
        injectIntoThis: true,
        injectInto: null,
        properties: ["spy", "stub", "mock", "clock", "server", "requests"],
        useFakeTimers: true,
        useFakeServer: true
    };

    if (commonJSModule) {
        module.exports = test;
    } else {
        sinon.test = test;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":22}],33:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend test.js
 */
/*jslint eqeqeq: false, onevar: false, eqeqeq: false*/
/*global module, require, sinon*/
/**
 * Test case, sandboxes all test functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon || !Object.prototype.hasOwnProperty) {
        return;
    }

    function createTest(property, setUp, tearDown) {
        return function () {
            if (setUp) {
                setUp.apply(this, arguments);
            }

            var exception, result;

            try {
                result = property.apply(this, arguments);
            } catch (e) {
                exception = e;
            }

            if (tearDown) {
                tearDown.apply(this, arguments);
            }

            if (exception) {
                throw exception;
            }

            return result;
        };
    }

    function testCase(tests, prefix) {
        /*jsl:ignore*/
        if (!tests || typeof tests != "object") {
            throw new TypeError("sinon.testCase needs an object with test functions");
        }
        /*jsl:end*/

        prefix = prefix || "test";
        var rPrefix = new RegExp("^" + prefix);
        var methods = {}, testName, property, method;
        var setUp = tests.setUp;
        var tearDown = tests.tearDown;

        for (testName in tests) {
            if (tests.hasOwnProperty(testName)) {
                property = tests[testName];

                if (/^(setUp|tearDown)$/.test(testName)) {
                    continue;
                }

                if (typeof property == "function" && rPrefix.test(testName)) {
                    method = property;

                    if (setUp || tearDown) {
                        method = createTest(property, setUp, tearDown);
                    }

                    methods[testName] = sinon.test(method);
                } else {
                    methods[testName] = tests[testName];
                }
            }
        }

        return methods;
    }

    if (commonJSModule) {
        module.exports = testCase;
    } else {
        sinon.testCase = testCase;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":22}],34:[function(require,module,exports){
(function (global){/*jslint eqeqeq: false, plusplus: false, evil: true, onevar: false, browser: true, forin: false*/
/*global module, require, window*/
/**
 * Fake timer API
 * setTimeout
 * setInterval
 * clearTimeout
 * clearInterval
 * tick
 * reset
 * Date
 *
 * Inspired by jsUnitMockTimeOut from JsUnit
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

if (typeof sinon == "undefined") {
    var sinon = {};
}

(function (global) {
    var id = 1;

    function addTimer(args, recurring) {
        if (args.length === 0) {
            throw new Error("Function requires at least 1 parameter");
        }

        if (typeof args[0] === "undefined") {
            throw new Error("Callback must be provided to timer calls");
        }

        var toId = id++;
        var delay = args[1] || 0;

        if (!this.timeouts) {
            this.timeouts = {};
        }

        this.timeouts[toId] = {
            id: toId,
            func: args[0],
            callAt: this.now + delay,
            invokeArgs: Array.prototype.slice.call(args, 2)
        };

        if (recurring === true) {
            this.timeouts[toId].interval = delay;
        }

        return toId;
    }

    function parseTime(str) {
        if (!str) {
            return 0;
        }

        var strings = str.split(":");
        var l = strings.length, i = l;
        var ms = 0, parsed;

        if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
            throw new Error("tick only understands numbers and 'h:m:s'");
        }

        while (i--) {
            parsed = parseInt(strings[i], 10);

            if (parsed >= 60) {
                throw new Error("Invalid time " + str);
            }

            ms += parsed * Math.pow(60, (l - i - 1));
        }

        return ms * 1000;
    }

    function createObject(object) {
        var newObject;

        if (Object.create) {
            newObject = Object.create(object);
        } else {
            var F = function () {};
            F.prototype = object;
            newObject = new F();
        }

        newObject.Date.clock = newObject;
        return newObject;
    }

    sinon.clock = {
        now: 0,

        create: function create(now) {
            var clock = createObject(this);

            if (typeof now == "number") {
                clock.now = now;
            }

            if (!!now && typeof now == "object") {
                throw new TypeError("now should be milliseconds since UNIX epoch");
            }

            return clock;
        },

        setTimeout: function setTimeout(callback, timeout) {
            return addTimer.call(this, arguments, false);
        },

        clearTimeout: function clearTimeout(timerId) {
            if (!this.timeouts) {
                this.timeouts = [];
            }

            if (timerId in this.timeouts) {
                delete this.timeouts[timerId];
            }
        },

        setInterval: function setInterval(callback, timeout) {
            return addTimer.call(this, arguments, true);
        },

        clearInterval: function clearInterval(timerId) {
            this.clearTimeout(timerId);
        },

        setImmediate: function setImmediate(callback) {
            var passThruArgs = Array.prototype.slice.call(arguments, 1);

            return addTimer.call(this, [callback, 0].concat(passThruArgs), false);
        },

        clearImmediate: function clearImmediate(timerId) {
            this.clearTimeout(timerId);
        },

        tick: function tick(ms) {
            ms = typeof ms == "number" ? ms : parseTime(ms);
            var tickFrom = this.now, tickTo = this.now + ms, previous = this.now;
            var timer = this.firstTimerInRange(tickFrom, tickTo);

            var firstException;
            while (timer && tickFrom <= tickTo) {
                if (this.timeouts[timer.id]) {
                    tickFrom = this.now = timer.callAt;
                    try {
                      this.callTimer(timer);
                    } catch (e) {
                      firstException = firstException || e;
                    }
                }

                timer = this.firstTimerInRange(previous, tickTo);
                previous = tickFrom;
            }

            this.now = tickTo;

            if (firstException) {
              throw firstException;
            }

            return this.now;
        },

        firstTimerInRange: function (from, to) {
            var timer, smallest = null, originalTimer;

            for (var id in this.timeouts) {
                if (this.timeouts.hasOwnProperty(id)) {
                    if (this.timeouts[id].callAt < from || this.timeouts[id].callAt > to) {
                        continue;
                    }

                    if (smallest === null || this.timeouts[id].callAt < smallest) {
                        originalTimer = this.timeouts[id];
                        smallest = this.timeouts[id].callAt;

                        timer = {
                            func: this.timeouts[id].func,
                            callAt: this.timeouts[id].callAt,
                            interval: this.timeouts[id].interval,
                            id: this.timeouts[id].id,
                            invokeArgs: this.timeouts[id].invokeArgs
                        };
                    }
                }
            }

            return timer || null;
        },

        callTimer: function (timer) {
            if (typeof timer.interval == "number") {
                this.timeouts[timer.id].callAt += timer.interval;
            } else {
                delete this.timeouts[timer.id];
            }

            try {
                if (typeof timer.func == "function") {
                    timer.func.apply(null, timer.invokeArgs);
                } else {
                    eval(timer.func);
                }
            } catch (e) {
              var exception = e;
            }

            if (!this.timeouts[timer.id]) {
                if (exception) {
                  throw exception;
                }
                return;
            }

            if (exception) {
              throw exception;
            }
        },

        reset: function reset() {
            this.timeouts = {};
        },

        Date: (function () {
            var NativeDate = Date;

            function ClockDate(year, month, date, hour, minute, second, ms) {
                // Defensive and verbose to avoid potential harm in passing
                // explicit undefined when user does not pass argument
                switch (arguments.length) {
                case 0:
                    return new NativeDate(ClockDate.clock.now);
                case 1:
                    return new NativeDate(year);
                case 2:
                    return new NativeDate(year, month);
                case 3:
                    return new NativeDate(year, month, date);
                case 4:
                    return new NativeDate(year, month, date, hour);
                case 5:
                    return new NativeDate(year, month, date, hour, minute);
                case 6:
                    return new NativeDate(year, month, date, hour, minute, second);
                default:
                    return new NativeDate(year, month, date, hour, minute, second, ms);
                }
            }

            return mirrorDateProperties(ClockDate, NativeDate);
        }())
    };

    function mirrorDateProperties(target, source) {
        if (source.now) {
            target.now = function now() {
                return target.clock.now;
            };
        } else {
            delete target.now;
        }

        if (source.toSource) {
            target.toSource = function toSource() {
                return source.toSource();
            };
        } else {
            delete target.toSource;
        }

        target.toString = function toString() {
            return source.toString();
        };

        target.prototype = source.prototype;
        target.parse = source.parse;
        target.UTC = source.UTC;
        target.prototype.toUTCString = source.prototype.toUTCString;

        for (var prop in source) {
            if (source.hasOwnProperty(prop)) {
                target[prop] = source[prop];
            }
        }

        return target;
    }

    var methods = ["Date", "setTimeout", "setInterval",
                   "clearTimeout", "clearInterval"];

    if (typeof global.setImmediate !== "undefined") {
        methods.push("setImmediate");
    }

    if (typeof global.clearImmediate !== "undefined") {
        methods.push("clearImmediate");
    }

    function restore() {
        var method;

        for (var i = 0, l = this.methods.length; i < l; i++) {
            method = this.methods[i];

            if (global[method].hadOwnProperty) {
                global[method] = this["_" + method];
            } else {
                try {
                    delete global[method];
                } catch (e) {}
            }
        }

        // Prevent multiple executions which will completely remove these props
        this.methods = [];
    }

    function stubGlobal(method, clock) {
        clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(global, method);
        clock["_" + method] = global[method];

        if (method == "Date") {
            var date = mirrorDateProperties(clock[method], global[method]);
            global[method] = date;
        } else {
            global[method] = function () {
                return clock[method].apply(clock, arguments);
            };

            for (var prop in clock[method]) {
                if (clock[method].hasOwnProperty(prop)) {
                    global[method][prop] = clock[method][prop];
                }
            }
        }

        global[method].clock = clock;
    }

    sinon.useFakeTimers = function useFakeTimers(now) {
        var clock = sinon.clock.create(now);
        clock.restore = restore;
        clock.methods = Array.prototype.slice.call(arguments,
                                                   typeof now == "number" ? 1 : 0);

        if (clock.methods.length === 0) {
            clock.methods = methods;
        }

        for (var i = 0, l = clock.methods.length; i < l; i++) {
            stubGlobal(clock.methods[i], clock);
        }

        return clock;
    };
}(typeof global != "undefined" && typeof global !== "function" ? global : this));

sinon.timers = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setImmediate: (typeof setImmediate !== "undefined" ? setImmediate : undefined),
    clearImmediate: (typeof clearImmediate !== "undefined" ? clearImmediate: undefined),
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = sinon;
}
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],35:[function(require,module,exports){
(function (global){((typeof define === "function" && define.amd && function (m) {
    define("formatio", ["samsam"], m);
}) || (typeof module === "object" && function (m) {
    module.exports = m(require("samsam"));
}) || function (m) { this.formatio = m(this.samsam); }
)(function (samsam) {
    "use strict";

    var formatio = {
        excludeConstructors: ["Object", /^.$/],
        quoteStrings: true
    };

    var hasOwn = Object.prototype.hasOwnProperty;

    var specialObjects = [];
    if (typeof global !== "undefined") {
        specialObjects.push({ object: global, value: "[object global]" });
    }
    if (typeof document !== "undefined") {
        specialObjects.push({
            object: document,
            value: "[object HTMLDocument]"
        });
    }
    if (typeof window !== "undefined") {
        specialObjects.push({ object: window, value: "[object Window]" });
    }

    function functionName(func) {
        if (!func) { return ""; }
        if (func.displayName) { return func.displayName; }
        if (func.name) { return func.name; }
        var matches = func.toString().match(/function\s+([^\(]+)/m);
        return (matches && matches[1]) || "";
    }

    function constructorName(f, object) {
        var name = functionName(object && object.constructor);
        var excludes = f.excludeConstructors ||
                formatio.excludeConstructors || [];

        var i, l;
        for (i = 0, l = excludes.length; i < l; ++i) {
            if (typeof excludes[i] === "string" && excludes[i] === name) {
                return "";
            } else if (excludes[i].test && excludes[i].test(name)) {
                return "";
            }
        }

        return name;
    }

    function isCircular(object, objects) {
        if (typeof object !== "object") { return false; }
        var i, l;
        for (i = 0, l = objects.length; i < l; ++i) {
            if (objects[i] === object) { return true; }
        }
        return false;
    }

    function ascii(f, object, processed, indent) {
        if (typeof object === "string") {
            var qs = f.quoteStrings;
            var quote = typeof qs !== "boolean" || qs;
            return processed || quote ? '"' + object + '"' : object;
        }

        if (typeof object === "function" && !(object instanceof RegExp)) {
            return ascii.func(object);
        }

        processed = processed || [];

        if (isCircular(object, processed)) { return "[Circular]"; }

        if (Object.prototype.toString.call(object) === "[object Array]") {
            return ascii.array.call(f, object, processed);
        }

        if (!object) { return String((1/object) === -Infinity ? "-0" : object); }
        if (samsam.isElement(object)) { return ascii.element(object); }

        if (typeof object.toString === "function" &&
                object.toString !== Object.prototype.toString) {
            return object.toString();
        }

        var i, l;
        for (i = 0, l = specialObjects.length; i < l; i++) {
            if (object === specialObjects[i].object) {
                return specialObjects[i].value;
            }
        }

        return ascii.object.call(f, object, processed, indent);
    }

    ascii.func = function (func) {
        return "function " + functionName(func) + "() {}";
    };

    ascii.array = function (array, processed) {
        processed = processed || [];
        processed.push(array);
        var i, l, pieces = [];
        for (i = 0, l = array.length; i < l; ++i) {
            pieces.push(ascii(this, array[i], processed));
        }
        return "[" + pieces.join(", ") + "]";
    };

    ascii.object = function (object, processed, indent) {
        processed = processed || [];
        processed.push(object);
        indent = indent || 0;
        var pieces = [], properties = samsam.keys(object).sort();
        var length = 3;
        var prop, str, obj, i, l;

        for (i = 0, l = properties.length; i < l; ++i) {
            prop = properties[i];
            obj = object[prop];

            if (isCircular(obj, processed)) {
                str = "[Circular]";
            } else {
                str = ascii(this, obj, processed, indent + 2);
            }

            str = (/\s/.test(prop) ? '"' + prop + '"' : prop) + ": " + str;
            length += str.length;
            pieces.push(str);
        }

        var cons = constructorName(this, object);
        var prefix = cons ? "[" + cons + "] " : "";
        var is = "";
        for (i = 0, l = indent; i < l; ++i) { is += " "; }

        if (length + indent > 80) {
            return prefix + "{\n  " + is + pieces.join(",\n  " + is) + "\n" +
                is + "}";
        }
        return prefix + "{ " + pieces.join(", ") + " }";
    };

    ascii.element = function (element) {
        var tagName = element.tagName.toLowerCase();
        var attrs = element.attributes, attr, pairs = [], attrName, i, l, val;

        for (i = 0, l = attrs.length; i < l; ++i) {
            attr = attrs.item(i);
            attrName = attr.nodeName.toLowerCase().replace("html:", "");
            val = attr.nodeValue;
            if (attrName !== "contenteditable" || val !== "inherit") {
                if (!!val) { pairs.push(attrName + "=\"" + val + "\""); }
            }
        }

        var formatted = "<" + tagName + (pairs.length > 0 ? " " : "");
        var content = element.innerHTML;

        if (content.length > 20) {
            content = content.substr(0, 20) + "[...]";
        }

        var res = formatted + pairs.join(" ") + ">" + content +
                "</" + tagName + ">";

        return res.replace(/ contentEditable="inherit"/, "");
    };

    function Formatio(options) {
        for (var opt in options) {
            this[opt] = options[opt];
        }
    }

    Formatio.prototype = {
        functionName: functionName,

        configure: function (options) {
            return new Formatio(options);
        },

        constructorName: function (object) {
            return constructorName(this, object);
        },

        ascii: function (object, processed, indent) {
            return ascii(this, object, processed, indent);
        }
    };

    return Formatio.prototype;
});
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"samsam":36}],36:[function(require,module,exports){
((typeof define === "function" && define.amd && function (m) { define("samsam", m); }) ||
 (typeof module === "object" &&
      function (m) { module.exports = m(); }) || // Node
 function (m) { this.samsam = m(); } // Browser globals
)(function () {
    var o = Object.prototype;
    var div = typeof document !== "undefined" && document.createElement("div");

    function isNaN(value) {
        // Unlike global isNaN, this avoids type coercion
        // typeof check avoids IE host object issues, hat tip to
        // lodash
        var val = value; // JsLint thinks value !== value is "weird"
        return typeof value === "number" && value !== val;
    }

    function getClass(value) {
        // Returns the internal [[Class]] by calling Object.prototype.toString
        // with the provided value as this. Return value is a string, naming the
        // internal class, e.g. "Array"
        return o.toString.call(value).split(/[ \]]/)[1];
    }

    /**
     * @name samsam.isArguments
     * @param Object object
     *
     * Returns ``true`` if ``object`` is an ``arguments`` object,
     * ``false`` otherwise.
     */
    function isArguments(object) {
        if (typeof object !== "object" || typeof object.length !== "number" ||
                getClass(object) === "Array") {
            return false;
        }
        if (typeof object.callee == "function") { return true; }
        try {
            object[object.length] = 6;
            delete object[object.length];
        } catch (e) {
            return true;
        }
        return false;
    }

    /**
     * @name samsam.isElement
     * @param Object object
     *
     * Returns ``true`` if ``object`` is a DOM element node. Unlike
     * Underscore.js/lodash, this function will return ``false`` if ``object``
     * is an *element-like* object, i.e. a regular object with a ``nodeType``
     * property that holds the value ``1``.
     */
    function isElement(object) {
        if (!object || object.nodeType !== 1 || !div) { return false; }
        try {
            object.appendChild(div);
            object.removeChild(div);
        } catch (e) {
            return false;
        }
        return true;
    }

    /**
     * @name samsam.keys
     * @param Object object
     *
     * Return an array of own property names.
     */
    function keys(object) {
        var ks = [], prop;
        for (prop in object) {
            if (o.hasOwnProperty.call(object, prop)) { ks.push(prop); }
        }
        return ks;
    }

    /**
     * @name samsam.isDate
     * @param Object value
     *
     * Returns true if the object is a ``Date``, or *date-like*. Duck typing
     * of date objects work by checking that the object has a ``getTime``
     * function whose return value equals the return value from the object's
     * ``valueOf``.
     */
    function isDate(value) {
        return typeof value.getTime == "function" &&
            value.getTime() == value.valueOf();
    }

    /**
     * @name samsam.isNegZero
     * @param Object value
     *
     * Returns ``true`` if ``value`` is ``-0``.
     */
    function isNegZero(value) {
        return value === 0 && 1 / value === -Infinity;
    }

    /**
     * @name samsam.equal
     * @param Object obj1
     * @param Object obj2
     *
     * Returns ``true`` if two objects are strictly equal. Compared to
     * ``===`` there are two exceptions:
     *
     *   - NaN is considered equal to NaN
     *   - -0 and +0 are not considered equal
     */
    function identical(obj1, obj2) {
        if (obj1 === obj2 || (isNaN(obj1) && isNaN(obj2))) {
            return obj1 !== 0 || isNegZero(obj1) === isNegZero(obj2);
        }
    }


    /**
     * @name samsam.deepEqual
     * @param Object obj1
     * @param Object obj2
     *
     * Deep equal comparison. Two values are "deep equal" if:
     *
     *   - They are equal, according to samsam.identical
     *   - They are both date objects representing the same time
     *   - They are both arrays containing elements that are all deepEqual
     *   - They are objects with the same set of properties, and each property
     *     in ``obj1`` is deepEqual to the corresponding property in ``obj2``
     *
     * Supports cyclic objects.
     */
    function deepEqualCyclic(obj1, obj2) {

        // used for cyclic comparison
        // contain already visited objects
        var objects1 = [],
            objects2 = [],
        // contain pathes (position in the object structure)
        // of the already visited objects
        // indexes same as in objects arrays
            paths1 = [],
            paths2 = [],
        // contains combinations of already compared objects
        // in the manner: { "$1['ref']$2['ref']": true }
            compared = {};

        /**
         * used to check, if the value of a property is an object
         * (cyclic logic is only needed for objects)
         * only needed for cyclic logic
         */
        function isObject(value) {

            if (typeof value === 'object' && value !== null &&
                    !(value instanceof Boolean) &&
                    !(value instanceof Date)    &&
                    !(value instanceof Number)  &&
                    !(value instanceof RegExp)  &&
                    !(value instanceof String)) {

                return true;
            }

            return false;
        }

        /**
         * returns the index of the given object in the
         * given objects array, -1 if not contained
         * only needed for cyclic logic
         */
        function getIndex(objects, obj) {

            var i;
            for (i = 0; i < objects.length; i++) {
                if (objects[i] === obj) {
                    return i;
                }
            }

            return -1;
        }

        // does the recursion for the deep equal check
        return (function deepEqual(obj1, obj2, path1, path2) {
            var type1 = typeof obj1;
            var type2 = typeof obj2;

            // == null also matches undefined
            if (obj1 === obj2 ||
                    isNaN(obj1) || isNaN(obj2) ||
                    obj1 == null || obj2 == null ||
                    type1 !== "object" || type2 !== "object") {

                return identical(obj1, obj2);
            }

            // Elements are only equal if identical(expected, actual)
            if (isElement(obj1) || isElement(obj2)) { return false; }

            var isDate1 = isDate(obj1), isDate2 = isDate(obj2);
            if (isDate1 || isDate2) {
                if (!isDate1 || !isDate2 || obj1.getTime() !== obj2.getTime()) {
                    return false;
                }
            }

            if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
                if (obj1.toString() !== obj2.toString()) { return false; }
            }

            var class1 = getClass(obj1);
            var class2 = getClass(obj2);
            var keys1 = keys(obj1);
            var keys2 = keys(obj2);

            if (isArguments(obj1) || isArguments(obj2)) {
                if (obj1.length !== obj2.length) { return false; }
            } else {
                if (type1 !== type2 || class1 !== class2 ||
                        keys1.length !== keys2.length) {
                    return false;
                }
            }

            var key, i, l,
                // following vars are used for the cyclic logic
                value1, value2,
                isObject1, isObject2,
                index1, index2,
                newPath1, newPath2;

            for (i = 0, l = keys1.length; i < l; i++) {
                key = keys1[i];
                if (!o.hasOwnProperty.call(obj2, key)) {
                    return false;
                }

                // Start of the cyclic logic

                value1 = obj1[key];
                value2 = obj2[key];

                isObject1 = isObject(value1);
                isObject2 = isObject(value2);

                // determine, if the objects were already visited
                // (it's faster to check for isObject first, than to
                // get -1 from getIndex for non objects)
                index1 = isObject1 ? getIndex(objects1, value1) : -1;
                index2 = isObject2 ? getIndex(objects2, value2) : -1;

                // determine the new pathes of the objects
                // - for non cyclic objects the current path will be extended
                //   by current property name
                // - for cyclic objects the stored path is taken
                newPath1 = index1 !== -1
                    ? paths1[index1]
                    : path1 + '[' + JSON.stringify(key) + ']';
                newPath2 = index2 !== -1
                    ? paths2[index2]
                    : path2 + '[' + JSON.stringify(key) + ']';

                // stop recursion if current objects are already compared
                if (compared[newPath1 + newPath2]) {
                    return true;
                }

                // remember the current objects and their pathes
                if (index1 === -1 && isObject1) {
                    objects1.push(value1);
                    paths1.push(newPath1);
                }
                if (index2 === -1 && isObject2) {
                    objects2.push(value2);
                    paths2.push(newPath2);
                }

                // remember that the current objects are already compared
                if (isObject1 && isObject2) {
                    compared[newPath1 + newPath2] = true;
                }

                // End of cyclic logic

                // neither value1 nor value2 is a cycle
                // continue with next level
                if (!deepEqual(value1, value2, newPath1, newPath2)) {
                    return false;
                }
            }

            return true;

        }(obj1, obj2, '$1', '$2'));
    }

    var match;

    function arrayContains(array, subset) {
        if (subset.length === 0) { return true; }
        var i, l, j, k;
        for (i = 0, l = array.length; i < l; ++i) {
            if (match(array[i], subset[0])) {
                for (j = 0, k = subset.length; j < k; ++j) {
                    if (!match(array[i + j], subset[j])) { return false; }
                }
                return true;
            }
        }
        return false;
    }

    /**
     * @name samsam.match
     * @param Object object
     * @param Object matcher
     *
     * Compare arbitrary value ``object`` with matcher.
     */
    match = function match(object, matcher) {
        if (matcher && typeof matcher.test === "function") {
            return matcher.test(object);
        }

        if (typeof matcher === "function") {
            return matcher(object) === true;
        }

        if (typeof matcher === "string") {
            matcher = matcher.toLowerCase();
            var notNull = typeof object === "string" || !!object;
            return notNull &&
                (String(object)).toLowerCase().indexOf(matcher) >= 0;
        }

        if (typeof matcher === "number") {
            return matcher === object;
        }

        if (typeof matcher === "boolean") {
            return matcher === object;
        }

        if (getClass(object) === "Array" && getClass(matcher) === "Array") {
            return arrayContains(object, matcher);
        }

        if (matcher && typeof matcher === "object") {
            var prop;
            for (prop in matcher) {
                if (!match(object[prop], matcher[prop])) {
                    return false;
                }
            }
            return true;
        }

        throw new Error("Matcher was not a string, a number, a " +
                        "function, a boolean or an object");
    };

    return {
        isArguments: isArguments,
        isElement: isElement,
        isDate: isDate,
        isNegZero: isNegZero,
        identical: identical,
        deepEqual: deepEqualCyclic,
        match: match,
        keys: keys
    };
});

},{}],37:[function(require,module,exports){
//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}],38:[function(require,module,exports){
(function (global){(function(root) {
    var unopinionate = {
        selector: root.jQuery || root.Zepto || root.ender || root.$,
        template: root.Handlebars || root.Mustache
    };

    /*** Export ***/

    //AMD
    if(typeof define === 'function' && define.amd) {
        define([], function() {
            return unopinionate;
        });
    }
    //CommonJS
    else if(typeof module.exports !== 'undefined') {
        module.exports = unopinionate;
    }
    //Global
    else {
        root.unopinionate = unopinionate;
    }
})(typeof window != 'undefined' ? window : global);
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],39:[function(require,module,exports){
var _   = require('underscore'),
    log = require('loglevel'),
    noop = function() {};

var View = function() {};

View.prototype = {
    isView: true,

    /*** Default Attributes (should be overwritten) ***/
    tagName:    "div",
    className:  "",

    //listeners
    //'[direction]:[event name]:[from type], ...': function(eventArguments*) {}
    listeners: {},

    //State
    defaultState: {},

    /* Templating */
    template:   "",

    //Data goes into the templates and may also be a function that returns an object
    data:       {},

    //Subviews are a set of subviews that will be fed into the templating engine
    subviews:   {},

    reRender:   false, //Determines if subview is re-rendered every time it is spawned

    /* Callbacks */
    preRender:  noop,
    postRender: noop,

    /*** Initialization Functions (should be configured but will be manipulated when defining the subview) ***/
    once: function(config) { //Runs after render
        for(var i=0; i<this.onceFunctions.length; i++) {
            this.onceFunctions[i].apply(this, [config]);
        }
        return this;
    }, 
    onceFunctions: [],
    init: function(config) { //Runs after render
        for(var i=0; i<this.initFunctions.length; i++) {
            this.initFunctions[i].apply(this, [config]);
        }
        return this;
    }, 
    initFunctions: [],
    clean: function() { //Runs on remove
        for(var i=0; i<this.cleanFunctions.length; i++) {
            this.cleanFunctions[i].apply(this, []);
        }
        return this;
    }, 
    cleanFunctions: [],

    /*** Rendering ***/
    render: function() {
        var self = this,
            html = '';
            postLoad = false;

        this.preRender();

        //No Templating Engine
        if(typeof this.template == 'string') {
            html = this.template;
        }
        else {
            var data = typeof this.data == 'function' ? this.data() : this.data;
            
            //Define the subview variable
            data.subview = {};
            $.each(this.subviews, function(name, subview) {
                postLoad = true;
                data.subview[name] = "<script class='post-load-view' type='text/html' data-name='"+name+"'></script>";
            });

            //Run the templating engine
            if(_.isFunction(this.template)) {
                //EJS
                if(typeof this.template.render == 'function') {
                    html = this.template.render(data);
                }
                //Handlebars & Underscore & Jade
                else {
                    html = this.template(data);
                }
            }
            else {
                log.error("Templating engine not recognized.");
            }
        }

        this.html(html);

        //Post Load Views
        if(postLoad) {
            this.$wrapper.find('.post-load-view').each(function() {
                var $this = $(this),
                    view  = self.subviews[$this.attr('data-name')];

                if(view.isViewPool) {
                    view = view.spawn();
                }

                $this
                    .after(view.$wrapper)
                    .remove();
            });
        }

        this.postRender();

        return this;
    },
    html: function(html) {
        //Remove & clean subviews in the wrapper 
        this.$('.'+this._subviewCssClass).each(function() {
            subview(this).remove();
        });

        this.wrapper.innerHTML = html;

        return this;
    },
    remove: function() {
        if(this._active) {
            //Detach
            var parent = this.wrapper.parentNode;
            if(parent) {
                parent.removeChild(this.wrapper);
            }

            //Clean
            this.clean();

            this.pool._release(this);
        }

        return this;
    },
    $: function(selector) {
        return this.$wrapper.find(selector);
    },

    /*** Traversing ***/
    traverse: function(jqFunc, type) {
        var $el = this.$wrapper[jqFunc]('.' + (type ? this._subviewCssClass + '-' + type : 'subview'));
        
        if($el && $el.length > 0) {
            return $el[0][subview._domPropertyName];
        }
        else {
            return null;
        }
    },
    parent: function(type) {
        return this.traverse('closest', type);
    },
    next: function(type) {
        return this.traverse('next', type);
    },
    prev: function(type) {
        return this.traverse('prev', type);
    },
    children: function(type) {
        return this.traverse('find', type);
    },
    appendTo: function($el) {
        this.$wrapper.appendTo($el);
        return this;
    },
    
    /*** Event API ***/
    trigger: function(name, args) {
        var self = this;
        args = args || [];

        //Broadcast in all directions
        var directions = {
            up:     'find',
            down:   'parents',
            across: 'siblings',
            all:    null,
            self:   this.$wrapper
        };

        _.find(directions, function(jqFunc, direction) {
            var selector = '.listener-'+direction+'-'+name;
            selector = selector + ', ' + selector+'-'+self.type;

            //Select $wrappers with the right listener class in the right direction
            var $els = jqFunc ? 
                            jqFunc.jquery ? jqFunc :
                                self.$wrapper[jqFunc](selector) : $(selector);

            for(var i=0; i<$els.length; i++) {
                //Get the actual subview
                var recipient = subview($els[i]);

                //Check for a subview type specific callback
                var typedCallback = recipient.listeners[direction + ":" + name + ":" + self.type];
                if(typedCallback && typedCallback.apply(recipient, args) === false) {
                    return true; //Breaks if callback returns false
                }

                //Check for a general event callback
                var untypedCallback = recipient.listeners[direction + ":" + name];
                if(untypedCallback && untypedCallback.apply(recipient, args) === false) {
                    return true; //Breaks if callback returns false
                }
            }
        });
        
        return this;
    },
    _bindListeners: function() {
        var self = this;

        $.each(this.listeners, function(events, callback) {

            //Parse the event format "[view type]:[event name], [view type]:[event name]"

            events = events.split(',');
            var i = events.length;

            while(i--) {
                var event       = events[i].replace(/ /g, ''),
                    eventParts  = event.split(':');
                
                var direction = eventParts[0],
                    name      = eventParts[1],
                    viewType  = eventParts[2] || null;
                
                //Add the listener class
                if(direction != 'self') {
                    self.$wrapper.addClass('listener-' + direction + '-' + name + (viewType ? '-' + viewType : ''));
                }

                //Fix the listeners callback
                self.listeners[event] = callback;
            }
        });

        return this;
    },

    /*** Classes ***/
    _active: false,
    _subviewCssClass: 'subview',
    _addDefaultClasses: function() {
        var classes = [];

        classes.push(this._subviewCssClass + '-' + this.type);

        var superClass = this.super;
        while(true) {
            if(superClass.type) {
                classes.push(this._subviewCssClass + '-' + superClass.type);
                superClass = superClass.super;
            }
            else {
                break;
            }
        }

        //Add Default View Class
        classes.push(this._subviewCssClass);

        //Add classes to the DOM
        this.$wrapper.addClass(classes.join(' '));

        return this;
    },

    /*** Extensions ***/
    _loadExtensions: function() {
        var self = this;
        $.each(this, function(name, prop) {
            if(prop._isSubviewExtension) {
                self[name] = prop(self);
            }
        });
        return this;
    }
};

module.exports = View;


},{"loglevel":21,"underscore":37}],40:[function(require,module,exports){
var $ = require("unopinionate").selector;

var ViewPool = function(View) {
    //Configuration
    this.View   = View;
    this.type   = View.prototype.type;
    this.super  = View.prototype.super;
    
    //View Configuration
    this.View.prototype.pool = this;

    //Pool
    this.pool = [];
};

ViewPool.prototype = {
    isViewPool: true,
    spawn: function(el, config) {
        //jQuery normalization
        var $el = el ? (el.jquery ? el : $(el)): null;
        el = el && el.jquery ? el[0] : el;

        //Argument surgery
        if(el && el.view) {
            return el.view;
        }
        else {
            var view;
            config = config || ($.isPlainObject(el) ? el : undefined);
            
            //Get the DOM node
            if(!el || !el.nodeType) {
                if(this.pool.length !== 0) {
                    view = this.pool.pop();
                }
                else {
                    el = document.createElement(this.View.prototype.tagName);
                    $el = $(el);
                }
            }

            var isNewView;
            if(!view) {
                isNewView   = true;
                view        = new this.View();

                //Bind to/from the element
                el[subview._domPropertyName] = view;
                view.wrapper  = el;
                view.$wrapper = $el;

                view._addDefaultClasses();
                view._bindListeners();
                view._loadExtensions();

                view.once();
            }
            
            //Make the view active
            view._active = true;

            //Render
            if(isNewView || view.reRender) {
                view.render();
            }

            //Initialize
            view.init(config);

            return view;
        }
    },
    extend: function(name, config) {
        return subview(name, this, config);
    },
    destroy: function() {
        this.pool = null;
        delete subview.views[this.type];
    },

    _release: function(view) {
        view._active = false;
        this.pool.push(view);
        return this;
    }
};

module.exports = ViewPool;

},{"unopinionate":38}],41:[function(require,module,exports){
var _               = require("underscore"),
    log             = require("loglevel"),
    $               = require("unopinionate").selector,
    ViewPool        = require("./ViewPool"),
    ViewTemplate    = require("./View"),
    noop            = function() {},
    viewTypeRegex   = new RegExp('^' + ViewTemplate.prototype._subviewCssClass + '-');

var subview = function(name, protoViewPool, config) {
    var ViewPrototype;

    if(!name) {
        return null;
    }
    //Return View object from DOM element
    else if(name.nodeType || name.jquery) {
        return (name.jquery ? name[0] : name)[subview._domPropertyName] || null;
    }
    //Define a subview
    else {
        //Argument surgery
        if(protoViewPool && protoViewPool.isViewPool) {
            ViewPrototype = protoViewPool.View;
        }
        else {
            config          = protoViewPool;
            ViewPrototype   = ViewTemplate;
        }

        config = config || {};

        //Validate Name && Configuration
        if(subview._validateName(name) && subview._validateConfig(config)) {
            //Create the new View
            var View        = function() {},
                superClass  = new ViewPrototype();

            //Extend the existing init, config & clean functions rather than overwriting them
            _.each(['once', 'init', 'clean'], function(name) {
                config[name+'Functions'] = superClass[name+'Functions'].slice(0); //Clone superClass init
                if(config[name]) {
                    config[name+'Functions'].push(config[name]);
                    delete config[name];
                }
            });

            //Extend the listeners object
            if(config.listeners) {
                $.each(superClass.listeners, function(event, callback) {
                    if(config.listeners[event]) {
                        //Extend the function
                        config.listeners[event] = (function(oldCallback, newCallback) {
                            return function() {
                                if(oldCallback.apply(this, arguments) === false) {
                                    return false;
                                }
                                
                                return newCallback.apply(this, arguments);
                            };
                        })(config.listeners[event], callback);
                    }
                    else {
                        config.listeners[event] = callback;
                    }
                });
            }

            //Build The new view
            View.prototype       = _.extend(superClass, config);
            View.prototype.type  = name;
            View.prototype.super = ViewPrototype.prototype;
            
            //Save the New View
            var viewPool        = new ViewPool(View);
            subview.views[name] = viewPool;

            return viewPool;
        }
        else {
            return null;
        }
    }
};

subview.views = {};

//Obscure DOM property name for subview wrappers
subview._domPropertyName = "subview12345";

/*** API ***/
subview.load = function(scope) {
    var $scope = scope ? $(scope) : $('body'),
        $views = $scope.find("[class^='subview-']"),
        finder = function(c) {
            return c.match(viewTypeRegex);
        };

    for(var i=0; i<$views.length; i++) {
        var el = $views[i],
            classes = el.className.split(/\s+/);

        type =  _.find(classes, finder).replace(viewTypeRegex, '');

        if(type && this.views[type]) {
            this.views[type].spawn($views[i]);
        }
        else {
            log.error("subview '"+type+"' is not defined.");
        }
    }

    return this;
};

subview.lookup = function(name) {
    if(typeof name == 'string') {
        return this.views[name];
    }
    else {
        if(name.isViewPool) {
            return name;
        }
        else if(name.isView) {
            return name.pool;
        }
        else {
            return undefined;
        }
    }
};

subview._validateName = function(name) {
    if(!name.match(/^[a-zA-Z0-9\-_]+$/)) {
        log.error("subview name '" + name + "' is not alphanumeric.");
        return false;
    }

    if(subview.views[name]) {
        log.error("subview '" + name + "' is already defined.");
        return false;
    }

    return true;
};

subview._reservedMethods = [
    'html',
    'remove',
    'parent',
    'children',
    'next',
    'prev',
    'trigger',
    'traverse',
    '$',
    '_bindListeners',
    '_active',
    '_subviewCssClass',
    '_addDefaultClasses'
];

subview._validateConfig = function(config) {
    var success = true;

    $.each(config, function(name, value) {
        if(subview._reservedMethods.indexOf(name) != -1) {
            log.error("Method '"+name+"' is reserved as part of the subview API.");
            success = false;
        }
    });

    return success;
};

subview.init = function() {
    var Main = subview.lookup('main');

    if(Main) {
        subview.main = Main.spawn();
        subview.main.$wrapper.appendTo('body');
    }
};

/*** Extensions ***/
subview.extension = function(extensionConfig) {
    //The Actual Extension Definition
    var Extension = function(userConfig, view) {
        this.view   = view;
        this.config = userConfig;
    };

    Extension.prototype = extensionConfig;

    if(!Extension.prototype.init) Extension.prototype.init = noop;

    // This function gets called by the user to pass in their configuration
    return function(userConfig) {

        // This function is called in view._loadExtensions
        var ExtensionFactory = function(view) {
            var extension = new Extension(userConfig, view);

            //Initialize the extension
            extension.init.apply(extension, [userConfig, view]);

            return extension;
        };

        ExtensionFactory._isSubviewExtension = true;

        return ExtensionFactory;
    };
};

/*** Export ***/
window.subview = module.exports = subview;

$(function() {
    if(!subview.noInit) {
        subview.init();
    }
});

},{"./View":39,"./ViewPool":40,"loglevel":21,"underscore":37,"unopinionate":38}],42:[function(require,module,exports){
var sinon   = require('sinon'),
    _       = require('underscore'),
    $       = require("unopinionate").selector,
    module  = window.module,
    subview = require('../src/main'),
    noop    = function() {},
    Handlebars = require("handlebars"),
    sandbox;

var testSubview = subview('test');

/*** subview Object ***/

module("subview");

test('subview() get view from node', function() {
    deepEqual(subview($('body')[0]), null, 'Element without bound view');
    deepEqual(subview($('body')), null, 'Jquery objects work');

    var tester = testSubview.spawn();
    deepEqual(subview(tester.wrapper), tester, 'Returns correct element');
});

test('subview() define subview', function() {
    ok(!subview('test'), "Invalid subview definition");

    var tester = subview('tester');
    ok(tester, "Subview successfully created");
    deepEqual(tester, subview.views.tester, "Subview successfully registered");

    ok(tester.super, "Super is bound to the view");

    var subTester = subview('subtester', tester);
    equal(subTester.super.type, "tester", "SubTester extends tester");

    //cleanup
    tester.destroy();
    subTester.destroy();
});

test('#load', function() {
    var $tester = $("<div class='subview-test'>").appendTo('body');
    subview.load();
    ok(subview($tester), "View was successfully created");

    var $tester2 = $("<div class='subview-test'>").appendTo('body');
    subview.load('body');
    ok(subview($tester2), "Scoped loading was successful");
});

test('#lookup', function() {
    var Tester = subview('tester');

    deepEqual(subview.lookup('tester'), Tester, "String lookup");
    deepEqual(subview.lookup(Tester), Tester, "ViewPool lookup");

    var tester = Tester.spawn();
    deepEqual(subview.lookup(tester), Tester, "view lookup");

    deepEqual(subview.lookup({}), undefined, "random lookup");
    deepEqual(subview.lookup("does-not-exist"), undefined, "Undefined string lookup");

    Tester.destroy();
});

test('#_validateName', function() {
    ok(subview._validateName("Foo1"), "Base Case");
    ok(!subview._validateName("Foo%"), "Invalid characters");
    ok(!subview._validateName("test"), "Pre-existing view");
});

test('#_validateConfig', function() {
    ok(subview._validateConfig({
        init: noop
    }), "Valid Config");

    ok(!subview._validateConfig({
        init: noop,
        remove: noop
    }), "Reserved Method present");
});

test('#init', function() {
    subview('main');
    subview.init();
    ok($('.subview-main').length, "The main view is added to the document");
});

test('#extension', function() {
    var Extension = subview.extension({
        foo: noop
    });

    var ExtensionFactory = Extension('config');
    ok($.isFunction(ExtensionFactory), "Extension Factory Created");

    ok(ExtensionFactory._isSubviewExtension, "Has extension identifier attribute");

    var extension = ExtensionFactory('view');
    ok(extension, "Extension initialized.");
    ok($.isFunction(extension.foo), "Extension has method foo");
    equal(extension.view, 'view', "View is bound to the extension");
    equal(extension.config, 'config', "Config is bound to the extension");
});

/*** ViewPool ***/
var viewPool;
module("ViewPool", {
    setup: function() {
        sandbox = sinon.sandbox.create();
        viewPool = subview("tester");
    },
    teardown: function() {
        viewPool.destroy();
    }
});

test("#isViewPool", function() {
    ok(viewPool.isViewPool);
});

test("#spawn", function() {
    var view = viewPool.spawn();
    ok(view, "View created");

    var $div = $("<div>");
    view = viewPool.spawn($div[0]);
    deepEqual(view.wrapper, $div[0], "Elements passed to spawn become the wrapper");

    $div = $("<div>");
    view = viewPool.spawn($div);
    deepEqual(view.wrapper, $div[0], "jQuery elements passed to spawn become the wrapper");

    var sameView = viewPool.spawn($div);
    deepEqual(view, sameView, "Returns existing view when the same element is passed back");

    //Test that configuration gets passed to init function
    var initSpy   = sinon.spy(),
        config    = {test: 1},
        pool      = subview("anotherPool", {
            init: initSpy
        });


    pool.spawn($("<div>"), config);
    ok(initSpy.calledWith(config), "Config with jquery works");
    initSpy.reset();

    pool.spawn($("<div>")[0], config);
    ok(initSpy.calledWith(config), "Config with DOM works");
    initSpy.reset();

    pool.spawn(config);
    ok(initSpy.calledWith(config), "Config with no element works");

    pool.destroy();

});

test("#extend", function() {
    var subTester = viewPool.extend('subTester');
    equal(subTester.super.type, "tester", "SubTester extends tester");
    subTester.destroy();
});

test("#destroy", function() {
    viewPool.destroy();
    ok(subview("tester"), "Namespace is freed");
    ok(!viewPool.pool, "Pool is set to null to free RAM");
});

test("#_release", function() {
    var view = viewPool.spawn();
    deepEqual(viewPool.pool.length, 0, "Pool is empty");

    viewPool._release(view);
    deepEqual(viewPool.pool.length, 1, "Pool has one view in it");
});


/*** View ***/
module("View", {
    setup: function() {
        sandbox = sinon.sandbox.create();
    }
});

test("Initialization Process", function() {
    var onceSpy     = sinon.spy(),
        renderSpy   = sinon.spy(),
        initSpy     = sinon.spy();

    var viewPool = subview("tester", {
        once:   onceSpy,
        init:   initSpy,
        render: renderSpy
    });

    viewPool.spawn();

    ok(onceSpy.called, "once called");
    ok(renderSpy.called, "render called");
    ok(initSpy.called, "init called");

    ok(onceSpy.calledBefore(renderSpy), "config fires before render");
    ok(renderSpy.calledBefore(initSpy), "render fires before init");

    viewPool.destroy();
});

test("#html", function() {
    var Subtest = subview("subtest"),
        subtest = Subtest.spawn();

    var Tester = subview("tester", {
            template: Handlebars.compile("{{{ subview.subtest }}}"),
            subviews: {
                subtest: subtest
            }
        }),
        tester = Tester.spawn();

    ok(subtest._active, "Subtest is active");

    tester.html('Hello There');

    ok(!subtest._active, "Subtest is inactive");
    equal(tester.$wrapper.html(), 'Hello There', "Html is set");

    Subtest.destroy();
    Tester.destroy();
});

test("#remove", function() {
    var clean = sinon.spy(),
        Test = subview("tester", {
            clean: clean
        }),
        test = Test.spawn();

    test.$wrapper.appendTo('body');

    ok($('.subview-tester').length, "view in the page");
    ok(test._active, "view is active");

    test.remove();

    ok(!$('.subview-tester').length, "view removed from page");
    ok(!test._active, "view is inactive");
    ok(clean.called, "The clean function was called");

    Test.destroy();
});

test("#$", function() {
    var test = testSubview.spawn();
    test.$wrapper.appendTo('body');

    test.html("<div class='scoped-jquery-test'></div>");
    $("<div class='scoped-jquery-test'></div>").appendTo('body');

    equal($('.scoped-jquery-test').length, 2, "Two test elements created");
    equal(test.$('.scoped-jquery-test').length, 1, "The one child element is selected");
});

test("#traverse", function() {
    var Subtest = subview("subtest"),
        subtest = Subtest.spawn();

    var Tester = subview("tester", {
            template: Handlebars.compile("{{{ subview.subtest }}}"),
            subviews: {
                subtest: subtest
            }
        }),
        tester = Tester.spawn();

    deepEqual(subtest.traverse('closest', 'tester'), tester, "Works with closest");
    deepEqual(subtest.traverse('closest', 'this-does-not-exist'), null, "does not exist");

    Subtest.destroy();
    Tester.destroy();
});

/*
test("#parent", function() {

});

test("#next", function() {

});

test("#prev", function() {

});

test("#children", function() {

});
*/

test('#appendTo', function() {
    var $div = $("<div>").appendTo('body');

    var view = testSubview.spawn();
    view.appendTo($div);

    deepEqual(subview($div.find('.subview-test')), view, "Subview appended");
});

test('#trigger/#_bindListeners', function() {
    var allEvent1           = sinon.spy(),
        upEvent1            = sinon.spy(),
        upEvent1Scoped      = sinon.spy(),
        upEvent1WrongScope  = sinon.spy(),
        unEvent1NoEvent     = sinon.spy(),
        selfEvent1          = sinon.spy(),
        downEvent2          = sinon.spy(),
        acrossEvent2        = sinon.spy();

    var Subtest = subview("subtest", {
            listeners: {
                "down:noEvent, all:event1": allEvent1,
                "up:event1":                upEvent1,
                "up:event1:tester":         upEvent1Scoped,
                "up:event1:wrongScope":     upEvent1WrongScope,
                "up:noEvent":               unEvent1NoEvent,
                "across:event2":            acrossEvent2
            }
        }),
        subtest  = Subtest.spawn(),
        subtest2 = Subtest.spawn();

    var Tester = subview("tester", {
            template: Handlebars.compile("{{{ subview.subtest }}}{{{ subview.subtest2 }}}"),
            subviews: {
                subtest: subtest,
                subtest2: subtest2
            },
            listeners: {
                "self:event1": selfEvent1,
                "down:event2": downEvent2
            }
        }),
        tester = Tester.spawn();

    tester.$wrapper.appendTo('body');

    //Event 1
    tester.trigger('event1');
    ok(allEvent1.called,            "All Event1 Called");
    ok(upEvent1.called,             "Up Event1 Called");
    ok(upEvent1Scoped.called,       "Scoped Up Event1 Called");
    ok(!upEvent1WrongScope.called,  "Wrong Scope Up Event1 Not Called");
    ok(!unEvent1NoEvent.called,     "Non-triggered event handler not called");
    ok(selfEvent1.called,           "Self Event1 Called");

    //Event 2
    subtest.trigger('event2');
    ok(downEvent2.called,   "Down Event Called");
    ok(acrossEvent2.called, "Across Event Called");

    //Cleanup
    tester.remove();
    Subtest.destroy();
    Tester.destroy();
});

test("#_addDefaultClasses", function() {
    var view = testSubview.spawn();

    view._addDefaultClasses();

    var classes = view.$wrapper[0].className.split(' ');

    ok(classes.indexOf("subview-test") !== -1, "Includes view-test");
    ok(classes.indexOf("subview") !== -1, "Includes view");
});

test("#_loadExtensions", function() {
    var extension = subview.extension({
            foo: 'bar',
            init: function(config, view) {
                ok(this.view, "View object is available");
                equal(this.view, view, "this.view == view argument");
                equal(config.hi, 'there', "hi equals there");
                deepEqual(this.config, config, "this.config == config argument");
            }
        }),
        Tester = subview("tester", {
            extension: extension({
                hi: 'there'
            })
        }),
        tester = Tester.spawn();

    equal(tester.extension.foo, 'bar', "Extension attribute applied");

    Tester.destroy();
});

/*** View Rendering ***/

var setHtml;
module("View #render", {
    setup: function() {
        setHtml = sinon.spy();
    }
});

test("String Template", function() {
    var viewPool = subview("tester", {
        template:   "This is a string"
    });

    var view = viewPool.spawn();

    equal("This is a string", view.$wrapper.html(), "Content matches");

    viewPool.destroy();
});

test("Handlebars Template", function() {
    var viewPool = subview("tester", {
        template: Handlebars.compile("<div class='handlebars-test'>{{ test }}</div>{{{ subview.test }}}"),
        data: {
            test: "Hi"
        },
        subviews: {
            test: testSubview
        }
    });

    var view = viewPool.spawn();

    ok(view.$('.subview-test').length, "subview spawned correctly");

    var $handlebarsTest = view.$('.handlebars-test');
    ok($handlebarsTest.length, "Div element created");
    equal($handlebarsTest.html(), 'Hi', "Div created with correct content");

    viewPool.destroy();
});

test("Underscore Template", function() {
    var viewPool = subview("tester", {
        template: _.template("<div class='underscore-test'><%= test %></div><%= subview.test %>"),
        data: {
            test: "Hi"
        },
        subviews: {
            test: testSubview
        }
    });

    var view = viewPool.spawn();

    ok(view.$('.subview-test').length, "subview spawned correctly");

    var $handlebarsTest = view.$('.underscore-test');
    ok($handlebarsTest.length, "Div element created");
    equal($handlebarsTest.html(), 'Hi', "Div created with correct content");
    
    viewPool.destroy();
});

test("Pre/Post Render", function() {
    var preRender = sinon.spy(),
        postRender = sinon.spy();

    var Tester = subview("tester", {
        preRender: preRender,
        postRender: postRender
    });

    Tester.spawn();

    ok(preRender.called, "preRender called");
    ok(postRender.called, "postRender called");
});


},{"../src/main":41,"handlebars":20,"sinon":22,"underscore":37,"unopinionate":38}]},{},[42])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMucnVudGltZS5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvYmFzZS5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvYXN0LmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9iYXNlLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlci5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvamF2YXNjcmlwdC1jb21waWxlci5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvcGFyc2VyLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci9wcmludGVyLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9jb21waWxlci92aXNpdG9yLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy9leGNlcHRpb24uanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3J1bnRpbWUuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9kaXN0L2Nqcy9oYW5kbGViYXJzL3NhZmUtc3RyaW5nLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvZGlzdC9janMvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9pbmRleC5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9sb2dsZXZlbC9saWIvbG9nbGV2ZWwuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvc2lub24vbGliL3Npbm9uLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi9hc3NlcnQuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvc2lub24vbGliL3Npbm9uL2JlaGF2aW9yLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi9jYWxsLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi9jb2xsZWN0aW9uLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi9tYXRjaC5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vbW9jay5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vc2FuZGJveC5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vc3B5LmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi9zdHViLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi90ZXN0LmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi90ZXN0X2Nhc2UuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvc2lub24vbGliL3Npbm9uL3V0aWwvZmFrZV90aW1lcnMuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvc2lub24vbm9kZV9tb2R1bGVzL2Zvcm1hdGlvL2xpYi9mb3JtYXRpby5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9ub2RlX21vZHVsZXMvZm9ybWF0aW8vbm9kZV9tb2R1bGVzL3NhbXNhbS9saWIvc2Ftc2FtLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3VuZGVyc2NvcmUvdW5kZXJzY29yZS5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy91bm9waW5pb25hdGUvdW5vcGluaW9uYXRlLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvc3JjL1ZpZXcuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9zcmMvVmlld1Bvb2wuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9zcmMvbWFpbi5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L3Rlc3QvdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbitCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNXZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsbnVsbCwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7Ly8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlwidXNlIHN0cmljdFwiO1xuLypnbG9iYWxzIEhhbmRsZWJhcnM6IHRydWUgKi9cbnZhciBIYW5kbGViYXJzID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy5ydW50aW1lXCIpW1wiZGVmYXVsdFwiXTtcblxuLy8gQ29tcGlsZXIgaW1wb3J0c1xudmFyIEFTVCA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvY29tcGlsZXIvYXN0XCIpW1wiZGVmYXVsdFwiXTtcbnZhciBQYXJzZXIgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2NvbXBpbGVyL2Jhc2VcIikucGFyc2VyO1xudmFyIHBhcnNlID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9jb21waWxlci9iYXNlXCIpLnBhcnNlO1xudmFyIENvbXBpbGVyID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlclwiKS5Db21waWxlcjtcbnZhciBjb21waWxlID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9jb21waWxlci9jb21waWxlclwiKS5jb21waWxlO1xudmFyIHByZWNvbXBpbGUgPSByZXF1aXJlKFwiLi9oYW5kbGViYXJzL2NvbXBpbGVyL2NvbXBpbGVyXCIpLnByZWNvbXBpbGU7XG52YXIgSmF2YVNjcmlwdENvbXBpbGVyID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9jb21waWxlci9qYXZhc2NyaXB0LWNvbXBpbGVyXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIF9jcmVhdGUgPSBIYW5kbGViYXJzLmNyZWF0ZTtcbnZhciBjcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGhiID0gX2NyZWF0ZSgpO1xuXG4gIGhiLmNvbXBpbGUgPSBmdW5jdGlvbihpbnB1dCwgb3B0aW9ucykge1xuICAgIHJldHVybiBjb21waWxlKGlucHV0LCBvcHRpb25zLCBoYik7XG4gIH07XG4gIGhiLnByZWNvbXBpbGUgPSBmdW5jdGlvbiAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gcHJlY29tcGlsZShpbnB1dCwgb3B0aW9ucywgaGIpO1xuICB9O1xuXG4gIGhiLkFTVCA9IEFTVDtcbiAgaGIuQ29tcGlsZXIgPSBDb21waWxlcjtcbiAgaGIuSmF2YVNjcmlwdENvbXBpbGVyID0gSmF2YVNjcmlwdENvbXBpbGVyO1xuICBoYi5QYXJzZXIgPSBQYXJzZXI7XG4gIGhiLnBhcnNlID0gcGFyc2U7XG5cbiAgcmV0dXJuIGhiO1xufTtcblxuSGFuZGxlYmFycyA9IGNyZWF0ZSgpO1xuSGFuZGxlYmFycy5jcmVhdGUgPSBjcmVhdGU7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gSGFuZGxlYmFyczsiLCJcInVzZSBzdHJpY3RcIjtcbi8qZ2xvYmFscyBIYW5kbGViYXJzOiB0cnVlICovXG52YXIgYmFzZSA9IHJlcXVpcmUoXCIuL2hhbmRsZWJhcnMvYmFzZVwiKTtcblxuLy8gRWFjaCBvZiB0aGVzZSBhdWdtZW50IHRoZSBIYW5kbGViYXJzIG9iamVjdC4gTm8gbmVlZCB0byBzZXR1cCBoZXJlLlxuLy8gKFRoaXMgaXMgZG9uZSB0byBlYXNpbHkgc2hhcmUgY29kZSBiZXR3ZWVuIGNvbW1vbmpzIGFuZCBicm93c2UgZW52cylcbnZhciBTYWZlU3RyaW5nID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9zYWZlLXN0cmluZ1wiKVtcImRlZmF1bHRcIl07XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy91dGlsc1wiKTtcbnZhciBydW50aW1lID0gcmVxdWlyZShcIi4vaGFuZGxlYmFycy9ydW50aW1lXCIpO1xuXG4vLyBGb3IgY29tcGF0aWJpbGl0eSBhbmQgdXNhZ2Ugb3V0c2lkZSBvZiBtb2R1bGUgc3lzdGVtcywgbWFrZSB0aGUgSGFuZGxlYmFycyBvYmplY3QgYSBuYW1lc3BhY2VcbnZhciBjcmVhdGUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGhiID0gbmV3IGJhc2UuSGFuZGxlYmFyc0Vudmlyb25tZW50KCk7XG5cbiAgVXRpbHMuZXh0ZW5kKGhiLCBiYXNlKTtcbiAgaGIuU2FmZVN0cmluZyA9IFNhZmVTdHJpbmc7XG4gIGhiLkV4Y2VwdGlvbiA9IEV4Y2VwdGlvbjtcbiAgaGIuVXRpbHMgPSBVdGlscztcblxuICBoYi5WTSA9IHJ1bnRpbWU7XG4gIGhiLnRlbXBsYXRlID0gZnVuY3Rpb24oc3BlYykge1xuICAgIHJldHVybiBydW50aW1lLnRlbXBsYXRlKHNwZWMsIGhiKTtcbiAgfTtcblxuICByZXR1cm4gaGI7XG59O1xuXG52YXIgSGFuZGxlYmFycyA9IGNyZWF0ZSgpO1xuSGFuZGxlYmFycy5jcmVhdGUgPSBjcmVhdGU7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gSGFuZGxlYmFyczsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbnZhciBWRVJTSU9OID0gXCIyLjAuMC1hbHBoYS4yXCI7XG5leHBvcnRzLlZFUlNJT04gPSBWRVJTSU9OO3ZhciBDT01QSUxFUl9SRVZJU0lPTiA9IDU7XG5leHBvcnRzLkNPTVBJTEVSX1JFVklTSU9OID0gQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc9PSAxLngueCcsXG4gIDU6ICc+PSAyLjAuMCdcbn07XG5leHBvcnRzLlJFVklTSU9OX0NIQU5HRVMgPSBSRVZJU0lPTl9DSEFOR0VTO1xudmFyIGlzQXJyYXkgPSBVdGlscy5pc0FycmF5LFxuICAgIGlzRnVuY3Rpb24gPSBVdGlscy5pc0Z1bmN0aW9uLFxuICAgIHRvU3RyaW5nID0gVXRpbHMudG9TdHJpbmcsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBIYW5kbGViYXJzRW52aXJvbm1lbnQoaGVscGVycywgcGFydGlhbHMpIHtcbiAgdGhpcy5oZWxwZXJzID0gaGVscGVycyB8fCB7fTtcbiAgdGhpcy5wYXJ0aWFscyA9IHBhcnRpYWxzIHx8IHt9O1xuXG4gIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnModGhpcyk7XG59XG5cbmV4cG9ydHMuSGFuZGxlYmFyc0Vudmlyb25tZW50ID0gSGFuZGxlYmFyc0Vudmlyb25tZW50O0hhbmRsZWJhcnNFbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBIYW5kbGViYXJzRW52aXJvbm1lbnQsXG5cbiAgbG9nZ2VyOiBsb2dnZXIsXG4gIGxvZzogbG9nLFxuXG4gIHJlZ2lzdGVySGVscGVyOiBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICAgIH1cbiAgfSxcbiAgdW5yZWdpc3RlckhlbHBlcjogZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLmhlbHBlcnNbbmFtZV07XG4gIH0sXG5cbiAgcmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgICAgVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgICB9XG4gIH0sXG4gIHVucmVnaXN0ZXJQYXJ0aWFsOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMucGFydGlhbHNbbmFtZV07XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdEhlbHBlcnMoaW5zdGFuY2UpIHtcbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbigvKiBbYXJncywgXW9wdGlvbnMgKi8pIHtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAvLyBBIG1pc3NpbmcgZmllbGQgaW4gYSB7e2Zvb319IGNvbnN0dWN0LlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU29tZW9uZSBpcyBhY3R1YWxseSB0cnlpbmcgdG8gY2FsbCBzb21ldGhpbmcsIGJsb3cgdXAuXG4gICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoLTFdLm5hbWUgKyBcIidcIik7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmbih0aGlzKTtcbiAgICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoY29udGV4dCkpIHtcbiAgICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICBpZiAob3B0aW9ucy5pZHMpIHtcbiAgICAgICAgICBvcHRpb25zLmlkcyA9IFtvcHRpb25zLm5hbWVdO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3RhbmNlLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICAgIHZhciBkYXRhID0gY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5uYW1lKTtcbiAgICAgICAgb3B0aW9ucyA9IHtkYXRhOiBkYXRhfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgLy8gQWxsb3cgZm9yIHt7I2VhY2h9fVxuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IGNvbnRleHQ7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICB9XG5cbiAgICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICAgIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICAgIHZhciBjb250ZXh0UGF0aDtcbiAgICBpZiAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuaWRzKSB7XG4gICAgICBjb250ZXh0UGF0aCA9IFV0aWxzLmFwcGVuZENvbnRleHRQYXRoKG9wdGlvbnMuZGF0YS5jb250ZXh0UGF0aCwgb3B0aW9ucy5pZHNbMF0pICsgJy4nO1xuICAgIH1cblxuICAgIGlmIChpc0Z1bmN0aW9uKGNvbnRleHQpKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgIGRhdGEgPSBjcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICAgIH1cblxuICAgIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgICBpZiAoaXNBcnJheShjb250ZXh0KSkge1xuICAgICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgZGF0YS5pbmRleCA9IGk7XG4gICAgICAgICAgICBkYXRhLmZpcnN0ID0gKGkgPT09IDApO1xuICAgICAgICAgICAgZGF0YS5sYXN0ICA9IChpID09PSAoY29udGV4dC5sZW5ndGgtMSkpO1xuXG4gICAgICAgICAgICBpZiAoY29udGV4dFBhdGgpIHtcbiAgICAgICAgICAgICAgZGF0YS5jb250ZXh0UGF0aCA9IGNvbnRleHRQYXRoICsgaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgICAgIGRhdGEua2V5ID0ga2V5O1xuICAgICAgICAgICAgICBkYXRhLmluZGV4ID0gaTtcbiAgICAgICAgICAgICAgZGF0YS5maXJzdCA9IChpID09PSAwKTtcblxuICAgICAgICAgICAgICBpZiAoY29udGV4dFBhdGgpIHtcbiAgICAgICAgICAgICAgICBkYXRhLmNvbnRleHRQYXRoID0gY29udGV4dFBhdGggKyBrZXk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZihpID09PSAwKXtcbiAgICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgICBpZiAoaXNGdW5jdGlvbihjb25kaXRpb25hbCkpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGlzIHRvIHJlbmRlciB0aGUgcG9zaXRpdmUgcGF0aCBpZiB0aGUgdmFsdWUgaXMgdHJ1dGh5IGFuZCBub3QgZW1wdHkuXG4gICAgLy8gVGhlIGBpbmNsdWRlWmVyb2Agb3B0aW9uIG1heSBiZSBzZXQgdG8gdHJlYXQgdGhlIGNvbmR0aW9uYWwgYXMgcHVyZWx5IG5vdCBlbXB0eSBiYXNlZCBvbiB0aGVcbiAgICAvLyBiZWhhdmlvciBvZiBpc0VtcHR5LiBFZmZlY3RpdmVseSB0aGlzIGRldGVybWluZXMgaWYgMCBpcyBoYW5kbGVkIGJ5IHRoZSBwb3NpdGl2ZSBwYXRoIG9yIG5lZ2F0aXZlLlxuICAgIGlmICgoIW9wdGlvbnMuaGFzaC5pbmNsdWRlWmVybyAmJiAhY29uZGl0aW9uYWwpIHx8IFV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICB9XG4gIH0pO1xuXG4gIGluc3RhbmNlLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICAgIHJldHVybiBpbnN0YW5jZS5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZuLCBoYXNoOiBvcHRpb25zLmhhc2h9KTtcbiAgfSk7XG5cbiAgaW5zdGFuY2UucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24oY29udGV4dCkpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gICAgdmFyIGZuID0gb3B0aW9ucy5mbjtcblxuICAgIGlmICghVXRpbHMuaXNFbXB0eShjb250ZXh0KSkge1xuICAgICAgaWYgKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmlkcykge1xuICAgICAgICB2YXIgZGF0YSA9IGNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gICAgICAgIGRhdGEuY29udGV4dFBhdGggPSBVdGlscy5hcHBlbmRDb250ZXh0UGF0aChvcHRpb25zLmRhdGEuY29udGV4dFBhdGgsIG9wdGlvbnMuaWRzWzBdKTtcbiAgICAgICAgb3B0aW9ucyA9IHtkYXRhOmRhdGF9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgICBpbnN0YW5jZS5sb2cobGV2ZWwsIGNvbnRleHQpO1xuICB9KTtcblxuICBpbnN0YW5jZS5yZWdpc3RlckhlbHBlcignbG9va3VwJywgZnVuY3Rpb24ob2JqLCBmaWVsZCwgb3B0aW9ucykge1xuICAgIHJldHVybiBvYmogJiYgb2JqW2ZpZWxkXTtcbiAgfSk7XG59XG5cbnZhciBsb2dnZXIgPSB7XG4gIG1ldGhvZE1hcDogeyAwOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJyB9LFxuXG4gIC8vIFN0YXRlIGVudW1cbiAgREVCVUc6IDAsXG4gIElORk86IDEsXG4gIFdBUk46IDIsXG4gIEVSUk9SOiAzLFxuICBsZXZlbDogMyxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAobG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gbG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbmV4cG9ydHMubG9nZ2VyID0gbG9nZ2VyO1xuZnVuY3Rpb24gbG9nKGxldmVsLCBvYmopIHsgbG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfVxuXG5leHBvcnRzLmxvZyA9IGxvZzt2YXIgY3JlYXRlRnJhbWUgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgdmFyIGZyYW1lID0gVXRpbHMuZXh0ZW5kKHt9LCBvYmplY3QpO1xuICBmcmFtZS5fcGFyZW50ID0gb2JqZWN0O1xuICByZXR1cm4gZnJhbWU7XG59O1xuZXhwb3J0cy5jcmVhdGVGcmFtZSA9IGNyZWF0ZUZyYW1lOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuLi9leGNlcHRpb25cIilbXCJkZWZhdWx0XCJdO1xuXG5mdW5jdGlvbiBMb2NhdGlvbkluZm8obG9jSW5mbyl7XG4gIGxvY0luZm8gPSBsb2NJbmZvIHx8IHt9O1xuICB0aGlzLmZpcnN0TGluZSAgID0gbG9jSW5mby5maXJzdF9saW5lO1xuICB0aGlzLmZpcnN0Q29sdW1uID0gbG9jSW5mby5maXJzdF9jb2x1bW47XG4gIHRoaXMubGFzdENvbHVtbiAgPSBsb2NJbmZvLmxhc3RfY29sdW1uO1xuICB0aGlzLmxhc3RMaW5lICAgID0gbG9jSW5mby5sYXN0X2xpbmU7XG59XG5cbnZhciBBU1QgPSB7XG4gIFByb2dyYW1Ob2RlOiBmdW5jdGlvbihzdGF0ZW1lbnRzLCBpbnZlcnNlU3RyaXAsIGludmVyc2UsIGxvY0luZm8pIHtcbiAgICB2YXIgaW52ZXJzZUxvY2F0aW9uSW5mbywgZmlyc3RJbnZlcnNlTm9kZTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgbG9jSW5mbyA9IGludmVyc2U7XG4gICAgICBpbnZlcnNlID0gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICAgIGxvY0luZm8gPSBpbnZlcnNlU3RyaXA7XG4gICAgICBpbnZlcnNlU3RyaXAgPSBudWxsO1xuICAgIH1cblxuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSA9IFwicHJvZ3JhbVwiO1xuICAgIHRoaXMuc3RhdGVtZW50cyA9IHN0YXRlbWVudHM7XG4gICAgdGhpcy5zdHJpcCA9IHt9O1xuXG4gICAgaWYoaW52ZXJzZSkge1xuICAgICAgZmlyc3RJbnZlcnNlTm9kZSA9IGludmVyc2VbMF07XG4gICAgICBpZiAoZmlyc3RJbnZlcnNlTm9kZSkge1xuICAgICAgICBpbnZlcnNlTG9jYXRpb25JbmZvID0ge1xuICAgICAgICAgIGZpcnN0X2xpbmU6IGZpcnN0SW52ZXJzZU5vZGUuZmlyc3RMaW5lLFxuICAgICAgICAgIGxhc3RfbGluZTogZmlyc3RJbnZlcnNlTm9kZS5sYXN0TGluZSxcbiAgICAgICAgICBsYXN0X2NvbHVtbjogZmlyc3RJbnZlcnNlTm9kZS5sYXN0Q29sdW1uLFxuICAgICAgICAgIGZpcnN0X2NvbHVtbjogZmlyc3RJbnZlcnNlTm9kZS5maXJzdENvbHVtblxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmludmVyc2UgPSBuZXcgQVNULlByb2dyYW1Ob2RlKGludmVyc2UsIGludmVyc2VTdHJpcCwgaW52ZXJzZUxvY2F0aW9uSW5mbyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmludmVyc2UgPSBuZXcgQVNULlByb2dyYW1Ob2RlKGludmVyc2UsIGludmVyc2VTdHJpcCk7XG4gICAgICB9XG4gICAgICB0aGlzLnN0cmlwLnJpZ2h0ID0gaW52ZXJzZVN0cmlwLmxlZnQ7XG4gICAgfSBlbHNlIGlmIChpbnZlcnNlU3RyaXApIHtcbiAgICAgIHRoaXMuc3RyaXAubGVmdCA9IGludmVyc2VTdHJpcC5yaWdodDtcbiAgICB9XG4gIH0sXG5cbiAgTXVzdGFjaGVOb2RlOiBmdW5jdGlvbihyYXdQYXJhbXMsIGhhc2gsIG9wZW4sIHN0cmlwLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJtdXN0YWNoZVwiO1xuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcblxuICAgIC8vIE9wZW4gbWF5IGJlIGEgc3RyaW5nIHBhcnNlZCBmcm9tIHRoZSBwYXJzZXIgb3IgYSBwYXNzZWQgYm9vbGVhbiBmbGFnXG4gICAgaWYgKG9wZW4gIT0gbnVsbCAmJiBvcGVuLmNoYXJBdCkge1xuICAgICAgLy8gTXVzdCB1c2UgY2hhckF0IHRvIHN1cHBvcnQgSUUgcHJlLTEwXG4gICAgICB2YXIgZXNjYXBlRmxhZyA9IG9wZW4uY2hhckF0KDMpIHx8IG9wZW4uY2hhckF0KDIpO1xuICAgICAgdGhpcy5lc2NhcGVkID0gZXNjYXBlRmxhZyAhPT0gJ3snICYmIGVzY2FwZUZsYWcgIT09ICcmJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lc2NhcGVkID0gISFvcGVuO1xuICAgIH1cblxuICAgIGlmIChyYXdQYXJhbXMgaW5zdGFuY2VvZiBBU1QuU2V4cHJOb2RlKSB7XG4gICAgICB0aGlzLnNleHByID0gcmF3UGFyYW1zO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTdXBwb3J0IG9sZCBBU1QgQVBJXG4gICAgICB0aGlzLnNleHByID0gbmV3IEFTVC5TZXhwck5vZGUocmF3UGFyYW1zLCBoYXNoKTtcbiAgICB9XG5cbiAgICB0aGlzLnNleHByLmlzUm9vdCA9IHRydWU7XG5cbiAgICAvLyBTdXBwb3J0IG9sZCBBU1QgQVBJIHRoYXQgc3RvcmVkIHRoaXMgaW5mbyBpbiBNdXN0YWNoZU5vZGVcbiAgICB0aGlzLmlkID0gdGhpcy5zZXhwci5pZDtcbiAgICB0aGlzLnBhcmFtcyA9IHRoaXMuc2V4cHIucGFyYW1zO1xuICAgIHRoaXMuaGFzaCA9IHRoaXMuc2V4cHIuaGFzaDtcbiAgICB0aGlzLmVsaWdpYmxlSGVscGVyID0gdGhpcy5zZXhwci5lbGlnaWJsZUhlbHBlcjtcbiAgICB0aGlzLmlzSGVscGVyID0gdGhpcy5zZXhwci5pc0hlbHBlcjtcbiAgfSxcblxuICBTZXhwck5vZGU6IGZ1bmN0aW9uKHJhd1BhcmFtcywgaGFzaCwgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuXG4gICAgdGhpcy50eXBlID0gXCJzZXhwclwiO1xuICAgIHRoaXMuaGFzaCA9IGhhc2g7XG5cbiAgICB2YXIgaWQgPSB0aGlzLmlkID0gcmF3UGFyYW1zWzBdO1xuICAgIHZhciBwYXJhbXMgPSB0aGlzLnBhcmFtcyA9IHJhd1BhcmFtcy5zbGljZSgxKTtcblxuICAgIC8vIGEgbXVzdGFjaGUgaXMgZGVmaW5pdGVseSBhIGhlbHBlciBpZjpcbiAgICAvLyAqIGl0IGlzIGFuIGVsaWdpYmxlIGhlbHBlciwgYW5kXG4gICAgLy8gKiBpdCBoYXMgYXQgbGVhc3Qgb25lIHBhcmFtZXRlciBvciBoYXNoIHNlZ21lbnRcbiAgICB0aGlzLmlzSGVscGVyID0gcGFyYW1zLmxlbmd0aCB8fCBoYXNoO1xuXG4gICAgLy8gYSBtdXN0YWNoZSBpcyBhbiBlbGlnaWJsZSBoZWxwZXIgaWY6XG4gICAgLy8gKiBpdHMgaWQgaXMgc2ltcGxlIChhIHNpbmdsZSBwYXJ0LCBub3QgYHRoaXNgIG9yIGAuLmApXG4gICAgdGhpcy5lbGlnaWJsZUhlbHBlciA9IHRoaXMuaXNIZWxwZXIgfHwgaWQuaXNTaW1wbGU7XG5cbiAgICAvLyBpZiBhIG11c3RhY2hlIGlzIGFuIGVsaWdpYmxlIGhlbHBlciBidXQgbm90IGEgZGVmaW5pdGVcbiAgICAvLyBoZWxwZXIsIGl0IGlzIGFtYmlndW91cywgYW5kIHdpbGwgYmUgcmVzb2x2ZWQgaW4gYSBsYXRlclxuICAgIC8vIHBhc3Mgb3IgYXQgcnVudGltZS5cbiAgfSxcblxuICBQYXJ0aWFsTm9kZTogZnVuY3Rpb24ocGFydGlhbE5hbWUsIGNvbnRleHQsIGhhc2gsIHN0cmlwLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlICAgICAgICAgPSBcInBhcnRpYWxcIjtcbiAgICB0aGlzLnBhcnRpYWxOYW1lICA9IHBhcnRpYWxOYW1lO1xuICAgIHRoaXMuY29udGV4dCAgICAgID0gY29udGV4dDtcbiAgICB0aGlzLmhhc2ggPSBoYXNoO1xuICAgIHRoaXMuc3RyaXAgPSBzdHJpcDtcbiAgfSxcblxuICBCbG9ja05vZGU6IGZ1bmN0aW9uKG11c3RhY2hlLCBwcm9ncmFtLCBpbnZlcnNlLCBjbG9zZSwgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuXG4gICAgaWYobXVzdGFjaGUuc2V4cHIuaWQub3JpZ2luYWwgIT09IGNsb3NlLnBhdGgub3JpZ2luYWwpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24obXVzdGFjaGUuc2V4cHIuaWQub3JpZ2luYWwgKyBcIiBkb2Vzbid0IG1hdGNoIFwiICsgY2xvc2UucGF0aC5vcmlnaW5hbCwgdGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy50eXBlID0gJ2Jsb2NrJztcbiAgICB0aGlzLm11c3RhY2hlID0gbXVzdGFjaGU7XG4gICAgdGhpcy5wcm9ncmFtICA9IHByb2dyYW07XG4gICAgdGhpcy5pbnZlcnNlICA9IGludmVyc2U7XG5cbiAgICB0aGlzLnN0cmlwID0ge1xuICAgICAgbGVmdDogbXVzdGFjaGUuc3RyaXAubGVmdCxcbiAgICAgIHJpZ2h0OiBjbG9zZS5zdHJpcC5yaWdodFxuICAgIH07XG5cbiAgICAocHJvZ3JhbSB8fCBpbnZlcnNlKS5zdHJpcC5sZWZ0ID0gbXVzdGFjaGUuc3RyaXAucmlnaHQ7XG4gICAgKGludmVyc2UgfHwgcHJvZ3JhbSkuc3RyaXAucmlnaHQgPSBjbG9zZS5zdHJpcC5sZWZ0O1xuXG4gICAgaWYgKGludmVyc2UgJiYgIXByb2dyYW0pIHtcbiAgICAgIHRoaXMuaXNJbnZlcnNlID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cbiAgUmF3QmxvY2tOb2RlOiBmdW5jdGlvbihtdXN0YWNoZSwgY29udGVudCwgY2xvc2UsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcblxuICAgIGlmIChtdXN0YWNoZS5zZXhwci5pZC5vcmlnaW5hbCAhPT0gY2xvc2UpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24obXVzdGFjaGUuc2V4cHIuaWQub3JpZ2luYWwgKyBcIiBkb2Vzbid0IG1hdGNoIFwiICsgY2xvc2UsIHRoaXMpO1xuICAgIH1cblxuICAgIGNvbnRlbnQgPSBuZXcgQVNULkNvbnRlbnROb2RlKGNvbnRlbnQsIGxvY0luZm8pO1xuXG4gICAgdGhpcy50eXBlID0gJ2Jsb2NrJztcbiAgICB0aGlzLm11c3RhY2hlID0gbXVzdGFjaGU7XG4gICAgdGhpcy5wcm9ncmFtID0gbmV3IEFTVC5Qcm9ncmFtTm9kZShbY29udGVudF0sIGxvY0luZm8pO1xuICB9LFxuXG4gIENvbnRlbnROb2RlOiBmdW5jdGlvbihzdHJpbmcsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcImNvbnRlbnRcIjtcbiAgICB0aGlzLnN0cmluZyA9IHN0cmluZztcbiAgfSxcblxuICBIYXNoTm9kZTogZnVuY3Rpb24ocGFpcnMsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcImhhc2hcIjtcbiAgICB0aGlzLnBhaXJzID0gcGFpcnM7XG4gIH0sXG5cbiAgSWROb2RlOiBmdW5jdGlvbihwYXJ0cywgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSA9IFwiSURcIjtcblxuICAgIHZhciBvcmlnaW5hbCA9IFwiXCIsXG4gICAgICAgIGRpZyA9IFtdLFxuICAgICAgICBkZXB0aCA9IDAsXG4gICAgICAgIGRlcHRoU3RyaW5nID0gJyc7XG5cbiAgICBmb3IodmFyIGk9MCxsPXBhcnRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHZhciBwYXJ0ID0gcGFydHNbaV0ucGFydDtcbiAgICAgIG9yaWdpbmFsICs9IChwYXJ0c1tpXS5zZXBhcmF0b3IgfHwgJycpICsgcGFydDtcblxuICAgICAgaWYgKHBhcnQgPT09IFwiLi5cIiB8fCBwYXJ0ID09PSBcIi5cIiB8fCBwYXJ0ID09PSBcInRoaXNcIikge1xuICAgICAgICBpZiAoZGlnLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKFwiSW52YWxpZCBwYXRoOiBcIiArIG9yaWdpbmFsLCB0aGlzKTtcbiAgICAgICAgfSBlbHNlIGlmIChwYXJ0ID09PSBcIi4uXCIpIHtcbiAgICAgICAgICBkZXB0aCsrO1xuICAgICAgICAgIGRlcHRoU3RyaW5nICs9ICcuLi8nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuaXNTY29wZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkaWcucHVzaChwYXJ0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLm9yaWdpbmFsID0gb3JpZ2luYWw7XG4gICAgdGhpcy5wYXJ0cyAgICA9IGRpZztcbiAgICB0aGlzLnN0cmluZyAgID0gZGlnLmpvaW4oJy4nKTtcbiAgICB0aGlzLmRlcHRoICAgID0gZGVwdGg7XG4gICAgdGhpcy5pZE5hbWUgICA9IGRlcHRoU3RyaW5nICsgdGhpcy5zdHJpbmc7XG5cbiAgICAvLyBhbiBJRCBpcyBzaW1wbGUgaWYgaXQgb25seSBoYXMgb25lIHBhcnQsIGFuZCB0aGF0IHBhcnQgaXMgbm90XG4gICAgLy8gYC4uYCBvciBgdGhpc2AuXG4gICAgdGhpcy5pc1NpbXBsZSA9IHBhcnRzLmxlbmd0aCA9PT0gMSAmJiAhdGhpcy5pc1Njb3BlZCAmJiBkZXB0aCA9PT0gMDtcblxuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gdGhpcy5zdHJpbmc7XG4gIH0sXG5cbiAgUGFydGlhbE5hbWVOb2RlOiBmdW5jdGlvbihuYW1lLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJQQVJUSUFMX05BTUVcIjtcbiAgICB0aGlzLm5hbWUgPSBuYW1lLm9yaWdpbmFsO1xuICB9LFxuXG4gIERhdGFOb2RlOiBmdW5jdGlvbihpZCwgbG9jSW5mbykge1xuICAgIExvY2F0aW9uSW5mby5jYWxsKHRoaXMsIGxvY0luZm8pO1xuICAgIHRoaXMudHlwZSA9IFwiREFUQVwiO1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgICB0aGlzLnN0cmluZ01vZGVWYWx1ZSA9IGlkLnN0cmluZ01vZGVWYWx1ZTtcbiAgICB0aGlzLmlkTmFtZSA9ICdAJyArIGlkLnN0cmluZ01vZGVWYWx1ZTtcbiAgfSxcblxuICBTdHJpbmdOb2RlOiBmdW5jdGlvbihzdHJpbmcsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcIlNUUklOR1wiO1xuICAgIHRoaXMub3JpZ2luYWwgPVxuICAgICAgdGhpcy5zdHJpbmcgPVxuICAgICAgdGhpcy5zdHJpbmdNb2RlVmFsdWUgPSBzdHJpbmc7XG4gIH0sXG5cbiAgTnVtYmVyTm9kZTogZnVuY3Rpb24obnVtYmVyLCBsb2NJbmZvKSB7XG4gICAgTG9jYXRpb25JbmZvLmNhbGwodGhpcywgbG9jSW5mbyk7XG4gICAgdGhpcy50eXBlID0gXCJOVU1CRVJcIjtcbiAgICB0aGlzLm9yaWdpbmFsID1cbiAgICAgIHRoaXMubnVtYmVyID0gbnVtYmVyO1xuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gTnVtYmVyKG51bWJlcik7XG4gIH0sXG5cbiAgQm9vbGVhbk5vZGU6IGZ1bmN0aW9uKGJvb2wsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcIkJPT0xFQU5cIjtcbiAgICB0aGlzLmJvb2wgPSBib29sO1xuICAgIHRoaXMuc3RyaW5nTW9kZVZhbHVlID0gYm9vbCA9PT0gXCJ0cnVlXCI7XG4gIH0sXG5cbiAgQ29tbWVudE5vZGU6IGZ1bmN0aW9uKGNvbW1lbnQsIGxvY0luZm8pIHtcbiAgICBMb2NhdGlvbkluZm8uY2FsbCh0aGlzLCBsb2NJbmZvKTtcbiAgICB0aGlzLnR5cGUgPSBcImNvbW1lbnRcIjtcbiAgICB0aGlzLmNvbW1lbnQgPSBjb21tZW50O1xuICB9XG59O1xuXG4vLyBNdXN0IGJlIGV4cG9ydGVkIGFzIGFuIG9iamVjdCByYXRoZXIgdGhhbiB0aGUgcm9vdCBvZiB0aGUgbW9kdWxlIGFzIHRoZSBqaXNvbiBsZXhlclxuLy8gbW9zdCBtb2RpZnkgdGhlIG9iamVjdCB0byBvcGVyYXRlIHByb3Blcmx5LlxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBBU1Q7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgcGFyc2VyID0gcmVxdWlyZShcIi4vcGFyc2VyXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBBU1QgPSByZXF1aXJlKFwiLi9hc3RcIilbXCJkZWZhdWx0XCJdO1xuXG5leHBvcnRzLnBhcnNlciA9IHBhcnNlcjtcblxuZnVuY3Rpb24gcGFyc2UoaW5wdXQpIHtcbiAgLy8gSnVzdCByZXR1cm4gaWYgYW4gYWxyZWFkeS1jb21waWxlIEFTVCB3YXMgcGFzc2VkIGluLlxuICBpZihpbnB1dC5jb25zdHJ1Y3RvciA9PT0gQVNULlByb2dyYW1Ob2RlKSB7IHJldHVybiBpbnB1dDsgfVxuXG4gIHBhcnNlci55eSA9IEFTVDtcbiAgcmV0dXJuIHBhcnNlci5wYXJzZShpbnB1dCk7XG59XG5cbmV4cG9ydHMucGFyc2UgPSBwYXJzZTsiLCJcInVzZSBzdHJpY3RcIjtcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcblxuZnVuY3Rpb24gQ29tcGlsZXIoKSB7fVxuXG5leHBvcnRzLkNvbXBpbGVyID0gQ29tcGlsZXI7Ly8gdGhlIGZvdW5kSGVscGVyIHJlZ2lzdGVyIHdpbGwgZGlzYW1iaWd1YXRlIGhlbHBlciBsb29rdXAgZnJvbSBmaW5kaW5nIGFcbi8vIGZ1bmN0aW9uIGluIGEgY29udGV4dC4gVGhpcyBpcyBuZWNlc3NhcnkgZm9yIG11c3RhY2hlIGNvbXBhdGliaWxpdHksIHdoaWNoXG4vLyByZXF1aXJlcyB0aGF0IGNvbnRleHQgZnVuY3Rpb25zIGluIGJsb2NrcyBhcmUgZXZhbHVhdGVkIGJ5IGJsb2NrSGVscGVyTWlzc2luZyxcbi8vIGFuZCB0aGVuIHByb2NlZWQgYXMgaWYgdGhlIHJlc3VsdGluZyB2YWx1ZSB3YXMgcHJvdmlkZWQgdG8gYmxvY2tIZWxwZXJNaXNzaW5nLlxuXG5Db21waWxlci5wcm90b3R5cGUgPSB7XG4gIGNvbXBpbGVyOiBDb21waWxlcixcblxuICBkaXNhc3NlbWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9wY29kZXMgPSB0aGlzLm9wY29kZXMsIG9wY29kZSwgb3V0ID0gW10sIHBhcmFtcywgcGFyYW07XG5cbiAgICBmb3IgKHZhciBpPTAsIGw9b3Bjb2Rlcy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBvcGNvZGUgPSBvcGNvZGVzW2ldO1xuXG4gICAgICBpZiAob3Bjb2RlLm9wY29kZSA9PT0gJ0RFQ0xBUkUnKSB7XG4gICAgICAgIG91dC5wdXNoKFwiREVDTEFSRSBcIiArIG9wY29kZS5uYW1lICsgXCI9XCIgKyBvcGNvZGUudmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFyYW1zID0gW107XG4gICAgICAgIGZvciAodmFyIGo9MDsgajxvcGNvZGUuYXJncy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIHBhcmFtID0gb3Bjb2RlLmFyZ3Nbal07XG4gICAgICAgICAgaWYgKHR5cGVvZiBwYXJhbSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgcGFyYW0gPSBcIlxcXCJcIiArIHBhcmFtLnJlcGxhY2UoXCJcXG5cIiwgXCJcXFxcblwiKSArIFwiXFxcIlwiO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgb3V0LnB1c2gob3Bjb2RlLm9wY29kZSArIFwiIFwiICsgcGFyYW1zLmpvaW4oXCIgXCIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0LmpvaW4oXCJcXG5cIik7XG4gIH0sXG5cbiAgZXF1YWxzOiBmdW5jdGlvbihvdGhlcikge1xuICAgIHZhciBsZW4gPSB0aGlzLm9wY29kZXMubGVuZ3RoO1xuICAgIGlmIChvdGhlci5vcGNvZGVzLmxlbmd0aCAhPT0gbGVuKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIG9wY29kZSA9IHRoaXMub3Bjb2Rlc1tpXSxcbiAgICAgICAgICBvdGhlck9wY29kZSA9IG90aGVyLm9wY29kZXNbaV07XG4gICAgICBpZiAob3Bjb2RlLm9wY29kZSAhPT0gb3RoZXJPcGNvZGUub3Bjb2RlIHx8IG9wY29kZS5hcmdzLmxlbmd0aCAhPT0gb3RoZXJPcGNvZGUuYXJncy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvcGNvZGUuYXJncy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAob3Bjb2RlLmFyZ3Nbal0gIT09IG90aGVyT3Bjb2RlLmFyZ3Nbal0pIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZW4gPSB0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgICBpZiAob3RoZXIuY2hpbGRyZW4ubGVuZ3RoICE9PSBsZW4pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoIXRoaXMuY2hpbGRyZW5baV0uZXF1YWxzKG90aGVyLmNoaWxkcmVuW2ldKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgZ3VpZDogMCxcblxuICBjb21waWxlOiBmdW5jdGlvbihwcm9ncmFtLCBvcHRpb25zKSB7XG4gICAgdGhpcy5vcGNvZGVzID0gW107XG4gICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgIHRoaXMuZGVwdGhzID0ge2xpc3Q6IFtdfTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuc3RyaW5nUGFyYW1zID0gb3B0aW9ucy5zdHJpbmdQYXJhbXM7XG4gICAgdGhpcy50cmFja0lkcyA9IG9wdGlvbnMudHJhY2tJZHM7XG5cbiAgICAvLyBUaGVzZSBjaGFuZ2VzIHdpbGwgcHJvcGFnYXRlIHRvIHRoZSBvdGhlciBjb21waWxlciBjb21wb25lbnRzXG4gICAgdmFyIGtub3duSGVscGVycyA9IHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnM7XG4gICAgdGhpcy5vcHRpb25zLmtub3duSGVscGVycyA9IHtcbiAgICAgICdoZWxwZXJNaXNzaW5nJzogdHJ1ZSxcbiAgICAgICdibG9ja0hlbHBlck1pc3NpbmcnOiB0cnVlLFxuICAgICAgJ2VhY2gnOiB0cnVlLFxuICAgICAgJ2lmJzogdHJ1ZSxcbiAgICAgICd1bmxlc3MnOiB0cnVlLFxuICAgICAgJ3dpdGgnOiB0cnVlLFxuICAgICAgJ2xvZyc6IHRydWUsXG4gICAgICAnbG9va3VwJzogdHJ1ZVxuICAgIH07XG4gICAgaWYgKGtub3duSGVscGVycykge1xuICAgICAgZm9yICh2YXIgbmFtZSBpbiBrbm93bkhlbHBlcnMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLmtub3duSGVscGVyc1tuYW1lXSA9IGtub3duSGVscGVyc1tuYW1lXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hY2NlcHQocHJvZ3JhbSk7XG4gIH0sXG5cbiAgYWNjZXB0OiBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIHN0cmlwID0gbm9kZS5zdHJpcCB8fCB7fSxcbiAgICAgICAgcmV0O1xuICAgIGlmIChzdHJpcC5sZWZ0KSB7XG4gICAgICB0aGlzLm9wY29kZSgnc3RyaXAnKTtcbiAgICB9XG5cbiAgICByZXQgPSB0aGlzW25vZGUudHlwZV0obm9kZSk7XG5cbiAgICBpZiAoc3RyaXAucmlnaHQpIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdzdHJpcCcpO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0sXG5cbiAgcHJvZ3JhbTogZnVuY3Rpb24ocHJvZ3JhbSkge1xuICAgIHZhciBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9c3RhdGVtZW50cy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB0aGlzLmFjY2VwdChzdGF0ZW1lbnRzW2ldKTtcbiAgICB9XG4gICAgdGhpcy5pc1NpbXBsZSA9IGwgPT09IDE7XG5cbiAgICB0aGlzLmRlcHRocy5saXN0ID0gdGhpcy5kZXB0aHMubGlzdC5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIHJldHVybiBhIC0gYjtcbiAgICB9KTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGNvbXBpbGVQcm9ncmFtOiBmdW5jdGlvbihwcm9ncmFtKSB7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyB0aGlzLmNvbXBpbGVyKCkuY29tcGlsZShwcm9ncmFtLCB0aGlzLm9wdGlvbnMpO1xuICAgIHZhciBndWlkID0gdGhpcy5ndWlkKyssIGRlcHRoO1xuXG4gICAgdGhpcy51c2VQYXJ0aWFsID0gdGhpcy51c2VQYXJ0aWFsIHx8IHJlc3VsdC51c2VQYXJ0aWFsO1xuXG4gICAgdGhpcy5jaGlsZHJlbltndWlkXSA9IHJlc3VsdDtcblxuICAgIGZvcih2YXIgaT0wLCBsPXJlc3VsdC5kZXB0aHMubGlzdC5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICBkZXB0aCA9IHJlc3VsdC5kZXB0aHMubGlzdFtpXTtcblxuICAgICAgaWYoZGVwdGggPCAyKSB7IGNvbnRpbnVlOyB9XG4gICAgICBlbHNlIHsgdGhpcy5hZGREZXB0aChkZXB0aCAtIDEpOyB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGd1aWQ7XG4gIH0sXG5cbiAgYmxvY2s6IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIG11c3RhY2hlID0gYmxvY2subXVzdGFjaGUsXG4gICAgICAgIHByb2dyYW0gPSBibG9jay5wcm9ncmFtLFxuICAgICAgICBpbnZlcnNlID0gYmxvY2suaW52ZXJzZTtcblxuICAgIGlmIChwcm9ncmFtKSB7XG4gICAgICBwcm9ncmFtID0gdGhpcy5jb21waWxlUHJvZ3JhbShwcm9ncmFtKTtcbiAgICB9XG5cbiAgICBpZiAoaW52ZXJzZSkge1xuICAgICAgaW52ZXJzZSA9IHRoaXMuY29tcGlsZVByb2dyYW0oaW52ZXJzZSk7XG4gICAgfVxuXG4gICAgdmFyIHNleHByID0gbXVzdGFjaGUuc2V4cHI7XG4gICAgdmFyIHR5cGUgPSB0aGlzLmNsYXNzaWZ5U2V4cHIoc2V4cHIpO1xuXG4gICAgaWYgKHR5cGUgPT09IFwiaGVscGVyXCIpIHtcbiAgICAgIHRoaXMuaGVscGVyU2V4cHIoc2V4cHIsIHByb2dyYW0sIGludmVyc2UpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJzaW1wbGVcIikge1xuICAgICAgdGhpcy5zaW1wbGVTZXhwcihzZXhwcik7XG5cbiAgICAgIC8vIG5vdyB0aGF0IHRoZSBzaW1wbGUgbXVzdGFjaGUgaXMgcmVzb2x2ZWQsIHdlIG5lZWQgdG9cbiAgICAgIC8vIGV2YWx1YXRlIGl0IGJ5IGV4ZWN1dGluZyBgYmxvY2tIZWxwZXJNaXNzaW5nYFxuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdibG9ja1ZhbHVlJywgc2V4cHIuaWQub3JpZ2luYWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFtYmlndW91c1NleHByKHNleHByLCBwcm9ncmFtLCBpbnZlcnNlKTtcblxuICAgICAgLy8gbm93IHRoYXQgdGhlIHNpbXBsZSBtdXN0YWNoZSBpcyByZXNvbHZlZCwgd2UgbmVlZCB0b1xuICAgICAgLy8gZXZhbHVhdGUgaXQgYnkgZXhlY3V0aW5nIGBibG9ja0hlbHBlck1pc3NpbmdgXG4gICAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoUHJvZ3JhbScsIGludmVyc2UpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2VtcHR5SGFzaCcpO1xuICAgICAgdGhpcy5vcGNvZGUoJ2FtYmlndW91c0Jsb2NrVmFsdWUnKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kJyk7XG4gIH0sXG5cbiAgaGFzaDogZnVuY3Rpb24oaGFzaCkge1xuICAgIHZhciBwYWlycyA9IGhhc2gucGFpcnMsIGksIGw7XG5cbiAgICB0aGlzLm9wY29kZSgncHVzaEhhc2gnKTtcblxuICAgIGZvcihpPTAsIGw9cGFpcnMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdGhpcy5wdXNoUGFyYW0ocGFpcnNbaV1bMV0pO1xuICAgIH1cbiAgICB3aGlsZShpLS0pIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdhc3NpZ25Ub0hhc2gnLCBwYWlyc1tpXVswXSk7XG4gICAgfVxuICAgIHRoaXMub3Bjb2RlKCdwb3BIYXNoJyk7XG4gIH0sXG5cbiAgcGFydGlhbDogZnVuY3Rpb24ocGFydGlhbCkge1xuICAgIHZhciBwYXJ0aWFsTmFtZSA9IHBhcnRpYWwucGFydGlhbE5hbWU7XG4gICAgdGhpcy51c2VQYXJ0aWFsID0gdHJ1ZTtcblxuICAgIGlmIChwYXJ0aWFsLmhhc2gpIHtcbiAgICAgIHRoaXMuYWNjZXB0KHBhcnRpYWwuaGFzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoJywgJ3VuZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIGlmIChwYXJ0aWFsLmNvbnRleHQpIHtcbiAgICAgIHRoaXMuYWNjZXB0KHBhcnRpYWwuY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoJywgJ2RlcHRoMCcpO1xuICAgIH1cblxuICAgIHRoaXMub3Bjb2RlKCdpbnZva2VQYXJ0aWFsJywgcGFydGlhbE5hbWUubmFtZSk7XG4gICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICB9LFxuXG4gIGNvbnRlbnQ6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICB0aGlzLm9wY29kZSgnYXBwZW5kQ29udGVudCcsIGNvbnRlbnQuc3RyaW5nKTtcbiAgfSxcblxuICBtdXN0YWNoZTogZnVuY3Rpb24obXVzdGFjaGUpIHtcbiAgICB0aGlzLnNleHByKG11c3RhY2hlLnNleHByKTtcblxuICAgIGlmKG11c3RhY2hlLmVzY2FwZWQgJiYgIXRoaXMub3B0aW9ucy5ub0VzY2FwZSkge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZEVzY2FwZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2FwcGVuZCcpO1xuICAgIH1cbiAgfSxcblxuICBhbWJpZ3VvdXNTZXhwcjogZnVuY3Rpb24oc2V4cHIsIHByb2dyYW0sIGludmVyc2UpIHtcbiAgICB2YXIgaWQgPSBzZXhwci5pZCxcbiAgICAgICAgbmFtZSA9IGlkLnBhcnRzWzBdLFxuICAgICAgICBpc0Jsb2NrID0gcHJvZ3JhbSAhPSBudWxsIHx8IGludmVyc2UgIT0gbnVsbDtcblxuICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuXG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgcHJvZ3JhbSk7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hQcm9ncmFtJywgaW52ZXJzZSk7XG5cbiAgICB0aGlzLm9wY29kZSgnaW52b2tlQW1iaWd1b3VzJywgbmFtZSwgaXNCbG9jayk7XG4gIH0sXG5cbiAgc2ltcGxlU2V4cHI6IGZ1bmN0aW9uKHNleHByKSB7XG4gICAgdmFyIGlkID0gc2V4cHIuaWQ7XG5cbiAgICBpZiAoaWQudHlwZSA9PT0gJ0RBVEEnKSB7XG4gICAgICB0aGlzLkRBVEEoaWQpO1xuICAgIH0gZWxzZSBpZiAoaWQucGFydHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLklEKGlkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2ltcGxpZmllZCBJRCBmb3IgYHRoaXNgXG4gICAgICB0aGlzLmFkZERlcHRoKGlkLmRlcHRoKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdnZXRDb250ZXh0JywgaWQuZGVwdGgpO1xuICAgICAgdGhpcy5vcGNvZGUoJ3B1c2hDb250ZXh0Jyk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGNvZGUoJ3Jlc29sdmVQb3NzaWJsZUxhbWJkYScpO1xuICB9LFxuXG4gIGhlbHBlclNleHByOiBmdW5jdGlvbihzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXJhbXMgPSB0aGlzLnNldHVwRnVsbE11c3RhY2hlUGFyYW1zKHNleHByLCBwcm9ncmFtLCBpbnZlcnNlKSxcbiAgICAgICAgaWQgPSBzZXhwci5pZCxcbiAgICAgICAgbmFtZSA9IGlkLnBhcnRzWzBdO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdpbnZva2VLbm93bkhlbHBlcicsIHBhcmFtcy5sZW5ndGgsIG5hbWUpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3Ugc3BlY2lmaWVkIGtub3duSGVscGVyc09ubHksIGJ1dCB1c2VkIHRoZSB1bmtub3duIGhlbHBlciBcIiArIG5hbWUsIHNleHByKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5JRChpZCk7XG4gICAgICB0aGlzLm9wY29kZSgnaW52b2tlSGVscGVyJywgcGFyYW1zLmxlbmd0aCwgbmFtZSwgc2V4cHIuaXNSb290KTtcbiAgICB9XG4gIH0sXG5cbiAgc2V4cHI6IGZ1bmN0aW9uKHNleHByKSB7XG4gICAgdmFyIHR5cGUgPSB0aGlzLmNsYXNzaWZ5U2V4cHIoc2V4cHIpO1xuXG4gICAgaWYgKHR5cGUgPT09IFwic2ltcGxlXCIpIHtcbiAgICAgIHRoaXMuc2ltcGxlU2V4cHIoc2V4cHIpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gXCJoZWxwZXJcIikge1xuICAgICAgdGhpcy5oZWxwZXJTZXhwcihzZXhwcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYW1iaWd1b3VzU2V4cHIoc2V4cHIpO1xuICAgIH1cbiAgfSxcblxuICBJRDogZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLmFkZERlcHRoKGlkLmRlcHRoKTtcbiAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIGlkLmRlcHRoKTtcblxuICAgIHZhciBuYW1lID0gaWQucGFydHNbMF07XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICB0aGlzLm9wY29kZSgncHVzaENvbnRleHQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vcGNvZGUoJ2xvb2t1cE9uQ29udGV4dCcsIGlkLnBhcnRzWzBdKTtcbiAgICB9XG5cbiAgICBmb3IodmFyIGk9MSwgbD1pZC5wYXJ0cy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwJywgaWQucGFydHNbaV0pO1xuICAgIH1cbiAgfSxcblxuICBEQVRBOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdGhpcy5vcHRpb25zLmRhdGEgPSB0cnVlO1xuICAgIHRoaXMub3Bjb2RlKCdsb29rdXBEYXRhJywgZGF0YS5pZC5kZXB0aCk7XG4gICAgdmFyIHBhcnRzID0gZGF0YS5pZC5wYXJ0cztcbiAgICBmb3IodmFyIGk9MCwgbD1wYXJ0cy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgICB0aGlzLm9wY29kZSgnbG9va3VwJywgcGFydHNbaV0pO1xuICAgIH1cbiAgfSxcblxuICBTVFJJTkc6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHRoaXMub3Bjb2RlKCdwdXNoU3RyaW5nJywgc3RyaW5nLnN0cmluZyk7XG4gIH0sXG5cbiAgTlVNQkVSOiBmdW5jdGlvbihudW1iZXIpIHtcbiAgICB0aGlzLm9wY29kZSgncHVzaExpdGVyYWwnLCBudW1iZXIubnVtYmVyKTtcbiAgfSxcblxuICBCT09MRUFOOiBmdW5jdGlvbihib29sKSB7XG4gICAgdGhpcy5vcGNvZGUoJ3B1c2hMaXRlcmFsJywgYm9vbC5ib29sKTtcbiAgfSxcblxuICBjb21tZW50OiBmdW5jdGlvbigpIHt9LFxuXG4gIC8vIEhFTFBFUlNcbiAgb3Bjb2RlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdGhpcy5vcGNvZGVzLnB1c2goeyBvcGNvZGU6IG5hbWUsIGFyZ3M6IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSB9KTtcbiAgfSxcblxuICBkZWNsYXJlOiBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMub3Bjb2Rlcy5wdXNoKHsgb3Bjb2RlOiAnREVDTEFSRScsIG5hbWU6IG5hbWUsIHZhbHVlOiB2YWx1ZSB9KTtcbiAgfSxcblxuICBhZGREZXB0aDogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICBpZihkZXB0aCA9PT0gMCkgeyByZXR1cm47IH1cblxuICAgIGlmKCF0aGlzLmRlcHRoc1tkZXB0aF0pIHtcbiAgICAgIHRoaXMuZGVwdGhzW2RlcHRoXSA9IHRydWU7XG4gICAgICB0aGlzLmRlcHRocy5saXN0LnB1c2goZGVwdGgpO1xuICAgIH1cbiAgfSxcblxuICBjbGFzc2lmeVNleHByOiBmdW5jdGlvbihzZXhwcikge1xuICAgIHZhciBpc0hlbHBlciAgID0gc2V4cHIuaXNIZWxwZXI7XG4gICAgdmFyIGlzRWxpZ2libGUgPSBzZXhwci5lbGlnaWJsZUhlbHBlcjtcbiAgICB2YXIgb3B0aW9ucyAgICA9IHRoaXMub3B0aW9ucztcblxuICAgIC8vIGlmIGFtYmlndW91cywgd2UgY2FuIHBvc3NpYmx5IHJlc29sdmUgdGhlIGFtYmlndWl0eSBub3dcbiAgICAvLyBBbiBlbGlnaWJsZSBoZWxwZXIgaXMgb25lIHRoYXQgZG9lcyBub3QgaGF2ZSBhIGNvbXBsZXggcGF0aCwgaS5lLiBgdGhpcy5mb29gLCBgLi4vZm9vYCBldGMuXG4gICAgaWYgKGlzRWxpZ2libGUgJiYgIWlzSGVscGVyKSB7XG4gICAgICB2YXIgbmFtZSA9IHNleHByLmlkLnBhcnRzWzBdO1xuXG4gICAgICBpZiAob3B0aW9ucy5rbm93bkhlbHBlcnNbbmFtZV0pIHtcbiAgICAgICAgaXNIZWxwZXIgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChvcHRpb25zLmtub3duSGVscGVyc09ubHkpIHtcbiAgICAgICAgaXNFbGlnaWJsZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc0hlbHBlcikgeyByZXR1cm4gXCJoZWxwZXJcIjsgfVxuICAgIGVsc2UgaWYgKGlzRWxpZ2libGUpIHsgcmV0dXJuIFwiYW1iaWd1b3VzXCI7IH1cbiAgICBlbHNlIHsgcmV0dXJuIFwic2ltcGxlXCI7IH1cbiAgfSxcblxuICBwdXNoUGFyYW1zOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICBmb3IodmFyIGk9MCwgbD1wYXJhbXMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgdGhpcy5wdXNoUGFyYW0ocGFyYW1zW2ldKTtcbiAgICB9XG4gIH0sXG5cbiAgcHVzaFBhcmFtOiBmdW5jdGlvbih2YWwpIHtcbiAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIGlmKHZhbC5kZXB0aCkge1xuICAgICAgICB0aGlzLmFkZERlcHRoKHZhbC5kZXB0aCk7XG4gICAgICB9XG4gICAgICB0aGlzLm9wY29kZSgnZ2V0Q29udGV4dCcsIHZhbC5kZXB0aCB8fCAwKTtcbiAgICAgIHRoaXMub3Bjb2RlKCdwdXNoU3RyaW5nUGFyYW0nLCB2YWwuc3RyaW5nTW9kZVZhbHVlLCB2YWwudHlwZSk7XG5cbiAgICAgIGlmICh2YWwudHlwZSA9PT0gJ3NleHByJykge1xuICAgICAgICAvLyBTdWJleHByZXNzaW9ucyBnZXQgZXZhbHVhdGVkIGFuZCBwYXNzZWQgaW5cbiAgICAgICAgLy8gaW4gc3RyaW5nIHBhcmFtcyBtb2RlLlxuICAgICAgICB0aGlzLnNleHByKHZhbCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICAgIHRoaXMub3Bjb2RlKCdwdXNoSWQnLCB2YWwudHlwZSwgdmFsLmlkTmFtZSB8fCB2YWwuc3RyaW5nTW9kZVZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYWNjZXB0KHZhbCk7XG4gICAgfVxuICB9LFxuXG4gIHNldHVwRnVsbE11c3RhY2hlUGFyYW1zOiBmdW5jdGlvbihzZXhwciwgcHJvZ3JhbSwgaW52ZXJzZSkge1xuICAgIHZhciBwYXJhbXMgPSBzZXhwci5wYXJhbXM7XG4gICAgdGhpcy5wdXNoUGFyYW1zKHBhcmFtcyk7XG5cbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBwcm9ncmFtKTtcbiAgICB0aGlzLm9wY29kZSgncHVzaFByb2dyYW0nLCBpbnZlcnNlKTtcblxuICAgIGlmIChzZXhwci5oYXNoKSB7XG4gICAgICB0aGlzLmhhc2goc2V4cHIuaGFzaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3Bjb2RlKCdlbXB0eUhhc2gnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9XG59O1xuXG5mdW5jdGlvbiBwcmVjb21waWxlKGlucHV0LCBvcHRpb25zLCBlbnYpIHtcbiAgaWYgKGlucHV0ID09IG51bGwgfHwgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycgJiYgaW5wdXQuY29uc3RydWN0b3IgIT09IGVudi5BU1QuUHJvZ3JhbU5vZGUpKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIllvdSBtdXN0IHBhc3MgYSBzdHJpbmcgb3IgSGFuZGxlYmFycyBBU1QgdG8gSGFuZGxlYmFycy5wcmVjb21waWxlLiBZb3UgcGFzc2VkIFwiICsgaW5wdXQpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGlmICghKCdkYXRhJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZGF0YSA9IHRydWU7XG4gIH1cblxuICB2YXIgYXN0ID0gZW52LnBhcnNlKGlucHV0KTtcbiAgdmFyIGVudmlyb25tZW50ID0gbmV3IGVudi5Db21waWxlcigpLmNvbXBpbGUoYXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIG5ldyBlbnYuSmF2YVNjcmlwdENvbXBpbGVyKCkuY29tcGlsZShlbnZpcm9ubWVudCwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydHMucHJlY29tcGlsZSA9IHByZWNvbXBpbGU7ZnVuY3Rpb24gY29tcGlsZShpbnB1dCwgb3B0aW9ucywgZW52KSB7XG4gIGlmIChpbnB1dCA9PSBudWxsIHx8ICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnICYmIGlucHV0LmNvbnN0cnVjdG9yICE9PSBlbnYuQVNULlByb2dyYW1Ob2RlKSkge1xuICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJZb3UgbXVzdCBwYXNzIGEgc3RyaW5nIG9yIEhhbmRsZWJhcnMgQVNUIHRvIEhhbmRsZWJhcnMuY29tcGlsZS4gWW91IHBhc3NlZCBcIiArIGlucHV0KTtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmICghKCdkYXRhJyBpbiBvcHRpb25zKSkge1xuICAgIG9wdGlvbnMuZGF0YSA9IHRydWU7XG4gIH1cblxuICB2YXIgY29tcGlsZWQ7XG5cbiAgZnVuY3Rpb24gY29tcGlsZUlucHV0KCkge1xuICAgIHZhciBhc3QgPSBlbnYucGFyc2UoaW5wdXQpO1xuICAgIHZhciBlbnZpcm9ubWVudCA9IG5ldyBlbnYuQ29tcGlsZXIoKS5jb21waWxlKGFzdCwgb3B0aW9ucyk7XG4gICAgdmFyIHRlbXBsYXRlU3BlYyA9IG5ldyBlbnYuSmF2YVNjcmlwdENvbXBpbGVyKCkuY29tcGlsZShlbnZpcm9ubWVudCwgb3B0aW9ucywgdW5kZWZpbmVkLCB0cnVlKTtcbiAgICByZXR1cm4gZW52LnRlbXBsYXRlKHRlbXBsYXRlU3BlYyk7XG4gIH1cblxuICAvLyBUZW1wbGF0ZSBpcyBvbmx5IGNvbXBpbGVkIG9uIGZpcnN0IHVzZSBhbmQgY2FjaGVkIGFmdGVyIHRoYXQgcG9pbnQuXG4gIHZhciByZXQgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFjb21waWxlZCkge1xuICAgICAgY29tcGlsZWQgPSBjb21waWxlSW5wdXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBpbGVkLmNhbGwodGhpcywgY29udGV4dCwgb3B0aW9ucyk7XG4gIH07XG4gIHJldC5jaGlsZCA9IGZ1bmN0aW9uKGkpIHtcbiAgICBpZiAoIWNvbXBpbGVkKSB7XG4gICAgICBjb21waWxlZCA9IGNvbXBpbGVJbnB1dCgpO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGlsZWQuY2hpbGQoaSk7XG4gIH07XG4gIHJldHVybiByZXQ7XG59XG5cbmV4cG9ydHMuY29tcGlsZSA9IGNvbXBpbGU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQ09NUElMRVJfUkVWSVNJT04gPSByZXF1aXJlKFwiLi4vYmFzZVwiKS5DT01QSUxFUl9SRVZJU0lPTjtcbnZhciBSRVZJU0lPTl9DSEFOR0VTID0gcmVxdWlyZShcIi4uL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcbnZhciBsb2cgPSByZXF1aXJlKFwiLi4vYmFzZVwiKS5sb2c7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4uL2V4Y2VwdGlvblwiKVtcImRlZmF1bHRcIl07XG5cbmZ1bmN0aW9uIExpdGVyYWwodmFsdWUpIHtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBKYXZhU2NyaXB0Q29tcGlsZXIoKSB7fVxuXG5KYXZhU2NyaXB0Q29tcGlsZXIucHJvdG90eXBlID0ge1xuICAvLyBQVUJMSUMgQVBJOiBZb3UgY2FuIG92ZXJyaWRlIHRoZXNlIG1ldGhvZHMgaW4gYSBzdWJjbGFzcyB0byBwcm92aWRlXG4gIC8vIGFsdGVybmF0aXZlIGNvbXBpbGVkIGZvcm1zIGZvciBuYW1lIGxvb2t1cCBhbmQgYnVmZmVyaW5nIHNlbWFudGljc1xuICBuYW1lTG9va3VwOiBmdW5jdGlvbihwYXJlbnQsIG5hbWUgLyogLCB0eXBlKi8pIHtcbiAgICB2YXIgd3JhcCxcbiAgICAgICAgcmV0O1xuICAgIGlmIChwYXJlbnQuaW5kZXhPZignZGVwdGgnKSA9PT0gMCkge1xuICAgICAgd3JhcCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKEphdmFTY3JpcHRDb21waWxlci5pc1ZhbGlkSmF2YVNjcmlwdFZhcmlhYmxlTmFtZShuYW1lKSkge1xuICAgICAgcmV0ID0gcGFyZW50ICsgXCIuXCIgKyBuYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXQgPSBwYXJlbnQgKyBcIlsnXCIgKyBuYW1lICsgXCInXVwiO1xuICAgIH1cblxuICAgIGlmICh3cmFwKSB7XG4gICAgICByZXR1cm4gJygnICsgcGFyZW50ICsgJyAmJiAnICsgcmV0ICsgJyknO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH1cbiAgfSxcblxuICBjb21waWxlckluZm86IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXZpc2lvbiA9IENPTVBJTEVSX1JFVklTSU9OLFxuICAgICAgICB2ZXJzaW9ucyA9IFJFVklTSU9OX0NIQU5HRVNbcmV2aXNpb25dO1xuICAgIHJldHVybiBbcmV2aXNpb24sIHZlcnNpb25zXTtcbiAgfSxcblxuICBhcHBlbmRUb0J1ZmZlcjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHJldHVybiBcInJldHVybiBcIiArIHN0cmluZyArIFwiO1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhcHBlbmRUb0J1ZmZlcjogdHJ1ZSxcbiAgICAgICAgY29udGVudDogc3RyaW5nLFxuICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiBcImJ1ZmZlciArPSBcIiArIHN0cmluZyArIFwiO1wiOyB9XG4gICAgICB9O1xuICAgIH1cbiAgfSxcblxuICBpbml0aWFsaXplQnVmZmVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdW90ZWRTdHJpbmcoXCJcIik7XG4gIH0sXG5cbiAgbmFtZXNwYWNlOiBcIkhhbmRsZWJhcnNcIixcbiAgLy8gRU5EIFBVQkxJQyBBUElcblxuICBjb21waWxlOiBmdW5jdGlvbihlbnZpcm9ubWVudCwgb3B0aW9ucywgY29udGV4dCwgYXNPYmplY3QpIHtcbiAgICB0aGlzLmVudmlyb25tZW50ID0gZW52aXJvbm1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLnN0cmluZ1BhcmFtcyA9IHRoaXMub3B0aW9ucy5zdHJpbmdQYXJhbXM7XG4gICAgdGhpcy50cmFja0lkcyA9IHRoaXMub3B0aW9ucy50cmFja0lkcztcbiAgICB0aGlzLnByZWNvbXBpbGUgPSAhYXNPYmplY3Q7XG5cbiAgICBsb2coJ2RlYnVnJywgdGhpcy5lbnZpcm9ubWVudC5kaXNhc3NlbWJsZSgpICsgXCJcXG5cXG5cIik7XG5cbiAgICB0aGlzLm5hbWUgPSB0aGlzLmVudmlyb25tZW50Lm5hbWU7XG4gICAgdGhpcy5pc0NoaWxkID0gISFjb250ZXh0O1xuICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQgfHwge1xuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgZW52aXJvbm1lbnRzOiBbXVxuICAgIH07XG5cbiAgICB0aGlzLnByZWFtYmxlKCk7XG5cbiAgICB0aGlzLnN0YWNrU2xvdCA9IDA7XG4gICAgdGhpcy5zdGFja1ZhcnMgPSBbXTtcbiAgICB0aGlzLmFsaWFzZXMgPSB7fTtcbiAgICB0aGlzLnJlZ2lzdGVycyA9IHsgbGlzdDogW10gfTtcbiAgICB0aGlzLmhhc2hlcyA9IFtdO1xuICAgIHRoaXMuY29tcGlsZVN0YWNrID0gW107XG4gICAgdGhpcy5pbmxpbmVTdGFjayA9IFtdO1xuXG4gICAgdGhpcy5jb21waWxlQ2hpbGRyZW4oZW52aXJvbm1lbnQsIG9wdGlvbnMpO1xuXG4gICAgdmFyIG9wY29kZXMgPSBlbnZpcm9ubWVudC5vcGNvZGVzLFxuICAgICAgICBvcGNvZGUsXG4gICAgICAgIGksXG4gICAgICAgIGw7XG5cbiAgICBmb3IgKGkgPSAwLCBsID0gb3Bjb2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIG9wY29kZSA9IG9wY29kZXNbaV07XG5cbiAgICAgIGlmKG9wY29kZS5vcGNvZGUgPT09ICdERUNMQVJFJykge1xuICAgICAgICB0aGlzW29wY29kZS5uYW1lXSA9IG9wY29kZS52YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXNbb3Bjb2RlLm9wY29kZV0uYXBwbHkodGhpcywgb3Bjb2RlLmFyZ3MpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXNldCB0aGUgc3RyaXBOZXh0IGZsYWcgaWYgaXQgd2FzIG5vdCBzZXQgYnkgdGhpcyBvcGVyYXRpb24uXG4gICAgICBpZiAob3Bjb2RlLm9wY29kZSAhPT0gdGhpcy5zdHJpcE5leHQpIHtcbiAgICAgICAgdGhpcy5zdHJpcE5leHQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGbHVzaCBhbnkgdHJhaWxpbmcgY29udGVudCB0aGF0IG1pZ2h0IGJlIHBlbmRpbmcuXG4gICAgdGhpcy5wdXNoU291cmNlKCcnKTtcblxuICAgIGlmICh0aGlzLnN0YWNrU2xvdCB8fCB0aGlzLmlubGluZVN0YWNrLmxlbmd0aCB8fCB0aGlzLmNvbXBpbGVTdGFjay5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oJ0NvbXBpbGUgY29tcGxldGVkIHdpdGggY29udGVudCBsZWZ0IG9uIHN0YWNrJyk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gdGhpcy5jcmVhdGVGdW5jdGlvbkNvbnRleHQoYXNPYmplY3QpO1xuICAgIGlmICghdGhpcy5pc0NoaWxkKSB7XG4gICAgICB2YXIgcmV0ID0ge1xuICAgICAgICBjb21waWxlcjogdGhpcy5jb21waWxlckluZm8oKSxcbiAgICAgICAgbWFpbjogZm5cbiAgICAgIH07XG4gICAgICB2YXIgcHJvZ3JhbXMgPSB0aGlzLmNvbnRleHQucHJvZ3JhbXM7XG4gICAgICBmb3IgKGkgPSAwLCBsID0gcHJvZ3JhbXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmIChwcm9ncmFtc1tpXSkge1xuICAgICAgICAgIHJldFtpXSA9IHByb2dyYW1zW2ldO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmVudmlyb25tZW50LnVzZVBhcnRpYWwpIHtcbiAgICAgICAgcmV0LnVzZVBhcnRpYWwgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5kYXRhKSB7XG4gICAgICAgIHJldC51c2VEYXRhID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFhc09iamVjdCkge1xuICAgICAgICByZXQuY29tcGlsZXIgPSBKU09OLnN0cmluZ2lmeShyZXQuY29tcGlsZXIpO1xuICAgICAgICByZXQgPSB0aGlzLm9iamVjdExpdGVyYWwocmV0KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZuO1xuICAgIH1cbiAgfSxcblxuICBwcmVhbWJsZTogZnVuY3Rpb24oKSB7XG4gICAgLy8gdHJhY2sgdGhlIGxhc3QgY29udGV4dCBwdXNoZWQgaW50byBwbGFjZSB0byBhbGxvdyBza2lwcGluZyB0aGVcbiAgICAvLyBnZXRDb250ZXh0IG9wY29kZSB3aGVuIGl0IHdvdWxkIGJlIGEgbm9vcFxuICAgIHRoaXMubGFzdENvbnRleHQgPSAwO1xuICAgIHRoaXMuc291cmNlID0gW107XG4gIH0sXG5cbiAgY3JlYXRlRnVuY3Rpb25Db250ZXh0OiBmdW5jdGlvbihhc09iamVjdCkge1xuICAgIHZhciB2YXJEZWNsYXJhdGlvbnMgPSAnJztcblxuICAgIHZhciBsb2NhbHMgPSB0aGlzLnN0YWNrVmFycy5jb25jYXQodGhpcy5yZWdpc3RlcnMubGlzdCk7XG4gICAgaWYobG9jYWxzLmxlbmd0aCA+IDApIHtcbiAgICAgIHZhckRlY2xhcmF0aW9ucyArPSBcIiwgXCIgKyBsb2NhbHMuam9pbihcIiwgXCIpO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIG1pbmltaXplciBhbGlhcyBtYXBwaW5nc1xuICAgIGZvciAodmFyIGFsaWFzIGluIHRoaXMuYWxpYXNlcykge1xuICAgICAgaWYgKHRoaXMuYWxpYXNlcy5oYXNPd25Qcm9wZXJ0eShhbGlhcykpIHtcbiAgICAgICAgdmFyRGVjbGFyYXRpb25zICs9ICcsICcgKyBhbGlhcyArICc9JyArIHRoaXMuYWxpYXNlc1thbGlhc107XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IFtcImRlcHRoMFwiLCBcImhlbHBlcnNcIiwgXCJwYXJ0aWFsc1wiLCBcImRhdGFcIl07XG5cbiAgICBmb3IodmFyIGk9MCwgbD10aGlzLmVudmlyb25tZW50LmRlcHRocy5saXN0Lmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgICAgIHBhcmFtcy5wdXNoKFwiZGVwdGhcIiArIHRoaXMuZW52aXJvbm1lbnQuZGVwdGhzLmxpc3RbaV0pO1xuICAgIH1cblxuICAgIC8vIFBlcmZvcm0gYSBzZWNvbmQgcGFzcyBvdmVyIHRoZSBvdXRwdXQgdG8gbWVyZ2UgY29udGVudCB3aGVuIHBvc3NpYmxlXG4gICAgdmFyIHNvdXJjZSA9IHRoaXMubWVyZ2VTb3VyY2UodmFyRGVjbGFyYXRpb25zKTtcblxuICAgIGlmIChhc09iamVjdCkge1xuICAgICAgcGFyYW1zLnB1c2goc291cmNlKTtcblxuICAgICAgcmV0dXJuIEZ1bmN0aW9uLmFwcGx5KHRoaXMsIHBhcmFtcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiAnZnVuY3Rpb24oJyArIHBhcmFtcy5qb2luKCcsJykgKyAnKSB7XFxuICAnICsgc291cmNlICsgJ30nO1xuICAgIH1cbiAgfSxcbiAgbWVyZ2VTb3VyY2U6IGZ1bmN0aW9uKHZhckRlY2xhcmF0aW9ucykge1xuICAgIHZhciBzb3VyY2UgPSAnJyxcbiAgICAgICAgYnVmZmVyLFxuICAgICAgICBhcHBlbmRPbmx5ID0gIXRoaXMuZm9yY2VCdWZmZXIsXG4gICAgICAgIGFwcGVuZEZpcnN0O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgbGluZSA9IHRoaXMuc291cmNlW2ldO1xuICAgICAgaWYgKGxpbmUuYXBwZW5kVG9CdWZmZXIpIHtcbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgIGJ1ZmZlciA9IGJ1ZmZlciArICdcXG4gICAgKyAnICsgbGluZS5jb250ZW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJ1ZmZlciA9IGxpbmUuY29udGVudDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgIGlmICghc291cmNlKSB7XG4gICAgICAgICAgICBhcHBlbmRGaXJzdCA9IHRydWU7XG4gICAgICAgICAgICBzb3VyY2UgPSBidWZmZXIgKyAnO1xcbiAgJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291cmNlICs9ICdidWZmZXIgKz0gJyArIGJ1ZmZlciArICc7XFxuICAnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBidWZmZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgc291cmNlICs9IGxpbmUgKyAnXFxuICAnO1xuXG4gICAgICAgIGlmICghdGhpcy5lbnZpcm9ubWVudC5pc1NpbXBsZSkge1xuICAgICAgICAgIGFwcGVuZE9ubHkgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhcHBlbmRPbmx5KSB7XG4gICAgICBpZiAoYnVmZmVyIHx8ICFzb3VyY2UpIHtcbiAgICAgICAgc291cmNlICs9ICdyZXR1cm4gJyArIChidWZmZXIgfHwgJ1wiXCInKSArICc7XFxuJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyRGVjbGFyYXRpb25zICs9IFwiLCBidWZmZXIgPSBcIiArIChhcHBlbmRGaXJzdCA/ICcnIDogdGhpcy5pbml0aWFsaXplQnVmZmVyKCkpO1xuICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICBzb3VyY2UgKz0gJ3JldHVybiBidWZmZXIgKyAnICsgYnVmZmVyICsgJztcXG4nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc291cmNlICs9ICdyZXR1cm4gYnVmZmVyO1xcbic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHZhckRlY2xhcmF0aW9ucykge1xuICAgICAgc291cmNlID0gJ3ZhciAnICsgdmFyRGVjbGFyYXRpb25zLnN1YnN0cmluZygyKSArIChhcHBlbmRGaXJzdCA/ICcnIDogJztcXG4gICcpICsgc291cmNlO1xuICAgIH1cblxuICAgIHJldHVybiBzb3VyY2U7XG4gIH0sXG5cbiAgLy8gW2Jsb2NrVmFsdWVdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHZhbHVlXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmV0dXJuIHZhbHVlIG9mIGJsb2NrSGVscGVyTWlzc2luZ1xuICAvL1xuICAvLyBUaGUgcHVycG9zZSBvZiB0aGlzIG9wY29kZSBpcyB0byB0YWtlIGEgYmxvY2sgb2YgdGhlIGZvcm1cbiAgLy8gYHt7I3RoaXMuZm9vfX0uLi57ey90aGlzLmZvb319YCwgcmVzb2x2ZSB0aGUgdmFsdWUgb2YgYGZvb2AsIGFuZFxuICAvLyByZXBsYWNlIGl0IG9uIHRoZSBzdGFjayB3aXRoIHRoZSByZXN1bHQgb2YgcHJvcGVybHlcbiAgLy8gaW52b2tpbmcgYmxvY2tIZWxwZXJNaXNzaW5nLlxuICBibG9ja1ZhbHVlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdGhpcy5hbGlhc2VzLmJsb2NrSGVscGVyTWlzc2luZyA9ICdoZWxwZXJzLmJsb2NrSGVscGVyTWlzc2luZyc7XG5cbiAgICB2YXIgcGFyYW1zID0gW1wiZGVwdGgwXCJdO1xuICAgIHRoaXMuc2V0dXBQYXJhbXMobmFtZSwgMCwgcGFyYW1zKTtcblxuICAgIHRoaXMucmVwbGFjZVN0YWNrKGZ1bmN0aW9uKGN1cnJlbnQpIHtcbiAgICAgIHBhcmFtcy5zcGxpY2UoMSwgMCwgY3VycmVudCk7XG4gICAgICByZXR1cm4gXCJibG9ja0hlbHBlck1pc3NpbmcuY2FsbChcIiArIHBhcmFtcy5qb2luKFwiLCBcIikgKyBcIilcIjtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBbYW1iaWd1b3VzQmxvY2tWYWx1ZV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgdmFsdWVcbiAgLy8gQ29tcGlsZXIgdmFsdWUsIGJlZm9yZTogbGFzdEhlbHBlcj12YWx1ZSBvZiBsYXN0IGZvdW5kIGhlbHBlciwgaWYgYW55XG4gIC8vIE9uIHN0YWNrLCBhZnRlciwgaWYgbm8gbGFzdEhlbHBlcjogc2FtZSBhcyBbYmxvY2tWYWx1ZV1cbiAgLy8gT24gc3RhY2ssIGFmdGVyLCBpZiBsYXN0SGVscGVyOiB2YWx1ZVxuICBhbWJpZ3VvdXNCbG9ja1ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmFsaWFzZXMuYmxvY2tIZWxwZXJNaXNzaW5nID0gJ2hlbHBlcnMuYmxvY2tIZWxwZXJNaXNzaW5nJztcblxuICAgIC8vIFdlJ3JlIGJlaW5nIGEgYml0IGNoZWVreSBhbmQgcmV1c2luZyB0aGUgb3B0aW9ucyB2YWx1ZSBmcm9tIHRoZSBwcmlvciBleGVjXG4gICAgdmFyIHBhcmFtcyA9IFtcImRlcHRoMFwiXTtcbiAgICB0aGlzLnNldHVwUGFyYW1zKCcnLCAwLCBwYXJhbXMsIHRydWUpO1xuXG4gICAgdGhpcy5mbHVzaElubGluZSgpO1xuXG4gICAgdmFyIGN1cnJlbnQgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgcGFyYW1zLnNwbGljZSgxLCAwLCBjdXJyZW50KTtcblxuICAgIHRoaXMucHVzaFNvdXJjZShcImlmICghXCIgKyB0aGlzLmxhc3RIZWxwZXIgKyBcIikgeyBcIiArIGN1cnJlbnQgKyBcIiA9IGJsb2NrSGVscGVyTWlzc2luZy5jYWxsKFwiICsgcGFyYW1zLmpvaW4oXCIsIFwiKSArIFwiKTsgfVwiKTtcbiAgfSxcblxuICAvLyBbYXBwZW5kQ29udGVudF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIEFwcGVuZHMgdGhlIHN0cmluZyB2YWx1ZSBvZiBgY29udGVudGAgdG8gdGhlIGN1cnJlbnQgYnVmZmVyXG4gIGFwcGVuZENvbnRlbnQ6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xuICAgICAgY29udGVudCA9IHRoaXMucGVuZGluZ0NvbnRlbnQgKyBjb250ZW50O1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJpcE5leHQpIHtcbiAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL15cXHMrLywgJycpO1xuICAgIH1cblxuICAgIHRoaXMucGVuZGluZ0NvbnRlbnQgPSBjb250ZW50O1xuICB9LFxuXG4gIC8vIFtzdHJpcF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIFJlbW92ZXMgYW55IHRyYWlsaW5nIHdoaXRlc3BhY2UgZnJvbSB0aGUgcHJpb3IgY29udGVudCBub2RlIGFuZCBmbGFnc1xuICAvLyB0aGUgbmV4dCBvcGVyYXRpb24gZm9yIHN0cmlwcGluZyBpZiBpdCBpcyBhIGNvbnRlbnQgbm9kZS5cbiAgc3RyaXA6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBlbmRpbmdDb250ZW50KSB7XG4gICAgICB0aGlzLnBlbmRpbmdDb250ZW50ID0gdGhpcy5wZW5kaW5nQ29udGVudC5yZXBsYWNlKC9cXHMrJC8sICcnKTtcbiAgICB9XG4gICAgdGhpcy5zdHJpcE5leHQgPSAnc3RyaXAnO1xuICB9LFxuXG4gIC8vIFthcHBlbmRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiAuLi5cbiAgLy9cbiAgLy8gQ29lcmNlcyBgdmFsdWVgIHRvIGEgU3RyaW5nIGFuZCBhcHBlbmRzIGl0IHRvIHRoZSBjdXJyZW50IGJ1ZmZlci5cbiAgLy9cbiAgLy8gSWYgYHZhbHVlYCBpcyB0cnV0aHksIG9yIDAsIGl0IGlzIGNvZXJjZWQgaW50byBhIHN0cmluZyBhbmQgYXBwZW5kZWRcbiAgLy8gT3RoZXJ3aXNlLCB0aGUgZW1wdHkgc3RyaW5nIGlzIGFwcGVuZGVkXG4gIGFwcGVuZDogZnVuY3Rpb24oKSB7XG4gICAgLy8gRm9yY2UgYW55dGhpbmcgdGhhdCBpcyBpbmxpbmVkIG9udG8gdGhlIHN0YWNrIHNvIHdlIGRvbid0IGhhdmUgZHVwbGljYXRpb25cbiAgICAvLyB3aGVuIHdlIGV4YW1pbmUgbG9jYWxcbiAgICB0aGlzLmZsdXNoSW5saW5lKCk7XG4gICAgdmFyIGxvY2FsID0gdGhpcy5wb3BTdGFjaygpO1xuICAgIHRoaXMucHVzaFNvdXJjZShcImlmKFwiICsgbG9jYWwgKyBcIiB8fCBcIiArIGxvY2FsICsgXCIgPT09IDApIHsgXCIgKyB0aGlzLmFwcGVuZFRvQnVmZmVyKGxvY2FsKSArIFwiIH1cIik7XG4gICAgaWYgKHRoaXMuZW52aXJvbm1lbnQuaXNTaW1wbGUpIHtcbiAgICAgIHRoaXMucHVzaFNvdXJjZShcImVsc2UgeyBcIiArIHRoaXMuYXBwZW5kVG9CdWZmZXIoXCInJ1wiKSArIFwiIH1cIik7XG4gICAgfVxuICB9LFxuXG4gIC8vIFthcHBlbmRFc2NhcGVkXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vXG4gIC8vIEVzY2FwZSBgdmFsdWVgIGFuZCBhcHBlbmQgaXQgdG8gdGhlIGJ1ZmZlclxuICBhcHBlbmRFc2NhcGVkOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmFsaWFzZXMuZXNjYXBlRXhwcmVzc2lvbiA9ICd0aGlzLmVzY2FwZUV4cHJlc3Npb24nO1xuXG4gICAgdGhpcy5wdXNoU291cmNlKHRoaXMuYXBwZW5kVG9CdWZmZXIoXCJlc2NhcGVFeHByZXNzaW9uKFwiICsgdGhpcy5wb3BTdGFjaygpICsgXCIpXCIpKTtcbiAgfSxcblxuICAvLyBbZ2V0Q29udGV4dF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uXG4gIC8vIENvbXBpbGVyIHZhbHVlLCBhZnRlcjogbGFzdENvbnRleHQ9ZGVwdGhcbiAgLy9cbiAgLy8gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgYGxhc3RDb250ZXh0YCBjb21waWxlciB2YWx1ZSB0byB0aGUgZGVwdGhcbiAgZ2V0Q29udGV4dDogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICBpZih0aGlzLmxhc3RDb250ZXh0ICE9PSBkZXB0aCkge1xuICAgICAgdGhpcy5sYXN0Q29udGV4dCA9IGRlcHRoO1xuICAgIH1cbiAgfSxcblxuICAvLyBbbG9va3VwT25Db250ZXh0XVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBjdXJyZW50Q29udGV4dFtuYW1lXSwgLi4uXG4gIC8vXG4gIC8vIExvb2tzIHVwIHRoZSB2YWx1ZSBvZiBgbmFtZWAgb24gdGhlIGN1cnJlbnQgY29udGV4dCBhbmQgcHVzaGVzXG4gIC8vIGl0IG9udG8gdGhlIHN0YWNrLlxuICBsb29rdXBPbkNvbnRleHQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLnB1c2godGhpcy5uYW1lTG9va3VwKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0LCBuYW1lLCAnY29udGV4dCcpKTtcbiAgfSxcblxuICAvLyBbcHVzaENvbnRleHRdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGN1cnJlbnRDb250ZXh0LCAuLi5cbiAgLy9cbiAgLy8gUHVzaGVzIHRoZSB2YWx1ZSBvZiB0aGUgY3VycmVudCBjb250ZXh0IG9udG8gdGhlIHN0YWNrLlxuICBwdXNoQ29udGV4dDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0KTtcbiAgfSxcblxuICAvLyBbcmVzb2x2ZVBvc3NpYmxlTGFtYmRhXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiB2YWx1ZSwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzb2x2ZWQgdmFsdWUsIC4uLlxuICAvL1xuICAvLyBJZiB0aGUgYHZhbHVlYCBpcyBhIGxhbWJkYSwgcmVwbGFjZSBpdCBvbiB0aGUgc3RhY2sgYnlcbiAgLy8gdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgbGFtYmRhXG4gIHJlc29sdmVQb3NzaWJsZUxhbWJkYTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5hbGlhc2VzLmZ1bmN0aW9uVHlwZSA9ICdcImZ1bmN0aW9uXCInO1xuXG4gICAgdGhpcy5yZXBsYWNlU3RhY2soZnVuY3Rpb24oY3VycmVudCkge1xuICAgICAgcmV0dXJuIFwidHlwZW9mIFwiICsgY3VycmVudCArIFwiID09PSBmdW5jdGlvblR5cGUgPyBcIiArIGN1cnJlbnQgKyBcIi5hcHBseShkZXB0aDApIDogXCIgKyBjdXJyZW50O1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFtsb29rdXBdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IHZhbHVlLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiB2YWx1ZVtuYW1lXSwgLi4uXG4gIC8vXG4gIC8vIFJlcGxhY2UgdGhlIHZhbHVlIG9uIHRoZSBzdGFjayB3aXRoIHRoZSByZXN1bHQgb2YgbG9va2luZ1xuICAvLyB1cCBgbmFtZWAgb24gYHZhbHVlYFxuICBsb29rdXA6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB0aGlzLnJlcGxhY2VTdGFjayhmdW5jdGlvbihjdXJyZW50KSB7XG4gICAgICByZXR1cm4gY3VycmVudCArIFwiID09IG51bGwgfHwgXCIgKyBjdXJyZW50ICsgXCIgPT09IGZhbHNlID8gXCIgKyBjdXJyZW50ICsgXCIgOiBcIiArIHRoaXMubmFtZUxvb2t1cChjdXJyZW50LCBuYW1lLCAnY29udGV4dCcpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFtsb29rdXBEYXRhXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBkYXRhLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCB0aGUgZGF0YSBsb29rdXAgb3BlcmF0b3JcbiAgbG9va3VwRGF0YTogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICBpZiAoIWRlcHRoKSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ2RhdGEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCd0aGlzLmRhdGEoZGF0YSwgJyArIGRlcHRoICsgJyknKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gW3B1c2hTdHJpbmdQYXJhbV1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogc3RyaW5nLCBjdXJyZW50Q29udGV4dCwgLi4uXG4gIC8vXG4gIC8vIFRoaXMgb3Bjb2RlIGlzIGRlc2lnbmVkIGZvciB1c2UgaW4gc3RyaW5nIG1vZGUsIHdoaWNoXG4gIC8vIHByb3ZpZGVzIHRoZSBzdHJpbmcgdmFsdWUgb2YgYSBwYXJhbWV0ZXIgYWxvbmcgd2l0aCBpdHNcbiAgLy8gZGVwdGggcmF0aGVyIHRoYW4gcmVzb2x2aW5nIGl0IGltbWVkaWF0ZWx5LlxuICBwdXNoU3RyaW5nUGFyYW06IGZ1bmN0aW9uKHN0cmluZywgdHlwZSkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCgnZGVwdGgnICsgdGhpcy5sYXN0Q29udGV4dCk7XG5cbiAgICB0aGlzLnB1c2hTdHJpbmcodHlwZSk7XG5cbiAgICAvLyBJZiBpdCdzIGEgc3ViZXhwcmVzc2lvbiwgdGhlIHN0cmluZyByZXN1bHRcbiAgICAvLyB3aWxsIGJlIHB1c2hlZCBhZnRlciB0aGlzIG9wY29kZS5cbiAgICBpZiAodHlwZSAhPT0gJ3NleHByJykge1xuICAgICAgaWYgKHR5cGVvZiBzdHJpbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMucHVzaFN0cmluZyhzdHJpbmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHN0cmluZyk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGVtcHR5SGFzaDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCd7fScpO1xuXG4gICAgaWYgKHRoaXMudHJhY2tJZHMpIHtcbiAgICAgIHRoaXMucHVzaCgne30nKTsgLy8gaGFzaElkc1xuICAgIH1cbiAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgIHRoaXMucHVzaCgne30nKTsgLy8gaGFzaENvbnRleHRzXG4gICAgICB0aGlzLnB1c2goJ3t9Jyk7IC8vIGhhc2hUeXBlc1xuICAgIH1cbiAgfSxcbiAgcHVzaEhhc2g6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmhhc2gpIHtcbiAgICAgIHRoaXMuaGFzaGVzLnB1c2godGhpcy5oYXNoKTtcbiAgICB9XG4gICAgdGhpcy5oYXNoID0ge3ZhbHVlczogW10sIHR5cGVzOiBbXSwgY29udGV4dHM6IFtdLCBpZHM6IFtdfTtcbiAgfSxcbiAgcG9wSGFzaDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhhc2ggPSB0aGlzLmhhc2g7XG4gICAgdGhpcy5oYXNoID0gdGhpcy5oYXNoZXMucG9wKCk7XG5cbiAgICBpZiAodGhpcy50cmFja0lkcykge1xuICAgICAgdGhpcy5wdXNoKCd7JyArIGhhc2guaWRzLmpvaW4oJywnKSArICd9Jyk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgdGhpcy5wdXNoKCd7JyArIGhhc2guY29udGV4dHMuam9pbignLCcpICsgJ30nKTtcbiAgICAgIHRoaXMucHVzaCgneycgKyBoYXNoLnR5cGVzLmpvaW4oJywnKSArICd9Jyk7XG4gICAgfVxuXG4gICAgdGhpcy5wdXNoKCd7XFxuICAgICcgKyBoYXNoLnZhbHVlcy5qb2luKCcsXFxuICAgICcpICsgJ1xcbiAgfScpO1xuICB9LFxuXG4gIC8vIFtwdXNoU3RyaW5nXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBxdW90ZWRTdHJpbmcoc3RyaW5nKSwgLi4uXG4gIC8vXG4gIC8vIFB1c2ggYSBxdW90ZWQgdmVyc2lvbiBvZiBgc3RyaW5nYCBvbnRvIHRoZSBzdGFja1xuICBwdXNoU3RyaW5nOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwodGhpcy5xdW90ZWRTdHJpbmcoc3RyaW5nKSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IGV4cHIsIC4uLlxuICAvL1xuICAvLyBQdXNoIGFuIGV4cHJlc3Npb24gb250byB0aGUgc3RhY2tcbiAgcHVzaDogZnVuY3Rpb24oZXhwcikge1xuICAgIHRoaXMuaW5saW5lU3RhY2sucHVzaChleHByKTtcbiAgICByZXR1cm4gZXhwcjtcbiAgfSxcblxuICAvLyBbcHVzaExpdGVyYWxdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IC4uLlxuICAvLyBPbiBzdGFjaywgYWZ0ZXI6IHZhbHVlLCAuLi5cbiAgLy9cbiAgLy8gUHVzaGVzIGEgdmFsdWUgb250byB0aGUgc3RhY2suIFRoaXMgb3BlcmF0aW9uIHByZXZlbnRzXG4gIC8vIHRoZSBjb21waWxlciBmcm9tIGNyZWF0aW5nIGEgdGVtcG9yYXJ5IHZhcmlhYmxlIHRvIGhvbGRcbiAgLy8gaXQuXG4gIHB1c2hMaXRlcmFsOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHRoaXMucHVzaFN0YWNrTGl0ZXJhbCh2YWx1ZSk7XG4gIH0sXG5cbiAgLy8gW3B1c2hQcm9ncmFtXVxuICAvL1xuICAvLyBPbiBzdGFjaywgYmVmb3JlOiAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiBwcm9ncmFtKGd1aWQpLCAuLi5cbiAgLy9cbiAgLy8gUHVzaCBhIHByb2dyYW0gZXhwcmVzc2lvbiBvbnRvIHRoZSBzdGFjay4gVGhpcyB0YWtlc1xuICAvLyBhIGNvbXBpbGUtdGltZSBndWlkIGFuZCBjb252ZXJ0cyBpdCBpbnRvIGEgcnVudGltZS1hY2Nlc3NpYmxlXG4gIC8vIGV4cHJlc3Npb24uXG4gIHB1c2hQcm9ncmFtOiBmdW5jdGlvbihndWlkKSB7XG4gICAgaWYgKGd1aWQgIT0gbnVsbCkge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKHRoaXMucHJvZ3JhbUV4cHJlc3Npb24oZ3VpZCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwobnVsbCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFtpbnZva2VIZWxwZXJdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGhlbHBlciBpbnZvY2F0aW9uXG4gIC8vXG4gIC8vIFBvcHMgb2ZmIHRoZSBoZWxwZXIncyBwYXJhbWV0ZXJzLCBpbnZva2VzIHRoZSBoZWxwZXIsXG4gIC8vIGFuZCBwdXNoZXMgdGhlIGhlbHBlcidzIHJldHVybiB2YWx1ZSBvbnRvIHRoZSBzdGFjay5cbiAgLy9cbiAgLy8gSWYgdGhlIGhlbHBlciBpcyBub3QgZm91bmQsIGBoZWxwZXJNaXNzaW5nYCBpcyBjYWxsZWQuXG4gIGludm9rZUhlbHBlcjogZnVuY3Rpb24ocGFyYW1TaXplLCBuYW1lLCBpc1Jvb3QpIHtcbiAgICB0aGlzLmFsaWFzZXMuaGVscGVyTWlzc2luZyA9ICdoZWxwZXJzLmhlbHBlck1pc3NpbmcnO1xuICAgIHRoaXMudXNlUmVnaXN0ZXIoJ2hlbHBlcicpO1xuXG4gICAgdmFyIG5vbkhlbHBlciA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB2YXIgaGVscGVyID0gdGhpcy5zZXR1cEhlbHBlcihwYXJhbVNpemUsIG5hbWUpO1xuXG4gICAgdmFyIGxvb2t1cCA9ICdoZWxwZXIgPSAnICsgaGVscGVyLm5hbWUgKyAnIHx8ICcgKyBub25IZWxwZXIgKyAnIHx8IGhlbHBlck1pc3NpbmcnO1xuICAgIGlmIChoZWxwZXIucGFyYW1zSW5pdCkge1xuICAgICAgbG9va3VwICs9ICcsJyArIGhlbHBlci5wYXJhbXNJbml0O1xuICAgIH1cblxuICAgIHRoaXMucHVzaCgnKCcgKyBsb29rdXAgKyAnLGhlbHBlci5jYWxsKCcgKyBoZWxwZXIuY2FsbFBhcmFtcyArICcpKScpO1xuXG4gICAgLy8gQWx3YXlzIGZsdXNoIHN1YmV4cHJlc3Npb25zLiBUaGlzIGlzIGJvdGggdG8gcHJldmVudCB0aGUgY29tcG91bmRpbmcgc2l6ZSBpc3N1ZSB0aGF0XG4gICAgLy8gb2NjdXJzIHdoZW4gdGhlIGNvZGUgaGFzIHRvIGJlIGR1cGxpY2F0ZWQgZm9yIGlubGluaW5nIGFuZCBhbHNvIHRvIHByZXZlbnQgZXJyb3JzXG4gICAgLy8gZHVlIHRvIHRoZSBpbmNvcnJlY3Qgb3B0aW9ucyBvYmplY3QgYmVpbmcgcGFzc2VkIGR1ZSB0byB0aGUgc2hhcmVkIHJlZ2lzdGVyLlxuICAgIGlmICghaXNSb290KSB7XG4gICAgICB0aGlzLmZsdXNoSW5saW5lKCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFtpbnZva2VLbm93bkhlbHBlcl1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogaGFzaCwgaW52ZXJzZSwgcHJvZ3JhbSwgcGFyYW1zLi4uLCAuLi5cbiAgLy8gT24gc3RhY2ssIGFmdGVyOiByZXN1bHQgb2YgaGVscGVyIGludm9jYXRpb25cbiAgLy9cbiAgLy8gVGhpcyBvcGVyYXRpb24gaXMgdXNlZCB3aGVuIHRoZSBoZWxwZXIgaXMga25vd24gdG8gZXhpc3QsXG4gIC8vIHNvIGEgYGhlbHBlck1pc3NpbmdgIGZhbGxiYWNrIGlzIG5vdCByZXF1aXJlZC5cbiAgaW52b2tlS25vd25IZWxwZXI6IGZ1bmN0aW9uKHBhcmFtU2l6ZSwgbmFtZSkge1xuICAgIHZhciBoZWxwZXIgPSB0aGlzLnNldHVwSGVscGVyKHBhcmFtU2l6ZSwgbmFtZSk7XG4gICAgdGhpcy5wdXNoKGhlbHBlci5uYW1lICsgXCIuY2FsbChcIiArIGhlbHBlci5jYWxsUGFyYW1zICsgXCIpXCIpO1xuICB9LFxuXG4gIC8vIFtpbnZva2VBbWJpZ3VvdXNdXG4gIC8vXG4gIC8vIE9uIHN0YWNrLCBiZWZvcmU6IGhhc2gsIGludmVyc2UsIHByb2dyYW0sIHBhcmFtcy4uLiwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogcmVzdWx0IG9mIGRpc2FtYmlndWF0aW9uXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGlzIHVzZWQgd2hlbiBhbiBleHByZXNzaW9uIGxpa2UgYHt7Zm9vfX1gXG4gIC8vIGlzIHByb3ZpZGVkLCBidXQgd2UgZG9uJ3Qga25vdyBhdCBjb21waWxlLXRpbWUgd2hldGhlciBpdFxuICAvLyBpcyBhIGhlbHBlciBvciBhIHBhdGguXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIGVtaXRzIG1vcmUgY29kZSB0aGFuIHRoZSBvdGhlciBvcHRpb25zLFxuICAvLyBhbmQgY2FuIGJlIGF2b2lkZWQgYnkgcGFzc2luZyB0aGUgYGtub3duSGVscGVyc2AgYW5kXG4gIC8vIGBrbm93bkhlbHBlcnNPbmx5YCBmbGFncyBhdCBjb21waWxlLXRpbWUuXG4gIGludm9rZUFtYmlndW91czogZnVuY3Rpb24obmFtZSwgaGVscGVyQ2FsbCkge1xuICAgIHRoaXMuYWxpYXNlcy5mdW5jdGlvblR5cGUgPSAnXCJmdW5jdGlvblwiJztcbiAgICB0aGlzLnVzZVJlZ2lzdGVyKCdoZWxwZXInKTtcblxuICAgIHRoaXMuZW1wdHlIYXNoKCk7XG4gICAgdmFyIGhlbHBlciA9IHRoaXMuc2V0dXBIZWxwZXIoMCwgbmFtZSwgaGVscGVyQ2FsbCk7XG5cbiAgICB2YXIgaGVscGVyTmFtZSA9IHRoaXMubGFzdEhlbHBlciA9IHRoaXMubmFtZUxvb2t1cCgnaGVscGVycycsIG5hbWUsICdoZWxwZXInKTtcbiAgICB2YXIgbm9uSGVscGVyID0gdGhpcy5uYW1lTG9va3VwKCdkZXB0aCcgKyB0aGlzLmxhc3RDb250ZXh0LCBuYW1lLCAnY29udGV4dCcpO1xuXG4gICAgdGhpcy5wdXNoKFxuICAgICAgJygoaGVscGVyID0gJyArIGhlbHBlck5hbWUgKyAnIHx8ICcgKyBub25IZWxwZXJcbiAgICAgICAgKyAoaGVscGVyLnBhcmFtc0luaXQgPyAnKSwoJyArIGhlbHBlci5wYXJhbXNJbml0IDogJycpICsgJyksJ1xuICAgICAgKyAnKHR5cGVvZiBoZWxwZXIgPT09IGZ1bmN0aW9uVHlwZSA/IGhlbHBlci5jYWxsKCcgKyBoZWxwZXIuY2FsbFBhcmFtcyArICcpIDogaGVscGVyKSknKTtcbiAgfSxcblxuICAvLyBbaW52b2tlUGFydGlhbF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogY29udGV4dCwgLi4uXG4gIC8vIE9uIHN0YWNrIGFmdGVyOiByZXN1bHQgb2YgcGFydGlhbCBpbnZvY2F0aW9uXG4gIC8vXG4gIC8vIFRoaXMgb3BlcmF0aW9uIHBvcHMgb2ZmIGEgY29udGV4dCwgaW52b2tlcyBhIHBhcnRpYWwgd2l0aCB0aGF0IGNvbnRleHQsXG4gIC8vIGFuZCBwdXNoZXMgdGhlIHJlc3VsdCBvZiB0aGUgaW52b2NhdGlvbiBiYWNrLlxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHBhcmFtcyA9IFt0aGlzLm5hbWVMb29rdXAoJ3BhcnRpYWxzJywgbmFtZSwgJ3BhcnRpYWwnKSwgXCInXCIgKyBuYW1lICsgXCInXCIsIHRoaXMucG9wU3RhY2soKSwgdGhpcy5wb3BTdGFjaygpLCBcImhlbHBlcnNcIiwgXCJwYXJ0aWFsc1wiXTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGF0YSkge1xuICAgICAgcGFyYW1zLnB1c2goXCJkYXRhXCIpO1xuICAgIH1cblxuICAgIHRoaXMucHVzaChcInRoaXMuaW52b2tlUGFydGlhbChcIiArIHBhcmFtcy5qb2luKFwiLCBcIikgKyBcIilcIik7XG4gIH0sXG5cbiAgLy8gW2Fzc2lnblRvSGFzaF1cbiAgLy9cbiAgLy8gT24gc3RhY2ssIGJlZm9yZTogdmFsdWUsIC4uLiwgaGFzaCwgLi4uXG4gIC8vIE9uIHN0YWNrLCBhZnRlcjogLi4uLCBoYXNoLCAuLi5cbiAgLy9cbiAgLy8gUG9wcyBhIHZhbHVlIG9mZiB0aGUgc3RhY2sgYW5kIGFzc2lnbnMgaXQgdG8gdGhlIGN1cnJlbnQgaGFzaFxuICBhc3NpZ25Ub0hhc2g6IGZ1bmN0aW9uKGtleSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMucG9wU3RhY2soKSxcbiAgICAgICAgY29udGV4dCxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgaWQ7XG5cbiAgICBpZiAodGhpcy50cmFja0lkcykge1xuICAgICAgaWQgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgdHlwZSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgfVxuXG4gICAgdmFyIGhhc2ggPSB0aGlzLmhhc2g7XG4gICAgaWYgKGNvbnRleHQpIHtcbiAgICAgIGhhc2guY29udGV4dHMucHVzaChcIidcIiArIGtleSArIFwiJzogXCIgKyBjb250ZXh0KTtcbiAgICB9XG4gICAgaWYgKHR5cGUpIHtcbiAgICAgIGhhc2gudHlwZXMucHVzaChcIidcIiArIGtleSArIFwiJzogXCIgKyB0eXBlKTtcbiAgICB9XG4gICAgaWYgKGlkKSB7XG4gICAgICBoYXNoLmlkcy5wdXNoKFwiJ1wiICsga2V5ICsgXCInOiBcIiArIGlkKTtcbiAgICB9XG4gICAgaGFzaC52YWx1ZXMucHVzaChcIidcIiArIGtleSArIFwiJzogKFwiICsgdmFsdWUgKyBcIilcIik7XG4gIH0sXG5cbiAgcHVzaElkOiBmdW5jdGlvbih0eXBlLCBuYW1lKSB7XG4gICAgaWYgKHR5cGUgPT09ICdJRCcgfHwgdHlwZSA9PT0gJ0RBVEEnKSB7XG4gICAgICB0aGlzLnB1c2hTdHJpbmcobmFtZSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnc2V4cHInKSB7XG4gICAgICB0aGlzLnB1c2hTdGFja0xpdGVyYWwoJ3RydWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wdXNoU3RhY2tMaXRlcmFsKCdudWxsJyk7XG4gICAgfVxuICB9LFxuXG4gIC8vIEhFTFBFUlNcblxuICBjb21waWxlcjogSmF2YVNjcmlwdENvbXBpbGVyLFxuXG4gIGNvbXBpbGVDaGlsZHJlbjogZnVuY3Rpb24oZW52aXJvbm1lbnQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBlbnZpcm9ubWVudC5jaGlsZHJlbiwgY2hpbGQsIGNvbXBpbGVyO1xuXG4gICAgZm9yKHZhciBpPTAsIGw9Y2hpbGRyZW4ubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgIGNvbXBpbGVyID0gbmV3IHRoaXMuY29tcGlsZXIoKTtcblxuICAgICAgdmFyIGluZGV4ID0gdGhpcy5tYXRjaEV4aXN0aW5nUHJvZ3JhbShjaGlsZCk7XG5cbiAgICAgIGlmIChpbmRleCA9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuY29udGV4dC5wcm9ncmFtcy5wdXNoKCcnKTsgICAgIC8vIFBsYWNlaG9sZGVyIHRvIHByZXZlbnQgbmFtZSBjb25mbGljdHMgZm9yIG5lc3RlZCBjaGlsZHJlblxuICAgICAgICBpbmRleCA9IHRoaXMuY29udGV4dC5wcm9ncmFtcy5sZW5ndGg7XG4gICAgICAgIGNoaWxkLmluZGV4ID0gaW5kZXg7XG4gICAgICAgIGNoaWxkLm5hbWUgPSAncHJvZ3JhbScgKyBpbmRleDtcbiAgICAgICAgdGhpcy5jb250ZXh0LnByb2dyYW1zW2luZGV4XSA9IGNvbXBpbGVyLmNvbXBpbGUoY2hpbGQsIG9wdGlvbnMsIHRoaXMuY29udGV4dCwgIXRoaXMucHJlY29tcGlsZSk7XG4gICAgICAgIHRoaXMuY29udGV4dC5lbnZpcm9ubWVudHNbaW5kZXhdID0gY2hpbGQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjaGlsZC5pbmRleCA9IGluZGV4O1xuICAgICAgICBjaGlsZC5uYW1lID0gJ3Byb2dyYW0nICsgaW5kZXg7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBtYXRjaEV4aXN0aW5nUHJvZ3JhbTogZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIGVudmlyb25tZW50ID0gdGhpcy5jb250ZXh0LmVudmlyb25tZW50c1tpXTtcbiAgICAgIGlmIChlbnZpcm9ubWVudCAmJiBlbnZpcm9ubWVudC5lcXVhbHMoY2hpbGQpKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBwcm9ncmFtRXhwcmVzc2lvbjogZnVuY3Rpb24oZ3VpZCkge1xuICAgIGlmKGd1aWQgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuICd0aGlzLm5vb3AnO1xuICAgIH1cblxuICAgIHZhciBjaGlsZCA9IHRoaXMuZW52aXJvbm1lbnQuY2hpbGRyZW5bZ3VpZF0sXG4gICAgICAgIGRlcHRocyA9IGNoaWxkLmRlcHRocy5saXN0LCBkZXB0aDtcblxuICAgIHZhciBwcm9ncmFtUGFyYW1zID0gW2NoaWxkLmluZGV4LCAnZGF0YSddO1xuXG4gICAgZm9yKHZhciBpPTAsIGwgPSBkZXB0aHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgICAgZGVwdGggPSBkZXB0aHNbaV07XG5cbiAgICAgIHByb2dyYW1QYXJhbXMucHVzaCgnZGVwdGgnICsgKGRlcHRoIC0gMSkpO1xuICAgIH1cblxuICAgIHJldHVybiAoZGVwdGhzLmxlbmd0aCA9PT0gMCA/ICd0aGlzLnByb2dyYW0oJyA6ICd0aGlzLnByb2dyYW1XaXRoRGVwdGgoJykgKyBwcm9ncmFtUGFyYW1zLmpvaW4oJywgJykgKyAnKSc7XG4gIH0sXG5cbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIHZhbCkge1xuICAgIHRoaXMudXNlUmVnaXN0ZXIobmFtZSk7XG4gICAgdGhpcy5wdXNoU291cmNlKG5hbWUgKyBcIiA9IFwiICsgdmFsICsgXCI7XCIpO1xuICB9LFxuXG4gIHVzZVJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYoIXRoaXMucmVnaXN0ZXJzW25hbWVdKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyc1tuYW1lXSA9IHRydWU7XG4gICAgICB0aGlzLnJlZ2lzdGVycy5saXN0LnB1c2gobmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIHB1c2hTdGFja0xpdGVyYWw6IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gdGhpcy5wdXNoKG5ldyBMaXRlcmFsKGl0ZW0pKTtcbiAgfSxcblxuICBwdXNoU291cmNlOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29udGVudCkge1xuICAgICAgdGhpcy5zb3VyY2UucHVzaCh0aGlzLmFwcGVuZFRvQnVmZmVyKHRoaXMucXVvdGVkU3RyaW5nKHRoaXMucGVuZGluZ0NvbnRlbnQpKSk7XG4gICAgICB0aGlzLnBlbmRpbmdDb250ZW50ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmIChzb3VyY2UpIHtcbiAgICAgIHRoaXMuc291cmNlLnB1c2goc291cmNlKTtcbiAgICB9XG4gIH0sXG5cbiAgcHVzaFN0YWNrOiBmdW5jdGlvbihpdGVtKSB7XG4gICAgdGhpcy5mbHVzaElubGluZSgpO1xuXG4gICAgdmFyIHN0YWNrID0gdGhpcy5pbmNyU3RhY2soKTtcbiAgICBpZiAoaXRlbSkge1xuICAgICAgdGhpcy5wdXNoU291cmNlKHN0YWNrICsgXCIgPSBcIiArIGl0ZW0gKyBcIjtcIik7XG4gICAgfVxuICAgIHRoaXMuY29tcGlsZVN0YWNrLnB1c2goc3RhY2spO1xuICAgIHJldHVybiBzdGFjaztcbiAgfSxcblxuICByZXBsYWNlU3RhY2s6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHByZWZpeCA9ICcnLFxuICAgICAgICBpbmxpbmUgPSB0aGlzLmlzSW5saW5lKCksXG4gICAgICAgIHN0YWNrLFxuICAgICAgICBjcmVhdGVkU3RhY2ssXG4gICAgICAgIHVzZWRMaXRlcmFsO1xuXG4gICAgLy8gSWYgd2UgYXJlIGN1cnJlbnRseSBpbmxpbmUgdGhlbiB3ZSB3YW50IHRvIG1lcmdlIHRoZSBpbmxpbmUgc3RhdGVtZW50IGludG8gdGhlXG4gICAgLy8gcmVwbGFjZW1lbnQgc3RhdGVtZW50IHZpYSAnLCdcbiAgICBpZiAoaW5saW5lKSB7XG4gICAgICB2YXIgdG9wID0gdGhpcy5wb3BTdGFjayh0cnVlKTtcblxuICAgICAgaWYgKHRvcCBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgLy8gTGl0ZXJhbHMgZG8gbm90IG5lZWQgdG8gYmUgaW5saW5lZFxuICAgICAgICBzdGFjayA9IHRvcC52YWx1ZTtcbiAgICAgICAgdXNlZExpdGVyYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gR2V0IG9yIGNyZWF0ZSB0aGUgY3VycmVudCBzdGFjayBuYW1lIGZvciB1c2UgYnkgdGhlIGlubGluZVxuICAgICAgICBjcmVhdGVkU3RhY2sgPSAhdGhpcy5zdGFja1Nsb3Q7XG4gICAgICAgIHZhciBuYW1lID0gIWNyZWF0ZWRTdGFjayA/IHRoaXMudG9wU3RhY2tOYW1lKCkgOiB0aGlzLmluY3JTdGFjaygpO1xuXG4gICAgICAgIHByZWZpeCA9ICcoJyArIHRoaXMucHVzaChuYW1lKSArICcgPSAnICsgdG9wICsgJyksJztcbiAgICAgICAgc3RhY2sgPSB0aGlzLnRvcFN0YWNrKCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YWNrID0gdGhpcy50b3BTdGFjaygpO1xuICAgIH1cblxuICAgIHZhciBpdGVtID0gY2FsbGJhY2suY2FsbCh0aGlzLCBzdGFjayk7XG5cbiAgICBpZiAoaW5saW5lKSB7XG4gICAgICBpZiAoIXVzZWRMaXRlcmFsKSB7XG4gICAgICAgIHRoaXMucG9wU3RhY2soKTtcbiAgICAgIH1cbiAgICAgIGlmIChjcmVhdGVkU3RhY2spIHtcbiAgICAgICAgdGhpcy5zdGFja1Nsb3QtLTtcbiAgICAgIH1cbiAgICAgIHRoaXMucHVzaCgnKCcgKyBwcmVmaXggKyBpdGVtICsgJyknKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUHJldmVudCBtb2RpZmljYXRpb24gb2YgdGhlIGNvbnRleHQgZGVwdGggdmFyaWFibGUuIFRocm91Z2ggcmVwbGFjZVN0YWNrXG4gICAgICBpZiAoIS9ec3RhY2svLnRlc3Qoc3RhY2spKSB7XG4gICAgICAgIHN0YWNrID0gdGhpcy5uZXh0U3RhY2soKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5wdXNoU291cmNlKHN0YWNrICsgXCIgPSAoXCIgKyBwcmVmaXggKyBpdGVtICsgXCIpO1wiKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YWNrO1xuICB9LFxuXG4gIG5leHRTdGFjazogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucHVzaFN0YWNrKCk7XG4gIH0sXG5cbiAgaW5jclN0YWNrOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0YWNrU2xvdCsrO1xuICAgIGlmKHRoaXMuc3RhY2tTbG90ID4gdGhpcy5zdGFja1ZhcnMubGVuZ3RoKSB7IHRoaXMuc3RhY2tWYXJzLnB1c2goXCJzdGFja1wiICsgdGhpcy5zdGFja1Nsb3QpOyB9XG4gICAgcmV0dXJuIHRoaXMudG9wU3RhY2tOYW1lKCk7XG4gIH0sXG4gIHRvcFN0YWNrTmFtZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFwic3RhY2tcIiArIHRoaXMuc3RhY2tTbG90O1xuICB9LFxuICBmbHVzaElubGluZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGlubGluZVN0YWNrID0gdGhpcy5pbmxpbmVTdGFjaztcbiAgICBpZiAoaW5saW5lU3RhY2subGVuZ3RoKSB7XG4gICAgICB0aGlzLmlubGluZVN0YWNrID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gaW5saW5lU3RhY2subGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gaW5saW5lU3RhY2tbaV07XG4gICAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIExpdGVyYWwpIHtcbiAgICAgICAgICB0aGlzLmNvbXBpbGVTdGFjay5wdXNoKGVudHJ5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnB1c2hTdGFjayhlbnRyeSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGlzSW5saW5lOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5pbmxpbmVTdGFjay5sZW5ndGg7XG4gIH0sXG5cbiAgcG9wU3RhY2s6IGZ1bmN0aW9uKHdyYXBwZWQpIHtcbiAgICB2YXIgaW5saW5lID0gdGhpcy5pc0lubGluZSgpLFxuICAgICAgICBpdGVtID0gKGlubGluZSA/IHRoaXMuaW5saW5lU3RhY2sgOiB0aGlzLmNvbXBpbGVTdGFjaykucG9wKCk7XG5cbiAgICBpZiAoIXdyYXBwZWQgJiYgKGl0ZW0gaW5zdGFuY2VvZiBMaXRlcmFsKSkge1xuICAgICAgcmV0dXJuIGl0ZW0udmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghaW5saW5lKSB7XG4gICAgICAgIGlmICghdGhpcy5zdGFja1Nsb3QpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXhjZXB0aW9uKCdJbnZhbGlkIHN0YWNrIHBvcCcpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhY2tTbG90LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0sXG5cbiAgdG9wU3RhY2s6IGZ1bmN0aW9uKHdyYXBwZWQpIHtcbiAgICB2YXIgc3RhY2sgPSAodGhpcy5pc0lubGluZSgpID8gdGhpcy5pbmxpbmVTdGFjayA6IHRoaXMuY29tcGlsZVN0YWNrKSxcbiAgICAgICAgaXRlbSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuXG4gICAgaWYgKCF3cmFwcGVkICYmIChpdGVtIGluc3RhbmNlb2YgTGl0ZXJhbCkpIHtcbiAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9XG4gIH0sXG5cbiAgcXVvdGVkU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gJ1wiJyArIHN0clxuICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJylcbiAgICAgIC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJylcbiAgICAgIC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbiAgICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJylcbiAgICAgIC5yZXBsYWNlKC9cXHUyMDI4L2csICdcXFxcdTIwMjgnKSAgIC8vIFBlciBFY21hLTI2MiA3LjMgKyA3LjguNFxuICAgICAgLnJlcGxhY2UoL1xcdTIwMjkvZywgJ1xcXFx1MjAyOScpICsgJ1wiJztcbiAgfSxcblxuICBvYmplY3RMaXRlcmFsOiBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcGFpcnMgPSBbXTtcblxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBwYWlycy5wdXNoKHRoaXMucXVvdGVkU3RyaW5nKGtleSkgKyAnOicgKyBvYmpba2V5XSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICd7JyArIHBhaXJzLmpvaW4oJywnKSArICd9JztcbiAgfSxcblxuICBzZXR1cEhlbHBlcjogZnVuY3Rpb24ocGFyYW1TaXplLCBuYW1lLCBibG9ja0hlbHBlcikge1xuICAgIHZhciBwYXJhbXMgPSBbXSxcbiAgICAgICAgcGFyYW1zSW5pdCA9IHRoaXMuc2V0dXBQYXJhbXMobmFtZSwgcGFyYW1TaXplLCBwYXJhbXMsIGJsb2NrSGVscGVyKTtcbiAgICB2YXIgZm91bmRIZWxwZXIgPSB0aGlzLm5hbWVMb29rdXAoJ2hlbHBlcnMnLCBuYW1lLCAnaGVscGVyJyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICBwYXJhbXNJbml0OiBwYXJhbXNJbml0LFxuICAgICAgbmFtZTogZm91bmRIZWxwZXIsXG4gICAgICBjYWxsUGFyYW1zOiBbXCJkZXB0aDBcIl0uY29uY2F0KHBhcmFtcykuam9pbihcIiwgXCIpXG4gICAgfTtcbiAgfSxcblxuICBzZXR1cE9wdGlvbnM6IGZ1bmN0aW9uKGhlbHBlciwgcGFyYW1TaXplLCBwYXJhbXMpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHt9LCBjb250ZXh0cyA9IFtdLCB0eXBlcyA9IFtdLCBpZHMgPSBbXSwgcGFyYW0sIGludmVyc2UsIHByb2dyYW07XG5cbiAgICBvcHRpb25zLm5hbWUgPSB0aGlzLnF1b3RlZFN0cmluZyhoZWxwZXIpO1xuICAgIG9wdGlvbnMuaGFzaCA9IHRoaXMucG9wU3RhY2soKTtcblxuICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICBvcHRpb25zLmhhc2hJZHMgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgb3B0aW9ucy5oYXNoVHlwZXMgPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICBvcHRpb25zLmhhc2hDb250ZXh0cyA9IHRoaXMucG9wU3RhY2soKTtcbiAgICB9XG5cbiAgICBpbnZlcnNlID0gdGhpcy5wb3BTdGFjaygpO1xuICAgIHByb2dyYW0gPSB0aGlzLnBvcFN0YWNrKCk7XG5cbiAgICAvLyBBdm9pZCBzZXR0aW5nIGZuIGFuZCBpbnZlcnNlIGlmIG5laXRoZXIgYXJlIHNldC4gVGhpcyBhbGxvd3NcbiAgICAvLyBoZWxwZXJzIHRvIGRvIGEgY2hlY2sgZm9yIGBpZiAob3B0aW9ucy5mbilgXG4gICAgaWYgKHByb2dyYW0gfHwgaW52ZXJzZSkge1xuICAgICAgaWYgKCFwcm9ncmFtKSB7XG4gICAgICAgIHByb2dyYW0gPSAndGhpcy5ub29wJztcbiAgICAgIH1cblxuICAgICAgaWYgKCFpbnZlcnNlKSB7XG4gICAgICAgIGludmVyc2UgPSAndGhpcy5ub29wJztcbiAgICAgIH1cblxuICAgICAgb3B0aW9ucy5mbiA9IHByb2dyYW07XG4gICAgICBvcHRpb25zLmludmVyc2UgPSBpbnZlcnNlO1xuICAgIH1cblxuICAgIC8vIFRoZSBwYXJhbWV0ZXJzIGdvIG9uIHRvIHRoZSBzdGFjayBpbiBvcmRlciAobWFraW5nIHN1cmUgdGhhdCB0aGV5IGFyZSBldmFsdWF0ZWQgaW4gb3JkZXIpXG4gICAgLy8gc28gd2UgbmVlZCB0byBwb3AgdGhlbSBvZmYgdGhlIHN0YWNrIGluIHJldmVyc2Ugb3JkZXJcbiAgICB2YXIgaSA9IHBhcmFtU2l6ZTtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBwYXJhbSA9IHRoaXMucG9wU3RhY2soKTtcbiAgICAgIHBhcmFtc1tpXSA9IHBhcmFtO1xuXG4gICAgICBpZiAodGhpcy50cmFja0lkcykge1xuICAgICAgICBpZHNbaV0gPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5zdHJpbmdQYXJhbXMpIHtcbiAgICAgICAgdHlwZXNbaV0gPSB0aGlzLnBvcFN0YWNrKCk7XG4gICAgICAgIGNvbnRleHRzW2ldID0gdGhpcy5wb3BTdGFjaygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLnRyYWNrSWRzKSB7XG4gICAgICBvcHRpb25zLmlkcyA9IFwiW1wiICsgaWRzLmpvaW4oXCIsXCIpICsgXCJdXCI7XG4gICAgfVxuICAgIGlmICh0aGlzLnN0cmluZ1BhcmFtcykge1xuICAgICAgb3B0aW9ucy50eXBlcyA9IFwiW1wiICsgdHlwZXMuam9pbihcIixcIikgKyBcIl1cIjtcbiAgICAgIG9wdGlvbnMuY29udGV4dHMgPSBcIltcIiArIGNvbnRleHRzLmpvaW4oXCIsXCIpICsgXCJdXCI7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kYXRhKSB7XG4gICAgICBvcHRpb25zLmRhdGEgPSBcImRhdGFcIjtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9ucztcbiAgfSxcblxuICAvLyB0aGUgcGFyYW1zIGFuZCBjb250ZXh0cyBhcmd1bWVudHMgYXJlIHBhc3NlZCBpbiBhcnJheXNcbiAgLy8gdG8gZmlsbCBpblxuICBzZXR1cFBhcmFtczogZnVuY3Rpb24oaGVscGVyTmFtZSwgcGFyYW1TaXplLCBwYXJhbXMsIHVzZVJlZ2lzdGVyKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLm9iamVjdExpdGVyYWwodGhpcy5zZXR1cE9wdGlvbnMoaGVscGVyTmFtZSwgcGFyYW1TaXplLCBwYXJhbXMpKTtcblxuICAgIGlmICh1c2VSZWdpc3Rlcikge1xuICAgICAgdGhpcy51c2VSZWdpc3Rlcignb3B0aW9ucycpO1xuICAgICAgcGFyYW1zLnB1c2goJ29wdGlvbnMnKTtcbiAgICAgIHJldHVybiAnb3B0aW9ucz0nICsgb3B0aW9ucztcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyYW1zLnB1c2gob3B0aW9ucyk7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICB9XG59O1xuXG52YXIgcmVzZXJ2ZWRXb3JkcyA9IChcbiAgXCJicmVhayBlbHNlIG5ldyB2YXJcIiArXG4gIFwiIGNhc2UgZmluYWxseSByZXR1cm4gdm9pZFwiICtcbiAgXCIgY2F0Y2ggZm9yIHN3aXRjaCB3aGlsZVwiICtcbiAgXCIgY29udGludWUgZnVuY3Rpb24gdGhpcyB3aXRoXCIgK1xuICBcIiBkZWZhdWx0IGlmIHRocm93XCIgK1xuICBcIiBkZWxldGUgaW4gdHJ5XCIgK1xuICBcIiBkbyBpbnN0YW5jZW9mIHR5cGVvZlwiICtcbiAgXCIgYWJzdHJhY3QgZW51bSBpbnQgc2hvcnRcIiArXG4gIFwiIGJvb2xlYW4gZXhwb3J0IGludGVyZmFjZSBzdGF0aWNcIiArXG4gIFwiIGJ5dGUgZXh0ZW5kcyBsb25nIHN1cGVyXCIgK1xuICBcIiBjaGFyIGZpbmFsIG5hdGl2ZSBzeW5jaHJvbml6ZWRcIiArXG4gIFwiIGNsYXNzIGZsb2F0IHBhY2thZ2UgdGhyb3dzXCIgK1xuICBcIiBjb25zdCBnb3RvIHByaXZhdGUgdHJhbnNpZW50XCIgK1xuICBcIiBkZWJ1Z2dlciBpbXBsZW1lbnRzIHByb3RlY3RlZCB2b2xhdGlsZVwiICtcbiAgXCIgZG91YmxlIGltcG9ydCBwdWJsaWMgbGV0IHlpZWxkXCJcbikuc3BsaXQoXCIgXCIpO1xuXG52YXIgY29tcGlsZXJXb3JkcyA9IEphdmFTY3JpcHRDb21waWxlci5SRVNFUlZFRF9XT1JEUyA9IHt9O1xuXG5mb3IodmFyIGk9MCwgbD1yZXNlcnZlZFdvcmRzLmxlbmd0aDsgaTxsOyBpKyspIHtcbiAgY29tcGlsZXJXb3Jkc1tyZXNlcnZlZFdvcmRzW2ldXSA9IHRydWU7XG59XG5cbkphdmFTY3JpcHRDb21waWxlci5pc1ZhbGlkSmF2YVNjcmlwdFZhcmlhYmxlTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuICFKYXZhU2NyaXB0Q29tcGlsZXIuUkVTRVJWRURfV09SRFNbbmFtZV0gJiYgL15bYS16QS1aXyRdWzAtOWEtekEtWl8kXSokLy50ZXN0KG5hbWUpO1xufTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBKYXZhU2NyaXB0Q29tcGlsZXI7IiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4vKiBKaXNvbiBnZW5lcmF0ZWQgcGFyc2VyICovXG52YXIgaGFuZGxlYmFycyA9IChmdW5jdGlvbigpe1xudmFyIHBhcnNlciA9IHt0cmFjZTogZnVuY3Rpb24gdHJhY2UoKSB7IH0sXG55eToge30sXG5zeW1ib2xzXzoge1wiZXJyb3JcIjoyLFwicm9vdFwiOjMsXCJzdGF0ZW1lbnRzXCI6NCxcIkVPRlwiOjUsXCJwcm9ncmFtXCI6NixcInNpbXBsZUludmVyc2VcIjo3LFwic3RhdGVtZW50XCI6OCxcIm9wZW5SYXdCbG9ja1wiOjksXCJDT05URU5UXCI6MTAsXCJFTkRfUkFXX0JMT0NLXCI6MTEsXCJvcGVuSW52ZXJzZVwiOjEyLFwiY2xvc2VCbG9ja1wiOjEzLFwib3BlbkJsb2NrXCI6MTQsXCJtdXN0YWNoZVwiOjE1LFwicGFydGlhbFwiOjE2LFwiQ09NTUVOVFwiOjE3LFwiT1BFTl9SQVdfQkxPQ0tcIjoxOCxcInNleHByXCI6MTksXCJDTE9TRV9SQVdfQkxPQ0tcIjoyMCxcIk9QRU5fQkxPQ0tcIjoyMSxcIkNMT1NFXCI6MjIsXCJPUEVOX0lOVkVSU0VcIjoyMyxcIk9QRU5fRU5EQkxPQ0tcIjoyNCxcInBhdGhcIjoyNSxcIk9QRU5cIjoyNixcIk9QRU5fVU5FU0NBUEVEXCI6MjcsXCJDTE9TRV9VTkVTQ0FQRURcIjoyOCxcIk9QRU5fUEFSVElBTFwiOjI5LFwicGFydGlhbE5hbWVcIjozMCxcInBhcmFtXCI6MzEsXCJwYXJ0aWFsX29wdGlvbjBcIjozMixcInBhcnRpYWxfb3B0aW9uMVwiOjMzLFwic2V4cHJfcmVwZXRpdGlvbjBcIjozNCxcInNleHByX29wdGlvbjBcIjozNSxcImRhdGFOYW1lXCI6MzYsXCJTVFJJTkdcIjozNyxcIk5VTUJFUlwiOjM4LFwiQk9PTEVBTlwiOjM5LFwiT1BFTl9TRVhQUlwiOjQwLFwiQ0xPU0VfU0VYUFJcIjo0MSxcImhhc2hcIjo0MixcImhhc2hfcmVwZXRpdGlvbl9wbHVzMFwiOjQzLFwiaGFzaFNlZ21lbnRcIjo0NCxcIklEXCI6NDUsXCJFUVVBTFNcIjo0NixcIkRBVEFcIjo0NyxcInBhdGhTZWdtZW50c1wiOjQ4LFwiU0VQXCI6NDksXCIkYWNjZXB0XCI6MCxcIiRlbmRcIjoxfSxcbnRlcm1pbmFsc186IHsyOlwiZXJyb3JcIiw1OlwiRU9GXCIsMTA6XCJDT05URU5UXCIsMTE6XCJFTkRfUkFXX0JMT0NLXCIsMTc6XCJDT01NRU5UXCIsMTg6XCJPUEVOX1JBV19CTE9DS1wiLDIwOlwiQ0xPU0VfUkFXX0JMT0NLXCIsMjE6XCJPUEVOX0JMT0NLXCIsMjI6XCJDTE9TRVwiLDIzOlwiT1BFTl9JTlZFUlNFXCIsMjQ6XCJPUEVOX0VOREJMT0NLXCIsMjY6XCJPUEVOXCIsMjc6XCJPUEVOX1VORVNDQVBFRFwiLDI4OlwiQ0xPU0VfVU5FU0NBUEVEXCIsMjk6XCJPUEVOX1BBUlRJQUxcIiwzNzpcIlNUUklOR1wiLDM4OlwiTlVNQkVSXCIsMzk6XCJCT09MRUFOXCIsNDA6XCJPUEVOX1NFWFBSXCIsNDE6XCJDTE9TRV9TRVhQUlwiLDQ1OlwiSURcIiw0NjpcIkVRVUFMU1wiLDQ3OlwiREFUQVwiLDQ5OlwiU0VQXCJ9LFxucHJvZHVjdGlvbnNfOiBbMCxbMywyXSxbMywxXSxbNiwyXSxbNiwzXSxbNiwyXSxbNiwxXSxbNiwxXSxbNiwwXSxbNCwxXSxbNCwyXSxbOCwzXSxbOCwzXSxbOCwzXSxbOCwxXSxbOCwxXSxbOCwxXSxbOCwxXSxbOSwzXSxbMTQsM10sWzEyLDNdLFsxMywzXSxbMTUsM10sWzE1LDNdLFsxNiw1XSxbMTYsNF0sWzcsMl0sWzE5LDNdLFsxOSwxXSxbMzEsMV0sWzMxLDFdLFszMSwxXSxbMzEsMV0sWzMxLDFdLFszMSwzXSxbNDIsMV0sWzQ0LDNdLFszMCwxXSxbMzAsMV0sWzMwLDFdLFszNiwyXSxbMjUsMV0sWzQ4LDNdLFs0OCwxXSxbMzIsMF0sWzMyLDFdLFszMywwXSxbMzMsMV0sWzM0LDBdLFszNCwyXSxbMzUsMF0sWzM1LDFdLFs0MywxXSxbNDMsMl1dLFxucGVyZm9ybUFjdGlvbjogZnVuY3Rpb24gYW5vbnltb3VzKHl5dGV4dCx5eWxlbmcseXlsaW5lbm8seXkseXlzdGF0ZSwkJCxfJCkge1xuXG52YXIgJDAgPSAkJC5sZW5ndGggLSAxO1xuc3dpdGNoICh5eXN0YXRlKSB7XG5jYXNlIDE6IHJldHVybiBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDAtMV0sIHRoaXMuXyQpOyBcbmJyZWFrO1xuY2FzZSAyOiByZXR1cm4gbmV3IHl5LlByb2dyYW1Ob2RlKFtdLCB0aGlzLl8kKTsgXG5icmVhaztcbmNhc2UgMzp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoW10sICQkWyQwLTFdLCAkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDQ6dGhpcy4kID0gbmV3IHl5LlByb2dyYW1Ob2RlKCQkWyQwLTJdLCAkJFskMC0xXSwgJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSA1OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZSgkJFskMC0xXSwgJCRbJDBdLCBbXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgNjp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSA3OnRoaXMuJCA9IG5ldyB5eS5Qcm9ncmFtTm9kZShbXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgODp0aGlzLiQgPSBuZXcgeXkuUHJvZ3JhbU5vZGUoW10sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDk6dGhpcy4kID0gWyQkWyQwXV07XG5icmVhaztcbmNhc2UgMTA6ICQkWyQwLTFdLnB1c2goJCRbJDBdKTsgdGhpcy4kID0gJCRbJDAtMV07IFxuYnJlYWs7XG5jYXNlIDExOnRoaXMuJCA9IG5ldyB5eS5SYXdCbG9ja05vZGUoJCRbJDAtMl0sICQkWyQwLTFdLCAkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDEyOnRoaXMuJCA9IG5ldyB5eS5CbG9ja05vZGUoJCRbJDAtMl0sICQkWyQwLTFdLmludmVyc2UsICQkWyQwLTFdLCAkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDEzOnRoaXMuJCA9IG5ldyB5eS5CbG9ja05vZGUoJCRbJDAtMl0sICQkWyQwLTFdLCAkJFskMC0xXS5pbnZlcnNlLCAkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDE0OnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAxNTp0aGlzLiQgPSAkJFskMF07XG5icmVhaztcbmNhc2UgMTY6dGhpcy4kID0gbmV3IHl5LkNvbnRlbnROb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMTc6dGhpcy4kID0gbmV3IHl5LkNvbW1lbnROb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMTg6dGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXSwgbnVsbCwgJycsICcnLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAxOTp0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdLCBudWxsLCAkJFskMC0yXSwgc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMjA6dGhpcy4kID0gbmV3IHl5Lk11c3RhY2hlTm9kZSgkJFskMC0xXSwgbnVsbCwgJCRbJDAtMl0sIHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSksIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDIxOnRoaXMuJCA9IHtwYXRoOiAkJFskMC0xXSwgc3RyaXA6IHN0cmlwRmxhZ3MoJCRbJDAtMl0sICQkWyQwXSl9O1xuYnJlYWs7XG5jYXNlIDIyOnRoaXMuJCA9IG5ldyB5eS5NdXN0YWNoZU5vZGUoJCRbJDAtMV0sIG51bGwsICQkWyQwLTJdLCBzdHJpcEZsYWdzKCQkWyQwLTJdLCAkJFskMF0pLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAyMzp0aGlzLiQgPSBuZXcgeXkuTXVzdGFjaGVOb2RlKCQkWyQwLTFdLCBudWxsLCAkJFskMC0yXSwgc3RyaXBGbGFncygkJFskMC0yXSwgJCRbJDBdKSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMjQ6dGhpcy4kID0gbmV3IHl5LlBhcnRpYWxOb2RlKCQkWyQwLTNdLCAkJFskMC0yXSwgJCRbJDAtMV0sIHN0cmlwRmxhZ3MoJCRbJDAtNF0sICQkWyQwXSksIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDI1OnRoaXMuJCA9IG5ldyB5eS5QYXJ0aWFsTm9kZSgkJFskMC0yXSwgdW5kZWZpbmVkLCAkJFskMC0xXSwgc3RyaXBGbGFncygkJFskMC0zXSwgJCRbJDBdKSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMjY6dGhpcy4kID0gc3RyaXBGbGFncygkJFskMC0xXSwgJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSAyNzp0aGlzLiQgPSBuZXcgeXkuU2V4cHJOb2RlKFskJFskMC0yXV0uY29uY2F0KCQkWyQwLTFdKSwgJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAyODp0aGlzLiQgPSBuZXcgeXkuU2V4cHJOb2RlKFskJFskMF1dLCBudWxsLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAyOTp0aGlzLiQgPSAkJFskMF07XG5icmVhaztcbmNhc2UgMzA6dGhpcy4kID0gbmV3IHl5LlN0cmluZ05vZGUoJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAzMTp0aGlzLiQgPSBuZXcgeXkuTnVtYmVyTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDMyOnRoaXMuJCA9IG5ldyB5eS5Cb29sZWFuTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDMzOnRoaXMuJCA9ICQkWyQwXTtcbmJyZWFrO1xuY2FzZSAzNDokJFskMC0xXS5pc0hlbHBlciA9IHRydWU7IHRoaXMuJCA9ICQkWyQwLTFdO1xuYnJlYWs7XG5jYXNlIDM1OnRoaXMuJCA9IG5ldyB5eS5IYXNoTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDM2OnRoaXMuJCA9IFskJFskMC0yXSwgJCRbJDBdXTtcbmJyZWFrO1xuY2FzZSAzNzp0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5hbWVOb2RlKCQkWyQwXSwgdGhpcy5fJCk7XG5icmVhaztcbmNhc2UgMzg6dGhpcy4kID0gbmV3IHl5LlBhcnRpYWxOYW1lTm9kZShuZXcgeXkuU3RyaW5nTm9kZSgkJFskMF0sIHRoaXMuXyQpLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSAzOTp0aGlzLiQgPSBuZXcgeXkuUGFydGlhbE5hbWVOb2RlKG5ldyB5eS5OdW1iZXJOb2RlKCQkWyQwXSwgdGhpcy5fJCkpO1xuYnJlYWs7XG5jYXNlIDQwOnRoaXMuJCA9IG5ldyB5eS5EYXRhTm9kZSgkJFskMF0sIHRoaXMuXyQpO1xuYnJlYWs7XG5jYXNlIDQxOnRoaXMuJCA9IG5ldyB5eS5JZE5vZGUoJCRbJDBdLCB0aGlzLl8kKTtcbmJyZWFrO1xuY2FzZSA0MjogJCRbJDAtMl0ucHVzaCh7cGFydDogJCRbJDBdLCBzZXBhcmF0b3I6ICQkWyQwLTFdfSk7IHRoaXMuJCA9ICQkWyQwLTJdOyBcbmJyZWFrO1xuY2FzZSA0Mzp0aGlzLiQgPSBbe3BhcnQ6ICQkWyQwXX1dO1xuYnJlYWs7XG5jYXNlIDQ4OnRoaXMuJCA9IFtdO1xuYnJlYWs7XG5jYXNlIDQ5OiQkWyQwLTFdLnB1c2goJCRbJDBdKTtcbmJyZWFrO1xuY2FzZSA1Mjp0aGlzLiQgPSBbJCRbJDBdXTtcbmJyZWFrO1xuY2FzZSA1MzokJFskMC0xXS5wdXNoKCQkWyQwXSk7XG5icmVhaztcbn1cbn0sXG50YWJsZTogW3szOjEsNDoyLDU6WzEsM10sODo0LDk6NSwxMDpbMSwxMF0sMTI6NiwxNDo3LDE1OjgsMTY6OSwxNzpbMSwxMV0sMTg6WzEsMTJdLDIxOlsxLDE0XSwyMzpbMSwxM10sMjY6WzEsMTVdLDI3OlsxLDE2XSwyOTpbMSwxN119LHsxOlszXX0sezU6WzEsMThdLDg6MTksOTo1LDEwOlsxLDEwXSwxMjo2LDE0OjcsMTU6OCwxNjo5LDE3OlsxLDExXSwxODpbMSwxMl0sMjE6WzEsMTRdLDIzOlsxLDEzXSwyNjpbMSwxNV0sMjc6WzEsMTZdLDI5OlsxLDE3XX0sezE6WzIsMl19LHs1OlsyLDldLDEwOlsyLDldLDE3OlsyLDldLDE4OlsyLDldLDIxOlsyLDldLDIzOlsyLDldLDI0OlsyLDldLDI2OlsyLDldLDI3OlsyLDldLDI5OlsyLDldfSx7MTA6WzEsMjBdfSx7NDoyMyw2OjIxLDc6MjIsODo0LDk6NSwxMDpbMSwxMF0sMTI6NiwxNDo3LDE1OjgsMTY6OSwxNzpbMSwxMV0sMTg6WzEsMTJdLDIxOlsxLDE0XSwyMzpbMSwyNF0sMjQ6WzIsOF0sMjY6WzEsMTVdLDI3OlsxLDE2XSwyOTpbMSwxN119LHs0OjIzLDY6MjUsNzoyMiw4OjQsOTo1LDEwOlsxLDEwXSwxMjo2LDE0OjcsMTU6OCwxNjo5LDE3OlsxLDExXSwxODpbMSwxMl0sMjE6WzEsMTRdLDIzOlsxLDI0XSwyNDpbMiw4XSwyNjpbMSwxNV0sMjc6WzEsMTZdLDI5OlsxLDE3XX0sezU6WzIsMTRdLDEwOlsyLDE0XSwxNzpbMiwxNF0sMTg6WzIsMTRdLDIxOlsyLDE0XSwyMzpbMiwxNF0sMjQ6WzIsMTRdLDI2OlsyLDE0XSwyNzpbMiwxNF0sMjk6WzIsMTRdfSx7NTpbMiwxNV0sMTA6WzIsMTVdLDE3OlsyLDE1XSwxODpbMiwxNV0sMjE6WzIsMTVdLDIzOlsyLDE1XSwyNDpbMiwxNV0sMjY6WzIsMTVdLDI3OlsyLDE1XSwyOTpbMiwxNV19LHs1OlsyLDE2XSwxMDpbMiwxNl0sMTc6WzIsMTZdLDE4OlsyLDE2XSwyMTpbMiwxNl0sMjM6WzIsMTZdLDI0OlsyLDE2XSwyNjpbMiwxNl0sMjc6WzIsMTZdLDI5OlsyLDE2XX0sezU6WzIsMTddLDEwOlsyLDE3XSwxNzpbMiwxN10sMTg6WzIsMTddLDIxOlsyLDE3XSwyMzpbMiwxN10sMjQ6WzIsMTddLDI2OlsyLDE3XSwyNzpbMiwxN10sMjk6WzIsMTddfSx7MTk6MjYsMjU6MjcsMzY6MjgsNDU6WzEsMzFdLDQ3OlsxLDMwXSw0ODoyOX0sezE5OjMyLDI1OjI3LDM2OjI4LDQ1OlsxLDMxXSw0NzpbMSwzMF0sNDg6Mjl9LHsxOTozMywyNToyNywzNjoyOCw0NTpbMSwzMV0sNDc6WzEsMzBdLDQ4OjI5fSx7MTk6MzQsMjU6MjcsMzY6MjgsNDU6WzEsMzFdLDQ3OlsxLDMwXSw0ODoyOX0sezE5OjM1LDI1OjI3LDM2OjI4LDQ1OlsxLDMxXSw0NzpbMSwzMF0sNDg6Mjl9LHsyNTozNywzMDozNiwzNzpbMSwzOF0sMzg6WzEsMzldLDQ1OlsxLDMxXSw0ODoyOX0sezE6WzIsMV19LHs1OlsyLDEwXSwxMDpbMiwxMF0sMTc6WzIsMTBdLDE4OlsyLDEwXSwyMTpbMiwxMF0sMjM6WzIsMTBdLDI0OlsyLDEwXSwyNjpbMiwxMF0sMjc6WzIsMTBdLDI5OlsyLDEwXX0sezExOlsxLDQwXX0sezEzOjQxLDI0OlsxLDQyXX0sezQ6NDMsODo0LDk6NSwxMDpbMSwxMF0sMTI6NiwxNDo3LDE1OjgsMTY6OSwxNzpbMSwxMV0sMTg6WzEsMTJdLDIxOlsxLDE0XSwyMzpbMSwxM10sMjQ6WzIsN10sMjY6WzEsMTVdLDI3OlsxLDE2XSwyOTpbMSwxN119LHs3OjQ0LDg6MTksOTo1LDEwOlsxLDEwXSwxMjo2LDE0OjcsMTU6OCwxNjo5LDE3OlsxLDExXSwxODpbMSwxMl0sMjE6WzEsMTRdLDIzOlsxLDI0XSwyNDpbMiw2XSwyNjpbMSwxNV0sMjc6WzEsMTZdLDI5OlsxLDE3XX0sezE5OjMyLDIyOlsxLDQ1XSwyNToyNywzNjoyOCw0NTpbMSwzMV0sNDc6WzEsMzBdLDQ4OjI5fSx7MTM6NDYsMjQ6WzEsNDJdfSx7MjA6WzEsNDddfSx7MjA6WzIsNDhdLDIyOlsyLDQ4XSwyODpbMiw0OF0sMzQ6NDgsMzc6WzIsNDhdLDM4OlsyLDQ4XSwzOTpbMiw0OF0sNDA6WzIsNDhdLDQxOlsyLDQ4XSw0NTpbMiw0OF0sNDc6WzIsNDhdfSx7MjA6WzIsMjhdLDIyOlsyLDI4XSwyODpbMiwyOF0sNDE6WzIsMjhdfSx7MjA6WzIsNDFdLDIyOlsyLDQxXSwyODpbMiw0MV0sMzc6WzIsNDFdLDM4OlsyLDQxXSwzOTpbMiw0MV0sNDA6WzIsNDFdLDQxOlsyLDQxXSw0NTpbMiw0MV0sNDc6WzIsNDFdLDQ5OlsxLDQ5XX0sezI1OjUwLDQ1OlsxLDMxXSw0ODoyOX0sezIwOlsyLDQzXSwyMjpbMiw0M10sMjg6WzIsNDNdLDM3OlsyLDQzXSwzODpbMiw0M10sMzk6WzIsNDNdLDQwOlsyLDQzXSw0MTpbMiw0M10sNDU6WzIsNDNdLDQ3OlsyLDQzXSw0OTpbMiw0M119LHsyMjpbMSw1MV19LHsyMjpbMSw1Ml19LHsyMjpbMSw1M119LHsyODpbMSw1NF19LHsyMjpbMiw0Nl0sMjU6NTcsMzE6NTUsMzM6NTYsMzY6NjEsMzc6WzEsNThdLDM4OlsxLDU5XSwzOTpbMSw2MF0sNDA6WzEsNjJdLDQyOjYzLDQzOjY0LDQ0OjY2LDQ1OlsxLDY1XSw0NzpbMSwzMF0sNDg6Mjl9LHsyMjpbMiwzN10sMzc6WzIsMzddLDM4OlsyLDM3XSwzOTpbMiwzN10sNDA6WzIsMzddLDQ1OlsyLDM3XSw0NzpbMiwzN119LHsyMjpbMiwzOF0sMzc6WzIsMzhdLDM4OlsyLDM4XSwzOTpbMiwzOF0sNDA6WzIsMzhdLDQ1OlsyLDM4XSw0NzpbMiwzOF19LHsyMjpbMiwzOV0sMzc6WzIsMzldLDM4OlsyLDM5XSwzOTpbMiwzOV0sNDA6WzIsMzldLDQ1OlsyLDM5XSw0NzpbMiwzOV19LHs1OlsyLDExXSwxMDpbMiwxMV0sMTc6WzIsMTFdLDE4OlsyLDExXSwyMTpbMiwxMV0sMjM6WzIsMTFdLDI0OlsyLDExXSwyNjpbMiwxMV0sMjc6WzIsMTFdLDI5OlsyLDExXX0sezU6WzIsMTJdLDEwOlsyLDEyXSwxNzpbMiwxMl0sMTg6WzIsMTJdLDIxOlsyLDEyXSwyMzpbMiwxMl0sMjQ6WzIsMTJdLDI2OlsyLDEyXSwyNzpbMiwxMl0sMjk6WzIsMTJdfSx7MjU6NjcsNDU6WzEsMzFdLDQ4OjI5fSx7ODoxOSw5OjUsMTA6WzEsMTBdLDEyOjYsMTQ6NywxNTo4LDE2OjksMTc6WzEsMTFdLDE4OlsxLDEyXSwyMTpbMSwxNF0sMjM6WzEsMTNdLDI0OlsyLDNdLDI2OlsxLDE1XSwyNzpbMSwxNl0sMjk6WzEsMTddfSx7NDo2OCw4OjQsOTo1LDEwOlsxLDEwXSwxMjo2LDE0OjcsMTU6OCwxNjo5LDE3OlsxLDExXSwxODpbMSwxMl0sMjE6WzEsMTRdLDIzOlsxLDEzXSwyNDpbMiw1XSwyNjpbMSwxNV0sMjc6WzEsMTZdLDI5OlsxLDE3XX0sezEwOlsyLDI2XSwxNzpbMiwyNl0sMTg6WzIsMjZdLDIxOlsyLDI2XSwyMzpbMiwyNl0sMjQ6WzIsMjZdLDI2OlsyLDI2XSwyNzpbMiwyNl0sMjk6WzIsMjZdfSx7NTpbMiwxM10sMTA6WzIsMTNdLDE3OlsyLDEzXSwxODpbMiwxM10sMjE6WzIsMTNdLDIzOlsyLDEzXSwyNDpbMiwxM10sMjY6WzIsMTNdLDI3OlsyLDEzXSwyOTpbMiwxM119LHsxMDpbMiwxOF19LHsyMDpbMiw1MF0sMjI6WzIsNTBdLDI1OjU3LDI4OlsyLDUwXSwzMTo3MCwzNTo2OSwzNjo2MSwzNzpbMSw1OF0sMzg6WzEsNTldLDM5OlsxLDYwXSw0MDpbMSw2Ml0sNDE6WzIsNTBdLDQyOjcxLDQzOjY0LDQ0OjY2LDQ1OlsxLDY1XSw0NzpbMSwzMF0sNDg6Mjl9LHs0NTpbMSw3Ml19LHsyMDpbMiw0MF0sMjI6WzIsNDBdLDI4OlsyLDQwXSwzNzpbMiw0MF0sMzg6WzIsNDBdLDM5OlsyLDQwXSw0MDpbMiw0MF0sNDE6WzIsNDBdLDQ1OlsyLDQwXSw0NzpbMiw0MF19LHsxMDpbMiwyMF0sMTc6WzIsMjBdLDE4OlsyLDIwXSwyMTpbMiwyMF0sMjM6WzIsMjBdLDI0OlsyLDIwXSwyNjpbMiwyMF0sMjc6WzIsMjBdLDI5OlsyLDIwXX0sezEwOlsyLDE5XSwxNzpbMiwxOV0sMTg6WzIsMTldLDIxOlsyLDE5XSwyMzpbMiwxOV0sMjQ6WzIsMTldLDI2OlsyLDE5XSwyNzpbMiwxOV0sMjk6WzIsMTldfSx7NTpbMiwyMl0sMTA6WzIsMjJdLDE3OlsyLDIyXSwxODpbMiwyMl0sMjE6WzIsMjJdLDIzOlsyLDIyXSwyNDpbMiwyMl0sMjY6WzIsMjJdLDI3OlsyLDIyXSwyOTpbMiwyMl19LHs1OlsyLDIzXSwxMDpbMiwyM10sMTc6WzIsMjNdLDE4OlsyLDIzXSwyMTpbMiwyM10sMjM6WzIsMjNdLDI0OlsyLDIzXSwyNjpbMiwyM10sMjc6WzIsMjNdLDI5OlsyLDIzXX0sezIyOlsyLDQ0XSwzMjo3Myw0Mjo3NCw0Mzo2NCw0NDo2Niw0NTpbMSw3NV19LHsyMjpbMSw3Nl19LHsyMDpbMiwyOV0sMjI6WzIsMjldLDI4OlsyLDI5XSwzNzpbMiwyOV0sMzg6WzIsMjldLDM5OlsyLDI5XSw0MDpbMiwyOV0sNDE6WzIsMjldLDQ1OlsyLDI5XSw0NzpbMiwyOV19LHsyMDpbMiwzMF0sMjI6WzIsMzBdLDI4OlsyLDMwXSwzNzpbMiwzMF0sMzg6WzIsMzBdLDM5OlsyLDMwXSw0MDpbMiwzMF0sNDE6WzIsMzBdLDQ1OlsyLDMwXSw0NzpbMiwzMF19LHsyMDpbMiwzMV0sMjI6WzIsMzFdLDI4OlsyLDMxXSwzNzpbMiwzMV0sMzg6WzIsMzFdLDM5OlsyLDMxXSw0MDpbMiwzMV0sNDE6WzIsMzFdLDQ1OlsyLDMxXSw0NzpbMiwzMV19LHsyMDpbMiwzMl0sMjI6WzIsMzJdLDI4OlsyLDMyXSwzNzpbMiwzMl0sMzg6WzIsMzJdLDM5OlsyLDMyXSw0MDpbMiwzMl0sNDE6WzIsMzJdLDQ1OlsyLDMyXSw0NzpbMiwzMl19LHsyMDpbMiwzM10sMjI6WzIsMzNdLDI4OlsyLDMzXSwzNzpbMiwzM10sMzg6WzIsMzNdLDM5OlsyLDMzXSw0MDpbMiwzM10sNDE6WzIsMzNdLDQ1OlsyLDMzXSw0NzpbMiwzM119LHsxOTo3NywyNToyNywzNjoyOCw0NTpbMSwzMV0sNDc6WzEsMzBdLDQ4OjI5fSx7MjI6WzIsNDddfSx7MjA6WzIsMzVdLDIyOlsyLDM1XSwyODpbMiwzNV0sNDE6WzIsMzVdLDQ0Ojc4LDQ1OlsxLDc1XX0sezIwOlsyLDQzXSwyMjpbMiw0M10sMjg6WzIsNDNdLDM3OlsyLDQzXSwzODpbMiw0M10sMzk6WzIsNDNdLDQwOlsyLDQzXSw0MTpbMiw0M10sNDU6WzIsNDNdLDQ2OlsxLDc5XSw0NzpbMiw0M10sNDk6WzIsNDNdfSx7MjA6WzIsNTJdLDIyOlsyLDUyXSwyODpbMiw1Ml0sNDE6WzIsNTJdLDQ1OlsyLDUyXX0sezIyOlsxLDgwXX0sezg6MTksOTo1LDEwOlsxLDEwXSwxMjo2LDE0OjcsMTU6OCwxNjo5LDE3OlsxLDExXSwxODpbMSwxMl0sMjE6WzEsMTRdLDIzOlsxLDEzXSwyNDpbMiw0XSwyNjpbMSwxNV0sMjc6WzEsMTZdLDI5OlsxLDE3XX0sezIwOlsyLDI3XSwyMjpbMiwyN10sMjg6WzIsMjddLDQxOlsyLDI3XX0sezIwOlsyLDQ5XSwyMjpbMiw0OV0sMjg6WzIsNDldLDM3OlsyLDQ5XSwzODpbMiw0OV0sMzk6WzIsNDldLDQwOlsyLDQ5XSw0MTpbMiw0OV0sNDU6WzIsNDldLDQ3OlsyLDQ5XX0sezIwOlsyLDUxXSwyMjpbMiw1MV0sMjg6WzIsNTFdLDQxOlsyLDUxXX0sezIwOlsyLDQyXSwyMjpbMiw0Ml0sMjg6WzIsNDJdLDM3OlsyLDQyXSwzODpbMiw0Ml0sMzk6WzIsNDJdLDQwOlsyLDQyXSw0MTpbMiw0Ml0sNDU6WzIsNDJdLDQ3OlsyLDQyXSw0OTpbMiw0Ml19LHsyMjpbMSw4MV19LHsyMjpbMiw0NV19LHs0NjpbMSw3OV19LHs1OlsyLDI1XSwxMDpbMiwyNV0sMTc6WzIsMjVdLDE4OlsyLDI1XSwyMTpbMiwyNV0sMjM6WzIsMjVdLDI0OlsyLDI1XSwyNjpbMiwyNV0sMjc6WzIsMjVdLDI5OlsyLDI1XX0sezQxOlsxLDgyXX0sezIwOlsyLDUzXSwyMjpbMiw1M10sMjg6WzIsNTNdLDQxOlsyLDUzXSw0NTpbMiw1M119LHsyNTo1NywzMTo4MywzNjo2MSwzNzpbMSw1OF0sMzg6WzEsNTldLDM5OlsxLDYwXSw0MDpbMSw2Ml0sNDU6WzEsMzFdLDQ3OlsxLDMwXSw0ODoyOX0sezU6WzIsMjFdLDEwOlsyLDIxXSwxNzpbMiwyMV0sMTg6WzIsMjFdLDIxOlsyLDIxXSwyMzpbMiwyMV0sMjQ6WzIsMjFdLDI2OlsyLDIxXSwyNzpbMiwyMV0sMjk6WzIsMjFdfSx7NTpbMiwyNF0sMTA6WzIsMjRdLDE3OlsyLDI0XSwxODpbMiwyNF0sMjE6WzIsMjRdLDIzOlsyLDI0XSwyNDpbMiwyNF0sMjY6WzIsMjRdLDI3OlsyLDI0XSwyOTpbMiwyNF19LHsyMDpbMiwzNF0sMjI6WzIsMzRdLDI4OlsyLDM0XSwzNzpbMiwzNF0sMzg6WzIsMzRdLDM5OlsyLDM0XSw0MDpbMiwzNF0sNDE6WzIsMzRdLDQ1OlsyLDM0XSw0NzpbMiwzNF19LHsyMDpbMiwzNl0sMjI6WzIsMzZdLDI4OlsyLDM2XSw0MTpbMiwzNl0sNDU6WzIsMzZdfV0sXG5kZWZhdWx0QWN0aW9uczogezM6WzIsMl0sMTg6WzIsMV0sNDc6WzIsMThdLDYzOlsyLDQ3XSw3NDpbMiw0NV19LFxucGFyc2VFcnJvcjogZnVuY3Rpb24gcGFyc2VFcnJvcihzdHIsIGhhc2gpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3Ioc3RyKTtcbn0sXG5wYXJzZTogZnVuY3Rpb24gcGFyc2UoaW5wdXQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXMsIHN0YWNrID0gWzBdLCB2c3RhY2sgPSBbbnVsbF0sIGxzdGFjayA9IFtdLCB0YWJsZSA9IHRoaXMudGFibGUsIHl5dGV4dCA9IFwiXCIsIHl5bGluZW5vID0gMCwgeXlsZW5nID0gMCwgcmVjb3ZlcmluZyA9IDAsIFRFUlJPUiA9IDIsIEVPRiA9IDE7XG4gICAgdGhpcy5sZXhlci5zZXRJbnB1dChpbnB1dCk7XG4gICAgdGhpcy5sZXhlci55eSA9IHRoaXMueXk7XG4gICAgdGhpcy55eS5sZXhlciA9IHRoaXMubGV4ZXI7XG4gICAgdGhpcy55eS5wYXJzZXIgPSB0aGlzO1xuICAgIGlmICh0eXBlb2YgdGhpcy5sZXhlci55eWxsb2MgPT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgdGhpcy5sZXhlci55eWxsb2MgPSB7fTtcbiAgICB2YXIgeXlsb2MgPSB0aGlzLmxleGVyLnl5bGxvYztcbiAgICBsc3RhY2sucHVzaCh5eWxvYyk7XG4gICAgdmFyIHJhbmdlcyA9IHRoaXMubGV4ZXIub3B0aW9ucyAmJiB0aGlzLmxleGVyLm9wdGlvbnMucmFuZ2VzO1xuICAgIGlmICh0eXBlb2YgdGhpcy55eS5wYXJzZUVycm9yID09PSBcImZ1bmN0aW9uXCIpXG4gICAgICAgIHRoaXMucGFyc2VFcnJvciA9IHRoaXMueXkucGFyc2VFcnJvcjtcbiAgICBmdW5jdGlvbiBwb3BTdGFjayhuKSB7XG4gICAgICAgIHN0YWNrLmxlbmd0aCA9IHN0YWNrLmxlbmd0aCAtIDIgKiBuO1xuICAgICAgICB2c3RhY2subGVuZ3RoID0gdnN0YWNrLmxlbmd0aCAtIG47XG4gICAgICAgIGxzdGFjay5sZW5ndGggPSBsc3RhY2subGVuZ3RoIC0gbjtcbiAgICB9XG4gICAgZnVuY3Rpb24gbGV4KCkge1xuICAgICAgICB2YXIgdG9rZW47XG4gICAgICAgIHRva2VuID0gc2VsZi5sZXhlci5sZXgoKSB8fCAxO1xuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICB0b2tlbiA9IHNlbGYuc3ltYm9sc19bdG9rZW5dIHx8IHRva2VuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9XG4gICAgdmFyIHN5bWJvbCwgcHJlRXJyb3JTeW1ib2wsIHN0YXRlLCBhY3Rpb24sIGEsIHIsIHl5dmFsID0ge30sIHAsIGxlbiwgbmV3U3RhdGUsIGV4cGVjdGVkO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHN0YXRlID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgIGlmICh0aGlzLmRlZmF1bHRBY3Rpb25zW3N0YXRlXSkge1xuICAgICAgICAgICAgYWN0aW9uID0gdGhpcy5kZWZhdWx0QWN0aW9uc1tzdGF0ZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoc3ltYm9sID09PSBudWxsIHx8IHR5cGVvZiBzeW1ib2wgPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHN5bWJvbCA9IGxleCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWN0aW9uID0gdGFibGVbc3RhdGVdICYmIHRhYmxlW3N0YXRlXVtzeW1ib2xdO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgYWN0aW9uID09PSBcInVuZGVmaW5lZFwiIHx8ICFhY3Rpb24ubGVuZ3RoIHx8ICFhY3Rpb25bMF0pIHtcbiAgICAgICAgICAgIHZhciBlcnJTdHIgPSBcIlwiO1xuICAgICAgICAgICAgaWYgKCFyZWNvdmVyaW5nKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHAgaW4gdGFibGVbc3RhdGVdKVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50ZXJtaW5hbHNfW3BdICYmIHAgPiAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZC5wdXNoKFwiJ1wiICsgdGhpcy50ZXJtaW5hbHNfW3BdICsgXCInXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGV4ZXIuc2hvd1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyclN0ciA9IFwiUGFyc2UgZXJyb3Igb24gbGluZSBcIiArICh5eWxpbmVubyArIDEpICsgXCI6XFxuXCIgKyB0aGlzLmxleGVyLnNob3dQb3NpdGlvbigpICsgXCJcXG5FeHBlY3RpbmcgXCIgKyBleHBlY3RlZC5qb2luKFwiLCBcIikgKyBcIiwgZ290ICdcIiArICh0aGlzLnRlcm1pbmFsc19bc3ltYm9sXSB8fCBzeW1ib2wpICsgXCInXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyU3RyID0gXCJQYXJzZSBlcnJvciBvbiBsaW5lIFwiICsgKHl5bGluZW5vICsgMSkgKyBcIjogVW5leHBlY3RlZCBcIiArIChzeW1ib2wgPT0gMT9cImVuZCBvZiBpbnB1dFwiOlwiJ1wiICsgKHRoaXMudGVybWluYWxzX1tzeW1ib2xdIHx8IHN5bWJvbCkgKyBcIidcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMucGFyc2VFcnJvcihlcnJTdHIsIHt0ZXh0OiB0aGlzLmxleGVyLm1hdGNoLCB0b2tlbjogdGhpcy50ZXJtaW5hbHNfW3N5bWJvbF0gfHwgc3ltYm9sLCBsaW5lOiB0aGlzLmxleGVyLnl5bGluZW5vLCBsb2M6IHl5bG9jLCBleHBlY3RlZDogZXhwZWN0ZWR9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoYWN0aW9uWzBdIGluc3RhbmNlb2YgQXJyYXkgJiYgYWN0aW9uLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBhcnNlIEVycm9yOiBtdWx0aXBsZSBhY3Rpb25zIHBvc3NpYmxlIGF0IHN0YXRlOiBcIiArIHN0YXRlICsgXCIsIHRva2VuOiBcIiArIHN5bWJvbCk7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChhY3Rpb25bMF0pIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgc3RhY2sucHVzaChzeW1ib2wpO1xuICAgICAgICAgICAgdnN0YWNrLnB1c2godGhpcy5sZXhlci55eXRleHQpO1xuICAgICAgICAgICAgbHN0YWNrLnB1c2godGhpcy5sZXhlci55eWxsb2MpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChhY3Rpb25bMV0pO1xuICAgICAgICAgICAgc3ltYm9sID0gbnVsbDtcbiAgICAgICAgICAgIGlmICghcHJlRXJyb3JTeW1ib2wpIHtcbiAgICAgICAgICAgICAgICB5eWxlbmcgPSB0aGlzLmxleGVyLnl5bGVuZztcbiAgICAgICAgICAgICAgICB5eXRleHQgPSB0aGlzLmxleGVyLnl5dGV4dDtcbiAgICAgICAgICAgICAgICB5eWxpbmVubyA9IHRoaXMubGV4ZXIueXlsaW5lbm87XG4gICAgICAgICAgICAgICAgeXlsb2MgPSB0aGlzLmxleGVyLnl5bGxvYztcbiAgICAgICAgICAgICAgICBpZiAocmVjb3ZlcmluZyA+IDApXG4gICAgICAgICAgICAgICAgICAgIHJlY292ZXJpbmctLTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3ltYm9sID0gcHJlRXJyb3JTeW1ib2w7XG4gICAgICAgICAgICAgICAgcHJlRXJyb3JTeW1ib2wgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGxlbiA9IHRoaXMucHJvZHVjdGlvbnNfW2FjdGlvblsxXV1bMV07XG4gICAgICAgICAgICB5eXZhbC4kID0gdnN0YWNrW3ZzdGFjay5sZW5ndGggLSBsZW5dO1xuICAgICAgICAgICAgeXl2YWwuXyQgPSB7Zmlyc3RfbGluZTogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5maXJzdF9saW5lLCBsYXN0X2xpbmU6IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gMV0ubGFzdF9saW5lLCBmaXJzdF9jb2x1bW46IGxzdGFja1tsc3RhY2subGVuZ3RoIC0gKGxlbiB8fCAxKV0uZmlyc3RfY29sdW1uLCBsYXN0X2NvbHVtbjogbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5sYXN0X2NvbHVtbn07XG4gICAgICAgICAgICBpZiAocmFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgeXl2YWwuXyQucmFuZ2UgPSBbbHN0YWNrW2xzdGFjay5sZW5ndGggLSAobGVuIHx8IDEpXS5yYW5nZVswXSwgbHN0YWNrW2xzdGFjay5sZW5ndGggLSAxXS5yYW5nZVsxXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByID0gdGhpcy5wZXJmb3JtQWN0aW9uLmNhbGwoeXl2YWwsIHl5dGV4dCwgeXlsZW5nLCB5eWxpbmVubywgdGhpcy55eSwgYWN0aW9uWzFdLCB2c3RhY2ssIGxzdGFjayk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsZW4pIHtcbiAgICAgICAgICAgICAgICBzdGFjayA9IHN0YWNrLnNsaWNlKDAsIC0xICogbGVuICogMik7XG4gICAgICAgICAgICAgICAgdnN0YWNrID0gdnN0YWNrLnNsaWNlKDAsIC0xICogbGVuKTtcbiAgICAgICAgICAgICAgICBsc3RhY2sgPSBsc3RhY2suc2xpY2UoMCwgLTEgKiBsZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhY2sucHVzaCh0aGlzLnByb2R1Y3Rpb25zX1thY3Rpb25bMV1dWzBdKTtcbiAgICAgICAgICAgIHZzdGFjay5wdXNoKHl5dmFsLiQpO1xuICAgICAgICAgICAgbHN0YWNrLnB1c2goeXl2YWwuXyQpO1xuICAgICAgICAgICAgbmV3U3RhdGUgPSB0YWJsZVtzdGFja1tzdGFjay5sZW5ndGggLSAyXV1bc3RhY2tbc3RhY2subGVuZ3RoIC0gMV1dO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXdTdGF0ZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG59O1xuXG5cbmZ1bmN0aW9uIHN0cmlwRmxhZ3Mob3BlbiwgY2xvc2UpIHtcbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBvcGVuLmNoYXJBdCgyKSA9PT0gJ34nLFxuICAgIHJpZ2h0OiBjbG9zZS5jaGFyQXQoMCkgPT09ICd+JyB8fCBjbG9zZS5jaGFyQXQoMSkgPT09ICd+J1xuICB9O1xufVxuXG4vKiBKaXNvbiBnZW5lcmF0ZWQgbGV4ZXIgKi9cbnZhciBsZXhlciA9IChmdW5jdGlvbigpe1xudmFyIGxleGVyID0gKHtFT0Y6MSxcbnBhcnNlRXJyb3I6ZnVuY3Rpb24gcGFyc2VFcnJvcihzdHIsIGhhc2gpIHtcbiAgICAgICAgaWYgKHRoaXMueXkucGFyc2VyKSB7XG4gICAgICAgICAgICB0aGlzLnl5LnBhcnNlci5wYXJzZUVycm9yKHN0ciwgaGFzaCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3RyKTtcbiAgICAgICAgfVxuICAgIH0sXG5zZXRJbnB1dDpmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICAgICAgdGhpcy5faW5wdXQgPSBpbnB1dDtcbiAgICAgICAgdGhpcy5fbW9yZSA9IHRoaXMuX2xlc3MgPSB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy55eWxpbmVubyA9IHRoaXMueXlsZW5nID0gMDtcbiAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLm1hdGNoZWQgPSB0aGlzLm1hdGNoID0gJyc7XG4gICAgICAgIHRoaXMuY29uZGl0aW9uU3RhY2sgPSBbJ0lOSVRJQUwnXTtcbiAgICAgICAgdGhpcy55eWxsb2MgPSB7Zmlyc3RfbGluZToxLGZpcnN0X2NvbHVtbjowLGxhc3RfbGluZToxLGxhc3RfY29sdW1uOjB9O1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykgdGhpcy55eWxsb2MucmFuZ2UgPSBbMCwwXTtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSAwO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuaW5wdXQ6ZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY2ggPSB0aGlzLl9pbnB1dFswXTtcbiAgICAgICAgdGhpcy55eXRleHQgKz0gY2g7XG4gICAgICAgIHRoaXMueXlsZW5nKys7XG4gICAgICAgIHRoaXMub2Zmc2V0Kys7XG4gICAgICAgIHRoaXMubWF0Y2ggKz0gY2g7XG4gICAgICAgIHRoaXMubWF0Y2hlZCArPSBjaDtcbiAgICAgICAgdmFyIGxpbmVzID0gY2gubWF0Y2goLyg/Olxcclxcbj98XFxuKS4qL2cpO1xuICAgICAgICBpZiAobGluZXMpIHtcbiAgICAgICAgICAgIHRoaXMueXlsaW5lbm8rKztcbiAgICAgICAgICAgIHRoaXMueXlsbG9jLmxhc3RfbGluZSsrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy55eWxsb2MubGFzdF9jb2x1bW4rKztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykgdGhpcy55eWxsb2MucmFuZ2VbMV0rKztcblxuICAgICAgICB0aGlzLl9pbnB1dCA9IHRoaXMuX2lucHV0LnNsaWNlKDEpO1xuICAgICAgICByZXR1cm4gY2g7XG4gICAgfSxcbnVucHV0OmZ1bmN0aW9uIChjaCkge1xuICAgICAgICB2YXIgbGVuID0gY2gubGVuZ3RoO1xuICAgICAgICB2YXIgbGluZXMgPSBjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuXG4gICAgICAgIHRoaXMuX2lucHV0ID0gY2ggKyB0aGlzLl9pbnB1dDtcbiAgICAgICAgdGhpcy55eXRleHQgPSB0aGlzLnl5dGV4dC5zdWJzdHIoMCwgdGhpcy55eXRleHQubGVuZ3RoLWxlbi0xKTtcbiAgICAgICAgLy90aGlzLnl5bGVuZyAtPSBsZW47XG4gICAgICAgIHRoaXMub2Zmc2V0IC09IGxlbjtcbiAgICAgICAgdmFyIG9sZExpbmVzID0gdGhpcy5tYXRjaC5zcGxpdCgvKD86XFxyXFxuP3xcXG4pL2cpO1xuICAgICAgICB0aGlzLm1hdGNoID0gdGhpcy5tYXRjaC5zdWJzdHIoMCwgdGhpcy5tYXRjaC5sZW5ndGgtMSk7XG4gICAgICAgIHRoaXMubWF0Y2hlZCA9IHRoaXMubWF0Y2hlZC5zdWJzdHIoMCwgdGhpcy5tYXRjaGVkLmxlbmd0aC0xKTtcblxuICAgICAgICBpZiAobGluZXMubGVuZ3RoLTEpIHRoaXMueXlsaW5lbm8gLT0gbGluZXMubGVuZ3RoLTE7XG4gICAgICAgIHZhciByID0gdGhpcy55eWxsb2MucmFuZ2U7XG5cbiAgICAgICAgdGhpcy55eWxsb2MgPSB7Zmlyc3RfbGluZTogdGhpcy55eWxsb2MuZmlyc3RfbGluZSxcbiAgICAgICAgICBsYXN0X2xpbmU6IHRoaXMueXlsaW5lbm8rMSxcbiAgICAgICAgICBmaXJzdF9jb2x1bW46IHRoaXMueXlsbG9jLmZpcnN0X2NvbHVtbixcbiAgICAgICAgICBsYXN0X2NvbHVtbjogbGluZXMgP1xuICAgICAgICAgICAgICAobGluZXMubGVuZ3RoID09PSBvbGRMaW5lcy5sZW5ndGggPyB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4gOiAwKSArIG9sZExpbmVzW29sZExpbmVzLmxlbmd0aCAtIGxpbmVzLmxlbmd0aF0ubGVuZ3RoIC0gbGluZXNbMF0ubGVuZ3RoOlxuICAgICAgICAgICAgICB0aGlzLnl5bGxvYy5maXJzdF9jb2x1bW4gLSBsZW5cbiAgICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMucmFuZ2VzKSB7XG4gICAgICAgICAgICB0aGlzLnl5bGxvYy5yYW5nZSA9IFtyWzBdLCByWzBdICsgdGhpcy55eWxlbmcgLSBsZW5dO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5tb3JlOmZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fbW9yZSA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5sZXNzOmZ1bmN0aW9uIChuKSB7XG4gICAgICAgIHRoaXMudW5wdXQodGhpcy5tYXRjaC5zbGljZShuKSk7XG4gICAgfSxcbnBhc3RJbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXN0ID0gdGhpcy5tYXRjaGVkLnN1YnN0cigwLCB0aGlzLm1hdGNoZWQubGVuZ3RoIC0gdGhpcy5tYXRjaC5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gKHBhc3QubGVuZ3RoID4gMjAgPyAnLi4uJzonJykgKyBwYXN0LnN1YnN0cigtMjApLnJlcGxhY2UoL1xcbi9nLCBcIlwiKTtcbiAgICB9LFxudXBjb21pbmdJbnB1dDpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuZXh0ID0gdGhpcy5tYXRjaDtcbiAgICAgICAgaWYgKG5leHQubGVuZ3RoIDwgMjApIHtcbiAgICAgICAgICAgIG5leHQgKz0gdGhpcy5faW5wdXQuc3Vic3RyKDAsIDIwLW5leHQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKG5leHQuc3Vic3RyKDAsMjApKyhuZXh0Lmxlbmd0aCA+IDIwID8gJy4uLic6JycpKS5yZXBsYWNlKC9cXG4vZywgXCJcIik7XG4gICAgfSxcbnNob3dQb3NpdGlvbjpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwcmUgPSB0aGlzLnBhc3RJbnB1dCgpO1xuICAgICAgICB2YXIgYyA9IG5ldyBBcnJheShwcmUubGVuZ3RoICsgMSkuam9pbihcIi1cIik7XG4gICAgICAgIHJldHVybiBwcmUgKyB0aGlzLnVwY29taW5nSW5wdXQoKSArIFwiXFxuXCIgKyBjK1wiXlwiO1xuICAgIH0sXG5uZXh0OmZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuZG9uZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuRU9GO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5faW5wdXQpIHRoaXMuZG9uZSA9IHRydWU7XG5cbiAgICAgICAgdmFyIHRva2VuLFxuICAgICAgICAgICAgbWF0Y2gsXG4gICAgICAgICAgICB0ZW1wTWF0Y2gsXG4gICAgICAgICAgICBpbmRleCxcbiAgICAgICAgICAgIGNvbCxcbiAgICAgICAgICAgIGxpbmVzO1xuICAgICAgICBpZiAoIXRoaXMuX21vcmUpIHtcbiAgICAgICAgICAgIHRoaXMueXl0ZXh0ID0gJyc7XG4gICAgICAgICAgICB0aGlzLm1hdGNoID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJ1bGVzID0gdGhpcy5fY3VycmVudFJ1bGVzKCk7XG4gICAgICAgIGZvciAodmFyIGk9MDtpIDwgcnVsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRlbXBNYXRjaCA9IHRoaXMuX2lucHV0Lm1hdGNoKHRoaXMucnVsZXNbcnVsZXNbaV1dKTtcbiAgICAgICAgICAgIGlmICh0ZW1wTWF0Y2ggJiYgKCFtYXRjaCB8fCB0ZW1wTWF0Y2hbMF0ubGVuZ3RoID4gbWF0Y2hbMF0ubGVuZ3RoKSkge1xuICAgICAgICAgICAgICAgIG1hdGNoID0gdGVtcE1hdGNoO1xuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5mbGV4KSBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIGxpbmVzID0gbWF0Y2hbMF0ubWF0Y2goLyg/Olxcclxcbj98XFxuKS4qL2cpO1xuICAgICAgICAgICAgaWYgKGxpbmVzKSB0aGlzLnl5bGluZW5vICs9IGxpbmVzLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMueXlsbG9jID0ge2ZpcnN0X2xpbmU6IHRoaXMueXlsbG9jLmxhc3RfbGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfbGluZTogdGhpcy55eWxpbmVubysxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RfY29sdW1uOiB0aGlzLnl5bGxvYy5sYXN0X2NvbHVtbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RfY29sdW1uOiBsaW5lcyA/IGxpbmVzW2xpbmVzLmxlbmd0aC0xXS5sZW5ndGgtbGluZXNbbGluZXMubGVuZ3RoLTFdLm1hdGNoKC9cXHI/XFxuPy8pWzBdLmxlbmd0aCA6IHRoaXMueXlsbG9jLmxhc3RfY29sdW1uICsgbWF0Y2hbMF0ubGVuZ3RofTtcbiAgICAgICAgICAgIHRoaXMueXl0ZXh0ICs9IG1hdGNoWzBdO1xuICAgICAgICAgICAgdGhpcy5tYXRjaCArPSBtYXRjaFswXTtcbiAgICAgICAgICAgIHRoaXMubWF0Y2hlcyA9IG1hdGNoO1xuICAgICAgICAgICAgdGhpcy55eWxlbmcgPSB0aGlzLnl5dGV4dC5sZW5ndGg7XG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJhbmdlcykge1xuICAgICAgICAgICAgICAgIHRoaXMueXlsbG9jLnJhbmdlID0gW3RoaXMub2Zmc2V0LCB0aGlzLm9mZnNldCArPSB0aGlzLnl5bGVuZ107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9tb3JlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9pbnB1dCA9IHRoaXMuX2lucHV0LnNsaWNlKG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgICAgICB0aGlzLm1hdGNoZWQgKz0gbWF0Y2hbMF07XG4gICAgICAgICAgICB0b2tlbiA9IHRoaXMucGVyZm9ybUFjdGlvbi5jYWxsKHRoaXMsIHRoaXMueXksIHRoaXMsIHJ1bGVzW2luZGV4XSx0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoLTFdKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmRvbmUgJiYgdGhpcy5faW5wdXQpIHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHRva2VuKSByZXR1cm4gdG9rZW47XG4gICAgICAgICAgICBlbHNlIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5faW5wdXQgPT09IFwiXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLkVPRjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRXJyb3IoJ0xleGljYWwgZXJyb3Igb24gbGluZSAnKyh0aGlzLnl5bGluZW5vKzEpKycuIFVucmVjb2duaXplZCB0ZXh0LlxcbicrdGhpcy5zaG93UG9zaXRpb24oKSxcbiAgICAgICAgICAgICAgICAgICAge3RleHQ6IFwiXCIsIHRva2VuOiBudWxsLCBsaW5lOiB0aGlzLnl5bGluZW5vfSk7XG4gICAgICAgIH1cbiAgICB9LFxubGV4OmZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHIgPSB0aGlzLm5leHQoKTtcbiAgICAgICAgaWYgKHR5cGVvZiByICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sZXgoKTtcbiAgICAgICAgfVxuICAgIH0sXG5iZWdpbjpmdW5jdGlvbiBiZWdpbihjb25kaXRpb24pIHtcbiAgICAgICAgdGhpcy5jb25kaXRpb25TdGFjay5wdXNoKGNvbmRpdGlvbik7XG4gICAgfSxcbnBvcFN0YXRlOmZ1bmN0aW9uIHBvcFN0YXRlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25TdGFjay5wb3AoKTtcbiAgICB9LFxuX2N1cnJlbnRSdWxlczpmdW5jdGlvbiBfY3VycmVudFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25kaXRpb25zW3RoaXMuY29uZGl0aW9uU3RhY2tbdGhpcy5jb25kaXRpb25TdGFjay5sZW5ndGgtMV1dLnJ1bGVzO1xuICAgIH0sXG50b3BTdGF0ZTpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmRpdGlvblN0YWNrW3RoaXMuY29uZGl0aW9uU3RhY2subGVuZ3RoLTJdO1xuICAgIH0sXG5wdXNoU3RhdGU6ZnVuY3Rpb24gYmVnaW4oY29uZGl0aW9uKSB7XG4gICAgICAgIHRoaXMuYmVnaW4oY29uZGl0aW9uKTtcbiAgICB9fSk7XG5sZXhlci5vcHRpb25zID0ge307XG5sZXhlci5wZXJmb3JtQWN0aW9uID0gZnVuY3Rpb24gYW5vbnltb3VzKHl5LHl5XywkYXZvaWRpbmdfbmFtZV9jb2xsaXNpb25zLFlZX1NUQVJUKSB7XG5cblxuZnVuY3Rpb24gc3RyaXAoc3RhcnQsIGVuZCkge1xuICByZXR1cm4geXlfLnl5dGV4dCA9IHl5Xy55eXRleHQuc3Vic3RyKHN0YXJ0LCB5eV8ueXlsZW5nLWVuZCk7XG59XG5cblxudmFyIFlZU1RBVEU9WVlfU1RBUlRcbnN3aXRjaCgkYXZvaWRpbmdfbmFtZV9jb2xsaXNpb25zKSB7XG5jYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHl5Xy55eXRleHQuc2xpY2UoLTIpID09PSBcIlxcXFxcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpcCgwLDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW4oXCJtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKHl5Xy55eXRleHQuc2xpY2UoLTEpID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmlwKDAsMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpbihcImVtdVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKFwibXVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoeXlfLnl5dGV4dCkgcmV0dXJuIDEwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5icmVhaztcbmNhc2UgMTpyZXR1cm4gMTA7XG5icmVhaztcbmNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3BTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbmJyZWFrO1xuY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHl5Xy55eXRleHQgPSB5eV8ueXl0ZXh0LnN1YnN0cig1LCB5eV8ueXlsZW5nLTkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbmJyZWFrO1xuY2FzZSA0OiByZXR1cm4gMTA7IFxuYnJlYWs7XG5jYXNlIDU6c3RyaXAoMCw0KTsgdGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMTc7XG5icmVhaztcbmNhc2UgNjpyZXR1cm4gNDA7XG5icmVhaztcbmNhc2UgNzpyZXR1cm4gNDE7XG5icmVhaztcbmNhc2UgODogcmV0dXJuIDE4OyBcbmJyZWFrO1xuY2FzZSA5OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9wU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luKCdyYXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMjA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbmJyZWFrO1xuY2FzZSAxMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5eV8ueXl0ZXh0ID0geXlfLnl5dGV4dC5zdWJzdHIoNCwgeXlfLnl5bGVuZy04KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdSQVdfQkxPQ0snO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG5icmVhaztcbmNhc2UgMTE6cmV0dXJuIDI5O1xuYnJlYWs7XG5jYXNlIDEyOnJldHVybiAyMTtcbmJyZWFrO1xuY2FzZSAxMzpyZXR1cm4gMjQ7XG5icmVhaztcbmNhc2UgMTQ6cmV0dXJuIDIzO1xuYnJlYWs7XG5jYXNlIDE1OnJldHVybiAyMztcbmJyZWFrO1xuY2FzZSAxNjpyZXR1cm4gMjc7XG5icmVhaztcbmNhc2UgMTc6cmV0dXJuIDI2O1xuYnJlYWs7XG5jYXNlIDE4OnRoaXMucG9wU3RhdGUoKTsgdGhpcy5iZWdpbignY29tJyk7XG5icmVhaztcbmNhc2UgMTk6c3RyaXAoMyw1KTsgdGhpcy5wb3BTdGF0ZSgpOyByZXR1cm4gMTc7XG5icmVhaztcbmNhc2UgMjA6cmV0dXJuIDI2O1xuYnJlYWs7XG5jYXNlIDIxOnJldHVybiA0NjtcbmJyZWFrO1xuY2FzZSAyMjpyZXR1cm4gNDU7XG5icmVhaztcbmNhc2UgMjM6cmV0dXJuIDQ1O1xuYnJlYWs7XG5jYXNlIDI0OnJldHVybiA0OTtcbmJyZWFrO1xuY2FzZSAyNTovLyBpZ25vcmUgd2hpdGVzcGFjZVxuYnJlYWs7XG5jYXNlIDI2OnRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDI4O1xuYnJlYWs7XG5jYXNlIDI3OnRoaXMucG9wU3RhdGUoKTsgcmV0dXJuIDIyO1xuYnJlYWs7XG5jYXNlIDI4Onl5Xy55eXRleHQgPSBzdHJpcCgxLDIpLnJlcGxhY2UoL1xcXFxcIi9nLCdcIicpOyByZXR1cm4gMzc7XG5icmVhaztcbmNhc2UgMjk6eXlfLnl5dGV4dCA9IHN0cmlwKDEsMikucmVwbGFjZSgvXFxcXCcvZyxcIidcIik7IHJldHVybiAzNztcbmJyZWFrO1xuY2FzZSAzMDpyZXR1cm4gNDc7XG5icmVhaztcbmNhc2UgMzE6cmV0dXJuIDM5O1xuYnJlYWs7XG5jYXNlIDMyOnJldHVybiAzOTtcbmJyZWFrO1xuY2FzZSAzMzpyZXR1cm4gMzg7XG5icmVhaztcbmNhc2UgMzQ6cmV0dXJuIDQ1O1xuYnJlYWs7XG5jYXNlIDM1Onl5Xy55eXRleHQgPSBzdHJpcCgxLDIpOyByZXR1cm4gNDU7XG5icmVhaztcbmNhc2UgMzY6cmV0dXJuICdJTlZBTElEJztcbmJyZWFrO1xuY2FzZSAzNzpyZXR1cm4gNTtcbmJyZWFrO1xufVxufTtcbmxleGVyLnJ1bGVzID0gWy9eKD86W15cXHgwMF0qPyg/PShcXHtcXHspKSkvLC9eKD86W15cXHgwMF0rKS8sL14oPzpbXlxceDAwXXsyLH0/KD89KFxce1xce3xcXFxcXFx7XFx7fFxcXFxcXFxcXFx7XFx7fCQpKSkvLC9eKD86XFx7XFx7XFx7XFx7XFwvW15cXHMhXCIjJS0sXFwuXFwvOy0+QFxcWy1cXF5gXFx7LX5dKyg/PVs9fVxcc1xcLy5dKVxcfVxcfVxcfVxcfSkvLC9eKD86W15cXHgwMF0qPyg/PShcXHtcXHtcXHtcXHtcXC8pKSkvLC9eKD86W1xcc1xcU10qPy0tXFx9XFx9KS8sL14oPzpcXCgpLywvXig/OlxcKSkvLC9eKD86XFx7XFx7XFx7XFx7KS8sL14oPzpcXH1cXH1cXH1cXH0pLywvXig/Olxce1xce1xce1xce1teXFx4MDBdKlxcfVxcfVxcfVxcfSkvLC9eKD86XFx7XFx7KH4pPz4pLywvXig/Olxce1xceyh+KT8jKS8sL14oPzpcXHtcXHsofik/XFwvKS8sL14oPzpcXHtcXHsofik/XFxeKS8sL14oPzpcXHtcXHsofik/XFxzKmVsc2VcXGIpLywvXig/Olxce1xceyh+KT9cXHspLywvXig/Olxce1xceyh+KT8mKS8sL14oPzpcXHtcXHshLS0pLywvXig/Olxce1xceyFbXFxzXFxTXSo/XFx9XFx9KS8sL14oPzpcXHtcXHsofik/KS8sL14oPzo9KS8sL14oPzpcXC5cXC4pLywvXig/OlxcLig/PShbPX59XFxzXFwvLildKSkpLywvXig/OltcXC8uXSkvLC9eKD86XFxzKykvLC9eKD86XFx9KH4pP1xcfVxcfSkvLC9eKD86KH4pP1xcfVxcfSkvLC9eKD86XCIoXFxcXFtcIl18W15cIl0pKlwiKS8sL14oPzonKFxcXFxbJ118W14nXSkqJykvLC9eKD86QCkvLC9eKD86dHJ1ZSg/PShbfn1cXHMpXSkpKS8sL14oPzpmYWxzZSg/PShbfn1cXHMpXSkpKS8sL14oPzotP1swLTldKyg/OlxcLlswLTldKyk/KD89KFt+fVxccyldKSkpLywvXig/OihbXlxccyFcIiMlLSxcXC5cXC87LT5AXFxbLVxcXmBcXHstfl0rKD89KFs9fn1cXHNcXC8uKV0pKSkpLywvXig/OlxcW1teXFxdXSpcXF0pLywvXig/Oi4pLywvXig/OiQpL107XG5sZXhlci5jb25kaXRpb25zID0ge1wibXVcIjp7XCJydWxlc1wiOls2LDcsOCw5LDEwLDExLDEyLDEzLDE0LDE1LDE2LDE3LDE4LDE5LDIwLDIxLDIyLDIzLDI0LDI1LDI2LDI3LDI4LDI5LDMwLDMxLDMyLDMzLDM0LDM1LDM2LDM3XSxcImluY2x1c2l2ZVwiOmZhbHNlfSxcImVtdVwiOntcInJ1bGVzXCI6WzJdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiY29tXCI6e1wicnVsZXNcIjpbNV0sXCJpbmNsdXNpdmVcIjpmYWxzZX0sXCJyYXdcIjp7XCJydWxlc1wiOlszLDRdLFwiaW5jbHVzaXZlXCI6ZmFsc2V9LFwiSU5JVElBTFwiOntcInJ1bGVzXCI6WzAsMSwzN10sXCJpbmNsdXNpdmVcIjp0cnVlfX07XG5yZXR1cm4gbGV4ZXI7fSkoKVxucGFyc2VyLmxleGVyID0gbGV4ZXI7XG5mdW5jdGlvbiBQYXJzZXIgKCkgeyB0aGlzLnl5ID0ge307IH1QYXJzZXIucHJvdG90eXBlID0gcGFyc2VyO3BhcnNlci5QYXJzZXIgPSBQYXJzZXI7XG5yZXR1cm4gbmV3IFBhcnNlcjtcbn0pKCk7ZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBoYW5kbGViYXJzO1xuLyoganNoaW50IGlnbm9yZTplbmQgKi8iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBWaXNpdG9yID0gcmVxdWlyZShcIi4vdmlzaXRvclwiKVtcImRlZmF1bHRcIl07XG5cbmZ1bmN0aW9uIHByaW50KGFzdCkge1xuICByZXR1cm4gbmV3IFByaW50VmlzaXRvcigpLmFjY2VwdChhc3QpO1xufVxuXG5leHBvcnRzLnByaW50ID0gcHJpbnQ7ZnVuY3Rpb24gUHJpbnRWaXNpdG9yKCkge1xuICB0aGlzLnBhZGRpbmcgPSAwO1xufVxuXG5leHBvcnRzLlByaW50VmlzaXRvciA9IFByaW50VmlzaXRvcjtQcmludFZpc2l0b3IucHJvdG90eXBlID0gbmV3IFZpc2l0b3IoKTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5wYWQgPSBmdW5jdGlvbihzdHJpbmcsIG5ld2xpbmUpIHtcbiAgdmFyIG91dCA9IFwiXCI7XG5cbiAgZm9yKHZhciBpPTAsbD10aGlzLnBhZGRpbmc7IGk8bDsgaSsrKSB7XG4gICAgb3V0ID0gb3V0ICsgXCIgIFwiO1xuICB9XG5cbiAgb3V0ID0gb3V0ICsgc3RyaW5nO1xuXG4gIGlmKG5ld2xpbmUgIT09IGZhbHNlKSB7IG91dCA9IG91dCArIFwiXFxuXCI7IH1cbiAgcmV0dXJuIG91dDtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUucHJvZ3JhbSA9IGZ1bmN0aW9uKHByb2dyYW0pIHtcbiAgdmFyIG91dCA9IFwiXCIsXG4gICAgICBzdGF0ZW1lbnRzID0gcHJvZ3JhbS5zdGF0ZW1lbnRzLFxuICAgICAgaSwgbDtcblxuICBmb3IoaT0wLCBsPXN0YXRlbWVudHMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KHN0YXRlbWVudHNbaV0pO1xuICB9XG5cbiAgdGhpcy5wYWRkaW5nLS07XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuYmxvY2sgPSBmdW5jdGlvbihibG9jaykge1xuICB2YXIgb3V0ID0gXCJcIjtcblxuICBvdXQgPSBvdXQgKyB0aGlzLnBhZChcIkJMT0NLOlwiKTtcbiAgdGhpcy5wYWRkaW5nKys7XG4gIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KGJsb2NrLm11c3RhY2hlKTtcbiAgaWYgKGJsb2NrLnByb2dyYW0pIHtcbiAgICBvdXQgPSBvdXQgKyB0aGlzLnBhZChcIlBST0dSQU06XCIpO1xuICAgIHRoaXMucGFkZGluZysrO1xuICAgIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KGJsb2NrLnByb2dyYW0pO1xuICAgIHRoaXMucGFkZGluZy0tO1xuICB9XG4gIGlmIChibG9jay5pbnZlcnNlKSB7XG4gICAgaWYgKGJsb2NrLnByb2dyYW0pIHsgdGhpcy5wYWRkaW5nKys7IH1cbiAgICBvdXQgPSBvdXQgKyB0aGlzLnBhZChcInt7Xn19XCIpO1xuICAgIHRoaXMucGFkZGluZysrO1xuICAgIG91dCA9IG91dCArIHRoaXMuYWNjZXB0KGJsb2NrLmludmVyc2UpO1xuICAgIHRoaXMucGFkZGluZy0tO1xuICAgIGlmIChibG9jay5wcm9ncmFtKSB7IHRoaXMucGFkZGluZy0tOyB9XG4gIH1cbiAgdGhpcy5wYWRkaW5nLS07XG5cbiAgcmV0dXJuIG91dDtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuc2V4cHIgPSBmdW5jdGlvbihzZXhwcikge1xuICB2YXIgcGFyYW1zID0gc2V4cHIucGFyYW1zLCBwYXJhbVN0cmluZ3MgPSBbXSwgaGFzaDtcblxuICBmb3IodmFyIGk9MCwgbD1wYXJhbXMubGVuZ3RoOyBpPGw7IGkrKykge1xuICAgIHBhcmFtU3RyaW5ncy5wdXNoKHRoaXMuYWNjZXB0KHBhcmFtc1tpXSkpO1xuICB9XG5cbiAgcGFyYW1zID0gXCJbXCIgKyBwYXJhbVN0cmluZ3Muam9pbihcIiwgXCIpICsgXCJdXCI7XG5cbiAgaGFzaCA9IHNleHByLmhhc2ggPyBcIiBcIiArIHRoaXMuYWNjZXB0KHNleHByLmhhc2gpIDogXCJcIjtcblxuICByZXR1cm4gdGhpcy5hY2NlcHQoc2V4cHIuaWQpICsgXCIgXCIgKyBwYXJhbXMgKyBoYXNoO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5tdXN0YWNoZSA9IGZ1bmN0aW9uKG11c3RhY2hlKSB7XG4gIHJldHVybiB0aGlzLnBhZChcInt7IFwiICsgdGhpcy5hY2NlcHQobXVzdGFjaGUuc2V4cHIpICsgXCIgfX1cIik7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLnBhcnRpYWwgPSBmdW5jdGlvbihwYXJ0aWFsKSB7XG4gIHZhciBjb250ZW50ID0gdGhpcy5hY2NlcHQocGFydGlhbC5wYXJ0aWFsTmFtZSk7XG4gIGlmKHBhcnRpYWwuY29udGV4dCkge1xuICAgIGNvbnRlbnQgKz0gXCIgXCIgKyB0aGlzLmFjY2VwdChwYXJ0aWFsLmNvbnRleHQpO1xuICB9XG4gIGlmIChwYXJ0aWFsLmhhc2gpIHtcbiAgICBjb250ZW50ICs9IFwiIFwiICsgdGhpcy5hY2NlcHQocGFydGlhbC5oYXNoKTtcbiAgfVxuICByZXR1cm4gdGhpcy5wYWQoXCJ7ez4gXCIgKyBjb250ZW50ICsgXCIgfX1cIik7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLmhhc2ggPSBmdW5jdGlvbihoYXNoKSB7XG4gIHZhciBwYWlycyA9IGhhc2gucGFpcnM7XG4gIHZhciBqb2luZWRQYWlycyA9IFtdLCBsZWZ0LCByaWdodDtcblxuICBmb3IodmFyIGk9MCwgbD1wYWlycy5sZW5ndGg7IGk8bDsgaSsrKSB7XG4gICAgbGVmdCA9IHBhaXJzW2ldWzBdO1xuICAgIHJpZ2h0ID0gdGhpcy5hY2NlcHQocGFpcnNbaV1bMV0pO1xuICAgIGpvaW5lZFBhaXJzLnB1c2goIGxlZnQgKyBcIj1cIiArIHJpZ2h0ICk7XG4gIH1cblxuICByZXR1cm4gXCJIQVNIe1wiICsgam9pbmVkUGFpcnMuam9pbihcIiwgXCIpICsgXCJ9XCI7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLlNUUklORyA9IGZ1bmN0aW9uKHN0cmluZykge1xuICByZXR1cm4gJ1wiJyArIHN0cmluZy5zdHJpbmcgKyAnXCInO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5OVU1CRVIgPSBmdW5jdGlvbihudW1iZXIpIHtcbiAgcmV0dXJuIFwiTlVNQkVSe1wiICsgbnVtYmVyLm51bWJlciArIFwifVwiO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5CT09MRUFOID0gZnVuY3Rpb24oYm9vbCkge1xuICByZXR1cm4gXCJCT09MRUFOe1wiICsgYm9vbC5ib29sICsgXCJ9XCI7XG59O1xuXG5QcmludFZpc2l0b3IucHJvdG90eXBlLklEID0gZnVuY3Rpb24oaWQpIHtcbiAgdmFyIHBhdGggPSBpZC5wYXJ0cy5qb2luKFwiL1wiKTtcbiAgaWYoaWQucGFydHMubGVuZ3RoID4gMSkge1xuICAgIHJldHVybiBcIlBBVEg6XCIgKyBwYXRoO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBcIklEOlwiICsgcGF0aDtcbiAgfVxufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5QQVJUSUFMX05BTUUgPSBmdW5jdGlvbihwYXJ0aWFsTmFtZSkge1xuICAgIHJldHVybiBcIlBBUlRJQUw6XCIgKyBwYXJ0aWFsTmFtZS5uYW1lO1xufTtcblxuUHJpbnRWaXNpdG9yLnByb3RvdHlwZS5EQVRBID0gZnVuY3Rpb24oZGF0YSkge1xuICByZXR1cm4gXCJAXCIgKyB0aGlzLmFjY2VwdChkYXRhLmlkKTtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuY29udGVudCA9IGZ1bmN0aW9uKGNvbnRlbnQpIHtcbiAgcmV0dXJuIHRoaXMucGFkKFwiQ09OVEVOVFsgJ1wiICsgY29udGVudC5zdHJpbmcgKyBcIicgXVwiKTtcbn07XG5cblByaW50VmlzaXRvci5wcm90b3R5cGUuY29tbWVudCA9IGZ1bmN0aW9uKGNvbW1lbnQpIHtcbiAgcmV0dXJuIHRoaXMucGFkKFwie3shICdcIiArIGNvbW1lbnQuY29tbWVudCArIFwiJyB9fVwiKTtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBWaXNpdG9yKCkge31cblxuVmlzaXRvci5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBWaXNpdG9yLFxuXG4gIGFjY2VwdDogZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIHRoaXNbb2JqZWN0LnR5cGVdKG9iamVjdCk7XG4gIH1cbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gVmlzaXRvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5mdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSwgbm9kZSkge1xuICB2YXIgbGluZTtcbiAgaWYgKG5vZGUgJiYgbm9kZS5maXJzdExpbmUpIHtcbiAgICBsaW5lID0gbm9kZS5maXJzdExpbmU7XG5cbiAgICBtZXNzYWdlICs9ICcgLSAnICsgbGluZSArICc6JyArIG5vZGUuZmlyc3RDb2x1bW47XG4gIH1cblxuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmNhbGwodGhpcywgbWVzc2FnZSk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG5cbiAgaWYgKGxpbmUpIHtcbiAgICB0aGlzLmxpbmVOdW1iZXIgPSBsaW5lO1xuICAgIHRoaXMuY29sdW1uID0gbm9kZS5maXJzdENvbHVtbjtcbiAgfVxufVxuXG5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gRXhjZXB0aW9uOyIsIlwidXNlIHN0cmljdFwiO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG52YXIgRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vZXhjZXB0aW9uXCIpW1wiZGVmYXVsdFwiXTtcbnZhciBDT01QSUxFUl9SRVZJU0lPTiA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuQ09NUElMRVJfUkVWSVNJT047XG52YXIgUkVWSVNJT05fQ0hBTkdFUyA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuUkVWSVNJT05fQ0hBTkdFUztcbnZhciBjcmVhdGVGcmFtZSA9IHJlcXVpcmUoXCIuL2Jhc2VcIikuY3JlYXRlRnJhbWU7XG5cbmZ1bmN0aW9uIGNoZWNrUmV2aXNpb24oY29tcGlsZXJJbmZvKSB7XG4gIHZhciBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvICYmIGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgY3VycmVudFJldmlzaW9uID0gQ09NUElMRVJfUkVWSVNJT047XG5cbiAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBSRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgIHRocm93IG5ldyBFeGNlcHRpb24oXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCIpO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmNoZWNrUmV2aXNpb24gPSBjaGVja1JldmlzaW9uOy8vIFRPRE86IFJlbW92ZSB0aGlzIGxpbmUgYW5kIGJyZWFrIHVwIGNvbXBpbGVQYXJ0aWFsXG5cbmZ1bmN0aW9uIHRlbXBsYXRlKHRlbXBsYXRlU3BlYywgZW52KSB7XG4gIGlmICghZW52KSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIk5vIGVudmlyb25tZW50IHBhc3NlZCB0byB0ZW1wbGF0ZVwiKTtcbiAgfVxuXG4gIC8vIE5vdGU6IFVzaW5nIGVudi5WTSByZWZlcmVuY2VzIHJhdGhlciB0aGFuIGxvY2FsIHZhciByZWZlcmVuY2VzIHRocm91Z2hvdXQgdGhpcyBzZWN0aW9uIHRvIGFsbG93XG4gIC8vIGZvciBleHRlcm5hbCB1c2VycyB0byBvdmVycmlkZSB0aGVzZSBhcyBwc3VlZG8tc3VwcG9ydGVkIEFQSXMuXG4gIGVudi5WTS5jaGVja1JldmlzaW9uKHRlbXBsYXRlU3BlYy5jb21waWxlcik7XG5cbiAgdmFyIGludm9rZVBhcnRpYWxXcmFwcGVyID0gZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGFzaCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICBpZiAoaGFzaCkge1xuICAgICAgY29udGV4dCA9IFV0aWxzLmV4dGVuZCh7fSwgY29udGV4dCwgaGFzaCk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IGVudi5WTS5pbnZva2VQYXJ0aWFsLmNhbGwodGhpcywgcGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpO1xuICAgIGlmIChyZXN1bHQgIT0gbnVsbCkgeyByZXR1cm4gcmVzdWx0OyB9XG5cbiAgICBpZiAoZW52LmNvbXBpbGUpIHtcbiAgICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gZW52LmNvbXBpbGUocGFydGlhbCwgeyBkYXRhOiBkYXRhICE9PSB1bmRlZmluZWQgfSwgZW52KTtcbiAgICAgIHJldHVybiBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfVxuICB9O1xuXG4gIC8vIEp1c3QgYWRkIHdhdGVyXG4gIHZhciBjb250YWluZXIgPSB7XG4gICAgZXNjYXBlRXhwcmVzc2lvbjogVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICBpbnZva2VQYXJ0aWFsOiBpbnZva2VQYXJ0aWFsV3JhcHBlcixcblxuICAgIGZuOiBmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gdGVtcGxhdGVTcGVjW2ldO1xuICAgIH0sXG5cbiAgICBwcm9ncmFtczogW10sXG4gICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZGF0YSkge1xuICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSxcbiAgICAgICAgICBmbiA9IHRoaXMuZm4oaSk7XG4gICAgICBpZihkYXRhKSB7XG4gICAgICAgIHByb2dyYW1XcmFwcGVyID0gcHJvZ3JhbSh0aGlzLCBpLCBmbiwgZGF0YSk7XG4gICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBwcm9ncmFtKHRoaXMsIGksIGZuKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICB9LFxuICAgIHByb2dyYW1XaXRoRGVwdGg6IGVudi5WTS5wcm9ncmFtV2l0aERlcHRoLFxuXG4gICAgaW5pdERhdGE6IGZ1bmN0aW9uKGNvbnRleHQsIGRhdGEpIHtcbiAgICAgIGlmICghZGF0YSB8fCAhKCdyb290JyBpbiBkYXRhKSkge1xuICAgICAgICBkYXRhID0gZGF0YSA/IGNyZWF0ZUZyYW1lKGRhdGEpIDoge307XG4gICAgICAgIGRhdGEucm9vdCA9IGNvbnRleHQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIGRhdGE6IGZ1bmN0aW9uKGRhdGEsIGRlcHRoKSB7XG4gICAgICB3aGlsZSAoZGF0YSAmJiBkZXB0aC0tKSB7XG4gICAgICAgIGRhdGEgPSBkYXRhLl9wYXJlbnQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICBpZiAocGFyYW0gJiYgY29tbW9uICYmIChwYXJhbSAhPT0gY29tbW9uKSkge1xuICAgICAgICByZXQgPSBVdGlscy5leHRlbmQoe30sIGNvbW1vbiwgcGFyYW0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG5cbiAgICBub29wOiBlbnYuVk0ubm9vcCxcbiAgICBjb21waWxlckluZm86IHRlbXBsYXRlU3BlYy5jb21waWxlclxuICB9O1xuXG4gIHZhciByZXQgPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIG5hbWVzcGFjZSA9IG9wdGlvbnMucGFydGlhbCA/IG9wdGlvbnMgOiBlbnYsXG4gICAgICAgIGhlbHBlcnMsXG4gICAgICAgIHBhcnRpYWxzLFxuICAgICAgICBkYXRhID0gb3B0aW9ucy5kYXRhO1xuXG4gICAgaWYgKCFvcHRpb25zLnBhcnRpYWwpIHtcbiAgICAgIGhlbHBlcnMgPSBjb250YWluZXIuaGVscGVycyA9IGNvbnRhaW5lci5tZXJnZShvcHRpb25zLmhlbHBlcnMsIG5hbWVzcGFjZS5oZWxwZXJzKTtcblxuICAgICAgaWYgKHRlbXBsYXRlU3BlYy51c2VQYXJ0aWFsKSB7XG4gICAgICAgIHBhcnRpYWxzID0gY29udGFpbmVyLnBhcnRpYWxzID0gY29udGFpbmVyLm1lcmdlKG9wdGlvbnMucGFydGlhbHMsIG5hbWVzcGFjZS5wYXJ0aWFscyk7XG4gICAgICB9XG4gICAgICBpZiAodGVtcGxhdGVTcGVjLnVzZURhdGEpIHtcbiAgICAgICAgZGF0YSA9IGNvbnRhaW5lci5pbml0RGF0YShjb250ZXh0LCBkYXRhKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaGVscGVycyA9IGNvbnRhaW5lci5oZWxwZXJzID0gb3B0aW9ucy5oZWxwZXJzO1xuICAgICAgcGFydGlhbHMgPSBjb250YWluZXIucGFydGlhbHMgPSBvcHRpb25zLnBhcnRpYWxzO1xuICAgIH1cbiAgICByZXR1cm4gdGVtcGxhdGVTcGVjLm1haW4uY2FsbChjb250YWluZXIsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKTtcbiAgfTtcblxuICByZXQuY2hpbGQgPSBmdW5jdGlvbihpKSB7XG4gICAgcmV0dXJuIGNvbnRhaW5lci5wcm9ncmFtV2l0aERlcHRoKGkpO1xuICB9O1xuICByZXR1cm4gcmV0O1xufVxuXG5leHBvcnRzLnRlbXBsYXRlID0gdGVtcGxhdGU7ZnVuY3Rpb24gcHJvZ3JhbVdpdGhEZXB0aChpLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgLypqc2hpbnQgLVcwNDAgKi9cbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpLFxuICAgICAgY29udGFpbmVyID0gdGhpcyxcbiAgICAgIGZuID0gY29udGFpbmVyLmZuKGkpO1xuXG4gIHZhciBwcm9nID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgcmV0dXJuIGZuLmFwcGx5KGNvbnRhaW5lciwgW2NvbnRleHQsIGNvbnRhaW5lci5oZWxwZXJzLCBjb250YWluZXIucGFydGlhbHMsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gIHJldHVybiBwcm9nO1xufVxuXG5leHBvcnRzLnByb2dyYW1XaXRoRGVwdGggPSBwcm9ncmFtV2l0aERlcHRoO2Z1bmN0aW9uIHByb2dyYW0oY29udGFpbmVyLCBpLCBmbiwgZGF0YSkge1xuICB2YXIgcHJvZyA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHJldHVybiBmbi5jYWxsKGNvbnRhaW5lciwgY29udGV4dCwgY29udGFpbmVyLmhlbHBlcnMsIGNvbnRhaW5lci5wYXJ0aWFscywgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICB9O1xuICBwcm9nLnByb2dyYW0gPSBpO1xuICBwcm9nLmRlcHRoID0gMDtcbiAgcmV0dXJuIHByb2c7XG59XG5cbmV4cG9ydHMucHJvZ3JhbSA9IHByb2dyYW07ZnVuY3Rpb24gaW52b2tlUGFydGlhbChwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICB2YXIgb3B0aW9ucyA9IHsgcGFydGlhbDogdHJ1ZSwgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaW52b2tlUGFydGlhbCA9IGludm9rZVBhcnRpYWw7ZnVuY3Rpb24gbm9vcCgpIHsgcmV0dXJuIFwiXCI7IH1cblxuZXhwb3J0cy5ub29wID0gbm9vcDsiLCJcInVzZSBzdHJpY3RcIjtcbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5mdW5jdGlvbiBTYWZlU3RyaW5nKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn1cblxuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiXCIgKyB0aGlzLnN0cmluZztcbn07XG5cbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gU2FmZVN0cmluZzsiLCJcInVzZSBzdHJpY3RcIjtcbi8qanNoaW50IC1XMDA0ICovXG52YXIgU2FmZVN0cmluZyA9IHJlcXVpcmUoXCIuL3NhZmUtc3RyaW5nXCIpW1wiZGVmYXVsdFwiXTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbmZ1bmN0aW9uIGVzY2FwZUNoYXIoY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmogLyogLCAuLi5zb3VyY2UgKi8pIHtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFyZ3VtZW50c1tpXSwga2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IGFyZ3VtZW50c1tpXVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59XG5cbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO3ZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5leHBvcnRzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4vLyBTb3VyY2VkIGZyb20gbG9kYXNoXG4vLyBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL0xJQ0VOU0UudHh0XG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59O1xuLy8gZmFsbGJhY2sgZm9yIG9sZGVyIHZlcnNpb25zIG9mIENocm9tZSBhbmQgU2FmYXJpXG5pZiAoaXNGdW5jdGlvbigveC8pKSB7XG4gIGlzRnVuY3Rpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicgJiYgdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG4gIH07XG59XG52YXIgaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSA/IHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBBcnJheV0nIDogZmFsc2U7XG59O1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gZXNjYXBlRXhwcmVzc2lvbihzdHJpbmcpIHtcbiAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgU2FmZVN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgfSBlbHNlIGlmICghc3RyaW5nICYmIHN0cmluZyAhPT0gMCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgc3RyaW5nID0gXCJcIiArIHN0cmluZztcblxuICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGVFeHByZXNzaW9uID0gZXNjYXBlRXhwcmVzc2lvbjtmdW5jdGlvbiBpc0VtcHR5KHZhbHVlKSB7XG4gIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTtmdW5jdGlvbiBhcHBlbmRDb250ZXh0UGF0aChjb250ZXh0UGF0aCwgaWQpIHtcbiAgcmV0dXJuIChjb250ZXh0UGF0aCA/IGNvbnRleHRQYXRoICsgJy4nIDogJycpICsgaWQ7XG59XG5cbmV4cG9ydHMuYXBwZW5kQ29udGV4dFBhdGggPSBhcHBlbmRDb250ZXh0UGF0aDsiLCIvLyBVU0FHRTpcbi8vIHZhciBoYW5kbGViYXJzID0gcmVxdWlyZSgnaGFuZGxlYmFycycpO1xuXG4vLyB2YXIgbG9jYWwgPSBoYW5kbGViYXJzLmNyZWF0ZSgpO1xuXG52YXIgaGFuZGxlYmFycyA9IHJlcXVpcmUoJy4uL2Rpc3QvY2pzL2hhbmRsZWJhcnMnKVtcImRlZmF1bHRcIl07XG5cbmhhbmRsZWJhcnMuVmlzaXRvciA9IHJlcXVpcmUoJy4uL2Rpc3QvY2pzL2hhbmRsZWJhcnMvY29tcGlsZXIvdmlzaXRvcicpW1wiZGVmYXVsdFwiXTtcblxudmFyIHByaW50ZXIgPSByZXF1aXJlKCcuLi9kaXN0L2Nqcy9oYW5kbGViYXJzL2NvbXBpbGVyL3ByaW50ZXInKTtcbmhhbmRsZWJhcnMuUHJpbnRWaXNpdG9yID0gcHJpbnRlci5QcmludFZpc2l0b3I7XG5oYW5kbGViYXJzLnByaW50ID0gcHJpbnRlci5wcmludDtcblxubW9kdWxlLmV4cG9ydHMgPSBoYW5kbGViYXJzO1xuXG4vLyBQdWJsaXNoIGEgTm9kZS5qcyByZXF1aXJlKCkgaGFuZGxlciBmb3IgLmhhbmRsZWJhcnMgYW5kIC5oYnMgZmlsZXNcbmlmICh0eXBlb2YgcmVxdWlyZSAhPT0gJ3VuZGVmaW5lZCcgJiYgcmVxdWlyZS5leHRlbnNpb25zKSB7XG4gIHZhciBleHRlbnNpb24gPSBmdW5jdGlvbihtb2R1bGUsIGZpbGVuYW1lKSB7XG4gICAgdmFyIGZzID0gcmVxdWlyZShcImZzXCIpO1xuICAgIHZhciB0ZW1wbGF0ZVN0cmluZyA9IGZzLnJlYWRGaWxlU3luYyhmaWxlbmFtZSwgXCJ1dGY4XCIpO1xuICAgIG1vZHVsZS5leHBvcnRzID0gaGFuZGxlYmFycy5jb21waWxlKHRlbXBsYXRlU3RyaW5nKTtcbiAgfTtcbiAgcmVxdWlyZS5leHRlbnNpb25zW1wiLmhhbmRsZWJhcnNcIl0gPSBleHRlbnNpb247XG4gIHJlcXVpcmUuZXh0ZW5zaW9uc1tcIi5oYnNcIl0gPSBleHRlbnNpb247XG59XG4iLCIvKlxyXG4gKiBsb2dsZXZlbCAtIGh0dHBzOi8vZ2l0aHViLmNvbS9waW10ZXJyeS9sb2dsZXZlbFxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgVGltIFBlcnJ5XHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cclxuICovXHJcblxyXG47KGZ1bmN0aW9uICh1bmRlZmluZWQpIHtcclxuICAgIHZhciB1bmRlZmluZWRUeXBlID0gXCJ1bmRlZmluZWRcIjtcclxuXHJcbiAgICAoZnVuY3Rpb24gKG5hbWUsIGRlZmluaXRpb24pIHtcclxuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBkZWZpbmUuYW1kID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICBkZWZpbmUoZGVmaW5pdGlvbik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpc1tuYW1lXSA9IGRlZmluaXRpb24oKTtcclxuICAgICAgICB9XHJcbiAgICB9KCdsb2cnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB7fTtcclxuICAgICAgICB2YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWxNZXRob2QobWV0aG9kTmFtZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub29wO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGVbbWV0aG9kTmFtZV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUubG9nICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYm91bmRUb0NvbnNvbGUoY29uc29sZSwgJ2xvZycpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9vcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBib3VuZFRvQ29uc29sZShjb25zb2xlLCBtZXRob2ROYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gYm91bmRUb0NvbnNvbGUoY29uc29sZSwgbWV0aG9kTmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gY29uc29sZVttZXRob2ROYW1lXTtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZC5iaW5kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uQmluZGluZ1dyYXBwZXIobWV0aG9kLCBjb25zb2xlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmNhbGwoY29uc29sZVttZXRob2ROYW1lXSwgY29uc29sZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbiBJRTggKyBNb2Rlcm5penIsIHRoZSBiaW5kIHNoaW0gd2lsbCByZWplY3QgdGhlIGFib3ZlLCBzbyB3ZSBmYWxsIGJhY2sgdG8gd3JhcHBpbmdcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uQmluZGluZ1dyYXBwZXIobWV0aG9kLCBjb25zb2xlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uc29sZVttZXRob2ROYW1lXS5iaW5kKGNvbnNvbGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBmdW5jdGlvbkJpbmRpbmdXcmFwcGVyKGYsIGNvbnRleHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KGYsIFtjb250ZXh0LCBhcmd1bWVudHNdKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBsb2dNZXRob2RzID0gW1xyXG4gICAgICAgICAgICBcInRyYWNlXCIsXHJcbiAgICAgICAgICAgIFwiZGVidWdcIixcclxuICAgICAgICAgICAgXCJpbmZvXCIsXHJcbiAgICAgICAgICAgIFwid2FyblwiLFxyXG4gICAgICAgICAgICBcImVycm9yXCJcclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZXBsYWNlTG9nZ2luZ01ldGhvZHMobWV0aG9kRmFjdG9yeSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbG9nTWV0aG9kcy5sZW5ndGg7IGlpKyspIHtcclxuICAgICAgICAgICAgICAgIHNlbGZbbG9nTWV0aG9kc1tpaV1dID0gbWV0aG9kRmFjdG9yeShsb2dNZXRob2RzW2lpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGNvb2tpZXNBdmFpbGFibGUoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudCAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmRvY3VtZW50LmNvb2tpZSAhPT0gdW5kZWZpbmVkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGxvY2FsU3RvcmFnZUF2YWlsYWJsZSgpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlICE9PSB1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHBlcnNpc3RMZXZlbElmUG9zc2libGUobGV2ZWxOdW0pIHtcclxuICAgICAgICAgICAgdmFyIGxldmVsTmFtZTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzZWxmLmxldmVscykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYubGV2ZWxzLmhhc093blByb3BlcnR5KGtleSkgJiYgc2VsZi5sZXZlbHNba2V5XSA9PT0gbGV2ZWxOdW0pIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbE5hbWUgPSBrZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChsb2NhbFN0b3JhZ2VBdmFpbGFibGUoKSkge1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZVsnbG9nbGV2ZWwnXSA9IGxldmVsTmFtZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjb29raWVzQXZhaWxhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5jb29raWUgPSBcImxvZ2xldmVsPVwiICsgbGV2ZWxOYW1lICsgXCI7XCI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBjb29raWVSZWdleCA9IC9sb2dsZXZlbD0oW147XSspLztcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gbG9hZFBlcnNpc3RlZExldmVsKCkge1xyXG4gICAgICAgICAgICB2YXIgc3RvcmVkTGV2ZWw7XHJcblxyXG4gICAgICAgICAgICBpZiAobG9jYWxTdG9yYWdlQXZhaWxhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgIHN0b3JlZExldmVsID0gd2luZG93LmxvY2FsU3RvcmFnZVsnbG9nbGV2ZWwnXTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFzdG9yZWRMZXZlbCAmJiBjb29raWVzQXZhaWxhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjb29raWVNYXRjaCA9IGNvb2tpZVJlZ2V4LmV4ZWMod2luZG93LmRvY3VtZW50LmNvb2tpZSkgfHwgW107XHJcbiAgICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IGNvb2tpZU1hdGNoWzFdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzZWxmLnNldExldmVsKHNlbGYubGV2ZWxzW3N0b3JlZExldmVsXSB8fCBzZWxmLmxldmVscy5XQVJOKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBQdWJsaWMgQVBJXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKi9cclxuXHJcbiAgICAgICAgc2VsZi5sZXZlbHMgPSB7IFwiVFJBQ0VcIjogMCwgXCJERUJVR1wiOiAxLCBcIklORk9cIjogMiwgXCJXQVJOXCI6IDMsXHJcbiAgICAgICAgICAgIFwiRVJST1JcIjogNCwgXCJTSUxFTlRcIjogNX07XHJcblxyXG4gICAgICAgIHNlbGYuc2V0TGV2ZWwgPSBmdW5jdGlvbiAobGV2ZWwpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJudW1iZXJcIiAmJiBsZXZlbCA+PSAwICYmIGxldmVsIDw9IHNlbGYubGV2ZWxzLlNJTEVOVCkge1xyXG4gICAgICAgICAgICAgICAgcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGxldmVsID09PSBzZWxmLmxldmVscy5TSUxFTlQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXBsYWNlTG9nZ2luZ01ldGhvZHMoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9vcDtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb25zb2xlID09PSB1bmRlZmluZWRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzKGZ1bmN0aW9uIChtZXRob2ROYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09IHVuZGVmaW5lZFR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldExldmVsKGxldmVsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmW21ldGhvZE5hbWVdLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29uc29sZSBhdmFpbGFibGUgZm9yIGxvZ2dpbmdcIjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzKGZ1bmN0aW9uIChtZXRob2ROYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsZXZlbCA8PSBzZWxmLmxldmVsc1ttZXRob2ROYW1lLnRvVXBwZXJDYXNlKCldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVhbE1ldGhvZChtZXRob2ROYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBub29wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxldmVsID09PSBcInN0cmluZ1wiICYmIHNlbGYubGV2ZWxzW2xldmVsLnRvVXBwZXJDYXNlKCldICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHNbbGV2ZWwudG9VcHBlckNhc2UoKV0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJsb2cuc2V0TGV2ZWwoKSBjYWxsZWQgd2l0aCBpbnZhbGlkIGxldmVsOiBcIiArIGxldmVsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2VsZi5lbmFibGVBbGwgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2VsZi5zZXRMZXZlbChzZWxmLmxldmVscy5UUkFDRSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2VsZi5kaXNhYmxlQWxsID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuU0lMRU5UKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsb2FkUGVyc2lzdGVkTGV2ZWwoKTtcclxuICAgICAgICByZXR1cm4gc2VsZjtcclxuICAgIH0pKTtcclxufSkoKTtcclxuIiwiLypqc2xpbnQgZXFlcWVxOiBmYWxzZSwgb25ldmFyOiBmYWxzZSwgZm9yaW46IHRydWUsIG5vbWVuOiBmYWxzZSwgcmVnZXhwOiBmYWxzZSwgcGx1c3BsdXM6IGZhbHNlKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSwgX19kaXJuYW1lLCBkb2N1bWVudCovXG4vKipcbiAqIFNpbm9uIGNvcmUgdXRpbGl0aWVzLiBGb3IgaW50ZXJuYWwgdXNlIG9ubHkuXG4gKlxuICogQGF1dGhvciBDaHJpc3RpYW4gSm9oYW5zZW4gKGNocmlzdGlhbkBjam9oYW5zZW4ubm8pXG4gKiBAbGljZW5zZSBCU0RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTAtMjAxMyBDaHJpc3RpYW4gSm9oYW5zZW5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzaW5vbiA9IChmdW5jdGlvbiAoZm9ybWF0aW8pIHtcbiAgICB2YXIgZGl2ID0gdHlwZW9mIGRvY3VtZW50ICE9IFwidW5kZWZpbmVkXCIgJiYgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICB2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuICAgIGZ1bmN0aW9uIGlzRE9NTm9kZShvYmopIHtcbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBmYWxzZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgb2JqLmFwcGVuZENoaWxkKGRpdik7XG4gICAgICAgICAgICBzdWNjZXNzID0gZGl2LnBhcmVudE5vZGUgPT0gb2JqO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG9iai5yZW1vdmVDaGlsZChkaXYpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBmYWlsZWQsIG5vdCBtdWNoIHdlIGNhbiBkbyBhYm91dCB0aGF0XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3VjY2VzcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0VsZW1lbnQob2JqKSB7XG4gICAgICAgIHJldHVybiBkaXYgJiYgb2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSAmJiBpc0RPTU5vZGUob2JqKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0Z1bmN0aW9uKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gXCJmdW5jdGlvblwiIHx8ICEhKG9iaiAmJiBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNhbGwgJiYgb2JqLmFwcGx5KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtaXJyb3JQcm9wZXJ0aWVzKHRhcmdldCwgc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoIWhhc093bi5jYWxsKHRhcmdldCwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1Jlc3RvcmFibGUgKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBvYmoucmVzdG9yZSA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5yZXN0b3JlLnNpbm9uO1xuICAgIH1cblxuICAgIHZhciBzaW5vbiA9IHtcbiAgICAgICAgd3JhcE1ldGhvZDogZnVuY3Rpb24gd3JhcE1ldGhvZChvYmplY3QsIHByb3BlcnR5LCBtZXRob2QpIHtcbiAgICAgICAgICAgIGlmICghb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlNob3VsZCB3cmFwIHByb3BlcnR5IG9mIG9iamVjdFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXRob2QgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk1ldGhvZCB3cmFwcGVyIHNob3VsZCBiZSBmdW5jdGlvblwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHdyYXBwZWRNZXRob2QgPSBvYmplY3RbcHJvcGVydHldLFxuICAgICAgICAgICAgICAgIGVycm9yO1xuXG4gICAgICAgICAgICBpZiAoIWlzRnVuY3Rpb24od3JhcHBlZE1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgICBlcnJvciA9IG5ldyBUeXBlRXJyb3IoXCJBdHRlbXB0ZWQgdG8gd3JhcCBcIiArICh0eXBlb2Ygd3JhcHBlZE1ldGhvZCkgKyBcIiBwcm9wZXJ0eSBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSArIFwiIGFzIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAod3JhcHBlZE1ldGhvZC5yZXN0b3JlICYmIHdyYXBwZWRNZXRob2QucmVzdG9yZS5zaW5vbikge1xuICAgICAgICAgICAgICAgIGVycm9yID0gbmV3IFR5cGVFcnJvcihcIkF0dGVtcHRlZCB0byB3cmFwIFwiICsgcHJvcGVydHkgKyBcIiB3aGljaCBpcyBhbHJlYWR5IHdyYXBwZWRcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh3cmFwcGVkTWV0aG9kLmNhbGxlZEJlZm9yZSkge1xuICAgICAgICAgICAgICAgIHZhciB2ZXJiID0gISF3cmFwcGVkTWV0aG9kLnJldHVybnMgPyBcInN0dWJiZWRcIiA6IFwic3BpZWQgb25cIjtcbiAgICAgICAgICAgICAgICBlcnJvciA9IG5ldyBUeXBlRXJyb3IoXCJBdHRlbXB0ZWQgdG8gd3JhcCBcIiArIHByb3BlcnR5ICsgXCIgd2hpY2ggaXMgYWxyZWFkeSBcIiArIHZlcmIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAod3JhcHBlZE1ldGhvZC5fc3RhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3Iuc3RhY2sgKz0gJ1xcbi0tLS0tLS0tLS0tLS0tXFxuJyArIHdyYXBwZWRNZXRob2QuX3N0YWNrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSUUgOCBkb2VzIG5vdCBzdXBwb3J0IGhhc093blByb3BlcnR5IG9uIHRoZSB3aW5kb3cgb2JqZWN0IGFuZCBGaXJlZm94IGhhcyBhIHByb2JsZW1cbiAgICAgICAgICAgIC8vIHdoZW4gdXNpbmcgaGFzT3duLmNhbGwgb24gb2JqZWN0cyBmcm9tIG90aGVyIGZyYW1lcy5cbiAgICAgICAgICAgIHZhciBvd25lZCA9IG9iamVjdC5oYXNPd25Qcm9wZXJ0eSA/IG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkgOiBoYXNPd24uY2FsbChvYmplY3QsIHByb3BlcnR5KTtcbiAgICAgICAgICAgIG9iamVjdFtwcm9wZXJ0eV0gPSBtZXRob2Q7XG4gICAgICAgICAgICBtZXRob2QuZGlzcGxheU5hbWUgPSBwcm9wZXJ0eTtcbiAgICAgICAgICAgIC8vIFNldCB1cCBhIHN0YWNrIHRyYWNlIHdoaWNoIGNhbiBiZSB1c2VkIGxhdGVyIHRvIGZpbmQgd2hhdCBsaW5lIG9mXG4gICAgICAgICAgICAvLyBjb2RlIHRoZSBvcmlnaW5hbCBtZXRob2Qgd2FzIGNyZWF0ZWQgb24uXG4gICAgICAgICAgICBtZXRob2QuX3N0YWNrID0gKG5ldyBFcnJvcignU3RhY2sgVHJhY2UgZm9yIG9yaWdpbmFsJykpLnN0YWNrO1xuXG4gICAgICAgICAgICBtZXRob2QucmVzdG9yZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgcHJvdG90eXBlIHByb3BlcnRpZXMgdHJ5IHRvIHJlc2V0IGJ5IGRlbGV0ZSBmaXJzdC5cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGZhaWxzIChleDogbG9jYWxTdG9yYWdlIG9uIG1vYmlsZSBzYWZhcmkpIHRoZW4gZm9yY2UgYSByZXNldFxuICAgICAgICAgICAgICAgIC8vIHZpYSBkaXJlY3QgYXNzaWdubWVudC5cbiAgICAgICAgICAgICAgICBpZiAoIW93bmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0W3Byb3BlcnR5XSA9PT0gbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFtwcm9wZXJ0eV0gPSB3cmFwcGVkTWV0aG9kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIG1ldGhvZC5yZXN0b3JlLnNpbm9uID0gdHJ1ZTtcbiAgICAgICAgICAgIG1pcnJvclByb3BlcnRpZXMobWV0aG9kLCB3cmFwcGVkTWV0aG9kKTtcblxuICAgICAgICAgICAgcmV0dXJuIG1ldGhvZDtcbiAgICAgICAgfSxcblxuICAgICAgICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudHNbaV0uaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wXSA9IGFyZ3VtZW50c1tpXVtwcm9wXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIERPTlQgRU5VTSBidWcsIG9ubHkgY2FyZSBhYm91dCB0b1N0cmluZ1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KFwidG9TdHJpbmdcIikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1tpXS50b1N0cmluZyAhPSB0YXJnZXQudG9TdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC50b1N0cmluZyA9IGFyZ3VtZW50c1tpXS50b1N0cmluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIGNyZWF0ZShwcm90bykge1xuICAgICAgICAgICAgdmFyIEYgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIEYucHJvdG90eXBlID0gcHJvdG87XG4gICAgICAgICAgICByZXR1cm4gbmV3IEYoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWVwRXF1YWw6IGZ1bmN0aW9uIGRlZXBFcXVhbChhLCBiKSB7XG4gICAgICAgICAgICBpZiAoc2lub24ubWF0Y2ggJiYgc2lub24ubWF0Y2guaXNNYXRjaGVyKGEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEudGVzdChiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgYSAhPSBcIm9iamVjdFwiIHx8IHR5cGVvZiBiICE9IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzRWxlbWVudChhKSB8fCBpc0VsZW1lbnQoYikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKChhID09PSBudWxsICYmIGIgIT09IG51bGwpIHx8IChhICE9PSBudWxsICYmIGIgPT09IG51bGwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgYVN0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhKTtcbiAgICAgICAgICAgIGlmIChhU3RyaW5nICE9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChiKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFTdHJpbmcgPT0gXCJbb2JqZWN0IERhdGVdXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS52YWx1ZU9mKCkgPT09IGIudmFsdWVPZigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcHJvcCwgYUxlbmd0aCA9IDAsIGJMZW5ndGggPSAwO1xuXG4gICAgICAgICAgICBpZiAoYVN0cmluZyA9PSBcIltvYmplY3QgQXJyYXldXCIgJiYgYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKHByb3AgaW4gYSkge1xuICAgICAgICAgICAgICAgIGFMZW5ndGggKz0gMTtcblxuICAgICAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKGFbcHJvcF0sIGJbcHJvcF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAocHJvcCBpbiBiKSB7XG4gICAgICAgICAgICAgICAgYkxlbmd0aCArPSAxO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYUxlbmd0aCA9PSBiTGVuZ3RoO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gZnVuYy5kaXNwbGF5TmFtZSB8fCBmdW5jLm5hbWU7XG5cbiAgICAgICAgICAgIC8vIFVzZSBmdW5jdGlvbiBkZWNvbXBvc2l0aW9uIGFzIGEgbGFzdCByZXNvcnQgdG8gZ2V0IGZ1bmN0aW9uXG4gICAgICAgICAgICAvLyBuYW1lLiBEb2VzIG5vdCByZWx5IG9uIGZ1bmN0aW9uIGRlY29tcG9zaXRpb24gdG8gd29yayAtIGlmIGl0XG4gICAgICAgICAgICAvLyBkb2Vzbid0IGRlYnVnZ2luZyB3aWxsIGJlIHNsaWdodGx5IGxlc3MgaW5mb3JtYXRpdmVcbiAgICAgICAgICAgIC8vIChpLmUuIHRvU3RyaW5nIHdpbGwgc2F5ICdzcHknIHJhdGhlciB0aGFuICdteUZ1bmMnKS5cbiAgICAgICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVzID0gZnVuYy50b1N0cmluZygpLm1hdGNoKC9mdW5jdGlvbiAoW15cXHNcXChdKykvKTtcbiAgICAgICAgICAgICAgICBuYW1lID0gbWF0Y2hlcyAmJiBtYXRjaGVzWzFdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbmFtZTtcbiAgICAgICAgfSxcblxuICAgICAgICBmdW5jdGlvblRvU3RyaW5nOiBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldENhbGwgJiYgdGhpcy5jYWxsQ291bnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGhpc1ZhbHVlLCBwcm9wLCBpID0gdGhpcy5jYWxsQ291bnQ7XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNWYWx1ZSA9IHRoaXMuZ2V0Q2FsbChpKS50aGlzVmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChwcm9wIGluIHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXNWYWx1ZVtwcm9wXSA9PT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kaXNwbGF5TmFtZSB8fCBcInNpbm9uIGZha2VcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRDb25maWc6IGZ1bmN0aW9uIChjdXN0b20pIHtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSB7fTtcbiAgICAgICAgICAgIGN1c3RvbSA9IGN1c3RvbSB8fCB7fTtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHNpbm9uLmRlZmF1bHRDb25maWc7XG5cbiAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdHMuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnW3Byb3BdID0gY3VzdG9tLmhhc093blByb3BlcnR5KHByb3ApID8gY3VzdG9tW3Byb3BdIDogZGVmYXVsdHNbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZvcm1hdDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyB2YWw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVmYXVsdENvbmZpZzoge1xuICAgICAgICAgICAgaW5qZWN0SW50b1RoaXM6IHRydWUsXG4gICAgICAgICAgICBpbmplY3RJbnRvOiBudWxsLFxuICAgICAgICAgICAgcHJvcGVydGllczogW1wic3B5XCIsIFwic3R1YlwiLCBcIm1vY2tcIiwgXCJjbG9ja1wiLCBcInNlcnZlclwiLCBcInJlcXVlc3RzXCJdLFxuICAgICAgICAgICAgdXNlRmFrZVRpbWVyczogdHJ1ZSxcbiAgICAgICAgICAgIHVzZUZha2VTZXJ2ZXI6IHRydWVcbiAgICAgICAgfSxcblxuICAgICAgICB0aW1lc0luV29yZHM6IGZ1bmN0aW9uIHRpbWVzSW5Xb3Jkcyhjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvdW50ID09IDEgJiYgXCJvbmNlXCIgfHxcbiAgICAgICAgICAgICAgICBjb3VudCA9PSAyICYmIFwidHdpY2VcIiB8fFxuICAgICAgICAgICAgICAgIGNvdW50ID09IDMgJiYgXCJ0aHJpY2VcIiB8fFxuICAgICAgICAgICAgICAgIChjb3VudCB8fCAwKSArIFwiIHRpbWVzXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsbGVkSW5PcmRlcjogZnVuY3Rpb24gKHNwaWVzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMSwgbCA9IHNwaWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghc3BpZXNbaSAtIDFdLmNhbGxlZEJlZm9yZShzcGllc1tpXSkgfHwgIXNwaWVzW2ldLmNhbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcblxuICAgICAgICBvcmRlckJ5Rmlyc3RDYWxsOiBmdW5jdGlvbiAoc3BpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBzcGllcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgLy8gdXVpZCwgd29uJ3QgZXZlciBiZSBlcXVhbFxuICAgICAgICAgICAgICAgIHZhciBhQ2FsbCA9IGEuZ2V0Q2FsbCgwKTtcbiAgICAgICAgICAgICAgICB2YXIgYkNhbGwgPSBiLmdldENhbGwoMCk7XG4gICAgICAgICAgICAgICAgdmFyIGFJZCA9IGFDYWxsICYmIGFDYWxsLmNhbGxJZCB8fCAtMTtcbiAgICAgICAgICAgICAgICB2YXIgYklkID0gYkNhbGwgJiYgYkNhbGwuY2FsbElkIHx8IC0xO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFJZCA8IGJJZCA/IC0xIDogMTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvZzogZnVuY3Rpb24gKCkge30sXG5cbiAgICAgICAgbG9nRXJyb3I6IGZ1bmN0aW9uIChsYWJlbCwgZXJyKSB7XG4gICAgICAgICAgICB2YXIgbXNnID0gbGFiZWwgKyBcIiB0aHJldyBleGNlcHRpb246IFwiO1xuICAgICAgICAgICAgc2lub24ubG9nKG1zZyArIFwiW1wiICsgZXJyLm5hbWUgKyBcIl0gXCIgKyBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoZXJyLnN0YWNrKSB7IHNpbm9uLmxvZyhlcnIuc3RhY2spOyB9XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGVyci5tZXNzYWdlID0gbXNnICsgZXJyLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdHlwZU9mOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ1bmRlZmluZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZy5zdWJzdHJpbmcoOCwgc3RyaW5nLmxlbmd0aCAtIDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlU3R1Ykluc3RhbmNlOiBmdW5jdGlvbiAoY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJUaGUgY29uc3RydWN0b3Igc2hvdWxkIGJlIGEgZnVuY3Rpb24uXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNpbm9uLnN0dWIoc2lub24uY3JlYXRlKGNvbnN0cnVjdG9yLnByb3RvdHlwZSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlc3RvcmU6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgIT09IG51bGwgJiYgdHlwZW9mIG9iamVjdCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RvcmFibGUob2JqZWN0W3Byb3BdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0W3Byb3BdLnJlc3RvcmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzUmVzdG9yYWJsZShvYmplY3QpKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaXNOb2RlID0gdHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cztcbiAgICB2YXIgaXNBTUQgPSB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBkZWZpbmUuYW1kID09PSAnb2JqZWN0JyAmJiBkZWZpbmUuYW1kO1xuXG4gICAgaWYgKGlzQU1EKSB7XG4gICAgICAgIGRlZmluZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIHNpbm9uO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGlzTm9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZm9ybWF0aW8gPSByZXF1aXJlKFwiZm9ybWF0aW9cIik7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gc2lub247XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLnNweSA9IHJlcXVpcmUoXCIuL3Npbm9uL3NweVwiKTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuc3B5Q2FsbCA9IHJlcXVpcmUoXCIuL3Npbm9uL2NhbGxcIik7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmJlaGF2aW9yID0gcmVxdWlyZShcIi4vc2lub24vYmVoYXZpb3JcIik7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLnN0dWIgPSByZXF1aXJlKFwiLi9zaW5vbi9zdHViXCIpO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5tb2NrID0gcmVxdWlyZShcIi4vc2lub24vbW9ja1wiKTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY29sbGVjdGlvbiA9IHJlcXVpcmUoXCIuL3Npbm9uL2NvbGxlY3Rpb25cIik7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmFzc2VydCA9IHJlcXVpcmUoXCIuL3Npbm9uL2Fzc2VydFwiKTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuc2FuZGJveCA9IHJlcXVpcmUoXCIuL3Npbm9uL3NhbmRib3hcIik7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLnRlc3QgPSByZXF1aXJlKFwiLi9zaW5vbi90ZXN0XCIpO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy50ZXN0Q2FzZSA9IHJlcXVpcmUoXCIuL3Npbm9uL3Rlc3RfY2FzZVwiKTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuYXNzZXJ0ID0gcmVxdWlyZShcIi4vc2lub24vYXNzZXJ0XCIpO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5tYXRjaCA9IHJlcXVpcmUoXCIuL3Npbm9uL21hdGNoXCIpO1xuICAgIH1cblxuICAgIGlmIChmb3JtYXRpbykge1xuICAgICAgICB2YXIgZm9ybWF0dGVyID0gZm9ybWF0aW8uY29uZmlndXJlKHsgcXVvdGVTdHJpbmdzOiBmYWxzZSB9KTtcbiAgICAgICAgc2lub24uZm9ybWF0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlci5hc2NpaS5hcHBseShmb3JtYXR0ZXIsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChpc05vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XG4gICAgICAgICAgICBzaW5vbi5mb3JtYXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUudG9TdHJpbmcgPT09IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcgPyB1dGlsLmluc3BlY3QodmFsdWUpIDogdmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvKiBOb2RlLCBidXQgbm8gdXRpbCBtb2R1bGUgLSB3b3VsZCBiZSB2ZXJ5IG9sZCwgYnV0IGJldHRlciBzYWZlIHRoYW5cbiAgICAgICAgICAgICBzb3JyeSAqL1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpbm9uO1xufSh0eXBlb2YgZm9ybWF0aW8gPT0gXCJvYmplY3RcIiAmJiBmb3JtYXRpbykpO1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwpey8qKlxuICogQGRlcGVuZCAuLi9zaW5vbi5qc1xuICogQGRlcGVuZCBzdHViLmpzXG4gKi9cbi8qanNsaW50IGVxZXFlcTogZmFsc2UsIG9uZXZhcjogZmFsc2UsIG5vbWVuOiBmYWxzZSwgcGx1c3BsdXM6IGZhbHNlKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSwgc2lub24qL1xuLyoqXG4gKiBBc3NlcnRpb25zIG1hdGNoaW5nIHRoZSB0ZXN0IHNweSByZXRyaWV2YWwgaW50ZXJmYWNlLlxuICpcbiAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uLCBnbG9iYWwpIHtcbiAgICB2YXIgY29tbW9uSlNNb2R1bGUgPSB0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzO1xuICAgIHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgICB2YXIgYXNzZXJ0O1xuXG4gICAgaWYgKCFzaW5vbiAmJiBjb21tb25KU01vZHVsZSkge1xuICAgICAgICBzaW5vbiA9IHJlcXVpcmUoXCIuLi9zaW5vblwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXNpbm9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2ZXJpZnlJc1N0dWIoKSB7XG4gICAgICAgIHZhciBtZXRob2Q7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBtZXRob2QgPSBhcmd1bWVudHNbaV07XG5cbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmZhaWwoXCJmYWtlIGlzIG5vdCBhIHNweVwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXRob2QgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmZhaWwobWV0aG9kICsgXCIgaXMgbm90IGEgZnVuY3Rpb25cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWV0aG9kLmdldENhbGwgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmZhaWwobWV0aG9kICsgXCIgaXMgbm90IHN0dWJiZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmYWlsQXNzZXJ0aW9uKG9iamVjdCwgbXNnKSB7XG4gICAgICAgIG9iamVjdCA9IG9iamVjdCB8fCBnbG9iYWw7XG4gICAgICAgIHZhciBmYWlsTWV0aG9kID0gb2JqZWN0LmZhaWwgfHwgYXNzZXJ0LmZhaWw7XG4gICAgICAgIGZhaWxNZXRob2QuY2FsbChvYmplY3QsIG1zZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWlycm9yUHJvcEFzQXNzZXJ0aW9uKG5hbWUsIG1ldGhvZCwgbWVzc2FnZSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gbWV0aG9kO1xuICAgICAgICAgICAgbWV0aG9kID0gbmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzc2VydFtuYW1lXSA9IGZ1bmN0aW9uIChmYWtlKSB7XG4gICAgICAgICAgICB2ZXJpZnlJc1N0dWIoZmFrZSk7XG5cbiAgICAgICAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgdmFyIGZhaWxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG1ldGhvZCA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBmYWlsZWQgPSAhbWV0aG9kKGZha2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmYWlsZWQgPSB0eXBlb2YgZmFrZVttZXRob2RdID09IFwiZnVuY3Rpb25cIiA/XG4gICAgICAgICAgICAgICAgICAgICFmYWtlW21ldGhvZF0uYXBwbHkoZmFrZSwgYXJncykgOiAhZmFrZVttZXRob2RdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmFpbGVkKSB7XG4gICAgICAgICAgICAgICAgZmFpbEFzc2VydGlvbih0aGlzLCBmYWtlLnByaW50Zi5hcHBseShmYWtlLCBbbWVzc2FnZV0uY29uY2F0KGFyZ3MpKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFzc2VydC5wYXNzKG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4cG9zZWROYW1lKHByZWZpeCwgcHJvcCkge1xuICAgICAgICByZXR1cm4gIXByZWZpeCB8fCAvXmZhaWwvLnRlc3QocHJvcCkgPyBwcm9wIDpcbiAgICAgICAgICAgIHByZWZpeCArIHByb3Auc2xpY2UoMCwgMSkudG9VcHBlckNhc2UoKSArIHByb3Auc2xpY2UoMSk7XG4gICAgfVxuXG4gICAgYXNzZXJ0ID0ge1xuICAgICAgICBmYWlsRXhjZXB0aW9uOiBcIkFzc2VydEVycm9yXCIsXG5cbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgICAgICBlcnJvci5uYW1lID0gdGhpcy5mYWlsRXhjZXB0aW9uIHx8IGFzc2VydC5mYWlsRXhjZXB0aW9uO1xuXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXNzOiBmdW5jdGlvbiBwYXNzKGFzc2VydGlvbikge30sXG5cbiAgICAgICAgY2FsbE9yZGVyOiBmdW5jdGlvbiBhc3NlcnRDYWxsT3JkZXIoKSB7XG4gICAgICAgICAgICB2ZXJpZnlJc1N0dWIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBleHBlY3RlZCA9IFwiXCIsIGFjdHVhbCA9IFwiXCI7XG5cbiAgICAgICAgICAgIGlmICghc2lub24uY2FsbGVkSW5PcmRlcihhcmd1bWVudHMpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQgPSBbXS5qb2luLmNhbGwoYXJndW1lbnRzLCBcIiwgXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbHMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gY2FsbHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjYWxsc1stLWldLmNhbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhY3R1YWwgPSBzaW5vbi5vcmRlckJ5Rmlyc3RDYWxsKGNhbGxzKS5qb2luKFwiLCBcIik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGZhaWxzLCB3ZSdsbCBqdXN0IGZhbGwgYmFjayB0byB0aGUgYmxhbmsgc3RyaW5nXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZmFpbEFzc2VydGlvbih0aGlzLCBcImV4cGVjdGVkIFwiICsgZXhwZWN0ZWQgKyBcIiB0byBiZSBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImNhbGxlZCBpbiBvcmRlciBidXQgd2VyZSBjYWxsZWQgYXMgXCIgKyBhY3R1YWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQucGFzcyhcImNhbGxPcmRlclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsQ291bnQ6IGZ1bmN0aW9uIGFzc2VydENhbGxDb3VudChtZXRob2QsIGNvdW50KSB7XG4gICAgICAgICAgICB2ZXJpZnlJc1N0dWIobWV0aG9kKTtcblxuICAgICAgICAgICAgaWYgKG1ldGhvZC5jYWxsQ291bnQgIT0gY291bnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXNnID0gXCJleHBlY3RlZCAlbiB0byBiZSBjYWxsZWQgXCIgKyBzaW5vbi50aW1lc0luV29yZHMoY291bnQpICtcbiAgICAgICAgICAgICAgICAgICAgXCIgYnV0IHdhcyBjYWxsZWQgJWMlQ1wiO1xuICAgICAgICAgICAgICAgIGZhaWxBc3NlcnRpb24odGhpcywgbWV0aG9kLnByaW50Zihtc2cpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LnBhc3MoXCJjYWxsQ291bnRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXhwb3NlOiBmdW5jdGlvbiBleHBvc2UodGFyZ2V0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ0YXJnZXQgaXMgbnVsbCBvciB1bmRlZmluZWRcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIHZhciBwcmVmaXggPSB0eXBlb2Ygby5wcmVmaXggPT0gXCJ1bmRlZmluZWRcIiAmJiBcImFzc2VydFwiIHx8IG8ucHJlZml4O1xuICAgICAgICAgICAgdmFyIGluY2x1ZGVGYWlsID0gdHlwZW9mIG8uaW5jbHVkZUZhaWwgPT0gXCJ1bmRlZmluZWRcIiB8fCAhIW8uaW5jbHVkZUZhaWw7XG5cbiAgICAgICAgICAgIGZvciAodmFyIG1ldGhvZCBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1ldGhvZCAhPSBcImV4cG9ydFwiICYmIChpbmNsdWRlRmFpbCB8fCAhL14oZmFpbCkvLnRlc3QobWV0aG9kKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2V4cG9zZWROYW1lKHByZWZpeCwgbWV0aG9kKV0gPSB0aGlzW21ldGhvZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcImNhbGxlZFwiLCBcImV4cGVjdGVkICVuIHRvIGhhdmUgYmVlbiBjYWxsZWQgYXQgbGVhc3Qgb25jZSBidXQgd2FzIG5ldmVyIGNhbGxlZFwiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJub3RDYWxsZWRcIiwgZnVuY3Rpb24gKHNweSkgeyByZXR1cm4gIXNweS5jYWxsZWQ7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiZXhwZWN0ZWQgJW4gdG8gbm90IGhhdmUgYmVlbiBjYWxsZWQgYnV0IHdhcyBjYWxsZWQgJWMlQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJjYWxsZWRPbmNlXCIsIFwiZXhwZWN0ZWQgJW4gdG8gYmUgY2FsbGVkIG9uY2UgYnV0IHdhcyBjYWxsZWQgJWMlQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJjYWxsZWRUd2ljZVwiLCBcImV4cGVjdGVkICVuIHRvIGJlIGNhbGxlZCB0d2ljZSBidXQgd2FzIGNhbGxlZCAlYyVDXCIpO1xuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcImNhbGxlZFRocmljZVwiLCBcImV4cGVjdGVkICVuIHRvIGJlIGNhbGxlZCB0aHJpY2UgYnV0IHdhcyBjYWxsZWQgJWMlQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJjYWxsZWRPblwiLCBcImV4cGVjdGVkICVuIHRvIGJlIGNhbGxlZCB3aXRoICUxIGFzIHRoaXMgYnV0IHdhcyBjYWxsZWQgd2l0aCAldFwiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJhbHdheXNDYWxsZWRPblwiLCBcImV4cGVjdGVkICVuIHRvIGFsd2F5cyBiZSBjYWxsZWQgd2l0aCAlMSBhcyB0aGlzIGJ1dCB3YXMgY2FsbGVkIHdpdGggJXRcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwiY2FsbGVkV2l0aE5ld1wiLCBcImV4cGVjdGVkICVuIHRvIGJlIGNhbGxlZCB3aXRoIG5ld1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJhbHdheXNDYWxsZWRXaXRoTmV3XCIsIFwiZXhwZWN0ZWQgJW4gdG8gYWx3YXlzIGJlIGNhbGxlZCB3aXRoIG5ld1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJjYWxsZWRXaXRoXCIsIFwiZXhwZWN0ZWQgJW4gdG8gYmUgY2FsbGVkIHdpdGggYXJndW1lbnRzICUqJUNcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwiY2FsbGVkV2l0aE1hdGNoXCIsIFwiZXhwZWN0ZWQgJW4gdG8gYmUgY2FsbGVkIHdpdGggbWF0Y2ggJSolQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJhbHdheXNDYWxsZWRXaXRoXCIsIFwiZXhwZWN0ZWQgJW4gdG8gYWx3YXlzIGJlIGNhbGxlZCB3aXRoIGFyZ3VtZW50cyAlKiVDXCIpO1xuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcImFsd2F5c0NhbGxlZFdpdGhNYXRjaFwiLCBcImV4cGVjdGVkICVuIHRvIGFsd2F5cyBiZSBjYWxsZWQgd2l0aCBtYXRjaCAlKiVDXCIpO1xuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcImNhbGxlZFdpdGhFeGFjdGx5XCIsIFwiZXhwZWN0ZWQgJW4gdG8gYmUgY2FsbGVkIHdpdGggZXhhY3QgYXJndW1lbnRzICUqJUNcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwiYWx3YXlzQ2FsbGVkV2l0aEV4YWN0bHlcIiwgXCJleHBlY3RlZCAlbiB0byBhbHdheXMgYmUgY2FsbGVkIHdpdGggZXhhY3QgYXJndW1lbnRzICUqJUNcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwibmV2ZXJDYWxsZWRXaXRoXCIsIFwiZXhwZWN0ZWQgJW4gdG8gbmV2ZXIgYmUgY2FsbGVkIHdpdGggYXJndW1lbnRzICUqJUNcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwibmV2ZXJDYWxsZWRXaXRoTWF0Y2hcIiwgXCJleHBlY3RlZCAlbiB0byBuZXZlciBiZSBjYWxsZWQgd2l0aCBtYXRjaCAlKiVDXCIpO1xuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcInRocmV3XCIsIFwiJW4gZGlkIG5vdCB0aHJvdyBleGNlcHRpb24lQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJhbHdheXNUaHJld1wiLCBcIiVuIGRpZCBub3QgYWx3YXlzIHRocm93IGV4Y2VwdGlvbiVDXCIpO1xuXG4gICAgaWYgKGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gYXNzZXJ0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLmFzc2VydCA9IGFzc2VydDtcbiAgICB9XG59KHR5cGVvZiBzaW5vbiA9PSBcIm9iamVjdFwiICYmIHNpbm9uIHx8IG51bGwsIHR5cGVvZiB3aW5kb3cgIT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6ICh0eXBlb2Ygc2VsZiAhPSBcInVuZGVmaW5lZFwiKSA/IHNlbGYgOiBnbG9iYWwpKTtcbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXsvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqL1xuLypqc2xpbnQgZXFlcWVxOiBmYWxzZSwgb25ldmFyOiBmYWxzZSovXG4vKmdsb2JhbCBtb2R1bGUsIHJlcXVpcmUsIHNpbm9uLCBwcm9jZXNzLCBzZXRJbW1lZGlhdGUsIHNldFRpbWVvdXQqL1xuLyoqXG4gKiBTdHViIGJlaGF2aW9yXG4gKlxuICogQGF1dGhvciBDaHJpc3RpYW4gSm9oYW5zZW4gKGNocmlzdGlhbkBjam9oYW5zZW4ubm8pXG4gKiBAYXV0aG9yIFRpbSBGaXNjaGJhY2ggKG1haWxAdGltZmlzY2hiYWNoLmRlKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uKSB7XG4gICAgdmFyIGNvbW1vbkpTTW9kdWxlID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG5cbiAgICBpZiAoIXNpbm9uICYmIGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIHNpbm9uID0gcmVxdWlyZShcIi4uL3Npbm9uXCIpO1xuICAgIH1cblxuICAgIGlmICghc2lub24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgICB2YXIgam9pbiA9IEFycmF5LnByb3RvdHlwZS5qb2luO1xuICAgIHZhciBwcm90bztcblxuICAgIHZhciBuZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcHJvY2Vzcy5uZXh0VGljayA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzcy5uZXh0VGljaztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBzZXRJbW1lZGlhdGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChjYWxsYmFjaywgMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSkoKTtcblxuICAgIGZ1bmN0aW9uIHRocm93c0V4Y2VwdGlvbihlcnJvciwgbWVzc2FnZSkge1xuICAgICAgICBpZiAodHlwZW9mIGVycm9yID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHRoaXMuZXhjZXB0aW9uID0gbmV3IEVycm9yKG1lc3NhZ2UgfHwgXCJcIik7XG4gICAgICAgICAgICB0aGlzLmV4Y2VwdGlvbi5uYW1lID0gZXJyb3I7XG4gICAgICAgIH0gZWxzZSBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmV4Y2VwdGlvbiA9IG5ldyBFcnJvcihcIkVycm9yXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5leGNlcHRpb24gPSBlcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldENhbGxiYWNrKGJlaGF2aW9yLCBhcmdzKSB7XG4gICAgICAgIHZhciBjYWxsQXJnQXQgPSBiZWhhdmlvci5jYWxsQXJnQXQ7XG5cbiAgICAgICAgaWYgKGNhbGxBcmdBdCA8IDApIHtcbiAgICAgICAgICAgIHZhciBjYWxsQXJnUHJvcCA9IGJlaGF2aW9yLmNhbGxBcmdQcm9wO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsQXJnUHJvcCAmJiB0eXBlb2YgYXJnc1tpXSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbaV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxBcmdQcm9wICYmIGFyZ3NbaV0gJiZcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGFyZ3NbaV1bY2FsbEFyZ1Byb3BdID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1tpXVtjYWxsQXJnUHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcmdzW2NhbGxBcmdBdF07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q2FsbGJhY2tFcnJvcihiZWhhdmlvciwgZnVuYywgYXJncykge1xuICAgICAgICBpZiAoYmVoYXZpb3IuY2FsbEFyZ0F0IDwgMCkge1xuICAgICAgICAgICAgdmFyIG1zZztcblxuICAgICAgICAgICAgaWYgKGJlaGF2aW9yLmNhbGxBcmdQcm9wKSB7XG4gICAgICAgICAgICAgICAgbXNnID0gc2lub24uZnVuY3Rpb25OYW1lKGJlaGF2aW9yLnN0dWIpICtcbiAgICAgICAgICAgICAgICAgICAgXCIgZXhwZWN0ZWQgdG8geWllbGQgdG8gJ1wiICsgYmVoYXZpb3IuY2FsbEFyZ1Byb3AgK1xuICAgICAgICAgICAgICAgICAgICBcIicsIGJ1dCBubyBvYmplY3Qgd2l0aCBzdWNoIGEgcHJvcGVydHkgd2FzIHBhc3NlZC5cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbXNnID0gc2lub24uZnVuY3Rpb25OYW1lKGJlaGF2aW9yLnN0dWIpICtcbiAgICAgICAgICAgICAgICAgICAgXCIgZXhwZWN0ZWQgdG8geWllbGQsIGJ1dCBubyBjYWxsYmFjayB3YXMgcGFzc2VkLlwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbXNnICs9IFwiIFJlY2VpdmVkIFtcIiArIGpvaW4uY2FsbChhcmdzLCBcIiwgXCIpICsgXCJdXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtc2c7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gXCJhcmd1bWVudCBhdCBpbmRleCBcIiArIGJlaGF2aW9yLmNhbGxBcmdBdCArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uOiBcIiArIGZ1bmM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsbENhbGxiYWNrKGJlaGF2aW9yLCBhcmdzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYmVoYXZpb3IuY2FsbEFyZ0F0ID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHZhciBmdW5jID0gZ2V0Q2FsbGJhY2soYmVoYXZpb3IsIGFyZ3MpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZ1bmMgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihnZXRDYWxsYmFja0Vycm9yKGJlaGF2aW9yLCBmdW5jLCBhcmdzKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChiZWhhdmlvci5jYWxsYmFja0FzeW5jKSB7XG4gICAgICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmMuYXBwbHkoYmVoYXZpb3IuY2FsbGJhY2tDb250ZXh0LCBiZWhhdmlvci5jYWxsYmFja0FyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZ1bmMuYXBwbHkoYmVoYXZpb3IuY2FsbGJhY2tDb250ZXh0LCBiZWhhdmlvci5jYWxsYmFja0FyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcm90byA9IHtcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbihzdHViKSB7XG4gICAgICAgICAgICB2YXIgYmVoYXZpb3IgPSBzaW5vbi5leHRlbmQoe30sIHNpbm9uLmJlaGF2aW9yKTtcbiAgICAgICAgICAgIGRlbGV0ZSBiZWhhdmlvci5jcmVhdGU7XG4gICAgICAgICAgICBiZWhhdmlvci5zdHViID0gc3R1YjtcblxuICAgICAgICAgICAgcmV0dXJuIGJlaGF2aW9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzUHJlc2VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiB0aGlzLmNhbGxBcmdBdCA9PSAnbnVtYmVyJyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4Y2VwdGlvbiB8fFxuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdGhpcy5yZXR1cm5BcmdBdCA9PSAnbnVtYmVyJyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJldHVyblRoaXMgfHxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZURlZmluZWQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGludm9rZTogZnVuY3Rpb24oY29udGV4dCwgYXJncykge1xuICAgICAgICAgICAgY2FsbENhbGxiYWNrKHRoaXMsIGFyZ3MpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5leGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLmV4Y2VwdGlvbjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMucmV0dXJuQXJnQXQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1t0aGlzLnJldHVybkFyZ0F0XTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5yZXR1cm5UaGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJldHVyblZhbHVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uQ2FsbDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0dWIub25DYWxsKGluZGV4KTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkZpcnN0Q2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdHViLm9uRmlyc3RDYWxsKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25TZWNvbmRDYWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0dWIub25TZWNvbmRDYWxsKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25UaGlyZENhbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3R1Yi5vblRoaXJkQ2FsbCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdpdGhBcmdzOiBmdW5jdGlvbigvKiBhcmd1bWVudHMgKi8pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGVmaW5pbmcgYSBzdHViIGJ5IGludm9raW5nIFwic3R1Yi5vbkNhbGwoLi4uKS53aXRoQXJncyguLi4pXCIgaXMgbm90IHN1cHBvcnRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1VzZSBcInN0dWIud2l0aEFyZ3MoLi4uKS5vbkNhbGwoLi4uKVwiIHRvIGRlZmluZSBzZXF1ZW50aWFsIGJlaGF2aW9yIGZvciBjYWxscyB3aXRoIGNlcnRhaW4gYXJndW1lbnRzLicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxzQXJnOiBmdW5jdGlvbiBjYWxsc0FyZyhwb3MpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcG9zICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXJndW1lbnQgaW5kZXggaXMgbm90IG51bWJlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jYWxsQXJnQXQgPSBwb3M7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXJndW1lbnRzID0gW107XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuY2FsbEFyZ1Byb3AgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXN5bmMgPSBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsbHNBcmdPbjogZnVuY3Rpb24gY2FsbHNBcmdPbihwb3MsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcG9zICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXJndW1lbnQgaW5kZXggaXMgbm90IG51bWJlclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udGV4dCAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFyZ3VtZW50IGNvbnRleHQgaXMgbm90IGFuIG9iamVjdFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jYWxsQXJnQXQgPSBwb3M7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXJndW1lbnRzID0gW107XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdQcm9wID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FzeW5jID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxzQXJnV2l0aDogZnVuY3Rpb24gY2FsbHNBcmdXaXRoKHBvcykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwb3MgIT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhcmd1bWVudCBpbmRleCBpcyBub3QgbnVtYmVyXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdBdCA9IHBvcztcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBcmd1bWVudHMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuY2FsbEFyZ1Byb3AgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXN5bmMgPSBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsbHNBcmdPbldpdGg6IGZ1bmN0aW9uIGNhbGxzQXJnV2l0aChwb3MsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcG9zICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXJndW1lbnQgaW5kZXggaXMgbm90IG51bWJlclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udGV4dCAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFyZ3VtZW50IGNvbnRleHQgaXMgbm90IGFuIG9iamVjdFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jYWxsQXJnQXQgPSBwb3M7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXJndW1lbnRzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgdGhpcy5jYWxsQXJnUHJvcCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBc3luYyA9IGZhbHNlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICB5aWVsZHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbEFyZ0F0ID0gLTE7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXJndW1lbnRzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdQcm9wID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FzeW5jID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHlpZWxkc09uOiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb250ZXh0ICE9IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXJndW1lbnQgY29udGV4dCBpcyBub3QgYW4gb2JqZWN0XCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdBdCA9IC0xO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FyZ3VtZW50cyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tDb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIHRoaXMuY2FsbEFyZ1Byb3AgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXN5bmMgPSBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgeWllbGRzVG86IGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdBdCA9IC0xO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FyZ3VtZW50cyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tDb250ZXh0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5jYWxsQXJnUHJvcCA9IHByb3A7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXN5bmMgPSBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgeWllbGRzVG9PbjogZnVuY3Rpb24gKHByb3AsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udGV4dCAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFyZ3VtZW50IGNvbnRleHQgaXMgbm90IGFuIG9iamVjdFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jYWxsQXJnQXQgPSAtMTtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBcmd1bWVudHMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdQcm9wID0gcHJvcDtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBc3luYyA9IGZhbHNlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuXG4gICAgICAgIFwidGhyb3dzXCI6IHRocm93c0V4Y2VwdGlvbixcbiAgICAgICAgdGhyb3dzRXhjZXB0aW9uOiB0aHJvd3NFeGNlcHRpb24sXG5cbiAgICAgICAgcmV0dXJuczogZnVuY3Rpb24gcmV0dXJucyh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZURlZmluZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICByZXR1cm5zQXJnOiBmdW5jdGlvbiByZXR1cm5zQXJnKHBvcykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwb3MgIT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhcmd1bWVudCBpbmRleCBpcyBub3QgbnVtYmVyXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJldHVybkFyZ0F0ID0gcG9zO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICByZXR1cm5zVGhpczogZnVuY3Rpb24gcmV0dXJuc1RoaXMoKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVyblRoaXMgPSB0cnVlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBjcmVhdGUgYXN5bmNocm9ub3VzIHZlcnNpb25zIG9mIGNhbGxzQXJnKiBhbmQgeWllbGRzKiBtZXRob2RzXG4gICAgZm9yICh2YXIgbWV0aG9kIGluIHByb3RvKSB7XG4gICAgICAgIC8vIG5lZWQgdG8gYXZvaWQgY3JlYXRpbmcgYW5vdGhlcmFzeW5jIHZlcnNpb25zIG9mIHRoZSBuZXdseSBhZGRlZCBhc3luYyBtZXRob2RzXG4gICAgICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eShtZXRob2QpICYmXG4gICAgICAgICAgICBtZXRob2QubWF0Y2goL14oY2FsbHNBcmd8eWllbGRzKS8pICYmXG4gICAgICAgICAgICAhbWV0aG9kLm1hdGNoKC9Bc3luYy8pKSB7XG4gICAgICAgICAgICBwcm90b1ttZXRob2QgKyAnQXN5bmMnXSA9IChmdW5jdGlvbiAoc3luY0ZuTmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSB0aGlzW3N5bmNGbk5hbWVdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBc3luYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pKG1ldGhvZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBwcm90bztcbiAgICB9IGVsc2Uge1xuICAgICAgICBzaW5vbi5iZWhhdmlvciA9IHByb3RvO1xuICAgIH1cbn0odHlwZW9mIHNpbm9uID09IFwib2JqZWN0XCIgJiYgc2lub24gfHwgbnVsbCkpO30pLmNhbGwodGhpcyxyZXF1aXJlKFwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzXCIpKSIsIi8qKlxuICAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAgKiBAZGVwZW5kIG1hdGNoLmpzXG4gICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBwbHVzcGx1czogZmFsc2UqL1xuLypnbG9iYWwgbW9kdWxlLCByZXF1aXJlLCBzaW5vbiovXG4vKipcbiAgKiBTcHkgY2FsbHNcbiAgKlxuICAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICAqIEBhdXRob3IgTWF4aW1pbGlhbiBBbnRvbmkgKG1haWxAbWF4YW50b25pLmRlKVxuICAqIEBsaWNlbnNlIEJTRFxuICAqXG4gICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gICogQ29weXJpZ2h0IChjKSAyMDEzIE1heGltaWxpYW4gQW50b25pXG4gICovXG5cInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uIChzaW5vbikge1xuICAgIHZhciBjb21tb25KU01vZHVsZSA9IHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzO1xuICAgIGlmICghc2lub24gJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgc2lub24gPSByZXF1aXJlKFwiLi4vc2lub25cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzaW5vbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dZaWVsZEVycm9yKHByb3h5LCB0ZXh0LCBhcmdzKSB7XG4gICAgICAgIHZhciBtc2cgPSBzaW5vbi5mdW5jdGlvbk5hbWUocHJveHkpICsgdGV4dDtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBtc2cgKz0gXCIgUmVjZWl2ZWQgW1wiICsgc2xpY2UuY2FsbChhcmdzKS5qb2luKFwiLCBcIikgKyBcIl1cIjtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICB9XG5cbiAgICB2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbiAgICB2YXIgY2FsbFByb3RvID0ge1xuICAgICAgICBjYWxsZWRPbjogZnVuY3Rpb24gY2FsbGVkT24odGhpc1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoc2lub24ubWF0Y2ggJiYgc2lub24ubWF0Y2guaXNNYXRjaGVyKHRoaXNWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1ZhbHVlLnRlc3QodGhpcy50aGlzVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGhpc1ZhbHVlID09PSB0aGlzVmFsdWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsbGVkV2l0aDogZnVuY3Rpb24gY2FsbGVkV2l0aCgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGlmICghc2lub24uZGVlcEVxdWFsKGFyZ3VtZW50c1tpXSwgdGhpcy5hcmdzW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsZWRXaXRoTWF0Y2g6IGZ1bmN0aW9uIGNhbGxlZFdpdGhNYXRjaCgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBhY3R1YWwgPSB0aGlzLmFyZ3NbaV07XG4gICAgICAgICAgICAgICAgdmFyIGV4cGVjdGF0aW9uID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmICghc2lub24ubWF0Y2ggfHwgIXNpbm9uLm1hdGNoKGV4cGVjdGF0aW9uKS50ZXN0KGFjdHVhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxlZFdpdGhFeGFjdGx5OiBmdW5jdGlvbiBjYWxsZWRXaXRoRXhhY3RseSgpIHtcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09IHRoaXMuYXJncy5sZW5ndGggJiZcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxlZFdpdGguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBub3RDYWxsZWRXaXRoOiBmdW5jdGlvbiBub3RDYWxsZWRXaXRoKCkge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmNhbGxlZFdpdGguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBub3RDYWxsZWRXaXRoTWF0Y2g6IGZ1bmN0aW9uIG5vdENhbGxlZFdpdGhNYXRjaCgpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5jYWxsZWRXaXRoTWF0Y2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICByZXR1cm5lZDogZnVuY3Rpb24gcmV0dXJuZWQodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBzaW5vbi5kZWVwRXF1YWwodmFsdWUsIHRoaXMucmV0dXJuVmFsdWUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRocmV3OiBmdW5jdGlvbiB0aHJldyhlcnJvcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhdGhpcy5leGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gISF0aGlzLmV4Y2VwdGlvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXhjZXB0aW9uID09PSBlcnJvciB8fCB0aGlzLmV4Y2VwdGlvbi5uYW1lID09PSBlcnJvcjtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsZWRXaXRoTmV3OiBmdW5jdGlvbiBjYWxsZWRXaXRoTmV3KCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJveHkucHJvdG90eXBlICYmIHRoaXMudGhpc1ZhbHVlIGluc3RhbmNlb2YgdGhpcy5wcm94eTtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsZWRCZWZvcmU6IGZ1bmN0aW9uIChvdGhlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbElkIDwgb3RoZXIuY2FsbElkO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxlZEFmdGVyOiBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxJZCA+IG90aGVyLmNhbGxJZDtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsQXJnOiBmdW5jdGlvbiAocG9zKSB7XG4gICAgICAgICAgICB0aGlzLmFyZ3NbcG9zXSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxBcmdPbjogZnVuY3Rpb24gKHBvcywgdGhpc1ZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLmFyZ3NbcG9zXS5hcHBseSh0aGlzVmFsdWUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxBcmdXaXRoOiBmdW5jdGlvbiAocG9zKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdPbldpdGguYXBwbHkodGhpcywgW3BvcywgbnVsbF0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxBcmdPbldpdGg6IGZ1bmN0aW9uIChwb3MsIHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICB0aGlzLmFyZ3NbcG9zXS5hcHBseSh0aGlzVmFsdWUsIGFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIFwieWllbGRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy55aWVsZE9uLmFwcGx5KHRoaXMsIFtudWxsXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgeWllbGRPbjogZnVuY3Rpb24gKHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSB0aGlzLmFyZ3M7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmdzW2ldID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJnc1tpXS5hcHBseSh0aGlzVmFsdWUsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvd1lpZWxkRXJyb3IodGhpcy5wcm94eSwgXCIgY2Fubm90IHlpZWxkIHNpbmNlIG5vIGNhbGxiYWNrIHdhcyBwYXNzZWQuXCIsIGFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHlpZWxkVG86IGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICB0aGlzLnlpZWxkVG9Pbi5hcHBseSh0aGlzLCBbcHJvcCwgbnVsbF0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHlpZWxkVG9PbjogZnVuY3Rpb24gKHByb3AsIHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSB0aGlzLmFyZ3M7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3NbaV0gJiYgdHlwZW9mIGFyZ3NbaV1bcHJvcF0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICBhcmdzW2ldW3Byb3BdLmFwcGx5KHRoaXNWYWx1ZSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93WWllbGRFcnJvcih0aGlzLnByb3h5LCBcIiBjYW5ub3QgeWllbGQgdG8gJ1wiICsgcHJvcCArXG4gICAgICAgICAgICAgICAgXCInIHNpbmNlIG5vIGNhbGxiYWNrIHdhcyBwYXNzZWQuXCIsIGFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY2FsbFN0ciA9IHRoaXMucHJveHkudG9TdHJpbmcoKSArIFwiKFwiO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKHNpbm9uLmZvcm1hdCh0aGlzLmFyZ3NbaV0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FsbFN0ciA9IGNhbGxTdHIgKyBhcmdzLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMucmV0dXJuVmFsdWUgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIGNhbGxTdHIgKz0gXCIgPT4gXCIgKyBzaW5vbi5mb3JtYXQodGhpcy5yZXR1cm5WYWx1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgIGNhbGxTdHIgKz0gXCIgIVwiICsgdGhpcy5leGNlcHRpb24ubmFtZTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmV4Y2VwdGlvbi5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxTdHIgKz0gXCIoXCIgKyB0aGlzLmV4Y2VwdGlvbi5tZXNzYWdlICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY2FsbFN0cjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjYWxsUHJvdG8uaW52b2tlQ2FsbGJhY2sgPSBjYWxsUHJvdG8ueWllbGQ7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVTcHlDYWxsKHNweSwgdGhpc1ZhbHVlLCBhcmdzLCByZXR1cm5WYWx1ZSwgZXhjZXB0aW9uLCBpZCkge1xuICAgICAgICBpZiAodHlwZW9mIGlkICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2FsbCBpZCBpcyBub3QgYSBudW1iZXJcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByb3h5Q2FsbCA9IHNpbm9uLmNyZWF0ZShjYWxsUHJvdG8pO1xuICAgICAgICBwcm94eUNhbGwucHJveHkgPSBzcHk7XG4gICAgICAgIHByb3h5Q2FsbC50aGlzVmFsdWUgPSB0aGlzVmFsdWU7XG4gICAgICAgIHByb3h5Q2FsbC5hcmdzID0gYXJncztcbiAgICAgICAgcHJveHlDYWxsLnJldHVyblZhbHVlID0gcmV0dXJuVmFsdWU7XG4gICAgICAgIHByb3h5Q2FsbC5leGNlcHRpb24gPSBleGNlcHRpb247XG4gICAgICAgIHByb3h5Q2FsbC5jYWxsSWQgPSBpZDtcblxuICAgICAgICByZXR1cm4gcHJveHlDYWxsO1xuICAgIH1cbiAgICBjcmVhdGVTcHlDYWxsLnRvU3RyaW5nID0gY2FsbFByb3RvLnRvU3RyaW5nOyAvLyB1c2VkIGJ5IG1vY2tzXG5cbiAgICBpZiAoY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVTcHlDYWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLnNweUNhbGwgPSBjcmVhdGVTcHlDYWxsO1xuICAgIH1cbn0odHlwZW9mIHNpbm9uID09IFwib2JqZWN0XCIgJiYgc2lub24gfHwgbnVsbCkpO1xuXG4iLCIvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqIEBkZXBlbmQgc3R1Yi5qc1xuICogQGRlcGVuZCBtb2NrLmpzXG4gKi9cbi8qanNsaW50IGVxZXFlcTogZmFsc2UsIG9uZXZhcjogZmFsc2UsIGZvcmluOiB0cnVlKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSwgc2lub24qL1xuLyoqXG4gKiBDb2xsZWN0aW9ucyBvZiBzdHVicywgc3BpZXMgYW5kIG1vY2tzLlxuICpcbiAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uKSB7XG4gICAgdmFyIGNvbW1vbkpTTW9kdWxlID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG4gICAgdmFyIHB1c2ggPSBbXS5wdXNoO1xuICAgIHZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbiAgICBpZiAoIXNpbm9uICYmIGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIHNpbm9uID0gcmVxdWlyZShcIi4uL3Npbm9uXCIpO1xuICAgIH1cblxuICAgIGlmICghc2lub24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEZha2VzKGZha2VDb2xsZWN0aW9uKSB7XG4gICAgICAgIGlmICghZmFrZUNvbGxlY3Rpb24uZmFrZXMpIHtcbiAgICAgICAgICAgIGZha2VDb2xsZWN0aW9uLmZha2VzID0gW107XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFrZUNvbGxlY3Rpb24uZmFrZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZWFjaChmYWtlQ29sbGVjdGlvbiwgbWV0aG9kKSB7XG4gICAgICAgIHZhciBmYWtlcyA9IGdldEZha2VzKGZha2VDb2xsZWN0aW9uKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGZha2VzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBmYWtlc1tpXVttZXRob2RdID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGZha2VzW2ldW21ldGhvZF0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXBhY3QoZmFrZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgdmFyIGZha2VzID0gZ2V0RmFrZXMoZmFrZUNvbGxlY3Rpb24pO1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHdoaWxlIChpIDwgZmFrZXMubGVuZ3RoKSB7XG4gICAgICAgICAgZmFrZXMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNvbGxlY3Rpb24gPSB7XG4gICAgICAgIHZlcmlmeTogZnVuY3Rpb24gcmVzb2x2ZSgpIHtcbiAgICAgICAgICAgIGVhY2godGhpcywgXCJ2ZXJpZnlcIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVzdG9yZTogZnVuY3Rpb24gcmVzdG9yZSgpIHtcbiAgICAgICAgICAgIGVhY2godGhpcywgXCJyZXN0b3JlXCIpO1xuICAgICAgICAgICAgY29tcGFjdCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB2ZXJpZnlBbmRSZXN0b3JlOiBmdW5jdGlvbiB2ZXJpZnlBbmRSZXN0b3JlKCkge1xuICAgICAgICAgICAgdmFyIGV4Y2VwdGlvbjtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnZlcmlmeSgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucmVzdG9yZSgpO1xuXG4gICAgICAgICAgICBpZiAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGFkZDogZnVuY3Rpb24gYWRkKGZha2UpIHtcbiAgICAgICAgICAgIHB1c2guY2FsbChnZXRGYWtlcyh0aGlzKSwgZmFrZSk7XG4gICAgICAgICAgICByZXR1cm4gZmFrZTtcbiAgICAgICAgfSxcblxuICAgICAgICBzcHk6IGZ1bmN0aW9uIHNweSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZChzaW5vbi5zcHkuYXBwbHkoc2lub24sIGFyZ3VtZW50cykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0dWI6IGZ1bmN0aW9uIHN0dWIob2JqZWN0LCBwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciBvcmlnaW5hbCA9IG9iamVjdFtwcm9wZXJ0eV07XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9yaWdpbmFsICE9IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgc3R1YiBub24tZXhpc3RlbnQgb3duIHByb3BlcnR5IFwiICsgcHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0W3Byb3BlcnR5XSA9IHZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN0b3JlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0W3Byb3BlcnR5XSA9IG9yaWdpbmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXByb3BlcnR5ICYmICEhb2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHZhciBzdHViYmVkT2JqID0gc2lub24uc3R1Yi5hcHBseShzaW5vbiwgYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gc3R1YmJlZE9iaikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHN0dWJiZWRPYmpbcHJvcF0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGQoc3R1YmJlZE9ialtwcm9wXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gc3R1YmJlZE9iajtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWRkKHNpbm9uLnN0dWIuYXBwbHkoc2lub24sIGFyZ3VtZW50cykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1vY2s6IGZ1bmN0aW9uIG1vY2soKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2lub24ubW9jay5hcHBseShzaW5vbiwgYXJndW1lbnRzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5qZWN0OiBmdW5jdGlvbiBpbmplY3Qob2JqKSB7XG4gICAgICAgICAgICB2YXIgY29sID0gdGhpcztcblxuICAgICAgICAgICAgb2JqLnNweSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29sLnNweS5hcHBseShjb2wsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBvYmouc3R1YiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29sLnN0dWIuYXBwbHkoY29sLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgb2JqLm1vY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbC5tb2NrLmFwcGx5KGNvbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gY29sbGVjdGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzaW5vbi5jb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbiAgICB9XG59KHR5cGVvZiBzaW5vbiA9PSBcIm9iamVjdFwiICYmIHNpbm9uIHx8IG51bGwpKTtcbiIsIi8qIEBkZXBlbmQgLi4vc2lub24uanMgKi9cbi8qanNsaW50IGVxZXFlcTogZmFsc2UsIG9uZXZhcjogZmFsc2UsIHBsdXNwbHVzOiBmYWxzZSovXG4vKmdsb2JhbCBtb2R1bGUsIHJlcXVpcmUsIHNpbm9uKi9cbi8qKlxuICogTWF0Y2ggZnVuY3Rpb25zXG4gKlxuICogQGF1dGhvciBNYXhpbWlsaWFuIEFudG9uaSAobWFpbEBtYXhhbnRvbmkuZGUpXG4gKiBAbGljZW5zZSBCU0RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTIgTWF4aW1pbGlhbiBBbnRvbmlcbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbihmdW5jdGlvbiAoc2lub24pIHtcbiAgICB2YXIgY29tbW9uSlNNb2R1bGUgPSB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cztcblxuICAgIGlmICghc2lub24gJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgc2lub24gPSByZXF1aXJlKFwiLi4vc2lub25cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzaW5vbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXNzZXJ0VHlwZSh2YWx1ZSwgdHlwZSwgbmFtZSkge1xuICAgICAgICB2YXIgYWN0dWFsID0gc2lub24udHlwZU9mKHZhbHVlKTtcbiAgICAgICAgaWYgKGFjdHVhbCAhPT0gdHlwZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIHR5cGUgb2YgXCIgKyBuYW1lICsgXCIgdG8gYmUgXCIgK1xuICAgICAgICAgICAgICAgIHR5cGUgKyBcIiwgYnV0IHdhcyBcIiArIGFjdHVhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlciA9IHtcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNNYXRjaGVyKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gbWF0Y2hlci5pc1Byb3RvdHlwZU9mKG9iamVjdCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWF0Y2hPYmplY3QoZXhwZWN0YXRpb24sIGFjdHVhbCkge1xuICAgICAgICBpZiAoYWN0dWFsID09PSBudWxsIHx8IGFjdHVhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGV4cGVjdGF0aW9uKSB7XG4gICAgICAgICAgICBpZiAoZXhwZWN0YXRpb24uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHZhciBleHAgPSBleHBlY3RhdGlvbltrZXldO1xuICAgICAgICAgICAgICAgIHZhciBhY3QgPSBhY3R1YWxba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2guaXNNYXRjaGVyKGV4cCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHAudGVzdChhY3QpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNpbm9uLnR5cGVPZihleHApID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2hPYmplY3QoZXhwLCBhY3QpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFzaW5vbi5kZWVwRXF1YWwoZXhwLCBhY3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgbWF0Y2hlci5vciA9IGZ1bmN0aW9uIChtMikge1xuICAgICAgICBpZiAoIWlzTWF0Y2hlcihtMikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJNYXRjaGVyIGV4cGVjdGVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtMSA9IHRoaXM7XG4gICAgICAgIHZhciBvciA9IHNpbm9uLmNyZWF0ZShtYXRjaGVyKTtcbiAgICAgICAgb3IudGVzdCA9IGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBtMS50ZXN0KGFjdHVhbCkgfHwgbTIudGVzdChhY3R1YWwpO1xuICAgICAgICB9O1xuICAgICAgICBvci5tZXNzYWdlID0gbTEubWVzc2FnZSArIFwiLm9yKFwiICsgbTIubWVzc2FnZSArIFwiKVwiO1xuICAgICAgICByZXR1cm4gb3I7XG4gICAgfTtcblxuICAgIG1hdGNoZXIuYW5kID0gZnVuY3Rpb24gKG0yKSB7XG4gICAgICAgIGlmICghaXNNYXRjaGVyKG0yKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk1hdGNoZXIgZXhwZWN0ZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG0xID0gdGhpcztcbiAgICAgICAgdmFyIGFuZCA9IHNpbm9uLmNyZWF0ZShtYXRjaGVyKTtcbiAgICAgICAgYW5kLnRlc3QgPSBmdW5jdGlvbiAoYWN0dWFsKSB7XG4gICAgICAgICAgICByZXR1cm4gbTEudGVzdChhY3R1YWwpICYmIG0yLnRlc3QoYWN0dWFsKTtcbiAgICAgICAgfTtcbiAgICAgICAgYW5kLm1lc3NhZ2UgPSBtMS5tZXNzYWdlICsgXCIuYW5kKFwiICsgbTIubWVzc2FnZSArIFwiKVwiO1xuICAgICAgICByZXR1cm4gYW5kO1xuICAgIH07XG5cbiAgICB2YXIgbWF0Y2ggPSBmdW5jdGlvbiAoZXhwZWN0YXRpb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIG0gPSBzaW5vbi5jcmVhdGUobWF0Y2hlcik7XG4gICAgICAgIHZhciB0eXBlID0gc2lub24udHlwZU9mKGV4cGVjdGF0aW9uKTtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXhwZWN0YXRpb24udGVzdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgbS50ZXN0ID0gZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhwZWN0YXRpb24udGVzdChhY3R1YWwpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbS5tZXNzYWdlID0gXCJtYXRjaChcIiArIHNpbm9uLmZ1bmN0aW9uTmFtZShleHBlY3RhdGlvbi50ZXN0KSArIFwiKVwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHN0ciA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGV4cGVjdGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4cGVjdGF0aW9uLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyLnB1c2goa2V5ICsgXCI6IFwiICsgZXhwZWN0YXRpb25ba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbS50ZXN0ID0gZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaE9iamVjdChleHBlY3RhdGlvbiwgYWN0dWFsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBtLm1lc3NhZ2UgPSBcIm1hdGNoKFwiICsgc3RyLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgICAgIG0udGVzdCA9IGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhwZWN0YXRpb24gPT0gYWN0dWFsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICBtLnRlc3QgPSBmdW5jdGlvbiAoYWN0dWFsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWwgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0dWFsLmluZGV4T2YoZXhwZWN0YXRpb24pICE9PSAtMTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBtLm1lc3NhZ2UgPSBcIm1hdGNoKFxcXCJcIiArIGV4cGVjdGF0aW9uICsgXCJcXFwiKVwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJyZWdleHBcIjpcbiAgICAgICAgICAgIG0udGVzdCA9IGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFjdHVhbCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBleHBlY3RhdGlvbi50ZXN0KGFjdHVhbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJmdW5jdGlvblwiOlxuICAgICAgICAgICAgbS50ZXN0ID0gZXhwZWN0YXRpb247XG4gICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIG0ubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG0ubWVzc2FnZSA9IFwibWF0Y2goXCIgKyBzaW5vbi5mdW5jdGlvbk5hbWUoZXhwZWN0YXRpb24pICsgXCIpXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIG0udGVzdCA9IGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHNpbm9uLmRlZXBFcXVhbChleHBlY3RhdGlvbiwgYWN0dWFsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgIG0ubWVzc2FnZSA9IFwibWF0Y2goXCIgKyBleHBlY3RhdGlvbiArIFwiKVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtO1xuICAgIH07XG5cbiAgICBtYXRjaC5pc01hdGNoZXIgPSBpc01hdGNoZXI7XG5cbiAgICBtYXRjaC5hbnkgPSBtYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sIFwiYW55XCIpO1xuXG4gICAgbWF0Y2guZGVmaW5lZCA9IG1hdGNoKGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgcmV0dXJuIGFjdHVhbCAhPT0gbnVsbCAmJiBhY3R1YWwgIT09IHVuZGVmaW5lZDtcbiAgICB9LCBcImRlZmluZWRcIik7XG5cbiAgICBtYXRjaC50cnV0aHkgPSBtYXRjaChmdW5jdGlvbiAoYWN0dWFsKSB7XG4gICAgICAgIHJldHVybiAhIWFjdHVhbDtcbiAgICB9LCBcInRydXRoeVwiKTtcblxuICAgIG1hdGNoLmZhbHN5ID0gbWF0Y2goZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICByZXR1cm4gIWFjdHVhbDtcbiAgICB9LCBcImZhbHN5XCIpO1xuXG4gICAgbWF0Y2guc2FtZSA9IGZ1bmN0aW9uIChleHBlY3RhdGlvbikge1xuICAgICAgICByZXR1cm4gbWF0Y2goZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGV4cGVjdGF0aW9uID09PSBhY3R1YWw7XG4gICAgICAgIH0sIFwic2FtZShcIiArIGV4cGVjdGF0aW9uICsgXCIpXCIpO1xuICAgIH07XG5cbiAgICBtYXRjaC50eXBlT2YgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICBhc3NlcnRUeXBlKHR5cGUsIFwic3RyaW5nXCIsIFwidHlwZVwiKTtcbiAgICAgICAgcmV0dXJuIG1hdGNoKGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBzaW5vbi50eXBlT2YoYWN0dWFsKSA9PT0gdHlwZTtcbiAgICAgICAgfSwgXCJ0eXBlT2YoXFxcIlwiICsgdHlwZSArIFwiXFxcIilcIik7XG4gICAgfTtcblxuICAgIG1hdGNoLmluc3RhbmNlT2YgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICBhc3NlcnRUeXBlKHR5cGUsIFwiZnVuY3Rpb25cIiwgXCJ0eXBlXCIpO1xuICAgICAgICByZXR1cm4gbWF0Y2goZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGFjdHVhbCBpbnN0YW5jZW9mIHR5cGU7XG4gICAgICAgIH0sIFwiaW5zdGFuY2VPZihcIiArIHNpbm9uLmZ1bmN0aW9uTmFtZSh0eXBlKSArIFwiKVwiKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlUHJvcGVydHlNYXRjaGVyKHByb3BlcnR5VGVzdCwgbWVzc2FnZVByZWZpeCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICAgICAgYXNzZXJ0VHlwZShwcm9wZXJ0eSwgXCJzdHJpbmdcIiwgXCJwcm9wZXJ0eVwiKTtcbiAgICAgICAgICAgIHZhciBvbmx5UHJvcGVydHkgPSBhcmd1bWVudHMubGVuZ3RoID09PSAxO1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBtZXNzYWdlUHJlZml4ICsgXCIoXFxcIlwiICsgcHJvcGVydHkgKyBcIlxcXCJcIjtcbiAgICAgICAgICAgIGlmICghb25seVByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSArPSBcIiwgXCIgKyB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1lc3NhZ2UgKz0gXCIpXCI7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgICAgIGlmIChhY3R1YWwgPT09IHVuZGVmaW5lZCB8fCBhY3R1YWwgPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICFwcm9wZXJ0eVRlc3QoYWN0dWFsLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb25seVByb3BlcnR5IHx8IHNpbm9uLmRlZXBFcXVhbCh2YWx1ZSwgYWN0dWFsW3Byb3BlcnR5XSk7XG4gICAgICAgICAgICB9LCBtZXNzYWdlKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBtYXRjaC5oYXMgPSBjcmVhdGVQcm9wZXJ0eU1hdGNoZXIoZnVuY3Rpb24gKGFjdHVhbCwgcHJvcGVydHkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWwgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eSBpbiBhY3R1YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjdHVhbFtwcm9wZXJ0eV0gIT09IHVuZGVmaW5lZDtcbiAgICB9LCBcImhhc1wiKTtcblxuICAgIG1hdGNoLmhhc093biA9IGNyZWF0ZVByb3BlcnR5TWF0Y2hlcihmdW5jdGlvbiAoYWN0dWFsLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4gYWN0dWFsLmhhc093blByb3BlcnR5KHByb3BlcnR5KTtcbiAgICB9LCBcImhhc093blwiKTtcblxuICAgIG1hdGNoLmJvb2wgPSBtYXRjaC50eXBlT2YoXCJib29sZWFuXCIpO1xuICAgIG1hdGNoLm51bWJlciA9IG1hdGNoLnR5cGVPZihcIm51bWJlclwiKTtcbiAgICBtYXRjaC5zdHJpbmcgPSBtYXRjaC50eXBlT2YoXCJzdHJpbmdcIik7XG4gICAgbWF0Y2gub2JqZWN0ID0gbWF0Y2gudHlwZU9mKFwib2JqZWN0XCIpO1xuICAgIG1hdGNoLmZ1bmMgPSBtYXRjaC50eXBlT2YoXCJmdW5jdGlvblwiKTtcbiAgICBtYXRjaC5hcnJheSA9IG1hdGNoLnR5cGVPZihcImFycmF5XCIpO1xuICAgIG1hdGNoLnJlZ2V4cCA9IG1hdGNoLnR5cGVPZihcInJlZ2V4cFwiKTtcbiAgICBtYXRjaC5kYXRlID0gbWF0Y2gudHlwZU9mKFwiZGF0ZVwiKTtcblxuICAgIGlmIChjb21tb25KU01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IG1hdGNoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLm1hdGNoID0gbWF0Y2g7XG4gICAgfVxufSh0eXBlb2Ygc2lub24gPT0gXCJvYmplY3RcIiAmJiBzaW5vbiB8fCBudWxsKSk7XG4iLCIvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqIEBkZXBlbmQgc3R1Yi5qc1xuICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBub21lbjogZmFsc2UqL1xuLypnbG9iYWwgbW9kdWxlLCByZXF1aXJlLCBzaW5vbiovXG4vKipcbiAqIE1vY2sgZnVuY3Rpb25zLlxuICpcbiAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uKSB7XG4gICAgdmFyIGNvbW1vbkpTTW9kdWxlID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG4gICAgdmFyIHB1c2ggPSBbXS5wdXNoO1xuICAgIHZhciBtYXRjaDtcblxuICAgIGlmICghc2lub24gJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgc2lub24gPSByZXF1aXJlKFwiLi4vc2lub25cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzaW5vbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWF0Y2ggPSBzaW5vbi5tYXRjaDtcblxuICAgIGlmICghbWF0Y2ggJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgbWF0Y2ggPSByZXF1aXJlKFwiLi9tYXRjaFwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb2NrKG9iamVjdCkge1xuICAgICAgICBpZiAoIW9iamVjdCkge1xuICAgICAgICAgICAgcmV0dXJuIHNpbm9uLmV4cGVjdGF0aW9uLmNyZWF0ZShcIkFub255bW91cyBtb2NrXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vY2suY3JlYXRlKG9iamVjdCk7XG4gICAgfVxuXG4gICAgc2lub24ubW9jayA9IG1vY2s7XG5cbiAgICBzaW5vbi5leHRlbmQobW9jaywgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZnVuY3Rpb24gZWFjaChjb2xsZWN0aW9uLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKCFjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbGxlY3Rpb24ubGVuZ3RoOyBpIDwgbDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soY29sbGVjdGlvbltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiBjcmVhdGUob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm9iamVjdCBpcyBudWxsXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBtb2NrT2JqZWN0ID0gc2lub24uZXh0ZW5kKHt9LCBtb2NrKTtcbiAgICAgICAgICAgICAgICBtb2NrT2JqZWN0Lm9iamVjdCA9IG9iamVjdDtcbiAgICAgICAgICAgICAgICBkZWxldGUgbW9ja09iamVjdC5jcmVhdGU7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gbW9ja09iamVjdDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGV4cGVjdHM6IGZ1bmN0aW9uIGV4cGVjdHMobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm1ldGhvZCBpcyBmYWxzeVwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZXhwZWN0YXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0YXRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJveGllcyA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5leHBlY3RhdGlvbnNbbWV0aG9kXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cGVjdGF0aW9uc1ttZXRob2RdID0gW107XG4gICAgICAgICAgICAgICAgICAgIHZhciBtb2NrT2JqZWN0ID0gdGhpcztcblxuICAgICAgICAgICAgICAgICAgICBzaW5vbi53cmFwTWV0aG9kKHRoaXMub2JqZWN0LCBtZXRob2QsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb2NrT2JqZWN0Lmludm9rZU1ldGhvZChtZXRob2QsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbCh0aGlzLnByb3hpZXMsIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGV4cGVjdGF0aW9uID0gc2lub24uZXhwZWN0YXRpb24uY3JlYXRlKG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgcHVzaC5jYWxsKHRoaXMuZXhwZWN0YXRpb25zW21ldGhvZF0sIGV4cGVjdGF0aW9uKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBleHBlY3RhdGlvbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlc3RvcmU6IGZ1bmN0aW9uIHJlc3RvcmUoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IHRoaXMub2JqZWN0O1xuXG4gICAgICAgICAgICAgICAgZWFjaCh0aGlzLnByb3hpZXMsIGZ1bmN0aW9uIChwcm94eSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdFtwcm94eV0ucmVzdG9yZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdFtwcm94eV0ucmVzdG9yZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB2ZXJpZnk6IGZ1bmN0aW9uIHZlcmlmeSgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwZWN0YXRpb25zID0gdGhpcy5leHBlY3RhdGlvbnMgfHwge307XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gW10sIG1ldCA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZWFjaCh0aGlzLnByb3hpZXMsIGZ1bmN0aW9uIChwcm94eSkge1xuICAgICAgICAgICAgICAgICAgICBlYWNoKGV4cGVjdGF0aW9uc1twcm94eV0sIGZ1bmN0aW9uIChleHBlY3RhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFleHBlY3RhdGlvbi5tZXQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChtZXNzYWdlcywgZXhwZWN0YXRpb24udG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChtZXQsIGV4cGVjdGF0aW9uLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2lub24uZXhwZWN0YXRpb24uZmFpbChtZXNzYWdlcy5jb25jYXQobWV0KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzaW5vbi5leHBlY3RhdGlvbi5wYXNzKG1lc3NhZ2VzLmNvbmNhdChtZXQpLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgaW52b2tlTWV0aG9kOiBmdW5jdGlvbiBpbnZva2VNZXRob2QobWV0aG9kLCB0aGlzVmFsdWUsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwZWN0YXRpb25zID0gdGhpcy5leHBlY3RhdGlvbnMgJiYgdGhpcy5leHBlY3RhdGlvbnNbbWV0aG9kXTtcbiAgICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gZXhwZWN0YXRpb25zICYmIGV4cGVjdGF0aW9ucy5sZW5ndGggfHwgMCwgaTtcblxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4cGVjdGF0aW9uc1tpXS5tZXQoKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0YXRpb25zW2ldLmFsbG93c0NhbGwodGhpc1ZhbHVlLCBhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV4cGVjdGF0aW9uc1tpXS5hcHBseSh0aGlzVmFsdWUsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gW10sIGF2YWlsYWJsZSwgZXhoYXVzdGVkID0gMDtcblxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXhwZWN0YXRpb25zW2ldLmFsbG93c0NhbGwodGhpc1ZhbHVlLCBhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlID0gYXZhaWxhYmxlIHx8IGV4cGVjdGF0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4aGF1c3RlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChtZXNzYWdlcywgXCIgICAgXCIgKyBleHBlY3RhdGlvbnNbaV0udG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGV4aGF1c3RlZCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXZhaWxhYmxlLmFwcGx5KHRoaXNWYWx1ZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWVzc2FnZXMudW5zaGlmdChcIlVuZXhwZWN0ZWQgY2FsbDogXCIgKyBzaW5vbi5zcHlDYWxsLnRvU3RyaW5nLmNhbGwoe1xuICAgICAgICAgICAgICAgICAgICBwcm94eTogbWV0aG9kLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBhcmdzXG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgc2lub24uZXhwZWN0YXRpb24uZmFpbChtZXNzYWdlcy5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KCkpKTtcblxuICAgIHZhciB0aW1lcyA9IHNpbm9uLnRpbWVzSW5Xb3JkcztcblxuICAgIHNpbm9uLmV4cGVjdGF0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICAgICAgICB2YXIgX2ludm9rZSA9IHNpbm9uLnNweS5pbnZva2U7XG5cbiAgICAgICAgZnVuY3Rpb24gY2FsbENvdW50SW5Xb3JkcyhjYWxsQ291bnQpIHtcbiAgICAgICAgICAgIGlmIChjYWxsQ291bnQgPT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIm5ldmVyIGNhbGxlZFwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJjYWxsZWQgXCIgKyB0aW1lcyhjYWxsQ291bnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZXhwZWN0ZWRDYWxsQ291bnRJbldvcmRzKGV4cGVjdGF0aW9uKSB7XG4gICAgICAgICAgICB2YXIgbWluID0gZXhwZWN0YXRpb24ubWluQ2FsbHM7XG4gICAgICAgICAgICB2YXIgbWF4ID0gZXhwZWN0YXRpb24ubWF4Q2FsbHM7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWluID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIG1heCA9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ciA9IHRpbWVzKG1pbik7XG5cbiAgICAgICAgICAgICAgICBpZiAobWluICE9IG1heCkge1xuICAgICAgICAgICAgICAgICAgICBzdHIgPSBcImF0IGxlYXN0IFwiICsgc3RyICsgXCIgYW5kIGF0IG1vc3QgXCIgKyB0aW1lcyhtYXgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWluID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJhdCBsZWFzdCBcIiArIHRpbWVzKG1pbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBcImF0IG1vc3QgXCIgKyB0aW1lcyhtYXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVjZWl2ZWRNaW5DYWxscyhleHBlY3RhdGlvbikge1xuICAgICAgICAgICAgdmFyIGhhc01pbkxpbWl0ID0gdHlwZW9mIGV4cGVjdGF0aW9uLm1pbkNhbGxzID09IFwibnVtYmVyXCI7XG4gICAgICAgICAgICByZXR1cm4gIWhhc01pbkxpbWl0IHx8IGV4cGVjdGF0aW9uLmNhbGxDb3VudCA+PSBleHBlY3RhdGlvbi5taW5DYWxscztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlY2VpdmVkTWF4Q2FsbHMoZXhwZWN0YXRpb24pIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXhwZWN0YXRpb24ubWF4Q2FsbHMgIT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGV4cGVjdGF0aW9uLmNhbGxDb3VudCA9PSBleHBlY3RhdGlvbi5tYXhDYWxscztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZlcmlmeU1hdGNoZXIocG9zc2libGVNYXRjaGVyLCBhcmcpe1xuICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoLmlzTWF0Y2hlcihwb3NzaWJsZU1hdGNoZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBvc3NpYmxlTWF0Y2hlci50ZXN0KGFyZyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1pbkNhbGxzOiAxLFxuICAgICAgICAgICAgbWF4Q2FsbHM6IDEsXG5cbiAgICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gY3JlYXRlKG1ldGhvZE5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwZWN0YXRpb24gPSBzaW5vbi5leHRlbmQoc2lub24uc3R1Yi5jcmVhdGUoKSwgc2lub24uZXhwZWN0YXRpb24pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBleHBlY3RhdGlvbi5jcmVhdGU7XG4gICAgICAgICAgICAgICAgZXhwZWN0YXRpb24ubWV0aG9kID0gbWV0aG9kTmFtZTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBleHBlY3RhdGlvbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGludm9rZTogZnVuY3Rpb24gaW52b2tlKGZ1bmMsIHRoaXNWYWx1ZSwgYXJncykge1xuICAgICAgICAgICAgICAgIHRoaXMudmVyaWZ5Q2FsbEFsbG93ZWQodGhpc1ZhbHVlLCBhcmdzKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBfaW52b2tlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhdExlYXN0OiBmdW5jdGlvbiBhdExlYXN0KG51bSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbnVtICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIidcIiArIG51bSArIFwiJyBpcyBub3QgbnVtYmVyXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5saW1pdHNTZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXhDYWxscyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGltaXRzU2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLm1pbkNhbGxzID0gbnVtO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhdE1vc3Q6IGZ1bmN0aW9uIGF0TW9zdChudW0pIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG51bSAhPSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCInXCIgKyBudW0gKyBcIicgaXMgbm90IG51bWJlclwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubGltaXRzU2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWluQ2FsbHMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbWl0c1NldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhDYWxscyA9IG51bTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbmV2ZXI6IGZ1bmN0aW9uIG5ldmVyKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4YWN0bHkoMCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbmNlOiBmdW5jdGlvbiBvbmNlKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4YWN0bHkoMSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB0d2ljZTogZnVuY3Rpb24gdHdpY2UoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXhhY3RseSgyKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHRocmljZTogZnVuY3Rpb24gdGhyaWNlKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4YWN0bHkoMyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBleGFjdGx5OiBmdW5jdGlvbiBleGFjdGx5KG51bSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbnVtICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIidcIiArIG51bSArIFwiJyBpcyBub3QgYSBudW1iZXJcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5hdExlYXN0KG51bSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXRNb3N0KG51bSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBtZXQ6IGZ1bmN0aW9uIG1ldCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIXRoaXMuZmFpbGVkICYmIHJlY2VpdmVkTWluQ2FsbHModGhpcyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB2ZXJpZnlDYWxsQWxsb3dlZDogZnVuY3Rpb24gdmVyaWZ5Q2FsbEFsbG93ZWQodGhpc1ZhbHVlLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlY2VpdmVkTWF4Q2FsbHModGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzaW5vbi5leHBlY3RhdGlvbi5mYWlsKHRoaXMubWV0aG9kICsgXCIgYWxyZWFkeSBjYWxsZWQgXCIgKyB0aW1lcyh0aGlzLm1heENhbGxzKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKFwiZXhwZWN0ZWRUaGlzXCIgaW4gdGhpcyAmJiB0aGlzLmV4cGVjdGVkVGhpcyAhPT0gdGhpc1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLmZhaWwodGhpcy5tZXRob2QgKyBcIiBjYWxsZWQgd2l0aCBcIiArIHRoaXNWYWx1ZSArIFwiIGFzIHRoaXNWYWx1ZSwgZXhwZWN0ZWQgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBlY3RlZFRoaXMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghKFwiZXhwZWN0ZWRBcmd1bWVudHNcIiBpbiB0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLmZhaWwodGhpcy5tZXRob2QgKyBcIiByZWNlaXZlZCBubyBhcmd1bWVudHMsIGV4cGVjdGVkIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbm9uLmZvcm1hdCh0aGlzLmV4cGVjdGVkQXJndW1lbnRzKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgdGhpcy5leHBlY3RlZEFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2lub24uZXhwZWN0YXRpb24uZmFpbCh0aGlzLm1ldGhvZCArIFwiIHJlY2VpdmVkIHRvbyBmZXcgYXJndW1lbnRzIChcIiArIHNpbm9uLmZvcm1hdChhcmdzKSArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiksIGV4cGVjdGVkIFwiICsgc2lub24uZm9ybWF0KHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5leHBlY3RzRXhhY3RBcmdDb3VudCAmJlxuICAgICAgICAgICAgICAgICAgICBhcmdzLmxlbmd0aCAhPSB0aGlzLmV4cGVjdGVkQXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzaW5vbi5leHBlY3RhdGlvbi5mYWlsKHRoaXMubWV0aG9kICsgXCIgcmVjZWl2ZWQgdG9vIG1hbnkgYXJndW1lbnRzIChcIiArIHNpbm9uLmZvcm1hdChhcmdzKSArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiksIGV4cGVjdGVkIFwiICsgc2lub24uZm9ybWF0KHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgaSArPSAxKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2ZXJpZnlNYXRjaGVyKHRoaXMuZXhwZWN0ZWRBcmd1bWVudHNbaV0sYXJnc1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLmZhaWwodGhpcy5tZXRob2QgKyBcIiByZWNlaXZlZCB3cm9uZyBhcmd1bWVudHMgXCIgKyBzaW5vbi5mb3JtYXQoYXJncykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBkaWRuJ3QgbWF0Y2ggXCIgKyB0aGlzLmV4cGVjdGVkQXJndW1lbnRzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzaW5vbi5kZWVwRXF1YWwodGhpcy5leHBlY3RlZEFyZ3VtZW50c1tpXSwgYXJnc1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLmZhaWwodGhpcy5tZXRob2QgKyBcIiByZWNlaXZlZCB3cm9uZyBhcmd1bWVudHMgXCIgKyBzaW5vbi5mb3JtYXQoYXJncykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBleHBlY3RlZCBcIiArIHNpbm9uLmZvcm1hdCh0aGlzLmV4cGVjdGVkQXJndW1lbnRzKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhbGxvd3NDYWxsOiBmdW5jdGlvbiBhbGxvd3NDYWxsKHRoaXNWYWx1ZSwgYXJncykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1ldCgpICYmIHJlY2VpdmVkTWF4Q2FsbHModGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChcImV4cGVjdGVkVGhpc1wiIGluIHRoaXMgJiYgdGhpcy5leHBlY3RlZFRoaXMgIT09IHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCEoXCJleHBlY3RlZEFyZ3VtZW50c1wiIGluIHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzIHx8IFtdO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgdGhpcy5leHBlY3RlZEFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmV4cGVjdHNFeGFjdEFyZ0NvdW50ICYmXG4gICAgICAgICAgICAgICAgICAgIGFyZ3MubGVuZ3RoICE9IHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmVyaWZ5TWF0Y2hlcih0aGlzLmV4cGVjdGVkQXJndW1lbnRzW2ldLGFyZ3NbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXNpbm9uLmRlZXBFcXVhbCh0aGlzLmV4cGVjdGVkQXJndW1lbnRzW2ldLCBhcmdzW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB3aXRoQXJnczogZnVuY3Rpb24gd2l0aEFyZ3MoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5leHBlY3RlZEFyZ3VtZW50cyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHdpdGhFeGFjdEFyZ3M6IGZ1bmN0aW9uIHdpdGhFeGFjdEFyZ3MoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53aXRoQXJncy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0c0V4YWN0QXJnQ291bnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb246IGZ1bmN0aW9uIG9uKHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0ZWRUaGlzID0gdGhpc1ZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9ICh0aGlzLmV4cGVjdGVkQXJndW1lbnRzIHx8IFtdKS5zbGljZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmV4cGVjdHNFeGFjdEFyZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChhcmdzLCBcIlsuLi5dXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBjYWxsU3RyID0gc2lub24uc3B5Q2FsbC50b1N0cmluZy5jYWxsKHtcbiAgICAgICAgICAgICAgICAgICAgcHJveHk6IHRoaXMubWV0aG9kIHx8IFwiYW5vbnltb3VzIG1vY2sgZXhwZWN0YXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgYXJnczogYXJnc1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBjYWxsU3RyLnJlcGxhY2UoXCIsIFsuLi5cIiwgXCJbLCAuLi5cIikgKyBcIiBcIiArXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQ2FsbENvdW50SW5Xb3Jkcyh0aGlzKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1ldCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIkV4cGVjdGF0aW9uIG1ldDogXCIgKyBtZXNzYWdlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBcIkV4cGVjdGVkIFwiICsgbWVzc2FnZSArIFwiIChcIiArXG4gICAgICAgICAgICAgICAgICAgIGNhbGxDb3VudEluV29yZHModGhpcy5jYWxsQ291bnQpICsgXCIpXCI7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB2ZXJpZnk6IGZ1bmN0aW9uIHZlcmlmeSgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubWV0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2lub24uZXhwZWN0YXRpb24uZmFpbCh0aGlzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLnBhc3ModGhpcy50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHBhc3M6IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgc2lub24uYXNzZXJ0LnBhc3MobWVzc2FnZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZmFpbDogZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhjZXB0aW9uID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbi5uYW1lID0gXCJFeHBlY3RhdGlvbkVycm9yXCI7XG5cbiAgICAgICAgICAgICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSgpKTtcblxuICAgIGlmIChjb21tb25KU01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IG1vY2s7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2lub24ubW9jayA9IG1vY2s7XG4gICAgfVxufSh0eXBlb2Ygc2lub24gPT0gXCJvYmplY3RcIiAmJiBzaW5vbiB8fCBudWxsKSk7XG4iLCIvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqIEBkZXBlbmQgY29sbGVjdGlvbi5qc1xuICogQGRlcGVuZCB1dGlsL2Zha2VfdGltZXJzLmpzXG4gKiBAZGVwZW5kIHV0aWwvZmFrZV9zZXJ2ZXJfd2l0aF9jbG9jay5qc1xuICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBwbHVzcGx1czogZmFsc2UqL1xuLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cbi8qKlxuICogTWFuYWdlcyBmYWtlIGNvbGxlY3Rpb25zIGFzIHdlbGwgYXMgZmFrZSB1dGlsaXRpZXMgc3VjaCBhcyBTaW5vbidzXG4gKiB0aW1lcnMgYW5kIGZha2UgWEhSIGltcGxlbWVudGF0aW9uIGluIG9uZSBjb252ZW5pZW50IG9iamVjdC5cbiAqXG4gKiBAYXV0aG9yIENocmlzdGlhbiBKb2hhbnNlbiAoY2hyaXN0aWFuQGNqb2hhbnNlbi5ubylcbiAqIEBsaWNlbnNlIEJTRFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMC0yMDEzIENocmlzdGlhbiBKb2hhbnNlblxuICovXG5cInVzZSBzdHJpY3RcIjtcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgdmFyIHNpbm9uID0gcmVxdWlyZShcIi4uL3Npbm9uXCIpO1xuICAgIHNpbm9uLmV4dGVuZChzaW5vbiwgcmVxdWlyZShcIi4vdXRpbC9mYWtlX3RpbWVyc1wiKSk7XG59XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHB1c2ggPSBbXS5wdXNoO1xuXG4gICAgZnVuY3Rpb24gZXhwb3NlVmFsdWUoc2FuZGJveCwgY29uZmlnLCBrZXksIHZhbHVlKSB7XG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcuaW5qZWN0SW50byAmJiAhKGtleSBpbiBjb25maWcuaW5qZWN0SW50bykgKSB7XG4gICAgICAgICAgICBjb25maWcuaW5qZWN0SW50b1trZXldID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwdXNoLmNhbGwoc2FuZGJveC5hcmdzLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmVwYXJlU2FuZGJveEZyb21Db25maWcoY29uZmlnKSB7XG4gICAgICAgIHZhciBzYW5kYm94ID0gc2lub24uY3JlYXRlKHNpbm9uLnNhbmRib3gpO1xuXG4gICAgICAgIGlmIChjb25maWcudXNlRmFrZVNlcnZlcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcudXNlRmFrZVNlcnZlciA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgc2FuZGJveC5zZXJ2ZXJQcm90b3R5cGUgPSBjb25maWcudXNlRmFrZVNlcnZlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2FuZGJveC51c2VGYWtlU2VydmVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLnVzZUZha2VUaW1lcnMpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnLnVzZUZha2VUaW1lcnMgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHNhbmRib3gudXNlRmFrZVRpbWVycy5hcHBseShzYW5kYm94LCBjb25maWcudXNlRmFrZVRpbWVycyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNhbmRib3gudXNlRmFrZVRpbWVycygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNhbmRib3g7XG4gICAgfVxuXG4gICAgc2lub24uc2FuZGJveCA9IHNpbm9uLmV4dGVuZChzaW5vbi5jcmVhdGUoc2lub24uY29sbGVjdGlvbiksIHtcbiAgICAgICAgdXNlRmFrZVRpbWVyczogZnVuY3Rpb24gdXNlRmFrZVRpbWVycygpIHtcbiAgICAgICAgICAgIHRoaXMuY2xvY2sgPSBzaW5vbi51c2VGYWtlVGltZXJzLmFwcGx5KHNpbm9uLCBhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQodGhpcy5jbG9jayk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VydmVyUHJvdG90eXBlOiBzaW5vbi5mYWtlU2VydmVyLFxuXG4gICAgICAgIHVzZUZha2VTZXJ2ZXI6IGZ1bmN0aW9uIHVzZUZha2VTZXJ2ZXIoKSB7XG4gICAgICAgICAgICB2YXIgcHJvdG8gPSB0aGlzLnNlcnZlclByb3RvdHlwZSB8fCBzaW5vbi5mYWtlU2VydmVyO1xuXG4gICAgICAgICAgICBpZiAoIXByb3RvIHx8ICFwcm90by5jcmVhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5zZXJ2ZXIgPSBwcm90by5jcmVhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZCh0aGlzLnNlcnZlcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5qZWN0OiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICBzaW5vbi5jb2xsZWN0aW9uLmluamVjdC5jYWxsKHRoaXMsIG9iaik7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNsb2NrKSB7XG4gICAgICAgICAgICAgICAgb2JqLmNsb2NrID0gdGhpcy5jbG9jaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuc2VydmVyKSB7XG4gICAgICAgICAgICAgICAgb2JqLnNlcnZlciA9IHRoaXMuc2VydmVyO1xuICAgICAgICAgICAgICAgIG9iai5yZXF1ZXN0cyA9IHRoaXMuc2VydmVyLnJlcXVlc3RzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lub24uY3JlYXRlKHNpbm9uLnNhbmRib3gpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc2FuZGJveCA9IHByZXBhcmVTYW5kYm94RnJvbUNvbmZpZyhjb25maWcpO1xuICAgICAgICAgICAgc2FuZGJveC5hcmdzID0gc2FuZGJveC5hcmdzIHx8IFtdO1xuICAgICAgICAgICAgdmFyIHByb3AsIHZhbHVlLCBleHBvc2VkID0gc2FuZGJveC5pbmplY3Qoe30pO1xuXG4gICAgICAgICAgICBpZiAoY29uZmlnLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbmZpZy5wcm9wZXJ0aWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBwcm9wID0gY29uZmlnLnByb3BlcnRpZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZXhwb3NlZFtwcm9wXSB8fCBwcm9wID09IFwic2FuZGJveFwiICYmIHNhbmRib3g7XG4gICAgICAgICAgICAgICAgICAgIGV4cG9zZVZhbHVlKHNhbmRib3gsIGNvbmZpZywgcHJvcCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwb3NlVmFsdWUoc2FuZGJveCwgY29uZmlnLCBcInNhbmRib3hcIiwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2FuZGJveDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgc2lub24uc2FuZGJveC51c2VGYWtlWE1MSHR0cFJlcXVlc3QgPSBzaW5vbi5zYW5kYm94LnVzZUZha2VTZXJ2ZXI7XG5cbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBzaW5vbi5zYW5kYm94O1xuICAgIH1cbn0oKSk7XG4iLCIvKipcbiAgKiBAZGVwZW5kIC4uL3Npbm9uLmpzXG4gICogQGRlcGVuZCBjYWxsLmpzXG4gICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBwbHVzcGx1czogZmFsc2UqL1xuLypnbG9iYWwgbW9kdWxlLCByZXF1aXJlLCBzaW5vbiovXG4vKipcbiAgKiBTcHkgZnVuY3Rpb25zXG4gICpcbiAgKiBAYXV0aG9yIENocmlzdGlhbiBKb2hhbnNlbiAoY2hyaXN0aWFuQGNqb2hhbnNlbi5ubylcbiAgKiBAbGljZW5zZSBCU0RcbiAgKlxuICAqIENvcHlyaWdodCAoYykgMjAxMC0yMDEzIENocmlzdGlhbiBKb2hhbnNlblxuICAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbihmdW5jdGlvbiAoc2lub24pIHtcbiAgICB2YXIgY29tbW9uSlNNb2R1bGUgPSB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cztcbiAgICB2YXIgcHVzaCA9IEFycmF5LnByb3RvdHlwZS5wdXNoO1xuICAgIHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgICB2YXIgY2FsbElkID0gMDtcblxuICAgIGlmICghc2lub24gJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgc2lub24gPSByZXF1aXJlKFwiLi4vc2lub25cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzaW5vbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3B5KG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICAgICAgaWYgKCFwcm9wZXJ0eSAmJiB0eXBlb2Ygb2JqZWN0ID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcmV0dXJuIHNweS5jcmVhdGUob2JqZWN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb2JqZWN0ICYmICFwcm9wZXJ0eSkge1xuICAgICAgICAgICAgcmV0dXJuIHNweS5jcmVhdGUoZnVuY3Rpb24gKCkgeyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtZXRob2QgPSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICByZXR1cm4gc2lub24ud3JhcE1ldGhvZChvYmplY3QsIHByb3BlcnR5LCBzcHkuY3JlYXRlKG1ldGhvZCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hdGNoaW5nRmFrZShmYWtlcywgYXJncywgc3RyaWN0KSB7XG4gICAgICAgIGlmICghZmFrZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gZmFrZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZmFrZXNbaV0ubWF0Y2hlcyhhcmdzLCBzdHJpY3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZha2VzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5jcmVtZW50Q2FsbENvdW50KCkge1xuICAgICAgICB0aGlzLmNhbGxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuY2FsbENvdW50ICs9IDE7XG4gICAgICAgIHRoaXMubm90Q2FsbGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FsbGVkT25jZSA9IHRoaXMuY2FsbENvdW50ID09IDE7XG4gICAgICAgIHRoaXMuY2FsbGVkVHdpY2UgPSB0aGlzLmNhbGxDb3VudCA9PSAyO1xuICAgICAgICB0aGlzLmNhbGxlZFRocmljZSA9IHRoaXMuY2FsbENvdW50ID09IDM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlQ2FsbFByb3BlcnRpZXMoKSB7XG4gICAgICAgIHRoaXMuZmlyc3RDYWxsID0gdGhpcy5nZXRDYWxsKDApO1xuICAgICAgICB0aGlzLnNlY29uZENhbGwgPSB0aGlzLmdldENhbGwoMSk7XG4gICAgICAgIHRoaXMudGhpcmRDYWxsID0gdGhpcy5nZXRDYWxsKDIpO1xuICAgICAgICB0aGlzLmxhc3RDYWxsID0gdGhpcy5nZXRDYWxsKHRoaXMuY2FsbENvdW50IC0gMSk7XG4gICAgfVxuXG4gICAgdmFyIHZhcnMgPSBcImEsYixjLGQsZSxmLGcsaCxpLGosayxsXCI7XG4gICAgZnVuY3Rpb24gY3JlYXRlUHJveHkoZnVuYykge1xuICAgICAgICAvLyBSZXRhaW4gdGhlIGZ1bmN0aW9uIGxlbmd0aDpcbiAgICAgICAgdmFyIHA7XG4gICAgICAgIGlmIChmdW5jLmxlbmd0aCkge1xuICAgICAgICAgICAgZXZhbChcInAgPSAoZnVuY3Rpb24gcHJveHkoXCIgKyB2YXJzLnN1YnN0cmluZygwLCBmdW5jLmxlbmd0aCAqIDIgLSAxKSArXG4gICAgICAgICAgICAgICAgXCIpIHsgcmV0dXJuIHAuaW52b2tlKGZ1bmMsIHRoaXMsIHNsaWNlLmNhbGwoYXJndW1lbnRzKSk7IH0pO1wiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHAgPSBmdW5jdGlvbiBwcm94eSgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcC5pbnZva2UoZnVuYywgdGhpcywgc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxuXG4gICAgdmFyIHV1aWQgPSAwO1xuXG4gICAgLy8gUHVibGljIEFQSVxuICAgIHZhciBzcHlBcGkgPSB7XG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5ub3RDYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jYWxsZWRPbmNlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmNhbGxlZFR3aWNlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmNhbGxlZFRocmljZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jYWxsQ291bnQgPSAwO1xuICAgICAgICAgICAgdGhpcy5maXJzdENhbGwgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5zZWNvbmRDYWxsID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudGhpcmRDYWxsID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMubGFzdENhbGwgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5hcmdzID0gW107XG4gICAgICAgICAgICB0aGlzLnJldHVyblZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy50aGlzVmFsdWVzID0gW107XG4gICAgICAgICAgICB0aGlzLmV4Y2VwdGlvbnMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuY2FsbElkcyA9IFtdO1xuICAgICAgICAgICAgaWYgKHRoaXMuZmFrZXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZmFrZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mYWtlc1tpXS5yZXNldCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIGNyZWF0ZShmdW5jKSB7XG4gICAgICAgICAgICB2YXIgbmFtZTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBmdW5jICE9IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGZ1bmMgPSBmdW5jdGlvbiAoKSB7IH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBzaW5vbi5mdW5jdGlvbk5hbWUoZnVuYyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwcm94eSA9IGNyZWF0ZVByb3h5KGZ1bmMpO1xuXG4gICAgICAgICAgICBzaW5vbi5leHRlbmQocHJveHksIHNweSk7XG4gICAgICAgICAgICBkZWxldGUgcHJveHkuY3JlYXRlO1xuICAgICAgICAgICAgc2lub24uZXh0ZW5kKHByb3h5LCBmdW5jKTtcblxuICAgICAgICAgICAgcHJveHkucmVzZXQoKTtcbiAgICAgICAgICAgIHByb3h5LnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuICAgICAgICAgICAgcHJveHkuZGlzcGxheU5hbWUgPSBuYW1lIHx8IFwic3B5XCI7XG4gICAgICAgICAgICBwcm94eS50b1N0cmluZyA9IHNpbm9uLmZ1bmN0aW9uVG9TdHJpbmc7XG4gICAgICAgICAgICBwcm94eS5fY3JlYXRlID0gc2lub24uc3B5LmNyZWF0ZTtcbiAgICAgICAgICAgIHByb3h5LmlkID0gXCJzcHkjXCIgKyB1dWlkKys7XG5cbiAgICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbnZva2U6IGZ1bmN0aW9uIGludm9rZShmdW5jLCB0aGlzVmFsdWUsIGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaGluZyA9IG1hdGNoaW5nRmFrZSh0aGlzLmZha2VzLCBhcmdzKTtcbiAgICAgICAgICAgIHZhciBleGNlcHRpb24sIHJldHVyblZhbHVlO1xuXG4gICAgICAgICAgICBpbmNyZW1lbnRDYWxsQ291bnQuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHB1c2guY2FsbCh0aGlzLnRoaXNWYWx1ZXMsIHRoaXNWYWx1ZSk7XG4gICAgICAgICAgICBwdXNoLmNhbGwodGhpcy5hcmdzLCBhcmdzKTtcbiAgICAgICAgICAgIHB1c2guY2FsbCh0aGlzLmNhbGxJZHMsIGNhbGxJZCsrKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBtYXRjaGluZy5pbnZva2UoZnVuYywgdGhpc1ZhbHVlLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9ICh0aGlzLmZ1bmMgfHwgZnVuYykuYXBwbHkodGhpc1ZhbHVlLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgdGhpc0NhbGwgPSB0aGlzLmdldENhbGwodGhpcy5jYWxsQ291bnQgLSAxKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpc0NhbGwuY2FsbGVkV2l0aE5ldygpICYmIHR5cGVvZiByZXR1cm5WYWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0aGlzVmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHB1c2guY2FsbCh0aGlzLmV4Y2VwdGlvbnMsIGV4Y2VwdGlvbik7XG4gICAgICAgICAgICBwdXNoLmNhbGwodGhpcy5yZXR1cm5WYWx1ZXMsIHJldHVyblZhbHVlKTtcblxuICAgICAgICAgICAgY3JlYXRlQ2FsbFByb3BlcnRpZXMuY2FsbCh0aGlzKTtcblxuICAgICAgICAgICAgaWYgKGV4Y2VwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Q2FsbDogZnVuY3Rpb24gZ2V0Q2FsbChpKSB7XG4gICAgICAgICAgICBpZiAoaSA8IDAgfHwgaSA+PSB0aGlzLmNhbGxDb3VudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2lub24uc3B5Q2FsbCh0aGlzLCB0aGlzLnRoaXNWYWx1ZXNbaV0sIHRoaXMuYXJnc1tpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuVmFsdWVzW2ldLCB0aGlzLmV4Y2VwdGlvbnNbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxJZHNbaV0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldENhbGxzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY2FsbHMgPSBbXTtcbiAgICAgICAgICAgIHZhciBpO1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5jYWxsQ291bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGNhbGxzLnB1c2godGhpcy5nZXRDYWxsKGkpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNhbGxzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxlZEJlZm9yZTogZnVuY3Rpb24gY2FsbGVkQmVmb3JlKHNweUZuKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY2FsbGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXNweUZuLmNhbGxlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsSWRzWzBdIDwgc3B5Rm4uY2FsbElkc1tzcHlGbi5jYWxsSWRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxlZEFmdGVyOiBmdW5jdGlvbiBjYWxsZWRBZnRlcihzcHlGbikge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNhbGxlZCB8fCAhc3B5Rm4uY2FsbGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsSWRzW3RoaXMuY2FsbENvdW50IC0gMV0gPiBzcHlGbi5jYWxsSWRzW3NweUZuLmNhbGxDb3VudCAtIDFdO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdpdGhBcmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZmFrZXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2ggPSBtYXRjaGluZ0Zha2UodGhpcy5mYWtlcywgYXJncywgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mYWtlcyA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGZha2UgPSB0aGlzLl9jcmVhdGUoKTtcbiAgICAgICAgICAgIGZha2UubWF0Y2hpbmdBZ3VtZW50cyA9IGFyZ3M7XG4gICAgICAgICAgICBmYWtlLnBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICBwdXNoLmNhbGwodGhpcy5mYWtlcywgZmFrZSk7XG5cbiAgICAgICAgICAgIGZha2Uud2l0aEFyZ3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsLndpdGhBcmdzLmFwcGx5KG9yaWdpbmFsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZmFrZS5tYXRjaGVzKHRoaXMuYXJnc1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5jcmVtZW50Q2FsbENvdW50LmNhbGwoZmFrZSk7XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChmYWtlLnRoaXNWYWx1ZXMsIHRoaXMudGhpc1ZhbHVlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChmYWtlLmFyZ3MsIHRoaXMuYXJnc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChmYWtlLnJldHVyblZhbHVlcywgdGhpcy5yZXR1cm5WYWx1ZXNbaV0pO1xuICAgICAgICAgICAgICAgICAgICBwdXNoLmNhbGwoZmFrZS5leGNlcHRpb25zLCB0aGlzLmV4Y2VwdGlvbnNbaV0pO1xuICAgICAgICAgICAgICAgICAgICBwdXNoLmNhbGwoZmFrZS5jYWxsSWRzLCB0aGlzLmNhbGxJZHNbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNyZWF0ZUNhbGxQcm9wZXJ0aWVzLmNhbGwoZmFrZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWtlO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1hdGNoZXM6IGZ1bmN0aW9uIChhcmdzLCBzdHJpY3QpIHtcbiAgICAgICAgICAgIHZhciBtYXJncyA9IHRoaXMubWF0Y2hpbmdBZ3VtZW50cztcblxuICAgICAgICAgICAgaWYgKG1hcmdzLmxlbmd0aCA8PSBhcmdzLmxlbmd0aCAmJlxuICAgICAgICAgICAgICAgIHNpbm9uLmRlZXBFcXVhbChtYXJncywgYXJncy5zbGljZSgwLCBtYXJncy5sZW5ndGgpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhc3RyaWN0IHx8IG1hcmdzLmxlbmd0aCA9PSBhcmdzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBwcmludGY6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgIHZhciBzcHkgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVyO1xuXG4gICAgICAgICAgICByZXR1cm4gKGZvcm1hdCB8fCBcIlwiKS5yZXBsYWNlKC8lKC4pL2csIGZ1bmN0aW9uIChtYXRjaCwgc3BlY2lmeWVyKSB7XG4gICAgICAgICAgICAgICAgZm9ybWF0dGVyID0gc3B5QXBpLmZvcm1hdHRlcnNbc3BlY2lmeWVyXTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZm9ybWF0dGVyID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVyLmNhbGwobnVsbCwgc3B5LCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpc05hTihwYXJzZUludChzcGVjaWZ5ZXIsIDEwKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpbm9uLmZvcm1hdChhcmdzW3NwZWNpZnllciAtIDFdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gXCIlXCIgKyBzcGVjaWZ5ZXI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBkZWxlZ2F0ZVRvQ2FsbHMobWV0aG9kLCBtYXRjaEFueSwgYWN0dWFsLCBub3RDYWxsZWQpIHtcbiAgICAgICAgc3B5QXBpW21ldGhvZF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY2FsbGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vdENhbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm90Q2FsbGVkLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGN1cnJlbnRDYWxsO1xuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuY2FsbENvdW50OyBpIDwgbDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudENhbGwgPSB0aGlzLmdldENhbGwoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudENhbGxbYWN0dWFsIHx8IG1ldGhvZF0uYXBwbHkoY3VycmVudENhbGwsIGFyZ3VtZW50cykpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcyArPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaEFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtYXRjaGVzID09PSB0aGlzLmNhbGxDb3VudDtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJjYWxsZWRPblwiLCB0cnVlKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJhbHdheXNDYWxsZWRPblwiLCBmYWxzZSwgXCJjYWxsZWRPblwiKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJjYWxsZWRXaXRoXCIsIHRydWUpO1xuICAgIGRlbGVnYXRlVG9DYWxscyhcImNhbGxlZFdpdGhNYXRjaFwiLCB0cnVlKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJhbHdheXNDYWxsZWRXaXRoXCIsIGZhbHNlLCBcImNhbGxlZFdpdGhcIik7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiYWx3YXlzQ2FsbGVkV2l0aE1hdGNoXCIsIGZhbHNlLCBcImNhbGxlZFdpdGhNYXRjaFwiKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJjYWxsZWRXaXRoRXhhY3RseVwiLCB0cnVlKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJhbHdheXNDYWxsZWRXaXRoRXhhY3RseVwiLCBmYWxzZSwgXCJjYWxsZWRXaXRoRXhhY3RseVwiKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJuZXZlckNhbGxlZFdpdGhcIiwgZmFsc2UsIFwibm90Q2FsbGVkV2l0aFwiLFxuICAgICAgICBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9KTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJuZXZlckNhbGxlZFdpdGhNYXRjaFwiLCBmYWxzZSwgXCJub3RDYWxsZWRXaXRoTWF0Y2hcIixcbiAgICAgICAgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwidGhyZXdcIiwgdHJ1ZSk7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiYWx3YXlzVGhyZXdcIiwgZmFsc2UsIFwidGhyZXdcIik7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwicmV0dXJuZWRcIiwgdHJ1ZSk7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiYWx3YXlzUmV0dXJuZWRcIiwgZmFsc2UsIFwicmV0dXJuZWRcIik7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiY2FsbGVkV2l0aE5ld1wiLCB0cnVlKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJhbHdheXNDYWxsZWRXaXRoTmV3XCIsIGZhbHNlLCBcImNhbGxlZFdpdGhOZXdcIik7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiY2FsbEFyZ1wiLCBmYWxzZSwgXCJjYWxsQXJnV2l0aFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIiBjYW5ub3QgY2FsbCBhcmcgc2luY2UgaXQgd2FzIG5vdCB5ZXQgaW52b2tlZC5cIik7XG4gICAgfSk7XG4gICAgc3B5QXBpLmNhbGxBcmdXaXRoID0gc3B5QXBpLmNhbGxBcmc7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiY2FsbEFyZ09uXCIsIGZhbHNlLCBcImNhbGxBcmdPbldpdGhcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy50b1N0cmluZygpICsgXCIgY2Fubm90IGNhbGwgYXJnIHNpbmNlIGl0IHdhcyBub3QgeWV0IGludm9rZWQuXCIpO1xuICAgIH0pO1xuICAgIHNweUFwaS5jYWxsQXJnT25XaXRoID0gc3B5QXBpLmNhbGxBcmdPbjtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJ5aWVsZFwiLCBmYWxzZSwgXCJ5aWVsZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIiBjYW5ub3QgeWllbGQgc2luY2UgaXQgd2FzIG5vdCB5ZXQgaW52b2tlZC5cIik7XG4gICAgfSk7XG4gICAgLy8gXCJpbnZva2VDYWxsYmFja1wiIGlzIGFuIGFsaWFzIGZvciBcInlpZWxkXCIgc2luY2UgXCJ5aWVsZFwiIGlzIGludmFsaWQgaW4gc3RyaWN0IG1vZGUuXG4gICAgc3B5QXBpLmludm9rZUNhbGxiYWNrID0gc3B5QXBpLnlpZWxkO1xuICAgIGRlbGVnYXRlVG9DYWxscyhcInlpZWxkT25cIiwgZmFsc2UsIFwieWllbGRPblwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIiBjYW5ub3QgeWllbGQgc2luY2UgaXQgd2FzIG5vdCB5ZXQgaW52b2tlZC5cIik7XG4gICAgfSk7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwieWllbGRUb1wiLCBmYWxzZSwgXCJ5aWVsZFRvXCIsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy50b1N0cmluZygpICsgXCIgY2Fubm90IHlpZWxkIHRvICdcIiArIHByb3BlcnR5ICtcbiAgICAgICAgICAgIFwiJyBzaW5jZSBpdCB3YXMgbm90IHlldCBpbnZva2VkLlwiKTtcbiAgICB9KTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJ5aWVsZFRvT25cIiwgZmFsc2UsIFwieWllbGRUb09uXCIsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy50b1N0cmluZygpICsgXCIgY2Fubm90IHlpZWxkIHRvICdcIiArIHByb3BlcnR5ICtcbiAgICAgICAgICAgIFwiJyBzaW5jZSBpdCB3YXMgbm90IHlldCBpbnZva2VkLlwiKTtcbiAgICB9KTtcblxuICAgIHNweUFwaS5mb3JtYXR0ZXJzID0ge1xuICAgICAgICBcImNcIjogZnVuY3Rpb24gKHNweSkge1xuICAgICAgICAgICAgcmV0dXJuIHNpbm9uLnRpbWVzSW5Xb3JkcyhzcHkuY2FsbENvdW50KTtcbiAgICAgICAgfSxcblxuICAgICAgICBcIm5cIjogZnVuY3Rpb24gKHNweSkge1xuICAgICAgICAgICAgcmV0dXJuIHNweS50b1N0cmluZygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIFwiQ1wiOiBmdW5jdGlvbiAoc3B5KSB7XG4gICAgICAgICAgICB2YXIgY2FsbHMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBzcHkuY2FsbENvdW50OyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0cmluZ2lmaWVkQ2FsbCA9IFwiICAgIFwiICsgc3B5LmdldENhbGwoaSkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBpZiAoL1xcbi8udGVzdChjYWxsc1tpIC0gMV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZ2lmaWVkQ2FsbCA9IFwiXFxuXCIgKyBzdHJpbmdpZmllZENhbGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHB1c2guY2FsbChjYWxscywgc3RyaW5naWZpZWRDYWxsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNhbGxzLmxlbmd0aCA+IDAgPyBcIlxcblwiICsgY2FsbHMuam9pbihcIlxcblwiKSA6IFwiXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgXCJ0XCI6IGZ1bmN0aW9uIChzcHkpIHtcbiAgICAgICAgICAgIHZhciBvYmplY3RzID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gc3B5LmNhbGxDb3VudDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgICAgIHB1c2guY2FsbChvYmplY3RzLCBzaW5vbi5mb3JtYXQoc3B5LnRoaXNWYWx1ZXNbaV0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdHMuam9pbihcIiwgXCIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIFwiKlwiOiBmdW5jdGlvbiAoc3B5LCBhcmdzKSB7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXJncy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICBwdXNoLmNhbGwoZm9ybWF0dGVkLCBzaW5vbi5mb3JtYXQoYXJnc1tpXSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBzaW5vbi5leHRlbmQoc3B5LCBzcHlBcGkpO1xuXG4gICAgc3B5LnNweUNhbGwgPSBzaW5vbi5zcHlDYWxsO1xuXG4gICAgaWYgKGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gc3B5O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLnNweSA9IHNweTtcbiAgICB9XG59KHR5cGVvZiBzaW5vbiA9PSBcIm9iamVjdFwiICYmIHNpbm9uIHx8IG51bGwpKTtcbiIsIi8qKlxuICogQGRlcGVuZCAuLi9zaW5vbi5qc1xuICogQGRlcGVuZCBzcHkuanNcbiAqIEBkZXBlbmQgYmVoYXZpb3IuanNcbiAqL1xuLypqc2xpbnQgZXFlcWVxOiBmYWxzZSwgb25ldmFyOiBmYWxzZSovXG4vKmdsb2JhbCBtb2R1bGUsIHJlcXVpcmUsIHNpbm9uKi9cbi8qKlxuICogU3R1YiBmdW5jdGlvbnNcbiAqXG4gKiBAYXV0aG9yIENocmlzdGlhbiBKb2hhbnNlbiAoY2hyaXN0aWFuQGNqb2hhbnNlbi5ubylcbiAqIEBsaWNlbnNlIEJTRFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMC0yMDEzIENocmlzdGlhbiBKb2hhbnNlblxuICovXG5cInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uIChzaW5vbikge1xuICAgIHZhciBjb21tb25KU01vZHVsZSA9IHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzO1xuXG4gICAgaWYgKCFzaW5vbiAmJiBjb21tb25KU01vZHVsZSkge1xuICAgICAgICBzaW5vbiA9IHJlcXVpcmUoXCIuLi9zaW5vblwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXNpbm9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdHViKG9iamVjdCwgcHJvcGVydHksIGZ1bmMpIHtcbiAgICAgICAgaWYgKCEhZnVuYyAmJiB0eXBlb2YgZnVuYyAhPSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDdXN0b20gc3R1YiBzaG91bGQgYmUgZnVuY3Rpb25cIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd3JhcHBlcjtcblxuICAgICAgICBpZiAoZnVuYykge1xuICAgICAgICAgICAgd3JhcHBlciA9IHNpbm9uLnNweSAmJiBzaW5vbi5zcHkuY3JlYXRlID8gc2lub24uc3B5LmNyZWF0ZShmdW5jKSA6IGZ1bmM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3cmFwcGVyID0gc3R1Yi5jcmVhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb2JqZWN0ICYmIHR5cGVvZiBwcm9wZXJ0eSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmV0dXJuIHNpbm9uLnN0dWIuY3JlYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5ID09PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBvYmplY3QgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdFtwcm9wXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0dWIob2JqZWN0LCBwcm9wKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2lub24ud3JhcE1ldGhvZChvYmplY3QsIHByb3BlcnR5LCB3cmFwcGVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREZWZhdWx0QmVoYXZpb3Ioc3R1Yikge1xuICAgICAgICByZXR1cm4gc3R1Yi5kZWZhdWx0QmVoYXZpb3IgfHwgZ2V0UGFyZW50QmVoYXZpb3VyKHN0dWIpIHx8IHNpbm9uLmJlaGF2aW9yLmNyZWF0ZShzdHViKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRQYXJlbnRCZWhhdmlvdXIoc3R1Yikge1xuICAgICAgICByZXR1cm4gKHN0dWIucGFyZW50ICYmIGdldEN1cnJlbnRCZWhhdmlvcihzdHViLnBhcmVudCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEN1cnJlbnRCZWhhdmlvcihzdHViKSB7XG4gICAgICAgIHZhciBiZWhhdmlvciA9IHN0dWIuYmVoYXZpb3JzW3N0dWIuY2FsbENvdW50IC0gMV07XG4gICAgICAgIHJldHVybiBiZWhhdmlvciAmJiBiZWhhdmlvci5pc1ByZXNlbnQoKSA/IGJlaGF2aW9yIDogZ2V0RGVmYXVsdEJlaGF2aW9yKHN0dWIpO1xuICAgIH1cblxuICAgIHZhciB1dWlkID0gMDtcblxuICAgIHNpbm9uLmV4dGVuZChzdHViLCAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcHJvdG8gPSB7XG4gICAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25TdHViID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0Q3VycmVudEJlaGF2aW9yKGZ1bmN0aW9uU3R1YikuaW52b2tlKHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uU3R1Yi5pZCA9IFwic3R1YiNcIiArIHV1aWQrKztcbiAgICAgICAgICAgICAgICB2YXIgb3JpZyA9IGZ1bmN0aW9uU3R1YjtcbiAgICAgICAgICAgICAgICBmdW5jdGlvblN0dWIgPSBzaW5vbi5zcHkuY3JlYXRlKGZ1bmN0aW9uU3R1Yik7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb25TdHViLmZ1bmMgPSBvcmlnO1xuXG4gICAgICAgICAgICAgICAgc2lub24uZXh0ZW5kKGZ1bmN0aW9uU3R1Yiwgc3R1Yik7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb25TdHViLl9jcmVhdGUgPSBzaW5vbi5zdHViLmNyZWF0ZTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvblN0dWIuZGlzcGxheU5hbWUgPSBcInN0dWJcIjtcbiAgICAgICAgICAgICAgICBmdW5jdGlvblN0dWIudG9TdHJpbmcgPSBzaW5vbi5mdW5jdGlvblRvU3RyaW5nO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb25TdHViLmRlZmF1bHRCZWhhdmlvciA9IG51bGw7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb25TdHViLmJlaGF2aW9ycyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uU3R1YjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlc2V0QmVoYXZpb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaTtcblxuICAgICAgICAgICAgICAgIHRoaXMuZGVmYXVsdEJlaGF2aW9yID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLmJlaGF2aW9ycyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmV0dXJuVmFsdWU7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmV0dXJuQXJnQXQ7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5UaGlzID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mYWtlcykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5mYWtlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mYWtlc1tpXS5yZXNldEJlaGF2aW9yKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkNhbGw6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJlaGF2aW9yc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWhhdmlvcnNbaW5kZXhdID0gc2lub24uYmVoYXZpb3IuY3JlYXRlKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmJlaGF2aW9yc1tpbmRleF07XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkZpcnN0Q2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25DYWxsKDApO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25TZWNvbmRDYWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkNhbGwoMSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvblRoaXJkQ2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25DYWxsKDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAodmFyIG1ldGhvZCBpbiBzaW5vbi5iZWhhdmlvcikge1xuICAgICAgICAgICAgaWYgKHNpbm9uLmJlaGF2aW9yLmhhc093blByb3BlcnR5KG1ldGhvZCkgJiZcbiAgICAgICAgICAgICAgICAhcHJvdG8uaGFzT3duUHJvcGVydHkobWV0aG9kKSAmJlxuICAgICAgICAgICAgICAgIG1ldGhvZCAhPSAnY3JlYXRlJyAmJlxuICAgICAgICAgICAgICAgIG1ldGhvZCAhPSAnd2l0aEFyZ3MnICYmXG4gICAgICAgICAgICAgICAgbWV0aG9kICE9ICdpbnZva2UnKSB7XG4gICAgICAgICAgICAgICAgcHJvdG9bbWV0aG9kXSA9IChmdW5jdGlvbihiZWhhdmlvck1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmF1bHRCZWhhdmlvciA9IHRoaXMuZGVmYXVsdEJlaGF2aW9yIHx8IHNpbm9uLmJlaGF2aW9yLmNyZWF0ZSh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmYXVsdEJlaGF2aW9yW2JlaGF2aW9yTWV0aG9kXS5hcHBseSh0aGlzLmRlZmF1bHRCZWhhdmlvciwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0obWV0aG9kKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJvdG87XG4gICAgfSgpKSk7XG5cbiAgICBpZiAoY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBzdHViO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLnN0dWIgPSBzdHViO1xuICAgIH1cbn0odHlwZW9mIHNpbm9uID09IFwib2JqZWN0XCIgJiYgc2lub24gfHwgbnVsbCkpO1xuIiwiLyoqXG4gKiBAZGVwZW5kIC4uL3Npbm9uLmpzXG4gKiBAZGVwZW5kIHN0dWIuanNcbiAqIEBkZXBlbmQgbW9jay5qc1xuICogQGRlcGVuZCBzYW5kYm94LmpzXG4gKi9cbi8qanNsaW50IGVxZXFlcTogZmFsc2UsIG9uZXZhcjogZmFsc2UsIGZvcmluOiB0cnVlLCBwbHVzcGx1czogZmFsc2UqL1xuLypnbG9iYWwgbW9kdWxlLCByZXF1aXJlLCBzaW5vbiovXG4vKipcbiAqIFRlc3QgZnVuY3Rpb24sIHNhbmRib3hlcyBmYWtlc1xuICpcbiAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uKSB7XG4gICAgdmFyIGNvbW1vbkpTTW9kdWxlID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG5cbiAgICBpZiAoIXNpbm9uICYmIGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIHNpbm9uID0gcmVxdWlyZShcIi4uL3Npbm9uXCIpO1xuICAgIH1cblxuICAgIGlmICghc2lub24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRlc3QoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgY2FsbGJhY2s7XG5cbiAgICAgICAgaWYgKHR5cGUgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwic2lub24udGVzdCBuZWVkcyB0byB3cmFwIGEgdGVzdCBmdW5jdGlvbiwgZ290IFwiICsgdHlwZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IHNpbm9uLmdldENvbmZpZyhzaW5vbi5jb25maWcpO1xuICAgICAgICAgICAgY29uZmlnLmluamVjdEludG8gPSBjb25maWcuaW5qZWN0SW50b1RoaXMgJiYgdGhpcyB8fCBjb25maWcuaW5qZWN0SW50bztcbiAgICAgICAgICAgIHZhciBzYW5kYm94ID0gc2lub24uc2FuZGJveC5jcmVhdGUoY29uZmlnKTtcbiAgICAgICAgICAgIHZhciBleGNlcHRpb24sIHJlc3VsdDtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKS5jb25jYXQoc2FuZGJveC5hcmdzKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBleGNlcHRpb24gPSBlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4Y2VwdGlvbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHNhbmRib3gucmVzdG9yZSgpO1xuICAgICAgICAgICAgICAgIHRocm93IGV4Y2VwdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNhbmRib3gudmVyaWZ5QW5kUmVzdG9yZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRlc3QuY29uZmlnID0ge1xuICAgICAgICBpbmplY3RJbnRvVGhpczogdHJ1ZSxcbiAgICAgICAgaW5qZWN0SW50bzogbnVsbCxcbiAgICAgICAgcHJvcGVydGllczogW1wic3B5XCIsIFwic3R1YlwiLCBcIm1vY2tcIiwgXCJjbG9ja1wiLCBcInNlcnZlclwiLCBcInJlcXVlc3RzXCJdLFxuICAgICAgICB1c2VGYWtlVGltZXJzOiB0cnVlLFxuICAgICAgICB1c2VGYWtlU2VydmVyOiB0cnVlXG4gICAgfTtcblxuICAgIGlmIChjb21tb25KU01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHRlc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2lub24udGVzdCA9IHRlc3Q7XG4gICAgfVxufSh0eXBlb2Ygc2lub24gPT0gXCJvYmplY3RcIiAmJiBzaW5vbiB8fCBudWxsKSk7XG4iLCIvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqIEBkZXBlbmQgdGVzdC5qc1xuICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBlcWVxZXE6IGZhbHNlKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSwgc2lub24qL1xuLyoqXG4gKiBUZXN0IGNhc2UsIHNhbmRib3hlcyBhbGwgdGVzdCBmdW5jdGlvbnNcbiAqXG4gKiBAYXV0aG9yIENocmlzdGlhbiBKb2hhbnNlbiAoY2hyaXN0aWFuQGNqb2hhbnNlbi5ubylcbiAqIEBsaWNlbnNlIEJTRFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMC0yMDEzIENocmlzdGlhbiBKb2hhbnNlblxuICovXG5cInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uIChzaW5vbikge1xuICAgIHZhciBjb21tb25KU01vZHVsZSA9IHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzO1xuXG4gICAgaWYgKCFzaW5vbiAmJiBjb21tb25KU01vZHVsZSkge1xuICAgICAgICBzaW5vbiA9IHJlcXVpcmUoXCIuLi9zaW5vblwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXNpbm9uIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVUZXN0KHByb3BlcnR5LCBzZXRVcCwgdGVhckRvd24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChzZXRVcCkge1xuICAgICAgICAgICAgICAgIHNldFVwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBleGNlcHRpb24sIHJlc3VsdDtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBwcm9wZXJ0eS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0ZWFyRG93bikge1xuICAgICAgICAgICAgICAgIHRlYXJEb3duLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGVzdENhc2UodGVzdHMsIHByZWZpeCkge1xuICAgICAgICAvKmpzbDppZ25vcmUqL1xuICAgICAgICBpZiAoIXRlc3RzIHx8IHR5cGVvZiB0ZXN0cyAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwic2lub24udGVzdENhc2UgbmVlZHMgYW4gb2JqZWN0IHdpdGggdGVzdCBmdW5jdGlvbnNcIik7XG4gICAgICAgIH1cbiAgICAgICAgLypqc2w6ZW5kKi9cblxuICAgICAgICBwcmVmaXggPSBwcmVmaXggfHwgXCJ0ZXN0XCI7XG4gICAgICAgIHZhciByUHJlZml4ID0gbmV3IFJlZ0V4cChcIl5cIiArIHByZWZpeCk7XG4gICAgICAgIHZhciBtZXRob2RzID0ge30sIHRlc3ROYW1lLCBwcm9wZXJ0eSwgbWV0aG9kO1xuICAgICAgICB2YXIgc2V0VXAgPSB0ZXN0cy5zZXRVcDtcbiAgICAgICAgdmFyIHRlYXJEb3duID0gdGVzdHMudGVhckRvd247XG5cbiAgICAgICAgZm9yICh0ZXN0TmFtZSBpbiB0ZXN0cykge1xuICAgICAgICAgICAgaWYgKHRlc3RzLmhhc093blByb3BlcnR5KHRlc3ROYW1lKSkge1xuICAgICAgICAgICAgICAgIHByb3BlcnR5ID0gdGVzdHNbdGVzdE5hbWVdO1xuXG4gICAgICAgICAgICAgICAgaWYgKC9eKHNldFVwfHRlYXJEb3duKSQvLnRlc3QodGVzdE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHkgPT0gXCJmdW5jdGlvblwiICYmIHJQcmVmaXgudGVzdCh0ZXN0TmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0gcHJvcGVydHk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNldFVwIHx8IHRlYXJEb3duKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPSBjcmVhdGVUZXN0KHByb3BlcnR5LCBzZXRVcCwgdGVhckRvd24pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kc1t0ZXN0TmFtZV0gPSBzaW5vbi50ZXN0KG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kc1t0ZXN0TmFtZV0gPSB0ZXN0c1t0ZXN0TmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1ldGhvZHM7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gdGVzdENhc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2lub24udGVzdENhc2UgPSB0ZXN0Q2FzZTtcbiAgICB9XG59KHR5cGVvZiBzaW5vbiA9PSBcIm9iamVjdFwiICYmIHNpbm9uIHx8IG51bGwpKTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXsvKmpzbGludCBlcWVxZXE6IGZhbHNlLCBwbHVzcGx1czogZmFsc2UsIGV2aWw6IHRydWUsIG9uZXZhcjogZmFsc2UsIGJyb3dzZXI6IHRydWUsIGZvcmluOiBmYWxzZSovXG4vKmdsb2JhbCBtb2R1bGUsIHJlcXVpcmUsIHdpbmRvdyovXG4vKipcbiAqIEZha2UgdGltZXIgQVBJXG4gKiBzZXRUaW1lb3V0XG4gKiBzZXRJbnRlcnZhbFxuICogY2xlYXJUaW1lb3V0XG4gKiBjbGVhckludGVydmFsXG4gKiB0aWNrXG4gKiByZXNldFxuICogRGF0ZVxuICpcbiAqIEluc3BpcmVkIGJ5IGpzVW5pdE1vY2tUaW1lT3V0IGZyb20gSnNVbml0XG4gKlxuICogQGF1dGhvciBDaHJpc3RpYW4gSm9oYW5zZW4gKGNocmlzdGlhbkBjam9oYW5zZW4ubm8pXG4gKiBAbGljZW5zZSBCU0RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTAtMjAxMyBDaHJpc3RpYW4gSm9oYW5zZW5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbmlmICh0eXBlb2Ygc2lub24gPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciBzaW5vbiA9IHt9O1xufVxuXG4oZnVuY3Rpb24gKGdsb2JhbCkge1xuICAgIHZhciBpZCA9IDE7XG5cbiAgICBmdW5jdGlvbiBhZGRUaW1lcihhcmdzLCByZWN1cnJpbmcpIHtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGdW5jdGlvbiByZXF1aXJlcyBhdCBsZWFzdCAxIHBhcmFtZXRlclwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgbXVzdCBiZSBwcm92aWRlZCB0byB0aW1lciBjYWxsc1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0b0lkID0gaWQrKztcbiAgICAgICAgdmFyIGRlbGF5ID0gYXJnc1sxXSB8fCAwO1xuXG4gICAgICAgIGlmICghdGhpcy50aW1lb3V0cykge1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0cyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50aW1lb3V0c1t0b0lkXSA9IHtcbiAgICAgICAgICAgIGlkOiB0b0lkLFxuICAgICAgICAgICAgZnVuYzogYXJnc1swXSxcbiAgICAgICAgICAgIGNhbGxBdDogdGhpcy5ub3cgKyBkZWxheSxcbiAgICAgICAgICAgIGludm9rZUFyZ3M6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MsIDIpXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHJlY3VycmluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0c1t0b0lkXS5pbnRlcnZhbCA9IGRlbGF5O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRvSWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VUaW1lKHN0cikge1xuICAgICAgICBpZiAoIXN0cikge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3RyaW5ncyA9IHN0ci5zcGxpdChcIjpcIik7XG4gICAgICAgIHZhciBsID0gc3RyaW5ncy5sZW5ndGgsIGkgPSBsO1xuICAgICAgICB2YXIgbXMgPSAwLCBwYXJzZWQ7XG5cbiAgICAgICAgaWYgKGwgPiAzIHx8ICEvXihcXGRcXGQ6KXswLDJ9XFxkXFxkPyQvLnRlc3Qoc3RyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGljayBvbmx5IHVuZGVyc3RhbmRzIG51bWJlcnMgYW5kICdoOm06cydcIik7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBwYXJzZWQgPSBwYXJzZUludChzdHJpbmdzW2ldLCAxMCk7XG5cbiAgICAgICAgICAgIGlmIChwYXJzZWQgPj0gNjApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHRpbWUgXCIgKyBzdHIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtcyArPSBwYXJzZWQgKiBNYXRoLnBvdyg2MCwgKGwgLSBpIC0gMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1zICogMTAwMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVPYmplY3Qob2JqZWN0KSB7XG4gICAgICAgIHZhciBuZXdPYmplY3Q7XG5cbiAgICAgICAgaWYgKE9iamVjdC5jcmVhdGUpIHtcbiAgICAgICAgICAgIG5ld09iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqZWN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBGID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICBGLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgICAgICAgICAgIG5ld09iamVjdCA9IG5ldyBGKCk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdPYmplY3QuRGF0ZS5jbG9jayA9IG5ld09iamVjdDtcbiAgICAgICAgcmV0dXJuIG5ld09iamVjdDtcbiAgICB9XG5cbiAgICBzaW5vbi5jbG9jayA9IHtcbiAgICAgICAgbm93OiAwLFxuXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gY3JlYXRlKG5vdykge1xuICAgICAgICAgICAgdmFyIGNsb2NrID0gY3JlYXRlT2JqZWN0KHRoaXMpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5vdyA9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgY2xvY2subm93ID0gbm93O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoISFub3cgJiYgdHlwZW9mIG5vdyA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5vdyBzaG91bGQgYmUgbWlsbGlzZWNvbmRzIHNpbmNlIFVOSVggZXBvY2hcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjbG9jaztcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRUaW1lb3V0OiBmdW5jdGlvbiBzZXRUaW1lb3V0KGNhbGxiYWNrLCB0aW1lb3V0KSB7XG4gICAgICAgICAgICByZXR1cm4gYWRkVGltZXIuY2FsbCh0aGlzLCBhcmd1bWVudHMsIGZhbHNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhclRpbWVvdXQ6IGZ1bmN0aW9uIGNsZWFyVGltZW91dCh0aW1lcklkKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudGltZW91dHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVvdXRzID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aW1lcklkIGluIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy50aW1lb3V0c1t0aW1lcklkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzZXRJbnRlcnZhbDogZnVuY3Rpb24gc2V0SW50ZXJ2YWwoY2FsbGJhY2ssIHRpbWVvdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBhZGRUaW1lci5jYWxsKHRoaXMsIGFyZ3VtZW50cywgdHJ1ZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJJbnRlcnZhbDogZnVuY3Rpb24gY2xlYXJJbnRlcnZhbCh0aW1lcklkKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRJbW1lZGlhdGU6IGZ1bmN0aW9uIHNldEltbWVkaWF0ZShjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHBhc3NUaHJ1QXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICAgICAgICAgIHJldHVybiBhZGRUaW1lci5jYWxsKHRoaXMsIFtjYWxsYmFjaywgMF0uY29uY2F0KHBhc3NUaHJ1QXJncyksIGZhbHNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhckltbWVkaWF0ZTogZnVuY3Rpb24gY2xlYXJJbW1lZGlhdGUodGltZXJJZCkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclRpbWVvdXQodGltZXJJZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdGljazogZnVuY3Rpb24gdGljayhtcykge1xuICAgICAgICAgICAgbXMgPSB0eXBlb2YgbXMgPT0gXCJudW1iZXJcIiA/IG1zIDogcGFyc2VUaW1lKG1zKTtcbiAgICAgICAgICAgIHZhciB0aWNrRnJvbSA9IHRoaXMubm93LCB0aWNrVG8gPSB0aGlzLm5vdyArIG1zLCBwcmV2aW91cyA9IHRoaXMubm93O1xuICAgICAgICAgICAgdmFyIHRpbWVyID0gdGhpcy5maXJzdFRpbWVySW5SYW5nZSh0aWNrRnJvbSwgdGlja1RvKTtcblxuICAgICAgICAgICAgdmFyIGZpcnN0RXhjZXB0aW9uO1xuICAgICAgICAgICAgd2hpbGUgKHRpbWVyICYmIHRpY2tGcm9tIDw9IHRpY2tUbykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVvdXRzW3RpbWVyLmlkXSkge1xuICAgICAgICAgICAgICAgICAgICB0aWNrRnJvbSA9IHRoaXMubm93ID0gdGltZXIuY2FsbEF0O1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsbFRpbWVyKHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGZpcnN0RXhjZXB0aW9uID0gZmlyc3RFeGNlcHRpb24gfHwgZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRpbWVyID0gdGhpcy5maXJzdFRpbWVySW5SYW5nZShwcmV2aW91cywgdGlja1RvKTtcbiAgICAgICAgICAgICAgICBwcmV2aW91cyA9IHRpY2tGcm9tO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLm5vdyA9IHRpY2tUbztcblxuICAgICAgICAgICAgaWYgKGZpcnN0RXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgIHRocm93IGZpcnN0RXhjZXB0aW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub3c7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmlyc3RUaW1lckluUmFuZ2U6IGZ1bmN0aW9uIChmcm9tLCB0bykge1xuICAgICAgICAgICAgdmFyIHRpbWVyLCBzbWFsbGVzdCA9IG51bGwsIG9yaWdpbmFsVGltZXI7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lb3V0cy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZW91dHNbaWRdLmNhbGxBdCA8IGZyb20gfHwgdGhpcy50aW1lb3V0c1tpZF0uY2FsbEF0ID4gdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNtYWxsZXN0ID09PSBudWxsIHx8IHRoaXMudGltZW91dHNbaWRdLmNhbGxBdCA8IHNtYWxsZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFRpbWVyID0gdGhpcy50aW1lb3V0c1tpZF07XG4gICAgICAgICAgICAgICAgICAgICAgICBzbWFsbGVzdCA9IHRoaXMudGltZW91dHNbaWRdLmNhbGxBdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYzogdGhpcy50aW1lb3V0c1tpZF0uZnVuYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsQXQ6IHRoaXMudGltZW91dHNbaWRdLmNhbGxBdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbDogdGhpcy50aW1lb3V0c1tpZF0uaW50ZXJ2YWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHRoaXMudGltZW91dHNbaWRdLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9rZUFyZ3M6IHRoaXMudGltZW91dHNbaWRdLmludm9rZUFyZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aW1lciB8fCBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxUaW1lcjogZnVuY3Rpb24gKHRpbWVyKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRpbWVyLmludGVydmFsID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVvdXRzW3RpbWVyLmlkXS5jYWxsQXQgKz0gdGltZXIuaW50ZXJ2YWw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRpbWVvdXRzW3RpbWVyLmlkXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRpbWVyLmZ1bmMgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVyLmZ1bmMuYXBwbHkobnVsbCwgdGltZXIuaW52b2tlQXJncyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXZhbCh0aW1lci5mdW5jKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIHZhciBleGNlcHRpb24gPSBlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRoaXMudGltZW91dHNbdGltZXIuaWRdKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dHMgPSB7fTtcbiAgICAgICAgfSxcblxuICAgICAgICBEYXRlOiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIE5hdGl2ZURhdGUgPSBEYXRlO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBDbG9ja0RhdGUoeWVhciwgbW9udGgsIGRhdGUsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtcykge1xuICAgICAgICAgICAgICAgIC8vIERlZmVuc2l2ZSBhbmQgdmVyYm9zZSB0byBhdm9pZCBwb3RlbnRpYWwgaGFybSBpbiBwYXNzaW5nXG4gICAgICAgICAgICAgICAgLy8gZXhwbGljaXQgdW5kZWZpbmVkIHdoZW4gdXNlciBkb2VzIG5vdCBwYXNzIGFyZ3VtZW50XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoQ2xvY2tEYXRlLmNsb2NrLm5vdyk7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhcik7XG4gICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhciwgbW9udGgpO1xuICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBOYXRpdmVEYXRlKHllYXIsIG1vbnRoLCBkYXRlKTtcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgTmF0aXZlRGF0ZSh5ZWFyLCBtb250aCwgZGF0ZSwgaG91cik7XG4gICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhciwgbW9udGgsIGRhdGUsIGhvdXIsIG1pbnV0ZSk7XG4gICAgICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhciwgbW9udGgsIGRhdGUsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kKTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhciwgbW9udGgsIGRhdGUsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbWlycm9yRGF0ZVByb3BlcnRpZXMoQ2xvY2tEYXRlLCBOYXRpdmVEYXRlKTtcbiAgICAgICAgfSgpKVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBtaXJyb3JEYXRlUHJvcGVydGllcyh0YXJnZXQsIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLm5vdykge1xuICAgICAgICAgICAgdGFyZ2V0Lm5vdyA9IGZ1bmN0aW9uIG5vdygpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0LmNsb2NrLm5vdztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGFyZ2V0Lm5vdztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzb3VyY2UudG9Tb3VyY2UpIHtcbiAgICAgICAgICAgIHRhcmdldC50b1NvdXJjZSA9IGZ1bmN0aW9uIHRvU291cmNlKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2UudG9Tb3VyY2UoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGFyZ2V0LnRvU291cmNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFyZ2V0LnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlLnRvU3RyaW5nKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGFyZ2V0LnByb3RvdHlwZSA9IHNvdXJjZS5wcm90b3R5cGU7XG4gICAgICAgIHRhcmdldC5wYXJzZSA9IHNvdXJjZS5wYXJzZTtcbiAgICAgICAgdGFyZ2V0LlVUQyA9IHNvdXJjZS5VVEM7XG4gICAgICAgIHRhcmdldC5wcm90b3R5cGUudG9VVENTdHJpbmcgPSBzb3VyY2UucHJvdG90eXBlLnRvVVRDU3RyaW5nO1xuXG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICB2YXIgbWV0aG9kcyA9IFtcIkRhdGVcIiwgXCJzZXRUaW1lb3V0XCIsIFwic2V0SW50ZXJ2YWxcIixcbiAgICAgICAgICAgICAgICAgICBcImNsZWFyVGltZW91dFwiLCBcImNsZWFySW50ZXJ2YWxcIl07XG5cbiAgICBpZiAodHlwZW9mIGdsb2JhbC5zZXRJbW1lZGlhdGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgbWV0aG9kcy5wdXNoKFwic2V0SW1tZWRpYXRlXCIpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZ2xvYmFsLmNsZWFySW1tZWRpYXRlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIG1ldGhvZHMucHVzaChcImNsZWFySW1tZWRpYXRlXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc3RvcmUoKSB7XG4gICAgICAgIHZhciBtZXRob2Q7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLm1ldGhvZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBtZXRob2QgPSB0aGlzLm1ldGhvZHNbaV07XG5cbiAgICAgICAgICAgIGlmIChnbG9iYWxbbWV0aG9kXS5oYWRPd25Qcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIGdsb2JhbFttZXRob2RdID0gdGhpc1tcIl9cIiArIG1ldGhvZF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBnbG9iYWxbbWV0aG9kXTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSBleGVjdXRpb25zIHdoaWNoIHdpbGwgY29tcGxldGVseSByZW1vdmUgdGhlc2UgcHJvcHNcbiAgICAgICAgdGhpcy5tZXRob2RzID0gW107XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3R1Ykdsb2JhbChtZXRob2QsIGNsb2NrKSB7XG4gICAgICAgIGNsb2NrW21ldGhvZF0uaGFkT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZ2xvYmFsLCBtZXRob2QpO1xuICAgICAgICBjbG9ja1tcIl9cIiArIG1ldGhvZF0gPSBnbG9iYWxbbWV0aG9kXTtcblxuICAgICAgICBpZiAobWV0aG9kID09IFwiRGF0ZVwiKSB7XG4gICAgICAgICAgICB2YXIgZGF0ZSA9IG1pcnJvckRhdGVQcm9wZXJ0aWVzKGNsb2NrW21ldGhvZF0sIGdsb2JhbFttZXRob2RdKTtcbiAgICAgICAgICAgIGdsb2JhbFttZXRob2RdID0gZGF0ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbFttZXRob2RdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjbG9ja1ttZXRob2RdLmFwcGx5KGNsb2NrLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBjbG9ja1ttZXRob2RdKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNsb2NrW21ldGhvZF0uaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsW21ldGhvZF1bcHJvcF0gPSBjbG9ja1ttZXRob2RdW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGdsb2JhbFttZXRob2RdLmNsb2NrID0gY2xvY2s7XG4gICAgfVxuXG4gICAgc2lub24udXNlRmFrZVRpbWVycyA9IGZ1bmN0aW9uIHVzZUZha2VUaW1lcnMobm93KSB7XG4gICAgICAgIHZhciBjbG9jayA9IHNpbm9uLmNsb2NrLmNyZWF0ZShub3cpO1xuICAgICAgICBjbG9jay5yZXN0b3JlID0gcmVzdG9yZTtcbiAgICAgICAgY2xvY2subWV0aG9kcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBub3cgPT0gXCJudW1iZXJcIiA/IDEgOiAwKTtcblxuICAgICAgICBpZiAoY2xvY2subWV0aG9kcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNsb2NrLm1ldGhvZHMgPSBtZXRob2RzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjbG9jay5tZXRob2RzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgc3R1Ykdsb2JhbChjbG9jay5tZXRob2RzW2ldLCBjbG9jayk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2xvY2s7XG4gICAgfTtcbn0odHlwZW9mIGdsb2JhbCAhPSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBnbG9iYWwgIT09IFwiZnVuY3Rpb25cIiA/IGdsb2JhbCA6IHRoaXMpKTtcblxuc2lub24udGltZXJzID0ge1xuICAgIHNldFRpbWVvdXQ6IHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0OiBjbGVhclRpbWVvdXQsXG4gICAgc2V0SW1tZWRpYXRlOiAodHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gXCJ1bmRlZmluZWRcIiA/IHNldEltbWVkaWF0ZSA6IHVuZGVmaW5lZCksXG4gICAgY2xlYXJJbW1lZGlhdGU6ICh0eXBlb2YgY2xlYXJJbW1lZGlhdGUgIT09IFwidW5kZWZpbmVkXCIgPyBjbGVhckltbWVkaWF0ZTogdW5kZWZpbmVkKSxcbiAgICBzZXRJbnRlcnZhbDogc2V0SW50ZXJ2YWwsXG4gICAgY2xlYXJJbnRlcnZhbDogY2xlYXJJbnRlcnZhbCxcbiAgICBEYXRlOiBEYXRlXG59O1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNpbm9uO1xufVxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7KCh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCAmJiBmdW5jdGlvbiAobSkge1xuICAgIGRlZmluZShcImZvcm1hdGlvXCIsIFtcInNhbXNhbVwiXSwgbSk7XG59KSB8fCAodHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiBmdW5jdGlvbiAobSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gbShyZXF1aXJlKFwic2Ftc2FtXCIpKTtcbn0pIHx8IGZ1bmN0aW9uIChtKSB7IHRoaXMuZm9ybWF0aW8gPSBtKHRoaXMuc2Ftc2FtKTsgfVxuKShmdW5jdGlvbiAoc2Ftc2FtKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgZm9ybWF0aW8gPSB7XG4gICAgICAgIGV4Y2x1ZGVDb25zdHJ1Y3RvcnM6IFtcIk9iamVjdFwiLCAvXi4kL10sXG4gICAgICAgIHF1b3RlU3RyaW5nczogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuICAgIHZhciBzcGVjaWFsT2JqZWN0cyA9IFtdO1xuICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHNwZWNpYWxPYmplY3RzLnB1c2goeyBvYmplY3Q6IGdsb2JhbCwgdmFsdWU6IFwiW29iamVjdCBnbG9iYWxdXCIgfSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgc3BlY2lhbE9iamVjdHMucHVzaCh7XG4gICAgICAgICAgICBvYmplY3Q6IGRvY3VtZW50LFxuICAgICAgICAgICAgdmFsdWU6IFwiW29iamVjdCBIVE1MRG9jdW1lbnRdXCJcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHNwZWNpYWxPYmplY3RzLnB1c2goeyBvYmplY3Q6IHdpbmRvdywgdmFsdWU6IFwiW29iamVjdCBXaW5kb3ddXCIgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZ1bmMpIHtcbiAgICAgICAgaWYgKCFmdW5jKSB7IHJldHVybiBcIlwiOyB9XG4gICAgICAgIGlmIChmdW5jLmRpc3BsYXlOYW1lKSB7IHJldHVybiBmdW5jLmRpc3BsYXlOYW1lOyB9XG4gICAgICAgIGlmIChmdW5jLm5hbWUpIHsgcmV0dXJuIGZ1bmMubmFtZTsgfVxuICAgICAgICB2YXIgbWF0Y2hlcyA9IGZ1bmMudG9TdHJpbmcoKS5tYXRjaCgvZnVuY3Rpb25cXHMrKFteXFwoXSspL20pO1xuICAgICAgICByZXR1cm4gKG1hdGNoZXMgJiYgbWF0Y2hlc1sxXSkgfHwgXCJcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25zdHJ1Y3Rvck5hbWUoZiwgb2JqZWN0KSB7XG4gICAgICAgIHZhciBuYW1lID0gZnVuY3Rpb25OYW1lKG9iamVjdCAmJiBvYmplY3QuY29uc3RydWN0b3IpO1xuICAgICAgICB2YXIgZXhjbHVkZXMgPSBmLmV4Y2x1ZGVDb25zdHJ1Y3RvcnMgfHxcbiAgICAgICAgICAgICAgICBmb3JtYXRpby5leGNsdWRlQ29uc3RydWN0b3JzIHx8IFtdO1xuXG4gICAgICAgIHZhciBpLCBsO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gZXhjbHVkZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4Y2x1ZGVzW2ldID09PSBcInN0cmluZ1wiICYmIGV4Y2x1ZGVzW2ldID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV4Y2x1ZGVzW2ldLnRlc3QgJiYgZXhjbHVkZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNDaXJjdWxhcihvYmplY3QsIG9iamVjdHMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QgIT09IFwib2JqZWN0XCIpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgIHZhciBpLCBsO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gb2JqZWN0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3RzW2ldID09PSBvYmplY3QpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXNjaWkoZiwgb2JqZWN0LCBwcm9jZXNzZWQsIGluZGVudCkge1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdmFyIHFzID0gZi5xdW90ZVN0cmluZ3M7XG4gICAgICAgICAgICB2YXIgcXVvdGUgPSB0eXBlb2YgcXMgIT09IFwiYm9vbGVhblwiIHx8IHFzO1xuICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3NlZCB8fCBxdW90ZSA/ICdcIicgKyBvYmplY3QgKyAnXCInIDogb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QgPT09IFwiZnVuY3Rpb25cIiAmJiAhKG9iamVjdCBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICAgICAgICAgIHJldHVybiBhc2NpaS5mdW5jKG9iamVjdCk7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9jZXNzZWQgPSBwcm9jZXNzZWQgfHwgW107XG5cbiAgICAgICAgaWYgKGlzQ2lyY3VsYXIob2JqZWN0LCBwcm9jZXNzZWQpKSB7IHJldHVybiBcIltDaXJjdWxhcl1cIjsgfVxuXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gYXNjaWkuYXJyYXkuY2FsbChmLCBvYmplY3QsIHByb2Nlc3NlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9iamVjdCkgeyByZXR1cm4gU3RyaW5nKCgxL29iamVjdCkgPT09IC1JbmZpbml0eSA/IFwiLTBcIiA6IG9iamVjdCk7IH1cbiAgICAgICAgaWYgKHNhbXNhbS5pc0VsZW1lbnQob2JqZWN0KSkgeyByZXR1cm4gYXNjaWkuZWxlbWVudChvYmplY3QpOyB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QudG9TdHJpbmcgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICAgICAgIG9iamVjdC50b1N0cmluZyAhPT0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdC50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGksIGw7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBzcGVjaWFsT2JqZWN0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgPT09IHNwZWNpYWxPYmplY3RzW2ldLm9iamVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzcGVjaWFsT2JqZWN0c1tpXS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhc2NpaS5vYmplY3QuY2FsbChmLCBvYmplY3QsIHByb2Nlc3NlZCwgaW5kZW50KTtcbiAgICB9XG5cbiAgICBhc2NpaS5mdW5jID0gZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgcmV0dXJuIFwiZnVuY3Rpb24gXCIgKyBmdW5jdGlvbk5hbWUoZnVuYykgKyBcIigpIHt9XCI7XG4gICAgfTtcblxuICAgIGFzY2lpLmFycmF5ID0gZnVuY3Rpb24gKGFycmF5LCBwcm9jZXNzZWQpIHtcbiAgICAgICAgcHJvY2Vzc2VkID0gcHJvY2Vzc2VkIHx8IFtdO1xuICAgICAgICBwcm9jZXNzZWQucHVzaChhcnJheSk7XG4gICAgICAgIHZhciBpLCBsLCBwaWVjZXMgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IGFycmF5Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgcGllY2VzLnB1c2goYXNjaWkodGhpcywgYXJyYXlbaV0sIHByb2Nlc3NlZCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIltcIiArIHBpZWNlcy5qb2luKFwiLCBcIikgKyBcIl1cIjtcbiAgICB9O1xuXG4gICAgYXNjaWkub2JqZWN0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvY2Vzc2VkLCBpbmRlbnQpIHtcbiAgICAgICAgcHJvY2Vzc2VkID0gcHJvY2Vzc2VkIHx8IFtdO1xuICAgICAgICBwcm9jZXNzZWQucHVzaChvYmplY3QpO1xuICAgICAgICBpbmRlbnQgPSBpbmRlbnQgfHwgMDtcbiAgICAgICAgdmFyIHBpZWNlcyA9IFtdLCBwcm9wZXJ0aWVzID0gc2Ftc2FtLmtleXMob2JqZWN0KS5zb3J0KCk7XG4gICAgICAgIHZhciBsZW5ndGggPSAzO1xuICAgICAgICB2YXIgcHJvcCwgc3RyLCBvYmosIGksIGw7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbCA9IHByb3BlcnRpZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBwcm9wID0gcHJvcGVydGllc1tpXTtcbiAgICAgICAgICAgIG9iaiA9IG9iamVjdFtwcm9wXTtcblxuICAgICAgICAgICAgaWYgKGlzQ2lyY3VsYXIob2JqLCBwcm9jZXNzZWQpKSB7XG4gICAgICAgICAgICAgICAgc3RyID0gXCJbQ2lyY3VsYXJdXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0ciA9IGFzY2lpKHRoaXMsIG9iaiwgcHJvY2Vzc2VkLCBpbmRlbnQgKyAyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RyID0gKC9cXHMvLnRlc3QocHJvcCkgPyAnXCInICsgcHJvcCArICdcIicgOiBwcm9wKSArIFwiOiBcIiArIHN0cjtcbiAgICAgICAgICAgIGxlbmd0aCArPSBzdHIubGVuZ3RoO1xuICAgICAgICAgICAgcGllY2VzLnB1c2goc3RyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb25zID0gY29uc3RydWN0b3JOYW1lKHRoaXMsIG9iamVjdCk7XG4gICAgICAgIHZhciBwcmVmaXggPSBjb25zID8gXCJbXCIgKyBjb25zICsgXCJdIFwiIDogXCJcIjtcbiAgICAgICAgdmFyIGlzID0gXCJcIjtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IGluZGVudDsgaSA8IGw7ICsraSkgeyBpcyArPSBcIiBcIjsgfVxuXG4gICAgICAgIGlmIChsZW5ndGggKyBpbmRlbnQgPiA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIHByZWZpeCArIFwie1xcbiAgXCIgKyBpcyArIHBpZWNlcy5qb2luKFwiLFxcbiAgXCIgKyBpcykgKyBcIlxcblwiICtcbiAgICAgICAgICAgICAgICBpcyArIFwifVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmVmaXggKyBcInsgXCIgKyBwaWVjZXMuam9pbihcIiwgXCIpICsgXCIgfVwiO1xuICAgIH07XG5cbiAgICBhc2NpaS5lbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHRhZ05hbWUgPSBlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgdmFyIGF0dHJzID0gZWxlbWVudC5hdHRyaWJ1dGVzLCBhdHRyLCBwYWlycyA9IFtdLCBhdHRyTmFtZSwgaSwgbCwgdmFsO1xuXG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIGF0dHIgPSBhdHRycy5pdGVtKGkpO1xuICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkucmVwbGFjZShcImh0bWw6XCIsIFwiXCIpO1xuICAgICAgICAgICAgdmFsID0gYXR0ci5ub2RlVmFsdWU7XG4gICAgICAgICAgICBpZiAoYXR0ck5hbWUgIT09IFwiY29udGVudGVkaXRhYmxlXCIgfHwgdmFsICE9PSBcImluaGVyaXRcIikge1xuICAgICAgICAgICAgICAgIGlmICghIXZhbCkgeyBwYWlycy5wdXNoKGF0dHJOYW1lICsgXCI9XFxcIlwiICsgdmFsICsgXCJcXFwiXCIpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZm9ybWF0dGVkID0gXCI8XCIgKyB0YWdOYW1lICsgKHBhaXJzLmxlbmd0aCA+IDAgPyBcIiBcIiA6IFwiXCIpO1xuICAgICAgICB2YXIgY29udGVudCA9IGVsZW1lbnQuaW5uZXJIVE1MO1xuXG4gICAgICAgIGlmIChjb250ZW50Lmxlbmd0aCA+IDIwKSB7XG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5zdWJzdHIoMCwgMjApICsgXCJbLi4uXVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlcyA9IGZvcm1hdHRlZCArIHBhaXJzLmpvaW4oXCIgXCIpICsgXCI+XCIgKyBjb250ZW50ICtcbiAgICAgICAgICAgICAgICBcIjwvXCIgKyB0YWdOYW1lICsgXCI+XCI7XG5cbiAgICAgICAgcmV0dXJuIHJlcy5yZXBsYWNlKC8gY29udGVudEVkaXRhYmxlPVwiaW5oZXJpdFwiLywgXCJcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIEZvcm1hdGlvKG9wdGlvbnMpIHtcbiAgICAgICAgZm9yICh2YXIgb3B0IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHRoaXNbb3B0XSA9IG9wdGlvbnNbb3B0XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEZvcm1hdGlvLnByb3RvdHlwZSA9IHtcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBmdW5jdGlvbk5hbWUsXG5cbiAgICAgICAgY29uZmlndXJlOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGb3JtYXRpbyhvcHRpb25zKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjb25zdHJ1Y3Rvck5hbWU6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgICAgIHJldHVybiBjb25zdHJ1Y3Rvck5hbWUodGhpcywgb2JqZWN0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhc2NpaTogZnVuY3Rpb24gKG9iamVjdCwgcHJvY2Vzc2VkLCBpbmRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBhc2NpaSh0aGlzLCBvYmplY3QsIHByb2Nlc3NlZCwgaW5kZW50KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gRm9ybWF0aW8ucHJvdG90eXBlO1xufSk7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIigodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQgJiYgZnVuY3Rpb24gKG0pIHsgZGVmaW5lKFwic2Ftc2FtXCIsIG0pOyB9KSB8fFxuICh0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiICYmXG4gICAgICBmdW5jdGlvbiAobSkgeyBtb2R1bGUuZXhwb3J0cyA9IG0oKTsgfSkgfHwgLy8gTm9kZVxuIGZ1bmN0aW9uIChtKSB7IHRoaXMuc2Ftc2FtID0gbSgpOyB9IC8vIEJyb3dzZXIgZ2xvYmFsc1xuKShmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG8gPSBPYmplY3QucHJvdG90eXBlO1xuICAgIHZhciBkaXYgPSB0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIgJiYgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblxuICAgIGZ1bmN0aW9uIGlzTmFOKHZhbHVlKSB7XG4gICAgICAgIC8vIFVubGlrZSBnbG9iYWwgaXNOYU4sIHRoaXMgYXZvaWRzIHR5cGUgY29lcmNpb25cbiAgICAgICAgLy8gdHlwZW9mIGNoZWNrIGF2b2lkcyBJRSBob3N0IG9iamVjdCBpc3N1ZXMsIGhhdCB0aXAgdG9cbiAgICAgICAgLy8gbG9kYXNoXG4gICAgICAgIHZhciB2YWwgPSB2YWx1ZTsgLy8gSnNMaW50IHRoaW5rcyB2YWx1ZSAhPT0gdmFsdWUgaXMgXCJ3ZWlyZFwiXG4gICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgdmFsdWUgIT09IHZhbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDbGFzcyh2YWx1ZSkge1xuICAgICAgICAvLyBSZXR1cm5zIHRoZSBpbnRlcm5hbCBbW0NsYXNzXV0gYnkgY2FsbGluZyBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG4gICAgICAgIC8vIHdpdGggdGhlIHByb3ZpZGVkIHZhbHVlIGFzIHRoaXMuIFJldHVybiB2YWx1ZSBpcyBhIHN0cmluZywgbmFtaW5nIHRoZVxuICAgICAgICAvLyBpbnRlcm5hbCBjbGFzcywgZS5nLiBcIkFycmF5XCJcbiAgICAgICAgcmV0dXJuIG8udG9TdHJpbmcuY2FsbCh2YWx1ZSkuc3BsaXQoL1sgXFxdXS8pWzFdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHNhbXNhbS5pc0FyZ3VtZW50c1xuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqZWN0XG4gICAgICpcbiAgICAgKiBSZXR1cm5zIGBgdHJ1ZWBgIGlmIGBgb2JqZWN0YGAgaXMgYW4gYGBhcmd1bWVudHNgYCBvYmplY3QsXG4gICAgICogYGBmYWxzZWBgIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0FyZ3VtZW50cyhvYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QgIT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIG9iamVjdC5sZW5ndGggIT09IFwibnVtYmVyXCIgfHxcbiAgICAgICAgICAgICAgICBnZXRDbGFzcyhvYmplY3QpID09PSBcIkFycmF5XCIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5jYWxsZWUgPT0gXCJmdW5jdGlvblwiKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBvYmplY3Rbb2JqZWN0Lmxlbmd0aF0gPSA2O1xuICAgICAgICAgICAgZGVsZXRlIG9iamVjdFtvYmplY3QubGVuZ3RoXTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHNhbXNhbS5pc0VsZW1lbnRcbiAgICAgKiBAcGFyYW0gT2JqZWN0IG9iamVjdFxuICAgICAqXG4gICAgICogUmV0dXJucyBgYHRydWVgYCBpZiBgYG9iamVjdGBgIGlzIGEgRE9NIGVsZW1lbnQgbm9kZS4gVW5saWtlXG4gICAgICogVW5kZXJzY29yZS5qcy9sb2Rhc2gsIHRoaXMgZnVuY3Rpb24gd2lsbCByZXR1cm4gYGBmYWxzZWBgIGlmIGBgb2JqZWN0YGBcbiAgICAgKiBpcyBhbiAqZWxlbWVudC1saWtlKiBvYmplY3QsIGkuZS4gYSByZWd1bGFyIG9iamVjdCB3aXRoIGEgYGBub2RlVHlwZWBgXG4gICAgICogcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgdmFsdWUgYGAxYGAuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNFbGVtZW50KG9iamVjdCkge1xuICAgICAgICBpZiAoIW9iamVjdCB8fCBvYmplY3Qubm9kZVR5cGUgIT09IDEgfHwgIWRpdikgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG9iamVjdC5hcHBlbmRDaGlsZChkaXYpO1xuICAgICAgICAgICAgb2JqZWN0LnJlbW92ZUNoaWxkKGRpdik7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBzYW1zYW0ua2V5c1xuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqZWN0XG4gICAgICpcbiAgICAgKiBSZXR1cm4gYW4gYXJyYXkgb2Ygb3duIHByb3BlcnR5IG5hbWVzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG4gICAgICAgIHZhciBrcyA9IFtdLCBwcm9wO1xuICAgICAgICBmb3IgKHByb3AgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAoby5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcCkpIHsga3MucHVzaChwcm9wKTsgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBzYW1zYW0uaXNEYXRlXG4gICAgICogQHBhcmFtIE9iamVjdCB2YWx1ZVxuICAgICAqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBvYmplY3QgaXMgYSBgYERhdGVgYCwgb3IgKmRhdGUtbGlrZSouIER1Y2sgdHlwaW5nXG4gICAgICogb2YgZGF0ZSBvYmplY3RzIHdvcmsgYnkgY2hlY2tpbmcgdGhhdCB0aGUgb2JqZWN0IGhhcyBhIGBgZ2V0VGltZWBgXG4gICAgICogZnVuY3Rpb24gd2hvc2UgcmV0dXJuIHZhbHVlIGVxdWFscyB0aGUgcmV0dXJuIHZhbHVlIGZyb20gdGhlIG9iamVjdCdzXG4gICAgICogYGB2YWx1ZU9mYGAuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNEYXRlKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUuZ2V0VGltZSA9PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgIHZhbHVlLmdldFRpbWUoKSA9PSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgc2Ftc2FtLmlzTmVnWmVyb1xuICAgICAqIEBwYXJhbSBPYmplY3QgdmFsdWVcbiAgICAgKlxuICAgICAqIFJldHVybnMgYGB0cnVlYGAgaWYgYGB2YWx1ZWBgIGlzIGBgLTBgYC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc05lZ1plcm8odmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA9PT0gLUluZmluaXR5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHNhbXNhbS5lcXVhbFxuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqMVxuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqMlxuICAgICAqXG4gICAgICogUmV0dXJucyBgYHRydWVgYCBpZiB0d28gb2JqZWN0cyBhcmUgc3RyaWN0bHkgZXF1YWwuIENvbXBhcmVkIHRvXG4gICAgICogYGA9PT1gYCB0aGVyZSBhcmUgdHdvIGV4Y2VwdGlvbnM6XG4gICAgICpcbiAgICAgKiAgIC0gTmFOIGlzIGNvbnNpZGVyZWQgZXF1YWwgdG8gTmFOXG4gICAgICogICAtIC0wIGFuZCArMCBhcmUgbm90IGNvbnNpZGVyZWQgZXF1YWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpZGVudGljYWwob2JqMSwgb2JqMikge1xuICAgICAgICBpZiAob2JqMSA9PT0gb2JqMiB8fCAoaXNOYU4ob2JqMSkgJiYgaXNOYU4ob2JqMikpKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqMSAhPT0gMCB8fCBpc05lZ1plcm8ob2JqMSkgPT09IGlzTmVnWmVybyhvYmoyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgc2Ftc2FtLmRlZXBFcXVhbFxuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqMVxuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqMlxuICAgICAqXG4gICAgICogRGVlcCBlcXVhbCBjb21wYXJpc29uLiBUd28gdmFsdWVzIGFyZSBcImRlZXAgZXF1YWxcIiBpZjpcbiAgICAgKlxuICAgICAqICAgLSBUaGV5IGFyZSBlcXVhbCwgYWNjb3JkaW5nIHRvIHNhbXNhbS5pZGVudGljYWxcbiAgICAgKiAgIC0gVGhleSBhcmUgYm90aCBkYXRlIG9iamVjdHMgcmVwcmVzZW50aW5nIHRoZSBzYW1lIHRpbWVcbiAgICAgKiAgIC0gVGhleSBhcmUgYm90aCBhcnJheXMgY29udGFpbmluZyBlbGVtZW50cyB0aGF0IGFyZSBhbGwgZGVlcEVxdWFsXG4gICAgICogICAtIFRoZXkgYXJlIG9iamVjdHMgd2l0aCB0aGUgc2FtZSBzZXQgb2YgcHJvcGVydGllcywgYW5kIGVhY2ggcHJvcGVydHlcbiAgICAgKiAgICAgaW4gYGBvYmoxYGAgaXMgZGVlcEVxdWFsIHRvIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnR5IGluIGBgb2JqMmBgXG4gICAgICpcbiAgICAgKiBTdXBwb3J0cyBjeWNsaWMgb2JqZWN0cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkZWVwRXF1YWxDeWNsaWMob2JqMSwgb2JqMikge1xuXG4gICAgICAgIC8vIHVzZWQgZm9yIGN5Y2xpYyBjb21wYXJpc29uXG4gICAgICAgIC8vIGNvbnRhaW4gYWxyZWFkeSB2aXNpdGVkIG9iamVjdHNcbiAgICAgICAgdmFyIG9iamVjdHMxID0gW10sXG4gICAgICAgICAgICBvYmplY3RzMiA9IFtdLFxuICAgICAgICAvLyBjb250YWluIHBhdGhlcyAocG9zaXRpb24gaW4gdGhlIG9iamVjdCBzdHJ1Y3R1cmUpXG4gICAgICAgIC8vIG9mIHRoZSBhbHJlYWR5IHZpc2l0ZWQgb2JqZWN0c1xuICAgICAgICAvLyBpbmRleGVzIHNhbWUgYXMgaW4gb2JqZWN0cyBhcnJheXNcbiAgICAgICAgICAgIHBhdGhzMSA9IFtdLFxuICAgICAgICAgICAgcGF0aHMyID0gW10sXG4gICAgICAgIC8vIGNvbnRhaW5zIGNvbWJpbmF0aW9ucyBvZiBhbHJlYWR5IGNvbXBhcmVkIG9iamVjdHNcbiAgICAgICAgLy8gaW4gdGhlIG1hbm5lcjogeyBcIiQxWydyZWYnXSQyWydyZWYnXVwiOiB0cnVlIH1cbiAgICAgICAgICAgIGNvbXBhcmVkID0ge307XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHVzZWQgdG8gY2hlY2ssIGlmIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGlzIGFuIG9iamVjdFxuICAgICAgICAgKiAoY3ljbGljIGxvZ2ljIGlzIG9ubHkgbmVlZGVkIGZvciBvYmplY3RzKVxuICAgICAgICAgKiBvbmx5IG5lZWRlZCBmb3IgY3ljbGljIGxvZ2ljXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgICAgICAhKHZhbHVlIGluc3RhbmNlb2YgQm9vbGVhbikgJiZcbiAgICAgICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpICAgICYmXG4gICAgICAgICAgICAgICAgICAgICEodmFsdWUgaW5zdGFuY2VvZiBOdW1iZXIpICAmJlxuICAgICAgICAgICAgICAgICAgICAhKHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSAgJiZcbiAgICAgICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZykpIHtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogcmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGdpdmVuIG9iamVjdCBpbiB0aGVcbiAgICAgICAgICogZ2l2ZW4gb2JqZWN0cyBhcnJheSwgLTEgaWYgbm90IGNvbnRhaW5lZFxuICAgICAgICAgKiBvbmx5IG5lZWRlZCBmb3IgY3ljbGljIGxvZ2ljXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBnZXRJbmRleChvYmplY3RzLCBvYmopIHtcblxuICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3RzW2ldID09PSBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkb2VzIHRoZSByZWN1cnNpb24gZm9yIHRoZSBkZWVwIGVxdWFsIGNoZWNrXG4gICAgICAgIHJldHVybiAoZnVuY3Rpb24gZGVlcEVxdWFsKG9iajEsIG9iajIsIHBhdGgxLCBwYXRoMikge1xuICAgICAgICAgICAgdmFyIHR5cGUxID0gdHlwZW9mIG9iajE7XG4gICAgICAgICAgICB2YXIgdHlwZTIgPSB0eXBlb2Ygb2JqMjtcblxuICAgICAgICAgICAgLy8gPT0gbnVsbCBhbHNvIG1hdGNoZXMgdW5kZWZpbmVkXG4gICAgICAgICAgICBpZiAob2JqMSA9PT0gb2JqMiB8fFxuICAgICAgICAgICAgICAgICAgICBpc05hTihvYmoxKSB8fCBpc05hTihvYmoyKSB8fFxuICAgICAgICAgICAgICAgICAgICBvYmoxID09IG51bGwgfHwgb2JqMiA9PSBudWxsIHx8XG4gICAgICAgICAgICAgICAgICAgIHR5cGUxICE9PSBcIm9iamVjdFwiIHx8IHR5cGUyICE9PSBcIm9iamVjdFwiKSB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaWRlbnRpY2FsKG9iajEsIG9iajIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFbGVtZW50cyBhcmUgb25seSBlcXVhbCBpZiBpZGVudGljYWwoZXhwZWN0ZWQsIGFjdHVhbClcbiAgICAgICAgICAgIGlmIChpc0VsZW1lbnQob2JqMSkgfHwgaXNFbGVtZW50KG9iajIpKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgICB2YXIgaXNEYXRlMSA9IGlzRGF0ZShvYmoxKSwgaXNEYXRlMiA9IGlzRGF0ZShvYmoyKTtcbiAgICAgICAgICAgIGlmIChpc0RhdGUxIHx8IGlzRGF0ZTIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGF0ZTEgfHwgIWlzRGF0ZTIgfHwgb2JqMS5nZXRUaW1lKCkgIT09IG9iajIuZ2V0VGltZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvYmoxIGluc3RhbmNlb2YgUmVnRXhwICYmIG9iajIgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqMS50b1N0cmluZygpICE9PSBvYmoyLnRvU3RyaW5nKCkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBjbGFzczEgPSBnZXRDbGFzcyhvYmoxKTtcbiAgICAgICAgICAgIHZhciBjbGFzczIgPSBnZXRDbGFzcyhvYmoyKTtcbiAgICAgICAgICAgIHZhciBrZXlzMSA9IGtleXMob2JqMSk7XG4gICAgICAgICAgICB2YXIga2V5czIgPSBrZXlzKG9iajIpO1xuXG4gICAgICAgICAgICBpZiAoaXNBcmd1bWVudHMob2JqMSkgfHwgaXNBcmd1bWVudHMob2JqMikpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqMS5sZW5ndGggIT09IG9iajIubGVuZ3RoKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZTEgIT09IHR5cGUyIHx8IGNsYXNzMSAhPT0gY2xhc3MyIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzMS5sZW5ndGggIT09IGtleXMyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIga2V5LCBpLCBsLFxuICAgICAgICAgICAgICAgIC8vIGZvbGxvd2luZyB2YXJzIGFyZSB1c2VkIGZvciB0aGUgY3ljbGljIGxvZ2ljXG4gICAgICAgICAgICAgICAgdmFsdWUxLCB2YWx1ZTIsXG4gICAgICAgICAgICAgICAgaXNPYmplY3QxLCBpc09iamVjdDIsXG4gICAgICAgICAgICAgICAgaW5kZXgxLCBpbmRleDIsXG4gICAgICAgICAgICAgICAgbmV3UGF0aDEsIG5ld1BhdGgyO1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBsID0ga2V5czEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAga2V5ID0ga2V5czFbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFvLmhhc093blByb3BlcnR5LmNhbGwob2JqMiwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU3RhcnQgb2YgdGhlIGN5Y2xpYyBsb2dpY1xuXG4gICAgICAgICAgICAgICAgdmFsdWUxID0gb2JqMVtrZXldO1xuICAgICAgICAgICAgICAgIHZhbHVlMiA9IG9iajJba2V5XTtcblxuICAgICAgICAgICAgICAgIGlzT2JqZWN0MSA9IGlzT2JqZWN0KHZhbHVlMSk7XG4gICAgICAgICAgICAgICAgaXNPYmplY3QyID0gaXNPYmplY3QodmFsdWUyKTtcblxuICAgICAgICAgICAgICAgIC8vIGRldGVybWluZSwgaWYgdGhlIG9iamVjdHMgd2VyZSBhbHJlYWR5IHZpc2l0ZWRcbiAgICAgICAgICAgICAgICAvLyAoaXQncyBmYXN0ZXIgdG8gY2hlY2sgZm9yIGlzT2JqZWN0IGZpcnN0LCB0aGFuIHRvXG4gICAgICAgICAgICAgICAgLy8gZ2V0IC0xIGZyb20gZ2V0SW5kZXggZm9yIG5vbiBvYmplY3RzKVxuICAgICAgICAgICAgICAgIGluZGV4MSA9IGlzT2JqZWN0MSA/IGdldEluZGV4KG9iamVjdHMxLCB2YWx1ZTEpIDogLTE7XG4gICAgICAgICAgICAgICAgaW5kZXgyID0gaXNPYmplY3QyID8gZ2V0SW5kZXgob2JqZWN0czIsIHZhbHVlMikgOiAtMTtcblxuICAgICAgICAgICAgICAgIC8vIGRldGVybWluZSB0aGUgbmV3IHBhdGhlcyBvZiB0aGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIC8vIC0gZm9yIG5vbiBjeWNsaWMgb2JqZWN0cyB0aGUgY3VycmVudCBwYXRoIHdpbGwgYmUgZXh0ZW5kZWRcbiAgICAgICAgICAgICAgICAvLyAgIGJ5IGN1cnJlbnQgcHJvcGVydHkgbmFtZVxuICAgICAgICAgICAgICAgIC8vIC0gZm9yIGN5Y2xpYyBvYmplY3RzIHRoZSBzdG9yZWQgcGF0aCBpcyB0YWtlblxuICAgICAgICAgICAgICAgIG5ld1BhdGgxID0gaW5kZXgxICE9PSAtMVxuICAgICAgICAgICAgICAgICAgICA/IHBhdGhzMVtpbmRleDFdXG4gICAgICAgICAgICAgICAgICAgIDogcGF0aDEgKyAnWycgKyBKU09OLnN0cmluZ2lmeShrZXkpICsgJ10nO1xuICAgICAgICAgICAgICAgIG5ld1BhdGgyID0gaW5kZXgyICE9PSAtMVxuICAgICAgICAgICAgICAgICAgICA/IHBhdGhzMltpbmRleDJdXG4gICAgICAgICAgICAgICAgICAgIDogcGF0aDIgKyAnWycgKyBKU09OLnN0cmluZ2lmeShrZXkpICsgJ10nO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RvcCByZWN1cnNpb24gaWYgY3VycmVudCBvYmplY3RzIGFyZSBhbHJlYWR5IGNvbXBhcmVkXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBhcmVkW25ld1BhdGgxICsgbmV3UGF0aDJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIHRoZSBjdXJyZW50IG9iamVjdHMgYW5kIHRoZWlyIHBhdGhlc1xuICAgICAgICAgICAgICAgIGlmIChpbmRleDEgPT09IC0xICYmIGlzT2JqZWN0MSkge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RzMS5wdXNoKHZhbHVlMSk7XG4gICAgICAgICAgICAgICAgICAgIHBhdGhzMS5wdXNoKG5ld1BhdGgxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4MiA9PT0gLTEgJiYgaXNPYmplY3QyKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdHMyLnB1c2godmFsdWUyKTtcbiAgICAgICAgICAgICAgICAgICAgcGF0aHMyLnB1c2gobmV3UGF0aDIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIHRoYXQgdGhlIGN1cnJlbnQgb2JqZWN0cyBhcmUgYWxyZWFkeSBjb21wYXJlZFxuICAgICAgICAgICAgICAgIGlmIChpc09iamVjdDEgJiYgaXNPYmplY3QyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBhcmVkW25ld1BhdGgxICsgbmV3UGF0aDJdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBFbmQgb2YgY3ljbGljIGxvZ2ljXG5cbiAgICAgICAgICAgICAgICAvLyBuZWl0aGVyIHZhbHVlMSBub3IgdmFsdWUyIGlzIGEgY3ljbGVcbiAgICAgICAgICAgICAgICAvLyBjb250aW51ZSB3aXRoIG5leHQgbGV2ZWxcbiAgICAgICAgICAgICAgICBpZiAoIWRlZXBFcXVhbCh2YWx1ZTEsIHZhbHVlMiwgbmV3UGF0aDEsIG5ld1BhdGgyKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICB9KG9iajEsIG9iajIsICckMScsICckMicpKTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2g7XG5cbiAgICBmdW5jdGlvbiBhcnJheUNvbnRhaW5zKGFycmF5LCBzdWJzZXQpIHtcbiAgICAgICAgaWYgKHN1YnNldC5sZW5ndGggPT09IDApIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgdmFyIGksIGwsIGosIGs7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaChhcnJheVtpXSwgc3Vic2V0WzBdKSkge1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDAsIGsgPSBzdWJzZXQubGVuZ3RoOyBqIDwgazsgKytqKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2goYXJyYXlbaSArIGpdLCBzdWJzZXRbal0pKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgc2Ftc2FtLm1hdGNoXG4gICAgICogQHBhcmFtIE9iamVjdCBvYmplY3RcbiAgICAgKiBAcGFyYW0gT2JqZWN0IG1hdGNoZXJcbiAgICAgKlxuICAgICAqIENvbXBhcmUgYXJiaXRyYXJ5IHZhbHVlIGBgb2JqZWN0YGAgd2l0aCBtYXRjaGVyLlxuICAgICAqL1xuICAgIG1hdGNoID0gZnVuY3Rpb24gbWF0Y2gob2JqZWN0LCBtYXRjaGVyKSB7XG4gICAgICAgIGlmIChtYXRjaGVyICYmIHR5cGVvZiBtYXRjaGVyLnRlc3QgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoZXIudGVzdChvYmplY3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaGVyKG9iamVjdCkgPT09IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIG1hdGNoZXIgPSBtYXRjaGVyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgbm90TnVsbCA9IHR5cGVvZiBvYmplY3QgPT09IFwic3RyaW5nXCIgfHwgISFvYmplY3Q7XG4gICAgICAgICAgICByZXR1cm4gbm90TnVsbCAmJlxuICAgICAgICAgICAgICAgIChTdHJpbmcob2JqZWN0KSkudG9Mb3dlckNhc2UoKS5pbmRleE9mKG1hdGNoZXIpID49IDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaGVyID09PSBvYmplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hlciA9PT0gb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGdldENsYXNzKG9iamVjdCkgPT09IFwiQXJyYXlcIiAmJiBnZXRDbGFzcyhtYXRjaGVyKSA9PT0gXCJBcnJheVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyYXlDb250YWlucyhvYmplY3QsIG1hdGNoZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoZXIgJiYgdHlwZW9mIG1hdGNoZXIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHZhciBwcm9wO1xuICAgICAgICAgICAgZm9yIChwcm9wIGluIG1hdGNoZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKG9iamVjdFtwcm9wXSwgbWF0Y2hlcltwcm9wXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWF0Y2hlciB3YXMgbm90IGEgc3RyaW5nLCBhIG51bWJlciwgYSBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcImZ1bmN0aW9uLCBhIGJvb2xlYW4gb3IgYW4gb2JqZWN0XCIpO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpc0FyZ3VtZW50czogaXNBcmd1bWVudHMsXG4gICAgICAgIGlzRWxlbWVudDogaXNFbGVtZW50LFxuICAgICAgICBpc0RhdGU6IGlzRGF0ZSxcbiAgICAgICAgaXNOZWdaZXJvOiBpc05lZ1plcm8sXG4gICAgICAgIGlkZW50aWNhbDogaWRlbnRpY2FsLFxuICAgICAgICBkZWVwRXF1YWw6IGRlZXBFcXVhbEN5Y2xpYyxcbiAgICAgICAgbWF0Y2g6IG1hdGNoLFxuICAgICAgICBrZXlzOiBrZXlzXG4gICAgfTtcbn0pO1xuIiwiLy8gICAgIFVuZGVyc2NvcmUuanMgMS41LjJcbi8vICAgICBodHRwOi8vdW5kZXJzY29yZWpzLm9yZ1xuLy8gICAgIChjKSAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbi8vICAgICBVbmRlcnNjb3JlIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4oZnVuY3Rpb24oKSB7XG5cbiAgLy8gQmFzZWxpbmUgc2V0dXBcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBFc3RhYmxpc2ggdGhlIHJvb3Qgb2JqZWN0LCBgd2luZG93YCBpbiB0aGUgYnJvd3Nlciwgb3IgYGV4cG9ydHNgIG9uIHRoZSBzZXJ2ZXIuXG4gIHZhciByb290ID0gdGhpcztcblxuICAvLyBTYXZlIHRoZSBwcmV2aW91cyB2YWx1ZSBvZiB0aGUgYF9gIHZhcmlhYmxlLlxuICB2YXIgcHJldmlvdXNVbmRlcnNjb3JlID0gcm9vdC5fO1xuXG4gIC8vIEVzdGFibGlzaCB0aGUgb2JqZWN0IHRoYXQgZ2V0cyByZXR1cm5lZCB0byBicmVhayBvdXQgb2YgYSBsb29wIGl0ZXJhdGlvbi5cbiAgdmFyIGJyZWFrZXIgPSB7fTtcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVGb3JFYWNoICAgICAgPSBBcnJheVByb3RvLmZvckVhY2gsXG4gICAgbmF0aXZlTWFwICAgICAgICAgID0gQXJyYXlQcm90by5tYXAsXG4gICAgbmF0aXZlUmVkdWNlICAgICAgID0gQXJyYXlQcm90by5yZWR1Y2UsXG4gICAgbmF0aXZlUmVkdWNlUmlnaHQgID0gQXJyYXlQcm90by5yZWR1Y2VSaWdodCxcbiAgICBuYXRpdmVGaWx0ZXIgICAgICAgPSBBcnJheVByb3RvLmZpbHRlcixcbiAgICBuYXRpdmVFdmVyeSAgICAgICAgPSBBcnJheVByb3RvLmV2ZXJ5LFxuICAgIG5hdGl2ZVNvbWUgICAgICAgICA9IEFycmF5UHJvdG8uc29tZSxcbiAgICBuYXRpdmVJbmRleE9mICAgICAgPSBBcnJheVByb3RvLmluZGV4T2YsXG4gICAgbmF0aXZlTGFzdEluZGV4T2YgID0gQXJyYXlQcm90by5sYXN0SW5kZXhPZixcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kO1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdCB2aWEgYSBzdHJpbmcgaWRlbnRpZmllcixcbiAgLy8gZm9yIENsb3N1cmUgQ29tcGlsZXIgXCJhZHZhbmNlZFwiIG1vZGUuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuNS4yJztcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIG9iamVjdHMgd2l0aCB0aGUgYnVpbHQtaW4gYGZvckVhY2hgLCBhcnJheXMsIGFuZCByYXcgb2JqZWN0cy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZvckVhY2hgIGlmIGF2YWlsYWJsZS5cbiAgdmFyIGVhY2ggPSBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm47XG4gICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleXNbaV1dLCBrZXlzW2ldLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcmVzdWx0cyBvZiBhcHBseWluZyB0aGUgaXRlcmF0b3IgdG8gZWFjaCBlbGVtZW50LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbWFwYCBpZiBhdmFpbGFibGUuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlTWFwICYmIG9iai5tYXAgPT09IG5hdGl2ZU1hcCkgcmV0dXJuIG9iai5tYXAoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIHZhciByZWR1Y2VFcnJvciA9ICdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJztcblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2UgPSBfLmZvbGRsID0gXy5pbmplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2UgJiYgb2JqLnJlZHVjZSA9PT0gbmF0aXZlUmVkdWNlKSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlKGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2UoaXRlcmF0b3IpO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IHZhbHVlO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZVJpZ2h0YCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlUmlnaHQgPSBfLmZvbGRyID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlUmlnaHQgJiYgb2JqLnJlZHVjZVJpZ2h0ID09PSBuYXRpdmVSZWR1Y2VSaWdodCkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvcik7XG4gICAgfVxuICAgIHZhciBsZW5ndGggPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggIT09ICtsZW5ndGgpIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaW5kZXggPSBrZXlzID8ga2V5c1stLWxlbmd0aF0gOiAtLWxlbmd0aDtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gb2JqW2luZGV4XTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCBvYmpbaW5kZXhdLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuIEFsaWFzZWQgYXMgYGRldGVjdGAuXG4gIF8uZmluZCA9IF8uZGV0ZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgYW55KG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmaWx0ZXJgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgc2VsZWN0YC5cbiAgXy5maWx0ZXIgPSBfLnNlbGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZUZpbHRlciAmJiBvYmouZmlsdGVyID09PSBuYXRpdmVGaWx0ZXIpIHJldHVybiBvYmouZmlsdGVyKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSByZXN1bHRzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIGZvciB3aGljaCBhIHRydXRoIHRlc3QgZmFpbHMuXG4gIF8ucmVqZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuICFpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgfSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBldmVyeWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgfHwgKGl0ZXJhdG9yID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVFdmVyeSAmJiBvYmouZXZlcnkgPT09IG5hdGl2ZUV2ZXJ5KSByZXR1cm4gb2JqLmV2ZXJ5KGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIShyZXN1bHQgPSByZXN1bHQgJiYgaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiBhdCBsZWFzdCBvbmUgZWxlbWVudCBpbiB0aGUgb2JqZWN0IG1hdGNoZXMgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgc29tZWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbnlgLlxuICB2YXIgYW55ID0gXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgfHwgKGl0ZXJhdG9yID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlU29tZSAmJiBvYmouc29tZSA9PT0gbmF0aXZlU29tZSkgcmV0dXJuIG9iai5zb21lKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocmVzdWx0IHx8IChyZXN1bHQgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBhcnJheSBvciBvYmplY3QgY29udGFpbnMgYSBnaXZlbiB2YWx1ZSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZSA9IGZ1bmN0aW9uKG9iaiwgdGFyZ2V0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgb2JqLmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBvYmouaW5kZXhPZih0YXJnZXQpICE9IC0xO1xuICAgIHJldHVybiBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSB0YXJnZXQ7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiAoaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXSkuYXBwbHkodmFsdWUsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYG1hcGA6IGZldGNoaW5nIGEgcHJvcGVydHkuXG4gIF8ucGx1Y2sgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuIHZhbHVlW2tleV07IH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMsIGZpcnN0KSB7XG4gICAgaWYgKF8uaXNFbXB0eShhdHRycykpIHJldHVybiBmaXJzdCA/IHZvaWQgMCA6IFtdO1xuICAgIHJldHVybiBfW2ZpcnN0ID8gJ2ZpbmQnIDogJ2ZpbHRlciddKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xuICAgICAgICBpZiAoYXR0cnNba2V5XSAhPT0gdmFsdWVba2V5XSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy53aGVyZShvYmosIGF0dHJzLCB0cnVlKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCBvciAoZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIC8vIENhbid0IG9wdGltaXplIGFycmF5cyBvZiBpbnRlZ2VycyBsb25nZXIgdGhhbiA2NSw1MzUgZWxlbWVudHMuXG4gIC8vIFNlZSBbV2ViS2l0IEJ1ZyA4MDc5N10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgwNzk3KVxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNFbXB0eShvYmopKSByZXR1cm4gLUluZmluaXR5O1xuICAgIHZhciByZXN1bHQgPSB7Y29tcHV0ZWQgOiAtSW5maW5pdHksIHZhbHVlOiAtSW5maW5pdHl9O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBjb21wdXRlZCA+IHJlc3VsdC5jb21wdXRlZCAmJiAocmVzdWx0ID0ge3ZhbHVlIDogdmFsdWUsIGNvbXB1dGVkIDogY29tcHV0ZWR9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0LnZhbHVlO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzRW1wdHkob2JqKSkgcmV0dXJuIEluZmluaXR5O1xuICAgIHZhciByZXN1bHQgPSB7Y29tcHV0ZWQgOiBJbmZpbml0eSwgdmFsdWU6IEluZmluaXR5fTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgY29tcHV0ZWQgPCByZXN1bHQuY29tcHV0ZWQgJiYgKHJlc3VsdCA9IHt2YWx1ZSA6IHZhbHVlLCBjb21wdXRlZCA6IGNvbXB1dGVkfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGFuIGFycmF5LCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlIFxuICAvLyBbRmlzaGVyLVlhdGVzIHNodWZmbGVdKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlzaGVy4oCTWWF0ZXNfc2h1ZmZsZSkuXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByYW5kO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNodWZmbGVkID0gW107XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oaW5kZXgrKyk7XG4gICAgICBzaHVmZmxlZFtpbmRleCAtIDFdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50IGZyb20gdGhlIGFycmF5LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIgfHwgZ3VhcmQpIHtcbiAgICAgIHJldHVybiBvYmpbXy5yYW5kb20ob2JqLmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgcmV0dXJuIF8uc2h1ZmZsZShvYmopLnNsaWNlKDAsIE1hdGgubWF4KDAsIG4pKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBsb29rdXAgaXRlcmF0b3JzLlxuICB2YXIgbG9va3VwSXRlcmF0b3IgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUgOiBmdW5jdGlvbihvYmopeyByZXR1cm4gb2JqW3ZhbHVlXTsgfTtcbiAgfTtcblxuICAvLyBTb3J0IHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24gcHJvZHVjZWQgYnkgYW4gaXRlcmF0b3IuXG4gIF8uc29ydEJ5ID0gZnVuY3Rpb24ob2JqLCB2YWx1ZSwgY29udGV4dCkge1xuICAgIHZhciBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKHZhbHVlKTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSkuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCAtIHJpZ2h0LmluZGV4O1xuICAgIH0pLCAndmFsdWUnKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB1c2VkIGZvciBhZ2dyZWdhdGUgXCJncm91cCBieVwiIG9wZXJhdGlvbnMuXG4gIHZhciBncm91cCA9IGZ1bmN0aW9uKGJlaGF2aW9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgdmFsdWUsIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIHZhciBpdGVyYXRvciA9IHZhbHVlID09IG51bGwgPyBfLmlkZW50aXR5IDogbG9va3VwSXRlcmF0b3IodmFsdWUpO1xuICAgICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICAgIGJlaGF2aW9yKHJlc3VsdCwga2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICAoXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0gOiAocmVzdWx0W2tleV0gPSBbXSkpLnB1c2godmFsdWUpO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5KSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0rKyA6IHJlc3VsdFtrZXldID0gMTtcbiAgfSk7XG5cbiAgLy8gVXNlIGEgY29tcGFyYXRvciBmdW5jdGlvbiB0byBmaWd1cmUgb3V0IHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaFxuICAvLyBhbiBvYmplY3Qgc2hvdWxkIGJlIGluc2VydGVkIHNvIGFzIHRvIG1haW50YWluIG9yZGVyLiBVc2VzIGJpbmFyeSBzZWFyY2guXG4gIF8uc29ydGVkSW5kZXggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gaXRlcmF0b3IgPT0gbnVsbCA/IF8uaWRlbnRpdHkgOiBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVttaWRdKSA8IHZhbHVlID8gbG93ID0gbWlkICsgMSA6IGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSByZXR1cm4gXy5tYXAob2JqLCBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gXy52YWx1ZXMob2JqKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYmplY3QuXG4gIF8uc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgPyBvYmoubGVuZ3RoIDogXy5rZXlzKG9iaikubGVuZ3RoO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICByZXR1cm4gKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyBhcnJheVswXSA6IHNsaWNlLmNhbGwoYXJyYXksIDAsIG4pO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgZW50cnkgb2YgdGhlIGFycmF5LiBFc3BlY2lhbGx5IHVzZWZ1bCBvblxuICAvLyB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiBhbGwgdGhlIHZhbHVlcyBpblxuICAvLyB0aGUgYXJyYXksIGV4Y2x1ZGluZyB0aGUgbGFzdCBOLiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGhcbiAgLy8gYF8ubWFwYC5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtICgobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5sYXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuID09IG51bGwpIHx8IGd1YXJkKSB7XG4gICAgICByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqXG4gIC8vIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5yZXN0ID0gXy50YWlsID0gXy5kcm9wID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgb3V0cHV0KSB7XG4gICAgaWYgKHNoYWxsb3cgJiYgXy5ldmVyeShpbnB1dCwgXy5pc0FycmF5KSkge1xuICAgICAgcmV0dXJuIGNvbmNhdC5hcHBseShvdXRwdXQsIGlucHV0KTtcbiAgICB9XG4gICAgZWFjaChpbnB1dCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgIHNoYWxsb3cgPyBwdXNoLmFwcGx5KG91dHB1dCwgdmFsdWUpIDogZmxhdHRlbih2YWx1ZSwgc2hhbGxvdywgb3V0cHV0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xuXG4gIC8vIEZsYXR0ZW4gb3V0IGFuIGFycmF5LCBlaXRoZXIgcmVjdXJzaXZlbHkgKGJ5IGRlZmF1bHQpLCBvciBqdXN0IG9uZSBsZXZlbC5cbiAgXy5mbGF0dGVuID0gZnVuY3Rpb24oYXJyYXksIHNoYWxsb3cpIHtcbiAgICByZXR1cm4gZmxhdHRlbihhcnJheSwgc2hhbGxvdywgW10pO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHZlcnNpb24gb2YgdGhlIGFycmF5IHRoYXQgZG9lcyBub3QgY29udGFpbiB0aGUgc3BlY2lmaWVkIHZhbHVlKHMpLlxuICBfLndpdGhvdXQgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYXJyYXksIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGlzU29ydGVkKSkge1xuICAgICAgY29udGV4dCA9IGl0ZXJhdG9yO1xuICAgICAgaXRlcmF0b3IgPSBpc1NvcnRlZDtcbiAgICAgIGlzU29ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXRlcmF0b3IgPyBfLm1hcChhcnJheSwgaXRlcmF0b3IsIGNvbnRleHQpIDogYXJyYXk7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGVhY2goaW5pdGlhbCwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAoaXNTb3J0ZWQgPyAoIWluZGV4IHx8IHNlZW5bc2Vlbi5sZW5ndGggLSAxXSAhPT0gdmFsdWUpIDogIV8uY29udGFpbnMoc2VlbiwgdmFsdWUpKSB7XG4gICAgICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJlc3VsdHMucHVzaChhcnJheVtpbmRleF0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoXy5mbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihfLnVuaXEoYXJyYXkpLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gXy5ldmVyeShyZXN0LCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gXy5pbmRleE9mKG90aGVyLCBpdGVtKSA+PSAwO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiAhXy5jb250YWlucyhyZXN0LCB2YWx1ZSk7IH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxlbmd0aCA9IF8ubWF4KF8ucGx1Y2soYXJndW1lbnRzLCBcImxlbmd0aFwiKS5jb25jYXQoMCkpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJndW1lbnRzLCAnJyArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIElmIHRoZSBicm93c2VyIGRvZXNuJ3Qgc3VwcGx5IHVzIHdpdGggaW5kZXhPZiAoSSdtIGxvb2tpbmcgYXQgeW91LCAqKk1TSUUqKiksXG4gIC8vIHdlIG5lZWQgdGhpcyBmdW5jdGlvbi4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhblxuICAvLyBpdGVtIGluIGFuIGFycmF5LCBvciAtMSBpZiB0aGUgaXRlbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIGFycmF5LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgaW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICAvLyBJZiB0aGUgYXJyYXkgaXMgbGFyZ2UgYW5kIGFscmVhZHkgaW4gc29ydCBvcmRlciwgcGFzcyBgdHJ1ZWBcbiAgLy8gZm9yICoqaXNTb3J0ZWQqKiB0byB1c2UgYmluYXJ5IHNlYXJjaC5cbiAgXy5pbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGlzU29ydGVkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0gXy5zb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9PT0gaXRlbSA/IGkgOiAtMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgYXJyYXkuaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSwgaXNTb3J0ZWQpO1xuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBsYXN0SW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICBfLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGZyb20pIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBoYXNJbmRleCA9IGZyb20gIT0gbnVsbDtcbiAgICBpZiAobmF0aXZlTGFzdEluZGV4T2YgJiYgYXJyYXkubGFzdEluZGV4T2YgPT09IG5hdGl2ZUxhc3RJbmRleE9mKSB7XG4gICAgICByZXR1cm4gaGFzSW5kZXggPyBhcnJheS5sYXN0SW5kZXhPZihpdGVtLCBmcm9tKSA6IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0pO1xuICAgIH1cbiAgICB2YXIgaSA9IChoYXNJbmRleCA/IGZyb20gOiBhcnJheS5sZW5ndGgpO1xuICAgIHdoaWxlIChpLS0pIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBhcmd1bWVudHNbMl0gfHwgMTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSwgMCk7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgdmFyIHJhbmdlID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZShpZHggPCBsZW5ndGgpIHtcbiAgICAgIHJhbmdlW2lkeCsrXSA9IHN0YXJ0O1xuICAgICAgc3RhcnQgKz0gc3RlcDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24gKGFoZW0pIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgcHJvdG90eXBlIHNldHRpbmcuXG4gIHZhciBjdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIHZhciBhcmdzLCBib3VuZDtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkpIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgIHZhciBzZWxmID0gbmV3IGN0b3I7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBCaW5kIGFsbCBvZiBhbiBvYmplY3QncyBtZXRob2RzIHRvIHRoYXQgb2JqZWN0LiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXRcbiAgLy8gYWxsIGNhbGxiYWNrcyBkZWZpbmVkIG9uIGFuIG9iamVjdCBiZWxvbmcgdG8gaXQuXG4gIF8uYmluZEFsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBmdW5jcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoZnVuY3MubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoXCJiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzXCIpO1xuICAgIGVhY2goZnVuY3MsIGZ1bmN0aW9uKGYpIHsgb2JqW2ZdID0gXy5iaW5kKG9ialtmXSwgb2JqKTsgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtbyA9IHt9O1xuICAgIGhhc2hlciB8fCAoaGFzaGVyID0gXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIF8uaGFzKG1lbW8sIGtleSkgPyBtZW1vW2tleV0gOiAobWVtb1trZXldID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3MpOyB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gXy5kZWxheS5hcHBseShfLCBbZnVuYywgMV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZVxuICAvLyBkdXJpbmcgYSBnaXZlbiB3aW5kb3cgb2YgdGltZS4gTm9ybWFsbHksIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbCBydW5cbiAgLy8gYXMgbXVjaCBhcyBpdCBjYW4sIHdpdGhvdXQgZXZlciBnb2luZyBtb3JlIHRoYW4gb25jZSBwZXIgYHdhaXRgIGR1cmF0aW9uO1xuICAvLyBidXQgaWYgeW91J2QgbGlrZSB0byBkaXNhYmxlIHRoZSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSwgcGFzc1xuICAvLyBge2xlYWRpbmc6IGZhbHNlfWAuIFRvIGRpc2FibGUgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlLCBkaXR0by5cbiAgXy50aHJvdHRsZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29udGV4dCwgYXJncywgcmVzdWx0O1xuICAgIHZhciB0aW1lb3V0ID0gbnVsbDtcbiAgICB2YXIgcHJldmlvdXMgPSAwO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogbmV3IERhdGU7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gbmV3IERhdGU7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIHByZXZpb3VzID0gbm93O1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcbiAgICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbGFzdCA9IChuZXcgRGF0ZSgpKSAtIHRpbWVzdGFtcDtcbiAgICAgICAgaWYgKGxhc3QgPCB3YWl0KSB7XG4gICAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQgLSBsYXN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICBpZiAoIWltbWVkaWF0ZSkgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsTm93KSByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvd1xuICAvLyBvZnRlbiB5b3UgY2FsbCBpdC4gVXNlZnVsIGZvciBsYXp5IGluaXRpYWxpemF0aW9uLlxuICBfLm9uY2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIHJhbiA9IGZhbHNlLCBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gW2Z1bmNdO1xuICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHdyYXBwZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBmb3IgKHZhciBpID0gZnVuY3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXJncyA9IFtmdW5jc1tpXS5hcHBseSh0aGlzLCBhcmdzKV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBuYXRpdmVLZXlzIHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogIT09IE9iamVjdChvYmopKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG9iamVjdCcpO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0gPSBvYmpba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBwYWlyc1tpXSA9IFtrZXlzW2ldLCBvYmpba2V5c1tpXV1dO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLy8gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICBfLmludmVydCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRbb2JqW2tleXNbaV1dXSA9IGtleXNbaV07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgc29ydGVkIGxpc3Qgb2YgdGhlIGZ1bmN0aW9uIG5hbWVzIGF2YWlsYWJsZSBvbiB0aGUgb2JqZWN0LlxuICAvLyBBbGlhc2VkIGFzIGBtZXRob2RzYFxuICBfLmZ1bmN0aW9ucyA9IF8ubWV0aG9kcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqW2tleV0pKSBuYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcy5zb3J0KCk7XG4gIH07XG5cbiAgLy8gRXh0ZW5kIGEgZ2l2ZW4gb2JqZWN0IHdpdGggYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHBhc3NlZC1pbiBvYmplY3QocykuXG4gIF8uZXh0ZW5kID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKCFfLmNvbnRhaW5zKGtleXMsIGtleSkpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChvYmpbcHJvcF0gPT09IHZvaWQgMCkgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuICAgIHZhciBzaXplID0gMCwgcmVzdWx0ID0gdHJ1ZTtcbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoY2xhc3NOYW1lID09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgc2l6ZSA9IGEubGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gc2l6ZSA9PSBiLmxlbmd0aDtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IGVxKGFbc2l6ZV0sIGJbc2l6ZV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgZm9yICh2YXIga2V5IGluIGEpIHtcbiAgICAgICAgaWYgKF8uaGFzKGEsIGtleSkpIHtcbiAgICAgICAgICAvLyBDb3VudCB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlci5cbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIGIpIHtcbiAgICAgICAgICBpZiAoXy5oYXMoYiwga2V5KSAmJiAhKHNpemUtLSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9ICFzaXplO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUGVyZm9ybSBhIGRlZXAgY29tcGFyaXNvbiB0byBjaGVjayBpZiB0d28gb2JqZWN0cyBhcmUgZXF1YWwuXG4gIF8uaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gZXEoYSwgYiwgW10sIFtdKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopKSByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9O1xuXG4gIC8vIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLlxuICBlYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIERlZmluZSBhIGZhbGxiYWNrIHZlcnNpb24gb2YgdGhlIG1ldGhvZCBpbiBicm93c2VycyAoYWhlbSwgSUUpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiAhIShvYmogJiYgXy5oYXMob2JqLCAnY2FsbGVlJykpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuXG4gIGlmICh0eXBlb2YgKC8uLykgIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPSArb2JqO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBib29sZWFuP1xuICBfLmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdG9ycy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIC8vIFJ1biBhIGZ1bmN0aW9uICoqbioqIHRpbWVzLlxuICBfLnRpbWVzID0gZnVuY3Rpb24obiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgYWNjdW0gPSBBcnJheShNYXRoLm1heCgwLCBuKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBpKTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBtaW4gYW5kIG1heCAoaW5jbHVzaXZlKS5cbiAgXy5yYW5kb20gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgIGlmIChtYXggPT0gbnVsbCkge1xuICAgICAgbWF4ID0gbWluO1xuICAgICAgbWluID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSk7XG4gIH07XG5cbiAgLy8gTGlzdCBvZiBIVE1MIGVudGl0aWVzIGZvciBlc2NhcGluZy5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICBlc2NhcGU6IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiN4Mjc7J1xuICAgIH1cbiAgfTtcbiAgZW50aXR5TWFwLnVuZXNjYXBlID0gXy5pbnZlcnQoZW50aXR5TWFwLmVzY2FwZSk7XG5cbiAgLy8gUmVnZXhlcyBjb250YWluaW5nIHRoZSBrZXlzIGFuZCB2YWx1ZXMgbGlzdGVkIGltbWVkaWF0ZWx5IGFib3ZlLlxuICB2YXIgZW50aXR5UmVnZXhlcyA9IHtcbiAgICBlc2NhcGU6ICAgbmV3IFJlZ0V4cCgnWycgKyBfLmtleXMoZW50aXR5TWFwLmVzY2FwZSkuam9pbignJykgKyAnXScsICdnJyksXG4gICAgdW5lc2NhcGU6IG5ldyBSZWdFeHAoJygnICsgXy5rZXlzKGVudGl0eU1hcC51bmVzY2FwZSkuam9pbignfCcpICsgJyknLCAnZycpXG4gIH07XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICBfLmVhY2goWydlc2NhcGUnLCAndW5lc2NhcGUnXSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgX1ttZXRob2RdID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBpZiAoc3RyaW5nID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiAoJycgKyBzdHJpbmcpLnJlcGxhY2UoZW50aXR5UmVnZXhlc1ttZXRob2RdLCBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICByZXR1cm4gZW50aXR5TWFwW21ldGhvZF1bbWF0Y2hdO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChfLmZ1bmN0aW9ucyhvYmopLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IF9bbmFtZV0gPSBvYmpbbmFtZV07XG4gICAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFt0aGlzLl93cmFwcGVkXTtcbiAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx0JzogICAgICd0JyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx0fFxcdTIwMjh8XFx1MjAyOS9nO1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBkYXRhLCBzZXR0aW5ncykge1xuICAgIHZhciByZW5kZXI7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldClcbiAgICAgICAgLnJlcGxhY2UoZXNjYXBlciwgZnVuY3Rpb24obWF0Y2gpIHsgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdOyB9KTtcblxuICAgICAgaWYgKGVzY2FwZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGVzY2FwZSArIFwiKSk9PW51bGw/Jyc6Xy5lc2NhcGUoX190KSkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aDtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArIFwicmV0dXJuIF9fcDtcXG5cIjtcblxuICAgIHRyeSB7XG4gICAgICByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHJldHVybiByZW5kZXIoZGF0YSwgXyk7XG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBmdW5jdGlvbiBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyAoc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicpICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24sIHdoaWNoIHdpbGwgZGVsZWdhdGUgdG8gdGhlIHdyYXBwZXIuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXyhvYmopLmNoYWluKCk7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0aGlzLl9jaGFpbiA/IF8ob2JqKS5jaGFpbigpIDogb2JqO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsncG9wJywgJ3B1c2gnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuX3dyYXBwZWQ7XG4gICAgICBtZXRob2QuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKChuYW1lID09ICdzaGlmdCcgfHwgbmFtZSA9PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgbWV0aG9kLmFwcGx5KHRoaXMuX3dyYXBwZWQsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xuXG4gIF8uZXh0ZW5kKF8ucHJvdG90eXBlLCB7XG5cbiAgICAvLyBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gICAgY2hhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fY2hhaW4gPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEV4dHJhY3RzIHRoZSByZXN1bHQgZnJvbSBhIHdyYXBwZWQgYW5kIGNoYWluZWQgb2JqZWN0LlxuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93cmFwcGVkO1xuICAgIH1cblxuICB9KTtcblxufSkuY2FsbCh0aGlzKTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXsoZnVuY3Rpb24ocm9vdCkge1xuICAgIHZhciB1bm9waW5pb25hdGUgPSB7XG4gICAgICAgIHNlbGVjdG9yOiByb290LmpRdWVyeSB8fCByb290LlplcHRvIHx8IHJvb3QuZW5kZXIgfHwgcm9vdC4kLFxuICAgICAgICB0ZW1wbGF0ZTogcm9vdC5IYW5kbGViYXJzIHx8IHJvb3QuTXVzdGFjaGVcbiAgICB9O1xuXG4gICAgLyoqKiBFeHBvcnQgKioqL1xuXG4gICAgLy9BTURcbiAgICBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB1bm9waW5pb25hdGU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvL0NvbW1vbkpTXG4gICAgZWxzZSBpZih0eXBlb2YgbW9kdWxlLmV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gdW5vcGluaW9uYXRlO1xuICAgIH1cbiAgICAvL0dsb2JhbFxuICAgIGVsc2Uge1xuICAgICAgICByb290LnVub3BpbmlvbmF0ZSA9IHVub3BpbmlvbmF0ZTtcbiAgICB9XG59KSh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnID8gd2luZG93IDogZ2xvYmFsKTtcbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIF8gICA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgICBsb2cgPSByZXF1aXJlKCdsb2dsZXZlbCcpLFxuICAgIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuXG52YXIgVmlldyA9IGZ1bmN0aW9uKCkge307XG5cblZpZXcucHJvdG90eXBlID0ge1xuICAgIGlzVmlldzogdHJ1ZSxcblxuICAgIC8qKiogRGVmYXVsdCBBdHRyaWJ1dGVzIChzaG91bGQgYmUgb3ZlcndyaXR0ZW4pICoqKi9cbiAgICB0YWdOYW1lOiAgICBcImRpdlwiLFxuICAgIGNsYXNzTmFtZTogIFwiXCIsXG5cbiAgICAvL2xpc3RlbmVyc1xuICAgIC8vJ1tkaXJlY3Rpb25dOltldmVudCBuYW1lXTpbZnJvbSB0eXBlXSwgLi4uJzogZnVuY3Rpb24oZXZlbnRBcmd1bWVudHMqKSB7fVxuICAgIGxpc3RlbmVyczoge30sXG5cbiAgICAvL1N0YXRlXG4gICAgZGVmYXVsdFN0YXRlOiB7fSxcblxuICAgIC8qIFRlbXBsYXRpbmcgKi9cbiAgICB0ZW1wbGF0ZTogICBcIlwiLFxuXG4gICAgLy9EYXRhIGdvZXMgaW50byB0aGUgdGVtcGxhdGVzIGFuZCBtYXkgYWxzbyBiZSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhbiBvYmplY3RcbiAgICBkYXRhOiAgICAgICB7fSxcblxuICAgIC8vU3Vidmlld3MgYXJlIGEgc2V0IG9mIHN1YnZpZXdzIHRoYXQgd2lsbCBiZSBmZWQgaW50byB0aGUgdGVtcGxhdGluZyBlbmdpbmVcbiAgICBzdWJ2aWV3czogICB7fSxcblxuICAgIHJlUmVuZGVyOiAgIGZhbHNlLCAvL0RldGVybWluZXMgaWYgc3VidmlldyBpcyByZS1yZW5kZXJlZCBldmVyeSB0aW1lIGl0IGlzIHNwYXduZWRcblxuICAgIC8qIENhbGxiYWNrcyAqL1xuICAgIHByZVJlbmRlcjogIG5vb3AsXG4gICAgcG9zdFJlbmRlcjogbm9vcCxcblxuICAgIC8qKiogSW5pdGlhbGl6YXRpb24gRnVuY3Rpb25zIChzaG91bGQgYmUgY29uZmlndXJlZCBidXQgd2lsbCBiZSBtYW5pcHVsYXRlZCB3aGVuIGRlZmluaW5nIHRoZSBzdWJ2aWV3KSAqKiovXG4gICAgb25jZTogZnVuY3Rpb24oY29uZmlnKSB7IC8vUnVucyBhZnRlciByZW5kZXJcbiAgICAgICAgZm9yKHZhciBpPTA7IGk8dGhpcy5vbmNlRnVuY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm9uY2VGdW5jdGlvbnNbaV0uYXBwbHkodGhpcywgW2NvbmZpZ10pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sIFxuICAgIG9uY2VGdW5jdGlvbnM6IFtdLFxuICAgIGluaXQ6IGZ1bmN0aW9uKGNvbmZpZykgeyAvL1J1bnMgYWZ0ZXIgcmVuZGVyXG4gICAgICAgIGZvcih2YXIgaT0wOyBpPHRoaXMuaW5pdEZ1bmN0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5pbml0RnVuY3Rpb25zW2ldLmFwcGx5KHRoaXMsIFtjb25maWddKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LCBcbiAgICBpbml0RnVuY3Rpb25zOiBbXSxcbiAgICBjbGVhbjogZnVuY3Rpb24oKSB7IC8vUnVucyBvbiByZW1vdmVcbiAgICAgICAgZm9yKHZhciBpPTA7IGk8dGhpcy5jbGVhbkZ1bmN0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5jbGVhbkZ1bmN0aW9uc1tpXS5hcHBseSh0aGlzLCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSwgXG4gICAgY2xlYW5GdW5jdGlvbnM6IFtdLFxuXG4gICAgLyoqKiBSZW5kZXJpbmcgKioqL1xuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIGh0bWwgPSAnJztcbiAgICAgICAgICAgIHBvc3RMb2FkID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5wcmVSZW5kZXIoKTtcblxuICAgICAgICAvL05vIFRlbXBsYXRpbmcgRW5naW5lXG4gICAgICAgIGlmKHR5cGVvZiB0aGlzLnRlbXBsYXRlID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBodG1sID0gdGhpcy50ZW1wbGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdHlwZW9mIHRoaXMuZGF0YSA9PSAnZnVuY3Rpb24nID8gdGhpcy5kYXRhKCkgOiB0aGlzLmRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vRGVmaW5lIHRoZSBzdWJ2aWV3IHZhcmlhYmxlXG4gICAgICAgICAgICBkYXRhLnN1YnZpZXcgPSB7fTtcbiAgICAgICAgICAgICQuZWFjaCh0aGlzLnN1YnZpZXdzLCBmdW5jdGlvbihuYW1lLCBzdWJ2aWV3KSB7XG4gICAgICAgICAgICAgICAgcG9zdExvYWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGRhdGEuc3Vidmlld1tuYW1lXSA9IFwiPHNjcmlwdCBjbGFzcz0ncG9zdC1sb2FkLXZpZXcnIHR5cGU9J3RleHQvaHRtbCcgZGF0YS1uYW1lPSdcIituYW1lK1wiJz48L3NjcmlwdD5cIjtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvL1J1biB0aGUgdGVtcGxhdGluZyBlbmdpbmVcbiAgICAgICAgICAgIGlmKF8uaXNGdW5jdGlvbih0aGlzLnRlbXBsYXRlKSkge1xuICAgICAgICAgICAgICAgIC8vRUpTXG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIHRoaXMudGVtcGxhdGUucmVuZGVyID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCA9IHRoaXMudGVtcGxhdGUucmVuZGVyKGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvL0hhbmRsZWJhcnMgJiBVbmRlcnNjb3JlICYgSmFkZVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBodG1sID0gdGhpcy50ZW1wbGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoXCJUZW1wbGF0aW5nIGVuZ2luZSBub3QgcmVjb2duaXplZC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmh0bWwoaHRtbCk7XG5cbiAgICAgICAgLy9Qb3N0IExvYWQgVmlld3NcbiAgICAgICAgaWYocG9zdExvYWQpIHtcbiAgICAgICAgICAgIHRoaXMuJHdyYXBwZXIuZmluZCgnLnBvc3QtbG9hZC12aWV3JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICB2aWV3ICA9IHNlbGYuc3Vidmlld3NbJHRoaXMuYXR0cignZGF0YS1uYW1lJyldO1xuXG4gICAgICAgICAgICAgICAgaWYodmlldy5pc1ZpZXdQb29sKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpZXcgPSB2aWV3LnNwYXduKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgJHRoaXNcbiAgICAgICAgICAgICAgICAgICAgLmFmdGVyKHZpZXcuJHdyYXBwZXIpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wb3N0UmVuZGVyKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBodG1sOiBmdW5jdGlvbihodG1sKSB7XG4gICAgICAgIC8vUmVtb3ZlICYgY2xlYW4gc3Vidmlld3MgaW4gdGhlIHdyYXBwZXIgXG4gICAgICAgIHRoaXMuJCgnLicrdGhpcy5fc3Vidmlld0Nzc0NsYXNzKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc3Vidmlldyh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy53cmFwcGVyLmlubmVySFRNTCA9IGh0bWw7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZih0aGlzLl9hY3RpdmUpIHtcbiAgICAgICAgICAgIC8vRGV0YWNoXG4gICAgICAgICAgICB2YXIgcGFyZW50ID0gdGhpcy53cmFwcGVyLnBhcmVudE5vZGU7XG4gICAgICAgICAgICBpZihwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQodGhpcy53cmFwcGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy9DbGVhblxuICAgICAgICAgICAgdGhpcy5jbGVhbigpO1xuXG4gICAgICAgICAgICB0aGlzLnBvb2wuX3JlbGVhc2UodGhpcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgICQ6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgIHJldHVybiB0aGlzLiR3cmFwcGVyLmZpbmQoc2VsZWN0b3IpO1xuICAgIH0sXG5cbiAgICAvKioqIFRyYXZlcnNpbmcgKioqL1xuICAgIHRyYXZlcnNlOiBmdW5jdGlvbihqcUZ1bmMsIHR5cGUpIHtcbiAgICAgICAgdmFyICRlbCA9IHRoaXMuJHdyYXBwZXJbanFGdW5jXSgnLicgKyAodHlwZSA/IHRoaXMuX3N1YnZpZXdDc3NDbGFzcyArICctJyArIHR5cGUgOiAnc3VidmlldycpKTtcbiAgICAgICAgXG4gICAgICAgIGlmKCRlbCAmJiAkZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuICRlbFswXVtzdWJ2aWV3Ll9kb21Qcm9wZXJ0eU5hbWVdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBhcmVudDogZnVuY3Rpb24odHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmF2ZXJzZSgnY2xvc2VzdCcsIHR5cGUpO1xuICAgIH0sXG4gICAgbmV4dDogZnVuY3Rpb24odHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmF2ZXJzZSgnbmV4dCcsIHR5cGUpO1xuICAgIH0sXG4gICAgcHJldjogZnVuY3Rpb24odHlwZSkge1xuICAgICAgICByZXR1cm4gdGhpcy50cmF2ZXJzZSgncHJldicsIHR5cGUpO1xuICAgIH0sXG4gICAgY2hpbGRyZW46IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudHJhdmVyc2UoJ2ZpbmQnLCB0eXBlKTtcbiAgICB9LFxuICAgIGFwcGVuZFRvOiBmdW5jdGlvbigkZWwpIHtcbiAgICAgICAgdGhpcy4kd3JhcHBlci5hcHBlbmRUbygkZWwpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIFxuICAgIC8qKiogRXZlbnQgQVBJICoqKi9cbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihuYW1lLCBhcmdzKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgYXJncyA9IGFyZ3MgfHwgW107XG5cbiAgICAgICAgLy9Ccm9hZGNhc3QgaW4gYWxsIGRpcmVjdGlvbnNcbiAgICAgICAgdmFyIGRpcmVjdGlvbnMgPSB7XG4gICAgICAgICAgICB1cDogICAgICdmaW5kJyxcbiAgICAgICAgICAgIGRvd246ICAgJ3BhcmVudHMnLFxuICAgICAgICAgICAgYWNyb3NzOiAnc2libGluZ3MnLFxuICAgICAgICAgICAgYWxsOiAgICBudWxsLFxuICAgICAgICAgICAgc2VsZjogICB0aGlzLiR3cmFwcGVyXG4gICAgICAgIH07XG5cbiAgICAgICAgXy5maW5kKGRpcmVjdGlvbnMsIGZ1bmN0aW9uKGpxRnVuYywgZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSAnLmxpc3RlbmVyLScrZGlyZWN0aW9uKyctJytuYW1lO1xuICAgICAgICAgICAgc2VsZWN0b3IgPSBzZWxlY3RvciArICcsICcgKyBzZWxlY3RvcisnLScrc2VsZi50eXBlO1xuXG4gICAgICAgICAgICAvL1NlbGVjdCAkd3JhcHBlcnMgd2l0aCB0aGUgcmlnaHQgbGlzdGVuZXIgY2xhc3MgaW4gdGhlIHJpZ2h0IGRpcmVjdGlvblxuICAgICAgICAgICAgdmFyICRlbHMgPSBqcUZ1bmMgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqcUZ1bmMuanF1ZXJ5ID8ganFGdW5jIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi4kd3JhcHBlcltqcUZ1bmNdKHNlbGVjdG9yKSA6ICQoc2VsZWN0b3IpO1xuXG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTwkZWxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy9HZXQgdGhlIGFjdHVhbCBzdWJ2aWV3XG4gICAgICAgICAgICAgICAgdmFyIHJlY2lwaWVudCA9IHN1YnZpZXcoJGVsc1tpXSk7XG5cbiAgICAgICAgICAgICAgICAvL0NoZWNrIGZvciBhIHN1YnZpZXcgdHlwZSBzcGVjaWZpYyBjYWxsYmFja1xuICAgICAgICAgICAgICAgIHZhciB0eXBlZENhbGxiYWNrID0gcmVjaXBpZW50Lmxpc3RlbmVyc1tkaXJlY3Rpb24gKyBcIjpcIiArIG5hbWUgKyBcIjpcIiArIHNlbGYudHlwZV07XG4gICAgICAgICAgICAgICAgaWYodHlwZWRDYWxsYmFjayAmJiB0eXBlZENhbGxiYWNrLmFwcGx5KHJlY2lwaWVudCwgYXJncykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlOyAvL0JyZWFrcyBpZiBjYWxsYmFjayByZXR1cm5zIGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy9DaGVjayBmb3IgYSBnZW5lcmFsIGV2ZW50IGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgdmFyIHVudHlwZWRDYWxsYmFjayA9IHJlY2lwaWVudC5saXN0ZW5lcnNbZGlyZWN0aW9uICsgXCI6XCIgKyBuYW1lXTtcbiAgICAgICAgICAgICAgICBpZih1bnR5cGVkQ2FsbGJhY2sgJiYgdW50eXBlZENhbGxiYWNrLmFwcGx5KHJlY2lwaWVudCwgYXJncykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlOyAvL0JyZWFrcyBpZiBjYWxsYmFjayByZXR1cm5zIGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgX2JpbmRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJC5lYWNoKHRoaXMubGlzdGVuZXJzLCBmdW5jdGlvbihldmVudHMsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgICAgIC8vUGFyc2UgdGhlIGV2ZW50IGZvcm1hdCBcIlt2aWV3IHR5cGVdOltldmVudCBuYW1lXSwgW3ZpZXcgdHlwZV06W2V2ZW50IG5hbWVdXCJcblxuICAgICAgICAgICAgZXZlbnRzID0gZXZlbnRzLnNwbGl0KCcsJyk7XG4gICAgICAgICAgICB2YXIgaSA9IGV2ZW50cy5sZW5ndGg7XG5cbiAgICAgICAgICAgIHdoaWxlKGktLSkge1xuICAgICAgICAgICAgICAgIHZhciBldmVudCAgICAgICA9IGV2ZW50c1tpXS5yZXBsYWNlKC8gL2csICcnKSxcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRQYXJ0cyAgPSBldmVudC5zcGxpdCgnOicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHZhciBkaXJlY3Rpb24gPSBldmVudFBhcnRzWzBdLFxuICAgICAgICAgICAgICAgICAgICBuYW1lICAgICAgPSBldmVudFBhcnRzWzFdLFxuICAgICAgICAgICAgICAgICAgICB2aWV3VHlwZSAgPSBldmVudFBhcnRzWzJdIHx8IG51bGw7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy9BZGQgdGhlIGxpc3RlbmVyIGNsYXNzXG4gICAgICAgICAgICAgICAgaWYoZGlyZWN0aW9uICE9ICdzZWxmJykge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiR3cmFwcGVyLmFkZENsYXNzKCdsaXN0ZW5lci0nICsgZGlyZWN0aW9uICsgJy0nICsgbmFtZSArICh2aWV3VHlwZSA/ICctJyArIHZpZXdUeXBlIDogJycpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvL0ZpeCB0aGUgbGlzdGVuZXJzIGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgc2VsZi5saXN0ZW5lcnNbZXZlbnRdID0gY2FsbGJhY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKioqIENsYXNzZXMgKioqL1xuICAgIF9hY3RpdmU6IGZhbHNlLFxuICAgIF9zdWJ2aWV3Q3NzQ2xhc3M6ICdzdWJ2aWV3JyxcbiAgICBfYWRkRGVmYXVsdENsYXNzZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY2xhc3NlcyA9IFtdO1xuXG4gICAgICAgIGNsYXNzZXMucHVzaCh0aGlzLl9zdWJ2aWV3Q3NzQ2xhc3MgKyAnLScgKyB0aGlzLnR5cGUpO1xuXG4gICAgICAgIHZhciBzdXBlckNsYXNzID0gdGhpcy5zdXBlcjtcbiAgICAgICAgd2hpbGUodHJ1ZSkge1xuICAgICAgICAgICAgaWYoc3VwZXJDbGFzcy50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKHRoaXMuX3N1YnZpZXdDc3NDbGFzcyArICctJyArIHN1cGVyQ2xhc3MudHlwZSk7XG4gICAgICAgICAgICAgICAgc3VwZXJDbGFzcyA9IHN1cGVyQ2xhc3Muc3VwZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vQWRkIERlZmF1bHQgVmlldyBDbGFzc1xuICAgICAgICBjbGFzc2VzLnB1c2godGhpcy5fc3Vidmlld0Nzc0NsYXNzKTtcblxuICAgICAgICAvL0FkZCBjbGFzc2VzIHRvIHRoZSBET01cbiAgICAgICAgdGhpcy4kd3JhcHBlci5hZGRDbGFzcyhjbGFzc2VzLmpvaW4oJyAnKSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8qKiogRXh0ZW5zaW9ucyAqKiovXG4gICAgX2xvYWRFeHRlbnNpb25zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAkLmVhY2godGhpcywgZnVuY3Rpb24obmFtZSwgcHJvcCkge1xuICAgICAgICAgICAgaWYocHJvcC5faXNTdWJ2aWV3RXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgc2VsZltuYW1lXSA9IHByb3Aoc2VsZik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7XG5cbiIsInZhciAkID0gcmVxdWlyZShcInVub3BpbmlvbmF0ZVwiKS5zZWxlY3RvcjtcblxudmFyIFZpZXdQb29sID0gZnVuY3Rpb24oVmlldykge1xuICAgIC8vQ29uZmlndXJhdGlvblxuICAgIHRoaXMuVmlldyAgID0gVmlldztcbiAgICB0aGlzLnR5cGUgICA9IFZpZXcucHJvdG90eXBlLnR5cGU7XG4gICAgdGhpcy5zdXBlciAgPSBWaWV3LnByb3RvdHlwZS5zdXBlcjtcbiAgICBcbiAgICAvL1ZpZXcgQ29uZmlndXJhdGlvblxuICAgIHRoaXMuVmlldy5wcm90b3R5cGUucG9vbCA9IHRoaXM7XG5cbiAgICAvL1Bvb2xcbiAgICB0aGlzLnBvb2wgPSBbXTtcbn07XG5cblZpZXdQb29sLnByb3RvdHlwZSA9IHtcbiAgICBpc1ZpZXdQb29sOiB0cnVlLFxuICAgIHNwYXduOiBmdW5jdGlvbihlbCwgY29uZmlnKSB7XG4gICAgICAgIC8valF1ZXJ5IG5vcm1hbGl6YXRpb25cbiAgICAgICAgdmFyICRlbCA9IGVsID8gKGVsLmpxdWVyeSA/IGVsIDogJChlbCkpOiBudWxsO1xuICAgICAgICBlbCA9IGVsICYmIGVsLmpxdWVyeSA/IGVsWzBdIDogZWw7XG5cbiAgICAgICAgLy9Bcmd1bWVudCBzdXJnZXJ5XG4gICAgICAgIGlmKGVsICYmIGVsLnZpZXcpIHtcbiAgICAgICAgICAgIHJldHVybiBlbC52aWV3O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZpZXc7XG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwgKCQuaXNQbGFpbk9iamVjdChlbCkgPyBlbCA6IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vR2V0IHRoZSBET00gbm9kZVxuICAgICAgICAgICAgaWYoIWVsIHx8ICFlbC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgIGlmKHRoaXMucG9vbC5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmlldyA9IHRoaXMucG9vbC5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLlZpZXcucHJvdG90eXBlLnRhZ05hbWUpO1xuICAgICAgICAgICAgICAgICAgICAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpc05ld1ZpZXc7XG4gICAgICAgICAgICBpZighdmlldykge1xuICAgICAgICAgICAgICAgIGlzTmV3VmlldyAgID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2aWV3ICAgICAgICA9IG5ldyB0aGlzLlZpZXcoKTtcblxuICAgICAgICAgICAgICAgIC8vQmluZCB0by9mcm9tIHRoZSBlbGVtZW50XG4gICAgICAgICAgICAgICAgZWxbc3Vidmlldy5fZG9tUHJvcGVydHlOYW1lXSA9IHZpZXc7XG4gICAgICAgICAgICAgICAgdmlldy53cmFwcGVyICA9IGVsO1xuICAgICAgICAgICAgICAgIHZpZXcuJHdyYXBwZXIgPSAkZWw7XG5cbiAgICAgICAgICAgICAgICB2aWV3Ll9hZGREZWZhdWx0Q2xhc3NlcygpO1xuICAgICAgICAgICAgICAgIHZpZXcuX2JpbmRMaXN0ZW5lcnMoKTtcbiAgICAgICAgICAgICAgICB2aWV3Ll9sb2FkRXh0ZW5zaW9ucygpO1xuXG4gICAgICAgICAgICAgICAgdmlldy5vbmNlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vTWFrZSB0aGUgdmlldyBhY3RpdmVcbiAgICAgICAgICAgIHZpZXcuX2FjdGl2ZSA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vUmVuZGVyXG4gICAgICAgICAgICBpZihpc05ld1ZpZXcgfHwgdmlldy5yZVJlbmRlcikge1xuICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vSW5pdGlhbGl6ZVxuICAgICAgICAgICAgdmlldy5pbml0KGNvbmZpZyk7XG5cbiAgICAgICAgICAgIHJldHVybiB2aWV3O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBleHRlbmQ6IGZ1bmN0aW9uKG5hbWUsIGNvbmZpZykge1xuICAgICAgICByZXR1cm4gc3VidmlldyhuYW1lLCB0aGlzLCBjb25maWcpO1xuICAgIH0sXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMucG9vbCA9IG51bGw7XG4gICAgICAgIGRlbGV0ZSBzdWJ2aWV3LnZpZXdzW3RoaXMudHlwZV07XG4gICAgfSxcblxuICAgIF9yZWxlYXNlOiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgIHZpZXcuX2FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnBvb2wucHVzaCh2aWV3KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3UG9vbDtcbiIsInZhciBfICAgICAgICAgICAgICAgPSByZXF1aXJlKFwidW5kZXJzY29yZVwiKSxcbiAgICBsb2cgICAgICAgICAgICAgPSByZXF1aXJlKFwibG9nbGV2ZWxcIiksXG4gICAgJCAgICAgICAgICAgICAgID0gcmVxdWlyZShcInVub3BpbmlvbmF0ZVwiKS5zZWxlY3RvcixcbiAgICBWaWV3UG9vbCAgICAgICAgPSByZXF1aXJlKFwiLi9WaWV3UG9vbFwiKSxcbiAgICBWaWV3VGVtcGxhdGUgICAgPSByZXF1aXJlKFwiLi9WaWV3XCIpLFxuICAgIG5vb3AgICAgICAgICAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgdmlld1R5cGVSZWdleCAgID0gbmV3IFJlZ0V4cCgnXicgKyBWaWV3VGVtcGxhdGUucHJvdG90eXBlLl9zdWJ2aWV3Q3NzQ2xhc3MgKyAnLScpO1xuXG52YXIgc3VidmlldyA9IGZ1bmN0aW9uKG5hbWUsIHByb3RvVmlld1Bvb2wsIGNvbmZpZykge1xuICAgIHZhciBWaWV3UHJvdG90eXBlO1xuXG4gICAgaWYoIW5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vUmV0dXJuIFZpZXcgb2JqZWN0IGZyb20gRE9NIGVsZW1lbnRcbiAgICBlbHNlIGlmKG5hbWUubm9kZVR5cGUgfHwgbmFtZS5qcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIChuYW1lLmpxdWVyeSA/IG5hbWVbMF0gOiBuYW1lKVtzdWJ2aWV3Ll9kb21Qcm9wZXJ0eU5hbWVdIHx8IG51bGw7XG4gICAgfVxuICAgIC8vRGVmaW5lIGEgc3Vidmlld1xuICAgIGVsc2Uge1xuICAgICAgICAvL0FyZ3VtZW50IHN1cmdlcnlcbiAgICAgICAgaWYocHJvdG9WaWV3UG9vbCAmJiBwcm90b1ZpZXdQb29sLmlzVmlld1Bvb2wpIHtcbiAgICAgICAgICAgIFZpZXdQcm90b3R5cGUgPSBwcm90b1ZpZXdQb29sLlZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25maWcgICAgICAgICAgPSBwcm90b1ZpZXdQb29sO1xuICAgICAgICAgICAgVmlld1Byb3RvdHlwZSAgID0gVmlld1RlbXBsYXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXG4gICAgICAgIC8vVmFsaWRhdGUgTmFtZSAmJiBDb25maWd1cmF0aW9uXG4gICAgICAgIGlmKHN1YnZpZXcuX3ZhbGlkYXRlTmFtZShuYW1lKSAmJiBzdWJ2aWV3Ll92YWxpZGF0ZUNvbmZpZyhjb25maWcpKSB7XG4gICAgICAgICAgICAvL0NyZWF0ZSB0aGUgbmV3IFZpZXdcbiAgICAgICAgICAgIHZhciBWaWV3ICAgICAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICAgICAgICAgICAgc3VwZXJDbGFzcyAgPSBuZXcgVmlld1Byb3RvdHlwZSgpO1xuXG4gICAgICAgICAgICAvL0V4dGVuZCB0aGUgZXhpc3RpbmcgaW5pdCwgY29uZmlnICYgY2xlYW4gZnVuY3Rpb25zIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZW1cbiAgICAgICAgICAgIF8uZWFjaChbJ29uY2UnLCAnaW5pdCcsICdjbGVhbiddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnW25hbWUrJ0Z1bmN0aW9ucyddID0gc3VwZXJDbGFzc1tuYW1lKydGdW5jdGlvbnMnXS5zbGljZSgwKTsgLy9DbG9uZSBzdXBlckNsYXNzIGluaXRcbiAgICAgICAgICAgICAgICBpZihjb25maWdbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnW25hbWUrJ0Z1bmN0aW9ucyddLnB1c2goY29uZmlnW25hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbmZpZ1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy9FeHRlbmQgdGhlIGxpc3RlbmVycyBvYmplY3RcbiAgICAgICAgICAgIGlmKGNvbmZpZy5saXN0ZW5lcnMpIHtcbiAgICAgICAgICAgICAgICAkLmVhY2goc3VwZXJDbGFzcy5saXN0ZW5lcnMsIGZ1bmN0aW9uKGV2ZW50LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgICBpZihjb25maWcubGlzdGVuZXJzW2V2ZW50XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9FeHRlbmQgdGhlIGZ1bmN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWcubGlzdGVuZXJzW2V2ZW50XSA9IChmdW5jdGlvbihvbGRDYWxsYmFjaywgbmV3Q2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG9sZENhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXdDYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KShjb25maWcubGlzdGVuZXJzW2V2ZW50XSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLmxpc3RlbmVyc1tldmVudF0gPSBjYWxsYmFjaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0J1aWxkIFRoZSBuZXcgdmlld1xuICAgICAgICAgICAgVmlldy5wcm90b3R5cGUgICAgICAgPSBfLmV4dGVuZChzdXBlckNsYXNzLCBjb25maWcpO1xuICAgICAgICAgICAgVmlldy5wcm90b3R5cGUudHlwZSAgPSBuYW1lO1xuICAgICAgICAgICAgVmlldy5wcm90b3R5cGUuc3VwZXIgPSBWaWV3UHJvdG90eXBlLnByb3RvdHlwZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9TYXZlIHRoZSBOZXcgVmlld1xuICAgICAgICAgICAgdmFyIHZpZXdQb29sICAgICAgICA9IG5ldyBWaWV3UG9vbChWaWV3KTtcbiAgICAgICAgICAgIHN1YnZpZXcudmlld3NbbmFtZV0gPSB2aWV3UG9vbDtcblxuICAgICAgICAgICAgcmV0dXJuIHZpZXdQb29sO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5zdWJ2aWV3LnZpZXdzID0ge307XG5cbi8vT2JzY3VyZSBET00gcHJvcGVydHkgbmFtZSBmb3Igc3VidmlldyB3cmFwcGVyc1xuc3Vidmlldy5fZG9tUHJvcGVydHlOYW1lID0gXCJzdWJ2aWV3MTIzNDVcIjtcblxuLyoqKiBBUEkgKioqL1xuc3Vidmlldy5sb2FkID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICB2YXIgJHNjb3BlID0gc2NvcGUgPyAkKHNjb3BlKSA6ICQoJ2JvZHknKSxcbiAgICAgICAgJHZpZXdzID0gJHNjb3BlLmZpbmQoXCJbY2xhc3NePSdzdWJ2aWV3LSddXCIpLFxuICAgICAgICBmaW5kZXIgPSBmdW5jdGlvbihjKSB7XG4gICAgICAgICAgICByZXR1cm4gYy5tYXRjaCh2aWV3VHlwZVJlZ2V4KTtcbiAgICAgICAgfTtcblxuICAgIGZvcih2YXIgaT0wOyBpPCR2aWV3cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZWwgPSAkdmlld3NbaV0sXG4gICAgICAgICAgICBjbGFzc2VzID0gZWwuY2xhc3NOYW1lLnNwbGl0KC9cXHMrLyk7XG5cbiAgICAgICAgdHlwZSA9ICBfLmZpbmQoY2xhc3NlcywgZmluZGVyKS5yZXBsYWNlKHZpZXdUeXBlUmVnZXgsICcnKTtcblxuICAgICAgICBpZih0eXBlICYmIHRoaXMudmlld3NbdHlwZV0pIHtcbiAgICAgICAgICAgIHRoaXMudmlld3NbdHlwZV0uc3Bhd24oJHZpZXdzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihcInN1YnZpZXcgJ1wiK3R5cGUrXCInIGlzIG5vdCBkZWZpbmVkLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuc3Vidmlldy5sb29rdXAgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYodHlwZW9mIG5hbWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlld3NbbmFtZV07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZihuYW1lLmlzVmlld1Bvb2wpIHtcbiAgICAgICAgICAgIHJldHVybiBuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYobmFtZS5pc1ZpZXcpIHtcbiAgICAgICAgICAgIHJldHVybiBuYW1lLnBvb2w7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuc3Vidmlldy5fdmFsaWRhdGVOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGlmKCFuYW1lLm1hdGNoKC9eW2EtekEtWjAtOVxcLV9dKyQvKSkge1xuICAgICAgICBsb2cuZXJyb3IoXCJzdWJ2aWV3IG5hbWUgJ1wiICsgbmFtZSArIFwiJyBpcyBub3QgYWxwaGFudW1lcmljLlwiKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmKHN1YnZpZXcudmlld3NbbmFtZV0pIHtcbiAgICAgICAgbG9nLmVycm9yKFwic3VidmlldyAnXCIgKyBuYW1lICsgXCInIGlzIGFscmVhZHkgZGVmaW5lZC5cIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnN1YnZpZXcuX3Jlc2VydmVkTWV0aG9kcyA9IFtcbiAgICAnaHRtbCcsXG4gICAgJ3JlbW92ZScsXG4gICAgJ3BhcmVudCcsXG4gICAgJ2NoaWxkcmVuJyxcbiAgICAnbmV4dCcsXG4gICAgJ3ByZXYnLFxuICAgICd0cmlnZ2VyJyxcbiAgICAndHJhdmVyc2UnLFxuICAgICckJyxcbiAgICAnX2JpbmRMaXN0ZW5lcnMnLFxuICAgICdfYWN0aXZlJyxcbiAgICAnX3N1YnZpZXdDc3NDbGFzcycsXG4gICAgJ19hZGREZWZhdWx0Q2xhc3Nlcydcbl07XG5cbnN1YnZpZXcuX3ZhbGlkYXRlQ29uZmlnID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgdmFyIHN1Y2Nlc3MgPSB0cnVlO1xuXG4gICAgJC5lYWNoKGNvbmZpZywgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICAgICAgaWYoc3Vidmlldy5fcmVzZXJ2ZWRNZXRob2RzLmluZGV4T2YobmFtZSkgIT0gLTEpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihcIk1ldGhvZCAnXCIrbmFtZStcIicgaXMgcmVzZXJ2ZWQgYXMgcGFydCBvZiB0aGUgc3VidmlldyBBUEkuXCIpO1xuICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3VjY2Vzcztcbn07XG5cbnN1YnZpZXcuaW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBNYWluID0gc3Vidmlldy5sb29rdXAoJ21haW4nKTtcblxuICAgIGlmKE1haW4pIHtcbiAgICAgICAgc3Vidmlldy5tYWluID0gTWFpbi5zcGF3bigpO1xuICAgICAgICBzdWJ2aWV3Lm1haW4uJHdyYXBwZXIuYXBwZW5kVG8oJ2JvZHknKTtcbiAgICB9XG59O1xuXG4vKioqIEV4dGVuc2lvbnMgKioqL1xuc3Vidmlldy5leHRlbnNpb24gPSBmdW5jdGlvbihleHRlbnNpb25Db25maWcpIHtcbiAgICAvL1RoZSBBY3R1YWwgRXh0ZW5zaW9uIERlZmluaXRpb25cbiAgICB2YXIgRXh0ZW5zaW9uID0gZnVuY3Rpb24odXNlckNvbmZpZywgdmlldykge1xuICAgICAgICB0aGlzLnZpZXcgICA9IHZpZXc7XG4gICAgICAgIHRoaXMuY29uZmlnID0gdXNlckNvbmZpZztcbiAgICB9O1xuXG4gICAgRXh0ZW5zaW9uLnByb3RvdHlwZSA9IGV4dGVuc2lvbkNvbmZpZztcblxuICAgIGlmKCFFeHRlbnNpb24ucHJvdG90eXBlLmluaXQpIEV4dGVuc2lvbi5wcm90b3R5cGUuaW5pdCA9IG5vb3A7XG5cbiAgICAvLyBUaGlzIGZ1bmN0aW9uIGdldHMgY2FsbGVkIGJ5IHRoZSB1c2VyIHRvIHBhc3MgaW4gdGhlaXIgY29uZmlndXJhdGlvblxuICAgIHJldHVybiBmdW5jdGlvbih1c2VyQ29uZmlnKSB7XG5cbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgaW4gdmlldy5fbG9hZEV4dGVuc2lvbnNcbiAgICAgICAgdmFyIEV4dGVuc2lvbkZhY3RvcnkgPSBmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgICAgICB2YXIgZXh0ZW5zaW9uID0gbmV3IEV4dGVuc2lvbih1c2VyQ29uZmlnLCB2aWV3KTtcblxuICAgICAgICAgICAgLy9Jbml0aWFsaXplIHRoZSBleHRlbnNpb25cbiAgICAgICAgICAgIGV4dGVuc2lvbi5pbml0LmFwcGx5KGV4dGVuc2lvbiwgW3VzZXJDb25maWcsIHZpZXddKTtcblxuICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbjtcbiAgICAgICAgfTtcblxuICAgICAgICBFeHRlbnNpb25GYWN0b3J5Ll9pc1N1YnZpZXdFeHRlbnNpb24gPSB0cnVlO1xuXG4gICAgICAgIHJldHVybiBFeHRlbnNpb25GYWN0b3J5O1xuICAgIH07XG59O1xuXG4vKioqIEV4cG9ydCAqKiovXG53aW5kb3cuc3VidmlldyA9IG1vZHVsZS5leHBvcnRzID0gc3VidmlldztcblxuJChmdW5jdGlvbigpIHtcbiAgICBpZighc3Vidmlldy5ub0luaXQpIHtcbiAgICAgICAgc3Vidmlldy5pbml0KCk7XG4gICAgfVxufSk7XG4iLCJ2YXIgc2lub24gICA9IHJlcXVpcmUoJ3Npbm9uJyksXG4gICAgXyAgICAgICA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgICAkICAgICAgID0gcmVxdWlyZShcInVub3BpbmlvbmF0ZVwiKS5zZWxlY3RvcixcbiAgICBtb2R1bGUgID0gd2luZG93Lm1vZHVsZSxcbiAgICBzdWJ2aWV3ID0gcmVxdWlyZSgnLi4vc3JjL21haW4nKSxcbiAgICBub29wICAgID0gZnVuY3Rpb24oKSB7fSxcbiAgICBIYW5kbGViYXJzID0gcmVxdWlyZShcImhhbmRsZWJhcnNcIiksXG4gICAgc2FuZGJveDtcblxudmFyIHRlc3RTdWJ2aWV3ID0gc3VidmlldygndGVzdCcpO1xuXG4vKioqIHN1YnZpZXcgT2JqZWN0ICoqKi9cblxubW9kdWxlKFwic3Vidmlld1wiKTtcblxudGVzdCgnc3VidmlldygpIGdldCB2aWV3IGZyb20gbm9kZScsIGZ1bmN0aW9uKCkge1xuICAgIGRlZXBFcXVhbChzdWJ2aWV3KCQoJ2JvZHknKVswXSksIG51bGwsICdFbGVtZW50IHdpdGhvdXQgYm91bmQgdmlldycpO1xuICAgIGRlZXBFcXVhbChzdWJ2aWV3KCQoJ2JvZHknKSksIG51bGwsICdKcXVlcnkgb2JqZWN0cyB3b3JrJyk7XG5cbiAgICB2YXIgdGVzdGVyID0gdGVzdFN1YnZpZXcuc3Bhd24oKTtcbiAgICBkZWVwRXF1YWwoc3Vidmlldyh0ZXN0ZXIud3JhcHBlciksIHRlc3RlciwgJ1JldHVybnMgY29ycmVjdCBlbGVtZW50Jyk7XG59KTtcblxudGVzdCgnc3VidmlldygpIGRlZmluZSBzdWJ2aWV3JywgZnVuY3Rpb24oKSB7XG4gICAgb2soIXN1YnZpZXcoJ3Rlc3QnKSwgXCJJbnZhbGlkIHN1YnZpZXcgZGVmaW5pdGlvblwiKTtcblxuICAgIHZhciB0ZXN0ZXIgPSBzdWJ2aWV3KCd0ZXN0ZXInKTtcbiAgICBvayh0ZXN0ZXIsIFwiU3VidmlldyBzdWNjZXNzZnVsbHkgY3JlYXRlZFwiKTtcbiAgICBkZWVwRXF1YWwodGVzdGVyLCBzdWJ2aWV3LnZpZXdzLnRlc3RlciwgXCJTdWJ2aWV3IHN1Y2Nlc3NmdWxseSByZWdpc3RlcmVkXCIpO1xuXG4gICAgb2sodGVzdGVyLnN1cGVyLCBcIlN1cGVyIGlzIGJvdW5kIHRvIHRoZSB2aWV3XCIpO1xuXG4gICAgdmFyIHN1YlRlc3RlciA9IHN1YnZpZXcoJ3N1YnRlc3RlcicsIHRlc3Rlcik7XG4gICAgZXF1YWwoc3ViVGVzdGVyLnN1cGVyLnR5cGUsIFwidGVzdGVyXCIsIFwiU3ViVGVzdGVyIGV4dGVuZHMgdGVzdGVyXCIpO1xuXG4gICAgLy9jbGVhbnVwXG4gICAgdGVzdGVyLmRlc3Ryb3koKTtcbiAgICBzdWJUZXN0ZXIuZGVzdHJveSgpO1xufSk7XG5cbnRlc3QoJyNsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyICR0ZXN0ZXIgPSAkKFwiPGRpdiBjbGFzcz0nc3Vidmlldy10ZXN0Jz5cIikuYXBwZW5kVG8oJ2JvZHknKTtcbiAgICBzdWJ2aWV3LmxvYWQoKTtcbiAgICBvayhzdWJ2aWV3KCR0ZXN0ZXIpLCBcIlZpZXcgd2FzIHN1Y2Nlc3NmdWxseSBjcmVhdGVkXCIpO1xuXG4gICAgdmFyICR0ZXN0ZXIyID0gJChcIjxkaXYgY2xhc3M9J3N1YnZpZXctdGVzdCc+XCIpLmFwcGVuZFRvKCdib2R5Jyk7XG4gICAgc3Vidmlldy5sb2FkKCdib2R5Jyk7XG4gICAgb2soc3VidmlldygkdGVzdGVyMiksIFwiU2NvcGVkIGxvYWRpbmcgd2FzIHN1Y2Nlc3NmdWxcIik7XG59KTtcblxudGVzdCgnI2xvb2t1cCcsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBUZXN0ZXIgPSBzdWJ2aWV3KCd0ZXN0ZXInKTtcblxuICAgIGRlZXBFcXVhbChzdWJ2aWV3Lmxvb2t1cCgndGVzdGVyJyksIFRlc3RlciwgXCJTdHJpbmcgbG9va3VwXCIpO1xuICAgIGRlZXBFcXVhbChzdWJ2aWV3Lmxvb2t1cChUZXN0ZXIpLCBUZXN0ZXIsIFwiVmlld1Bvb2wgbG9va3VwXCIpO1xuXG4gICAgdmFyIHRlc3RlciA9IFRlc3Rlci5zcGF3bigpO1xuICAgIGRlZXBFcXVhbChzdWJ2aWV3Lmxvb2t1cCh0ZXN0ZXIpLCBUZXN0ZXIsIFwidmlldyBsb29rdXBcIik7XG5cbiAgICBkZWVwRXF1YWwoc3Vidmlldy5sb29rdXAoe30pLCB1bmRlZmluZWQsIFwicmFuZG9tIGxvb2t1cFwiKTtcbiAgICBkZWVwRXF1YWwoc3Vidmlldy5sb29rdXAoXCJkb2VzLW5vdC1leGlzdFwiKSwgdW5kZWZpbmVkLCBcIlVuZGVmaW5lZCBzdHJpbmcgbG9va3VwXCIpO1xuXG4gICAgVGVzdGVyLmRlc3Ryb3koKTtcbn0pO1xuXG50ZXN0KCcjX3ZhbGlkYXRlTmFtZScsIGZ1bmN0aW9uKCkge1xuICAgIG9rKHN1YnZpZXcuX3ZhbGlkYXRlTmFtZShcIkZvbzFcIiksIFwiQmFzZSBDYXNlXCIpO1xuICAgIG9rKCFzdWJ2aWV3Ll92YWxpZGF0ZU5hbWUoXCJGb28lXCIpLCBcIkludmFsaWQgY2hhcmFjdGVyc1wiKTtcbiAgICBvayghc3Vidmlldy5fdmFsaWRhdGVOYW1lKFwidGVzdFwiKSwgXCJQcmUtZXhpc3Rpbmcgdmlld1wiKTtcbn0pO1xuXG50ZXN0KCcjX3ZhbGlkYXRlQ29uZmlnJywgZnVuY3Rpb24oKSB7XG4gICAgb2soc3Vidmlldy5fdmFsaWRhdGVDb25maWcoe1xuICAgICAgICBpbml0OiBub29wXG4gICAgfSksIFwiVmFsaWQgQ29uZmlnXCIpO1xuXG4gICAgb2soIXN1YnZpZXcuX3ZhbGlkYXRlQ29uZmlnKHtcbiAgICAgICAgaW5pdDogbm9vcCxcbiAgICAgICAgcmVtb3ZlOiBub29wXG4gICAgfSksIFwiUmVzZXJ2ZWQgTWV0aG9kIHByZXNlbnRcIik7XG59KTtcblxudGVzdCgnI2luaXQnLCBmdW5jdGlvbigpIHtcbiAgICBzdWJ2aWV3KCdtYWluJyk7XG4gICAgc3Vidmlldy5pbml0KCk7XG4gICAgb2soJCgnLnN1YnZpZXctbWFpbicpLmxlbmd0aCwgXCJUaGUgbWFpbiB2aWV3IGlzIGFkZGVkIHRvIHRoZSBkb2N1bWVudFwiKTtcbn0pO1xuXG50ZXN0KCcjZXh0ZW5zaW9uJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyIEV4dGVuc2lvbiA9IHN1YnZpZXcuZXh0ZW5zaW9uKHtcbiAgICAgICAgZm9vOiBub29wXG4gICAgfSk7XG5cbiAgICB2YXIgRXh0ZW5zaW9uRmFjdG9yeSA9IEV4dGVuc2lvbignY29uZmlnJyk7XG4gICAgb2soJC5pc0Z1bmN0aW9uKEV4dGVuc2lvbkZhY3RvcnkpLCBcIkV4dGVuc2lvbiBGYWN0b3J5IENyZWF0ZWRcIik7XG5cbiAgICBvayhFeHRlbnNpb25GYWN0b3J5Ll9pc1N1YnZpZXdFeHRlbnNpb24sIFwiSGFzIGV4dGVuc2lvbiBpZGVudGlmaWVyIGF0dHJpYnV0ZVwiKTtcblxuICAgIHZhciBleHRlbnNpb24gPSBFeHRlbnNpb25GYWN0b3J5KCd2aWV3Jyk7XG4gICAgb2soZXh0ZW5zaW9uLCBcIkV4dGVuc2lvbiBpbml0aWFsaXplZC5cIik7XG4gICAgb2soJC5pc0Z1bmN0aW9uKGV4dGVuc2lvbi5mb28pLCBcIkV4dGVuc2lvbiBoYXMgbWV0aG9kIGZvb1wiKTtcbiAgICBlcXVhbChleHRlbnNpb24udmlldywgJ3ZpZXcnLCBcIlZpZXcgaXMgYm91bmQgdG8gdGhlIGV4dGVuc2lvblwiKTtcbiAgICBlcXVhbChleHRlbnNpb24uY29uZmlnLCAnY29uZmlnJywgXCJDb25maWcgaXMgYm91bmQgdG8gdGhlIGV4dGVuc2lvblwiKTtcbn0pO1xuXG4vKioqIFZpZXdQb29sICoqKi9cbnZhciB2aWV3UG9vbDtcbm1vZHVsZShcIlZpZXdQb29sXCIsIHtcbiAgICBzZXR1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHNhbmRib3ggPSBzaW5vbi5zYW5kYm94LmNyZWF0ZSgpO1xuICAgICAgICB2aWV3UG9vbCA9IHN1YnZpZXcoXCJ0ZXN0ZXJcIik7XG4gICAgfSxcbiAgICB0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZpZXdQb29sLmRlc3Ryb3koKTtcbiAgICB9XG59KTtcblxudGVzdChcIiNpc1ZpZXdQb29sXCIsIGZ1bmN0aW9uKCkge1xuICAgIG9rKHZpZXdQb29sLmlzVmlld1Bvb2wpO1xufSk7XG5cbnRlc3QoXCIjc3Bhd25cIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXcgPSB2aWV3UG9vbC5zcGF3bigpO1xuICAgIG9rKHZpZXcsIFwiVmlldyBjcmVhdGVkXCIpO1xuXG4gICAgdmFyICRkaXYgPSAkKFwiPGRpdj5cIik7XG4gICAgdmlldyA9IHZpZXdQb29sLnNwYXduKCRkaXZbMF0pO1xuICAgIGRlZXBFcXVhbCh2aWV3LndyYXBwZXIsICRkaXZbMF0sIFwiRWxlbWVudHMgcGFzc2VkIHRvIHNwYXduIGJlY29tZSB0aGUgd3JhcHBlclwiKTtcblxuICAgICRkaXYgPSAkKFwiPGRpdj5cIik7XG4gICAgdmlldyA9IHZpZXdQb29sLnNwYXduKCRkaXYpO1xuICAgIGRlZXBFcXVhbCh2aWV3LndyYXBwZXIsICRkaXZbMF0sIFwialF1ZXJ5IGVsZW1lbnRzIHBhc3NlZCB0byBzcGF3biBiZWNvbWUgdGhlIHdyYXBwZXJcIik7XG5cbiAgICB2YXIgc2FtZVZpZXcgPSB2aWV3UG9vbC5zcGF3bigkZGl2KTtcbiAgICBkZWVwRXF1YWwodmlldywgc2FtZVZpZXcsIFwiUmV0dXJucyBleGlzdGluZyB2aWV3IHdoZW4gdGhlIHNhbWUgZWxlbWVudCBpcyBwYXNzZWQgYmFja1wiKTtcblxuICAgIC8vVGVzdCB0aGF0IGNvbmZpZ3VyYXRpb24gZ2V0cyBwYXNzZWQgdG8gaW5pdCBmdW5jdGlvblxuICAgIHZhciBpbml0U3B5ICAgPSBzaW5vbi5zcHkoKSxcbiAgICAgICAgY29uZmlnICAgID0ge3Rlc3Q6IDF9LFxuICAgICAgICBwb29sICAgICAgPSBzdWJ2aWV3KFwiYW5vdGhlclBvb2xcIiwge1xuICAgICAgICAgICAgaW5pdDogaW5pdFNweVxuICAgICAgICB9KTtcblxuXG4gICAgcG9vbC5zcGF3bigkKFwiPGRpdj5cIiksIGNvbmZpZyk7XG4gICAgb2soaW5pdFNweS5jYWxsZWRXaXRoKGNvbmZpZyksIFwiQ29uZmlnIHdpdGgganF1ZXJ5IHdvcmtzXCIpO1xuICAgIGluaXRTcHkucmVzZXQoKTtcblxuICAgIHBvb2wuc3Bhd24oJChcIjxkaXY+XCIpWzBdLCBjb25maWcpO1xuICAgIG9rKGluaXRTcHkuY2FsbGVkV2l0aChjb25maWcpLCBcIkNvbmZpZyB3aXRoIERPTSB3b3Jrc1wiKTtcbiAgICBpbml0U3B5LnJlc2V0KCk7XG5cbiAgICBwb29sLnNwYXduKGNvbmZpZyk7XG4gICAgb2soaW5pdFNweS5jYWxsZWRXaXRoKGNvbmZpZyksIFwiQ29uZmlnIHdpdGggbm8gZWxlbWVudCB3b3Jrc1wiKTtcblxuICAgIHBvb2wuZGVzdHJveSgpO1xuXG59KTtcblxudGVzdChcIiNleHRlbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN1YlRlc3RlciA9IHZpZXdQb29sLmV4dGVuZCgnc3ViVGVzdGVyJyk7XG4gICAgZXF1YWwoc3ViVGVzdGVyLnN1cGVyLnR5cGUsIFwidGVzdGVyXCIsIFwiU3ViVGVzdGVyIGV4dGVuZHMgdGVzdGVyXCIpO1xuICAgIHN1YlRlc3Rlci5kZXN0cm95KCk7XG59KTtcblxudGVzdChcIiNkZXN0cm95XCIsIGZ1bmN0aW9uKCkge1xuICAgIHZpZXdQb29sLmRlc3Ryb3koKTtcbiAgICBvayhzdWJ2aWV3KFwidGVzdGVyXCIpLCBcIk5hbWVzcGFjZSBpcyBmcmVlZFwiKTtcbiAgICBvayghdmlld1Bvb2wucG9vbCwgXCJQb29sIGlzIHNldCB0byBudWxsIHRvIGZyZWUgUkFNXCIpO1xufSk7XG5cbnRlc3QoXCIjX3JlbGVhc2VcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXcgPSB2aWV3UG9vbC5zcGF3bigpO1xuICAgIGRlZXBFcXVhbCh2aWV3UG9vbC5wb29sLmxlbmd0aCwgMCwgXCJQb29sIGlzIGVtcHR5XCIpO1xuXG4gICAgdmlld1Bvb2wuX3JlbGVhc2Uodmlldyk7XG4gICAgZGVlcEVxdWFsKHZpZXdQb29sLnBvb2wubGVuZ3RoLCAxLCBcIlBvb2wgaGFzIG9uZSB2aWV3IGluIGl0XCIpO1xufSk7XG5cblxuLyoqKiBWaWV3ICoqKi9cbm1vZHVsZShcIlZpZXdcIiwge1xuICAgIHNldHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2FuZGJveCA9IHNpbm9uLnNhbmRib3guY3JlYXRlKCk7XG4gICAgfVxufSk7XG5cbnRlc3QoXCJJbml0aWFsaXphdGlvbiBQcm9jZXNzXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBvbmNlU3B5ICAgICA9IHNpbm9uLnNweSgpLFxuICAgICAgICByZW5kZXJTcHkgICA9IHNpbm9uLnNweSgpLFxuICAgICAgICBpbml0U3B5ICAgICA9IHNpbm9uLnNweSgpO1xuXG4gICAgdmFyIHZpZXdQb29sID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgIG9uY2U6ICAgb25jZVNweSxcbiAgICAgICAgaW5pdDogICBpbml0U3B5LFxuICAgICAgICByZW5kZXI6IHJlbmRlclNweVxuICAgIH0pO1xuXG4gICAgdmlld1Bvb2wuc3Bhd24oKTtcblxuICAgIG9rKG9uY2VTcHkuY2FsbGVkLCBcIm9uY2UgY2FsbGVkXCIpO1xuICAgIG9rKHJlbmRlclNweS5jYWxsZWQsIFwicmVuZGVyIGNhbGxlZFwiKTtcbiAgICBvayhpbml0U3B5LmNhbGxlZCwgXCJpbml0IGNhbGxlZFwiKTtcblxuICAgIG9rKG9uY2VTcHkuY2FsbGVkQmVmb3JlKHJlbmRlclNweSksIFwiY29uZmlnIGZpcmVzIGJlZm9yZSByZW5kZXJcIik7XG4gICAgb2socmVuZGVyU3B5LmNhbGxlZEJlZm9yZShpbml0U3B5KSwgXCJyZW5kZXIgZmlyZXMgYmVmb3JlIGluaXRcIik7XG5cbiAgICB2aWV3UG9vbC5kZXN0cm95KCk7XG59KTtcblxudGVzdChcIiNodG1sXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBTdWJ0ZXN0ID0gc3VidmlldyhcInN1YnRlc3RcIiksXG4gICAgICAgIHN1YnRlc3QgPSBTdWJ0ZXN0LnNwYXduKCk7XG5cbiAgICB2YXIgVGVzdGVyID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgICAgICB0ZW1wbGF0ZTogSGFuZGxlYmFycy5jb21waWxlKFwie3t7IHN1YnZpZXcuc3VidGVzdCB9fX1cIiksXG4gICAgICAgICAgICBzdWJ2aWV3czoge1xuICAgICAgICAgICAgICAgIHN1YnRlc3Q6IHN1YnRlc3RcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIHRlc3RlciA9IFRlc3Rlci5zcGF3bigpO1xuXG4gICAgb2soc3VidGVzdC5fYWN0aXZlLCBcIlN1YnRlc3QgaXMgYWN0aXZlXCIpO1xuXG4gICAgdGVzdGVyLmh0bWwoJ0hlbGxvIFRoZXJlJyk7XG5cbiAgICBvayghc3VidGVzdC5fYWN0aXZlLCBcIlN1YnRlc3QgaXMgaW5hY3RpdmVcIik7XG4gICAgZXF1YWwodGVzdGVyLiR3cmFwcGVyLmh0bWwoKSwgJ0hlbGxvIFRoZXJlJywgXCJIdG1sIGlzIHNldFwiKTtcblxuICAgIFN1YnRlc3QuZGVzdHJveSgpO1xuICAgIFRlc3Rlci5kZXN0cm95KCk7XG59KTtcblxudGVzdChcIiNyZW1vdmVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNsZWFuID0gc2lub24uc3B5KCksXG4gICAgICAgIFRlc3QgPSBzdWJ2aWV3KFwidGVzdGVyXCIsIHtcbiAgICAgICAgICAgIGNsZWFuOiBjbGVhblxuICAgICAgICB9KSxcbiAgICAgICAgdGVzdCA9IFRlc3Quc3Bhd24oKTtcblxuICAgIHRlc3QuJHdyYXBwZXIuYXBwZW5kVG8oJ2JvZHknKTtcblxuICAgIG9rKCQoJy5zdWJ2aWV3LXRlc3RlcicpLmxlbmd0aCwgXCJ2aWV3IGluIHRoZSBwYWdlXCIpO1xuICAgIG9rKHRlc3QuX2FjdGl2ZSwgXCJ2aWV3IGlzIGFjdGl2ZVwiKTtcblxuICAgIHRlc3QucmVtb3ZlKCk7XG5cbiAgICBvayghJCgnLnN1YnZpZXctdGVzdGVyJykubGVuZ3RoLCBcInZpZXcgcmVtb3ZlZCBmcm9tIHBhZ2VcIik7XG4gICAgb2soIXRlc3QuX2FjdGl2ZSwgXCJ2aWV3IGlzIGluYWN0aXZlXCIpO1xuICAgIG9rKGNsZWFuLmNhbGxlZCwgXCJUaGUgY2xlYW4gZnVuY3Rpb24gd2FzIGNhbGxlZFwiKTtcblxuICAgIFRlc3QuZGVzdHJveSgpO1xufSk7XG5cbnRlc3QoXCIjJFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGVzdCA9IHRlc3RTdWJ2aWV3LnNwYXduKCk7XG4gICAgdGVzdC4kd3JhcHBlci5hcHBlbmRUbygnYm9keScpO1xuXG4gICAgdGVzdC5odG1sKFwiPGRpdiBjbGFzcz0nc2NvcGVkLWpxdWVyeS10ZXN0Jz48L2Rpdj5cIik7XG4gICAgJChcIjxkaXYgY2xhc3M9J3Njb3BlZC1qcXVlcnktdGVzdCc+PC9kaXY+XCIpLmFwcGVuZFRvKCdib2R5Jyk7XG5cbiAgICBlcXVhbCgkKCcuc2NvcGVkLWpxdWVyeS10ZXN0JykubGVuZ3RoLCAyLCBcIlR3byB0ZXN0IGVsZW1lbnRzIGNyZWF0ZWRcIik7XG4gICAgZXF1YWwodGVzdC4kKCcuc2NvcGVkLWpxdWVyeS10ZXN0JykubGVuZ3RoLCAxLCBcIlRoZSBvbmUgY2hpbGQgZWxlbWVudCBpcyBzZWxlY3RlZFwiKTtcbn0pO1xuXG50ZXN0KFwiI3RyYXZlcnNlXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBTdWJ0ZXN0ID0gc3VidmlldyhcInN1YnRlc3RcIiksXG4gICAgICAgIHN1YnRlc3QgPSBTdWJ0ZXN0LnNwYXduKCk7XG5cbiAgICB2YXIgVGVzdGVyID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgICAgICB0ZW1wbGF0ZTogSGFuZGxlYmFycy5jb21waWxlKFwie3t7IHN1YnZpZXcuc3VidGVzdCB9fX1cIiksXG4gICAgICAgICAgICBzdWJ2aWV3czoge1xuICAgICAgICAgICAgICAgIHN1YnRlc3Q6IHN1YnRlc3RcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIHRlc3RlciA9IFRlc3Rlci5zcGF3bigpO1xuXG4gICAgZGVlcEVxdWFsKHN1YnRlc3QudHJhdmVyc2UoJ2Nsb3Nlc3QnLCAndGVzdGVyJyksIHRlc3RlciwgXCJXb3JrcyB3aXRoIGNsb3Nlc3RcIik7XG4gICAgZGVlcEVxdWFsKHN1YnRlc3QudHJhdmVyc2UoJ2Nsb3Nlc3QnLCAndGhpcy1kb2VzLW5vdC1leGlzdCcpLCBudWxsLCBcImRvZXMgbm90IGV4aXN0XCIpO1xuXG4gICAgU3VidGVzdC5kZXN0cm95KCk7XG4gICAgVGVzdGVyLmRlc3Ryb3koKTtcbn0pO1xuXG4vKlxudGVzdChcIiNwYXJlbnRcIiwgZnVuY3Rpb24oKSB7XG5cbn0pO1xuXG50ZXN0KFwiI25leHRcIiwgZnVuY3Rpb24oKSB7XG5cbn0pO1xuXG50ZXN0KFwiI3ByZXZcIiwgZnVuY3Rpb24oKSB7XG5cbn0pO1xuXG50ZXN0KFwiI2NoaWxkcmVuXCIsIGZ1bmN0aW9uKCkge1xuXG59KTtcbiovXG5cbnRlc3QoJyNhcHBlbmRUbycsIGZ1bmN0aW9uKCkge1xuICAgIHZhciAkZGl2ID0gJChcIjxkaXY+XCIpLmFwcGVuZFRvKCdib2R5Jyk7XG5cbiAgICB2YXIgdmlldyA9IHRlc3RTdWJ2aWV3LnNwYXduKCk7XG4gICAgdmlldy5hcHBlbmRUbygkZGl2KTtcblxuICAgIGRlZXBFcXVhbChzdWJ2aWV3KCRkaXYuZmluZCgnLnN1YnZpZXctdGVzdCcpKSwgdmlldywgXCJTdWJ2aWV3IGFwcGVuZGVkXCIpO1xufSk7XG5cbnRlc3QoJyN0cmlnZ2VyLyNfYmluZExpc3RlbmVycycsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhbGxFdmVudDEgICAgICAgICAgID0gc2lub24uc3B5KCksXG4gICAgICAgIHVwRXZlbnQxICAgICAgICAgICAgPSBzaW5vbi5zcHkoKSxcbiAgICAgICAgdXBFdmVudDFTY29wZWQgICAgICA9IHNpbm9uLnNweSgpLFxuICAgICAgICB1cEV2ZW50MVdyb25nU2NvcGUgID0gc2lub24uc3B5KCksXG4gICAgICAgIHVuRXZlbnQxTm9FdmVudCAgICAgPSBzaW5vbi5zcHkoKSxcbiAgICAgICAgc2VsZkV2ZW50MSAgICAgICAgICA9IHNpbm9uLnNweSgpLFxuICAgICAgICBkb3duRXZlbnQyICAgICAgICAgID0gc2lub24uc3B5KCksXG4gICAgICAgIGFjcm9zc0V2ZW50MiAgICAgICAgPSBzaW5vbi5zcHkoKTtcblxuICAgIHZhciBTdWJ0ZXN0ID0gc3VidmlldyhcInN1YnRlc3RcIiwge1xuICAgICAgICAgICAgbGlzdGVuZXJzOiB7XG4gICAgICAgICAgICAgICAgXCJkb3duOm5vRXZlbnQsIGFsbDpldmVudDFcIjogYWxsRXZlbnQxLFxuICAgICAgICAgICAgICAgIFwidXA6ZXZlbnQxXCI6ICAgICAgICAgICAgICAgIHVwRXZlbnQxLFxuICAgICAgICAgICAgICAgIFwidXA6ZXZlbnQxOnRlc3RlclwiOiAgICAgICAgIHVwRXZlbnQxU2NvcGVkLFxuICAgICAgICAgICAgICAgIFwidXA6ZXZlbnQxOndyb25nU2NvcGVcIjogICAgIHVwRXZlbnQxV3JvbmdTY29wZSxcbiAgICAgICAgICAgICAgICBcInVwOm5vRXZlbnRcIjogICAgICAgICAgICAgICB1bkV2ZW50MU5vRXZlbnQsXG4gICAgICAgICAgICAgICAgXCJhY3Jvc3M6ZXZlbnQyXCI6ICAgICAgICAgICAgYWNyb3NzRXZlbnQyXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBzdWJ0ZXN0ICA9IFN1YnRlc3Quc3Bhd24oKSxcbiAgICAgICAgc3VidGVzdDIgPSBTdWJ0ZXN0LnNwYXduKCk7XG5cbiAgICB2YXIgVGVzdGVyID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgICAgICB0ZW1wbGF0ZTogSGFuZGxlYmFycy5jb21waWxlKFwie3t7IHN1YnZpZXcuc3VidGVzdCB9fX17e3sgc3Vidmlldy5zdWJ0ZXN0MiB9fX1cIiksXG4gICAgICAgICAgICBzdWJ2aWV3czoge1xuICAgICAgICAgICAgICAgIHN1YnRlc3Q6IHN1YnRlc3QsXG4gICAgICAgICAgICAgICAgc3VidGVzdDI6IHN1YnRlc3QyXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdGVuZXJzOiB7XG4gICAgICAgICAgICAgICAgXCJzZWxmOmV2ZW50MVwiOiBzZWxmRXZlbnQxLFxuICAgICAgICAgICAgICAgIFwiZG93bjpldmVudDJcIjogZG93bkV2ZW50MlxuICAgICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgdGVzdGVyID0gVGVzdGVyLnNwYXduKCk7XG5cbiAgICB0ZXN0ZXIuJHdyYXBwZXIuYXBwZW5kVG8oJ2JvZHknKTtcblxuICAgIC8vRXZlbnQgMVxuICAgIHRlc3Rlci50cmlnZ2VyKCdldmVudDEnKTtcbiAgICBvayhhbGxFdmVudDEuY2FsbGVkLCAgICAgICAgICAgIFwiQWxsIEV2ZW50MSBDYWxsZWRcIik7XG4gICAgb2sodXBFdmVudDEuY2FsbGVkLCAgICAgICAgICAgICBcIlVwIEV2ZW50MSBDYWxsZWRcIik7XG4gICAgb2sodXBFdmVudDFTY29wZWQuY2FsbGVkLCAgICAgICBcIlNjb3BlZCBVcCBFdmVudDEgQ2FsbGVkXCIpO1xuICAgIG9rKCF1cEV2ZW50MVdyb25nU2NvcGUuY2FsbGVkLCAgXCJXcm9uZyBTY29wZSBVcCBFdmVudDEgTm90IENhbGxlZFwiKTtcbiAgICBvayghdW5FdmVudDFOb0V2ZW50LmNhbGxlZCwgICAgIFwiTm9uLXRyaWdnZXJlZCBldmVudCBoYW5kbGVyIG5vdCBjYWxsZWRcIik7XG4gICAgb2soc2VsZkV2ZW50MS5jYWxsZWQsICAgICAgICAgICBcIlNlbGYgRXZlbnQxIENhbGxlZFwiKTtcblxuICAgIC8vRXZlbnQgMlxuICAgIHN1YnRlc3QudHJpZ2dlcignZXZlbnQyJyk7XG4gICAgb2soZG93bkV2ZW50Mi5jYWxsZWQsICAgXCJEb3duIEV2ZW50IENhbGxlZFwiKTtcbiAgICBvayhhY3Jvc3NFdmVudDIuY2FsbGVkLCBcIkFjcm9zcyBFdmVudCBDYWxsZWRcIik7XG5cbiAgICAvL0NsZWFudXBcbiAgICB0ZXN0ZXIucmVtb3ZlKCk7XG4gICAgU3VidGVzdC5kZXN0cm95KCk7XG4gICAgVGVzdGVyLmRlc3Ryb3koKTtcbn0pO1xuXG50ZXN0KFwiI19hZGREZWZhdWx0Q2xhc3Nlc1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlldyA9IHRlc3RTdWJ2aWV3LnNwYXduKCk7XG5cbiAgICB2aWV3Ll9hZGREZWZhdWx0Q2xhc3NlcygpO1xuXG4gICAgdmFyIGNsYXNzZXMgPSB2aWV3LiR3cmFwcGVyWzBdLmNsYXNzTmFtZS5zcGxpdCgnICcpO1xuXG4gICAgb2soY2xhc3Nlcy5pbmRleE9mKFwic3Vidmlldy10ZXN0XCIpICE9PSAtMSwgXCJJbmNsdWRlcyB2aWV3LXRlc3RcIik7XG4gICAgb2soY2xhc3Nlcy5pbmRleE9mKFwic3Vidmlld1wiKSAhPT0gLTEsIFwiSW5jbHVkZXMgdmlld1wiKTtcbn0pO1xuXG50ZXN0KFwiI19sb2FkRXh0ZW5zaW9uc1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXh0ZW5zaW9uID0gc3Vidmlldy5leHRlbnNpb24oe1xuICAgICAgICAgICAgZm9vOiAnYmFyJyxcbiAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uKGNvbmZpZywgdmlldykge1xuICAgICAgICAgICAgICAgIG9rKHRoaXMudmlldywgXCJWaWV3IG9iamVjdCBpcyBhdmFpbGFibGVcIik7XG4gICAgICAgICAgICAgICAgZXF1YWwodGhpcy52aWV3LCB2aWV3LCBcInRoaXMudmlldyA9PSB2aWV3IGFyZ3VtZW50XCIpO1xuICAgICAgICAgICAgICAgIGVxdWFsKGNvbmZpZy5oaSwgJ3RoZXJlJywgXCJoaSBlcXVhbHMgdGhlcmVcIik7XG4gICAgICAgICAgICAgICAgZGVlcEVxdWFsKHRoaXMuY29uZmlnLCBjb25maWcsIFwidGhpcy5jb25maWcgPT0gY29uZmlnIGFyZ3VtZW50XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgVGVzdGVyID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvbih7XG4gICAgICAgICAgICAgICAgaGk6ICd0aGVyZSdcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pLFxuICAgICAgICB0ZXN0ZXIgPSBUZXN0ZXIuc3Bhd24oKTtcblxuICAgIGVxdWFsKHRlc3Rlci5leHRlbnNpb24uZm9vLCAnYmFyJywgXCJFeHRlbnNpb24gYXR0cmlidXRlIGFwcGxpZWRcIik7XG5cbiAgICBUZXN0ZXIuZGVzdHJveSgpO1xufSk7XG5cbi8qKiogVmlldyBSZW5kZXJpbmcgKioqL1xuXG52YXIgc2V0SHRtbDtcbm1vZHVsZShcIlZpZXcgI3JlbmRlclwiLCB7XG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRIdG1sID0gc2lub24uc3B5KCk7XG4gICAgfVxufSk7XG5cbnRlc3QoXCJTdHJpbmcgVGVtcGxhdGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXdQb29sID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgIHRlbXBsYXRlOiAgIFwiVGhpcyBpcyBhIHN0cmluZ1wiXG4gICAgfSk7XG5cbiAgICB2YXIgdmlldyA9IHZpZXdQb29sLnNwYXduKCk7XG5cbiAgICBlcXVhbChcIlRoaXMgaXMgYSBzdHJpbmdcIiwgdmlldy4kd3JhcHBlci5odG1sKCksIFwiQ29udGVudCBtYXRjaGVzXCIpO1xuXG4gICAgdmlld1Bvb2wuZGVzdHJveSgpO1xufSk7XG5cbnRlc3QoXCJIYW5kbGViYXJzIFRlbXBsYXRlXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2aWV3UG9vbCA9IHN1YnZpZXcoXCJ0ZXN0ZXJcIiwge1xuICAgICAgICB0ZW1wbGF0ZTogSGFuZGxlYmFycy5jb21waWxlKFwiPGRpdiBjbGFzcz0naGFuZGxlYmFycy10ZXN0Jz57eyB0ZXN0IH19PC9kaXY+e3t7IHN1YnZpZXcudGVzdCB9fX1cIiksXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHRlc3Q6IFwiSGlcIlxuICAgICAgICB9LFxuICAgICAgICBzdWJ2aWV3czoge1xuICAgICAgICAgICAgdGVzdDogdGVzdFN1YnZpZXdcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIHZpZXcgPSB2aWV3UG9vbC5zcGF3bigpO1xuXG4gICAgb2sodmlldy4kKCcuc3Vidmlldy10ZXN0JykubGVuZ3RoLCBcInN1YnZpZXcgc3Bhd25lZCBjb3JyZWN0bHlcIik7XG5cbiAgICB2YXIgJGhhbmRsZWJhcnNUZXN0ID0gdmlldy4kKCcuaGFuZGxlYmFycy10ZXN0Jyk7XG4gICAgb2soJGhhbmRsZWJhcnNUZXN0Lmxlbmd0aCwgXCJEaXYgZWxlbWVudCBjcmVhdGVkXCIpO1xuICAgIGVxdWFsKCRoYW5kbGViYXJzVGVzdC5odG1sKCksICdIaScsIFwiRGl2IGNyZWF0ZWQgd2l0aCBjb3JyZWN0IGNvbnRlbnRcIik7XG5cbiAgICB2aWV3UG9vbC5kZXN0cm95KCk7XG59KTtcblxudGVzdChcIlVuZGVyc2NvcmUgVGVtcGxhdGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXdQb29sID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKFwiPGRpdiBjbGFzcz0ndW5kZXJzY29yZS10ZXN0Jz48JT0gdGVzdCAlPjwvZGl2PjwlPSBzdWJ2aWV3LnRlc3QgJT5cIiksXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHRlc3Q6IFwiSGlcIlxuICAgICAgICB9LFxuICAgICAgICBzdWJ2aWV3czoge1xuICAgICAgICAgICAgdGVzdDogdGVzdFN1YnZpZXdcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIHZpZXcgPSB2aWV3UG9vbC5zcGF3bigpO1xuXG4gICAgb2sodmlldy4kKCcuc3Vidmlldy10ZXN0JykubGVuZ3RoLCBcInN1YnZpZXcgc3Bhd25lZCBjb3JyZWN0bHlcIik7XG5cbiAgICB2YXIgJGhhbmRsZWJhcnNUZXN0ID0gdmlldy4kKCcudW5kZXJzY29yZS10ZXN0Jyk7XG4gICAgb2soJGhhbmRsZWJhcnNUZXN0Lmxlbmd0aCwgXCJEaXYgZWxlbWVudCBjcmVhdGVkXCIpO1xuICAgIGVxdWFsKCRoYW5kbGViYXJzVGVzdC5odG1sKCksICdIaScsIFwiRGl2IGNyZWF0ZWQgd2l0aCBjb3JyZWN0IGNvbnRlbnRcIik7XG4gICAgXG4gICAgdmlld1Bvb2wuZGVzdHJveSgpO1xufSk7XG5cbnRlc3QoXCJQcmUvUG9zdCBSZW5kZXJcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHByZVJlbmRlciA9IHNpbm9uLnNweSgpLFxuICAgICAgICBwb3N0UmVuZGVyID0gc2lub24uc3B5KCk7XG5cbiAgICB2YXIgVGVzdGVyID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgIHByZVJlbmRlcjogcHJlUmVuZGVyLFxuICAgICAgICBwb3N0UmVuZGVyOiBwb3N0UmVuZGVyXG4gICAgfSk7XG5cbiAgICBUZXN0ZXIuc3Bhd24oKTtcblxuICAgIG9rKHByZVJlbmRlci5jYWxsZWQsIFwicHJlUmVuZGVyIGNhbGxlZFwiKTtcbiAgICBvayhwb3N0UmVuZGVyLmNhbGxlZCwgXCJwb3N0UmVuZGVyIGNhbGxlZFwiKTtcbn0pO1xuXG4iXX0=
