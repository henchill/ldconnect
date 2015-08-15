var user_info = {};

exports = module.exports = {
	update: function(userId, info) {
		if (!user_info.hasOwnProperty(userId)) {
			user_info[userId] = {};
		}
		for (var prop in info) {
			if (info.hasOwnProperty(prop)) {
				user_info[userId][prop] = info[prop];
			}
		}
	},
	getInfo: function(userId, prop) {
		console.log(JSON.stringify(user_info));
		if (user_info.hasOwnProperty(userId)) {
			console.log("returning defined");
			return user_info[userId][prop];
		}
		console.log("returning undefined");
		return undefined;
	}
}

// https://henchill.databox.me/Preferences/ldconnect_config