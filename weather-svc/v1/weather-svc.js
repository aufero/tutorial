const express = require('express');
const morgan = require('morgan');

const app = express();
const port = 3000;

app.set('json spaces', 2);

app.use(morgan('combined'));

// All applications, need at least 1 endpoint to check health, returning a 200.
app.get("/health", (req, res) => {
    res.json({ "HEALTHY": true });
});

// Current weather for zip code
app.get("/weather/:zip", (req, res) => {
    res.json({
        zip: req.params.zip,
        temperature: Math.random() * 100,
        unit: "F"
    });
});

app.listen(port, () => {
    console.log(`listening on port: ${port}`);
});