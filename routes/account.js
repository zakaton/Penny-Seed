require('dotenv').config();

const express = require('express');
const router = express.Router();
const Request = require('request');

const {isAuthenticated} = require('../config/authenticated');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const {STRIPE_PUBLIC_KEY, STRIPE_CONNECT_CLIENT_ID, STRIPE_SECRET_KEY} = process.env;

router.get('/', isAuthenticated, (request, response) => {
    if(request.contract !== undefined) {
        request._user.getCreatedCampaigns(request.contract, (error, createdCampaigns) => {
            if(error == null) {
                request._user.getPledgedCampaigns(request.contract, (error, pledgedCampaigns) => {
                    if(error == null) {
                        response.render('account', {
                            user : request.user,
                            _user : request._user,
                            
                            STRIPE_CONNECT_CLIENT_ID,
                            STRIPE_PUBLIC_KEY,

                            createdCampaigns,
                            pledgedCampaigns,
                        });
                    }
                    else {
                        console.error(error);
                        response.redirect('/');
                    }
                });
            }
            else {
                console.error(error);
                response.redirect('/');
            }
        });
    }
    else
        response.render('account', {
            user : request.user,
            _user : request._user,
            STRIPE_CONNECT_CLIENT_ID,
            STRIPE_PUBLIC_KEY
        });
});

router.post('/add-card', isAuthenticated, (request, response) => {
    const {stripeToken} = request.body;
    stripe.customers.create({
        source : stripeToken,
    }).then(customer => {
        request._user.customerId = customer.id;
        request._user.save((error) => {
            if(error == null)
                response.redirect('/account');
            else
                console.error(error);
        });
    });
});

router.get('/add-stripe-connect', isAuthenticated, (request, response) => {
    const {code} = request.query;
    Request.post(`https://connect.stripe.com/oauth/token?client_secret=${STRIPE_SECRET_KEY}&code=${code}&grant_type=authorization_code`, (err, httpResponse, body) => {
        const account = JSON.parse(body);
        request._user.connectId = account.stripe_user_id;
        request._user.save((error) => {
            if(error)
                console.error(error);
            else
                response.redirect('/account');
        });
    });
});

router.post('/add-ether-address', isAuthenticated, (request, response) => {
    const {etherAddress} = request.body;
    request._user.etherAddress = etherAddress;
    request._user.save((error) => {
        if(error == null)
            response.redirect('/account');
        else
            console.error(error);
    });
});

router.get('/stripe-dashboard', isAuthenticated, (request, response) => {
    if(request._user.connectId !== undefined) {
        stripe.accounts.createLoginLink(
            request._user.connectId,
            (error, link) => {
                if(error == null)
                    response.redirect(link.url);
                else
                    console.error(error);
            },
        );
    }
    else {
        response.redirect('/account');
    }
});

module.exports = router;