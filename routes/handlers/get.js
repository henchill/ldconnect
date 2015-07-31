var path = require('path');
var fetcher = require('../../fetcher.js');
var debug = require('../logging').handlers;
var constants = require('../../constants.js');
var util = require('util');
var https = require('https');
var qs = require('querystring');
var concat = require('concat-stream');
var qs = require('querystring');
var fs = require('fs');

var get = function(req, res, includebody) {
	console.log("executing get");
	console.log(req.path);
	var reqpath = removeEmptyElements(req.path.split('/'));

	if (req.path === "/facebook_token") {
		handleFacebookToken(req, res);
	} else if (req.path === "/test") {
		res.render('test', {});
	} else if (reqpath.length > 0) {
		var args = {
			access_token: req.session.access_token,
			user_id: reqpath[0]
		};

		if (constants.PROFILE_REGEX.test(req.path)) {
			handleGetProfile(req, res, args);
		} else if (constants.FEED_REGEX.test(req.path)) {
			handleGetFeed(req, res, args);
		} else if (constants.ALBUMS_REGEX.test(req.path)) {
			handleGetAlbums(req, res, args);
		} else if (constants.POSTS_REGEX.test(req.path)) {
			handleGetPosts(req, res, args);
		} else if (constants.FRIENDS_REGEX.test(req.path)) {
			handleGetFriends(req, res, args);
		} else if (constants.POST_REGEX.test(req.path)) {
			args.post_id = reqpath[reqpath.length - 1];
			console.log(args.post_id);
			handleGetPost(req, res, args);
		} else if (constants.PHOTOS_REGEX.test(req.path)
			|| constants.ALBUM_REGEX.test(req.path)) {
			args.album_id = (reqpath.indexOf('albums') > -1) ? reqpath[reqpath.length - 1] : undefined;
			handleGetAlbum(req, res, args);
		} else if (constants.PHOTO_REGEX.test(req.path)) {
			console.log("recognized photo regex");
			args.photo_id = reqpath[reqpath.length - 1];
			handleGetPhoto(req, res, args);
		} else if (constants.RELATED_REGEX.test(req.path)) {
			console.log("recognized related");
			args.object_id = reqpath[reqpath.length - 1].split('_related')[0];
			args.object_uri = req.path.split('_related')[0];
			handleGetRelated(req, res, args);
		} else {
			res.sendStatus(404);
		}
	} else {
		console.log("not found");
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

var handleGetProfile = function(req, res, args) {
 	fetcher.getProfile(args, function(results) {
 		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.n3);
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
	args.type = 'posts';
	fetcher.getPosts(args, function(results) {
		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.error || results.n3);
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
		res.status(200)
 			.set('content-type', 'text/turtle')
 			.send(results.error || results.n3);
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
	console.log("handling facebook req");

	if (req.query.after) {
		req.session.redirecturl = req.query.after;
		req.session.shouldredirect = false;
		res.redirecturl('/facebook_token');
	} else if (req.query.code) {
		// exchange code for access token
		var query = {
			client_id: fetcher.app_id,
			redirect_uri: "http://local.happynchill.in:3000/facebook_token",
			client_secret: fetcher.app_secret,
			code: req.query.code
		}

		https.get({
			hostname: 'graph.facebook.com',
			path: util.format('/v2.4/oauth/access_token?%s', qs.stringify(query))
		}, function(httpsres) {
			httpsres.pipe(concat(function(body) {
				// Data reception is done, do whatever with it!
				var parsed = JSON.parse(body);
				console.log(parsed);

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
							console.log("long lived token");
							console.log(parsed);
							req.session.access_token = parsed.access_token;
							req.session.shouldredirect = true;
							// TODO: Update ldconnect config to hold access token.

							// fetch current user's info
							fetcher.getProfile({
								access_token: parsed.access_token,
								user_id: "me",
							}, function(result) {
								if (!result.error) {

									req.session.fbId = result.json.id;

									// store token on disk
									fs.writeFileSync(path.join(constants.TOKENS_DIR, result.json.id), parsed.access_token);
								} else {
									console.log(result.error);
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
		console.log("rendering page");
		var url = req.session.shouldredirect ? req.session.redirecturl : undefined;
		req.session.shouldredirect = false;
		res.render('facebook_token', {redirect: url});
	}
}

var findFetcherFunc = function(splitpath) {

	if (splitpath.length <= 1) { // user profile req
		var args = {access_token: req.session.access_token};
		args.userid = (splitpath[0] === 'me' || splitpath[0] === '') ? req.session.fbId : splitpath[0];
		return {
			func: fetcher.getProfile,
			args: args
		};
	} else {
		// var matchcomment =
		// var match
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