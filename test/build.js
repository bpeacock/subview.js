(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],4:[function(require,module,exports){
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
},{"./support/isBuffer":3,"/Users/brianpeacock/apps/subview/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":2,"inherits":1}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{"./sinon/assert":7,"./sinon/behavior":8,"./sinon/call":9,"./sinon/collection":10,"./sinon/match":11,"./sinon/mock":12,"./sinon/sandbox":13,"./sinon/spy":14,"./sinon/stub":15,"./sinon/test":16,"./sinon/test_case":17,"formatio":19,"util":4}],7:[function(require,module,exports){
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
},{"../sinon":6}],8:[function(require,module,exports){
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
},{"../sinon":6,"/Users/brianpeacock/apps/subview/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":2}],9:[function(require,module,exports){
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


},{"../sinon":6}],10:[function(require,module,exports){
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

},{"../sinon":6}],11:[function(require,module,exports){
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

},{"../sinon":6}],12:[function(require,module,exports){
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

},{"../sinon":6,"./match":11}],13:[function(require,module,exports){
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

},{"../sinon":6,"./util/fake_timers":18}],14:[function(require,module,exports){
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

},{"../sinon":6}],15:[function(require,module,exports){
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

},{"../sinon":6}],16:[function(require,module,exports){
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

},{"../sinon":6}],17:[function(require,module,exports){
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

},{"../sinon":6}],18:[function(require,module,exports){
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
},{}],19:[function(require,module,exports){
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
},{"samsam":20}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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
},{}],23:[function(require,module,exports){
var _   = require('underscore'),
    log = require('loglevel'),
    noop = function() {};

var View = function() {};

View.prototype = {
    isView: true,

    /*** Default Attributes (should be overwritten) ***/
    tagName:    "div",
    className:  "",

    /*
        listeners
        ---------

        '[direction]:[event name]:[from type], ...': function(eventArguments*) {
            
        }
    */
    listeners: {},

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
    }, 
    onceFunctions: [],
    init: function(config) { //Runs after render
        for(var i=0; i<this.initFunctions.length; i++) {
            this.initFunctions[i].apply(this, [config]);
        }
    }, 
    initFunctions: [],
    clean: function() { //Runs on remove
        for(var i=0; i<this.cleanFunctions.length; i++) {
            this.cleanFunctions[i].apply(this, []);
        }
    }, 
    cleanFunctions: [],

    /*** Rendering ***/
    render: function() {
        var self = this,
            html = '',
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
                if(subview.isViewPool) {
                    data.subview[name] = subview.template;
                }
                else {
                    postLoad = true;
                    data.subview[name] = "<script class='post-load-view' type='text/html' data-name='"+name+"'></script>";
                }
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
                var $this = $(this);
                $this
                    .after(self.subviews[$this.attr('data-name')].$wrapper)
                    .remove();
            });
        }

        this.postRender();

        return this;
    },
    html: function(html) {
        //Remove & clean subviews in the wrapper 
        this.$wrapper.find('.'+this._subviewCssClass).each(function() {
            subview(this).remove();
        });

        this.wrapper.innerHTML = html;

        //Load subviews in the wrapper
        subview.load(this.$wrapper);

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

    /*** Event API ***/
    trigger: function(name, args) {
        var self = this;
        args = args || [];
        
        //Broadcast in all directions
        var directions = {
            up:     'find',
            down:   'parents',
            across: 'siblings',
            all:    null
        };

        _.find(directions, function(jqFunc, dir) {
            var selector = '.listener-'+name+'-'+dir;
            selector = selector + ', ' + selector+'-'+self.type;

            console.log('');
            console.log(selector);
            console.log(jqFunc);

            //Select $wrappers with the right listener class in the right direction
            var $els = jqFunc ? self.$wrapper[jqFunc](selector) : $(selector);

            console.log($els);

            for(var i=0; i<$els.length; i++) {
                //Get the actual subview
                var recipient = subview($els[i]);

                //Check for a subview type specific callback
                var typedCallback = recipient.listeners[dir + ":" + name + ":" + self.type];
                if(typedCallback && typedCallback.apply(self, args) === false) {
                    return true; //Breaks if callback returns false
                }

                //Check for a general event callback
                var untypedCallback = recipient.listeners[dir + ":" + name];
                if(untypedCallback && untypedCallback.apply(self, args) === false) {
                    return true; //Breaks if callback returns false
                }
            }
        });
    },
    _bindListeners: function() {
        var self = this;

        $.each(this.listeners, function(events, callback) {
            direction = direction || 'all';

            //Parse the event format "[view type]:[event name], [view type]:[event name]"
            $.each(eventName.split(','), function(event) {
                var eventParts = event.replace(/ /g, '').split(':');
                
                var direction = eventParts[0],
                    name      = eventParts[1],
                    viewType  = eventParts[2] || null;

                //Add the listener class
                if(direction != 'self') {
                    self.$wrapper.addClass('listener-' + direction + '-' + name + (viewType ? '-' + viewType : ''));
                }
            });
        });

        return this;
    },

    /*** Classes ***/
    _active: false,
    _subviewCssClass: 'subview',
    _viewCssPrefix:   'subview-',
    _getClasses: function() {
        return this.wrapper.className.split(/\s+/);
    },
    _setClasses: function(classes) {
        var newClassName = classes.join(' ');
        if(this.wrapper.className != newClassName) this.wrapper.className = newClassName;

        return this;
    },
    _addDefaultClasses: function() {
        var classes = this._getClasses();
        classes.push(this._viewCssPrefix + this.type);

        var superClass = this.super;
        while(true) {
            if(superClass.type) {
                classes.push(this._viewCssPrefix + superClass.type);
                superClass = superClass.super;
            }
            else {
                break;
            }
        }

        //Add Default View Class
        classes.push(this._subviewCssClass);

        //Add className
        classes = classes.concat(this.className.split(' '));

        this._setClasses(_.uniq(classes));

        return this;
    }
};

