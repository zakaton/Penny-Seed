require('dotenv').config();

const express = require('express');
    const flash = require('connect-flash');
    const session = require('express-session');
    
    const bodyParser = require('body-parser');
    const cookieParser = require('cookie-parser');
    
    const {addUser} = require('./config/authenticated');

const passport = require('passport');
    require('./config/passport-twitter')(passport);

const mongoose = require('mongoose');
    const Contract = require('./models/Contract');
    const User = require('./models/User');

const schedule = require('node-schedule');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const stripeCalculator = require('./config/stripe-calculator');

const Web3 = require('web3');
    const web3 = new Web3(process.env.WEB3_PROVIDER);

var contract;
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {useNewUrlParser : true})
    .then(() => {
        Contract.getContract(_contract => {
            contract = _contract;
            
            contract.events.CreatedCampaign({fromBlock: 0}, (error, createdCampaignEvent) => {
                if(error == null) {
                    var {deadline, campaignIndex, targetAmountUSD} = createdCampaignEvent.returnValues;
                        deadline = Number(deadline);
                        campaignIndex = Number(campaignIndex);
                        targetAmountUSD = Number(targetAmountUSD);
                        
                    if(Date.now() < deadline) {
                        schedule.scheduleJob(new Date(deadline), () => {
                            contract.methods.campaigns(campaignIndex).call({}, (error, campaignStruct) => {
                                if(error == null) {
                                    if(Number(campaignStruct.numberOfPledgers) >= Number(campaignStruct.minimumNumberOfPledgers)) {
                                        User.findOne({etherAddress : createdCampaignEvent.returnValues.campaigner})
                                            .then(campaigner => {
                                                if(campaigner !== null) {
                                                    stripe.accounts.retrieve(campaigner.connectId, (error, account) => {
                                                        if(account.charges_enabled) {
                                                            User.find({
                                                                pledges : Number(createdCampaignEvent.returnValues.campaignIndex)
                                                            }).then(pledgers => {
                                                                var pledgeAmount = 0;
                                                                {
                                                                    var campaignAmount = targetAmountUSD;
                                                                        campaignAmount /= Number(campaignStruct.numberOfPledgers);
                                                                        campaignAmount = Math.ceil(campaignAmount);
                                                                        pledgeAmount = campaignAmount;
                                                                        pledgeAmount = Math.floor(100*stripeCalculator.preprocessedPledgeAmount(pledgeAmount/100));
                                                                }

                                                                console.log(pledgeAmount, pledgers);
    
                                                                pledgers.forEach(pledger => {
                                                                    stripe.tokens.create({
                                                                        customer : pledger.customerId,
                                                                    }, {
                                                                        stripe_account : campaigner.connectId,
                                                                    }).then(token => {
                                                                        stripe.charges.create({
                                                                            amount : pledgeAmount,
                                                                            currency : 'usd',
                                                                            source : token.id,
                                                                        }, {
                                                                            stripe_account : campaigner.connectId,
                                                                        }).then(charge => {
                                                                            console.log(charge);
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        }
                                                        else {
                                                            console.error(`"charges_enabled" not enabled for account`);
                                                        }
                                                    });
                                                }
                                                else console.error("couldn't find Campaigner User in MongoDB Database");
                                            });
                                    }
                                    else {
                                        console.log(`Campaign ${campaignIndex} failed`);
                                    }
                                }
                                else {
                                    console.error(error);
                                }
                            })
                        });
                    }
                }
                else {
                    console.error(error);
                }
            });
        });
    })
    .catch(error => {
        console.error(error)
    });

const app = express();    
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended : false}));
    app.use(cookieParser());

    app.use(session({
        secret : process.env.SESSION_SECRET,
        resave : true,
        saveUninitialized : true,
    }));

    app.use(passport.initialize());
    app.use(passport.session());
    app.use(addUser);

    app.use(flash());

    app.use((request, response, next) => {
        response.locals.success_msg = request.flash('success_msg');
        response.locals.error_msg = request.flash('error_msg');
        response.locals.error = request.flash('error');
        next();
    });

    app.use((request, response, next) => {
        request.contract = contract;
        next();
    });

    app.set('view engine', 'ejs');

    app.use('/', require('./routes/index'));
    app.use('/', require('./routes/login'));
    app.use('/account', require('./routes/account'));
    app.use('/contract', require('./routes/contract'));
    app.use('/campaigns', require('./routes/campaigns'));

    app.use(express.static('public'));
    
    app.listen(process.env.PORT, console.log(`server listening on port ${process.env.PORT}`));