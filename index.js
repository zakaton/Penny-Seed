require('dotenv').config();

const low = require('lowdb');
const shortid = require('shortid');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('.data/db.json');
const db = low(adapter);

db.defaults({users : [], campaigns : []}).write();
const generateId = () => shortid.generate();
const getUserById = id => db.get('users').find({id}).value();
const getUserByUsername = username => db.get('users').find(user => user.username.toLowerCase() == username.toLowerCase()).value();
const isUsernameAvailable = username => !Boolean(getUserByUsername(username));
const getCampaignById = id => db.get('campaigns').find({id}).value();
const getCampaignsByCampaignerId = id => db.get('campaigns').filter({campaigner: id}).value();
const getCampaignsByPledgerId = id => db.get('campaigns').filter({pledgers: [id]}).value();
const addPledge = (userId, campaignId) => {
    const campaign = getCampaignById(campaignId);
    if(campaign.campaigner !== userId && !campaign.pledgers.includes(userId)) {
        db.get('users').find({id: userId}).get('pledges').push(campaignId).write();
        db.get('campaigns').find({id: campaignId}).get('pledgers').push(userId).write();
    }
}
const removePledge = (userId, campaignId) => {
    db.get('users').find({id: userId}).get('pledges').pull(campaignId).write();
    db.get('campaigns').find({id: campaignId}).get('pledgers').pull(userId).write();
}
const removePledgesByUserId = id => {
    db.get('users').find({id}).set('pledges', []).write();
    db.get('campaigns').filter({pledgers : [id]}).map('id').value().forEach(id => {
        db.get('campaigns').find({id}).get('pledgers').pull(id).write();
    });
}
const removeCampaign = (userId, campaignId) => {
    const campaign = getCampaignById(campaignId);
    if(campaign && campaign.campaigner == userId && !campaign.ended) {
        removePledgesByCampaignId(campaignId);
        db.get('campaigns').remove({id : campaignId}).write();
    }
}
const removePledgesByCampaignId = id => {
    db.get('campaigns').find({id}).set('pledgers', []).write();
    db.get('users').filter({pledges : [id]}).map('id').value().forEach(id => {
        db.get('users').find({id}).get('pledges').pull(id).write();
    });
}

const stripeKeys = require('./stripe-keys');
const stripeCalculator = require('./stripe-calculator');
const stripe = require('stripe')(stripeKeys.secret);
const getCustomerById = id => stripe.customers.retrieve(getUserById(id).stripe_customer_id);

const passport = require('passport');
require('./passport-config')(passport, getUserByUsername, getUserById);

const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({extended : false}));

const flash = require('express-flash');
app.use(flash());

const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.get('/', (request, response) => {
    response.render('template', {
        page : 'index',
        user : request.user,
    });
});

const isAuthenticated = (request, response, next) => request.isAuthenticated()?
    next():
    response.redirect('/login');

const isNotAuthenticated = (request, response, next) => !request.isAuthenticated()?
    next():
    response.redirect('/');

const hasStripeConnect = (request, response, next) => (request.user.stripe_user_id !== undefined)?
    next():
    response.redirect('/register');

const doesntHaveStripeConnect = (request, response, next) => (request.user.stripe_user_id == undefined)?
    next():
    response.redirect('/register');

const canPledge = (request, response, next) => {
    getCustomerById(request.user.id).then(customer => {
        if(customer.invoice_settings.default_payment_method)
            next();
        else {
            // can't pledge - add payment info
            response.redirect('/profile');
        }
    });
}

app.get('/register', isNotAuthenticated, (request, response) => {
    response.render('template', {
        page : 'register',
        user : request.user,
    });
});

app.post('/username-available', (request, response) => {
    let {username} = request.body;
    response.json({
        username,
        available : isUsernameAvailable(username),
    });
});

