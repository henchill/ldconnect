var $rdf = require('rdflib');
var http = require('http');
var https = require('https');
var util = require('util');
var concat = require('concat-stream');
var qs = require('querystring');
var async = require('async');
var constants = require('./constants.js');
var debug = require('./logging.js').fetcher;
var url = require("url");

// RDF Namespaces
var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/")
var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
var RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#")
var OWL = $rdf.Namespace("http://www.w3.org/2002/07/owl#")
var DCT = $rdf.Namespace("http://purl.org/dc/terms/");
var RSS = $rdf.Namespace("http://purl.org/rss/1.0/")
var XSD = $rdf.Namespace("http://www.w3.org/TR/2004/REC-xmlschema-2-20041028/#dt-")
var CONTACT = $rdf.Namespace("http://www.w3.org/2000/10/swap/pim/contact#")
var SIOC = $rdf.Namespace("http://rdfs.org/sioc/ns#");
var DCTYPE = $rdf.Namespace("http://purl.org/dc/dcmitype/");
var LDFB = $rdf.Namespace(constants.LDCONNECT_NS);
var LDP = $rdf.Namespace("http://www.w3.org/ns/ldp#");
var PIM = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");

exports.writeConfig = function(args, callback) {
	writeConfigAclFile(args.aclurl, args.configurl, args.userwebid);



	var posts = kb.statementsMatching(undefined, RDF('type'), SIOC('Post'));

	if (posts.length > 0) {
		var postitem = posts[0].subject;
		var postdata = {
			access_token: args.access_token,
		}

		var message = kb.any(postitem, SIOC('content'));
		var link = kb.any(postitem, SIOC('attachment'));

		if (!message && !link) {
			debug("Malformed Post. SIOC::content OR SIOC::attachment must be specified");
			callback({
				error: 'must specify SIOC::content OR SIOC::attachment',
				status: 400
			});
			return;
		}
		
		if (message) postdata.message = message.value;
		if (link) postdata.link = link.value;

		var options = {
			hostname: 'graph.facebook.com',
			port: 443,
			path: util.format('/v2.4/%s/feed', args.path_user),
			method: 'POST',
		}

		var req = https.request(options, function(res) {
			res.pipe(concat(function(body) {
				var parsed = JSON.parse(body);

				if (!parsed.error) {
					debug("Successfully created post");

					var postlocation = constants.BASEURL + args.path_user + "/posts/" + parsed.id;
					var commentslocation = constants.BASEURL + args.path_user + "/posts/comments_" + parsed.id;
					var likeslocation = constants.BASEURL + args.path_user + "/posts/likes_" + parsed.id;

					callback({
						headers: {
							location: postlocation,
							link : {
								comments: commentslocation,
								likes: likeslocation
							}
						}
					});
					return;
				} else {
					debug("Failed to create post. Error: %s", parsed.error.message);
					callback({ error: parsed.error.message, status: 403 })
				}
			}));
		});

		req.write(qs.stringify(postdata));
		req.end();
	} else {
		// could not find the proper structure
		callback({
			error: "could not find a SIOC Post resource in request",
			status: 400
		});
		return;
	}

}

exports.getProfileFromWebid = function(uri, callback) {
	var kb = $rdf.graph();
	var person = $rdf.sym(uri);
	var docURI = url.parse(uri.slice(0, uri.indexOf('#')));
	var fetch = $rdf.fetcher(kb);

	var kb = $rdf.graph();

	https.get({
		hostname: docURI.hostname,
		path: docURI.pathname,
		headers: {
			DataType: "text/turtle"
		}
	}, function(res) {
		res.pipe(concat(function(body) {
			// debug(body.toString("utf-8"));
			$rdf.parse(body.toString("utf-8"), kb, docURI.href, 'text/n3');

			var persons = kb.statementsMatching(undefined, RDF("type"), FOAF("Person"));
			if (persons.length > 0) {
				var person = persons[0].subject;

				var info = {};
				var name = kb.any(person, FOAF('name'));
				var preferencesfile = kb.any(person, PIM("preferencesFile"));

				if (name) info.name = name.value;
				if (preferencesfile) info.preferencesfile = preferencesfile.value;
				debug(info);
				callback(info);
			}

		}));
	});
}

