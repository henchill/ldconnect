var access_token = "CAAU0Fg3jo8oBAGeMV4u6RaQbFnFrKZC8dUDqGZBuJP27nHPknFJyfREOQcLrF4ZCFLFQaTnZAZA585HfCgmuIq9vFwADteDb7PZBsrzSxVjYRZCZBeOqRWPz8gkNo2PWLkNoJP5CA8sOTbEDn6lAPUKczeho4l9082VbFFz9bXTf706xIS9Vav30tCAZA9wKvUcAZD";
var results = {}

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
var LDFB = $rdf.Namespace("https://henchill.databox.me/fb#");

var showoutput = function(start, end, name) {

}

var getPostsViaFacebook = function(results, test) {
	var uri = "https://graph.facebook.com/me/feed?access_token=" + access_token;
	var start = new Date();
	$.ajax({
		url: uri,
		type: "GET",
		success: function(res, status, xhr) {
			var end = new Date();
			var diff = end - start;
			results[test]["facebook"] = diff;
			console.log("Time for get posts facebook");
			console.log(diff);
			// $("#output").append(res);
			// alert("successfully created post");
		},
		error: function() {
			console.log("error");
		}
	});
}

var getPostsViaLDConnect = function(results, test) {
	var start = new Date();
	$.ajax({
		url: "https://he1.crosscloud.org:3001/me/posts/",
		type: "GET",
		contentType: "text/turtle;charset=utf-8",
		// processData: false,
		success: function(res, status, xhr) {
			var end = new Date();
			var diff = end - start;
			results[test]["ldconnect"] = diff;
			console.log("Time for get posts ldconnect");
			console.log(diff);
			// alert("successfully created post");
		},
		error: function(xhr, status, error) {
			alert("failed to create post: " + error);
		}
	});
}

var sendFacebookRequest = function(results, path, params, method, test, data) {
	var start = new Date();
	var uri = "https://graph.facebook.com/v2.4/" + path + "?access_token=" + access_token; 
	if (params) {
		uri += ("&" + params);
	}

	$.ajax({
		url: uri,
		type: method,
		success: function() {
			var end = new Date();
			var diff = end - start;
			results[test]["facebook"] = diff;
			console.log(test + " facebook: " + diff);
		},
		error: function() {
			alert("failed facebook req");
		}
	});
}

var sendLDConnectRequest = function(results, path, method, test, data) {
	var start = new Date();
	var uri = "https://he1.crosscloud.org:3001/me/" + path;

	$.ajax({
		url: uri,
		type: method,
		contentType: "text/turtle;charset=utf-8",
		data: data || "",
		processData: false,
		success: function() {
			var end = new Date();
			var diff = end - start;
			results[test]["ldconnect"] = diff;
			console.log(test + " ldconnect: " + diff);
		},
		error: function(a, b, c) {
			alert(JSON.stringify(a));
		}
	});
}

$("#testgetposts").click(function(evt) {
	console.log("test get posts clicked");
	evt.preventDefault();
	results["getPosts"] = {};
	sendLDConnectRequest(results, "posts/", "GET", "getPosts");
	sendFacebookRequest(results, "me/feed", undefined, "GET", "getPosts");
});

$("#testgetpost").click(function(evt) {
	console.log("test get individual post");
	evt.preventDefault();

	var postid = "10153596836209706_10153594679029706";

	results["getPost"] = {};
	sendLDConnectRequest(results, "posts/" + postid, "GET", "getPost");
	sendFacebookRequest(results, postid, "fields=id,story,from,message,created_time,link", "GET", "getPost");
});

$("#testgetcomments").click(function(evt) {
	console.log("test get comments");
	evt.preventDefault();

	var postid = "10153596836209706_10153594679029706";

	results["getComments"] = {};

	sendLDConnectRequest(results, "posts/comments_" + postid, "GET", "getComments");
	sendFacebookRequest(results, postid +"/comments", undefined, "GET", "getComments");
});

$("#testgetlikes").click(function(evt) {
	console.log("test get likes");
	evt.preventDefault();

	var postid = "10153596836209706_10153594679029706";

	results["getLikes"] = {};
	sendLDConnectRequest(results, "posts/likes_" + postid, "GET", "getLikes");
	sendFacebookRequest(results, postid +"/likes", undefined, "GET", "getLikes");
});

$("#testgetalbums").click(function(evt) {
	console.log("test get albums");
	evt.preventDefault();

	results["getAlbums"] = {};
	sendLDConnectRequest(results, "albums/", "GET", "getAlbums");
	sendFacebookRequest(results, "me/albums", undefined, "GET", "getAlbums");
});

