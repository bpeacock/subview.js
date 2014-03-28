Subview.js [![Build Status](https://travis-ci.org/bpeacock/subview.js.svg?branch=master)](https://travis-ci.org/bpeacock/subview.js)
==================================

Subview.js is a minimalistic hierarchical view framework designed to be highly modular, highly extensible and very efficient for applications containing thousands of views.  The last point makes subview an excellent choice for complex user interfaces that are redrawn often such as word processors, messengers and other single-page web-apps.  Subview *is not and will never be* a complete MVC framework but rather a View/Controller module designed to be used in conjunction with a Data Model.

### Features:
- Extensible Views
- Hierarchically Scoped Events
- Elegant Templating with Your Favorite Engine (Handlebars, Underscore, EJS or Jade)
- Efficient View Management Through Object Pools


Installation
------------

```bash
npm install subview
```

Basic Usage
-----------

```javascript
subview('main', {

    /*** Life-Cycle Methods ***/
    once: function() {
        //Runs the first time a subview is created then never again.
    },
    init: function() {
        //Stuff to be done when initializing a subview via the .spawn method
    },
    clean: function() {
        //Runs when a subview is removed to clean and prepare it to be reused
    },

    /*** Templating ***/
    template: Handlebars.compile(myTemplate),
    subviews: {     //Subviews that will be available in the template
        name: SomeSubview
    },
    data: {         //Data available in the template (may also be a function)
        key: "value"
    },

    /*** Extensions ***/
    myExtension: myExtension({

    }),

    /*** My API ***/

    // ... Some API Functions
});
```

A simple example is available [here](examples).


subview.js Extensions
---------------------

Subviews can include third party functionality via composition (extensions) or inheritance from another subview. 

### Using Extensions

Subview extensions are added as properties of a subview and are given the namespace you assign. The extension itsself is a function that is called with a configuration object, with properties that depend on the individual extension. See the example below:

```javascript
subview('main', {
    init: function() {
        this.foo.bar();
    },
    foo: myExtension({
        config: 'property'
    })
});
```


### Available Extensions

- [State](https://github.com/bpeacock/subview-state.js) - Adds a state model to your subview that can be bound to and is reflected by CSS classes applied to the `$wrapper`. This is very useful for UI state changes such as hiding and showing a side bar.

Submit a pull request to add your extension to the list!


### Writing Extensions

Subview extensions are created with the `subview.extension` method:

```javascript
module.exports = window.subview.extension({
    init: function(config, view) {

    }
    // ... more methods
});
```

At the moment extensions have only an `init` method that passes user configuration and the view it applies to its-self.  In the future, this will be extended to include bindings to subview life-cycle methods such as `once`, `preRender`, `postRender` and `clean`.  In all of the extension's methods `this` refers to the local scope of the extension NOT the subview that it is extending. This property gives extensions their own unique namespace preventing conflicts with multiple extensions. **Make sure to use the instance of subview on the global (window) object to ensure that your extension is built using whatever version of subview is present on the page.**


Philosophy
----------

Duties:

1. Render the application
2. Execute functions that define UI logic
3. ~~Store application state~~ Moved to the [State Extension](https://github.com/bpeacock/subview-state.js).
4. ~~Provide event bindings for application state change~~ Provide Event Bindings for inner-app communication.
5. Manage View Object pools

Tenets: 

1. App interfaces should be organized into a hierarchical sub-view structure.
2. This hierarchy should be defined only in the current state of the DOM.  i.e. a subview is defined as a view that is a child of view's wrapper DOM element.
3. These views should all inherit a set of basic methods and properties.
4. Views should support event broadcasting.
5. Event listeners should be directional. i.e. listen to children, parents, siblings or global.
6. Views should be recycled automatically using an Object Pool.
7. Templating should be supported in such a way that it can be done both server side & client side.
8. Given a DOM element, you should be able to get it's corresponding view.
9. No magical re-rendering of templates or DOM changes.  This is essential for high-performance apps where the developer wants to control every single DOM render.
10. Views should be able to be extended while preserving critical functionality of their parent class.


Development
-----------

To build: `grunt build`

To watch: `grunt watch`

To test: `grunt test`


