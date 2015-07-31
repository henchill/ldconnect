var $rdf = require('rdflib');
var http = require('http');
var https = require('https');
var util = require('util');
var concat = require('concat-stream');
var qs = require('querystring');
var async = require('async');

exports.app_secret = "cdd376081fe295750f8e956828d93474";
exports.app_id = "1464644210500554";

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
var LDFB = $rdf.Namespace("http://henchill.databox.me/fb#");

var BASEURL = "http://local.happynchill.com/";

exports.getProfileFromWebid = function(uri, callback) {
	var kb = $rdf.graph();
	console.log("get profile executing");
	var person = $rdf.sym(uri);
	var docURI = uri.slice(0, uri.indexOf('#'));
	var fetch = $rdf.fetcher(kb);
	fetch.nowOrWhenFetched(docURI, undefined, function(ok, body, xhr) { // @@ check ok
		if (!ok) {
			console.log(body);
		}
		console.log("object loaded");

		var person_info = {};
		var name = kb.any(person, FOAF('name'));
		if (name) {
			person_info.name = name;
		}
		callback(person_info);
	});
}

exports.getProfile = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		'access_token': args.access_token,
		fields: 'id,name,picture'
	}

	console.log("get profile");
	console.log(args);
	// obtain webid and store 
	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s?%s', args.user_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			// Data reception is done, do whatever with it!
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				var uri = BASEURL + parsed.id;
				kb.add($rdf.sym("#fbprofile"), RDF('type'), SIOC('UserAccount'));
				kb.add($rdf.sym("#fbprofile"), SIOC('account_of'), $rdf.sym(uri));
				kb.add($rdf.sym("#fbprofile"), FOAF('img'), $rdf.sym(parsed.picture.data.url));
				kb.add($rdf.sym("#fbprofile"), FOAF('name'), $rdf.lit(parsed.name));

				var s = new $rdf.Serializer(kb).toN3(kb);
				var jsonout = {
					id: parsed.id,
					name: parsed.name,
					img: parsed.picture.data.url
				};

				callback({n3: s, json: jsonout});
			} else {
				callback({error: parsed.error})
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
		path: util.format('/v2.4/%s/friends?%s', args.user_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			var containeruri = BASEURL + args.user_id + '/friends/';

			kb.add($rdf.sym(containeruri), RDF('type'), SIOC('Container'));
			kb.add($rdf.sym(containeruri), DCT('title'), $rdf.lit('friends'));

			for (var i = 0; i < parsed.data.length; i++) {
				var person = parsed.data[i];
				var uri = BASEURL + person.id; 
				kb.add($rdf.sym(BASEURL + args.user_id), FOAF('knows'), $rdf.sym(uri));
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
		'access_token': args.access_token,
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/albums?%s', args.user_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			var containeruri = BASEURL + args.user_id + '/albums/';

			kb.add($rdf.sym(containeruri), RDF('type'), SIOC('Container'));
			kb.add($rdf.sym(containeruri), DCT('title'), $rdf.lit('albums'));

			for (var i = 0; i < parsed.data.length; i++) {
				var album = parsed.data[i];
				var uri = BASEURL + args.user_id + '/albums/' + album.id;

				kb.add($rdf.sym(uri), RDF('type'), SIOC('Container'));
				kb.add($rdf.sym(uri), DCT('title'), $rdf.lit(album.name));
				kb.add($rdf.sym(uri), DCT('created'), $rdf.lit(album.created_time));
				kb.add($rdf.sym(uri), DCT('creator'), $rdf.sym(BASEURL + args.user_id));

				// add triple about next and previous uri. 
			}
			
			var s = new $rdf.Serializer(kb).toN3(kb);
			callback({n3: s})
		}));
	});
}

exports.getAlbum = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		'access_token': args.access_token,
	}

	var album_id = args.album_id || args.user_id;

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/photos?%s', album_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				var containeruri;
				if (args.album_id) {
					containeruri = BASEURL + args.user_id + '/albums/' + args.album_id;
				} else {
					containeruri = BASEURL + args.user_id + '/photos/';
				}
				kb.add($rdf.sym(containeruri), RDF('type'), SIOC('Container'));
				kb.add($rdf.sym(containeruri), DCT('title'), $rdf.lit(args.album_id || "photos"));

				for (var i = 0; i < parsed.data.length; i++) {
					var image = parsed.data[i];
					var uri = containeruri + '/' + image.id;

					kb.add($rdf.sym(uri), RDF('type'), DCTYPE('Image'));
					kb.add($rdf.sym(uri), DCT('created'), $rdf.lit(image.created_time));
					if (image.name) {
						kb.add($rdf.sym(uri), DCT('title'), $rdf.lit(image.name));
					}
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({n3: s})
			} else {
				console.log(parsed.error);
				callback({error: parsed.error});
			}
		}));
	})
}

exports.getPhoto = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		'access_token': args.access_token,
		'redirect': false,
		'fields': 'id,name,from,picture,album,created_time'
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s?%s', args.photo_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			var uri;
			if (parsed.album) {
				var album = parsed.album.id;
				uri = BASEURL + args.user_id + '/albums/' + parsed.album.id + '/' + parsed.id;
			} else {
				uri = BASEURL + args.user_id + '/photos/' + parsed.id;
			}
			console.log(parsed);
			kb.add($rdf.sym(uri), RDF('type'), DCTYPE('Image'));
			kb.add($rdf.sym(uri), DCT('created'), $rdf.lit(parsed.created_time));
			kb.add($rdf.sym(uri), DCT('source'), $rdf.sym(parsed.picture));
			kb.add($rdf.sym(uri), DCT('creator'), $rdf.sym(BASEURL + parsed.from.id));
			
			// kb.add($rdf.sym('#createdby'), RDF('type'), SIOC('UserAccount'));
			// kb.add($rdf.sym('#createdby'), SIOC('account_of'), $rdf.sym(BASEURL + parsed.from.id));
			// kb.add($rdf.sym('#createdby'), FOAF('name'), $rdf.lit(parsed.from.name));

			var s = new $rdf.Serializer(kb).toN3(kb);
			callback({n3: s});
		}));
	});
}

