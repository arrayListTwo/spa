/**
 * routes.js - modele to provide routing
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */
/*global */
// -----Begin module scope variables
'use strict';
var
  configRoutes,
  crud = require('./crud'),
  chat = require('./chat'),
  makeMongoId = crud.makeMongoId,
  agent_text = 'Enter the modern single page web application.' +
    '<br />' +
    '<a href="/index.htm#page=home">;Home</a><br />' +
    '<a href="/index.htm#page=about">About</a><br />' +
    '<a href="/index.htm#page=buynow">Buy Now!</a><br />' +
    '<a href="/index.htm#page=contact us">Contact Us</a><br>';
// -----End module scope vairables
// -----Begin public methods
configRoutes = function (app, server) {
  /*  app.all('*', function (req, res, next) {
      console.log(req.headers['user-agent']);
      if (req.headers['user-agent'] ===
        'Googlebot/2.1 (+http://www.googlebot.com/bot.html)') {
        res.contentType('html');
        console.log('googlebot');
        res.end(agent_text);
      } else {
        next();
      }
    });*/
  app.get('/', function (request, response) {
    response.redirect('/spa.html');
  });
  app.all('/:obj_type/*?', function (request, response, next) {
    response.contentType('json');
    next();
  });
  app.get('/:obj_type/list', function (request, response) {
    crud.read(
      request.params.obj_type,
      {}, {},
      function (map_list) {
        response.send(map_list);
      }
    );
  });
  app.post('/:obj_type/create', function (request, response) {
    crud.construct(request.params.obj_type,
      request.body,
      function (result_map) {
        response.send(result_map);
      });
  });
  app.get('/:obj_type/read/:id([0-9]+)', function (request, response) {
    crud.read(request.params.obj_type,
      {_id: makeMongoId(request.params.id)},
      {},
      function (map_list) {
        response.send(map_list);
      });
  });
  app.post('/:obj_type/update/:id([0-9]+)', function (request, response) {
    crud.update(
      request.params.obj_type,
      {_id: makeMongoId(request.params.id)},
      request.body,
      function (result_map) {
        response.send(result_map);
      }
    );
  });
  app.get('/:obj_type/delete/:id([0-9]+)', function (request, response) {
    crud.destroy(request.params.obj_type,
      {_id: makeMongoId(request.params.id)},
      function (result_map) {
        response.send(result_map);
      });
  });
  chat.connect(server);
};
module.exports = {
  configRoutes: configRoutes
};
// -----End public methods