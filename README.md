subview.js
==========

A hierarchical view framework.

THIS IS AN UNSTABLE 0.0.x RELEASE

To install
----------

```bash
npm install subview
```

Basic Usage
-----------

```javascript
subview('main', {

    /*** Main Methods ***/
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
    myExtension: myExtension({

    })
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

Subview extensions are [factory](http://en.wikipedia.org/wiki/Factory_method_pattern) functions that should return an instance of your extension. In order to be recognized as a subview extension, **the extension must have the property `isSubviewExtension` set to `true`**.  Below is a basic template for an extension:

```javascript
//The Extension itself
var MyExtension = function(view) {
    this.view = view;
};

MyExtension.prototype = {
    foo: function() {
        //Alert the type of the subview that has loaded the extension
        alert(this.view.type); 
    }
};

//The Extension factory that is returned
var extension = function(config) {
    return new MyExtension(this);
};

extension.isSubviewExtension = true;

module.exports = extension;
```

Notice that the extension above uses an object with `prototype` methods to create the extension. This is preferred for efficiency and should be considered a best practice.


Philosophy
----------

Duties:

1. Render the application
2. Execute functions that define UI logic
3. ~~Store application state~~
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


