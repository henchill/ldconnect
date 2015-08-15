var PROXY = "https://data.fm/proxy?uri={uri}";
var TIMEOUT = 90000;

var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
var PIM = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
var LDFB = $rdf.Namespace("https://henchill.databox.me/fb#");
var WAC = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");
var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');

var g = $rdf.graph();
var f = $rdf.fetcher(g, TIMEOUT);

var unquote = function(value) {
    if (value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') {
		return value.substring(1, value.length - 1);
    }
    return value;
}

var parseLinkHeader = function(header) {	
	var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
	var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;

	var matches = header.match(linkexp);
	var rels = {};
	for (i = 0; i < matches.length; i++) {
		var split = matches[i].split('>');
		var href = split[0].substring(1);
		var ps = split[1];
		var link = {};
		link.href = href;
		var s = ps.match(paramexp);
		// console.log(link.href); //debug
		for (j = 0; j < s.length; j++) {
			var p = s[j];
			var paramsplit = p.split('=');
			var name = paramsplit[0];
			link[name] = unquote(paramsplit[1]);
		}

		if (link.rel !== undefined) {
			rels[link.rel] = link;
		}
	}   
    
    return rels;
}

$("#scrape").click(function() {
	if (this.checked) {
		$("#logininfo").removeClass("hidden");
	} else {
		$("#logininfo").addClass("hidden");
	}
});

$("#obtainaccesstoken").click(function(evt) {
	evt.preventDefault();
	var data = {};
	if ($("#scrape").prop("checked")) {
		console.log("e and p provided");
		data.email = $("#email").val();
		data.password = $("#password").val();
	}

	console.log(preferencesfile);
	f.nowOrWhenFetched(preferencesfile, undefined, function(ok, body) {
		if (!ok) {
			console.log(body);
			alert("Failed to fetch resource");
		} else {
			var pws = g.statementsMatching(undefined, RDF('type'), PIM("PreferencesWorkspace"));

			if (pws.length > 0) {
				prefWorspace = pws[0].subject.value;

				// var s = new $rdf.Serializer(g).toN3(g);
				// console.log(s);
				// alert(prefWorspace);

				// create ldconfig
				var configendpoint = prefWorspace + "ldconnect_config";

				$.ajax({
					type: "POST",
					url: configendpoint,
					xhrFields: {
						withCredentials: true
					},
					processData: false,
					success: function(d, s, r) {
						console.log("Successfully created config file");
						var meta = parseLinkHeader(r.getResponseHeader('Link'));
                		var aclURI = meta['acl']['href'];
                		// var uri = r.getResponseHeader("Location");
						console.log(aclURI);

						var cg = $rdf.graph(); // configgraph
						if (!cg) {
							alert("No cg");
						}
						// console.log(uri);

						cg.add($rdf.sym(""), RDF("type"), WAC("Authorization"));
						cg.add($rdf.sym(""), WAC("accessTo"), $rdf.sym(""));
						cg.add($rdf.sym(''), WAC('accessTo'), $rdf.sym(configendpoint));
						cg.add($rdf.sym(''), WAC('agentClass'), FOAF("Agent"));
						cg.add($rdf.sym(''), WAC('mode'), WAC('Read'));
						cg.add($rdf.sym(''), WAC('mode'), WAC('Write'));

						var serializedstr = new $rdf.Serializer(cg).toN3(cg);

						$.ajax({
							type: "POST",
							url: aclURI,
							xhrFields: {
								withCredentials: true
							},
							data: serializedstr,
							processData: false,
							contentType: "text/turtle",
							success: function(d, s, r) {
								console.log("successfully created acl");
								data.configurl = configendpoint;
								data.aclurl = aclURI;
								console.log(data);
								// console.log
								$.ajax({
									type: "POST",
									url: "/facebook_token",
									contentType: "text/json;charset=utf-8",
									// data: data,
									data: JSON.stringify(data),
									// processData: false,
									success: function(res) {
										window.location.href = res.redirecturl;
										// alert("Success");
									},
									error: function(d, s, r) {
										console.log(d);
										console.log(s);
										alert("Error");
									},
									complete: function(d, s, r) {
										console.log("complete");
									}
								});
								// alert("Success");
							}, 
							error: function(d, s, r) {
								alert("Error 2");
							}
						});						
					},
					error: function(d, s, r) {
						alert("Error");
					}
				});

				
				// submit username and password if provided
			}
		}
	});

	// $.post("/facebook_token", data, 
	// 	function(res) {
	// 		window.location.href = res.redirecturl;
	// 	}
	// );
});