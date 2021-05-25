require('dotenv').config();
var express = require('express');
var mongoose = require('mongoose');
var app = express();
var cityData = require('./models/cityData');
var request = require('request');


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
    // cityData.find({weightage:{$exists : true}}, (err, res) => {
    //   res.forEach(res => {
    //     if(res.weightage)
    //     {
    //       res.weightage = parseInt(res.weightage);
    //       res.save();
    //     }
    //   });
    // });
    // console.log("done!");
  });

  

// app.get('/', (req, res) => {
//   cityData.find().sort({weightage:-1}).limit(10).exec( (err, cityData) => {
//     if (err) return next(err);
//     console.log(cityData);
//   } ) ;
// });

app.get('/', (req, res) => {
  const qcity = req.query.city;
  if(qcity){
    const solrq = 'http://localhost:8983/solr/citydata/select?q=cityName%3A' + qcity + '%20OR%20stateName%3A' + qcity + '%20OR%20aliasCityName%3A' + qcity + '&rows=10&sort=weightage%20asc';
    console.log(solrq);
    request.get(solrq, function(error, response, body){
      if(error) throw error;
      res.setHeader('Content-Type', 'application/json');
      res.end(body);
    });
  }else{
    res.json(req.query);
    res.end();
  }
});

// http://localhost:8983/solr/citydata/select?q=cityName%3ABangalore%20OR%20stateName%3ABangalore%20OR%20aliasCityName%3ABangalore&rows=10&sort=weightage%20desc