exports.getUserBase = function(args, callback) {
	var kb = $rdf.graph();

	kb.add($rdf.sym(""), RDF('type'), SIOC('Container'));
	kb.add($rdf.sym(""), RDF('type'), LDP('Container'));
	kb.add($rdf.sym(""), DCT('title'), $rdf.lit(args.path_user));

	kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("fbprofile"));
	kb.add($rdf.sym("fbprofile"), RDF("type"), RDFS("Resource"));

	kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("friends"));
	kb.add($rdf.sym("friends"), RDF("type"), RDFS("Resource"));

	kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("posts"));
	kb.add($rdf.sym("posts"), RDF("type"), SIOC("Container"));
	kb.add($rdf.sym("posts"), RDF("type"), LDP("Container"));

	kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("albums"));
	kb.add($rdf.sym("albums"), RDF("type"), SIOC("Container"));
	kb.add($rdf.sym("albums"), RDF("type"), LDP("Container"));

	var s = new $rdf.Serializer(kb).toN3(kb);
	callback({ data: s });
}

exports.getProfile = function(args, callback) {
	var kb = $rdf.graph();
	debug("Making request: ", args);
	var query = {
		access_token: args.access_token,
		fields: 'id,name,picture'
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s?%s', args.path_user, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			// Data reception is done, do whatever with it!
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				var uri = constants.BASEURL + parsed.id;
				kb.add($rdf.sym(""), RDF('type'), SIOC('UserAccount'));
				kb.add($rdf.sym(""), SIOC("account_of"), $rdf.sym(uri));
				kb.add($rdf.sym(""), FOAF('img'), $rdf.sym(parsed.picture.data.url));
				kb.add($rdf.sym(""), FOAF('name'), $rdf.lit(parsed.name));

				var s = new $rdf.Serializer(kb).toN3(kb);
				var jsonout = {
					id: parsed.id,
					name: parsed.name,
					img: parsed.picture.data.url
				};

				callback({data: s, json_data: jsonout});
			} else {
				debug("Graph API returned error: %s", parsed.error.message);
				callback({error: parsed.error.message, status: 403});
			}
		}));
	});
}

exports.getFriends = function(args, callback) { // args has id
	var kb = $rdf.graph();

	var query = {
		access_token: args.access_token,
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/friends?%s', args.path_user, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				for (var i = 0; i < parsed.data.length; i++) {
					var friend = parsed.data[i];

					kb.add($rdf.sym(constants.BASEURL + args.path_user), LDFB("has_friend"), $rdf.sym("#user_" + friend.id));
					kb.add($rdf.sym("#user_" + friend.id), RDF("type"), SIOC("UserAccount"));
					kb.add($rdf.sym("#user_" + friend.id), SIOC("account_of"), $rdf.sym(constants.BASEURL + friend.id));
					kb.add($rdf.sym("#user_" + friend.id), FOAF("name"), $rdf.lit(friend.name));
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({data: s});
			} else {
				debug("Failed to fetch friends. Error: %s", parsed.error.message);
				callback({ error: parsed.error.message, status: 403 });
			}
		}));
	});
}

