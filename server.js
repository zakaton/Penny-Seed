require('dotenv').config();

const {STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY} = process.env;
const stripe = require('stripe')(STRIPE_SECRET_KEY);

const express = require('express');
const flash = require('connect-flash');
const session = require('express-session');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const passport = require('passport');
require('./passport')(passport);

const app = express();

// Mongoose
const {MONGODB_CONNECTION_STRING} = process.env;
const mongoose = require('mongoose');
mongoose.connect(MONGODB_CONNECTION_STRING, {useNewUrlParser : true})
    .then(() => console.log("Connected to database"))
    .catch(error => console.log(error));


// EJS
app.set('view engine', 'ejs');


// BodyParser
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended : false}));

// Express Session
const {SESSION_SECRET} = process.env
app.use(session({
    secret : SESSION_SECRET,
    resave : true,
    saveUninitialized : true,
}));

// Passport.js Middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Globals
app.use((request, response, next) => {
    response.locals.success_msg = request.flash('success_msg');
    response.locals.error_msg = request.flash('error_msg');
    response.locals.error = request.flash('error');
    next();
});

// ROUTES
app.use('/', require('./routes/index'));

app.use(express.static('public'));

const {PORT} = process.env || 3000;
app.listen(PORT, console.log(`server listening on port ${PORT}`));