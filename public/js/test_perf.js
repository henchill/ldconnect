var access_token = "CAAU0Fg3jo8oBAGeMV4u6RaQbFnFrKZC8dUDqGZBuJP27nHPknFJyfREOQcLrF4ZCFLFQaTnZAZA585HfCgmuIq9vFwADteDb7PZBsrzSxVjYRZCZBeOqRWPz8gkNo2PWLkNoJP5CA8sOTbEDn6lAPUKczeho4l9082VbFFz9bXTf706xIS9Vav30tCAZA9wKvUcAZD";
var results = {}


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
		url: "/me/posts/",
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

$("#testgetposts").click(function(evt) {
	console.log("test get posts clicked");
	evt.preventDefault();
	results["getPosts"] = {};
	getPostsViaLDConnect(results, "getPosts");
	getPostsViaFacebook(results, "getPosts");
});

$("#testgetcomments").click(function() {

});

$("#testgetlikes").click(function() {

});

$("#testgetimages").click(function() {

});

$("#testwritepost").click(function() {

});

$("#testwritecomment").click(function() {

});

$("#testwriteimage").click(function() {

});

$("#testaddfriend").click(function() {

});

$("#testall").click(function() {

});