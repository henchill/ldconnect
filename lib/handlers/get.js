var path = require('path');
var fetcher = require('../fetcher.js');
var debug = require('../logging').gethandler;
var constants = require('../constants.js');
var util = require('util');
var https = require('https');
var qs = require('querystring');
var concat = require('concat-stream');
var qs = require('querystring');
var fs = require('fs');
var session_info = require("../session_info.js");
var user_info = require("../user_info.js");
var url = require("url");

var get = function(req, res, includebody) {
	debug("Requested path: %s", req.path);
	var reqpath = removeEmptyElements(req.path.split('/'));

	if (req.path === "/facebook_token") {
		debug("Received facebook token get request");
		handleFacebookToken(req, res);
	} 
	else if (req.path === "/test_create") {
		res.render('test_create', {});
	} 
	else if (req.path === "/test_perf") {
		res.render("test_perf", {});
	}
	else if (reqpath.length > 0) {
		var args = {
			access_token: req.session.access_token,
			path_user: reqpath[0],
			current_user: req.session.fbid
		};

		if (args.path_user === "test1" && !req.session.access_token) {
			args.access_token = session_info.getProperty("test1", "access_token");
			args.current_user = session_info.getProperty("test1", "fbid");
		}

		if (constants.PROFILE_REGEX.test(req.path)) {
			debug("Matched profile regex");
			args.Op = "GETPROFILE";

			handleGetRequest(fetcher.getProfile, req, res, args);
		} 
		else if (constants.USER_BASE_REGEX.test(req.path)) {
			debug("Matched user base regex");
			args.Op = "GETUSERBASE";

			handleGetRequest(fetcher.getUserBase, req, res, args);
		} 
		else if (constants.ALBUMS_REGEX.test(req.path)) {
			debug("Matched albums regex");
			args.Op = "GETALBUMS";

			handleGetRequest(fetcher.getAlbums, req, res, args);
		} 
		else if (constants.POSTS_REGEX.test(req.path)) {
			debug("Matched posts regex");
			args.Op = "GETPOSTS";

			handleGetRequest(fetcher.getPosts, req, res, args);
		} 
		else if (constants.FRIENDS_REGEX.test(req.path)) {
			debug("Matched friends regex");
			args.Op = "GETFRIENDS";

			handleGetRequest(fetcher.getFriends, req, res, args);
		} 
		else if (constants.POST_REGEX.test(req.path)) {
			debug("Matched post regex");
			args.Op = "GETPOST";
			args.post_id = reqpath[reqpath.length - 1];

			handleGetRequest(fetcher.getPost, req, res, args);
		} 
		else if (constants.ALBUM_REGEX.test(req.path)) {
			debug("Matched album regex");
			args.album_id = (reqpath[reqpath.length - 1] !== "user_photos") ? reqpath[reqpath.length - 1] : undefined;
			args.Op = "GETALBUM";

			handleGetRequest(fetcher.getAlbum, req, res, args);
		} 
		else if (constants.PHOTO_REGEX.test(req.path)) {
			debug("Matched photo regex");
			console.log("recognized photo regex");
			args.photo_id = reqpath[reqpath.length - 1];
			args.Op = "GETPHOTO";

			handleGetRequest(fetcher.getPhoto, req, res, args);
		} 
		else if (constants.COMMENTS_REGEX.test(req.path)) {
			debug("Matched comments regex");
			args.object_id = reqpath[reqpath.length - 1].split('comments_')[1];
			args.object_uri = constants.BASEURL + reqpath.slice(0, -1).join("/") + "/" + args.object_id;

			handleGetRequest(fetcher.getComments, req, res, args);
		}
		else if (constants.LIKES_REGEX.test(req.path)) {
			debug("Matched likes regex");
			args.object_id = reqpath[reqpath.length - 1].split('likes_')[1];
			// take all but last element in reqpath, prepend baseurl, append object id.
			args.object_uri = constants.BASEURL + reqpath.slice(0, -1).join("/") + "/" + args.object_id; 

			handleGetRequest(fetcher.getLikes, req, res, args);
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

exports.getHandler = function(req, res) {
	console.log("get handler called");
	get(req, res, true);
}

exports.headHandler = function(req, res) {
	get(req, res, false);
}

var handleGetRequest = function(fetcher_func, req, res, args) {
	fetcher_func(args, function(results) {
		if (!results.error) {
	 		res.status(200)
	 			.set('content-type', 'text/turtle')
	 			.send(results.data);
	 	} else {
	 		res.status(results.status)
	 			.send(results.error);
	 	}
	});
}

var handleGetProfile = function(req, res, args) {
 	fetcher.getProfile(args, function(results) {
 		if (!results.error) {
	 		res.status(200)
	 			.set('content-type', 'text/turtle')
	 			.send(results.data);
	 	} else {
	 		res.status(results.status)
	 			.send(results.error);
	 	}
 	});
}

var handleGetUserBase = function(req, res, args) {
	fetcher.getUserBase(args, function(results) {
 		if (!results.error) {
	 		res.status(200)
	 			.set('content-type', 'text/turtle')
	 			.send(results.data);
	 	} else {
	 		res.status(results.status)
	 			.send(results.error);
	 	}
 	});
}
var handleGetFeed = function(req, res, args) {
	args.type = 'feed';
	fetcher.getPosts(args, function(results) {
		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.n3);
	});
}

var handleGetAlbums = function(req, res, args) {
	console.log("handle get albums");
	fetcher.getAlbums(args, function(results) {
		console.log("received response for get albums");
		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.n3);
	});
}

var handleGetAlbum = function(req, res, args) {
	console.log("handle get album");
	fetcher.getAlbum(args, function(results) {
		console.log("received response for get album");
		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.n3);
	});
}

