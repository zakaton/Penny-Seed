const stripeKeys = {};
if(true) {
    stripeKeys.publishable = process.env.STRIPE_TEST_PUBLISHABLE_KEY;
    stripeKeys.secret = process.env.STRIPE_TEST_SECRET_KEY;
    stripeKeys.connect = process.env.STRIPE_TEST_CONNECT_CLIENT_ID;
}
else {
    stripeKeys.publishable = process.env.STRIPE_PUBLISHABLE_KEY;
    stripeKeys.secret = process.env.STRIPE_SECRET_KEY;
    stripeKeys.connect = process.env.STRIPE_CONNECT_CLIENT_ID;
}

module.exports = stripeKeys;