$("#testgetalbum").click(function(evt) {
	console.log("test get album");
	evt.preventDefault();

	var albumid = "426703030282";

	results["getAlbum"] = {};
	sendLDConnectRequest(results, "albums/" +albumid+"/", "GET", "getAlbum");
	sendFacebookRequest(results, albumid +"/photos", undefined, "GET", "getAlbum");
});

$("#testgetimage").click(function(evt) {
	console.log("test get photo");
	evt.preventDefault();

	var albumid = "426703030282";
	var photoid = "10152976450025283";

	results["getImage"] = {};
	sendLDConnectRequest(results, "albums/" +albumid+"/"+photoid, "GET", "getImage");
	sendFacebookRequest(results, photoid, "fields=id,name,from,picture,album,created_time", "GET", "getImage");
});

$("#testwritepost").click(function(evt) {
	console.log("test write post");
	evt.preventDefault();
	var kb = $rdf.graph();
	kb.add($rdf.sym(""), RDF("type"), SIOC("Post"));
	kb.add($rdf.sym(""), SIOC("attachment"), $rdf.lit("http://img.wikinut.com/img/14val6dt214m14om/jpeg/0/Facebook.jpeg"));
	kb.add($rdf.sym(""), SIOC("content"), $rdf.lit("Post 1"));

	var s = new $rdf.Serializer(kb).toN3(kb);

	sendLDConnectRequest(results, "posts/", "POST", "writePost", s);
	sendFacebookRequest(results, photoid, "fields=id,name,from,picture,album,created_time", "GET", "getImage");
});

$("#testwritecomment").click(function(evt) {
	console.log("test write comment");
	evt.preventDefault();
	var kb = $rdf.graph();
	kb.add($rdf.sym(""), RDF("type"), SIOC("Post"));
	kb.add($rdf.sym(""), SIOC("attachment"), $rdf.lit("http://img.wikinut.com/img/14val6dt214m14om/jpeg/0/Facebook.jpeg"));
	kb.add($rdf.sym(""), SIOC("content"), $rdf.lit("Comment 1"));

	var s = new $rdf.Serializer(kb).toN3(kb);
	
	sendLDConnectRequest(results, "albums/" +albumid+"/"+photoid, "GET", "getImage");
	sendFacebookRequest(results, photoid, "fields=id,name,from,picture,album,created_time", "GET", "getImage");
});

$("#testwriteimage").click(function(evt) {
	console.log("test upload image");
	evt.preventDefault();
	var kb = $rdf.graph();
	kb.add($rdf.sym(""), RDF("type"), DCTYPE("Image"));
	kb.add($rdf.sym(""), DCT("source"), $rdf.lit("https://gun.io/static/uploads/HTML%3ACSS3.jpg"));
	kb.add($rdf.sym(""), DCT("title"), $rdf.lit("HTML5CSS3"));
	
	var s = new $rdf.Serializer(kb).toN3(kb);
});

$("#testcreatealbum").click(function(evt) {
	console.log("test create album");
	evt.preventDefault();
	var kb = $rdf.graph();
	kb.add($rdf.sym(""), RDF("type"), SIOC("Container"));
	kb.add($rdf.sym(""), DCT("title"), $rdf.lit("Album 1"));
	kb.add($rdf.sym(""), DCT("description"), $rdf.lit("Test Album"));

	var s = new $rdf.Serializer(kb).toN3(kb);

	results["addalbum"] = {};
	sendLDConnectRequest(results, "albums/", "POST", "addalbum", s);
});

$("#testaddfriend").click(function(evt) {
	console.log("test add friend");
	evt.preventDefault();
	var kb = $rdf.graph();

	kb.add($rdf.sym("_:"), LDFB("has_friend"), $rdf.sym("#user_" + "100010009322829"));
	var s = new $rdf.Serializer(kb).toN3(kb);
	
	results["addfriend"] = {};
	sendLDConnectRequest(results, "friends", "POST", "addfriend", s);
});

$("#testall").click(function(evt) {

});

$("#testget").click(function(evt) {
	$("#testgetimage").click();
	$("#testgetposts").click();
	$("#testgetpost").click();
	$("#testgetcomments").click();
	$("#testgetlikes").click();
	$("#testgetalbum").click();
	$("#testgetalbums").click();

	setInterval(function() {
		console.log(JSON.stringify(results)); 
	}, 5000);
});