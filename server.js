require('dotenv').config();
var express = require('express');
var mongoose = require('mongoose');
var app = express();
var cityData = require('./models/cityData');


mongoose.connect(process.env.database, {useNewUrlParser: true, connectWithNoPrimary: true, useUnifiedTopology: true } , function(err){
    if(err){
      console.log(err);
    }else{
      console.log("Connected to the database");
    }
  });

  app.listen(process.env.PORT,function(err){
    if(err) throw err;
    console.log("Server is Running on port "+ (process.env.PORT));
  });

  

app.get('/', (req, res) => {
  cityData.find().sort({weightage:-1}).limit(10).exec( (err, cityData) => {
    if (err) return next(err);
    console.log(cityData);
  } ) ;
});