exports.getAlbums = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		access_token: args.access_token,
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/albums?%s', args.path_user, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);

			if (!parsed.error) {
				var containeruri = constants.BASEURL + args.path_user + '/albums/';

				kb.add($rdf.sym(""), RDF('type'), SIOC('Container'));
				kb.add($rdf.sym(""), RDF("type"), LDP("Container"));
				kb.add($rdf.sym(""), DCT('title'), $rdf.lit('albums'));

				for (var i = 0; i < parsed.data.length; i++) {
					var album = parsed.data[i];

					kb.add($rdf.sym(""), LDP("contains"), $rdf.sym(album.id));
					kb.add($rdf.sym(album.id), RDF("type"), SIOC("Container"));
					kb.add($rdf.sym(album.id), RDF("type"), LDP("Container"));
					kb.add($rdf.sym(album.id), DCT("title"), $rdf.lit(album.name));
				}
				
				kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("user_photos"));
				kb.add($rdf.sym("user_photos"), RDF("type"), SIOC("Container"));
				kb.add($rdf.sym("user_photos"), RDF("type"), LDP("Container"));

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({data: s});
			} else {
				debug("Failed to fetch albums. Error: %s", parsed.error);
				callback({error: parsed.error.message, status: 403});
			}
		}));
	});
}

exports.getAlbum = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		access_token: args.access_token,
	}

	var album_id = args.album_id || args.path_user;

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/photos?%s', album_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				kb.add($rdf.sym(""), RDF('type'), SIOC('Container'));
				kb.add($rdf.sym(""), RDF("type"), LDP("Container"));
				kb.add($rdf.sym(""), DCT('title'), $rdf.lit(args.album_id || "user_photos"));

				for (var i = 0; i < parsed.data.length; i++) {
					var image = parsed.data[i];

					kb.add($rdf.sym(""), LDP("contains"), $rdf.sym(image.id));
					kb.add($rdf.sym(image.id), RDF("type"), DCTYPE("Image"));
					kb.add($rdf.sym(image.id), RDF("type"), RDFS("Resource"));

					kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("comments_" + image.id));
					kb.add($rdf.sym("comments_" + image.id), RDF("type"), RDFS("Resource"));

					kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("likes_" + image.id));
					kb.add($rdf.sym("likes_" + image.id), RDF("type"), RDFS("Resource"));
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({data: s})
			} else {
				debug("Failed to fetch album. Error: %s", parsed.error.message);
				callback({error: parsed.error.message, status: 403});
			}
		}));
	})
}

exports.getPhoto = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		access_token: args.access_token,
		redirect: false,
		fields: 'id,name,from,picture,album,created_time'
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s?%s', args.photo_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				kb.add($rdf.sym(""), RDF('type'), DCTYPE('Image'));
				kb.add($rdf.sym(""), DCT('created'), $rdf.lit(parsed.created_time));
				kb.add($rdf.sym(""), DCT('source'), $rdf.sym(parsed.picture));
				kb.add($rdf.sym(""), SIOC("has_creator"), $rdf.sym("#creator"));
				
				kb.add($rdf.sym('#creator'), RDF('type'), SIOC('UserAccount'));
				kb.add($rdf.sym('#creator'), SIOC('account_of'), $rdf.sym(constants.BASEURL + parsed.from.id));
				kb.add($rdf.sym('#creator'), FOAF('name'), $rdf.lit(parsed.from.name));

				if (parsed.name) {
					kb.add($rdf.sym(""), DCT("title"), $rdf.lit(parsed.name));
				}
				
				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({data: s});
			} else {
				debug("Failed to fetch photo. Error: %s", parsed.error.message);
				callback({error: parsed.error.message, status: 403});
			}
		}));
	});
}

