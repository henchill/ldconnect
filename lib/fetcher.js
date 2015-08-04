var $rdf = require('rdflib');
var http = require('http');
var https = require('https');
var util = require('util');
var concat = require('concat-stream');
var qs = require('querystring');
var async = require('async');
var constants = require('./constants.js');
var debug = require('./logging.js').fetcher;

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

exports.getProfileFromWebid = function(uri, callback) {
	var kb = $rdf.graph();
	var person = $rdf.sym(uri);
	var docURI = uri.slice(0, uri.indexOf('#'));
	var fetch = $rdf.fetcher(kb);
	fetch.nowOrWhenFetched(docURI, undefined, function(ok, body, xhr) { // @@ check ok
		if (!ok) {
			debug("Failed to fetch profile from webid");
			callback({ error: "could not fetch profile from webid"});
			return;
		}

		var person_info = {};
		var name = kb.any(person, FOAF('name'));
		if (name) {
			person_info.name = name;
		}
		callback(person_info);
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
		'access_token': args.access_token,
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/friends?%s', args.path_user, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			var containeruri = constants.BASEURL + args.path_user + '/friends/';

			kb.add($rdf.sym(containeruri), RDF('type'), SIOC('Container'));
			kb.add($rdf.sym(containeruri), DCT('title'), $rdf.lit('friends'));

			for (var i = 0; i < parsed.data.length; i++) {
				var person = parsed.data[i];
				var uri = constants.BASEURL + person.id; 
				kb.add($rdf.sym(constants.BASEURL + args.path_user), FOAF('knows'), $rdf.sym(uri));
			}

			// add triple about next and previous uri. 
			var s = new $rdf.Serializer(kb).toN3(kb);
			callback({n3: s});
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

				debug(parsed.data);
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
						data: parsed.data,
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

exports.likeObject = function(args, callback) {
	var kb = $rdf.graph();

	var postdata = {
		'access_token': args.access_token,
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
			console.log(parsed)
		}));
	});

	req.write(qs.stringify(postdata));
	req.end();
}

exports.postComment = function(args, callback) {
	var kb = $rdf.graph();

	$rdf.parse(args.data, kb, 'https://henchill.databox.me/fb', 'text/n3');

	var comments = kb.statementsMatching(undefined, RDF('type'), SIOC('Post'));
	if (comments.length > 0) {
		var commentitem = comments[0].subject.value;
		var message = g.any(commentitem, SIOC('content')).value;

		var postdata = {
			'access_token': args.access_token,
			'message': message,
		}

		var options = {
			hostname: 'graph.facebook.com',
			port: 443,
			path: util.format('/v2.4/%s/comments', args.object_id),
			method: 'POST',
		}

		var req = https.request(options, function(res) {
			res.pipe(concat(function(body) {
				var parsed = JSON.parse(body);
				// TODO: execute callback
				console.log(parsed)
			}));
		});

		req.write(qs.stringify(postdata));
		req.end();
	}	
}

exports.writePost = function(args, callback) {
	var kb = $rdf.graph();
	$rdf.parse(args.data, kb, constants.LDCONNECT_NS, 'text/n3');

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
				message: 'must specify message link or story',
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
					var buildargs = {
						post_id: parsed.id,
						path_user: args.path_user,
						creator: args.current_user,
						content: parsed.message,
						attachment: parsed.link
					}

					var kb = buildPost(buildargs);
					var s = $rdf.Serializer(kb).toN3(kb);
					// callback on post resource
					callback({ data: s, json_data: buildargs });
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
			message: "could not find a SIOC Post resource in request",
			status: 400
		});
		return;
	}
}

exports.postImage = function(args, callback) {
	var kb = $rdf.graph();

	$rdf.parse(args.data, kb, constants.LDCONNECT_NS, 'text/n3');

	var images = kb.statementsMatching(undefined, RDF('type'), DCTYPE('Image'));
	if (images.length > 0) {
		var imgitem = images[0].subject;
		var url = kb.any(imgitem, DCT('source')).value;

		var imgdata = {
			'access_token': args.access_token,
			'url': url,
		}

		var options = {
			hostname: 'graph.facebook.com',
			port: 443,
			path: util.format('/v2.4/%s/photos', args.object_id),
			method: 'POST',
		}

		var req = https.request(options, function(res) {
			res.pipe(concat(function(body) {
				var parsed = JSON.parse(body);
				// TODO: execute callback
				console.log(parsed)
			}));
		});

		req.write(qs.stringify(imgdata));
		req.end();
	} else {
		// could not find the proper structure
		callback({
			message: "could not find a SIOC Post resource in request",
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

var buildLike = function(args) {

}

var buildPhoto = function(args) {

}

var buildAlbum = function(args) {

}