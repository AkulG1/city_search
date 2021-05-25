var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var cityDataSchema = new Schema({
cityName : String,
stateName : String,
cityCode : String,
locationType : String,
aliasCityName : String,
weightage : Number
});

module.exports = mongoose.model('cityData', cityDataSchema);
