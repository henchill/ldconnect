var casper = require('casper').create({clientScripts: ["./bower_components/jquery/dist/jquery.min.js"] })
var fs = require('fs');


// casperjs casper_push_facebook.js --email="enchill8@gmail.com" --password="@wotwi88" --conversation="https://www.facebook.com/messages/dayna.wilmot" --message="test 1"
// casperjs addfriend.js --email="enchill8@gmail.com" --password="@wotwi88" --fbid="100010009322829"

var email = casper.cli.get("email");
var password = casper.cli.get("password");
var fbid = casper.cli.get("fbid");

casper.on("remote.message", function(message) {
	this.log("remote console.log: " + message);
});


casper.start("https://www.facebook.com/" + fbid);

casper.waitForSelector('form', function() {
	this.fillSelectors('#login_form', {
		'#email': email,
		'#pass': password
	}, true);
});

casper.thenEvaluate(function() {
	console.log("evaluating page");

	// var button = document.querySelector("#pagelet_timeline_profile_actions .FriendRequestAdd.addButton");
	var button = $("#pagelet_timeline_profile_actions").find(".FriendRequestAdd.addButton");
	if (button.length === 0) {
		this.exit(1);
	}

	if (!button.hasClass("hidden_elem")) {
		button.click();
	} else {
		this.exit(5); // already friends
	}
});

casper.run(function() {
	require('utils').dump(this.logs);
    this.exit();
});
