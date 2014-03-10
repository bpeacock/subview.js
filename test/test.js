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


/*** subview Object ***/

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

test('subview() define subview', function() {
    ok(!subview('test'), "Invalid subview definition");

    var tester = subview('tester');
    ok(tester, "Subview successfully created");
    deepEqual(tester, subview.views.tester, "Subview successfully registered");

    ok(tester.super, "Super is bound to the view");

    var subTester = subview('subtester', tester);
    equal(subTester.super.type, "tester", "SubTester extends tester");
});

test('#load', function() {
    var $tester = $("<div class='view-test'>").appendTo('body');
    subview.load();
    ok(subview($tester), "View was successfully created");

    var $tester2 = $("<div class='view-test'>").appendTo('body');
    subview.load('body');
    ok(subview($tester2), "Scoped loading was successful");
});

test('#_validateName', function() {
    ok(subview._validateName("Foo1"), "Base Case");
    ok(!subview._validateName("Foo%"), "Invalid characters");
    ok(!subview._validateName("test"), "Pre-existing view");
});