const bcrypt = require('bcrypt');
const checkPassword = (user, password) => bcrypt.compare(password, user.hashedPassword);
app.post('/register', isNotAuthenticated, (request, response) => {
    let {username} = request.body;
    if(isUsernameAvailable(username)) {
        const {password} = request.body;
        bcrypt.hash(password, 10).then(hashedPassword => {
            const id = generateId();
            stripe.customers.create().then(customer => {
                const stripe_customer_id = customer.id;
                db.get('users').push({
                    stripe_customer_id,
                    username,
                    hashedPassword,
                    id,
                    campaigns : [],
                    pledges : [],
                }).write();
                request.flash('username', username);
                response.redirect('/login');
            })
        }).catch(error => {
            response.redirect('/register');
        });
    }
    else {
        request.flash('error', `username '${username}' already exists`);
        response.redirect('/register');
    }
});

app.get('/login', isNotAuthenticated, (request, response) => {
    response.render('template', {
        page : 'login',
        user : request.user,
    });
});
app.post('/login', isNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true,
}));

app.get('/logout', isAuthenticated, (request, response) => {
    request.logOut();
    response.redirect('/');
});

app.get('/campaigns', (request, response) => {
    const renderOptions = {
        page : 'campaigns',
        user : request.user,
        campaigns : db.get('campaigns').sortBy('deadline').reverse().value(),
        getUserById,
    };

    if(request.user) {
        getCustomerById(request.user.id).then(customer => {
            renderOptions.userCustomer = customer;
            response.render('template', renderOptions);
        });
    }
    else
        response.render('template', renderOptions);
});
app.get('/campaigns/:campaignId', (request, response) => {
    const {campaignId} = request.params;
    const campaign = getCampaignById(campaignId);

    const renderOptions = {page : 'campaign'};

    if(campaign) {
        renderOptions.campaign = campaign;

        const campaigner = getUserById(campaign.campaigner);
        if(campaigner) {
            renderOptions.campaigner = campaigner;

            if(request.user) {
                renderOptions.user = request.user;

                getCustomerById(request.user.id).then(customer => {
                    renderOptions.userCustomer = customer;

                    response.render('template', renderOptions);
                }).catch(error => {
                    console.error(error);
                    response.render('template', renderOptions);
                });
            }
            else {
                response.render('template', renderOptions);
            }
        }
    }
    else
        response.redirect('/campaigns');
});

app.get('/profile', isAuthenticated, (request, response) => {
    response.redirect(`/profiles/${request.user.id}`);
});

app.get('/profiles/:profileId', (request, response) => {
    const {profileId} = request.params;
    
    const profileUser = getUserById(profileId);

    if(profileUser) {
        const createdCampaigns = getCampaignsByCampaignerId(profileId)
        const pledgedCampaigns = getCampaignsByPledgerId(profileId);

        const renderOptions = {
            page : 'profile',
            profileUser,
            user: request.user,
            createdCampaigns,
            pledgedCampaigns,
            getUserById,
        };

        if(request.user) {
            if(request.user.id == profileId) {
                getCustomerById(profileId).then(customer => {
                    renderOptions.userCustomer = customer;
                    response.render('template', renderOptions);
                }).catch(error => {
                    console.error(error);
                    response.redirect('/');
                });
            }
            else {
                response.render('template', renderOptions);
            }
        }
        else {
            response.render('template', renderOptions);
        }
    }
    else
        response.redirect('/');
});

app.get('/change-username', isAuthenticated, (request, response) => {
    response.render('template', {
        page : 'change-username',
        user : request.user,
    });
});
app.post('/change-username', isAuthenticated, (request, response, next) => {    
    checkPassword(request.user, request.body.password).then(isPasswordValid => {
        if(isPasswordValid) {
            const {newUsername} = request.body;
            if(isUsernameAvailable(newUsername) || newUsername.toLowerCase() == request.user.username.toLowerCase()) {
                db.get('users')
                    .find({username: request.user.username})
                    .set('username', newUsername)
                    .write();
                request.flash('success', 'changed username');
                response.redirect('/profile');
            }
            else {
                request.flash('error', 'username is not available');
                response.redirect('/change-username');
            }
        }
        else {
            request.flash('error', 'incorrect password');
            response.redirect('/change-username');
        }
    }).catch(error => {
        console.error(error);
        request.flash('error', 'weird error');
        response.redirect('/change-username');
    });
});

