---
title:      Quick Start
categories: section
---

The base for a Subview.js application is the definition of the `main` view using the [`subview`](#subview) function. This is the only view that is automatically appended to the `<body>` of your application.  Other views are added to the `main` view using a [template](#Subview-Templating) or by direct DOM manipulation.

```javascript
subview('main', {

    /*** Life-Cycle Methods ***/
    once: function() {
        //Runs the first time a subview is created then never again.
    },
    init: function() {
        //Runs when initializing a subview via the .spawn method
    },
    clean: function() {
        //Runs when a subview is removed to clean and prepare it to be reused
    },

    /*** Templating ***/
    template: Handlebars.compile("\
        Hello World!\
        This {{ noun }} is {{ adjective }}!\
        {{{ subview.content }}}\
    "),
    subviews: {     //Subviews that will be available in the template
        content: SomeSubview
    },
    data: {         //Data available in the template (may also be a function)
        adjective:  "excellent",
        noun:       "framework"
    },

    /*** Extensions ***/
    myExtension: myExtension({

    }),

    /*** My View's API ***/

    // ... Some API Functions
});
```
