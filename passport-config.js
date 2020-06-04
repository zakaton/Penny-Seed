const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserByUsername, getUserById) {
    const authenticateUser = (username, password, done) => {
        const user = getUserByUsername(username);

        if(user) {
            bcrypt.compare(password, user.hashedPassword).then(() => {
                return done(null, user);
            }).catch(error => {
                return done(error);
            });
        }
        else {
            return done(null, false, {
                message : `no user with username ${username}`,
            });
        }
    }

    passport.use(new LocalStrategy(authenticateUser));

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser((id, done) => done(null, getUserById(id)));
}

module.exports = initialize;