var handleGetPhoto = function(req, res, args) {
	console.log("handle get album");
	fetcher.getPhoto(args, function(results) {
		console.log("received response for get album");
		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.n3);
	});
}
var handleGetPosts = function(req, res, args) {
	fetcher.getPosts(args, function(results) {
		if (!results.error) {
			res.status(200)
	 			.set('content-type', 'text/turtle')
	 			.send(results.data);
	 	} else {
	 		res.status(results.status)
	 			.send(results.error);
	 	}
	});
}

var handleGetFriends = function(req, res, args) {
	fetcher.getFriends(args, function(results) {
		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.n3);
	});
}

var handleGetPost = function(req, res, args) {
	fetcher.getPost(args, function(results) { 
		if (!results.error) {
			res.status(200)
	 			.set('content-type', 'text/turtle')
	 			.send(results.data);
	 	} else {
	 		res.status(results.status)
	 			.send(results.error);
	 	}
	});
}

var handleGetRelated = function(req, res, args) {
	fetcher.getRelated(args, function(results) {
		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.error || results.n3);
	});
}

var handleFacebookToken = function(req, res) {
	debug("handling facebook token");
	url.parse("");
	if (req.query.after) {
		req.session.redirecturl = req.query.after;
		req.session.shouldredirect = false;
		res.redirecturl('/facebook_token');
	} else if (req.query.code) {
		// exchange code for access token
		var query = {
			client_id: constants.APP_ID,
			redirect_uri: constants.BASEURL + "facebook_token",
			client_secret: constants.APP_SECRET,
			code: req.query.code
		}

		https.get({
			hostname: 'graph.facebook.com',
			path: util.format('/v2.4/oauth/access_token?%s', qs.stringify(query))
		}, function(httpsres) {
			httpsres.pipe(concat(function(body) {
				// Data reception is done, do whatever with it!
				var parsed = JSON.parse(body);

				if (parsed.access_token) {
					var longlivedquery = {
						grant_type: 'fb_exchange_token',
						client_id: constants.APP_ID,
						client_secret: constants.APP_SECRET,
						fb_exchange_token: parsed.access_token
					}

					https.get({
						hostname: 'graph.facebook.com',
						path: util.format('/v2.4/oauth/access_token?%s', qs.stringify(longlivedquery))
					}, function(httpsres) {
						httpsres.pipe(concat(function(body) {
							var parsed = JSON.parse(body);
							debug("Obtained long lived token");
							debug(parsed);
							req.session.access_token = parsed.access_token;
							req.session.shouldredirect = true;
							// TODO: Update ldconnect config to hold access token.

							// fetch current user's info
							fetcher.getProfile({
								access_token: parsed.access_token,
								path_user: "me",
							}, function(result) {
								if (!result.error) {

									req.session.fbid = result.json_data.id;

									session_info.updateSession(req.session.userId, {
										access_token: parsed.access_token,
										fbId: result.json_data.id
									});

									debug(req.session.userId);
									debug(user_info.getInfo(req.session.userId, "config"));
									// var configurl = user_info.getInfo(req.session.userId, "config")
									// TODO: write to pod.
									var configargs = {
										email: session_info.getProperty(req.session.userId, "email"),
										password: session_info.getProperty(req.session.userId, "password"),
										access_token: parsed.access_token,
										fbid: req.session.fbid,
										configurl: url.parse(user_info.getInfo(req.session.userId, "config"))
									}

									session_info.deleteProperty(req.session.userId, "email");
									session_info.deleteProperty(req.session.userId, "password")

									fetcher.writeConfigFile(configargs, function() {
										debug("Wrote ldconnect_config");
									});
								} else {
									debug("Failed to fetch current user's profile. Error: %s", result.error);
								}
							});

							res.redirect('/facebook_token');
						}));
					});
				} else {
					req.session.shouldredirect = false;
					res.redirect('/facebook_token');
				}
			}));
		});
	} else {
		debug("rendering facebook token");
		var redirecturl = req.session.shouldredirect ? req.session.redirecturl : undefined;
		req.session.shouldredirect = false;
		debug(req.session.preferencesfile);
		res.render('facebook_token', {redirect: redirecturl, preferencesfile: req.session.preferencesfile});
	}
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