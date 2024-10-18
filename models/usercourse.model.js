var mongoose = require('mongoose');
var allcourseSchema = mongoose.Schema({
     uid: String,
     purchasedcoursestatus:Array
})

var Allcourse = mongoose.model('Allcourses',allcourseSchema)
module.exports=Allcourse