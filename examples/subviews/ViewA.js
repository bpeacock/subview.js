var subview = require("../../src/main.js");

module.exports = subview("A", {
    init: function() {
        var self = this;

        console.log("INIT");
        console.log($('.signin'));

        $('.signin').click(function() {
            console.log("HERE");
            self.trigger('auth', [true]);
        });

        $('.signout').click(function() {
            self.trigger('auth', [false]);
        });
    },
    template: "\
This is view A!\
<button class='signin'>Sign In</button>\
<button class='signout'>Sign Out</button>"
});