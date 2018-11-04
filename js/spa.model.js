/*
 * spa.model.js
 * Model module
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : false,
        white  : true
      */
/*global $,spa*/
spa.model = (function () {
  'use strict';
  var
    configMap = {
      anon_id: 'a0' // 给匿名人员保留的特殊ID
    },
    stateMap = {
      // 在状态映射中保留anon_user键，用来保存匿名person对象
      anon_user: null,
      cid_serial: 0,
      // 用来保存pserson对象映射，键为客户端ID
      people_cid_map: {},
      // 保存person对象的TaffyDB集合，初始化为空集合
      people_db: TAFFY(),
      // 当前用户person对象
      user: null,
      // 用户目前是否在聊天室中
      is_connected: false
    },
    // 是否使用fake模块
    isFakeData = true,
    personProto, makeCid, clearPeopleDb, completeLogin,
    makePerson, removePerson, people, initModule, chat;

  // The people object API
  // ----------------------
  // The people object is available at spa.model.people.
  // The people object provides methods and events to manage a collection of person objects.
  // Its public methods include:
  //  * get_user() - return the current user person object.
  //      if the current user is not signed-in, an anonymous person object is returned.
  //  * get_db() - return the TaffyDB database of all the person objects
  //    -including the current user - presorted.
  //  * get_by_cid(<client_id>) - return a person object with provided unique id.
  //  * login(<user_name>) - login as the user with the provided user name.
  //    The current user object is changed to reflect the new identity.
  //    Successful completion of login publishes a 'spa-login' global custom event.
  //  * logout() - revert the current user object to anonymous.
  //    This method publishes a 'spa-logout' global custom event.
  //
  // jQuery global custom events published by the object include:
  //  * spa-login - This is published when a user login process completes.
  //    The updated user object is provided as data.
  //  * spa-logout - This is published when a logout completes.
  //    The former user object is provided as data
  //
  // Each person is repersented by a person object.
  // Person objects provide the following methods:
  //  * get_is_user() - return true if object is the current user
  //  * get_is_anon() - return ture if object is anonymous
  //
  // The attributes for a person object include:
  //  * cid - string client id. This is always defined, and is only different from the id attribute
  //  * id - the unique id. This may be undefined if the object is not synced with the backend.
  //  * name - the string name of the user.
  //  * css_map - a map of attributes used for avatar presentation.
  //
  /**
   * 创建person对象的原型。
   * 使用原型通常能减少对内存的需求，从而改进对象的性能
   */
  personProto = {
    // 判断登入的是否是当前用户
    get_is_user: function () {
      return this.cid === stateMap.user.cid;
    },
    // 判断当前用户是否是匿名用户
    get_is_anon: function () {
      return this.cid === stateMap.anon_user.cid;
    }
  };
  /**
   * 客户端ID生成器
   * 通常person对象的客户端ID和服务器端ID是一样的；但是在客户端创建而还没有保存到后端的对象没有服务端ID
   */
  makeCid = function () {
    return 'c' + String(stateMap.cid_serial++);
  };

  /**
   * 移除所有除匿名人员之外的person对象；如果已有用户登入，则也要将当前用户除外
   */
  clearPeopleDb = function () {
    var user = stateMap.user;
    stateMap.people_db = TAFFY();
    stateMap.people_cid_map = {};
    if (user) {
      stateMap.people_db.insert(user);
      stateMap.people_cid_map[user.cid] = user;
    }
  };

  /**
   * 当后端发送回用户的确认信息和数据时，完成用户的登入。
   * 更新当前用户的信息；发布登入成功的spa-login事件
   */
  completeLogin = function (user_list) {
    var user_map = user_list[0];
    delete stateMap.people_cid_map[user_map.cid];
    stateMap.user.cid = user_map._id;
    stateMap.user.id = user_map._id;
    stateMap.user.css_map = user_map.css_map;
    stateMap.people_cid_map[user_map._id] = stateMap.user;
    // 登录完成，自动加入聊天室
    chat.join();
    // When we add chat, we should join here
    // 发布'spa-login'事件
    $.gevent.publish('spa-login', [stateMap.user]);
  };

  /**
   * 创建person对象
   * 新创建的对象保存到TaffyDB集合
   * 更新person_cid_map里面的索引
   * @param person_map
   */
  makePerson = function (person_map) {
    var person,
      cid = person_map.cid,
      css_map = person_map.css_map,
      id = person_map.id,
      name = person_map.name;
    if (cid === undefined || !name) {
      throw 'client id and name required';
    }
    person = Object.create(personProto);
    person.cid = cid;
    person.name = name;
    person.css_map = css_map;
    if (id) {
      person.id = id;
    }
    stateMap.people_cid_map[cid] = person;
    stateMap.people_db.insert(person);
    return person;
  };

  /**
   * TODO 待测试 从人员列表中移除person对象
   */
  removePerson = function (person) {
    if (!person) {
      return false;
    }
    // can't remove anonymous person
    if (person.id === configMap.anon_id) {
      return false;
    }
    stateMap.people_db({cid: person.cid}).remove();
    if (person.cid) {
      delete stateMap.people_cid_map[person.cid];
    }
    return true;
  };

  people = (function () {
    var get_by_cid, get_db, get_user, login, logout;
    get_by_cid = function (cid) {
      return stateMap.people_cid_map[cid];
    };
    // 返回person对象的TaffyDB集合
    get_db = function () {
      return stateMap.people_db;
    };
    // 返回当前用户person对象
    get_user = function () {
      return stateMap.user;
    };
    login = function (name) {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      stateMap.user = makePerson({
        cid: makeCid(),
        css_map: {top: 25, left: 25, 'background-color': '#8f8'},
        name: name
      });
      // 注册当后端发布了userupdate消息时，完成登入过程的回调函数
      sio.on('userupdate', completeLogin);
      // 向后端发送adduser消息，携带用户的详细信息
      sio.emit('adduser', {
        cid: stateMap.user.cid,
        css_map: stateMap.user.css_map,
        name: stateMap.user.name
      });
    };
    // 登出，发布spa-logout事件
    logout = function () {
      var is_removed, user = stateMap.user;
      // 离开聊天室
      chat._leave();
      // when we add chat, we should leave the chatroom here
      is_removed = removePerson(user);
      stateMap.user = stateMap.anon_user;
      // 发布'spa-logout'事件
      $.gevent.publish('spa-logout', [user]);
      return is_removed;
    };
    return {
      get_by_cid: get_by_cid,
      get_db: get_db,
      get_user: get_user,
      login: login,
      logout: logout
    };
  }());

  // The chat object API
  //--------------------
  // The chat object is available at spa.model.chat.
  // The chat object provides methods and events to manage chat messaging.
  // Its public methods include:
  //  * join() - joins the chat room. This routine sets up the chat protocol with
  //      the backend including publishers for 'spa-listchange' and 'spa-updatechat'
  //      global custom events. If the current user is anonumous, join() aborts and return false
  //  * get_chatee() - return the person object with whom the ser is chatting.
  //      If there is no chatee, null is returned.
  //  * set_chatee(<person_id>) - set the chatee to the person identified by person_id.
  //      If the person_id does not exist in the people list, the chatee is set to null.
  //      If the person requested is already the chatee, it returns false.
  //      It publishes a 'spa-updatechat' global custom event.
  //  * send_msg(<msg_text>) - send a message to the chatee. It publishes a 'spa-updatechat'
  //      global custom event. If the user is anonymous or the cahtee is null, it aborts and
  //      returns false.
  //  * update_avatar(<update_avtr_map>) - send the updata_avtr_map to the backend. This results
  //      in the person list and avatar information (the css_map in the person objects).
  //      The update_avtr_map must have the form {pserson_id: person_id, css_map: css_map}
  //
  // jQuery global custom events published by the object include:
  //  * spa-setchatee - This is published when a new chatee is set. A map of the form:
  //    {old_chatee: <old_chatee_person_object>, new_chatee: <new_chatee_person_object>}
  //    is provided as data.
  //  * spa-listchange - This is published when the list of online people changes in length
  // (i.e. when a person joins or leaves a chat) or when their contents change(i.e. when
  //    a person's avatar details change). A subscriber to this event should get the people_db
  //    from the people model for the updated data.
  //  * spa-updatechat - This is published when a new message is received of send. A map of the form:
  //    {dest_id: <chatee_id>, dest_name: <chatee_name>, sender_id: <sender_id>, msg_text: <message_content>}
  //    is provided as data.
  //

  chat = (function () {
    var
      _publish_listchange, _publish_updatechat,
      _update_list, _leave_chat,
      get_chatee, join_chat, send_msg, set_chatee,
      // 听者
      chatee = null;
    // Begin internal methods 当接收到新的人员列表时，刷新people对象
    _update_list = function (arg_list) {
      var i, person_map, make_person_map,
        people_list = arg_list[0],
        // 添加标志
        is_chatee_online = false;
      // TODO 为什么清空？
      clearPeopleDb();
      PERSON:
        for (i = 0; i < people_list.length; i++) {
          person_map = people_list[i];
          if (!person_map.name) {
            continue PERSON;
          }
          // if user defined, update css_map and skip remainder
          if (stateMap.user && stateMap.user.id === person_map._id) {
            stateMap.user.css_map = person_map.css_map;
            continue PERSON;
          }
          make_person_map = {
            cid: person_map._id,
            css_map: person_map.css_map,
            id: person_map._id,
            name: person_map.name
          };
          // 如果chatee人员对象在更新后的用户列表中，则设置标志位位true
          if (chatee && chatee.id === make_person_map.id) {
            is_chatee_online = true;
          }
          makePerson(make_person_map);
        }
      stateMap.people_db.sort('name');
      // 如果chatee人员对象不再更新的用户列表中，则将之设置为空
      if (chatee && !is_chatee_online) {
        set_chatee('');
      }
    };
    // 发布‘spa-listchange’全局事件，携带的数据时更新的人员列表。
    // 每当接收到来自后端的listchange消息时，我们会使用这个方法
    _publish_listchange = function (arg_list) {
      _update_list(arg_list);
      $.gevent.publish('spa-listchange', [arg_list]);
    };

    // 发布‘spa-updatechat’事件，携带的数据是消息的详细信息的映射
    _publish_updatechat = function (arg_list) {
      var msg_map = arg_list[0];
      if (!chatee) {
        set_chatee(msg_map.sender_id);
      } else if (msg_map.sender_id !== stateMap.user.id && msg_map.sender_id !== chatee.id) {
        set_chatee(msg_map.sender_id);
      }
      $.gevent.publish('spa-updatechat', [msg_map]);
    };
    // End internal methods
    // 向后端发送leavechat消息，并清理状态变量
    _leave_chat = function () {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      chatee = null;
      stateMap.is_connected = false;
      if (sio) {
        sio.emit('leavechat');
      }
    };
    // 返回chatee人员对象
    get_chatee = function () {
      return chatee;
    };
    // 加入聊天室
    // 会检查用户是否已经加入了聊天室，避免多次注册listchange回调函数
    join_chat = function () {
      var sio;
      if (stateMap.is_connected) {
        return false;
      }
      if (stateMap.user.get_is_anon()) {
        console.warn('User must be defined before joining chat');
        return false;
      }
      sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      // 监听在线人员列表发生变化
      sio.on('listchange', _publish_listchange);
      // 处理从后端接收到的'updatechat'消息，每当接收到消息，就会发布'spa-updatechat'事件
      sio.on('updatechat', _publish_updatechat);
      stateMap.is_connected = true;
      return true;
    };
    // 发送文本消息和相关的详细消息
    send_msg = function (msg_text) {
      var msg_map,
        sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      // 如果没有连接，则取消消息发送
      if (!sio) {
        return false;
      }
      // 如果用户或者听者有一个没有设置，也会取消发送
      if (!(stateMap.user && chatee)) {
        return false;
      }
      msg_map = {
        dest_id: chatee.id,
        dest_name: chatee.name,
        sender_id: stateMap.user.id,
        msg_text: msg_text
      };
      // 发布'spa-updatechat'事件，这样用户可以在聊天窗口看到他们的消息
      _publish_updatechat([msg_map]);
      sio.emit('updatechat', msg_map);
      return true;
    };
    // 将chatee对象更改为传入的chatee对象
    set_chatee = function (person_id) {
      var new_chatee;
      new_chatee = stateMap.people_cid_map[person_id];
      if (new_chatee) {
        // 如果传入的听者(chatee)和当前听者一样，则立即返回
        if (chatee && chatee.id === new_chatee.id) {
          return false;
        }
      } else {
        new_chatee = null;
      }
      $.gevent.publish('spa-setchatee', {old_chatee: chatee, new_chatee: new_chatee});
      chatee = new_chatee;
      return true;
    };
    return {
      _leave: _leave_chat,
      get_chatee: get_chatee,
      join: join_chat,
      send_msg: send_msg,
      set_chatee: set_chatee
    }
  }());

  initModule = function () {
    // var i, people_list, person_map;
    // initialize anonymous person 初始化一个匿名用户
    stateMap.anon_user = makePerson({
      cid: configMap.anon_id,
      id: configMap.anon_id,
      name: 'anonymous'
    });
    stateMap.user = stateMap.anon_user;
    /* if (isFakeData) {
      people_list = spa.fake.getPeopleList();
      for (i = 0; i < people_list.length; i++) {
        person_map = people_list[i];
        makePerson({
          cid: person_map._id,
          css_map: person_map.css_map,
          id: person_map._id,
          name: person_map.name
        })
        ;
      }
    }*/
  };
  return {
    initModule: initModule,
    chat: chat,
    people: people
  };
}());