---
title:      Quick Start
categories: section
---

The base for a Subview.js application is the definition of the `main` subview. This is the only subview that is automatically appended to the `body` of your application.  Other subviews are added to the `main` subview using a template or direct DOM manipulation.

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
