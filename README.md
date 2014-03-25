subview.js
==========

A hierarchical view framework

Duties:
1. Render the application
2. Execute functions that define UI logic
3. Store application state
4. Provide event bindings for application state change
5. Manage View Object pools

Tenets: 
1. App interfaces should be organized into a hierarchical sub-view structure.
2. This hierarchy should be defined only in the current state of the DOM.  i.e. a subview is defined as a view that is a child of view's wrapper DOM element.
3. These views should all inherit a set of basic methods and properties.
4. Views should support events broadcasting.
5. Event listeners should be directional. i.e. listen to children, parents, siblings or global.
6. Views should be recycled automatically using an Object Pool.
7. Templating should be supported in such a way that it can be done both server side & client side.
8. Given a DOM element, you should be able to get it's corresponding view.
9. No magical re-rendering of templates or DOM changes.  This is essential for high-performance apps where the developer wants to control every single DOM render.
10. init functions should not fire until the document is ready since views deal with the DOM by their very nature.


To install
----------

```bash
npm install
```

To Build
--------

```bash
grunt browserify
```

```bash
grunt watch
```


