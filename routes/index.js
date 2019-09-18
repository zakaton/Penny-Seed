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

const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

const Contract = require('../Contract.js');
var contract;
Contract()
    .then(_contract => {
        console.log("connected to contract");
        contract = _contract;
    });

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
                        stripeCalculations,
                    });
                });
            }
            else {
                response.render('index', {
                    user : null,
                    profile : null,
                    campaigns,
                    stripeCalculations,
                });
            }
        });
});

router.get('/contract', (request, response) => {
    response.json({
        address : contract.options.address,
        abi : contract.options.jsonInterface,
    });
})

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

router.post('/add-ether-address', (request, response) => {
    const {etherAddress} = request.body;
    const {user} = request;
    User.findOne({
        id : user.id
    }).then(_user => {
        _user.etherAddress = etherAddress;
        _user.save();
        response.redirect('/');
    });
});

router.get('/create-account', (request, response) => {
    console.log(request);
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
    const {amount, deadline, minimumNumberOfPledgers, maximumPledgeAmount, transactionHash} = request.body;
    User.findOne({
        id : request.user.id,
    }).then(user => {
        const campaign = new Campaign({
            campaigner : user,
            deadline,
            amount,
            minimumNumberOfPledgers,
            transactionHash,
        });
        
        var event;
        contract.getPastEvents("CreatedCampaign", {filter : {transactionHash}})
            .then(events => {
                event = events[0];
                console.log(event);
            });

        campaign.save()
            .then(() => {
                schedule.scheduleJob(new Date(deadline), () => {
                    Campaign.findOne({
                        _id : campaign._id,    
                    }).populate('campaigner').populate('pledgers')
                    .then(campaign => {
                        console.log("Here is where you'd charge everyone if successful!");
                        contract.getPastEvents("CreatedCampaign", {})
                            .then(events => {
                                console.log(events);

                                const campaignIndex = Number(event.returnValues.campaignIndex);
                                contract.methods.campaigns(campaignIndex).call({from : web3.eth.accounts[0]}, (error, result) => {
                                    console.log(error, result);
                                    const numberOfPledgers = Number(result[7]);

                                    console.log(campaignIndex, numberOfPledgers);


                                    if(numberOfPledgers >= campaign.minimumNumberOfPledgers) {
                                        console.log("Campaign Succeeded!")

                                        var amount = 0;
                                        {
                                            var campaignAmount = Number(campaign.amount);
                                                campaignAmount *= 100;
                                                campaignAmount /= numberOfPledgers;
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
                    });
                });
                response.redirect('/');
            });
    });
});

router.post('/test', (request, response) => {
    const {transactionHash, campaignIndex} = request.body;
    console.log(transactionHash);
    contract.getPastEvents("CreatedCampaign", {
        fromBlock : 0,
        toBlock : "latest",
    }, (error, results) => {
        console.log(error, results);
        response.json(results);
    })
})

router.post('/pledge', (request, response) => {
    console.log("Pledging!!")
    const {_id} = request.body;
    User.findOne({
        id : request.user.id,
    }).then(user => {
        Campaign.findOne({
            _id,
        }).populate('campaigner').populate('pledgers')
        .then(campaign => {
            console.log(campaign);
            if(user !== null && user.customerId !== undefined && !user._id.equals(campaign.campaigner._id) && (new Date(campaign.deadline)).getTime() > Date.now() && (campaign.pledgers.findIndex(pledger => !pledger._id.equals(user._id)) == -1)) {
                campaign.pledgers.push(user);
                console.log(campaign);
                campaign.save()
                    .then(() => {
                        const {transactionHash} = campaign;
                        console.log(campaign, transactionHash)
                        contract.getPastEvents("CreatedCampaign", {fromBlock : 0, toBlock : "latest"})
                            .then(events => {
                                const event = events.find(event => event.transactionHash == transactionHash);
                                const campaignIndex = Number(event.returnValues.campaignIndex);
                                web3.eth.getAccounts(function (error, accounts) {
                                    contract.methods.addExternalPledger(campaignIndex).send({from : accounts[0]}, (error, _transactionHash) => {
                                        if(error == null) {
                                            console.log(_transactionHash);
                                            response.redirect('/');
                                        }
                                        else console.log(error);
                                    });
                                });
                            });
                    });
            }
            else {
                response.redirect('/');
            }
        });
    });
});

module.exports = router;