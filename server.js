require('dotenv').config();
var express = require('express');
var mongoose = require('mongoose');
var app = express();
var cityData = require('./models/cityData');
var request = require('request');
const solr = require('solr-client');
var redis = require('redis');
const client = solr.createClient({
  host: '127.0.0.1',
  port: '8983',
  core: 'citydata'
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
  });

  
  
app.get('/test/:id/:st', (req,res) => {
  console.log('Here'); 
});

function cache(req,res,next){
  const cache_key=req.query.city;
  if(cache_key){
  red_client.get(cache_key,(err,data)=>{
    if(err) throw err;
    if(data!=null){
      console.log('Cached...');
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.parse(data));
    }
    else{
      next();
    }

  });
  } else next();
}

app.get('/', cache, (req, res) => {
  const qcity = req.query.city;
  if(qcity){
    const solrq = 'http://localhost:8983/solr/citydata/select?q=cityName%3A' + qcity + '*%20OR%20stateName%3A' + qcity + '*%20OR%20aliasCityName%3A' + qcity + '*&rows=10&sort=weightage%20asc';
    // console.log(solrq);
    request.get(solrq, function(error, response, body){
      if(error) throw error;
      res.setHeader('Content-Type', 'application/json');
      // console.log(body);
      //var nf = body["response"]
      //console.log(nf)

     var obj = JSON.parse(body);//parsing json 
    //  console.log(obj);
     var num = obj.response.numFound;//getting the number of result from the response 
      if(num==0){   //if there are no result then probably there is spelling mistake, then we can process for checking spelling
        //spell checklink is here
        const spellchecklink ='http://localhost:8983/solr/citydata/spell?q=' + qcity + '&spellcheck.build=true&spellcheck.collate=true&spellcheck.extendedResults=true&spellcheck.onlyMorePopular=true&spellcheck.reload=true&spellcheck=on';
        // console.log("spell check link: "+spellchecklink);
        request.get(spellchecklink,function(error,response,body){
          if(error) throw error;
          res.send(body);
         // res.end();
         var suggObj = JSON.parse(body);
        // console.log(suggObj.spellcheck.suggestions[1].suggestion[0]);
        if(suggObj.spellcheck.suggestions.length ==0 ){
          console.log("No results found");
        }else{
          var strsuggestion = suggObj.spellcheck.suggestions[1].suggestion[0].word;
          console.log("Did you mean " + strsuggestion+" ?");
        }
        });
      }else{
        var cache_value = JSON.stringify(body);
        // console.log(cache_value);
        red_client.setex(qcity,3600,cache_value);
        // console.log(JSON.parse(JSON.stringify(body)));
        res.setHeader('Content-Type', 'application/json');
        res.end(body);
      }
    });
  }else{
    res.json(req.query);
    res.end();
  }
});


// app.get('/', cache, (req, res) => {
//   const qcity = req.query.city;
//   if(qcity){
//     var query = client.createQuery().q({cityName: qcity + ' OR stateName:' + qcity + ' OR aliasCityName:' + qcity}).sort({weightage:'asc'});
//     client.search(query,function(err, obj){
//       if(err){
//         console.log(err);
//       }else{
//         var cache_value = JSON.stringify(obj);
//         //console.log(cache_value);
//         red_client.setex(qcity,3600,cache_value);
//         //console.log(JSON.parse(JSON.stringify(obj)));
//         res.setHeader('Content-Type', 'application/json');
//         res.json(obj);
//       }
//     });
//   } else res.end();
// });
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
          var query = client.createQuery().q({cityCode: req.params.cityCode});
          client.search(query,function(err, obj){
            if(err){
              console.log(err);
            }else{
              console.log();
              client.add({ id : obj.response.docs[0].id, cityCode : city.cityCode, cityName : city.cityName,  stateName : city.stateName, locationType : city.locationType, aliasCityName : city.aliasCityName, weightage : city.weightage }, function(err,obj){
                if (err) {
                   console.log(err);
                } else {
                   res.send(obj);
                   console.log(obj);
                   red_client.flushdb( function (err, succeeded) {
                    console.log(succeeded); // will be true if successfull
                });
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
      
      }
  });
});