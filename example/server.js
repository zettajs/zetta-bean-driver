var zetta = require('zetta');
var Bean = require('../');

zetta()
  .use(Bean)
  .listen(1337);
