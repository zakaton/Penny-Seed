/*
    TODO
        Pledge
            Setup PaymentIntent
        Create Campaign
            paymentIntent
*/

const client_secret = "sk_test_2noapczHHyZkNiwsucAAYwaG00dexdmPhF";

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const _request = require("request");
const stripe = require("stripe")(client_secret);

const index = express();

index.use(bodyParser.json());
index.use(bodyParser.urlencoded({extended : true}));
index.use(cors());

index.use(express.static("public"));

const campaigns = [
    {
        amount : 1000,
        beneficiary : "acct_1EqNEyDedmwmw1cr",
        deadline : "2019-06-29T16:49",
        maxPledge : 200,
        pledgers : new Array(5),
    },
];
const accounts = [
    {
        email : "zackariaq@gmail.com",
        password : "password",
        stripe_user_id : "acct_1EqNEyDedmwmw1cr",
    },
];

index.post("/create-account", (request, response) => {
    const {email, password, code} = request.body;

    _request.post(`https://connect.stripe.com/oauth/token?client_secret=${client_secret}&code=${code}&grant_type=authorization_code`, (err, httpResponse, body) => {
        const account = JSON.parse(body);
        account.email = email;
        account.password = password;

        accounts.push(account);
        response.redirect(`/?stripe_user_id=${account.stripe_user_id}`);
    });
});

index.post("/campaigns", (request, response) => {
    response.json(campaigns);
});

index.post("/login", (request, response) => {
    const {email, password} = request.body;

    const account = accounts.find(account => (account.email == email) && (account.password == password));
    if(account !== undefined) {
        response.redirect(`/?stripe_user_id=${account.stripe_user_id}`)
    }
    else {
        response.redirect('/')
    }
});

index.post("/create-campaign", (request, response) => {
    const {stripe_user_id, amount, maxPledge, deadline} = request.body;
    
    const campaign = {
        beneficiary : stripe_user_id,
        amount : amount,
        maxPledge : maxPledge,
        deadline : deadline,
        pledgers : [], // an array of tokens
    };
    campaigns.push(campaign);

    const deadlineDate = new Date(deadline);
    setTimeout(() => {
        campaign.success = (campaign.pledgers.length * Number(maxPledge) >= Number(amount));
        console.log(campaign.success);

        if(campaign.success) {
            const pledgeAmount = Math.floor(100*(Number(amount)/campaign.pledgers.length));
            campaign.pledgers.forEach(stripeToken => {
                stripe.charges.create({
                    amount : pledgeAmount,
                    currency : "usd",
                    source : stripeToken,
                }, {
                    stripe_account : campaign.beneficiary
                }).then(charge => {
                    console.log(charge);
                });
            });
        }
        else {
            // campaign failed...oh well.
        }
    }, (deadlineDate.getTime() - Date.now()));

    response.redirect('/');
});

index.post("/pledge", (request, response) => {
    const {campaign_index} = request.body;
    console.log(request.body);

    const campaign = campaigns[campaign_index];
    campaign.pledgers.push(request.body.stripeToken);

    console.log(campaign);
    response.redirect('/');
});

index.post("/my-account", (request, response) => {

    stripe.accounts.createLoginLink(request.query.stripe_user_id)
        .then(link => {
            response.json(link);
        })
})

index.listen(3000);