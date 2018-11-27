/**
 * chat.js - modele to provide routing
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */
/*global */
// -----Begin module scope variables ----------
'use strict';
var
  emitUserList, signIn, signOut, chatObj,
  socket = require('socket.io'),
  crud = require('./crud'),
  makeMongoId = crud.makeMongoId,
  // 把用户ID和socket连接关联起来
  chatterMap = {};
// -----End module scope variables ----------
// ----- Begin Utility methods -----
// emitUserList - broadcast user list to all connected clients
// 把在线用户列表广播给所有已连接的客户端
emitUserList = function (io) {
  crud.read(
    'user',
    {is_online: true},
    {},
    function (result_list) {
      io
        .of('/chat')
        .emit('listchange', result_list); // 发布listchange消息，广播在线用户列表
    }
  );
};
// signIn - update is_online property and chatterMap
// 通过更新用户状态(is_online: true)，登入当前用户
signIn = function (io, user_map, socket) {
  crud.update(
    'user',
    {'_id': user_map._id},
    {is_online: true},
    function (result_map) {
      emitUserList(io);
      user_map.is_online = true;
      socket.emit('userupdate', user_map);
    }
  );
  chatterMap[user_map._id] = socket;
  socket.user_id = user_map._id;
};
// signOut - update is_online property and chatterMap
//
signOut = function (io, user_id) {
  // 通过把is_online属性设置为false来注销用户
  crud.update(
    'user',
    {'_id': user_id},
    {is_online: false},
    function (result_list) {
      // 在用户注销之后，把新的在线用户列表发布给所有已连线的客户端
      emitUserList(io);
    }
  );
  // 将注销的用户从chatterMap里面移除
  delete chatterMap[user_id];
};
// ----- End Utility methods ---
// ----- Begin public methods ---------
chatObj = {
  connect: function (server) {
    var io = socket.listen(server);
    // Begin io setup
    io
      .set('blacklist', []) // 没有消息黑名单，也不要中断其他消息
      .of('/chat') // 在/chat名字空间响应消息
      .on('connection', function (socket) {
        socket.on('adduser', function (user_map) {
          crud.read(
            'user',
            {name: user_map.name},
            {},
            function (result_list) {
              var
                result_map,
                cid = user_map.cid;
              delete user_map.cid;
              // use existing user with provided name
              if (result_list.length > 0) {
                result_map = result_list[0];
                result_map.cid = cid;
                signIn(io, result_map, socket);
              }
              // create user with new name
              else {
                user_map.is_online = true;
                crud.construct(
                  'user',
                  user_map,
                  function (result_list) {
                    result_map = result_list[0];
                    result_map.cid = cid;
                    chatterMap[result_map._id] = socket;
                    socket.user_id = result_map._id;
                    socket.emit('userupdate', result_map);
                    emitUserList(io);
                  }
                );
              }
            }
          );
        });
        socket.on('updatechat', function (chat_map) { // 参数包含来自客户端的聊天数据
          // 如果预期的接收者在线（用户ID在chatterMap里面），则通过相应的socket连接转发给接收客户端
          if (chatterMap.hasOwnProperty(chat_map.dest_id)) {
            chatterMap[chat_map.dest_id]
              .emit('updatechat', chat_map);
          } else { // 如果预期的接收者不在线，则返回新的chat_map给发送者，提示请求的接收者不在线
            socket.emit('updatechat', {
              sender_id: chat_map.sender_id,
              msg_text: chat_map.dest_name + ' has gone offline.'
            })
          }
        });
        socket.on('leavechat', function () {
          console.log('** user %s logged out **', socket.user_id);
          signOut(io, socket.user_id);
        });
        socket.on('disconnect', function () {
          console.log('** user %s closed browser window or tab **', socket.user_id);
          signOut(io, socket.user_id);
        });
        socket.on('updateavatar', function (avtr_map) {
          crud.update(
            'user',
            {'_id': makeMongoId(avtr_map.person_id)},
            {css_map: avtr_map.css_map},
            function (result_list) {
              emitUserList(io);
            }
          );
        });
      });
    // End io setup
    return io;
  }
};
module.exports = chatObj;
// ----- End public methods ---------