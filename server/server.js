const express = require('express');
const app = express();
const api = require('./api');

app.use(api);
app.listen(8989, function() {
    console.log('Visit http://localhost:8989')
});