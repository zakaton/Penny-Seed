const User = require("../models/User");

module.exports = {
	isAuthenticated: function (request, response, next) {
		if (request.isAuthenticated()) {
			next();
		}
		else {
			request.flash('error_msg', 'not logged in');
			response.redirect('/');
		}
	},

	addUser: function (request, response, next) {
		if(request.isAuthenticated()) {
			User.findOne({
				id : request.user.id,
			}).then(_user => {
				request._user = _user;
				next();
			});
		}
		else
			next();
	},

  	isNotAuthenticated: function (request, response, next) {
		if (!request.isAuthenticated())
	  		return next();
		else {
	  		request.flash('error_msg', 'is logged in');
	  		response.redirect('/');
		}
  	}
};