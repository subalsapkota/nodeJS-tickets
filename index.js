const Joi = require('joi');
const express = require('express');
const app = express();

app.use(express.json());

//Storing tickets in memory as array
const tickets = [
    {id: 1, type: 'incident', subject: 'Something broke', created_at: new Date()},
    {id: 2, type: 'incident', subject: 'Everything broke', created_at: new Date()},
    {id: 3, type: 'incident', subject: 'No idea what broke', created_at: new Date()}
];

app.get('/', (req, res) => { 
    res.send('Welcome to the root :)');
    console.log("Server listening on root");
});

app.get('/rest/list', (req, res) => {
    res.send(tickets);
});

app.post('/rest/ticket', (req, res) => {
    const schema = {
        type: Joi.string().required(),
        subject: Joi.string().min(10).required(),
    };

    const result = Joi.validate(req.body, schema);
    console.log(result);

    if(result.error) {
        res.status(400).send(result.error.details[0].message);
        return;
    }

    var dateNow = new Date();
    const ticket = {
        id: tickets.length + 1,
        type: req.body.type,
        subject: req.body.subject,
        created_at: dateNow
    };
    tickets.push(ticket);
    res.send(ticket);
});

app.get('/rest/ticket/:id', (req, res) => {
    const ticket = tickets.find(x => x.id === parseInt(req.params.id));
    if (!ticket) res.status(404).send('The ticket with that id was not found');
    res.send(ticket);
});

// Setting PORT for deployment 
const port = process.env.PORT || 3005;
app.listen(port, () => console.log(`Server up and listening on port ${port}`));