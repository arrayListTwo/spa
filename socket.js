/**
 * app.js - Express server static files
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */
/*global */
// ----- Begin module scope variables -----
'use strict';
var
  setWatch,
  http = require('http'),
  express = require('express'),
  socketIo = require('socket.io'),
  fsHandle = require('fs'),
  app = express(),
  server = http.createServer(app),
  io = socketIo.listen(server),
  watchMap = {};
// ----- End module scope variables
// ----- Begin utility methods -----
setWatch = function(url_path, file_type){
 // console.log('setWatch called on ' + url_path);
 if(!watchMap[url_path]){
   // console.log('setting watch on ' + url_path);
   fsHandle.watchFile(url_path.slice(1), function (current, previous) {
     // console.log('file accessed');
     console.log(current.mtime + "   :    " + previous.mtime);
     console.log(current.mtime !== previous.mtime);
     if(current.mtime !== previous.mtime){
       io.sockets.emit(file_type, url_path);
     }
   });
   // console.log('is true');
   watchMap[url_path] = true;
 }
};
// ----- End utility methods -----
// ----- Begin server configuration -----
app.configure(function () {
  app.use(function (request, response, next) {
    if(request.url.indexOf('/js/') >= 0){
      setWatch(request.url, 'script');
      // console.log('request request');
    }else if(request.url.indexOf('/css/') >= 0){
      setWatch(request.url, 'stylesheet');
    }
    next();
  });
  app.use(express.static(__dirname + '/'));
});
app.get('/', function (request, response) {
  response.redirect('/socket.html');
});
// ----- End server configuration -----
// ----- Begin start server -----
server.listen(3000);
console.log('Express server listening on port %d in %s mode',
  server.address().port, app.settings.env);
// ----- End start server -----