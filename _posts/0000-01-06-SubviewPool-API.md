---
title:      SubviewPool API
categories: section
---

`SubviewPool`s are returned from the [`subview()`](#subview) function and are responsible for managing subviews, including recycling through pooling.

### <a name='SubviewPool.spawn'>`SubviewPool.spawn( {config [object]} )`</a>

```javascript
var Pool = subview('my-subview'),
    instance = Pool.spawn();

instance.$wrapper.appendTo('body'); //Actually puts the Subview Pool
```

Creates a [`Subview`](#Subview-API) instance from the subview template defined by the [`subview()`](#subview) function. This instance is initialized but not appended to the DOM. You can add a subview instance to the DOM by manipulating [`Subview.$wrapper`](#Subview.$wrapper) or [`Subview.wrapper`](#Subview.wrapper) properties. Note that an instance returned from `SubviewPool.spawn` is not necessarily brand new but could have been recycled after being removed using [`Subview.remove`](#Subview.remove) and subsequently cleaned by [`Subview.clean`](#Subview.clean) (See [Subview Life-Cycle](#Subview-Life-Cycle) for details).

The `config` object is an optional object that is passed to the [`Subview.once`](#Subview.once), [`Subview.init`](#Subview.init) and [`Subview.clean`](#Subview.clean) functions.

<section class='best-practice'>
    <strong>Best Practice:</strong> In most cases it is unnecessary to use the `SubviewPool.spawn` method since subviews can easily be inserted using [templating](#Subview-Templating).  `SubviewPool.spawn` is instead used when for some reason it is necessary to have a direct reference to a subview instance.
</section>


### <a name='SubviewPool.extend'>`SubviewPool.extend(name [string], {definition [object]})`</a>

Extends a subview template and returns a new `SubviewPool` object.  `SubviewPool.extend` takes the same arguments as the [`subview`](#subview) function.  In most cases, methods and properties present in the `definition` object will overwrite those of the template being extended.  However, life-cycle functions such as [`once`](#Subview.once), [`init`](#Subview.init) and [`clean`](#Subview.clean) will be extended in order to preserve core functionality of the superclass.

```javascript
var A = subview('A', {
    init: function() {
        //This will be called on initialization for A & B (life-cycle function)
    },
    foo: function() {
        //This will be available for A
    },
    bar: function() {
        //This will be available on A & B
    }
});

var B = SuperClass.extend('B', {
    init: function() {
        //This will be called on initialization for B
    },
    foo: function() {
        //This will overwrite A.foo
    },
    chu: function() {
        //This will only be available on B
    }
});
```


### <a name='SubviewPool.Subview'>`SubviewPool.Subview`</a>
Stores the `prototype` object for the subview template.


### <a name='SubviewPool.type'>`SubviewPool.type`</a>
Stores the name of the subview template.

### <a name='SubviewPool.super'>`SubviewPool.super`</a>
Stores a reference to the super-class of the subview template.


### <a name='SubviewPool.isSubviewPool'>`SubviewPool.isSubviewPool = true`</a>
Simply used to identify that an object is a SubviewPool.


### <a name='SubviewPool.destroy'>`SubviewPool.destroy()`</a>
Destroys a SubviewPool.  This is rarely used in applications but can be useful for testing.





