const Joi = require("joi");
const express = require("express");
const app = express();
const mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;

var noOfTickets;

var TICKETS_COLLECTION = "tickets";

app.use(express.json());

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
    const port = process.env.PORT || 8080;
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

  //Getting count for id creation (Thats not mongoDB assigned ID)
  var count = await db.collection(TICKETS_COLLECTION).countDocuments();

  var newTicket = req.body;
  newTicket.createDate = new Date();
  newTicket.id = count + 1;
  db.collection(TICKETS_COLLECTION).insertOne(newTicket, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new ticket");
    } else {
      res.status(201).json(doc.ops[0]);
    }
  });
});

app.get("/rest/ticket/:id", (req, res) => {
  db.collection(TICKETS_COLLECTION).findOne(
    { id: parseInt(req.params.id) },
    function(err, doc) {
      if (err) {
        handleError(res, err.message, "No ticket with the ID provided");
      } else {
        res.status(200).json(doc);
      }
    }
  );
});

app.put("/rest/ticket/:id", function(req, res) {
  var updateTicket = req.body;

  db.collection(TICKETS_COLLECTION).deleteOne(
    { id: parseInt(req.params.id) },
    function(err, result) {
      if (err) {
        handleError(res, err.message, "Failed to delete ticket");
      } else {
        res.status(200).json(req.params.id);
      }
    }
  );

  updateTicket.createDate = new Date();
  updateTicket.id = req.params.id;
  db.collection(TICKETS_COLLECTION).insertOne(updateTicket, function(err, doc) {
    if (err) {
      handleError(res, err.message, "Failed to create new ticket");
    } else {
      res.status(200).json(updateTicket);
    }
  });
});

app.delete("/rest/ticket/:id", function(req, res) {
  db.collection(TICKETS_COLLECTION).deleteOne(
    { id: parseInt(req.params.id) },
    function(err, result) {
      if (err) {
        handleError(res, err.message, "Failed to delete ticket");
      } else {
        res.status(200).json(req.params.id);
      }
    }
  );
});
