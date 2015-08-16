var $rdf = require('rdflib');
var http = require('http');
var https = require('https');
var util = require('util');
var concat = require('concat-stream');
var qs = require('querystring');
var async = require('async');
var constants = require('./constants.js');
var debug = require('./logging.js').scraper;
var fetcher = require("./fetcher.js");
var user_info = require("./user_info.js");
var spawn = require('child_process').spawn;
var path = require("path");

var LDFB = $rdf.Namespace(constants.LDCONNECT_NS);

exports.createFriendship = function (args, callback) {
	// var configurl = user_info.getInfo(args.userId);
	debug("Start create friendship");
	var configargs = {
		configurl: user_info.getInfo(args.userId, "config"),
		fields: ["email", "password"]
	}
	// debug(configargs);

	fetcher.getConfig(configargs, function(results) {
		debug("results: ", results);
		var kb = $rdf.graph();
		$rdf.parse(args.data, kb, "_:", 'text/n3');

		var friends = kb.statementsMatching(undefined, LDFB('has_friend'), undefined);
		debug("friends: ", friends);

		if (friends.length > 0) {
			var fbid = friends[0].object.value.split("_")[2];
			debug("found fbid: ", fbid);
			var arguments = util.format("--email=%s,--password=%s,--fbid=%s", results.email, results.password, fbid).split(',');
			arguments.unshift(path.join(__dirname, "scrapers", "addfriend.js"));

			var pushexec = spawn("casperjs", arguments);
			pushexec.stdout.on('data', function (data) {
				console.log('pushexec stdout: ' + data);
			});

			pushexec.stderr.on('data', function (data) {
				console.log('pushexec stderr: ' + data);
			});

			pushexec.on('exit', function (code) {
				if (code === 0) {
					debug("successfully added friend");
					callback({});
				} 
				else if (code === 1) {
					debug("error adding friend");
					callback({});
				} 
				else if (code === 5) {
					debug("friend request already sent");
					callback({error: "Could not add friend", status: 403})
				}
				else {
					debug("unrecognized code: " + code);
					callback({error: "Could not add friend", status: 403})
				}

			});
		} else {
			callback({error: "could not parse request", status: 400});
		}
		
	});
}