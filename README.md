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
    4. Views should have a state that is reflected in DOM classes and supports event binding.  These events should be scoped to only effect the children of a view.
    5. Views should be recycled automatically using an Object Pool.
    6. Templating should be supported in such a way that it can be done both server side & client side.
    7. Given a DOM element, you should be able to get it's corresponding view.
    8. No magical re-rendering of templates or DOM changes.  This is essential for high-performance apps where the developer wants to control every single DOM render.
    9. init functions should not fire until the document is ready since views deal with the DOM by their very nature.

Every view has in its prototype chain a state.
----------------------------------------------

    State = {
        add(propertyName, default)
        remove(propertyName, default)
        set(propertyName, value)
            - Changes the state of the current view
            - Signals the change to all sub-views
            - State class is added

        get(propertyName)
        bind(propertyName, callback(value))
        update()
            - Updates state to reflect css .state-[key]-[value] classes in the DOM
    };

Markup for views
----------------

<div class='view view-app state-pane-page'>
    <div class='view view-signin'></div>
    <div class='view view-page'>
        <div class='view view-toolbar'></div>
    </div>
</div>

- Classes are used instead of data attributes for efficiency
- All states are reflected in the DOM as classes (can be used for styling)
- The DOM is parsed on startup for views and view objects are initialized and bound to DOM elements.

View Templateing
----------------

Views should include templates in a templating language.


View Scripts Should Take this Format
------------------------------------

View = {
    attributes
    methods
};

To install
----------

```bash
npm install
```

To Build
----------------

```bash
grunt browserify
```

```bash
grunt watch
```


