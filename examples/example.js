var $ = require("jquery")(window),
    subview = require("../src/main.js");

subview("app", {
    init: function() {
        this.dumbExtension();
    },
    template: "\
This Works!!!\
{{{ subview.A }}}\
{{{ subview.B }}}",
    state: {
        auth: true
    }
});

var ViewA = subview("A", {
    init: function() {
        var self = this;

        $('.signin').click(function() {
            self.tellParent('app', 'auth', true);
        });

        $('.signout').click(function() {
            self.tellParent('app', 'auth', false);
        });
    },
    template: "\
This is view A!\
<button class='signin'>Sign In</button>\
<button class='signout'>Sign Out</button>"
});

ViewA.subview("B", {
    template: "\
This is view B.  I'm subclassed from view A.\
{{{ subview.auth }}}",
});

subview("auth", {
    template: "\
This should only show up when signed in.\
<ul>\
    {{#list}}\
        <li>{{.}}</li>\
    {{/list}}\
</ul>",
    data: {
        list: ['item 1', 'item 2', 'item 3']
    }
});

/*** Startup Actions ***/
$(function() {
    subview.load({
        $: $
    });
});

subview.extend({
    dumbExtension: function() {
        console.log('this is dumb');
    }
});
