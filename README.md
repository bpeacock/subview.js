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
    init: function() {
        //Stuff to be done when initializing a subview via the .spawn method
    },

    /*** Templating ***/
    template: Handlebars.compile(myTemplate),
    subviews: [ //Subviews that will be available in the template
        AnotherSubview
    ],
    data: { //Data available in the template (may also be a function)
        "key": "value"
    },

    /*** ***/
    clean: function() {
        //Runs when a subview is removed to clean and prepare it to be reused
    },
    build: function() {
        //Runs after every render
    }
});
```

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


