const Joi = require("joi");
const express = require("express");
const app = express();
const mongodb = require("mongodb");
var fs = require("fs");
var parser = require("xml2json");
var jsonParser = require("js2xmlparser");
const request = require("request");
const expressBodyParser = require("express-xml-bodyparser");
var noOfTickets;

var TICKETS_COLLECTION = "tickets";

app.use(express.json());
app.use(expressBodyParser());

//Database variable to reuse outside connectino callback
var db;

//Connecting to the database before starting server
mongodb.MongoClient.connect(
  process.env.MONGOGB_URI ||
    "mongodb://admin:admin123@ds143953.mlab.com:43953/heroku_tz3hv7jb",
  function(err, client) {
    if (err) {
      console.log(err);
      process.exit(1);
    }

    //Save database object from the callback for reuse
    db = client.db();
    console.log("Db connected");

    //Initialize the app
    const port = process.env.PORT || 3000;
    app.listen(port, () =>
      console.log(`Server up and listening on port ${port}`)
    );
  }
);

function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({ error: message });
}

app.get("/", (req, res) => {
  res.send("Welcome to the root :)");
  console.log("Server listening on root");
  var myXML =
    "<ticket><type>incident</type><subject>Somthing broke</subject></ticket>";
  ticket = parser.toJson(myXML);
  console.log(ticket);
});

app.get("/rest/list", (req, res) => {
  db.collection(TICKETS_COLLECTION)
    .find({})
    .toArray(function(err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get tickets");
      } else {
        res.status(200).json(docs);
      }
    });
});

app.post("/rest/ticket", async (req, res) => {
  //Validation using Joi
  const schema = {
    type: Joi.string().required(),
    subject: Joi.string()
      .min(10)
      .required()
  };

  const result = Joi.validate(req.body, schema);
  console.log(result);
  console.log(req.body);

  if (result.error) {
    res.status(400).send(result.error.details[0].message);
    return;
  }

  //Getting count for id creation (Thats not mongoDB assigned ID)
  var count = await db.collection(TICKETS_COLLECTION).countDocuments();

  var newTicket = req.body;
  newTicket.createDate = new Date();
  newTicket._id = count + 1;
  db.collection(TICKETS_COLLECTION).insertOne(newTicket, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new ticket");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/rest/ticket/:_id", (req, res) => {
  console.log(req.params._id);
  db.collection(TICKETS_COLLECTION).findOne(
    { _id: parseInt(req.params._id) },
    function(err, doc) {
      if (err) {
        handleError(res, err.message, "No ticket with the ID provided");
      } else {
        res.status(200).json(doc);
      }
    }
  );
});

//Could not figure PUT with updateOne function so used delete and add for similar functionality
app.put("/rest/ticket/:_id", function(req, res) {
  db.collection(TICKETS_COLLECTION).deleteOne(
    { _id: parseInt(req.params._id) },
    function(err, obj) {
      if (err) {
        handleError(res, err.message, "Failed to update ticket");
      } else {
        console.log("Deleted");
      }
    }
  );

  //Validation for updates
  const schema = {
    type: Joi.string().required(),
    subject: Joi.string()
      .min(10)
      .required()
  };

  const result = Joi.validate(req.body, schema);
  console.log(result);

  if (result.error) {
    res.status(400).send(result.error.details[0].message);
    return;
  }

  var newTicket = req.body;
  newTicket.createDate = new Date();
  newTicket._id = parseInt(req.params._id);
  db.collection(TICKETS_COLLECTION).insertOne(newTicket, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to update ticket");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.delete("/rest/ticket/:_id", function(req, res) {
  db.collection(TICKETS_COLLECTION).deleteOne(
    { _id: parseInt(req.params._id) },
    function(err, result) {
      if (err) {
        handleError(res, err.message, "Failed to delete ticket");
      } else {
        res.status(200).json(req.params._id);
      }
    }
  );
});

app.get("/rest/xml/ticket/:_id", function(req, res) {
  var url =
    "http://tickets-subal-415.herokuapp.com/rest/ticket/" + req.params._id;
  request(url, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);
      res.status(200).send(jsonParser.parse("ticket", info));
    }
  });
});

app.post("/rest/xml/ticket", function(req, response) {
  let ticketToPost = req.body["ticket"];
  request.post(
    {
      url: "http://tickets-subal-415.herokuapp.com/rest/ticket",
      body: {
        type: ticketToPost["type"] == undefined ? "" : ticketToPost["type"][0],
        subject:
          ticketToPost["subject"] == undefined ? "" : ticketToPost["subject"][0]
      },
      json: true
    },
    function(err, res) {
      console.log(res.body);
      response.send(
        "Ticket with id " + res.body._id + " succesfully saved in db"
      );
    }
  );
});