exports.getPosts = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		access_token: args.access_token,
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/feed?%s', args.path_user, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				kb.add($rdf.sym(""), RDF('type'), SIOC('Container'));
				kb.add($rdf.sym(""), RDF('type'), LDP('Container'));
				kb.add($rdf.sym(""), DCT('title'), $rdf.lit("posts"));

				// debug(parsed.data);
				debug("Posts found: %s", parsed.data.length);
				for (var i = 0; i < parsed.data.length; i++) {
					var post = parsed.data[i];
					kb.add($rdf.sym(""), LDP("contains"), $rdf.sym(post.id));
					kb.add($rdf.sym(post.id), RDF("type"), SIOC('Post'));
					kb.add($rdf.sym(post.id), RDF("type"), RDFS("Resource"));

					kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("comments_" + post.id));
					kb.add($rdf.sym("comments_" + post.id), RDF("type"), RDFS("Resource"));

					kb.add($rdf.sym(""), LDP("contains"), $rdf.sym("likes_" + post.id));
					kb.add($rdf.sym("likes_" + post.id), RDF("type"), RDFS("Resource"));
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({data: s});
			} else {
				debug("Failed to fetch user's feed: %s", parsed.error.message);
				callback({error: parsed.error.message, status: 403});
			}
		}));
	});
}

exports.getPost = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		access_token: args.access_token,
		fields: 'id,story,from,message,created_time,link'
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s?%s', args.post_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);

			if (!parsed.error) {
				var buildargs = {
					post_id: parsed.id,
					user_id: args.path_user,
					creator_id: parsed.from.id,
					creator_name: parsed.from.name,
					created: parsed.created_time, 
					note: parsed.story,
					content: parsed.message,
					attachment: parsed.link
				}

				var kb = buildPost(buildargs);

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({ data: s, json_data: buildargs });
				return;
			} else {
				debug("Failed to fetch user post, Error: %s", parsed.error.message);
				callback({ error: parsed.error.message, status: 403 });
			}
		}));
	});
}

exports.getRelated = function(args, extcallback) {
	async.parallel({
		comments: exports.getComments.bind(null, args),
		likes: exports.getLikes.bind(null, args)
	}, function(err, results) {
		console.log(results);
		var outstr = ""
		if (!results.comments.error) {
			outstr += results.comments.n3;
		}

		if (!results.likes.error) {
			outstr += results.likes.n3;
		}
		extcallback({n3: outstr})
	});
}

exports.getComments = function(args, callback) {
	debug("Executing comments fetch");
	var query = {
		access_token: args.access_token,
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/comments?%s', args.object_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);

			if (!parsed.error) {
				debug("Comments fetch successful");
				var kb = $rdf.graph();

				for (var i = 0; i < parsed.data.length; i++) {
					var comment = parsed.data[i];

					var buildargs = {
						object_uri: args.object_uri,
						id: comment.id,
						created: comment.created_time,
						content: comment.message,
						creator_id: comment.from.id,
						creator_name: comment.from.name,
						kb: kb
					}

					buildComment(buildargs);
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({data: s});
			} else {
				debug("Failed to get comments. Error: %s", parsed.error.message);
				callback({error: parsed.error.message, status: 403});
			}
		}));
	});
}

exports.getLikes = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		access_token: args.access_token,
		fields: "name"
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/likes?%s', args.object_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);

			if (!parsed.error) {
				for (var i = 0; i < parsed.data.length; i++) {
					var like = parsed.data[i];

					kb.add($rdf.sym(args.object_uri), LDFB("liked_by"), $rdf.sym("#user_" + like.id));
					kb.add($rdf.sym("#user_" + like.id), RDF("type"), SIOC("UserAccount"));
					kb.add($rdf.sym("#user_" + like.id), SIOC("account_of"), $rdf.sym(constants.BASEURL + like.id));
					kb.add($rdf.sym("#user_" + like.id), FOAF("name"), $rdf.lit(like.name));
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({data: s});
			} else {
				debug("Failed to get likes. Error: %s", parsed.error.message);
				callback({error: parsed.error.message, status: 403});
			}
		}));
	});
}

exports.createLike = function(args, callback) {
	var postdata = {
		access_token: args.access_token,
	}

	var options = {
		hostname: 'graph.facebook.com',
		port: 443,
		path: util.format('/v2.4/%s/likes', args.object_id),
		method: 'POST',
	}

	var req = https.request(options, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				debug("Successfully created like");
				var location = args.likes_uri + "#user_" + args.current_user;

				callback({
					headers: {
						location: location,
					}
				});
				return;
			} else {
				debug("Failed to like object. Error: %s", parsed.error.message);
				callback({ error: parsed.error.message, status: 403 })
			}
		}));
	});

	req.write(qs.stringify(postdata));
	req.end();
}

