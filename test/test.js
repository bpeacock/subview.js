var sinon = require('sinon'),
    module = window.module,
    sandbox;

module("subview", {
    setup: function() {
        sandbox         = sinon.sandbox.create();

    },
    teardown: function() {
        
    }
});

test('sample', function() {
    ok(true);
});
