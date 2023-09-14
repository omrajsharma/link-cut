require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

/**
 * APP
 */
const app = express();
app.use(express.json());


/**
 * DATABASE
 */
mongoose.connect(process.env.DATABASE_URL);
mongoose.connection.once('connected', () => console.log('🟢 DATABASE CONNECTED'));
mongoose.connection.on('error', err => console.log('🟥 error', err));


/**
 * MODEL
 */
const LinkSchema = new mongoose.Schema({
    shortStr: {
        type: String,
        required: [true, 'Short string is required'],
        unique: true,
        trim: true,
        minLength: [3, 'Short string must be at least 3 characters long'],
    },
    longUrl: {
        type: String,
        required: [true, 'Long URL is required'],
        trim: true,
    },
    clicks: {
        type: Number,
        default: 0,
    },
},
{
    timestamps: true
})
LinkSchema.methods.incrementClicks = function () {
    this.clicks++;
    return this.save();
};
const LinkModel = mongoose.model('link', LinkSchema)


/**
 * ROUTES
 */
app.get('/health', (req, res) => res.end('i am healthy'));

app.post('/link', async (req, res) => {
    let token = req?.headers?.token;
    let shortStr = req?.body?.shortStr;
    const longUrl = req?.body?.longUrl;

    if (token != process.env.ADMIN_TOKEN) {
        res.status(401).end('Unauthenticated');
        return;
    }

    if (!longUrl) {
        res.status(400).end('Empty longUrl');
        return;
    }
    const urlRegex = /^(https:\/\/|http:\/\/)([a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})+)(\/[^\s]*)?$/;
    if (!urlRegex.test(longUrl)) {
        res.status(400).end('Invalid long url');
        return;
    }
    if (!shortStr) {
        res.status(400).end('Empty shortStr');
        return;
    }
    const existingDoc = await LinkModel.find({shortStr: shortStr});
    if (existingDoc?.length != 0) {
        res.status(400).end('shortStr already exists');
        return;
    }
    LinkModel.create({
        shortStr: shortStr,
        longUrl: longUrl
    })

    res.status(201).json({shortStr: shortStr});
})

app.get('/:shortStr', async (req, res) => {
    const shortStr = req.params.shortStr;

    const shortStrDoc = await LinkModel.find({shortStr: shortStr});

    if (shortStrDoc.length === 0) {
        res.status(401).end('link do not exists')
        return;
    }

    res.redirect(307, shortStrDoc[0].longUrl);
})


/**
 * APP LISTEN
 */
app.listen( process.env.APP_PORT ,() => console.log(`🟢 SERVER STARTED AT PORT ${process.env.APP_PORT }`));