exports.createComment = function(args, callback) {
	debug("Calling create Comment");
	var kb = $rdf.graph();

	$rdf.parse(args.data, kb, "_:", 'text/n3');

	var comments = kb.statementsMatching(undefined, RDF('type'), SIOC('Post'));
	if (comments.length > 0) {
		var commentitem = comments[0].subject;
		var postdata = {
			access_token: args.access_token,
		}
		var message = kb.any(commentitem, SIOC('content'));
		var attachment_url = kb.any(commentitem, SIOC('attachment'));

		if (!message && !attachment_url) {
			debug("Malformed Comment. SIOC::content OR SIOC::attachment must be specified");
			callback({
				error: 'must specify SIOC::content Or SIOC::attachment',
				status: 400
			});
			return;
		}
		
		if (message) postdata.message = message.value;
		if (attachment_url) postdata.attachment_url = attachment_url.value;

		var options = {
			hostname: 'graph.facebook.com',
			port: 443,
			path: util.format('/v2.4/%s/comments', args.object_id),
			method: 'POST',
		}

		var req = https.request(options, function(res) {
			res.pipe(concat(function(body) {
				var parsed = JSON.parse(body);
				if (!parsed.error) {
					debug("Successfully created post");
					var location = args.comments_uri + "#comment_" + parsed.id;

					callback({
						headers: {
							location: location,
						}
					});
					return;
				} else {
					debug("Failed to create comment. Error: %s", parsed.error.message);
					callback({ error: parsed.error.message, status: 403 })
				}
			}));
		});

		req.write(qs.stringify(postdata));
		req.end();
	} else {
		callback({
			error: "could not find a SIOC Post resource in request",
			status: 400
		});
		return;
	}
}

exports.createPost = function(args, callback) {
	var kb = $rdf.graph();
	$rdf.parse(args.data, kb, "_:", 'text/n3');

	var posts = kb.statementsMatching(undefined, RDF('type'), SIOC('Post'));

	if (posts.length > 0) {
		var postitem = posts[0].subject;
		var postdata = {
			access_token: args.access_token,
		}

		var message = kb.any(postitem, SIOC('content'));
		var link = kb.any(postitem, SIOC('attachment'));

		if (!message && !link) {
			debug("Malformed Post. SIOC::content OR SIOC::attachment must be specified");
			callback({
				error: 'must specify SIOC::content OR SIOC::attachment',
				status: 400
			});
			return;
		}
		
		if (message) postdata.message = message.value;
		if (link) postdata.link = link.value;

		var options = {
			hostname: 'graph.facebook.com',
			port: 443,
			path: util.format('/v2.4/%s/feed', args.path_user),
			method: 'POST',
		}

		var req = https.request(options, function(res) {
			res.pipe(concat(function(body) {
				var parsed = JSON.parse(body);

				if (!parsed.error) {
					debug("Successfully created post");

					var postlocation = constants.BASEURL + args.path_user + "/posts/" + parsed.id;
					var commentslocation = constants.BASEURL + args.path_user + "/posts/comments_" + parsed.id;
					var likeslocation = constants.BASEURL + args.path_user + "/posts/likes_" + parsed.id;

					callback({
						headers: {
							location: postlocation,
							link : {
								comments: commentslocation,
								likes: likeslocation
							}
						}
					});
					return;
				} else {
					debug("Failed to create post. Error: %s", parsed.error.message);
					callback({ error: parsed.error.message, status: 403 })
				}
			}));
		});

		req.write(qs.stringify(postdata));
		req.end();
	} else {
		// could not find the proper structure
		callback({
			error: "could not find a SIOC Post resource in request",
			status: 400
		});
		return;
	}
}

