var subview     = require("../src/main.js"),
    Handlebars  = require("handlebars");

subview("main", {
    init: function() {
        var self = this;
        this.listenDown('auth', function(auth) {
            console.log('auth');

            setTimeout(function() {
                if(auth) {
                    self.$wrapper
                        .removeClass('state-auth-false')
                        .addClass('state-auth-true');
                }
                else {
                    self.$wrapper
                        .addClass('state-auth-false')
                        .removeClass('state-auth-true');
                }
            }, 0);
        });
    },
    template: Handlebars.compile("\
This Works!!!\
{{{ subview.A }}}\
{{{ subview.B }}}"),
    subviews: {
        A: require("./subviews/ViewA"),
        B: require("./subviews/ViewB")
    }
});