app.get('/change-password', isAuthenticated, (request, response) => {
    response.render('template', {
        page : 'change-password',
        user : request.user,
    });
});
app.post('/change-password', isAuthenticated, (request, response) => {
    const {currentPassword} = request.body;

    checkPassword(request.user, currentPassword).then(isPasswordValid => {
        if(isPasswordValid) {
            const {newPassword} = request.body;
            bcrypt.hash(newPassword, 10).then(hashedPassword => {
                db.get('users')
                    .find({id: request.user.id})
                    .set('hashedPassword', hashedPassword)
                    .write();

                request.flash('username', request.user.username);
                request.logout();
                response.redirect('/login');
            }).catch(error => {
                console.error(error);
                response.redirect('/register');
            });
        }
        else {
            request.flash('error', 'invalid password');
            response.redirect('/change-password');
        }
    }).catch(error => {
        console.error(error);
        request.flash('error', 'error');
        response.redirect('/change-password');
    });
});

app.get('/stripe/connect/create', isAuthenticated, doesntHaveStripeConnect, (request, response) => {
    const redirect = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${stripeKeys.connect}&scope=read_write`;
    response.redirect(redirect);
});

app.get('/stripe/connect/oauth', isAuthenticated, (request, response) => {
    const {code, state} = request.query;

    stripe.oauth.token({
        grant_type: 'authorization_code',
        code
    }).then(stripeResponse => {
        const {stripe_user_id} = stripeResponse;
        db.get('users')
            .find({id: request.user.id})
            .set('stripe_user_id', stripe_user_id)
            .write();

        response.redirect('/profile');
    }, error => {
        console.error(error);
        switch(error.type) {
            case 'StripeInvalidGrantError':
                response.status(400).json({
                    error : `invalid authorization code: ${code}`
                });
                break;
            default:
                response.status(500).json({
                    error: 'An unknown error occurred',
                });
                break;
        }
    });
});

app.get('/stripe/connect/dashboard', isAuthenticated, hasStripeConnect, (request, response) => {
    response.redirect('http://dashboard.stripe.com/');
});

app.get('/create-campaign', isAuthenticated, hasStripeConnect, (request, response) => {
    response.render('template', {
        page : 'create-campaign',
        user : request.user,
    });
});

const schedule = require('node-schedule');
const launchCampaign = (campaign) => {
    if(!campaign.ended) {
        const deadlineDate = new Date(Number(campaign.deadline));
        schedule.scheduleJob(deadlineDate, () => {
            campaign = getCampaignById(campaign.id);
            if(campaign)
                evaluateCampaign(campaign);
        });
    }
}
const evaluateCampaign = (campaign) => {
    const campaigner = getUserById(campaign.campaigner);
    db.get('campaigns').find({id: campaign.id}).set('ended', true).write();

    if(campaign.pledgers.length >= campaign.minimumNumberOfPledgers) {
        db.get('campaigns').find({id: campaign.id}).set('successful', true).write();

        const pledgeAmount = stripeCalculator.truncateDollars(campaign.goal/campaign.pledgers.length, true);
        const fullPledgeAmount = stripeCalculator.getAmountBeforeProcessing(pledgeAmount);
        console.log(pledgeAmount, fullPledgeAmount);
        const promises = campaign.pledgers.map(pledgerId => getUserById(pledgerId)).forEach(pledger => {
            return getCustomerById(pledger.id).then(customer => {
                const paymentIntentPromise = stripe.paymentIntents.create({
                    amount : Math.floor(100*(fullPledgeAmount)),
                    currency: 'usd',
                    customer : pledger.stripe_customer_id,
                    confirm : true,
                    off_session: true,
                    application_fee_amount: Math.floor(100*(stripeCalculator.truncateDollars(fullPledgeAmount - pledgeAmount, false))),
                    payment_method : customer.invoice_settings.default_payment_method,
                    on_behalf_of: campaigner.stripe_user_id,
                    transfer_data: {
                        destination: campaigner.stripe_user_id,
                    },
                }).then(paymentIntent => {

                }).catch(error => {
                    console.error(error);
                });
                return paymentIntentPromise;
            })
        });

        // Promise.all(promises);
    }
    else {
        // campaign failed
        db.get('campaigns').find({id: campaign.id}).set('successful', false).write();
    }
}

db.get('campaigns').value().forEach(campaign => launchCampaign(campaign));
app.post('/create-campaign', isAuthenticated, hasStripeConnect, (request, response) => {
    const {goal, minimumNumberOfPledgers, maximumPledge, deadline} = request.body;
    
    if(goal <= 0) {
        request.flash('goalError', `campaign goal must be a positive value`);
        response.redirect('/create-campaign');
        return;
    }

    const deadlineDate = new Date(Number(deadline));
    if(isNaN(deadlineDate.getTime())) {
        request.flash('deadlineError', 'deadline must be a valid date');
        response.redirect('/create-campaign');
        return;
    }

    
    const currentDate = new Date();
    if(currentDate.getTime() > deadlineDate.getTime()) {
        request.flash('deadlineError', 'deadline must be later than today');
        response.redirect('/create-campaign');
        return;
    }

    if(minimumNumberOfPledgers <= 0) {
        request.flash('minimumNumberOfPledgersError', 'the minimum number of pledgers must be at least 1');
        response.redirect('/create-campaign');
        return;
    }

    const id = generateId();
    const campaign = {
        goal,
        id,
        minimumNumberOfPledgers,
        deadline,
        campaigner : request.user.id,
        pledgers : [],
    };

    db.get('campaigns').push(campaign).write();
    launchCampaign(campaign);

    response.redirect(`/campaigns/${id}`);
});

app.get('/add-payment-info', isAuthenticated, (request, response) => {
    getCustomerById(request.user.id).then(customer => {
        stripe.setupIntents.create({
            customer: customer.id,
        }).then(intent => {
            response.render('template', {
                page : 'add-payment-info',
                user : request.user,
                stripePublishableKey : stripeKeys.publishable,
                client_secret : intent.client_secret,
            });
        });
    });
});
app.post('/add-payment-info', isAuthenticated, (request, response) => {
    getCustomerById(request.user.id).then(customer => {
        stripe.paymentMethods.list({
            customer: customer.id,
            type: 'card',
        }).then(paymentMethods => {
            stripe.customers.update(customer.id, {invoice_settings: {default_payment_method: paymentMethods.data[0].id}}, (error, customer) => {
                if(error) {
                    console.error(error);
                    response.redirect('/profile');
                }
                else {
                    response.redirect('/profile');
                }
            });
        });
    });
});

app.get('/remove-payment-info', isAuthenticated, (request, response) => {
    getCustomerById(request.user.id).then(customer => {
        if(customer.invoice_settings.default_payment_method) {
            stripe.paymentMethods.detach(customer.invoice_settings.default_payment_method).then(paymentMethod => {
                removePledgesByUserId(request.user.id);
                response.redirect('/profile');
            }).catch(error => {
                console.error(error);
                response.redirect('/profile');
            });
        }
        else {
            response.redirect('/profile');
        }
    }).catch(error => {
        console.error(error);
        response.redirect('/profile');
    });
});

app.get('/pledge/:campaignId', isAuthenticated, canPledge, (request, response) => {
    const {campaignId} = request.params;
    addPledge(request.user.id, campaignId);
    response.redirect(`/campaigns/${campaignId}`);
});
app.get('/unpledge/:campaignId', isAuthenticated, (request, response) => {
    const {campaignId} = request.params;
    removePledge(request.user.id, campaignId);
    response.redirect(`/campaigns/${campaignId}`);
});
app.get('/remove-campaign/:campaignId', isAuthenticated, (request, response) => {
    const {campaignId} = request.params;
    removeCampaign(request.user.id, campaignId);
    // flash campaign was removed
    response.redirect('/profile');
});

app.use(express.static('public'));

app.listen(3000);