exports.createImageUpload = function(args, callback) {
	debug("Begin image upload");
	var kb = $rdf.graph();

	$rdf.parse(args.data, kb, "_:", 'text/n3');
	debug("Image data parsed successfully");

	var images = kb.statementsMatching(undefined, RDF('type'), DCTYPE('Image'));

	if (images.length > 0) {
		var imgitem = images[0].subject;
		var imgdata = {
			access_token: args.access_token,
		}

		var url = kb.any(imgitem, DCT('source'));
		var caption = kb.any(imgitem, DCT('title'));

		if (!url) {
			debug("Malformed Image. DCT::source is required.");
			callback({
				error: 'must specify DCT::source',
				status: 400
			});
			return;
		}

		debug("Valid image upload parameters");
		if (url) imgdata.url = url.value;
		if (caption) imgdata.caption = caption.value;

		var options = {
			hostname: 'graph.facebook.com',
			port: 443,
			path: util.format('/v2.4/%s/photos', args.object_id),
			method: 'POST',
		}

		var req = https.request(options, function(res) {
			res.pipe(concat(function(body) {
				var parsed = JSON.parse(body);
				
				if (!parsed.error) {
					var imglocation = args.parent_uri + "/" + parsed.id;
					var postlocation = constants.BASEURL + args.current_user + "/posts/" + parsed.post_id;

					callback({
						headers: {
							location: imglocation,
							link : {
								post: postlocation
							}
						}
					});
				} else {
					debug("Failed to upload image. Error: %s", parsed.error.message);
					callback({ error: parsed.error.message, status: 403 })
				}
			}));
		});

		req.write(qs.stringify(imgdata));
		req.end();
	} else {
		// could not find the proper structure
		callback({
			error: "could not find a SIOC Post resource in request",
			status: 400
		});
		return;
	}
}

exports.createAlbum = function(args, callback) {
	debug("Begin album creation");
	var kb = $rdf.graph();

	$rdf.parse(args.data, kb, "_:", 'text/n3');
	debug("Album data parsed successfully");

	var albums = kb.statementsMatching(undefined, RDF('type'), SIOC('Container'));

	if (albums.length > 0) {
		var albumitem = albums[0].subject;
		var albumdata = {
			access_token: args.access_token,
		}

		var message = kb.any(albumitem, DCT('description'));
		var name = kb.any(albumitem, DCT('title'));

		if (!name) {
			debug("Malformed Album. DCT::title is required.");
			callback({
				error: 'must specify DCT::title',
				status: 400
			});
			return;
		}

		debug("Valid album creation parameters");
		if (message) albumdata.message = message.value;
		if (name) albumdata.name = name.value;

		var options = {
			hostname: 'graph.facebook.com',
			port: 443,
			path: util.format('/v2.4/%s/albums', args.path_user),
			method: 'POST',
		}

		var req = https.request(options, function(res) {
			res.pipe(concat(function(body) {
				var parsed = JSON.parse(body);
				
				if (!parsed.error) {
					var albumlocation = constants.BASEURL + args.current_user + "/albums/" + parsed.id;

					callback({
						headers: {
							location: albumlocation
						}
					});
				} else {
					debug("Failed to create album. Error: %s", parsed.error.message);
					callback({ error: parsed.error.message, status: 403 })
				}
			}));
		});

		req.write(qs.stringify(albumdata));
		req.end();
	} else {
		// could not find the proper structure
		callback({
			error: "could not find a SIOC Container resource in request",
			status: 400
		});
		return;
	}
}