exports.getPosts = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		'access_token': args.access_token,
	}

	// console.log(args);
	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/%s?%s', args.user_id, args.type, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			if (!parsed.error) {
				var containeruri = BASEURL + args.user_id + '/' + args.type;

				kb.add($rdf.sym(containeruri), RDF('type'), SIOC('Container'));
				kb.add($rdf.sym(containeruri), DCT('title'), $rdf.lit(args.type));

				for (var i = 0; i < parsed.data.length; i++) {
					var post = parsed.data[i];
					var posturi = containeruri + '/' + post.id;
					kb.add($rdf.sym(posturi), RDF('type'), SIOC('Post'));
					kb.add($rdf.sym(posturi), DCT('created'), $rdf.lit(post.created_time));
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({n3: s});
			} else {
				console.log(parsed.error);
				console.log(args);
				callback({error: parsed.error});
			}
		}));
	});
}

exports.getPost = function(args, callback) {
	var kb = $rdf.graph();

	var query = {
		'access_token': args.access_token,
		'fields': 'id,story,from,message,created_time,link'
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s?%s', args.post_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			console.log(parsed);

			if (!parsed.error) {
				var uri = BASEURL + args.user_id + '/feed/' + parsed.id;

				kb.add($rdf.sym(uri), RDF('type'), SIOC('Post'));
				kb.add($rdf.sym(uri), DCT('created'), $rdf.lit(parsed.created_time));
				kb.add($rdf.sym(uri), DCT('creator'), $rdf.sym(BASEURL + parsed.from.id));

				if (parsed.story) {
					kb.add($rdf.sym(uri), SIOC('note'), $rdf.lit(parsed.story));
				}

				if (parsed.message) {
					kb.add($rdf.sym(uri), SIOC('content'), $rdf.lit(parsed.message));
				}

				if (parsed.link) {
					kb.add($rdf.sym(uri), SIOC('attachment'), $rdf.sym(parsed.link));
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				callback({n3: s});
			} else {
				callback({error: parsed.error});
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
	var kb = $rdf.graph();
	console.log("begin comments");
	console.log(args);
	var query = {
		'access_token': args.access_token,
	}

	https.get({
		hostname: 'graph.facebook.com',
		path: util.format('/v2.4/%s/comments?%s', args.object_id, qs.stringify(query)),
	}, function(res) {
		res.pipe(concat(function(body) {
			var parsed = JSON.parse(body);
			console.log("comments return");
			console.log(parsed);
			if (!parsed.error) {
				for (var i = 0; i < parsed.data.length; i++) {
					var comment = parsed.data[i];
					var uri = args.object_uri + '/comments/' + comment.id;
					kb.add($rdf.sym(uri), RDF('type'), SIOC('Post'));
					kb.add($rdf.sym(uri), DCT('created'), $rdf.lit(comment.created_time));
					kb.add($rdf.sym(uri), DCT('creator'), $rdf.sym(BASEURL + comment.from.id));
					kb.add($rdf.sym(uri), SIOC('content'), $rdf.lit(comment.message));
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				console.log(s);
				callback(null, {n3: s});
			} else {
				callback(null, {error: parsed.error});
			}
			console.log("exiting comments");
		}));
	});
}

exports.getLikes = function(args, callback) {
	var kb = $rdf.graph();
	console.log(args);

	var query = {
		'access_token': args.access_token,
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
					var uri = args.objecturi + '/likes/' + like.id;

					// kb.add($rdf.sym(BASEURL + like.id), LDFB('likes'), $rdf.sym(args.objecturi));
				}

				var s = new $rdf.Serializer(kb).toN3(kb);
				console.log(s);
				callback(null, {n3: s});
			} else {
				callback(null, {error: parsed.error});
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
	console.log("fetcher write post");
	var kb = $rdf.graph();

	$rdf.parse(args.data, kb, 'https://henchill.databox.me/fb', 'text/n3');

	console.log("rdf parsed successfully");
	var posts = kb.statementsMatching(undefined, RDF('type'), SIOC('Post'));
	if (posts.length > 0) {
		var postitem = posts[0].subject.value;
		var message = g.any(postitem, SIOC('content')).value;
		var link = g.any(postitem, SIOC('attachment')).value;

		var postdata = {
			'access_token': args.access_token,
			'message': message,
			'link': link,
		}

		var options = {
			hostname: 'graph.facebook.com',
			port: 443,
			path: util.format('/v2.4/%s/feed', args.user_id),
			method: 'POST',
		}

		var req = https.request(options, function(res) {
			res.pipe(concat(function(body) {
				var parsed = JSON.parse(body);
				// TODO: execute callback
				console.log(parsed)
				callback(parsed);
			}));
		});

		req.write(qs.stringify(postdata));
		req.end();
	}	
}

exports.postImage = function(args, callback) {
	var kb = $rdf.graph();

	$rdf.parse(args.data, kb, 'https://henchill.databox.me/fb', 'text/n3');

	var images = kb.statementsMatching(undefined, RDF('type'), DCTYPE('Image'));
	if (images.length > 0) {
		var imgitem = images[0].subject.value;
		var url = g.any(imgitem, DCT('source')).value;

		var postdata = {
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

		req.write(qs.stringify(postdata));
		req.end();
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