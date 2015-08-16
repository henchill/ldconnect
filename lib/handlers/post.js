/*jslint node: true*/
"use strict";

var path = require('path');
var util = require('util');
var constants = require("../constants.js");
var qs = require('querystring');
var fetcher = require('../fetcher.js');
var debug = require('../logging').posthandler;
var url = require("url");
var clone = require("clone");
var session_info = require("../session_info.js");
var user_info = require("../user_info.js");
var scraper = require("../scraper.js");

exports.handler = function(req, res) {
	debug("Calling post for request path: %s", req.path);
	var reqpath = removeEmptyElements(req.path.split('/'));

	if (req.path === "/facebook_token") {
		handleTokenSetup(req, res);
	} else if (reqpath.length > 0) {
		var args = {
			path_user: reqpath[0],
			current_user: req.session.fbid,
			access_token: req.session.access_token,
			data: req.text
		}

		if (constants.POSTS_REGEX.test(req.path)) {
			debug("Matched posts regex. Calling posttofeed handler");
			handlePostRequest(fetcher.createPost, req, res, args);
		}
		else if (constants.COMMENTS_REGEX.test(req.path)) {
			debug("Matched comments regex");
			args.object_id = reqpath[reqpath.length - 1].split('comments_')[1];
			args.comments_uri = constants.BASEURL + req.path.substr(1);

			handlePostRequest(fetcher.createComment, req, res, args);
		}
		else if (constants.LIKES_REGEX.test(req.path)) {
			debug("Matcher likes regex");
			args.object_id = reqpath[reqpath.length - 1].split('likes_')[1];
			args.likes_uri = constants.BASEURL + req.path.substr(1);
			handlePostRequest(fetcher.createLike, req, res, args);
		}
		else if (constants.ALBUMS_REGEX.test(req.path)) {
			debug("Matched albums regex");
			handlePostRequest(fetcher.createAlbum, req, res, args);
		}
		else if (constants.ALBUM_REGEX.test(req.path)) {
			debug("Matched album regex");
			args.object_id = reqpath[reqpath.length - 1] === "user_photos" ? args.path_user : reqpath[reqpath.length - 1] ;
			args.parent_uri = constants.BASEURL + req.path.substr(1);
			handlePostRequest(fetcher.createImageUpload, req, res, args);
		}
		else if (constants.FRIENDS_REGEX.test(req.path)) {
			debug("Matched friends regex");
			args.userId = req.session.userId;
			handlePostRequest(scraper.createFriendship, req, res, args);
		}
		else {
			debug("ERROR: Did not match any regex");
			res.sendStatus(404);
		}
	} else {
		debug("ERROR: Did not match any regex");
		res.sendStatus(404);
	}
}

var handlePostRequest = function(fetcher_func, req, res, args) {
	fetcher_func(args, function(result) {
		if (!result.error) {
			if (result.headers && result.headers.location) {
				res.location(result.headers.location);
			}

			if (result.headers && result.headers.link) {
				res.links(result.headers.link);
			}
			res.sendStatus(201);
		} else {
			res.status(result.status)
				.send(result.error);
		}
	});
}

var handlePostToFeed = function(req, res, args) {
	debug("executing handle post to feed");
	fetcher.writePost(args, function(result) {
		if (!result.error) {
			if (result.header && result.header.location) {
				res.location(result.header.location);
			}

			if (result.header && result.header.link) {
				res.links(result.header.link);
			}
			res.sendStatus(201);
		} else {
			res.status(result.status)
				.send(result.error);
		}
	});
}

var handleTokenSetup = function(req, res) {
	debug("handling token setup");

	try {
	var data = JSON.parse(req.text);
	var args = {
		userwebid: req.session.userId,
		aclurl: url.parse(data.aclurl),
		configurl: url.parse(data.configurl)
	}

	if (data.email && data.password) {
		session_info.updateSession(req.session.userId, {
			email: data.email,
			password: data.password
		});
	}

	user_info.update(req.session.userId, {
		config: data.configurl, 
		acl: data.aclurl
	});

	// write config 
	fetcher.writeConfigAclFile(args, function() {
		var redirecturl = constants.BASEURL + "facebook_token";

		var query = {
			client_id: constants.APP_ID,
			redirect_uri: redirecturl,
			scope: 'publish_actions,user_likes,user_events,user_photos,user_friends,user_status,user_posts'
		}

		var fburl = "https://www.facebook.com/dialog/oauth?%s";
		
		var fbredirect = util.format(fburl, qs.stringify(query));
		
		res.status(200).send({ 'redirecturl': fbredirect });
	});
	} catch(e) {debug(e);}
}

var containerCallback = function(err) {
	if (err) {
		debug("POST -- Error creating new container: " + err);
		return res.sendStatus(500);
	}
	debug("POST -- Created new container " + resourceBaseUri);
	res.set('Location', resourceBaseUri);
	return res.sendStatus(201);
}

var resourceCallback = function(err) {
	if (err) {
		debug("POST -- Error creating resource: " + err);
		return res.sendStatus(500);
	}
	res.set('Location', resourceBaseUri);
	return res.sendStatus(201);
}

var removeEmptyElements = function(arr) {
	var result = [];
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] !== '') {
			result.push(arr[i]);
		}
	}
	return result;
}