exports.getAccessToken = function(args, callback) {
	var code = "AQBgI4GhKUYfKksE9QF-YEwb3IZ172a3nc2V-sg2zHfWSjUIvhPvrgkx3joh5D6HigSb4H2tiwGTAm16bg_mcQ5aTmIxeHi92CibQPs_l7kfo0ERbYsvgdukS-PRjwzY3wCqwvh-kMo9WPle10O797P9pczFGBBhgumg9u_bweBC0QhTGbOQwlYVzjHisI3YDfwpQzWor4P9m4Ft3XeG4UGuLsH_AteMlpSAH2MP4MUO0TMczBOxh50IbmdLek-RiG1Z7m7EVdnmZSzpVdec9u64Uzx70LhZHBiKtKjIZ8g-5LnPfJNAv5eQR8RTTULzlCs";
	var app_secret = "cdd376081fe295750f8e956828d93474";
	var app_id = "1464644210500554";

	var query = {
		client_id: app_id,
		redirect_uri: "http://local.happynchill.in:3000/receive_code",
		client_secret: app_secret,
		code: code
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: '/v2.3/oauth/access_token?'+ qs.stringify(query), 
	}, function(res) {
		console.log("response received");
		res.pipe(concat(function(body) {
			// Data reception is done, do whatever with it!
			var parsed = JSON.parse(body);
			console.log(parsed)
		}));
		// res.redirect('/');
	});
}



var buildPost = function(args) {
	var kb = $rdf.graph();

	var uri = constants.BASEURL + args.path_user + "/posts/" + args.post_id;

	kb.add($rdf.sym(""), RDF('type'), SIOC('Post'));
	kb.add($rdf.sym(""), DCT('created'), $rdf.lit(args.created));
	kb.add($rdf.sym(""), SIOC('has_creator'), $rdf.sym("#creator"));

	if (args.note) {
		kb.add($rdf.sym(""), SIOC('note'), $rdf.lit(args.note));
	}

	if (args.content) {
		kb.add($rdf.sym(""), SIOC('content'), $rdf.lit(args.content));
	}

	if (args.attachment) {
		kb.add($rdf.sym(""), SIOC('attachment'), $rdf.sym(args.attachment));
	}

	kb.add($rdf.sym("#creator"), RDF("type"), SIOC("UserAccount"));
	kb.add($rdf.sym("#creator"), SIOC("account_of"), $rdf.sym(constants.BASEURL + args.creator_id));

	kb.add($rdf.sym("#creator"), FOAF("name"), $rdf.lit(args.creator_name));
	return kb;
}

var buildComment = function(args) {
	var kb = args.kb;

	var comment_tag = "comment_" + args.id;	
	kb.add($rdf.sym(args.object_uri), LDFB("has_comment"), $rdf.sym(comment_tag));

	kb.add($rdf.sym(comment_tag), RDF("type"), SIOC("Post"));
	kb.add($rdf.sym(comment_tag), DCT("created"), $rdf.lit(args.created));
	kb.add($rdf.sym(comment_tag), SIOC("content"), $rdf.lit(args.content));
	kb.add($rdf.sym(comment_tag), SIOC("has_creator"), $rdf.sym(comment_tag + "#creator"));

	kb.add($rdf.sym(comment_tag + "#creator"), RDF("type"), SIOC("UserAccount"));
	kb.add($rdf.sym(comment_tag + "#creator"), SIOC("account_of"), $rdf.sym(constants.BASEURL + args.creator_id));
	kb.add($rdf.sym(comment_tag + "#creator"), FOAF("name"), $rdf.lit(args.creator_name));
}

