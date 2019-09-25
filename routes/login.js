const express = require('express');
const router = express.Router();

const passport = require('passport');
const {isAuthenticated, isNotAuthenticated} = require('../config/authenticated');

router.get('/login', isNotAuthenticated, (request, response) => {
    response.render('login', {
        
    })
})

router.get('/login/twitter', isNotAuthenticated, passport.authenticate('twitter'));

router.get('/login/twitter/callback', passport.authenticate('twitter', {
    failureRedirect : '/',
}), (request, response) => {
    response.redirect('/');
});

router.get('/logout', isAuthenticated, (request, response) => {
    request.logOut();
    response.redirect('/');
});

module.exports = router;