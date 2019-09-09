require('dotenv').config();

const express = require('express');
const router = express.Router();
const passport = require('passport');
const Request = require('request');
const schedule = require('node-schedule');

const User = require('../models/User');
const Campaign = require('../models/Campaign');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeCalculations = require('../stripeCalculations');

const {STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY, STRIPE_CONNECT_CLIENT_ID} = process.env;

router.get('/', (request, response) => {
    Campaign.find().populate('campaigner').populate('pledgers')
        .then(campaigns => {
            if(request.user !== undefined) {
                User.findOne({
                    id : request.user.id,
                }).then(user => {
                    response.render('index', {
                        profile : request.user,
                        user : user,
                        STRIPE_PUBLIC_KEY,
                        STRIPE_CONNECT_CLIENT_ID,
                        campaigns,
                        stripeCalculations
                    });
                });
            }
            else {
                response.render('index', {
                    user : null,
                    profile : null,
                    campaigns,
                    stripeCalculations
                });
            }
        });
});

router.post('/add-card', (request, response) => {
    const {stripeToken} = request.body;
    const {user} = request;
    User.findOne({
        id : user.id
    }).then(_user => {
        stripe.customers.create({
            source : stripeToken,
        }).then(customer => {
            _user.customerId = customer.id;
            _user.save();
            response.redirect('/');
        });
    });
});

router.get('/create-account', (request, response) => {
    const {code} = request.query;
    Request.post(`https://connect.stripe.com/oauth/token?client_secret=${STRIPE_SECRET_KEY}&code=${code}&grant_type=authorization_code`, (err, httpResponse, body) => {
        const account = JSON.parse(body);
        const {stripe_user_id} = account;
        User.findOne({
            id : request.user.id,
        }).then(user => {
            user.connectId = stripe_user_id;
            user.save();
            response.redirect(`/`);
        });
    });
});

router.get('/login', passport.authenticate('twitter'));
router.get('/login/callback', passport.authenticate('twitter', {
    failureRedirect : '/',
}), (request, response) => {
    response.redirect('/');
});

router.get('/logout', (request, response) => {
    if(request.isAuthenticated())
        request.logOut();
        response.redirect('/');
});

router.get('/dashboard', (request, response) => {
    User.findOne({
        id : request.user.id,
    }).then(user => {
        stripe.accounts.createLoginLink(
            user.connectId,
            (error, link) => response.redirect(link.url),
        );
    });
});

router.post('/create-campaign', (request, response) => {
    const {amount, deadline, minimumNumberOfPledgers, maximumPledgeAmount} = request.body;
    console.log(request.body);
    User.findOne({
        id : request.user.id,
    }).then(user => {
        const campaign = new Campaign({
            campaigner : user,
            deadline,
            amount,
            minimumNumberOfPledgers,
        });
        console.log(campaign);
        campaign.save()
            .then(() => {
                schedule.scheduleJob(new Date(deadline), () => {
                    Campaign.findOne({
                        _id : campaign._id,    
                    }).populate('campaigner').populate('pledgers')
                    .then(campaign => {
                        console.log("Here is where you'd charge everyone if successful!")
                        if(campaign.pledgers.length >= campaign.minimumNumberOfPledgers) {
                            console.log("Campaign Succeeded!")

                            var amount = 0;
                            {
                                var campaignAmount = Number(campaign.amount);
                                    campaignAmount *= 100;
                                    campaignAmount /= campaign.pledgers.length;
                                    campaignAmount = Math.ceil(campaignAmount);
                                    amount = campaignAmount;
                                    amount = 100*stripeCalculations.preprocessedPledgeAmount(amount/100);
                            }

                            stripe.accounts.retrieve(campaign.campaigner.connectId, (error, account) => {
                                if(account.charges_enabled) {
                                    campaign.pledgers.forEach(pledger => {
                                        stripe.tokens.create({
                                            customer : pledger.customerId,
                                        }, {
                                            stripe_account : campaign.campaigner.connectId,
                                        }).then(token => {
                                            stripe.charges.create({
                                                amount,
                                                currency : 'usd',
                                                source : token.id,
                                            }, {
                                                stripe_account : campaign.campaigner.connectId,
                                            }).then(charge => {
                                                console.log(charge);
                                            });
                                        });
                                    });
                                }
                            });
                        }
                        else {
                            console.log("Campaign Failed!");
                        }
                    });
                });
                response.redirect('/');
            });
    });
});

router.post('/pledge', (request, response) => {
    const {_id} = request.body;

    User.findOne({
        id : request.user.id,
    }).then(user => {
        Campaign.findOne({
            _id,
        }).populate('campaigner').populate('pledgers')
        .then(campaign => {
            if(user !== null && user.customerId !== undefined && !user._id.equals(campaign.campaigner._id) && (new Date(campaign.deadline)).getTime() > Date.now() && (campaign.pledgers.findIndex(pledger => !pledger._id.equals(user._id)) == -1)) {
                campaign.pledgers.push(user);
                console.log(campaign);
                campaign.save()
                    .then(() => response.redirect('/'));
            }
            else {
                response.redirect('/');
            }
        });
    });
});

module.exports = router;