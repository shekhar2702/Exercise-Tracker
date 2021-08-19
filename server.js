const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
let bodyParser = require("body-parser");
// let ObjectId = require('mongodb').ObjectID;
let mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const { Schema } = mongoose;
const exerciseSchema = new Schema({
  username: String,
  count: Number,
  log: [
    {
      description: String,
      duration: Number,
      excersiseDate: Date,
    },
  ],
});
const Excersise = mongoose.model("Excersise", exerciseSchema);

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//date format option
let options = {
  weekday: "short",
  year: "numeric",
  month: "short",
  day: "numeric",
  day: "2-digit",
};
//Make a new user if it doesn't exist and initialize excersise count to zero
function makeNewUser(userFromBody, res) {
  let newUser = new Excersise({
    username: userFromBody,
    count: 0,
  });
  newUser.save(function (err, data) {
    if (err) console.log(err);
    else {
      let newUserObject = {
        username: data.username,
        _id: data._id,
      };
      res.json(newUserObject);
    }
  });
}
//route to handle post reuests to /api/users
app.post("/api/users", function (req, res) {
  let userFromBody = req.body.username;
  //check if new user is already in db

  Excersise.findOne({ username: userFromBody }, function (err, response) {
    if (err) console.log(err);
    else {
      if (response) res.send("Username already taken");
      else makeNewUser(userFromBody, res);
    }
  });
});

function makeNewExcersise(idUser, description, duration, date, res) {
  Excersise.findById(idUser, function (err, response) {
    if (err) res.send(err.message);
    else {
      if (response) {
        response.count += 1;
        let exObject = {
          description: description,
          duration: duration,
          excersiseDate: date,
        };
        response.log.push(exObject);
        response.save(function (err, obj) {
          if (err) console.log(err);
          else {
            if (obj) {
              let objectToPrint = {
                _id: mongoose.Types.ObjectId(idUser),
                username: obj.username,
                date: date.toLocaleString("en-US", options).split(",").join(""),
                duration: parseInt(duration),
                description: description,
              };

              res.json(objectToPrint);
            } else {
              res.send("not found");
            }
          }
        });
      } else {
        return res.send("Unknown userId");
      }
    }
  });
}

//route for handling post requests to /api/users/:_id/exercises
app.post("/api/users/:_id/exercises", function (req, res) {
  //check if description and duration isn't empty
  let idUser = req.params._id;

  if (idUser == "") {
    // console.log("Not Found")
    return res.send("not found");
  }
  let description = req.body.description;
  if (description == "") {
    return res.send("Path `description` is required.");
  }
  let duration = req.body.duration;
  if (duration == "") {
    return res.send("Path `duration` is required.");
  }
  let dateFromBody = req.body.date;
  let date;
  if (dateFromBody == undefined) date = new Date();
  else {
    date = new Date(dateFromBody);
    // console.log("Inval: ",date)
    if (date == "Invalid Date")
      return res.send(
        `Cast to date failed for value "${dateFromBody}" at path "date"`
      );
  }
  let options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    day: "2-digit",
  };

  if (date == undefined) {
    date = new Date();
  }

  makeNewExcersise(idUser, description, duration, date, res);
});

app.get("/api/users/exercises", function (req, res) {
  return res.send("not found");
});

// [from][&to][&limit]
app.get("/api/users/:_id/logs", function (req, res) {
  let userId = req.params._id;
  let queryObject = req.query;
  let frm = queryObject.from;
  let to = queryObject.to;
  let limit = queryObject.limit;

  Excersise.findById(userId, function (err, response) {
    if (err) res.send(err.message);
    else {
      // console.log("get route log test: ",response)
      if (!response) res.send("Unknown userId");
      else {
        console.log("User being fetched......");
        let logObject = [];
        //if from and to query empty
        if (!frm && !to) {
          for (let i = 0; i < response.log.length; i++) {
            let logObj = {
              description: response.log[i].description,
              duration: response.log[i].duration,
              date: response.log[i].excersiseDate
                .toLocaleString("en-US", options)
                .split(",")
                .join(""),
            };
            logObject.push(logObj);
          }
        }
        //if both from and to query present
        else if (frm && to) {
          let fromDate = new Date(frm);
          let toDate = new Date(to);
          //if from and to are in correct order(from<=to)
          if (fromDate <= toDate) {
            for (let i = 0; i < response.log.length; i++) {
              if (
                response.log[i].excersiseDate >= fromDate &&
                response.log[i].excersiseDate <= toDate
              ) {
                let logObj = {
                  description: response.log[i].description,
                  duration: response.log[i].duration,
                  date: response.log[i].excersiseDate
                    .toLocaleString("en-US", options)
                    .split(",")
                    .join(""),
                };
                logObject.push(logObj);
              }
            }
          }
          //else they are in wrong order i.ie fromdate>todate
          else {
            for (let i = 0; i < response.log.length; i++) {
              if (response.log[i].excersiseDate >= fromDate) {
                let logObj = {
                  description: response.log[i].description,
                  duration: response.log[i].duration,
                  date: response.log[i].excersiseDate
                    .toLocaleString("en-US", options)
                    .split(",")
                    .join(""),
                };
                logObject.push(logObj);
              }
            }
          }
        }
        //else either of two is present
        //here only if fromdate is present
        else if (frm) {
          let fromDate = new Date(frm);
          for (let i = 0; i < response.log.length; i++) {
            if (response.log[i].excersiseDate >= fromDate) {
              let logObj = {
                description: response.log[i].description,
                duration: response.log[i].duration,
                date: response.log[i].excersiseDate
                  .toLocaleString("en-US", options)
                  .split(",")
                  .join(""),
              };
              logObject.push(logObj);
            }
          }
        }
        //here only if todate is present
        else if (to) {
          let toDate = new Date(to);
          for (let i = 0; i < response.log.length; i++) {
            if (response.log[i].excersiseDate <= toDate) {
              let logObj = {
                description: response.log[i].description,
                duration: response.log[i].duration,
                date: response.log[i].excersiseDate
                  .toLocaleString("en-US", options)
                  .split(",")
                  .join(""),
              };
              logObject.push(logObj);
            }
          }
        }

        let objectToPrint = {
          _id: mongoose.Types.ObjectId(userId),
          username: response.username,
          count: logObject.length,
          log: logObject,
        };
        if (limit != undefined) {
          objectToPrint.count = logObject.slice(0, limit).length;
          objectToPrint.log = logObject.splice(0, limit);
        }
        res.json(objectToPrint);
      }
    }
  });
});
app.get("/api/users", function (req, res) {
  Excersise.find({}, function (err, response) {
    if (err) console.log(err);
    else {
      let users = [];
      for (let i = 0; i < response.length; i++) {
        users.push({
          _id: response[i]._id,
          username: response[i].username,
        });
      }
      res.json(users);
    }
  });
});
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