module.exports = View;


},{"loglevel":5,"underscore":21}],24:[function(require,module,exports){
var $ = require("unopinionate").selector;

var ViewPool = function(View) {
    //Configuration
    this.View   = View;
    this.type   = View.prototype.type;
    this.super  = View.prototype.super;
    this.template = "<"+this.View.prototype.tagName+" class='"+this.View.prototype._viewCssPrefix + this.View.prototype.type+" "+this.View.prototype.className+"'></"+this.View.prototype.tagName+">";

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

},{"unopinionate":22}],25:[function(require,module,exports){
var _               = require("underscore"),
    log             = require("loglevel"),
    $               = require("unopinionate").selector,
    ViewPool        = require("./ViewPool"),
    ViewTemplate    = require("./View"),
    viewTypeRegex   = new RegExp('^' + ViewTemplate.prototype._viewCssPrefix);

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
    'trigger'
];

subview._validateConfig = function(config) {
    var success = true;

    $.each(config, function(name, value) {
        if(subview._reservedMethods.indexOf(name) != -1) {
            console.error("Method '"+name+"' is reserved as part of the subview API.");
            success = false;
        }
        else if(name.match(/^_/)) {
            console.error("The _ prefixed name-space is reserved for internal subview methods.");
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

/*** Export ***/
window.subview = module.exports = subview;

$(function() {
    if(!subview.noInit) {
        subview.init();
    }
});

},{"./View":23,"./ViewPool":24,"loglevel":5,"underscore":21,"unopinionate":22}],26:[function(require,module,exports){
var sinon   = require('sinon'),
    _       = require('underscore'),
    $       = require("unopinionate").selector,
    module  = window.module,
    subview = require('../src/main'),
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
    var $tester = $("<div class='view-test'>").appendTo('body');
    subview.load();
    ok(subview($tester), "View was successfully created");

    var $tester2 = $("<div class='view-test'>").appendTo('body');
    subview.load('body');
    ok(subview($tester2), "Scoped loading was successful");
});

test('#_validateName', function() {
    ok(subview._validateName("Foo1"), "Base Case");
    ok(!subview._validateName("Foo%"), "Invalid characters");
    ok(!subview._validateName("test"), "Pre-existing view");
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
    var configSpy   = sinon.spy(),
        renderSpy   = sinon.spy(),
        initSpy     = sinon.spy();

    var viewPool = subview("tester", {
        init:   initSpy,
        render: renderSpy,
        config: configSpy
    });

    viewPool.spawn();

    ok(configSpy.called, "config called");
    ok(renderSpy.called, "render called");
    ok(initSpy.called, "init called");

    ok(configSpy.calledBefore(renderSpy), "config fires before render");
    ok(renderSpy.calledBefore(initSpy), "render fires before init");

    viewPool.destroy();
});

test("#html", function() {

});

test("#remove", function() {

});

test("#_getClasses", function() {
    var view = testSubview.spawn(),
        classes = view._getClasses();

    ok(classes.indexOf("view-test") !== -1, "Includes view-test");
    ok(classes.indexOf("view") !== -1, "Includes view");
});

test("#_setClasses", function() {
    var view = testSubview.spawn();

    view._setClasses(['foo', 'bar']);
    var classes = view._getClasses();

    deepEqual(classes.length, 2, "Right number of classes");
    ok(classes.indexOf('foo') !== -1, "Includes foo");
    ok(classes.indexOf('bar') !== -1, "Includes bar");
});

test("#_addDefaultClasses", function() {
    var view = testSubview.spawn();

    view
        ._setClasses([])
        ._addDefaultClasses();

    var classes = view._getClasses();

    ok(classes.indexOf("view-test") !== -1, "Includes view-test");
    ok(classes.indexOf("view") !== -1, "Includes view");
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
        html:       setHtml,
        template:   "This is a string"
    });

    var view = viewPool.spawn();

    view.render();

    ok(setHtml.calledWith("This is a string"), "Content matches");

    viewPool.destroy();
});


/*** State ***/

var testView;
module("State", {
    setup: function() {
        sandbox = sinon.sandbox.create();
        testView = testSubview.spawn();
    },
    teardown: function() {

    }
});

test("#set", function() {
    testView.state.set('foo', 'bar');

    ok(testView.$wrapper.hasClass('state-foo-bar'), "Class added");
    equal(testView.state.data.foo, 'bar', "Attribute set");
});

test("#get", function() {
    testView.state.set('foo', 'bar');
    equal(testView.state.get('foo'), 'bar', "get works");
});

test("#remove", function() {
    testView.state.set('foo', 'bar');
    testView.state.remove('foo');

    equal(testView.state.get('foo'), undefined, "removed foo");
    ok(!testView.$wrapper.hasClass('state-foo-bar'), "class removed");
});

test("#bind", function() {
    var callback = sinon.spy();
    testView.state.bind('foo', callback);
    testView.state.set('foo', 'bar');

    ok(callback.called, "Callback called");
    ok(callback.calledWith('bar'), "Correct argument passed to callback");
});

test("#unbind", function() {
    var callback = sinon.spy();
    testView.state.bind('foo', callback);
    testView.state.unbind('foo');
    testView.state.set('foo', 'bar');

    ok(!callback.called, "Callback didn't fire.");
});

test("#trigger", function() {
    var callback = sinon.spy();
    testView.state.set('foo', 'bar');
    testView.state.bind('foo', callback);
    testView.state.trigger('foo');

    ok(callback.called, "Callback called");
    ok(callback.calledWith('bar'), "Correct argument passed to callback");
});

test("#askParent", function() {

});

test("#tellParent", function() {

});

test("#listen", function() {

});

test("#_hear", function() {

});

test("#_setDefaults", function() {

});

test("#_getStateClasses", function() {

});



},{"../src/main":25,"sinon":6,"underscore":21,"unopinionate":22}]},{},[26])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvbG9nbGV2ZWwvbGliL2xvZ2xldmVsLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vYXNzZXJ0LmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi9iZWhhdmlvci5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vY2FsbC5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vY29sbGVjdGlvbi5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vbWF0Y2guanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvc2lub24vbGliL3Npbm9uL21vY2suanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvc2lub24vbGliL3Npbm9uL3NhbmRib3guanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvc2lub24vbGliL3Npbm9uL3NweS5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vc3R1Yi5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vdGVzdC5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy9zaW5vbi9saWIvc2lub24vdGVzdF9jYXNlLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL2xpYi9zaW5vbi91dGlsL2Zha2VfdGltZXJzLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL3Npbm9uL25vZGVfbW9kdWxlcy9mb3JtYXRpby9saWIvZm9ybWF0aW8uanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvc2lub24vbm9kZV9tb2R1bGVzL2Zvcm1hdGlvL25vZGVfbW9kdWxlcy9zYW1zYW0vbGliL3NhbXNhbS5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L25vZGVfbW9kdWxlcy91bmRlcnNjb3JlL3VuZGVyc2NvcmUuanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy9ub2RlX21vZHVsZXMvdW5vcGluaW9uYXRlL3Vub3BpbmlvbmF0ZS5qcyIsIi9Vc2Vycy9icmlhbnBlYWNvY2svYXBwcy9zdWJ2aWV3L3NyYy9WaWV3LmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvc3JjL1ZpZXdQb29sLmpzIiwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvc3JjL21haW4uanMiLCIvVXNlcnMvYnJpYW5wZWFjb2NrL2FwcHMvc3Vidmlldy90ZXN0L3Rlc3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNXZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpey8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvKlxyXG4gKiBsb2dsZXZlbCAtIGh0dHBzOi8vZ2l0aHViLmNvbS9waW10ZXJyeS9sb2dsZXZlbFxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTMgVGltIFBlcnJ5XHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cclxuICovXHJcblxyXG47KGZ1bmN0aW9uICh1bmRlZmluZWQpIHtcclxuICAgIHZhciB1bmRlZmluZWRUeXBlID0gXCJ1bmRlZmluZWRcIjtcclxuXHJcbiAgICAoZnVuY3Rpb24gKG5hbWUsIGRlZmluaXRpb24pIHtcclxuICAgICAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBkZWZpbmUuYW1kID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICBkZWZpbmUoZGVmaW5pdGlvbik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpc1tuYW1lXSA9IGRlZmluaXRpb24oKTtcclxuICAgICAgICB9XHJcbiAgICB9KCdsb2cnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB7fTtcclxuICAgICAgICB2YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWxNZXRob2QobWV0aG9kTmFtZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgPT09IHVuZGVmaW5lZFR5cGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub29wO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnNvbGVbbWV0aG9kTmFtZV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbnNvbGUubG9nICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYm91bmRUb0NvbnNvbGUoY29uc29sZSwgJ2xvZycpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9vcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBib3VuZFRvQ29uc29sZShjb25zb2xlLCBtZXRob2ROYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gYm91bmRUb0NvbnNvbGUoY29uc29sZSwgbWV0aG9kTmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gY29uc29sZVttZXRob2ROYW1lXTtcclxuICAgICAgICAgICAgaWYgKG1ldGhvZC5iaW5kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uQmluZGluZ1dyYXBwZXIobWV0aG9kLCBjb25zb2xlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmNhbGwoY29uc29sZVttZXRob2ROYW1lXSwgY29uc29sZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbiBJRTggKyBNb2Rlcm5penIsIHRoZSBiaW5kIHNoaW0gd2lsbCByZWplY3QgdGhlIGFib3ZlLCBzbyB3ZSBmYWxsIGJhY2sgdG8gd3JhcHBpbmdcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uQmluZGluZ1dyYXBwZXIobWV0aG9kLCBjb25zb2xlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29uc29sZVttZXRob2ROYW1lXS5iaW5kKGNvbnNvbGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBmdW5jdGlvbkJpbmRpbmdXcmFwcGVyKGYsIGNvbnRleHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmFwcGx5KGYsIFtjb250ZXh0LCBhcmd1bWVudHNdKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBsb2dNZXRob2RzID0gW1xyXG4gICAgICAgICAgICBcInRyYWNlXCIsXHJcbiAgICAgICAgICAgIFwiZGVidWdcIixcclxuICAgICAgICAgICAgXCJpbmZvXCIsXHJcbiAgICAgICAgICAgIFwid2FyblwiLFxyXG4gICAgICAgICAgICBcImVycm9yXCJcclxuICAgICAgICBdO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZXBsYWNlTG9nZ2luZ01ldGhvZHMobWV0aG9kRmFjdG9yeSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbG9nTWV0aG9kcy5sZW5ndGg7IGlpKyspIHtcclxuICAgICAgICAgICAgICAgIHNlbGZbbG9nTWV0aG9kc1tpaV1dID0gbWV0aG9kRmFjdG9yeShsb2dNZXRob2RzW2lpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGNvb2tpZXNBdmFpbGFibGUoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudCAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmRvY3VtZW50LmNvb2tpZSAhPT0gdW5kZWZpbmVkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGxvY2FsU3RvcmFnZUF2YWlsYWJsZSgpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAodHlwZW9mIHdpbmRvdyAhPT0gdW5kZWZpbmVkVHlwZSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlICE9PSB1bmRlZmluZWQpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHBlcnNpc3RMZXZlbElmUG9zc2libGUobGV2ZWxOdW0pIHtcclxuICAgICAgICAgICAgdmFyIGxldmVsTmFtZTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBzZWxmLmxldmVscykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYubGV2ZWxzLmhhc093blByb3BlcnR5KGtleSkgJiYgc2VsZi5sZXZlbHNba2V5XSA9PT0gbGV2ZWxOdW0pIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXZlbE5hbWUgPSBrZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChsb2NhbFN0b3JhZ2VBdmFpbGFibGUoKSkge1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZVsnbG9nbGV2ZWwnXSA9IGxldmVsTmFtZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjb29raWVzQXZhaWxhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5jb29raWUgPSBcImxvZ2xldmVsPVwiICsgbGV2ZWxOYW1lICsgXCI7XCI7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBjb29raWVSZWdleCA9IC9sb2dsZXZlbD0oW147XSspLztcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gbG9hZFBlcnNpc3RlZExldmVsKCkge1xyXG4gICAgICAgICAgICB2YXIgc3RvcmVkTGV2ZWw7XHJcblxyXG4gICAgICAgICAgICBpZiAobG9jYWxTdG9yYWdlQXZhaWxhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgIHN0b3JlZExldmVsID0gd2luZG93LmxvY2FsU3RvcmFnZVsnbG9nbGV2ZWwnXTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFzdG9yZWRMZXZlbCAmJiBjb29raWVzQXZhaWxhYmxlKCkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjb29raWVNYXRjaCA9IGNvb2tpZVJlZ2V4LmV4ZWMod2luZG93LmRvY3VtZW50LmNvb2tpZSkgfHwgW107XHJcbiAgICAgICAgICAgICAgICBzdG9yZWRMZXZlbCA9IGNvb2tpZU1hdGNoWzFdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzZWxmLnNldExldmVsKHNlbGYubGV2ZWxzW3N0b3JlZExldmVsXSB8fCBzZWxmLmxldmVscy5XQVJOKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBQdWJsaWMgQVBJXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKi9cclxuXHJcbiAgICAgICAgc2VsZi5sZXZlbHMgPSB7IFwiVFJBQ0VcIjogMCwgXCJERUJVR1wiOiAxLCBcIklORk9cIjogMiwgXCJXQVJOXCI6IDMsXHJcbiAgICAgICAgICAgIFwiRVJST1JcIjogNCwgXCJTSUxFTlRcIjogNX07XHJcblxyXG4gICAgICAgIHNlbGYuc2V0TGV2ZWwgPSBmdW5jdGlvbiAobGV2ZWwpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsZXZlbCA9PT0gXCJudW1iZXJcIiAmJiBsZXZlbCA+PSAwICYmIGxldmVsIDw9IHNlbGYubGV2ZWxzLlNJTEVOVCkge1xyXG4gICAgICAgICAgICAgICAgcGVyc2lzdExldmVsSWZQb3NzaWJsZShsZXZlbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGxldmVsID09PSBzZWxmLmxldmVscy5TSUxFTlQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXBsYWNlTG9nZ2luZ01ldGhvZHMoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9vcDtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb25zb2xlID09PSB1bmRlZmluZWRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzKGZ1bmN0aW9uIChtZXRob2ROYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09IHVuZGVmaW5lZFR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnNldExldmVsKGxldmVsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmW21ldGhvZE5hbWVdLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29uc29sZSBhdmFpbGFibGUgZm9yIGxvZ2dpbmdcIjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZUxvZ2dpbmdNZXRob2RzKGZ1bmN0aW9uIChtZXRob2ROYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsZXZlbCA8PSBzZWxmLmxldmVsc1ttZXRob2ROYW1lLnRvVXBwZXJDYXNlKCldKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVhbE1ldGhvZChtZXRob2ROYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBub29wO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxldmVsID09PSBcInN0cmluZ1wiICYmIHNlbGYubGV2ZWxzW2xldmVsLnRvVXBwZXJDYXNlKCldICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHNbbGV2ZWwudG9VcHBlckNhc2UoKV0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJsb2cuc2V0TGV2ZWwoKSBjYWxsZWQgd2l0aCBpbnZhbGlkIGxldmVsOiBcIiArIGxldmVsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2VsZi5lbmFibGVBbGwgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgc2VsZi5zZXRMZXZlbChzZWxmLmxldmVscy5UUkFDRSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2VsZi5kaXNhYmxlQWxsID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHNlbGYuc2V0TGV2ZWwoc2VsZi5sZXZlbHMuU0lMRU5UKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBsb2FkUGVyc2lzdGVkTGV2ZWwoKTtcclxuICAgICAgICByZXR1cm4gc2VsZjtcclxuICAgIH0pKTtcclxufSkoKTtcclxuIiwiLypqc2xpbnQgZXFlcWVxOiBmYWxzZSwgb25ldmFyOiBmYWxzZSwgZm9yaW46IHRydWUsIG5vbWVuOiBmYWxzZSwgcmVnZXhwOiBmYWxzZSwgcGx1c3BsdXM6IGZhbHNlKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSwgX19kaXJuYW1lLCBkb2N1bWVudCovXG4vKipcbiAqIFNpbm9uIGNvcmUgdXRpbGl0aWVzLiBGb3IgaW50ZXJuYWwgdXNlIG9ubHkuXG4gKlxuICogQGF1dGhvciBDaHJpc3RpYW4gSm9oYW5zZW4gKGNocmlzdGlhbkBjam9oYW5zZW4ubm8pXG4gKiBAbGljZW5zZSBCU0RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTAtMjAxMyBDaHJpc3RpYW4gSm9oYW5zZW5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBzaW5vbiA9IChmdW5jdGlvbiAoZm9ybWF0aW8pIHtcbiAgICB2YXIgZGl2ID0gdHlwZW9mIGRvY3VtZW50ICE9IFwidW5kZWZpbmVkXCIgJiYgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICB2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuICAgIGZ1bmN0aW9uIGlzRE9NTm9kZShvYmopIHtcbiAgICAgICAgdmFyIHN1Y2Nlc3MgPSBmYWxzZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgb2JqLmFwcGVuZENoaWxkKGRpdik7XG4gICAgICAgICAgICBzdWNjZXNzID0gZGl2LnBhcmVudE5vZGUgPT0gb2JqO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG9iai5yZW1vdmVDaGlsZChkaXYpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBmYWlsZWQsIG5vdCBtdWNoIHdlIGNhbiBkbyBhYm91dCB0aGF0XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3VjY2VzcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0VsZW1lbnQob2JqKSB7XG4gICAgICAgIHJldHVybiBkaXYgJiYgb2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSAmJiBpc0RPTU5vZGUob2JqKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0Z1bmN0aW9uKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gXCJmdW5jdGlvblwiIHx8ICEhKG9iaiAmJiBvYmouY29uc3RydWN0b3IgJiYgb2JqLmNhbGwgJiYgb2JqLmFwcGx5KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtaXJyb3JQcm9wZXJ0aWVzKHRhcmdldCwgc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoIWhhc093bi5jYWxsKHRhcmdldCwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1Jlc3RvcmFibGUgKG9iaikge1xuICAgICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBvYmoucmVzdG9yZSA9PT0gXCJmdW5jdGlvblwiICYmIG9iai5yZXN0b3JlLnNpbm9uO1xuICAgIH1cblxuICAgIHZhciBzaW5vbiA9IHtcbiAgICAgICAgd3JhcE1ldGhvZDogZnVuY3Rpb24gd3JhcE1ldGhvZChvYmplY3QsIHByb3BlcnR5LCBtZXRob2QpIHtcbiAgICAgICAgICAgIGlmICghb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlNob3VsZCB3cmFwIHByb3BlcnR5IG9mIG9iamVjdFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXRob2QgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk1ldGhvZCB3cmFwcGVyIHNob3VsZCBiZSBmdW5jdGlvblwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHdyYXBwZWRNZXRob2QgPSBvYmplY3RbcHJvcGVydHldLFxuICAgICAgICAgICAgICAgIGVycm9yO1xuXG4gICAgICAgICAgICBpZiAoIWlzRnVuY3Rpb24od3JhcHBlZE1ldGhvZCkpIHtcbiAgICAgICAgICAgICAgICBlcnJvciA9IG5ldyBUeXBlRXJyb3IoXCJBdHRlbXB0ZWQgdG8gd3JhcCBcIiArICh0eXBlb2Ygd3JhcHBlZE1ldGhvZCkgKyBcIiBwcm9wZXJ0eSBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSArIFwiIGFzIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAod3JhcHBlZE1ldGhvZC5yZXN0b3JlICYmIHdyYXBwZWRNZXRob2QucmVzdG9yZS5zaW5vbikge1xuICAgICAgICAgICAgICAgIGVycm9yID0gbmV3IFR5cGVFcnJvcihcIkF0dGVtcHRlZCB0byB3cmFwIFwiICsgcHJvcGVydHkgKyBcIiB3aGljaCBpcyBhbHJlYWR5IHdyYXBwZWRcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh3cmFwcGVkTWV0aG9kLmNhbGxlZEJlZm9yZSkge1xuICAgICAgICAgICAgICAgIHZhciB2ZXJiID0gISF3cmFwcGVkTWV0aG9kLnJldHVybnMgPyBcInN0dWJiZWRcIiA6IFwic3BpZWQgb25cIjtcbiAgICAgICAgICAgICAgICBlcnJvciA9IG5ldyBUeXBlRXJyb3IoXCJBdHRlbXB0ZWQgdG8gd3JhcCBcIiArIHByb3BlcnR5ICsgXCIgd2hpY2ggaXMgYWxyZWFkeSBcIiArIHZlcmIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBpZiAod3JhcHBlZE1ldGhvZC5fc3RhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3Iuc3RhY2sgKz0gJ1xcbi0tLS0tLS0tLS0tLS0tXFxuJyArIHdyYXBwZWRNZXRob2QuX3N0YWNrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSUUgOCBkb2VzIG5vdCBzdXBwb3J0IGhhc093blByb3BlcnR5IG9uIHRoZSB3aW5kb3cgb2JqZWN0IGFuZCBGaXJlZm94IGhhcyBhIHByb2JsZW1cbiAgICAgICAgICAgIC8vIHdoZW4gdXNpbmcgaGFzT3duLmNhbGwgb24gb2JqZWN0cyBmcm9tIG90aGVyIGZyYW1lcy5cbiAgICAgICAgICAgIHZhciBvd25lZCA9IG9iamVjdC5oYXNPd25Qcm9wZXJ0eSA/IG9iamVjdC5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkgOiBoYXNPd24uY2FsbChvYmplY3QsIHByb3BlcnR5KTtcbiAgICAgICAgICAgIG9iamVjdFtwcm9wZXJ0eV0gPSBtZXRob2Q7XG4gICAgICAgICAgICBtZXRob2QuZGlzcGxheU5hbWUgPSBwcm9wZXJ0eTtcbiAgICAgICAgICAgIC8vIFNldCB1cCBhIHN0YWNrIHRyYWNlIHdoaWNoIGNhbiBiZSB1c2VkIGxhdGVyIHRvIGZpbmQgd2hhdCBsaW5lIG9mXG4gICAgICAgICAgICAvLyBjb2RlIHRoZSBvcmlnaW5hbCBtZXRob2Qgd2FzIGNyZWF0ZWQgb24uXG4gICAgICAgICAgICBtZXRob2QuX3N0YWNrID0gKG5ldyBFcnJvcignU3RhY2sgVHJhY2UgZm9yIG9yaWdpbmFsJykpLnN0YWNrO1xuXG4gICAgICAgICAgICBtZXRob2QucmVzdG9yZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgcHJvdG90eXBlIHByb3BlcnRpZXMgdHJ5IHRvIHJlc2V0IGJ5IGRlbGV0ZSBmaXJzdC5cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGZhaWxzIChleDogbG9jYWxTdG9yYWdlIG9uIG1vYmlsZSBzYWZhcmkpIHRoZW4gZm9yY2UgYSByZXNldFxuICAgICAgICAgICAgICAgIC8vIHZpYSBkaXJlY3QgYXNzaWdubWVudC5cbiAgICAgICAgICAgICAgICBpZiAoIW93bmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0W3Byb3BlcnR5XSA9PT0gbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdFtwcm9wZXJ0eV0gPSB3cmFwcGVkTWV0aG9kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIG1ldGhvZC5yZXN0b3JlLnNpbm9uID0gdHJ1ZTtcbiAgICAgICAgICAgIG1pcnJvclByb3BlcnRpZXMobWV0aG9kLCB3cmFwcGVkTWV0aG9kKTtcblxuICAgICAgICAgICAgcmV0dXJuIG1ldGhvZDtcbiAgICAgICAgfSxcblxuICAgICAgICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gYXJndW1lbnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudHNbaV0uaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFtwcm9wXSA9IGFyZ3VtZW50c1tpXVtwcm9wXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIERPTlQgRU5VTSBidWcsIG9ubHkgY2FyZSBhYm91dCB0b1N0cmluZ1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldLmhhc093blByb3BlcnR5KFwidG9TdHJpbmdcIikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50c1tpXS50b1N0cmluZyAhPSB0YXJnZXQudG9TdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC50b1N0cmluZyA9IGFyZ3VtZW50c1tpXS50b1N0cmluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIGNyZWF0ZShwcm90bykge1xuICAgICAgICAgICAgdmFyIEYgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIEYucHJvdG90eXBlID0gcHJvdG87XG4gICAgICAgICAgICByZXR1cm4gbmV3IEYoKTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWVwRXF1YWw6IGZ1bmN0aW9uIGRlZXBFcXVhbChhLCBiKSB7XG4gICAgICAgICAgICBpZiAoc2lub24ubWF0Y2ggJiYgc2lub24ubWF0Y2guaXNNYXRjaGVyKGEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEudGVzdChiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgYSAhPSBcIm9iamVjdFwiIHx8IHR5cGVvZiBiICE9IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzRWxlbWVudChhKSB8fCBpc0VsZW1lbnQoYikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYSA9PT0gYjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKChhID09PSBudWxsICYmIGIgIT09IG51bGwpIHx8IChhICE9PSBudWxsICYmIGIgPT09IG51bGwpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgYVN0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhKTtcbiAgICAgICAgICAgIGlmIChhU3RyaW5nICE9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChiKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFTdHJpbmcgPT0gXCJbb2JqZWN0IERhdGVdXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYS52YWx1ZU9mKCkgPT09IGIudmFsdWVPZigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcHJvcCwgYUxlbmd0aCA9IDAsIGJMZW5ndGggPSAwO1xuXG4gICAgICAgICAgICBpZiAoYVN0cmluZyA9PSBcIltvYmplY3QgQXJyYXldXCIgJiYgYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKHByb3AgaW4gYSkge1xuICAgICAgICAgICAgICAgIGFMZW5ndGggKz0gMTtcblxuICAgICAgICAgICAgICAgIGlmICghZGVlcEVxdWFsKGFbcHJvcF0sIGJbcHJvcF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAocHJvcCBpbiBiKSB7XG4gICAgICAgICAgICAgICAgYkxlbmd0aCArPSAxO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYUxlbmd0aCA9PSBiTGVuZ3RoO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZ1bmMpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gZnVuYy5kaXNwbGF5TmFtZSB8fCBmdW5jLm5hbWU7XG5cbiAgICAgICAgICAgIC8vIFVzZSBmdW5jdGlvbiBkZWNvbXBvc2l0aW9uIGFzIGEgbGFzdCByZXNvcnQgdG8gZ2V0IGZ1bmN0aW9uXG4gICAgICAgICAgICAvLyBuYW1lLiBEb2VzIG5vdCByZWx5IG9uIGZ1bmN0aW9uIGRlY29tcG9zaXRpb24gdG8gd29yayAtIGlmIGl0XG4gICAgICAgICAgICAvLyBkb2Vzbid0IGRlYnVnZ2luZyB3aWxsIGJlIHNsaWdodGx5IGxlc3MgaW5mb3JtYXRpdmVcbiAgICAgICAgICAgIC8vIChpLmUuIHRvU3RyaW5nIHdpbGwgc2F5ICdzcHknIHJhdGhlciB0aGFuICdteUZ1bmMnKS5cbiAgICAgICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVzID0gZnVuYy50b1N0cmluZygpLm1hdGNoKC9mdW5jdGlvbiAoW15cXHNcXChdKykvKTtcbiAgICAgICAgICAgICAgICBuYW1lID0gbWF0Y2hlcyAmJiBtYXRjaGVzWzFdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbmFtZTtcbiAgICAgICAgfSxcblxuICAgICAgICBmdW5jdGlvblRvU3RyaW5nOiBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldENhbGwgJiYgdGhpcy5jYWxsQ291bnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGhpc1ZhbHVlLCBwcm9wLCBpID0gdGhpcy5jYWxsQ291bnQ7XG5cbiAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNWYWx1ZSA9IHRoaXMuZ2V0Q2FsbChpKS50aGlzVmFsdWU7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChwcm9wIGluIHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXNWYWx1ZVtwcm9wXSA9PT0gdGhpcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kaXNwbGF5TmFtZSB8fCBcInNpbm9uIGZha2VcIjtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRDb25maWc6IGZ1bmN0aW9uIChjdXN0b20pIHtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSB7fTtcbiAgICAgICAgICAgIGN1c3RvbSA9IGN1c3RvbSB8fCB7fTtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHNpbm9uLmRlZmF1bHRDb25maWc7XG5cbiAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdHMuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnW3Byb3BdID0gY3VzdG9tLmhhc093blByb3BlcnR5KHByb3ApID8gY3VzdG9tW3Byb3BdIDogZGVmYXVsdHNbcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY29uZmlnO1xuICAgICAgICB9LFxuXG4gICAgICAgIGZvcm1hdDogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyB2YWw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVmYXVsdENvbmZpZzoge1xuICAgICAgICAgICAgaW5qZWN0SW50b1RoaXM6IHRydWUsXG4gICAgICAgICAgICBpbmplY3RJbnRvOiBudWxsLFxuICAgICAgICAgICAgcHJvcGVydGllczogW1wic3B5XCIsIFwic3R1YlwiLCBcIm1vY2tcIiwgXCJjbG9ja1wiLCBcInNlcnZlclwiLCBcInJlcXVlc3RzXCJdLFxuICAgICAgICAgICAgdXNlRmFrZVRpbWVyczogdHJ1ZSxcbiAgICAgICAgICAgIHVzZUZha2VTZXJ2ZXI6IHRydWVcbiAgICAgICAgfSxcblxuICAgICAgICB0aW1lc0luV29yZHM6IGZ1bmN0aW9uIHRpbWVzSW5Xb3Jkcyhjb3VudCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvdW50ID09IDEgJiYgXCJvbmNlXCIgfHxcbiAgICAgICAgICAgICAgICBjb3VudCA9PSAyICYmIFwidHdpY2VcIiB8fFxuICAgICAgICAgICAgICAgIGNvdW50ID09IDMgJiYgXCJ0aHJpY2VcIiB8fFxuICAgICAgICAgICAgICAgIChjb3VudCB8fCAwKSArIFwiIHRpbWVzXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsbGVkSW5PcmRlcjogZnVuY3Rpb24gKHNwaWVzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMSwgbCA9IHNwaWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghc3BpZXNbaSAtIDFdLmNhbGxlZEJlZm9yZShzcGllc1tpXSkgfHwgIXNwaWVzW2ldLmNhbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcblxuICAgICAgICBvcmRlckJ5Rmlyc3RDYWxsOiBmdW5jdGlvbiAoc3BpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBzcGllcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgLy8gdXVpZCwgd29uJ3QgZXZlciBiZSBlcXVhbFxuICAgICAgICAgICAgICAgIHZhciBhQ2FsbCA9IGEuZ2V0Q2FsbCgwKTtcbiAgICAgICAgICAgICAgICB2YXIgYkNhbGwgPSBiLmdldENhbGwoMCk7XG4gICAgICAgICAgICAgICAgdmFyIGFJZCA9IGFDYWxsICYmIGFDYWxsLmNhbGxJZCB8fCAtMTtcbiAgICAgICAgICAgICAgICB2YXIgYklkID0gYkNhbGwgJiYgYkNhbGwuY2FsbElkIHx8IC0xO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFJZCA8IGJJZCA/IC0xIDogMTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGxvZzogZnVuY3Rpb24gKCkge30sXG5cbiAgICAgICAgbG9nRXJyb3I6IGZ1bmN0aW9uIChsYWJlbCwgZXJyKSB7XG4gICAgICAgICAgICB2YXIgbXNnID0gbGFiZWwgKyBcIiB0aHJldyBleGNlcHRpb246IFwiO1xuICAgICAgICAgICAgc2lub24ubG9nKG1zZyArIFwiW1wiICsgZXJyLm5hbWUgKyBcIl0gXCIgKyBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICBpZiAoZXJyLnN0YWNrKSB7IHNpbm9uLmxvZyhlcnIuc3RhY2spOyB9XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGVyci5tZXNzYWdlID0gbXNnICsgZXJyLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdHlwZU9mOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIm51bGxcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ1bmRlZmluZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZy5zdWJzdHJpbmcoOCwgc3RyaW5nLmxlbmd0aCAtIDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY3JlYXRlU3R1Ykluc3RhbmNlOiBmdW5jdGlvbiAoY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uc3RydWN0b3IgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJUaGUgY29uc3RydWN0b3Igc2hvdWxkIGJlIGEgZnVuY3Rpb24uXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNpbm9uLnN0dWIoc2lub24uY3JlYXRlKGNvbnN0cnVjdG9yLnByb3RvdHlwZSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlc3RvcmU6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgIT09IG51bGwgJiYgdHlwZW9mIG9iamVjdCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RvcmFibGUob2JqZWN0W3Byb3BdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0W3Byb3BdLnJlc3RvcmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlzUmVzdG9yYWJsZShvYmplY3QpKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaXNOb2RlID0gdHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cztcbiAgICB2YXIgaXNBTUQgPSB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBkZWZpbmUuYW1kID09PSAnb2JqZWN0JyAmJiBkZWZpbmUuYW1kO1xuXG4gICAgaWYgKGlzQU1EKSB7XG4gICAgICAgIGRlZmluZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuIHNpbm9uO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGlzTm9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZm9ybWF0aW8gPSByZXF1aXJlKFwiZm9ybWF0aW9cIik7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gc2lub247XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLnNweSA9IHJlcXVpcmUoXCIuL3Npbm9uL3NweVwiKTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuc3B5Q2FsbCA9IHJlcXVpcmUoXCIuL3Npbm9uL2NhbGxcIik7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmJlaGF2aW9yID0gcmVxdWlyZShcIi4vc2lub24vYmVoYXZpb3JcIik7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLnN0dWIgPSByZXF1aXJlKFwiLi9zaW5vbi9zdHViXCIpO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5tb2NrID0gcmVxdWlyZShcIi4vc2lub24vbW9ja1wiKTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuY29sbGVjdGlvbiA9IHJlcXVpcmUoXCIuL3Npbm9uL2NvbGxlY3Rpb25cIik7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLmFzc2VydCA9IHJlcXVpcmUoXCIuL3Npbm9uL2Fzc2VydFwiKTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuc2FuZGJveCA9IHJlcXVpcmUoXCIuL3Npbm9uL3NhbmRib3hcIik7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzLnRlc3QgPSByZXF1aXJlKFwiLi9zaW5vbi90ZXN0XCIpO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy50ZXN0Q2FzZSA9IHJlcXVpcmUoXCIuL3Npbm9uL3Rlc3RfY2FzZVwiKTtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMuYXNzZXJ0ID0gcmVxdWlyZShcIi4vc2lub24vYXNzZXJ0XCIpO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cy5tYXRjaCA9IHJlcXVpcmUoXCIuL3Npbm9uL21hdGNoXCIpO1xuICAgIH1cblxuICAgIGlmIChmb3JtYXRpbykge1xuICAgICAgICB2YXIgZm9ybWF0dGVyID0gZm9ybWF0aW8uY29uZmlndXJlKHsgcXVvdGVTdHJpbmdzOiBmYWxzZSB9KTtcbiAgICAgICAgc2lub24uZm9ybWF0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdHRlci5hc2NpaS5hcHBseShmb3JtYXR0ZXIsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfSBlbHNlIGlmIChpc05vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciB1dGlsID0gcmVxdWlyZShcInV0aWxcIik7XG4gICAgICAgICAgICBzaW5vbi5mb3JtYXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUudG9TdHJpbmcgPT09IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcgPyB1dGlsLmluc3BlY3QodmFsdWUpIDogdmFsdWU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAvKiBOb2RlLCBidXQgbm8gdXRpbCBtb2R1bGUgLSB3b3VsZCBiZSB2ZXJ5IG9sZCwgYnV0IGJldHRlciBzYWZlIHRoYW5cbiAgICAgICAgICAgICBzb3JyeSAqL1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNpbm9uO1xufSh0eXBlb2YgZm9ybWF0aW8gPT0gXCJvYmplY3RcIiAmJiBmb3JtYXRpbykpO1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwpey8qKlxuICogQGRlcGVuZCAuLi9zaW5vbi5qc1xuICogQGRlcGVuZCBzdHViLmpzXG4gKi9cbi8qanNsaW50IGVxZXFlcTogZmFsc2UsIG9uZXZhcjogZmFsc2UsIG5vbWVuOiBmYWxzZSwgcGx1c3BsdXM6IGZhbHNlKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSwgc2lub24qL1xuLyoqXG4gKiBBc3NlcnRpb25zIG1hdGNoaW5nIHRoZSB0ZXN0IHNweSByZXRyaWV2YWwgaW50ZXJmYWNlLlxuICpcbiAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uLCBnbG9iYWwpIHtcbiAgICB2YXIgY29tbW9uSlNNb2R1bGUgPSB0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzO1xuICAgIHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgICB2YXIgYXNzZXJ0O1xuXG4gICAgaWYgKCFzaW5vbiAmJiBjb21tb25KU01vZHVsZSkge1xuICAgICAgICBzaW5vbiA9IHJlcXVpcmUoXCIuLi9zaW5vblwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXNpbm9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB2ZXJpZnlJc1N0dWIoKSB7XG4gICAgICAgIHZhciBtZXRob2Q7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBtZXRob2QgPSBhcmd1bWVudHNbaV07XG5cbiAgICAgICAgICAgIGlmICghbWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmZhaWwoXCJmYWtlIGlzIG5vdCBhIHNweVwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXRob2QgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmZhaWwobWV0aG9kICsgXCIgaXMgbm90IGEgZnVuY3Rpb25cIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWV0aG9kLmdldENhbGwgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LmZhaWwobWV0aG9kICsgXCIgaXMgbm90IHN0dWJiZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmYWlsQXNzZXJ0aW9uKG9iamVjdCwgbXNnKSB7XG4gICAgICAgIG9iamVjdCA9IG9iamVjdCB8fCBnbG9iYWw7XG4gICAgICAgIHZhciBmYWlsTWV0aG9kID0gb2JqZWN0LmZhaWwgfHwgYXNzZXJ0LmZhaWw7XG4gICAgICAgIGZhaWxNZXRob2QuY2FsbChvYmplY3QsIG1zZyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWlycm9yUHJvcEFzQXNzZXJ0aW9uKG5hbWUsIG1ldGhvZCwgbWVzc2FnZSkge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgICAgICBtZXNzYWdlID0gbWV0aG9kO1xuICAgICAgICAgICAgbWV0aG9kID0gbmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzc2VydFtuYW1lXSA9IGZ1bmN0aW9uIChmYWtlKSB7XG4gICAgICAgICAgICB2ZXJpZnlJc1N0dWIoZmFrZSk7XG5cbiAgICAgICAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgdmFyIGZhaWxlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG1ldGhvZCA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBmYWlsZWQgPSAhbWV0aG9kKGZha2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmYWlsZWQgPSB0eXBlb2YgZmFrZVttZXRob2RdID09IFwiZnVuY3Rpb25cIiA/XG4gICAgICAgICAgICAgICAgICAgICFmYWtlW21ldGhvZF0uYXBwbHkoZmFrZSwgYXJncykgOiAhZmFrZVttZXRob2RdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZmFpbGVkKSB7XG4gICAgICAgICAgICAgICAgZmFpbEFzc2VydGlvbih0aGlzLCBmYWtlLnByaW50Zi5hcHBseShmYWtlLCBbbWVzc2FnZV0uY29uY2F0KGFyZ3MpKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFzc2VydC5wYXNzKG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGV4cG9zZWROYW1lKHByZWZpeCwgcHJvcCkge1xuICAgICAgICByZXR1cm4gIXByZWZpeCB8fCAvXmZhaWwvLnRlc3QocHJvcCkgPyBwcm9wIDpcbiAgICAgICAgICAgIHByZWZpeCArIHByb3Auc2xpY2UoMCwgMSkudG9VcHBlckNhc2UoKSArIHByb3Auc2xpY2UoMSk7XG4gICAgfVxuXG4gICAgYXNzZXJ0ID0ge1xuICAgICAgICBmYWlsRXhjZXB0aW9uOiBcIkFzc2VydEVycm9yXCIsXG5cbiAgICAgICAgZmFpbDogZnVuY3Rpb24gZmFpbChtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICAgICAgICBlcnJvci5uYW1lID0gdGhpcy5mYWlsRXhjZXB0aW9uIHx8IGFzc2VydC5mYWlsRXhjZXB0aW9uO1xuXG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfSxcblxuICAgICAgICBwYXNzOiBmdW5jdGlvbiBwYXNzKGFzc2VydGlvbikge30sXG5cbiAgICAgICAgY2FsbE9yZGVyOiBmdW5jdGlvbiBhc3NlcnRDYWxsT3JkZXIoKSB7XG4gICAgICAgICAgICB2ZXJpZnlJc1N0dWIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHZhciBleHBlY3RlZCA9IFwiXCIsIGFjdHVhbCA9IFwiXCI7XG5cbiAgICAgICAgICAgIGlmICghc2lub24uY2FsbGVkSW5PcmRlcihhcmd1bWVudHMpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQgPSBbXS5qb2luLmNhbGwoYXJndW1lbnRzLCBcIiwgXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbHMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gY2FsbHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjYWxsc1stLWldLmNhbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhY3R1YWwgPSBzaW5vbi5vcmRlckJ5Rmlyc3RDYWxsKGNhbGxzKS5qb2luKFwiLCBcIik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGlzIGZhaWxzLCB3ZSdsbCBqdXN0IGZhbGwgYmFjayB0byB0aGUgYmxhbmsgc3RyaW5nXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZmFpbEFzc2VydGlvbih0aGlzLCBcImV4cGVjdGVkIFwiICsgZXhwZWN0ZWQgKyBcIiB0byBiZSBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImNhbGxlZCBpbiBvcmRlciBidXQgd2VyZSBjYWxsZWQgYXMgXCIgKyBhY3R1YWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQucGFzcyhcImNhbGxPcmRlclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsQ291bnQ6IGZ1bmN0aW9uIGFzc2VydENhbGxDb3VudChtZXRob2QsIGNvdW50KSB7XG4gICAgICAgICAgICB2ZXJpZnlJc1N0dWIobWV0aG9kKTtcblxuICAgICAgICAgICAgaWYgKG1ldGhvZC5jYWxsQ291bnQgIT0gY291bnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXNnID0gXCJleHBlY3RlZCAlbiB0byBiZSBjYWxsZWQgXCIgKyBzaW5vbi50aW1lc0luV29yZHMoY291bnQpICtcbiAgICAgICAgICAgICAgICAgICAgXCIgYnV0IHdhcyBjYWxsZWQgJWMlQ1wiO1xuICAgICAgICAgICAgICAgIGZhaWxBc3NlcnRpb24odGhpcywgbWV0aG9kLnByaW50Zihtc2cpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0LnBhc3MoXCJjYWxsQ291bnRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXhwb3NlOiBmdW5jdGlvbiBleHBvc2UodGFyZ2V0LCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ0YXJnZXQgaXMgbnVsbCBvciB1bmRlZmluZWRcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICAgIHZhciBwcmVmaXggPSB0eXBlb2Ygby5wcmVmaXggPT0gXCJ1bmRlZmluZWRcIiAmJiBcImFzc2VydFwiIHx8IG8ucHJlZml4O1xuICAgICAgICAgICAgdmFyIGluY2x1ZGVGYWlsID0gdHlwZW9mIG8uaW5jbHVkZUZhaWwgPT0gXCJ1bmRlZmluZWRcIiB8fCAhIW8uaW5jbHVkZUZhaWw7XG5cbiAgICAgICAgICAgIGZvciAodmFyIG1ldGhvZCBpbiB0aGlzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1ldGhvZCAhPSBcImV4cG9ydFwiICYmIChpbmNsdWRlRmFpbCB8fCAhL14oZmFpbCkvLnRlc3QobWV0aG9kKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2V4cG9zZWROYW1lKHByZWZpeCwgbWV0aG9kKV0gPSB0aGlzW21ldGhvZF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcImNhbGxlZFwiLCBcImV4cGVjdGVkICVuIHRvIGhhdmUgYmVlbiBjYWxsZWQgYXQgbGVhc3Qgb25jZSBidXQgd2FzIG5ldmVyIGNhbGxlZFwiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJub3RDYWxsZWRcIiwgZnVuY3Rpb24gKHNweSkgeyByZXR1cm4gIXNweS5jYWxsZWQ7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiZXhwZWN0ZWQgJW4gdG8gbm90IGhhdmUgYmVlbiBjYWxsZWQgYnV0IHdhcyBjYWxsZWQgJWMlQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJjYWxsZWRPbmNlXCIsIFwiZXhwZWN0ZWQgJW4gdG8gYmUgY2FsbGVkIG9uY2UgYnV0IHdhcyBjYWxsZWQgJWMlQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJjYWxsZWRUd2ljZVwiLCBcImV4cGVjdGVkICVuIHRvIGJlIGNhbGxlZCB0d2ljZSBidXQgd2FzIGNhbGxlZCAlYyVDXCIpO1xuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcImNhbGxlZFRocmljZVwiLCBcImV4cGVjdGVkICVuIHRvIGJlIGNhbGxlZCB0aHJpY2UgYnV0IHdhcyBjYWxsZWQgJWMlQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJjYWxsZWRPblwiLCBcImV4cGVjdGVkICVuIHRvIGJlIGNhbGxlZCB3aXRoICUxIGFzIHRoaXMgYnV0IHdhcyBjYWxsZWQgd2l0aCAldFwiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJhbHdheXNDYWxsZWRPblwiLCBcImV4cGVjdGVkICVuIHRvIGFsd2F5cyBiZSBjYWxsZWQgd2l0aCAlMSBhcyB0aGlzIGJ1dCB3YXMgY2FsbGVkIHdpdGggJXRcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwiY2FsbGVkV2l0aE5ld1wiLCBcImV4cGVjdGVkICVuIHRvIGJlIGNhbGxlZCB3aXRoIG5ld1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJhbHdheXNDYWxsZWRXaXRoTmV3XCIsIFwiZXhwZWN0ZWQgJW4gdG8gYWx3YXlzIGJlIGNhbGxlZCB3aXRoIG5ld1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJjYWxsZWRXaXRoXCIsIFwiZXhwZWN0ZWQgJW4gdG8gYmUgY2FsbGVkIHdpdGggYXJndW1lbnRzICUqJUNcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwiY2FsbGVkV2l0aE1hdGNoXCIsIFwiZXhwZWN0ZWQgJW4gdG8gYmUgY2FsbGVkIHdpdGggbWF0Y2ggJSolQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJhbHdheXNDYWxsZWRXaXRoXCIsIFwiZXhwZWN0ZWQgJW4gdG8gYWx3YXlzIGJlIGNhbGxlZCB3aXRoIGFyZ3VtZW50cyAlKiVDXCIpO1xuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcImFsd2F5c0NhbGxlZFdpdGhNYXRjaFwiLCBcImV4cGVjdGVkICVuIHRvIGFsd2F5cyBiZSBjYWxsZWQgd2l0aCBtYXRjaCAlKiVDXCIpO1xuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcImNhbGxlZFdpdGhFeGFjdGx5XCIsIFwiZXhwZWN0ZWQgJW4gdG8gYmUgY2FsbGVkIHdpdGggZXhhY3QgYXJndW1lbnRzICUqJUNcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwiYWx3YXlzQ2FsbGVkV2l0aEV4YWN0bHlcIiwgXCJleHBlY3RlZCAlbiB0byBhbHdheXMgYmUgY2FsbGVkIHdpdGggZXhhY3QgYXJndW1lbnRzICUqJUNcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwibmV2ZXJDYWxsZWRXaXRoXCIsIFwiZXhwZWN0ZWQgJW4gdG8gbmV2ZXIgYmUgY2FsbGVkIHdpdGggYXJndW1lbnRzICUqJUNcIik7XG4gICAgbWlycm9yUHJvcEFzQXNzZXJ0aW9uKFwibmV2ZXJDYWxsZWRXaXRoTWF0Y2hcIiwgXCJleHBlY3RlZCAlbiB0byBuZXZlciBiZSBjYWxsZWQgd2l0aCBtYXRjaCAlKiVDXCIpO1xuICAgIG1pcnJvclByb3BBc0Fzc2VydGlvbihcInRocmV3XCIsIFwiJW4gZGlkIG5vdCB0aHJvdyBleGNlcHRpb24lQ1wiKTtcbiAgICBtaXJyb3JQcm9wQXNBc3NlcnRpb24oXCJhbHdheXNUaHJld1wiLCBcIiVuIGRpZCBub3QgYWx3YXlzIHRocm93IGV4Y2VwdGlvbiVDXCIpO1xuXG4gICAgaWYgKGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gYXNzZXJ0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLmFzc2VydCA9IGFzc2VydDtcbiAgICB9XG59KHR5cGVvZiBzaW5vbiA9PSBcIm9iamVjdFwiICYmIHNpbm9uIHx8IG51bGwsIHR5cGVvZiB3aW5kb3cgIT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6ICh0eXBlb2Ygc2VsZiAhPSBcInVuZGVmaW5lZFwiKSA/IHNlbGYgOiBnbG9iYWwpKTtcbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXsvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqL1xuLypqc2xpbnQgZXFlcWVxOiBmYWxzZSwgb25ldmFyOiBmYWxzZSovXG4vKmdsb2JhbCBtb2R1bGUsIHJlcXVpcmUsIHNpbm9uLCBwcm9jZXNzLCBzZXRJbW1lZGlhdGUsIHNldFRpbWVvdXQqL1xuLyoqXG4gKiBTdHViIGJlaGF2aW9yXG4gKlxuICogQGF1dGhvciBDaHJpc3RpYW4gSm9oYW5zZW4gKGNocmlzdGlhbkBjam9oYW5zZW4ubm8pXG4gKiBAYXV0aG9yIFRpbSBGaXNjaGJhY2ggKG1haWxAdGltZmlzY2hiYWNoLmRlKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uKSB7XG4gICAgdmFyIGNvbW1vbkpTTW9kdWxlID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG5cbiAgICBpZiAoIXNpbm9uICYmIGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIHNpbm9uID0gcmVxdWlyZShcIi4uL3Npbm9uXCIpO1xuICAgIH1cblxuICAgIGlmICghc2lub24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgICB2YXIgam9pbiA9IEFycmF5LnByb3RvdHlwZS5qb2luO1xuICAgIHZhciBwcm90bztcblxuICAgIHZhciBuZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcHJvY2Vzcy5uZXh0VGljayA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzcy5uZXh0VGljaztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBzZXRJbW1lZGlhdGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChjYWxsYmFjaywgMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSkoKTtcblxuICAgIGZ1bmN0aW9uIHRocm93c0V4Y2VwdGlvbihlcnJvciwgbWVzc2FnZSkge1xuICAgICAgICBpZiAodHlwZW9mIGVycm9yID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHRoaXMuZXhjZXB0aW9uID0gbmV3IEVycm9yKG1lc3NhZ2UgfHwgXCJcIik7XG4gICAgICAgICAgICB0aGlzLmV4Y2VwdGlvbi5uYW1lID0gZXJyb3I7XG4gICAgICAgIH0gZWxzZSBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmV4Y2VwdGlvbiA9IG5ldyBFcnJvcihcIkVycm9yXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5leGNlcHRpb24gPSBlcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldENhbGxiYWNrKGJlaGF2aW9yLCBhcmdzKSB7XG4gICAgICAgIHZhciBjYWxsQXJnQXQgPSBiZWhhdmlvci5jYWxsQXJnQXQ7XG5cbiAgICAgICAgaWYgKGNhbGxBcmdBdCA8IDApIHtcbiAgICAgICAgICAgIHZhciBjYWxsQXJnUHJvcCA9IGJlaGF2aW9yLmNhbGxBcmdQcm9wO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsQXJnUHJvcCAmJiB0eXBlb2YgYXJnc1tpXSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbaV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGNhbGxBcmdQcm9wICYmIGFyZ3NbaV0gJiZcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGFyZ3NbaV1bY2FsbEFyZ1Byb3BdID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1tpXVtjYWxsQXJnUHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcmdzW2NhbGxBcmdBdF07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q2FsbGJhY2tFcnJvcihiZWhhdmlvciwgZnVuYywgYXJncykge1xuICAgICAgICBpZiAoYmVoYXZpb3IuY2FsbEFyZ0F0IDwgMCkge1xuICAgICAgICAgICAgdmFyIG1zZztcblxuICAgICAgICAgICAgaWYgKGJlaGF2aW9yLmNhbGxBcmdQcm9wKSB7XG4gICAgICAgICAgICAgICAgbXNnID0gc2lub24uZnVuY3Rpb25OYW1lKGJlaGF2aW9yLnN0dWIpICtcbiAgICAgICAgICAgICAgICAgICAgXCIgZXhwZWN0ZWQgdG8geWllbGQgdG8gJ1wiICsgYmVoYXZpb3IuY2FsbEFyZ1Byb3AgK1xuICAgICAgICAgICAgICAgICAgICBcIicsIGJ1dCBubyBvYmplY3Qgd2l0aCBzdWNoIGEgcHJvcGVydHkgd2FzIHBhc3NlZC5cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbXNnID0gc2lub24uZnVuY3Rpb25OYW1lKGJlaGF2aW9yLnN0dWIpICtcbiAgICAgICAgICAgICAgICAgICAgXCIgZXhwZWN0ZWQgdG8geWllbGQsIGJ1dCBubyBjYWxsYmFjayB3YXMgcGFzc2VkLlwiO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbXNnICs9IFwiIFJlY2VpdmVkIFtcIiArIGpvaW4uY2FsbChhcmdzLCBcIiwgXCIpICsgXCJdXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtc2c7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gXCJhcmd1bWVudCBhdCBpbmRleCBcIiArIGJlaGF2aW9yLmNhbGxBcmdBdCArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uOiBcIiArIGZ1bmM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsbENhbGxiYWNrKGJlaGF2aW9yLCBhcmdzKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYmVoYXZpb3IuY2FsbEFyZ0F0ID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHZhciBmdW5jID0gZ2V0Q2FsbGJhY2soYmVoYXZpb3IsIGFyZ3MpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZ1bmMgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihnZXRDYWxsYmFja0Vycm9yKGJlaGF2aW9yLCBmdW5jLCBhcmdzKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChiZWhhdmlvci5jYWxsYmFja0FzeW5jKSB7XG4gICAgICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGZ1bmMuYXBwbHkoYmVoYXZpb3IuY2FsbGJhY2tDb250ZXh0LCBiZWhhdmlvci5jYWxsYmFja0FyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZ1bmMuYXBwbHkoYmVoYXZpb3IuY2FsbGJhY2tDb250ZXh0LCBiZWhhdmlvci5jYWxsYmFja0FyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcm90byA9IHtcbiAgICAgICAgY3JlYXRlOiBmdW5jdGlvbihzdHViKSB7XG4gICAgICAgICAgICB2YXIgYmVoYXZpb3IgPSBzaW5vbi5leHRlbmQoe30sIHNpbm9uLmJlaGF2aW9yKTtcbiAgICAgICAgICAgIGRlbGV0ZSBiZWhhdmlvci5jcmVhdGU7XG4gICAgICAgICAgICBiZWhhdmlvci5zdHViID0gc3R1YjtcblxuICAgICAgICAgICAgcmV0dXJuIGJlaGF2aW9yO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzUHJlc2VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gKHR5cGVvZiB0aGlzLmNhbGxBcmdBdCA9PSAnbnVtYmVyJyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4Y2VwdGlvbiB8fFxuICAgICAgICAgICAgICAgICAgICB0eXBlb2YgdGhpcy5yZXR1cm5BcmdBdCA9PSAnbnVtYmVyJyB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJldHVyblRoaXMgfHxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZURlZmluZWQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGludm9rZTogZnVuY3Rpb24oY29udGV4dCwgYXJncykge1xuICAgICAgICAgICAgY2FsbENhbGxiYWNrKHRoaXMsIGFyZ3MpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5leGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLmV4Y2VwdGlvbjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMucmV0dXJuQXJnQXQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1t0aGlzLnJldHVybkFyZ0F0XTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5yZXR1cm5UaGlzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJldHVyblZhbHVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uQ2FsbDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0dWIub25DYWxsKGluZGV4KTtcbiAgICAgICAgfSxcblxuICAgICAgICBvbkZpcnN0Q2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zdHViLm9uRmlyc3RDYWxsKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25TZWNvbmRDYWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN0dWIub25TZWNvbmRDYWxsKCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgb25UaGlyZENhbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3R1Yi5vblRoaXJkQ2FsbCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdpdGhBcmdzOiBmdW5jdGlvbigvKiBhcmd1bWVudHMgKi8pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGVmaW5pbmcgYSBzdHViIGJ5IGludm9raW5nIFwic3R1Yi5vbkNhbGwoLi4uKS53aXRoQXJncyguLi4pXCIgaXMgbm90IHN1cHBvcnRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1VzZSBcInN0dWIud2l0aEFyZ3MoLi4uKS5vbkNhbGwoLi4uKVwiIHRvIGRlZmluZSBzZXF1ZW50aWFsIGJlaGF2aW9yIGZvciBjYWxscyB3aXRoIGNlcnRhaW4gYXJndW1lbnRzLicpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxzQXJnOiBmdW5jdGlvbiBjYWxsc0FyZyhwb3MpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcG9zICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXJndW1lbnQgaW5kZXggaXMgbm90IG51bWJlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jYWxsQXJnQXQgPSBwb3M7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXJndW1lbnRzID0gW107XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuY2FsbEFyZ1Byb3AgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXN5bmMgPSBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsbHNBcmdPbjogZnVuY3Rpb24gY2FsbHNBcmdPbihwb3MsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcG9zICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXJndW1lbnQgaW5kZXggaXMgbm90IG51bWJlclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udGV4dCAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFyZ3VtZW50IGNvbnRleHQgaXMgbm90IGFuIG9iamVjdFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jYWxsQXJnQXQgPSBwb3M7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXJndW1lbnRzID0gW107XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdQcm9wID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FzeW5jID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxzQXJnV2l0aDogZnVuY3Rpb24gY2FsbHNBcmdXaXRoKHBvcykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwb3MgIT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhcmd1bWVudCBpbmRleCBpcyBub3QgbnVtYmVyXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdBdCA9IHBvcztcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBcmd1bWVudHMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuY2FsbEFyZ1Byb3AgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXN5bmMgPSBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsbHNBcmdPbldpdGg6IGZ1bmN0aW9uIGNhbGxzQXJnV2l0aChwb3MsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcG9zICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXJndW1lbnQgaW5kZXggaXMgbm90IG51bWJlclwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udGV4dCAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFyZ3VtZW50IGNvbnRleHQgaXMgbm90IGFuIG9iamVjdFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jYWxsQXJnQXQgPSBwb3M7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXJndW1lbnRzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgdGhpcy5jYWxsQXJnUHJvcCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBc3luYyA9IGZhbHNlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICB5aWVsZHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuY2FsbEFyZ0F0ID0gLTE7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXJndW1lbnRzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0NvbnRleHQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdQcm9wID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FzeW5jID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIHlpZWxkc09uOiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb250ZXh0ICE9IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXJndW1lbnQgY29udGV4dCBpcyBub3QgYW4gb2JqZWN0XCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdBdCA9IC0xO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FyZ3VtZW50cyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tDb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIHRoaXMuY2FsbEFyZ1Byb3AgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXN5bmMgPSBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgeWllbGRzVG86IGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdBdCA9IC0xO1xuICAgICAgICAgICAgdGhpcy5jYWxsYmFja0FyZ3VtZW50cyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tDb250ZXh0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgdGhpcy5jYWxsQXJnUHJvcCA9IHByb3A7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQXN5bmMgPSBmYWxzZTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgeWllbGRzVG9PbjogZnVuY3Rpb24gKHByb3AsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udGV4dCAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFyZ3VtZW50IGNvbnRleHQgaXMgbm90IGFuIG9iamVjdFwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jYWxsQXJnQXQgPSAtMTtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBcmd1bWVudHMgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICB0aGlzLmNhbGxiYWNrQ29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdQcm9wID0gcHJvcDtcbiAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBc3luYyA9IGZhbHNlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuXG4gICAgICAgIFwidGhyb3dzXCI6IHRocm93c0V4Y2VwdGlvbixcbiAgICAgICAgdGhyb3dzRXhjZXB0aW9uOiB0aHJvd3NFeGNlcHRpb24sXG5cbiAgICAgICAgcmV0dXJuczogZnVuY3Rpb24gcmV0dXJucyh2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZURlZmluZWQgPSB0cnVlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICByZXR1cm5zQXJnOiBmdW5jdGlvbiByZXR1cm5zQXJnKHBvcykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwb3MgIT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhcmd1bWVudCBpbmRleCBpcyBub3QgbnVtYmVyXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnJldHVybkFyZ0F0ID0gcG9zO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcblxuICAgICAgICByZXR1cm5zVGhpczogZnVuY3Rpb24gcmV0dXJuc1RoaXMoKSB7XG4gICAgICAgICAgICB0aGlzLnJldHVyblRoaXMgPSB0cnVlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBjcmVhdGUgYXN5bmNocm9ub3VzIHZlcnNpb25zIG9mIGNhbGxzQXJnKiBhbmQgeWllbGRzKiBtZXRob2RzXG4gICAgZm9yICh2YXIgbWV0aG9kIGluIHByb3RvKSB7XG4gICAgICAgIC8vIG5lZWQgdG8gYXZvaWQgY3JlYXRpbmcgYW5vdGhlcmFzeW5jIHZlcnNpb25zIG9mIHRoZSBuZXdseSBhZGRlZCBhc3luYyBtZXRob2RzXG4gICAgICAgIGlmIChwcm90by5oYXNPd25Qcm9wZXJ0eShtZXRob2QpICYmXG4gICAgICAgICAgICBtZXRob2QubWF0Y2goL14oY2FsbHNBcmd8eWllbGRzKS8pICYmXG4gICAgICAgICAgICAhbWV0aG9kLm1hdGNoKC9Bc3luYy8pKSB7XG4gICAgICAgICAgICBwcm90b1ttZXRob2QgKyAnQXN5bmMnXSA9IChmdW5jdGlvbiAoc3luY0ZuTmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSB0aGlzW3N5bmNGbk5hbWVdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsbGJhY2tBc3luYyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pKG1ldGhvZCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBwcm90bztcbiAgICB9IGVsc2Uge1xuICAgICAgICBzaW5vbi5iZWhhdmlvciA9IHByb3RvO1xuICAgIH1cbn0odHlwZW9mIHNpbm9uID09IFwib2JqZWN0XCIgJiYgc2lub24gfHwgbnVsbCkpO30pLmNhbGwodGhpcyxyZXF1aXJlKFwiL1VzZXJzL2JyaWFucGVhY29jay9hcHBzL3N1YnZpZXcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzXCIpKSIsIi8qKlxuICAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAgKiBAZGVwZW5kIG1hdGNoLmpzXG4gICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBwbHVzcGx1czogZmFsc2UqL1xuLypnbG9iYWwgbW9kdWxlLCByZXF1aXJlLCBzaW5vbiovXG4vKipcbiAgKiBTcHkgY2FsbHNcbiAgKlxuICAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICAqIEBhdXRob3IgTWF4aW1pbGlhbiBBbnRvbmkgKG1haWxAbWF4YW50b25pLmRlKVxuICAqIEBsaWNlbnNlIEJTRFxuICAqXG4gICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gICogQ29weXJpZ2h0IChjKSAyMDEzIE1heGltaWxpYW4gQW50b25pXG4gICovXG5cInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uIChzaW5vbikge1xuICAgIHZhciBjb21tb25KU01vZHVsZSA9IHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzO1xuICAgIGlmICghc2lub24gJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgc2lub24gPSByZXF1aXJlKFwiLi4vc2lub25cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzaW5vbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dZaWVsZEVycm9yKHByb3h5LCB0ZXh0LCBhcmdzKSB7XG4gICAgICAgIHZhciBtc2cgPSBzaW5vbi5mdW5jdGlvbk5hbWUocHJveHkpICsgdGV4dDtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICBtc2cgKz0gXCIgUmVjZWl2ZWQgW1wiICsgc2xpY2UuY2FsbChhcmdzKS5qb2luKFwiLCBcIikgKyBcIl1cIjtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICB9XG5cbiAgICB2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbiAgICB2YXIgY2FsbFByb3RvID0ge1xuICAgICAgICBjYWxsZWRPbjogZnVuY3Rpb24gY2FsbGVkT24odGhpc1ZhbHVlKSB7XG4gICAgICAgICAgICBpZiAoc2lub24ubWF0Y2ggJiYgc2lub24ubWF0Y2guaXNNYXRjaGVyKHRoaXNWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpc1ZhbHVlLnRlc3QodGhpcy50aGlzVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudGhpc1ZhbHVlID09PSB0aGlzVmFsdWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2FsbGVkV2l0aDogZnVuY3Rpb24gY2FsbGVkV2l0aCgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGlmICghc2lub24uZGVlcEVxdWFsKGFyZ3VtZW50c1tpXSwgdGhpcy5hcmdzW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsZWRXaXRoTWF0Y2g6IGZ1bmN0aW9uIGNhbGxlZFdpdGhNYXRjaCgpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIHZhciBhY3R1YWwgPSB0aGlzLmFyZ3NbaV07XG4gICAgICAgICAgICAgICAgdmFyIGV4cGVjdGF0aW9uID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmICghc2lub24ubWF0Y2ggfHwgIXNpbm9uLm1hdGNoKGV4cGVjdGF0aW9uKS50ZXN0KGFjdHVhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxlZFdpdGhFeGFjdGx5OiBmdW5jdGlvbiBjYWxsZWRXaXRoRXhhY3RseSgpIHtcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09IHRoaXMuYXJncy5sZW5ndGggJiZcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGxlZFdpdGguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBub3RDYWxsZWRXaXRoOiBmdW5jdGlvbiBub3RDYWxsZWRXaXRoKCkge1xuICAgICAgICAgICAgcmV0dXJuICF0aGlzLmNhbGxlZFdpdGguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBub3RDYWxsZWRXaXRoTWF0Y2g6IGZ1bmN0aW9uIG5vdENhbGxlZFdpdGhNYXRjaCgpIHtcbiAgICAgICAgICAgIHJldHVybiAhdGhpcy5jYWxsZWRXaXRoTWF0Y2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSxcblxuICAgICAgICByZXR1cm5lZDogZnVuY3Rpb24gcmV0dXJuZWQodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBzaW5vbi5kZWVwRXF1YWwodmFsdWUsIHRoaXMucmV0dXJuVmFsdWUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRocmV3OiBmdW5jdGlvbiB0aHJldyhlcnJvcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBlcnJvciA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhdGhpcy5leGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gISF0aGlzLmV4Y2VwdGlvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXhjZXB0aW9uID09PSBlcnJvciB8fCB0aGlzLmV4Y2VwdGlvbi5uYW1lID09PSBlcnJvcjtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsZWRXaXRoTmV3OiBmdW5jdGlvbiBjYWxsZWRXaXRoTmV3KCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJveHkucHJvdG90eXBlICYmIHRoaXMudGhpc1ZhbHVlIGluc3RhbmNlb2YgdGhpcy5wcm94eTtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsZWRCZWZvcmU6IGZ1bmN0aW9uIChvdGhlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FsbElkIDwgb3RoZXIuY2FsbElkO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxlZEFmdGVyOiBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxJZCA+IG90aGVyLmNhbGxJZDtcbiAgICAgICAgfSxcblxuICAgICAgICBjYWxsQXJnOiBmdW5jdGlvbiAocG9zKSB7XG4gICAgICAgICAgICB0aGlzLmFyZ3NbcG9zXSgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxBcmdPbjogZnVuY3Rpb24gKHBvcywgdGhpc1ZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLmFyZ3NbcG9zXS5hcHBseSh0aGlzVmFsdWUpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxBcmdXaXRoOiBmdW5jdGlvbiAocG9zKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxBcmdPbldpdGguYXBwbHkodGhpcywgW3BvcywgbnVsbF0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxBcmdPbldpdGg6IGZ1bmN0aW9uIChwb3MsIHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgICAgICAgICB0aGlzLmFyZ3NbcG9zXS5hcHBseSh0aGlzVmFsdWUsIGFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIFwieWllbGRcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy55aWVsZE9uLmFwcGx5KHRoaXMsIFtudWxsXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDApKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgeWllbGRPbjogZnVuY3Rpb24gKHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSB0aGlzLmFyZ3M7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmdzW2ldID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJnc1tpXS5hcHBseSh0aGlzVmFsdWUsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvd1lpZWxkRXJyb3IodGhpcy5wcm94eSwgXCIgY2Fubm90IHlpZWxkIHNpbmNlIG5vIGNhbGxiYWNrIHdhcyBwYXNzZWQuXCIsIGFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHlpZWxkVG86IGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICB0aGlzLnlpZWxkVG9Pbi5hcHBseSh0aGlzLCBbcHJvcCwgbnVsbF0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHlpZWxkVG9PbjogZnVuY3Rpb24gKHByb3AsIHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSB0aGlzLmFyZ3M7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3NbaV0gJiYgdHlwZW9mIGFyZ3NbaV1bcHJvcF0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICBhcmdzW2ldW3Byb3BdLmFwcGx5KHRoaXNWYWx1ZSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93WWllbGRFcnJvcih0aGlzLnByb3h5LCBcIiBjYW5ub3QgeWllbGQgdG8gJ1wiICsgcHJvcCArXG4gICAgICAgICAgICAgICAgXCInIHNpbmNlIG5vIGNhbGxiYWNrIHdhcyBwYXNzZWQuXCIsIGFyZ3MpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY2FsbFN0ciA9IHRoaXMucHJveHkudG9TdHJpbmcoKSArIFwiKFwiO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLmFyZ3MubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKHNpbm9uLmZvcm1hdCh0aGlzLmFyZ3NbaV0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FsbFN0ciA9IGNhbGxTdHIgKyBhcmdzLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMucmV0dXJuVmFsdWUgIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIGNhbGxTdHIgKz0gXCIgPT4gXCIgKyBzaW5vbi5mb3JtYXQodGhpcy5yZXR1cm5WYWx1ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgIGNhbGxTdHIgKz0gXCIgIVwiICsgdGhpcy5leGNlcHRpb24ubmFtZTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmV4Y2VwdGlvbi5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxTdHIgKz0gXCIoXCIgKyB0aGlzLmV4Y2VwdGlvbi5tZXNzYWdlICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gY2FsbFN0cjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjYWxsUHJvdG8uaW52b2tlQ2FsbGJhY2sgPSBjYWxsUHJvdG8ueWllbGQ7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVTcHlDYWxsKHNweSwgdGhpc1ZhbHVlLCBhcmdzLCByZXR1cm5WYWx1ZSwgZXhjZXB0aW9uLCBpZCkge1xuICAgICAgICBpZiAodHlwZW9mIGlkICE9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2FsbCBpZCBpcyBub3QgYSBudW1iZXJcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByb3h5Q2FsbCA9IHNpbm9uLmNyZWF0ZShjYWxsUHJvdG8pO1xuICAgICAgICBwcm94eUNhbGwucHJveHkgPSBzcHk7XG4gICAgICAgIHByb3h5Q2FsbC50aGlzVmFsdWUgPSB0aGlzVmFsdWU7XG4gICAgICAgIHByb3h5Q2FsbC5hcmdzID0gYXJncztcbiAgICAgICAgcHJveHlDYWxsLnJldHVyblZhbHVlID0gcmV0dXJuVmFsdWU7XG4gICAgICAgIHByb3h5Q2FsbC5leGNlcHRpb24gPSBleGNlcHRpb247XG4gICAgICAgIHByb3h5Q2FsbC5jYWxsSWQgPSBpZDtcblxuICAgICAgICByZXR1cm4gcHJveHlDYWxsO1xuICAgIH1cbiAgICBjcmVhdGVTcHlDYWxsLnRvU3RyaW5nID0gY2FsbFByb3RvLnRvU3RyaW5nOyAvLyB1c2VkIGJ5IG1vY2tzXG5cbiAgICBpZiAoY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVTcHlDYWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLnNweUNhbGwgPSBjcmVhdGVTcHlDYWxsO1xuICAgIH1cbn0odHlwZW9mIHNpbm9uID09IFwib2JqZWN0XCIgJiYgc2lub24gfHwgbnVsbCkpO1xuXG4iLCIvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqIEBkZXBlbmQgc3R1Yi5qc1xuICogQGRlcGVuZCBtb2NrLmpzXG4gKi9cbi8qanNsaW50IGVxZXFlcTogZmFsc2UsIG9uZXZhcjogZmFsc2UsIGZvcmluOiB0cnVlKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSwgc2lub24qL1xuLyoqXG4gKiBDb2xsZWN0aW9ucyBvZiBzdHVicywgc3BpZXMgYW5kIG1vY2tzLlxuICpcbiAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uKSB7XG4gICAgdmFyIGNvbW1vbkpTTW9kdWxlID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG4gICAgdmFyIHB1c2ggPSBbXS5wdXNoO1xuICAgIHZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbiAgICBpZiAoIXNpbm9uICYmIGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIHNpbm9uID0gcmVxdWlyZShcIi4uL3Npbm9uXCIpO1xuICAgIH1cblxuICAgIGlmICghc2lub24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEZha2VzKGZha2VDb2xsZWN0aW9uKSB7XG4gICAgICAgIGlmICghZmFrZUNvbGxlY3Rpb24uZmFrZXMpIHtcbiAgICAgICAgICAgIGZha2VDb2xsZWN0aW9uLmZha2VzID0gW107XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFrZUNvbGxlY3Rpb24uZmFrZXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZWFjaChmYWtlQ29sbGVjdGlvbiwgbWV0aG9kKSB7XG4gICAgICAgIHZhciBmYWtlcyA9IGdldEZha2VzKGZha2VDb2xsZWN0aW9uKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGZha2VzLmxlbmd0aDsgaSA8IGw7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBmYWtlc1tpXVttZXRob2RdID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGZha2VzW2ldW21ldGhvZF0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXBhY3QoZmFrZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgdmFyIGZha2VzID0gZ2V0RmFrZXMoZmFrZUNvbGxlY3Rpb24pO1xuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHdoaWxlIChpIDwgZmFrZXMubGVuZ3RoKSB7XG4gICAgICAgICAgZmFrZXMuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNvbGxlY3Rpb24gPSB7XG4gICAgICAgIHZlcmlmeTogZnVuY3Rpb24gcmVzb2x2ZSgpIHtcbiAgICAgICAgICAgIGVhY2godGhpcywgXCJ2ZXJpZnlcIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVzdG9yZTogZnVuY3Rpb24gcmVzdG9yZSgpIHtcbiAgICAgICAgICAgIGVhY2godGhpcywgXCJyZXN0b3JlXCIpO1xuICAgICAgICAgICAgY29tcGFjdCh0aGlzKTtcbiAgICAgICAgfSxcblxuICAgICAgICB2ZXJpZnlBbmRSZXN0b3JlOiBmdW5jdGlvbiB2ZXJpZnlBbmRSZXN0b3JlKCkge1xuICAgICAgICAgICAgdmFyIGV4Y2VwdGlvbjtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0aGlzLnZlcmlmeSgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMucmVzdG9yZSgpO1xuXG4gICAgICAgICAgICBpZiAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGFkZDogZnVuY3Rpb24gYWRkKGZha2UpIHtcbiAgICAgICAgICAgIHB1c2guY2FsbChnZXRGYWtlcyh0aGlzKSwgZmFrZSk7XG4gICAgICAgICAgICByZXR1cm4gZmFrZTtcbiAgICAgICAgfSxcblxuICAgICAgICBzcHk6IGZ1bmN0aW9uIHNweSgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZChzaW5vbi5zcHkuYXBwbHkoc2lub24sIGFyZ3VtZW50cykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN0dWI6IGZ1bmN0aW9uIHN0dWIob2JqZWN0LCBwcm9wZXJ0eSwgdmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIHZhciBvcmlnaW5hbCA9IG9iamVjdFtwcm9wZXJ0eV07XG5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9yaWdpbmFsICE9IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgc3R1YiBub24tZXhpc3RlbnQgb3duIHByb3BlcnR5IFwiICsgcHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0W3Byb3BlcnR5XSA9IHZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZCh7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN0b3JlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0W3Byb3BlcnR5XSA9IG9yaWdpbmFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXByb3BlcnR5ICYmICEhb2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHZhciBzdHViYmVkT2JqID0gc2lub24uc3R1Yi5hcHBseShzaW5vbiwgYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3AgaW4gc3R1YmJlZE9iaikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHN0dWJiZWRPYmpbcHJvcF0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGQoc3R1YmJlZE9ialtwcm9wXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gc3R1YmJlZE9iajtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWRkKHNpbm9uLnN0dWIuYXBwbHkoc2lub24sIGFyZ3VtZW50cykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1vY2s6IGZ1bmN0aW9uIG1vY2soKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQoc2lub24ubW9jay5hcHBseShzaW5vbiwgYXJndW1lbnRzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5qZWN0OiBmdW5jdGlvbiBpbmplY3Qob2JqKSB7XG4gICAgICAgICAgICB2YXIgY29sID0gdGhpcztcblxuICAgICAgICAgICAgb2JqLnNweSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29sLnNweS5hcHBseShjb2wsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBvYmouc3R1YiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29sLnN0dWIuYXBwbHkoY29sLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgb2JqLm1vY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbC5tb2NrLmFwcGx5KGNvbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gY29sbGVjdGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzaW5vbi5jb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbiAgICB9XG59KHR5cGVvZiBzaW5vbiA9PSBcIm9iamVjdFwiICYmIHNpbm9uIHx8IG51bGwpKTtcbiIsIi8qIEBkZXBlbmQgLi4vc2lub24uanMgKi9cbi8qanNsaW50IGVxZXFlcTogZmFsc2UsIG9uZXZhcjogZmFsc2UsIHBsdXNwbHVzOiBmYWxzZSovXG4vKmdsb2JhbCBtb2R1bGUsIHJlcXVpcmUsIHNpbm9uKi9cbi8qKlxuICogTWF0Y2ggZnVuY3Rpb25zXG4gKlxuICogQGF1dGhvciBNYXhpbWlsaWFuIEFudG9uaSAobWFpbEBtYXhhbnRvbmkuZGUpXG4gKiBAbGljZW5zZSBCU0RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTIgTWF4aW1pbGlhbiBBbnRvbmlcbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbihmdW5jdGlvbiAoc2lub24pIHtcbiAgICB2YXIgY29tbW9uSlNNb2R1bGUgPSB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cztcblxuICAgIGlmICghc2lub24gJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgc2lub24gPSByZXF1aXJlKFwiLi4vc2lub25cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzaW5vbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXNzZXJ0VHlwZSh2YWx1ZSwgdHlwZSwgbmFtZSkge1xuICAgICAgICB2YXIgYWN0dWFsID0gc2lub24udHlwZU9mKHZhbHVlKTtcbiAgICAgICAgaWYgKGFjdHVhbCAhPT0gdHlwZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIHR5cGUgb2YgXCIgKyBuYW1lICsgXCIgdG8gYmUgXCIgK1xuICAgICAgICAgICAgICAgIHR5cGUgKyBcIiwgYnV0IHdhcyBcIiArIGFjdHVhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbWF0Y2hlciA9IHtcbiAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaXNNYXRjaGVyKG9iamVjdCkge1xuICAgICAgICByZXR1cm4gbWF0Y2hlci5pc1Byb3RvdHlwZU9mKG9iamVjdCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWF0Y2hPYmplY3QoZXhwZWN0YXRpb24sIGFjdHVhbCkge1xuICAgICAgICBpZiAoYWN0dWFsID09PSBudWxsIHx8IGFjdHVhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGV4cGVjdGF0aW9uKSB7XG4gICAgICAgICAgICBpZiAoZXhwZWN0YXRpb24uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgICAgICAgIHZhciBleHAgPSBleHBlY3RhdGlvbltrZXldO1xuICAgICAgICAgICAgICAgIHZhciBhY3QgPSBhY3R1YWxba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2guaXNNYXRjaGVyKGV4cCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHAudGVzdChhY3QpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNpbm9uLnR5cGVPZihleHApID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2hPYmplY3QoZXhwLCBhY3QpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFzaW5vbi5kZWVwRXF1YWwoZXhwLCBhY3QpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgbWF0Y2hlci5vciA9IGZ1bmN0aW9uIChtMikge1xuICAgICAgICBpZiAoIWlzTWF0Y2hlcihtMikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJNYXRjaGVyIGV4cGVjdGVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtMSA9IHRoaXM7XG4gICAgICAgIHZhciBvciA9IHNpbm9uLmNyZWF0ZShtYXRjaGVyKTtcbiAgICAgICAgb3IudGVzdCA9IGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBtMS50ZXN0KGFjdHVhbCkgfHwgbTIudGVzdChhY3R1YWwpO1xuICAgICAgICB9O1xuICAgICAgICBvci5tZXNzYWdlID0gbTEubWVzc2FnZSArIFwiLm9yKFwiICsgbTIubWVzc2FnZSArIFwiKVwiO1xuICAgICAgICByZXR1cm4gb3I7XG4gICAgfTtcblxuICAgIG1hdGNoZXIuYW5kID0gZnVuY3Rpb24gKG0yKSB7XG4gICAgICAgIGlmICghaXNNYXRjaGVyKG0yKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk1hdGNoZXIgZXhwZWN0ZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG0xID0gdGhpcztcbiAgICAgICAgdmFyIGFuZCA9IHNpbm9uLmNyZWF0ZShtYXRjaGVyKTtcbiAgICAgICAgYW5kLnRlc3QgPSBmdW5jdGlvbiAoYWN0dWFsKSB7XG4gICAgICAgICAgICByZXR1cm4gbTEudGVzdChhY3R1YWwpICYmIG0yLnRlc3QoYWN0dWFsKTtcbiAgICAgICAgfTtcbiAgICAgICAgYW5kLm1lc3NhZ2UgPSBtMS5tZXNzYWdlICsgXCIuYW5kKFwiICsgbTIubWVzc2FnZSArIFwiKVwiO1xuICAgICAgICByZXR1cm4gYW5kO1xuICAgIH07XG5cbiAgICB2YXIgbWF0Y2ggPSBmdW5jdGlvbiAoZXhwZWN0YXRpb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIG0gPSBzaW5vbi5jcmVhdGUobWF0Y2hlcik7XG4gICAgICAgIHZhciB0eXBlID0gc2lub24udHlwZU9mKGV4cGVjdGF0aW9uKTtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgXCJvYmplY3RcIjpcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXhwZWN0YXRpb24udGVzdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgbS50ZXN0ID0gZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhwZWN0YXRpb24udGVzdChhY3R1YWwpID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbS5tZXNzYWdlID0gXCJtYXRjaChcIiArIHNpbm9uLmZ1bmN0aW9uTmFtZShleHBlY3RhdGlvbi50ZXN0KSArIFwiKVwiO1xuICAgICAgICAgICAgICAgIHJldHVybiBtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHN0ciA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGV4cGVjdGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4cGVjdGF0aW9uLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyLnB1c2goa2V5ICsgXCI6IFwiICsgZXhwZWN0YXRpb25ba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbS50ZXN0ID0gZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaE9iamVjdChleHBlY3RhdGlvbiwgYWN0dWFsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBtLm1lc3NhZ2UgPSBcIm1hdGNoKFwiICsgc3RyLmpvaW4oXCIsIFwiKSArIFwiKVwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgICAgICAgIG0udGVzdCA9IGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhwZWN0YXRpb24gPT0gYWN0dWFsO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICAgICAgICBtLnRlc3QgPSBmdW5jdGlvbiAoYWN0dWFsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWwgIT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYWN0dWFsLmluZGV4T2YoZXhwZWN0YXRpb24pICE9PSAtMTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBtLm1lc3NhZ2UgPSBcIm1hdGNoKFxcXCJcIiArIGV4cGVjdGF0aW9uICsgXCJcXFwiKVwiO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJyZWdleHBcIjpcbiAgICAgICAgICAgIG0udGVzdCA9IGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFjdHVhbCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBleHBlY3RhdGlvbi50ZXN0KGFjdHVhbCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJmdW5jdGlvblwiOlxuICAgICAgICAgICAgbS50ZXN0ID0gZXhwZWN0YXRpb247XG4gICAgICAgICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIG0ubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG0ubWVzc2FnZSA9IFwibWF0Y2goXCIgKyBzaW5vbi5mdW5jdGlvbk5hbWUoZXhwZWN0YXRpb24pICsgXCIpXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIG0udGVzdCA9IGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHNpbm9uLmRlZXBFcXVhbChleHBlY3RhdGlvbiwgYWN0dWFsKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFtLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgIG0ubWVzc2FnZSA9IFwibWF0Y2goXCIgKyBleHBlY3RhdGlvbiArIFwiKVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtO1xuICAgIH07XG5cbiAgICBtYXRjaC5pc01hdGNoZXIgPSBpc01hdGNoZXI7XG5cbiAgICBtYXRjaC5hbnkgPSBtYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sIFwiYW55XCIpO1xuXG4gICAgbWF0Y2guZGVmaW5lZCA9IG1hdGNoKGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgcmV0dXJuIGFjdHVhbCAhPT0gbnVsbCAmJiBhY3R1YWwgIT09IHVuZGVmaW5lZDtcbiAgICB9LCBcImRlZmluZWRcIik7XG5cbiAgICBtYXRjaC50cnV0aHkgPSBtYXRjaChmdW5jdGlvbiAoYWN0dWFsKSB7XG4gICAgICAgIHJldHVybiAhIWFjdHVhbDtcbiAgICB9LCBcInRydXRoeVwiKTtcblxuICAgIG1hdGNoLmZhbHN5ID0gbWF0Y2goZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICByZXR1cm4gIWFjdHVhbDtcbiAgICB9LCBcImZhbHN5XCIpO1xuXG4gICAgbWF0Y2guc2FtZSA9IGZ1bmN0aW9uIChleHBlY3RhdGlvbikge1xuICAgICAgICByZXR1cm4gbWF0Y2goZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGV4cGVjdGF0aW9uID09PSBhY3R1YWw7XG4gICAgICAgIH0sIFwic2FtZShcIiArIGV4cGVjdGF0aW9uICsgXCIpXCIpO1xuICAgIH07XG5cbiAgICBtYXRjaC50eXBlT2YgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICBhc3NlcnRUeXBlKHR5cGUsIFwic3RyaW5nXCIsIFwidHlwZVwiKTtcbiAgICAgICAgcmV0dXJuIG1hdGNoKGZ1bmN0aW9uIChhY3R1YWwpIHtcbiAgICAgICAgICAgIHJldHVybiBzaW5vbi50eXBlT2YoYWN0dWFsKSA9PT0gdHlwZTtcbiAgICAgICAgfSwgXCJ0eXBlT2YoXFxcIlwiICsgdHlwZSArIFwiXFxcIilcIik7XG4gICAgfTtcblxuICAgIG1hdGNoLmluc3RhbmNlT2YgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICBhc3NlcnRUeXBlKHR5cGUsIFwiZnVuY3Rpb25cIiwgXCJ0eXBlXCIpO1xuICAgICAgICByZXR1cm4gbWF0Y2goZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGFjdHVhbCBpbnN0YW5jZW9mIHR5cGU7XG4gICAgICAgIH0sIFwiaW5zdGFuY2VPZihcIiArIHNpbm9uLmZ1bmN0aW9uTmFtZSh0eXBlKSArIFwiKVwiKTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlUHJvcGVydHlNYXRjaGVyKHByb3BlcnR5VGVzdCwgbWVzc2FnZVByZWZpeCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHByb3BlcnR5LCB2YWx1ZSkge1xuICAgICAgICAgICAgYXNzZXJ0VHlwZShwcm9wZXJ0eSwgXCJzdHJpbmdcIiwgXCJwcm9wZXJ0eVwiKTtcbiAgICAgICAgICAgIHZhciBvbmx5UHJvcGVydHkgPSBhcmd1bWVudHMubGVuZ3RoID09PSAxO1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBtZXNzYWdlUHJlZml4ICsgXCIoXFxcIlwiICsgcHJvcGVydHkgKyBcIlxcXCJcIjtcbiAgICAgICAgICAgIGlmICghb25seVByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSArPSBcIiwgXCIgKyB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1lc3NhZ2UgKz0gXCIpXCI7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2goZnVuY3Rpb24gKGFjdHVhbCkge1xuICAgICAgICAgICAgICAgIGlmIChhY3R1YWwgPT09IHVuZGVmaW5lZCB8fCBhY3R1YWwgPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICFwcm9wZXJ0eVRlc3QoYWN0dWFsLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gb25seVByb3BlcnR5IHx8IHNpbm9uLmRlZXBFcXVhbCh2YWx1ZSwgYWN0dWFsW3Byb3BlcnR5XSk7XG4gICAgICAgICAgICB9LCBtZXNzYWdlKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBtYXRjaC5oYXMgPSBjcmVhdGVQcm9wZXJ0eU1hdGNoZXIoZnVuY3Rpb24gKGFjdHVhbCwgcHJvcGVydHkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWwgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eSBpbiBhY3R1YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFjdHVhbFtwcm9wZXJ0eV0gIT09IHVuZGVmaW5lZDtcbiAgICB9LCBcImhhc1wiKTtcblxuICAgIG1hdGNoLmhhc093biA9IGNyZWF0ZVByb3BlcnR5TWF0Y2hlcihmdW5jdGlvbiAoYWN0dWFsLCBwcm9wZXJ0eSkge1xuICAgICAgICByZXR1cm4gYWN0dWFsLmhhc093blByb3BlcnR5KHByb3BlcnR5KTtcbiAgICB9LCBcImhhc093blwiKTtcblxuICAgIG1hdGNoLmJvb2wgPSBtYXRjaC50eXBlT2YoXCJib29sZWFuXCIpO1xuICAgIG1hdGNoLm51bWJlciA9IG1hdGNoLnR5cGVPZihcIm51bWJlclwiKTtcbiAgICBtYXRjaC5zdHJpbmcgPSBtYXRjaC50eXBlT2YoXCJzdHJpbmdcIik7XG4gICAgbWF0Y2gub2JqZWN0ID0gbWF0Y2gudHlwZU9mKFwib2JqZWN0XCIpO1xuICAgIG1hdGNoLmZ1bmMgPSBtYXRjaC50eXBlT2YoXCJmdW5jdGlvblwiKTtcbiAgICBtYXRjaC5hcnJheSA9IG1hdGNoLnR5cGVPZihcImFycmF5XCIpO1xuICAgIG1hdGNoLnJlZ2V4cCA9IG1hdGNoLnR5cGVPZihcInJlZ2V4cFwiKTtcbiAgICBtYXRjaC5kYXRlID0gbWF0Y2gudHlwZU9mKFwiZGF0ZVwiKTtcblxuICAgIGlmIChjb21tb25KU01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IG1hdGNoO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLm1hdGNoID0gbWF0Y2g7XG4gICAgfVxufSh0eXBlb2Ygc2lub24gPT0gXCJvYmplY3RcIiAmJiBzaW5vbiB8fCBudWxsKSk7XG4iLCIvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqIEBkZXBlbmQgc3R1Yi5qc1xuICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBub21lbjogZmFsc2UqL1xuLypnbG9iYWwgbW9kdWxlLCByZXF1aXJlLCBzaW5vbiovXG4vKipcbiAqIE1vY2sgZnVuY3Rpb25zLlxuICpcbiAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uKSB7XG4gICAgdmFyIGNvbW1vbkpTTW9kdWxlID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG4gICAgdmFyIHB1c2ggPSBbXS5wdXNoO1xuICAgIHZhciBtYXRjaDtcblxuICAgIGlmICghc2lub24gJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgc2lub24gPSByZXF1aXJlKFwiLi4vc2lub25cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzaW5vbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWF0Y2ggPSBzaW5vbi5tYXRjaDtcblxuICAgIGlmICghbWF0Y2ggJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgbWF0Y2ggPSByZXF1aXJlKFwiLi9tYXRjaFwiKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb2NrKG9iamVjdCkge1xuICAgICAgICBpZiAoIW9iamVjdCkge1xuICAgICAgICAgICAgcmV0dXJuIHNpbm9uLmV4cGVjdGF0aW9uLmNyZWF0ZShcIkFub255bW91cyBtb2NrXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vY2suY3JlYXRlKG9iamVjdCk7XG4gICAgfVxuXG4gICAgc2lub24ubW9jayA9IG1vY2s7XG5cbiAgICBzaW5vbi5leHRlbmQobW9jaywgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZnVuY3Rpb24gZWFjaChjb2xsZWN0aW9uLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKCFjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbGxlY3Rpb24ubGVuZ3RoOyBpIDwgbDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soY29sbGVjdGlvbltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiBjcmVhdGUob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm9iamVjdCBpcyBudWxsXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBtb2NrT2JqZWN0ID0gc2lub24uZXh0ZW5kKHt9LCBtb2NrKTtcbiAgICAgICAgICAgICAgICBtb2NrT2JqZWN0Lm9iamVjdCA9IG9iamVjdDtcbiAgICAgICAgICAgICAgICBkZWxldGUgbW9ja09iamVjdC5jcmVhdGU7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gbW9ja09iamVjdDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGV4cGVjdHM6IGZ1bmN0aW9uIGV4cGVjdHMobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtZXRob2QpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm1ldGhvZCBpcyBmYWxzeVwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZXhwZWN0YXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0YXRpb25zID0ge307XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJveGllcyA9IFtdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5leHBlY3RhdGlvbnNbbWV0aG9kXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV4cGVjdGF0aW9uc1ttZXRob2RdID0gW107XG4gICAgICAgICAgICAgICAgICAgIHZhciBtb2NrT2JqZWN0ID0gdGhpcztcblxuICAgICAgICAgICAgICAgICAgICBzaW5vbi53cmFwTWV0aG9kKHRoaXMub2JqZWN0LCBtZXRob2QsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtb2NrT2JqZWN0Lmludm9rZU1ldGhvZChtZXRob2QsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbCh0aGlzLnByb3hpZXMsIG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGV4cGVjdGF0aW9uID0gc2lub24uZXhwZWN0YXRpb24uY3JlYXRlKG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgcHVzaC5jYWxsKHRoaXMuZXhwZWN0YXRpb25zW21ldGhvZF0sIGV4cGVjdGF0aW9uKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBleHBlY3RhdGlvbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlc3RvcmU6IGZ1bmN0aW9uIHJlc3RvcmUoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IHRoaXMub2JqZWN0O1xuXG4gICAgICAgICAgICAgICAgZWFjaCh0aGlzLnByb3hpZXMsIGZ1bmN0aW9uIChwcm94eSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdFtwcm94eV0ucmVzdG9yZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdFtwcm94eV0ucmVzdG9yZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB2ZXJpZnk6IGZ1bmN0aW9uIHZlcmlmeSgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwZWN0YXRpb25zID0gdGhpcy5leHBlY3RhdGlvbnMgfHwge307XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gW10sIG1ldCA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZWFjaCh0aGlzLnByb3hpZXMsIGZ1bmN0aW9uIChwcm94eSkge1xuICAgICAgICAgICAgICAgICAgICBlYWNoKGV4cGVjdGF0aW9uc1twcm94eV0sIGZ1bmN0aW9uIChleHBlY3RhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFleHBlY3RhdGlvbi5tZXQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChtZXNzYWdlcywgZXhwZWN0YXRpb24udG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChtZXQsIGV4cGVjdGF0aW9uLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHRoaXMucmVzdG9yZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2lub24uZXhwZWN0YXRpb24uZmFpbChtZXNzYWdlcy5jb25jYXQobWV0KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzaW5vbi5leHBlY3RhdGlvbi5wYXNzKG1lc3NhZ2VzLmNvbmNhdChtZXQpLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgaW52b2tlTWV0aG9kOiBmdW5jdGlvbiBpbnZva2VNZXRob2QobWV0aG9kLCB0aGlzVmFsdWUsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwZWN0YXRpb25zID0gdGhpcy5leHBlY3RhdGlvbnMgJiYgdGhpcy5leHBlY3RhdGlvbnNbbWV0aG9kXTtcbiAgICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gZXhwZWN0YXRpb25zICYmIGV4cGVjdGF0aW9ucy5sZW5ndGggfHwgMCwgaTtcblxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4cGVjdGF0aW9uc1tpXS5tZXQoKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0YXRpb25zW2ldLmFsbG93c0NhbGwodGhpc1ZhbHVlLCBhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV4cGVjdGF0aW9uc1tpXS5hcHBseSh0aGlzVmFsdWUsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gW10sIGF2YWlsYWJsZSwgZXhoYXVzdGVkID0gMDtcblxuICAgICAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXhwZWN0YXRpb25zW2ldLmFsbG93c0NhbGwodGhpc1ZhbHVlLCBhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlID0gYXZhaWxhYmxlIHx8IGV4cGVjdGF0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4aGF1c3RlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChtZXNzYWdlcywgXCIgICAgXCIgKyBleHBlY3RhdGlvbnNbaV0udG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGV4aGF1c3RlZCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXZhaWxhYmxlLmFwcGx5KHRoaXNWYWx1ZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWVzc2FnZXMudW5zaGlmdChcIlVuZXhwZWN0ZWQgY2FsbDogXCIgKyBzaW5vbi5zcHlDYWxsLnRvU3RyaW5nLmNhbGwoe1xuICAgICAgICAgICAgICAgICAgICBwcm94eTogbWV0aG9kLFxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBhcmdzXG4gICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgc2lub24uZXhwZWN0YXRpb24uZmFpbChtZXNzYWdlcy5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KCkpKTtcblxuICAgIHZhciB0aW1lcyA9IHNpbm9uLnRpbWVzSW5Xb3JkcztcblxuICAgIHNpbm9uLmV4cGVjdGF0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICAgICAgICB2YXIgX2ludm9rZSA9IHNpbm9uLnNweS5pbnZva2U7XG5cbiAgICAgICAgZnVuY3Rpb24gY2FsbENvdW50SW5Xb3JkcyhjYWxsQ291bnQpIHtcbiAgICAgICAgICAgIGlmIChjYWxsQ291bnQgPT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIm5ldmVyIGNhbGxlZFwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJjYWxsZWQgXCIgKyB0aW1lcyhjYWxsQ291bnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZXhwZWN0ZWRDYWxsQ291bnRJbldvcmRzKGV4cGVjdGF0aW9uKSB7XG4gICAgICAgICAgICB2YXIgbWluID0gZXhwZWN0YXRpb24ubWluQ2FsbHM7XG4gICAgICAgICAgICB2YXIgbWF4ID0gZXhwZWN0YXRpb24ubWF4Q2FsbHM7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWluID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIG1heCA9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0ciA9IHRpbWVzKG1pbik7XG5cbiAgICAgICAgICAgICAgICBpZiAobWluICE9IG1heCkge1xuICAgICAgICAgICAgICAgICAgICBzdHIgPSBcImF0IGxlYXN0IFwiICsgc3RyICsgXCIgYW5kIGF0IG1vc3QgXCIgKyB0aW1lcyhtYXgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWluID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJhdCBsZWFzdCBcIiArIHRpbWVzKG1pbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBcImF0IG1vc3QgXCIgKyB0aW1lcyhtYXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gcmVjZWl2ZWRNaW5DYWxscyhleHBlY3RhdGlvbikge1xuICAgICAgICAgICAgdmFyIGhhc01pbkxpbWl0ID0gdHlwZW9mIGV4cGVjdGF0aW9uLm1pbkNhbGxzID09IFwibnVtYmVyXCI7XG4gICAgICAgICAgICByZXR1cm4gIWhhc01pbkxpbWl0IHx8IGV4cGVjdGF0aW9uLmNhbGxDb3VudCA+PSBleHBlY3RhdGlvbi5taW5DYWxscztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlY2VpdmVkTWF4Q2FsbHMoZXhwZWN0YXRpb24pIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXhwZWN0YXRpb24ubWF4Q2FsbHMgIT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGV4cGVjdGF0aW9uLmNhbGxDb3VudCA9PSBleHBlY3RhdGlvbi5tYXhDYWxscztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZlcmlmeU1hdGNoZXIocG9zc2libGVNYXRjaGVyLCBhcmcpe1xuICAgICAgICAgICAgaWYgKG1hdGNoICYmIG1hdGNoLmlzTWF0Y2hlcihwb3NzaWJsZU1hdGNoZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBvc3NpYmxlTWF0Y2hlci50ZXN0KGFyZyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1pbkNhbGxzOiAxLFxuICAgICAgICAgICAgbWF4Q2FsbHM6IDEsXG5cbiAgICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gY3JlYXRlKG1ldGhvZE5hbWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhwZWN0YXRpb24gPSBzaW5vbi5leHRlbmQoc2lub24uc3R1Yi5jcmVhdGUoKSwgc2lub24uZXhwZWN0YXRpb24pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBleHBlY3RhdGlvbi5jcmVhdGU7XG4gICAgICAgICAgICAgICAgZXhwZWN0YXRpb24ubWV0aG9kID0gbWV0aG9kTmFtZTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBleHBlY3RhdGlvbjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGludm9rZTogZnVuY3Rpb24gaW52b2tlKGZ1bmMsIHRoaXNWYWx1ZSwgYXJncykge1xuICAgICAgICAgICAgICAgIHRoaXMudmVyaWZ5Q2FsbEFsbG93ZWQodGhpc1ZhbHVlLCBhcmdzKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBfaW52b2tlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhdExlYXN0OiBmdW5jdGlvbiBhdExlYXN0KG51bSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbnVtICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIidcIiArIG51bSArIFwiJyBpcyBub3QgbnVtYmVyXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5saW1pdHNTZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXhDYWxscyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGltaXRzU2V0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLm1pbkNhbGxzID0gbnVtO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhdE1vc3Q6IGZ1bmN0aW9uIGF0TW9zdChudW0pIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG51bSAhPSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCInXCIgKyBudW0gKyBcIicgaXMgbm90IG51bWJlclwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubGltaXRzU2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWluQ2FsbHMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbWl0c1NldCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhDYWxscyA9IG51bTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbmV2ZXI6IGZ1bmN0aW9uIG5ldmVyKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4YWN0bHkoMCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbmNlOiBmdW5jdGlvbiBvbmNlKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4YWN0bHkoMSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB0d2ljZTogZnVuY3Rpb24gdHdpY2UoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXhhY3RseSgyKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHRocmljZTogZnVuY3Rpb24gdGhyaWNlKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmV4YWN0bHkoMyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBleGFjdGx5OiBmdW5jdGlvbiBleGFjdGx5KG51bSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbnVtICE9IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIidcIiArIG51bSArIFwiJyBpcyBub3QgYSBudW1iZXJcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5hdExlYXN0KG51bSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXRNb3N0KG51bSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBtZXQ6IGZ1bmN0aW9uIG1ldCgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIXRoaXMuZmFpbGVkICYmIHJlY2VpdmVkTWluQ2FsbHModGhpcyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB2ZXJpZnlDYWxsQWxsb3dlZDogZnVuY3Rpb24gdmVyaWZ5Q2FsbEFsbG93ZWQodGhpc1ZhbHVlLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlY2VpdmVkTWF4Q2FsbHModGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mYWlsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBzaW5vbi5leHBlY3RhdGlvbi5mYWlsKHRoaXMubWV0aG9kICsgXCIgYWxyZWFkeSBjYWxsZWQgXCIgKyB0aW1lcyh0aGlzLm1heENhbGxzKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKFwiZXhwZWN0ZWRUaGlzXCIgaW4gdGhpcyAmJiB0aGlzLmV4cGVjdGVkVGhpcyAhPT0gdGhpc1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLmZhaWwodGhpcy5tZXRob2QgKyBcIiBjYWxsZWQgd2l0aCBcIiArIHRoaXNWYWx1ZSArIFwiIGFzIHRoaXNWYWx1ZSwgZXhwZWN0ZWQgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5leHBlY3RlZFRoaXMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghKFwiZXhwZWN0ZWRBcmd1bWVudHNcIiBpbiB0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLmZhaWwodGhpcy5tZXRob2QgKyBcIiByZWNlaXZlZCBubyBhcmd1bWVudHMsIGV4cGVjdGVkIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbm9uLmZvcm1hdCh0aGlzLmV4cGVjdGVkQXJndW1lbnRzKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgdGhpcy5leHBlY3RlZEFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2lub24uZXhwZWN0YXRpb24uZmFpbCh0aGlzLm1ldGhvZCArIFwiIHJlY2VpdmVkIHRvbyBmZXcgYXJndW1lbnRzIChcIiArIHNpbm9uLmZvcm1hdChhcmdzKSArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiksIGV4cGVjdGVkIFwiICsgc2lub24uZm9ybWF0KHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5leHBlY3RzRXhhY3RBcmdDb3VudCAmJlxuICAgICAgICAgICAgICAgICAgICBhcmdzLmxlbmd0aCAhPSB0aGlzLmV4cGVjdGVkQXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzaW5vbi5leHBlY3RhdGlvbi5mYWlsKHRoaXMubWV0aG9kICsgXCIgcmVjZWl2ZWQgdG9vIG1hbnkgYXJndW1lbnRzIChcIiArIHNpbm9uLmZvcm1hdChhcmdzKSArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiksIGV4cGVjdGVkIFwiICsgc2lub24uZm9ybWF0KHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgaSArPSAxKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2ZXJpZnlNYXRjaGVyKHRoaXMuZXhwZWN0ZWRBcmd1bWVudHNbaV0sYXJnc1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLmZhaWwodGhpcy5tZXRob2QgKyBcIiByZWNlaXZlZCB3cm9uZyBhcmd1bWVudHMgXCIgKyBzaW5vbi5mb3JtYXQoYXJncykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBkaWRuJ3QgbWF0Y2ggXCIgKyB0aGlzLmV4cGVjdGVkQXJndW1lbnRzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzaW5vbi5kZWVwRXF1YWwodGhpcy5leHBlY3RlZEFyZ3VtZW50c1tpXSwgYXJnc1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLmZhaWwodGhpcy5tZXRob2QgKyBcIiByZWNlaXZlZCB3cm9uZyBhcmd1bWVudHMgXCIgKyBzaW5vbi5mb3JtYXQoYXJncykgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLCBleHBlY3RlZCBcIiArIHNpbm9uLmZvcm1hdCh0aGlzLmV4cGVjdGVkQXJndW1lbnRzKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhbGxvd3NDYWxsOiBmdW5jdGlvbiBhbGxvd3NDYWxsKHRoaXNWYWx1ZSwgYXJncykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1ldCgpICYmIHJlY2VpdmVkTWF4Q2FsbHModGhpcykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChcImV4cGVjdGVkVGhpc1wiIGluIHRoaXMgJiYgdGhpcy5leHBlY3RlZFRoaXMgIT09IHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCEoXCJleHBlY3RlZEFyZ3VtZW50c1wiIGluIHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGFyZ3MgPSBhcmdzIHx8IFtdO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgdGhpcy5leHBlY3RlZEFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmV4cGVjdHNFeGFjdEFyZ0NvdW50ICYmXG4gICAgICAgICAgICAgICAgICAgIGFyZ3MubGVuZ3RoICE9IHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuZXhwZWN0ZWRBcmd1bWVudHMubGVuZ3RoOyBpIDwgbDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdmVyaWZ5TWF0Y2hlcih0aGlzLmV4cGVjdGVkQXJndW1lbnRzW2ldLGFyZ3NbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXNpbm9uLmRlZXBFcXVhbCh0aGlzLmV4cGVjdGVkQXJndW1lbnRzW2ldLCBhcmdzW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB3aXRoQXJnczogZnVuY3Rpb24gd2l0aEFyZ3MoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5leHBlY3RlZEFyZ3VtZW50cyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHdpdGhFeGFjdEFyZ3M6IGZ1bmN0aW9uIHdpdGhFeGFjdEFyZ3MoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy53aXRoQXJncy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0c0V4YWN0QXJnQ291bnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb246IGZ1bmN0aW9uIG9uKHRoaXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZXhwZWN0ZWRUaGlzID0gdGhpc1ZhbHVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9ICh0aGlzLmV4cGVjdGVkQXJndW1lbnRzIHx8IFtdKS5zbGljZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmV4cGVjdHNFeGFjdEFyZ0NvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChhcmdzLCBcIlsuLi5dXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBjYWxsU3RyID0gc2lub24uc3B5Q2FsbC50b1N0cmluZy5jYWxsKHtcbiAgICAgICAgICAgICAgICAgICAgcHJveHk6IHRoaXMubWV0aG9kIHx8IFwiYW5vbnltb3VzIG1vY2sgZXhwZWN0YXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgYXJnczogYXJnc1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBjYWxsU3RyLnJlcGxhY2UoXCIsIFsuLi5cIiwgXCJbLCAuLi5cIikgKyBcIiBcIiArXG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQ2FsbENvdW50SW5Xb3Jkcyh0aGlzKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm1ldCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIkV4cGVjdGF0aW9uIG1ldDogXCIgKyBtZXNzYWdlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBcIkV4cGVjdGVkIFwiICsgbWVzc2FnZSArIFwiIChcIiArXG4gICAgICAgICAgICAgICAgICAgIGNhbGxDb3VudEluV29yZHModGhpcy5jYWxsQ291bnQpICsgXCIpXCI7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB2ZXJpZnk6IGZ1bmN0aW9uIHZlcmlmeSgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubWV0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc2lub24uZXhwZWN0YXRpb24uZmFpbCh0aGlzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNpbm9uLmV4cGVjdGF0aW9uLnBhc3ModGhpcy50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHBhc3M6IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgc2lub24uYXNzZXJ0LnBhc3MobWVzc2FnZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZmFpbDogZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhjZXB0aW9uID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbi5uYW1lID0gXCJFeHBlY3RhdGlvbkVycm9yXCI7XG5cbiAgICAgICAgICAgICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSgpKTtcblxuICAgIGlmIChjb21tb25KU01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IG1vY2s7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2lub24ubW9jayA9IG1vY2s7XG4gICAgfVxufSh0eXBlb2Ygc2lub24gPT0gXCJvYmplY3RcIiAmJiBzaW5vbiB8fCBudWxsKSk7XG4iLCIvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqIEBkZXBlbmQgY29sbGVjdGlvbi5qc1xuICogQGRlcGVuZCB1dGlsL2Zha2VfdGltZXJzLmpzXG4gKiBAZGVwZW5kIHV0aWwvZmFrZV9zZXJ2ZXJfd2l0aF9jbG9jay5qc1xuICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBwbHVzcGx1czogZmFsc2UqL1xuLypnbG9iYWwgcmVxdWlyZSwgbW9kdWxlKi9cbi8qKlxuICogTWFuYWdlcyBmYWtlIGNvbGxlY3Rpb25zIGFzIHdlbGwgYXMgZmFrZSB1dGlsaXRpZXMgc3VjaCBhcyBTaW5vbidzXG4gKiB0aW1lcnMgYW5kIGZha2UgWEhSIGltcGxlbWVudGF0aW9uIGluIG9uZSBjb252ZW5pZW50IG9iamVjdC5cbiAqXG4gKiBAYXV0aG9yIENocmlzdGlhbiBKb2hhbnNlbiAoY2hyaXN0aWFuQGNqb2hhbnNlbi5ubylcbiAqIEBsaWNlbnNlIEJTRFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMC0yMDEzIENocmlzdGlhbiBKb2hhbnNlblxuICovXG5cInVzZSBzdHJpY3RcIjtcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgdmFyIHNpbm9uID0gcmVxdWlyZShcIi4uL3Npbm9uXCIpO1xuICAgIHNpbm9uLmV4dGVuZChzaW5vbiwgcmVxdWlyZShcIi4vdXRpbC9mYWtlX3RpbWVyc1wiKSk7XG59XG5cbihmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHB1c2ggPSBbXS5wdXNoO1xuXG4gICAgZnVuY3Rpb24gZXhwb3NlVmFsdWUoc2FuZGJveCwgY29uZmlnLCBrZXksIHZhbHVlKSB7XG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcuaW5qZWN0SW50byAmJiAhKGtleSBpbiBjb25maWcuaW5qZWN0SW50bykgKSB7XG4gICAgICAgICAgICBjb25maWcuaW5qZWN0SW50b1trZXldID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwdXNoLmNhbGwoc2FuZGJveC5hcmdzLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcmVwYXJlU2FuZGJveEZyb21Db25maWcoY29uZmlnKSB7XG4gICAgICAgIHZhciBzYW5kYm94ID0gc2lub24uY3JlYXRlKHNpbm9uLnNhbmRib3gpO1xuXG4gICAgICAgIGlmIChjb25maWcudXNlRmFrZVNlcnZlcikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcudXNlRmFrZVNlcnZlciA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgc2FuZGJveC5zZXJ2ZXJQcm90b3R5cGUgPSBjb25maWcudXNlRmFrZVNlcnZlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2FuZGJveC51c2VGYWtlU2VydmVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLnVzZUZha2VUaW1lcnMpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnLnVzZUZha2VUaW1lcnMgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgICAgIHNhbmRib3gudXNlRmFrZVRpbWVycy5hcHBseShzYW5kYm94LCBjb25maWcudXNlRmFrZVRpbWVycyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNhbmRib3gudXNlRmFrZVRpbWVycygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNhbmRib3g7XG4gICAgfVxuXG4gICAgc2lub24uc2FuZGJveCA9IHNpbm9uLmV4dGVuZChzaW5vbi5jcmVhdGUoc2lub24uY29sbGVjdGlvbiksIHtcbiAgICAgICAgdXNlRmFrZVRpbWVyczogZnVuY3Rpb24gdXNlRmFrZVRpbWVycygpIHtcbiAgICAgICAgICAgIHRoaXMuY2xvY2sgPSBzaW5vbi51c2VGYWtlVGltZXJzLmFwcGx5KHNpbm9uLCBhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQodGhpcy5jbG9jayk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VydmVyUHJvdG90eXBlOiBzaW5vbi5mYWtlU2VydmVyLFxuXG4gICAgICAgIHVzZUZha2VTZXJ2ZXI6IGZ1bmN0aW9uIHVzZUZha2VTZXJ2ZXIoKSB7XG4gICAgICAgICAgICB2YXIgcHJvdG8gPSB0aGlzLnNlcnZlclByb3RvdHlwZSB8fCBzaW5vbi5mYWtlU2VydmVyO1xuXG4gICAgICAgICAgICBpZiAoIXByb3RvIHx8ICFwcm90by5jcmVhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5zZXJ2ZXIgPSBwcm90by5jcmVhdGUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZCh0aGlzLnNlcnZlcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaW5qZWN0OiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICBzaW5vbi5jb2xsZWN0aW9uLmluamVjdC5jYWxsKHRoaXMsIG9iaik7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmNsb2NrKSB7XG4gICAgICAgICAgICAgICAgb2JqLmNsb2NrID0gdGhpcy5jbG9jaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuc2VydmVyKSB7XG4gICAgICAgICAgICAgICAgb2JqLnNlcnZlciA9IHRoaXMuc2VydmVyO1xuICAgICAgICAgICAgICAgIG9iai5yZXF1ZXN0cyA9IHRoaXMuc2VydmVyLnJlcXVlc3RzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgaWYgKCFjb25maWcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2lub24uY3JlYXRlKHNpbm9uLnNhbmRib3gpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgc2FuZGJveCA9IHByZXBhcmVTYW5kYm94RnJvbUNvbmZpZyhjb25maWcpO1xuICAgICAgICAgICAgc2FuZGJveC5hcmdzID0gc2FuZGJveC5hcmdzIHx8IFtdO1xuICAgICAgICAgICAgdmFyIHByb3AsIHZhbHVlLCBleHBvc2VkID0gc2FuZGJveC5pbmplY3Qoe30pO1xuXG4gICAgICAgICAgICBpZiAoY29uZmlnLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbmZpZy5wcm9wZXJ0aWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBwcm9wID0gY29uZmlnLnByb3BlcnRpZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gZXhwb3NlZFtwcm9wXSB8fCBwcm9wID09IFwic2FuZGJveFwiICYmIHNhbmRib3g7XG4gICAgICAgICAgICAgICAgICAgIGV4cG9zZVZhbHVlKHNhbmRib3gsIGNvbmZpZywgcHJvcCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwb3NlVmFsdWUoc2FuZGJveCwgY29uZmlnLCBcInNhbmRib3hcIiwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2FuZGJveDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgc2lub24uc2FuZGJveC51c2VGYWtlWE1MSHR0cFJlcXVlc3QgPSBzaW5vbi5zYW5kYm94LnVzZUZha2VTZXJ2ZXI7XG5cbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBzaW5vbi5zYW5kYm94O1xuICAgIH1cbn0oKSk7XG4iLCIvKipcbiAgKiBAZGVwZW5kIC4uL3Npbm9uLmpzXG4gICogQGRlcGVuZCBjYWxsLmpzXG4gICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBwbHVzcGx1czogZmFsc2UqL1xuLypnbG9iYWwgbW9kdWxlLCByZXF1aXJlLCBzaW5vbiovXG4vKipcbiAgKiBTcHkgZnVuY3Rpb25zXG4gICpcbiAgKiBAYXV0aG9yIENocmlzdGlhbiBKb2hhbnNlbiAoY2hyaXN0aWFuQGNqb2hhbnNlbi5ubylcbiAgKiBAbGljZW5zZSBCU0RcbiAgKlxuICAqIENvcHlyaWdodCAoYykgMjAxMC0yMDEzIENocmlzdGlhbiBKb2hhbnNlblxuICAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbihmdW5jdGlvbiAoc2lub24pIHtcbiAgICB2YXIgY29tbW9uSlNNb2R1bGUgPSB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cztcbiAgICB2YXIgcHVzaCA9IEFycmF5LnByb3RvdHlwZS5wdXNoO1xuICAgIHZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgICB2YXIgY2FsbElkID0gMDtcblxuICAgIGlmICghc2lub24gJiYgY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgc2lub24gPSByZXF1aXJlKFwiLi4vc2lub25cIik7XG4gICAgfVxuXG4gICAgaWYgKCFzaW5vbikge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3B5KG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICAgICAgaWYgKCFwcm9wZXJ0eSAmJiB0eXBlb2Ygb2JqZWN0ID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcmV0dXJuIHNweS5jcmVhdGUob2JqZWN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb2JqZWN0ICYmICFwcm9wZXJ0eSkge1xuICAgICAgICAgICAgcmV0dXJuIHNweS5jcmVhdGUoZnVuY3Rpb24gKCkgeyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtZXRob2QgPSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICByZXR1cm4gc2lub24ud3JhcE1ldGhvZChvYmplY3QsIHByb3BlcnR5LCBzcHkuY3JlYXRlKG1ldGhvZCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1hdGNoaW5nRmFrZShmYWtlcywgYXJncywgc3RyaWN0KSB7XG4gICAgICAgIGlmICghZmFrZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gZmFrZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZmFrZXNbaV0ubWF0Y2hlcyhhcmdzLCBzdHJpY3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZha2VzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5jcmVtZW50Q2FsbENvdW50KCkge1xuICAgICAgICB0aGlzLmNhbGxlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuY2FsbENvdW50ICs9IDE7XG4gICAgICAgIHRoaXMubm90Q2FsbGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY2FsbGVkT25jZSA9IHRoaXMuY2FsbENvdW50ID09IDE7XG4gICAgICAgIHRoaXMuY2FsbGVkVHdpY2UgPSB0aGlzLmNhbGxDb3VudCA9PSAyO1xuICAgICAgICB0aGlzLmNhbGxlZFRocmljZSA9IHRoaXMuY2FsbENvdW50ID09IDM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlQ2FsbFByb3BlcnRpZXMoKSB7XG4gICAgICAgIHRoaXMuZmlyc3RDYWxsID0gdGhpcy5nZXRDYWxsKDApO1xuICAgICAgICB0aGlzLnNlY29uZENhbGwgPSB0aGlzLmdldENhbGwoMSk7XG4gICAgICAgIHRoaXMudGhpcmRDYWxsID0gdGhpcy5nZXRDYWxsKDIpO1xuICAgICAgICB0aGlzLmxhc3RDYWxsID0gdGhpcy5nZXRDYWxsKHRoaXMuY2FsbENvdW50IC0gMSk7XG4gICAgfVxuXG4gICAgdmFyIHZhcnMgPSBcImEsYixjLGQsZSxmLGcsaCxpLGosayxsXCI7XG4gICAgZnVuY3Rpb24gY3JlYXRlUHJveHkoZnVuYykge1xuICAgICAgICAvLyBSZXRhaW4gdGhlIGZ1bmN0aW9uIGxlbmd0aDpcbiAgICAgICAgdmFyIHA7XG4gICAgICAgIGlmIChmdW5jLmxlbmd0aCkge1xuICAgICAgICAgICAgZXZhbChcInAgPSAoZnVuY3Rpb24gcHJveHkoXCIgKyB2YXJzLnN1YnN0cmluZygwLCBmdW5jLmxlbmd0aCAqIDIgLSAxKSArXG4gICAgICAgICAgICAgICAgXCIpIHsgcmV0dXJuIHAuaW52b2tlKGZ1bmMsIHRoaXMsIHNsaWNlLmNhbGwoYXJndW1lbnRzKSk7IH0pO1wiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHAgPSBmdW5jdGlvbiBwcm94eSgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcC5pbnZva2UoZnVuYywgdGhpcywgc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxuXG4gICAgdmFyIHV1aWQgPSAwO1xuXG4gICAgLy8gUHVibGljIEFQSVxuICAgIHZhciBzcHlBcGkgPSB7XG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmNhbGxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5ub3RDYWxsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jYWxsZWRPbmNlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmNhbGxlZFR3aWNlID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmNhbGxlZFRocmljZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jYWxsQ291bnQgPSAwO1xuICAgICAgICAgICAgdGhpcy5maXJzdENhbGwgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5zZWNvbmRDYWxsID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudGhpcmRDYWxsID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMubGFzdENhbGwgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5hcmdzID0gW107XG4gICAgICAgICAgICB0aGlzLnJldHVyblZhbHVlcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy50aGlzVmFsdWVzID0gW107XG4gICAgICAgICAgICB0aGlzLmV4Y2VwdGlvbnMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuY2FsbElkcyA9IFtdO1xuICAgICAgICAgICAgaWYgKHRoaXMuZmFrZXMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZmFrZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mYWtlc1tpXS5yZXNldCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIGNyZWF0ZShmdW5jKSB7XG4gICAgICAgICAgICB2YXIgbmFtZTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBmdW5jICE9IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGZ1bmMgPSBmdW5jdGlvbiAoKSB7IH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBzaW5vbi5mdW5jdGlvbk5hbWUoZnVuYyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwcm94eSA9IGNyZWF0ZVByb3h5KGZ1bmMpO1xuXG4gICAgICAgICAgICBzaW5vbi5leHRlbmQocHJveHksIHNweSk7XG4gICAgICAgICAgICBkZWxldGUgcHJveHkuY3JlYXRlO1xuICAgICAgICAgICAgc2lub24uZXh0ZW5kKHByb3h5LCBmdW5jKTtcblxuICAgICAgICAgICAgcHJveHkucmVzZXQoKTtcbiAgICAgICAgICAgIHByb3h5LnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuICAgICAgICAgICAgcHJveHkuZGlzcGxheU5hbWUgPSBuYW1lIHx8IFwic3B5XCI7XG4gICAgICAgICAgICBwcm94eS50b1N0cmluZyA9IHNpbm9uLmZ1bmN0aW9uVG9TdHJpbmc7XG4gICAgICAgICAgICBwcm94eS5fY3JlYXRlID0gc2lub24uc3B5LmNyZWF0ZTtcbiAgICAgICAgICAgIHByb3h5LmlkID0gXCJzcHkjXCIgKyB1dWlkKys7XG5cbiAgICAgICAgICAgIHJldHVybiBwcm94eTtcbiAgICAgICAgfSxcblxuICAgICAgICBpbnZva2U6IGZ1bmN0aW9uIGludm9rZShmdW5jLCB0aGlzVmFsdWUsIGFyZ3MpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaGluZyA9IG1hdGNoaW5nRmFrZSh0aGlzLmZha2VzLCBhcmdzKTtcbiAgICAgICAgICAgIHZhciBleGNlcHRpb24sIHJldHVyblZhbHVlO1xuXG4gICAgICAgICAgICBpbmNyZW1lbnRDYWxsQ291bnQuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHB1c2guY2FsbCh0aGlzLnRoaXNWYWx1ZXMsIHRoaXNWYWx1ZSk7XG4gICAgICAgICAgICBwdXNoLmNhbGwodGhpcy5hcmdzLCBhcmdzKTtcbiAgICAgICAgICAgIHB1c2guY2FsbCh0aGlzLmNhbGxJZHMsIGNhbGxJZCsrKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSBtYXRjaGluZy5pbnZva2UoZnVuYywgdGhpc1ZhbHVlLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9ICh0aGlzLmZ1bmMgfHwgZnVuYykuYXBwbHkodGhpc1ZhbHVlLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgdGhpc0NhbGwgPSB0aGlzLmdldENhbGwodGhpcy5jYWxsQ291bnQgLSAxKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpc0NhbGwuY2FsbGVkV2l0aE5ldygpICYmIHR5cGVvZiByZXR1cm5WYWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmFsdWUgPSB0aGlzVmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHB1c2guY2FsbCh0aGlzLmV4Y2VwdGlvbnMsIGV4Y2VwdGlvbik7XG4gICAgICAgICAgICBwdXNoLmNhbGwodGhpcy5yZXR1cm5WYWx1ZXMsIHJldHVyblZhbHVlKTtcblxuICAgICAgICAgICAgY3JlYXRlQ2FsbFByb3BlcnRpZXMuY2FsbCh0aGlzKTtcblxuICAgICAgICAgICAgaWYgKGV4Y2VwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Q2FsbDogZnVuY3Rpb24gZ2V0Q2FsbChpKSB7XG4gICAgICAgICAgICBpZiAoaSA8IDAgfHwgaSA+PSB0aGlzLmNhbGxDb3VudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2lub24uc3B5Q2FsbCh0aGlzLCB0aGlzLnRoaXNWYWx1ZXNbaV0sIHRoaXMuYXJnc1tpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmV0dXJuVmFsdWVzW2ldLCB0aGlzLmV4Y2VwdGlvbnNbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGxJZHNbaV0pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldENhbGxzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY2FsbHMgPSBbXTtcbiAgICAgICAgICAgIHZhciBpO1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5jYWxsQ291bnQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGNhbGxzLnB1c2godGhpcy5nZXRDYWxsKGkpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNhbGxzO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxlZEJlZm9yZTogZnVuY3Rpb24gY2FsbGVkQmVmb3JlKHNweUZuKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY2FsbGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXNweUZuLmNhbGxlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsSWRzWzBdIDwgc3B5Rm4uY2FsbElkc1tzcHlGbi5jYWxsSWRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxlZEFmdGVyOiBmdW5jdGlvbiBjYWxsZWRBZnRlcihzcHlGbikge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmNhbGxlZCB8fCAhc3B5Rm4uY2FsbGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsSWRzW3RoaXMuY2FsbENvdW50IC0gMV0gPiBzcHlGbi5jYWxsSWRzW3NweUZuLmNhbGxDb3VudCAtIDFdO1xuICAgICAgICB9LFxuXG4gICAgICAgIHdpdGhBcmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZmFrZXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2ggPSBtYXRjaGluZ0Zha2UodGhpcy5mYWtlcywgYXJncywgdHJ1ZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5mYWtlcyA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGZha2UgPSB0aGlzLl9jcmVhdGUoKTtcbiAgICAgICAgICAgIGZha2UubWF0Y2hpbmdBZ3VtZW50cyA9IGFyZ3M7XG4gICAgICAgICAgICBmYWtlLnBhcmVudCA9IHRoaXM7XG4gICAgICAgICAgICBwdXNoLmNhbGwodGhpcy5mYWtlcywgZmFrZSk7XG5cbiAgICAgICAgICAgIGZha2Uud2l0aEFyZ3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9yaWdpbmFsLndpdGhBcmdzLmFwcGx5KG9yaWdpbmFsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoZmFrZS5tYXRjaGVzKHRoaXMuYXJnc1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5jcmVtZW50Q2FsbENvdW50LmNhbGwoZmFrZSk7XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChmYWtlLnRoaXNWYWx1ZXMsIHRoaXMudGhpc1ZhbHVlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChmYWtlLmFyZ3MsIHRoaXMuYXJnc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIHB1c2guY2FsbChmYWtlLnJldHVyblZhbHVlcywgdGhpcy5yZXR1cm5WYWx1ZXNbaV0pO1xuICAgICAgICAgICAgICAgICAgICBwdXNoLmNhbGwoZmFrZS5leGNlcHRpb25zLCB0aGlzLmV4Y2VwdGlvbnNbaV0pO1xuICAgICAgICAgICAgICAgICAgICBwdXNoLmNhbGwoZmFrZS5jYWxsSWRzLCB0aGlzLmNhbGxJZHNbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNyZWF0ZUNhbGxQcm9wZXJ0aWVzLmNhbGwoZmFrZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWtlO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1hdGNoZXM6IGZ1bmN0aW9uIChhcmdzLCBzdHJpY3QpIHtcbiAgICAgICAgICAgIHZhciBtYXJncyA9IHRoaXMubWF0Y2hpbmdBZ3VtZW50cztcblxuICAgICAgICAgICAgaWYgKG1hcmdzLmxlbmd0aCA8PSBhcmdzLmxlbmd0aCAmJlxuICAgICAgICAgICAgICAgIHNpbm9uLmRlZXBFcXVhbChtYXJncywgYXJncy5zbGljZSgwLCBtYXJncy5sZW5ndGgpKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhc3RyaWN0IHx8IG1hcmdzLmxlbmd0aCA9PSBhcmdzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBwcmludGY6IGZ1bmN0aW9uIChmb3JtYXQpIHtcbiAgICAgICAgICAgIHZhciBzcHkgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVyO1xuXG4gICAgICAgICAgICByZXR1cm4gKGZvcm1hdCB8fCBcIlwiKS5yZXBsYWNlKC8lKC4pL2csIGZ1bmN0aW9uIChtYXRjaCwgc3BlY2lmeWVyKSB7XG4gICAgICAgICAgICAgICAgZm9ybWF0dGVyID0gc3B5QXBpLmZvcm1hdHRlcnNbc3BlY2lmeWVyXTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZm9ybWF0dGVyID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVyLmNhbGwobnVsbCwgc3B5LCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpc05hTihwYXJzZUludChzcGVjaWZ5ZXIsIDEwKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNpbm9uLmZvcm1hdChhcmdzW3NwZWNpZnllciAtIDFdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gXCIlXCIgKyBzcGVjaWZ5ZXI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBkZWxlZ2F0ZVRvQ2FsbHMobWV0aG9kLCBtYXRjaEFueSwgYWN0dWFsLCBub3RDYWxsZWQpIHtcbiAgICAgICAgc3B5QXBpW21ldGhvZF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY2FsbGVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vdENhbGxlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm90Q2FsbGVkLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIGN1cnJlbnRDYWxsO1xuICAgICAgICAgICAgdmFyIG1hdGNoZXMgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuY2FsbENvdW50OyBpIDwgbDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudENhbGwgPSB0aGlzLmdldENhbGwoaSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudENhbGxbYWN0dWFsIHx8IG1ldGhvZF0uYXBwbHkoY3VycmVudENhbGwsIGFyZ3VtZW50cykpIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcyArPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChtYXRjaEFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtYXRjaGVzID09PSB0aGlzLmNhbGxDb3VudDtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJjYWxsZWRPblwiLCB0cnVlKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJhbHdheXNDYWxsZWRPblwiLCBmYWxzZSwgXCJjYWxsZWRPblwiKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJjYWxsZWRXaXRoXCIsIHRydWUpO1xuICAgIGRlbGVnYXRlVG9DYWxscyhcImNhbGxlZFdpdGhNYXRjaFwiLCB0cnVlKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJhbHdheXNDYWxsZWRXaXRoXCIsIGZhbHNlLCBcImNhbGxlZFdpdGhcIik7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiYWx3YXlzQ2FsbGVkV2l0aE1hdGNoXCIsIGZhbHNlLCBcImNhbGxlZFdpdGhNYXRjaFwiKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJjYWxsZWRXaXRoRXhhY3RseVwiLCB0cnVlKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJhbHdheXNDYWxsZWRXaXRoRXhhY3RseVwiLCBmYWxzZSwgXCJjYWxsZWRXaXRoRXhhY3RseVwiKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJuZXZlckNhbGxlZFdpdGhcIiwgZmFsc2UsIFwibm90Q2FsbGVkV2l0aFwiLFxuICAgICAgICBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9KTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJuZXZlckNhbGxlZFdpdGhNYXRjaFwiLCBmYWxzZSwgXCJub3RDYWxsZWRXaXRoTWF0Y2hcIixcbiAgICAgICAgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfSk7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwidGhyZXdcIiwgdHJ1ZSk7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiYWx3YXlzVGhyZXdcIiwgZmFsc2UsIFwidGhyZXdcIik7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwicmV0dXJuZWRcIiwgdHJ1ZSk7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiYWx3YXlzUmV0dXJuZWRcIiwgZmFsc2UsIFwicmV0dXJuZWRcIik7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiY2FsbGVkV2l0aE5ld1wiLCB0cnVlKTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJhbHdheXNDYWxsZWRXaXRoTmV3XCIsIGZhbHNlLCBcImNhbGxlZFdpdGhOZXdcIik7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiY2FsbEFyZ1wiLCBmYWxzZSwgXCJjYWxsQXJnV2l0aFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIiBjYW5ub3QgY2FsbCBhcmcgc2luY2UgaXQgd2FzIG5vdCB5ZXQgaW52b2tlZC5cIik7XG4gICAgfSk7XG4gICAgc3B5QXBpLmNhbGxBcmdXaXRoID0gc3B5QXBpLmNhbGxBcmc7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwiY2FsbEFyZ09uXCIsIGZhbHNlLCBcImNhbGxBcmdPbldpdGhcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy50b1N0cmluZygpICsgXCIgY2Fubm90IGNhbGwgYXJnIHNpbmNlIGl0IHdhcyBub3QgeWV0IGludm9rZWQuXCIpO1xuICAgIH0pO1xuICAgIHNweUFwaS5jYWxsQXJnT25XaXRoID0gc3B5QXBpLmNhbGxBcmdPbjtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJ5aWVsZFwiLCBmYWxzZSwgXCJ5aWVsZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIiBjYW5ub3QgeWllbGQgc2luY2UgaXQgd2FzIG5vdCB5ZXQgaW52b2tlZC5cIik7XG4gICAgfSk7XG4gICAgLy8gXCJpbnZva2VDYWxsYmFja1wiIGlzIGFuIGFsaWFzIGZvciBcInlpZWxkXCIgc2luY2UgXCJ5aWVsZFwiIGlzIGludmFsaWQgaW4gc3RyaWN0IG1vZGUuXG4gICAgc3B5QXBpLmludm9rZUNhbGxiYWNrID0gc3B5QXBpLnlpZWxkO1xuICAgIGRlbGVnYXRlVG9DYWxscyhcInlpZWxkT25cIiwgZmFsc2UsIFwieWllbGRPblwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLnRvU3RyaW5nKCkgKyBcIiBjYW5ub3QgeWllbGQgc2luY2UgaXQgd2FzIG5vdCB5ZXQgaW52b2tlZC5cIik7XG4gICAgfSk7XG4gICAgZGVsZWdhdGVUb0NhbGxzKFwieWllbGRUb1wiLCBmYWxzZSwgXCJ5aWVsZFRvXCIsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy50b1N0cmluZygpICsgXCIgY2Fubm90IHlpZWxkIHRvICdcIiArIHByb3BlcnR5ICtcbiAgICAgICAgICAgIFwiJyBzaW5jZSBpdCB3YXMgbm90IHlldCBpbnZva2VkLlwiKTtcbiAgICB9KTtcbiAgICBkZWxlZ2F0ZVRvQ2FsbHMoXCJ5aWVsZFRvT25cIiwgZmFsc2UsIFwieWllbGRUb09uXCIsIGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy50b1N0cmluZygpICsgXCIgY2Fubm90IHlpZWxkIHRvICdcIiArIHByb3BlcnR5ICtcbiAgICAgICAgICAgIFwiJyBzaW5jZSBpdCB3YXMgbm90IHlldCBpbnZva2VkLlwiKTtcbiAgICB9KTtcblxuICAgIHNweUFwaS5mb3JtYXR0ZXJzID0ge1xuICAgICAgICBcImNcIjogZnVuY3Rpb24gKHNweSkge1xuICAgICAgICAgICAgcmV0dXJuIHNpbm9uLnRpbWVzSW5Xb3JkcyhzcHkuY2FsbENvdW50KTtcbiAgICAgICAgfSxcblxuICAgICAgICBcIm5cIjogZnVuY3Rpb24gKHNweSkge1xuICAgICAgICAgICAgcmV0dXJuIHNweS50b1N0cmluZygpO1xuICAgICAgICB9LFxuXG4gICAgICAgIFwiQ1wiOiBmdW5jdGlvbiAoc3B5KSB7XG4gICAgICAgICAgICB2YXIgY2FsbHMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBzcHkuY2FsbENvdW50OyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0cmluZ2lmaWVkQ2FsbCA9IFwiICAgIFwiICsgc3B5LmdldENhbGwoaSkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBpZiAoL1xcbi8udGVzdChjYWxsc1tpIC0gMV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZ2lmaWVkQ2FsbCA9IFwiXFxuXCIgKyBzdHJpbmdpZmllZENhbGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHB1c2guY2FsbChjYWxscywgc3RyaW5naWZpZWRDYWxsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNhbGxzLmxlbmd0aCA+IDAgPyBcIlxcblwiICsgY2FsbHMuam9pbihcIlxcblwiKSA6IFwiXCI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgXCJ0XCI6IGZ1bmN0aW9uIChzcHkpIHtcbiAgICAgICAgICAgIHZhciBvYmplY3RzID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gc3B5LmNhbGxDb3VudDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgICAgIHB1c2guY2FsbChvYmplY3RzLCBzaW5vbi5mb3JtYXQoc3B5LnRoaXNWYWx1ZXNbaV0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdHMuam9pbihcIiwgXCIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIFwiKlwiOiBmdW5jdGlvbiAoc3B5LCBhcmdzKSB7XG4gICAgICAgICAgICB2YXIgZm9ybWF0dGVkID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXJncy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICBwdXNoLmNhbGwoZm9ybWF0dGVkLCBzaW5vbi5mb3JtYXQoYXJnc1tpXSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0dGVkLmpvaW4oXCIsIFwiKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBzaW5vbi5leHRlbmQoc3B5LCBzcHlBcGkpO1xuXG4gICAgc3B5LnNweUNhbGwgPSBzaW5vbi5zcHlDYWxsO1xuXG4gICAgaWYgKGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gc3B5O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLnNweSA9IHNweTtcbiAgICB9XG59KHR5cGVvZiBzaW5vbiA9PSBcIm9iamVjdFwiICYmIHNpbm9uIHx8IG51bGwpKTtcbiIsIi8qKlxuICogQGRlcGVuZCAuLi9zaW5vbi5qc1xuICogQGRlcGVuZCBzcHkuanNcbiAqIEBkZXBlbmQgYmVoYXZpb3IuanNcbiAqL1xuLypqc2xpbnQgZXFlcWVxOiBmYWxzZSwgb25ldmFyOiBmYWxzZSovXG4vKmdsb2JhbCBtb2R1bGUsIHJlcXVpcmUsIHNpbm9uKi9cbi8qKlxuICogU3R1YiBmdW5jdGlvbnNcbiAqXG4gKiBAYXV0aG9yIENocmlzdGlhbiBKb2hhbnNlbiAoY2hyaXN0aWFuQGNqb2hhbnNlbi5ubylcbiAqIEBsaWNlbnNlIEJTRFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMC0yMDEzIENocmlzdGlhbiBKb2hhbnNlblxuICovXG5cInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uIChzaW5vbikge1xuICAgIHZhciBjb21tb25KU01vZHVsZSA9IHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzO1xuXG4gICAgaWYgKCFzaW5vbiAmJiBjb21tb25KU01vZHVsZSkge1xuICAgICAgICBzaW5vbiA9IHJlcXVpcmUoXCIuLi9zaW5vblwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXNpbm9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdHViKG9iamVjdCwgcHJvcGVydHksIGZ1bmMpIHtcbiAgICAgICAgaWYgKCEhZnVuYyAmJiB0eXBlb2YgZnVuYyAhPSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDdXN0b20gc3R1YiBzaG91bGQgYmUgZnVuY3Rpb25cIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd3JhcHBlcjtcblxuICAgICAgICBpZiAoZnVuYykge1xuICAgICAgICAgICAgd3JhcHBlciA9IHNpbm9uLnNweSAmJiBzaW5vbi5zcHkuY3JlYXRlID8gc2lub24uc3B5LmNyZWF0ZShmdW5jKSA6IGZ1bmM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3cmFwcGVyID0gc3R1Yi5jcmVhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghb2JqZWN0ICYmIHR5cGVvZiBwcm9wZXJ0eSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgcmV0dXJuIHNpbm9uLnN0dWIuY3JlYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5ID09PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBvYmplY3QgPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdFtwcm9wXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0dWIob2JqZWN0LCBwcm9wKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2lub24ud3JhcE1ldGhvZChvYmplY3QsIHByb3BlcnR5LCB3cmFwcGVyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREZWZhdWx0QmVoYXZpb3Ioc3R1Yikge1xuICAgICAgICByZXR1cm4gc3R1Yi5kZWZhdWx0QmVoYXZpb3IgfHwgZ2V0UGFyZW50QmVoYXZpb3VyKHN0dWIpIHx8IHNpbm9uLmJlaGF2aW9yLmNyZWF0ZShzdHViKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRQYXJlbnRCZWhhdmlvdXIoc3R1Yikge1xuICAgICAgICByZXR1cm4gKHN0dWIucGFyZW50ICYmIGdldEN1cnJlbnRCZWhhdmlvcihzdHViLnBhcmVudCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEN1cnJlbnRCZWhhdmlvcihzdHViKSB7XG4gICAgICAgIHZhciBiZWhhdmlvciA9IHN0dWIuYmVoYXZpb3JzW3N0dWIuY2FsbENvdW50IC0gMV07XG4gICAgICAgIHJldHVybiBiZWhhdmlvciAmJiBiZWhhdmlvci5pc1ByZXNlbnQoKSA/IGJlaGF2aW9yIDogZ2V0RGVmYXVsdEJlaGF2aW9yKHN0dWIpO1xuICAgIH1cblxuICAgIHZhciB1dWlkID0gMDtcblxuICAgIHNpbm9uLmV4dGVuZChzdHViLCAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcHJvdG8gPSB7XG4gICAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25TdHViID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0Q3VycmVudEJlaGF2aW9yKGZ1bmN0aW9uU3R1YikuaW52b2tlKHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uU3R1Yi5pZCA9IFwic3R1YiNcIiArIHV1aWQrKztcbiAgICAgICAgICAgICAgICB2YXIgb3JpZyA9IGZ1bmN0aW9uU3R1YjtcbiAgICAgICAgICAgICAgICBmdW5jdGlvblN0dWIgPSBzaW5vbi5zcHkuY3JlYXRlKGZ1bmN0aW9uU3R1Yik7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb25TdHViLmZ1bmMgPSBvcmlnO1xuXG4gICAgICAgICAgICAgICAgc2lub24uZXh0ZW5kKGZ1bmN0aW9uU3R1Yiwgc3R1Yik7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb25TdHViLl9jcmVhdGUgPSBzaW5vbi5zdHViLmNyZWF0ZTtcbiAgICAgICAgICAgICAgICBmdW5jdGlvblN0dWIuZGlzcGxheU5hbWUgPSBcInN0dWJcIjtcbiAgICAgICAgICAgICAgICBmdW5jdGlvblN0dWIudG9TdHJpbmcgPSBzaW5vbi5mdW5jdGlvblRvU3RyaW5nO1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb25TdHViLmRlZmF1bHRCZWhhdmlvciA9IG51bGw7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb25TdHViLmJlaGF2aW9ycyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uU3R1YjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlc2V0QmVoYXZpb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaTtcblxuICAgICAgICAgICAgICAgIHRoaXMuZGVmYXVsdEJlaGF2aW9yID0gbnVsbDtcbiAgICAgICAgICAgICAgICB0aGlzLmJlaGF2aW9ycyA9IFtdO1xuXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmV0dXJuVmFsdWU7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMucmV0dXJuQXJnQXQ7XG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5UaGlzID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5mYWtlcykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5mYWtlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mYWtlc1tpXS5yZXNldEJlaGF2aW9yKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkNhbGw6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJlaGF2aW9yc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWhhdmlvcnNbaW5kZXhdID0gc2lub24uYmVoYXZpb3IuY3JlYXRlKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmJlaGF2aW9yc1tpbmRleF07XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbkZpcnN0Q2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25DYWxsKDApO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25TZWNvbmRDYWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkNhbGwoMSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvblRoaXJkQ2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25DYWxsKDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAodmFyIG1ldGhvZCBpbiBzaW5vbi5iZWhhdmlvcikge1xuICAgICAgICAgICAgaWYgKHNpbm9uLmJlaGF2aW9yLmhhc093blByb3BlcnR5KG1ldGhvZCkgJiZcbiAgICAgICAgICAgICAgICAhcHJvdG8uaGFzT3duUHJvcGVydHkobWV0aG9kKSAmJlxuICAgICAgICAgICAgICAgIG1ldGhvZCAhPSAnY3JlYXRlJyAmJlxuICAgICAgICAgICAgICAgIG1ldGhvZCAhPSAnd2l0aEFyZ3MnICYmXG4gICAgICAgICAgICAgICAgbWV0aG9kICE9ICdpbnZva2UnKSB7XG4gICAgICAgICAgICAgICAgcHJvdG9bbWV0aG9kXSA9IChmdW5jdGlvbihiZWhhdmlvck1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmF1bHRCZWhhdmlvciA9IHRoaXMuZGVmYXVsdEJlaGF2aW9yIHx8IHNpbm9uLmJlaGF2aW9yLmNyZWF0ZSh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmYXVsdEJlaGF2aW9yW2JlaGF2aW9yTWV0aG9kXS5hcHBseSh0aGlzLmRlZmF1bHRCZWhhdmlvciwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0obWV0aG9kKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJvdG87XG4gICAgfSgpKSk7XG5cbiAgICBpZiAoY29tbW9uSlNNb2R1bGUpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBzdHViO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbm9uLnN0dWIgPSBzdHViO1xuICAgIH1cbn0odHlwZW9mIHNpbm9uID09IFwib2JqZWN0XCIgJiYgc2lub24gfHwgbnVsbCkpO1xuIiwiLyoqXG4gKiBAZGVwZW5kIC4uL3Npbm9uLmpzXG4gKiBAZGVwZW5kIHN0dWIuanNcbiAqIEBkZXBlbmQgbW9jay5qc1xuICogQGRlcGVuZCBzYW5kYm94LmpzXG4gKi9cbi8qanNsaW50IGVxZXFlcTogZmFsc2UsIG9uZXZhcjogZmFsc2UsIGZvcmluOiB0cnVlLCBwbHVzcGx1czogZmFsc2UqL1xuLypnbG9iYWwgbW9kdWxlLCByZXF1aXJlLCBzaW5vbiovXG4vKipcbiAqIFRlc3QgZnVuY3Rpb24sIHNhbmRib3hlcyBmYWtlc1xuICpcbiAqIEBhdXRob3IgQ2hyaXN0aWFuIEpvaGFuc2VuIChjaHJpc3RpYW5AY2pvaGFuc2VuLm5vKVxuICogQGxpY2Vuc2UgQlNEXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDEwLTIwMTMgQ2hyaXN0aWFuIEpvaGFuc2VuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG4oZnVuY3Rpb24gKHNpbm9uKSB7XG4gICAgdmFyIGNvbW1vbkpTTW9kdWxlID0gdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHM7XG5cbiAgICBpZiAoIXNpbm9uICYmIGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIHNpbm9uID0gcmVxdWlyZShcIi4uL3Npbm9uXCIpO1xuICAgIH1cblxuICAgIGlmICghc2lub24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRlc3QoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgY2FsbGJhY2s7XG5cbiAgICAgICAgaWYgKHR5cGUgIT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwic2lub24udGVzdCBuZWVkcyB0byB3cmFwIGEgdGVzdCBmdW5jdGlvbiwgZ290IFwiICsgdHlwZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IHNpbm9uLmdldENvbmZpZyhzaW5vbi5jb25maWcpO1xuICAgICAgICAgICAgY29uZmlnLmluamVjdEludG8gPSBjb25maWcuaW5qZWN0SW50b1RoaXMgJiYgdGhpcyB8fCBjb25maWcuaW5qZWN0SW50bztcbiAgICAgICAgICAgIHZhciBzYW5kYm94ID0gc2lub24uc2FuZGJveC5jcmVhdGUoY29uZmlnKTtcbiAgICAgICAgICAgIHZhciBleGNlcHRpb24sIHJlc3VsdDtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKS5jb25jYXQoc2FuZGJveC5hcmdzKTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBleGNlcHRpb24gPSBlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4Y2VwdGlvbiAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHNhbmRib3gucmVzdG9yZSgpO1xuICAgICAgICAgICAgICAgIHRocm93IGV4Y2VwdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNhbmRib3gudmVyaWZ5QW5kUmVzdG9yZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRlc3QuY29uZmlnID0ge1xuICAgICAgICBpbmplY3RJbnRvVGhpczogdHJ1ZSxcbiAgICAgICAgaW5qZWN0SW50bzogbnVsbCxcbiAgICAgICAgcHJvcGVydGllczogW1wic3B5XCIsIFwic3R1YlwiLCBcIm1vY2tcIiwgXCJjbG9ja1wiLCBcInNlcnZlclwiLCBcInJlcXVlc3RzXCJdLFxuICAgICAgICB1c2VGYWtlVGltZXJzOiB0cnVlLFxuICAgICAgICB1c2VGYWtlU2VydmVyOiB0cnVlXG4gICAgfTtcblxuICAgIGlmIChjb21tb25KU01vZHVsZSkge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHRlc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2lub24udGVzdCA9IHRlc3Q7XG4gICAgfVxufSh0eXBlb2Ygc2lub24gPT0gXCJvYmplY3RcIiAmJiBzaW5vbiB8fCBudWxsKSk7XG4iLCIvKipcbiAqIEBkZXBlbmQgLi4vc2lub24uanNcbiAqIEBkZXBlbmQgdGVzdC5qc1xuICovXG4vKmpzbGludCBlcWVxZXE6IGZhbHNlLCBvbmV2YXI6IGZhbHNlLCBlcWVxZXE6IGZhbHNlKi9cbi8qZ2xvYmFsIG1vZHVsZSwgcmVxdWlyZSwgc2lub24qL1xuLyoqXG4gKiBUZXN0IGNhc2UsIHNhbmRib3hlcyBhbGwgdGVzdCBmdW5jdGlvbnNcbiAqXG4gKiBAYXV0aG9yIENocmlzdGlhbiBKb2hhbnNlbiAoY2hyaXN0aWFuQGNqb2hhbnNlbi5ubylcbiAqIEBsaWNlbnNlIEJTRFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMC0yMDEzIENocmlzdGlhbiBKb2hhbnNlblxuICovXG5cInVzZSBzdHJpY3RcIjtcblxuKGZ1bmN0aW9uIChzaW5vbikge1xuICAgIHZhciBjb21tb25KU01vZHVsZSA9IHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzO1xuXG4gICAgaWYgKCFzaW5vbiAmJiBjb21tb25KU01vZHVsZSkge1xuICAgICAgICBzaW5vbiA9IHJlcXVpcmUoXCIuLi9zaW5vblwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXNpbm9uIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVUZXN0KHByb3BlcnR5LCBzZXRVcCwgdGVhckRvd24pIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChzZXRVcCkge1xuICAgICAgICAgICAgICAgIHNldFVwLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBleGNlcHRpb24sIHJlc3VsdDtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBwcm9wZXJ0eS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGV4Y2VwdGlvbiA9IGU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0ZWFyRG93bikge1xuICAgICAgICAgICAgICAgIHRlYXJEb3duLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBleGNlcHRpb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGVzdENhc2UodGVzdHMsIHByZWZpeCkge1xuICAgICAgICAvKmpzbDppZ25vcmUqL1xuICAgICAgICBpZiAoIXRlc3RzIHx8IHR5cGVvZiB0ZXN0cyAhPSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwic2lub24udGVzdENhc2UgbmVlZHMgYW4gb2JqZWN0IHdpdGggdGVzdCBmdW5jdGlvbnNcIik7XG4gICAgICAgIH1cbiAgICAgICAgLypqc2w6ZW5kKi9cblxuICAgICAgICBwcmVmaXggPSBwcmVmaXggfHwgXCJ0ZXN0XCI7XG4gICAgICAgIHZhciByUHJlZml4ID0gbmV3IFJlZ0V4cChcIl5cIiArIHByZWZpeCk7XG4gICAgICAgIHZhciBtZXRob2RzID0ge30sIHRlc3ROYW1lLCBwcm9wZXJ0eSwgbWV0aG9kO1xuICAgICAgICB2YXIgc2V0VXAgPSB0ZXN0cy5zZXRVcDtcbiAgICAgICAgdmFyIHRlYXJEb3duID0gdGVzdHMudGVhckRvd247XG5cbiAgICAgICAgZm9yICh0ZXN0TmFtZSBpbiB0ZXN0cykge1xuICAgICAgICAgICAgaWYgKHRlc3RzLmhhc093blByb3BlcnR5KHRlc3ROYW1lKSkge1xuICAgICAgICAgICAgICAgIHByb3BlcnR5ID0gdGVzdHNbdGVzdE5hbWVdO1xuXG4gICAgICAgICAgICAgICAgaWYgKC9eKHNldFVwfHRlYXJEb3duKSQvLnRlc3QodGVzdE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHkgPT0gXCJmdW5jdGlvblwiICYmIHJQcmVmaXgudGVzdCh0ZXN0TmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kID0gcHJvcGVydHk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNldFVwIHx8IHRlYXJEb3duKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPSBjcmVhdGVUZXN0KHByb3BlcnR5LCBzZXRVcCwgdGVhckRvd24pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kc1t0ZXN0TmFtZV0gPSBzaW5vbi50ZXN0KG1ldGhvZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kc1t0ZXN0TmFtZV0gPSB0ZXN0c1t0ZXN0TmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1ldGhvZHM7XG4gICAgfVxuXG4gICAgaWYgKGNvbW1vbkpTTW9kdWxlKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gdGVzdENhc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2lub24udGVzdENhc2UgPSB0ZXN0Q2FzZTtcbiAgICB9XG59KHR5cGVvZiBzaW5vbiA9PSBcIm9iamVjdFwiICYmIHNpbm9uIHx8IG51bGwpKTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXsvKmpzbGludCBlcWVxZXE6IGZhbHNlLCBwbHVzcGx1czogZmFsc2UsIGV2aWw6IHRydWUsIG9uZXZhcjogZmFsc2UsIGJyb3dzZXI6IHRydWUsIGZvcmluOiBmYWxzZSovXG4vKmdsb2JhbCBtb2R1bGUsIHJlcXVpcmUsIHdpbmRvdyovXG4vKipcbiAqIEZha2UgdGltZXIgQVBJXG4gKiBzZXRUaW1lb3V0XG4gKiBzZXRJbnRlcnZhbFxuICogY2xlYXJUaW1lb3V0XG4gKiBjbGVhckludGVydmFsXG4gKiB0aWNrXG4gKiByZXNldFxuICogRGF0ZVxuICpcbiAqIEluc3BpcmVkIGJ5IGpzVW5pdE1vY2tUaW1lT3V0IGZyb20gSnNVbml0XG4gKlxuICogQGF1dGhvciBDaHJpc3RpYW4gSm9oYW5zZW4gKGNocmlzdGlhbkBjam9oYW5zZW4ubm8pXG4gKiBAbGljZW5zZSBCU0RcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTAtMjAxMyBDaHJpc3RpYW4gSm9oYW5zZW5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbmlmICh0eXBlb2Ygc2lub24gPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciBzaW5vbiA9IHt9O1xufVxuXG4oZnVuY3Rpb24gKGdsb2JhbCkge1xuICAgIHZhciBpZCA9IDE7XG5cbiAgICBmdW5jdGlvbiBhZGRUaW1lcihhcmdzLCByZWN1cnJpbmcpIHtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGdW5jdGlvbiByZXF1aXJlcyBhdCBsZWFzdCAxIHBhcmFtZXRlclwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGJhY2sgbXVzdCBiZSBwcm92aWRlZCB0byB0aW1lciBjYWxsc1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0b0lkID0gaWQrKztcbiAgICAgICAgdmFyIGRlbGF5ID0gYXJnc1sxXSB8fCAwO1xuXG4gICAgICAgIGlmICghdGhpcy50aW1lb3V0cykge1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0cyA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50aW1lb3V0c1t0b0lkXSA9IHtcbiAgICAgICAgICAgIGlkOiB0b0lkLFxuICAgICAgICAgICAgZnVuYzogYXJnc1swXSxcbiAgICAgICAgICAgIGNhbGxBdDogdGhpcy5ub3cgKyBkZWxheSxcbiAgICAgICAgICAgIGludm9rZUFyZ3M6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MsIDIpXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHJlY3VycmluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy50aW1lb3V0c1t0b0lkXS5pbnRlcnZhbCA9IGRlbGF5O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRvSWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VUaW1lKHN0cikge1xuICAgICAgICBpZiAoIXN0cikge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3RyaW5ncyA9IHN0ci5zcGxpdChcIjpcIik7XG4gICAgICAgIHZhciBsID0gc3RyaW5ncy5sZW5ndGgsIGkgPSBsO1xuICAgICAgICB2YXIgbXMgPSAwLCBwYXJzZWQ7XG5cbiAgICAgICAgaWYgKGwgPiAzIHx8ICEvXihcXGRcXGQ6KXswLDJ9XFxkXFxkPyQvLnRlc3Qoc3RyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGljayBvbmx5IHVuZGVyc3RhbmRzIG51bWJlcnMgYW5kICdoOm06cydcIik7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBwYXJzZWQgPSBwYXJzZUludChzdHJpbmdzW2ldLCAxMCk7XG5cbiAgICAgICAgICAgIGlmIChwYXJzZWQgPj0gNjApIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIHRpbWUgXCIgKyBzdHIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtcyArPSBwYXJzZWQgKiBNYXRoLnBvdyg2MCwgKGwgLSBpIC0gMSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1zICogMTAwMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVPYmplY3Qob2JqZWN0KSB7XG4gICAgICAgIHZhciBuZXdPYmplY3Q7XG5cbiAgICAgICAgaWYgKE9iamVjdC5jcmVhdGUpIHtcbiAgICAgICAgICAgIG5ld09iamVjdCA9IE9iamVjdC5jcmVhdGUob2JqZWN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBGID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgICAgICBGLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgICAgICAgICAgIG5ld09iamVjdCA9IG5ldyBGKCk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXdPYmplY3QuRGF0ZS5jbG9jayA9IG5ld09iamVjdDtcbiAgICAgICAgcmV0dXJuIG5ld09iamVjdDtcbiAgICB9XG5cbiAgICBzaW5vbi5jbG9jayA9IHtcbiAgICAgICAgbm93OiAwLFxuXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gY3JlYXRlKG5vdykge1xuICAgICAgICAgICAgdmFyIGNsb2NrID0gY3JlYXRlT2JqZWN0KHRoaXMpO1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIG5vdyA9PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgY2xvY2subm93ID0gbm93O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoISFub3cgJiYgdHlwZW9mIG5vdyA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5vdyBzaG91bGQgYmUgbWlsbGlzZWNvbmRzIHNpbmNlIFVOSVggZXBvY2hcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjbG9jaztcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRUaW1lb3V0OiBmdW5jdGlvbiBzZXRUaW1lb3V0KGNhbGxiYWNrLCB0aW1lb3V0KSB7XG4gICAgICAgICAgICByZXR1cm4gYWRkVGltZXIuY2FsbCh0aGlzLCBhcmd1bWVudHMsIGZhbHNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhclRpbWVvdXQ6IGZ1bmN0aW9uIGNsZWFyVGltZW91dCh0aW1lcklkKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMudGltZW91dHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVvdXRzID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aW1lcklkIGluIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy50aW1lb3V0c1t0aW1lcklkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzZXRJbnRlcnZhbDogZnVuY3Rpb24gc2V0SW50ZXJ2YWwoY2FsbGJhY2ssIHRpbWVvdXQpIHtcbiAgICAgICAgICAgIHJldHVybiBhZGRUaW1lci5jYWxsKHRoaXMsIGFyZ3VtZW50cywgdHJ1ZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXJJbnRlcnZhbDogZnVuY3Rpb24gY2xlYXJJbnRlcnZhbCh0aW1lcklkKSB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyVGltZW91dCh0aW1lcklkKTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRJbW1lZGlhdGU6IGZ1bmN0aW9uIHNldEltbWVkaWF0ZShjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHBhc3NUaHJ1QXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cbiAgICAgICAgICAgIHJldHVybiBhZGRUaW1lci5jYWxsKHRoaXMsIFtjYWxsYmFjaywgMF0uY29uY2F0KHBhc3NUaHJ1QXJncyksIGZhbHNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhckltbWVkaWF0ZTogZnVuY3Rpb24gY2xlYXJJbW1lZGlhdGUodGltZXJJZCkge1xuICAgICAgICAgICAgdGhpcy5jbGVhclRpbWVvdXQodGltZXJJZCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdGljazogZnVuY3Rpb24gdGljayhtcykge1xuICAgICAgICAgICAgbXMgPSB0eXBlb2YgbXMgPT0gXCJudW1iZXJcIiA/IG1zIDogcGFyc2VUaW1lKG1zKTtcbiAgICAgICAgICAgIHZhciB0aWNrRnJvbSA9IHRoaXMubm93LCB0aWNrVG8gPSB0aGlzLm5vdyArIG1zLCBwcmV2aW91cyA9IHRoaXMubm93O1xuICAgICAgICAgICAgdmFyIHRpbWVyID0gdGhpcy5maXJzdFRpbWVySW5SYW5nZSh0aWNrRnJvbSwgdGlja1RvKTtcblxuICAgICAgICAgICAgdmFyIGZpcnN0RXhjZXB0aW9uO1xuICAgICAgICAgICAgd2hpbGUgKHRpbWVyICYmIHRpY2tGcm9tIDw9IHRpY2tUbykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpbWVvdXRzW3RpbWVyLmlkXSkge1xuICAgICAgICAgICAgICAgICAgICB0aWNrRnJvbSA9IHRoaXMubm93ID0gdGltZXIuY2FsbEF0O1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsbFRpbWVyKHRpbWVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGZpcnN0RXhjZXB0aW9uID0gZmlyc3RFeGNlcHRpb24gfHwgZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRpbWVyID0gdGhpcy5maXJzdFRpbWVySW5SYW5nZShwcmV2aW91cywgdGlja1RvKTtcbiAgICAgICAgICAgICAgICBwcmV2aW91cyA9IHRpY2tGcm9tO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLm5vdyA9IHRpY2tUbztcblxuICAgICAgICAgICAgaWYgKGZpcnN0RXhjZXB0aW9uKSB7XG4gICAgICAgICAgICAgIHRocm93IGZpcnN0RXhjZXB0aW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub3c7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZmlyc3RUaW1lckluUmFuZ2U6IGZ1bmN0aW9uIChmcm9tLCB0bykge1xuICAgICAgICAgICAgdmFyIHRpbWVyLCBzbWFsbGVzdCA9IG51bGwsIG9yaWdpbmFsVGltZXI7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMudGltZW91dHMpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aW1lb3V0cy5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGltZW91dHNbaWRdLmNhbGxBdCA8IGZyb20gfHwgdGhpcy50aW1lb3V0c1tpZF0uY2FsbEF0ID4gdG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHNtYWxsZXN0ID09PSBudWxsIHx8IHRoaXMudGltZW91dHNbaWRdLmNhbGxBdCA8IHNtYWxsZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFRpbWVyID0gdGhpcy50aW1lb3V0c1tpZF07XG4gICAgICAgICAgICAgICAgICAgICAgICBzbWFsbGVzdCA9IHRoaXMudGltZW91dHNbaWRdLmNhbGxBdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZXIgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYzogdGhpcy50aW1lb3V0c1tpZF0uZnVuYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsQXQ6IHRoaXMudGltZW91dHNbaWRdLmNhbGxBdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnZhbDogdGhpcy50aW1lb3V0c1tpZF0uaW50ZXJ2YWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHRoaXMudGltZW91dHNbaWRdLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludm9rZUFyZ3M6IHRoaXMudGltZW91dHNbaWRdLmludm9rZUFyZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aW1lciB8fCBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIGNhbGxUaW1lcjogZnVuY3Rpb24gKHRpbWVyKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHRpbWVyLmludGVydmFsID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVvdXRzW3RpbWVyLmlkXS5jYWxsQXQgKz0gdGltZXIuaW50ZXJ2YWw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnRpbWVvdXRzW3RpbWVyLmlkXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRpbWVyLmZ1bmMgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVyLmZ1bmMuYXBwbHkobnVsbCwgdGltZXIuaW52b2tlQXJncyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXZhbCh0aW1lci5mdW5jKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIHZhciBleGNlcHRpb24gPSBlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRoaXMudGltZW91dHNbdGltZXIuaWRdKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChleGNlcHRpb24pIHtcbiAgICAgICAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dHMgPSB7fTtcbiAgICAgICAgfSxcblxuICAgICAgICBEYXRlOiAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIE5hdGl2ZURhdGUgPSBEYXRlO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBDbG9ja0RhdGUoeWVhciwgbW9udGgsIGRhdGUsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtcykge1xuICAgICAgICAgICAgICAgIC8vIERlZmVuc2l2ZSBhbmQgdmVyYm9zZSB0byBhdm9pZCBwb3RlbnRpYWwgaGFybSBpbiBwYXNzaW5nXG4gICAgICAgICAgICAgICAgLy8gZXhwbGljaXQgdW5kZWZpbmVkIHdoZW4gdXNlciBkb2VzIG5vdCBwYXNzIGFyZ3VtZW50XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoQ2xvY2tEYXRlLmNsb2NrLm5vdyk7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhcik7XG4gICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhciwgbW9udGgpO1xuICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBOYXRpdmVEYXRlKHllYXIsIG1vbnRoLCBkYXRlKTtcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgTmF0aXZlRGF0ZSh5ZWFyLCBtb250aCwgZGF0ZSwgaG91cik7XG4gICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhciwgbW9udGgsIGRhdGUsIGhvdXIsIG1pbnV0ZSk7XG4gICAgICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhciwgbW9udGgsIGRhdGUsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kKTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE5hdGl2ZURhdGUoeWVhciwgbW9udGgsIGRhdGUsIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbWlycm9yRGF0ZVByb3BlcnRpZXMoQ2xvY2tEYXRlLCBOYXRpdmVEYXRlKTtcbiAgICAgICAgfSgpKVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBtaXJyb3JEYXRlUHJvcGVydGllcyh0YXJnZXQsIHNvdXJjZSkge1xuICAgICAgICBpZiAoc291cmNlLm5vdykge1xuICAgICAgICAgICAgdGFyZ2V0Lm5vdyA9IGZ1bmN0aW9uIG5vdygpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0LmNsb2NrLm5vdztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGFyZ2V0Lm5vdztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzb3VyY2UudG9Tb3VyY2UpIHtcbiAgICAgICAgICAgIHRhcmdldC50b1NvdXJjZSA9IGZ1bmN0aW9uIHRvU291cmNlKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2UudG9Tb3VyY2UoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZWxldGUgdGFyZ2V0LnRvU291cmNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGFyZ2V0LnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlLnRvU3RyaW5nKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGFyZ2V0LnByb3RvdHlwZSA9IHNvdXJjZS5wcm90b3R5cGU7XG4gICAgICAgIHRhcmdldC5wYXJzZSA9IHNvdXJjZS5wYXJzZTtcbiAgICAgICAgdGFyZ2V0LlVUQyA9IHNvdXJjZS5VVEM7XG4gICAgICAgIHRhcmdldC5wcm90b3R5cGUudG9VVENTdHJpbmcgPSBzb3VyY2UucHJvdG90eXBlLnRvVVRDU3RyaW5nO1xuXG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG5cbiAgICB2YXIgbWV0aG9kcyA9IFtcIkRhdGVcIiwgXCJzZXRUaW1lb3V0XCIsIFwic2V0SW50ZXJ2YWxcIixcbiAgICAgICAgICAgICAgICAgICBcImNsZWFyVGltZW91dFwiLCBcImNsZWFySW50ZXJ2YWxcIl07XG5cbiAgICBpZiAodHlwZW9mIGdsb2JhbC5zZXRJbW1lZGlhdGUgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgbWV0aG9kcy5wdXNoKFwic2V0SW1tZWRpYXRlXCIpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZ2xvYmFsLmNsZWFySW1tZWRpYXRlICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIG1ldGhvZHMucHVzaChcImNsZWFySW1tZWRpYXRlXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc3RvcmUoKSB7XG4gICAgICAgIHZhciBtZXRob2Q7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLm1ldGhvZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBtZXRob2QgPSB0aGlzLm1ldGhvZHNbaV07XG5cbiAgICAgICAgICAgIGlmIChnbG9iYWxbbWV0aG9kXS5oYWRPd25Qcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIGdsb2JhbFttZXRob2RdID0gdGhpc1tcIl9cIiArIG1ldGhvZF07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBnbG9iYWxbbWV0aG9kXTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJldmVudCBtdWx0aXBsZSBleGVjdXRpb25zIHdoaWNoIHdpbGwgY29tcGxldGVseSByZW1vdmUgdGhlc2UgcHJvcHNcbiAgICAgICAgdGhpcy5tZXRob2RzID0gW107XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3R1Ykdsb2JhbChtZXRob2QsIGNsb2NrKSB7XG4gICAgICAgIGNsb2NrW21ldGhvZF0uaGFkT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZ2xvYmFsLCBtZXRob2QpO1xuICAgICAgICBjbG9ja1tcIl9cIiArIG1ldGhvZF0gPSBnbG9iYWxbbWV0aG9kXTtcblxuICAgICAgICBpZiAobWV0aG9kID09IFwiRGF0ZVwiKSB7XG4gICAgICAgICAgICB2YXIgZGF0ZSA9IG1pcnJvckRhdGVQcm9wZXJ0aWVzKGNsb2NrW21ldGhvZF0sIGdsb2JhbFttZXRob2RdKTtcbiAgICAgICAgICAgIGdsb2JhbFttZXRob2RdID0gZGF0ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGdsb2JhbFttZXRob2RdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjbG9ja1ttZXRob2RdLmFwcGx5KGNsb2NrLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBjbG9ja1ttZXRob2RdKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNsb2NrW21ldGhvZF0uaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsW21ldGhvZF1bcHJvcF0gPSBjbG9ja1ttZXRob2RdW3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGdsb2JhbFttZXRob2RdLmNsb2NrID0gY2xvY2s7XG4gICAgfVxuXG4gICAgc2lub24udXNlRmFrZVRpbWVycyA9IGZ1bmN0aW9uIHVzZUZha2VUaW1lcnMobm93KSB7XG4gICAgICAgIHZhciBjbG9jayA9IHNpbm9uLmNsb2NrLmNyZWF0ZShub3cpO1xuICAgICAgICBjbG9jay5yZXN0b3JlID0gcmVzdG9yZTtcbiAgICAgICAgY2xvY2subWV0aG9kcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiBub3cgPT0gXCJudW1iZXJcIiA/IDEgOiAwKTtcblxuICAgICAgICBpZiAoY2xvY2subWV0aG9kcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNsb2NrLm1ldGhvZHMgPSBtZXRob2RzO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjbG9jay5tZXRob2RzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgc3R1Ykdsb2JhbChjbG9jay5tZXRob2RzW2ldLCBjbG9jayk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2xvY2s7XG4gICAgfTtcbn0odHlwZW9mIGdsb2JhbCAhPSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBnbG9iYWwgIT09IFwiZnVuY3Rpb25cIiA/IGdsb2JhbCA6IHRoaXMpKTtcblxuc2lub24udGltZXJzID0ge1xuICAgIHNldFRpbWVvdXQ6IHNldFRpbWVvdXQsXG4gICAgY2xlYXJUaW1lb3V0OiBjbGVhclRpbWVvdXQsXG4gICAgc2V0SW1tZWRpYXRlOiAodHlwZW9mIHNldEltbWVkaWF0ZSAhPT0gXCJ1bmRlZmluZWRcIiA/IHNldEltbWVkaWF0ZSA6IHVuZGVmaW5lZCksXG4gICAgY2xlYXJJbW1lZGlhdGU6ICh0eXBlb2YgY2xlYXJJbW1lZGlhdGUgIT09IFwidW5kZWZpbmVkXCIgPyBjbGVhckltbWVkaWF0ZTogdW5kZWZpbmVkKSxcbiAgICBzZXRJbnRlcnZhbDogc2V0SW50ZXJ2YWwsXG4gICAgY2xlYXJJbnRlcnZhbDogY2xlYXJJbnRlcnZhbCxcbiAgICBEYXRlOiBEYXRlXG59O1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNpbm9uO1xufVxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7KCh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCAmJiBmdW5jdGlvbiAobSkge1xuICAgIGRlZmluZShcImZvcm1hdGlvXCIsIFtcInNhbXNhbVwiXSwgbSk7XG59KSB8fCAodHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiBmdW5jdGlvbiAobSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gbShyZXF1aXJlKFwic2Ftc2FtXCIpKTtcbn0pIHx8IGZ1bmN0aW9uIChtKSB7IHRoaXMuZm9ybWF0aW8gPSBtKHRoaXMuc2Ftc2FtKTsgfVxuKShmdW5jdGlvbiAoc2Ftc2FtKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgZm9ybWF0aW8gPSB7XG4gICAgICAgIGV4Y2x1ZGVDb25zdHJ1Y3RvcnM6IFtcIk9iamVjdFwiLCAvXi4kL10sXG4gICAgICAgIHF1b3RlU3RyaW5nczogdHJ1ZVxuICAgIH07XG5cbiAgICB2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuICAgIHZhciBzcGVjaWFsT2JqZWN0cyA9IFtdO1xuICAgIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHNwZWNpYWxPYmplY3RzLnB1c2goeyBvYmplY3Q6IGdsb2JhbCwgdmFsdWU6IFwiW29iamVjdCBnbG9iYWxdXCIgfSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgc3BlY2lhbE9iamVjdHMucHVzaCh7XG4gICAgICAgICAgICBvYmplY3Q6IGRvY3VtZW50LFxuICAgICAgICAgICAgdmFsdWU6IFwiW29iamVjdCBIVE1MRG9jdW1lbnRdXCJcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHNwZWNpYWxPYmplY3RzLnB1c2goeyBvYmplY3Q6IHdpbmRvdywgdmFsdWU6IFwiW29iamVjdCBXaW5kb3ddXCIgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZnVuY3Rpb25OYW1lKGZ1bmMpIHtcbiAgICAgICAgaWYgKCFmdW5jKSB7IHJldHVybiBcIlwiOyB9XG4gICAgICAgIGlmIChmdW5jLmRpc3BsYXlOYW1lKSB7IHJldHVybiBmdW5jLmRpc3BsYXlOYW1lOyB9XG4gICAgICAgIGlmIChmdW5jLm5hbWUpIHsgcmV0dXJuIGZ1bmMubmFtZTsgfVxuICAgICAgICB2YXIgbWF0Y2hlcyA9IGZ1bmMudG9TdHJpbmcoKS5tYXRjaCgvZnVuY3Rpb25cXHMrKFteXFwoXSspL20pO1xuICAgICAgICByZXR1cm4gKG1hdGNoZXMgJiYgbWF0Y2hlc1sxXSkgfHwgXCJcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25zdHJ1Y3Rvck5hbWUoZiwgb2JqZWN0KSB7XG4gICAgICAgIHZhciBuYW1lID0gZnVuY3Rpb25OYW1lKG9iamVjdCAmJiBvYmplY3QuY29uc3RydWN0b3IpO1xuICAgICAgICB2YXIgZXhjbHVkZXMgPSBmLmV4Y2x1ZGVDb25zdHJ1Y3RvcnMgfHxcbiAgICAgICAgICAgICAgICBmb3JtYXRpby5leGNsdWRlQ29uc3RydWN0b3JzIHx8IFtdO1xuXG4gICAgICAgIHZhciBpLCBsO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gZXhjbHVkZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4Y2x1ZGVzW2ldID09PSBcInN0cmluZ1wiICYmIGV4Y2x1ZGVzW2ldID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV4Y2x1ZGVzW2ldLnRlc3QgJiYgZXhjbHVkZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5hbWU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNDaXJjdWxhcihvYmplY3QsIG9iamVjdHMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QgIT09IFwib2JqZWN0XCIpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgIHZhciBpLCBsO1xuICAgICAgICBmb3IgKGkgPSAwLCBsID0gb2JqZWN0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3RzW2ldID09PSBvYmplY3QpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXNjaWkoZiwgb2JqZWN0LCBwcm9jZXNzZWQsIGluZGVudCkge1xuICAgICAgICBpZiAodHlwZW9mIG9iamVjdCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdmFyIHFzID0gZi5xdW90ZVN0cmluZ3M7XG4gICAgICAgICAgICB2YXIgcXVvdGUgPSB0eXBlb2YgcXMgIT09IFwiYm9vbGVhblwiIHx8IHFzO1xuICAgICAgICAgICAgcmV0dXJuIHByb2Nlc3NlZCB8fCBxdW90ZSA/ICdcIicgKyBvYmplY3QgKyAnXCInIDogb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QgPT09IFwiZnVuY3Rpb25cIiAmJiAhKG9iamVjdCBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICAgICAgICAgIHJldHVybiBhc2NpaS5mdW5jKG9iamVjdCk7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9jZXNzZWQgPSBwcm9jZXNzZWQgfHwgW107XG5cbiAgICAgICAgaWYgKGlzQ2lyY3VsYXIob2JqZWN0LCBwcm9jZXNzZWQpKSB7IHJldHVybiBcIltDaXJjdWxhcl1cIjsgfVxuXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gYXNjaWkuYXJyYXkuY2FsbChmLCBvYmplY3QsIHByb2Nlc3NlZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9iamVjdCkgeyByZXR1cm4gU3RyaW5nKCgxL29iamVjdCkgPT09IC1JbmZpbml0eSA/IFwiLTBcIiA6IG9iamVjdCk7IH1cbiAgICAgICAgaWYgKHNhbXNhbS5pc0VsZW1lbnQob2JqZWN0KSkgeyByZXR1cm4gYXNjaWkuZWxlbWVudChvYmplY3QpOyB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QudG9TdHJpbmcgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgICAgICAgICAgICAgIG9iamVjdC50b1N0cmluZyAhPT0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdC50b1N0cmluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGksIGw7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBzcGVjaWFsT2JqZWN0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgPT09IHNwZWNpYWxPYmplY3RzW2ldLm9iamVjdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzcGVjaWFsT2JqZWN0c1tpXS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhc2NpaS5vYmplY3QuY2FsbChmLCBvYmplY3QsIHByb2Nlc3NlZCwgaW5kZW50KTtcbiAgICB9XG5cbiAgICBhc2NpaS5mdW5jID0gZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgcmV0dXJuIFwiZnVuY3Rpb24gXCIgKyBmdW5jdGlvbk5hbWUoZnVuYykgKyBcIigpIHt9XCI7XG4gICAgfTtcblxuICAgIGFzY2lpLmFycmF5ID0gZnVuY3Rpb24gKGFycmF5LCBwcm9jZXNzZWQpIHtcbiAgICAgICAgcHJvY2Vzc2VkID0gcHJvY2Vzc2VkIHx8IFtdO1xuICAgICAgICBwcm9jZXNzZWQucHVzaChhcnJheSk7XG4gICAgICAgIHZhciBpLCBsLCBwaWVjZXMgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IGFycmF5Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgcGllY2VzLnB1c2goYXNjaWkodGhpcywgYXJyYXlbaV0sIHByb2Nlc3NlZCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIltcIiArIHBpZWNlcy5qb2luKFwiLCBcIikgKyBcIl1cIjtcbiAgICB9O1xuXG4gICAgYXNjaWkub2JqZWN0ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvY2Vzc2VkLCBpbmRlbnQpIHtcbiAgICAgICAgcHJvY2Vzc2VkID0gcHJvY2Vzc2VkIHx8IFtdO1xuICAgICAgICBwcm9jZXNzZWQucHVzaChvYmplY3QpO1xuICAgICAgICBpbmRlbnQgPSBpbmRlbnQgfHwgMDtcbiAgICAgICAgdmFyIHBpZWNlcyA9IFtdLCBwcm9wZXJ0aWVzID0gc2Ftc2FtLmtleXMob2JqZWN0KS5zb3J0KCk7XG4gICAgICAgIHZhciBsZW5ndGggPSAzO1xuICAgICAgICB2YXIgcHJvcCwgc3RyLCBvYmosIGksIGw7XG5cbiAgICAgICAgZm9yIChpID0gMCwgbCA9IHByb3BlcnRpZXMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBwcm9wID0gcHJvcGVydGllc1tpXTtcbiAgICAgICAgICAgIG9iaiA9IG9iamVjdFtwcm9wXTtcblxuICAgICAgICAgICAgaWYgKGlzQ2lyY3VsYXIob2JqLCBwcm9jZXNzZWQpKSB7XG4gICAgICAgICAgICAgICAgc3RyID0gXCJbQ2lyY3VsYXJdXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0ciA9IGFzY2lpKHRoaXMsIG9iaiwgcHJvY2Vzc2VkLCBpbmRlbnQgKyAyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RyID0gKC9cXHMvLnRlc3QocHJvcCkgPyAnXCInICsgcHJvcCArICdcIicgOiBwcm9wKSArIFwiOiBcIiArIHN0cjtcbiAgICAgICAgICAgIGxlbmd0aCArPSBzdHIubGVuZ3RoO1xuICAgICAgICAgICAgcGllY2VzLnB1c2goc3RyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBjb25zID0gY29uc3RydWN0b3JOYW1lKHRoaXMsIG9iamVjdCk7XG4gICAgICAgIHZhciBwcmVmaXggPSBjb25zID8gXCJbXCIgKyBjb25zICsgXCJdIFwiIDogXCJcIjtcbiAgICAgICAgdmFyIGlzID0gXCJcIjtcbiAgICAgICAgZm9yIChpID0gMCwgbCA9IGluZGVudDsgaSA8IGw7ICsraSkgeyBpcyArPSBcIiBcIjsgfVxuXG4gICAgICAgIGlmIChsZW5ndGggKyBpbmRlbnQgPiA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIHByZWZpeCArIFwie1xcbiAgXCIgKyBpcyArIHBpZWNlcy5qb2luKFwiLFxcbiAgXCIgKyBpcykgKyBcIlxcblwiICtcbiAgICAgICAgICAgICAgICBpcyArIFwifVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmVmaXggKyBcInsgXCIgKyBwaWVjZXMuam9pbihcIiwgXCIpICsgXCIgfVwiO1xuICAgIH07XG5cbiAgICBhc2NpaS5lbGVtZW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHRhZ05hbWUgPSBlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgdmFyIGF0dHJzID0gZWxlbWVudC5hdHRyaWJ1dGVzLCBhdHRyLCBwYWlycyA9IFtdLCBhdHRyTmFtZSwgaSwgbCwgdmFsO1xuXG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIGF0dHIgPSBhdHRycy5pdGVtKGkpO1xuICAgICAgICAgICAgYXR0ck5hbWUgPSBhdHRyLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkucmVwbGFjZShcImh0bWw6XCIsIFwiXCIpO1xuICAgICAgICAgICAgdmFsID0gYXR0ci5ub2RlVmFsdWU7XG4gICAgICAgICAgICBpZiAoYXR0ck5hbWUgIT09IFwiY29udGVudGVkaXRhYmxlXCIgfHwgdmFsICE9PSBcImluaGVyaXRcIikge1xuICAgICAgICAgICAgICAgIGlmICghIXZhbCkgeyBwYWlycy5wdXNoKGF0dHJOYW1lICsgXCI9XFxcIlwiICsgdmFsICsgXCJcXFwiXCIpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZm9ybWF0dGVkID0gXCI8XCIgKyB0YWdOYW1lICsgKHBhaXJzLmxlbmd0aCA+IDAgPyBcIiBcIiA6IFwiXCIpO1xuICAgICAgICB2YXIgY29udGVudCA9IGVsZW1lbnQuaW5uZXJIVE1MO1xuXG4gICAgICAgIGlmIChjb250ZW50Lmxlbmd0aCA+IDIwKSB7XG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5zdWJzdHIoMCwgMjApICsgXCJbLi4uXVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlcyA9IGZvcm1hdHRlZCArIHBhaXJzLmpvaW4oXCIgXCIpICsgXCI+XCIgKyBjb250ZW50ICtcbiAgICAgICAgICAgICAgICBcIjwvXCIgKyB0YWdOYW1lICsgXCI+XCI7XG5cbiAgICAgICAgcmV0dXJuIHJlcy5yZXBsYWNlKC8gY29udGVudEVkaXRhYmxlPVwiaW5oZXJpdFwiLywgXCJcIik7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIEZvcm1hdGlvKG9wdGlvbnMpIHtcbiAgICAgICAgZm9yICh2YXIgb3B0IGluIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHRoaXNbb3B0XSA9IG9wdGlvbnNbb3B0XTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEZvcm1hdGlvLnByb3RvdHlwZSA9IHtcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBmdW5jdGlvbk5hbWUsXG5cbiAgICAgICAgY29uZmlndXJlOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBGb3JtYXRpbyhvcHRpb25zKTtcbiAgICAgICAgfSxcblxuICAgICAgICBjb25zdHJ1Y3Rvck5hbWU6IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgICAgIHJldHVybiBjb25zdHJ1Y3Rvck5hbWUodGhpcywgb2JqZWN0KTtcbiAgICAgICAgfSxcblxuICAgICAgICBhc2NpaTogZnVuY3Rpb24gKG9iamVjdCwgcHJvY2Vzc2VkLCBpbmRlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBhc2NpaSh0aGlzLCBvYmplY3QsIHByb2Nlc3NlZCwgaW5kZW50KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gRm9ybWF0aW8ucHJvdG90eXBlO1xufSk7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIigodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQgJiYgZnVuY3Rpb24gKG0pIHsgZGVmaW5lKFwic2Ftc2FtXCIsIG0pOyB9KSB8fFxuICh0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiICYmXG4gICAgICBmdW5jdGlvbiAobSkgeyBtb2R1bGUuZXhwb3J0cyA9IG0oKTsgfSkgfHwgLy8gTm9kZVxuIGZ1bmN0aW9uIChtKSB7IHRoaXMuc2Ftc2FtID0gbSgpOyB9IC8vIEJyb3dzZXIgZ2xvYmFsc1xuKShmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG8gPSBPYmplY3QucHJvdG90eXBlO1xuICAgIHZhciBkaXYgPSB0eXBlb2YgZG9jdW1lbnQgIT09IFwidW5kZWZpbmVkXCIgJiYgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblxuICAgIGZ1bmN0aW9uIGlzTmFOKHZhbHVlKSB7XG4gICAgICAgIC8vIFVubGlrZSBnbG9iYWwgaXNOYU4sIHRoaXMgYXZvaWRzIHR5cGUgY29lcmNpb25cbiAgICAgICAgLy8gdHlwZW9mIGNoZWNrIGF2b2lkcyBJRSBob3N0IG9iamVjdCBpc3N1ZXMsIGhhdCB0aXAgdG9cbiAgICAgICAgLy8gbG9kYXNoXG4gICAgICAgIHZhciB2YWwgPSB2YWx1ZTsgLy8gSnNMaW50IHRoaW5rcyB2YWx1ZSAhPT0gdmFsdWUgaXMgXCJ3ZWlyZFwiXG4gICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgdmFsdWUgIT09IHZhbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDbGFzcyh2YWx1ZSkge1xuICAgICAgICAvLyBSZXR1cm5zIHRoZSBpbnRlcm5hbCBbW0NsYXNzXV0gYnkgY2FsbGluZyBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG4gICAgICAgIC8vIHdpdGggdGhlIHByb3ZpZGVkIHZhbHVlIGFzIHRoaXMuIFJldHVybiB2YWx1ZSBpcyBhIHN0cmluZywgbmFtaW5nIHRoZVxuICAgICAgICAvLyBpbnRlcm5hbCBjbGFzcywgZS5nLiBcIkFycmF5XCJcbiAgICAgICAgcmV0dXJuIG8udG9TdHJpbmcuY2FsbCh2YWx1ZSkuc3BsaXQoL1sgXFxdXS8pWzFdO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHNhbXNhbS5pc0FyZ3VtZW50c1xuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqZWN0XG4gICAgICpcbiAgICAgKiBSZXR1cm5zIGBgdHJ1ZWBgIGlmIGBgb2JqZWN0YGAgaXMgYW4gYGBhcmd1bWVudHNgYCBvYmplY3QsXG4gICAgICogYGBmYWxzZWBgIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc0FyZ3VtZW50cyhvYmplY3QpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QgIT09IFwib2JqZWN0XCIgfHwgdHlwZW9mIG9iamVjdC5sZW5ndGggIT09IFwibnVtYmVyXCIgfHxcbiAgICAgICAgICAgICAgICBnZXRDbGFzcyhvYmplY3QpID09PSBcIkFycmF5XCIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5jYWxsZWUgPT0gXCJmdW5jdGlvblwiKSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBvYmplY3Rbb2JqZWN0Lmxlbmd0aF0gPSA2O1xuICAgICAgICAgICAgZGVsZXRlIG9iamVjdFtvYmplY3QubGVuZ3RoXTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHNhbXNhbS5pc0VsZW1lbnRcbiAgICAgKiBAcGFyYW0gT2JqZWN0IG9iamVjdFxuICAgICAqXG4gICAgICogUmV0dXJucyBgYHRydWVgYCBpZiBgYG9iamVjdGBgIGlzIGEgRE9NIGVsZW1lbnQgbm9kZS4gVW5saWtlXG4gICAgICogVW5kZXJzY29yZS5qcy9sb2Rhc2gsIHRoaXMgZnVuY3Rpb24gd2lsbCByZXR1cm4gYGBmYWxzZWBgIGlmIGBgb2JqZWN0YGBcbiAgICAgKiBpcyBhbiAqZWxlbWVudC1saWtlKiBvYmplY3QsIGkuZS4gYSByZWd1bGFyIG9iamVjdCB3aXRoIGEgYGBub2RlVHlwZWBgXG4gICAgICogcHJvcGVydHkgdGhhdCBob2xkcyB0aGUgdmFsdWUgYGAxYGAuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNFbGVtZW50KG9iamVjdCkge1xuICAgICAgICBpZiAoIW9iamVjdCB8fCBvYmplY3Qubm9kZVR5cGUgIT09IDEgfHwgIWRpdikgeyByZXR1cm4gZmFsc2U7IH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG9iamVjdC5hcHBlbmRDaGlsZChkaXYpO1xuICAgICAgICAgICAgb2JqZWN0LnJlbW92ZUNoaWxkKGRpdik7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBzYW1zYW0ua2V5c1xuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqZWN0XG4gICAgICpcbiAgICAgKiBSZXR1cm4gYW4gYXJyYXkgb2Ygb3duIHByb3BlcnR5IG5hbWVzLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG4gICAgICAgIHZhciBrcyA9IFtdLCBwcm9wO1xuICAgICAgICBmb3IgKHByb3AgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAoby5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcCkpIHsga3MucHVzaChwcm9wKTsgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBrcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBzYW1zYW0uaXNEYXRlXG4gICAgICogQHBhcmFtIE9iamVjdCB2YWx1ZVxuICAgICAqXG4gICAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBvYmplY3QgaXMgYSBgYERhdGVgYCwgb3IgKmRhdGUtbGlrZSouIER1Y2sgdHlwaW5nXG4gICAgICogb2YgZGF0ZSBvYmplY3RzIHdvcmsgYnkgY2hlY2tpbmcgdGhhdCB0aGUgb2JqZWN0IGhhcyBhIGBgZ2V0VGltZWBgXG4gICAgICogZnVuY3Rpb24gd2hvc2UgcmV0dXJuIHZhbHVlIGVxdWFscyB0aGUgcmV0dXJuIHZhbHVlIGZyb20gdGhlIG9iamVjdCdzXG4gICAgICogYGB2YWx1ZU9mYGAuXG4gICAgICovXG4gICAgZnVuY3Rpb24gaXNEYXRlKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUuZ2V0VGltZSA9PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgIHZhbHVlLmdldFRpbWUoKSA9PSB2YWx1ZS52YWx1ZU9mKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgc2Ftc2FtLmlzTmVnWmVyb1xuICAgICAqIEBwYXJhbSBPYmplY3QgdmFsdWVcbiAgICAgKlxuICAgICAqIFJldHVybnMgYGB0cnVlYGAgaWYgYGB2YWx1ZWBgIGlzIGBgLTBgYC5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpc05lZ1plcm8odmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA9PT0gLUluZmluaXR5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHNhbXNhbS5lcXVhbFxuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqMVxuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqMlxuICAgICAqXG4gICAgICogUmV0dXJucyBgYHRydWVgYCBpZiB0d28gb2JqZWN0cyBhcmUgc3RyaWN0bHkgZXF1YWwuIENvbXBhcmVkIHRvXG4gICAgICogYGA9PT1gYCB0aGVyZSBhcmUgdHdvIGV4Y2VwdGlvbnM6XG4gICAgICpcbiAgICAgKiAgIC0gTmFOIGlzIGNvbnNpZGVyZWQgZXF1YWwgdG8gTmFOXG4gICAgICogICAtIC0wIGFuZCArMCBhcmUgbm90IGNvbnNpZGVyZWQgZXF1YWxcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBpZGVudGljYWwob2JqMSwgb2JqMikge1xuICAgICAgICBpZiAob2JqMSA9PT0gb2JqMiB8fCAoaXNOYU4ob2JqMSkgJiYgaXNOYU4ob2JqMikpKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqMSAhPT0gMCB8fCBpc05lZ1plcm8ob2JqMSkgPT09IGlzTmVnWmVybyhvYmoyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgc2Ftc2FtLmRlZXBFcXVhbFxuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqMVxuICAgICAqIEBwYXJhbSBPYmplY3Qgb2JqMlxuICAgICAqXG4gICAgICogRGVlcCBlcXVhbCBjb21wYXJpc29uLiBUd28gdmFsdWVzIGFyZSBcImRlZXAgZXF1YWxcIiBpZjpcbiAgICAgKlxuICAgICAqICAgLSBUaGV5IGFyZSBlcXVhbCwgYWNjb3JkaW5nIHRvIHNhbXNhbS5pZGVudGljYWxcbiAgICAgKiAgIC0gVGhleSBhcmUgYm90aCBkYXRlIG9iamVjdHMgcmVwcmVzZW50aW5nIHRoZSBzYW1lIHRpbWVcbiAgICAgKiAgIC0gVGhleSBhcmUgYm90aCBhcnJheXMgY29udGFpbmluZyBlbGVtZW50cyB0aGF0IGFyZSBhbGwgZGVlcEVxdWFsXG4gICAgICogICAtIFRoZXkgYXJlIG9iamVjdHMgd2l0aCB0aGUgc2FtZSBzZXQgb2YgcHJvcGVydGllcywgYW5kIGVhY2ggcHJvcGVydHlcbiAgICAgKiAgICAgaW4gYGBvYmoxYGAgaXMgZGVlcEVxdWFsIHRvIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnR5IGluIGBgb2JqMmBgXG4gICAgICpcbiAgICAgKiBTdXBwb3J0cyBjeWNsaWMgb2JqZWN0cy5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkZWVwRXF1YWxDeWNsaWMob2JqMSwgb2JqMikge1xuXG4gICAgICAgIC8vIHVzZWQgZm9yIGN5Y2xpYyBjb21wYXJpc29uXG4gICAgICAgIC8vIGNvbnRhaW4gYWxyZWFkeSB2aXNpdGVkIG9iamVjdHNcbiAgICAgICAgdmFyIG9iamVjdHMxID0gW10sXG4gICAgICAgICAgICBvYmplY3RzMiA9IFtdLFxuICAgICAgICAvLyBjb250YWluIHBhdGhlcyAocG9zaXRpb24gaW4gdGhlIG9iamVjdCBzdHJ1Y3R1cmUpXG4gICAgICAgIC8vIG9mIHRoZSBhbHJlYWR5IHZpc2l0ZWQgb2JqZWN0c1xuICAgICAgICAvLyBpbmRleGVzIHNhbWUgYXMgaW4gb2JqZWN0cyBhcnJheXNcbiAgICAgICAgICAgIHBhdGhzMSA9IFtdLFxuICAgICAgICAgICAgcGF0aHMyID0gW10sXG4gICAgICAgIC8vIGNvbnRhaW5zIGNvbWJpbmF0aW9ucyBvZiBhbHJlYWR5IGNvbXBhcmVkIG9iamVjdHNcbiAgICAgICAgLy8gaW4gdGhlIG1hbm5lcjogeyBcIiQxWydyZWYnXSQyWydyZWYnXVwiOiB0cnVlIH1cbiAgICAgICAgICAgIGNvbXBhcmVkID0ge307XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHVzZWQgdG8gY2hlY2ssIGlmIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGlzIGFuIG9iamVjdFxuICAgICAgICAgKiAoY3ljbGljIGxvZ2ljIGlzIG9ubHkgbmVlZGVkIGZvciBvYmplY3RzKVxuICAgICAgICAgKiBvbmx5IG5lZWRlZCBmb3IgY3ljbGljIGxvZ2ljXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgICAgICAhKHZhbHVlIGluc3RhbmNlb2YgQm9vbGVhbikgJiZcbiAgICAgICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpICAgICYmXG4gICAgICAgICAgICAgICAgICAgICEodmFsdWUgaW5zdGFuY2VvZiBOdW1iZXIpICAmJlxuICAgICAgICAgICAgICAgICAgICAhKHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSAgJiZcbiAgICAgICAgICAgICAgICAgICAgISh2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZykpIHtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogcmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGdpdmVuIG9iamVjdCBpbiB0aGVcbiAgICAgICAgICogZ2l2ZW4gb2JqZWN0cyBhcnJheSwgLTEgaWYgbm90IGNvbnRhaW5lZFxuICAgICAgICAgKiBvbmx5IG5lZWRlZCBmb3IgY3ljbGljIGxvZ2ljXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBnZXRJbmRleChvYmplY3RzLCBvYmopIHtcblxuICAgICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgb2JqZWN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3RzW2ldID09PSBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkb2VzIHRoZSByZWN1cnNpb24gZm9yIHRoZSBkZWVwIGVxdWFsIGNoZWNrXG4gICAgICAgIHJldHVybiAoZnVuY3Rpb24gZGVlcEVxdWFsKG9iajEsIG9iajIsIHBhdGgxLCBwYXRoMikge1xuICAgICAgICAgICAgdmFyIHR5cGUxID0gdHlwZW9mIG9iajE7XG4gICAgICAgICAgICB2YXIgdHlwZTIgPSB0eXBlb2Ygb2JqMjtcblxuICAgICAgICAgICAgLy8gPT0gbnVsbCBhbHNvIG1hdGNoZXMgdW5kZWZpbmVkXG4gICAgICAgICAgICBpZiAob2JqMSA9PT0gb2JqMiB8fFxuICAgICAgICAgICAgICAgICAgICBpc05hTihvYmoxKSB8fCBpc05hTihvYmoyKSB8fFxuICAgICAgICAgICAgICAgICAgICBvYmoxID09IG51bGwgfHwgb2JqMiA9PSBudWxsIHx8XG4gICAgICAgICAgICAgICAgICAgIHR5cGUxICE9PSBcIm9iamVjdFwiIHx8IHR5cGUyICE9PSBcIm9iamVjdFwiKSB7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaWRlbnRpY2FsKG9iajEsIG9iajIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFbGVtZW50cyBhcmUgb25seSBlcXVhbCBpZiBpZGVudGljYWwoZXhwZWN0ZWQsIGFjdHVhbClcbiAgICAgICAgICAgIGlmIChpc0VsZW1lbnQob2JqMSkgfHwgaXNFbGVtZW50KG9iajIpKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgICB2YXIgaXNEYXRlMSA9IGlzRGF0ZShvYmoxKSwgaXNEYXRlMiA9IGlzRGF0ZShvYmoyKTtcbiAgICAgICAgICAgIGlmIChpc0RhdGUxIHx8IGlzRGF0ZTIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGF0ZTEgfHwgIWlzRGF0ZTIgfHwgb2JqMS5nZXRUaW1lKCkgIT09IG9iajIuZ2V0VGltZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChvYmoxIGluc3RhbmNlb2YgUmVnRXhwICYmIG9iajIgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqMS50b1N0cmluZygpICE9PSBvYmoyLnRvU3RyaW5nKCkpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBjbGFzczEgPSBnZXRDbGFzcyhvYmoxKTtcbiAgICAgICAgICAgIHZhciBjbGFzczIgPSBnZXRDbGFzcyhvYmoyKTtcbiAgICAgICAgICAgIHZhciBrZXlzMSA9IGtleXMob2JqMSk7XG4gICAgICAgICAgICB2YXIga2V5czIgPSBrZXlzKG9iajIpO1xuXG4gICAgICAgICAgICBpZiAoaXNBcmd1bWVudHMob2JqMSkgfHwgaXNBcmd1bWVudHMob2JqMikpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqMS5sZW5ndGggIT09IG9iajIubGVuZ3RoKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZTEgIT09IHR5cGUyIHx8IGNsYXNzMSAhPT0gY2xhc3MyIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzMS5sZW5ndGggIT09IGtleXMyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIga2V5LCBpLCBsLFxuICAgICAgICAgICAgICAgIC8vIGZvbGxvd2luZyB2YXJzIGFyZSB1c2VkIGZvciB0aGUgY3ljbGljIGxvZ2ljXG4gICAgICAgICAgICAgICAgdmFsdWUxLCB2YWx1ZTIsXG4gICAgICAgICAgICAgICAgaXNPYmplY3QxLCBpc09iamVjdDIsXG4gICAgICAgICAgICAgICAgaW5kZXgxLCBpbmRleDIsXG4gICAgICAgICAgICAgICAgbmV3UGF0aDEsIG5ld1BhdGgyO1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBsID0ga2V5czEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAga2V5ID0ga2V5czFbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFvLmhhc093blByb3BlcnR5LmNhbGwob2JqMiwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU3RhcnQgb2YgdGhlIGN5Y2xpYyBsb2dpY1xuXG4gICAgICAgICAgICAgICAgdmFsdWUxID0gb2JqMVtrZXldO1xuICAgICAgICAgICAgICAgIHZhbHVlMiA9IG9iajJba2V5XTtcblxuICAgICAgICAgICAgICAgIGlzT2JqZWN0MSA9IGlzT2JqZWN0KHZhbHVlMSk7XG4gICAgICAgICAgICAgICAgaXNPYmplY3QyID0gaXNPYmplY3QodmFsdWUyKTtcblxuICAgICAgICAgICAgICAgIC8vIGRldGVybWluZSwgaWYgdGhlIG9iamVjdHMgd2VyZSBhbHJlYWR5IHZpc2l0ZWRcbiAgICAgICAgICAgICAgICAvLyAoaXQncyBmYXN0ZXIgdG8gY2hlY2sgZm9yIGlzT2JqZWN0IGZpcnN0LCB0aGFuIHRvXG4gICAgICAgICAgICAgICAgLy8gZ2V0IC0xIGZyb20gZ2V0SW5kZXggZm9yIG5vbiBvYmplY3RzKVxuICAgICAgICAgICAgICAgIGluZGV4MSA9IGlzT2JqZWN0MSA/IGdldEluZGV4KG9iamVjdHMxLCB2YWx1ZTEpIDogLTE7XG4gICAgICAgICAgICAgICAgaW5kZXgyID0gaXNPYmplY3QyID8gZ2V0SW5kZXgob2JqZWN0czIsIHZhbHVlMikgOiAtMTtcblxuICAgICAgICAgICAgICAgIC8vIGRldGVybWluZSB0aGUgbmV3IHBhdGhlcyBvZiB0aGUgb2JqZWN0c1xuICAgICAgICAgICAgICAgIC8vIC0gZm9yIG5vbiBjeWNsaWMgb2JqZWN0cyB0aGUgY3VycmVudCBwYXRoIHdpbGwgYmUgZXh0ZW5kZWRcbiAgICAgICAgICAgICAgICAvLyAgIGJ5IGN1cnJlbnQgcHJvcGVydHkgbmFtZVxuICAgICAgICAgICAgICAgIC8vIC0gZm9yIGN5Y2xpYyBvYmplY3RzIHRoZSBzdG9yZWQgcGF0aCBpcyB0YWtlblxuICAgICAgICAgICAgICAgIG5ld1BhdGgxID0gaW5kZXgxICE9PSAtMVxuICAgICAgICAgICAgICAgICAgICA/IHBhdGhzMVtpbmRleDFdXG4gICAgICAgICAgICAgICAgICAgIDogcGF0aDEgKyAnWycgKyBKU09OLnN0cmluZ2lmeShrZXkpICsgJ10nO1xuICAgICAgICAgICAgICAgIG5ld1BhdGgyID0gaW5kZXgyICE9PSAtMVxuICAgICAgICAgICAgICAgICAgICA/IHBhdGhzMltpbmRleDJdXG4gICAgICAgICAgICAgICAgICAgIDogcGF0aDIgKyAnWycgKyBKU09OLnN0cmluZ2lmeShrZXkpICsgJ10nO1xuXG4gICAgICAgICAgICAgICAgLy8gc3RvcCByZWN1cnNpb24gaWYgY3VycmVudCBvYmplY3RzIGFyZSBhbHJlYWR5IGNvbXBhcmVkXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBhcmVkW25ld1BhdGgxICsgbmV3UGF0aDJdKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIHRoZSBjdXJyZW50IG9iamVjdHMgYW5kIHRoZWlyIHBhdGhlc1xuICAgICAgICAgICAgICAgIGlmIChpbmRleDEgPT09IC0xICYmIGlzT2JqZWN0MSkge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3RzMS5wdXNoKHZhbHVlMSk7XG4gICAgICAgICAgICAgICAgICAgIHBhdGhzMS5wdXNoKG5ld1BhdGgxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4MiA9PT0gLTEgJiYgaXNPYmplY3QyKSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdHMyLnB1c2godmFsdWUyKTtcbiAgICAgICAgICAgICAgICAgICAgcGF0aHMyLnB1c2gobmV3UGF0aDIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIHJlbWVtYmVyIHRoYXQgdGhlIGN1cnJlbnQgb2JqZWN0cyBhcmUgYWxyZWFkeSBjb21wYXJlZFxuICAgICAgICAgICAgICAgIGlmIChpc09iamVjdDEgJiYgaXNPYmplY3QyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBhcmVkW25ld1BhdGgxICsgbmV3UGF0aDJdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBFbmQgb2YgY3ljbGljIGxvZ2ljXG5cbiAgICAgICAgICAgICAgICAvLyBuZWl0aGVyIHZhbHVlMSBub3IgdmFsdWUyIGlzIGEgY3ljbGVcbiAgICAgICAgICAgICAgICAvLyBjb250aW51ZSB3aXRoIG5leHQgbGV2ZWxcbiAgICAgICAgICAgICAgICBpZiAoIWRlZXBFcXVhbCh2YWx1ZTEsIHZhbHVlMiwgbmV3UGF0aDEsIG5ld1BhdGgyKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICB9KG9iajEsIG9iajIsICckMScsICckMicpKTtcbiAgICB9XG5cbiAgICB2YXIgbWF0Y2g7XG5cbiAgICBmdW5jdGlvbiBhcnJheUNvbnRhaW5zKGFycmF5LCBzdWJzZXQpIHtcbiAgICAgICAgaWYgKHN1YnNldC5sZW5ndGggPT09IDApIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgdmFyIGksIGwsIGosIGs7XG4gICAgICAgIGZvciAoaSA9IDAsIGwgPSBhcnJheS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaChhcnJheVtpXSwgc3Vic2V0WzBdKSkge1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDAsIGsgPSBzdWJzZXQubGVuZ3RoOyBqIDwgazsgKytqKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbWF0Y2goYXJyYXlbaSArIGpdLCBzdWJzZXRbal0pKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgc2Ftc2FtLm1hdGNoXG4gICAgICogQHBhcmFtIE9iamVjdCBvYmplY3RcbiAgICAgKiBAcGFyYW0gT2JqZWN0IG1hdGNoZXJcbiAgICAgKlxuICAgICAqIENvbXBhcmUgYXJiaXRyYXJ5IHZhbHVlIGBgb2JqZWN0YGAgd2l0aCBtYXRjaGVyLlxuICAgICAqL1xuICAgIG1hdGNoID0gZnVuY3Rpb24gbWF0Y2gob2JqZWN0LCBtYXRjaGVyKSB7XG4gICAgICAgIGlmIChtYXRjaGVyICYmIHR5cGVvZiBtYXRjaGVyLnRlc3QgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoZXIudGVzdChvYmplY3QpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBtYXRjaGVyID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaGVyKG9iamVjdCkgPT09IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIG1hdGNoZXIgPSBtYXRjaGVyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB2YXIgbm90TnVsbCA9IHR5cGVvZiBvYmplY3QgPT09IFwic3RyaW5nXCIgfHwgISFvYmplY3Q7XG4gICAgICAgICAgICByZXR1cm4gbm90TnVsbCAmJlxuICAgICAgICAgICAgICAgIChTdHJpbmcob2JqZWN0KSkudG9Mb3dlckNhc2UoKS5pbmRleE9mKG1hdGNoZXIpID49IDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaGVyID09PSBvYmplY3Q7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIG1hdGNoZXIgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hlciA9PT0gb2JqZWN0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGdldENsYXNzKG9iamVjdCkgPT09IFwiQXJyYXlcIiAmJiBnZXRDbGFzcyhtYXRjaGVyKSA9PT0gXCJBcnJheVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyYXlDb250YWlucyhvYmplY3QsIG1hdGNoZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoZXIgJiYgdHlwZW9mIG1hdGNoZXIgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHZhciBwcm9wO1xuICAgICAgICAgICAgZm9yIChwcm9wIGluIG1hdGNoZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKG9iamVjdFtwcm9wXSwgbWF0Y2hlcltwcm9wXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWF0Y2hlciB3YXMgbm90IGEgc3RyaW5nLCBhIG51bWJlciwgYSBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICBcImZ1bmN0aW9uLCBhIGJvb2xlYW4gb3IgYW4gb2JqZWN0XCIpO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBpc0FyZ3VtZW50czogaXNBcmd1bWVudHMsXG4gICAgICAgIGlzRWxlbWVudDogaXNFbGVtZW50LFxuICAgICAgICBpc0RhdGU6IGlzRGF0ZSxcbiAgICAgICAgaXNOZWdaZXJvOiBpc05lZ1plcm8sXG4gICAgICAgIGlkZW50aWNhbDogaWRlbnRpY2FsLFxuICAgICAgICBkZWVwRXF1YWw6IGRlZXBFcXVhbEN5Y2xpYyxcbiAgICAgICAgbWF0Y2g6IG1hdGNoLFxuICAgICAgICBrZXlzOiBrZXlzXG4gICAgfTtcbn0pO1xuIiwiLy8gICAgIFVuZGVyc2NvcmUuanMgMS41LjJcbi8vICAgICBodHRwOi8vdW5kZXJzY29yZWpzLm9yZ1xuLy8gICAgIChjKSAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbi8vICAgICBVbmRlcnNjb3JlIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4oZnVuY3Rpb24oKSB7XG5cbiAgLy8gQmFzZWxpbmUgc2V0dXBcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBFc3RhYmxpc2ggdGhlIHJvb3Qgb2JqZWN0LCBgd2luZG93YCBpbiB0aGUgYnJvd3Nlciwgb3IgYGV4cG9ydHNgIG9uIHRoZSBzZXJ2ZXIuXG4gIHZhciByb290ID0gdGhpcztcblxuICAvLyBTYXZlIHRoZSBwcmV2aW91cyB2YWx1ZSBvZiB0aGUgYF9gIHZhcmlhYmxlLlxuICB2YXIgcHJldmlvdXNVbmRlcnNjb3JlID0gcm9vdC5fO1xuXG4gIC8vIEVzdGFibGlzaCB0aGUgb2JqZWN0IHRoYXQgZ2V0cyByZXR1cm5lZCB0byBicmVhayBvdXQgb2YgYSBsb29wIGl0ZXJhdGlvbi5cbiAgdmFyIGJyZWFrZXIgPSB7fTtcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVGb3JFYWNoICAgICAgPSBBcnJheVByb3RvLmZvckVhY2gsXG4gICAgbmF0aXZlTWFwICAgICAgICAgID0gQXJyYXlQcm90by5tYXAsXG4gICAgbmF0aXZlUmVkdWNlICAgICAgID0gQXJyYXlQcm90by5yZWR1Y2UsXG4gICAgbmF0aXZlUmVkdWNlUmlnaHQgID0gQXJyYXlQcm90by5yZWR1Y2VSaWdodCxcbiAgICBuYXRpdmVGaWx0ZXIgICAgICAgPSBBcnJheVByb3RvLmZpbHRlcixcbiAgICBuYXRpdmVFdmVyeSAgICAgICAgPSBBcnJheVByb3RvLmV2ZXJ5LFxuICAgIG5hdGl2ZVNvbWUgICAgICAgICA9IEFycmF5UHJvdG8uc29tZSxcbiAgICBuYXRpdmVJbmRleE9mICAgICAgPSBBcnJheVByb3RvLmluZGV4T2YsXG4gICAgbmF0aXZlTGFzdEluZGV4T2YgID0gQXJyYXlQcm90by5sYXN0SW5kZXhPZixcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kO1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdCB2aWEgYSBzdHJpbmcgaWRlbnRpZmllcixcbiAgLy8gZm9yIENsb3N1cmUgQ29tcGlsZXIgXCJhZHZhbmNlZFwiIG1vZGUuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuNS4yJztcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIG9iamVjdHMgd2l0aCB0aGUgYnVpbHQtaW4gYGZvckVhY2hgLCBhcnJheXMsIGFuZCByYXcgb2JqZWN0cy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZvckVhY2hgIGlmIGF2YWlsYWJsZS5cbiAgdmFyIGVhY2ggPSBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm47XG4gICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleXNbaV1dLCBrZXlzW2ldLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcmVzdWx0cyBvZiBhcHBseWluZyB0aGUgaXRlcmF0b3IgdG8gZWFjaCBlbGVtZW50LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbWFwYCBpZiBhdmFpbGFibGUuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlTWFwICYmIG9iai5tYXAgPT09IG5hdGl2ZU1hcCkgcmV0dXJuIG9iai5tYXAoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIHZhciByZWR1Y2VFcnJvciA9ICdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJztcblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2UgPSBfLmZvbGRsID0gXy5pbmplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2UgJiYgb2JqLnJlZHVjZSA9PT0gbmF0aXZlUmVkdWNlKSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlKGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2UoaXRlcmF0b3IpO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IHZhbHVlO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZVJpZ2h0YCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlUmlnaHQgPSBfLmZvbGRyID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlUmlnaHQgJiYgb2JqLnJlZHVjZVJpZ2h0ID09PSBuYXRpdmVSZWR1Y2VSaWdodCkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvcik7XG4gICAgfVxuICAgIHZhciBsZW5ndGggPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggIT09ICtsZW5ndGgpIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaW5kZXggPSBrZXlzID8ga2V5c1stLWxlbmd0aF0gOiAtLWxlbmd0aDtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gb2JqW2luZGV4XTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCBvYmpbaW5kZXhdLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuIEFsaWFzZWQgYXMgYGRldGVjdGAuXG4gIF8uZmluZCA9IF8uZGV0ZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgYW55KG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmaWx0ZXJgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgc2VsZWN0YC5cbiAgXy5maWx0ZXIgPSBfLnNlbGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZUZpbHRlciAmJiBvYmouZmlsdGVyID09PSBuYXRpdmVGaWx0ZXIpIHJldHVybiBvYmouZmlsdGVyKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSByZXN1bHRzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIGZvciB3aGljaCBhIHRydXRoIHRlc3QgZmFpbHMuXG4gIF8ucmVqZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuICFpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgfSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBldmVyeWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgfHwgKGl0ZXJhdG9yID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVFdmVyeSAmJiBvYmouZXZlcnkgPT09IG5hdGl2ZUV2ZXJ5KSByZXR1cm4gb2JqLmV2ZXJ5KGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIShyZXN1bHQgPSByZXN1bHQgJiYgaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiBhdCBsZWFzdCBvbmUgZWxlbWVudCBpbiB0aGUgb2JqZWN0IG1hdGNoZXMgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgc29tZWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbnlgLlxuICB2YXIgYW55ID0gXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgfHwgKGl0ZXJhdG9yID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlU29tZSAmJiBvYmouc29tZSA9PT0gbmF0aXZlU29tZSkgcmV0dXJuIG9iai5zb21lKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocmVzdWx0IHx8IChyZXN1bHQgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBhcnJheSBvciBvYmplY3QgY29udGFpbnMgYSBnaXZlbiB2YWx1ZSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZSA9IGZ1bmN0aW9uKG9iaiwgdGFyZ2V0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgb2JqLmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBvYmouaW5kZXhPZih0YXJnZXQpICE9IC0xO1xuICAgIHJldHVybiBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSB0YXJnZXQ7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiAoaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXSkuYXBwbHkodmFsdWUsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYG1hcGA6IGZldGNoaW5nIGEgcHJvcGVydHkuXG4gIF8ucGx1Y2sgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuIHZhbHVlW2tleV07IH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMsIGZpcnN0KSB7XG4gICAgaWYgKF8uaXNFbXB0eShhdHRycykpIHJldHVybiBmaXJzdCA/IHZvaWQgMCA6IFtdO1xuICAgIHJldHVybiBfW2ZpcnN0ID8gJ2ZpbmQnIDogJ2ZpbHRlciddKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xuICAgICAgICBpZiAoYXR0cnNba2V5XSAhPT0gdmFsdWVba2V5XSkgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy53aGVyZShvYmosIGF0dHJzLCB0cnVlKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCBvciAoZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIC8vIENhbid0IG9wdGltaXplIGFycmF5cyBvZiBpbnRlZ2VycyBsb25nZXIgdGhhbiA2NSw1MzUgZWxlbWVudHMuXG4gIC8vIFNlZSBbV2ViS2l0IEJ1ZyA4MDc5N10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgwNzk3KVxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNFbXB0eShvYmopKSByZXR1cm4gLUluZmluaXR5O1xuICAgIHZhciByZXN1bHQgPSB7Y29tcHV0ZWQgOiAtSW5maW5pdHksIHZhbHVlOiAtSW5maW5pdHl9O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBjb21wdXRlZCA+IHJlc3VsdC5jb21wdXRlZCAmJiAocmVzdWx0ID0ge3ZhbHVlIDogdmFsdWUsIGNvbXB1dGVkIDogY29tcHV0ZWR9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0LnZhbHVlO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzRW1wdHkob2JqKSkgcmV0dXJuIEluZmluaXR5O1xuICAgIHZhciByZXN1bHQgPSB7Y29tcHV0ZWQgOiBJbmZpbml0eSwgdmFsdWU6IEluZmluaXR5fTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgY29tcHV0ZWQgPCByZXN1bHQuY29tcHV0ZWQgJiYgKHJlc3VsdCA9IHt2YWx1ZSA6IHZhbHVlLCBjb21wdXRlZCA6IGNvbXB1dGVkfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGFuIGFycmF5LCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlIFxuICAvLyBbRmlzaGVyLVlhdGVzIHNodWZmbGVdKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlzaGVy4oCTWWF0ZXNfc2h1ZmZsZSkuXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByYW5kO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNodWZmbGVkID0gW107XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oaW5kZXgrKyk7XG4gICAgICBzaHVmZmxlZFtpbmRleCAtIDFdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50IGZyb20gdGhlIGFycmF5LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIgfHwgZ3VhcmQpIHtcbiAgICAgIHJldHVybiBvYmpbXy5yYW5kb20ob2JqLmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgcmV0dXJuIF8uc2h1ZmZsZShvYmopLnNsaWNlKDAsIE1hdGgubWF4KDAsIG4pKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBsb29rdXAgaXRlcmF0b3JzLlxuICB2YXIgbG9va3VwSXRlcmF0b3IgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUgOiBmdW5jdGlvbihvYmopeyByZXR1cm4gb2JqW3ZhbHVlXTsgfTtcbiAgfTtcblxuICAvLyBTb3J0IHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24gcHJvZHVjZWQgYnkgYW4gaXRlcmF0b3IuXG4gIF8uc29ydEJ5ID0gZnVuY3Rpb24ob2JqLCB2YWx1ZSwgY29udGV4dCkge1xuICAgIHZhciBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKHZhbHVlKTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSkuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCAtIHJpZ2h0LmluZGV4O1xuICAgIH0pLCAndmFsdWUnKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB1c2VkIGZvciBhZ2dyZWdhdGUgXCJncm91cCBieVwiIG9wZXJhdGlvbnMuXG4gIHZhciBncm91cCA9IGZ1bmN0aW9uKGJlaGF2aW9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgdmFsdWUsIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIHZhciBpdGVyYXRvciA9IHZhbHVlID09IG51bGwgPyBfLmlkZW50aXR5IDogbG9va3VwSXRlcmF0b3IodmFsdWUpO1xuICAgICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICAgIGJlaGF2aW9yKHJlc3VsdCwga2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICAoXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0gOiAocmVzdWx0W2tleV0gPSBbXSkpLnB1c2godmFsdWUpO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5KSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0rKyA6IHJlc3VsdFtrZXldID0gMTtcbiAgfSk7XG5cbiAgLy8gVXNlIGEgY29tcGFyYXRvciBmdW5jdGlvbiB0byBmaWd1cmUgb3V0IHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaFxuICAvLyBhbiBvYmplY3Qgc2hvdWxkIGJlIGluc2VydGVkIHNvIGFzIHRvIG1haW50YWluIG9yZGVyLiBVc2VzIGJpbmFyeSBzZWFyY2guXG4gIF8uc29ydGVkSW5kZXggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gaXRlcmF0b3IgPT0gbnVsbCA/IF8uaWRlbnRpdHkgOiBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVttaWRdKSA8IHZhbHVlID8gbG93ID0gbWlkICsgMSA6IGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSByZXR1cm4gXy5tYXAob2JqLCBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gXy52YWx1ZXMob2JqKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYmplY3QuXG4gIF8uc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgPyBvYmoubGVuZ3RoIDogXy5rZXlzKG9iaikubGVuZ3RoO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICByZXR1cm4gKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyBhcnJheVswXSA6IHNsaWNlLmNhbGwoYXJyYXksIDAsIG4pO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgZW50cnkgb2YgdGhlIGFycmF5LiBFc3BlY2lhbGx5IHVzZWZ1bCBvblxuICAvLyB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiBhbGwgdGhlIHZhbHVlcyBpblxuICAvLyB0aGUgYXJyYXksIGV4Y2x1ZGluZyB0aGUgbGFzdCBOLiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGhcbiAgLy8gYF8ubWFwYC5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtICgobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5sYXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuID09IG51bGwpIHx8IGd1YXJkKSB7XG4gICAgICByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gICAgfVxuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqXG4gIC8vIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5yZXN0ID0gXy50YWlsID0gXy5kcm9wID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgb3V0cHV0KSB7XG4gICAgaWYgKHNoYWxsb3cgJiYgXy5ldmVyeShpbnB1dCwgXy5pc0FycmF5KSkge1xuICAgICAgcmV0dXJuIGNvbmNhdC5hcHBseShvdXRwdXQsIGlucHV0KTtcbiAgICB9XG4gICAgZWFjaChpbnB1dCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgIHNoYWxsb3cgPyBwdXNoLmFwcGx5KG91dHB1dCwgdmFsdWUpIDogZmxhdHRlbih2YWx1ZSwgc2hhbGxvdywgb3V0cHV0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xuXG4gIC8vIEZsYXR0ZW4gb3V0IGFuIGFycmF5LCBlaXRoZXIgcmVjdXJzaXZlbHkgKGJ5IGRlZmF1bHQpLCBvciBqdXN0IG9uZSBsZXZlbC5cbiAgXy5mbGF0dGVuID0gZnVuY3Rpb24oYXJyYXksIHNoYWxsb3cpIHtcbiAgICByZXR1cm4gZmxhdHRlbihhcnJheSwgc2hhbGxvdywgW10pO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHZlcnNpb24gb2YgdGhlIGFycmF5IHRoYXQgZG9lcyBub3QgY29udGFpbiB0aGUgc3BlY2lmaWVkIHZhbHVlKHMpLlxuICBfLndpdGhvdXQgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYXJyYXksIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGlzU29ydGVkKSkge1xuICAgICAgY29udGV4dCA9IGl0ZXJhdG9yO1xuICAgICAgaXRlcmF0b3IgPSBpc1NvcnRlZDtcbiAgICAgIGlzU29ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXRlcmF0b3IgPyBfLm1hcChhcnJheSwgaXRlcmF0b3IsIGNvbnRleHQpIDogYXJyYXk7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGVhY2goaW5pdGlhbCwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAoaXNTb3J0ZWQgPyAoIWluZGV4IHx8IHNlZW5bc2Vlbi5sZW5ndGggLSAxXSAhPT0gdmFsdWUpIDogIV8uY29udGFpbnMoc2VlbiwgdmFsdWUpKSB7XG4gICAgICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJlc3VsdHMucHVzaChhcnJheVtpbmRleF0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoXy5mbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihfLnVuaXEoYXJyYXkpLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gXy5ldmVyeShyZXN0LCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gXy5pbmRleE9mKG90aGVyLCBpdGVtKSA+PSAwO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiAhXy5jb250YWlucyhyZXN0LCB2YWx1ZSk7IH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxlbmd0aCA9IF8ubWF4KF8ucGx1Y2soYXJndW1lbnRzLCBcImxlbmd0aFwiKS5jb25jYXQoMCkpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJndW1lbnRzLCAnJyArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIElmIHRoZSBicm93c2VyIGRvZXNuJ3Qgc3VwcGx5IHVzIHdpdGggaW5kZXhPZiAoSSdtIGxvb2tpbmcgYXQgeW91LCAqKk1TSUUqKiksXG4gIC8vIHdlIG5lZWQgdGhpcyBmdW5jdGlvbi4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhblxuICAvLyBpdGVtIGluIGFuIGFycmF5LCBvciAtMSBpZiB0aGUgaXRlbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIGFycmF5LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgaW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICAvLyBJZiB0aGUgYXJyYXkgaXMgbGFyZ2UgYW5kIGFscmVhZHkgaW4gc29ydCBvcmRlciwgcGFzcyBgdHJ1ZWBcbiAgLy8gZm9yICoqaXNTb3J0ZWQqKiB0byB1c2UgYmluYXJ5IHNlYXJjaC5cbiAgXy5pbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGlzU29ydGVkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0gXy5zb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9PT0gaXRlbSA/IGkgOiAtMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgYXJyYXkuaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSwgaXNTb3J0ZWQpO1xuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBsYXN0SW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICBfLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGZyb20pIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBoYXNJbmRleCA9IGZyb20gIT0gbnVsbDtcbiAgICBpZiAobmF0aXZlTGFzdEluZGV4T2YgJiYgYXJyYXkubGFzdEluZGV4T2YgPT09IG5hdGl2ZUxhc3RJbmRleE9mKSB7XG4gICAgICByZXR1cm4gaGFzSW5kZXggPyBhcnJheS5sYXN0SW5kZXhPZihpdGVtLCBmcm9tKSA6IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0pO1xuICAgIH1cbiAgICB2YXIgaSA9IChoYXNJbmRleCA/IGZyb20gOiBhcnJheS5sZW5ndGgpO1xuICAgIHdoaWxlIChpLS0pIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBhcmd1bWVudHNbMl0gfHwgMTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSwgMCk7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgdmFyIHJhbmdlID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZShpZHggPCBsZW5ndGgpIHtcbiAgICAgIHJhbmdlW2lkeCsrXSA9IHN0YXJ0O1xuICAgICAgc3RhcnQgKz0gc3RlcDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24gKGFoZW0pIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgcHJvdG90eXBlIHNldHRpbmcuXG4gIHZhciBjdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIHZhciBhcmdzLCBib3VuZDtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkpIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgIHZhciBzZWxmID0gbmV3IGN0b3I7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBCaW5kIGFsbCBvZiBhbiBvYmplY3QncyBtZXRob2RzIHRvIHRoYXQgb2JqZWN0LiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXRcbiAgLy8gYWxsIGNhbGxiYWNrcyBkZWZpbmVkIG9uIGFuIG9iamVjdCBiZWxvbmcgdG8gaXQuXG4gIF8uYmluZEFsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBmdW5jcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoZnVuY3MubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoXCJiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzXCIpO1xuICAgIGVhY2goZnVuY3MsIGZ1bmN0aW9uKGYpIHsgb2JqW2ZdID0gXy5iaW5kKG9ialtmXSwgb2JqKTsgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtbyA9IHt9O1xuICAgIGhhc2hlciB8fCAoaGFzaGVyID0gXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIF8uaGFzKG1lbW8sIGtleSkgPyBtZW1vW2tleV0gOiAobWVtb1trZXldID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3MpOyB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gXy5kZWxheS5hcHBseShfLCBbZnVuYywgMV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZVxuICAvLyBkdXJpbmcgYSBnaXZlbiB3aW5kb3cgb2YgdGltZS4gTm9ybWFsbHksIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbCBydW5cbiAgLy8gYXMgbXVjaCBhcyBpdCBjYW4sIHdpdGhvdXQgZXZlciBnb2luZyBtb3JlIHRoYW4gb25jZSBwZXIgYHdhaXRgIGR1cmF0aW9uO1xuICAvLyBidXQgaWYgeW91J2QgbGlrZSB0byBkaXNhYmxlIHRoZSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSwgcGFzc1xuICAvLyBge2xlYWRpbmc6IGZhbHNlfWAuIFRvIGRpc2FibGUgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlLCBkaXR0by5cbiAgXy50aHJvdHRsZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29udGV4dCwgYXJncywgcmVzdWx0O1xuICAgIHZhciB0aW1lb3V0ID0gbnVsbDtcbiAgICB2YXIgcHJldmlvdXMgPSAwO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogbmV3IERhdGU7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gbmV3IERhdGU7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIHByZXZpb3VzID0gbm93O1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdGltZXN0YW1wID0gbmV3IERhdGUoKTtcbiAgICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbGFzdCA9IChuZXcgRGF0ZSgpKSAtIHRpbWVzdGFtcDtcbiAgICAgICAgaWYgKGxhc3QgPCB3YWl0KSB7XG4gICAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQgLSBsYXN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICBpZiAoIWltbWVkaWF0ZSkgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsTm93KSByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvd1xuICAvLyBvZnRlbiB5b3UgY2FsbCBpdC4gVXNlZnVsIGZvciBsYXp5IGluaXRpYWxpemF0aW9uLlxuICBfLm9uY2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIHJhbiA9IGZhbHNlLCBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gW2Z1bmNdO1xuICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHdyYXBwZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBmb3IgKHZhciBpID0gZnVuY3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXJncyA9IFtmdW5jc1tpXS5hcHBseSh0aGlzLCBhcmdzKV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBuYXRpdmVLZXlzIHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogIT09IE9iamVjdChvYmopKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG9iamVjdCcpO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0gPSBvYmpba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBwYWlyc1tpXSA9IFtrZXlzW2ldLCBvYmpba2V5c1tpXV1dO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLy8gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICBfLmludmVydCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRbb2JqW2tleXNbaV1dXSA9IGtleXNbaV07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgc29ydGVkIGxpc3Qgb2YgdGhlIGZ1bmN0aW9uIG5hbWVzIGF2YWlsYWJsZSBvbiB0aGUgb2JqZWN0LlxuICAvLyBBbGlhc2VkIGFzIGBtZXRob2RzYFxuICBfLmZ1bmN0aW9ucyA9IF8ubWV0aG9kcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqW2tleV0pKSBuYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcy5zb3J0KCk7XG4gIH07XG5cbiAgLy8gRXh0ZW5kIGEgZ2l2ZW4gb2JqZWN0IHdpdGggYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHBhc3NlZC1pbiBvYmplY3QocykuXG4gIF8uZXh0ZW5kID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKCFfLmNvbnRhaW5zKGtleXMsIGtleSkpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChvYmpbcHJvcF0gPT09IHZvaWQgMCkgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuICAgIHZhciBzaXplID0gMCwgcmVzdWx0ID0gdHJ1ZTtcbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoY2xhc3NOYW1lID09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgc2l6ZSA9IGEubGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gc2l6ZSA9PSBiLmxlbmd0aDtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IGVxKGFbc2l6ZV0sIGJbc2l6ZV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgZm9yICh2YXIga2V5IGluIGEpIHtcbiAgICAgICAgaWYgKF8uaGFzKGEsIGtleSkpIHtcbiAgICAgICAgICAvLyBDb3VudCB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlci5cbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIGIpIHtcbiAgICAgICAgICBpZiAoXy5oYXMoYiwga2V5KSAmJiAhKHNpemUtLSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9ICFzaXplO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUGVyZm9ybSBhIGRlZXAgY29tcGFyaXNvbiB0byBjaGVjayBpZiB0d28gb2JqZWN0cyBhcmUgZXF1YWwuXG4gIF8uaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gZXEoYSwgYiwgW10sIFtdKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopKSByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9O1xuXG4gIC8vIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLlxuICBlYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIERlZmluZSBhIGZhbGxiYWNrIHZlcnNpb24gb2YgdGhlIG1ldGhvZCBpbiBicm93c2VycyAoYWhlbSwgSUUpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiAhIShvYmogJiYgXy5oYXMob2JqLCAnY2FsbGVlJykpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuXG4gIGlmICh0eXBlb2YgKC8uLykgIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPSArb2JqO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBib29sZWFuP1xuICBfLmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdG9ycy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIC8vIFJ1biBhIGZ1bmN0aW9uICoqbioqIHRpbWVzLlxuICBfLnRpbWVzID0gZnVuY3Rpb24obiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgYWNjdW0gPSBBcnJheShNYXRoLm1heCgwLCBuKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBpKTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBtaW4gYW5kIG1heCAoaW5jbHVzaXZlKS5cbiAgXy5yYW5kb20gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgIGlmIChtYXggPT0gbnVsbCkge1xuICAgICAgbWF4ID0gbWluO1xuICAgICAgbWluID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSk7XG4gIH07XG5cbiAgLy8gTGlzdCBvZiBIVE1MIGVudGl0aWVzIGZvciBlc2NhcGluZy5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICBlc2NhcGU6IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiN4Mjc7J1xuICAgIH1cbiAgfTtcbiAgZW50aXR5TWFwLnVuZXNjYXBlID0gXy5pbnZlcnQoZW50aXR5TWFwLmVzY2FwZSk7XG5cbiAgLy8gUmVnZXhlcyBjb250YWluaW5nIHRoZSBrZXlzIGFuZCB2YWx1ZXMgbGlzdGVkIGltbWVkaWF0ZWx5IGFib3ZlLlxuICB2YXIgZW50aXR5UmVnZXhlcyA9IHtcbiAgICBlc2NhcGU6ICAgbmV3IFJlZ0V4cCgnWycgKyBfLmtleXMoZW50aXR5TWFwLmVzY2FwZSkuam9pbignJykgKyAnXScsICdnJyksXG4gICAgdW5lc2NhcGU6IG5ldyBSZWdFeHAoJygnICsgXy5rZXlzKGVudGl0eU1hcC51bmVzY2FwZSkuam9pbignfCcpICsgJyknLCAnZycpXG4gIH07XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICBfLmVhY2goWydlc2NhcGUnLCAndW5lc2NhcGUnXSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgX1ttZXRob2RdID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBpZiAoc3RyaW5nID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiAoJycgKyBzdHJpbmcpLnJlcGxhY2UoZW50aXR5UmVnZXhlc1ttZXRob2RdLCBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICByZXR1cm4gZW50aXR5TWFwW21ldGhvZF1bbWF0Y2hdO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChfLmZ1bmN0aW9ucyhvYmopLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IF9bbmFtZV0gPSBvYmpbbmFtZV07XG4gICAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFt0aGlzLl93cmFwcGVkXTtcbiAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx0JzogICAgICd0JyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx0fFxcdTIwMjh8XFx1MjAyOS9nO1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBkYXRhLCBzZXR0aW5ncykge1xuICAgIHZhciByZW5kZXI7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldClcbiAgICAgICAgLnJlcGxhY2UoZXNjYXBlciwgZnVuY3Rpb24obWF0Y2gpIHsgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdOyB9KTtcblxuICAgICAgaWYgKGVzY2FwZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGVzY2FwZSArIFwiKSk9PW51bGw/Jyc6Xy5lc2NhcGUoX190KSkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aDtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArIFwicmV0dXJuIF9fcDtcXG5cIjtcblxuICAgIHRyeSB7XG4gICAgICByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHJldHVybiByZW5kZXIoZGF0YSwgXyk7XG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBmdW5jdGlvbiBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyAoc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicpICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24sIHdoaWNoIHdpbGwgZGVsZWdhdGUgdG8gdGhlIHdyYXBwZXIuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXyhvYmopLmNoYWluKCk7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0aGlzLl9jaGFpbiA/IF8ob2JqKS5jaGFpbigpIDogb2JqO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsncG9wJywgJ3B1c2gnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuX3dyYXBwZWQ7XG4gICAgICBtZXRob2QuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKChuYW1lID09ICdzaGlmdCcgfHwgbmFtZSA9PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgbWV0aG9kLmFwcGx5KHRoaXMuX3dyYXBwZWQsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xuXG4gIF8uZXh0ZW5kKF8ucHJvdG90eXBlLCB7XG5cbiAgICAvLyBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gICAgY2hhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fY2hhaW4gPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEV4dHJhY3RzIHRoZSByZXN1bHQgZnJvbSBhIHdyYXBwZWQgYW5kIGNoYWluZWQgb2JqZWN0LlxuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93cmFwcGVkO1xuICAgIH1cblxuICB9KTtcblxufSkuY2FsbCh0aGlzKTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXsoZnVuY3Rpb24ocm9vdCkge1xuICAgIHZhciB1bm9waW5pb25hdGUgPSB7XG4gICAgICAgIHNlbGVjdG9yOiByb290LmpRdWVyeSB8fCByb290LlplcHRvIHx8IHJvb3QuZW5kZXIgfHwgcm9vdC4kLFxuICAgICAgICB0ZW1wbGF0ZTogcm9vdC5IYW5kbGViYXJzIHx8IHJvb3QuTXVzdGFjaGVcbiAgICB9O1xuXG4gICAgLyoqKiBFeHBvcnQgKioqL1xuXG4gICAgLy9BTURcbiAgICBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFtdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB1bm9waW5pb25hdGU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvL0NvbW1vbkpTXG4gICAgZWxzZSBpZih0eXBlb2YgbW9kdWxlLmV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gdW5vcGluaW9uYXRlO1xuICAgIH1cbiAgICAvL0dsb2JhbFxuICAgIGVsc2Uge1xuICAgICAgICByb290LnVub3BpbmlvbmF0ZSA9IHVub3BpbmlvbmF0ZTtcbiAgICB9XG59KSh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnID8gd2luZG93IDogZ2xvYmFsKTtcbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIF8gICA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSxcbiAgICBsb2cgPSByZXF1aXJlKCdsb2dsZXZlbCcpLFxuICAgIG5vb3AgPSBmdW5jdGlvbigpIHt9O1xuXG52YXIgVmlldyA9IGZ1bmN0aW9uKCkge307XG5cblZpZXcucHJvdG90eXBlID0ge1xuICAgIGlzVmlldzogdHJ1ZSxcblxuICAgIC8qKiogRGVmYXVsdCBBdHRyaWJ1dGVzIChzaG91bGQgYmUgb3ZlcndyaXR0ZW4pICoqKi9cbiAgICB0YWdOYW1lOiAgICBcImRpdlwiLFxuICAgIGNsYXNzTmFtZTogIFwiXCIsXG5cbiAgICAvKlxuICAgICAgICBsaXN0ZW5lcnNcbiAgICAgICAgLS0tLS0tLS0tXG5cbiAgICAgICAgJ1tkaXJlY3Rpb25dOltldmVudCBuYW1lXTpbZnJvbSB0eXBlXSwgLi4uJzogZnVuY3Rpb24oZXZlbnRBcmd1bWVudHMqKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgfVxuICAgICovXG4gICAgbGlzdGVuZXJzOiB7fSxcblxuICAgIC8qIFRlbXBsYXRpbmcgKi9cbiAgICB0ZW1wbGF0ZTogICBcIlwiLFxuXG4gICAgLy9EYXRhIGdvZXMgaW50byB0aGUgdGVtcGxhdGVzIGFuZCBtYXkgYWxzbyBiZSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhbiBvYmplY3RcbiAgICBkYXRhOiAgICAgICB7fSxcblxuICAgIC8vU3Vidmlld3MgYXJlIGEgc2V0IG9mIHN1YnZpZXdzIHRoYXQgd2lsbCBiZSBmZWQgaW50byB0aGUgdGVtcGxhdGluZyBlbmdpbmVcbiAgICBzdWJ2aWV3czogICB7fSxcblxuICAgIHJlUmVuZGVyOiAgIGZhbHNlLCAvL0RldGVybWluZXMgaWYgc3VidmlldyBpcyByZS1yZW5kZXJlZCBldmVyeSB0aW1lIGl0IGlzIHNwYXduZWRcblxuICAgIC8qIENhbGxiYWNrcyAqL1xuICAgIHByZVJlbmRlcjogIG5vb3AsXG4gICAgcG9zdFJlbmRlcjogbm9vcCxcblxuICAgIC8qKiogSW5pdGlhbGl6YXRpb24gRnVuY3Rpb25zIChzaG91bGQgYmUgY29uZmlndXJlZCBidXQgd2lsbCBiZSBtYW5pcHVsYXRlZCB3aGVuIGRlZmluaW5nIHRoZSBzdWJ2aWV3KSAqKiovXG4gICAgb25jZTogZnVuY3Rpb24oY29uZmlnKSB7IC8vUnVucyBhZnRlciByZW5kZXJcbiAgICAgICAgZm9yKHZhciBpPTA7IGk8dGhpcy5vbmNlRnVuY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLm9uY2VGdW5jdGlvbnNbaV0uYXBwbHkodGhpcywgW2NvbmZpZ10pO1xuICAgICAgICB9XG4gICAgfSwgXG4gICAgb25jZUZ1bmN0aW9uczogW10sXG4gICAgaW5pdDogZnVuY3Rpb24oY29uZmlnKSB7IC8vUnVucyBhZnRlciByZW5kZXJcbiAgICAgICAgZm9yKHZhciBpPTA7IGk8dGhpcy5pbml0RnVuY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRGdW5jdGlvbnNbaV0uYXBwbHkodGhpcywgW2NvbmZpZ10pO1xuICAgICAgICB9XG4gICAgfSwgXG4gICAgaW5pdEZ1bmN0aW9uczogW10sXG4gICAgY2xlYW46IGZ1bmN0aW9uKCkgeyAvL1J1bnMgb24gcmVtb3ZlXG4gICAgICAgIGZvcih2YXIgaT0wOyBpPHRoaXMuY2xlYW5GdW5jdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuY2xlYW5GdW5jdGlvbnNbaV0uYXBwbHkodGhpcywgW10pO1xuICAgICAgICB9XG4gICAgfSwgXG4gICAgY2xlYW5GdW5jdGlvbnM6IFtdLFxuXG4gICAgLyoqKiBSZW5kZXJpbmcgKioqL1xuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgIGh0bWwgPSAnJyxcbiAgICAgICAgICAgIHBvc3RMb2FkID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5wcmVSZW5kZXIoKTtcblxuICAgICAgICAvL05vIFRlbXBsYXRpbmcgRW5naW5lXG4gICAgICAgIGlmKHR5cGVvZiB0aGlzLnRlbXBsYXRlID09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBodG1sID0gdGhpcy50ZW1wbGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdHlwZW9mIHRoaXMuZGF0YSA9PSAnZnVuY3Rpb24nID8gdGhpcy5kYXRhKCkgOiB0aGlzLmRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vRGVmaW5lIHRoZSBzdWJ2aWV3IHZhcmlhYmxlXG4gICAgICAgICAgICBkYXRhLnN1YnZpZXcgPSB7fTtcbiAgICAgICAgICAgICQuZWFjaCh0aGlzLnN1YnZpZXdzLCBmdW5jdGlvbihuYW1lLCBzdWJ2aWV3KSB7XG4gICAgICAgICAgICAgICAgaWYoc3Vidmlldy5pc1ZpZXdQb29sKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEuc3Vidmlld1tuYW1lXSA9IHN1YnZpZXcudGVtcGxhdGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwb3N0TG9hZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEuc3Vidmlld1tuYW1lXSA9IFwiPHNjcmlwdCBjbGFzcz0ncG9zdC1sb2FkLXZpZXcnIHR5cGU9J3RleHQvaHRtbCcgZGF0YS1uYW1lPSdcIituYW1lK1wiJz48L3NjcmlwdD5cIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy9SdW4gdGhlIHRlbXBsYXRpbmcgZW5naW5lXG4gICAgICAgICAgICBpZihfLmlzRnVuY3Rpb24odGhpcy50ZW1wbGF0ZSkpIHtcbiAgICAgICAgICAgICAgICAvL0VKU1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiB0aGlzLnRlbXBsYXRlLnJlbmRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgPSB0aGlzLnRlbXBsYXRlLnJlbmRlcihkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9IYW5kbGViYXJzICYgVW5kZXJzY29yZSAmIEphZGVcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCA9IHRoaXMudGVtcGxhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nLmVycm9yKFwiVGVtcGxhdGluZyBlbmdpbmUgbm90IHJlY29nbml6ZWQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5odG1sKGh0bWwpO1xuXG4gICAgICAgIC8vUG9zdCBMb2FkIFZpZXdzXG4gICAgICAgIGlmKHBvc3RMb2FkKSB7XG4gICAgICAgICAgICB0aGlzLiR3cmFwcGVyLmZpbmQoJy5wb3N0LWxvYWQtdmlldycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAkdGhpc1xuICAgICAgICAgICAgICAgICAgICAuYWZ0ZXIoc2VsZi5zdWJ2aWV3c1skdGhpcy5hdHRyKCdkYXRhLW5hbWUnKV0uJHdyYXBwZXIpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wb3N0UmVuZGVyKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBodG1sOiBmdW5jdGlvbihodG1sKSB7XG4gICAgICAgIC8vUmVtb3ZlICYgY2xlYW4gc3Vidmlld3MgaW4gdGhlIHdyYXBwZXIgXG4gICAgICAgIHRoaXMuJHdyYXBwZXIuZmluZCgnLicrdGhpcy5fc3Vidmlld0Nzc0NsYXNzKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc3Vidmlldyh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy53cmFwcGVyLmlubmVySFRNTCA9IGh0bWw7XG5cbiAgICAgICAgLy9Mb2FkIHN1YnZpZXdzIGluIHRoZSB3cmFwcGVyXG4gICAgICAgIHN1YnZpZXcubG9hZCh0aGlzLiR3cmFwcGVyKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMuX2FjdGl2ZSkge1xuICAgICAgICAgICAgLy9EZXRhY2hcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLndyYXBwZXIucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIGlmKHBhcmVudCkge1xuICAgICAgICAgICAgICAgIHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzLndyYXBwZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0NsZWFuXG4gICAgICAgICAgICB0aGlzLmNsZWFuKCk7XG5cbiAgICAgICAgICAgIHRoaXMucG9vbC5fcmVsZWFzZSh0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKioqIEV2ZW50IEFQSSAqKiovXG4gICAgdHJpZ2dlcjogZnVuY3Rpb24obmFtZSwgYXJncykge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGFyZ3MgPSBhcmdzIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy9Ccm9hZGNhc3QgaW4gYWxsIGRpcmVjdGlvbnNcbiAgICAgICAgdmFyIGRpcmVjdGlvbnMgPSB7XG4gICAgICAgICAgICB1cDogICAgICdmaW5kJyxcbiAgICAgICAgICAgIGRvd246ICAgJ3BhcmVudHMnLFxuICAgICAgICAgICAgYWNyb3NzOiAnc2libGluZ3MnLFxuICAgICAgICAgICAgYWxsOiAgICBudWxsXG4gICAgICAgIH07XG5cbiAgICAgICAgXy5maW5kKGRpcmVjdGlvbnMsIGZ1bmN0aW9uKGpxRnVuYywgZGlyKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0b3IgPSAnLmxpc3RlbmVyLScrbmFtZSsnLScrZGlyO1xuICAgICAgICAgICAgc2VsZWN0b3IgPSBzZWxlY3RvciArICcsICcgKyBzZWxlY3RvcisnLScrc2VsZi50eXBlO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhzZWxlY3Rvcik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhqcUZ1bmMpO1xuXG4gICAgICAgICAgICAvL1NlbGVjdCAkd3JhcHBlcnMgd2l0aCB0aGUgcmlnaHQgbGlzdGVuZXIgY2xhc3MgaW4gdGhlIHJpZ2h0IGRpcmVjdGlvblxuICAgICAgICAgICAgdmFyICRlbHMgPSBqcUZ1bmMgPyBzZWxmLiR3cmFwcGVyW2pxRnVuY10oc2VsZWN0b3IpIDogJChzZWxlY3Rvcik7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRlbHMpO1xuXG4gICAgICAgICAgICBmb3IodmFyIGk9MDsgaTwkZWxzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy9HZXQgdGhlIGFjdHVhbCBzdWJ2aWV3XG4gICAgICAgICAgICAgICAgdmFyIHJlY2lwaWVudCA9IHN1YnZpZXcoJGVsc1tpXSk7XG5cbiAgICAgICAgICAgICAgICAvL0NoZWNrIGZvciBhIHN1YnZpZXcgdHlwZSBzcGVjaWZpYyBjYWxsYmFja1xuICAgICAgICAgICAgICAgIHZhciB0eXBlZENhbGxiYWNrID0gcmVjaXBpZW50Lmxpc3RlbmVyc1tkaXIgKyBcIjpcIiArIG5hbWUgKyBcIjpcIiArIHNlbGYudHlwZV07XG4gICAgICAgICAgICAgICAgaWYodHlwZWRDYWxsYmFjayAmJiB0eXBlZENhbGxiYWNrLmFwcGx5KHNlbGYsIGFyZ3MpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy9CcmVha3MgaWYgY2FsbGJhY2sgcmV0dXJucyBmYWxzZVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vQ2hlY2sgZm9yIGEgZ2VuZXJhbCBldmVudCBjYWxsYmFja1xuICAgICAgICAgICAgICAgIHZhciB1bnR5cGVkQ2FsbGJhY2sgPSByZWNpcGllbnQubGlzdGVuZXJzW2RpciArIFwiOlwiICsgbmFtZV07XG4gICAgICAgICAgICAgICAgaWYodW50eXBlZENhbGxiYWNrICYmIHVudHlwZWRDYWxsYmFjay5hcHBseShzZWxmLCBhcmdzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7IC8vQnJlYWtzIGlmIGNhbGxiYWNrIHJldHVybnMgZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgX2JpbmRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJC5lYWNoKHRoaXMubGlzdGVuZXJzLCBmdW5jdGlvbihldmVudHMsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBkaXJlY3Rpb24gPSBkaXJlY3Rpb24gfHwgJ2FsbCc7XG5cbiAgICAgICAgICAgIC8vUGFyc2UgdGhlIGV2ZW50IGZvcm1hdCBcIlt2aWV3IHR5cGVdOltldmVudCBuYW1lXSwgW3ZpZXcgdHlwZV06W2V2ZW50IG5hbWVdXCJcbiAgICAgICAgICAgICQuZWFjaChldmVudE5hbWUuc3BsaXQoJywnKSwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRQYXJ0cyA9IGV2ZW50LnJlcGxhY2UoLyAvZywgJycpLnNwbGl0KCc6Jyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIGRpcmVjdGlvbiA9IGV2ZW50UGFydHNbMF0sXG4gICAgICAgICAgICAgICAgICAgIG5hbWUgICAgICA9IGV2ZW50UGFydHNbMV0sXG4gICAgICAgICAgICAgICAgICAgIHZpZXdUeXBlICA9IGV2ZW50UGFydHNbMl0gfHwgbnVsbDtcblxuICAgICAgICAgICAgICAgIC8vQWRkIHRoZSBsaXN0ZW5lciBjbGFzc1xuICAgICAgICAgICAgICAgIGlmKGRpcmVjdGlvbiAhPSAnc2VsZicpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi4kd3JhcHBlci5hZGRDbGFzcygnbGlzdGVuZXItJyArIGRpcmVjdGlvbiArICctJyArIG5hbWUgKyAodmlld1R5cGUgPyAnLScgKyB2aWV3VHlwZSA6ICcnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvKioqIENsYXNzZXMgKioqL1xuICAgIF9hY3RpdmU6IGZhbHNlLFxuICAgIF9zdWJ2aWV3Q3NzQ2xhc3M6ICdzdWJ2aWV3JyxcbiAgICBfdmlld0Nzc1ByZWZpeDogICAnc3Vidmlldy0nLFxuICAgIF9nZXRDbGFzc2VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3JhcHBlci5jbGFzc05hbWUuc3BsaXQoL1xccysvKTtcbiAgICB9LFxuICAgIF9zZXRDbGFzc2VzOiBmdW5jdGlvbihjbGFzc2VzKSB7XG4gICAgICAgIHZhciBuZXdDbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgICAgICAgaWYodGhpcy53cmFwcGVyLmNsYXNzTmFtZSAhPSBuZXdDbGFzc05hbWUpIHRoaXMud3JhcHBlci5jbGFzc05hbWUgPSBuZXdDbGFzc05hbWU7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBfYWRkRGVmYXVsdENsYXNzZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY2xhc3NlcyA9IHRoaXMuX2dldENsYXNzZXMoKTtcbiAgICAgICAgY2xhc3Nlcy5wdXNoKHRoaXMuX3ZpZXdDc3NQcmVmaXggKyB0aGlzLnR5cGUpO1xuXG4gICAgICAgIHZhciBzdXBlckNsYXNzID0gdGhpcy5zdXBlcjtcbiAgICAgICAgd2hpbGUodHJ1ZSkge1xuICAgICAgICAgICAgaWYoc3VwZXJDbGFzcy50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKHRoaXMuX3ZpZXdDc3NQcmVmaXggKyBzdXBlckNsYXNzLnR5cGUpO1xuICAgICAgICAgICAgICAgIHN1cGVyQ2xhc3MgPSBzdXBlckNsYXNzLnN1cGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvL0FkZCBEZWZhdWx0IFZpZXcgQ2xhc3NcbiAgICAgICAgY2xhc3Nlcy5wdXNoKHRoaXMuX3N1YnZpZXdDc3NDbGFzcyk7XG5cbiAgICAgICAgLy9BZGQgY2xhc3NOYW1lXG4gICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzLmNvbmNhdCh0aGlzLmNsYXNzTmFtZS5zcGxpdCgnICcpKTtcblxuICAgICAgICB0aGlzLl9zZXRDbGFzc2VzKF8udW5pcShjbGFzc2VzKSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3O1xuXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCJ1bm9waW5pb25hdGVcIikuc2VsZWN0b3I7XG5cbnZhciBWaWV3UG9vbCA9IGZ1bmN0aW9uKFZpZXcpIHtcbiAgICAvL0NvbmZpZ3VyYXRpb25cbiAgICB0aGlzLlZpZXcgICA9IFZpZXc7XG4gICAgdGhpcy50eXBlICAgPSBWaWV3LnByb3RvdHlwZS50eXBlO1xuICAgIHRoaXMuc3VwZXIgID0gVmlldy5wcm90b3R5cGUuc3VwZXI7XG4gICAgdGhpcy50ZW1wbGF0ZSA9IFwiPFwiK3RoaXMuVmlldy5wcm90b3R5cGUudGFnTmFtZStcIiBjbGFzcz0nXCIrdGhpcy5WaWV3LnByb3RvdHlwZS5fdmlld0Nzc1ByZWZpeCArIHRoaXMuVmlldy5wcm90b3R5cGUudHlwZStcIiBcIit0aGlzLlZpZXcucHJvdG90eXBlLmNsYXNzTmFtZStcIic+PC9cIit0aGlzLlZpZXcucHJvdG90eXBlLnRhZ05hbWUrXCI+XCI7XG5cbiAgICAvL1ZpZXcgQ29uZmlndXJhdGlvblxuICAgIHRoaXMuVmlldy5wcm90b3R5cGUucG9vbCA9IHRoaXM7XG5cbiAgICAvL1Bvb2xcbiAgICB0aGlzLnBvb2wgPSBbXTtcbn07XG5cblZpZXdQb29sLnByb3RvdHlwZSA9IHtcbiAgICBpc1ZpZXdQb29sOiB0cnVlLFxuICAgIHNwYXduOiBmdW5jdGlvbihlbCwgY29uZmlnKSB7XG4gICAgICAgIC8valF1ZXJ5IG5vcm1hbGl6YXRpb25cbiAgICAgICAgdmFyICRlbCA9IGVsID8gKGVsLmpxdWVyeSA/IGVsIDogJChlbCkpOiBudWxsO1xuICAgICAgICBlbCA9IGVsICYmIGVsLmpxdWVyeSA/IGVsWzBdIDogZWw7XG5cbiAgICAgICAgLy9Bcmd1bWVudCBzdXJnZXJ5XG4gICAgICAgIGlmKGVsICYmIGVsLnZpZXcpIHtcbiAgICAgICAgICAgIHJldHVybiBlbC52aWV3O1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHZpZXc7XG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwgKCQuaXNQbGFpbk9iamVjdChlbCkgPyBlbCA6IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vR2V0IHRoZSBET00gbm9kZVxuICAgICAgICAgICAgaWYoIWVsIHx8ICFlbC5ub2RlVHlwZSkge1xuICAgICAgICAgICAgICAgIGlmKHRoaXMucG9vbC5sZW5ndGggIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmlldyA9IHRoaXMucG9vbC5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLlZpZXcucHJvdG90eXBlLnRhZ05hbWUpO1xuICAgICAgICAgICAgICAgICAgICAkZWwgPSAkKGVsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpc05ld1ZpZXc7XG4gICAgICAgICAgICBpZighdmlldykge1xuICAgICAgICAgICAgICAgIGlzTmV3VmlldyAgID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2aWV3ICAgICAgICA9IG5ldyB0aGlzLlZpZXcoKTtcblxuICAgICAgICAgICAgICAgIC8vQmluZCB0by9mcm9tIHRoZSBlbGVtZW50XG4gICAgICAgICAgICAgICAgZWxbc3Vidmlldy5fZG9tUHJvcGVydHlOYW1lXSA9IHZpZXc7XG4gICAgICAgICAgICAgICAgdmlldy53cmFwcGVyICA9IGVsO1xuICAgICAgICAgICAgICAgIHZpZXcuJHdyYXBwZXIgPSAkZWw7XG5cbiAgICAgICAgICAgICAgICB2aWV3Ll9hZGREZWZhdWx0Q2xhc3NlcygpO1xuICAgICAgICAgICAgICAgIHZpZXcuX2JpbmRMaXN0ZW5lcnMoKTtcblxuICAgICAgICAgICAgICAgIHZpZXcub25jZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvL01ha2UgdGhlIHZpZXcgYWN0aXZlXG4gICAgICAgICAgICB2aWV3Ll9hY3RpdmUgPSB0cnVlO1xuXG4gICAgICAgICAgICAvL1JlbmRlclxuICAgICAgICAgICAgaWYoaXNOZXdWaWV3IHx8IHZpZXcucmVSZW5kZXIpIHtcbiAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcigpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL0luaXRpYWxpemVcbiAgICAgICAgICAgIHZpZXcuaW5pdChjb25maWcpO1xuXG4gICAgICAgICAgICByZXR1cm4gdmlldztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZXh0ZW5kOiBmdW5jdGlvbihuYW1lLCBjb25maWcpIHtcbiAgICAgICAgcmV0dXJuIHN1YnZpZXcobmFtZSwgdGhpcywgY29uZmlnKTtcbiAgICB9LFxuICAgIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnBvb2wgPSBudWxsO1xuICAgICAgICBkZWxldGUgc3Vidmlldy52aWV3c1t0aGlzLnR5cGVdO1xuICAgIH0sXG5cbiAgICBfcmVsZWFzZTogZnVuY3Rpb24odmlldykge1xuICAgICAgICB2aWV3Ll9hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5wb29sLnB1c2godmlldyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmlld1Bvb2w7XG4iLCJ2YXIgXyAgICAgICAgICAgICAgID0gcmVxdWlyZShcInVuZGVyc2NvcmVcIiksXG4gICAgbG9nICAgICAgICAgICAgID0gcmVxdWlyZShcImxvZ2xldmVsXCIpLFxuICAgICQgICAgICAgICAgICAgICA9IHJlcXVpcmUoXCJ1bm9waW5pb25hdGVcIikuc2VsZWN0b3IsXG4gICAgVmlld1Bvb2wgICAgICAgID0gcmVxdWlyZShcIi4vVmlld1Bvb2xcIiksXG4gICAgVmlld1RlbXBsYXRlICAgID0gcmVxdWlyZShcIi4vVmlld1wiKSxcbiAgICB2aWV3VHlwZVJlZ2V4ICAgPSBuZXcgUmVnRXhwKCdeJyArIFZpZXdUZW1wbGF0ZS5wcm90b3R5cGUuX3ZpZXdDc3NQcmVmaXgpO1xuXG52YXIgc3VidmlldyA9IGZ1bmN0aW9uKG5hbWUsIHByb3RvVmlld1Bvb2wsIGNvbmZpZykge1xuICAgIHZhciBWaWV3UHJvdG90eXBlO1xuXG4gICAgaWYoIW5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vUmV0dXJuIFZpZXcgb2JqZWN0IGZyb20gRE9NIGVsZW1lbnRcbiAgICBlbHNlIGlmKG5hbWUubm9kZVR5cGUgfHwgbmFtZS5qcXVlcnkpIHtcbiAgICAgICAgcmV0dXJuIChuYW1lLmpxdWVyeSA/IG5hbWVbMF0gOiBuYW1lKVtzdWJ2aWV3Ll9kb21Qcm9wZXJ0eU5hbWVdIHx8IG51bGw7XG4gICAgfVxuICAgIC8vRGVmaW5lIGEgc3Vidmlld1xuICAgIGVsc2Uge1xuICAgICAgICAvL0FyZ3VtZW50IHN1cmdlcnlcbiAgICAgICAgaWYocHJvdG9WaWV3UG9vbCAmJiBwcm90b1ZpZXdQb29sLmlzVmlld1Bvb2wpIHtcbiAgICAgICAgICAgIFZpZXdQcm90b3R5cGUgPSBwcm90b1ZpZXdQb29sLlZpZXc7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25maWcgICAgICAgICAgPSBwcm90b1ZpZXdQb29sO1xuICAgICAgICAgICAgVmlld1Byb3RvdHlwZSAgID0gVmlld1RlbXBsYXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXG4gICAgICAgIC8vVmFsaWRhdGUgTmFtZSAmJiBDb25maWd1cmF0aW9uXG4gICAgICAgIGlmKHN1YnZpZXcuX3ZhbGlkYXRlTmFtZShuYW1lKSAmJiBzdWJ2aWV3Ll92YWxpZGF0ZUNvbmZpZyhjb25maWcpKSB7XG4gICAgICAgICAgICAvL0NyZWF0ZSB0aGUgbmV3IFZpZXdcbiAgICAgICAgICAgIHZhciBWaWV3ICAgICAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICAgICAgICAgICAgc3VwZXJDbGFzcyAgPSBuZXcgVmlld1Byb3RvdHlwZSgpO1xuXG4gICAgICAgICAgICAvL0V4dGVuZCB0aGUgZXhpc3RpbmcgaW5pdCwgY29uZmlnICYgY2xlYW4gZnVuY3Rpb25zIHJhdGhlciB0aGFuIG92ZXJ3cml0aW5nIHRoZW1cbiAgICAgICAgICAgIF8uZWFjaChbJ29uY2UnLCAnaW5pdCcsICdjbGVhbiddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnW25hbWUrJ0Z1bmN0aW9ucyddID0gc3VwZXJDbGFzc1tuYW1lKydGdW5jdGlvbnMnXS5zbGljZSgwKTsgLy9DbG9uZSBzdXBlckNsYXNzIGluaXRcbiAgICAgICAgICAgICAgICBpZihjb25maWdbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnW25hbWUrJ0Z1bmN0aW9ucyddLnB1c2goY29uZmlnW25hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNvbmZpZ1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgVmlldy5wcm90b3R5cGUgICAgICAgPSBfLmV4dGVuZChzdXBlckNsYXNzLCBjb25maWcpO1xuICAgICAgICAgICAgVmlldy5wcm90b3R5cGUudHlwZSAgPSBuYW1lO1xuICAgICAgICAgICAgVmlldy5wcm90b3R5cGUuc3VwZXIgPSBWaWV3UHJvdG90eXBlLnByb3RvdHlwZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy9TYXZlIHRoZSBOZXcgVmlld1xuICAgICAgICAgICAgdmFyIHZpZXdQb29sICAgICAgICA9IG5ldyBWaWV3UG9vbChWaWV3KTtcbiAgICAgICAgICAgIHN1YnZpZXcudmlld3NbbmFtZV0gPSB2aWV3UG9vbDtcblxuICAgICAgICAgICAgcmV0dXJuIHZpZXdQb29sO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5zdWJ2aWV3LnZpZXdzID0ge307XG5cbi8vT2JzY3VyZSBET00gcHJvcGVydHkgbmFtZSBmb3Igc3VidmlldyB3cmFwcGVyc1xuc3Vidmlldy5fZG9tUHJvcGVydHlOYW1lID0gXCJzdWJ2aWV3MTIzNDVcIjtcblxuLyoqKiBBUEkgKioqL1xuc3Vidmlldy5sb2FkID0gZnVuY3Rpb24oc2NvcGUpIHtcbiAgICB2YXIgJHNjb3BlID0gc2NvcGUgPyAkKHNjb3BlKSA6ICQoJ2JvZHknKSxcbiAgICAgICAgJHZpZXdzID0gJHNjb3BlLmZpbmQoXCJbY2xhc3NePSdzdWJ2aWV3LSddXCIpLFxuICAgICAgICBmaW5kZXIgPSBmdW5jdGlvbihjKSB7XG4gICAgICAgICAgICByZXR1cm4gYy5tYXRjaCh2aWV3VHlwZVJlZ2V4KTtcbiAgICAgICAgfTtcblxuICAgIGZvcih2YXIgaT0wOyBpPCR2aWV3cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZWwgPSAkdmlld3NbaV0sXG4gICAgICAgICAgICBjbGFzc2VzID0gZWwuY2xhc3NOYW1lLnNwbGl0KC9cXHMrLyk7XG5cbiAgICAgICAgdHlwZSA9ICBfLmZpbmQoY2xhc3NlcywgZmluZGVyKS5yZXBsYWNlKHZpZXdUeXBlUmVnZXgsICcnKTtcblxuICAgICAgICBpZih0eXBlICYmIHRoaXMudmlld3NbdHlwZV0pIHtcbiAgICAgICAgICAgIHRoaXMudmlld3NbdHlwZV0uc3Bhd24oJHZpZXdzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihcInN1YnZpZXcgJ1wiK3R5cGUrXCInIGlzIG5vdCBkZWZpbmVkLlwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuc3Vidmlldy5sb29rdXAgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgaWYodHlwZW9mIG5hbWUgPT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlld3NbbmFtZV07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZihuYW1lLmlzVmlld1Bvb2wpIHtcbiAgICAgICAgICAgIHJldHVybiBuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYobmFtZS5pc1ZpZXcpIHtcbiAgICAgICAgICAgIHJldHVybiBuYW1lLnBvb2w7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuc3Vidmlldy5fdmFsaWRhdGVOYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGlmKCFuYW1lLm1hdGNoKC9eW2EtekEtWjAtOVxcLV9dKyQvKSkge1xuICAgICAgICBsb2cuZXJyb3IoXCJzdWJ2aWV3IG5hbWUgJ1wiICsgbmFtZSArIFwiJyBpcyBub3QgYWxwaGFudW1lcmljLlwiKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmKHN1YnZpZXcudmlld3NbbmFtZV0pIHtcbiAgICAgICAgbG9nLmVycm9yKFwic3VidmlldyAnXCIgKyBuYW1lICsgXCInIGlzIGFscmVhZHkgZGVmaW5lZC5cIik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnN1YnZpZXcuX3Jlc2VydmVkTWV0aG9kcyA9IFtcbiAgICAnaHRtbCcsXG4gICAgJ3JlbW92ZScsXG4gICAgJ3RyaWdnZXInXG5dO1xuXG5zdWJ2aWV3Ll92YWxpZGF0ZUNvbmZpZyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBzdWNjZXNzID0gdHJ1ZTtcblxuICAgICQuZWFjaChjb25maWcsIGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGlmKHN1YnZpZXcuX3Jlc2VydmVkTWV0aG9kcy5pbmRleE9mKG5hbWUpICE9IC0xKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiTWV0aG9kICdcIituYW1lK1wiJyBpcyByZXNlcnZlZCBhcyBwYXJ0IG9mIHRoZSBzdWJ2aWV3IEFQSS5cIik7XG4gICAgICAgICAgICBzdWNjZXNzID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZihuYW1lLm1hdGNoKC9eXy8pKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVGhlIF8gcHJlZml4ZWQgbmFtZS1zcGFjZSBpcyByZXNlcnZlZCBmb3IgaW50ZXJuYWwgc3VidmlldyBtZXRob2RzLlwiKTtcbiAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN1Y2Nlc3M7XG59O1xuXG5zdWJ2aWV3LmluaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgTWFpbiA9IHN1YnZpZXcubG9va3VwKCdtYWluJyk7XG5cbiAgICBpZihNYWluKSB7XG4gICAgICAgIHN1YnZpZXcubWFpbiA9IE1haW4uc3Bhd24oKTtcbiAgICAgICAgc3Vidmlldy5tYWluLiR3cmFwcGVyLmFwcGVuZFRvKCdib2R5Jyk7XG4gICAgfVxufTtcblxuLyoqKiBFeHBvcnQgKioqL1xud2luZG93LnN1YnZpZXcgPSBtb2R1bGUuZXhwb3J0cyA9IHN1YnZpZXc7XG5cbiQoZnVuY3Rpb24oKSB7XG4gICAgaWYoIXN1YnZpZXcubm9Jbml0KSB7XG4gICAgICAgIHN1YnZpZXcuaW5pdCgpO1xuICAgIH1cbn0pO1xuIiwidmFyIHNpbm9uICAgPSByZXF1aXJlKCdzaW5vbicpLFxuICAgIF8gICAgICAgPSByZXF1aXJlKCd1bmRlcnNjb3JlJyksXG4gICAgJCAgICAgICA9IHJlcXVpcmUoXCJ1bm9waW5pb25hdGVcIikuc2VsZWN0b3IsXG4gICAgbW9kdWxlICA9IHdpbmRvdy5tb2R1bGUsXG4gICAgc3VidmlldyA9IHJlcXVpcmUoJy4uL3NyYy9tYWluJyksXG4gICAgc2FuZGJveDtcblxudmFyIHRlc3RTdWJ2aWV3ID0gc3VidmlldygndGVzdCcpO1xuXG5cblxuXG4vKioqIHN1YnZpZXcgT2JqZWN0ICoqKi9cblxubW9kdWxlKFwic3Vidmlld1wiKTtcblxudGVzdCgnc3VidmlldygpIGdldCB2aWV3IGZyb20gbm9kZScsIGZ1bmN0aW9uKCkge1xuICAgIGRlZXBFcXVhbChzdWJ2aWV3KCQoJ2JvZHknKVswXSksIG51bGwsICdFbGVtZW50IHdpdGhvdXQgYm91bmQgdmlldycpO1xuICAgIGRlZXBFcXVhbChzdWJ2aWV3KCQoJ2JvZHknKSksIG51bGwsICdKcXVlcnkgb2JqZWN0cyB3b3JrJyk7XG5cbiAgICB2YXIgdGVzdGVyID0gdGVzdFN1YnZpZXcuc3Bhd24oKTtcbiAgICBkZWVwRXF1YWwoc3Vidmlldyh0ZXN0ZXIud3JhcHBlciksIHRlc3RlciwgJ1JldHVybnMgY29ycmVjdCBlbGVtZW50Jyk7XG59KTtcblxudGVzdCgnc3VidmlldygpIGRlZmluZSBzdWJ2aWV3JywgZnVuY3Rpb24oKSB7XG4gICAgb2soIXN1YnZpZXcoJ3Rlc3QnKSwgXCJJbnZhbGlkIHN1YnZpZXcgZGVmaW5pdGlvblwiKTtcblxuICAgIHZhciB0ZXN0ZXIgPSBzdWJ2aWV3KCd0ZXN0ZXInKTtcbiAgICBvayh0ZXN0ZXIsIFwiU3VidmlldyBzdWNjZXNzZnVsbHkgY3JlYXRlZFwiKTtcbiAgICBkZWVwRXF1YWwodGVzdGVyLCBzdWJ2aWV3LnZpZXdzLnRlc3RlciwgXCJTdWJ2aWV3IHN1Y2Nlc3NmdWxseSByZWdpc3RlcmVkXCIpO1xuXG4gICAgb2sodGVzdGVyLnN1cGVyLCBcIlN1cGVyIGlzIGJvdW5kIHRvIHRoZSB2aWV3XCIpO1xuXG4gICAgdmFyIHN1YlRlc3RlciA9IHN1YnZpZXcoJ3N1YnRlc3RlcicsIHRlc3Rlcik7XG4gICAgZXF1YWwoc3ViVGVzdGVyLnN1cGVyLnR5cGUsIFwidGVzdGVyXCIsIFwiU3ViVGVzdGVyIGV4dGVuZHMgdGVzdGVyXCIpO1xuXG4gICAgLy9jbGVhbnVwXG4gICAgdGVzdGVyLmRlc3Ryb3koKTtcbiAgICBzdWJUZXN0ZXIuZGVzdHJveSgpO1xufSk7XG5cbnRlc3QoJyNsb2FkJywgZnVuY3Rpb24oKSB7XG4gICAgdmFyICR0ZXN0ZXIgPSAkKFwiPGRpdiBjbGFzcz0ndmlldy10ZXN0Jz5cIikuYXBwZW5kVG8oJ2JvZHknKTtcbiAgICBzdWJ2aWV3LmxvYWQoKTtcbiAgICBvayhzdWJ2aWV3KCR0ZXN0ZXIpLCBcIlZpZXcgd2FzIHN1Y2Nlc3NmdWxseSBjcmVhdGVkXCIpO1xuXG4gICAgdmFyICR0ZXN0ZXIyID0gJChcIjxkaXYgY2xhc3M9J3ZpZXctdGVzdCc+XCIpLmFwcGVuZFRvKCdib2R5Jyk7XG4gICAgc3Vidmlldy5sb2FkKCdib2R5Jyk7XG4gICAgb2soc3VidmlldygkdGVzdGVyMiksIFwiU2NvcGVkIGxvYWRpbmcgd2FzIHN1Y2Nlc3NmdWxcIik7XG59KTtcblxudGVzdCgnI192YWxpZGF0ZU5hbWUnLCBmdW5jdGlvbigpIHtcbiAgICBvayhzdWJ2aWV3Ll92YWxpZGF0ZU5hbWUoXCJGb28xXCIpLCBcIkJhc2UgQ2FzZVwiKTtcbiAgICBvayghc3Vidmlldy5fdmFsaWRhdGVOYW1lKFwiRm9vJVwiKSwgXCJJbnZhbGlkIGNoYXJhY3RlcnNcIik7XG4gICAgb2soIXN1YnZpZXcuX3ZhbGlkYXRlTmFtZShcInRlc3RcIiksIFwiUHJlLWV4aXN0aW5nIHZpZXdcIik7XG59KTtcblxuXG4vKioqIFZpZXdQb29sICoqKi9cbnZhciB2aWV3UG9vbDtcbm1vZHVsZShcIlZpZXdQb29sXCIsIHtcbiAgICBzZXR1cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHNhbmRib3ggPSBzaW5vbi5zYW5kYm94LmNyZWF0ZSgpO1xuICAgICAgICB2aWV3UG9vbCA9IHN1YnZpZXcoXCJ0ZXN0ZXJcIik7XG4gICAgfSxcbiAgICB0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZpZXdQb29sLmRlc3Ryb3koKTtcbiAgICB9XG59KTtcblxudGVzdChcIiNzcGF3blwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlldyA9IHZpZXdQb29sLnNwYXduKCk7XG4gICAgb2sodmlldywgXCJWaWV3IGNyZWF0ZWRcIik7XG5cbiAgICB2YXIgJGRpdiA9ICQoXCI8ZGl2PlwiKTtcbiAgICB2aWV3ID0gdmlld1Bvb2wuc3Bhd24oJGRpdlswXSk7XG4gICAgZGVlcEVxdWFsKHZpZXcud3JhcHBlciwgJGRpdlswXSwgXCJFbGVtZW50cyBwYXNzZWQgdG8gc3Bhd24gYmVjb21lIHRoZSB3cmFwcGVyXCIpO1xuXG4gICAgJGRpdiA9ICQoXCI8ZGl2PlwiKTtcbiAgICB2aWV3ID0gdmlld1Bvb2wuc3Bhd24oJGRpdik7XG4gICAgZGVlcEVxdWFsKHZpZXcud3JhcHBlciwgJGRpdlswXSwgXCJqUXVlcnkgZWxlbWVudHMgcGFzc2VkIHRvIHNwYXduIGJlY29tZSB0aGUgd3JhcHBlclwiKTtcblxuICAgIHZhciBzYW1lVmlldyA9IHZpZXdQb29sLnNwYXduKCRkaXYpO1xuICAgIGRlZXBFcXVhbCh2aWV3LCBzYW1lVmlldywgXCJSZXR1cm5zIGV4aXN0aW5nIHZpZXcgd2hlbiB0aGUgc2FtZSBlbGVtZW50IGlzIHBhc3NlZCBiYWNrXCIpO1xuXG4gICAgLy9UZXN0IHRoYXQgY29uZmlndXJhdGlvbiBnZXRzIHBhc3NlZCB0byBpbml0IGZ1bmN0aW9uXG4gICAgdmFyIGluaXRTcHkgICA9IHNpbm9uLnNweSgpLFxuICAgICAgICBjb25maWcgICAgPSB7dGVzdDogMX0sXG4gICAgICAgIHBvb2wgICAgICA9IHN1YnZpZXcoXCJhbm90aGVyUG9vbFwiLCB7XG4gICAgICAgICAgICBpbml0OiBpbml0U3B5XG4gICAgICAgIH0pO1xuXG5cbiAgICBwb29sLnNwYXduKCQoXCI8ZGl2PlwiKSwgY29uZmlnKTtcbiAgICBvayhpbml0U3B5LmNhbGxlZFdpdGgoY29uZmlnKSwgXCJDb25maWcgd2l0aCBqcXVlcnkgd29ya3NcIik7XG4gICAgaW5pdFNweS5yZXNldCgpO1xuXG4gICAgcG9vbC5zcGF3bigkKFwiPGRpdj5cIilbMF0sIGNvbmZpZyk7XG4gICAgb2soaW5pdFNweS5jYWxsZWRXaXRoKGNvbmZpZyksIFwiQ29uZmlnIHdpdGggRE9NIHdvcmtzXCIpO1xuICAgIGluaXRTcHkucmVzZXQoKTtcblxuICAgIHBvb2wuc3Bhd24oY29uZmlnKTtcbiAgICBvayhpbml0U3B5LmNhbGxlZFdpdGgoY29uZmlnKSwgXCJDb25maWcgd2l0aCBubyBlbGVtZW50IHdvcmtzXCIpO1xuXG4gICAgcG9vbC5kZXN0cm95KCk7XG5cbn0pO1xuXG50ZXN0KFwiI2V4dGVuZFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3ViVGVzdGVyID0gdmlld1Bvb2wuZXh0ZW5kKCdzdWJUZXN0ZXInKTtcbiAgICBlcXVhbChzdWJUZXN0ZXIuc3VwZXIudHlwZSwgXCJ0ZXN0ZXJcIiwgXCJTdWJUZXN0ZXIgZXh0ZW5kcyB0ZXN0ZXJcIik7XG4gICAgc3ViVGVzdGVyLmRlc3Ryb3koKTtcbn0pO1xuXG50ZXN0KFwiI2Rlc3Ryb3lcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmlld1Bvb2wuZGVzdHJveSgpO1xuICAgIG9rKHN1YnZpZXcoXCJ0ZXN0ZXJcIiksIFwiTmFtZXNwYWNlIGlzIGZyZWVkXCIpO1xuICAgIG9rKCF2aWV3UG9vbC5wb29sLCBcIlBvb2wgaXMgc2V0IHRvIG51bGwgdG8gZnJlZSBSQU1cIik7XG59KTtcblxudGVzdChcIiNfcmVsZWFzZVwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlldyA9IHZpZXdQb29sLnNwYXduKCk7XG4gICAgZGVlcEVxdWFsKHZpZXdQb29sLnBvb2wubGVuZ3RoLCAwLCBcIlBvb2wgaXMgZW1wdHlcIik7XG5cbiAgICB2aWV3UG9vbC5fcmVsZWFzZSh2aWV3KTtcbiAgICBkZWVwRXF1YWwodmlld1Bvb2wucG9vbC5sZW5ndGgsIDEsIFwiUG9vbCBoYXMgb25lIHZpZXcgaW4gaXRcIik7XG59KTtcblxuXG4vKioqIFZpZXcgKioqL1xubW9kdWxlKFwiVmlld1wiLCB7XG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICBzYW5kYm94ID0gc2lub24uc2FuZGJveC5jcmVhdGUoKTtcbiAgICB9XG59KTtcblxudGVzdChcIkluaXRpYWxpemF0aW9uIFByb2Nlc3NcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvbmZpZ1NweSAgID0gc2lub24uc3B5KCksXG4gICAgICAgIHJlbmRlclNweSAgID0gc2lub24uc3B5KCksXG4gICAgICAgIGluaXRTcHkgICAgID0gc2lub24uc3B5KCk7XG5cbiAgICB2YXIgdmlld1Bvb2wgPSBzdWJ2aWV3KFwidGVzdGVyXCIsIHtcbiAgICAgICAgaW5pdDogICBpbml0U3B5LFxuICAgICAgICByZW5kZXI6IHJlbmRlclNweSxcbiAgICAgICAgY29uZmlnOiBjb25maWdTcHlcbiAgICB9KTtcblxuICAgIHZpZXdQb29sLnNwYXduKCk7XG5cbiAgICBvayhjb25maWdTcHkuY2FsbGVkLCBcImNvbmZpZyBjYWxsZWRcIik7XG4gICAgb2socmVuZGVyU3B5LmNhbGxlZCwgXCJyZW5kZXIgY2FsbGVkXCIpO1xuICAgIG9rKGluaXRTcHkuY2FsbGVkLCBcImluaXQgY2FsbGVkXCIpO1xuXG4gICAgb2soY29uZmlnU3B5LmNhbGxlZEJlZm9yZShyZW5kZXJTcHkpLCBcImNvbmZpZyBmaXJlcyBiZWZvcmUgcmVuZGVyXCIpO1xuICAgIG9rKHJlbmRlclNweS5jYWxsZWRCZWZvcmUoaW5pdFNweSksIFwicmVuZGVyIGZpcmVzIGJlZm9yZSBpbml0XCIpO1xuXG4gICAgdmlld1Bvb2wuZGVzdHJveSgpO1xufSk7XG5cbnRlc3QoXCIjaHRtbFwiLCBmdW5jdGlvbigpIHtcblxufSk7XG5cbnRlc3QoXCIjcmVtb3ZlXCIsIGZ1bmN0aW9uKCkge1xuXG59KTtcblxudGVzdChcIiNfZ2V0Q2xhc3Nlc1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlldyA9IHRlc3RTdWJ2aWV3LnNwYXduKCksXG4gICAgICAgIGNsYXNzZXMgPSB2aWV3Ll9nZXRDbGFzc2VzKCk7XG5cbiAgICBvayhjbGFzc2VzLmluZGV4T2YoXCJ2aWV3LXRlc3RcIikgIT09IC0xLCBcIkluY2x1ZGVzIHZpZXctdGVzdFwiKTtcbiAgICBvayhjbGFzc2VzLmluZGV4T2YoXCJ2aWV3XCIpICE9PSAtMSwgXCJJbmNsdWRlcyB2aWV3XCIpO1xufSk7XG5cbnRlc3QoXCIjX3NldENsYXNzZXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXcgPSB0ZXN0U3Vidmlldy5zcGF3bigpO1xuXG4gICAgdmlldy5fc2V0Q2xhc3NlcyhbJ2ZvbycsICdiYXInXSk7XG4gICAgdmFyIGNsYXNzZXMgPSB2aWV3Ll9nZXRDbGFzc2VzKCk7XG5cbiAgICBkZWVwRXF1YWwoY2xhc3Nlcy5sZW5ndGgsIDIsIFwiUmlnaHQgbnVtYmVyIG9mIGNsYXNzZXNcIik7XG4gICAgb2soY2xhc3Nlcy5pbmRleE9mKCdmb28nKSAhPT0gLTEsIFwiSW5jbHVkZXMgZm9vXCIpO1xuICAgIG9rKGNsYXNzZXMuaW5kZXhPZignYmFyJykgIT09IC0xLCBcIkluY2x1ZGVzIGJhclwiKTtcbn0pO1xuXG50ZXN0KFwiI19hZGREZWZhdWx0Q2xhc3Nlc1wiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmlldyA9IHRlc3RTdWJ2aWV3LnNwYXduKCk7XG5cbiAgICB2aWV3XG4gICAgICAgIC5fc2V0Q2xhc3NlcyhbXSlcbiAgICAgICAgLl9hZGREZWZhdWx0Q2xhc3NlcygpO1xuXG4gICAgdmFyIGNsYXNzZXMgPSB2aWV3Ll9nZXRDbGFzc2VzKCk7XG5cbiAgICBvayhjbGFzc2VzLmluZGV4T2YoXCJ2aWV3LXRlc3RcIikgIT09IC0xLCBcIkluY2x1ZGVzIHZpZXctdGVzdFwiKTtcbiAgICBvayhjbGFzc2VzLmluZGV4T2YoXCJ2aWV3XCIpICE9PSAtMSwgXCJJbmNsdWRlcyB2aWV3XCIpO1xufSk7XG5cbi8qKiogVmlldyBSZW5kZXJpbmcgKioqL1xuXG52YXIgc2V0SHRtbDtcbm1vZHVsZShcIlZpZXcgI3JlbmRlclwiLCB7XG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRIdG1sID0gc2lub24uc3B5KCk7XG4gICAgfVxufSk7XG5cbnRlc3QoXCJTdHJpbmcgVGVtcGxhdGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZpZXdQb29sID0gc3VidmlldyhcInRlc3RlclwiLCB7XG4gICAgICAgIGh0bWw6ICAgICAgIHNldEh0bWwsXG4gICAgICAgIHRlbXBsYXRlOiAgIFwiVGhpcyBpcyBhIHN0cmluZ1wiXG4gICAgfSk7XG5cbiAgICB2YXIgdmlldyA9IHZpZXdQb29sLnNwYXduKCk7XG5cbiAgICB2aWV3LnJlbmRlcigpO1xuXG4gICAgb2soc2V0SHRtbC5jYWxsZWRXaXRoKFwiVGhpcyBpcyBhIHN0cmluZ1wiKSwgXCJDb250ZW50IG1hdGNoZXNcIik7XG5cbiAgICB2aWV3UG9vbC5kZXN0cm95KCk7XG59KTtcblxuXG4vKioqIFN0YXRlICoqKi9cblxudmFyIHRlc3RWaWV3O1xubW9kdWxlKFwiU3RhdGVcIiwge1xuICAgIHNldHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2FuZGJveCA9IHNpbm9uLnNhbmRib3guY3JlYXRlKCk7XG4gICAgICAgIHRlc3RWaWV3ID0gdGVzdFN1YnZpZXcuc3Bhd24oKTtcbiAgICB9LFxuICAgIHRlYXJkb3duOiBmdW5jdGlvbigpIHtcblxuICAgIH1cbn0pO1xuXG50ZXN0KFwiI3NldFwiLCBmdW5jdGlvbigpIHtcbiAgICB0ZXN0Vmlldy5zdGF0ZS5zZXQoJ2ZvbycsICdiYXInKTtcblxuICAgIG9rKHRlc3RWaWV3LiR3cmFwcGVyLmhhc0NsYXNzKCdzdGF0ZS1mb28tYmFyJyksIFwiQ2xhc3MgYWRkZWRcIik7XG4gICAgZXF1YWwodGVzdFZpZXcuc3RhdGUuZGF0YS5mb28sICdiYXInLCBcIkF0dHJpYnV0ZSBzZXRcIik7XG59KTtcblxudGVzdChcIiNnZXRcIiwgZnVuY3Rpb24oKSB7XG4gICAgdGVzdFZpZXcuc3RhdGUuc2V0KCdmb28nLCAnYmFyJyk7XG4gICAgZXF1YWwodGVzdFZpZXcuc3RhdGUuZ2V0KCdmb28nKSwgJ2JhcicsIFwiZ2V0IHdvcmtzXCIpO1xufSk7XG5cbnRlc3QoXCIjcmVtb3ZlXCIsIGZ1bmN0aW9uKCkge1xuICAgIHRlc3RWaWV3LnN0YXRlLnNldCgnZm9vJywgJ2JhcicpO1xuICAgIHRlc3RWaWV3LnN0YXRlLnJlbW92ZSgnZm9vJyk7XG5cbiAgICBlcXVhbCh0ZXN0Vmlldy5zdGF0ZS5nZXQoJ2ZvbycpLCB1bmRlZmluZWQsIFwicmVtb3ZlZCBmb29cIik7XG4gICAgb2soIXRlc3RWaWV3LiR3cmFwcGVyLmhhc0NsYXNzKCdzdGF0ZS1mb28tYmFyJyksIFwiY2xhc3MgcmVtb3ZlZFwiKTtcbn0pO1xuXG50ZXN0KFwiI2JpbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNhbGxiYWNrID0gc2lub24uc3B5KCk7XG4gICAgdGVzdFZpZXcuc3RhdGUuYmluZCgnZm9vJywgY2FsbGJhY2spO1xuICAgIHRlc3RWaWV3LnN0YXRlLnNldCgnZm9vJywgJ2JhcicpO1xuXG4gICAgb2soY2FsbGJhY2suY2FsbGVkLCBcIkNhbGxiYWNrIGNhbGxlZFwiKTtcbiAgICBvayhjYWxsYmFjay5jYWxsZWRXaXRoKCdiYXInKSwgXCJDb3JyZWN0IGFyZ3VtZW50IHBhc3NlZCB0byBjYWxsYmFja1wiKTtcbn0pO1xuXG50ZXN0KFwiI3VuYmluZFwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBzaW5vbi5zcHkoKTtcbiAgICB0ZXN0Vmlldy5zdGF0ZS5iaW5kKCdmb28nLCBjYWxsYmFjayk7XG4gICAgdGVzdFZpZXcuc3RhdGUudW5iaW5kKCdmb28nKTtcbiAgICB0ZXN0Vmlldy5zdGF0ZS5zZXQoJ2ZvbycsICdiYXInKTtcblxuICAgIG9rKCFjYWxsYmFjay5jYWxsZWQsIFwiQ2FsbGJhY2sgZGlkbid0IGZpcmUuXCIpO1xufSk7XG5cbnRlc3QoXCIjdHJpZ2dlclwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2FsbGJhY2sgPSBzaW5vbi5zcHkoKTtcbiAgICB0ZXN0Vmlldy5zdGF0ZS5zZXQoJ2ZvbycsICdiYXInKTtcbiAgICB0ZXN0Vmlldy5zdGF0ZS5iaW5kKCdmb28nLCBjYWxsYmFjayk7XG4gICAgdGVzdFZpZXcuc3RhdGUudHJpZ2dlcignZm9vJyk7XG5cbiAgICBvayhjYWxsYmFjay5jYWxsZWQsIFwiQ2FsbGJhY2sgY2FsbGVkXCIpO1xuICAgIG9rKGNhbGxiYWNrLmNhbGxlZFdpdGgoJ2JhcicpLCBcIkNvcnJlY3QgYXJndW1lbnQgcGFzc2VkIHRvIGNhbGxiYWNrXCIpO1xufSk7XG5cbnRlc3QoXCIjYXNrUGFyZW50XCIsIGZ1bmN0aW9uKCkge1xuXG59KTtcblxudGVzdChcIiN0ZWxsUGFyZW50XCIsIGZ1bmN0aW9uKCkge1xuXG59KTtcblxudGVzdChcIiNsaXN0ZW5cIiwgZnVuY3Rpb24oKSB7XG5cbn0pO1xuXG50ZXN0KFwiI19oZWFyXCIsIGZ1bmN0aW9uKCkge1xuXG59KTtcblxudGVzdChcIiNfc2V0RGVmYXVsdHNcIiwgZnVuY3Rpb24oKSB7XG5cbn0pO1xuXG50ZXN0KFwiI19nZXRTdGF0ZUNsYXNzZXNcIiwgZnVuY3Rpb24oKSB7XG5cbn0pO1xuXG5cbiJdfQ==
