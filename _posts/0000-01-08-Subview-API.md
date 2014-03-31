---
title:      Subview API
categories: section
---

### <a name='Subview-Life-Cycle'>Life-Cycle Methods</a>

#### <a name='Subview.once' data-menu='Subview.once()''>`Subview.once({config})`</a><div class='extension-function'>Extends Parent's Method</div>
Fired exactly once when the subview is initialized. `config` is optionally passed through from the [`SubviewPool.spawn`](#SubviewPool.spawn) method.

<section class='best-practice'>
    <strong>Best Practice:</strong> Use the `Subview.once` function in cases such as:
    <ul>
       <li>Event delegation for DOM events within the `$wrapper`</li>
    </ul>
</section>


#### <a name='Subview.init' data-menu='Subview.init()'>`Subview.init({config})`</a><div class='extension-function'>Extends Parent's Method</div>
Fires every time the subview is spawned. This may happen multiple times per subview since subviews are recycled in a pool when they are [removed](#Subview.remove). `config` is optionally passed through from the [`SubviewPool.spawn`](#SubviewPool.spawn) method.

<section class='important'>
    <strong>Important:</strong> Do not use `Subview.init` for anything that depends on elements created in the [`template`](#Subview.template).  Instead use [`Subview.postRender`](#Subview.postRender) which fires after every [render event](#Subview.render).
</section>

<section class='best-practice'>
    <strong>Best Practice:</strong> Use the `Subview.init` function for things like:
    <ul>
       <li>Data Model Bindings</li>
    </ul>
</section>


#### <a name='Subview.clean' data-menu='Subview.clean()'>`Subview.clean()`</a><div class='extension-function'>Extends Parent's Method</div>
Fires when the subview is [removed](#Subview.remove). This function is responsible for cleaning up any bindings created in the init function.

<section class='important'>
    <strong>Important:</strong> Make sure to clean up any event bindings created in [`Subview.init`](#Subview.init).
</section>


#### <a name='Subview.remove' data-menu='Subview.remove()'>`Subview.remove()`</a><div class='static'></div><div class='chainable'></div>
Removes the subview and returns it to the pool of available subviews to be recycled. Triggers [`Subview.clean`](#Subview.clean).


#### <a name='Subview.active' data-menu='Subview.active'>`Subview.active [boolean]`</a><div class='static'></div>
A boolean indicated whether or not the subview is in use or in the pool waiting to be spawned.



### <a name='Subview-Templating'>Templating</a>

#### <a name='Subview.template' data-menu='Subview.template'>`Subview.template = ""`</a>
A template to render inside the `$wrapper`. The template can be a plain HTML string or a **compiled** [Handlebars](http://handlebarsjs.com/), [Underscore](http://underscorejs.org/), [EJS](http://embeddedjs.com/) or [Jade](http://jade-lang.com/) template. [`Subview.data`](#Subview.data) will be passed in to the template along with a special attribute `subview` that contains subviews & SubviewPools listed in [`Subview.subviews`]. 

<section class='important'>
    <strong>Important:</strong> Make sure to use unescaped values for inserting subviews and SubviewPools with templates:
    <ul>
        <li>**Handelbars** - `{% raw %}{{{ subview.mySubview }}}{% endraw %}`</li>
        <li>**Underscore** & **EJS** - `<%- subview.mySubview %>`</li>
        <li>**Jade** - `div!= subview.mySubview`</li>
    </ul>
</section>

```javascript
var Li = subview('special-li', {
        tagName: 'li'
    }),
    Content = subview('content'),
    content = Content.spawn();

subview('main', {
    template: Handlebars.compile("\ {% raw %}
        {{ msg }}\
        <article>\
            {{{ content }}}\
        </article>\
        <ul>\
            {{{ Li }}},\
            {{{ Li }}}\
        </ul>\ {% endraw %}
    "),
    data: {
        msg: "Hello World!"
    },
    subviews: {
        Li:      Li,      // A SubviewPool that will spawn subview instances wherever inserted
        content: content  // An instance of Content to be inserted into the template
    }
});
```

Will render in the `<body>`:

```html
<div class='subview subview-main'>
    Hello World!
    <article>
        <div class='subview subview-content'></div>
    </article>
    <ul>
        <li class='subview subview-special-li'></li>
        <li class='subview subview-special-li'></li>
    </ul>
</div>
```

<section class='best-practice'>
    <strong>Best Practice:</strong> Write templates in a separate file and include them using CommonJS/[Browserify](http://browserify.org/) or [RequireJS](http://requirejs.org/).
</section>


#### <a name='Subview.data' data-menu='Subview.data'>`Subview.data = {}` [object or function]</a>
Data to be passed into the template. May be an object or a function that returns an object and recieves the config passed to [`SubviewPool.spawn`](#SubviewPool.spawn) as its only argument. Note that the `subview` property is reserved for passing subviews into the template using [`Subview.subviews`](#Subview.subviews).

```javascript
subview('some-subview', {
    template: Handlebars.compile("\ {% raw %}
        {{ key }}\
        {{ hi }}\ {% endraw %}
    ")
    data: function(config) {
        return {
            key: config.value,
            hi:  'there'
        };
    }
});
```

<section class='important'>
    <strong>Important:</strong> If you are going to use a data function, remember that by default the subview is only rendered once at the begining of its life. If you wish to update the template with each spawn, set [`Subview.reRender`](#Subview.reRender) to `true` or manually call the [`Subview.render`](#Subview.render) function.
</section>


#### <a name='Subview.subviews' data-menu='Subview.subviews'>`Subview.subviews = {}`</a>
An object that contains subviews and SubviewPools that will be passed to the [template](#Subview.template) as `subview.{key}`.  See [`Subview.template`](#Subview.template) for a usage example.


#### <a name='Subview.tagName' data-menu='Subview.tagName'>`Subview.tagName = "div"`</a>
The html element type that will be created for the subview's [`wrapper`](#Subview.wrapper). Defaults to `"div"`.

#### <a name='Subview.className' data-menu='Subview.className'>`Subview.className = ""`</a>
Extra class name(s) to be added to the subview's [`wrapper`](#Subview.wrapper).

```javascript
subview('main', {
    className: "class1 class2 class3"
});
```

Results in:

```html
<div class="class1 class2 class3 subview subview-main"></div>
```


#### <a name='Subview.preRender' data-menu='Subview.preRender()'>`Subview.preRender()`</a>
A callback that fires before [rendering](#Subview.render).

<section class='best-practice'>
    <strong>Best Practice:</strong> Use this function to destroy event bindings created in [`Subview.postRender`](#Subview.postRender).
</section>

#### <a name='Subview.postRender' data-menu='Subview.postRender()'>`Subview.postRender()`</a>
A callback that fires after [rendering](#Subview.render).

<section class='best-practice'>
    <strong>Best Practice:</strong> Use this function for anything that references elements created in the template:
    <ul>
        <li>Manual DOM manipulation and Data additions</li>
        <li>Direct DOM event bindings</li>
        <li>DOM and jQuery object caching</li>
    </ul>
</section>

<section class='important'>
    <strong>Important:</strong> If your subview is rendered multiple times in its life-cycle, make sure to destroy any event bindings created here in [`Subview.preRender`](#Subview.preRender).
</section>


#### <a name='Subview.wrapper' data-menu='Subview.wrapper'>`Subview.wrapper [DOM Object]`</a><div class='static'></div>
The DOM element that represents the subview.


#### <a name='Subview.$wrapper' data-menu='Subview.$wrapper'>`Subview.$wrapper [jQuery Object]`</a><div class='static'></div>
A cached jQuery wrapper of [`Subview.wrapper`](#Subview.wrapper).


#### <a name='Subview.render' data-menu='Subview.render()'>`Subview.render()`</a><div class='static'></div><div class='chainable'></div>
Renders the template when called.  This function is automatically called when the subview is created and, when [`Subview.reRender`](#Subview.reRender) is set to `true`, each time the subview is subsequently spawned. 
This method **may be overwritten** if no templating is being used on the subview.  Note that when it is overwritten [`Subview.preRender`](#Subview.preRender) and [`Subview.postRender`](#Subview.postRender) will not fire.


#### <a name='Subview.html' data-menu='Subview.html()'>`Subview.html(html [string])`</a><div class='static'></div><div class='chainable'></div>
Sets the HTML inside of the subview and returns any child subviews to the available pool.

<section class='important'>
    <strong>Important:</strong> Always use `Subview.html` when removing and changing content within a subview to ensure that all child subviews are returned to the pool.
</section>


#### <a name='Subview.reRender' data-menu='Subview.reRender'>`Subview.reRender = false`</a><div class='advanced'></div>
When this attribute is set to `true` the template will be rendered every time the subview is spawned rather than just the first time the subview is created.



### <a name='Subview-Events'>Events</a>

Subview events are used to decouple subviews and eliminate the need to have direct references to subview instances. This results in very flexible and modular subviews that can be reused over and over again in different contexts.


#### <a name='Subview.listeners' data-menu='Subview.listeners'>`Subview.listeners = {}`</a>
An object containing event listener definitions as keys and their callbacks as values. Listeners are scoped directionally relative to the current DOM hierarchy and may also specify a type of subview that they are listening for.  The available directions are: 'up', 'down', 'across', 'all' and 'self'. The event specification format is:

```javascript
"[direction]:[event name]{:[from type]}, {...}"
```

The callback receives the arguments passed as the second argument of the [`Subview.trigger`](#Subview.trigger) method. These arguments are passed by reference, so don't worry about passing around large values.  The value of `this` in the callbacks is the subview itself.

```javascript
subview('some-subview', {
    listeners: {
        //Listen for parents broadcasting the 'open' and 'new' events
        'up:open, up:new':  function(document) {
            this.$wrapper; // this refers to the subview itself.
        }, 

        //Listen for all 'sign-out' events
        'all:sign-out':     function() {},

        //Listen for 'error' events in 'input' child subviews and in the subview itself
        'down:error:input, self:error':  function(msg) {},

        //Listen for siblings of 'form' type broadcasting 'show-extra-fields'
        'across:show-extra-fields:form': function() {}
    }
});
```

Note that listeners are applied when the subview is created and cannot be modified afterwards.

<section class='best-practice'>
    <strong>Best Practice:</strong> Use the most specific listener direction you can.  This prevents events from other, unrelated parts of the application from effecting your subview.
</section>


#### <a name='Subview.trigger' data-menu='Subview.trigger()'>`Subview.trigger(name [string], {args [array]})`</a><div class='static'></div><div class='chainable'></div>

Broadcasts an event of `name` to all subviews listening in the appropriate direction for this subview's [`type`](#Subview.type).  `args` is a list of arguments that will be passed to the listeners.  See [`Subview.listeners`](#Subview.listeners).

```javascript
subview('input', function() {
    once: function() {
        var self = this;
        this.$wrapper.blur(function() {
            var error = self.error();

            if(error) {
                self.trigger('error', [error]);
            }
        });
    },
    validate: function() {
        //Some validation
        return false;
    }
});
```



### <a name='Subview-Traversing'>Traversing & Manipulation</a>

#### <a name='Subview.$' data-menu='Subview.$()'>`Subview.$(selector)`</a><div class='static'></div>
A convenience function that is a shortcut for `Subview.$wrapper.find(selector)`.  Inspired by [Backbone](http://backbonejs.org/).


#### <a name='Subview.parent' data-menu='Subview.parent()'>`Subview.parent({subviewType [string]})`</a><div class='static'></div>
Returns the closest parent of the given `subviewType`. If no `subviewType` is given, returns the closest parent subview. If no subview is found, returns `null`.


#### <a name='Subview.children' data-menu='Subview.children()'>`Subview.children({subviewType [string]})`</a><div class='static'></div>
Returns the children of the given `subviewType`. If no `subviewType` is given, returns all child subviews. If no subview is found, returns `null`.


#### <a name='Subview.next' data-menu='Subview.next()'>`Subview.next({subviewType [string]})`</a><div class='static'></div>
Returns the next sibling of the given `subviewType`. If no `subviewType` is given, returns the next sibling subview. If no subview is found, returns `null`.


#### <a name='Subview.prev' data-menu='Subview.prev()'>`Subview.prev({subviewType [string]})`</a><div class='static'></div>
Returns the previous sibling of the given `subviewType`. If no `subviewType` is given, returns the previous sibling subview. If no subview is found, returns `null`.


### <a name='Subview-Attributes'>Attributes</a>

#### <a name='Subview.type' data-menu='Subview.type'>`Subview.type [string]`</a><div class='static'></div>
The type of the subview as defined in the first argument of the [`subview()`](#subview) function.


#### <a name='Subview.isSubview' data-menu='Subview.isSubview'>`Subview.isSubview = true`</a><div class='static'></div>
An identifier property that denotes that this is a `Subview` object.

