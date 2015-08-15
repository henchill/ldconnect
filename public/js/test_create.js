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

$("#submitpost").click(function(evt) {
	evt.preventDefault();
	$("#submitpost").prop("disabled", true);
	if ($("#endpoint").val() === "") {
		$("#submitpost").prop("disabled", false);
		alert("Please specify an endpoint");
		return;
	}

	var endpoint = $("#endpoint").val()
	var kb = $rdf.graph();
	kb.add($rdf.sym(""), RDF("type"), SIOC("Post"));

	if ($("#postattach").val() !== "") {
		kb.add($rdf.sym(""), SIOC("attachment"), $rdf.lit($("#postattach").val()));
	}

	if ($("#postcontent").val() !== "") {
		kb.add($rdf.sym(""), SIOC("content"), $rdf.lit($("#postcontent").val()));
	}

	var s = new $rdf.Serializer(kb).toN3(kb);
	console.log(s);
	
	$.ajax({
		url: endpoint,
		type: "POST",
		contentType: "text/turtle;charset=utf-8",
		data: s,
		processData: false,
		success: function(res, status, xhr) {
			console.log(res);
			console.log(xhr.getAllResponseHeaders());
			$("#submitpost").prop("disabled", false);
			alert("successfully created post");

		},
		error: function(xhr, status, error) {
			$("#submitpost").prop("disabled", false);
			alert("failed to create post: " + error);
		}
	});
});

$("#submitimg").click(function(evt) {
	evt.preventDefault();

	$("#submitimg").prop("disabled", true);
	if ($("#endpoint").val() === "") {
		$("#submitimg").prop("disabled", false);
		alert("Please specify an endpoint");
		return;
	}

	var endpoint = $("#endpoint").val()
	var kb = $rdf.graph();
	kb.add($rdf.sym(""), RDF("type"), DCTYPE("Image"));

	if ($("#imgsource").val() !== "") {
		kb.add($rdf.sym(""), DCT("source"), $rdf.lit($("#imgsource").val()));
	}

	if ($("#imgcontent").val() !== "") {
		kb.add($rdf.sym(""), DCT("title"), $rdf.lit($("#imgcontent").val()));
	}

	var s = new $rdf.Serializer(kb).toN3(kb);
	console.log(s);

	$.ajax({
		url: endpoint,
		type: "POST",
		contentType: "text/turtle;charset=utf-8",
		data: s, 
		processData: false,
		success: function(res, status, xhr) {
			console.log(res);
			console.log(xhr.getAllResponseHeaders());
			$("#submitimg").prop("disabled", false);
			alert("successfully created like");

		},
		error: function(xhr, status, error) {
			$("#submitimg").prop("disabled", false);
			alert("failed to create like: " + error);
		}
	});

});

$("#submitcomment").click(function(evt) {
	evt.preventDefault();

	$("#submitcomment").prop("disabled", true);
	if ($("#endpoint").val() === "") {
		$("#submitcomment").prop("disabled", false);
		alert("Please specify an endpoint");
		return;
	}

	var endpoint = $("#endpoint").val()
	var kb = $rdf.graph();
	kb.add($rdf.sym(""), RDF("type"), SIOC("Post"));

	if ($("#commentattach").val() !== "") {
		kb.add($rdf.sym(""), SIOC("attachment"), $rdf.lit($("#commentattach").val()));
	}

	if ($("#commentcontent").val() !== "") {
		kb.add($rdf.sym(""), SIOC("content"), $rdf.lit($("#commentcontent").val()));
	}

	var s = new $rdf.Serializer(kb).toN3(kb);
	console.log(s);
	
	$.ajax({
		url: endpoint,
		type: "POST",
		contentType: "text/turtle;charset=utf-8",
		data: s,
		processData: false,
		success: function(res, status, xhr) {
			console.log(res);
			console.log(xhr.getAllResponseHeaders());
			$("#submitcomment").prop("disabled", false);
			alert("successfully created comment");

		},
		error: function(xhr, status, error) {
			$("#submitcomment").prop("disabled", false);
			alert("failed to create comment: " + error);
		}
	});
});

$("#submitlike").click(function(evt) {
	evt.preventDefault();

	$("#submitlike").prop("disabled", true);
	if ($("#endpoint").val() === "") {
		$("#submitlike").prop("disabled", false);
		alert("Please specify an endpoint");
		return;
	}

	var endpoint = $("#endpoint").val();
	
	$.ajax({
		url: endpoint,
		type: "POST",
		contentType: "text/turtle;charset=utf-8",
		processData: false,
		success: function(res, status, xhr) {
			console.log(res);
			console.log(xhr.getAllResponseHeaders());
			$("#submitlike").prop("disabled", false);
			alert("successfully created like");

		},
		error: function(xhr, status, error) {
			$("#submitlike").prop("disabled", false);
			alert("failed to create like: " + error);
		}
	});
});

$("#submitalbum").click(function(evt) {
	evt.preventDefault();

	$("#submitalbum").prop("disabled", true);
	if ($("#endpoint").val() === "") {
		$("#submitalbum").prop("disabled", false);
		alert("Please specify an endpoint");
		return;
	}

	var endpoint = $("#endpoint").val()
	var kb = $rdf.graph();
	kb.add($rdf.sym(""), RDF("type"), SIOC("Container"));

	if ($("#albumname").val() !== "") {
		kb.add($rdf.sym(""), DCT("title"), $rdf.lit($("#albumname").val()));
	}

	if ($("#albumdesc").val() !== "") {
		kb.add($rdf.sym(""), DCT("description"), $rdf.lit($("#albumdesc").val()));
	}

	var s = new $rdf.Serializer(kb).toN3(kb);
	console.log(s);
	
	$.ajax({
		url: endpoint,
		type: "POST",
		contentType: "text/turtle;charset=utf-8",
		data: s,
		processData: false,
		success: function(res, status, xhr) {
			console.log(res);
			console.log(xhr.getAllResponseHeaders());
			$("#submitalbum").prop("disabled", false);
			alert("successfully created album");

		},
		error: function(xhr, status, error) {
			$("#submitalbum").prop("disabled", false);
			alert("failed to create album: " + error);
		}
	});
});