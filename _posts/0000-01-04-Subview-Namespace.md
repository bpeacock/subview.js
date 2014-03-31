---
title:      Subview Namespace
categories: section
---

The core of Subview.js is the definition of reusable subview templates. Calling `subview()` defines a subview template and returns a [`SubviewPool`](#SubviewPool-API) object. [`Subview`](#Subview-API) instances, which can be added to the DOM, are created by calling the `SubviewPool.spawn()` method or by passing a `SubviewPool` into a [template](#Subview-templating).

### <a name='subview' data-menu='subview()'>`subview(name [string], {definition [object]})`</a>

```javascript
subview('my-subview', {
    init: function() {
        ...
    },
    foo: function() {
        ...
    }
})
```

Defines a subview template with the given `name` and the methods and properties provided in the `definition`. The `definition` contains methods and properties from the [`Subview API`](#Subview-API) along with additional methods and properties for the object. These methods and properties will be present on the `prototype` of the subview instances.

The `name` may contain letters, numbers, "-"" and "_".  In addition, the `name` will form a CSS class of form `.subview-{name}` that will be applied to every instance of the subview along with any subviews sub-classed from the subview definition. In addition to the specific named subview classes, the class `.subview` will be added to every subview DOM element.


### `subview(element [DOM element or jQuery object])`

```javascript
subview($('.view-main')).foo();
```

The `subview` function is overloaded to provide a method for getting the subview instance associated with a given DOM element or jQuery object (`element`).


### <a name='subview.lookup()' data-menu='subview.lookup'>`subview.lookup(name [string])`</a>

```javascript
var newInstance = subview.lookup('my-subview').spawn();
```

Returns the [`SubviewPool`](#SubviewPool-API) object with the given `name`.


### <a name='subview.extension()' data-menu='subview.extension'>`subview.extension(extensionConfig [object])`</a><div class='advanced'></div>

Used to define a subview extension.  See [extensions](#extensions) below for more details.


### <a name='subview.init()' data-menu='subview.init'>`subview.init()`</a><div class='advanced'></div>

Appends the `main` subview to the document.  This function fires automatically unless the [`subview.noInit`](#subview.noInit) property is set to `true`.


### <a name='subview.noInit' data-menu='subview.noInit'>`subview.noInit = true`</a><div class='advanced'></div>

A boolean property that determines if the `main` subview is to be immediately appended to the `document` when ready.  This is useful in cases where jQuery/Zepto's ready function does not actually represent a ready `document` state, such as when using Subview with PhoneGap.  Note that the `main` subview will not be added to the `document` until [`subview.init`](#subview.init) is called.

```javascript
subview.noInit = true;

onReady(function() {
    subview.init();
});
```

### <a name='subview.subviews' data-menu='subview.subviews'>`subview.subviews`</a><div class='advanced'></div>

An object dictionary containing SubviewPools listed with their names as the keys. Best practice is to use [`subview.lookup`](#subview.lookup) rather than directly referencing `subview.subviews`.


