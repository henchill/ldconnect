var session_info = {};

var test1 = {
	fbid: "102751230077034", 
	access_token: "CAAU0Fg3jo8oBABjAnUh5pvO8hpaiSwv5zH6TOnjYzozZAHOv2i0fq8FRZCjpNbPFpGoX1h3tqQMVgpjNWIMM8ZBbqUX5a3dB33wzFBHZAeVVlP0e52Dmvhs20GdYClnCbZBZA9S8wl84EUCnRRBPI0MdZCPGUEZC8UL5YZCztGnFZCt2JUTdGHIIs8Msx9Xs4ILOYZD"
}

session_info["test1"] = test1;

var addPropertiesToSession = function(userId, properties) {
	for (var property in properties) {
		if (properties.hasOwnProperty(property)) {
			session_info[userId][property] = properties[property];
		}
	}
}

exports = module.exports = {
	newSession: function(userId, properties) {
		session_info[userId] = {};
		if (properties) {
			addPropertiesToSession(userId, properties);
		}
	},
	updateSession: function(userId, properties) {
		if (userId && properties) {
			if (!session_info.hasOwnProperty(userId)) {
				session_info[userId] = {};
			} 
			
			addPropertiesToSession(userId, properties);
			return true;
		}
		return false;
	},
	deleteSession: function(userId) {
		delete session_info[userId];
	},
	getProperty: function(userId, property) {
		if (session_info.hasOwnProperty(userId)) {
			return session_info[userId][property];
		}
		return undefined;
	},
	getSession: function(userId) {
		if (session_info.hasOwnProperty(userId)) {
			return session_info[userId];
		}
		return undefined;
	},
	hasSession: function(userId) {
		if (session_info.hasOwnProperty(userId)) {
			return true;
		}
		return false;
	},
	deleteProperty: function(userId, property) {
		if (session_info.hasOwnProperty(userId)) {
			delete session_info[userId][property];
		}
	}
}