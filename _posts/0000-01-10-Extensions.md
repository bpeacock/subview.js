---
title:      Extensions
categories: section
---

Subviews can include third-party functionality compositionally with extensions or by inheritance from another subview (subview.extend()). 

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

Submit a pull request [here](https://github.com/bpeacock/subview.js/tree/gh-pages) to add your extension to the list!


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
