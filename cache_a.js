require('dotenv').config();
var express = require('express');
var mongoose = require('mongoose');
var app = express();
var cityData = require('./models/cityData');
var request = require('request');
var redis = require('redis');

const solr = require('solr-client');
const client = solr.createClient({
  host: '127.0.0.1',
  port: '8983',
  core: 'cori'
});
client.autoCommit = true;

const REDIS_PORT = 6379;
const red_client = redis.createClient(REDIS_PORT);

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
    console.log(Object.keys(cityData.schema.obj));
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

  
app.get('/test/:id/:st', (req,res) => {
  console.log('Here');
 
  
});
function cache(req,res,next){
  const cache_key=req.query.city;
  red_client.get(cache_key,(err,data)=>{
    if(err) throw err;
    if(data!=null){
      console.log('Cached...');
      res.send(JSON.parse(data));
    }
    else{
      next();
    }
  })
}
app.get('/', cache, (req, res) => {
  const qcity = req.query.city;
  if(qcity){
    var query = client.createQuery().q({cityName: qcity + ' OR stateName:' + qcity + ' OR aliasCityName:' + qcity}).sort({weightage:'asc'});
    client.search(query,function(err, obj){
      if(err){
        console.log(err);
      }else{
        console.log('From solr...');
        var cache_value = JSON.stringify(obj);
        //console.log(cache_value);
        red_client.setex(qcity,3600,cache_value);
        //console.log(JSON.parse(JSON.stringify(obj)));
        res.setHeader('Content-Type', 'application/json');
        res.json(obj);
      }
    });
  }
});
// http://localhost:8983/solr/citydata/select?q=cityName%3ABangalore%20OR%20stateName%3ABangalore%20OR%20aliasCityName%3ABangalore&rows=10&sort=weightage%20desc

app.get('/update/:cityCode/', (req, res) => {
  cityData.findOne({cityCode : req.params.cityCode}, (err, city) => {
    if(city){
      if(req.query.cityName)
        city.cityName = req.query.cityName;
      if(req.query.stateName)
        city.stateName = req.query.stateName;
      if(req.query.locationType)
        city.locationType = req.query.locationType;
      if(req.query.aliasCityName)
        city.aliasCityName = req.query.aliasCityName;
      if(req.query.weightage && Number.isInteger(req.query.weightage))
        city.weightage = parseInt(req.query.weightage);
      city.save((err) => {
        if(err) throw err;
        else{
          // implement update call
          client.add({ cityCode : city.cityCode, cityName : city.cityName,  stateName : city.stateName, locationType : city.locationType, aliasCityName : city.aliasCityName, weightage : city.weightage }, function(err,obj){
            if (err) {
               console.log(err);
            } else {
               res.send(obj);
               console.log(obj);
               client.softCommit(function(err,res){
                if(err){
                  console.log(err);
                }else{
                  console.log(res);
                }
             });
            }
          });
        }
      });
      
      }
  });
});