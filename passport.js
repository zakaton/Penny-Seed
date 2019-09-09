require('dotenv').config();
const TwitterStrategy = require('passport-twitter').Strategy;

const User = require('./models/User');

module.exports = function(passport) {
    const {TWITTER_KEY, TWITTER_SECRET} = process.env;
    passport.use(new TwitterStrategy({
        consumerKey : TWITTER_KEY,
        consumerSecret : TWITTER_SECRET,
        callbackURL : "http://localhost:3000/login/callback",
    }, (token, tokenSecret, profile, callback) => {
        User.findOne({
            id : profile.id,
        }).then(user => {
            if(!user) {
                const newUser = new User({
                    id : profile.id,
                });
                newUser.save();
            }
            else {
                console.log(`Welcome back, ${profile.username}`)
            }
        });
        return callback(null, profile);
    }));
    
    passport.serializeUser((user, callback) => {
        callback(null, user);
    });
    
    passport.deserializeUser((user, callback) => {
        User.findOne({
            id : user.id,
        }).then(_user => {
            callback(null, user);
        });
    });
}