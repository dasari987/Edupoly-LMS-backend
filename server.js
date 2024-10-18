var express = require('express')
const cors = require('cors');
var bodyparser = require("body-parser")
var mongoose = require("mongoose")
var Course = require('./models/course.model')
var User = require('./models/user.model')
var jwt = require('jsonwebtoken');
const Allcourse = require('./models/usercourse.model');


var app = express()
app.use(cors());
app.use(express.static(__dirname+"/public"))
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

var db = mongoose.connect("mongodb+srv://sai:sai123456789@atlascluster.ym1yuin.mongodb.net/project?retryWrites=true&w=majority&appName=AtlasCluster")


const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }
    const decoded = jwt.verify(token, 'secretkey');
    const user = await User.findById(decoded._doc._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    req.user = user;

    next(); 
  } 
  catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};




app.get("/",(req,res)=>{
    db.then(()=>{
        Course.find({})
        .then((coursesdata)=>{
          console.log("cdata",coursesdata)
          var userdetails = ""
          res.send(coursesdata)
        })
      })
      .catch((err)=>{
        console.log('rrrrrrrr',err)
          res.send("error in db")
      })
})



app.post("/signup",(req,res)=>{
  if(req.body.username && req.body.password){
    db.then(()=>{
      var newUser = new User({...req.body,role:'user'})
      newUser.save().then((user)=>{
        console.log(user)
        res.json({msg:"signupsuccess"})
      })
    })
  }
  else{
    res.json({msg:"InvalidCredientials"})
  }
})


app.post("/login",(req,res)=>{
   if(req.body.username && req.body.password){
    db.then(()=>{
      User.findOne({username:req.body.username,password:req.body.password})
      .then((user)=>{
        if(user){
          var token = jwt.sign({...user}, 'secretkey');
          res.json({msg:"loginsuccess",token,role:user.role})
        }
        else{
          console.log("invalid details")
          res.json({msg:"InvalidDetails"})
        }
      })
    })
   }
   
})



app.post(`/purchasecourse/:cid`,authenticate,(req,res)=>{
      Allcourse.findOne({uid:req.user.id})
      .then((user)=>{
          if(user==null){
              var coursesData = {
                  uid: req.user.id,
                  purchasedcoursestatus: [{cid: req.params.cid,status:[{code:'purchased',timestamp:new Date().getTime()}]}],
              }
               var newCourse = new Allcourse(coursesData)
                  newCourse.save()
                  .then((usercourse)=>{
                      console.log("newcourse",newCourse);
                      res.json({msg:"course saved succesfully"})
                  })
                  .catch((err)=>{
                      res.send("Error in adding new course")
                  })   
          }
          else{
                Allcourse.findOneAndUpdate(
                      {uid: req.user.id},
                      { $push: { purchasedcoursestatus: { cid: req.params.cid, status: [{ code: 'purchased',timestamp:new Date().getTime()}] } } },
                  )
                  .then((updatedcourse)=>{
                      console.log(updatedcourse)
                      res.json({msg:"usercourse is updated"})
                  })
                  .catch((err)=>{
                      res.send("Error in updating course")
                  })
          }

      })
})





app.get('/purchasedcourses',authenticate,async(req,res)=>{
   var purchasedcourses = await Allcourse.findOne({uid:req.user.id})
      if(purchasedcourses){
        console.log("poooo",purchasedcourses)
          const userPurchasedCourses = await Promise.all(
            purchasedcourses.purchasedcoursestatus.map(async (course) => {
              const coursedata = await Course.findOne({_id:course.cid});
              var dta = {...coursedata['_doc'],status:course.status}
              return dta
            })
          );
          res.send(userPurchasedCourses)
      }
      else{
        res.send("no purchased courses found")
      }
      
   })


   app.get("/approvedcourses",authenticate,async(req,res)=>{
      var approvedcourses = await Allcourse.findOne({uid:req.user.id})
      if(approvedcourses){
        var approvedfiltereddata = approvedcourses.purchasedcoursestatus.filter((usercourses)=>{
              return usercourses.status.some(sta=>sta.code==='Approved')
        })
        var approvedCourseDetails = await Promise.all(approvedfiltereddata.map(async(cou)=>{
            var coursedet =  await Course.findOne({_id:cou.cid})
            console.log("000000",coursedet)
            return coursedet
        }))
        res.send(approvedCourseDetails)
      }

      else{
        res.json({msg:"no purchased courses"})
      }
   })





   app.get("/approvalpending",authenticate, async(req,res)=>{
      var approvalpendingpurchasedcourses = await Allcourse.find({})
      console.log(approvalpendingpurchasedcourses)

      if(approvalpendingpurchasedcourses){
          res.send(approvalpendingpurchasedcourses)
      }
      else{
        res.json({msg:"not found"})
      }
   })



   app.get('/adminapprovedcourses',authenticate, async(req,res)=>{
      var adminapprovedcourses = await Allcourse.find({})
      if(adminapprovedcourses){
        res.send(adminapprovedcourses)
      }
      else{
        res.json({msg:"not found"})
      }
   })


   


   app.put("/approvecourse/:uid/:cid",authenticate, (req,res)=>{
        var newStatus = {code:"Approved",timestamp:Date.now()}
          Allcourse.updateOne(
            {uid: req.params.uid,"purchasedcoursestatus.cid":req.params.cid},
            { $push: { "purchasedcoursestatus.$.status": {code:"Approved",timestamp:Date.now()} }}
          ).then((updatedcourse)=>{
             res.json({msg:"approved"})
          }) 
   })


   app.post("/addnewcourse",authenticate,async(req,res)=>{
        var newCourse = new Course(req.body)
          const savedCourse = await newCourse.save();
          if(savedCourse){
            res.json({msg:"course saved"})
          }
          else{
            res.json({ msg: "failed" });
          }
  })


  app.put("/updatecourse",authenticate,async(req,res)=>{
      var {id, ...updcourse} = req.body
      var data = await Course.updateOne({_id:id},{$set: updcourse})
      if(data.acknowledged===true){
        res.json({msg:"course updated"})
      }
      else{
        res.json({msg:"not updated"})
      }
  })



app.listen(8090,()=>{
    console.log("serrver is running on 8090")
})