exports.writeConfigAclFile = function(args, callback) {
	debug("execute acl write");
	var acl = $rdf.graph(); // configgraph

	acl.add($rdf.sym("#0"), RDF("type"), WAC("Authorization"));
	acl.add($rdf.sym("#0"), WAC("accessTo"), $rdf.sym(""));
	acl.add($rdf.sym("#0"), WAC('accessTo'), $rdf.sym(args.configurl.href));
	acl.add($rdf.sym("#0"), WAC('resourceKey'), $rdf.lit(constants.ACL_KEY));
	acl.add($rdf.sym("#0"), WAC('mode'), WAC('Read'));
	acl.add($rdf.sym("#0"), WAC('mode'), WAC('Write'));

	acl.add($rdf.sym("#1"), RDF("type"), WAC("Authorization"));
	acl.add($rdf.sym("#1"), WAC("accessTo"), $rdf.sym(""));
	acl.add($rdf.sym("#1"), WAC('accessTo'), $rdf.sym(args.configurl.href));
	acl.add($rdf.sym("#1"), WAC('agent'), $rdf.sym(args.userwebid));
	acl.add($rdf.sym("#1"), WAC('mode'), WAC('Read'));
	acl.add($rdf.sym("#1"), WAC('mode'), WAC('Write'));

	var aclserial = new $rdf.Serializer(acl).toN3(acl);

	var options = {
		hostname: args.aclurl.hostname,
		port: 443,
		path: args.aclurl.pathname,
		method: 'PUT',
		headers: {
			"Content-Type": "text/turtle"
		}
	}

	var req = https.request(options, function(res) {
		res.pipe(concat(function(body) {
			// var parsed = JSON.parse(body);
			debug(body);
			callback();
		}));
	});

	req.write(aclserial);
	req.end();
}

exports.writeConfigFile = function(args, callback) {

	var config = $rdf.graph(); // configgraph

	config.add($rdf.sym(""), RDF("type"), LDFB("Config"));
	config.add($rdf.sym(""), LDFB("fbemail"), $rdf.lit(args.email));
	config.add($rdf.sym(""), LDFB("fbpassword"), $rdf.lit(args.password));
	config.add($rdf.sym(""), LDFB("fbtoken"), $rdf.lit(args.access_token));
	config.add($rdf.sym(""), LDFB("fbid"), $rdf.lit(args.fbid));

	var configserial = new $rdf.Serializer(config).toN3(config);

	var options = {
		hostname: args.configurl.hostname,
		port: 443,
		path: args.configurl.pathname + util.format("?key=%s", constants.ACL_KEY),
		method: 'PUT',
		headers: {
			"Content-Type": "text/turtle"
		}
	}

	var req = https.request(options, function(res) {
		res.pipe(concat(function(body) {
			// var parsed = JSON.parse(body);
			console.log(body);
			callback();
		}));
	});

	req.write(configserial);
	req.end();
}

exports.getConfig = function(args, callback) {
	debug("fetching config");
	var kb = $rdf.graph();
	var fetch = $rdf.fetcher(kb);

	var configurl = url.parse(args.configurl + "?key=" + constants.ACL_KEY);

	https.get({
		hostname: configurl.hostname,
		path: configurl.path,
		headers: {
			DataType: "text/turtle"
		}
	}, function(res) {
		res.pipe(concat(function(body) {
			// debug(body.toString("utf-8"));
			$rdf.parse(body.toString("utf-8"), kb, args.configurl, 'text/n3');

			var configs = kb.statementsMatching(undefined, RDF("type"), LDFB("Config"));

			if (configs.length > 0) {
				debug("found config");
				debug(configs[0].subject);

				var results = {};
				var configitem = configs[0].subject;


				for (var i = 0; i < args.fields.length; i++) {
					if (args.fields[i] === "access_token") {
						var token = kb.any(configitem, LDFB("fbtoken"));
						debug("token: ", token);
						if (token) {
							results.access_token = token.value;
						}
					}

					if (args.fields[i] === "email") {
						var email = kb.any(configitem, LDFB("fbemail"));
						if (email) {
							results.email = email.value;
						}
					}

					if (args.fields[i] === "password") {
						var password = kb.any(configitem, LDFB("fbpassword"));
						if (password) {
							results.password = password.value;
						}
					}

					if (args.fields[i] === "fbid") {
						var fbid = kb.any(configitem, LDFB("fbid"));
						if (fbid) {
							results.fbid = fbid.value;
						}
					}
				} 
				callback(results);
			} else {
				callback({error: "no config data found"});
			}

		}));
	});
}
