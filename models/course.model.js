var mongoose = require('mongoose');
var courseSchema = mongoose.Schema({
     coursename:String,
     price:String,
     duration:String,
     trainer:String,
     image:String,
     technologies:String,
     videos:Array
})

var Course = mongoose.model('Course',courseSchema)
module.exports=Course