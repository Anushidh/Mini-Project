const express = require("express")
 require('dotenv').config();
const PORT = process.env.PORT || 3600;
const ejs = require("ejs");
const multer  = require('multer')
const flash = require('express-flash');
const cookieParser = require('cookie-parser')
const path = require("path")
const bodyParser = require("body-parser")
const session = require("express-session");
const easyinvoice = require('easyinvoice');
const nocache = require("nocache");
const mongoose = require("mongoose");
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");

const app = express()

// Database connection
 mongoose.connect(process.env.MONGODB_URL)



// Middleware setup
app.use('/',express.static(path.join(__dirname, 'public')));
app.use('/admin',express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session
  ({secret:"Key",
 resave: false,
 saveUninitialized: true,
 cookie:{maxAge:6000000}
}));
app.use(flash());
app.use (nocache());

// View engine setup
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', userRoute);
app.use("/admin",adminRoute);

// Start the server
app.listen(PORT, () => console.log(`Server running on  http://localhost:${PORT}`))