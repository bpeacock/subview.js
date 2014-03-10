var sinon   = require('sinon'),
    $       = require("unopinionate").selector,
    module  = window.module,
    subview = require('../src/main'),
    sandbox;

var testSubview = subview('test');

module("DOM subview definition", {
    setup: function() {
        sandbox = sinon.sandbox.create();

    },
    teardown: function() {
        
    }
});



module("subview", {
    setup: function() {
        sandbox = sinon.sandbox.create();

    },
    teardown: function() {
        
    }
});

test('subview() get view from node', function() {
    deepEqual(subview($('body')[0]), null, 'Element without bound view');
    deepEqual(subview($('body')), null, 'Jquery objects work');

    var tester = testSubview.spawn();
    deepEqual(subview(tester.wrapper), tester, 'Returns correct element');
});

test('#load', function() {
    var $tester = $("<div class='view-test'>").appendTo('body');
    subview.load();
    ok(subview($tester), "View was successfully created");
});


